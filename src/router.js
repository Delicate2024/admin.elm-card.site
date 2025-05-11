// src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import AdminLogin from './components/AdminLogin.vue'
import Dashboard from './components/Dashboard.vue' // 你还没建，稍后建

const routes = [
  { path: '/', component: AdminLogin },
  { path: '/dashboard', component: Dashboard },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router

