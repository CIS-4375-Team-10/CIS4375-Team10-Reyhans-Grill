<template>
  <div class="p-4 bg-white rounded-2xl shadow-md">
    <h2 class="text-xl font-bold mb-2 text-[#8B2E1D]"></h2>
    <Pie :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js'
ChartJS.register(Title, Tooltip, Legend, ArcElement)

const chartData = {
  labels: ['Meat', 'Vegetables', 'Sauce', 'Other'],
  datasets: [
    {
     backgroundColor: ['#2f7057', '#3a8263', '#45946f', '#50a67b'],
      data: [40, 30, 20, 10]
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
