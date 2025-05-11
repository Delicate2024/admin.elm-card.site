<template>
  <div class="login-container">
    <h2>管理员登录</h2>
    <form @submit.prevent="handleLogin">
      <div>
        <label for="username">用户名:</label>
        <input 
          type="text" 
          id="username" 
          v-model="username" 
          required 
          placeholder="请输入用户名" 
        />
      </div>
      <div>
        <label for="password">密码:</label>
        <input 
          type="password" 
          id="password" 
          v-model="password" 
          required 
          placeholder="请输入密码" 
        />
      </div>
      <button type="submit" :disabled="loading">
        <span v-if="loading">登录中...</span>
        <span v-else>登录</span>
      </button>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      errorMessage: '',
    };
  },
  methods: {
    async handleLogin() {
      if (!this.username || !this.password) {
        this.errorMessage = "用户名和密码不能为空！";
        return;
      }
      this.loading = true;
      this.errorMessage = '';
      
      try {
        const response = await axios.post('/api/login', {
          username: this.username,
          password: this.password,
        }, {
          withCredentials: true,  // 允许发送/接收跨域的 HttpOnly cookie
        });
        
        if (response.data.success) {
          // 服务器返回的登录成功状态
          this.$router.push('/dashboard');
        } else {
          this.errorMessage = response.data.message || "登录失败，请重试！";
        }
      } catch (error) {
        if (error.response) {
          this.errorMessage = error.response.data.message || "登录失败，请重试！";
        } else if (error.request) {
          this.errorMessage = "无法连接服务器，请稍后重试！";
        } else {
          this.errorMessage = "发生未知错误，请重试！";
        }
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background: #f9f9f9;
}

form div {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 10px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background: #38a169;
}

.error {
  color: red;
  margin-top: 10px;
}
</style>
