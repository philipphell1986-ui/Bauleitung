<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { useProjectsStore } from '../stores/projects.js';

const router = useRouter();
const auth = useAuthStore();
const projectsStore = useProjectsStore();

onMounted(() => {
  auth.fetchUser();
});

function handleLogout() {
  auth.logout();
  projectsStore.clearProject();
  router.push('/login');
}

function switchProject() {
  router.push('/projects');
}
</script>

<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <h1>Anschluss-Projekte</h1>
      <div class="header-actions">
        <span class="project-badge">{{ projectsStore.currentProject?.name }}</span>
        <button class="switch-btn" @click="switchProject">Projekt wechseln</button>
        <button class="logout-btn" @click="handleLogout">Abmelden</button>
      </div>
    </header>
    <main class="dashboard-main">
      <div v-if="auth.loading" class="loading">Laden...</div>
      <div v-else-if="auth.user" class="dashboard-content">
        <div class="user-card">
          <div class="avatar">{{ auth.user.username?.charAt(0).toUpperCase() }}</div>
          <h2>Willkommen, {{ auth.user.username }}!</h2>
          <p class="project-info">Projekt: {{ projectsStore.currentProject?.name }}</p>
          <div class="user-details">
            <div class="detail-row">
              <span class="label">E-Mail</span>
              <span class="value">{{ auth.user.email }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Benutzername</span>
              <span class="value">{{ auth.user.username }}</span>
            </div>
          </div>
        </div>
        <div class="nav-cards">
          <router-link to="/connections" class="nav-card">
            <span class="nav-icon">📋</span>
            <h3>Hausanschlüsse</h3>
            <p>Glasfaser & Strom – Daten verwalten, Excel importieren, CSV exportieren</p>
          </router-link>
          <router-link to="/groups" class="nav-card">
            <span class="nav-icon">👥</span>
            <h3>Benutzergruppen</h3>
            <p>Gruppen verwalten und Mitglieder zuweisen</p>
          </router-link>
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.project-badge {
  font-size: 0.9rem;
  color: #16a34a;
  font-weight: 500;
}

.switch-btn {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
}

.switch-btn:hover {
  background: #e5e7eb;
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
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.project-info {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0.5rem 0 1rem;
}

.nav-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.nav-card {
  display: block;
  padding: 1.5rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
}

.nav-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.nav-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.75rem;
}

.nav-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: #1a1a2e;
}

.nav-card p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
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
  background: #16a34a;
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
