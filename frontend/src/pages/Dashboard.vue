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

    <section class="alerts-section">
      <div class="alerts-header">
        <h2>Inventory Alerts</h2>
        <p>These values come from the thresholds selected when adding inventory items.</p>
      </div>
      <div class="alert-card-grid">
        <div class="alert-card">
          <div class="alert-label">Low Stock Alert Threshold</div>
          <p class="alert-description">
            Items here correspond with stock alert inputted in materials page.
          </p>
          <ul v-if="lowStockAlerts.length" class="alert-list">
            <li v-for="item in lowStockAlerts" :key="item.itemId">
              <span class="alert-item-name">{{ item.itemName }}</span>
              <span class="alert-item-meta">{{ formatAlertQuantity(item) }}</span>
            </li>
          </ul>
          <p v-else class="alert-empty">All items are above the alert threshold.</p>
        </div>
        <div class="alert-card">
          <div class="alert-label">Expiring Soon Alert Threshold (days)</div>
          <p class="alert-description">
            Items here correspond with expiration date inputted in materials page.
          </p>
          <ul v-if="expiringAlerts.length" class="alert-list">
            <li v-for="item in expiringAlerts" :key="item.itemId">
              <span class="alert-item-name">{{ item.itemName }}</span>
              <span class="alert-item-meta">
                {{ formatAlertQuantity(item) }}
                •
                {{ formatAlertExpiry(item.expirationDate) }}
              </span>
            </li>
          </ul>
          <p v-else class="alert-empty">No materials are within the alert window.</p>
        </div>
      </div>
    </section>

    <!-- Charts Section -->
    <div class="charts-grid">
      <!-- Pie Chart -->
      <div class="chart-wrapper">
        <div class="chart-container">
          <h2>Inventory Distribution</h2>
          <div class="chart-inner">
            <PieChart :chart-data="pieData" />
          </div>
          <div v-if="categoryBreakdown.length" class="category-table">
            <div class="category-row" v-for="entry in categoryBreakdown" :key="entry.label">
              <span class="category-name">{{ entry.label }}</span>
              <span class="category-value">{{ formatCategoryValue(entry.value) }}</span>
            </div>
          </div>
          <p v-else class="category-empty">No inventory data yet.</p>
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
  if (!inventoryStore.purchases.length) {
    inventoryStore.fetchPurchases().catch(error => console.error(error))
  }
})

// Show the total quantity of materials in stock (not just unique SKUs)
const totalMaterials = computed(() => inventoryStore.materialsQuantity)
const utensilsInUse = computed(() => inventoryStore.utensilsQuantity)
const weeklyCost = computed(() => inventoryStore.weeklyCostTotal.toFixed(2))
const lowStockItems = computed(() => inventoryStore.lowStockMaterials.map(item => item.itemName))
const expiringSoon = computed(() => inventoryStore.expiringSoonMaterials.map(item => item.itemName))
const lowStockAlerts = computed(() => inventoryStore.lowStockMaterials)
const expiringAlerts = computed(() => inventoryStore.expiringSoonMaterials)
const formatAlertQuantity = (item) => {
  const qty = Number(item.quantityInStock ?? 0)
  const unit = item.unit ? ` ${item.unit}` : ''
  return `${qty}${unit}`.trim()
}
const formatAlertExpiry = (date) => {
  if (!date) return 'No expiration'
  return date.slice(0, 10)
}

const formatCategoryValue = value =>
  Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })

const categoryBreakdown = computed(() => {
  const sourceItems = inventoryStore.items.length ? inventoryStore.items : inventoryStore.materials
  if (!sourceItems.length) {
    return []
  }

  const totals = sourceItems.reduce((acc, item) => {
    const key = item.categoryName ?? item.itemType ?? 'Other'
    acc[key] = (acc[key] ?? 0) + Number(item.quantityInStock ?? 0)
    return acc
  }, {})

  return Object.entries(totals)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
})

const pieData = computed(() => {
  if (!categoryBreakdown.value.length) {
    return fallbackChartData
  }

  return {
    labels: categoryBreakdown.value.map(entry => entry.label),
    datasets: [
      {
        label: 'Inventory Distribution',
        data: categoryBreakdown.value.map(entry => entry.value),
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

.alerts-section {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.alerts-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.alerts-header h2 {
  margin: 0;
  color: #2f7057;
}

.alerts-header p {
  margin: 0;
  color: #4b5563;
  font-size: 0.95rem;
}

.alert-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.alert-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  background-color: #f9fafb;
}

.alert-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #2f7057;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.alert-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0.25rem 0 0.5rem;
}

.alert-description {
  margin: 0;
  color: #4b5563;
  font-size: 0.9rem;
  line-height: 1.4;
}

.alert-list {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.alert-list li {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #1f2937;
}

.alert-item-name {
  font-weight: 600;
}

.alert-item-meta {
  color: #4b5563;
  font-size: 0.85rem;
  text-align: right;
}

.alert-empty {
  margin: 0.75rem 0 0;
  color: #6b7280;
  font-size: 0.9rem;
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

.category-table {
  margin-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.category-row {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0;
  font-weight: 600;
  color: #1f4e3d;
}

.category-value {
  color: #2563eb;
}

.category-empty {
  margin-top: 1rem;
  text-align: center;
  color: #6b7280;
  font-weight: 600;
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

  .alert-card-grid {
    grid-template-columns: 1fr;
  }

  .alert-value {
    font-size: 1.6rem;
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

