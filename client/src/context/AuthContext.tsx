import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Profile } from '../types.ts';
import { api, getAuthToken, setAuthToken } from '../utils/api.ts';

interface AuthContextType {
  user: Profile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: { email: string; password: string; display_name: string; username: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isCreditModalOpen: boolean;
  setIsCreditModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState<boolean>(false);

  const refreshUser = async () => {
    try {
      const activeToken = getAuthToken();
      if (!activeToken) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await api.getMe();
      setUser(data.user);
    } catch (err) {
      console.warn('Failed to refresh user:', err);
      setAuthToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const data = await api.login(email, pass);
    setUser(data.user);
    setToken(data.token);
  };

  const register = async (payload: { email: string; password: string; display_name: string; username: string }) => {
    const data = await api.register(payload);
    setUser(data.user);
    setToken(data.token);
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        isCreditModalOpen,
        setIsCreditModalOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
