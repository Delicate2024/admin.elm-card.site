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
import jwt from 'jsonwebtoken';  // 确保你引入了 jsonwebtoken

const router = useRouter();
const loading = ref(true);
const authenticated = ref(false);

// 跳转到登录页的逻辑封装
const redirectToLogin = () => {
  setTimeout(() => router.replace('/'), 1500);  // 1.5秒后跳转
};

// 认证逻辑
onMounted(() => {
  // 1. 获取 redirectToken
  const redirectToken = localStorage.getItem('redirectToken');
  if (redirectToken) {
    try {
      // 使用 jwt.verify 来验证并解码 token
      const decoded = jwt.verify(redirectToken, 'invalid-key');  // 使用错误密钥来验证无效性
    } catch (err) {
      // 如果验证失败（例如 token 无效或过期）
      console.error('Token 验证失败:', err);
      redirectToLogin();
      loading.value = false;
      return;
    }
  } else {
    // 如果没有 redirectToken，直接跳转
    redirectToLogin();
    loading.value = false;
    return;
  }

  // 2. 如果有 redirectToken，再验证cookie中的JWT token的有效性
  axios.get('/api/verifyToken', { withCredentials: true })
    .then((response) => {
      if (response.data.success) {
        authenticated.value = true;
      } else {
        authenticated.value = false;
        redirectToLogin();  // 验证失败，跳转
      }
    })
    .catch((error) => {
      authenticated.value = false;
      redirectToLogin();  // 请求失败，跳转
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
