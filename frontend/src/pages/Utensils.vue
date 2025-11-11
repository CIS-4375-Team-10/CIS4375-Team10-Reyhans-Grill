<template>
  <main class="utensils-container">
    <h2 class="page-title">Utensils Inventory</h2>

    <div class="tabs">
      <button
        v-for="category in utensilTabs"
        :key="category.categoryId"
        :class="['tab-button', { active: selectedCategory === category.categoryId }]"
        @click="selectedCategory = category.categoryId"
      >
        <span class="tab-icon">{{ category.icon }}</span>
        {{ category.categoryName }}
      </button>
    </div>

    <form class="add-form" @submit.prevent="handleSubmit">
      <input v-model="form.itemName" placeholder="Utensil Name" required />
      <select v-model="form.categoryId" required>
        <option disabled value="">Select Category</option>
        <option v-for="category in utensilTabs" :key="category.categoryId" :value="category.categoryId">
          {{ category.categoryName }}
        </option>
      </select>
      <input v-model.number="form.quantityInStock" type="number" min="0" placeholder="Qty" required />
      <input v-model.number="form.unitCost" type="number" min="0" step="0.01" placeholder="Unit Cost ($)" required />
      <input v-model.number="form.shelfLifeDays" type="number" min="0" placeholder="Shelf Life (days)" required />
      <select v-model="form.status">
        <option value="AVAILABLE">Available</option>
        <option value="LOW">Low</option>
        <option value="OUT_OF_STOCK">Out of Stock</option>
      </select>
      <div class="button-group">
        <button type="submit" :disabled="isSubmitting">
          {{ editingItemId ? (isSubmitting ? 'Updating...' : 'Update Utensil') : (isSubmitting ? 'Saving...' : 'Add Utensil') }}
        </button>
        <button v-if="editingItemId" type="button" class="secondary" @click="resetForm">Cancel</button>
      </div>
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
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredUtensils" :key="item.itemId">
            <td>{{ item.itemName }}</td>
            <td>{{ item.quantityInStock }}</td>
            <td>${{ Number(item.unitCost).toFixed(2) }}</td>
            <td>{{ item.shelfLifeDays }}</td>
            <td>{{ item.status }}</td>
            <td>
              <button class="edit-button" type="button" @click="startEdit(item)">
                Edit
              </button>
              <button class="delete-button" type="button" @click="handleDelete(item)">
                Delete
              </button>
            </td>
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
const UTENSIL_TABS = [
  { categoryId: 'CAT_COOK', label: 'Cooking', icon: '🍳' },
  { categoryId: 'CAT_SERVE', label: 'Serving', icon: '🍽️' },
  { categoryId: 'CAT_BAKE', label: 'Baking', icon: '🧁' },
  { categoryId: 'CAT_CUT', label: 'Cutlery', icon: '🔪' },
  { categoryId: 'CAT_STORE', label: 'Storage', icon: '🧺' }
]

const utensilTabs = computed(() =>
  UTENSIL_TABS.map(tab => {
    const match = inventoryStore.utensilCategoryOptions.find(cat => cat.categoryId === tab.categoryId)
    return {
      ...tab,
      categoryName: match?.categoryName ?? tab.label
    }
  })
)

const selectedCategory = ref(utensilTabs.value[0]?.categoryId ?? '')
const isSubmitting = ref(false)
const editingItemId = ref(null)

const form = ref({
  itemName: '',
  categoryId: '',
  quantityInStock: null,
  unitCost: null,
  shelfLifeDays: null,
  expirationDate: '',
  status: 'AVAILABLE',
  itemType: 'UTENSIL'
})

const filteredUtensils = computed(() =>
  inventoryStore.utensils.filter(item => item.categoryId === selectedCategory.value)
)

const handleSubmit = async () => {
  if (isSubmitting.value) return
  try {
    isSubmitting.value = true
    const payload = { ...form.value, itemType: 'UTENSIL' }
    if (editingItemId.value) {
      await inventoryStore.updateItem(editingItemId.value, payload)
    } else {
      await inventoryStore.createItem(payload)
    }
    resetForm()
  } catch (error) {
    alert(error.message ?? 'Unable to save utensil right now.')
  } finally {
    isSubmitting.value = false
  }
}

const startEdit = item => {
  editingItemId.value = item.itemId
  form.value = {
    itemName: item.itemName,
    categoryId: item.categoryId,
    quantityInStock: item.quantityInStock,
    unitCost: item.unitCost,
    shelfLifeDays: item.shelfLifeDays,
    expirationDate: formatDateInput(item.expirationDate),
    status: item.status ?? 'AVAILABLE',
    itemType: 'UTENSIL'
  }
}

const resetForm = () => {
  form.value = {
    itemName: '',
    categoryId: selectedCategory.value || utensilTabs.value[0]?.categoryId || '',
    quantityInStock: null,
    unitCost: null,
    shelfLifeDays: null,
    expirationDate: '',
    status: 'AVAILABLE',
    itemType: 'UTENSIL'
  }
  editingItemId.value = null
}

const handleDelete = async item => {
  if (!item?.itemId) return
  const confirmed = window.confirm(`Delete ${item.itemName}?`)
  if (!confirmed) return
  try {
    await inventoryStore.deleteItem(item.itemId)
  } catch (error) {
    alert(error.message ?? 'Unable to delete item right now.')
  }
}

const formatDateInput = dateString => {
  if (!dateString) return ''
  return dateString.slice(0, 10)
}

watch(
  utensilTabs,
  tabs => {
    if (!selectedCategory.value && tabs.length) {
      selectedCategory.value = tabs[0].categoryId
    }
  },
  { immediate: true }
)

watch(
  selectedCategory,
  val => {
    if (!editingItemId.value && val) {
      form.value.categoryId = val
    }
  },
  { immediate: true }
)

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
  resetForm()
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

.tab-icon {
  margin-right: 0.4rem;
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

.button-group {
  display: flex;
  gap: 0.5rem;
}

.add-form .secondary {
  background-color: #e5e7eb;
  color: #1f2937;
}

.add-form .secondary:hover {
  background-color: #d1d5db;
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

.actions-col {
  width: 120px;
}

.delete-button {
  background: #ef4444;
  border: none;
  color: #fff;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.edit-button {
  background: #2563eb;
  border: none;
  color: #fff;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  margin-right: 0.35rem;
}

.edit-button:hover {
  background: #1d4ed8;
}

.delete-button:hover {
  background: #b91c1c;
}
</style>

