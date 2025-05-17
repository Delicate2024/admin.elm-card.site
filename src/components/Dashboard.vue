<!-- src/components/Dashboard.vue -->
<template>
	<div v-if="loading">
		<h2>加载中...</h2>
	</div>

	<FileHub v-else-if="authenticated" />

	<div v-else class="error">
		<h2>身份验证失败，正在返回登录页...</h2>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import FileHub from './Dashboard/FileHub.vue'; // 

// 变量——身份验证区
const router = useRouter();
const authenticated = ref(false);
const loading = ref(true);

// 函数——生命周期钩子
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

// 函数——工具类
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
</style>

