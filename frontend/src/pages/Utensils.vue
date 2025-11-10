<template>
  <main class="utensils-container">
    <h2 class="page-title">Utensils Inventory</h2>

    <div class="tabs">
      <button
        v-for="category in utensilCategories"
        :key="category.categoryId"
        :class="['tab-button', { active: selectedCategory === category.categoryId }]"
        @click="selectedCategory = category.categoryId"
      >
        {{ category.categoryName }}
      </button>
    </div>

    <form class="add-form" @submit.prevent="addUtensil">
      <input v-model="newUtensil.itemName" placeholder="Utensil Name" required />
      <select v-model="newUtensil.categoryId" required>
        <option disabled value="">Select Category</option>
        <option v-for="category in utensilCategories" :key="category.categoryId" :value="category.categoryId">
          {{ category.categoryName }}
        </option>
      </select>
      <input v-model.number="newUtensil.quantityInStock" type="number" min="0" placeholder="Qty" required />
      <input v-model.number="newUtensil.unitCost" type="number" min="0" step="0.01" placeholder="Unit Cost ($)" required />
      <input v-model.number="newUtensil.shelfLifeDays" type="number" min="0" placeholder="Shelf Life (days)" required />
      <select v-model="newUtensil.status" required>
        <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
      </select>
      <button type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Saving...' : 'Add Utensil' }}
      </button>
    </form>

    <div class="table-container">
      <div v-if="inventoryStore.loading.items" class="status-message">Loading utensils...</div>
      <div v-else-if="!filteredUtensils.length" class="status-message">
        No utensils tracked in this category yet.
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>Utensil</th>
            <th>Qty</th>
            <th>Unit Cost</th>
            <th>Shelf Life (days)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredUtensils" :key="item.itemId">
            <td>{{ item.itemName }}</td>
            <td>{{ item.quantityInStock }}</td>
            <td>${{ Number(item.unitCost).toFixed(2) }}</td>
            <td>{{ item.shelfLifeDays }}</td>
            <td>{{ item.status }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

import { useInventoryStore } from '../stores/inventoryStore'

const inventoryStore = useInventoryStore()
const statusOptions = ['AVAILABLE', 'LOW', 'OUT_OF_STOCK']

const utensilCategories = computed(() => inventoryStore.utensilCategoryOptions)
const selectedCategory = ref('')
const isSubmitting = ref(false)

const newUtensil = ref({
  itemName: '',
  categoryId: '',
  quantityInStock: null,
  unitCost: null,
  shelfLifeDays: null,
  expirationDate: '',
  status: 'AVAILABLE'
})

watch(
  utensilCategories,
  categories => {
    if (!selectedCategory.value && categories.length) {
      selectedCategory.value = categories[0].categoryId
      newUtensil.value.categoryId = categories[0].categoryId
    }
  },
  { immediate: true }
)

const filteredUtensils = computed(() =>
  inventoryStore.utensils.filter(item => item.categoryId === selectedCategory.value)
)

const addUtensil = async () => {
  if (isSubmitting.value) return

  try {
    isSubmitting.value = true
    await inventoryStore.createItem({ ...newUtensil.value })
    newUtensil.value = {
      itemName: '',
      categoryId: selectedCategory.value,
      quantityInStock: null,
      unitCost: null,
      shelfLifeDays: null,
      expirationDate: '',
      status: 'AVAILABLE'
    }
  } catch (error) {
    alert(error.message ?? 'Unable to add utensil right now.')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  if (!inventoryStore.categories.length) {
    inventoryStore.fetchCategories().catch(error => console.error(error))
  }
  if (!inventoryStore.items.length) {
    inventoryStore.fetchItems().catch(error => console.error(error))
  }
  if (!inventoryStore.summary) {
    inventoryStore.fetchSummary().catch(error => console.error(error))
  }
})
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

/* Form Styles */
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

.add-form button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.add-form button:hover:not(:disabled) {
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

.status-message {
  text-align: center;
  color: #8B2E1D;
  font-weight: 600;
}

table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
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
</style>
