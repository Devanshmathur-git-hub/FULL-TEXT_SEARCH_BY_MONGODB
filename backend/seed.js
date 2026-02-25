const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("./models/Product");
const Article = require("./models/Article");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/globalsearch";

// Sample Products Data
const products = [
    {
        name: "Laptop Screen Replacement 15.6 inch",
        description: "High-quality 15.6 inch laptop screen replacement panel. Compatible with most laptop brands including Dell, HP, Lenovo.",
        category: "Electronics",
        price: 3499,
    },
    {
        name: "MongoDB Developer Handbook",
        description: "A comprehensive guide for developers to master MongoDB database. Covers indexes, aggregation, and full-text search.",
        category: "Books",
        price: 799,
    },
    {
        name: "Pro Laptop Stand for Desk",
        description: "Sturdy aluminum laptop stand to raise your laptop screen to eye level. Reduces neck strain during long coding sessions.",
        category: "Accessories",
        price: 1200,
    },
    {
        name: "Mechanical Keyboard for Developers",
        description: "Full-size mechanical keyboard with RGB lighting. Perfect for developers and programmers. Bluetooth and USB support.",
        category: "Electronics",
        price: 4500,
    },
    {
        name: "Node.js in Action - Book",
        description: "Step-by-step guide to building server-side applications using Node.js and Express. Includes REST API and MongoDB integration.",
        category: "Books",
        price: 650,
    },
];

// Sample Articles Data
const articles = [
    {
        title: "How to Fix a Laptop Screen",
        content: "A complete step-by-step guide to replacing a cracked or broken laptop screen at home. Learn how to identify compatible screen panels and safely replace them.",
        author: "Rahul Sharma",
        tags: ["laptop", "repair", "screen", "hardware"],
    },
    {
        title: "Getting Started with MongoDB Full-Text Search",
        content: "Learn how to implement full-text search in MongoDB using the $text operator and text indexes. Includes examples for single and multiple collection searches.",
        author: "Priya Singh",
        tags: ["mongodb", "full-text search", "database", "backend"],
    },
    {
        title: "Building REST APIs with Node.js and Express",
        content: "A complete tutorial on building production-ready REST APIs using Node.js, Express, and MongoDB. Covers routing, controllers, middleware, and error handling.",
        author: "Amit Kumar",
        tags: ["nodejs", "express", "api", "backend", "javascript"],
    },
    {
        title: "Understanding MongoDB Text Indexes",
        content: "An in-depth look at how MongoDB text indexes work, how to create them, and how to use them for efficient full-text searches across multiple fields.",
        author: "Sneha Patel",
        tags: ["mongodb", "indexes", "database", "performance"],
    },
    {
        title: "Best Laptops for Developers in 2024",
        content: "A curated list of the best laptops for software developers and programmers in 2024. Covers performance, battery life, screen quality, and value for money.",
        author: "Vikram Mehta",
        tags: ["laptop", "developer", "hardware", "review"],
    },
];

const seedDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Clear existing data
        await Product.deleteMany({});
        await Article.deleteMany({});
        console.log("🗑️  Cleared existing data");

        // Sync text indexes before inserting
        await Product.syncIndexes();
        await Article.syncIndexes();
        console.log("🔍 Text indexes synced");

        // Insert seed data
        await Product.insertMany(products);
        console.log(`✅ Inserted ${products.length} Products`);

        await Article.insertMany(articles);
        console.log(`✅ Inserted ${articles.length} Articles`);

        console.log("\n🎉 Database seeded successfully!");
        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ Seeding failed:", err.message);
        await mongoose.disconnect();
        process.exit(1);
    }
};

seedDB();




