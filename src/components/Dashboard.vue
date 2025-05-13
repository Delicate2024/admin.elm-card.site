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
import { jwtDecode } from 'jwt-decode';

const router = useRouter();
const authenticated = ref(false);
const loading = ref(true);

const redirectToLogin = () => {
  setTimeout(() => {
    router.replace('/login');
  }, 1000);
};

onMounted(() => {
  const redirectToken = localStorage.getItem('redirectToken');

  if (!redirectToken) {
    redirectToLogin();
    return;
  }

  try {
    const decoded = jwtDecode(redirectToken);
    const exp = decoded?.exp;
    const currentTime = Math.floor(Date.now() / 1000);

    if (!exp || currentTime >= exp) {
      console.warn('redirectToken 已过期');
      redirectToLogin();
      return;
    }
  } catch (err) {
    console.error('redirectToken 解码失败:', err);
    redirectToLogin();
    return;
  }

  axios.get('/api/verifyToken', { withCredentials: true })
    .then((response) => {
      if (response.data.success) {
        authenticated.value = true;
      } else {
        redirectToLogin();
      }
    })
    .catch((error) => {
      console.error('verifyToken 请求失败:', error);
      redirectToLogin();
    })
    .finally(() => {
	  setTimeout(() => {loading.value = false;}, 1000);
    });
});
</script>

<style scoped>
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh; 
  font-size: 18px;
  color: #999;
}

.error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh; 
  font-size: 18px;
  color: #999;
}
</style>

