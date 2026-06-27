// ChainMed API Service — connects frontend to Node.js/MongoDB backend

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "https://pro1-467q.onrender.com/api";

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function apiCall<T = unknown>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth API ──────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiCall<{ user: any; token: string }>("/auth/login", { method: "POST", body: { email, password } }),

  loginWithWallet: (walletAddress: string) =>
    apiCall<{ user: any; token: string }>("/auth/login", { method: "POST", body: { walletAddress } }),

  register: (data: { name: string; email: string; password: string; role: string; company?: string; walletAddress?: string }) =>
    apiCall<{ user: any; token: string }>("/auth/register", { method: "POST", body: data }),

  getMe: (token: string) =>
    apiCall<any>("/auth/me", { token }),

  getUsers: (token: string) =>
    apiCall<any[]>("/auth/users", { token }),

  linkWallet: (walletAddress: string, token: string) =>
    apiCall<{ success: boolean; user: any }>("/auth/link-wallet", { method: "POST", body: { walletAddress }, token }),

  unlinkWallet: (token: string) =>
    apiCall<{ success: boolean; user: any }>("/auth/unlink-wallet", { method: "POST", token }),
};

// ── Drug API ───────────────────────────────────────
export const drugApi = {
  register: (data: {
    name: string;
    genericName: string;
    dosage: string;
    batchNumber: string;
    ipfsImageHash?: string;
    ipfsCertificateHash?: string;
    mfgDate?: string;
    expDate?: string;
    notes?: { location: string; temperature?: number };
  }, token: string) =>
    apiCall<{ drug: any; txHash: string; blockNumber: number }>("/drugs/register", {
      method: "POST",
      body: data,
      token,
    }),

  getAll: (token: string, params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiCall<{ drugs: any[]; total: number; page: number; limit: number }>(`/drugs?${query}`, { token });
  },

  getById: (drugId: string, token: string) =>
    apiCall<{ drug: any }>(`/drugs/${drugId}`, { token }),

  searchByBarcode: (barcode: string, token: string) =>
    apiCall<{ drug: any }>(`/drugs/barcode/${barcode}`, { token }),

  transfer: (data: {
    drugId: string;
    toRole: string;
    location?: string;
    temperature?: number;
    notes?: string;
  }, token: string) =>
    apiCall<{ drug: any; txHash: string; blockNumber: number }>("/drugs/transfer", {
      method: "POST",
      body: data,
      token,
    }),

  updateShipment: (data: {
    drugId: string;
    status: string;
    location?: string;
    temperature?: number;
  }, token: string) =>
    apiCall<{ drug: any; txHash: string; blockNumber: number }>("/drugs/shipment", {
      method: "POST",
      body: data,
      token,
    }),

  verify: (drugId: string, token: string) =>
    apiCall<{ drug: any; verification: any; txHash: string; blockNumber: number }>(`/drugs/verify/${drugId}`, { token }),

  aiVerify: (data: { drugId: string; uploadedImageHash?: string }, token: string) =>
    apiCall<any>("/ai/verify", { method: "POST", body: data, token }),
};

// ── Stats API ──────────────────────────────────────
export const statsApi = {
  get: (token: string) =>
    apiCall<{
      totalDrugs: number;
      verifiedDrugs: number;
      flaggedDrugs: number;
      activeShipments: number;
      totalTransactions: number;
      averageAuthenticityScore: number;
      temperatureExcursions: number;
      roleDistribution: Record<string, number>;
    }>("/stats", { token }),

  getContractCalls: (token: string, limit = 50) =>
    apiCall<any[]>(`/contracts/calls?limit=${limit}`, { token }),
};

// ── Seed API ───────────────────────────────────────
export const seedApi = {
  seed: () =>
    apiCall<{ message: string; drugs: number; users: number }>("/seed", { method: "POST" }),
};