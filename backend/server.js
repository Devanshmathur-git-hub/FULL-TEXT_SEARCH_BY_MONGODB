const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const searchRoutes = require("./routes/searchRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", searchRoutes);

// Health check route
app.get("/", (req, res) => {
    res.json({ message: "Full-Text Search API is running 🚀" });
});

// Connect to MongoDB and start server
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB Connected");
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB Connection Error:", err.message);
        process.exit(1);
    });




