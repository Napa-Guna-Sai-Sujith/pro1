import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { authApi } from "./api";
import type { User, UserRole } from "./types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithMetaMask: () => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; email: string; password?: string; role: string; company?: string; walletAddress?: string; location?: string; licenseNumber?: string; licenseDocument?: string }) => Promise<{ success: boolean; error?: string }>;
  switchRole: (userId: string) => void;
  logout: () => void;
  getUsersByRole: (role: UserRole) => User[];
  allUsers: User[];
  storageInfo: { drugs: number; users: number; usedMB: string; usagePercent: string; maxMB: string };
  refreshUsers: () => Promise<void>;
  linkWallet: (walletAddress: string) => Promise<{ success: boolean; error?: string }>;
  unlinkWallet: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: { name: string; company?: string; location?: string; licenseNumber?: string }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUsers = useCallback(async () => {
    const savedToken = localStorage.getItem("chm_jwt") || token;
    if (savedToken) {
      try {
        const usersList = await authApi.getUsers(savedToken);
        setAllUsers(usersList as User[]);
      } catch (err) {
        console.warn("Failed to fetch users from database", err);
      }
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      const response = await authApi.login(email, password);
      const { user: loggedUser, token: authToken } = response;
      localStorage.setItem("chm_jwt", authToken);
      localStorage.setItem("chm_user", JSON.stringify(loggedUser));
      setUser(loggedUser as User);
      setToken(authToken);
      setIsConnecting(false);
      
      // Refresh the users list after logging in
      setTimeout(() => {
        authApi.getUsers(authToken).then(users => setAllUsers(users as User[])).catch(() => {});
      }, 100);
      
      return { success: true };
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
      setIsConnecting(false);
      return { success: false, error: err.message };
    }
  }, []);

  const register = useCallback(async (data: any) => {
    setIsConnecting(true);
    setError(null);
    try {
      const response = await authApi.register(data);
      const { user: registeredUser, token: authToken } = response;
      localStorage.setItem("chm_jwt", authToken);
      localStorage.setItem("chm_user", JSON.stringify(registeredUser));
      setUser(registeredUser as User);
      setToken(authToken);
      setIsConnecting(false);

      // Refresh the users list
      setTimeout(() => {
        authApi.getUsers(authToken).then(users => setAllUsers(users as User[])).catch(() => {});
      }, 100);

      return { success: true };
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setIsConnecting(false);
      return { success: false, error: err.message };
    }
  }, []);

  const loginWithMetaMask = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error("MetaMask is not installed. Please install the extension.");
      }
      await ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found in MetaMask.");
      }
      const activeAccount = accounts[0];
      const response = await authApi.loginWithWallet(activeAccount);
      const { user: walletUser, token: authToken } = response;
      localStorage.setItem("chm_jwt", authToken);
      localStorage.setItem("chm_user", JSON.stringify(walletUser));
      setUser(walletUser as User);
      setToken(authToken);
      setIsConnecting(false);

      setTimeout(() => {
        authApi.getUsers(authToken).then(users => setAllUsers(users as User[])).catch(() => {});
      }, 100);

      return { success: true };
    } catch (err: any) {
      setError(err.message || "MetaMask login failed");
      setIsConnecting(false);
      return { success: false, error: err.message };
    }
  }, []);

  const switchRole = useCallback((userId: string) => {
    const found = allUsers.find((u: any) => u.id === userId);
    if (found && token) {
      // For local session swap
      setUser(found);
      localStorage.setItem("chm_user", JSON.stringify(found));
    }
  }, [allUsers, token]);

  const linkWallet = useCallback(async (walletAddress: string) => {
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const response = await authApi.linkWallet(walletAddress, token);
      if (response.success) {
        setUser(response.user as User);
        localStorage.setItem("chm_user", JSON.stringify(response.user));
        authApi.getUsers(token).then(users => setAllUsers(users as User[])).catch(() => {});
        return { success: true };
      }
      return { success: false, error: "Failed to link wallet" };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to link wallet" };
    }
  }, [token]);

  const unlinkWallet = useCallback(async () => {
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const response = await authApi.unlinkWallet(token);
      if (response.success) {
        setUser(response.user as User);
        localStorage.setItem("chm_user", JSON.stringify(response.user));
        authApi.getUsers(token).then(users => setAllUsers(users as User[])).catch(() => {});
        return { success: true };
      }
      return { success: false, error: "Failed to unlink wallet" };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to unlink wallet" };
    }
  }, [token]);

  const updateProfile = useCallback(async (data: { name: string; company?: string; location?: string; licenseNumber?: string }) => {
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const response = await authApi.updateProfile(data, token);
      if (response.success) {
        setUser(response.user as User);
        localStorage.setItem("chm_user", JSON.stringify(response.user));
        authApi.getUsers(token).then(users => setAllUsers(users as User[])).catch(() => {});
        return { success: true };
      }
      return { success: false, error: "Failed to update profile" };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to update profile" };
    }
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem("chm_jwt");
    localStorage.removeItem("chm_user");
    setUser(null);
    setToken(null);
  }, []);

  // Restore session & load users
  useEffect(() => {
    const saved = localStorage.getItem("chm_user");
    const savedToken = localStorage.getItem("chm_jwt");
    if (saved && savedToken) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        setToken(savedToken);
        
        // Load on startup
        authApi.getUsers(savedToken).then(users => setAllUsers(users as User[])).catch(() => {});
      } catch {
        localStorage.removeItem("chm_user");
        localStorage.removeItem("chm_jwt");
      }
    }
  }, []);

  const storageInfo = {
    drugs: 0, // Fallback if local storage not queried directly
    users: allUsers.length,
    usedMB: "0.01",
    usagePercent: "0.1",
    maxMB: "5"
  };

  return (
    <AuthContext.Provider value={{
      user, token, isAuthenticated: !!user, isConnecting, error,
      login, loginWithMetaMask, register, switchRole, logout,
      getUsersByRole: (role: UserRole) => allUsers.filter(u => u.role === role),
      allUsers,
      storageInfo,
      refreshUsers,
      linkWallet,
      unlinkWallet,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}