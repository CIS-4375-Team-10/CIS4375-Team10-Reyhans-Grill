<template> 
  <main class="dashboard-container">
    <div class="metrics-section">
      <h2 class="metrics-title">Material Usage Breakdown</h2>

      <div class="cards-container">
        <div class="card">
          <div class="icon">🥩</div>
          <div class="info">
            <h3>Total Materials</h3>
            <p>{{ totalMaterials }}</p>
          </div>
        </div>

        <div class="card">
          <div class="icon">🍴</div>
          <div class="info">
            <h3>Utensils in Use</h3>
            <p>{{ utensilsInUse }}</p>
          </div>
        </div>

        <div class="card">
          <div class="icon">💰</div>
          <div class="info">
            <h3>Weekly Cost ($)</h3>
            <p>{{ weeklyCost }}</p>
          </div>
        </div>

        <div class="card">
          <div class="icon">⚠️</div>
          <div class="info">
            <h3>Low Stock Items</h3>
            <p>{{ lowStockItems.join(', ') || 'None' }}</p>
          </div>
        </div>

        <div class="card">
          <div class="icon">⏳</div>
          <div class="info">
            <h3>Expiring Soon</h3>
            <p>{{ expiringSoon.join(', ') || 'All good' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-grid">
      <!-- Pie Chart -->
      <div class="chart-wrapper">
        <div class="chart-container">
          <h2>Inventory Distribution</h2>
          <div class="chart-inner">
            <PieChart :chart-data="pieData" />
          </div>
        </div>
      </div>

      <!-- Bar Chart with Time Filter -->
      <div class="chart-wrapper">
        <BarGraph />
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import PieChart from '../components/PieChart.vue'
import BarGraph from '../components/BarGraph.vue'
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

const chartColors = ['#2f7057', '#3a8263', '#45946f', '#50a67b', '#5bb887', '#66ca93']
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
  padding: 1.5rem;
  background-color: #FFF7ED;
  min-height: 100vh;
  width: 100%;       
  box-sizing: border-box; 
  }


.metrics-title {
  font-size: 1.6rem;
  color: #2f7057;
  text-align: center;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.cards-container {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 2rem;
}

.card {
  background-color: #fff;
  flex: 1 1 180px;
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  min-width: 160px;
}

.card:hover {
  transform: scale(1.02);
}

.icon {
  font-size: 2rem;
  margin-right: 0.75rem;
}

.info h3 {
  margin: 0;
  font-size: 1rem;
  color: #2f7057;
}

.info p {
  margin: 0.25rem 0 0 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: #2f7057;
}

/* Charts Grid Layout */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  width: 100%;
}

.chart-wrapper {
  display: flex;
  flex-direction: column;
}

.chart-container {
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 350px;
}

.chart-container h2 {
  color: #2f7057;
  margin: 0 0 1rem 0;
  font-size: 1.3rem;
  text-align: center;
}

.chart-inner {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 250px;
}

/* Responsive design */
@media (max-width: 1024px) {
  .dashboard-container {
    padding: 1rem;
  }
  
  .charts-grid {
    gap: 1rem;
  }
  
  .chart-container {
    padding: 1rem;
    min-height: 320px;
  }
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .card {
    flex: 1 1 140px;
    min-width: 140px;
  }
  
  .icon {
    font-size: 1.8rem;
  }
  
  .info h3 {
    font-size: 0.9rem;
  }
  
  .info p {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .cards-container {
    gap: 0.75rem;
  }
  
  .card {
    flex: 1 1 120px;
    min-width: 120px;
    padding: 0.75rem;
  }
  
  .icon {
    font-size: 1.5rem;
    margin-right: 0.5rem;
  }
}
</style>