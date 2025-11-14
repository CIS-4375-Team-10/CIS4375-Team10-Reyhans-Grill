<template>
  <nav v-if="isAuthenticated">
    <!-- Left: Logo + Name -->
    <div class="brand">
      <img src="@/assets/ReyhansGrillFinal.png" alt="Reyhan's Grill Logo" class="logo" />
      <span class="brand-name">Reyhan's Grill Inventory</span>
    </div>

    <!-- Navigation Links -->
    <ul>
      <li><router-link to="/dashboard">Dashboard</router-link></li>
      <li><router-link to="/materials">Materials</router-link></li>
      <li><router-link to="/utensils">Utensils</router-link></li>
      <li><router-link to="/reports">Reports</router-link></li>
      <li><router-link to="/orders">Orders</router-link></li>
      <li><button class="logout-btn" @click="logout">Logout</button></li>
    </ul>
  </nav>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isAuthenticated = ref(localStorage.getItem('isAuthenticated') === 'true')

// Watch localStorage changes to update Navbar automatically
watchEffect(() => {
  isAuthenticated.value = localStorage.getItem('isAuthenticated') === 'true'
})

function logout() {
  localStorage.removeItem('isAuthenticated')
  
  // Dispatch custom event so App.vue hides navbar immediately
  window.dispatchEvent(new Event('authChange'))
  
  router.push('/login')
}
</script>

<style scoped>
nav {
  background-color:  #1a3f31;
;
  color: #fff;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Brand / Logo + Name */
.brand {
  display: flex;
  align-items: center;
  gap: 10px; /* space between logo and name */
}

.logo {
  height: 50px;
  width: auto;
  object-fit: contain;
}

.brand-name {
  font-size: 1.3rem;
  font-weight: bold;
  color: white;
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
  color: #7dc9a2;
  transform: scale(1.05);
}

li a.router-link-active {
  border-bottom: 2px solid #10cba5;
  padding-bottom: 2px;
}

.logout-btn {
  background-color: #eca833;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;
}

.logout-btn:hover {
  background-color: #c87434;
  color: #150b01;
  transform: scale(1.05);
}
</style>
