<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { useProjectsStore } from '../stores/projects.js';

const router = useRouter();
const auth = useAuthStore();
const projectsStore = useProjectsStore();

const showCreate = ref(false);
const newName = ref('');
const newDesc = ref('');

onMounted(async () => {
  await projectsStore.fetchProjects();
});

async function selectProject(project) {
  projectsStore.setCurrentProject(project);
  router.push('/dashboard');
}

async function handleCreate() {
  if (!newName.value.trim()) return;
  const project = await projectsStore.createProject(newName.value.trim(), newDesc.value.trim());
  if (project) {
    showCreate.value = false;
    newName.value = '';
    newDesc.value = '';
    router.push('/dashboard');
  }
}

function handleLogout() {
  auth.logout();
  projectsStore.clearProject();
  router.push('/login');
}
</script>

<template>
  <div class="project-select-container">
    <header class="header">
      <h1>Anschluss-Projekte</h1>
      <button class="logout-btn" @click="handleLogout">Abmelden</button>
    </header>
    <main class="main">
      <p class="welcome">Willkommen, {{ auth.user?.username }}! Wähle ein Projekt oder erstelle ein neues.</p>

      <div v-if="projectsStore.loading" class="loading">Laden...</div>

      <div v-else>
        <div v-if="!showCreate" class="actions">
          <button class="btn-primary" @click="showCreate = true">+ Neues Projekt erstellen</button>
        </div>

        <form v-if="showCreate" class="create-form" @submit.prevent="handleCreate">
          <h3>Neues Projekt</h3>
          <div class="form-group">
            <label>Projektname *</label>
            <input v-model="newName" type="text" required placeholder="z.B. Wohngebiet Nord" />
          </div>
          <div class="form-group">
            <label>Beschreibung</label>
            <textarea v-model="newDesc" rows="2" placeholder="Optionale Beschreibung"></textarea>
          </div>
          <p v-if="projectsStore.error" class="error">{{ projectsStore.error }}</p>
          <div class="form-actions">
            <button type="button" @click="showCreate = false">Abbrechen</button>
            <button type="submit" :disabled="!newName.trim() || projectsStore.loading">Erstellen</button>
          </div>
        </form>

        <div v-if="projectsStore.projects.length" class="project-list">
          <h3>Meine Projekte</h3>
          <div class="project-cards">
            <button
              v-for="p in projectsStore.projects"
              :key="p.id"
              class="project-card"
              @click="selectProject(p)"
            >
              <span class="card-name">{{ p.name }}</span>
              <span v-if="p.description" class="card-desc">{{ p.description }}</span>
              <span class="card-role">{{ p.role }}</span>
            </button>
          </div>
        </div>

        <p v-else-if="!showCreate" class="empty">Noch keine Projekte. Erstelle dein erstes Projekt.</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.project-select-container {
  min-height: 100vh;
  background: #f0f2f5;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.header h1 {
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
  cursor: pointer;
}

.logout-btn:hover {
  background: #e63946;
  color: #fff;
}

.main {
  padding: 2rem;
  max-width: 640px;
  margin: 0 auto;
}

.welcome {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.loading {
  color: #6b7280;
}

.actions {
  margin-bottom: 1.5rem;
}

.btn-primary {
  padding: 0.65rem 1.25rem;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:hover {
  background: #15803d;
}

.create-form {
  background: #fff;
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.create-form h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
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

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.form-actions button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.form-actions button[type="button"] {
  background: #f0f0f0;
  border: none;
}

.form-actions button[type="submit"] {
  background: #16a34a;
  color: #fff;
  border: none;
}

.form-actions button[type="submit"]:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #e63946;
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

.project-list h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
  color: #1a1a2e;
}

.project-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.project-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.project-card:hover {
  border-color: #16a34a;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.15);
}

.card-name {
  font-weight: 600;
  color: #1a1a2e;
}

.card-desc {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.card-role {
  font-size: 0.75rem;
  color: #16a34a;
  margin-top: 0.5rem;
}

.empty {
  color: #6b7280;
  font-size: 0.95rem;
}
</style>
