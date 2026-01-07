module.exports = (q) => {
  let priceMatch = q.match(/under\s?(\d+)/i);
  return {
    text: q.replace(/under\s?\d+/i, '').trim(),
    maxPrice: priceMatch ? Number(priceMatch[1]) : null
  };
};
