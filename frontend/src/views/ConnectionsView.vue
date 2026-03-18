<script setup>
import { ref, onMounted, computed } from 'vue';
import { useProjectsStore } from '../stores/projects.js';
import api from '../api/index.js';
import MapPicker from '../components/MapPicker.vue';

const projectsStore = useProjectsStore();
const connections = ref([]);
const loading = ref(false);
const error = ref(null);
const filterType = ref('');
const filterStage = ref('');
const showForm = ref(false);
const editingId = ref(null);
const importFile = ref(null);
const importType = ref('glasfaser');
const importLoading = ref(false);

const STAGES = [
  { value: 'hausbegehung', label: 'Hausbegehung' },
  { value: 'tiefbau', label: 'Hausanschluss (Tiefbau)' },
  { value: 'aktivierung', label: 'Aktivierung des Kunden' },
];

const form = ref({
  connection_type: 'glasfaser',
  name: '',
  address: '',
  street: '',
  postal_code: '',
  city: '',
  tel: '',
  email: '',
  notes: '',
  latitude: null,
  longitude: null,
  stage: 'hausbegehung',
});

const filteredConnections = computed(() => {
  let list = connections.value;
  if (filterType.value) list = list.filter(c => c.connection_type === filterType.value);
  if (filterStage.value) list = list.filter(c => (c.stage || 'hausbegehung') === filterStage.value);
  return list;
});

const projectId = computed(() => projectsStore.currentProject?.id);
const canEdit = computed(() => ['admin', 'member'].includes(projectsStore.currentProject?.role));

async function fetchConnections() {
  if (!projectId.value) return;
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get(`/connections/project/${projectId.value}`);
    connections.value = data.connections;
  } catch (err) {
    error.value = err.response?.data?.error || 'Anschlüsse konnten nicht geladen werden';
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  form.value = {
    connection_type: 'glasfaser',
    name: '', address: '', street: '', postal_code: '', city: '', tel: '', email: '', notes: '',
    latitude: null, longitude: null, stage: 'hausbegehung',
  };
  showForm.value = true;
}

function openEdit(c) {
  editingId.value = c.id;
  form.value = {
    connection_type: c.connection_type,
    name: c.name || '',
    address: c.address || '',
    street: c.street || '',
    postal_code: c.postal_code || '',
    city: c.city || '',
    tel: c.tel || '',
    email: c.email || '',
    notes: c.notes || '',
    latitude: c.latitude != null ? c.latitude : null,
    longitude: c.longitude != null ? c.longitude : null,
    stage: c.stage || 'hausbegehung',
  };
  showForm.value = true;
}

function clearLocation() {
  form.value.latitude = null;
  form.value.longitude = null;
}

const mapPickerValue = computed({
  get: () =>
    form.value.latitude != null && form.value.longitude != null
      ? { lat: form.value.latitude, lng: form.value.longitude }
      : null,
  set: (v) => {
    if (v) {
      form.value.latitude = v.lat;
      form.value.longitude = v.lng;
    } else {
      form.value.latitude = null;
      form.value.longitude = null;
    }
  },
});

async function save() {
  if (!canEdit.value) return;
  try {
    if (editingId.value) {
      await api.patch(`/connections/${editingId.value}`, form.value);
    } else {
      await api.post('/connections', { project_id: projectId.value, ...form.value });
    }
    showForm.value = false;
    await fetchConnections();
  } catch (err) {
    error.value = err.response?.data?.error || 'Speichern fehlgeschlagen';
  }
}

async function remove(c) {
  if (!canEdit.value || !confirm('Anschluss wirklich löschen?')) return;
  try {
    await api.delete(`/connections/${c.id}`);
    await fetchConnections();
  } catch (err) {
    error.value = err.response?.data?.error || 'Löschen fehlgeschlagen';
  }
}

async function doImport() {
  if (!importFile.value?.[0] || !canEdit.value) return;
  importLoading.value = true;
  error.value = null;
  try {
    const fd = new FormData();
    fd.append('file', importFile.value[0]);
    fd.append('connection_type', importType.value);
    const { data } = await api.post(`/connections/import/${projectId.value}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    importFile.value = null;
    alert(`${data.imported} von ${data.total} Zeilen importiert.`);
    await fetchConnections();
  } catch (err) {
    error.value = err.response?.data?.error || 'Import fehlgeschlagen';
  } finally {
    importLoading.value = false;
  }
}

async function exportCsv() {
  const token = localStorage.getItem('token');
  const base = import.meta.env.VITE_API_URL || '';
  const url = `${base}/api/connections/export/csv/${projectId.value}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    error.value = 'Export fehlgeschlagen';
    return;
  }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `anschluesse_${projectId.value}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

onMounted(() => {
  fetchConnections();
});
</script>

<template>
  <div class="connections-view">
    <header class="header">
      <div class="header-left">
        <router-link to="/dashboard" class="back">← Dashboard</router-link>
        <h1>Hausanschlüsse – {{ projectsStore.currentProject?.name }}</h1>
      </div>
      <div class="header-actions">
        <button v-if="canEdit" class="btn-secondary" @click="exportCsv">CSV exportieren</button>
        <button v-if="canEdit" class="btn-primary" @click="openCreate">+ Anschluss</button>
      </div>
    </header>

    <main class="main">
      <div v-if="canEdit" class="import-section">
        <h3>Excel/CSV Import</h3>
        <div class="import-row">
          <div class="import-select-wrap">
            <select v-model="importType" class="import-select">
              <option value="glasfaser">Glasfaser</option>
              <option value="strom">Strom</option>
            </select>
          </div>
          <div class="file-input-wrap">
            <input
              id="import-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              class="file-input-native"
              @change="e => importFile = e.target.files"
            />
            <label for="import-file" class="file-input-label">
              {{ importFile?.[0]?.name || 'Datei auswählen' }}
            </label>
          </div>
          <button
            type="button"
            class="btn-import"
            :disabled="!importFile?.length || importLoading"
            @click="doImport"
          >
            {{ importLoading ? 'Importiere...' : 'Importieren' }}
          </button>
        </div>
      </div>

      <div class="toolbar">
        <select v-model="filterType" class="filter">
          <option value="">Alle Typen</option>
          <option value="glasfaser">Glasfaser</option>
          <option value="strom">Strom</option>
        </select>
        <select v-model="filterStage" class="filter">
          <option value="">Alle Stufen</option>
          <option v-for="s in STAGES" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="loading" class="loading">Laden...</div>
      <div v-else-if="!filteredConnections.length" class="empty">Keine Anschlüsse vorhanden.</div>
      <div v-else class="table-wrap">
        <table class="connections-table">
          <thead>
            <tr>
              <th>Typ</th>
              <th>Stufe</th>
              <th>Name</th>
              <th>Adresse</th>
              <th>Telefon</th>
              <th>E-Mail</th>
              <th v-if="canEdit">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filteredConnections" :key="c.id">
              <td><span :class="['badge', c.connection_type]">{{ c.connection_type }}</span></td>
              <td><span :class="['badge', 'stage', c.stage || 'hausbegehung']">{{ STAGES.find(s => s.value === (c.stage || 'hausbegehung'))?.label || 'Hausbegehung' }}</span></td>
              <td>{{ c.name || '–' }}</td>
              <td>{{ c.address || [c.street, c.postal_code, c.city].filter(Boolean).join(' ') || '–' }}</td>
              <td>{{ c.tel || '–' }}</td>
              <td>{{ c.email || '–' }}</td>
              <td v-if="canEdit">
                <button class="btn-sm" @click="openEdit(c)">Bearbeiten</button>
                <button class="btn-sm danger" @click="remove(c)">Löschen</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <div v-if="showForm" class="modal" @click.self="showForm = false">
      <div class="modal-content">
        <h3>{{ editingId ? 'Anschluss bearbeiten' : 'Neuer Anschluss' }}</h3>
        <form @submit.prevent="save">
          <div class="form-row">
            <div class="form-group">
              <label>Typ</label>
              <select v-model="form.connection_type">
                <option value="glasfaser">Glasfaser</option>
                <option value="strom">Strom</option>
              </select>
            </div>
            <div class="form-group">
              <label>Bearbeitungsstufe</label>
              <select v-model="form.stage">
                <option v-for="s in STAGES" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Name</label>
            <input v-model="form.name" type="text" placeholder="Name" />
          </div>
          <div class="form-group">
            <label>Adresse (oder Straße + PLZ + Ort)</label>
            <input v-model="form.address" type="text" placeholder="Vollständige Adresse" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Straße</label>
              <input v-model="form.street" type="text" placeholder="Straße Hausnr" />
            </div>
            <div class="form-group">
              <label>PLZ</label>
              <input v-model="form.postal_code" type="text" placeholder="PLZ" />
            </div>
            <div class="form-group">
              <label>Ort</label>
              <input v-model="form.city" type="text" placeholder="Ort" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Telefon</label>
              <input v-model="form.tel" type="tel" placeholder="Telefon" />
            </div>
            <div class="form-group">
              <label>E-Mail</label>
              <input v-model="form.email" type="email" placeholder="E-Mail" />
            </div>
          </div>
          <div class="form-group">
            <label>Notizen</label>
            <textarea v-model="form.notes" rows="2" placeholder="Notizen"></textarea>
          </div>
          <div class="form-group">
            <label>Standort</label>
            <MapPicker v-model="mapPickerValue" height="280px" />
            <button
              v-if="form.latitude != null && form.longitude != null"
              type="button"
              class="btn-clear-location"
              @click="clearLocation"
            >
              Standort löschen
            </button>
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
.connections-view {
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
  color: #16a34a;
  text-decoration: none;
  font-size: 0.9rem;
}

.back:hover {
  text-decoration: underline;
}

.header h1 {
  margin: 0;
  font-size: 1.25rem;
  color: #1a1a2e;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-primary, .btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  background: #16a34a;
  color: #fff;
  border: none;
}

.btn-secondary {
  background: #f0f0f0;
  border: 1px solid #d0d5dd;
}

.main {
  padding: 1.5rem 2rem;
}

.import-section {
  position: relative;
  z-index: 2;
  background: #fff;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.import-section h3 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
}

.import-row {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
  flex-wrap: wrap;
}

.import-select-wrap {
  position: relative;
}

.import-select {
  appearance: none;
  -webkit-appearance: none;
  min-width: 140px;
  height: 40px;
  padding: 0 2.25rem 0 0.75rem;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234a4a68' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 0.75rem center;
  font-size: 0.9rem;
  color: #1a1a2e;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.import-select:hover {
  border-color: #16a34a;
}

.import-select:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
}

.file-input-wrap {
  position: relative;
}

.file-input-native {
  position: absolute;
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  z-index: -1;
}

.file-input-label {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 180px;
  height: 40px;
  padding: 0 1rem;
  border: 1px dashed #d0d5dd;
  border-radius: 8px;
  background: #f8f9fa;
  font-size: 0.9rem;
  color: #4a4a68;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-input-label:hover {
  border-color: #16a34a;
  background: #dcfce7;
  color: #16a34a;
}

.btn-import {
  height: 40px;
  padding: 0 1.25rem;
  border: none;
  border-radius: 8px;
  background: #16a34a;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.btn-import:hover:not(:disabled) {
  background: #15803d;
}

.btn-import:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

.toolbar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.filter {
  appearance: none;
  -webkit-appearance: none;
  min-width: 140px;
  height: 40px;
  padding: 0 2.25rem 0 0.75rem;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234a4a68' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 0.75rem center;
  font-size: 0.9rem;
  color: #1a1a2e;
  cursor: pointer;
}

.filter:hover {
  border-color: #16a34a;
}

.filter:focus {
  outline: none;
  border-color: #16a34a;
}

.table-wrap {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.connections-table {
  width: 100%;
  border-collapse: collapse;
}

.connections-table th,
.connections-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.connections-table th {
  background: #f8f9fa;
  font-weight: 600;
  font-size: 0.875rem;
  color: #4a4a68;
}

.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge.glasfaser {
  background: #dcfce7;
  color: #15803d;
}

.badge.strom {
  background: #fef3c7;
  color: #b45309;
}

.badge.stage {
  background: #e0e7ff;
  color: #3730a3;
}

.badge.stage.hausbegehung {
  background: #fef3c7;
  color: #b45309;
}

.badge.stage.tiefbau {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge.stage.aktivierung {
  background: #dcfce7;
  color: #15803d;
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  margin-right: 0.5rem;
  border-radius: 6px;
  border: 1px solid #d0d5dd;
  background: #fff;
  cursor: pointer;
}

.btn-sm.danger {
  border-color: #e63946;
  color: #e63946;
}

.loading, .empty {
  color: #6b7280;
  padding: 2rem;
}

.error {
  color: #e63946;
  margin-bottom: 1rem;
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
  max-width: 560px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
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
  color: #4a4a68;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
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

.btn-clear-location {
  margin-top: 0.5rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
}

.btn-clear-location:hover {
  border-color: #e63946;
  color: #e63946;
}
</style>
