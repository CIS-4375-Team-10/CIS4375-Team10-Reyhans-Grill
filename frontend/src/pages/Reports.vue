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
      <div class="card secondary-card">
        <h3>Cutlery Low Stock</h3>
        <p>{{ cutleryLowStock.length }}</p>
      </div>
      <div class="card secondary-card">
        <h3>Serving Low Stock</h3>
        <p>{{ servingLowStock.length }}</p>
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

    <!-- Recently Deleted Table -->
    <div class="table-container" v-if="deletedItems.length">
      <h3>Recently Deleted Items (auto removed after 7 days)</h3>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Category</th>
            <th>Deleted On</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in deletedItems" :key="item.itemId">
            <td>{{ item.itemName }}</td>
            <td>{{ item.quantityInStock }}</td>
            <td>{{ item.categoryName }}</td>
            <td>{{ formatDate(item.deletedAt) }}</td>
            <td>
              <button class="restore-button" @click="handleRestore(item)">
                Undo Delete
              </button>
            </td>
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
  if (!inventoryStore.deletedItems.length) {
    inventoryStore.fetchDeletedItems().catch(error => console.error(error))
  }
})

const loadingSummary = computed(() => inventoryStore.loading.summary)
const totalMaterials = computed(() => inventoryStore.totalMaterialsCount)
const totalQuantity = computed(() => inventoryStore.totalQuantity)
const lowStock = computed(() => inventoryStore.lowStockMaterials)
const expiringSoon = computed(() => inventoryStore.expiringSoonMaterials)
const cutleryLowStock = computed(() => inventoryStore.lowStockCutlery)
const servingLowStock = computed(() => inventoryStore.lowStockServing)
const deletedItems = computed(() => inventoryStore.deletedItems)

const handleRestore = async item => {
  try {
    await inventoryStore.restoreItem(item.itemId)
  } catch (error) {
    alert(error.message ?? 'Unable to restore item.')
  }
}

const formatDate = dateString => {
  if (!dateString) return '-'
  return dateString.slice(0, 10)
}
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
  background-color: #2f7057;
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 12px;
  text-align: center;
  font-weight: 600;
  min-width: 150px;
}

.secondary-card {
  background-color: #2f7057;;
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

.restore-button {
  background: #2563eb;
  border: none;
  color: #fff;
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.restore-button:hover {
  background: #1d4ed8;
}
</style>
