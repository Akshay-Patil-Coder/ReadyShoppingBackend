module.exports.parseSearchQuery = async (text) => {
  text = text.toLowerCase();

  let minPrice = null;
  let maxPrice = null;
  let cleanedText = text;

  const normalize = (num, k) => k ? Number(num) * 1000 : Number(num);

  let between =
    text.match(/between\s?(\d+)(k)?\s?(and|to|-)\s?(\d+)(k)?/) ||
    text.match(/(\d+)(k)?\s?(to|-)\s?(\d+)(k)?/);

  if (between) {
    minPrice = normalize(between[1], between[2]);
    maxPrice = normalize(between[4], between[5]);
    cleanedText = cleanedText.replace(between[0], "");
  }

  let under =
    text.match(/(under|below|less than|upto|up to)\s?(\d+)(k)?/);

  if (under) {
    maxPrice = normalize(under[2], under[3]);
    cleanedText = cleanedText.replace(under[0], "");
  }

  let above =
    text.match(/(above|more than|over)\s?(\d+)(k)?/);

  if (above) {
    minPrice = normalize(above[2], above[3]);
    cleanedText = cleanedText.replace(above[0], "");
  }

  let around =
    text.match(/(around|near|approx)\s?(\d+)(k)?/);

  if (around) {
    let base = normalize(around[2], around[3]);
    minPrice = Math.floor(base * 0.8);
    maxPrice = Math.ceil(base * 1.2);
    cleanedText = cleanedText.replace(around[0], "");
  }

  let single =
    !minPrice && !maxPrice && text.match(/(\d+)(k)/);

  if (single) {
    let base = normalize(single[1], single[2]);
    minPrice = Math.floor(base * 0.85);
    maxPrice = Math.ceil(base * 1.15);
    cleanedText = cleanedText.replace(single[0], "");
  }

  return {
    keyword: cleanedText.trim(),
    minPrice,
    maxPrice
  };
};
