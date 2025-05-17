<!-- src/components/Dashboard/FileHub.vue -->
<template>
	<div class="fileHub">
		<h2>欢迎来到 FileHub !!</h2>
		
		<!-- 图片上传区 -->
		<div class="column-group column-group--uploadAssets box section">
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
			<div class="upload-row">
				<label class="file-input-wrapper">
					<input type="file" ref="fileInput" accept="image/*" multiple @change="handleImageChange" />
					
					<!-- 上传提示文字 -->
					<span v-if="webpFiles.length > 0">
						已生成{{ webpFiles.length }}个webp图片，还剩{{ handleImageFiles.length - webpFiles.length}}个图片文件未被转换。
					</span>
					<span v-else>选择文件</span>
				</label>
				
				<!-- 上传按钮 -->
				<button
					class="standard-button"
					@click="uploadImages"
					:disabled="!webpFiles.length || (handleImageFiles.length - webpFiles.length) || uploading"
				>
					{{ uploading ? '上传中...' : '上传图片' }}
				</button>
			</div>
		</div>
		
		<!-- 文件清单区 -->
		<div class="column-group column-group--getAssets box section">
			<div class="asset-group">
			
				<!-- 单个分类子组 -->
				<div v-for="(files, type) in paginatedAssets" :key="type" class="asset-subgroup">
					<h4>{{ formatAssetType(type) }}({{ getTotalSize(assets[type] || []) }})</h4>
					
					<!-- 全选按钮控件 -->
					<div class="select-all label-checkbox">
						<input
							type="checkbox"
							:id="`select-all-${type}`"
							:checked="isPageSelected(type)"
							@change="toggleSelectAll(type)"
						/>
						<label :for="`select-all-${type}`">全选本页</label>
					</div>
					
					<!-- 列表控件 -->
					<ul class="file-list scrollable-list">
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
					
					<!-- 分页控件 -->
					<div class="pageController">
						<button
							class="standard-button"
							@click="changePage(type, getCurrentPage(type) - 1)"
							:disabled="getCurrentPage(type) <= 1"
						>上一页</button>
						
						<span>第 {{ getCurrentPage(type) }}/{{ totalPagesMap[type] }} 页</span>
						
						<button
							class="standard-button"
							@click="changePage(type, getCurrentPage(type) + 1)"
							:disabled="getCurrentPage(type) >= totalPagesMap[type]"
						>下一页</button>
					</div>
				</div><!-- 单个分类子组结尾 -->
				
			</div><!-- asset-group 结尾 -->
			
			<!-- 操作栏：批量操作 -->
			<div v-if="selectedFiles.length > 0" class="batch-actions">
				<span class="selected-summary">{{ selectedFileSummary }}</span>
				<button @click="deleteSelectedFiles" class="standard-button danger-button delete-button">
					删除选中的文件
				</button>
				<button class="standard-button" @click="selectedFiles = []">取消全选</button>
			</div>
		</div><!-- 文件清单区结尾 -->
	</div><!-- FileHub 主内容结尾 -->
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';

// 变量——上传区
const uploading = ref(false);
const handleImageFiles = ref([]);
const webpFiles = ref([]);
const uploadSuccess = ref(false);
const uploadError = ref(false);
const errorMessage = ref('');
const uploadedCount = ref(0);
const fileInput = ref(null);
const objectURLs = ref(new Set());

// 变量——清单区
const assets = ref({});
const selectedFiles = ref([]);
const pageSize = ref(10);
const currentPageMap = ref({});
const totalPagesMap = computed(() => {
	const result = {};
	for (const type in assets.value) {
		result[type] = Math.max(1, Math.ceil(assets.value[type].length / pageSize.value));
	}
	return result;
});
const getCurrentPage = (type) => currentPageMap.value[type] || totalPagesMap.value[type];

onMounted(() => {
	fetchAssets();
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

// 函数——清单区(又分列表区、全选区、分页区、删除区)
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
		if (response.data.success) {
			assets.value = response.data.assets;
		}
	} catch (err) {
		console.error('获取文件失败', err);
	}
};
function isPageSelected(type) {
	const currentFiles = paginatedAssets.value[type] || [];
	return currentFiles.every(file =>
		selectedFiles.value.some(selected => selected.type === type && selected.name === file.name)
	);
}
function toggleSelectAll(type) {
	const currentFiles = paginatedAssets.value[type] || [];
	const allSelected = isPageSelected(type);
	if (allSelected) {
		selectedFiles.value = selectedFiles.value.filter(
			selected => !currentFiles.some(file => selected.type === type && selected.name === file.name)
		);
	} else {
		const newSelections = currentFiles.filter(
			file => !selectedFiles.value.some(selected => selected.type === type && selected.name === file.name)
		).map(file => ({ type, name: file.name }));
		selectedFiles.value.push(...newSelections);
	}
}
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
const selectedFileSummary = computed(() => {
	const typeCountMap = {};
	selectedFiles.value.forEach(file => {
		typeCountMap[file.type] = (typeCountMap[file.type] || 0) + 1;
	});
	const total = selectedFiles.value.length;
	const typeLabels = { images: '图片', documents: '文档', audio: '音频' };
	const typeSummary = Object.entries(typeCountMap)
		.map(([type, count]) => `${typeLabels[type] || type} ${count}`)
		.join('，');
	return `已选中 ${total} 个文件(${typeSummary})`;
});
const deleteFile = async (type, name) => {
	try {
		const csrfToken = localStorage.getItem('csrfToken');
		await axios.post('/api/deleteAssetFile', { type, name }, {
			headers: {
				'X-CSRF-Token': csrfToken,
				'Content-Type': 'application/json',
			},
			withCredentials: true,
		});
	} catch (err) {
		console.error('删除失败:', err);
	}
};
const deleteSelectedFiles = async () => {
	if (selectedFiles.value.length === 0) return;
	await Promise.all(selectedFiles.value.map(file =>
		deleteFile(file.type, file.name)
	));
	fetchAssets();
	selectedFiles.value = [];
};

// 函数——工具区
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
/* ========== 公共通用类 ========== */
.box {
  box-sizing: border-box;
  border-radius: 0.4184vw;
  background-color: #fff;
  border: 0.0523vw solid #ddd;
}

.section {
  padding: 0.628vw;
  margin-bottom: 0.8375vw;
}

.standard-button {
  padding: 0.523vw;
  height: 4.2917vh;
  font-size: 0.732vw;
  border: none;
  border-radius: 0.2092vw;
  cursor: pointer;
  background-color: #007bff;
  color: white;
}
.standard-button:hover:not(:disabled) {
  background-color: #0056b3;
}
.standard-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}
.danger-button {
  background-color: #ff0000; 
  border-radius: 0.3138vw;
}
.danger-button:hover:not(:disabled){
  background-color: #a10000; 
}
button.delete-button {
  padding: 0.523vw 0.8375vw;
  margin-top: 0.2146vh;
}

.label-checkbox {
  display: flex;
  align-items: center;
  font-size: 0.732vw;
  font-weight: normal;
  color: black;
  margin-bottom: 0.2092vw;
}

/* ========== 基组件 ========== */
.fileHub {
  height: 90dvh;
  overflow-y: auto;
  padding: 0.8375vw;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ========== 图片上传区 ========== */
.success-message,
.error-message {
  height: 2.575vh;
  font-size: 0.732vw;
  padding-left: 0.2092vw;
  line-height: 1.4;
}
.success-message {
  color: green;
}
.error-message {
  color: #d9534f;
}

.column-group {
  width: 50.2096vw;
  border: 0.0523vw solid #ddd;
  padding: 0.628vw;
  margin-bottom: 0.8375vw;
  border-radius: 0.4184vw;
  background-color: #fff;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.column-group--uploadAssets {
  height: 13.9442vh;
  flex-shrink: 0;
  flex-grow: 0;
}
.column-group--getAssets {
  height: auto;
}
.column-group h4 {
  margin: 0 0 0.3138vw 0;
  color: #2c3e50;
  font-size: 0.8375vw;
}

.upload-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.628vw;
}

.file-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4184vw;
  flex: 1;
  height: 4.2917vh;
  padding: 0 0.628vw;
  background-color: #fff;
  border: 0.0523vw solid #ccc;
  border-radius: 0.2092vw;
  font-size: 0.732vw;
  box-sizing: border-box;
  cursor: pointer;
  position: relative;
}
.file-input-wrapper input[type="file"] {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.file-input-wrapper span {
  display: inline-block;
  white-space: nowrap;
  color: #555;
  font-size: 0.732vw;
}

/* ========== 文件清单区 ========== */
.asset-group {
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  gap: 0.8375vw;
  padding: 0 0.628vw;
}
.asset-subgroup {
  width: calc((100% - 1.674vw) / 3);
  height: 51.5021vh;
  display: flex;
  flex-direction: column;
  border: 0.0523vw solid #ccc;
  border-radius: 0.4184vw;
  padding: 0.628vw;
  background-color: #f9f9f9;
  box-sizing: border-box;
}

.select-all {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 0.2092vw;
  font-weight: normal;
  font-size: 0.732vw;
}
.select-all label {
  color: black;
}

.file-list {
  flex: 1 1 auto;
  overflow-y: auto;
  margin-bottom: 0.6438vh;
  padding-right: 0.2092vw;
  list-style: none;
  scrollbar-width: thin;
  padding: 0.2092vw;
  margin: 0 0 0.8375vw 0;
}
.file-item {
  display: flex;
  align-items: center;
  padding: 0.1184vw 0.628vw;
  border: 0.0523vw solid #ccc;
  border-radius: 0.3138vw;
  margin-bottom: 0.1438vw;
  background-color: #fafafa;
  font-size: 0.818vw;
  color: #555;  
}
input[type="checkbox"] {
  margin-right: 0.523vw;
}

.pageController {
  padding: 0.2092vw;
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  justify-content: space-evenly;
}
.pageController span {
  color: black;
}
.batch-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.628vw;
  margin-top: 0.6438vh;
  flex-wrap: wrap;
}
.selected-summary {
  color: #333;
}
</style>
