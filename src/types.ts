export type UserRole = "manufacturer" | "distributor" | "pharmacy" | "consumer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  walletAddress: string;
  company?: string;
  location?: string;
  verified: boolean;
  licenseNumber?: string;
  licenseDocument?: string;
}

export interface DrugRecord {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string;
  manufacturerId: string;
  dosage: string;
  batchNumber: string;
  lotNumber: string;
  mfgDate: string;
  expDate: string;
  serialNumber: string;
  barcode: string;
  qrData: string;
  ipfsImageHash: string;
  ipfsCertificateHash: string;
  salt: string;
  createdAt: string;
  status: DrugStatus;
  currentHolder: string;
  currentHolderRole: UserRole;
  supplyChain: SupplyChainEvent[];
  authenticityScore: number;
  lastVerifiedAt: string;
  temperatureLogs: TemperatureLog[];
}

export type DrugStatus = "manufactured" | "in_transit_distributor" | "at_distributor" | "in_transit_pharmacy" | "at_pharmacy" | "dispensed" | "recalled" | "flagged_fake";

export interface SupplyChainEvent {
  txHash: string;
  blockNumber: number;
  timestamp: string;
  from: string;
  fromRole: UserRole;
  to: string;
  toRole: UserRole;
  action: string;
  location: string;
  temperature?: number;
  notes?: string;
  ipfsEvidenceHash?: string;
  signature: string;
  verified: boolean;
}

export interface TemperatureLog {
  timestamp: string;
  temperature: number;
  location: string;
  deviceId: string;
  status: "normal" | "warning" | "critical";
}

export interface AIVerificationResult {
  drugId: string;
  timestamp: string;
  verifiedBy: string;
  overallScore: number;
  packagingScore: number;
  sealScore: number;
  labelScore: number;
  barcodeScore: number;
  imageComparisonScore: number;
  anomalies: string[];
  isAuthentic: boolean;
  confidence: "high" | "medium" | "low";
}

export interface SmartContractMethod {
  name: string;
  params: Record<string, string>;
  result?: string;
  gasUsed: string;
  blockNumber: number;
  txHash: string;
}

export interface Shipment {
  id: string;
  drugIds: string[];
  from: string;
  fromRole: UserRole;
  to: string;
  toRole: UserRole;
  status: "pending" | "in_transit" | "delivered" | "exception";
  estimatedDelivery: string;
  currentLocation: string;
  lastUpdated: string;
  temperatureLogs: TemperatureLog[];
}

export interface Alert {
  id: string;
  type: "counterfeit" | "temperature" | "tamper" | "recall" | "system";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  drugId?: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface AnalyticsData {
  totalDrugs: number;
  verifiedDrugs: number;
  flaggedDrugs: number;
  activeShipments: number;
  totalTransactions: number;
  averageAuthenticityScore: number;
  dailyRegistrations: number[];
  roleDistribution: Record<UserRole, number>;
  alertsByType: Record<string, number>;
}
