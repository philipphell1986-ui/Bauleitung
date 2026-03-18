import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api/index.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const token = ref(localStorage.getItem('token'));
  const loading = ref(false);
  const error = ref(null);

  const isAuthenticated = computed(() => !!token.value);

  async function signup(email, username, password) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post('/auth/signup', { email, username, password });
      token.value = data.token;
      user.value = data.user;
      localStorage.setItem('token', data.token);
      return true;
    } catch (err) {
      error.value = err.response?.data?.error || 'Registrierung fehlgeschlagen';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function login(email, password) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post('/auth/login', { email, password });
      token.value = data.token;
      user.value = data.user;
      localStorage.setItem('token', data.token);
      return true;
    } catch (err) {
      error.value = err.response?.data?.error || 'Anmeldung fehlgeschlagen';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUser() {
    if (!token.value) return;
    loading.value = true;
    try {
      const { data } = await api.get('/auth/me');
      user.value = data.user;
    } catch {
      token.value = null;
      user.value = null;
      localStorage.removeItem('token');
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
  }

  return { user, token, loading, error, isAuthenticated, signup, login, logout, fetchUser };
});
