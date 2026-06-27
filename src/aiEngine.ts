import { AIVerificationResult, DrugRecord } from "./types";

// AI Verification Engine - Simulates computer vision analysis
export class AIVerificationEngine {
  private modelVersion = "PharmaNet-v3.2";

  verifyDrug(
    drug: DrugRecord,
    verifierAddress: string,
    uploadedImageHash?: string,
  ): AIVerificationResult {
    // Simulate AI analysis
    const packagingScore = this._analyzePackaging(drug);
    const sealScore = this._analyzeSeal(drug);
    const labelScore = this._analyzeLabel(drug);
    const barcodeScore = this._analyzeBarcode(drug);
    const imageComparisonScore = this._imageCompare(uploadedImageHash, drug.ipfsImageHash);

    const anomalies: string[] = [];
    let overallScore = 0;

    // Weighted average
    overallScore = Math.round(
      packagingScore * 0.25 +
      sealScore * 0.20 +
      labelScore * 0.25 +
      barcodeScore * 0.15 +
      imageComparisonScore * 0.15
    );

    // Analyze for specific anomalies
    if (packagingScore < 70) anomalies.push("Packaging material inconsistency detected");
    if (sealScore < 70) anomalies.push("Tamper-evident seal appears compromised");
    if (labelScore < 60) anomalies.push("Label text/hologram mismatch with reference database");
    if (barcodeScore < 80) anomalies.push("Barcode/QR code checksum validation warning");
    if (imageComparisonScore < 60) anomalies.push("Visual tampering detected - packaging may be counterfeit");
    if (drug.temperatureLogs.some(t => t.status === "critical")) anomalies.push("Critical temperature excursion detected in supply chain");

    // Check expiry
    const expDate = new Date(drug.expDate);
    if (expDate < new Date()) anomalies.push("Drug has expired");

    // Check supply chain integrity
    if (drug.supplyChain.some(e => !e.verified)) anomalies.push("Blockchain signature verification failed");

    const isAuthentic = overallScore >= 70 && anomalies.length < 3;
    const confidence: "high" | "medium" | "low" = overallScore >= 85 ? "high" : overallScore >= 60 ? "medium" : "low";
    drug.authenticityScore = overallScore;
    drug.lastVerifiedAt = new Date().toISOString();

    return {
      drugId: drug.id,
      timestamp: new Date().toISOString(),
      verifiedBy: verifierAddress,
      overallScore,
      packagingScore,
      sealScore,
      labelScore,
      barcodeScore,
      imageComparisonScore,
      anomalies,
      isAuthentic,
      confidence,
    };
  }

  // Generate a visual certificate of the AI analysis
  generateCertificate(result: AIVerificationResult, drug: DrugRecord): string {
    const certData = {
      certificateType: "AI_VERIFICATION_CERTIFICATE",
      modelVersion: this.modelVersion,
      issuer: "ChainMed AI PharmaNet",
      verificationId: `CERT-${result.drugId}-${Date.now().toString(36).toUpperCase()}`,
      timestamp: result.timestamp,
      drugInfo: {
        name: drug.name,
        manufacturer: drug.manufacturer,
        batchNumber: drug.batchNumber,
        serialNumber: drug.serialNumber,
      },
      aiAnalysis: {
        overallScore: result.overallScore,
        packagingScore: result.packagingScore,
        sealScore: result.sealScore,
        labelScore: result.labelScore,
        barcodeScore: result.barcodeScore,
        imageComparisonScore: result.imageComparisonScore,
        confidence: result.confidence,
        isAuthentic: result.isAuthentic,
        anomaliesFound: result.anomalies.length,
      },
      blockchainAnchor: {
        drugId: drug.id,
        supplyChainEvents: drug.supplyChain.length,
        lastVerified: drug.lastVerifiedAt,
        temperatureLogs: drug.temperatureLogs.length,
      },
    };
    return btoa(JSON.stringify(certData));
  }

  // Simulate voice search processing
  processVoiceQuery(transcript: string): { drugName?: string; batchNumber?: string; action: string } {
    const text = transcript.toLowerCase();
    if (text.includes("verify") || text.includes("check")) {
      const words = text.split(" ");
      const nameIdx = words.findIndex(w =>
        w.includes("drug") || w.includes("medicine") || w.includes("batch") || w.includes("serial")
      );
      return {
        drugName: nameIdx >= 0 && words.length > nameIdx + 1 ? words[nameIdx + 1] : undefined,
        action: "verify",
      };
    }
    if (text.includes("track") || text.includes("trace") || text.includes("where")) {
      return { action: "track" };
    }
    if (text.includes("register") || text.includes("new") || text.includes("create")) {
      return { action: "register" };
    }
    if (text.includes("scan")) {
      return { action: "scan" };
    }
    return { action: "unknown" };
  }

  private _analyzePackaging(drug: DrugRecord): number {
    // Simulates computer vision analysis of packaging material
    let score = 85 + Math.random() * 15;
    // Penalize if there were temperature issues
    const criticalTempCount = drug.temperatureLogs.filter(t => t.status === "critical").length;
    score -= criticalTempCount * 8;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private _analyzeSeal(drug: DrugRecord): number {
    // Simulates tamper-evident seal analysis
    const baseScore = 80 + Math.random() * 20;
    // If the drug has been recalled, seal is likely compromised
    if (drug.status === "recalled") return Math.max(0, Math.round(baseScore - 60));
    return Math.min(100, Math.round(baseScore));
  }

  private _analyzeLabel(drug: DrugRecord): number {
    // Simulates label text/hologram verification
    let score = 82 + Math.random() * 18;
    // Check if expiry is soon (within 3 months)
    const expDate = new Date(drug.expDate);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    if (expDate < threeMonthsFromNow) score -= 10;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private _analyzeBarcode(_drug: DrugRecord): number {
    // Simulates barcode/QR verification
    const baseScore = 88 + Math.random() * 12;
    return Math.min(100, Math.round(baseScore));
  }

  private _imageCompare(uploadedHash?: string, referenceHash?: string): number {
    // Simulates image comparison between manufacturer reference and uploaded image
    if (!uploadedHash || !referenceHash) return 85 + Math.random() * 15;
    // In real scenario, would do actual image comparison
    // For simulation, if hashes match, high score; otherwise random
    if (uploadedHash === referenceHash) return 95 + Math.random() * 5;
    return 50 + Math.random() * 50;
  }
}

export const aiEngine = new AIVerificationEngine();
