import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      clear: () => set({ user: null, token: null }),
    }),
    {
      name: 'examkaro-auth',
      storage: createJSONStorage(() => localStorage),
      // Don't persist token in localStorage for security — it's in httpOnly cookie
      partialize: (state) => ({ user: state.user }),
    }
  )
);
