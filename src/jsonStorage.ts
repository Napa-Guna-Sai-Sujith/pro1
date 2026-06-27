/**
 * ChainMed JSON Storage Manager
 * Persistent browser storage with 5MB limit for demo mode
 * Works alongside MongoDB when available — falls back to localStorage
 */

const STORAGE_KEY = "chainmed_data";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// ── Helper: relative time ─────────────────────────
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

// ── Initial seed data ─────────────────────────────
function createSeedData() {

  return {
    drugs: [
      {
        id: "DRUG-1048210", name: "Atorvastatin 20mg", genericName: "Atorvastatin Calcium",
        manufacturer: "Novara Pharma GmbH", manufacturerId: "usr-mfr-001",
        dosage: "90 tablets", batchNumber: "NV-2291", lotNumber: "LOT-NV22-1A", serialNumber: "SN-1048210-NV22",
        barcode: "CHM22918210X3F8", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyMTAiLCJzZXJpYWwiOiJTTi0xMDQ4MjEwLU5WMjIiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyMTAifQ==",
        ipfsImageHash: "QmZ3W5c7X9yAB12CdEfGhIjKlMnOpQrStUvWxYz123456",
        ipfsCertificateHash: "QmAbCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGh",
        salt: "0x742d35cc6634c053", mfgDate: daysAgo(365), expDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: daysAgo(14), status: "at_pharmacy", currentHolder: "usr-pharm-001", currentHolderRole: "pharmacy",
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
        id: "DRUG-1048230", name: "Insulin Glargine 100U/mL", genericName: "Insulin Glargine",
        manufacturer: "Helix Biosciences", manufacturerId: "usr-mfr-002",
        dosage: "5 pens", batchNumber: "HX-0098", lotNumber: "LOT-HX00-9B", serialNumber: "SN-1048230-HX00",
        barcode: "CHM00988230A7K2", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyMzAiLCJzZXJpYWwiOiJTTi0xMDQ4MjMwLUhYMDAiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyMzAifQ==",
        ipfsImageHash: "QmR2T4V6X8ZaBdFhJkMnOpQrStUvWxYz1234567890AbCd",
        ipfsCertificateHash: "QmEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKl",
        salt: "0x8ba1f109551bd432", mfgDate: daysAgo(400), expDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: daysAgo(7), status: "in_transit_distributor", currentHolder: "usr-dist-001", currentHolderRole: "distributor",
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
        id: "DRUG-1048250", name: "Amoxicillin 500mg", genericName: "Amoxicillin Trihydrate",
        manufacturer: "Kepler Generics", manufacturerId: "usr-mfr-001",
        dosage: "21 capsules", batchNumber: "KP-5502", lotNumber: "LOT-KP55-2C", serialNumber: "SN-1048250-KP55",
        barcode: "CHM55028250B4M9", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyNTAiLCJzZXJpYWwiOiJTTi0xMDQ4MjUwLUtQNTUiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyNTAifQ==",
        ipfsImageHash: "QmX1Y3Z5A7B9CdEfGhIjKlMnOpQrStUvWxYz1234567890",
        ipfsCertificateHash: "QmGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKlMn",
        salt: "0x1e6fcb1a3a7b8f9c", mfgDate: daysAgo(400), expDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: daysAgo(30), status: "dispensed", currentHolder: "usr-consumer-001", currentHolderRole: "consumer",
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
        id: "DRUG-1048270", name: "Metformin HCl 850mg", genericName: "Metformin Hydrochloride",
        manufacturer: "Novara Pharma GmbH", manufacturerId: "usr-mfr-001",
        dosage: "60 tablets", batchNumber: "NV-3155", lotNumber: "LOT-NV31-5A", serialNumber: "SN-1048270-NV31",
        barcode: "CHM31558270C2N5", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyNzAiLCJzZXJpYWwiOiJTTi0xMDQ4MjcwLU5WMzEiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyNzAifQ==",
        ipfsImageHash: "QmP2R4T6V8X0ZaBdFhJkMnOpQrStUvWxYz1234567890Ab",
        ipfsCertificateHash: "QmCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIj",
        salt: "0x3cb3e4f5a6b7c8d9", mfgDate: daysAgo(30), expDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: daysAgo(2), status: "manufactured", currentHolder: "usr-mfr-001", currentHolderRole: "manufacturer",
        authenticityScore: 100, lastVerifiedAt: hoursAgo(12),
        supplyChain: [
          { txHash: "0xdd77ee88ff9900aa", blockNumber: 1048270, timestamp: daysAgo(2), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "usr-mfr-001", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Munich, Germany", temperature: 22.0, notes: "Fresh batch. Ready for distribution.", signature: "0xmet1", verified: true },
        ],
        temperatureLogs: [
          { timestamp: daysAgo(1), temperature: 22.0, location: "Munich Storage", deviceId: "IOT-MUC-001", status: "normal" },
        ],
      },
      {
        id: "DRUG-1048280", name: "Paracetamol 500mg", genericName: "Acetaminophen",
        manufacturer: "Kepler Generics", manufacturerId: "usr-mfr-001",
        dosage: "100 tablets", batchNumber: "KP-6102", lotNumber: "LOT-KP61-2D", serialNumber: "SN-1048280-KP61",
        barcode: "CHM61028280D1P3", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyODAiLCJzZXJpYWwiOiJTTi0xMDQ4MjgwLUtQNjEiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyODAifQ==",
        ipfsImageHash: "QmF8H0J2L4N6P8R0T2V4X6Z8B0D2F4H6J8L0N2P4R6T8",
        ipfsCertificateHash: "QmB1D3F5H7J9L1N3P5R7T9V1X3Z5B7D9F1H3J5L7N9",
        salt: "0x9a8b7c6d5e4f3a2b", mfgDate: daysAgo(100), expDate: new Date(Date.now() + 600 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: daysAgo(5), status: "flagged_fake", currentHolder: "usr-dist-002", currentHolderRole: "distributor",
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
        id: "DRUG-1048290", name: "Losartan Potassium 50mg", genericName: "Losartan Potassium",
        manufacturer: "Helix Biosciences", manufacturerId: "usr-mfr-002",
        dosage: "30 tablets", batchNumber: "HX-1120", lotNumber: "LOT-HX11-0E", serialNumber: "SN-1048290-HX11",
        barcode: "CHM11208290E5L1", qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyOTAiLCJzZXJpYWwiOiJTTi0xMDQ4MjkwLUhYMTEiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyOTAifQ==",
        ipfsImageHash: "QmK4M6O8Q0S2U4W6Y8A0C2E4G6I8K0M2O4Q6S8U0W2",
        ipfsCertificateHash: "QmY4Z2A0B8C6D4E2F0G8H6J4K2L0M8N6P4R2T0V8X6",
        salt: "0x1a2b3c4d5e6f7a8b", mfgDate: daysAgo(200), expDate: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: daysAgo(4), status: "at_distributor", currentHolder: "usr-dist-001", currentHolderRole: "distributor",
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
    ],

    users: [
      { id: "usr-mfr-001", name: "Dr. Sarah Chen", email: "sarah@novarapharma.com", password: "password123", role: "manufacturer", walletAddress: "0x742d35Cc6634C0532925a3b844Bc4e759f0fC84b", company: "Novara Pharma GmbH", location: "Munich, Germany", verified: true, createdAt: daysAgo(90) },
      { id: "usr-dist-001", name: "Marcus Weber", email: "marcus@medilogistics.de", password: "password123", role: "distributor", walletAddress: "0x8ba1f109551bD432803012645Ac136ddd64DBA72", company: "MediLogistics EU", location: "Frankfurt, Germany", verified: true, createdAt: daysAgo(90) },
      { id: "usr-pharm-001", name: "Anna Schmidt", email: "anna@apotheke-markt.de", password: "password123", role: "pharmacy", walletAddress: "0x1E6fCb1A3a7B8F9C0d2E4F6A8B0C2D4E6F8A0B2", company: "Apotheke am Markt", location: "Hamburg, Germany", verified: true, createdAt: daysAgo(90) },
      { id: "usr-consumer-001", name: "Klaus Mueller", email: "klaus@example.com", password: "password123", role: "consumer", walletAddress: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", verified: true, createdAt: daysAgo(90) },
      { id: "usr-admin-001", name: "Guna", email: "goonadasai@gmail.com", password: "pro@12345", role: "admin", walletAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", company: "ChainMed Labs", location: "Berlin, Germany", verified: true, createdAt: daysAgo(90) },
      { id: "usr-admin-002", name: "Guna", email: "goondasai@gmail.com", password: "pro@12345", role: "admin", walletAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", company: "ChainMed Labs", location: "Berlin, Germany", verified: true, createdAt: daysAgo(90) },
      { id: "usr-mfr-002", name: "Dr. James Mitchell", email: "james@helixbiosciences.ch", password: "password123", role: "manufacturer", walletAddress: "0x3Cb3e4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D", company: "Helix Biosciences", location: "Basel, Switzerland", verified: true, createdAt: daysAgo(60) },
      { id: "usr-dist-002", name: "Sophie Laurent", email: "sophie@pharmaroute.fr", password: "password123", role: "distributor", walletAddress: "0x9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3E2F1A0B", company: "PharmaRoute SA", location: "Paris, France", verified: true, createdAt: daysAgo(60) },
      { id: "usr-pharm-002", name: "Jean Dupont", email: "jean@pharmacie-centre.fr", password: "password123", role: "pharmacy", walletAddress: "0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B", company: "Pharmacie du Centre", location: "Paris, France", verified: true, createdAt: daysAgo(60) },
    ],

    contractCalls: [],

    meta: {
      lastSeed: new Date().toISOString(),
      version: "2.1",
      totalDrugs: 6,
      totalUsers: 8,
    },
  };
}

// ── Storage Manager Class ─────────────────────────
class JsonStorage {
  private data: any = null;
  private blockCounter = 1048295;

  constructor() {
    this.load();
  }

  // Load from localStorage or create seed data
  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.drugs && parsed.users) {
          this.data = parsed;
          // Update block counter to be ahead of existing data
          const maxBlock = Math.max(...parsed.drugs.flatMap((d: any) => d.supplyChain.map((e: any) => e.blockNumber)), 1048295);
          this.blockCounter = maxBlock;
          console.log(`✅ JSON Storage loaded: ${parsed.drugs.length} drugs, ${parsed.users.length} users`);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load JSON storage, re-seeding:", e);
    }
    this.seed();
  }

  // Save to localStorage with size check
  save(): void {
    try {
      const json = JSON.stringify(this.data);
      const size = new Blob([json]).size;
      if (size > MAX_SIZE_BYTES) {
        console.warn(`⚠️ Storage at ${(size / 1024 / 1024).toFixed(2)}MB — approaching ${(MAX_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB limit`);
      }
      localStorage.setItem(STORAGE_KEY, json);
      console.log(`💾 Saved to JSON Storage (${(size / 1024).toFixed(1)}KB used)`);
    } catch (e) {
      console.error("❌ Failed to save to localStorage:", e);
    }
  }

  // Seed initial data
  seed(): void {
    this.data = createSeedData();
    this.blockCounter = 1048295;
    this.save();
    console.log("🌱 JSON Storage seeded with demo data");
  }

  // Reset to seed data
  reset(): void {
    this.data.meta = { ...this.data.meta, lastReset: new Date().toISOString() };
    this.seed();
  }

  getStorageInfo() {
    const json = JSON.stringify(this.data);
    const size = new Blob([json]).size;
    return {
      drugs: this.data.drugs.length,
      users: this.data.users.length,
      contractCalls: this.data.contractCalls.length,
      usedBytes: size,
      usedMB: (size / 1024 / 1024).toFixed(2),
      maxMB: (MAX_SIZE_BYTES / 1024 / 1024).toFixed(0),
      usagePercent: ((size / MAX_SIZE_BYTES) * 100).toFixed(1),
    };
  }

  // ── Block number generation ─────────────────────
  nextBlock(): number { return ++this.blockCounter; }

  // ── Drug operations ────────────────────────────
  getAllDrugs() { return this.data.drugs; }

  getDrugById(id: string) {
    return this.data.drugs.find((d: any) => d.id === id);
  }

  searchDrugs(query: string) {
    const q = query.toLowerCase();
    return this.data.drugs.filter((d: any) =>
      d.id.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) ||
      d.batchNumber.toLowerCase().includes(q) || d.barcode.toLowerCase().includes(q) ||
      d.serialNumber.toLowerCase().includes(q) || d.manufacturer.toLowerCase().includes(q)
    );
  }

  searchByBarcode(barcode: string) {
    return this.data.drugs.find((d: any) => d.barcode === barcode);
  }

  registerDrug(data: {
    name: string; genericName: string; dosage: string; batchNumber: string;
    manufacturer: string; manufacturerId: string; location: string; temperature?: number;
    priceEth?: number;
  }) {
    const blockNum = this.nextBlock();
    const drugId = `DRUG-${blockNum}`;
    const serialNumber = `SN-${blockNum}-${data.batchNumber.slice(0, 4)}`;
    const barcode = `CHM${data.batchNumber.replace(/\D/g, "").slice(0, 4)}${drugId.slice(-4)}${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const txHash = this._txHash(drugId + data.batchNumber + Date.now());

    const drug: any = {
      id: drugId, name: data.name, genericName: data.genericName, dosage: data.dosage,
      priceEth: data.priceEth || 0.001,
      batchNumber: data.batchNumber,
      lotNumber: `LOT-${data.batchNumber.slice(0, 4)}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      mfgDate: new Date().toISOString(),
      expDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      serialNumber, barcode,
      qrData: btoa(JSON.stringify({ did: `did:eth:chm:${drugId}`, serial: serialNumber, url: `https://chainmed.io/verify/${drugId}` })),
      ipfsImageHash: `Qm${Array.from({ length: 44 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      ipfsCertificateHash: `Qm${Array.from({ length: 44 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      salt: this._sha256(drugId + data.batchNumber + "SECRET_SALT").slice(0, 16),
      createdAt: new Date().toISOString(),
      status: "manufactured",
      currentHolder: data.manufacturerId,
      currentHolderRole: "manufacturer",
      manufacturer: data.manufacturer,
      manufacturerId: data.manufacturerId,
      supplyChain: [{
        txHash, blockNumber: blockNum, timestamp: new Date().toISOString(),
        from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer",
        to: data.manufacturerId, toRole: "manufacturer",
        action: "REGISTER_DRUG", location: data.location,
        temperature: data.temperature || 22,
        notes: `Drug ${data.name} (${data.dosage}) batch ${data.batchNumber} registered by manufacturer`,
        signature: this._sha256(txHash + data.manufacturerId + "GENESIS_SIG"),
        verified: true,
      }],
      authenticityScore: 100,
      lastVerifiedAt: new Date().toISOString(),
      temperatureLogs: [{
        timestamp: new Date().toISOString(), temperature: data.temperature || 22,
        location: data.location, deviceId: `IOT-${blockNum.toString(36).toUpperCase()}`,
        status: "normal",
      }],
    };

    this.data.drugs.push(drug);

    this.data.contractCalls.push({
      name: "registerDrug", params: { name: data.name, batchNumber: data.batchNumber },
      result: `Transaction mined. Drug ID: ${drugId}, Block: ${blockNum}`,
      gasUsed: `${(120000 + Math.floor(Math.random() * 40000)).toLocaleString()} gas`,
      blockNumber: blockNum, txHash, drugId,
      timestamp: new Date().toISOString(),
    });

    this.save();
    return drug;
  }

  transferOwnership(drugId: string, toUserId: string, toRole: string, fromRole: string, location: string, temperature?: number, notes?: string) {
    const drug = this.getDrugById(drugId);
    if (!drug) return null;

    const blockNum = this.nextBlock();
    const txHash = this._txHash(drugId + toUserId + Date.now());

    const event: any = {
      txHash, blockNumber: blockNum, timestamp: new Date().toISOString(),
      from: drug.currentHolder, fromRole: drug.currentHolderRole,
      to: toUserId, toRole,
      action: "TRANSFER_OWNERSHIP", location, temperature,
      notes: notes || `Ownership transferred from ${fromRole} to ${toRole}`,
      signature: this._txHash(txHash + drugId + toUserId + "TRANSFER_SIG"),
      verified: true,
    };

    drug.supplyChain.push(event);
    drug.currentHolder = toUserId;
    drug.currentHolderRole = toRole;

    if (toRole === "distributor") drug.status = "at_distributor";
    else if (toRole === "pharmacy") drug.status = "at_pharmacy";
    else if (toRole === "consumer") drug.status = "dispensed";

    if (temperature !== undefined) {
      drug.temperatureLogs.push({
        timestamp: new Date().toISOString(), temperature, location,
        deviceId: `IOT-${blockNum.toString(36).toUpperCase()}`,
        status: temperature < 2 || temperature > 30 ? "critical" : temperature < 5 || temperature > 25 ? "warning" : "normal",
      });
    }

    this.data.contractCalls.push({
      name: "transferOwnership", params: { drugId, toUserId, toRole },
      result: `Ownership transferred to ${toRole} at block ${blockNum}`,
      gasUsed: `${(65000 + Math.floor(Math.random() * 15000)).toLocaleString()} gas`,
      blockNumber: blockNum, txHash, drugId, timestamp: new Date().toISOString(),
    });

    this.save();
    return drug;
  }

  updateShipment(drugId: string, status: string, location: string, temperature?: number) {
    const drug = this.getDrugById(drugId);
    if (!drug) return null;

    const blockNum = this.nextBlock();
    const txHash = this._txHash(drugId + status + Date.now());

    drug.supplyChain.push({
      txHash, blockNumber: blockNum, timestamp: new Date().toISOString(),
      from: drug.currentHolder, fromRole: drug.currentHolderRole,
      to: drug.currentHolder, toRole: drug.currentHolderRole,
      action: "UPDATE_SHIPMENT", location, temperature,
      notes: `Shipment status updated: ${status}`,
      signature: this._txHash(txHash + drugId + status + "SHIP_SIG"),
      verified: true,
    });

    if (status === "in_transit") {
      if (drug.currentHolderRole === "manufacturer") drug.status = "in_transit_distributor";
      else if (drug.currentHolderRole === "distributor") drug.status = "in_transit_pharmacy";
    }

    if (temperature !== undefined) {
      drug.temperatureLogs.push({
        timestamp: new Date().toISOString(), temperature, location,
        deviceId: `IOT-SHIP-${blockNum.toString(36).toUpperCase()}`,
        status: temperature < 2 || temperature > 30 ? "critical" : temperature < 5 || temperature > 25 ? "warning" : "normal",
      });
    }

    this.data.contractCalls.push({
      name: "updateShipment", params: { drugId, status, temperature: temperature?.toString() || "N/A" },
      result: `Shipment updated to "${status}" at block ${blockNum}`,
      gasUsed: `${(45000 + Math.floor(Math.random() * 12000)).toLocaleString()} gas`,
      blockNumber: blockNum, txHash, drugId, timestamp: new Date().toISOString(),
    });

    this.save();
    return drug;
  }

  addDirectCommunication(drugId: string, fromUserId: string, fromRole: string, toUserId: string, toRole: string, action: string, notes: string) {
    const drug = this.getDrugById(drugId);
    if (!drug) return null;

    const blockNum = this.nextBlock();
    const txHash = this._txHash(drugId + action + Date.now());

    const event: any = {
      txHash, blockNumber: blockNum, timestamp: new Date().toISOString(),
      from: fromUserId, fromRole,
      to: toUserId, toRole,
      action,
      notes,
      signature: this._txHash(txHash + drugId + action + "COMM_SIG"),
      verified: true,
    };

    drug.supplyChain.push(event);

    this.data.contractCalls.push({
      name: action, params: { drugId, fromRole, toRole, notes },
      result: `Direct communication "${action}" mined at block ${blockNum}`,
      gasUsed: `${(45000 + Math.floor(Math.random() * 15000)).toLocaleString()} gas`,
      blockNumber: blockNum, txHash, drugId, timestamp: new Date().toISOString(),
    });

    this.save();
    return drug;
  }


  aiVerify(drugId: string) {
    const drug = this.getDrugById(drugId);
    if (!drug) return null;

    const chainValid = drug.supplyChain.every((e: any) => e.verified);
    const tempIssues = drug.temperatureLogs.filter((t: any) => t.status === "critical" || t.status === "warning").length;
    const score = chainValid ? Math.max(100 - tempIssues * 15, 50) : 30;

    drug.authenticityScore = score;
    drug.lastVerifiedAt = new Date().toISOString();

    const packagingScore = Math.round(85 + Math.random() * 15 - tempIssues * 8);
    const sealScore = Math.round(80 + Math.random() * 20 - tempIssues * 10);
    const labelScore = Math.round(82 + Math.random() * 18);
    const barcodeScore = Math.round(88 + Math.random() * 12);
    const imageScore = Math.round(85 + Math.random() * 15);
    const overallScore = Math.round(packagingScore * 0.25 + sealScore * 0.20 + labelScore * 0.25 + barcodeScore * 0.15 + imageScore * 0.15);

    const anomalies: string[] = [];
    if (packagingScore < 70) anomalies.push("Packaging material inconsistency");
    if (sealScore < 70) anomalies.push("Tamper seal appears compromised");
    if (labelScore < 60) anomalies.push("Label/hologram mismatch");
    if (barcodeScore < 80) anomalies.push("Barcode checksum warning");
    if (tempIssues > 0) anomalies.push(`${tempIssues} critical temperature excursion(s) detected`);

    this.save();

    return {
      drugId, overallScore, packagingScore, sealScore, labelScore, barcodeScore, imageComparisonScore: imageScore,
      anomalies, isAuthentic: overallScore >= 70 && anomalies.length < 3,
      confidence: overallScore >= 85 ? "high" : overallScore >= 60 ? "medium" : "low" as const,
    };
  }

  getStats() {
    const drugs = this.data.drugs;
    return {
      totalDrugs: drugs.length,
      verifiedDrugs: drugs.filter((d: any) => d.authenticityScore >= 70).length,
      flaggedDrugs: drugs.filter((d: any) => d.authenticityScore < 70).length,
      activeShipments: drugs.filter((d: any) => d.status.includes("in_transit")).length,
      totalTransactions: this.data.contractCalls.length,
      averageAuthenticityScore: drugs.length > 0 ? Math.round(drugs.reduce((a: number, d: any) => a + d.authenticityScore, 0) / drugs.length) : 0,
      temperatureExcursions: drugs.flatMap((d: any) => d.temperatureLogs).filter((t: any) => t.status === "critical").length,
      roleDistribution: this.data.users.reduce((acc: any, u: any) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {}),
    };
  }

  getContractCalls(limit = 50) {
    return this.data.contractCalls.slice(-limit).reverse();
  }

  // ── User operations ─────────────────────────────
  getAllUsers() { return this.data.users; }

  getUserByEmail(email: string) {
    return this.data.users.find((u: any) => u.email === email);
  }

  getUserById(id: string) {
    return this.data.users.find((u: any) => u.id === id);
  }

  getUsersByRole(role: string) {
    return this.data.users.filter((u: any) => u.role === role);
  }

  // ── Crypto helpers ──────────────────────────────
  private _sha256(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, "0");
    return `0x${hex}${hex.split("").reverse().join("")}${hex.slice(0, 8)}`;
  }

  private _txHash(seed: string): string {
    return this._sha256(seed + Date.now().toString() + Math.random().toString());
  }
}

// Singleton
export const jsonStore = new JsonStorage();