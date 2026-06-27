const mongoose = require("mongoose");

const supplyChainEventSchema = new mongoose.Schema({
  txHash: { type: String, required: true },
  blockNumber: { type: Number, required: true },
  timestamp: { type: String, required: true },
  from: { type: String, required: true },
  fromRole: { type: String, enum: ["manufacturer", "distributor", "pharmacy", "consumer", "admin"], required: true },
  to: { type: String, required: true },
  toRole: { type: String, enum: ["manufacturer", "distributor", "pharmacy", "consumer", "admin"], required: true },
  action: { type: String, required: true },
  location: { type: String, required: true },
  temperature: { type: Number },
  notes: { type: String },
  ipfsEvidenceHash: { type: String },
  signature: { type: String, required: true },
  verified: { type: Boolean, default: true },
}, { _id: false });

const temperatureLogSchema = new mongoose.Schema({
  timestamp: { type: String, required: true },
  temperature: { type: Number, required: true },
  location: { type: String, required: true },
  deviceId: { type: String, required: true },
  status: { type: String, enum: ["normal", "warning", "critical"], default: "normal" },
}, { _id: false });

const drugSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true, index: true },
  genericName: { type: String, required: true },
  manufacturer: { type: String, required: true },
  manufacturerId: { type: String, required: true, index: true },
  dosage: { type: String, required: true },
  batchNumber: { type: String, required: true, index: true },
  lotNumber: { type: String, required: true },
  mfgDate: { type: String, required: true },
  expDate: { type: String, required: true },
  serialNumber: { type: String, required: true, index: true },
  barcode: { type: String, required: true, index: true },
  qrData: { type: String },
  ipfsImageHash: { type: String },
  ipfsCertificateHash: { type: String },
  salt: { type: String },
  createdAt: { type: String, required: true },
  status: {
    type: String,
    enum: ["manufactured", "in_transit_distributor", "at_distributor", "in_transit_pharmacy", "at_pharmacy", "dispensed", "recalled", "flagged_fake"],
    default: "manufactured",
    index: true,
  },
  currentHolder: { type: String, required: true },
  currentHolderRole: {
    type: String,
    enum: ["manufacturer", "distributor", "pharmacy", "consumer"],
    required: true,
  },
  supplyChain: [supplyChainEventSchema],
  authenticityScore: { type: Number, default: 100 },
  lastVerifiedAt: { type: String },
  temperatureLogs: [temperatureLogSchema],
}, {
  timestamps: true,
  collection: "drugs",
});

drugSchema.index({ name: "text", manufacturer: "text", batchNumber: "text" });

module.exports = mongoose.model("Drug", drugSchema);