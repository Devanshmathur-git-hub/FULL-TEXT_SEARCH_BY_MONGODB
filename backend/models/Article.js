const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        author: {
            type: String,
        },
        tags: {
            type: [String],
        },
    },
    { timestamps: true, versionKey: false }
);

// Text index for full-text search on title and content
articleSchema.index({
    title: "text",
    content: "text",
    author: "text",
});

module.exports = mongoose.model("Article", articleSchema);






