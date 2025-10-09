<template>
  <nav>
    <ul>
      <li><router-link to="/">Dashboard</router-link></li>
      <li><router-link to="/materials">Materials</router-link></li>
      <li><router-link to="/utensils">Utensils</router-link></li>
      <li><router-link to="/reports">Reports</router-link></li>
    </ul>
  </nav>
</template>

<script setup>
  // No JavaScript needed for basic links
</script>

<style scoped>
nav {
  background-color: #c62828; /* red theme */
  padding: 10px;
}

ul {
  list-style: none;
  display: flex;
  gap: 20px;
  margin: 0;
  padding: 0;
}

li a {
  color: white;
  text-decoration: none;
  font-weight: bold;
}

li a.router-link-active {
  text-decoration: underline;
}
</style>
