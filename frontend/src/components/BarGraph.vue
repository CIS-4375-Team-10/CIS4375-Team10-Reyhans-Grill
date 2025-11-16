<template>
  <div class="bargraph-container">
    <div class="header">

      <div class="left-section">
        <h2>Inventory Expenses</h2>

        <!-- YEAR SELECTOR  ----------------------->
        <select v-model="selectedYear" class="year-select">
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
import { ref, computed } from 'vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

// ---------- FILTERS ------------
const timePeriods = ["Day", "Week", "Month", "Year"]
const selectedPeriod = ref("Week")
const selectedYear = ref(2025)

const availableYears = [2023, 2024, 2025]

// ---------- MOCK EXPENSE DATA (3 YEARS) ----------
const mockExpenseData = {
  2023: {
    Day: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      data: [220, 180, 260, 210, 300, 280, 240]
    },
    Week: {
      labels: ["W1", "W2", "W3", "W4"],
      data: [900, 760, 1200, 950]
    },
    Month: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      data: [4200, 3800, 5100, 4700, 6000, 5800, 5200, 5400, 5000, 5900, 6200, 7000]
    },
    Year: {
      labels: ["2023"],
      data: [68000]   // 👈 Added this so 2023 shows properly
    }
  },

  2024: {
    Day: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      data: [260, 300, 350, 280, 420, 410, 390]
    },
    Week: {
      labels: ["W1", "W2", "W3", "W4"],
      data: [1100, 1000, 1450, 1320]
    },
    Month: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      data: [5000, 4800, 6500, 5900, 7200, 6900, 6300, 6700, 6200, 7100, 7400, 8200]
    },
    Year: {
      labels: ["2024"],
      data: [72000]
    }
  },

  2025: {
    Day: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      data: [320, 280, 410, 350, 520, 480, 390]
    },
    Week: {
      labels: ["W1", "W2", "W3", "W4"],
      data: [1250, 980, 1560, 1320]
    },
    Month: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      data: [5200, 4800, 6100, 5500, 7200, 6800, 5900, 6300, 5800, 6700, 7100, 8000]
    },
    Year: {
      labels: ["2025"],
      data: [78000]
    }
  }
}


// ---------- COMPUTED CHART DATA ----------
const chartData = computed(() => {
  const year = selectedYear.value
  const period = selectedPeriod.value

  const dataGroup = mockExpenseData[year][period]

  return {
    labels: dataGroup.labels,
    datasets: [
      {
        label: "Cost ($)",
        data: dataGroup.data,
        backgroundColor: "#2f7057",
        borderColor: "#2f7057",
        borderWidth: 1,
        borderRadius: 8
      }
    ]
  }
})

// ---------- CHART OPTIONS ----------
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
      ticks: { callback: value => "$" + value },
      grid: { color: "rgba(0,0,0,0.1)" }
    },
    x: {
      grid: { color: "rgba(0,0,0,0.1)" }
    }
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
