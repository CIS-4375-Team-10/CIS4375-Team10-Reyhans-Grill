<template> 
  <main class="dashboard-container">
    <!-- Metrics Section -->
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
          <div class="icon">⚠️</div>
          <div class="info">
            <h3>Low Stock Items</h3>
            <p>{{ lowStockItems.join(', ') }}</p>
          </div>
        </div>

        <div class="card">
          <div class="icon">⏳</div>
          <div class="info">
            <h3>Expiring Soon</h3>
            <p>{{ expiringSoon.join(', ') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Pie Chart -->
    <div class="chart-container">
      <h2>Inventory Distribution</h2>
      <PieChart :chart-data="pieData" />
    </div>

  </main>
</template>

<script setup>
import PieChart from '../components/PieChart.vue'
import { ref, computed } from 'vue'

// Example hardcoded data
const totalMaterials = ref(520)
const utensilsInUse = ref(96)

// Pie chart example data
const pieData = ref({
  labels: ['Meat', 'Vegetables', 'Utensils', 'Other'],
  datasets: [
    {
      label: 'Inventory Distribution',
      data: [40, 30, 20, 10], // Hardcoded for now
      backgroundColor: ['#8B2E1D', '#D97706', '#FBBF24', '#FEEBC8']
    }
  ]
})

// Example materials array (hardcoded like in Materials.vue)
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

// Computed: Low stock items (qty <= 10)
const lowStockItems = computed(() =>
  materials.value.filter(item => item.quantity <=10).map(item => item.name)
)

// Computed: Expiring soon (expiration within 7 days)
const expiringSoon = computed(() => {
  const today = new Date()
  return materials.value
    .filter(item => {
      const expDate = new Date(item.expiration)
      const diffDays = (expDate - today) / (1000 * 60 * 60 * 24)
      return diffDays >= 0 && diffDays <= 7
    })
    .map(item => item.name)
})
</script>

<style scoped>
.dashboard-container {
  padding: 2rem;
  background-color: #FFF7ED;
  min-height: 100vh;
}

/* Section Title above metrics cards */
.metrics-title {
  font-size: 1.6rem;
  color: #8B2E1D;
  text-align: center;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

/* Cards Layout */
.cards-container {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center; /* center the cards */
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

/* Chart Container */
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
