<template>
	<div class="dashboard-container">
		<!-- Sidebar 区域 -->
		<aside class="sidebar">
			<h2 class="logo">📁 FileHub</h2>
			<ul class="menu">
				<li :class="{ active: currentView === 'FileHub' }" @click="currentView = 'FileHub'">文件管理</li>
				<li :class="{ active: currentView === 'CardTable' }" @click="currentView = 'CardTable'">卡片表格</li>
			</ul>
		</aside>

		<!-- 主内容区域 -->
		<main class="main-content">
			<div v-if="loading">
				<h2>加载中...</h2>
			</div>

			<component
				:is="currentView"
				v-else-if="authenticated"
			/>

			<div v-else class="error">
				<h2>身份验证失败，正在返回登录页...</h2>
			</div>
		</main>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

// 引入子组件
import FileHub from './Dashboard/FileHub.vue';
import CardTable from './Dashboard/CardTable.vue';

const router = useRouter();
const authenticated = ref(false);
const loading = ref(true);
const currentView = ref(FileHub); // 默认组件对象

onMounted(() => {
	setTimeout(() => { loading.value = false; }, 1000);

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

function isTokenExpired(decodedToken) {
	const exp = decodedToken?.exp;
	const currentTime = Math.floor(Date.now() / 1000);
	return !exp || currentTime >= exp;
}

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
	font-family: 'Segoe UI', sans-serif;
}

/* Sidebar 样式 */
.sidebar {
	width: 15vw;
	background-color: #2c3e50;
	color: #ecf0f1;
	padding: 1.5vh 1vw;
	box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
	display: flex;
	flex-direction: column;
}

.logo {
	margin-bottom: 2vh;
	font-size: 1.2vw;
}

.menu {
	list-style: none;
	padding: 0;
	margin: 0;
}

.menu li {
	cursor: pointer;
	padding: 1vh 0.5vw;
	margin-bottom: 1vh;
	border-radius: 4px;
	transition: background-color 0.2s ease;
}

.menu li:hover {
	background-color: #34495e;
}

.menu li.active {
	background-color: #007bff;
}

/* 主内容区域 */
.main-content {
	flex: 1;
	background-color: #f4f6f8;
	padding: 2vh 2vw;
	overflow-y: auto;
}
</style>
