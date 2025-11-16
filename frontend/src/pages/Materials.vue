<template>
  <main class="inventory-container">
    <h2 class="page-title">{{ currentInventoryType }}S INVENTORY</h2>
    
    <!-- Inventory Type Toggle -->
    <div class="inventory-type-toggle">
      <button 
        :class="['type-button', { active: inventoryType === 'MATERIAL' }]"
        @click="switchInventoryType('MATERIAL')"
      >
        🥕 MATERIALS
      </button>
      <button 
        :class="['type-button', { active: inventoryType === 'UTENSIL' }]"
        @click="switchInventoryType('UTENSIL')"
      >
        🍳 UTENSILS
      </button>
    </div>

    <!-- Category Tabs -->
    <div class="tabs">
      <button 
        v-for="category in currentTabs" 
        :key="category.categoryId"
        :class="['tab-button', { active: selectedCategory === category.categoryId }]"
        @click="selectedCategory = category.categoryId"
      >
        <span class="tab-icon">{{ category.icon }}</span>
        {{ category.categoryName }}
      </button>
    </div>

    <!-- Add/Edit Form -->
    <form class="add-form" @submit.prevent="handleSubmit">
      <input v-model="form.itemName" :placeholder="`${inventoryType === 'MATERIAL' ? 'Material' : 'Utensil'} Name`" required />
      
      <select v-model="form.categoryId" required>
        <option disabled value="">Select Category</option>
        <option v-for="category in currentTabs" :key="category.categoryId" :value="category.categoryId">
          {{ category.categoryName }}
        </option>
      </select>

      <input v-model.number="form.quantityInStock" type="number" min="0" placeholder="Qty" required />

      <select v-model="form.unit" required>
        <option v-for="unitOption in UNIT_OPTIONS" :key="unitOption.value" :value="unitOption.value">
          {{ unitOption.label }}
        </option>
      </select>

      <input v-model.number="form.unitCost" type="number" min="0" step="0.01" placeholder="Unit Cost ($)" required />
      
      <input 
        v-model.number="form.shelfLifeDays" 
        type="number" 
        min="0" 
        :placeholder="inventoryType === 'MATERIAL' ? 'Shelf Life (days) *' : 'Shelf Life (days)'"
        :required="inventoryType === 'MATERIAL'"
      />
      
      <input 
        v-if="inventoryType === 'MATERIAL'" 
        v-model="form.expirationDate" 
        type="date" 
      />
      
      <select v-model="form.status">
        <option value="AVAILABLE">Available</option>
        <option value="LOW">Low</option>
        <option value="OUT_OF_STOCK">Out of Stock</option>
      </select>

      <div class="button-group">
        <button type="submit" :disabled="isSubmitting">
          {{ editingItemId ? 
            (isSubmitting ? 'Updating...' : `Update ${inventoryType === 'MATERIAL' ? 'Material' : 'Utensil'}`) : 
            (isSubmitting ? 'Saving...' : `Add ${inventoryType === 'MATERIAL' ? 'Material' : 'Utensil'}`)
          }}
        </button>
        <button v-if="editingItemId" type="button" class="secondary" @click="resetForm">
          Cancel
        </button>
      </div>
    </form>

    <!-- Inventory Table -->
    <div class="table-container">
      <div v-if="inventoryStore.loading.items" class="status-message">
        Loading {{ inventoryType.toLowerCase() }}s...
      </div>
      <div v-else-if="!filteredItems.length" class="status-message">
        No {{ inventoryType.toLowerCase() }}s tracked in this category yet.
      </div>
      <table v-else>
        <thead>
          <tr>
            <th>{{ inventoryType === 'MATERIAL' ? 'Ingredient' : 'Utensil' }}</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Unit Cost</th>
            <th>Shelf Life (days)</th>
            <th v-if="inventoryType === 'MATERIAL'">Expiration</th>
            <th>Status</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredItems" :key="item.itemId">
            <td>{{ item.itemName }}</td>
            <td>{{ item.quantityInStock }}</td>
            <td>{{ formatUnitLabel(item.unit) }}</td>
            <td>${{ Number(item.unitCost).toFixed(2) }}</td>
            <td>{{ item.shelfLifeDays }}</td>
            <td v-if="inventoryType === 'MATERIAL'">{{ formatDisplayDate(item.expirationDate) }}</td>
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
import { useRoute, useRouter } from 'vue-router'

const inventoryStore = useInventoryStore()
const route = useRoute()
const router = useRouter()

// Constants
const MATERIAL_TABS = [
  { categoryId: 'CAT_FRUITS', label: 'Fruits', icon: '🍎' },
  { categoryId: 'CAT_VEG', label: 'Vegetables', icon: '🥕' },
  { categoryId: 'CAT_GRAINS', label: 'Grains', icon: '🌾' },
  { categoryId: 'CAT_PROTEIN', label: 'Protein', icon: '🍗' },
  { categoryId: 'CAT_DAIRY', label: 'Dairy', icon: '🥛' },
  { categoryId: 'CAT_DRINK', label: 'Drinks', icon: '🥤' }
]

const UTENSIL_TABS = [
  { categoryId: 'CAT_COOK', label: 'Cooking', icon: '🍳' },
  { categoryId: 'CAT_SERVE', label: 'Serving', icon: '🍽️' },
  { categoryId: 'CAT_BAKE', label: 'Baking', icon: '🧁' },
  { categoryId: 'CAT_CUT', label: 'Cutlery', icon: '🔪' },
  { categoryId: 'CAT_STORE', label: 'Storage', icon: '🧺' }
]

// Allowed units mirror backend validation so dropdown stays in sync
const UNIT_OPTIONS = [
  { value: 'each', label: 'Each' },
  { value: 'lb', label: 'Pound (lb)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'case', label: 'Case' },
  { value: 'bag', label: 'Bag' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'liter', label: 'Liter' }
]


// Reactive state
const inventoryType = ref('MATERIAL')
const selectedCategory = ref('')
const isSubmitting = ref(false)
const editingItemId = ref(null)

const form = ref({
  itemName: '',
  categoryId: '',
  quantityInStock: null,
  unit: UNIT_OPTIONS[0].value,
  unitCost: null,
  shelfLifeDays: null,
  expirationDate: '',
  status: 'AVAILABLE',
  itemType: 'MATERIAL'
})

// Computed properties
const currentInventoryType = computed(() => inventoryType.value)
const currentTabs = computed(() => {
  const tabs = inventoryType.value === 'MATERIAL' ? MATERIAL_TABS : UTENSIL_TABS
  const categoryOptions = inventoryType.value === 'MATERIAL' 
    ? inventoryStore.materialCategoryOptions 
    : inventoryStore.utensilCategoryOptions
  
  return tabs.map(tab => {
    const match = categoryOptions.find(cat => cat.categoryId === tab.categoryId)
    return {
      ...tab,
      categoryName: match?.categoryName ?? tab.label
    }
  })
})

const filteredItems = computed(() => {
  const items = inventoryType.value === 'MATERIAL' 
    ? inventoryStore.materials 
    : inventoryStore.utensils
  return items.filter(item => item.categoryId === selectedCategory.value)
})

// Methods
const switchInventoryType = (type) => {
  inventoryType.value = type
  form.value.itemType = type
  
  // Reset selected category to first category of new type
  const newTabs = type === 'MATERIAL' ? MATERIAL_TABS : UTENSIL_TABS
  if (newTabs.length > 0) {
    selectedCategory.value = newTabs[0].categoryId
  }
  
  // Update URL when switching types
  if (type === 'MATERIAL' && route.name !== 'materials') {
    router.push('/materials')
  } else if (type === 'UTENSIL' && route.name !== 'utensils') {
    router.push('/utensils')
  }
  
  resetForm()
}

const handleSubmit = async () => {
  if (isSubmitting.value) return
  
  try {
    isSubmitting.value = true
    const payload = { 
      ...form.value,
      shelfLifeDays: form.value.shelfLifeDays ?? null
    }
    payload.unit = payload.unit || UNIT_OPTIONS[0].value

    if (editingItemId.value) {
      await inventoryStore.updateItem(editingItemId.value, payload)
    } else {
      await inventoryStore.createItem(payload)
    }
    resetForm()
  } catch (error) {
    alert(error.message ?? `Unable to save ${inventoryType.value.toLowerCase()} right now.`)
  } finally {
    isSubmitting.value = false
  }
}

const startEdit = (item) => {
  editingItemId.value = item.itemId
  form.value = {
    itemName: item.itemName,
    categoryId: item.categoryId,
    quantityInStock: item.quantityInStock,
    unit: item.unit ?? UNIT_OPTIONS[0].value,
    unitCost: item.unitCost,
    shelfLifeDays: item.shelfLifeDays,
    expirationDate: formatDateInput(item.expirationDate),
    status: item.status ?? 'AVAILABLE',
    itemType: item.itemType
  }
}

const resetForm = () => {
  form.value = {
    itemName: '',
    categoryId: selectedCategory.value || currentTabs.value[0]?.categoryId || '',
    quantityInStock: null,
    unit: UNIT_OPTIONS[0].value,
    unitCost: null,
    shelfLifeDays: null,
    expirationDate: '',
    status: 'AVAILABLE',
    itemType: inventoryType.value
  }
  editingItemId.value = null
}

const handleDelete = async (item) => {
  if (!item?.itemId) return
  const confirmed = window.confirm(`Delete ${item.itemName}?`)
  if (!confirmed) return

  try {
    await inventoryStore.deleteItem(item.itemId)
  } catch (error) {
    alert(error.message ?? 'Unable to delete item right now.')
  }
}

const formatDateInput = (dateString) => {
  if (!dateString) return ''
  return dateString.slice(0, 10)
}

const formatDisplayDate = (dateString) => {
  if (!dateString) return '-'
  return dateString.slice(0, 10)
}

const unitLabelMap = UNIT_OPTIONS.reduce((map, option) => {
  map[option.value] = option.label
  return map
}, {})

const formatUnitLabel = unitValue => {
  if (!unitValue) return '-'
  const normalized = unitValue.toLowerCase()
  return unitLabelMap[normalized] ?? normalized
}

// Watchers
watch(currentTabs, (tabs) => {
  if (!selectedCategory.value && tabs.length) {
    selectedCategory.value = tabs[0].categoryId
  }
}, { immediate: true })

watch(selectedCategory, (val) => {
  if (!editingItemId.value && val) {
    form.value.categoryId = val
  }
}, { immediate: true })

// Reset category when inventory type changes
watch(inventoryType, (newType) => {
  const newTabs = newType === 'MATERIAL' ? MATERIAL_TABS : UTENSIL_TABS
  if (newTabs.length > 0 && !selectedCategory.value) {
    selectedCategory.value = newTabs[0].categoryId
  }
  resetForm()
})

// Set initial type based on current route
onMounted(() => {
  // Set initial type based on current route
  if (route.path === '/utensils' || route.name === 'utensils') {
    inventoryType.value = 'UTENSIL'
    form.value.itemType = 'UTENSIL'
  } else {
    inventoryType.value = 'MATERIAL'
    form.value.itemType = 'MATERIAL'
  }

  // Fetch data
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

// Also watch for route changes
watch(() => route.path, (newPath) => {
  if (newPath === '/utensils') {
    inventoryType.value = 'UTENSIL'
    form.value.itemType = 'UTENSIL'
  } else if (newPath === '/materials') {
    inventoryType.value = 'MATERIAL'
    form.value.itemType = 'MATERIAL'
  }
})
</script>

<style scoped>
/* Your existing styles here - they should work fine */
.inventory-container {
  padding: 2rem;
  background-color: #FFF7ED;
  min-height: 100vh;
}

.page-title {
  font-size: 1.8rem;
  color: #2f7057;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1.5rem;
}

.inventory-type-toggle {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.type-button {
  padding: 0.75rem 1.5rem;
  border: 2px solid #2f7057;
  border-radius: 12px;
  background-color: transparent;
  color: #2f7057;;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.type-button:hover {
  background-color: #FEF3C7;
}

.type-button.active {
  background-color: #2f7057;;
  color: white;
}

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
  background-color: #2f7057;
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
  background-color: #2f7057;
}

.tab-button.active {
  background-color: #2f7057;
}

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
  background-color: #2f7057;
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
  align-items: center;
}

.add-form .secondary {
  background-color: #e5e7eb;
  color: #1f2937;
}

.add-form .secondary:hover {
  background-color: #d1d5db;
}

.table-container {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 1000px;
  margin: 0 auto;
  overflow: hidden;
}

.status-message {
  text-align: center;
  color: #2f7057;
  font-weight: 600;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid #D1D5DB;
  word-wrap: break-word;
}

th {
  color: #2f7057;;
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

@media (max-width: 768px) {
  .inventory-container {
    padding: 1rem;
  }
  
  .add-form {
    flex-direction: column;
    align-items: center;
  }
  
  .add-form input,
  .add-form select {
    width: 100%;
    max-width: 300px;
  }
  
  .tabs {
    gap: 0.5rem;
  }
  
  .tab-button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}
</style>
