// src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import AdminLogin from './components/AdminLogin.vue'
import Dashboard from './components/Dashboard.vue'

const routes = [
  { path: '/login', component: AdminLogin },
  { path: '/', component: Dashboard },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 不阻塞跳转 —— 仅初步限制
router.beforeEach((to, from, next) => {
  next(); // 所有跳转放行，验证交给页面组件自己做
});

export default router;
