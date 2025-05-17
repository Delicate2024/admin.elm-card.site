<!-- src/components/Dashboard.vue -->
<template>
	<div v-if="loading">
		<h2>加载中...</h2>
	</div>

	<div v-else-if="authenticated">
		<h2>欢迎来到 Dashboard !!</h2>
		
		<!-- 图片上传区 -->
		<div class="column-group">
			<h4>文件上传</h4>
			<!-- 上传成功消息 --><div v-if="uploadSuccess" class="success-message"> ✓ 上传成功！已上传{{ uploadedCount }}个文件 </div>
			<!-- 上传失败消息 --><div v-if="uploadError" class="error-message"> ⚠ {{ errorMessage }} </div>
			<!-- 文件上传控件 --><div class="upload-row">
				<label class="file-input-wrapper">
					<input type="file" ref="fileInput" accept="image/*" multiple @change="handleImageChange" />
					<span v-if="webpFiles.length > 0"> 已生成{{ webpFiles.length }}个webp图片，还剩{{ handleImageFiles.length - webpFiles.length}}个图片文件未被转换。 </span>
					<span v-else>选择文件</span>
				</label>
				<button @click="uploadImages" :disabled="!webpFiles.length || (handleImageFiles.length-webpFiles.length) || uploading"> {{ uploading ? '上传中...' : '上传图片' }} </button>
			</div>
		</div>
		
		<!-- 文件清单区 -->
		<div class="column-group">
			<div class="asset-group">
				<div v-for="(files, type) in paginatedAssets" :key="type" class="asset-subgroup">
					<h4>{{ formatAssetType(type) }}({{ getTotalSize(assets[type] || []) }})</h4>
					<!-- 列表控件 -->
					<ul class="file-list">
						<li v-for="(file, index) in files" :key="file.name" class="file-item">
							<input type="checkbox" v-model="selectedFiles" :value="{ type, name: file.name }" :id="`${type}-${file.name}`" />
							<label :for="`${type}-${file.name}`">{{ file.name }}</label>
						</li>
					</ul>
					<!-- 分页控件 --><div class="pageController">
						<button @click="changePage(type, getCurrentPage(type) - 1)" :disabled="getCurrentPage(type) <= 1">上一页</button>
						<span>第 {{ getCurrentPage(type) }}/{{ totalPagesMap[type] }} 页</span>
						<button @click="changePage(type, getCurrentPage(type) + 1)" :disabled="getCurrentPage(type) >= totalPagesMap[type]">下一页</button>
					</div>
				</div>
			</div>
			<button v-if="selectedFiles.length > 0" @click="deleteSelectedFiles" class="delete-button">删除选中的文件</button>
		</div>
	
	</div><!-- 图片上传区结尾 -->
  
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
const handleImageFiles = ref([]);
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
const pageSize = ref(10);    // 每页显示的文件数
const currentPageMap = ref({});
const totalPagesMap = computed(() => {
  const result = {};
  for (const type in assets.value) {
    result[type] = Math.max(1, Math.ceil(assets.value[type].length / pageSize.value));
  }
  return result;
});
const getCurrentPage = (type) => currentPageMap.value[type] || 1;

  
// 函数——基区
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
const handleImageChange = async (event) => {
  handleImageFiles.value = Array.from(event.target.files);
  const batchSize = 3;
  webpFiles.value = [];

  for (let i = 0; i < handleImageFiles.value.length; i += batchSize) {
    const batch = handleImageFiles.value.slice(i, i + batchSize);
    const converted = await Promise.all(
      batch.map(file => convertImageFileToWebP(file, objectURLs.value).catch(() => null))
    );
    webpFiles.value.push(...converted.filter(f => f));
  }
};
const uploadFiles = async ({ fieldName, files }) => {
  uploading.value = true;
  uploadSuccess.value = false;
  uploadError.value = false;
  errorMessage.value = '';

  try {
    const csrfToken = localStorage.getItem('csrfToken');
    const results = await uploadFileBatch(files, fieldName, csrfToken);

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;
    uploadedCount.value = successCount;

    if (failCount > 0) {
      uploadError.value = true;
      errorMessage.value = `共 ${failCount} 个文件上传失败`;
      console.warn(`${failCount} files failed`, results.filter(r => r.status === 'rejected'));
    } else {
      uploadSuccess.value = true;
      setTimeout(() => uploadSuccess.value = false, 3000);
    }

    return { successCount, failCount, results };

  } catch (err) {
    uploadError.value = true;
    errorMessage.value = '上传过程中发生未知错误';
    console.error('Unexpected error:', err);
  } finally {
    fetchAssets?.();
    files.length = 0;
    if (fileInput.value instanceof HTMLInputElement) {
      fileInput.value.value = '';
    }
    uploading.value = false;
  }
};
const uploadImages = () => {
  uploadFiles({
    fieldName: 'images',
    files: webpFiles.value
  });
};


// 函数——文件清单区
const fetchAssets = async () => {
  try {
    const csrfToken = localStorage.getItem('csrfToken');
    const response = await axios.post('/api/getAssetFileList', {}, {
      timeout: 20000,
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
const paginatedAssets = computed(() => {
  const result = {};
  for (const type in assets.value) {
    const page = getCurrentPage(type);
    const start = (page - 1) * pageSize.value;
    result[type] = assets.value[type].slice(start, start + pageSize.value);
  }
  return result;
});
function changePage(type, newPage) {
  const total = totalPagesMap.value[type];
  if (newPage >= 1 && newPage <= total) {
    currentPageMap.value[type] = newPage;
  }
}

// 函数——工具类函数区
function formatAssetType(type) {
  const typeMapping = {
    images: '图片',
    documents: '文档',
    audio: '音频'
  };
  return typeMapping[type] || '其他';
}
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
function getTotalSize(files) {
  const totalBytes = files.reduce((sum, file) => sum + (file.size || 0), 0)
  return formatFileSize(totalBytes)
}

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

function convertImageFileToWebP(file, objectURLTracker) {
  if (!(!!HTMLCanvasElement.prototype.toBlob)) {
    console.warn('当前浏览器不支持 WebP 转换');
    return Promise.resolve(file);
  }

  if (!file.type.startsWith('image/')) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectURL = URL.createObjectURL(file);
    objectURLTracker.add(objectURL);

    img.onerror = () => {
      URL.revokeObjectURL(objectURL);
      objectURLTracker.delete(objectURL);
      resolve(null);
    };

    img.onload = () => {
      URL.revokeObjectURL(objectURL);
      objectURLTracker.delete(objectURL);

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
}

async function uploadFileBatch(files, fieldName, csrfToken, url = '/api/uploadAssets') {
  const uploadPromises = files.map(file => {
    const formData = new FormData();
    formData.append(fieldName, file);

    return axios.post(url, formData, {
      timeout: 20000,
      headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
    });
  });

  return await Promise.allSettled(uploadPromises);
}

</script>

<style scoped>
/* 图片上传区 */	
	/* 消息提示区 */
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
	/* 消息提示区结尾 */
	
	/* 选择文件区 */
		.column-group {
		  width: 960px;
		  border: 1px solid #ddd;
		  padding: 12px;
		  margin-bottom: 16px;
		  border-radius: 8px;
		  background-color: #fff;
		}
		.column-group h4 {
		  margin: 0 0 10px 0;
		  color: #2c3e50; /* 深一点的字体颜色，更好区分 */
		}
		.upload-row {
		  display: flex;
		  align-items: center; 
		}
		/* 文件选择 input 和说明文字包裹容器 */.file-input-wrapper {
		  display: flex;
		  align-items: center;
		  gap: 8px;
		  flex: 5;
		  height: 40px;
		  padding: 0 10px;
		  background-color: #fff;
		  border: 1px solid #ccc;
		  border-radius: 4px;
		  font-size: 14px;
		  box-sizing: border-box;
		  cursor: pointer;
		  position: relative;
		}
		/* 隐藏原始文件选择框 */.file-input-wrapper input[type="file"] {
		  position: absolute;
		  left: 0;
		  top: 0;
		  opacity: 0;
		  width: 100%;
		  height: 100%;
		  cursor: pointer;
		}
		/* 文字提示 */.file-input-wrapper span {
		  display: inline-block;
		  white-space: nowrap;
		  color: #555;
		}
	/* 选择文件区结尾 */
	
/* 图片上传区结尾 */	
	
	
/* 文件清单区 */
	.asset-group {
	  display: flex;
	  flex-wrap: wrap; /* 多行自动换行，防止过窄溢出 */
	  flex-direction: row;
	  gap: 16px;       /* 子组之间留白 */
	  padding: 12px
	}
	/* 每个子分组样式 */.asset-subgroup {
	  width: calc((100% - 32px) / 3);
	  height: 612px;              /* 或你想要的固定高度 */
	  display: flex;
	  flex-direction: column;
	  border: 1px solid #ccc;
	  border-radius: 8px;
	  padding: 12px;
	  background-color: #f9f9f9;
	  box-sizing: border-box;
	}
	.file-list {
	  flex: 1 1 auto;            /* 填满剩余空间 */
	  overflow-y: auto;          /* 内容超出时滚动 */
	  margin-bottom: 12px;       /* 留出分页控件间距 */
	  padding-right: 4px;        /* 防止滚动条遮挡内容 */
	  list-style: none;
	  scrollbar-width: thin;  /* 现代浏览器更细的滚动条 */
	  padding: 4px;
	  margin: 0 0 16px 0;
	}
	/* 单个文件项样式 */.file-item {
	  display: flex;
	  align-items: center;
	  padding: 8px 12px;
	  border: 1px solid #ccc;
	  border-radius: 6px;
	  margin-bottom: 6px;
	  background-color: #fafafa;
	  color: #555; /* 加上字体颜色，更浅一些 */
	}
	/* 复选框间距 */input[type="checkbox"] {
	  margin-right: 10px;
	}
	/* 删除按钮样式 */.delete-button {
	  padding: 10px 16px;
	  background-color: #e74c3c;
	  color: white;
	  border: none;
	  border-radius: 6px;
	  cursor: pointer;
	  margin-top: 2px;
	}
	.pageController {
		padding: 4px;
		display: flex;
		flex-wrap: wrap;
		flex-direction: row;
		justify-content: space-evenly; /* 均匀分布子元素，首尾也留间距 */
	}
	.pageController span {
	  color: black;
	}
	.delete-button:hover {
	  background-color: #c0392b;
	}
/* 文件清单区结尾 */

/* 公共资源区 */ 
	/* 按钮区 */
	/* 普通按钮 */button {
	  padding: 10px;
	  height: 40px;
	  box-sizing: border-box;
	  font-size: 14px;
	  background-color: #007bff;
	  color: white;
	  border: none;
	  border-radius: 4px;
	  cursor: pointer;
	}
	button:disabled {
	  background-color: #ccc;
	  cursor: not-allowed;
	  opacity: 0.7; /* 更明显的禁用状态 */
	}
	/* 按钮区结尾 */
</style>
