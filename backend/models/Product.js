const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        category: {
            type: String,
        },
        price: {
            type: Number,
        },
    },
    { timestamps: true, versionKey: false }
);

// Text index for full-text search on name and description
productSchema.index({
    name: "text",
    description: "text",
    category: "text",
});

module.exports = mongoose.model("Product", productSchema);











