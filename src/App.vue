<!-- src/App.vue -->
<template>
  <router-view />
</template>

<script setup>
// 不再手动引入 AdminLogin，交由 router 管理
</script>

<style scoped>
@media screen and (orientation: portrait) {
  body::before {
    content: '请旋转手机横屏浏览';
    position: fixed;
    top: 0; left: 0;
    width: 100vw;
    height: 100vh;
    background-color: black;
    color: white;
    font-size: 5vw;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    text-align: center;
    padding: 20px;
  }

  #app {
    display: none;
  }
}
</style>
