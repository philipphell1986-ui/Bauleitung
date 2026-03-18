<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const localError = ref('');

async function handleSignup() {
  localError.value = '';

  if (password.value !== confirmPassword.value) {
    localError.value = 'Passwörter stimmen nicht überein';
    return;
  }

  const success = await auth.signup(email.value, username.value, password.value);
  if (success) {
    router.push('/dashboard');
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1>Registrieren</h1>
      <form @submit.prevent="handleSignup">
        <div class="form-group">
          <label for="email">E-Mail</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="name@beispiel.de"
            required
            autocomplete="email"
          />
        </div>
        <div class="form-group">
          <label for="username">Benutzername</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Benutzername"
            required
            autocomplete="username"
          />
        </div>
        <div class="form-group">
          <label for="password">Passwort</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Mind. 6 Zeichen"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </div>
        <div class="form-group">
          <label for="confirmPassword">Passwort bestätigen</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Passwort wiederholen"
            required
            autocomplete="new-password"
          />
        </div>
        <p v-if="localError || auth.error" class="error">
          {{ localError || auth.error }}
        </p>
        <button type="submit" :disabled="auth.loading">
          {{ auth.loading ? 'Wird registriert...' : 'Registrieren' }}
        </button>
      </form>
      <p class="switch-link">
        Bereits ein Konto? <router-link to="/login">Anmelden</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}

.auth-card {
  background: #fff;
  border-radius: 12px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
}

.auth-card h1 {
  margin: 0 0 1.5rem;
  font-size: 1.5rem;
  color: #1a1a2e;
  text-align: center;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #4a4a68;
}

.form-group input {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #4361ee;
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.15);
}

.error {
  color: #e63946;
  font-size: 0.85rem;
  margin: 0.5rem 0;
}

button {
  width: 100%;
  padding: 0.7rem;
  background: #4361ee;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 0.5rem;
}

button:hover:not(:disabled) {
  background: #3a56d4;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-link {
  text-align: center;
  margin-top: 1.25rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.switch-link a {
  color: #4361ee;
  text-decoration: none;
  font-weight: 500;
}

.switch-link a:hover {
  text-decoration: underline;
}
</style>
