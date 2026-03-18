import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api/index.js';

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref([]);
  const currentProject = ref(JSON.parse(localStorage.getItem('currentProject') || 'null'));
  const loading = ref(false);
  const error = ref(null);

  const hasProject = computed(() => !!currentProject.value);

  function setCurrentProject(project) {
    currentProject.value = project;
    if (project) {
      localStorage.setItem('currentProject', JSON.stringify(project));
    } else {
      localStorage.removeItem('currentProject');
    }
  }

  async function fetchProjects() {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.get('/projects');
      projects.value = data.projects;
      const stored = currentProject.value;
      if (stored && !data.projects.find(p => p.id === stored.id)) {
        setCurrentProject(null);
      }
      return data.projects;
    } catch (err) {
      error.value = err.response?.data?.error || 'Projekte konnten nicht geladen werden';
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function createProject(name, description = '') {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post('/projects', { name, description });
      projects.value.push(data.project);
      setCurrentProject({ ...data.project, role: 'admin' });
      return data.project;
    } catch (err) {
      error.value = err.response?.data?.error || 'Projekt konnte nicht erstellt werden';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateProject(id, updates) {
    try {
      const { data } = await api.patch(`/projects/${id}`, updates);
      const idx = projects.value.findIndex(p => p.id === id);
      if (idx >= 0) projects.value[idx] = { ...projects.value[idx], ...data.project };
      if (currentProject.value?.id === id) {
        setCurrentProject({ ...currentProject.value, ...data.project });
      }
      return data.project;
    } catch (err) {
      error.value = err.response?.data?.error || 'Projekt konnte nicht aktualisiert werden';
      return null;
    }
  }

  async function deleteProject(id) {
    try {
      await api.delete(`/projects/${id}`);
      projects.value = projects.value.filter(p => p.id !== id);
      if (currentProject.value?.id === id) {
        setCurrentProject(null);
      }
      return true;
    } catch (err) {
      error.value = err.response?.data?.error || 'Projekt konnte nicht gelöscht werden';
      return false;
    }
  }

  function clearProject() {
    setCurrentProject(null);
  }

  return {
    projects,
    currentProject,
    loading,
    error,
    hasProject,
    setCurrentProject,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    clearProject,
  };
});
