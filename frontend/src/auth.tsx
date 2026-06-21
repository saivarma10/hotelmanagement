import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, clearToken, getToken, setToken, setStoredOutletId, getStoredOutletId } from './api';
import type { User, Outlet } from './types';
import type { Permission } from './permissions';

interface AuthState {
  user: User | null;
  outlet: Outlet | null;
  outlets: Outlet[];
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    organizationName: string;
    outletName: string;
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  setOutlet: (outlet: Outlet) => void;
  refreshProfile: () => Promise<void>;
  pinSwitch: (pin: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function pickOutlet(outlets: Outlet[]): Outlet | null {
  const storedId = getStoredOutletId();
  return outlets.find((o) => o.id === storedId) ?? outlets[0] ?? null;
}

function toUser(profile: Awaited<ReturnType<typeof api.me>>): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    organizationId: '',
    permissions: profile.permissions as Permission[],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [outlet, setOutletState] = useState<Outlet | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  const applyProfile = useCallback((profile: Awaited<ReturnType<typeof api.me>>) => {
    setUser(toUser(profile));
    const list = profile.organization.outlets;
    setOutlets(list);
    const selected = pickOutlet(list);
    if (selected) {
      setOutletState(selected);
      setStoredOutletId(selected.id);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await api.me();
    applyProfile(profile);
  }, [applyProfile]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then(applyProfile)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, [applyProfile]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setToken(res.accessToken);
    setUser(res.user);
    await refreshProfile();
    return res.user;
  };

  const register = async (data: {
    organizationName: string;
    outletName: string;
    name: string;
    email: string;
    password: string;
  }) => {
    const res = await api.register(data);
    setToken(res.accessToken);
    setUser(res.user);
    await refreshProfile();
  };

  const pinSwitch = async (pin: string) => {
    const res = await api.pinSwitch(pin);
    setToken(res.accessToken);
    setUser(res.user);
    await refreshProfile();
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setOutletState(null);
    setOutlets([]);
  };

  const setOutlet = (o: Outlet) => {
    setOutletState(o);
    setStoredOutletId(o.id);
  };

  return (
    <AuthContext.Provider
      value={{ user, outlet, outlets, loading, login, register, logout, setOutlet, refreshProfile, pinSwitch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
