const mongoose = require("mongoose");

const smartContractCallSchema = new mongoose.Schema({
  name: { type: String, required: true },
  params: { type: Map, of: String },
  result: { type: String },
  gasUsed: { type: String },
  blockNumber: { type: Number, required: true, index: true },
  txHash: { type: String, required: true, index: true },
  drugId: { type: String, index: true },
  userId: { type: String },
  timestamp: { type: String, default: () => new Date().toISOString() },
}, {
  timestamps: true,
  collection: "smart_contract_calls",
});

module.exports = mongoose.model("SmartContractCall", smartContractCallSchema);