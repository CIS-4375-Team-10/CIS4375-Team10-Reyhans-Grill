<template>
  <nav v-if="isAuthenticated">
    <div class="brand">Reyhan’s Grill Inventory</div>
    <ul>
      <li><router-link to="/dashboard">Dashboard</router-link></li>
      <li><router-link to="/materials">Materials</router-link></li>
      <li><router-link to="/utensils">Utensils</router-link></li>
      <li><router-link to="/reports">Reports</router-link></li>
      <li><button class="logout-btn" @click="logout">Logout</button></li>
    </ul>
  </nav>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isAuthenticated = ref(localStorage.getItem('isAuthenticated') === 'true')

// ✅ Watch localStorage changes to update Navbar automatically
watchEffect(() => {
  isAuthenticated.value = localStorage.getItem('isAuthenticated') === 'true'
})

function logout() {
  localStorage.removeItem('isAuthenticated')
  
  // ✅ Dispatch custom event so App.vue hides navbar immediately
  window.dispatchEvent(new Event('authChange'))
  
  router.push('/login')
}
</script>

<style scoped>
nav {
  background-color: #8B2E1D;
  color: #fff;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.brand {
  font-size: 1.4rem;
  font-weight: bold;
  letter-spacing: 1px;
  color: #FBBF24;
}

ul {
  list-style: none;
  display: flex;
  gap: 20px;
  margin: 0;
  padding: 0;
  align-items: center;
}

li a {
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s, transform 0.2s;
}

li a:hover {
  color: #FBBF24;
  transform: scale(1.05);
}

li a.router-link-active {
  border-bottom: 2px solid #FBBF24;
  padding-bottom: 2px;
}

.logout-btn {
  background-color: #D97706;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;
}

.logout-btn:hover {
  background-color: #FBBF24;
  color: #8B2E1D;
  transform: scale(1.05);
}
</style>
