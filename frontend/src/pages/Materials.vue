<template>
  <main class="materials-container">

    <h2 class="page-title">Materials Inventory</h2>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="group in foodGroups"
        :key="group.name"
        :class="['tab-button', { active: selectedGroup === group.name }]"
        @click="selectedGroup = group.name"
      >
        {{ group.icon }} {{ group.name }}
      </button>
    </div>

    <!-- Materials Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>Start Date</th>
            <th>Expected Expiration</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredMaterials" :key="item.name">
            <td>{{ item.name }}</td>
            <td>{{ item.startDate }}</td>
            <td>{{ item.expiration }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </main>
</template>

<script setup>
import Navbar from '../components/Navbar.vue'
import { ref, computed } from 'vue'

// Food groups with emoji icons
const foodGroups = [
  { name: 'Fruits', icon: '🍌'  },
  { name: 'Vegetables', icon: '🥦' },
  { name: 'Grains', icon: '🌾' },
  { name: 'Protein', icon: '🍗' },
  { name: 'Dairy', icon: '🥛' }  // Milk carton emoji
]
const selectedGroup = ref('Fruits')

// Hardcoded example materials with start and expiration dates
const materials = ref([
  { name: 'Apple', startDate: '2025-10-15', expiration: '2025-10-25', group: 'Fruits' },
  { name: 'Banana', startDate: '2025-10-16', expiration: '2025-10-22', group: 'Fruits' },
  { name: 'Carrot', startDate: '2025-10-14', expiration: '2025-10-30', group: 'Vegetables' },
  { name: 'Spinach', startDate: '2025-10-15', expiration: '2025-10-24', group: 'Vegetables' },
  { name: 'Rice', startDate: '2025-09-01', expiration: '2026-01-15', group: 'Grains' },
  { name: 'Bread', startDate: '2025-10-18', expiration: '2025-10-20', group: 'Grains' },
  { name: 'Chicken', startDate: '2025-10-17', expiration: '2025-10-21', group: 'Protein' },
  { name: 'Beef', startDate: '2025-10-16', expiration: '2025-10-23', group: 'Protein' },
  { name: 'Milk', startDate: '2025-10-14', expiration: '2025-10-18', group: 'Dairy' },
  { name: 'Cheese', startDate: '2025-10-10', expiration: '2025-11-05', group: 'Dairy' },
])

// Filter materials based on selected tab
const filteredMaterials = computed(() =>
  materials.value.filter(item => item.group === selectedGroup.value)
)
</script>

<style scoped>
.materials-container {
  padding: 2rem;
  background-color: #FFF7ED;
  min-height: 100vh;
}

/* Page title */
.page-title {
  font-size: 1.8rem;
  color: #8B2E1D;
  font-weight: 700;
  text-align: center;
  margin-bottom: 2rem;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.tab-button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 12px;
  background-color: #D97706;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 1rem;
}

.tab-button:hover {
  background-color: #8B2E1D;
}

.tab-button.active {
  background-color: #8B2E1D;
}

/* Table */
.table-container {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  margin: 0 auto;
  overflow: hidden; /* Prevent content from overflowing the box */
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed; /* This makes columns evenly spaced */
}

th, td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid #D1D5DB;
  word-wrap: break-word; /* Handle long text in cells */
}

th {
  color: #8B2E1D;
  font-weight: 700;
}

td {
  color: #3F2E2E;
  font-weight: 500;
}

/* Ensure all columns have equal width */
th:nth-child(1),
td:nth-child(1) {
  width: 33.33%;
}

th:nth-child(2),
td:nth-child(2) {
  width: 33.33%;
}

th:nth-child(3),
td:nth-child(3) {
  width: 33.33%;
}
</style>