<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

onMounted(() => {
  auth.fetchUser();
});

function handleLogout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <h1>Bauleitung</h1>
      <button class="logout-btn" @click="handleLogout">Abmelden</button>
    </header>
    <main class="dashboard-main">
      <div v-if="auth.loading" class="loading">Laden...</div>
      <div v-else-if="auth.user" class="user-card">
        <div class="avatar">{{ auth.user.username?.charAt(0).toUpperCase() }}</div>
        <h2>Willkommen, {{ auth.user.username }}!</h2>
        <div class="user-details">
          <div class="detail-row">
            <span class="label">E-Mail</span>
            <span class="value">{{ auth.user.email }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Benutzername</span>
            <span class="value">{{ auth.user.username }}</span>
          </div>
          <div v-if="auth.user.created_at" class="detail-row">
            <span class="label">Registriert am</span>
            <span class="value">{{ new Date(auth.user.created_at).toLocaleDateString('de-DE') }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #f0f2f5;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.dashboard-header h1 {
  margin: 0;
  font-size: 1.25rem;
  color: #1a1a2e;
}

.logout-btn {
  padding: 0.5rem 1.25rem;
  background: transparent;
  color: #e63946;
  border: 1px solid #e63946;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #e63946;
  color: #fff;
}

.dashboard-main {
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}

.loading {
  color: #6b7280;
  font-size: 1rem;
}

.user-card {
  background: #fff;
  border-radius: 12px;
  padding: 2.5rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #4361ee;
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.user-card h2 {
  margin: 0 0 1.5rem;
  font-size: 1.25rem;
  color: #1a1a2e;
}

.user-details {
  text-align: left;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.value {
  font-size: 0.875rem;
  color: #1a1a2e;
}
</style>
