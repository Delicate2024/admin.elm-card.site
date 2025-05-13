<!-- src/components/Dashboard.vue -->
<template>
  <div v-if="loading" class="loading">验证身份中...</div>
  <div v-else-if="authenticated">
    <h2>欢迎来到 Dashboard</h2>
    <p>你已成功登录。</p>
  </div>
  <div v-else class="error">
    <p>身份验证失败，正在返回登录页...</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(true);
const authenticated = ref(false);

onMounted(() => {
  // 1. 检查是否有 token
  const token = localStorage.getItem('jwt');

  if (!token) {
    // 如果没有 token，直接跳转到登录页面
    setTimeout(() => router.replace('/'), 0);
    loading.value = false;
    return;
  }

  // 2. 如果有 token，验证其有效性
  axios.get('/api/verifyToken', {
    withCredentials: true,
  })
  .then((response) => {
    if (response.data.success) {
      authenticated.value = true;
    } else {
      authenticated.value = false;
      setTimeout(() => router.replace('/'), 1500);  // 1.5秒后跳转
    }
  })
  .catch((error) => {
    authenticated.value = false;
    setTimeout(() => router.replace('/'), 1500);  // 1.5秒后跳转
  })
  .finally(() => {
    loading.value = false;
  });
});
</script>

<style scoped>
.loading {
  text-align: center;
  margin-top: 100px;
  font-size: 18px;
  color: #999;
}
.error {
  text-align: center;
  margin-top: 100px;
  font-size: 18px;
  color: #ff6666;
}
</style>
