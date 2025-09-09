const { ObjectId } = require('mongodb');
const { CoachingCourceModel, CoachingVideoModel, QuizModel } = require('./CoachingCource.model');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { type } = require('os');
const { success } = require('../paytm/paytm.controller');
const ffprobePath = path.join("C:", "ffmpeg", "bin", "ffprobe.exe");
// const srt2vtt = require('srt-to-vtt');
const { exec } = require('child_process');

ffmpeg.setFfprobePath(ffprobePath);
class CourseService {
    constructor() {
        this.tempDir = path.join(__dirname, '..', '..', 'public', 'CourceTemporarlyData');
        this.publicDir = path.join(__dirname, '..', '..', 'public');
        this.privateDir = path.join(__dirname, '..', '..', 'private');
    }

    extractAudio(videoPath, outputPath) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Audio extraction timed out')), 30000);
            ffmpeg(videoPath)
                .noVideo()
                .audioCodec('aac')
                .output(outputPath)
                .on('end', () => { clearTimeout(timeout); resolve(outputPath); })
                .on('error', (error) => { clearTimeout(timeout); reject(error); })
                .run();
        });
    }
    // extractSubtitles(videoPath, outputPath) {
    //     return new Promise((resolve, reject) => {
    //         const timeout = setTimeout(() => reject(new Error('Subtitle extraction timed out')), 30000);
    //         ffmpeg(videoPath)
    //             .outputOptions('-map 0:s:0')
    //             .output(outputPath)
    //             .on('end', () => { clearTimeout(timeout); resolve(outputPath); })
    //             .on('error', (error) => { clearTimeout(timeout); reject(error); })
    //             .run();
    //     });
    // }
    async extractSubtitles(videoPath, outputPath) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Subtitle extraction timed out')), 30000);

            // First check if the video actually has subtitles
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

                // If subtitles exist, extract them
                ffmpeg(videoPath)
                    .outputOptions('-map 0:s:0') // Map first subtitle stream
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
    getVideoDuration(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (error, metadata) => {
                if (error) return reject(new Error(`Video duration extraction failed: ${error.message}`));
                const duration = metadata.format && metadata.format.duration;
                if (!duration) return reject(new Error('Unable to extract video duration.'));
                resolve(duration);
            });
        });
    }

    cleanFiles(files) {
        return Promise.all(
            files.map(file => {
                const filePath = path.join(this.tempDir, file);
                return fs.unlink(filePath).catch(err => { if (err.code !== 'ENOENT') throw err; });
            })
        ).catch(error => console.error('Error cleaning files:', error));
    }
    validateCourseData(courseData, files) {
        const requiredFields = [
            'CourceName', 'ProviderId', 'companyId',
            'HeadCourceCatId', 'SubCourceCatId', 'ProviderType', 'ContentData'
        ];
        const missing = requiredFields.filter(f => !courseData[f]);
        if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`);

        if (!courseData.ContentData || courseData.ContentData.length === 0)
            throw new Error('Course content is required');

        if (!files.CourceThumbnail || !files.CourceThumbnail[0] ||
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

    processQuizData(quizData, courseInfo) {
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
                    // Convert to VTT using ffmpeg
                    await new Promise((resolve, reject) => {
                        ffmpeg()
                            .input(s.path)
                            .outputOptions('-c:s webvtt') // Force WebVTT output
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
                // Skip this subtitle but continue with others
                continue;
            }
        }
        return out;
    }
    async writeMasterM3U8(outDir, videoPlRel, audioPlaylistsRel, subtitlePlaylistsRel) {
        const lines = [
            '#EXTM3U',
            '#EXT-X-VERSION:3',

            // Add audio tracks
            ...audioPlaylistsRel.map(a =>
                `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio_grp",NAME="${a.label}",DEFAULT=${a.default ? 'YES' : 'NO'},AUTOSELECT=YES,URI="${a.uri}"`
            ),

            // Add subtitle tracks
            ...subtitlePlaylistsRel.map(s =>
                `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs_grp",NAME="${s.label}",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,URI="${s.uri}"`
            ),

            // Video stream reference (with audio + subtitles)
            `#EXT-X-STREAM-INF:BANDWIDTH=2500000,CODECS="avc1.4d401f",AUDIO="audio_grp",SUBTITLES="subs_grp"`,
            `${videoPlRel}`
        ];

        await fs.writeFile(path.join(outDir, 'master.m3u8'), lines.join('\n'), 'utf8');
    }

    async writeMasterM3U8(outDir, videoPlRel, audioPlaylistsRel, subtitlePlaylistsRel) {
        const lines = [
            '#EXTM3U',
            '#EXT-X-VERSION:3',
            '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio_grp",NAME="Original",DEFAULT=YES,AUTOSELECT=YES'
        ];

        // Add audio tracks
        audioPlaylistsRel.forEach(a => {
            if (!a.default) {
                lines.push(
                    `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio_grp",NAME="${a.label}",DEFAULT=NO,AUTOSELECT=YES,URI="${a.uri}"`
                );
            }
        });

        // Add subtitle tracks if they exist
        if (subtitlePlaylistsRel.length > 0) {
            subtitlePlaylistsRel.forEach(s => {
                lines.push(
                    `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs_grp",NAME="${s.label}",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,URI="${s.uri}"`
                );
            });
        }

        // Video stream reference
        lines.push(
            `#EXT-X-STREAM-INF:BANDWIDTH=2500000,CODECS="avc1.4d401f",AUDIO="audio_grp"${subtitlePlaylistsRel.length > 0 ? ',SUBTITLES="subs_grp"' : ''}`,
            videoPlRel
        );

        await fs.writeFile(path.join(outDir, 'master.m3u8'), lines.join('\n'), 'utf8');
    }
    
    async packageToHls({ inputVideo, inputAudios = [], inputSubtitles = [], outDirAbs, publicBaseUrl }) {
        // Ensure output folder exists
        if (!fssync.existsSync(outDirAbs)) {
            await fs.mkdir(outDirAbs, { recursive: true });
        }

        // 1️⃣ Video HLS conversion
        await this.makeVideoHls(inputVideo, outDirAbs);

        // 2️⃣ Audio HLS conversion
        const audioSources = [{ label: 'Original', path: inputVideo, isFromVideo: true }];
        inputAudios.forEach(a => {
            if (a.path && fssync.existsSync(a.path)) {
                audioSources.push({ label: a.label || 'Unknown', path: a.path });
            } else {
                console.warn(`⚠ Skipping invalid/missing audio: ${a.path}`);
            }
        });

        const audioPlsAbs = await this.makeAudioHls(audioSources, outDirAbs);

        // 3️⃣ Subtitle handling (safe)
        const validSubtitles = inputSubtitles.filter(s =>
            s.path && typeof s.path === 'string' && s.path.trim() && fssync.existsSync(s.path)
        );

        let subsMeta = [];
        if (validSubtitles.length > 0) {
            subsMeta = await this.normalizeSubtitlesToVtt(validSubtitles, outDirAbs, publicBaseUrl);
        }

        // 4️⃣ Playlist references
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

        // 5️⃣ Master playlist generation
        await this.writeMasterM3U8(outDirAbs, videoPlRel, audioPlRel, subsPlRel);

        // 6️⃣ Public URLs
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
                        HeadCourceCatId: content.HeadCourceCatId,
                        SubCourceCatId: content.SubCourceCatId,
                        ProviderType: content.ProviderType,
                        ProviderId: content.ProviderId,
                        companyId: content.companyId,
                        ConnectedWith: content.ConnectedWith
                    })
                    : [];

                if (item.VideoData) {
                    // Validate video data
                    if (!item.VideoData.videoFile || !item.VideoData.title ||
                        !item.VideoData.description || !item.VideoData.order) {
                        throw new Error('Please provide all required video data');
                    }

                    const videoInfo = {
                        HeadCourceCatId: content.HeadCourceCatId,
                        SubCourceCatId: content.SubCourceCatId,
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

                    // Get video duration
                    const duration = await this.getVideoDuration(newVideoPath);
                    videoInfo.VideoDuration = duration;
                    totalDuration += duration;

                    // Handle audio and subtitles
                    const audioInputs = [];
                    const subtitleInputs = [];

                    // Try extracting original audio
                    try {
                        const extractedAudioPath = path.join(audioPath, `${videoFilename}.orig.aac`);
                        await this.extractAudio(newVideoPath, extractedAudioPath);
                        audioInputs.push({ label: 'Original', path: extractedAudioPath });
                    } catch (err) {
                        console.error('Audio extraction failed:', err.message);
                    }

                    // Try extracting subtitles if they exist
                    try {
                        const extractedSubtitlePath = path.join(subtitlesPath, `${videoFilename}.extracted.vtt`);
                        await this.extractSubtitles(newVideoPath, extractedSubtitlePath);
                        subtitleInputs.push({ label: 'Extracted', path: extractedSubtitlePath });
                    } catch (err) {
                        console.error('Subtitle extraction failed:', err.message);
                    }

                    // Process additional audio tracks
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

                    // Process additional subtitles
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

                    // Package to HLS
                    const hlsOutDir = path.join(
                        this.publicDir, 'streams',
                        `${content.CourceName}-${content.ProviderId}`,
                        section.Heading,
                        item.VideoData.title
                    );

                    const publicBaseUrl = path.join(
                        '/streams',
                        `${content.CourceName}-${content.ProviderId}`,
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

                    // Add streaming info to video document
                    videoInfo.Streaming = {
                        masterM3U8: masterUrl,
                        audioTracks: audioTracksMeta,
                        subtitles: subtitlesMeta
                    };

                    // Save video document
                    const video = new CoachingVideoModel(videoInfo);
                    const savedVideo = await video.save();
                    videoDataIds.push(savedVideo._id);
                }
            }

            if (videoDataIds.length > 0) {
                courseContentFinal.push({
                    Heading: section.Heading,
                    CourceData: videoDataIds
                });
            }
        }

        return { courseContentFinal, totalDuration };
    }
    async resolveVideoOrders(CourseId, PlayListId, currentVideoData, Operation, VideoDuration) {
        try {
            const courseData = await CoachingCourceModel.findOne({ _id: CourseId });
            if (!courseData) throw new Error("Course not found");

            const playlist = courseData.CourceContent.find(each => each._id.toString() === PlayListId.toString());
            if (!playlist) throw new Error("Playlist not found");

            const videoIds = playlist.CourceData || [];
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
            await Promise.all(ordered.map(async (v) => {
                if (v._id) {
                    await CoachingVideoModel.findOneAndUpdate(
                        { _id: v._id }, { $set: { order: v.order } }, { new: true }
                    );
                }
            }));

            const videoIdList = ordered.map(v => v._id);
            await CoachingCourceModel.findOneAndUpdate(
                { _id: CourseId, 'CourceContent._id': PlayListId },
                { $set: { 'CourceContent.$.CourceData': videoIdList, CourceDuration: VideoDuration } },
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
                CourceThumbnail: files.CourceThumbnail[0] ? files.CourceThumbnail[0].originalname : null,
                CertificateTemplate: files.CertificateTemplate[0] ? files.CertificateTemplate[0].originalname : null
            };

            await this.validateCourseData(courseData, files);

            const courseDirName = `${courseData.CourceName}-${courseData.ProviderId}`;
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

            if (uploadedFiles.CourceThumbnail) {
                const pubThumbDir = path.join(coursePublicPath, 'CourceThumbnail');
                const priThumbDir = path.join(coursePrivatePath, 'CourceThumbnail');
                await fs.mkdir(pubThumbDir, { recursive: true });
                await fs.mkdir(priThumbDir, { recursive: true });
                await fs.rename(
                    path.join(this.tempDir, uploadedFiles.CourceThumbnail),
                    path.join(pubThumbDir, uploadedFiles.CourceThumbnail)
                );
                await fs.copyFile(
                    path.join(pubThumbDir, uploadedFiles.CourceThumbnail),
                    path.join(priThumbDir, uploadedFiles.CourceThumbnail)
                );
            }

            const courseDocument = {
                CourceName: courseData.CourceName,
                ProviderId: courseData.ProviderId,
                ProviderType: courseData.ProviderType,
                companyId: courseData.companyId,
                HeadCourceCatId: courseData.HeadCourceCatId,
                SubCourceCatId: courseData.SubCourceCatId,
                CourceDuration: totalDuration,
                CourceThumbnail: uploadedFiles.CourceThumbnail,
                Certificate: uploadedFiles.CertificateTemplate,
                CourceContent: courseContentFinal,
            };
            if (courseData.Skills) courseDocument.Skills = courseData.Skills;
            if (courseData.SkillsId) courseDocument.SkillsId = courseData.SkillsId;
            if (courseData.Price) courseDocument.Price = courseData.Price;
            if (courseData.TextAreas) courseDocument.TextAreas = courseData.TextAreas;
            if (courseData.Level) courseDocument.Level = courseData.Level;
            if (courseData.offerPercentage) courseDocument.offerPercentage = courseData.offerPercentage;
            if (courseData.ConnectedWith) courseDocument.ConnectedWith = courseData.ConnectedWith;
            if (courseData.CertificateConfig) courseDocument.CertificateConfig = courseData.CertificateConfig;

            const result = await CoachingCourceModel.create(courseDocument);

            const filesToClean = []
                .concat(uploadedFiles.ContentVideos || [])
                .concat(uploadedFiles.VideoAudioLanguages || [])
                .concat(uploadedFiles.VideoSubtitles || []);
            if (uploadedFiles.CourceThumbnail) filesToClean.push(uploadedFiles.CourceThumbnail);
            if (uploadedFiles.CertificateTemplate) filesToClean.push(uploadedFiles.CertificateTemplate);
            if (filesToClean.length) await this.cleanFiles(filesToClean);

            return res.status(200).json({ data: result, success: true });

        } catch (error) {
            console.error('Error adding course:', error);
            if (uploadedFiles) {
                const filesToClean = []
                    .concat(uploadedFiles.ContentVideos || [])
                    .concat(uploadedFiles.VideoAudioLanguages || [])
                    .concat(uploadedFiles.VideoSubtitles || []);
                if (uploadedFiles.CourceThumbnail) filesToClean.push(uploadedFiles.CourceThumbnail);
                if (uploadedFiles.CertificateTemplate) filesToClean.push(uploadedFiles.CertificateTemplate);
                if (filesToClean.length) await this.cleanFiles(filesToClean);
            }
            return res.status(500).json({ error: error.message, success: false });
        }
    }
    async UpdateprocessVideoContent(content, coursePath, uploadedFiles) {
        console.log(content, 'content')
        const courseContentFinal = [];
        let totalDuration = 0;
        let videoDataIds = [];

        for (const section of content.ContainedData) {
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




            const quizIds = section.QuizData
                ? await this.processQuizData(section.QuizData, {
                    HeadCourceCatId: content.HeadCourceCatId,
                    SubCourceCatId: content.SubCourceCatId,
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
                    HeadCourceCatId: content.HeadCourceCatId,
                    SubCourceCatId: content.SubCourceCatId,
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

                const videoAudios = [];
                const videoSubtitles = [];

                try {
                    const extractedAudioPath = path.join(audioPath, videoFilename + 'Extracted.aac');
                    await this.extractAudio(newVideoPath, extractedAudioPath);
                    videoAudios.push({
                        Language: 'Extracted',
                        VideoLanguagesFile: videoFilename + 'Extracted.aac'
                    });
                } catch (err) {
                    console.error('Audio extraction failed:', err);
                }

                try {
                    const extractedSubtitlePath = path.join(subtitlesPath, videoFilename + 'Extracted.srt');
                    await this.extractSubtitles(newVideoPath, extractedSubtitlePath);
                    videoSubtitles.push({
                        Language: 'Extracted',
                        SubtitleFile: videoFilename + 'Extracted.srt'
                    });
                } catch (err) {
                    console.error('Subtitle extraction failed:', err);
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
                                videoAudios.push({
                                    Language: audio.Language || 'Unknown',
                                    VideoLanguagesFile: audioFilename
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
                                videoSubtitles.push({
                                    Language: subtitle.Language || 'Unknown',
                                    SubtitleFile: subtitleFilename
                                });
                            }
                        }
                    }
                }

                if (videoAudios.length > 0) videoInfo.VideoLanguages = videoAudios;
                if (videoSubtitles.length > 0) videoInfo.Subtitles = videoSubtitles;

                const video = new CoachingVideoModel(videoInfo);
                const savedVideo = await video.save();
                videoDataIds.push({ _id: savedVideo._id, order: savedVideo.order });
            }

            if (videoDataIds.length > 0) {
                courseContentFinal.push({
                    Heading: section.Heading,
                    CourceData: videoDataIds
                });
            }
        }
        return { videoDataIds, totalDuration };
    }
    validateCourseDataForUpdateTheCourceDetails(courseData, filesToClean) {
        const required = ['CourceName', 'companyId', 'HeadCourceCatId', 'SubCourceCatId'];
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

    // extractAudio(videoPath, outputPath) {
    //     return new Promise((resolve, reject) => {
    //         const timeout = setTimeout(() => {
    //             reject(new Error('Audio extraction timed out'));
    //         }, 30000);

    //         ffmpeg(videoPath)
    //             .noVideo()
    //             .audioCodec('aac')
    //             .output(outputPath)
    //             .on('end', () => {
    //                 clearTimeout(timeout);
    //                 resolve(outputPath);
    //             })
    //             .on('error', (error) => {
    //                 clearTimeout(timeout);
    //                 reject(error);
    //             })
    //             .run();
    //     });
    // }

    // extractSubtitles(videoPath, outputPath) {
    //     return new Promise((resolve, reject) => {
    //         const timeout = setTimeout(() => {
    //             reject(new Error('Subtitle extraction timed out'));
    //         }, 30000);

    //         ffmpeg(videoPath)
    //             .outputOptions('-map 0:s:0')
    //             .output(outputPath)
    //             .on('end', () => {
    //                 clearTimeout(timeout);
    //                 resolve(outputPath);
    //             })
    //             .on('error', (error) => {
    //                 clearTimeout(timeout);
    //                 reject(error);
    //             })
    //             .run();
    //     });
    // }
    // async fileExists(filePath) {
    //     try {
    //         await fs.access(filePath);
    //         return true;
    //     } catch (err) {
    //         return false;
    //     }
    // }
    // getVideoDuration(videoPath) {
    //     return new Promise((resolve, reject) => {
    //         ffmpeg.ffprobe(videoPath, (error, metadata) => {
    //             if (error) {
    //                 return reject(new Error(`Video duration extraction failed: ${error.message}`));
    //             }
    //             const duration = metadata.format && metadata.format.duration;
    //             if (!duration) {
    //                 return reject(new Error('Unable to extract video duration.'));
    //             }
    //             resolve(duration);
    //         });
    //     });
    // }

    // cleanFiles(files) {
    //     return Promise.all(
    //         files.map(file => {
    //             const filePath = path.join(this.tempDir, file);
    //             return fs.unlink(filePath).catch(err => {
    //                 if (err.code !== 'ENOENT') throw err;
    //             });
    //         })
    //     ).catch(error => {
    //         console.error('Error cleaning files:', error);
    //     });
    // }

    // validateCourseData(courseData, files) {
    //     const requiredFields = [
    //         'CourceName',
    //         'ProviderId',
    //         'companyId',
    //         'HeadCourceCatId',
    //         'SubCourceCatId',
    //         'ProviderType',
    //         'ContentData'
    //     ];

    //     const missingFields = requiredFields.filter(field => !courseData[field]);
    //     if (missingFields.length > 0) {
    //         throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    //     }

    //     if (!courseData.ContentData || courseData.ContentData.length === 0) {
    //         throw new Error('Course content is required');
    //     }

    //     if (!files.CourceThumbnail || !files.CourceThumbnail[0] ||
    //         !files.CertificateTemplate || !files.CertificateTemplate[0]) {
    //         throw new Error('Thumbnail and certificate template are required');
    //     }

    //     if (courseData.ConnectedWith) {
    //         for (const connection of courseData.ConnectedWith) {
    //             if (connection.connectedType &&
    //                 (!connection.connectedIds || connection.connectedIds.length === 0)) {
    //                 throw new Error('If connected with someone then select them');
    //             }
    //         }
    //     }
    // }
    // validateCourseDataForUpdateTheCourceDetails(courseData, filesToClean) {
    //     const requiredFields = [
    //         'CourceName',
    //         'companyId',
    //         'HeadCourceCatId',
    //         'SubCourceCatId',
    //     ];

    //     const missingFields = requiredFields.filter(field => !courseData[field]);
    //     if (missingFields.length > 0) {
    //         if (filesToClean.length !== 0) {
    //             this.cleanFiles(filesToClean);
    //         }
    //         throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    //     }
    //     if (courseData.ConnectedWith) {
    //         for (const connection of courseData.ConnectedWith) {
    //             if (connection.connectedType &&
    //                 (!connection.connectedIds || connection.connectedIds.length === 0)) {
    //                 if (filesToClean.length !== 0) {
    //                     this.cleanFiles(filesToClean);
    //                 }
    //                 throw new Error('If connected with someone then select them');
    //             }
    //         }
    //     }
    // }
    // processQuizData(quizData, courseInfo) {
    //     const quizIds = [];

    //     for (const quiz of quizData) {
    //         if (!quiz || !quiz.QuizType) continue;

    //         const newQuiz = Object.assign({}, courseInfo, {
    //             QuizType: quiz.QuizType
    //         });

    //         if (quiz.QuizType === 'Coding') {
    //             if (!quiz.CodingData || !quiz.CodingData.CodingQuestion || !quiz.CodingData.CodingAnswer) {
    //                 throw new Error('Coding quiz requires both question and answer');
    //             }
    //             newQuiz.CodingQuiz = {
    //                 CodingQuestion: quiz.CodingData.CodingQuestion,
    //                 CodingAnswer: quiz.CodingData.CodingAnswer
    //             };
    //         }
    //         else if (quiz.QuizType === 'PractiseTest') {
    //             if (!quiz.PractiseTestData || quiz.PractiseTestData.length === 0) {
    //                 throw new Error('Practise test requires at least one question');
    //             }
    //             newQuiz.PractiseTestQuiz = quiz.PractiseTestData;
    //         }
    //         else if (quiz.QuizType === 'Mcq') {
    //             if (!quiz.McqData || quiz.McqData.length === 0) {
    //                 throw new Error('MCQ quiz requires at least one question');
    //             }
    //             newQuiz.McqQuiz = quiz.McqData;
    //         }

    //         const result = new QuizModel(newQuiz);
    //         quizIds.push(result.save());
    //     }

    //     return Promise.all(quizIds).then(results => results.map(r => r._id));
    // }

    // async processVideoContent(content, coursePath, uploadedFiles) {

    //     const courseContentFinal = [];
    //     let totalDuration = 0;

    //     for (const section of content.ContentData) {
    //         if (!section || !section.Heading || !section.ContainedData || section.length === 0) {
    //             continue;
    //         }

    //         const sectionPath = path.join(coursePath, section.Heading);
    //         await fs.mkdir(sectionPath, { recursive: true });

    //         const audioPath = path.join(sectionPath, 'VideoAudioFiles');
    //         const subtitlesPath = path.join(sectionPath, 'VideoSubtitlesFile');
    //         const videoPath = path.join(sectionPath, 'VideoFiles');

    //         await Promise.all([
    //             fs.mkdir(audioPath, { recursive: true }),
    //             fs.mkdir(subtitlesPath, { recursive: true }),
    //             fs.mkdir(videoPath, { recursive: true })
    //         ]);

    //         let videoDataIds = [];

    //         for (const item of section.ContainedData) {
    //             if (!item) continue;

    //             const quizIds = item.QuizData
    //                 ? await this.processQuizData(item.QuizData, {
    //                     HeadCourceCatId: content.HeadCourceCatId,
    //                     SubCourceCatId: content.SubCourceCatId,
    //                     ProviderType: content.ProviderType,
    //                     ProviderId: content.ProviderId,
    //                     companyId: content.companyId,
    //                     ConnectedWith: content.ConnectedWith
    //                 })
    //                 : [];

    //             if (item.VideoData) {
    //                 if (!item.VideoData.videoFile || !item.VideoData.title ||
    //                     !item.VideoData.description || !item.VideoData.order) {
    //                     throw new Error('Please provide all required video data');
    //                 }

    //                 const videoInfo = {
    //                     HeadCourceCatId: content.HeadCourceCatId,
    //                     SubCourceCatId: content.SubCourceCatId,
    //                     ProviderType: content.ProviderType,
    //                     ProviderId: content.ProviderId,
    //                     companyId: content.companyId,
    //                     title: item.VideoData.title,
    //                     description: item.VideoData.description,
    //                     order: item.VideoData.order,
    //                     ConnectedWith: content.ConnectedWith,
    //                     Quizes: quizIds
    //                 };

    //                 if (item.VideoData.paid !== undefined) {
    //                     videoInfo.paid = item.VideoData.paid;
    //                 }

    //                 const videoFilename = item.VideoData.videoFile;
    //                 const oldVideoPath = path.join(this.tempDir, videoFilename);
    //                 const newVideoPath = path.join(videoPath, videoFilename);

    //                 if (!uploadedFiles.ContentVideos || !uploadedFiles.ContentVideos.includes(videoFilename)) {
    //                     throw new Error(`Video file not found: ${videoFilename}`);
    //                 }

    //                 await fs.rename(oldVideoPath, newVideoPath);
    //                 videoInfo.videoFile = videoFilename;

    //                 const duration = await this.getVideoDuration(newVideoPath);
    //                 videoInfo.VideoDuration = duration;
    //                 totalDuration += duration;

    //                 const videoAudios = [];
    //                 const videoSubtitles = [];

    //                 try {
    //                     const extractedAudioPath = path.join(audioPath, videoFilename + 'Extracted.aac');
    //                     await this.extractAudio(newVideoPath, extractedAudioPath);
    //                     videoAudios.push({
    //                         Language: 'Extracted',
    //                         VideoLanguagesFile: videoFilename + 'Extracted.aac'
    //                     });
    //                 } catch (err) {
    //                     console.error('Audio extraction failed:', err);
    //                 }

    //                 try {
    //                     const extractedSubtitlePath = path.join(subtitlesPath, videoFilename + 'Extracted.srt');
    //                     await this.extractSubtitles(newVideoPath, extractedSubtitlePath);
    //                     videoSubtitles.push({
    //                         Language: 'Extracted',
    //                         SubtitleFile: videoFilename + 'Extracted.srt'
    //                     });
    //                 } catch (err) {
    //                     console.error('Subtitle extraction failed:', err);
    //                 }

    //                 if (item.VideoData.VideoLanguages) {
    //                     for (const audio of item.VideoData.VideoLanguages) {
    //                         if (audio && audio.VideoLanguagesFile) {
    //                             const audioFilename = audio.VideoLanguagesFile;
    //                             const oldAudioPath = path.join(this.tempDir, audioFilename);
    //                             const newAudioPath = path.join(audioPath, audioFilename);

    //                             if (uploadedFiles.VideoAudioLanguages &&
    //                                 uploadedFiles.VideoAudioLanguages.includes(audioFilename)) {
    //                                 await fs.rename(oldAudioPath, newAudioPath);
    //                                 videoAudios.push({
    //                                     Language: audio.Language || 'Unknown',
    //                                     VideoLanguagesFile: audioFilename
    //                                 });
    //                             }
    //                         }
    //                     }
    //                 }

    //                 if (item.VideoData.Subtitles) {
    //                     for (const subtitle of item.VideoData.Subtitles) {
    //                         if (subtitle && subtitle.SubtitleFile) {
    //                             const subtitleFilename = subtitle.SubtitleFile;
    //                             const oldSubtitlePath = path.join(this.tempDir, subtitleFilename);
    //                             const newSubtitlePath = path.join(subtitlesPath, subtitleFilename);

    //                             if (uploadedFiles.VideoSubtitles &&
    //                                 uploadedFiles.VideoSubtitles.includes(subtitleFilename)) {
    //                                 await fs.rename(oldSubtitlePath, newSubtitlePath);
    //                                 videoSubtitles.push({
    //                                     Language: subtitle.Language || 'Unknown',
    //                                     SubtitleFile: subtitleFilename
    //                                 });
    //                             }
    //                         }
    //                     }
    //                 }

    //                 if (videoAudios.length > 0) videoInfo.VideoLanguages = videoAudios;
    //                 if (videoSubtitles.length > 0) videoInfo.Subtitles = videoSubtitles;

    //                 const video = new CoachingVideoModel(videoInfo);
    //                 const savedVideo = await video.save();
    //                 videoDataIds.push(savedVideo._id);
    //             }
    //         }

    //         if (videoDataIds.length > 0) {
    //             courseContentFinal.push({
    //                 Heading: section.Heading,
    //                 CourceData: videoDataIds
    //             });
    //         }
    //     }

    //     return { courseContentFinal, totalDuration };
    // }
    //   async resolveVideoOrders(CourseId, PlayListId, currentVideoData, Operation, VideoDuration) {
    //     try {
    //         const courseData = await CoachingCourceModel.findOne({ _id: CourseId });
    //         if (!courseData) throw new Error("Course not found");

    //         const playlist = courseData.CourceContent.find(each => each._id.toString() === PlayListId.toString());
    //         if (!playlist) throw new Error("Playlist not found");

    //         const videoIds = playlist.CourceData || [];
    //         const allVideos = await CoachingVideoModel.find({ _id: { $in: videoIds } });

    //         let orderedVideos = allVideos
    //             .map(video => ({ _id: video._id.toString(), order: video.order }))
    //             .sort((a, b) => a.order - b.order);

    //         if (Operation === 'add') {
    //             const newOrder = currentVideoData.order;

    //             orderedVideos = orderedVideos.map(video =>
    //                 video.order >= newOrder ? { ...video, order: video.order + 1 } : video
    //             );

    //             orderedVideos.push({ _id: currentVideoData._id.toString(), order: newOrder });

    //         } else if (Operation === 'delete') {
    //             const deletedOrder = currentVideoData.order;

    //             orderedVideos = orderedVideos
    //                 .filter(video => video._id !== currentVideoData._id.toString())
    //                 .map(video =>
    //                     video.order > deletedOrder ? { ...video, order: video.order - 1 } : video
    //                 );
    //         }

    //         orderedVideos.sort((a, b) => a.order - b.order);

    //         await Promise.all(orderedVideos.map(async (EachVideoId) => {
    //             if (EachVideoId._id) {
    //                 await CoachingVideoModel.findOneAndUpdate(
    //                     { _id: EachVideoId._id },
    //                     { $set: { order: EachVideoId.order } },
    //                     { new: true }
    //                 );
    //             }
    //         }));

    //         const videoIdList = orderedVideos.map(v => v._id);
    //         console.log(videoIdList, PlayListId, CourseId, VideoDuration, 'hello ')
    //         await CoachingCourceModel.findOneAndUpdate(
    //             { _id: CourseId, 'CourceContent._id': PlayListId },
    //             {
    //                 $set: {
    //                     'CourceContent.$.CourceData': videoIdList,
    //                     CourceDuration: VideoDuration
    //                 }
    //             },
    //             { new: true }
    //         );


    //     } catch (error) {
    //         console.error("Error in resolveVideoOrders:", error.message);
    //         throw error;
    //     }
    // }

    // async addCoachingCourse(req, res) {
    //     let uploadedFiles = {};
    //     try {
    //            console.log(req.body,'body')
    //         let courseData = JSON.parse(req.body.coursedata);
    //         console.log(courseData, 'data', typeof courseData, 'type');
    //         const files = req.files;
    //         console.log(req.files,'files')
    //         uploadedFiles = {
    //             ContentVideos: files.ContentVideos ? files.ContentVideos.map(f => f.originalname) : [],
    //             VideoAudioLanguages: files.VideoAudioLanguages ? files.VideoAudioLanguages.map(f => f.originalname) : [],
    //             VideoSubtitles: files.VideoSubtitles ? files.VideoSubtitles.map(f => f.originalname) : [],
    //             CourceThumbnail: files.CourceThumbnail && files.CourceThumbnail[0] ? files.CourceThumbnail[0].originalname : null,
    //             CertificateTemplate: files.CertificateTemplate && files.CertificateTemplate[0] ? files.CertificateTemplate[0].originalname : null
    //         };

    //         await this.validateCourseData(courseData, files);

    //         const courseDirName = `${courseData.CourceName}-${courseData.ProviderId}`;
    //         const coursePath = path.join(this.publicDir, courseDirName);
    //         const PrivateCoursePath = path.join(this.privateDir, courseDirName);
    //         await fs.mkdir(coursePath, { recursive: true });
    //         await fs.mkdir(PrivateCoursePath, { recursive: true });

    //         const { courseContentFinal, totalDuration } = await this.processVideoContent(
    //             courseData,
    //             PrivateCoursePath,
    //             uploadedFiles
    //         );

    //         if (uploadedFiles.CertificateTemplate && courseData.CertificateConfig) {
    //             const certDir = path.join(PrivateCoursePath, 'Certificate');
    //             await fs.mkdir(certDir, { recursive: true });
    //             await fs.rename(
    //                 path.join(this.tempDir, uploadedFiles.CertificateTemplate),
    //                 path.join(certDir, uploadedFiles.CertificateTemplate)
    //             );

    //         }

    //         if (uploadedFiles.CourceThumbnail) {
    //             const thumbDir = path.join(coursePath, 'CourceThumbnail');
    //             const privateThumbDir = path.join(PrivateCoursePath, 'CourceThumbnail');
    //             await fs.mkdir(thumbDir, { recursive: true });
    //             await fs.mkdir(privateThumbDir, { recursive: true });
    //             await fs.rename(
    //                 path.join(this.tempDir, uploadedFiles.CourceThumbnail),
    //                 path.join(thumbDir, uploadedFiles.CourceThumbnail)
    //             );
    //             await fs.copyFile(
    //                 path.join(thumbDir, uploadedFiles.CourceThumbnail),
    //                 path.join(privateThumbDir, uploadedFiles.CourceThumbnail)
    //             );
    //         }
    //         const courseDocument = {
    //             CourceName: courseData.CourceName,
    //             ProviderId: courseData.ProviderId,
    //             ProviderType: courseData.ProviderType,
    //             companyId: courseData.companyId,
    //             HeadCourceCatId: courseData.HeadCourceCatId,
    //             SubCourceCatId: courseData.SubCourceCatId,
    //             CourceDuration: totalDuration,
    //             CourceThumbnail: uploadedFiles.CourceThumbnail,
    //             Certificate: uploadedFiles.CertificateTemplate,
    //             CourceContent: courseContentFinal,
    //         };

    //         if (courseData.Skills) courseDocument.Skills = courseData.Skills;
    //         if (courseData.SkillsId) courseDocument.SkillsId = courseData.SkillsId;
    //         if (courseData.Price) courseDocument.Price = courseData.Price;
    //         if (courseData.TextAreas) courseDocument.TextAreas = courseData.TextAreas;
    //         if (courseData.Level) courseDocument.Level = courseData.Level;
    //         if (courseData.offerPercentage) courseDocument.offerPercentage = courseData.offerPercentage;
    //         if (courseData.ConnectedWith) courseDocument.ConnectedWith = courseData.ConnectedWith;
    //         if (courseData.CertificateConfig) courseDocument.CertificateConfig = courseData.CertificateConfig

    //         const result = await CoachingCourceModel.create(courseDocument);

    //         const filesToClean = []
    //             .concat(uploadedFiles.ContentVideos || [])
    //             .concat(uploadedFiles.VideoAudioLanguages || [])
    //             .concat(uploadedFiles.VideoSubtitles || []);

    //         if (uploadedFiles.CourceThumbnail) filesToClean.push(uploadedFiles.CourceThumbnail);
    //         if (uploadedFiles.CertificateTemplate) filesToClean.push(uploadedFiles.CertificateTemplate);

    //         if (filesToClean.length !== 0) {
    //             await this.cleanFiles(filesToClean);
    //         }
    //         return res.status(200).json({ data: result, success: true });

    //     } catch (error) {
    //         console.error('Error adding course:', error);

    //         if (uploadedFiles) {
    //             const filesToClean = []
    //                 .concat(uploadedFiles.ContentVideos || [])
    //                 .concat(uploadedFiles.VideoAudioLanguages || [])
    //                 .concat(uploadedFiles.VideoSubtitles || []);

    //             if (uploadedFiles.CourceThumbnail) filesToClean.push(uploadedFiles.CourceThumbnail);
    //             if (uploadedFiles.CertificateTemplate) filesToClean.push(uploadedFiles.CertificateTemplate);

    //             if (filesToClean.length !== 0) {
    //                 await this.cleanFiles(filesToClean);
    //             }
    //         }

    //         return res.status(500).json({
    //             error: error.message,
    //             success: false
    //         });
    //     }
    // }
    async getCoachingCourceData(matchCondition) {
        return await CoachingCourceModel.aggregate([
            { $match: matchCondition },

            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "HeadCourceCatId",
                    foreignField: "_id",
                    as: "HeadCoachingCategories"
                }
            },
            {
                $lookup: {
                    from: "coachingcategories",
                    localField: "SubCourceCatId",
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
                                { case: { $eq: ["$ProviderTypeValue.CourceProviderType", "Class"] }, then: "$ClassProviderInfo" },
                                { case: { $eq: ["$ProviderTypeValue.CourceProviderType", "Tutor"] }, then: "$TutorProviderInfo" },
                                { case: { $eq: ["$ProviderTypeValue.CourceProviderType", "University"] }, then: "$UniversityProviderInfo" },
                                { case: { $eq: ["$ProviderTypeValue.CourceProviderType", "Company"] }, then: "$CompanyProviderInfo" }
                            ],
                            default: []
                        }
                    },
                    ConnectedInfo: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$ConnectedTypeValue.CourceProviderType", "Class"] }, then: "$ClassConnectedInfo" },
                                { case: { $eq: ["$ConnectedTypeValue.CourceProviderType", "Tutor"] }, then: "$TutorConnectedInfo" },
                                { case: { $eq: ["$ConnectedTypeValue.CourceProviderType", "University"] }, then: "$UniversityConnectedInfo" },
                                { case: { $eq: ["$ConnectedTypeValue.CourceProviderType", "Company"] }, then: "$CompanyConnectedInfo" }
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

            { $unwind: { path: "$CourceContent", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "coachingvideos",
                    localField: "CourceContent.CourceData",
                    foreignField: "_id",
                    as: "CourceContent.Videos"
                }
            },

            { $unwind: { path: "$CourceContent.Videos", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "courcequizes",
                    localField: "CourceContent.Videos.Quizes",
                    foreignField: "_id",
                    as: "CourceContent.Videos.QuizesInfo"
                }
            },

            {
                $group: {
                    _id: {
                        courseId: "$_id",
                        heading: "$CourceContent.Heading"
                    },
                    CourseData: { $first: "$$ROOT" },
                    Videos: { $push: "$CourceContent.Videos" }
                }
            },

            {
                $group: {
                    _id: "$_id.courseId",
                    CourseInfo: { $first: "$CourseData" },
                    CourceContent: {
                        $push: {
                            Heading: "$_id.heading",
                            Videos: "$Videos"
                        }
                    }
                }
            },

            {
                $replaceRoot: {
                    newRoot: { $mergeObjects: ["$CourseInfo", { "CourceContent": "$CourceContent" }] }
                }
            }
        ]);
    }


    async getCoachingCource(req, res) {
        let { CourseId, CourceName, Skills, SkillsId, ProviderId, ProviderType, connectedId, connectedType, HeadCourceCatId, SubCourceCatId, companyId } = req.query;
        console.log("zzzzzzzzzzzzzzz", req.query)
        try {
            let matchCondition = { companyId: mongoose.Types.ObjectId(companyId) };

            if (CourceName) {
                matchCondition.CourceName = { $in: [String(CourceName)] };
            }
            if (Skills) {
                matchCondition.Skills = { $in: [String(Skills)] };
            }
            if (SkillsId) {
                if (!mongoose.Types.ObjectId.isValid(SkillsId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SkillsId = { $in: [mongoose.Types.ObjectId(SkillsId)] }
            }
            if (ProviderId) {
                if (!mongoose.Types.ObjectId.isValid(ProviderId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.ProviderId = mongoose.Types.ObjectId(ProviderId);
            }
            if (ProviderType) {
                if (!mongoose.Types.ObjectId.isValid(ProviderType)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.ProviderType = mongoose.Types.ObjectId(ProviderType);
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
                    elemMatch.connectedType = mongoose.Types.ObjectId(connectedType);
                }
                if (connectedId) {
                    elemMatch.connectedIds = { $in: [mongoose.Types.ObjectId(connectedId)] };
                }
                matchCondition.ConnectedWith = { $elemMatch: elemMatch };
            }
            if (HeadCourceCatId) {
                if (!mongoose.Types.ObjectId.isValid(HeadCourceCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.HeadCourceCatId = { $in: [mongoose.Types.ObjectId(HeadCourceCatId)] }
            }
            if (SubCourceCatId) {
                if (!mongoose.Types.ObjectId.isValid(SubCourceCatId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition.SubCourceCatId = { $in: [mongoose.Types.ObjectId(SubCourceCatId)] };
            }
            if (CourseId) {
                if (!mongoose.Types.ObjectId.isValid(CourseId)) {
                    return res.status(400).json({ message: 'Invalid ID format', success: false });
                }
                matchCondition._id = mongoose.Types.ObjectId(CourseId)
            }
            const data = await this.getCoachingCourceData(matchCondition);

            if (data.length === 0) {
                return res.status(404).json({ message: 'No Cource Found', success: false });
            }

            return res.status(200).json({ data: data, success: true });

        }
        catch (error) {
            console.error(error);
            return res.status(400).json({ error: error.message, success: false });
        }
    }

    async DeleteCoachingCource(req, resp) {
        try {
            if (!req.params.id) {
                return resp.status(400).json({ message: "please provide id of cource", success: false })
            }
            const coachingcourcedata = await CoachingCourceModel.findOne({ _id: req.params.id })
            if (coachingcourcedata) {
                if (coachingcourcedata.CourceContent) {
                    coachingcourcedata.CourceContent.forEach(async (EachContent) => {
                        EachContent.ContentData.forEach(async (EachVideoId) => {
                            let findedVideo = await CoachingVideoModel.findOne({ _id: EachVideoId })
                            if (findedVideo) {
                                if (findedVideo.Quizes) {
                                    findedVideo.Quizes.forEach(async (EachQuiz) => {
                                        let findedQuiz = await QuizModel.findOne({ _id: EachQuiz })
                                        if (findedQuiz) {
                                            let deleteQuiz = await QuizModel.deleteOne({ _id: EachQuiz })
                                        }
                                    })
                                }
                                let deleteVideo = await CoachingVideoModel.findOneAndRemove({ _id: EachVideoId })
                            }
                        })

                    })
                }

                const result = await CoachingCourceModel.deleteOne({ _id: req.params.id })
                if (!result) {
                    return resp.status(400).json({ message: "Coaching cource cannot be deleted", success: false })
                }
                let CourcePath = path.join(this.publicDir, `${FindCource.CourceName}-${FindCource.ProviderId}`)
                let FileIsOrNot = await this.fileExists(CourcePath)
                if (FileIsOrNot) {
                    await fs.unlink(CourcePath)
                }
                let PrivateCoursePath = path.join(this.privateDir, `${FindCource.CourceName}-${FindCource.ProviderId}`)
                let PrivateFileIsOrNot = await this.fileExists(PrivateCoursePath)
                if (PrivateFileIsOrNot) {
                    await fs.unlink(PrivateCoursePath)
                }


                return resp.status(200).json({ message: "Coaching cource deleted", success: true, data: result })
            }
            else {
                return resp.status(400).json({ message: "cource cannot found", success: false })
            }

        } catch (error) {
            console.error(error);
            return resp.status(400).json({ error: error.message, success: false });
        }
    }
    async UpdateCourceDetail(req, res) {
        let uploadedFiles = {};
        try {
            let { CourseId, CourceName, Skills, SkillsId, ProviderId, ConnectedWith, HeadCourceCatId, SubCourceCatId, Price, TextAreas, Level, offerPercentage, CertificateConfig } = req.body;
            let companyId = req.query.companyId;
            if (Skills) {
                Skills = JSON.parse(Skills)
            }
            if (SkillsId) {
                SkillsId = JSON.parse(SkillsId)
            }
            if (ConnectedWith) {
                ConnectedWith = JSON.parse(ConnectedWith)
            }
            if (HeadCourceCatId) {
                HeadCourceCatId = JSON.parse(HeadCourceCatId)
            }
            if (SubCourceCatId) {
                SubCourceCatId = JSON.parse(SubCourceCatId)
            }
            if (TextAreas) {
                TextAreas = JSON.parse(TextAreas)
            }
            const files = req.files;

            uploadedFiles = {
                CourceThumbnail: files.CourceThumbnail && files.CourceThumbnail[0] ? files.CourceThumbnail[0].originalname : null,
                CertificateTemplate: files.CertificateTemplate && files.CertificateTemplate[0] ? files.CertificateTemplate[0].originalname : null
            };
            const filesToClean = [];
            if (uploadedFiles.CourceThumbnail) filesToClean.push(uploadedFiles.CourceThumbnail);
            if (uploadedFiles.CertificateTemplate) filesToClean.push(uploadedFiles.CertificateTemplate);

            let FindCource = await CoachingCourceModel.findOne({ _id: CourseId })
            if (!FindCource) {
                if (filesToClean.length !== 0) {
                    await this.cleanFiles(filesToClean);
                }
                return res.status(400).json({ message: 'Cource Not Found', success: false })
            }
            await this.validateCourseDataForUpdateTheCourceDetails(req.body, filesToClean);
            let courseDirName;
            let coursePath;
            let PrivateCoursePath;
            if (!CourceName) {
                courseDirName = `${FindCource.CourceName}-${FindCource.ProviderId}`;
                coursePath = path.join(this.publicDir, courseDirName);
                PrivateCoursePath = path.join(this.privateDir, courseDirName);
            }
            else {
                courseDirName = `${CourceName}-${ProviderId}`;
                coursePath = path.join(this.publicDir, courseDirName);
                PrivateCoursePath = path.join(this.privateDir, courseDirName);
                let existingpathname = `${FindCource.CourceName}-${FindCource.ProviderId}`;
                let existingPath = path.join(this.publicDir, existingpathname)
                let FileIsOrNot = await this.fileExists(existingPath)
                if (FileIsOrNot) {
                    await fs.rename(
                        existingPath,
                        coursePath
                    )
                }
                let PrivateExistingPath = path.join(this.privateDir, existingpathname)
                let PrivateFileIsOrNot = await this.fileExists(PrivateExistingPath)
                if (PrivateFileIsOrNot) {
                    await fs.rename(
                        PrivateExistingPath,
                        PrivateCoursePath
                    )
                }

            }

            const courseDocument = {
                CourceName: CourceName,
                ProviderId: ProviderId,
                HeadCourceCatId: HeadCourceCatId,
                SubCourceCatId: SubCourceCatId,
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
                if (FindCource.Certificate) {
                    let deleteCertificatePath = path.join(certDir, FindCource.Certificate)
                    let FileIsOrNot = await this.fileExists(deleteCertificatePath)
                    if (FileIsOrNot) {
                        await fs.unlink(deleteCertificatePath)
                    }
                }
                await fs.rename(
                    path.join(this.tempDir, uploadedFiles.CertificateTemplate),
                    path.join(certDir, uploadedFiles.CertificateTemplate)
                );
                courseDocument.Certificate = uploadedFiles.CertificateTemplate
                courseDocument.CertificateConfig = CertificateConfig
            }
            else if (uploadedFiles.CertificateTemplate) {
                let currentTemplate = path.join(this.tempDir, uploadedFiles.CertificateTemplate)
                let FileIsOrNot = await this.fileExists(currentTemplate)
                if (FileIsOrNot) {
                    await fs.unlink(currentTemplate)
                }
                return res.status(400).json({ message: 'if you was selecting certificate template then provide configuration of certificate', success: false })
            }

            if (uploadedFiles.CourceThumbnail) {
                const thumbDir = path.join(coursePath, 'CourceThumbnail');
                const PrivateThumbDir = path.join(PrivateCoursePath, 'CourceThumbnail');
                if (FindCource.CourceThumbnail) {
                    let deleteCourceThumbnailPath = path.join(thumbDir, FindCource.CourceThumbnail)
                    let PrivateDeleteCourceThumbnailPath = path.join(PrivateThumbDir, FindCource.CourceThumbnail)
                    let FileIsOrNot = await this.fileExists(deleteCourceThumbnailPath)
                    if (FileIsOrNot) {
                        await fs.unlink(deleteCourceThumbnailPath)
                    }
                    let PrivateFileIsOrNot = await this.fileExists(PrivateDeleteCourceThumbnailPath)
                    if (PrivateFileIsOrNot) {
                        await fs.unlink(PrivateDeleteCourceThumbnailPath)
                    }
                }
                await fs.rename(
                    path.join(this.tempDir, uploadedFiles.CourceThumbnail),
                    path.join(thumbDir, uploadedFiles.CourceThumbnail)
                );
                await fs.copyFile(
                    path.join(thumbDir, uploadedFiles.CourceThumbnail),
                    path.join(PrivateThumbDir, uploadedFiles.CourceThumbnail)
                );
                courseDocument.CourceThumbnail = uploadedFiles.CourceThumbnail

            }

            const result = await CoachingCourceModel.findOneAndUpdate(
                { _id: CourseId, companyId: companyId },
                { $set: courseDocument },
                { new: true }
            );

            if (filesToClean.length !== 0) {
                await this.cleanFiles(filesToClean);
            }
            return res.status(200).json({ data: result, success: true });

        } catch (error) {
            console.error('Error updating course:', error);

            if (uploadedFiles) {
                const filesToClean = [];

                if (uploadedFiles.CourceThumbnail) filesToClean.push(uploadedFiles.CourceThumbnail);
                if (uploadedFiles.CertificateTemplate) filesToClean.push(uploadedFiles.CertificateTemplate);

                if (filesToClean.length !== 0) {
                    await this.cleanFiles(filesToClean);
                }
            }

            return res.status(500).json({
                error: error.message,
                success: false
            });
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
                if (filesToClean.length !== 0) {
                    await this.cleanFiles(filesToClean);
                }
                return res.status(400).json({ message: 'Missing CourseId or operation', success: false });
            }

            const FindedCource = await CoachingCourceModel.findOne({ _id: CourseId });
            if (!FindedCource) {
                if (filesToClean) {
                    await this.cleanFiles(filesToClean);
                }
                return res.status(400).json({ message: 'Course not found', success: false });
            }

            const courseDirName = FindedCource.CourceName + '-' + FindedCource.ProviderId;
            const PrivateCoursePath = path.join(this.privateDir, courseDirName);
            await fs.mkdir(PrivateCoursePath, { recursive: true });

            courseData.HeadCourceCatId = FindedCource.HeadCourceCatId;
            courseData.SubCourceCatId = FindedCource.SubCourceCatId;
            courseData.ProviderId = FindedCource.ProviderId;
            courseData.ProviderType = FindedCource.ProviderType;
            courseData.companyId = FindedCource.companyId;
            courseData.ConnectedWith = FindedCource.ConnectedWith;
            console.log(courseData, 'data')
            if (operation === 'delete') {
                if (!PlayListId) {
                    if (filesToClean && filesToClean.length) {
                        await this.cleanFiles(filesToClean);
                    }
                    return res.status(400).json({ message: 'Please provide PlayListId', success: false });
                }

                console.log('playlist 1', FindedCource.CourceContent);

                const playlist = FindedCource.CourceContent.find(c => c._id == PlayListId);
                console.log('playlist 2', playlist);

                if (!playlist || !Array.isArray(playlist.CourceData)) {
                    if (filesToClean && filesToClean.length) {
                        await this.cleanFiles(filesToClean);
                    }
                    return res.status(404).json({ message: 'Playlist or content data not found', success: false });
                }

                let videoDuration = 0;

                for (let i = 0; i < playlist.CourceData.length; i++) {
                    const videoId = playlist.CourceData[i];
                    const video = await CoachingVideoModel.findOne({ _id: videoId });

                    if (video) {
                        videoDuration += video.VideoDuration;

                        if (video.Quizes && video.Quizes.length) {
                            for (let j = 0; j < video.Quizes.length; j++) {
                                const quizId = video.Quizes[j];
                                await QuizModel.deleteOne({ _id: quizId });
                            }
                        }

                        await CoachingVideoModel.findOneAndRemove({ _id: videoId });
                    }
                }

                const playlistDir = path.join(this.privateDir, courseDirName, playlist.Heading);
                const fileExistsOrNot = await this.fileExists(playlistDir);
                if (fileExistsOrNot) {
                    await fs.rmdir(playlistDir, { recursive: true, force: true });
                }

                const updatedResult = await CoachingCourceModel.updateOne(
                    { _id: CourseId, companyId: companyId },
                    {
                        $pull: { CourceContent: { _id: PlayListId } },
                        $set: { CourceDuration: FindedCource.CourceDuration - videoDuration }
                    }
                );

                if (filesToClean && filesToClean.length) {
                    await this.cleanFiles(filesToClean);
                }

                return res.status(200).json({ message: 'PlayList Deleted', success: true, data: updatedResult });
            }

            if (operation === 'add') {
                const { courseContentFinal, totalDuration } = await this.processVideoContent(
                    courseData,
                    PrivateCoursePath,
                    uploadedFiles
                );
                const newDuration = FindedCource.CourceDuration + totalDuration;
                const result = await CoachingCourceModel.updateOne(
                    { _id: CourseId, companyId: companyId },
                    {
                        $addToSet: { CourceContent: { $each: courseContentFinal } },
                        $set: { CourceDuration: newDuration }
                    },
                    { new: true }
                );

                if (filesToClean.length !== 0) {
                    await this.cleanFiles(filesToClean);
                }
                return res.status(200).json({ message: 'Heading Added', success: true, data: result });
            }

            if (filesToClean.length !== 0) {
                await this.cleanFiles(filesToClean);
            } return res.status(400).json({ message: 'Invalid operation', success: false });


        } catch (error) {
            console.error('Error in UpdatePlaylistHeading:', error);

            const filesToClean = []
                .concat(uploadedFiles.ContentVideos || [])
                .concat(uploadedFiles.VideoAudioLanguages || [])
                .concat(uploadedFiles.VideoSubtitles || []);

            if (filesToClean.length !== 0) {
                await this.cleanFiles(filesToClean);
            }
            return res.status(500).json({ error: error.message, success: false });
        }
    }


    async UpdateVideoAndQuizes(req, res) {
        let uploadedFiles = {};
        try {

            let courseData = JSON.parse(req.body.data);
            let { CourseId, PlayListId, VideoId, QuizId } = req.body;
            let companyId = req.query.companyId;
            let operation = req.query.operation
            console.log(courseData, 'data', typeof courseData, 'type');
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

            let FindedCource = await CoachingCourceModel.findOne({ _id: CourseId })

            if (!FindedCource) {
                if (filesToClean.length !== 0) {
                    await this.cleanFiles(filesToClean);
                }
                return res.status(400).json({ message: 'cource not found', success: false })
            }
            const courseDirName = `${FindedCource.CourceName}-${FindedCource.ProviderId}`;
            const coursePath = path.join(this.privateDir, courseDirName);
            await fs.mkdir(coursePath, { recursive: true });
            let playList = FindedCource.CourceContent.find(c => c._id == PlayListId);

            if (operation == 'add') {
                courseData.HeadCourceCatId = FindedCource.HeadCourceCatId;
                courseData.SubCourceCatId = FindedCource.SubCourceCatId;
                courseData.ProviderId = FindedCource.ProviderId;
                courseData.ProviderType = FindedCource.ProviderType;
                courseData.companyId = FindedCource.companyId;
                courseData.ConnectedWith = FindedCource.ConnectedWith
                courseData.Heading = playList.Heading

                if (courseData.ContainedData && courseData.ContainedData.length !== 0) {
                    let { videoDataIds, totalDuration } = await this.UpdateprocessVideoContent(
                        courseData,
                        coursePath,
                        uploadedFiles
                    );

                    let VideoDuration = 0;
                    VideoDuration = VideoDuration + totalDuration;
                    console.log(videoDataIds, 'videodataids')
                    videoDataIds.forEach(async (EachVideoId) => {
                        await this.resolveVideoOrders(CourseId, PlayListId, EachVideoId, 'add', VideoDuration)
                    })

                    if (filesToClean.length !== 0) {
                        await this.cleanFiles(filesToClean);
                    }
                    return res.status(200).json({ message: 'video added', success: true })


                }
                else if (courseData.QuizData) {
                    if (!VideoId) {
                        if (filesToClean.length !== 0) {
                            await this.cleanFiles(filesToClean);
                        }
                        return res.status(400).json({ message: 'please provide proper data', success: false })

                    }
                    let quizIds;
                    quizIds = courseData.QuizData
                        ? await this.processQuizData(courseData.QuizData, {
                            HeadCourceCatId: FindedCource.HeadCourceCatId,
                            SubCourceCatId: FindedCource.SubCourceCatId,
                            ProviderType: FindedCource.ProviderType,
                            ProviderId: FindedCource.ProviderId,
                            companyId: FindedCource.companyId,
                            ConnectedWith: FindedCource.ConnectedWith
                        })
                        : [];

                    let updateTheVideoQuizes = await CoachingVideoModel.findOneAndUpdate(
                        { _id: VideoId, companyId: companyId },
                        { $addToSet: { Quizes: { $each: quizIds } } },
                        { new: true }

                    )
                    if (!updateTheVideoQuizes) {
                        if (filesToClean.length !== 0) {
                            await this.cleanFiles(filesToClean);
                        }
                        return res.status(400).json({ message: 'quiz not added', success: false })

                    }
                    if (filesToClean.length !== 0) {
                        await this.cleanFiles(filesToClean);
                    }
                    return res.status(200).json({ message: 'quiz added', success: true })

                }
            }
            else if (operation == 'delete') {
                if (!CourseId || !PlayListId || !VideoId) {
                    if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                    return res.status(400).json({ message: 'Please provide proper data', success: false });
                }

                let findedVideo = await CoachingVideoModel.findOne({ _id: VideoId });

                if (VideoId && QuizId) {
                    if (findedVideo) {
                        const existingQuizId = findedVideo.Quizes.find((quiz) => quiz == QuizId);
                        if (existingQuizId) {
                            let deleteQuiz = await QuizModel.findOneAndRemove({ _id: QuizId });
                            if (deleteQuiz) {
                                let updatedVideo = await CoachingVideoModel.findOneAndUpdate(
                                    { _id: VideoId, companyId: companyId },
                                    { $pull: { Quizes: { $in: QuizId } } },
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
                        FindedCource.CourceContent.forEach((content) => {
                            content.CourceData.forEach((videoId, index) => {
                                console.log(videoId, typeof videoId, VideoId, typeof VideoId)
                                if (videoId === VideoId) {
                                    currentHeading = content.Heading;
                                    nextVideoId = (index + 1 < content.ContentData.length) ? content.ContentData[index + 1] : (index - 1 >= 0 ? content.ContentData[index - 1] : null);
                                }
                            });
                        });


                        if (findedVideo.Quizes && nextVideoId) {
                            await CoachingVideoModel.findOneAndUpdate(
                                { _id: nextVideoId, companyId: companyId },
                                { $addToSet: { Quizes: { $each: findedVideo.Quizes } } }
                            );
                        } else {
                            await Promise.all(findedVideo.Quizes.map(async (quizId) => {
                                let quiz = await QuizModel.findOne({ _id: quizId });
                                if (quiz) await QuizModel.deleteOne({ _id: quizId });
                            }));
                        }

                        const deleteFiles = async (filePath) => {
                            let fileExists = await this.fileExists(filePath);
                            if (fileExists) await fs.rmdir(filePath, { recursive: true, force: true });
                        };

                        if (findedVideo.videoFile) {
                            console.log(coursePath, findedVideo.videoFile, currentHeading, 'path')

                            let videoPath = path.join(coursePath, currentHeading, 'VideoFiles', findedVideo.videoFile);
                            await deleteFiles(videoPath);
                        }

                        if (findedVideo.VideoLanguages) {
                            await Promise.all(findedVideo.VideoLanguages.map(async (audio) => {
                                let audioPath = path.join(coursePath, currentHeading, 'VideoAudioFiles', audio.VideoLanguagesFile);
                                await deleteFiles(audioPath);
                            }));
                        }

                        if (findedVideo.Subtitles) {
                            await Promise.all(findedVideo.Subtitles.map(async (subtitle) => {
                                let subtitlePath = path.join(coursePath, currentHeading, 'VideoSubtitlesFile', subtitle.SubtitleFile);
                                await deleteFiles(subtitlePath);
                            }));
                        }

                        let videoDuration = FindedCource.CourceDuration - findedVideo.VideoDuration;
                        let deletedVideo = await CoachingVideoModel.findOneAndRemove({ _id: VideoId });
                        if (!deletedVideo) {
                            if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                            return res.status(400).json({ message: 'Error deleting video', success: false });
                        }

                        await this.resolveVideoOrders(CourseId, PlayListId, VideoId, 'delete', videoDuration);

                        if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                        return res.status(200).json({ message: 'Video deleted', success: true });
                    }
                    else {
                        if (filesToClean.length !== 0) await this.cleanFiles(filesToClean);
                        return res.status(400).json({ message: 'video not found', success: false })
                    }
                }
            }


        } catch (error) {
            console.error('Error adding course:', error);

            if (uploadedFiles) {
                const filesToClean = []
                    .concat(uploadedFiles.ContentVideos || [])
                    .concat(uploadedFiles.VideoAudioLanguages || [])
                    .concat(uploadedFiles.VideoSubtitles || []);

                if (filesToClean.length !== 0) {
                    await this.cleanFiles(filesToClean);
                }
            }

            return res.status(500).json({
                error: error.message,
                success: false
            });
        }
    }
    async AccessCourceContent(req, res) {
        try {
            let { CourseName, ProviderId, PlayListName, VideoId } = req.body;
            let companyId = req.query.companyId
            let FindedVideo = await CoachingVideoModel.findOne({ _id, VideoId, companyId: companyId })
            if (!FindedVideo) {
                return res.status(400).json({ message: 'Video Not Found', success: false })
            }
            if (!CourseName || !ProviderId || !PlayListName) {
                return res.status(400).json({ message: 'please provide all data', success: false })
            }
            let VideoFilePath = path.join(this.privateDir, `${CourseName}-${ProviderId}`, PlayListName, FindedVideo.videoFile)
            let FileIsOrNot = await this.fileExists(VideoFilePath)
            if (!FileIsOrNot) {
                return res.status(400).json({ message: "video file not found", success: false })
            }
            return res.sendFile(VideoFilePath)

        } catch (error) {
            return res.status(500).json({ message: "Internal Server Error", error: error.message, success: false })
        }
    }

    // async SavedCertificateData(CertificateName) {
    //     const { templateName, config } = req.body;

    //     const newConfig = new TemplateConfig({
    //         templateName,
    //         imageName: CertificateName,
    //         config: JSON.parse(config)
    //     });

    //     await newConfig.save();
    //     res.json({ message: 'Template uploaded!' });
    // }


}


module.exports = new CourseService()


