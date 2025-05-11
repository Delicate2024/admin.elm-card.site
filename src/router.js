// src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import AdminLogin from './components/AdminLogin.vue'
import Dashboard from './components/Dashboard.vue'
import axios from 'axios'

// 检查 JWT Token 是否有效
const checkAuth = async () => {
  try {
    const response = await axios.get('/api/verifyToken', { withCredentials: true });
    return response.data.success;
  } catch (error) {
    return false;
  }
}

const routes = [
  { path: '/', component: AdminLogin },
  { path: '/dashboard', component: Dashboard },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const isAuthenticated = await checkAuth();

  // 如果访问的是登陆页，且已经登陆，跳转到 dashboard 页面
  if (to.path === '/' && isAuthenticated) {
    next('/dashboard');
  }
  // 如果访问的是受保护的 dashboard 页面，但没有有效的 Token，跳转到登陆页
  else if (to.path === '/dashboard' && !isAuthenticated) {
    next('/');
  }
  // 默认情况下继续路由
  else {
    next();
  }
});

export default router;
