import { DrugRecord, SupplyChainEvent, UserRole, SmartContractMethod } from "./types";

// ── Crypto helpers ─────────────────────────────
function sha256(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `0x${hex}${hex.split("").reverse().join("")}${hex.slice(0, 8)}`;
}

let _blockNumber = 1048200;
let _gasPrice = 42;

export function getNextBlockNumber(): number {
  return ++_blockNumber;
}

export function getGasPrice(): number {
  _gasPrice += Math.floor(Math.random() * 3);
  return _gasPrice;
}

export function generateTxHash(data: string): string {
  return sha256(data + Date.now() + Math.random());
}

export function generateBarcode(drugId: string, batchNumber: string): string {
  const code = `CHM${batchNumber.replace(/\D/g, "").slice(0, 4)}${drugId.slice(-4)}${Date.now().toString(36).toUpperCase().slice(-4)}`;
  return code;
}

export function generateQRData(drugId: string, serial: string): string {
  const payload = JSON.stringify({
    did: `did:eth:chm:${drugId}`,
    serial,
    url: `https://chainmed.io/verify/${drugId}`,
    timestamp: Date.now(),
  });
  return btoa(payload);
}

/** Helper: subtract days from now for realistic demo timestamps */
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

// ── Simulated Ethereum Smart Contract ──────────
export class PharmaSupplyChain {
  private drugs: Map<string, DrugRecord> = new Map();
  private events: SupplyChainEvent[] = [];
  private methodCalls: SmartContractMethod[] = [];
  private seeded = false;

  // ================================================================
  //  SEED DEMO DATA — 6 pre-loaded drugs at different chain stages
  // ================================================================
  seedDemoData(): void {
    if (this.seeded) return;
    this.seeded = true;

    // ---------- Drug 1: Atorvastatin — fully reached pharmacy ----------
    this._addSeedDrug({
      id: "DRUG-1048210",
      name: "Atorvastatin 20mg",
      genericName: "Atorvastatin Calcium",
      manufacturer: "Novara Pharma GmbH",
      manufacturerId: "usr-mfr-001",
      mfgDate: daysAgo(365),
      expDate: daysAgo(-365),
      dosage: "90 tablets",
      batchNumber: "NV-2291",
      lotNumber: "LOT-NV22-1A",
      serialNumber: "SN-1048210-NV22",
      barcode: "CHM22918210X3F8",
      qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyMTAiLCJzZXJpYWwiOiJTTi0xMDQ4MjEwLU5WMjIiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyMTAiLCJ0aW1lc3RhbXAiOjE3MDk2MDAwMDB9",
      ipfsImageHash: "QmZ3W5c7X9yAB12CdEfGhIjKlMnOpQrStUvWxYz123456",
      ipfsCertificateHash: "QmAbCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGh",
      salt: "0x742d35cc6634c053",
      createdAt: daysAgo(14),
      status: "at_pharmacy",
      currentHolder: "0x1E6fCb1A3a7B8F9C0d2E4F6A8B0C2D4E6F8A0B2",
      currentHolderRole: "pharmacy",
      supplyChain: [
        { txHash: "0x8fa9b20d3f844a1b", blockNumber: 1048210, timestamp: daysAgo(14), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "0x742d35Cc6634C0532925a3b844Bc4e759f0fC84b", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Munich, Germany", temperature: 22.4, notes: "Batch NV-2291 manufactured. Quality check passed.", signature: "0xgen1", verified: true },
        { txHash: "0x3bc7e11f0d2c9b8a", blockNumber: 1048215, timestamp: daysAgo(12), from: "0x742d35Cc6634C0532925a3b844Bc4e759f0fC84b", fromRole: "manufacturer", to: "0x8ba1f109551bD432803012645Ac136ddd64DBA72", toRole: "distributor", action: "TRANSFER_OWNERSHIP", location: "Frankfurt Hub, Germany", temperature: 20.1, notes: "Transferred to MediLogistics EU", signature: "0xgen2", verified: true },
        { txHash: "0xfa91e2b4f99a3d2c", blockNumber: 1048220, timestamp: daysAgo(10), from: "0x8ba1f109551bD432803012645Ac136ddd64DBA72", fromRole: "distributor", to: "0x8ba1f109551bD432803012645Ac136ddd64DBA72", toRole: "distributor", action: "UPDATE_SHIPMENT", location: "Frankfurt → Hamburg Route", temperature: 19.5, notes: "In transit to pharmacy", signature: "0xgen3", verified: true },
        { txHash: "0xcc291d9fa0415e4d", blockNumber: 1048225, timestamp: daysAgo(8), from: "0x8ba1f109551bD432803012645Ac136ddd64DBA72", fromRole: "distributor", to: "0x1E6fCb1A3a7B8F9C0d2E4F6A8B0C2D4E6F8A0B2", toRole: "pharmacy", action: "TRANSFER_OWNERSHIP", location: "Hamburg, Germany", temperature: 19.8, notes: "Received at Apotheke am Markt. Stocked.", signature: "0xgen4", verified: true },
      ],
      authenticityScore: 98,
      lastVerifiedAt: hoursAgo(2),
      temperatureLogs: [
        { timestamp: daysAgo(12), temperature: 20.1, location: "Frankfurt Hub", deviceId: "IOT-FRA-001", status: "normal" },
        { timestamp: daysAgo(10), temperature: 19.5, location: "En Route", deviceId: "IOT-TRK-022", status: "normal" },
        { timestamp: daysAgo(8), temperature: 19.8, location: "Hamburg Pharmacy", deviceId: "IOT-HAM-003", status: "normal" },
      ],
    });

    // ---------- Drug 2: Insulin — in transit with distributor ----------
    this._addSeedDrug({
      id: "DRUG-1048230",
      name: "Insulin Glargine 100U/mL",
      genericName: "Insulin Glargine",
      manufacturer: "Helix Biosciences",
      manufacturerId: "usr-mfr-002",
      dosage: "5 pens",
      batchNumber: "HX-0098",
      lotNumber: "LOT-HX00-9B",
      serialNumber: "SN-1048230-HX00",
      barcode: "CHM00988230A7K2",
      qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyMzAiLCJzZXJpYWwiOiJTTi0xMDQ4MjMwLUhYMDAiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyMzAiLCJ0aW1lc3RhbXAiOjE3MDk2MDAwMDB9",
      ipfsImageHash: "QmR2T4V6X8ZaBdFhJkMnOpQrStUvWxYz1234567890AbCd",
      ipfsCertificateHash: "QmEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKl",
      salt: "0x8ba1f109551bd432",
      mfgDate: daysAgo(400),
      expDate: daysAgo(-700),
      createdAt: daysAgo(7),
      status: "in_transit_distributor",
      currentHolder: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
      currentHolderRole: "distributor",
      supplyChain: [
        { txHash: "0x77bc2d44fa90123e", blockNumber: 1048230, timestamp: daysAgo(7), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "0x3Cb3e4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Basel, Switzerland", temperature: 4.1, notes: "Cold-chain batch. Temp range: 2°C-8°C. Requires strict monitoring.", signature: "0xins1", verified: true },
        { txHash: "0x88f910a3cd2b5e4f", blockNumber: 1048235, timestamp: daysAgo(5), from: "0x3Cb3e4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D", fromRole: "manufacturer", to: "0x8ba1f109551bD432803012645Ac136ddd64DBA72", toRole: "distributor", action: "TRANSFER_OWNERSHIP", location: "Zürich Cold Hub, Switzerland", temperature: 3.8, notes: "Transferred to ColdChain Express", signature: "0xins2", verified: true },
        { txHash: "0xaa12bb34cc56dd78", blockNumber: 1048240, timestamp: daysAgo(3), from: "0x8ba1f109551bD432803012645Ac136ddd64DBA72", fromRole: "distributor", to: "0x8ba1f109551bD432803012645Ac136ddd64DBA72", toRole: "distributor", action: "UPDATE_SHIPMENT", location: "Zürich → Lyon Route", temperature: 4.0, notes: "Cold-chain maintained. ETA 2 days.", signature: "0xins3", verified: true },
      ],
      authenticityScore: 96,
      lastVerifiedAt: hoursAgo(6),
      temperatureLogs: [
        { timestamp: daysAgo(7), temperature: 4.1, location: "Basel Facility", deviceId: "IOT-BSL-001", status: "normal" },
        { timestamp: daysAgo(5), temperature: 3.8, location: "Zürich Cold Hub", deviceId: "IOT-ZRH-002", status: "normal" },
        { timestamp: daysAgo(3), temperature: 4.0, location: "En Route", deviceId: "IOT-REF-003", status: "normal" },
        { timestamp: hoursAgo(12), temperature: 4.2, location: "Lyons Checkpoint", deviceId: "IOT-REF-003", status: "normal" },
      ],
    });

    // ---------- Drug 3: Amoxicillin — fully dispensed to patient ----------
    this._addSeedDrug({
      id: "DRUG-1048250",
      name: "Amoxicillin 500mg",
      genericName: "Amoxicillin Trihydrate",
      manufacturer: "Kepler Generics",
      manufacturerId: "usr-mfr-001",
      dosage: "21 capsules",
      batchNumber: "KP-5502",
      lotNumber: "LOT-KP55-2C",
      serialNumber: "SN-1048250-KP55",
      barcode: "CHM55028250B4M9",
      qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyNTAiLCJzZXJpYWwiOiJTTi0xMDQ4MjUwLUtQNTUiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyNTAiLCJ0aW1lc3RhbXAiOjE3MDk2MDAwMDB9",
      ipfsImageHash: "QmX1Y3Z5A7B9CdEfGhIjKlMnOpQrStUvWxYz1234567890",
      ipfsCertificateHash: "QmGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKlMn",
      salt: "0x1e6fcb1a3a7b8f9c",
      mfgDate: daysAgo(400),
      expDate: daysAgo(-365),
      createdAt: daysAgo(30),
      status: "dispensed",
      currentHolder: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
      currentHolderRole: "consumer",
      supplyChain: [
        { txHash: "0x9812bfac88124d3e", blockNumber: 1048250, timestamp: daysAgo(30), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "0x742d35Cc6634C0532925a3b844Bc4e759f0fC84b", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Lyon, France", temperature: 21.0, notes: "Batch KP-5502 manufactured under ISO standards.", signature: "0xamo1", verified: true },
        { txHash: "0x12fa9b4d00923e5f", blockNumber: 1048255, timestamp: daysAgo(28), from: "0x742d35Cc6634C0532925a3b844Bc4e759f0fC84b", fromRole: "manufacturer", to: "0x9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3E2F1A0B", toRole: "distributor", action: "TRANSFER_OWNERSHIP", location: "Paris CDG, France", temperature: 20.5, notes: "Transferred to PharmaRoute SA", signature: "0xamo2", verified: true },
        { txHash: "0xcc33dd44ee55ff66", blockNumber: 1048260, timestamp: daysAgo(26), from: "0x9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3E2F1A0B", fromRole: "distributor", to: "0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B", toRole: "pharmacy", action: "TRANSFER_OWNERSHIP", location: "Paris, France", temperature: 21.2, notes: "Delivered to Pharmacie du Centre", signature: "0xamo3", verified: true },
        { txHash: "0xfa77b91d20014c8e", blockNumber: 1048265, timestamp: daysAgo(24), from: "0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B", fromRole: "pharmacy", to: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", toRole: "consumer", action: "TRANSFER_OWNERSHIP", location: "Paris, France", temperature: 22.0, notes: "Dispensed to Patient #8842. QR verified at counter.", signature: "0xamo4", verified: true },
      ],
      authenticityScore: 100,
      lastVerifiedAt: daysAgo(1),
      temperatureLogs: [
        { timestamp: daysAgo(28), temperature: 20.5, location: "Paris CDG", deviceId: "IOT-CDG-001", status: "normal" },
        { timestamp: daysAgo(26), temperature: 21.2, location: "Pharmacie du Centre", deviceId: "IOT-PAR-002", status: "normal" },
      ],
    });

    // ---------- Drug 4: Novel batch — still at manufacturer ----------
    this._addSeedDrug({
      id: "DRUG-1048270",
      name: "Metformin HCl 850mg",
      genericName: "Metformin Hydrochloride",
      manufacturer: "Novara Pharma GmbH",
      manufacturerId: "usr-mfr-001",
      dosage: "60 tablets",
      batchNumber: "NV-3155",
      lotNumber: "LOT-NV31-5A",
      serialNumber: "SN-1048270-NV31",
      barcode: "CHM31558270C2N5",
      qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyNzAiLCJzZXJpYWwiOiJTTi0xMDQ4MjcwLU5WMzEiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyNzAiLCJ0aW1lc3RhbXAiOjE3MDk2MDAwMDB9",
      ipfsImageHash: "QmP2R4T6V8X0ZaBdFhJkMnOpQrStUvWxYz1234567890Ab",
      ipfsCertificateHash: "QmCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIj",
      salt: "0x3cb3e4f5a6b7c8d9",
      mfgDate: daysAgo(30),
      expDate: daysAgo(-700),
      createdAt: daysAgo(2),
      status: "manufactured",
      currentHolder: "0x742d35Cc6634C0532925a3b844Bc4e759f0fC84b",
      currentHolderRole: "manufacturer",
      supplyChain: [
        { txHash: "0xdd77ee88ff9900aa", blockNumber: 1048270, timestamp: daysAgo(2), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "0x742d35Cc6634C0532925a3b844Bc4e759f0fC84b", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Munich, Germany", temperature: 22.0, notes: "Fresh batch. Ready for distribution.", signature: "0xmet1", verified: true },
      ],
      authenticityScore: 100,
      lastVerifiedAt: hoursAgo(12),
      temperatureLogs: [
        { timestamp: daysAgo(1), temperature: 22.0, location: "Munich Storage", deviceId: "IOT-MUC-001", status: "normal" },
      ],
    });

    // ---------- Drug 5: Temp excursion demo -- FLAGGED ----------
    this._addSeedDrug({
      id: "DRUG-1048280",
      name: "Paracetamol 500mg",
      genericName: "Acetaminophen",
      manufacturer: "Kepler Generics",
      manufacturerId: "usr-mfr-001",
      dosage: "100 tablets",
      batchNumber: "KP-6102",
      lotNumber: "LOT-KP61-2D",
      serialNumber: "SN-1048280-KP61",
      barcode: "CHM61028280D1P3",
      qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyODAiLCJzZXJpYWwiOiJTTi0xMDQ4MjgwLUtQNjEiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyODAiLCJ0aW1lc3RhbXAiOjE3MDk2MDAwMDB9",
      ipfsImageHash: "QmF8H0J2L4N6P8R0T2V4X6Z8B0D2F4H6J8L0N2P4R6T8",
      ipfsCertificateHash: "QmB1D3F5H7J9L1N3P5R7T9V1X3Z5B7D9F1H3J5L7N9",
      salt: "0x9a8b7c6d5e4f3a2b",
      mfgDate: daysAgo(100),
      expDate: daysAgo(-600),
      createdAt: daysAgo(5),
      status: "flagged_fake",
      currentHolder: "0x9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3E2F1A0B",
      currentHolderRole: "distributor",
      supplyChain: [
        { txHash: "0xee11ff22aa33bb44", blockNumber: 1048280, timestamp: daysAgo(5), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "0x742d35Cc6634C0532925a3b844Bc4e759f0fC84b", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Lyon, France", temperature: 23.0, notes: "Batch KP-6102", signature: "0xpar1", verified: true },
        { txHash: "0xbb44cc55dd66ee77", blockNumber: 1048285, timestamp: daysAgo(3), from: "0x742d35Cc6634C0532925a3b844Bc4e759f0fC84b", fromRole: "manufacturer", to: "0x9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3E2F1A0B", toRole: "distributor", action: "TRANSFER_OWNERSHIP", location: "Paris CDG, France", temperature: 39.0, notes: "⚠️ TEMP EXCURSION! Package reached 39°C. Seal appears compromised.", signature: "0xpar2", verified: true },
      ],
      authenticityScore: 28,
      lastVerifiedAt: hoursAgo(4),
      temperatureLogs: [
        { timestamp: daysAgo(5), temperature: 23.0, location: "Lyon Facility", deviceId: "IOT-LYN-001", status: "normal" },
        { timestamp: daysAgo(3), temperature: 39.0, location: "Paris CDG", deviceId: "IOT-CDG-002", status: "critical" },
        { timestamp: hoursAgo(4), temperature: 36.5, location: "Paris CDG Hold Area", deviceId: "IOT-CDG-002", status: "critical" },
      ],
    });

    // ---------- Drug 6: Losartan — at distributor, ready for routing ----------
    this._addSeedDrug({
      id: "DRUG-1048290",
      name: "Losartan Potassium 50mg",
      genericName: "Losartan Potassium",
      manufacturer: "Helix Biosciences",
      manufacturerId: "usr-mfr-002",
      dosage: "30 tablets",
      batchNumber: "HX-1120",
      lotNumber: "LOT-HX11-0E",
      serialNumber: "SN-1048290-HX11",
      barcode: "CHM11208290E5L1",
      qrData: "eyJkaWQiOiJkaWQ6ZXRoOmNobTpEUlVHLTEwNDgyOTAiLCJzZXJpYWwiOiJTTi0xMDQ4MjkwLUhYMTEiLCJ1cmwiOiJodHRwczovL2NoYWlubWVkLmlvL3ZlcmlmeS9EUlVHLTEwNDgyOTAiLCJ0aW1lc3RhbXAiOjE3MDk2MDAwMDB9",
      ipfsImageHash: "QmK4M6O8Q0S2U4W6Y8A0C2E4G6I8K0M2O4Q6S8U0W2",
      ipfsCertificateHash: "QmY4Z2A0B8C6D4E2F0G8H6J4K2L0M8N6P4R2T0V8X6",
      salt: "0x1a2b3c4d5e6f7a8b",
      mfgDate: daysAgo(200),
      expDate: daysAgo(-500),
      createdAt: daysAgo(4),
      status: "at_distributor",
      currentHolder: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
      currentHolderRole: "distributor",
      supplyChain: [
        { txHash: "0x55aa66bb77cc88dd", blockNumber: 1048290, timestamp: daysAgo(4), from: "0x0000000000000000000000000000000000000000", fromRole: "manufacturer", to: "0x3Cb3e4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D", toRole: "manufacturer", action: "REGISTER_DRUG", location: "Basel, Switzerland", temperature: 21.5, notes: "Batch HX-1120. Standard storage.", signature: "0xlos1", verified: true },
        { txHash: "0x99aa00bb11cc22dd", blockNumber: 1048295, timestamp: daysAgo(2), from: "0x3Cb3e4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D", fromRole: "manufacturer", to: "0x8ba1f109551bD432803012645Ac136ddd64DBA72", toRole: "distributor", action: "TRANSFER_OWNERSHIP", location: "Zürich Hub, Switzerland", temperature: 21.0, notes: "Arrived at distribution center. Awaiting pharmacy routing.", signature: "0xlos2", verified: true },
      ],
      authenticityScore: 95,
      lastVerifiedAt: hoursAgo(8),
      temperatureLogs: [
        { timestamp: daysAgo(4), temperature: 21.5, location: "Basel Facility", deviceId: "IOT-BSL-002", status: "normal" },
        { timestamp: daysAgo(2), temperature: 21.0, location: "Zürich Hub", deviceId: "IOT-ZRH-003", status: "normal" },
        { timestamp: hoursAgo(8), temperature: 21.3, location: "Zürich Hub Storage", deviceId: "IOT-ZRH-003", status: "normal" },
      ],
    });
  }

  /** Internal helper to add a pre-built seed drug + register events */
  private _addSeedDrug(drug: DrugRecord): void {
    this.drugs.set(drug.id, drug);
    for (const ev of drug.supplyChain) {
      this.events.push(ev);
    }
    // Add corresponding smart contract method calls
    const regTx: SmartContractMethod = {
      name: "registerDrug",
      params: { _name: drug.name, _genericName: drug.genericName, _dosage: drug.dosage, _batchNumber: drug.batchNumber, _manufacturer: drug.manufacturer, _ipfsHash: drug.ipfsImageHash },
      result: `Transaction mined. Drug ID: ${drug.id}`,
      gasUsed: `${(120000 + Math.floor(Math.random() * 40000)).toLocaleString()} gas`,
      blockNumber: drug.supplyChain[0]?.blockNumber || 1048210,
      txHash: drug.supplyChain[0]?.txHash || "0x0000",
    };
    this.methodCalls.push(regTx);
    // Add ownership transfer calls
    for (let i = 1; i < drug.supplyChain.length; i++) {
      const ev = drug.supplyChain[i];
      if (ev.action === "TRANSFER_OWNERSHIP") {
        this.methodCalls.push({
          name: "transferOwnership",
          params: { _drugId: drug.id, _newOwner: ev.to, _newRole: ev.toRole },
          result: `Ownership transferred to ${ev.toRole} at block ${ev.blockNumber}`,
          gasUsed: `${(65000 + Math.floor(Math.random() * 15000)).toLocaleString()} gas`,
          blockNumber: ev.blockNumber,
          txHash: ev.txHash,
        });
      } else if (ev.action === "UPDATE_SHIPMENT") {
        this.methodCalls.push({
          name: "updateShipment",
          params: { _drugId: drug.id, _status: "in_transit", _temperature: ev.temperature?.toString() || "N/A" },
          result: `Shipment updated at block ${ev.blockNumber}`,
          gasUsed: `${(45000 + Math.floor(Math.random() * 12000)).toLocaleString()} gas`,
          blockNumber: ev.blockNumber,
          txHash: ev.txHash,
        });
      }
    }
  }

  // ================================================================
  //  SMART CONTRACT METHODS
  // ================================================================

  registerDrug(
    name: string,
    genericName: string,
    dosage: string,
    batchNumber: string,
    manufacturer: string,
    manufacturerId: string,
    ipfsImageHash: string,
    ipfsCertificateHash: string,
    walletAddress: string,
    location: string,
  ): { drug: DrugRecord; tx: SmartContractMethod } {
    const blockNum = getNextBlockNumber();
    const txHash = generateTxHash(name + batchNumber + Date.now());
    const drugId = `DRUG-${blockNum}`;
    const serialNumber = `SN-${blockNum}-${batchNumber.slice(0, 4)}`;
    const barcode = generateBarcode(drugId, batchNumber);
    const qrData = generateQRData(drugId, serialNumber);
    const salt = sha256(drugId + batchNumber + "SECRET_SALT").slice(0, 16);

    const drug: DrugRecord = {
      id: drugId,
      name,
      genericName,
      manufacturer,
      manufacturerId,
      dosage,
      batchNumber,
      lotNumber: `LOT-${batchNumber.slice(0, 4)}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      mfgDate: new Date().toISOString(),
      expDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      serialNumber,
      barcode,
      qrData,
      ipfsImageHash,
      ipfsCertificateHash,
      salt,
      createdAt: new Date().toISOString(),
      status: "manufactured",
      currentHolder: walletAddress,
      currentHolderRole: "manufacturer",
      supplyChain: [],
      authenticityScore: 100,
      lastVerifiedAt: new Date().toISOString(),
      temperatureLogs: [],
    };

    const genesisEvent: SupplyChainEvent = {
      txHash,
      blockNumber: blockNum,
      timestamp: new Date().toISOString(),
      from: "0x0000000000000000000000000000000000000000",
      fromRole: "manufacturer",
      to: walletAddress,
      toRole: "manufacturer",
      action: "REGISTER_DRUG",
      location,
      notes: `Drug ${name} (${dosage}) batch ${batchNumber} registered on blockchain`,
      signature: sha256(txHash + walletAddress + "GENESIS_SIG"),
      verified: true,
    };

    drug.supplyChain.push(genesisEvent);
    this.drugs.set(drugId, drug);
    this.events.push(genesisEvent);

    const methodCall: SmartContractMethod = {
      name: "registerDrug",
      params: { _name: name, _genericName: genericName, _dosage: dosage, _batchNumber: batchNumber, _manufacturer: manufacturer, _ipfsHash: ipfsImageHash },
      result: `Transaction mined. Drug ID: ${drugId}, Block: ${blockNum}`,
      gasUsed: `${(120000 + Math.floor(Math.random() * 40000)).toLocaleString()} gas`,
      blockNumber: blockNum,
      txHash,
    };
    this.methodCalls.push(methodCall);

    return { drug, tx: methodCall };
  }

  transferOwnership(
    drugId: string,
    newOwner: string,
    newRole: UserRole,
    fromRole: UserRole,
    location: string,
    temperature?: number,
    notes?: string,
    ipfsEvidenceHash?: string,
  ): { drug?: DrugRecord; tx: SmartContractMethod; error?: string } {
    const drug = this.drugs.get(drugId);
    if (!drug) return { error: "Drug not found on blockchain", tx: this._errorTx("transferOwnership", drugId) };

    const blockNum = getNextBlockNumber();
    const txHash = generateTxHash(drugId + newOwner + Date.now());

    const event: SupplyChainEvent = {
      txHash, blockNumber: blockNum, timestamp: new Date().toISOString(),
      from: drug.currentHolder, fromRole, to: newOwner, toRole: newRole,
      action: "TRANSFER_OWNERSHIP", location, temperature,
      notes: notes || `Ownership transferred from ${fromRole} to ${newRole}`,
      ipfsEvidenceHash, signature: sha256(txHash + drugId + newOwner + "TRANSFER_SIG"), verified: true,
    };

    drug.supplyChain.push(event);
    drug.currentHolder = newOwner;
    drug.currentHolderRole = newRole;
    if (newRole === "distributor") drug.status = "at_distributor";
    else if (newRole === "pharmacy") drug.status = "at_pharmacy";
    else if (newRole === "consumer") drug.status = "dispensed";

    if (temperature !== undefined) {
      drug.temperatureLogs.push({
        timestamp: new Date().toISOString(), temperature, location,
        deviceId: `IOT-${blockNum.toString(36).toUpperCase()}`,
        status: temperature < 2 || temperature > 30 ? "critical" : temperature < 5 || temperature > 25 ? "warning" : "normal",
      });
    }
    this.events.push(event);

    const methodCall: SmartContractMethod = {
      name: "transferOwnership",
      params: { _drugId: drugId, _newOwner: newOwner, _newRole: newRole },
      result: `Ownership transferred to ${newRole} at block ${blockNum}`,
      gasUsed: `${(65000 + Math.floor(Math.random() * 15000)).toLocaleString()} gas`,
      blockNumber: blockNum, txHash,
    };
    this.methodCalls.push(methodCall);
    return { drug, tx: methodCall };
  }

  verifyDrug(drugId: string): { drug?: DrugRecord; tx: SmartContractMethod; verification: any; error?: string } {
    const drug = this.drugs.get(drugId);
    if (!drug) return { error: "Drug not found", tx: this._errorTx("verifyDrug", drugId), verification: null };

    const blockNum = getNextBlockNumber();
    const txHash = generateTxHash(drugId + "VERIFY" + Date.now());
    const chainValid = drug.supplyChain.every(e => e.verified);
    const tempIssues = drug.temperatureLogs.filter(t => t.status === "critical" || t.status === "warning").length;
    const score = chainValid ? Math.max(100 - tempIssues * 15, 50) : 30;

    drug.authenticityScore = score;
    drug.lastVerifiedAt = new Date().toISOString();

    const verification = {
      drugId: drug.id, drugName: drug.name, manufacturer: drug.manufacturer,
      batchNumber: drug.batchNumber, status: drug.status,
      supplyChainLength: drug.supplyChain.length,
      blockchainStatus: chainValid ? "VERIFIED - All signatures valid" : "FLAGGED - Chain integrity compromised",
      authenticityScore: score, isAuthentic: score >= 70,
      temperatureIssues: tempIssues, lastVerified: new Date().toISOString(),
    };

    const methodCall: SmartContractMethod = {
      name: "verifyDrug",
      params: { _drugId: drugId },
      result: `Verification complete. Score: ${score}%, Authentic: ${verification.isAuthentic}`,
      gasUsed: `${(35000 + Math.floor(Math.random() * 10000)).toLocaleString()} gas`,
      blockNumber: blockNum, txHash,
    };
    this.methodCalls.push(methodCall);
    return { drug, tx: methodCall, verification };
  }

  updateShipment(drugId: string, status: string, location: string, temperature?: number): { drug?: DrugRecord; tx: SmartContractMethod; error?: string } {
    const drug = this.drugs.get(drugId);
    if (!drug) return { error: "Drug not found", tx: this._errorTx("updateShipment", drugId) };

    const blockNum = getNextBlockNumber();
    const txHash = generateTxHash(drugId + status + Date.now());

    if (temperature !== undefined) {
      drug.temperatureLogs.push({
        timestamp: new Date().toISOString(), temperature, location,
        deviceId: `IOT-SHIP-${blockNum.toString(36).toUpperCase()}`,
        status: temperature < 2 || temperature > 30 ? "critical" : temperature < 5 || temperature > 25 ? "warning" : "normal",
      });
    }

    const event: SupplyChainEvent = {
      txHash, blockNumber: blockNum, timestamp: new Date().toISOString(),
      from: drug.currentHolder, fromRole: drug.currentHolderRole,
      to: drug.currentHolder, toRole: drug.currentHolderRole,
      action: "UPDATE_SHIPMENT", location, temperature,
      notes: `Shipment status updated: ${status}`,
      signature: sha256(txHash + drugId + status + "SHIP_SIG"), verified: true,
    };
    drug.supplyChain.push(event);

    if (status === "in_transit") {
      if (drug.currentHolderRole === "manufacturer") drug.status = "in_transit_distributor";
      else if (drug.currentHolderRole === "distributor") drug.status = "in_transit_pharmacy";
    }

    const methodCall: SmartContractMethod = {
      name: "updateShipment",
      params: { _drugId: drugId, _status: status, _temperature: temperature?.toString() || "N/A" },
      result: `Shipment updated to "${status}" at block ${blockNum}`,
      gasUsed: `${(45000 + Math.floor(Math.random() * 12000)).toLocaleString()} gas`,
      blockNumber: blockNum, txHash,
    };
    this.methodCalls.push(methodCall);
    return { drug, tx: methodCall };
  }

  getDrugDetails(drugId: string): { drug?: DrugRecord; tx: SmartContractMethod; error?: string } {
    const drug = this.drugs.get(drugId);
    if (!drug) return { error: "Drug not found", tx: this._errorTx("getDrugDetails", drugId) };

    const blockNum = getNextBlockNumber();
    const txHash = generateTxHash(drugId + "DETAILS" + Date.now());
    const methodCall: SmartContractMethod = {
      name: "getDrugDetails", params: { _drugId: drugId },
      result: `Name: ${drug.name}, Status: ${drug.status}, Holder: ${drug.currentHolderRole}, Chain Events: ${drug.supplyChain.length}`,
      gasUsed: `${(22000 + Math.floor(Math.random() * 8000)).toLocaleString()} gas`,
      blockNumber: blockNum, txHash,
    };
    this.methodCalls.push(methodCall);
    return { drug, tx: methodCall };
  }

  getAllDrugs(): DrugRecord[] { return Array.from(this.drugs.values()); }
  getDrugsByHolder(walletAddress: string): DrugRecord[] { return Array.from(this.drugs.values()).filter(d => d.currentHolder === walletAddress); }
  getDrugsByManufacturer(manufacturerId: string): DrugRecord[] { return Array.from(this.drugs.values()).filter(d => d.manufacturerId === manufacturerId); }
  getAllEvents(): SupplyChainEvent[] { return this.events; }
  getRecentMethodCalls(count: number = 10): SmartContractMethod[] { return this.methodCalls.slice(-count).reverse(); }
  searchByBarcode(barcode: string): DrugRecord | undefined { return Array.from(this.drugs.values()).find(d => d.barcode === barcode); }

  search(query: string): DrugRecord[] {
    const q = query.toLowerCase();
    return Array.from(this.drugs.values()).filter(d =>
      d.id.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) ||
      d.batchNumber.toLowerCase().includes(q) || d.barcode.toLowerCase().includes(q) ||
      d.serialNumber.toLowerCase().includes(q) || d.manufacturer.toLowerCase().includes(q)
    );
  }

  private _errorTx(methodName: string, drugId: string): SmartContractMethod {
    return {
      name: methodName, params: { _drugId: drugId },
      result: "REVERT: Drug not found on blockchain",
      gasUsed: "21,000 gas (reverted)",
      blockNumber: getNextBlockNumber(),
      txHash: `0x0000000000000000000000000000000000000000`,
    };
  }
}

// Singleton — auto-seeded on first access
export const contract = new PharmaSupplyChain();
contract.seedDemoData();
