const { createOrder,verifyPayment,} = require("../Controller/razorPayment");
const express = require('express');
const payRouter = express.Router();
const isAuth = require("../Middleware/isAuth")

payRouter.post("/payment/create-order", isAuth, createOrder);
payRouter.post("/payment/verify", isAuth, verifyPayment);

module.exports = payRouter;