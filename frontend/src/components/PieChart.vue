<template>
  <div class="p-4 bg-white rounded-2xl shadow-md">
    <Pie :data="pieChartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, ArcElement)

const props = defineProps({
  chartData: {
    type: Object,
    required: true
  }
})

const pieChartData = computed(() => props.chartData)

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        pointStyle: 'rectRounded'
      }
    }
  }
}
</script>

<style scoped>
div {
  height: 300px;
}
</style>
