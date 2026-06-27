require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const neonClient = require("./config/neonClient");

let Drug;
let User;
let SmartContractCall;

if (neonClient.isConnected()) {
  console.log("🔌 Database driver: PostgreSQL / Neon DB selected");
  const pgModels = require("./models/pgModels");
  Drug = pgModels.Drug;
  User = pgModels.User;
  SmartContractCall = pgModels.SmartContractCall;
} else {
  // Defer setup to connection phase
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── JWT Middleware ─────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "chainmed_super_secret_key_2026";

function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}

// ── Crypto Helpers ─────────────────────────────────
function sha256(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `0x${hex}${hex.split("").reverse().join("")}${hex.slice(0, 8)}`;
}

let _blockNumber = 1048295;
function getNextBlockNumber() { return ++_blockNumber; }
function generateTxHash(data) { return sha256(data + Date.now() + Math.random()); }

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function hoursAgo(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

// ── Auth Routes ────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, walletAddress, company, location } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: "Name, email and role are required" });
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ error: "Email already registered" });
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const userId = `usr-${role?.slice(0, 3) || "usr"}-${Date.now().toString(36)}`;
    const user = await User.create({
      id: userId,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "consumer",
      walletAddress: walletAddress || null,
      company: company || null,
      location: location || null,
      verified: false,
    });
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, walletAddress } = req.body;
    let user;
    if (walletAddress) {
      const normalizedAddress = walletAddress.toLowerCase();
      const allUsersList = await User.find({});
      user = allUsersList.find(u => u.walletAddress && u.walletAddress.toLowerCase() === normalizedAddress);
      if (!user) {
        user = await User.create({
          id: `usr-wallet-${walletAddress.slice(2, 8)}`,
          name: "Wallet User",
          email: `wallet-${walletAddress.slice(2, 8)}@chainmed.io`,
          role: "consumer",
          walletAddress,
          verified: true,
          metaMaskConnected: true,
        });
      }
    } else if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`[Login Attempt] email: "${email}" -> normalized: "${normalizedEmail}"`);
      user = await User.findOne({ email: normalizedEmail });
      console.log(`[Login Query Result] Found user:`, user ? { id: user.id, email: user.email, role: user.role } : null);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (password && user.password) {
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Invalid credentials" });
      }
    } else {
      return res.status(400).json({ error: "Email or wallet address required" });
    }
    user.lastLoginAt = new Date().toISOString();
    await user.save();
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/link-wallet", authMiddleware, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: "User not found" });
    user.walletAddress = walletAddress;
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/unlink-wallet", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: "User not found" });
    user.walletAddress = null;
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/users", authMiddleware, async (req, res) => {
  try {
    let users;
    try {
      users = await User.find({}).sort({ createdAt: -1 });
    } catch (_sortErr) {
      // Fallback: no sort if created_at column missing
      users = await User.find({});
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Drug Routes ────────────────────────────────────

// 1. registerDrug
app.post("/api/drugs/register",
  authMiddleware,
  roleMiddleware("manufacturer", "admin"),
  async (req, res) => {
    try {
      const { name, genericName, dosage, batchNumber, ipfsImageHash, ipfsCertificateHash, mfgDate, expDate, notes } = req.body;
      if (!name || !genericName || !dosage || !batchNumber) {
        return res.status(400).json({ error: "name, genericName, dosage, batchNumber are required" });
      }
      const blockNum = getNextBlockNumber();
      const drugId = `DRUG-${blockNum}`;
      const serialNumber = `SN-${blockNum}-${batchNumber.slice(0, 4)}`;
      const barcode = `CHM${batchNumber.replace(/\D/g, "").slice(0, 4)}${drugId.slice(-4)}${Date.now().toString(36).toUpperCase().slice(-4)}`;
      const qrData = Buffer.from(JSON.stringify({ did: `did:eth:chm:${drugId}`, serial: serialNumber, url: `https://chainmed.io/verify/${drugId}` })).toString("base64");
      const salt = sha256(drugId + batchNumber + "SECRET_SALT").slice(0, 16);
      const txHash = generateTxHash(name + batchNumber + Date.now());

      const genesisEvent = {
        txHash,
        blockNumber: blockNum,
        timestamp: new Date().toISOString(),
        from: "0x0000000000000000000000000000000000000000",
        fromRole: "manufacturer",
        to: req.user.id,
        toRole: "manufacturer",
        action: "REGISTER_DRUG",
        location: notes?.location || "Unknown",
        temperature: notes?.temperature || 22,
        notes: `Drug ${name} (${dosage}) batch ${batchNumber} registered by ${req.user.name}`,
        signature: sha256(txHash + req.user.id + "GENESIS_SIG"),
        verified: true,
      };

      const drug = await Drug.create({
        id: drugId,
        name,
        genericName,
        dosage,
        batchNumber,
        lotNumber: `LOT-${batchNumber.slice(0, 4)}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
        mfgDate: mfgDate || daysAgo(365),
        expDate: expDate || new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        serialNumber,
        barcode,
        qrData,
        ipfsImageHash: ipfsImageHash || `Qm${Array.from({ length: 44 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        ipfsCertificateHash: ipfsCertificateHash || `Qm${Array.from({ length: 44 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        salt,
        createdAt: new Date().toISOString(),
        status: "manufactured",
        currentHolder: req.user.id,
        currentHolderRole: "manufacturer",
        manufacturer: req.user.company || req.user.name,
        manufacturerId: req.user.id,
        supplyChain: [genesisEvent],
        authenticityScore: 100,
        lastVerifiedAt: new Date().toISOString(),
        temperatureLogs: [],
      });

      await SmartContractCall.create({
        name: "registerDrug",
        params: { name, genericName, dosage, batchNumber, manufacturer: req.user.name },
        result: `Transaction mined. Drug ID: ${drugId}, Block: ${blockNum}`,
        gasUsed: `${(120000 + Math.floor(Math.random() * 40000)).toLocaleString()} gas`,
        blockNumber: blockNum,
        txHash,
        drugId,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({ drug, txHash, blockNumber: blockNum });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// 2. transferOwnership
app.post("/api/drugs/transfer",
  authMiddleware,
  async (req, res) => {
    try {
      const { drugId, toRole, location, temperature, notes } = req.body;
      if (!drugId || !toRole) return res.status(400).json({ error: "drugId and toRole are required" });

      const drug = await Drug.findOne({ id: drugId });
      if (!drug) return res.status(404).json({ error: "Drug not found on blockchain" });

      // Find user by role
      const targetUser = await User.findOne({ role: toRole });
      if (!targetUser) return res.status(404).json({ error: `No user found with role: ${toRole}` });

      const blockNum = getNextBlockNumber();
      const txHash = generateTxHash(drugId + targetUser.id + Date.now());

      const event = {
        txHash,
        blockNumber: blockNum,
        timestamp: new Date().toISOString(),
        from: drug.currentHolder,
        fromRole: drug.currentHolderRole,
        to: targetUser.id,
        toRole,
        action: "TRANSFER_OWNERSHIP",
        location: location || "Unknown",
        temperature,
        notes: notes || `Ownership transferred from ${drug.currentHolderRole} to ${toRole}`,
        signature: sha256(txHash + drugId + targetUser.id + "TRANSFER_SIG"),
        verified: true,
      };

      drug.supplyChain.push(event);
      drug.currentHolder = targetUser.id;
      drug.currentHolderRole = toRole;
      if (toRole === "distributor") drug.status = "at_distributor";
      else if (toRole === "pharmacy") drug.status = "at_pharmacy";
      else if (toRole === "consumer") drug.status = "dispensed";

      if (temperature !== undefined) {
        drug.temperatureLogs.push({
          timestamp: new Date().toISOString(),
          temperature,
          location: location || "Unknown",
          deviceId: `IOT-${blockNum.toString(36).toUpperCase()}`,
          status: temperature < 2 || temperature > 30 ? "critical" : temperature < 5 || temperature > 25 ? "warning" : "normal",
        });
      }

      await drug.save();

      await SmartContractCall.create({
        name: "transferOwnership",
        params: { drugId, newOwner: targetUser.id, newRole: toRole },
        result: `Ownership transferred to ${toRole} at block ${blockNum}`,
        gasUsed: `${(65000 + Math.floor(Math.random() * 15000)).toLocaleString()} gas`,
        blockNumber: blockNum,
        txHash,
        drugId,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
      });

      res.json({ drug, txHash, blockNumber: blockNum });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// 3. verifyDrug
app.get("/api/drugs/verify/:drugId",
  authMiddleware,
  async (req, res) => {
    try {
      const { drugId } = req.params;
      const drug = await Drug.findOne({ id: drugId });
      if (!drug) return res.status(404).json({ error: "Drug not found" });

      const blockNum = getNextBlockNumber();
      const txHash = generateTxHash(drugId + "VERIFY" + Date.now());

      const chainValid = drug.supplyChain.every(e => e.verified);
      const tempIssues = drug.temperatureLogs.filter(t => t.status === "critical" || t.status === "warning").length;
      const score = chainValid ? Math.max(100 - tempIssues * 15, 50) : 30;

      drug.authenticityScore = score;
      drug.lastVerifiedAt = new Date().toISOString();
      await drug.save();

      await SmartContractCall.create({
        name: "verifyDrug",
        params: { drugId },
        result: `Verification complete. Score: ${score}%, Authentic: ${score >= 70}`,
        gasUsed: `${(35000 + Math.floor(Math.random() * 10000)).toLocaleString()} gas`,
        blockNumber: blockNum,
        txHash,
        drugId,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
      });

      res.json({
        drug,
        verification: {
          drugId: drug.id,
          drugName: drug.name,
          manufacturer: drug.manufacturer,
          batchNumber: drug.batchNumber,
          status: drug.status,
          supplyChainLength: drug.supplyChain.length,
          authenticityScore: score,
          isAuthentic: score >= 70,
          temperatureIssues: tempIssues,
          blockchainStatus: chainValid ? "VERIFIED - All signatures valid" : "FLAGGED - Chain compromised",
          lastVerified: new Date().toISOString(),
        },
        txHash,
        blockNumber: blockNum,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// 4. updateShipment
app.post("/api/drugs/shipment",
  authMiddleware,
  async (req, res) => {
    try {
      const { drugId, status, location, temperature } = req.body;
      if (!drugId || !status) return res.status(400).json({ error: "drugId and status are required" });

      const drug = await Drug.findOne({ id: drugId });
      if (!drug) return res.status(404).json({ error: "Drug not found" });

      const blockNum = getNextBlockNumber();
      const txHash = generateTxHash(drugId + status + Date.now());

      const event = {
        txHash,
        blockNumber: blockNum,
        timestamp: new Date().toISOString(),
        from: drug.currentHolder,
        fromRole: drug.currentHolderRole,
        to: drug.currentHolder,
        toRole: drug.currentHolderRole,
        action: "UPDATE_SHIPMENT",
        location: location || "Unknown",
        temperature,
        notes: `Shipment status updated: ${status}`,
        signature: sha256(txHash + drugId + status + "SHIP_SIG"),
        verified: true,
      };

      drug.supplyChain.push(event);

      if (status === "in_transit") {
        if (drug.currentHolderRole === "manufacturer") drug.status = "in_transit_distributor";
        else if (drug.currentHolderRole === "distributor") drug.status = "in_transit_pharmacy";
      }

      if (temperature !== undefined) {
        drug.temperatureLogs.push({
          timestamp: new Date().toISOString(),
          temperature,
          location: location || "Unknown",
          deviceId: `IOT-SHIP-${blockNum.toString(36).toUpperCase()}`,
          status: temperature < 2 || temperature > 30 ? "critical" : temperature < 5 || temperature > 25 ? "warning" : "normal",
        });
      }

      await drug.save();

      await SmartContractCall.create({
        name: "updateShipment",
        params: { drugId, status, temperature: temperature?.toString() || "N/A" },
        result: `Shipment updated to "${status}" at block ${blockNum}`,
        gasUsed: `${(45000 + Math.floor(Math.random() * 12000)).toLocaleString()} gas`,
        blockNumber: blockNum,
        txHash,
        drugId,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
      });

      res.json({ drug, txHash, blockNumber: blockNum });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// 5. getDrugDetails
app.get("/api/drugs/:drugId", authMiddleware, async (req, res) => {
  try {
    const drug = await Drug.findOne({ id: req.params.drugId });
    if (!drug) return res.status(404).json({ error: "Drug not found" });
    res.json({ drug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all drugs
app.get("/api/drugs", authMiddleware, async (req, res) => {
  try {
    const { status, manufacturerId, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (manufacturerId) filter.manufacturerId = manufacturerId;
    if (search) {
      filter.$or = [
        { id: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { batchNumber: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } },
        { manufacturer: { $regex: search, $options: "i" } },
      ];
    }
    const drugs = await Drug.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    const total = await Drug.countDocuments(filter);
    res.json({ drugs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search by barcode
app.get("/api/drugs/barcode/:barcode", authMiddleware, async (req, res) => {
  try {
    const drug = await Drug.findOne({ barcode: req.params.barcode });
    if (!drug) return res.status(404).json({ error: "Drug not found" });
    res.json({ drug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Verification (simulated)
app.post("/api/ai/verify", authMiddleware, async (req, res) => {
  try {
    const { drugId, uploadedImageHash } = req.body;
    const drug = await Drug.findOne({ id: drugId });
    if (!drug) return res.status(404).json({ error: "Drug not found" });

    const packagingScore = 85 + Math.random() * 15;
    const sealScore = 80 + Math.random() * 20;
    const labelScore = 82 + Math.random() * 18;
    const barcodeScore = 88 + Math.random() * 12;
    const imageComparisonScore = uploadedImageHash ? (uploadedImageHash === drug.ipfsImageHash ? 95 + Math.random() * 5 : 50 + Math.random() * 50) : 85 + Math.random() * 15;

    const overallScore = Math.round(packagingScore * 0.25 + sealScore * 0.20 + labelScore * 0.25 + barcodeScore * 0.15 + imageComparisonScore * 0.15);

    const anomalies = [];
    if (packagingScore < 70) anomalies.push("Packaging material inconsistency");
    if (sealScore < 70) anomalies.push("Tamper seal appears compromised");
    if (labelScore < 60) anomalies.push("Label/hologram mismatch detected");
    if (barcodeScore < 80) anomalies.push("Barcode checksum warning");
    if (imageComparisonScore < 60) anomalies.push("Visual tampering detected");
    if (drug.temperatureLogs.some(t => t.status === "critical")) anomalies.push("Critical temperature excursion detected");

    const isAuthentic = overallScore >= 70 && anomalies.length < 3;
    const confidence = overallScore >= 85 ? "high" : overallScore >= 60 ? "medium" : "low";

    drug.authenticityScore = overallScore;
    drug.lastVerifiedAt = new Date().toISOString();
    if (overallScore < 50) drug.status = "flagged_fake";
    await drug.save();

    res.json({
      drugId,
      timestamp: new Date().toISOString(),
      verifiedBy: req.user.id,
      overallScore,
      packagingScore: Math.round(packagingScore),
      sealScore: Math.round(sealScore),
      labelScore: Math.round(labelScore),
      barcodeScore: Math.round(barcodeScore),
      imageComparisonScore: Math.round(imageComparisonScore),
      anomalies,
      isAuthentic,
      confidence,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Smart contract call history
app.get("/api/contracts/calls", authMiddleware, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const calls = await SmartContractCall.find({}).sort({ blockNumber: -1 }).limit(Number(limit));
    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analytics / Dashboard Stats
app.get("/api/stats", authMiddleware, async (req, res) => {
  try {
    const totalDrugs = await Drug.countDocuments();
    const verifiedDrugs = await Drug.countDocuments({ authenticityScore: { $gte: 70 } });
    const flaggedDrugs = await Drug.countDocuments({ $or: [{ authenticityScore: { $lt: 70 } }, { status: "flagged_fake" }] });
    const activeShipments = await Drug.countDocuments({ status: { $in: ["in_transit_distributor", "in_transit_pharmacy"] } });
    const totalTx = await SmartContractCall.countDocuments();
    const drugs = await Drug.find({});
    const avgScore = drugs.length > 0 ? Math.round(drugs.reduce((a, d) => a + d.authenticityScore, 0) / drugs.length) : 0;
    const tempExcursions = await Drug.countDocuments({ "temperatureLogs.status": "critical" });
    const roleStats = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);
    const roleDistribution = {};
    roleStats.forEach(r => { roleDistribution[r._id] = r.count; });

    res.json({
      totalDrugs,
      verifiedDrugs,
      flaggedDrugs,
      activeShipments,
      totalTransactions: totalTx,
      averageAuthenticityScore: avgScore,
      temperatureExcursions: tempExcursions,
      roleDistribution,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Seed Demo Data ─────────────────────────────────
app.post("/api/seed", async (req, res) => {
  try {
    // Clear existing data
    await Drug.deleteMany({});
    await User.deleteMany({});
    await SmartContractCall.deleteMany({});

    // Seed users
    const users = await User.insertMany([
      { id: "usr-mfr-001", name: "Dr. Sarah Chen", email: "sarah@novarapharma.com", password: await bcrypt.hash("password123", 10), role: "manufacturer", walletAddress: "0x742d35Cc6634C0532925a3b844Bc4e759f0fC84b", company: "Novara Pharma GmbH", location: "Munich, Germany", verified: true },
      { id: "usr-dist-001", name: "Marcus Weber", email: "marcus@medilogistics.de", password: await bcrypt.hash("password123", 10), role: "distributor", walletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72", company: "MediLogistics EU", location: "Frankfurt, Germany", verified: true },
      { id: "usr-pharm-001", name: "Anna Schmidt", email: "anna@apotheke-markt.de", password: await bcrypt.hash("password123", 10), role: "pharmacy", walletAddress: "0x1E6fCb1A3a7B8F9C0d2E4F6A8B0C2D4E6F8A0B2", company: "Apotheke am Markt", location: "Hamburg, Germany", verified: true },
      { id: "usr-consumer-001", name: "Klaus Mueller", email: "klaus@example.com", password: await bcrypt.hash("password123", 10), role: "consumer", walletAddress: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", verified: true },
      { id: "usr-admin-001", name: "Guna", email: "goonadasai@gmail.com", password: await bcrypt.hash("pro@12345", 10), role: "admin", walletAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", company: "ChainMed Labs", location: "Berlin, Germany", verified: true },
      { id: "usr-admin-002", name: "Guna", email: "goondasai@gmail.com", password: await bcrypt.hash("pro@12345", 10), role: "admin", walletAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", company: "ChainMed Labs", location: "Berlin, Germany", verified: true },
      { id: "usr-mfr-002", name: "Dr. James Mitchell", email: "james@helixbiosciences.ch", password: await bcrypt.hash("password123", 10), role: "manufacturer", walletAddress: "0x3Cb3e4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D", company: "Helix Biosciences", location: "Basel, Switzerland", verified: true },
      { id: "usr-dist-002", name: "Sophie Laurent", email: "sophie@pharmaroute.fr", password: await bcrypt.hash("password123", 10), role: "distributor", walletAddress: "0x9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3E2F1A0B", company: "PharmaRoute SA", location: "Paris, France", verified: true },
      { id: "usr-pharm-002", name: "Jean Dupont", email: "jean@pharmacie-centre.fr", password: await bcrypt.hash("password123", 10), role: "pharmacy", walletAddress: "0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B", company: "Pharmacie du Centre", location: "Paris, France", verified: true },
    ]);

    // Seed drugs
    const seedDrugs = [
      {
        id: "DRUG-1048210", name: "Atorvastatin 20mg", genericName: "Atorvastatin Calcium", manufacturer: "Novara Pharma GmbH", manufacturerId: "usr-mfr-001",
        dosage: "90 tablets", batchNumber: "NV-2291", lotNumber: "LOT-NV22-1A", serialNumber: "SN-1048210-NV22",
        barcode: "CHM22918210X3F8", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyMTAiLCJzZXJpYWwiOiJTTi0xMDQ4MjEwLU5WMjIiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyMTAifQ==",
        ipfsImageHash: "QmZ3W5c7X9yAB12CdEfGhIjKlMnOpQrStUvWxYz123456",
        ipfsCertificateHash: "QmAbCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGh",
        salt: "0x742d35cc6634c053", mfgDate: daysAgo(365), expDate: daysAgo(-365), createdAt: daysAgo(14),
        status: "at_pharmacy", currentHolder: "usr-pharm-001", currentHolderRole: "pharmacy",
        authenticityScore: 98, lastVerifiedAt: hoursAgo(2),
        supplyChain: [
          { txHash: "0x8fa9b20d3f844a1b", blockNumber: 1048210, timestamp: daysAgo(14), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "usr-mfr-001", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Munich, Germany", temperature: 22.4, notes: "Batch NV-2291 manufactured. Quality check passed.", signature: "0xgen1", verified: true },
          { txHash: "0x3bc7e11f0d2c9b8a", blockNumber: 1048215, timestamp: daysAgo(12), from: "usr-mfr-001", fromRole: "manufacturer", to: "usr-dist-001", toRole: "distributor", action: "TRANSFER_OWNERSHIP", location: "Frankfurt Hub, Germany", temperature: 20.1, notes: "Transferred to MediLogistics EU", signature: "0xgen2", verified: true },
          { txHash: "0xfa91e2b4f99a3d2c", blockNumber: 1048220, timestamp: daysAgo(10), from: "usr-dist-001", fromRole: "distributor", to: "usr-dist-001", toRole: "distributor", action: "UPDATE_SHIPMENT", location: "Frankfurt → Hamburg Route", temperature: 19.5, notes: "In transit to pharmacy", signature: "0xgen3", verified: true },
          { txHash: "0xcc291d9fa0415e4d", blockNumber: 1048225, timestamp: daysAgo(8), from: "usr-dist-001", fromRole: "distributor", to: "usr-pharm-001", toRole: "pharmacy", action: "TRANSFER_OWNERSHIP", location: "Hamburg, Germany", temperature: 19.8, notes: "Received at Apotheke am Markt. Stocked.", signature: "0xgen4", verified: true },
        ],
        temperatureLogs: [
          { timestamp: daysAgo(12), temperature: 20.1, location: "Frankfurt Hub", deviceId: "IOT-FRA-001", status: "normal" },
          { timestamp: daysAgo(10), temperature: 19.5, location: "En Route", deviceId: "IOT-TRK-022", status: "normal" },
          { timestamp: daysAgo(8), temperature: 19.8, location: "Hamburg Pharmacy", deviceId: "IOT-HAM-003", status: "normal" },
        ],
      },
      {
        id: "DRUG-1048230", name: "Insulin Glargine 100U/mL", genericName: "Insulin Glargine", manufacturer: "Helix Biosciences", manufacturerId: "usr-mfr-002",
        dosage: "5 pens", batchNumber: "HX-0098", lotNumber: "LOT-HX00-9B", serialNumber: "SN-1048230-HX00",
        barcode: "CHM00988230A7K2", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyMzAiLCJzZXJpYWwiOiJTTi0xMDQ4MjMwLUhYMDAiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyMzAifQ==",
        ipfsImageHash: "QmR2T4V6X8ZaBdFhJkMnOpQrStUvWxYz1234567890AbCd",
        ipfsCertificateHash: "QmEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKl",
        salt: "0x8ba1f109551bd432", mfgDate: daysAgo(400), expDate: daysAgo(-700), createdAt: daysAgo(7),
        status: "in_transit_distributor", currentHolder: "usr-dist-001", currentHolderRole: "distributor",
        authenticityScore: 96, lastVerifiedAt: hoursAgo(6),
        supplyChain: [
          { txHash: "0x77bc2d44fa90123e", blockNumber: 1048230, timestamp: daysAgo(7), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "usr-mfr-002", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Basel, Switzerland", temperature: 4.1, notes: "Cold-chain batch. Temp range: 2°C-8°C.", signature: "0xins1", verified: true },
          { txHash: "0x88f910a3cd2b5e4f", blockNumber: 1048235, timestamp: daysAgo(5), from: "usr-mfr-002", fromRole: "manufacturer", to: "usr-dist-001", toRole: "distributor", action: "TRANSFER_OWNERSHIP", location: "Zürich Cold Hub, Switzerland", temperature: 3.8, notes: "Transferred to ColdChain Express", signature: "0xins2", verified: true },
          { txHash: "0xaa12bb34cc56dd78", blockNumber: 1048240, timestamp: daysAgo(3), from: "usr-dist-001", fromRole: "distributor", to: "usr-dist-001", toRole: "distributor", action: "UPDATE_SHIPMENT", location: "Zürich → Lyon Route", temperature: 4.0, notes: "Cold-chain maintained. ETA 2 days.", signature: "0xins3", verified: true },
        ],
        temperatureLogs: [
          { timestamp: daysAgo(7), temperature: 4.1, location: "Basel Facility", deviceId: "IOT-BSL-001", status: "normal" },
          { timestamp: daysAgo(5), temperature: 3.8, location: "Zürich Cold Hub", deviceId: "IOT-ZRH-002", status: "normal" },
          { timestamp: daysAgo(3), temperature: 4.0, location: "En Route", deviceId: "IOT-REF-003", status: "normal" },
          { timestamp: hoursAgo(12), temperature: 4.2, location: "Lyons Checkpoint", deviceId: "IOT-REF-003", status: "normal" },
        ],
      },
      {
        id: "DRUG-1048250", name: "Amoxicillin 500mg", genericName: "Amoxicillin Trihydrate", manufacturer: "Kepler Generics", manufacturerId: "usr-mfr-001",
        dosage: "21 capsules", batchNumber: "KP-5502", lotNumber: "LOT-KP55-2C", serialNumber: "SN-1048250-KP55",
        barcode: "CHM55028250B4M9", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyNTAiLCJzZXJpYWwiOiJTTi0xMDQ4MjUwLUtQNTUiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyNTAifQ==",
        ipfsImageHash: "QmX1Y3Z5A7B9CdEfGhIjKlMnOpQrStUvWxYz1234567890",
        ipfsCertificateHash: "QmGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKlMn",
        salt: "0x1e6fcb1a3a7b8f9c", mfgDate: daysAgo(400), expDate: daysAgo(-365), createdAt: daysAgo(30),
        status: "dispensed", currentHolder: "usr-consumer-001", currentHolderRole: "consumer",
        authenticityScore: 100, lastVerifiedAt: daysAgo(1),
        supplyChain: [
          { txHash: "0x9812bfac88124d3e", blockNumber: 1048250, timestamp: daysAgo(30), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "usr-mfr-001", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Lyon, France", temperature: 21.0, notes: "Batch KP-5502 manufactured under ISO standards.", signature: "0xamo1", verified: true },
          { txHash: "0x12fa9b4d00923e5f", blockNumber: 1048255, timestamp: daysAgo(28), from: "usr-mfr-001", fromRole: "manufacturer", to: "usr-dist-002", toRole: "distributor", action: "TRANSFER_OWNERSHIP", location: "Paris CDG, France", temperature: 20.5, notes: "Transferred to PharmaRoute SA", signature: "0xamo2", verified: true },
          { txHash: "0xcc33dd44ee55ff66", blockNumber: 1048260, timestamp: daysAgo(26), from: "usr-dist-002", fromRole: "distributor", to: "usr-pharm-002", toRole: "pharmacy", action: "TRANSFER_OWNERSHIP", location: "Paris, France", temperature: 21.2, notes: "Delivered to Pharmacie du Centre", signature: "0xamo3", verified: true },
          { txHash: "0xfa77b91d20014c8e", blockNumber: 1048265, timestamp: daysAgo(24), from: "usr-pharm-002", fromRole: "pharmacy", to: "usr-consumer-001", toRole: "consumer", action: "TRANSFER_OWNERSHIP", location: "Paris, France", temperature: 22.0, notes: "Dispensed to Patient #8842. QR verified at counter.", signature: "0xamo4", verified: true },
        ],
        temperatureLogs: [
          { timestamp: daysAgo(28), temperature: 20.5, location: "Paris CDG", deviceId: "IOT-CDG-001", status: "normal" },
          { timestamp: daysAgo(26), temperature: 21.2, location: "Pharmacie du Centre", deviceId: "IOT-PAR-002", status: "normal" },
        ],
      },
      {
        id: "DRUG-1048270", name: "Metformin HCl 850mg", genericName: "Metformin Hydrochloride", manufacturer: "Novara Pharma GmbH", manufacturerId: "usr-mfr-001",
        dosage: "60 tablets", batchNumber: "NV-3155", lotNumber: "LOT-NV31-5A", serialNumber: "SN-1048270-NV31",
        barcode: "CHM31558270C2N5", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyNzAiLCJzZXJpYWwiOiJTTi0xMDQ4MjcwLU5WMzEiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyNzAifQ==",
        ipfsImageHash: "QmP2R4T6V8X0ZaBdFhJkMnOpQrStUvWxYz1234567890Ab",
        ipfsCertificateHash: "QmCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIj",
        salt: "0x3cb3e4f5a6b7c8d9", mfgDate: daysAgo(30), expDate: daysAgo(-700), createdAt: daysAgo(2),
        status: "manufactured", currentHolder: "usr-mfr-001", currentHolderRole: "manufacturer",
        authenticityScore: 100, lastVerifiedAt: hoursAgo(12),
        supplyChain: [
          { txHash: "0xdd77ee88ff9900aa", blockNumber: 1048270, timestamp: daysAgo(2), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "usr-mfr-001", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Munich, Germany", temperature: 22.0, notes: "Fresh batch. Ready for distribution.", signature: "0xmet1", verified: true },
        ],
        temperatureLogs: [
          { timestamp: daysAgo(1), temperature: 22.0, location: "Munich Storage", deviceId: "IOT-MUC-001", status: "normal" },
        ],
      },
      {
        id: "DRUG-1048280", name: "Paracetamol 500mg", genericName: "Acetaminophen", manufacturer: "Kepler Generics", manufacturerId: "usr-mfr-001",
        dosage: "100 tablets", batchNumber: "KP-6102", lotNumber: "LOT-KP61-2D", serialNumber: "SN-1048280-KP61",
        barcode: "CHM61028280D1P3", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyODAiLCJzZXJpYWwiOiJTTi0xMDQ4MjgwLUtQNjEiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyODAifQ==",
        ipfsImageHash: "QmF8H0J2L4N6P8R0T2V4X6Z8B0D2F4H6J8L0N2P4R6T8",
        ipfsCertificateHash: "QmB1D3F5H7J9L1N3P5R7T9V1X3Z5B7D9F1H3J5L7N9",
        salt: "0x9a8b7c6d5e4f3a2b", mfgDate: daysAgo(100), expDate: daysAgo(-600), createdAt: daysAgo(5),
        status: "flagged_fake", currentHolder: "usr-dist-002", currentHolderRole: "distributor",
        authenticityScore: 28, lastVerifiedAt: hoursAgo(4),
        supplyChain: [
          { txHash: "0xee11ff22aa33bb44", blockNumber: 1048280, timestamp: daysAgo(5), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "usr-mfr-001", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Lyon, France", temperature: 23.0, notes: "Batch KP-6102", signature: "0xpar1", verified: true },
          { txHash: "0xbb44cc55dd66ee77", blockNumber: 1048285, timestamp: daysAgo(3), from: "usr-mfr-001", fromRole: "manufacturer", to: "usr-dist-002", toRole: "distributor", action: "TRANSFER_OWNERSHIP", location: "Paris CDG, France", temperature: 39.0, notes: "⚠️ TEMP EXCURSION! Package reached 39°C. Seal appears compromised.", signature: "0xpar2", verified: true },
        ],
        temperatureLogs: [
          { timestamp: daysAgo(5), temperature: 23.0, location: "Lyon Facility", deviceId: "IOT-LYN-001", status: "normal" },
          { timestamp: daysAgo(3), temperature: 39.0, location: "Paris CDG", deviceId: "IOT-CDG-002", status: "critical" },
          { timestamp: hoursAgo(4), temperature: 36.5, location: "Paris CDG Hold Area", deviceId: "IOT-CDG-002", status: "critical" },
        ],
      },
      {
        id: "DRUG-1048290", name: "Losartan Potassium 50mg", genericName: "Losartan Potassium", manufacturer: "Helix Biosciences", manufacturerId: "usr-mfr-002",
        dosage: "30 tablets", batchNumber: "HX-1120", lotNumber: "LOT-HX11-0E", serialNumber: "SN-1048290-HX11",
        barcode: "CHM11208290E5L1", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyOTAiLCJzZXJpYWwiOiJTTbi0xMDQ4MjkwLUhYMTEiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyOTAifQ==",
        ipfsImageHash: "QmK4M6O8Q0S2U4W6Y8A0C2E4G6I8K0M2O4Q6S8U0W2",
        ipfsCertificateHash: "QmY4Z2A0B8C6D4E2F0G8H6J4K2L0M8N6P4R2T0V8X6",
        salt: "0x1a2b3c4d5e6f7a8b", mfgDate: daysAgo(200), expDate: daysAgo(-500), createdAt: daysAgo(4),
        status: "at_distributor", currentHolder: "usr-dist-001", currentHolderRole: "distributor",
        authenticityScore: 95, lastVerifiedAt: hoursAgo(8),
        supplyChain: [
          { txHash: "0x55aa66bb77cc88dd", blockNumber: 1048290, timestamp: daysAgo(4), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "usr-mfr-002", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Basel, Switzerland", temperature: 21.5, notes: "Batch HX-1120. Standard storage.", signature: "0xlos1", verified: true },
          { txHash: "0x99aa00bb11cc22dd", blockNumber: 1048295, timestamp: daysAgo(2), from: "usr-mfr-002", fromRole: "manufacturer", to: "usr-dist-001", toRole: "distributor", action: "TRANSFER_OWNERSHIP", location: "Zürich Hub, Switzerland", temperature: 21.0, notes: "Arrived at distribution center. Awaiting pharmacy routing.", signature: "0xlos2", verified: true },
        ],
        temperatureLogs: [
          { timestamp: daysAgo(4), temperature: 21.5, location: "Basel Facility", deviceId: "IOT-BSL-002", status: "normal" },
          { timestamp: daysAgo(2), temperature: 21.0, location: "Zürich Hub", deviceId: "IOT-ZRH-003", status: "normal" },
          { timestamp: hoursAgo(8), temperature: 21.3, location: "Zürich Hub Storage", deviceId: "IOT-ZRH-003", status: "normal" },
        ],
      },
    ];

    await Drug.insertMany(seedDrugs);
    res.json({ message: "✅ Database seeded successfully!", drugs: seedDrugs.length, users: users.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString(), mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// Increase EventEmitter limit to avoid MaxListenersExceededWarning from MetaMask extension
const EventEmitter = require("events");
EventEmitter.defaultMaxListeners = 30;

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 ChainMed API Server running on port ${PORT}`);
  if (neonClient.isConnected()) {
    try {
      await neonClient.initDb();
      console.log("✅ Neon DB Connected and schemas initialized successfully.");
    } catch (err) {
      console.error("❌ Failed to initialize Neon DB. Falling back to Mock DB.");
      useMockDb();
    }
  } else {
    try {
      const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/chainmed";
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log("✅ MongoDB Connected:", mongoUri);
      const mongoDrug = require("./models/Drug");
      const mongoUser = require("./models/User");
      const mongoSmartContract = require("./models/SmartContractCall");
      Drug = mongoDrug;
      User = mongoUser;
      SmartContractCall = mongoSmartContract;
    } catch (err) {
      console.warn("⚠️ MongoDB/Neon not connected — running in demo mode (in-memory fallback)");
      useMockDb();
    }
  }
});

function useMockDb() {
  const mockDb = require("./mockDb");
  Drug = mockDb.Drug;
  User = mockDb.User;
  SmartContractCall = mockDb.SmartContractCall;
}