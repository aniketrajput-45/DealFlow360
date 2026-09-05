import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  demoAccounts: { id: string; name: string; email: string; role: string; companyName: string | null }[];
  switchUser: (email: string) => Promise<void>;
  logout: () => void;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState<{ id: string; name: string; email: string; role: string; companyName: string | null }[]>([]);

  const fetchCurrentUser = async () => {
    try {
      const data = await api.auth.getMe();
      setUser(data.user);
    } catch {
      // If no valid token, auto-login as Sales Rep for instant demo readiness
      try {
        const loginData = await api.auth.login('rep@dealflow360.com', 'password123');
        localStorage.setItem('df360_token', loginData.token);
        setUser(loginData.user);
      } catch (err) {
        console.error('Failed auto-login:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.auth.getDemoAccounts()
      .then(setDemoAccounts)
      .catch((err) => console.error('Failed to load demo accounts', err));

    fetchCurrentUser();
  }, []);

  const switchUser = async (email: string) => {
    setLoading(true);
    try {
      const loginData = await api.auth.login(email, 'password123');
      localStorage.setItem('df360_token', loginData.token);
      setUser(loginData.user);
    } catch (err) {
      console.error('Switch user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('df360_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        demoAccounts,
        switchUser,
        logout,
        isCustomer: user?.role === 'CUSTOMER',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
