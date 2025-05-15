<!-- src/components/Dashboard.vue -->
<template>
  <div v-if="loading" class="loading">
    <h2>验证身份中...</h2>
  </div>

  <div v-else-if="authenticated">
    <h2>欢迎来到 Dashboard</h2>
    <p>你已成功登录，可以上传图片资源。</p>    
    <div v-if="uploadSuccess" class="success-message">
      ✓ 上传成功！已上传{{ uploadedCount }}个文件
    </div>
    <div v-if="uploadError" class="error-message">
      ⚠ {{ errorMessage }}
    </div>

    <input
      type="file"
      ref="fileInput"
      accept="image/*"
      multiple
      @change="handleFileChange"
    />
    <button @click="uploadImages" :disabled="!webpFiles.length || uploading">
      {{ uploading ? '上传中...' : '上传图片' }}
    </button>
    <ul>
      <li v-for="(file, index) in webpFiles" :key="`${file.name}-${file.size}-${index}`">
        {{ file.name }} ({{ (file.size / 1024).toFixed(1) }} KB)
      </li>
    </ul>
  </div>

  <div v-else class="error">
    <h2>身份验证失败，正在返回登录页...</h2>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { jwtDecode } from 'jwt-decode';

const router = useRouter();
const authenticated = ref(false);
const loading = ref(true);
const webpFiles = ref([]);
const uploading = ref(false);
const fileInput = ref(null);
const uploadSuccess = ref(false);
const uploadError = ref(false);
const errorMessage = ref('');
const uploadedCount = ref(0);
const objectURLs = ref(new Set());

const redirectToLogin = () => {
  setTimeout(() => {
    router.replace('/login');
  }, 2000);
};

onMounted(() => {
  setTimeout(() => { loading.value = false; }, 1000);

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
    });
});

const handleFileChange = async (event) => {
  const files = Array.from(event.target.files);
  const batchSize = 5;
  webpFiles.value = [];
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const converted = await Promise.all(
      batch.map(file => convertToWebP(file).catch(() => null))
    );
    webpFiles.value.push(...converted.filter(f => f));
  }
};

const convertToWebP = (file) => {
  if (!HTMLCanvasElement.prototype.toBlob) {
    console.warn('当前浏览器不支持WebP转换');
    return Promise.resolve(file);
  }

  if (!file.type.startsWith('image/')) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectURL = URL.createObjectURL(file);
    objectURLs.value.add(objectURL);

    img.onerror = () => {
	  URL.revokeObjectURL(objectURL); 
	  resolve(null);
	};
    img.onload = () => {
	  URL.revokeObjectURL(objectURL);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const webpFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, '.webp'),
            { type: 'image/webp' }
          );
          resolve(webpFile);
        } else {
          resolve(null);
        }
      }, 'image/webp', 0.8);
    };
	img.src = objectURL;
  });
};

const uploadImages = async () => {
  try {
    uploading.value = true;
    uploadSuccess.value = false;
    uploadError.value = false;
	
	const formData = new FormData();
    webpFiles.value.forEach(file => formData.append('images', file));

	const csrfToken = localStorage.getItem('csrfToken'); 
    const res = await axios.post('/api/uploadAssets', formData, {
      timeout: 10000,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    });

    uploadedCount.value = webpFiles.value.length;
    uploadSuccess.value = true;
    setTimeout(() => uploadSuccess.value = false, 3000);
    
    webpFiles.value = [];
    if (fileInput.value) fileInput.value.value = null;
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      errorMessage.value = '上传超时，请检查网络连接';
    } else {
      errorMessage.value = err.response?.data?.message || err.message;
    }
    uploadError.value = true;
  } finally {
    uploading.value = false;
  }
};

onUnmounted(() => {
  objectURLs.value.forEach(url => URL.revokeObjectURL(url));
  objectURLs.value.clear();
});

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : '';
};
</script>

<style scoped>
.success-message {
  color: #28a745;
  padding: 10px;
  background: #e8f5e9;
  border-radius: 4px;
  margin: 10px 0;
}
.error-message {
  color: #dc3545;
  padding: 10px;
  background: #f8d7da;
  border-radius: 4px;
  margin: 10px 0;
}
.loading, .error {
  text-align: center;
  margin-top: 50px;
}
input[type="file"] {
  margin-top: 20px;
}
button {
  margin-top: 10px;
  padding: 5px 15px;
}
ul {
  margin-top: 10px;
  list-style: none;
  padding: 0;
}
</style>