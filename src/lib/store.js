import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: true,
  unreadNotificationsCount: 0,

  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
        document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax`;
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    }
    set({ user, token, isLoading: false });
  },

  setUser: (user) => {
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user });
  },

  setUnreadCount: (count) => set({ unreadNotificationsCount: count }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      document.cookie = 'token=; path=/; max-age=0';
    }
    set({ user: null, token: null, isLoading: false, unreadNotificationsCount: 0 });
  },

  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ user, token, isLoading: false });
          return;
        } catch (e) {
          // ignore
        }
      }
    }
    set({ isLoading: false });
  },
}));
