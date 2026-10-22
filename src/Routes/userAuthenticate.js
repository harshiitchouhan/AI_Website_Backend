const {login , logout , register, getCurrentUser} = require("../Controller/userAuth");
const express = require('express');
const isAuth = require("../Middleware/isAuth");

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login" , login);
authRouter.post("/logout", logout);

authRouter.get("/me", isAuth , getCurrentUser);

module.exports = authRouter;
