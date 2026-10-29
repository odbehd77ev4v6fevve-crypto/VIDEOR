import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { api, getStoredToken, setStoredToken } from '../lib/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (email: string, password: string, displayName: string) => Promise<UserProfile>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get<{ success: boolean; user: UserProfile }>('/api/auth/me');
      if (res?.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
        setStoredToken(null);
        setToken(null);
      }
    } catch (err) {
      if (err instanceof Error && 'status' in err && (err as { status: number }).status === 401) {
        setUser(null);
        setStoredToken(null);
        setToken(null);
      } else {
        console.warn('[AuthContext] Unable to restore session:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const res = await api.post<{ success: boolean; token: string; user: UserProfile }>('/api/auth/login', {
      email,
      password,
    });

    if (res?.success && res.token) {
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error('Login failed: invalid response.');
  };

  const register = async (email: string, password: string, displayName: string): Promise<UserProfile> => {
    const res = await api.post<{ success: boolean; token: string; user: UserProfile }>('/api/auth/register', {
      email,
      password,
      displayName,
    });

    if (res?.success && res.token) {
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error('Registration failed: invalid response.');
  };

  const logout = () => {
    try {
      api.post('/api/auth/logout').catch(() => {});
    } catch (e) {}
    setStoredToken(null);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    const res = await api.put<{ success: boolean; user: UserProfile }>('/api/auth/profile', data);
    if (res.success && res.user) {
      setUser((prev) => (prev ? { ...prev, ...res.user } : res.user));
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
