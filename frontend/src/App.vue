<script setup>
import Navbar from './components/Navbar.vue'
</script>

<template>
  <div id="app">
    <Navbar />        <!-- Navigation menu -->
    <router-view />   <!-- Page content will appear here -->
  </div>
</template>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  padding: 20px;
}
</style>
