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
          <div class="icon">💰</div>
          <div class="info">
            <h3>Weekly Cost ($)</h3>
            <p>{{ weeklyCost }}</p>
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
import Navbar from '../components/Navbar.vue'
import PieChart from '../components/PieChart.vue'
import { ref } from 'vue'

// Example hardcoded data
const totalMaterials = ref(120)
const utensilsInUse = ref(45)
const weeklyCost = ref(1250)

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
  color: #8B2E1D;  /* grill-red theme */
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
  font-size: 1.5rem;
  font-weight: bold;
  color: #3F2E2E;
}

/* Chart Container */
.chart-container {
  background-color: #fff;
  padding: 2rem 2rem;        /* top/bottom, left/right padding */
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 400px;          /* make box taller so chart fits */
}

/* Chart Title */
.chart-container h2 {
  color: #8B2E1D;
  margin: 0 0 1rem 0;
  font-size: 1.4rem;
  text-align: center;
}

/* Ensure PieChart fits inside card */
.chart-container canvas {
  max-width: 100% !important;
  max-height: 300px;          /* optional: keep chart from overflowing */
}
</style>
