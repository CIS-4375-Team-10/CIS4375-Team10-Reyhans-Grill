<template>
  <main class="reports-container">
    <h2 class="page-title">Inventory Reports</h2>

    <!-- Summary Cards -->
    <div class="cards">
      <div class="card">
        <h3>Total Materials</h3>
        <p>{{ totalMaterials }}</p>
      </div>
      <div class="card">
        <h3>Total Quantity</h3>
        <p>{{ totalQuantity }}</p>
      </div>
      <div class="card">
        <h3>Low Stock Items</h3>
        <p>{{ lowStock.length }}</p>
      </div>
      <div class="card">
        <h3>Expiring Soon</h3>
        <p>{{ expiringSoon.length }}</p>
      </div>
    </div>

    <!-- Low Stock Table -->
    <div class="table-container" v-if="lowStock.length">
      <h3>Low Stock Items (qty ≤ 10)</h3>
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Qty</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in lowStock" :key="item.name">
            <td>{{ item.name }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.group }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Expiring Soon Table -->
    <div class="table-container" v-if="expiringSoon.length">
      <h3>Expiring Soon (next 7 days)</h3>
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Qty</th>
            <th>Expiration Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in expiringSoon" :key="item.name">
            <td>{{ item.name }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.expiration }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'

// Hardcoded materials (same as Materials.vue)
const materials = ref([
  { name: 'Apple', quantity: 50, startDate: '2025-10-15', expiration: '2025-10-25', group: 'Fruits' },
  { name: 'Banana', quantity: 30, startDate: '2025-10-16', expiration: '2025-10-22', group: 'Fruits' },
  { name: 'Carrot', quantity: 40, startDate: '2025-10-14', expiration: '2025-10-30', group: 'Vegetables' },
  { name: 'Spinach', quantity: 25, startDate: '2025-10-15', expiration: '2025-10-24', group: 'Vegetables' },
  { name: 'Rice', quantity: 100, startDate: '2025-09-01', expiration: '2026-01-15', group: 'Grains' },
  { name: 'Bread', quantity: 20, startDate: '2025-10-18', expiration: '2025-10-20', group: 'Grains' },
  { name: 'Chicken', quantity: 15, startDate: '2025-10-17', expiration: '2025-10-21', group: 'Protein' },
  { name: 'Beef', quantity: 10, startDate: '2025-10-16', expiration: '2025-10-23', group: 'Protein' },
  { name: 'Milk', quantity: 30, startDate: '2025-10-14', expiration: '2025-10-18', group: 'Dairy' },
  { name: 'Cheese', quantity: 25, startDate: '2025-10-10', expiration: '2025-11-05', group: 'Dairy' },
  { name: 'Cola', quantity: 60, startDate: '2025-10-01', expiration: '2026-01-01', group: 'Drinks' },
  { name: 'Orange Juice', quantity: 35, startDate: '2025-10-03', expiration: '2025-11-01', group: 'Drinks' },
  { name: 'Water Bottle', quantity: 80, startDate: '2025-10-05', expiration: '2027-10-05', group: 'Drinks' }
])

// Summary calculations
const totalMaterials = computed(() => materials.value.length)
const totalQuantity = computed(() => materials.value.reduce((sum, item) => sum + item.quantity, 0))

// Low stock: quantity ≤ 10
const lowStock = computed(() => materials.value.filter(item => item.quantity <= 10))

// Expiring soon: next 7 days
const expiringSoon = computed(() => {
  const today = new Date()
  const in7Days = new Date()
  in7Days.setDate(today.getDate() + 7)
  return materials.value.filter(item => {
    const exp = new Date(item.expiration)
    return exp >= today && exp <= in7Days
  })
})
</script>

<style scoped>
.reports-container {
  padding: 2rem;
  background-color: #f3f7f6;
  min-height: 100vh;
}

.page-title {
  font-size: 1.8rem;
  color: #143029;
  font-weight: 700;
  text-align: center;
  margin-bottom: 2rem;
}

.cards {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.card {
  background-color: #2f7057;
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 12px;
  text-align: center;
  font-weight: 600;
  min-width: 150px;
}

.table-container {
  background-color: #fff;
  border-radius: 16px;
  padding: 1rem;
  max-width: 900px;
  margin: 1rem auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

th, td {
  padding: 0.75rem;
  border-bottom: 1px solid #D1D5DB;
}

th {
  color: #143029;
  font-weight: 700;
  text-align: left;
}

td {
  color: #040303;
  font-weight: 550;
}
</style>
