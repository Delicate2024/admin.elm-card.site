// router.js

import { createRouter, createWebHistory } from 'vue-router'
import AdminLogin from './components/AdminLogin.vue'
import Dashboard from './components/Dashboard.vue'

const routes = [
  { path: '/', component: AdminLogin },
  { path: '/dashboard', component: Dashboard },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token'); // 或检查 cookie

  if (to.path === '/' && token) {
    next('/dashboard');
  } else if (to.path === '/dashboard' && !token) {
    next('/');
  } else {
    next();
  }
});

export default router;
