<template>
  <main class="orders-container">
    <h2 class="page-title">Orders</h2>

    <div class="table-container">
      <div v-if="inventoryStore.loading.purchases" class="status-message">Loading purchases...</div>
      <div v-else-if="!purchases.length" class="status-message">No purchases to show yet.</div>
      <table v-else>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Item</th>
            <th>User</th>
            <th>Order Date</th>
            <th>Total ($)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="purchase in purchases" :key="purchase.purchaseId">
            <td>{{ purchase.purchaseId }}</td>
            <td>{{ purchase.itemName }}</td>
            <td>{{ purchase.username }}</td>
            <td>{{ purchase.purchaseDate }}</td>
            <td>{{ Number(purchase.totalCost).toFixed(2) }}</td>
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
  if (!inventoryStore.purchases.length) {
    inventoryStore.fetchPurchases().catch(error => console.error(error))
  }
})

const purchases = computed(() => inventoryStore.purchases)
</script>

<style scoped>
.orders-container {
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

.table-container {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 900px;
  margin: 0 auto;
  overflow: hidden;
}

.status-message {
  text-align: center;
  color: #8B2E1D;
  font-weight: 600;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid #D1D5DB;
}

th {
  color: #8B2E1D;
  font-weight: 700;
}

td {
  color: #3F2E2E;
  font-weight: 500;
}
</style>
