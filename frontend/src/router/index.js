import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import SignupView from '../views/SignupView.vue';
import ProjectSelectView from '../views/ProjectSelectView.vue';
import DashboardView from '../views/DashboardView.vue';
import ConnectionsView from '../views/ConnectionsView.vue';
import GroupsView from '../views/GroupsView.vue';

const routes = [
  {
    path: '/',
    redirect: '/projects',
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { guest: true },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: SignupView,
    meta: { guest: true },
  },
  {
    path: '/projects',
    name: 'ProjectSelect',
    component: ProjectSelectView,
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardView,
    meta: { requiresAuth: true, requiresProject: true },
  },
  {
    path: '/connections',
    name: 'Connections',
    component: ConnectionsView,
    meta: { requiresAuth: true, requiresProject: true },
  },
  {
    path: '/groups',
    name: 'Groups',
    component: GroupsView,
    meta: { requiresAuth: true, requiresProject: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  const currentProject = localStorage.getItem('currentProject');

  if (to.meta.requiresAuth && !token) {
    return { name: 'Login' };
  }

  if (to.meta.guest && token) {
    return { name: 'ProjectSelect' };
  }

  if (to.meta.requiresProject && !currentProject) {
    return { name: 'ProjectSelect' };
  }
});

export default router;
