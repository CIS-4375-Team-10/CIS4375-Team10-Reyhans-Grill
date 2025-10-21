<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Navbar from './components/Navbar.vue'

const isAuthenticated = ref(localStorage.getItem('isAuthenticated') === 'true')

// Function to update auth state
const updateAuthState = () => {
  isAuthenticated.value = localStorage.getItem('isAuthenticated') === 'true'
}

// Listen for storage changes (from other tabs/windows)
const handleStorageChange = (event) => {
  if (event.key === 'isAuthenticated') {
    updateAuthState()
  }
}

// Listen for custom event from login component
const handleAuthChange = () => {
  updateAuthState()
}

onMounted(() => {
  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('authChange', handleAuthChange)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  window.removeEventListener('authChange', handleAuthChange)
})
</script>

<template>
  <div id="app">
    <Navbar v-if="isAuthenticated" />  <!-- Only show when authenticated -->
    <router-view />
  </div>
</template>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  padding: 20px;
}
</style>