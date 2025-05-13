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
import { jwtDecode } from 'jwt-decode'; // ✅ 浏览器中解码 JWT 的正确方式

const router = useRouter();
const loading = ref(true);
const authenticated = ref(false);

// 跳转到登录页（延迟 1.5 秒）
const redirectToLogin = () => {
  setTimeout(() => {
    router.replace('/');
  }, 1500);
};

// 页面加载后执行认证
onMounted(() => {
  const redirectToken = localStorage.getItem('redirectToken');

  if (!redirectToken) {
    redirectToLogin();
    loading.value = false;
    return;
  }

  try {
    // 解码并检查是否过期
    const decoded = jwtDecode(redirectToken);
    const exp = decoded?.exp;
    const currentTime = Math.floor(Date.now() / 1000);

    if (!exp || currentTime >= exp) {
      console.warn('redirectToken 已过期');
      redirectToLogin();
      loading.value = false;
      return;
    }
  } catch (err) {
    console.error('redirectToken 解码失败:', err);
    redirectToLogin();
    loading.value = false;
    return;
  }

  // 如果 redirectToken 合法，继续验证 Cookie 中的登录态
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
