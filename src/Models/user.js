const { Timestamp } = require("mongodb");
const mongoose = require("mongoose");
const {Schema} = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"],
    },

    password:{
      type: String,
      required: true,
      min: 7,
      max:20
    },

    avatar: {
      type: String,
      default: "",
    },

    credits: {
      type: Number,
      default: 100,
      min: 0,
    },

    plan: {
      type: String,
      enum: ["free", "pro", "premium"],
      default: "free",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("user",userSchema);
module.exports = User;