const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String },
  role: {
    type: String,
    enum: ["manufacturer", "distributor", "pharmacy", "consumer", "admin"],
    required: true,
    index: true,
  },
  walletAddress: { type: String, index: true },
  company: { type: String },
  location: { type: String },
  verified: { type: Boolean, default: false },
  metaMaskConnected: { type: Boolean, default: false },
  lastLoginAt: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
}, {
  timestamps: true,
  collection: "users",
});

module.exports = mongoose.model("User", userSchema);