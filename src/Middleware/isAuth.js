
const jwt = require("jsonwebtoken");
const User = require("../Models/user");

const isAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                message: "Token Not Found"
            });
        }

        const payload = jwt.verify(
            token,
            process.env.SECRET_KEY
        );

        // console.log("Decoded JWT Payload:", payload);
        // console.log("User ID:", payload.id);

        const user = await User.findById(payload._id).select("-password");

        // console.log("User from MongoDB:", user);

        if (!user) {
            return res.status(401).json({
                message: "User Not Found"
            });
        }

        req.user = user;

        next();

    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                message: "Invalid or Expired Token"
            });
        }

        console.error("Authentication Error:", error);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

module.exports = isAuth;
