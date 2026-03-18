<script setup>
import { ref, onMounted, computed } from 'vue';
import { useProjectsStore } from '../stores/projects.js';
import api from '../api/index.js';

const projectsStore = useProjectsStore();
const groups = ref([]);
const loading = ref(false);
const error = ref(null);
const showForm = ref(false);
const editingId = ref(null);
const formName = ref('');
const formDesc = ref('');
const expandedId = ref(null);
const projectUsers = ref([]);
const addUserGroupId = ref(null);

const projectId = computed(() => projectsStore.currentProject?.id);
const isAdmin = computed(() => projectsStore.currentProject?.role === 'admin');

async function fetchGroups() {
  if (!projectId.value) return;
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get(`/groups/project/${projectId.value}`);
    groups.value = data.groups;
  } catch (err) {
    error.value = err.response?.data?.error || 'Gruppen konnten nicht geladen werden';
  } finally {
    loading.value = false;
  }
}

async function fetchProjectUsers() {
  if (!projectId.value) return;
  try {
    const { data } = await api.get(`/projects/${projectId.value}/users`);
    projectUsers.value = data.users;
  } catch {
    projectUsers.value = [];
  }
}

function openCreate() {
  editingId.value = null;
  formName.value = '';
  formDesc.value = '';
  showForm.value = true;
}

function openEdit(g) {
  editingId.value = g.id;
  formName.value = g.name;
  formDesc.value = g.description || '';
  showForm.value = true;
}

async function save() {
  if (!isAdmin.value) return;
  try {
    if (editingId.value) {
      await api.patch(`/groups/${editingId.value}`, { name: formName.value, description: formDesc.value });
    } else {
      await api.post('/groups', { project_id: projectId.value, name: formName.value, description: formDesc.value });
    }
    showForm.value = false;
    await fetchGroups();
  } catch (err) {
    error.value = err.response?.data?.error || 'Speichern fehlgeschlagen';
  }
}

async function remove(g) {
  if (!isAdmin.value || !confirm(`Gruppe "${g.name}" wirklich löschen?`)) return;
  try {
    await api.delete(`/groups/${g.id}`);
    await fetchGroups();
  } catch (err) {
    error.value = err.response?.data?.error || 'Löschen fehlgeschlagen';
  }
}

async function toggleExpand(g) {
  if (expandedId.value === g.id) {
    expandedId.value = null;
    addUserGroupId.value = null;
    return;
  }
  expandedId.value = g.id;
  addUserGroupId.value = null;
  await fetchProjectUsers();
  try {
    const { data } = await api.get(`/groups/${g.id}`);
    const idx = groups.value.findIndex(gr => gr.id === g.id);
    if (idx >= 0) groups.value[idx] = { ...groups.value[idx], ...data.group };
  } catch {
    // ignore
  }
}

async function addMember(groupId, userId) {
  const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  if (isNaN(uid)) {
    error.value = 'Ungültige Benutzerauswahl';
    return;
  }
  try {
    await api.post(`/groups/${groupId}/members`, { user_id: uid });
    addUserGroupId.value = null;
    await fetchGroups();
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Hinzufügen fehlgeschlagen';
    error.value = msg;
  }
}

function onAddMemberSelect(groupId, event) {
  const userId = event.target.value;
  if (userId) {
    addMember(groupId, userId);
  }
  addUserGroupId.value = null;
  event.target.value = '';
}

async function removeMember(groupId, userId) {
  try {
    await api.delete(`/groups/${groupId}/members/${userId}`);
    await fetchGroups();
  } catch (err) {
    error.value = err.response?.data?.error || 'Entfernen fehlgeschlagen';
  }
}

onMounted(() => {
  fetchGroups();
});
</script>

<template>
  <div class="groups-view">
    <header class="header">
      <div class="header-left">
        <router-link to="/dashboard" class="back">← Dashboard</router-link>
        <h1>Benutzergruppen – {{ projectsStore.currentProject?.name }}</h1>
      </div>
      <button v-if="isAdmin" class="btn-primary" @click="openCreate">+ Neue Gruppe</button>
    </header>

    <main class="main">
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="!isAdmin" class="info">Nur Projekt-Admins können Gruppen verwalten.</p>

      <div v-if="loading" class="loading">Laden...</div>
      <div v-else-if="!groups.length" class="empty">Keine Gruppen vorhanden.</div>
      <div v-else class="group-list">
        <div v-for="g in groups" :key="g.id" class="group-card">
          <div class="group-header" @click="toggleExpand(g)">
            <div class="group-info">
              <span class="group-name">{{ g.name }}</span>
              <span v-if="g.description" class="group-desc">{{ g.description }}</span>
              <span class="member-count">{{ g.member_count || 0 }} Mitglieder</span>
            </div>
            <span class="expand">{{ expandedId === g.id ? '▼' : '▶' }}</span>
          </div>
          <div v-if="expandedId === g.id" class="group-detail">
            <div v-if="isAdmin" class="detail-actions">
              <button class="btn-sm" @click="openEdit(g)">Bearbeiten</button>
              <button class="btn-sm danger" @click="remove(g)">Löschen</button>
            </div>
            <div class="members-section">
              <h4>Mitglieder</h4>
              <div v-if="addUserGroupId === g.id" class="add-member">
                <select @change="onAddMemberSelect(g.id, $event)">
                  <option value="">Benutzer wählen...</option>
                  <option
                    v-for="u in projectUsers.filter(u => !g.members?.some(m => m.id === u.id))"
                    :key="u.id"
                    :value="u.id"
                  >
                    {{ u.username }} ({{ u.email }})
                  </option>
                </select>
              </div>
              <button v-else-if="isAdmin" class="btn-sm" @click="addUserGroupId = g.id">+ Mitglied hinzufügen</button>
              <ul v-if="g.members?.length" class="member-list">
                <li v-for="m in g.members" :key="m.id">
                  {{ m.username }} ({{ m.email }})
                  <button v-if="isAdmin" class="btn-sm danger" @click="removeMember(g.id, m.id)">Entfernen</button>
                </li>
              </ul>
              <p v-else class="no-members">Keine Mitglieder.</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showForm" class="modal" @click.self="showForm = false">
      <div class="modal-content">
        <h3>{{ editingId ? 'Gruppe bearbeiten' : 'Neue Gruppe' }}</h3>
        <form @submit.prevent="save">
          <div class="form-group">
            <label>Name *</label>
            <input v-model="formName" type="text" required placeholder="Gruppenname" />
          </div>
          <div class="form-group">
            <label>Beschreibung</label>
            <input v-model="formDesc" type="text" placeholder="Optionale Beschreibung" />
          </div>
          <div class="form-actions">
            <button type="button" @click="showForm = false">Abbrechen</button>
            <button type="submit">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.groups-view {
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

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back {
  color: #4361ee;
  text-decoration: none;
  font-size: 0.9rem;
}

.header h1 {
  margin: 0;
  font-size: 1.25rem;
  color: #1a1a2e;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: #4361ee;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.main {
  padding: 1.5rem 2rem;
}

.error {
  color: #e63946;
  margin-bottom: 1rem;
}

.info {
  color: #6b7280;
  margin-bottom: 1rem;
}

.loading, .empty {
  color: #6b7280;
  padding: 2rem;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.group-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  cursor: pointer;
}

.group-header:hover {
  background: #f8f9fa;
}

.group-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.group-name {
  font-weight: 600;
  color: #1a1a2e;
}

.group-desc {
  font-size: 0.875rem;
  color: #6b7280;
}

.member-count {
  font-size: 0.8rem;
  color: #4361ee;
}

.expand {
  font-size: 0.8rem;
  color: #6b7280;
}

.group-detail {
  padding: 0 1.25rem 1rem;
  border-top: 1px solid #f0f0f0;
}

.detail-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  border-radius: 6px;
  border: 1px solid #d0d5dd;
  background: #fff;
  cursor: pointer;
}

.btn-sm.danger {
  border-color: #e63946;
  color: #e63946;
}

.members-section {
  margin-top: 1rem;
}

.members-section h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}

.add-member select {
  padding: 0.4rem 0.6rem;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.member-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
}

.member-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.no-members {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0.5rem 0 0;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: #fff;
  padding: 1.5rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
}

.modal-content h3 {
  margin: 0 0 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
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
  background: #4361ee;
  color: #fff;
  border: none;
}
</style>
