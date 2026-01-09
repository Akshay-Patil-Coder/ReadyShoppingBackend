const router = require('express').Router();
const { searchSuggestions } = require('../elastic/search.controller');

router.post('/search-suggestions', searchSuggestions);

module.exports = router;
