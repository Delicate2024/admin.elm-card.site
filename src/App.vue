<!-- src/App.vue -->
<template>
  <!-- 横屏提示蒙层 -->
  <div v-if="showOrientationWarning" class="orientation-warning">
    请将手机横屏显示以获得更好的体验
  </div>

  <!-- 路由页面 -->
  <router-view />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isPortrait = ref(false)
const isMobile = ref(false)
const showOrientationWarning = ref(false)

function checkOrientation() {
  isPortrait.value = window.matchMedia("(orientation: portrait)").matches
  isMobile.value = window.innerWidth <= 768
  showOrientationWarning.value = isPortrait.value && isMobile.value
}

onMounted(() => {
  checkOrientation()
  window.addEventListener('resize', checkOrientation)
  window.addEventListener('orientationchange', checkOrientation)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkOrientation)
  window.removeEventListener('orientationchange', checkOrientation)
})
</script>

<style scoped>
/* 横屏提示蒙层样式 */
.orientation-warning {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #fff8dc;
  color: #d35400;
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2em;
  text-align: center;
  padding: 2em;
  box-sizing: border-box;
}
</style>
