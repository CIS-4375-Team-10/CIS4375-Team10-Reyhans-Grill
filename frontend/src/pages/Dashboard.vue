<template> 
  <main class="dashboard-container">
    <div class="metrics-section">
      <h2 class="metrics-title">Material Usage Breakdown</h2>

      <div class="cards-container">
        <div class="card">
          <div class="icon">??</div>
          <div class="info">
            <h3>Total Materials</h3>
            <p>{{ totalMaterials }}</p>
          </div>
        </div>

        <div class="card">
          <div class="icon">??</div>
          <div class="info">
            <h3>Utensils in Use</h3>
            <p>{{ utensilsInUse }}</p>
          </div>
        </div>

        <div class="card">
          <div class="icon">??</div>
          <div class="info">
            <h3>Weekly Cost ($)</h3>
            <p>{{ weeklyCost }}</p>
          </div>
        </div>

        <div class="card">
          <div class="icon">??</div>
          <div class="info">
            <h3>Low Stock Items</h3>
            <p>{{ lowStockItems.join(', ') || 'None' }}</p>
          </div>
        </div>

        <div class="card">
          <div class="icon">?</div>
          <div class="info">
            <h3>Expiring Soon</h3>
            <p>{{ expiringSoon.join(', ') || 'All good' }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-container">
      <h2>Inventory Distribution</h2>
      <PieChart :chart-data="pieData" />
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'

import PieChart from '../components/PieChart.vue'
import { useInventoryStore } from '../stores/inventoryStore'

const inventoryStore = useInventoryStore()

onMounted(() => {
  if (!inventoryStore.items.length) {
    inventoryStore.fetchItems().catch(error => console.error(error))
  }
  if (!inventoryStore.categories.length) {
    inventoryStore.fetchCategories().catch(error => console.error(error))
  }
  if (!inventoryStore.summary) {
    inventoryStore.fetchSummary().catch(error => console.error(error))
  }
})

const totalMaterials = computed(() => inventoryStore.totalMaterialsCount)
const utensilsInUse = computed(() => inventoryStore.utensilsInUse)
const weeklyCost = computed(() => inventoryStore.weeklyCostTotal.toFixed(2))
const lowStockItems = computed(() => inventoryStore.lowStockMaterials.map(item => item.itemName))
const expiringSoon = computed(() => inventoryStore.expiringSoonMaterials.map(item => item.itemName))

const pieData = computed(() => {
  if (!inventoryStore.materials.length) {
    return fallbackChartData
  }

  const counts = inventoryStore.materials.reduce((acc, material) => {
    const key = material.categoryName ?? 'Other'
    acc[key] = (acc[key] ?? 0) + Number(material.quantityInStock ?? 0)
    return acc
  }, {})

  return {
    labels: Object.keys(counts),
    datasets: [
      {
        label: 'Inventory Distribution',
        data: Object.values(counts),
        backgroundColor: chartColors
      }
    ]
  }
})

const chartColors = ['#8B2E1D', '#D97706', '#FBBF24', '#FEEBC8', '#FDBA74', '#C2410C']
const fallbackChartData = {
  labels: ['Meat', 'Vegetables', 'Utensils', 'Other'],
  datasets: [
    {
      label: 'Inventory Distribution',
      data: [40, 30, 20, 10],
      backgroundColor: chartColors
    }
  ]
}
</script>

<style scoped>
.dashboard-container {
  padding: 2rem;
  background-color: #FFF7ED;
  min-height: 100vh;
}

.metrics-title {
  font-size: 1.6rem;
  color: #8B2E1D;
  text-align: center;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.cards-container {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.card {
  background-color: #fff;
  flex: 1 1 200px;
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.card:hover {
  transform: scale(1.03);
}

.icon {
  font-size: 2.5rem;
  margin-right: 1rem;
}

.info h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #8B2E1D;
}

.info p {
  margin: 0.25rem 0 0 0;
  font-size: 1.2rem;
  font-weight: 500;
  color: #3F2E2E;
}

.chart-container {
  background-color: #fff;
  padding: 2rem 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 400px;
}

.chart-container h2 {
  color: #8B2E1D;
  margin: 0 0 1rem 0;
  font-size: 1.4rem;
  text-align: center;
}

.chart-container canvas {
  max-width: 100% !important;
  max-height: 300px;
}
</style>
