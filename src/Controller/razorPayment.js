const mongoose = require("mongoose");
const crypto = require("crypto");

const Payment = require("../Models/payment");
const User = require("../Models/user");

const razorpayInstance = require("../config/razorpay");
const PLANS = require("../config/plans");


const createOrder = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { planId, billingCycle } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized user",
            });
        }

        if (
            !["pro", "premium"].includes(planId) ||
            !["monthly", "yearly"].includes(billingCycle)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan or billing cycle",
            });
        }

        const plan = PLANS[planId];

        const price = billingCycle === "yearly"
            ? plan.yearlyPrice * 12
            : plan.price;

        const amount = price * 100;

        const credits = billingCycle === "yearly"
            ? plan.credits * 12
            : plan.credits;

        const order = await razorpayInstance.orders.create({
            amount,
            currency: "INR",
            receipt: `webloom_${crypto.randomUUID().slice(0, 18)}`,
        });

        await Payment.create({
            userId,
            planId,
            billingCycle,
            amount,
            credits,
            razorpayOrderId: order.id,
            status: "created",
        });

        return res.status(201).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });

    } catch (error) {
        console.error("Create Order Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create payment order",
        });
    }
};


const verifyPayment = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;

        // important for verifcation always
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body || {};

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized user",
            });
        }

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            typeof razorpay_signature !== "string" ||
            !/^[a-f0-9]{64}$/i.test(razorpay_signature)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment details",
            });
        }

        const payment = await Payment.findOne({
            razorpayOrderId: razorpay_order_id,
            userId,
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment order not found",
            });
        }

        // Verify Razorpay signature
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${payment.razorpayOrderId}|${razorpay_payment_id}`)
            .digest("hex");

        const isValid = crypto.timingSafeEqual(
            Buffer.from(expectedSignature, "hex"),
            Buffer.from(razorpay_signature, "hex")
        );

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment signature",
            });
        }

        // Confirm actual payment status with Razorpay
        const razorpayPayment = await razorpayInstance.payments.fetch(
            razorpay_payment_id
        );

        if (
            razorpayPayment.status !== "captured" ||
            razorpayPayment.order_id !== payment.razorpayOrderId ||
            razorpayPayment.amount !== payment.amount ||
            razorpayPayment.currency !== "INR"
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment is not captured or details do not match",
            });
        }

        // Update payment and user together, only once
        await mongoose.connection.transaction(async (session) => {
            const record = await Payment.findById(payment._id).session(session);

            if (record.status === "paid") {
                if (record.razorpayPaymentId !== razorpay_payment_id) {
                    throw new Error("Order already paid with another payment");
                }

                return;
            }

            const expiresAt = new Date();

            expiresAt.setUTCMonth(
                expiresAt.getUTCMonth() +
                (record.billingCycle === "yearly" ? 12 : 1)
            );

            record.status = "paid";
            record.razorpayPaymentId = razorpay_payment_id;
            record.creditsGrantedAt = new Date();

            await record.save({ session });

            const result = await User.updateOne(
                { _id: userId },
                {
                    $inc: { credits: record.credits },
                    $set: {
                        plan: record.planId,
                        billingCycle: record.billingCycle,
                        planExpiresAt: expiresAt,
                    },
                },
                { session }
            );

            if (result.matchedCount !== 1) {
                throw new Error("User account not found");
            }
        });

        const user = await User.findById(userId)
            .select("credits plan planExpiresAt");

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            credits: user.credits,
            plan: user.plan,
            planExpiresAt: user.planExpiresAt,
        });

    } catch (error) {
        console.error("Verify Payment Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to verify payment",
        });
    }
};

module.exports = {
    createOrder,
    verifyPayment,
};
