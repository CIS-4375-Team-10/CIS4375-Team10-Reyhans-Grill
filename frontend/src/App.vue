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

<style>
/* Reset default browser styles */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: #FFF7ED; 
  font-family: Avenir, Helvetica, Arial, sans-serif;
}

/* Make app container fill viewport */
#app {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 20px;
  background-color: inherit; 
}
</style>
