<!-- src/components/Dashboard.vue -->
<template>
  <div v-if="loading">
    <h2>加载中...</h2>
  </div>

  <div v-else-if="authenticated">
    <h2>欢迎来到 Dashboard</h2>
    <p>你已成功登录，可以上传图片资源。</p>
	
	<!-- 图片上传区 -->
	<div class="upload-section">
		<div class="asset-group">
		  <h4>文件上传</h4>
		  <!-- 上传成功消息 -->
		  <div v-if="uploadSuccess" class="success-message">
			✓ 上传成功！已上传{{ uploadedCount }}个文件
		  </div>
		  <!-- 上传失败消息 -->
		  <div v-if="uploadError" class="error-message">
			⚠ {{ errorMessage }}
		  </div>
		  <!-- 文件上传控件 -->
		  <div class="upload-controls">
			<label class="file-input-wrapper">
			  <input
				type="file"
				ref="fileInput"
				accept="image/*"
				multiple
				@change="handleFileChange"
			  />
			  <span v-if="webpFiles.length > 0">
				已选中{{ webpFiles.length }}个图片
			  </span>
			  <span v-else>选择文件</span>
			</label>
			<button
			  @click="uploadImages"
			  :disabled="!webpFiles.length || uploading"
			>
			  {{ uploading ? '上传中...' : '上传图片' }}
			</button>
		  </div>
		</div>
	</div>
	
    <!-- 文件清单区 -->
	<div v-for="(files, type) in assets" :key="type" class="asset-group">
	  <h4>{{ formatAssetType(type) }}</h4>
	  <ul>
		<li v-for="(file, index) in files" :key="file.name" class="file-item">
		  <input
			type="checkbox"
			v-model="selectedFiles"
			:value="{ type, name: file.name }"
			:id="`${type}-${file.name}`"
		  />
		  <label :for="`${type}-${file.name}`">{{ file.name }}</label>
		</li>
	  </ul>
	</div>
	<button
	  v-if="selectedFiles.length > 0"
	  @click="deleteSelectedFiles"
	  class="delete-button"
	>
	  删除选中的文件
	</button>
	
  </div>
  
  <div v-else class="error">
    <h2>身份验证失败，正在返回登录页...</h2>
  </div>
</template>

<script setup>
// 依赖区
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { jwtDecode } from 'jwt-decode';

// 变量——身份验证区
const router = useRouter();
const authenticated = ref(false);
const loading = ref(true);
const error = ref('');

// 变量——图片上传区
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
const selectedFiles = ref([]);


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
    fetchAssets();
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
    const csrfToken = localStorage.getItem('csrfToken');
    const response = await axios.post('/api/getAssetFileList', {}, {
      timeout: 10000,
      headers: {
        'X-CSRF-Token': csrfToken,
      },
      withCredentials: true,
    });
	console.log('Response data:', response.data);

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
const deleteFile = async (type, name) => {
  try {
    const csrfToken = localStorage.getItem('csrfToken');
    const res = await axios.post('/api/deleteAssetFile', { type, name }, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    if (res.data.success) {
    } else {
      error.value = '删除文件失败';
    }
  } catch (err) {
    error.value = '请求失败，请稍后再试';
  }
};
const deleteSelectedFiles = async () => {
  if (selectedFiles.value.length === 0) return;
  const deletePromises = selectedFiles.value.map(file => 
    deleteFile(file.type, file.name) 
  );

  try {
    await Promise.all(deletePromises); 
	fetchAssets();
    selectedFiles.value = [];
  } catch (err) {
    console.error('删除文件失败:', err);
  }
};

</script>

<style scoped>
/* 图片上传区 */
.upload-section {
  margin: 20px 0;
}

.asset-group {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background-color: #f9f9f9;
}

.asset-group h4 {
  margin: 0 0 10px;
  font-size: 16px;
  color: #333;
  font-weight: bold;
}

/* 上传成功和失败消息 */
.success-message {
  color: green;
  font-weight: bold;
  margin-bottom: 10px;
}

.error-message {
  color: red;
  font-weight: bold;
  margin-bottom: 10px;
}

/* 文件上传控件 */
.upload-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-input-wrapper {
  display: flex;
  align-items: center;
}

input[type="file"] {
  padding: 10px;
  height: 40px;
  box-sizing: border-box;
  font-size: 14px;
  flex: 3;
}

button {
  flex: 1;
  padding: 10px;
  height: 40px;
  box-sizing: border-box;
  font-size: 14px;
  cursor: pointer;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  transition: background-color 0.3s;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

button:hover:enabled {
  background-color: #2980b9;
}

/* 文件选择状态文本 */
.file-input-wrapper span {
  margin-left: 10px;
  font-size: 14px;
  color: #555;
}
	
/* 文件清单区 */
	/* 去掉 ul 默认的黑点 */
	ul {
	  list-style: none;
	  padding: 0;
	  margin: 0 0 16px 0;
	}
	/* 单个文件项样式 */
	.file-item {
	  display: flex;
	  align-items: center;
	  padding: 8px 12px;
	  border: 1px solid #ccc;
	  border-radius: 6px;
	  margin-bottom: 6px;
	  background-color: #fafafa;
	  color: #555; /* 加上字体颜色，更浅一些 */
	}
	/* 复选框间距 */
	input[type="checkbox"] {
	  margin-right: 10px;
	}
	/* 删除按钮样式 */
	.delete-button {
	  padding: 10px 16px;
	  background-color: #e74c3c;
	  color: white;
	  border: none;
	  border-radius: 6px;
	  cursor: pointer;
	  margin-top: 12px;
	}
	.delete-button:hover {
	  background-color: #c0392b;
	}
	/* 每组文件类型块的样式 */
	.asset-group {
	  border: 1px solid #ddd;
	  padding: 12px;
	  margin-bottom: 16px;
	  border-radius: 8px;
	  background-color: #fff;
	}
	/* 类型标题样式 */
	.asset-group h4 {
	  color: #2c3e50; /* 深一点的字体颜色，更好区分 */
	  margin-bottom: 10px;
	}
	
</style>
