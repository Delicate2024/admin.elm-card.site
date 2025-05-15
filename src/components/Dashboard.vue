<!-- src/components/Dashboard.vue -->
<template>
  <div v-if="loading">
    <h2>加载中...</h2>
  </div>

  <div v-else-if="authenticated">
    <h2>欢迎来到 Dashboard</h2>
    <p>你已成功登录，可以上传图片资源。</p>
	
	<!-- 上传区 -->
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
	
    <!-- 文件清单区 -->
	<div v-for="(files, type) in assets" :key="type">
	  <h4>{{ formatAssetType(type) }}</h4>
	  <ul>
		<li v-for="(file, index) in files" :key="index" class="file-item">
		  <span>{{ file }}</span>
		  <button @click="downloadFile(file)">下载</button>
		</li>
	  </ul>
	</div>
	
  </div>
  
  <div v-else class="error">
    <h2>身份验证失败，正在返回登录页...</h2>
  </div>
</template>

<script setup>
// 依赖区
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { jwtDecode } from 'jwt-decode';

// 变量——身份验证区
const router = useRouter();
const authenticated = ref(false);
const loading = ref(true);

// 变量——上传区
const uploading = ref(false);
const webpFiles = ref([]);
const uploadSuccess = ref(false);
const uploadError = ref(false);
const errorMessage = ref('');
const uploadedCount = ref(0);
const fileInput = ref(null);
const objectURLs = ref(new Set()); 

// 变量——文件清单区
const assets = ref({});

// 函数——基区
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
		fetchAssets();
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

onUnmounted(() => {
  objectURLs.value.forEach(url => URL.revokeObjectURL(url));
  objectURLs.value.clear();
});

// 函数——上传区
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
    objectURLs.value.add(objectURL); // 添加至Set

    img.onerror = () => {
      URL.revokeObjectURL(objectURL);
      objectURLs.value.delete(objectURL);
      resolve(null);
    };
    img.onload = () => {
      URL.revokeObjectURL(objectURL);
      objectURLs.value.delete(objectURL);

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

// 函数——文件清单区
const fetchAssets = async () => {
  try {
    const response = await axios.get('/api/getAssets', { withCredentials: true });

    if (response.data.success) {
      assets.value = response.data.assets;
    } else {
      error.value = '获取文件清单失败';
    }
  } catch (err) {
    error.value = '请求失败，请稍后再试';
  } finally {
    loading.value = false;
  }
};
function formatAssetType(type) {
  const typeMapping = {
    images: '图片',
    documents: '文档',
    audio: '音频'
  };
  return typeMapping[type] || '其他';
}
const hasAssets = computed(() => {
  return Object.keys(assets.value).length > 0;
});



</script>

<style scoped>
</style>
