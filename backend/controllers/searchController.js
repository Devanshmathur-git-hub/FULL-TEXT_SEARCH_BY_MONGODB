const Product = require("../models/Product");
const Article = require("../models/Article");

// @desc    Global full-text search across Products and Articles
// @route   GET /api/global-search?q=search-term
// @access  Public
exports.globalSearch = async (req, res) => {
    try {
        const searchTerm = req.query.q;

        // Validate: search term is required
        if (!searchTerm || searchTerm.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search term is required. Use ?q=your-search-term",
            });
        }

        // --- OLD: Full-text search (matches whole words only) ---
        // const products = await Product.find(
        //     { $text: { $search: searchTerm } },
        //     {
        //         score: { $meta: "textScore" },
        //         name: 1,
        //         description: 1,
        //         category: 1,
        //         price: 1,
        //     }
        // ).sort({ score: { $meta: "textScore" } });

        // --- NEW: Regex search (matches per character, e.g. "lap" -> "laptop") ---
        const products = await Product.find(
            {
                $or: [
                    { name: { $regex: searchTerm, $options: "i" } },
                    { description: { $regex: searchTerm, $options: "i" } },
                    { category: { $regex: searchTerm, $options: "i" } },
                ]
            },
            {
                name: 1,
                description: 1,
                category: 1,
                price: 1,
            }
        );

        // --- OLD: Full-text search (matches whole words only) ---
        // const articles = await Article.find(
        //     { $text: { $search: searchTerm } },
        //     {
        //         score: { $meta: "textScore" },
        //         title: 1,
        //         content: 1,
        //         author: 1,
        //         tags: 1,
        //     }
        // ).sort({ score: { $meta: "textScore" } });

        // --- NEW: Regex search (matches per character, e.g. "mon" -> "mongodb") ---
        const articles = await Article.find(
            {
                $or: [
                    { title: { $regex: searchTerm, $options: "i" } },
                    { content: { $regex: searchTerm, $options: "i" } },
                    { author: { $regex: searchTerm, $options: "i" } },
                ]
            },
            {
                title: 1,
                content: 1,
                author: 1,
                tags: 1,
            }
        );

        // Combine results from both collections with type label
        const results = [
            ...products.map((p) => ({
                type: "product",
                id: p._id,
                name: p.name,
                description: p.description,
                category: p.category,
                price: p.price,
                score: p.score ?? 0,
            })),
            ...articles.map((a) => ({
                type: "article",
                id: a._id,
                title: a.title,
                content: a.content,
                author: a.author,
                tags: a.tags,
                score: a.score ?? 0,
            })),
        ];

        // Sort combined results by relevance score (highest first)
        results.sort((a, b) => b.score - a.score);

        // Handle no results
        if (results.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                message: `No results found for "${searchTerm}"`,
                results: [],
            });
        }

        // Return combined results
        res.status(200).json({
            success: true,
            count: results.length,
            query: searchTerm,
            results,
        });
    } catch (error) {
        console.error("Search Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Server error occurred",
            error: error.message,
        });
    }
};









