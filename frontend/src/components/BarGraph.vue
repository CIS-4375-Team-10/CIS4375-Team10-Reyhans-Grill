<template>
  <div class="bargraph-container">
    <div class="header">

      <div class="left-section">
        <h2>Inventory Expenses</h2>

        <!-- YEAR SELECTOR  ----------------------->
        <select v-model="selectedYear" class="year-select" :disabled="!availableYears.length">
          <option v-if="!availableYears.length" value="" disabled>No data</option>
          <option v-for="year in availableYears" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
      </div>

      <!-- TIME BUTTONS  --------------------------->
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
import { computed, onMounted, ref, watch } from 'vue'
import { useInventoryStore } from '../stores/inventoryStore'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const inventoryStore = useInventoryStore()

const timePeriods = ['Day', 'Week', 'Month', 'Year']
const selectedPeriod = ref('Week')
const selectedYear = ref(null)

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

onMounted(() => {
  if (!inventoryStore.items.length && !inventoryStore.loading.items) {
    inventoryStore.fetchItems().catch(error => console.error(error))
  }
})

const inventoryItems = computed(() => inventoryStore.items ?? [])

const parseDate = (value) => {
  if (!value) return null
  const normalized = value.includes('T') ? value : `${value}T00:00:00`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

const availableYears = computed(() => {
  const years = Array.from(
    new Set(
      inventoryItems.value
        .map(item => parseDate(item.purchaseDate)?.getFullYear())
        .filter(Boolean)
    )
  ).sort((a, b) => a - b)
  return years
})

watch(availableYears, years => {
  if (!years.length) {
    selectedYear.value = null
    return
  }
  if (!selectedYear.value || !years.includes(selectedYear.value)) {
    selectedYear.value = years[years.length - 1]
  }
}, { immediate: true })

const filteredRecords = computed(() => {
  if (!selectedYear.value) return []
  return inventoryItems.value
    .map(item => {
      const date = parseDate(item.purchaseDate)
      const amount =
        Number(item.unitCost ?? 0) * Number(item.quantityInStock ?? 0)
      return {
        itemId: item.itemId,
        date,
        amount: Number.isFinite(amount) ? amount : 0
      }
    })
    .filter(record => record.date && !Number.isNaN(record.date.getTime()) && record.date.getFullYear() === selectedYear.value && record.amount > 0)
})

const getIsoWeekNumber = (date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil(((target - yearStart) / 86400000 + 1) / 7)
}

const totalsByPeriod = computed(() => {
  const dayTotals = Array(7).fill(0)
  const monthTotals = Array(12).fill(0)
  const weekTotals = new Map()
  let yearTotal = 0

  filteredRecords.value.forEach(record => {
    const date = record.date
    const cost = record.amount

    const weekday = (date.getDay() + 6) % 7
    dayTotals[weekday] += cost

    monthTotals[date.getMonth()] += cost

    const week = getIsoWeekNumber(date)
    weekTotals.set(week, (weekTotals.get(week) ?? 0) + cost)

    yearTotal += cost
  })

  const weekLabels = Array.from(weekTotals.keys()).sort((a, b) => a - b)
  const weekData = weekLabels.map(week => Number(weekTotals.get(week).toFixed(2)))

  return {
    Day: {
      labels: DAY_LABELS,
      data: dayTotals.map(value => Number(value.toFixed(2)))
    },
    Week: {
      labels: weekLabels.map(week => `W${week}`),
      data: weekData
    },
    Month: {
      labels: MONTH_LABELS,
      data: monthTotals.map(value => Number(value.toFixed(2)))
    },
    Year: {
      labels: selectedYear.value ? [String(selectedYear.value)] : [],
      data: selectedYear.value ? [Number(yearTotal.toFixed(2))] : []
    }
  }
})

const chartData = computed(() => {
  const period = selectedPeriod.value
  const dataset = totalsByPeriod.value[period] ?? { labels: [], data: [] }
  const labels = dataset.labels.length ? dataset.labels : ['No data']
  const data = dataset.labels.length ? dataset.data : [0]

  return {
    labels,
    datasets: [
      {
        label: 'Cost ($)',
        data,
        backgroundColor: '#2f7057',
        borderColor: '#2f7057',
        borderWidth: 1,
        borderRadius: 8
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
        label: context => `$${context.parsed.y}`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { callback: value => `$${value}` },
      grid: { color: 'rgba(0,0,0,0.1)' }
    },
    x: {
      grid: { color: 'rgba(0,0,0,0.1)' }
    }
  }
}

</script>

<style scoped>
.bargraph-container {
  background-color: #9f9d9d;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.year-select {
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  border: 1px solid #2f7057;
  background: #fff;
  font-weight: 600;
  color: #2f7057;
}

.time-filter {
  display: flex;
  gap: 0.5rem;
}

.time-button {
  padding: 0.35rem 0.75rem;
  border: none;
  border-radius: 8px;
  background-color: #2f7057;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
}

.time-button.active {
  background-color: #1a4a3a;
}

.chart-wrapper {
  flex: 1;
  min-height: 260px;
}
</style>
