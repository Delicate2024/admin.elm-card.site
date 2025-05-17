<template>
  <!-- 如果是手机端，显示提示信息 -->
  <div v-if="isMobile" class="mobile-warning">
    请使用电脑端访问本应用
  </div>

  <!-- 如果是桌面端，加载正常页面 -->
  <router-view v-else />
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isMobile = ref(false)

onMounted(() => {
  // 检测移动端设备
  const userAgent = navigator.userAgent.toLowerCase()
  const mobileRegex = /iphone|ipad|android|mobile|windows phone|blackberry/
  isMobile.value = mobileRegex.test(userAgent)

  // 也可以根据屏幕宽度判断（可选）
  // isMobile.value = window.innerWidth <= 768
})
</script>

<style scoped>
.mobile-warning {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: #d9534f;
  background-color: #f9f9f9;
  text-align: center;
  padding: 2rem;
}
</style>
