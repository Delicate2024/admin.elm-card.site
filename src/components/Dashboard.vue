<!-- src/components/Dashboard.vue -->
<template>
  <div class="dashboard-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <h2 class="logo">🃏Elm-Card</h2>
      <ul class="menu">
        <li
          :class="{ active: currentViewName === 'FileHub' }"
          @click="selectView('FileHub')"
        >文件管理</li>
        <li
          :class="{ active: currentViewName === 'CardTable' }"
          @click="selectView('CardTable')"
        >卡片表格</li>
      </ul>
    </aside>

    <!-- 主内容区域 -->
<main class="main-content">
  <div v-if="loading">
    <h2>加载中...</h2>
  </div>

  <!-- 👇 v-else 包一层逻辑 -->
  <template v-else>
    <Transition name="fade" mode="out-in">
      <template v-if="authenticated">
        <component :is="currentView" :key="currentViewName" />
      </template>
      <template v-else>
        <div class="error">
          <h2>身份验证失败，正在返回登录页...</h2>
        </div>
      </template>
    </Transition>
  </template>
</main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

// 子组件
import FileHub from './Dashboard/FileHub.vue';
import CardTable from './Dashboard/CardTable.vue';

const router = useRouter();
const authenticated = ref(false);
const loading = ref(true);

// 当前视图名
const currentViewName = ref('FileHub');

// 组件映射表
const componentMap = {
  FileHub,
  CardTable
};

// 根据 currentViewName 映射到具体组件
const currentView = computed(() => componentMap[currentViewName.value]);

// 点击切换视图
function selectView(name) {
  currentViewName.value = name;
}

// 控制台日志（可选）
watch(currentViewName, (val) => {
  console.log('✅ 当前视图切换为:', val);
});

// 页面加载时进行身份验证
onMounted(() => {
  // 模拟加载动画
  setTimeout(() => {
    loading.value = false;
  }, 1000);

  const decodedToken = getDecodedRedirectToken();
  if (!decodedToken || isTokenExpired(decodedToken)) {
    console.warn('无效或过期的 redirectToken');
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
    });
});

// 获取 token 并解码
function getDecodedRedirectToken() {
  const token = localStorage.getItem('redirectToken');
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch (err) {
    console.error('Token 解码失败:', err);
    return null;
  }
}

// 判断 token 是否过期
function isTokenExpired(decodedToken) {
  const exp = decodedToken?.exp;
  const currentTime = Math.floor(Date.now() / 1000);
  return !exp || currentTime >= exp;
}

// 跳转登录页
function redirectToLogin(delay = 2000) {
  setTimeout(() => {
    router.replace('/login');
  }, delay);
}
</script>

<style scoped>
.dashboard-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 200px;
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  pointer-events: auto;
  z-index: 100;
}

.logo {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.menu {
  list-style: none;
  padding: 0;
}
.menu li {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 4px;
}
.menu li:hover {
  background-color: #34495e;
}
.menu li:active {
  transform: scale(0.95);
}
.menu li.active {
  background-color: #1abc9c;
  color: white;
  font-weight: bold;
}

@keyframes gradientBG {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
.main-content {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem;

  background: linear-gradient(-45deg, #2c3e50, #1abc9c, #3498db, #9b59b6);
  background-size: 400% 400%;
  animation: gradientBG 15s ease infinite;
  color: white;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.error {
  color: red;
}
</style>
