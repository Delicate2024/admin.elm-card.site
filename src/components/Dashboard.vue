<!-- src/components/Dashboard.vue -->
<template>
	<div v-if="loading">
		<h2>加载中...</h2>
	</div>

	<div v-else-if="authenticated">
		<h2>欢迎来到 Dashboard</h2>
		<p>你已成功登录，可以上传图片资源。</p>
		
		<!-- 图片上传区 -->
		<div class="upload-group">
			<h4>文件上传</h4>
			<!-- 上传成功消息 --><div v-if="uploadSuccess" class="success-message"> ✓ 上传成功！已上传{{ uploadedCount }}个文件 </div>
			<!-- 上传失败消息 --><div v-if="uploadError" class="error-message"> ⚠ {{ errorMessage }} </div>
			<!-- 文件上传控件 --><div class="upload-row">
				<label class="file-input-wrapper">
					<input type="file" ref="fileInput" accept="image/*" multiple @change="handleImageChange" />
					<span v-if="webpFiles.length > 0"> 已选中{{ webpFiles.length }}个图片 </span>
					<span v-else>选择文件</span>
				</label>
				<button @click="uploadImages" :disabled="!webpFiles.length || uploading"> {{ uploading ? '上传中...' : '上传图片' }} </button>
			</div>
		</div>
		
		<!-- 文件清单区 -->
		<div class="upload-group">
			<div class="asset-group">
				<div v-for="(files, type) in paginatedAssets" :key="type" class="asset-subgroup">
					<h4>{{ formatAssetType(type) }}</h4>
					<!-- 列表控件 -->
					<ul class="file-list">
						<li v-for="(file, index) in files" :key="file.name" class="file-item">
							<input type="checkbox" v-model="selectedFiles" :value="{ type, name: file.name }" :id="`${type}-${file.name}`" />
							<label :for="`${type}-${file.name}`">{{ file.name }}</label>
						</li>
					</ul>
					<!-- 分页控件 --><div class="pageController">
						<button @click="changePage(currentPage - 1)" :disabled="currentPage <= 1">上一页</button>
						<span>第 {{ currentPage }}/{{ totalPages }} 页</span>
						<button @click="changePage(currentPage + 1)">下一页</button>
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
const currentPage = ref(1); // 当前页
const pageSize = ref(7);    // 每页显示的文件数
const totalPages = computed(() => {
  const totalFiles = Object.values(assets.value).reduce((acc, files) => acc + files.length, 0);
  return Math.max(1,Math.ceil(totalFiles / pageSize.value));
});


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
const handleImageChange = async (event) => {
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
const uploadFiles = async (options) => {
  const {
    fieldName,
    files,
    url = '/api/uploadAssets',
  } = options;
	uploading.value = true;
	uploadSuccess.value = false;
	uploadError.value = false;
	errorMessage.value = ''; // 可选：显示错误原因
	try {
	  const csrfToken = localStorage.getItem('csrfToken');

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

	  const results = await Promise.allSettled(uploadPromises);

	  const successCount = results.filter(r => r.status === 'fulfilled').length;
	  const failCount = results.filter(r => r.status === 'rejected').length;

	  uploadedCount.value = successCount;

	  if (failCount > 0) {
		uploadError.value = true;
		errorMessage.value = `共 ${failCount} 个文件上传失败`;
		console.warn(`${failCount} files failed to upload`, results.filter(r => r.status === 'rejected'));
	  } else {
		uploadSuccess.value = true;
		setTimeout(() => uploadSuccess.value = false, 3000);
	  }
	  
	  return {
		  successCount,
		  failCount,
		  results,
	  };

	} catch (err) {
	  uploadError.value = true;
	  errorMessage.value = '上传过程中发生未知错误';
	  console.error('Unexpected error during upload:', err);
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
const paginatedAssets = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  const result = {};
  for (const [type, files] of Object.entries(assets.value)) {
    result[type] = files.slice(start, end);
  }
  return result;
});
const changePage = (page) => {
  if (page < 1 || page > totalPages.value) currentPage.value = 1;
  else currentPage.value = page;
};

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
		.upload-group {
		  border: 1px solid #ddd;
		  padding: 12px;
		  margin-bottom: 16px;
		  border-radius: 8px;
		  background-color: #fff;
		}
		.upload-group h4 {
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
	  width: 960px;
	  border: 1px solid #ddd;
	  padding: 12px;
	  margin-bottom: 16px;
	  border-radius: 8px;
	  background-color: #fff;
	  display: flex;
	  flex-wrap: wrap; /* 多行自动换行，防止过窄溢出 */
	  gap: 16px;       /* 子组之间留白 */
	  flex-direction: row;
	}
	/* 每个子分组样式 */.asset-subgroup {
	  width: calc((100% - 32px) / 3);
	  height: 320px;              /* 或你想要的固定高度 */
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
	  margin-bottom: 16px;       /* 留出分页控件间距 */
	  padding-right: 4px;        /* 防止滚动条遮挡内容 */
	  list-style: none;
	  scrollbar-width: thin;  /* 现代浏览器更细的滚动条 */
	  padding: 0;
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
	  align-self: flex-end;
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
