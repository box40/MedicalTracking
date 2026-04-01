import { UserData } from '../types';
import { getToken, apiSaveData } from './api';

const STORAGE_KEY_PREFIX = 'medtrack_user_';
const SESSION_KEY = 'medtrack_last_session_email';

export const loadUserData = (email: string): UserData => {
  const normalizedEmail = email.toLowerCase().trim();
  const key = `${STORAGE_KEY_PREFIX}${normalizedEmail}`;
  const stored = localStorage.getItem(key);
  
  // Save this email as the active session
  localStorage.setItem(SESSION_KEY, normalizedEmail);

  if (stored) {
    const data = JSON.parse(stored);
    
    // Data Migration: Convert legacy pillIds to pillsTaken
    if (data.logs) {
      data.logs = data.logs.map((log: any) => {
        if (!log.pillsTaken && log.pillIds) {
          return {
            ...log,
            pillsTaken: log.pillIds.map((id: string) => ({ pillId: id, quantity: 1 })),
          };
        }
        return log;
      });
    }

    // Settings Migration: Ensure fontSize exists and convert legacy classes to rem
    if (!data.settings) {
      data.settings = { fontSize: '1.25rem' };
    } else {
        // Migration for legacy class names if present
        const legacyMap: Record<string, string> = {
            'text-base': '1rem',
            'text-xl': '1.25rem',
            'text-2xl': '1.5rem'
        };
        if (legacyMap[data.settings.fontSize]) {
            data.settings.fontSize = legacyMap[data.settings.fontSize];
        }
    }

    return data;
  }
  return {
    email: normalizedEmail,
    pills: [],
    logs: [],
    settings: { fontSize: '1.25rem' }, 
  };
};

export const saveUserData = (data: UserData) => {
  const key = `${STORAGE_KEY_PREFIX}${data.email.toLowerCase().trim()}`;
  localStorage.setItem(key, JSON.stringify(data));
  // Ensure session is kept in sync if we save
  localStorage.setItem(SESSION_KEY, data.email.toLowerCase().trim());
  // Sync to backend when authenticated
  if (getToken()) {
    apiSaveData(data).catch(() => { /* best-effort */ });
  }
};

export const deleteUserData = (email: string) => {
  const key = `${STORAGE_KEY_PREFIX}${email.toLowerCase().trim()}`;
  localStorage.removeItem(key);
};

export const getLastSessionEmail = (): string | null => {
  return localStorage.getItem(SESSION_KEY);
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const generateId = () => Math.random().toString(36).substring(2, 9);
