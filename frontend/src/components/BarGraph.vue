<!-- src/components/BarGraph.vue -->
<template>
  <div class="p-4 bg-white rounded-2xl shadow-md">
    <h2 class="text-xl font-bold mb-2 text-[#8B2E1D]">Weekly Inventory Cost</h2>
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const chartData = {
  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
  datasets: [
    {
      label: 'Cost ($)',
      backgroundColor: '#D97706',
      data: [250, 320, 280, 400],
      borderRadius: 8
    }
  ]
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false
}
</script>

<style scoped>
div {
  height: 300px;
}
</style>
