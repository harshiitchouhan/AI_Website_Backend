
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        planId: {
            type: String,
            enum: ["pro", "premium"],
            required: true,
        },

        billingCycle: {
            type: String,
            enum: ["monthly", "yearly"],
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        currency: {
            type: String,
            enum: ["INR"],
            default: "INR",
        },

        credits: {
            type: Number,
            required: true,
            min: 0,
        },

        razorpayOrderId: {
            type: String,
            required: true,
            unique: true,
        },

        razorpayPaymentId: {
            type: String,
            unique: true,
            sparse: true,
        },

        status: {
            type: String,
            enum: ["created", "paid", "failed"],
            default: "created",
        },

        creditsGrantedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
