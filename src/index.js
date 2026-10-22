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
const projectRouter = require("./Routes/userProject")

const app = express();

const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true
    })
);

// Routes
app.use("/api/auth", authRouter);
app.use("/api", projectRouter);

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