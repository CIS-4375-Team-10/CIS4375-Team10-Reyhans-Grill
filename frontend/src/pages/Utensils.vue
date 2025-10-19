<template>
  <main class="utensils-container">
    <h2 class="page-title">Utensils Inventory</h2>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="category in utensilCategories"
        :key="category.name"
        :class="['tab-button', { active: selectedCategory === category.name }]"
        @click="selectedCategory = category.name"
      >
        {{ category.icon }} {{ category.name }}
      </button>
    </div>

    <!-- ✅ Add New Utensil Form -->
    <form class="add-form" @submit.prevent="addUtensil">
      <input v-model="newUtensil.name" placeholder="Utensil Name" required />
      <select v-model="newUtensil.category" required>
        <option disabled value="">Select Category</option>
        <option v-for="category in utensilCategories" :key="category.name" :value="category.name">
          {{ category.icon }} {{ category.name }}
        </option>
      </select>
      <input v-model.number="newUtensil.quantity" type="number" placeholder="Qty" required />
      <input v-model="newUtensil.purchaseDate" type="date" required />
      <input v-model="newUtensil.condition" placeholder="Condition (e.g., New, Used)" required />
      <button type="submit">Add Utensil</button>
    </form>

    <!-- Utensils Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Utensil</th>
            <th>Qty</th>
            <th>Purchase Date</th>
            <th>Condition</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredUtensils" :key="item.name">
            <td>{{ item.name }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.purchaseDate }}</td>
            <td>{{ item.condition }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue'

// Categories with emoji icons
const utensilCategories = [
  { name: 'Cooking', icon: '🍳' },
  { name: 'Serving', icon: '🍽️' },
  { name: 'Baking', icon: '🥧' },
  { name: 'Cutlery', icon: '🔪' },
  { name: 'Storage', icon: '🧺' }
]

const selectedCategory = ref('Cooking')

// Hardcoded example utensils
const utensils = ref([
  { name: 'Spatula', quantity: 10, purchaseDate: '2025-09-01', condition: 'New', category: 'Cooking' },
  { name: 'Frying Pan', quantity: 5, purchaseDate: '2025-08-20', condition: 'Used', category: 'Cooking' },
  { name: 'Ladle', quantity: 7, purchaseDate: '2025-07-15', condition: 'New', category: 'Cooking' },
  { name: 'Serving Spoon', quantity: 12, purchaseDate: '2025-09-10', condition: 'New', category: 'Serving' },
  { name: 'Tray', quantity: 4, purchaseDate: '2025-09-12', condition: 'Used', category: 'Serving' },
  { name: 'Baking Tray', quantity: 3, purchaseDate: '2025-08-01', condition: 'New', category: 'Baking' },
  { name: 'Rolling Pin', quantity: 2, purchaseDate: '2025-07-22', condition: 'Used', category: 'Baking' },
  { name: 'Knife', quantity: 15, purchaseDate: '2025-10-01', condition: 'New', category: 'Cutlery' },
  { name: 'Fork', quantity: 20, purchaseDate: '2025-09-15', condition: 'New', category: 'Cutlery' },
  { name: 'Storage Box', quantity: 8, purchaseDate: '2025-06-10', condition: 'Used', category: 'Storage' },
  { name: 'Plastic Container', quantity: 10, purchaseDate: '2025-05-20', condition: 'New', category: 'Storage' }
])

// For the new utensil form
const newUtensil = ref({
  name: '',
  quantity: null,
  purchaseDate: '',
  condition: '',
  category: ''
})

// Add utensil function
function addUtensil() {
  if (
    !newUtensil.value.name ||
    !newUtensil.value.quantity ||
    !newUtensil.value.purchaseDate ||
    !newUtensil.value.condition ||
    !newUtensil.value.category
  ) {
    alert('Please fill all fields')
    return
  }

  utensils.value.push({ ...newUtensil.value })
  newUtensil.value = { name: '', quantity: null, purchaseDate: '', condition: '', category: '' }
}

// Filter by selected tab
const filteredUtensils = computed(() =>
  utensils.value.filter(item => item.category === selectedCategory.value)
)
</script>

<style scoped>
.utensils-container {
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
