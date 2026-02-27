const express = require("express");
const router = express.Router();

const { globalSearch } = require("../controllers/searchController");

// GET /api/global-search?q=search-term
router.get("/global-search", globalSearch);

module.exports = router;








