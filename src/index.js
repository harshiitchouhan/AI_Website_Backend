const path = require("path");

require("dotenv").config({
    path: path.resolve(__dirname, "../.env")
});

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const main = require("./config/database");
console.log("Mongo URI Loaded:", Boolean(process.env.MONGO_URI));
const authRouter = require("./Routes/userAuthenticate");
const projectRouter = require("./Routes/userProject");
const payRouter = require("./Routes/userPayment");

const app = express();

const PORT = process.env.PORT || 4000;

// console.log("Razorpay Key ID:", process.env.RAZORPAY_KEY_ID);
// console.log("Secret exists:", Boolean(process.env.RAZORPAY_KEY_SECRET));

// Middleware
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Webloom API is running",
    });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api", projectRouter);
app.use("/api",payRouter);

// Start server after database connection
const startServer = async () => {
    try {
        await main();

        app.listen(PORT, () => {
            console.log(`Server Running on Port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);

    }
};

startServer();

if (require.main === module) {
    const PORT = process.env.PORT || 4000;

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;