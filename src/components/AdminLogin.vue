<!-- src/componentsAdminLogin.vue -->
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
	  console.log("Login attempt initiated");

	  if (!this.username || !this.password) {
		this.errorMessage = "用户名和密码不能为空！";
		console.log("Error: Username or password is missing.");
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
		  console.log("Login successful, redirecting...");
		  localStorage.setItem('redirectToken', redirectToken);
		  this.$router.push('/dashboard');  // 登录成功后跳转到 Dashboard
		} else {
		  this.errorMessage = response.data.message || "登录失败，请重试！";
		  console.log("Error: Login failed, message: ", this.errorMessage);
		}
	  } catch (error) {
		this.errorMessage = error.response ? error.response.data.message : "发生未知错误，请重试！";
		console.log("Error response: ", error.response?.data);
	  } finally {
		this.loading = false;
	  }
	}
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
  background: #333; /* 背景色也改深一点，以搭配白字 */
  color: white; /* 默认文字颜色白色 */
}

h2 {
  color: white; /* 标题颜色为白色 */
  text-align: center;
  margin-bottom: 20px;
}

form div {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  color: white; /* 标签颜色为白色 */
}

input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
  color: white; /* 输入框文字颜色为白色 */
  background-color: #444; /* 输入框背景深灰 */
  border: 1px solid #ccc;
  border-radius: 4px;
}

input::placeholder {
  color: #bbb; /* 占位符颜色为淡灰 */
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
  color: #ff6666; /* 错误信息颜色为亮红 */
  margin-top: 10px;
  font-size: 14px;
  text-align: center;
}
</style>
