<template>
  <div class="bargraph-container">
    <div class="header">
      <h2>Inventory Expenses</h2>
      <div class="time-filter">
        <button 
          v-for="period in timePeriods" 
          :key="period"
          :class="['time-button', { active: selectedPeriod === period }]"
          @click="selectedPeriod = period"
        >
          {{ period }}
        </button>
      </div>
    </div>
    <div class="chart-wrapper">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { ref, computed } from 'vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const selectedPeriod = ref('Week')
const timePeriods = ['Day', 'Week', 'Month']

const mockExpenseData = {
  Day: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [320, 280, 410, 350, 520, 480, 390]
  },
  Week: {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    data: [1250, 980, 1560, 1320]
  },
  Month: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    data: [5200, 4800, 6100, 5500, 7200, 6800, 5900, 6300, 5800, 6700, 7100, 8000]
  }
}

const chartData = computed(() => {
  const periodData = mockExpenseData[selectedPeriod.value] || mockExpenseData.Week
  return {
    labels: periodData.labels,
    datasets: [
      {
        label: 'Cost ($)',
        backgroundColor: '#2f7057',
        data: periodData.data,
        borderRadius: 8,
        borderColor: '#2f7057',
        borderWidth: 1
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => `$${context.parsed.y}`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { callback: (value) => '$' + value },
      grid: { color: 'rgba(0, 0, 0, 0.1)' }
    },
    x: { grid: { color: 'rgba(0, 0, 0, 0.1)' } }
  }
}
</script>

<style scoped>
.bargraph-container {
  background-color: #fff;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 350px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.header h2 {
  color: #2f7057;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.time-filter {
  display: flex;
  gap: 0.5rem;
}

.time-button {
  padding: 0.35rem 0.75rem; /* smaller button */
  border: none;
  border-radius: 8px;
  background-color: #2f7057;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.85rem;
  white-space: nowrap; /* prevent stretch */
}

.time-button:hover { background-color: #256350; }
.time-button.active { background-color: #1a4a3a; }

.chart-wrapper {
  flex: 1;
  min-height: 250px; /* ensures chart fits nicely */
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .time-button {
    font-size: 0.75rem;
    padding: 0.3rem 0.6rem;
  }
}
</style>
