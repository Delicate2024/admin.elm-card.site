<template>
  <div class="dashboard-container">
    <!-- Sidebar -->
	<aside class="sidebar" :class="{ collapsed: isCollapsed }">
		<h2 class="logo">🃏Elm</h2>
		<button class="collapse-btn" @click="toggleSidebar">
		{{ isCollapsed ? '➡️' : '⬅️' }}
		</button>
		<ul class="menu">
		<li :class="{ active: currentViewName === 'FileHub' }" @click="selectView('FileHub')">
		  📁 <span v-if="!isCollapsed">文件管理</span>
		</li>
		<li :class="{ active: currentViewName === 'CardTable' }" @click="selectView('CardTable')">
		  📊 <span v-if="!isCollapsed">卡片表格</span>
		</li>
		</ul>
	</aside>

    <!-- 主内容区域 -->
    <main class="main-content">
      <div v-if="loading">
        <h2>加载中...</h2>
      </div>
      <component :is="currentView" v-else-if="authenticated" />
      <div v-else class="error">
        <h2>身份验证失败，正在返回登录页...</h2>
      </div>
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
const componentMap = {
  FileHub,
  CardTable
};

const currentView = computed(() => componentMap[currentViewName.value]);
const isCollapsed = ref(false);

// 点击收缩/展开导航栏。
function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value;
}

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

.logo {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.sidebar {
  width: 200px;
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  transition: width 0.3s ease;
  z-index: 100;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar .collapse-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 1rem;
}

.menu li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.menu li:hover {
  background-color: #34495e;
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

.error {
  color: red;
}
</style>
