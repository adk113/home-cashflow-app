import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/transaction';

const USERS_STORAGE_KEY = '@cashflow_users_v2';
const ACTIVE_USER_ID_KEY = '@cashflow_active_user_id_v2';

export const DEFAULT_USERS: User[] = [];

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  loginWithPin: (userId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (name: string, email?: string, pin?: string, avatar?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Clean up legacy v1 keys if present
        try {
          await AsyncStorage.multiRemove(['@cashflow_users_v1', '@cashflow_active_user_id', '@cashflow_transactions_v1']);
        } catch {
          // ignore
        }

        const storedUsersRaw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
        let loadedUsers: User[] = [];
        if (storedUsersRaw) {
          loadedUsers = JSON.parse(storedUsersRaw);
        } else {
          await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([]));
        }
        setUsers(loadedUsers);

        // Check active session
        const activeUserId = await AsyncStorage.getItem(ACTIVE_USER_ID_KEY);
        if (activeUserId) {
          const found = loadedUsers.find((u) => u.id === activeUserId);
          if (found) {
            setCurrentUser(found);
          }
        }
      } catch (err) {
        console.warn('Error loading auth data:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    initAuth();
  }, []);

  const loginWithPin = async (userId: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'User profile not found.' };
    }
    if (user.pin && user.pin !== pin) {
      return { success: false, error: 'Incorrect 4-digit PIN.' };
    }

    setCurrentUser(user);
    await AsyncStorage.setItem(ACTIVE_USER_ID_KEY, user.id);
    return { success: true };
  };

  const loginWithEmail = async (email: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return { success: false, error: 'No account registered with this email.' };
    }
    if (user.pin && user.pin !== pin) {
      return { success: false, error: 'Incorrect PIN for this account.' };
    }

    setCurrentUser(user);
    await AsyncStorage.setItem(ACTIVE_USER_ID_KEY, user.id);
    return { success: true };
  };

  const registerUser = async (
    name: string,
    email?: string,
    pin?: string,
    avatar?: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (!name.trim()) return { success: false, error: 'Please enter your name.' };
    
    const cleanPin = (pin || '').trim();
    if (cleanPin && cleanPin.length < 4) {
      return { success: false, error: 'PIN must be at least 4 digits.' };
    }

    const cleanEmail = (email || '').trim();
    if (cleanEmail) {
      const emailExists = users.some((u) => u.email.toLowerCase() === cleanEmail.toLowerCase());
      if (emailExists) {
        return { success: false, error: 'An account with this email already exists.' };
      }
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail || `${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@home.local`,
      pin: cleanPin || '1234',
      avatar: avatar || '👤',
      role: users.length === 0 ? 'primary' : 'member',
    };

    const updated = [...users, newUser];
    setUsers(updated);
    setCurrentUser(newUser);
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    await AsyncStorage.setItem(ACTIVE_USER_ID_KEY, newUser.id);
    return { success: true, user: newUser };
  };

  const logout = async () => {
    setCurrentUser(null);
    await AsyncStorage.removeItem(ACTIVE_USER_ID_KEY);
  };

  const deleteUser = async (userId: string) => {
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    if (currentUser?.id === userId) {
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAuthenticated: !!currentUser,
        isLoadingAuth,
        loginWithPin,
        loginWithEmail,
        registerUser,
        logout,
        deleteUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
