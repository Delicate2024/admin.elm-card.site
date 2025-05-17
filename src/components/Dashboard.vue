<template>
	<div class="dashboard-container">
		<!-- Sidebar 区域 -->
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

import FileHub from './Dashboard/FileHub.vue';
import CardTable from './Dashboard/CardTable.vue';

const router = useRouter();
const authenticated = ref(false);
const loading = ref(true);

// 当前激活组件名
const currentViewName = ref('FileHub');

// 组件映射表
const componentMap = {
	FileHub,
	CardTable
};

// 当前组件对象
const currentView = computed(() => componentMap[currentViewName.value]);

// 切换视图方法
function selectView(name) {
	currentViewName.value = name;
}

// 可选调试日志
watch(currentViewName, (val) => {
	console.log('✅ 当前视图切换为:', val);
});

// 验证身份并加载内容
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
* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

.dashboard-container {
	display: flex;
	flex-direction: row;
	align-items: stretch;
	height: 100vh;
	width: 100vw;
	background-color: #f4f6f8;
	font-family: 'Segoe UI', sans-serif;
}

.sidebar {
	width: 240px;
	background-color: #2c3e50;
	color: #ecf0f1;
	padding: 2rem 1rem;
	display: flex;
	flex-direction: column;
}

.logo {
	margin-bottom: 2rem;
	font-size: 1.5rem;
	text-align: center;
	font-weight: bold;
}

.menu {
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.menu li {
	cursor: pointer;
	padding: 0.75rem 1rem;
	border-radius: 6px;
	transition: background-color 0.2s ease;
	user-select: none;
}

.menu li:hover {
	background-color: #34495e;
}

.menu li.active {
	background-color: #007bff;
	color: white;
	font-weight: bold;
}

.main-content {
	flex: 1;
	padding: 2rem;
	overflow-y: auto;
}

.error {
	color: red;
	text-align: center;
	margin-top: 2rem;
}
</style>
