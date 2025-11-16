<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')

function login() {
  // Use the correct credentials - admin/admin
  if (username.value === 'admin' && password.value === 'admin') {
    localStorage.setItem('isAuthenticated', 'true')
    
    // Trigger custom event to update navbar in App.vue
    window.dispatchEvent(new Event('authChange'))
    
    router.push('/dashboard')
  } else {
    error.value = 'Invalid credentials.';
  }
}
</script>

<template>
  <div class="login-container">
    <p class="brand-title">Reyhan's Grill I.M.S</p>
    <form @submit.prevent="login" class="login-form">
      <h2>Login</h2>
      <div class="form-group">
        <label>Username:</label>
        <input type="text" v-model="username" required>
      </div>
      <div class="form-group">
        <label>Password:</label>
        <input type="password" v-model="password" required>
      </div>
      <button type="submit">Login</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  flex-direction: column;
  gap: 1.5rem;
  background-color: #f7f3ef;
}

.brand-title {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  font-weight: 700;
  color: #8B2E1D;
  letter-spacing: 0.05em;
  text-align: center;
}

.login-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 300px;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #8B2E1D;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #A33A27;
}

.error {
  color: red;
  margin-top: 1rem;
}

.hint {
  color: #666;
  font-size: 0.9rem;
  margin-top: 1rem;
  text-align: center;
}
</style>
