

const { ObjectId } = require('mongodb');
const { CoachingCourseModel, CoachingVideoModel, QuizModel } = require('./CoachingCourse.model');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffprobePath = require('ffprobe-static').path;
ffmpeg.setFfprobePath(ffprobePath);

class CourseService {
    constructor() {
        this.tempDir = path.join(__dirname, '..', '..', 'public', 'CourseTemporarlyData');
        this.publicDir = path.join(__dirname, '..', '..', 'public');
        this.privateDir = path.join(__dirname, '..', '..', 'private');
    }

    async extractAudio(videoPath, outputPath) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Audio extraction timed out')), 300000);
            ffmpeg(videoPath)
                .noVideo()
                .audioCodec('aac')
                .output(outputPath)
                .on('end', () => { clearTimeout(timeout); resolve(outputPath); })
                .on('error', (error) => { clearTimeout(timeout); reject(error); })
                .run();
        });
    }

    async extractSubtitles(videoPath, outputPath) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Subtitle extraction timed out')), 300000);

            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    clearTimeout(timeout);
                    return reject(new Error(`Error probing video: ${err.message}`));
                }

                const hasSubtitles = metadata.streams.some(stream => stream.codec_type === 'subtitle');
                if (!hasSubtitles) {
                    clearTimeout(timeout);
                    return reject(new Error('No subtitles found in video'));
                }

                ffmpeg(videoPath)
                    .outputOptions('-map 0:s:0')
                    .output(outputPath)
                    .on('end', () => {
                        clearTimeout(timeout);
                        resolve(outputPath);
                    })
                    .on('error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    })
                    .run();
            });
        });
    }

    async fileExists(filePath) {
        try { await fs.access(filePath); return true; }
        catch { return false; }
    }

    async getVideoDuration(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (error, metadata) => {
                if (error) return reject(new Error(`Video duration extraction failed: ${error.message}`));
                const duration = metadata.format && metadata.format.duration;
                if (!duration) return reject(new Error('Unable to extract video duration.'));
                resolve(duration);
            });
        });
    }

    async cleanFiles(files, basePath) {
        const base = basePath || this.tempDir;
        return Promise.all(
            files.map(file => {
                const filePath = path.join(base, file);
                return fs.unlink(filePath).catch(err => { if (err.code !== 'ENOENT') throw err; });
            })
        ).catch(error => console.error('Error cleaning files:', error));
    }

    async validateCourseData(courseData, files) {
        const requiredFields = [
            'CourseName', 'ProviderId', 'companyId',
            'HeadCourseCatId', 'SubCourseCatId', 'ProviderType', 'ContentData'
        ];
        const missing = requiredFields.filter(f => !courseData[f]);
        if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`);

        if (!courseData.ContentData || courseData.ContentData.length === 0)
            throw new Error('Course content is required');

        if (!files.CourseThumbnail || !files.CourseThumbnail[0] ||
            !files.CertificateTemplate || !files.CertificateTemplate[0]) {
            throw new Error('Thumbnail and certificate template are required');
        }

        if (courseData.ConnectedWith) {
            for (const c of courseData.ConnectedWith) {
                if (c.connectedType && (!c.connectedIds || c.connectedIds.length === 0)) {
                    throw new Error('If connected with someone then select them');
                }
            }
        }
    }

    async processQuizData(quizData, courseInfo) {
        const quizIds = [];
        for (const quiz of quizData) {
            if (!quiz || !quiz.QuizType) continue;
            const newQuiz = Object.assign({}, courseInfo, { QuizType: quiz.QuizType });

            if (quiz.QuizType === 'Coding') {
                if (!quiz.CodingData.CodingQuestion || !quiz.CodingData.CodingAnswer)
                    throw new Error('Coding quiz requires both question and answer');
                newQuiz.CodingQuiz = {
                    CodingQuestion: quiz.CodingData.CodingQuestion,
                    CodingAnswer: quiz.CodingData.CodingAnswer
                };
            } else if (quiz.QuizType === 'PractiseTest') {
                if (!quiz.PractiseTestData || quiz.PractiseTestData.length === 0)
                    throw new Error('Practise test requires at least one question');
                newQuiz.PractiseTestQuiz = quiz.PractiseTestData;
            } else if (quiz.QuizType === 'Mcq') {
                if (!quiz.McqData || quiz.McqData.length === 0)
                    throw new Error('MCQ quiz requires at least one question');
                newQuiz.McqQuiz = quiz.McqData;
            }

            const result = new QuizModel(newQuiz);
            quizIds.push(result.save());
        }
        return Promise.all(quizIds).then(results => results.map(r => r._id));
    }

    async makeVideoHls(inputVideo, outDir) {
        const vPl = path.join(outDir, 'video.m3u8');
        await new Promise((resolve, reject) => {
            ffmpeg(inputVideo)
                .videoCodec('libx264').outputOptions(['-preset veryfast', '-crf 20'])
                .noAudio()
                .addOutputOption('-hls_time 6')
                .addOutputOption('-hls_list_size 0')
                .addOutputOption('-hls_segment_filename', path.join(outDir, 'v_%03d.ts'))
                .output(vPl)
                .on('end', resolve).on('error', reject).run();
        });
        return vPl;
    }

    async makeAudioHls(audioSources, outDir) {
        const results = [];
        for (const a of audioSources) {
            const safeLabel = a.label.replace(/[^\w-]+/g, '_');
            const aPl = path.join(outDir, `audio_${safeLabel}.m3u8`);
            const seg = path.join(outDir, `a_${safeLabel}_%03d.ts`);
            await new Promise((resolve, reject) => {
                ffmpeg(a.path)
                    .noVideo()
                    .audioCodec('aac').audioBitrate('128k')
                    .addOutputOption('-hls_time 6')
                    .addOutputOption('-hls_list_size 0')
                    .addOutputOption('-hls_segment_filename', seg)
                    .output(aPl)
                    .on('end', resolve).on('error', reject).run();
            });
            results.push({ label: a.label, m3u8: aPl, groupId: 'audio_grp' });
        }
        return results;
    }

    async normalizeSubtitlesToVtt(subtitleFiles, outDir, publicRoot) {
        const out = [];
        for (const s of subtitleFiles) {
            try {
                const safeLabel = s.label.replace(/[^\w-]+/g, '_');
                const vttPath = path.join(outDir, `subs_${safeLabel}.vtt`);
                const ext = path.extname(s.path).toLowerCase();

                if (ext === '.vtt') {
                    await fs.copyFile(s.path, vttPath);
                } else {
                    await new Promise((resolve, reject) => {
                        ffmpeg()
                            .input(s.path)
                            .outputOptions('-c:s webvtt')
                            .output(vttPath)
                            .on('end', resolve)
                            .on('error', reject)
                            .run();
                    });
                }

                const publicUrl = path.join(publicRoot, path.basename(vttPath)).replace(/\\/g, '/');
                out.push({
                    label: s.label,
                    url: publicUrl,
                    path: vttPath
                });
            } catch (error) {
                console.error(`Error processing subtitle ${s.label}:`, error);
                continue;
            }
        }
        return out;
    }

    async writeMasterM3U8(outDir, videoPlRel, audioPlaylistsRel, subtitlePlaylistsRel) {
        const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];

        audioPlaylistsRel.forEach(a => {
            if (a.default) {
                lines.push(
                    `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio_grp",NAME="${a.label}",DEFAULT=YES,AUTOSELECT=YES,URI="${a.uri}"`
                );
            } else {
                lines.push(
                    `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio_grp",NAME="${a.label}",DEFAULT=NO,AUTOSELECT=YES,URI="${a.uri}"`
                );
            }
        });

        if (subtitlePlaylistsRel.length > 0) {
            subtitlePlaylistsRel.forEach(s => {
                lines.push(
                    `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs_grp",NAME="${s.label}",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,URI="${s.uri}"`
                );
            });
        }

        lines.push(
            `#EXT-X-STREAM-INF:BANDWIDTH=2500000,CODECS="avc1.4d401f",AUDIO="audio_grp"${subtitlePlaylistsRel.length > 0 ? ',SUBTITLES="subs_grp"' : ''}`,
            videoPlRel
        );

        await fs.writeFile(path.join(outDir, 'master.m3u8'), lines.join('\n'), 'utf8');
    }

    async packageToHls({ inputVideo, inputAudios = [], inputSubtitles = [], outDirAbs, publicBaseUrl }) {
        if (!fssync.existsSync(outDirAbs)) {
            await fs.mkdir(outDirAbs, { recursive: true });
        }

        await this.makeVideoHls(inputVideo, outDirAbs);

        const audioSources = [{ label: 'Original', path: inputVideo, isFromVideo: true }];
        inputAudios.forEach(a => {
            if (a.path && fssync.existsSync(a.path)) {
                audioSources.push({ label: a.label || 'Unknown', path: a.path });
            } else {
                console.warn(`⚠ Skipping invalid/missing audio: ${a.path}`);
            }
        });

        const audioPlsAbs = await this.makeAudioHls(audioSources, outDirAbs);

        const validSubtitles = inputSubtitles.filter(s =>
            s.path && typeof s.path === 'string' && s.path.trim() && fssync.existsSync(s.path)
        );

        let subsMeta = [];
        if (validSubtitles.length > 0) {
            subsMeta = await this.normalizeSubtitlesToVtt(validSubtitles, outDirAbs, publicBaseUrl);
        }

        const videoPlRel = 'video.m3u8';
        const audioPlRel = audioPlsAbs.map((a, idx) => ({
            label: a.label,
            uri: path.basename(a.m3u8),
            default: idx === 0
        }));

        const subsPlRel = subsMeta.map(s => ({
            label: s.label,
            uri: path.basename(s.path),
            path: s.path
        }));

        await this.writeMasterM3U8(outDirAbs, videoPlRel, audioPlRel, subsPlRel);

        const masterUrl = path.join(publicBaseUrl, 'master.m3u8').replace(/\\/g, '/');
        const audioTracksMeta = audioPlRel.map(a => ({
            label: a.label,
            url: path.join(publicBaseUrl, a.uri).replace(/\\/g, '/'),
            default: a.default
        }));

        const subtitlesMeta = subsPlRel.map(s => ({
            label: s.label,
            url: path.join(publicBaseUrl, s.uri).replace(/\\/g, '/')
        }));

        return { masterUrl, audioTracksMeta, subtitlesMeta };
    }

    async processVideoContent(content, coursePrivateRoot, uploadedFiles, coursePublicBaseUrl) {
        const courseContentFinal = [];
        let totalDuration = 0;

        for (const section of content.ContentData) {
            if (!section.Heading || !section.ContainedData.length) continue;

            const sectionPath = path.join(coursePrivateRoot, section.Heading);
            await fs.mkdir(sectionPath, { recursive: true });

            const audioPath = path.join(sectionPath, 'VideoAudioFiles');
            const subtitlesPath = path.join(sectionPath, 'VideoSubtitlesFile');
            const videoPath = path.join(sectionPath, 'VideoFiles');

            await Promise.all([
                fs.mkdir(audioPath, { recursive: true }),
                fs.mkdir(subtitlesPath, { recursive: true }),
                fs.mkdir(videoPath, { recursive: true }),
            ]);

            let videoDataIds = [];

            for (const item of section.ContainedData) {
                if (!item) continue;

                const quizIds = item.QuizData
                    ? await this.processQuizData(item.QuizData, {
                        HeadCourseCatId: content.HeadCourseCatId,
                        SubCourseCatId: content.SubCourseCatId,
                        ProviderType: content.ProviderType,
                        ProviderId: content.ProviderId,
                        companyId: content.companyId,
                        ConnectedWith: content.ConnectedWith
                    })
                    : [];

                if (item.VideoData) {
                    if (!item.VideoData.videoFile || !item.VideoData.title ||
                        !item.VideoData.description || !item.VideoData.order) {
                        throw new Error('Please provide all required video data');
                    }

                    const videoInfo = {
                        HeadCourseCatId: content.HeadCourseCatId,
                        SubCourseCatId: content.SubCourseCatId,
                        ProviderType: content.ProviderType,
                        ProviderId: content.ProviderId,
                        companyId: content.companyId,
                        title: item.VideoData.title,
                        description: item.VideoData.description,
                        order: item.VideoData.order,
                        ConnectedWith: content.ConnectedWith,
                        Quizes: quizIds
                    };

                    if (item.VideoData.paid !== undefined) {
                        videoInfo.paid = item.VideoData.paid;
                    }

                    const videoFilename = item.VideoData.videoFile;
                    const oldVideoPath = path.join(this.tempDir, videoFilename);
                    const newVideoPath = path.join(videoPath, videoFilename);

                    if (!uploadedFiles.ContentVideos.includes(videoFilename)) {
                        throw new Error(`Video file not found: ${videoFilename}`);
                    }

                    await fs.rename(oldVideoPath, newVideoPath);
                    videoInfo.videoFile = videoFilename;

                    const duration = await this.getVideoDuration(newVideoPath);
                    videoInfo.VideoDuration = duration;
                    totalDuration += duration;

                    const audioInputs = [];
                    const subtitleInputs = [];

                    try {
                        const extractedAudioPath = path.join(audioPath, `${videoFilename}.orig.aac`);
                        await this.extractAudio(newVideoPath, extractedAudioPath);
                        audioInputs.push({ label: 'Original', path: extractedAudioPath });
                    } catch (err) {
                        console.error('Audio extraction failed:', err.message);
                    }

                    try {
                        const extractedSubtitlePath = path.join(subtitlesPath, `${videoFilename}.extracted.vtt`);
                        await this.extractSubtitles(newVideoPath, extractedSubtitlePath);
                        subtitleInputs.push({ label: 'Extracted', path: extractedSubtitlePath });
                    } catch (err) {
                        console.error('Subtitle extraction failed:', err.message);
                    }

                    if (item.VideoData.VideoLanguages) {
                        for (const audio of item.VideoData.VideoLanguages) {
                            if (audio.VideoLanguagesFile) {
                                const audioFilename = audio.VideoLanguagesFile;
                                const oldAudioPath = path.join(this.tempDir, audioFilename);
                                const newAudioPath = path.join(audioPath, audioFilename);

                                if (uploadedFiles.VideoAudioLanguages.includes(audioFilename)) {
                                    await fs.rename(oldAudioPath, newAudioPath);
                                    audioInputs.push({
                                        label: audio.Language || 'Unknown',
                                        path: newAudioPath
                                    });
                                }
                            }
                        }
                    }

                    if (item.VideoData.Subtitles) {
                        for (const subtitle of item.VideoData.Subtitles) {
                            if (subtitle.SubtitleFile) {
                                const subtitleFilename = subtitle.SubtitleFile;
                                const oldSubtitlePath = path.join(this.tempDir, subtitleFilename);
                                const newSubtitlePath = path.join(subtitlesPath, subtitleFilename);

                                if (uploadedFiles.VideoSubtitles.includes(subtitleFilename)) {
                                    await fs.rename(oldSubtitlePath, newSubtitlePath);
                                    subtitleInputs.push({
                                        label: subtitle.Language || 'Unknown',
                                        path: newSubtitlePath
                                    });
                                }
                            }
                        }
                    }

                    const hlsOutDir = path.join(
                        this.publicDir, 'streams',
                        `${content.CourseName}-${content.ProviderId}`,
                        section.Heading,
                        item.VideoData.title
                    );

                    const publicBaseUrl = path.join(
                        '/streams',
                        `${content.CourseName}-${content.ProviderId}`,
                        section.Heading,
                        item.VideoData.title
                    ).replace(/\\/g, '/');

                    const { masterUrl, audioTracksMeta, subtitlesMeta } = await this.packageToHls({
                        inputVideo: newVideoPath,
                        inputAudios: audioInputs,
                        inputSubtitles: subtitleInputs,
                        outDirAbs: hlsOutDir,
                        publicBaseUrl
                    });

                    videoInfo.Streaming = {
                        masterM3U8: masterUrl,
                        audioTracks: audioTracksMeta,
                        subtitles: subtitlesMeta
                    };

                    const video = new CoachingVideoModel(videoInfo);
                    const savedVideo = await video.save();
                    videoDataIds.push(savedVideo._id);
                }
            }

            if (videoDataIds.length > 0) {
                courseContentFinal.push({
                    Heading: section.Heading,
                    CourseData: videoDataIds
                });
            }
        }

        return { courseContentFinal, totalDuration };
    }

    async resolveVideoOrders(CourseId, PlayListId, currentVideoData, Operation, VideoDuration) {
        try {
            const courseData = await CoachingCourseModel.findOne({ _id: CourseId });
            if (!courseData) throw new Error("Course not found");

            const playlist = courseData.CourseContent.find(each => each._id.toString() === PlayListId.toString());
            if (!playlist) throw new Error("Playlist not found");

            const videoIds = playlist.CourseData || [];

            const allVideos = await CoachingVideoModel.find({ _id: { $in: videoIds } });

            let ordered = allVideos.map(v => ({ _id: v._id.toString(), order: v.order }))
                .sort((a, b) => a.order - b.order);

            if (Operation === 'add') {
                const newOrder = currentVideoData.order;
                ordered = ordered.map(v => v.order >= newOrder ? { ...v, order: v.order + 1 } : v);
                ordered.push({ _id: currentVideoData._id.toString(), order: newOrder });
            } else if (Operation === 'delete') {
                const deletedOrder = currentVideoData.order;
                ordered = ordered.filter(v => v._id !== currentVideoData._id.toString())
                    .map(v => v.order > deletedOrder ? { ...v, order: v.order - 1 } : v);
            }

            ordered.sort((a, b) => a.order - b.order);

            for (const v of ordered) {
                if (v._id) {
                    await CoachingVideoModel.findOneAndUpdate(
                        { _id: v._id }, { $set: { order: v.order } }, { new: true }
                    );
                }
            }

            const videoIdList = ordered.map(v => v._id);
            await CoachingCourseModel.findOneAndUpdate(
                { _id: CourseId, 'CourseContent._id': PlayListId },
                { $set: { 'CourseContent.$.CourseData': videoIdList, CourseDuration: VideoDuration } },
                { new: true }
            );
        } catch (error) {
            console.error("Error in resolveVideoOrders:", error.message);
            throw error;
        }
    }

    async addCoachingCourse(req, res) {
        let uploadedFiles = {};
        try {
            let courseData = JSON.parse(req.body.coursedata);
            const files = req.files;

            uploadedFiles = {
                ContentVideos: files.ContentVideos ? files.ContentVideos.map(f => f.originalname) : [],
                VideoAudioLanguages: files.VideoAudioLanguages ? files.VideoAudioLanguages.map(f => f.originalname) : [],
                VideoSubtitles: files.VideoSubtitles ? files.VideoSubtitles.map(f => f.originalname) : [],
                CourseThumbnail: files.CourseThumbnail[0] ? files.CourseThumbnail[0].originalname : null,
                CertificateTemplate: files.CertificateTemplate[0] ? files.CertificateTemplate[0].originalname : null
            };

            await this.validateCourseData(courseData, files);

            const courseDirName = `${courseData.CourseName}-${courseData.ProviderId}`;
            const coursePublicPath = path.join(this.publicDir, courseDirName);
            const coursePrivatePath = path.join(this.privateDir, courseDirName);
            await fs.mkdir(coursePublicPath, { recursive: true });
            await fs.mkdir(coursePrivatePath, { recursive: true });

            const { courseContentFinal, totalDuration } = await this.processVideoContent(
                courseData,
                coursePrivatePath,
                uploadedFiles,
                path.join('/', courseDirName).replace(/\\/g, '/')
            );

            if (uploadedFiles.CertificateTemplate && courseData.CertificateConfig) {
                const certDir = path.join(coursePrivatePath, 'Certificate');
                await fs.mkdir(certDir, { recursive: true });
                await fs.rename(
                    path.join(this.tempDir, uploadedFiles.CertificateTemplate),
                    path.join(certDir, uploadedFiles.CertificateTemplate)
                );
            }

            if (uploadedFiles.CourseThumbnail) {
                const pubThumbDir = path.join(coursePublicPath, 'CourseThumbnail');
                const priThumbDir = path.join(coursePrivatePath, 'CourseThumbnail');
                await fs.mkdir(pubThumbDir, { recursive: true });
                await fs.mkdir(priThumbDir, { recursive: true });
                await fs.rename(
                    path.join(this.tempDir, uploadedFiles.CourseThumbnail),
                    path.join(pubThumbDir, uploadedFiles.CourseThumbnail)
                );
                await fs.copyFile(
                    path.join(pubThumbDir, uploadedFiles.CourseThumbnail),
                    path.join(priThumbDir, uploadedFiles.CourseThumbnail)
                );
            }

            const courseDocument = {
                CourseName: courseData.CourseName,
                ProviderId: courseData.ProviderId,
                ProviderType: courseData.ProviderType,
                companyId: courseData.companyId,
                HeadCourseCatId: courseData.HeadCourseCatId,
                SubCourseCatId: courseData.SubCourseCatId,
                CourseDuration: totalDuration,
                CourseThumbnail: uploadedFiles.CourseThumbnail,
                Certificate: uploadedFiles.CertificateTemplate,
                CourseContent: courseContentFinal,
            };
            if (courseData.Skills) courseDocument.Skills = courseData.Skills;
            if (courseData.SkillsId) courseDocument.SkillsId = courseData.SkillsId;
            if (courseData.Price) courseDocument.Price = courseData.Price;
            if (courseData.TextAreas) courseDocument.TextAreas = courseData.TextAreas;
            if (courseData.Level) courseDocument.Level = courseData.Level;
            if (courseData.offerPercentage) courseDocument.offerPercentage = courseData.offerPercentage;
            if (courseData.ConnectedWith) courseDocument.ConnectedWith = courseData.ConnectedWith;
            if (courseData.CertificateConfig) courseDocument.CertificateConfig = courseData.CertificateConfig;

            const result = await CoachingCourseModel.create(courseDocument);

            const filesToClean = []
                .concat(uploadedFiles.ContentVideos || [])
                .concat(uploadedFiles.VideoAudioLanguages || [])
                .concat(uploadedFiles.VideoSubtitles || []);
            if (filesToClean.length) await this.cleanFiles(filesToClean);

            return res.status(200).json({ data: result, success: true });

        } catch (error) {
            console.error('Error adding course:', error);
            if (uploadedFiles) {
                const filesToClean = []
                    .concat(uploadedFiles.ContentVideos || [])
                    .concat(uploadedFiles.VideoAudioLanguages || [])
                    .concat(uploadedFiles.VideoSubtitles || []);
                if (uploadedFiles.CourseThumbnail) filesToClean.push(uploadedFiles.CourseThumbnail);
                if (uploadedFiles.CertificateTemplate) filesToClean.push(uploadedFiles.CertificateTemplate);
                if (filesToClean.length) await this.cleanFiles(filesToClean);
            }
            return res.status(500).json({ error: error.message, success: false });
        }
    }

    async UpdateprocessVideoContent(content, coursePath, uploadedFiles) {
        const courseContentFinal = [];
        let totalDuration = 0;
        let videoDataIds = [];

        const sectionPath = path.join(coursePath, content.Heading);
        await fs.mkdir(sectionPath, { recursive: true });

        const audioPath = path.join(sectionPath, 'VideoAudioFiles');
        const subtitlesPath = path.join(sectionPath, 'VideoSubtitlesFile');
        const videoPath = path.join(sectionPath, 'VideoFiles');

        await Promise.all([
            fs.mkdir(audioPath, { recursive: true }),
            fs.mkdir(subtitlesPath, { recursive: true }),
            fs.mkdir(videoPath, { recursive: true })
        ]);

        for (const section of content.ContainedData) {
            const quizIds = section.QuizData
                ? await this.processQuizData(section.QuizData, {
                    HeadCourseCatId: content.HeadCourseCatId,
                    SubCourseCatId: content.SubCourseCatId,
                    ProviderType: content.ProviderType,
                    ProviderId: content.ProviderId,
                    companyId: content.companyId,
                    ConnectedWith: content.ConnectedWith
                })
                : [];

            if (section.VideoData) {
                if (!section.VideoData.videoFile || !section.VideoData.title ||
                    !section.VideoData.description || !section.VideoData.order) {
                    throw new Error('Please provide all required video data');
                }

                const videoInfo = {
                    HeadCourseCatId: content.HeadCourseCatId,
                    SubCourseCatId: content.SubCourseCatId,
                    ProviderType: content.ProviderType,
                    ProviderId: content.ProviderId,
                    companyId: content.companyId,
                    title: section.VideoData.title,
                    description: section.VideoData.description,
                    order: section.VideoData.order,
                    ConnectedWith: content.ConnectedWith,
                    Quizes: quizIds
                };

                if (section.VideoData.paid !== undefined) {
                    videoInfo.paid = section.VideoData.paid;
                }

                const videoFilename = section.VideoData.videoFile;
                const oldVideoPath = path.join(this.tempDir, videoFilename);
                const newVideoPath = path.join(videoPath, videoFilename);

                if (!uploadedFiles.ContentVideos || !uploadedFiles.ContentVideos.includes(videoFilename)) {
                    throw new Error(`Video file not found: ${videoFilename}`);
                }

                await fs.rename(oldVideoPath, newVideoPath);
                videoInfo.videoFile = videoFilename;

                const duration = await this.getVideoDuration(newVideoPath);
                videoInfo.VideoDuration = duration;
                totalDuration += duration;

                const audioInputs = [];
                const subtitleInputs = [];

                try {
                    const extractedAudioPath = path.join(audioPath, `${videoFilename}.orig.aac`);
                    await this.extractAudio(newVideoPath, extractedAudioPath);
                    audioInputs.push({ label: 'Original', path: extractedAudioPath });
                } catch (err) {
                    console.error('Audio extraction failed:', err.message);
                }

                try {
                    const extractedSubtitlePath = path.join(subtitlesPath, `${videoFilename}.extracted.vtt`);
                    await this.extractSubtitles(newVideoPath, extractedSubtitlePath);
                    subtitleInputs.push({ label: 'Extracted', path: extractedSubtitlePath });
                } catch (err) {
                    console.error('Subtitle extraction failed:', err.message);
                }

                if (section.VideoData.VideoLanguages) {
                    for (const audio of section.VideoData.VideoLanguages) {
                        if (audio && audio.VideoLanguagesFile) {
                            const audioFilename = audio.VideoLanguagesFile;
                            const oldAudioPath = path.join(this.tempDir, audioFilename);
                            const newAudioPath = path.join(audioPath, audioFilename);

                            if (uploadedFiles.VideoAudioLanguages &&
                                uploadedFiles.VideoAudioLanguages.includes(audioFilename)) {
                                await fs.rename(oldAudioPath, newAudioPath);
                                audioInputs.push({
                                    label: audio.Language || 'Unknown',
                                    path: newAudioPath
                                });
                            }
                        }
                    }
                }

                if (section.VideoData.Subtitles) {
                    for (const subtitle of section.VideoData.Subtitles) {
                        if (subtitle && subtitle.SubtitleFile) {
                            const subtitleFilename = subtitle.SubtitleFile;
                            const oldSubtitlePath = path.join(this.tempDir, subtitleFilename);
                            const newSubtitlePath = path.join(subtitlesPath, subtitleFilename);

                            if (uploadedFiles.VideoSubtitles &&
                                uploadedFiles.VideoSubtitles.includes(subtitleFilename)) {
                                await fs.rename(oldSubtitlePath, newSubtitlePath);
                                subtitleInputs.push({
                                    label: subtitle.Language || 'Unknown',
                                    path: newSubtitlePath
                                });
                            }
                        }
                    }
                }

                const hlsOutDir = path.join(
                    this.publicDir, 'streams',
                    `${content.CourseName}-${content.ProviderId}`,
                    content.Heading,
                    section.VideoData.title
                );

                const publicBaseUrl = path.join(
                    '/streams',
                    `${content.CourseName}-${content.ProviderId}`,
                    content.Heading,
                    section.VideoData.title
                ).replace(/\\/g, '/');

                const { masterUrl, audioTracksMeta, subtitlesMeta } = await this.packageToHls({
                    inputVideo: newVideoPath,
                    inputAudios: audioInputs,
                    inputSubtitles: subtitleInputs,
                    outDirAbs: hlsOutDir,
                    publicBaseUrl
                });

                videoInfo.Streaming = {
                    masterM3U8: masterUrl,
                    audioTracks: audioTracksMeta,
                    subtitles: subtitlesMeta
                };

                const video = new CoachingVideoModel(videoInfo);
                const savedVideo = await video.save();
                videoDataIds.push({ _id: savedVideo._id, order: savedVideo.order });
            }
        }

        if (videoDataIds.length > 0) {
            courseContentFinal.push({
                Heading: content.Heading,
                CourseData: videoDataIds
            });
        }

        return { videoDataIds, totalDuration };
    }

    validateCourseDataForUpdateTheCourseDetails(courseData, filesToClean) {
        const required = ['CourseName', 'companyId', 'HeadCourseCatId', 'SubCourseCatId'];
        const missing = required.filter(f => !courseData[f]);
        if (missing.length) {
            if (filesToClean.length) this.cleanFiles(filesToClean);
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        if (courseData.ConnectedWith) {
            for (const c of courseData.ConnectedWith) {
                if (c.connectedType && (!c.connectedIds || c.connectedIds.length === 0)) {
                    if (filesToClean.length) this.cleanFiles(filesToClean);
                    throw new Error('If connected with someone then select them');
                }
            }
        }
    }

    async getCoachingCourseData(matchCondition) {
        return await CoachingCourseModel.aggregate([
            { $match: matchCondition },

            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "HeadCourseCatId",
                    foreignField: "_id",
                    as: "HeadCoachingCategories"
                }
            },
            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "SubCourseCatId",
                    foreignField: "_id",
                    as: "SubCoachingCategories"
                }
            },
            {
                $lookup: {
                    from: "coachingprovidertypes",
                    localField: "ProviderType",
                    foreignField: "_id",
                    as: "ProviderTypeInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingprovidertypes",
                    localField: "ConnectedWith.connectedType",
                    foreignField: "_id",
                    as: "ConnectedTypeInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingclasses",
                    localField: "ConnectedWith.connectedIds",
                    foreignField: "_id",
                    as: "ClassConnectedInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingtutors",
                    localField: "ConnectedWith.connectedIds",
                    foreignField: "_id",
                    as: "TutorConnectedInfo"
                }
            },
            {
                $lookup: {
                    from: "coachinguniversities",
                    localField: "ConnectedWith.connectedIds",
                    foreignField: "_id",
                    as: "UniversityConnectedInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingcompanies",
                    localField: "ConnectedWith.connectedIds",
                    foreignField: "_id",
                    as: "CompanyConnectedInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingclasses",
                    localField: "ProviderId",
                    foreignField: "_id",
                    as: "ClassProviderInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingtutors",
                    localField: "ProviderId",
                    foreignField: "_id",
                    as: "TutorProviderInfo"
                }
            },
            {
                $lookup: {
                    from: "coachinguniversities",
                    localField: "ProviderId",
                    foreignField: "_id",
                    as: "UniversityProviderInfo"
                }
            },
            {
                $lookup: {
                    from: "coachingcompanies",
                    localField: "ProviderId",
                    foreignField: "_id",
                    as: "CompanyProviderInfo"
                }
            },

            {
                $addFields: {
                    ProviderTypeValue: { $arrayElemAt: ["$ProviderTypeInfo", 0] },
                    ConnectedTypeValue: { $arrayElemAt: ["$ConnectedTypeInfo", 0] }
                }
            },

            {
                $addFields: {
                    ProviderInfo: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$ProviderTypeValue.CourseProviderType", "Class"] }, then: "$ClassProviderInfo" },
                                { case: { $eq: ["$ProviderTypeValue.CourseProviderType", "Tutor"] }, then: "$TutorProviderInfo" },
                                { case: { $eq: ["$ProviderTypeValue.CourseProviderType", "University"] }, then: "$UniversityProviderInfo" },
                                { case: { $eq: ["$ProviderTypeValue.CourseProviderType", "Company"] }, then: "$CompanyProviderInfo" }
                            ],
                            default: []
                        }
                    },
                    ConnectedInfo: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$ConnectedTypeValue.CourseProviderType", "Class"] }, then: "$ClassConnectedInfo" },
                                { case: { $eq: ["$ConnectedTypeValue.CourseProviderType", "Tutor"] }, then: "$TutorConnectedInfo" },
                                { case: { $eq: ["$ConnectedTypeValue.CourseProviderType", "University"] }, then: "$UniversityConnectedInfo" },
                                { case: { $eq: ["$ConnectedTypeValue.CourseProviderType", "Company"] }, then: "$CompanyConnectedInfo" }
                            ],
                            default: []
                        }
                    }
                }
            },

            {
                $project: {
                    ClassConnectedInfo: 0,
                    TutorConnectedInfo: 0,
                    UniversityConnectedInfo: 0,
                    CompanyConnectedInfo: 0,
                    ClassProviderInfo: 0,
                    TutorProviderInfo: 0,
                    UniversityProviderInfo: 0,
                    CompanyProviderInfo: 0
                }
            },

            {
                $lookup: {
                    from: "coachingskills",
                    localField: "SkillsId",
                    foreignField: "_id",
                    as: "SkillsInfo"
                }
            },

            { $unwind: { path: "$CourseContent", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "coachingvideos",
                    localField: "CourseContent.CourseData",
                    foreignField: "_id",
                    as: "CourseContent.Videos"
                }
            },

            { $unwind: { path: "$CourseContent.Videos", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "coursequizes",
                    localField: "CourseContent.Videos.Quizes",
                    foreignField: "_id",
                    as: "CourseContent.Videos.QuizesInfo"
                }
            },

            {
                $group: {
                    _id: {
                        courseId: "$_id",
                        heading: "$CourseContent.Heading"
                    },
                    CourseData: { $first: "$$ROOT" },
                    Videos: { $push: "$CourseContent.Videos" }
                }
            },

            {
                $group: {
                    _id: "$_id.courseId",
                    CourseInfo: { $first: "$CourseData" },
                    CourseContent: {
                        $push: {
                            Heading: "$_id.heading",
                            Videos: "$Videos"
                        }
                    }
                }
            },

            {
                $replaceRoot: {
                    newRoot: { $mergeObjects: ["$CourseInfo", { "CourseContent": "$CourseContent" }] }
                }
            }
        ]);
    }

    async getCoachingCourse(req, res) {
        let { CourseId, CourseName, Skills, SkillsId, ProviderId, ProviderType, connectedId, connectedType, HeadCourseCatId, SubCourseCatId, companyId } = req.query;

        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId.createFromHexString(companyId) };

            if (CourseName) {
                matchCondition.CourseName = { $in: [String(CourseName)] };
            }
            if (Skills) {
                matchCondition.Skills = { $in: [String(Skills)] };
            }
            if (SkillsId) {
                if (!mongoose.Types.ObjectId.isValid(SkillsId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SkillsId = { $in: [mongoose.Types.ObjectId.createFromHexString(SkillsId)] };
            }
            if (ProviderId) {
                if (!mongoose.Types.ObjectId.isValid(ProviderId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.ProviderId = mongoose.Types.ObjectId.createFromHexString(ProviderId);
            }
            if (ProviderType) {
                if (!mongoose.Types.ObjectId.isValid(ProviderType)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.ProviderType = mongoose.Types.ObjectId.createFromHexString(ProviderType);
            }

            if (connectedType || connectedId) {
                if (connectedType && !mongoose.Types.ObjectId.isValid(connectedType)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                if (connectedId && !mongoose.Types.ObjectId.isValid(connectedId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                const elemMatch = {};
                if (connectedType) {
                    elemMatch.connectedType = mongoose.Types.ObjectId.createFromHexString(connectedType);
                }
                if (connectedId) {
                    elemMatch.connectedIds = { $in: [mongoose.Types.ObjectId.createFromHexString(connectedId)] };
                }
                matchCondition.ConnectedWith = { $elemMatch: elemMatch };
            }
            if (HeadCourseCatId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCourseCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadCourseCatId = { $in: [mongoose.Types.ObjectId.createFromHexString(HeadCourseCatId)] };
            }
            if (SubCourseCatId) {
                if (!mongoose.Types.ObjectId.isValid(SubCourseCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubCourseCatId = { $in: [mongoose.Types.ObjectId.createFromHexString(SubCourseCatId)] };
            }
            if (CourseId) {
                if (!mongoose.Types.ObjectId.isValid(CourseId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId.createFromHexString(CourseId);
            }

            const data = await this.getCoachingCourseData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No Course Found', success: false });
            }

            return res.status(200).json({ data: data, success: true });

        } catch (error) {
            console.error(error);
            return res.status(400).json({ error: error.message, success: false });
        }
    }

    async DeleteCoachingCourse(req, resp) {
        try {
            if (!req.params.id) {
                return resp.status(400).json({ message: "please provide id of Course", success: false });
            }

            const coachingCoursedata = await CoachingCourseModel.findOne({ _id: req.params.id });

            if (coachingCoursedata) {
                if (coachingCoursedata.CourseContent) {
                    for (const EachContent of coachingCoursedata.CourseContent) {
                        const videos = await CoachingVideoModel.find({ _id: { $in: EachContent.CourseData } });
                        for (const findedVideo of videos) {
                            if (findedVideo.Quizes) {
                                for (const EachQuiz of findedVideo.Quizes) {
                                    await QuizModel.deleteOne({ _id: EachQuiz });
                                }
                            }
                            await CoachingVideoModel.findOneAndDelete({ _id: findedVideo._id });
                        }
                    }
                }

                const result = await CoachingCourseModel.deleteOne({ _id: req.params.id });
                if (!result) {
                    return resp.status(400).json({ message: "Coaching Course cannot be deleted", success: false });
                }

                const CoursePath = path.join(this.publicDir, `${coachingCoursedata.CourseName}-${coachingCoursedata.ProviderId}`);
                const FileIsOrNot = await this.fileExists(CoursePath);
                if (FileIsOrNot) {
                    await fs.rm(CoursePath, { recursive: true, force: true });
                }

                const StreamsPath = path.join(this.publicDir, 'streams', `${coachingCoursedata.CourseName}-${coachingCoursedata.ProviderId}`);
                const StreamsExist = await this.fileExists(StreamsPath);
                if (StreamsExist) {
                    await fs.rm(StreamsPath, { recursive: true, force: true });
                }

                const PrivateCoursePath = path.join(this.privateDir, `${coachingCoursedata.CourseName}-${coachingCoursedata.ProviderId}`);
                const PrivateFileIsOrNot = await this.fileExists(PrivateCoursePath);
                if (PrivateFileIsOrNot) {
                    await fs.rm(PrivateCoursePath, { recursive: true, force: true });
                }

                return resp.status(200).json({ message: "Coaching Course deleted", success: true, data: result });
            } else {
                return resp.status(400).json({ message: "Course cannot found", success: false });
            }

        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });
        }
    }

    async UpdateCourseDetail(req, res) {
        let uploadedFiles = {};
        try {
            let { CourseId, CourseName, Skills, SkillsId, ProviderId, ConnectedWith, HeadCourseCatId, SubCourseCatId, Price, TextAreas, Level, offerPercentage, CertificateConfig } = req.body;
            let companyId = req.query.companyId;

            try { if (Skills) Skills = JSON.parse(Skills); } catch { throw new Error('Invalid JSON in Skills'); }
            try { if (SkillsId) SkillsId = JSON.parse(SkillsId); } catch { throw new Error('Invalid JSON in SkillsId'); }
            try { if (ConnectedWith) ConnectedWith = JSON.parse(ConnectedWith); } catch { throw new Error('Invalid JSON in ConnectedWith'); }
            try { if (HeadCourseCatId) HeadCourseCatId = JSON.parse(HeadCourseCatId); } catch { throw new Error('Invalid JSON in HeadCourseCatId'); }
            try { if (SubCourseCatId) SubCourseCatId = JSON.parse(SubCourseCatId); } catch { throw new Error('Invalid JSON in SubCourseCatId'); }
            try { if (TextAreas) TextAreas = JSON.parse(TextAreas); } catch { throw new Error('Invalid JSON in TextAreas'); }

            const files = req.files;

            uploadedFiles = {
                CourseThumbnail: files.CourseThumbnail && files.CourseThumbnail[0] ? files.CourseThumbnail[0].originalname : null,
                CertificateTemplate: files.CertificateTemplate && files.CertificateTemplate[0] ? files.CertificateTemplate[0].originalname : null
            };
            const filesToClean = [];
            if (uploadedFiles.CourseThumbnail) filesToClean.push(uploadedFiles.CourseThumbnail);
            if (uploadedFiles.CertificateTemplate) filesToClean.push(uploadedFiles.CertificateTemplate);

            let FindCourse = await CoachingCourseModel.findOne({ _id: CourseId });
            if (!FindCourse) {
                if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                return res.status(400).json({ message: 'Course Not Found', success: false });
            }

            await this.validateCourseDataForUpdateTheCourseDetails(req.body, filesToClean);

            let courseDirName;
            let coursePath;
            let PrivateCoursePath;

            if (!CourseName) {
                courseDirName = `${FindCourse.CourseName}-${FindCourse.ProviderId}`;
                coursePath = path.join(this.publicDir, courseDirName);
                PrivateCoursePath = path.join(this.privateDir, courseDirName);
            } else {
                courseDirName = `${CourseName}-${ProviderId}`;
                coursePath = path.join(this.publicDir, courseDirName);
                PrivateCoursePath = path.join(this.privateDir, courseDirName);
                const existingpathname = `${FindCourse.CourseName}-${FindCourse.ProviderId}`;
                const existingPath = path.join(this.publicDir, existingpathname);
                const FileIsOrNot = await this.fileExists(existingPath);
                if (FileIsOrNot) {
                    await fs.rename(existingPath, coursePath);
                }
                const PrivateExistingPath = path.join(this.privateDir, existingpathname);
                const PrivateFileIsOrNot = await this.fileExists(PrivateExistingPath);
                if (PrivateFileIsOrNot) {
                    await fs.rename(PrivateExistingPath, PrivateCoursePath);
                }
            }

            const courseDocument = {
                CourseName: CourseName,
                ProviderId: ProviderId,
                HeadCourseCatId: HeadCourseCatId,
                SubCourseCatId: SubCourseCatId,
                Skills: Skills,
                SkillsId: SkillsId,
                Price: Price,
                TextAreas: TextAreas,
                Level: Level,
                offerPercentage: offerPercentage,
                ConnectedWith: ConnectedWith
            };

            if (uploadedFiles.CertificateTemplate && CertificateConfig) {
                const certDir = path.join(PrivateCoursePath, 'Certificate');
                if (FindCourse.Certificate) {
                    const deleteCertificatePath = path.join(certDir, FindCourse.Certificate);
                    const FileIsOrNot = await this.fileExists(deleteCertificatePath);
                    if (FileIsOrNot) await fs.unlink(deleteCertificatePath);
                }
                await fs.rename(
                    path.join(this.tempDir, uploadedFiles.CertificateTemplate),
                    path.join(certDir, uploadedFiles.CertificateTemplate)
                );
                courseDocument.Certificate = uploadedFiles.CertificateTemplate;
                courseDocument.CertificateConfig = CertificateConfig;
            } else if (uploadedFiles.CertificateTemplate) {
                const currentTemplate = path.join(this.tempDir, uploadedFiles.CertificateTemplate);
                const FileIsOrNot = await this.fileExists(currentTemplate);
                if (FileIsOrNot) await fs.unlink(currentTemplate);
                return res.status(400).json({ message: 'if you was selecting certificate template then provide configuration of certificate', success: false });
            }

            if (uploadedFiles.CourseThumbnail) {
                const thumbDir = path.join(coursePath, 'CourseThumbnail');
                const PrivateThumbDir = path.join(PrivateCoursePath, 'CourseThumbnail');
                if (FindCourse.CourseThumbnail) {
                    const deleteCourseThumbnailPath = path.join(thumbDir, FindCourse.CourseThumbnail);
                    const PrivateDeleteCourseThumbnailPath = path.join(PrivateThumbDir, FindCourse.CourseThumbnail);
                    const FileIsOrNot = await this.fileExists(deleteCourseThumbnailPath);
                    if (FileIsOrNot) await fs.unlink(deleteCourseThumbnailPath);
                    const PrivateFileIsOrNot = await this.fileExists(PrivateDeleteCourseThumbnailPath);
                    if (PrivateFileIsOrNot) await fs.unlink(PrivateDeleteCourseThumbnailPath);
                }
                await fs.rename(
                    path.join(this.tempDir, uploadedFiles.CourseThumbnail),
                    path.join(thumbDir, uploadedFiles.CourseThumbnail)
                );
                await fs.copyFile(
                    path.join(thumbDir, uploadedFiles.CourseThumbnail),
                    path.join(PrivateThumbDir, uploadedFiles.CourseThumbnail)
                );
                courseDocument.CourseThumbnail = uploadedFiles.CourseThumbnail;
            }

            const result = await CoachingCourseModel.findOneAndUpdate(
                { _id: CourseId, companyId: companyId },
                { $set: courseDocument },
                { new: true }
            );

            const remainingToClean = [];
            if (uploadedFiles.CourseThumbnail) remainingToClean.push(uploadedFiles.CourseThumbnail);
            if (uploadedFiles.CertificateTemplate) remainingToClean.push(uploadedFiles.CertificateTemplate);
            if (remainingToClean.length !== 0) await this.cleanFiles(remainingToClean);

            return res.status(200).json({ data: result, success: true });

        } catch (error) {
            console.error('Error updating course:', error);
            if (uploadedFiles) {
                const filesToClean = [];
                if (uploadedFiles.CourseThumbnail) filesToClean.push(uploadedFiles.CourseThumbnail);
                if (uploadedFiles.CertificateTemplate) filesToClean.push(uploadedFiles.CertificateTemplate);
                if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
            }
            return res.status(500).json({ error: error.message, success: false });
        }
    }

    async UpdatePlaylistHeading(req, res) {
        let uploadedFiles = {};
        try {
            const { CourseId, PlayListId } = req.body;
            const courseData = JSON.parse(req.body.data);
            const companyId = req.query.companyId;
            const operation = req.query.operation ? req.query.operation.toLowerCase() : null;
            const files = req.files;

            uploadedFiles = {
                ContentVideos: files.ContentVideos ? files.ContentVideos.map(f => f.originalname) : [],
                VideoAudioLanguages: files.VideoAudioLanguages ? files.VideoAudioLanguages.map(f => f.originalname) : [],
                VideoSubtitles: files.VideoSubtitles ? files.VideoSubtitles.map(f => f.originalname) : [],
            };

            const filesToClean = []
                .concat(uploadedFiles.ContentVideos)
                .concat(uploadedFiles.VideoAudioLanguages)
                .concat(uploadedFiles.VideoSubtitles);

            if (!CourseId || !operation) {
                if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                return res.status(400).json({ message: 'Missing CourseId or operation', success: false });
            }

            const FindedCourse = await CoachingCourseModel.findOne({ _id: CourseId });
            if (!FindedCourse) {
                if (filesToClean) await this.cleanFiles(filesToClean);
                return res.status(400).json({ message: 'Course not found', success: false });
            }

            const courseDirName = FindedCourse.CourseName + '-' + FindedCourse.ProviderId;
            const PrivateCoursePath = path.join(this.privateDir, courseDirName);
            await fs.mkdir(PrivateCoursePath, { recursive: true });

            courseData.HeadCourseCatId = FindedCourse.HeadCourseCatId;
            courseData.SubCourseCatId = FindedCourse.SubCourseCatId;
            courseData.ProviderId = FindedCourse.ProviderId;
            courseData.ProviderType = FindedCourse.ProviderType;
            courseData.companyId = FindedCourse.companyId;
            courseData.ConnectedWith = FindedCourse.ConnectedWith;
            courseData.CourseName = FindedCourse.CourseName;

            if (operation === 'delete') {
                if (!PlayListId) {
                    if (filesToClean && filesToClean.length) await this.cleanFiles(filesToClean);
                    return res.status(400).json({ message: 'Please provide PlayListId', success: false });
                }

                const playlist = FindedCourse.CourseContent.find(c => c._id == PlayListId);

                if (!playlist || !Array.isArray(playlist.CourseData)) {
                    if (filesToClean && filesToClean.length) await this.cleanFiles(filesToClean);
                    return res.status(404).json({ message: 'Playlist or content data not found', success: false });
                }

                let videoDuration = 0;

                const videos = await CoachingVideoModel.find({ _id: { $in: playlist.CourseData } });
                for (const video of videos) {
                    videoDuration += video.VideoDuration;
                    if (video.Quizes && video.Quizes.length) {
                        for (const quizId of video.Quizes) {
                            await QuizModel.deleteOne({ _id: quizId });
                        }
                    }
                    await CoachingVideoModel.findOneAndDelete({ _id: video._id });
                }

                const playlistDir = path.join(this.privateDir, courseDirName, playlist.Heading);
                const fileExistsOrNot = await this.fileExists(playlistDir);
                if (fileExistsOrNot) {
                    await fs.rm(playlistDir, { recursive: true, force: true });
                }

                const hlsPlaylistDir = path.join(this.publicDir, 'streams', courseDirName, playlist.Heading);
                const hlsExists = await this.fileExists(hlsPlaylistDir);
                if (hlsExists) {
                    await fs.rm(hlsPlaylistDir, { recursive: true, force: true });
                }

                const updatedResult = await CoachingCourseModel.updateOne(
                    { _id: CourseId, companyId: companyId },
                    {
                        $pull: { CourseContent: { _id: PlayListId } },
                        $set: { CourseDuration: FindedCourse.CourseDuration - videoDuration }
                    }
                );

                if (filesToClean && filesToClean.length) await this.cleanFiles(filesToClean);
                return res.status(200).json({ message: 'PlayList Deleted', success: true, data: updatedResult });
            }

            if (operation === 'add') {
                const publicBaseUrl = path.join('/', courseDirName).replace(/\\/g, '/');
                const { courseContentFinal, totalDuration } = await this.processVideoContent(
                    courseData,
                    PrivateCoursePath,
                    uploadedFiles,
                    publicBaseUrl
                );
                const newDuration = FindedCourse.CourseDuration + totalDuration;
                const result = await CoachingCourseModel.updateOne(
                    { _id: CourseId, companyId: companyId },
                    {
                        $addToSet: { CourseContent: { $each: courseContentFinal } },
                        $set: { CourseDuration: newDuration }
                    },
                    { new: true }
                );

                if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                return res.status(200).json({ message: 'Heading Added', success: true, data: result });
            }

            if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
            return res.status(400).json({ message: 'Invalid operation', success: false });

        } catch (error) {
            console.error('Error in UpdatePlaylistHeading:', error);
            const filesToClean = []
                .concat(uploadedFiles.ContentVideos || [])
                .concat(uploadedFiles.VideoAudioLanguages || [])
                .concat(uploadedFiles.VideoSubtitles || []);
            if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
            return res.status(500).json({ error: error.message, success: false });
        }
    }

    async UpdateVideoAndQuizes(req, res) {
        let uploadedFiles = {};
        try {
            let courseData = JSON.parse(req.body.data);
            let { CourseId, PlayListId, VideoId, QuizId } = req.body;
            let companyId = req.query.companyId;
            let operation = req.query.operation;
            const files = req.files;

            uploadedFiles = {
                ContentVideos: files.ContentVideos ? files.ContentVideos.map(f => f.originalname) : [],
                VideoAudioLanguages: files.VideoAudioLanguages ? files.VideoAudioLanguages.map(f => f.originalname) : [],
                VideoSubtitles: files.VideoSubtitles ? files.VideoSubtitles.map(f => f.originalname) : [],
            };
            const filesToClean = []
                .concat(uploadedFiles.ContentVideos || [])
                .concat(uploadedFiles.VideoAudioLanguages || [])
                .concat(uploadedFiles.VideoSubtitles || []);

            let FindedCourse = await CoachingCourseModel.findOne({ _id: CourseId });

            if (!FindedCourse) {
                if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                return res.status(400).json({ message: 'Course not found', success: false });
            }

            const courseDirName = `${FindedCourse.CourseName}-${FindedCourse.ProviderId}`;
            const coursePath = path.join(this.privateDir, courseDirName);
            await fs.mkdir(coursePath, { recursive: true });
            let playList = FindedCourse.CourseContent.find(c => c._id == PlayListId);

            if (operation == 'add') {
                courseData.HeadCourseCatId = FindedCourse.HeadCourseCatId;
                courseData.SubCourseCatId = FindedCourse.SubCourseCatId;
                courseData.ProviderId = FindedCourse.ProviderId;
                courseData.ProviderType = FindedCourse.ProviderType;
                courseData.companyId = FindedCourse.companyId;
                courseData.ConnectedWith = FindedCourse.ConnectedWith;
                courseData.CourseName = FindedCourse.CourseName;

                if (!playList) {
                    if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                    return res.status(404).json({ message: 'Playlist not found', success: false });
                }
                courseData.Heading = playList.Heading;

                if (courseData.ContainedData && courseData.ContainedData.length !== 0) {
                    let { videoDataIds, totalDuration } = await this.UpdateprocessVideoContent(
                        courseData,
                        coursePath,
                        uploadedFiles
                    );

                    let VideoDuration = FindedCourse.CourseDuration + totalDuration;
                    for (const EachVideoId of videoDataIds) {
                        await this.resolveVideoOrders(CourseId, PlayListId, EachVideoId, 'add', VideoDuration);
                    }

                    if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                    return res.status(200).json({ message: 'video added', success: true });

                } else if (courseData.QuizData) {
                    if (!VideoId) {
                        if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                        return res.status(400).json({ message: 'please provide proper data', success: false });
                    }

                    const quizIds = courseData.QuizData
                        ? await this.processQuizData(courseData.QuizData, {
                            HeadCourseCatId: FindedCourse.HeadCourseCatId,
                            SubCourseCatId: FindedCourse.SubCourseCatId,
                            ProviderType: FindedCourse.ProviderType,
                            ProviderId: FindedCourse.ProviderId,
                            companyId: FindedCourse.companyId,
                            ConnectedWith: FindedCourse.ConnectedWith
                        })
                        : [];

                    let updateTheVideoQuizes = await CoachingVideoModel.findOneAndUpdate(
                        { _id: VideoId, companyId: companyId },
                        { $addToSet: { Quizes: { $each: quizIds } } },
                        { new: true }
                    );

                    if (!updateTheVideoQuizes) {
                        if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                        return res.status(400).json({ message: 'quiz not added', success: false });
                    }

                    if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                    return res.status(200).json({ message: 'quiz added', success: true });
                }

            } else if (operation == 'delete') {
                if (!CourseId || !PlayListId || !VideoId) {
                    if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                    return res.status(400).json({ message: 'Please provide proper data', success: false });
                }

                let findedVideo = await CoachingVideoModel.findOne({ _id: VideoId });

                if (VideoId && QuizId) {
                    if (findedVideo) {
                        const existingQuizId = findedVideo.Quizes.find((quiz) => quiz == QuizId);
                        if (existingQuizId) {
                            let deleteQuiz = await QuizModel.findOneAndDelete({ _id: QuizId });
                            if (deleteQuiz) {
                                let updatedVideo = await CoachingVideoModel.findOneAndUpdate(
                                    { _id: VideoId, companyId: companyId },
                                    { $pull: { Quizes: QuizId } },
                                    { new: true }
                                );
                                if (!updatedVideo) {
                                    if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                                    return res.status(400).json({ message: 'Error updating video quiz list', success: false });
                                }
                                if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                                return res.status(200).json({ message: 'Video quiz list updated', success: true });
                            } else {
                                if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                                return res.status(400).json({ message: 'Error deleting quiz', success: false });
                            }
                        }
                    }
                } else if (VideoId) {
                    if (findedVideo) {
                        let currentHeading, nextVideoId;
                        FindedCourse.CourseContent.forEach((content) => {
                            content.CourseData.forEach((videoId, index) => {
                                if (videoId.toString() === VideoId.toString()) {
                                    currentHeading = content.Heading;
                                    nextVideoId = (index + 1 < content.CourseData.length)
                                        ? content.CourseData[index + 1]
                                        : (index - 1 >= 0 ? content.CourseData[index - 1] : null);
                                }
                            });
                        });

                        if (findedVideo.Quizes && nextVideoId) {
                            await CoachingVideoModel.findOneAndUpdate(
                                { _id: nextVideoId, companyId: companyId },
                                { $addToSet: { Quizes: { $each: findedVideo.Quizes } } }
                            );
                        } else {
                            if (findedVideo.Quizes && findedVideo.Quizes.length > 0) {
                                await Promise.all(findedVideo.Quizes.map(async (quizId) => {
                                    let quiz = await QuizModel.findOne({ _id: quizId });
                                    if (quiz) await QuizModel.deleteOne({ _id: quizId });
                                }));
                            }
                        }

                        const deleteFile = async (filePath) => {
                            let fileExists = await this.fileExists(filePath);
                            if (fileExists) await fs.unlink(filePath);
                        };

                        if (findedVideo.videoFile && currentHeading) {
                            let videoFilePath = path.join(coursePath, currentHeading, 'VideoFiles', findedVideo.videoFile);
                            await deleteFile(videoFilePath);
                        }

                        if (findedVideo.VideoLanguages) {
                            await Promise.all(findedVideo.VideoLanguages.map(async (audio) => {
                                let audioPath = path.join(coursePath, currentHeading, 'VideoAudioFiles', audio.VideoLanguagesFile);
                                await deleteFile(audioPath);
                            }));
                        }

                        if (findedVideo.Subtitles) {
                            await Promise.all(findedVideo.Subtitles.map(async (subtitle) => {
                                let subtitlePath = path.join(coursePath, currentHeading, 'VideoSubtitlesFile', subtitle.SubtitleFile);
                                await deleteFile(subtitlePath);
                            }));
                        }

                        if (currentHeading && findedVideo.title) {
                            const hlsVideoDir = path.join(this.publicDir, 'streams', courseDirName, currentHeading, findedVideo.title);
                            const hlsExists = await this.fileExists(hlsVideoDir);
                            if (hlsExists) {
                                await fs.rm(hlsVideoDir, { recursive: true, force: true });
                            }
                        }

                        let videoDuration = FindedCourse.CourseDuration - findedVideo.VideoDuration;
                        let deletedVideo = await CoachingVideoModel.findOneAndDelete({ _id: VideoId });
                        if (!deletedVideo) {
                            if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                            return res.status(400).json({ message: 'Error deleting video', success: false });
                        }

                        await this.resolveVideoOrders(CourseId, PlayListId, { _id: findedVideo._id, order: findedVideo.order }, 'delete', videoDuration);
                        if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                        return res.status(200).json({ message: 'Video deleted', success: true });
                    } else {
                        if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                        return res.status(400).json({ message: 'video not found', success: false });
                    }
                }
            }

        } catch (error) {
            console.error('Error in UpdateVideoAndQuizes:', error);
            if (uploadedFiles) {
                const filesToClean = []
                    .concat(uploadedFiles.ContentVideos || [])
                    .concat(uploadedFiles.VideoAudioLanguages || [])
                    .concat(uploadedFiles.VideoSubtitles || []);
                if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
            }
            return res.status(500).json({ error: error.message, success: false });
        }
    }

    async AccessCourseContent(req, res) {
        try {
            let { CourseName, ProviderId, PlayListName, VideoId } = req.body;
            let companyId = req.query.companyId;

            let FindedVideo = await CoachingVideoModel.findOne({ _id: VideoId, companyId: companyId });
            if (!FindedVideo) {
                return res.status(400).json({ message: 'Video Not Found', success: false });
            }
            if (!CourseName || !ProviderId || !PlayListName) {
                return res.status(400).json({ message: 'please provide all data', success: false });
            }

            if (FindedVideo.Streaming && FindedVideo.Streaming.masterM3U8) {
                return res.status(200).json({
                    masterM3U8: FindedVideo.Streaming.masterM3U8,
                    audioTracks: FindedVideo.Streaming.audioTracks,
                    subtitles: FindedVideo.Streaming.subtitles,
                    success: true
                });
            }

            let VideoFilePath = path.join(this.privateDir, `${CourseName}-${ProviderId}`, PlayListName, 'VideoFiles', FindedVideo.videoFile);
            let FileIsOrNot = await this.fileExists(VideoFilePath);
            if (!FileIsOrNot) {
                return res.status(400).json({ message: "video file not found", success: false });
            }
            return res.sendFile(path.resolve(VideoFilePath));

        } catch (error) {
            return res.status(500).json({ message: "Internal Server Error", error: error.message, success: false });
        }
    }
}

module.exports = new CourseService();