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
      console.log("Login attempt initiated");  // 打印登录尝试开始
      if (!this.username || !this.password) {
        this.errorMessage = "用户名和密码不能为空！";
        console.log("Error: Username or password is missing."); // 打印用户名或密码为空
        return;
      }
      this.loading = true;
      this.errorMessage = '';
      
      try {
        console.log("Sending login request...");  // 打印发送请求
        const response = await axios.post('/api/login', {
          username: this.username,
          password: this.password,
        }, {
          withCredentials: true,  // 允许发送/接收跨域的 HttpOnly cookie
        });
        
        if (response.data.success) {
          console.log("Login successful, redirecting...");  // 打印登录成功
          this.$router.push('/dashboard');
        } else {
          this.errorMessage = response.data.message || "登录失败，请重试！";
          console.log("Error: Login failed, message: ", this.errorMessage);  // 打印登录失败信息
        }
      } catch (error) {
        if (error.response) {
          this.errorMessage = error.response.data.message || "登录失败，请重试！";
          console.log("Error response: ", error.response.data);  // 打印服务器返回的错误信息
        } else if (error.request) {
          this.errorMessage = "无法连接服务器，请稍后重试！";
          console.log("Error: No response received, request: ", error.request);  // 打印没有收到响应时的请求信息
        } else {
          this.errorMessage = "发生未知错误，请重试！";
          console.log("Error: Unknown error occurred: ", error.message);  // 打印未知错误信息
        }
      } finally {
        console.log("Login process completed.");  // 打印登录过程结束
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
  color: #333; /* 修改标签字体颜色为深灰色 */
}

input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
  color: #333; /* 修改输入框字体颜色为深灰色 */
  border: 1px solid #ccc;
  border-radius: 4px;
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
  color: #d9534f; /* 修改错误信息字体颜色为红色 */
  margin-top: 10px;
  font-size: 14px;
}
</style>
