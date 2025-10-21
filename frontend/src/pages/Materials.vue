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

    <!-- ✅ Add New Material Form -->
    <form class="add-form" @submit.prevent="addMaterial">
      <input v-model="newMaterial.name" placeholder="Material Name" required />
      <select v-model="newMaterial.group" required>
        <option disabled value="">Select Category</option>
        <option v-for="group in foodGroups" :key="group.name" :value="group.name">
          {{ group.icon }} {{ group.name }}
        </option>
      </select>
      <input v-model.number="newMaterial.quantity" type="number" placeholder="Qty" required />
      <input v-model="newMaterial.startDate" type="date" required />
      <input v-model="newMaterial.expiration" type="date" required />
      <button type="submit">Add Material</button>
    </form>

    <!-- Materials Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>Qty</th>
            <th>Start Date</th>
            <th>Expected Expiration</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredMaterials" :key="item.name">
            <td>{{ item.name }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.startDate }}</td>
            <td>{{ item.expiration }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'

// Food groups with emoji icons
const foodGroups = [
  { name: 'Fruits', icon: '🍌' },
  { name: 'Vegetables', icon: '🥦' },
  { name: 'Grains', icon: '🌾' },
  { name: 'Protein', icon: '🍗' },
  { name: 'Dairy', icon: '🥛' },
  { name: 'Drinks', icon: '🥤' }
]

const selectedGroup = ref('Fruits')

// Hardcoded example materials
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

// For the new material form
const newMaterial = ref({
  name: '',
  quantity: null,
  startDate: '',
  expiration: '',
  group: ''
})

// Add material function
function addMaterial() {
  if (
    !newMaterial.value.name ||
    !newMaterial.value.quantity ||
    !newMaterial.value.startDate ||
    !newMaterial.value.expiration ||
    !newMaterial.value.group
  ) {
    alert('Please fill all fields')
    return
  }

  materials.value.push({ ...newMaterial.value })
  newMaterial.value = { name: '', quantity: null, startDate: '', expiration: '', group: '' }
}

// Filter by selected tab
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

/* ✅ Form Styles */
.add-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.add-form input,
.add-form select {
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #D1D5DB;
  font-size: 1rem;
  width: 180px;
}

.add-form button {
  background-color: #D97706;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.add-form button:hover {
  background-color: #8B2E1D;
}

/* Table */
.table-container {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 900px;
  margin: 0 auto;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

th, td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid #D1D5DB;
  word-wrap: break-word;
}

th {
  color: #8B2E1D;
  font-weight: 700;
}

td {
  color: #3F2E2E;
  font-weight: 500;
}

/* Equal width columns */
th:nth-child(1),
td:nth-child(1) {
  width: 25%;
}

th:nth-child(2),
td:nth-child(2) {
  width: 15%;
}

th:nth-child(3),
td:nth-child(3) {
  width: 30%;
}

th:nth-child(4),
td:nth-child(4) {
  width: 30%;
}
</style>
