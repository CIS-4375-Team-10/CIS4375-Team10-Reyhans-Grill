<template>
  <main class="reports-container">
    <h2 class="page-title">Inventory Reports</h2>

    <div class="cards" v-if="!loadingSummary">
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
    <div v-else class="status-message">Loading report data...</div>

    <!-- Low Stock Table -->
    <div class="table-container" v-if="lowStock.length">
      <h3>Low Stock Items (qty <= 10)</h3>
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Qty</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in lowStock" :key="item.itemId">
            <td>{{ item.itemName }}</td>
            <td>{{ item.quantityInStock }}</td>
            <td>{{ item.categoryName }}</td>
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
          <tr v-for="item in expiringSoon" :key="item.itemId">
            <td>{{ item.itemName }}</td>
            <td>{{ item.quantityInStock }}</td>
            <td>{{ item.expirationDate }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'

import { useInventoryStore } from '../stores/inventoryStore'

const inventoryStore = useInventoryStore()

onMounted(() => {
  if (!inventoryStore.items.length) {
    inventoryStore.fetchItems().catch(error => console.error(error))
  }
  if (!inventoryStore.summary) {
    inventoryStore.fetchSummary().catch(error => console.error(error))
  }
})

const loadingSummary = computed(() => inventoryStore.loading.summary)
const totalMaterials = computed(() => inventoryStore.totalMaterialsCount)
const totalQuantity = computed(() => inventoryStore.totalQuantity)
const lowStock = computed(() => inventoryStore.lowStockMaterials)
const expiringSoon = computed(() => inventoryStore.expiringSoonMaterials)
</script>

<style scoped>
.reports-container {
  padding: 2rem;
  background-color: #FFF7ED;
  min-height: 100vh;
}

.page-title {
  font-size: 1.8rem;
  color: #8B2E1D;
  font-weight: 700;
  text-align: center;
  margin-bottom: 2rem;
}

.status-message {
  text-align: center;
  color: #8B2E1D;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.cards {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.card {
  background-color: #D97706;
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
  color: #8B2E1D;
  font-weight: 700;
  text-align: left;
}

td {
  color: #3F2E2E;
  font-weight: 500;
}
</style>
