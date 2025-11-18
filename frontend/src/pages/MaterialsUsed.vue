<template>
  <main class="materials-used">
    <section class="usage-card">
      <h2>Log Materials Used</h2>
      <p class="helper-text">
        Track how much inventory was used so stock levels stay accurate between deliveries.
      </p>
      <form class="usage-form" @submit.prevent="handleSubmit">
        <label>
          Date
          <input v-model="form.usageDate" type="date" required />
        </label>
        <label>
          Material
          <select v-model="form.materialId" required>
            <option value="" disabled>Select material</option>
            <option
              v-for="material in materialOptions"
              :key="material.itemId"
              :value="material.itemId"
            >
              {{ material.itemName }} ({{ material.quantityInStock }} {{ formatUnit(material.unit) }})
            </option>
          </select>
        </label>
        <label>
          Quantity Used
          <input
            v-model.number="form.quantityUsed"
            type="number"
            step="1"
            min="0"
            placeholder="Enter whole number"
            required
          />
        </label>
        <label>
          Reason
          <select v-model="form.reason">
            <option value="">Select reason</option>
            <option v-for="option in REASON_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Logging...' : 'Log Usage' }}
          </button>
        </div>
        <p v-if="formError" class="error">{{ formError }}</p>
        <p v-if="formSuccess" class="success">{{ formSuccess }}</p>
      </form>
    </section>

    <section class="usage-list-card">
      <header class="usage-header">
        <div>
          <h2>Recent Usage</h2>
          <p class="helper-text">
            View how materials have been used. Filter by date range to focus on a specific period.
          </p>
        </div>
        <div class="filters">
          <label>
            From
            <input v-model="filters.fromDate" type="date" />
          </label>
          <label>
            To
            <input v-model="filters.toDate" type="date" />
          </label>
          <button type="button" class="filter-button" @click="fetchUsageLogs" :disabled="isLoadingLogs">
            {{ isLoadingLogs ? 'Filtering...' : 'Filter' }}
          </button>
          <button
            type="button"
            class="export-button"
            @click="handleExportUsage"
            :disabled="isExportingUsage"
          >
            {{ isExportingUsage ? 'Exporting...' : 'Export Usage' }}
          </button>
        </div>
      </header>

      <div v-if="isLoadingLogs" class="status-message">Loading usage logs...</div>
      <div v-else-if="!usageLogs.length" class="status-message">No usage logged yet.</div>
      <table v-else class="usage-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Material</th>
            <th>Quantity Used</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in usageLogs" :key="log.usageId">
            <td>{{ formatDisplayDate(log.usageDate) }}</td>
            <td>{{ log.materialName }}</td>
            <td>{{ log.quantityUsed }} {{ formatUnit(log.unit) }}</td>
            <td>{{ log.reason ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

import { apiClient } from '../services/apiClient'
import { useInventoryStore } from '../stores/inventoryStore'

const inventoryStore = useInventoryStore()
const REASON_OPTIONS = [
  { value: 'Sold', label: 'Sold' },
  { value: 'Prep', label: 'Prep' },
  { value: 'Waste', label: 'Waste' },
  { value: 'Other', label: 'Other' }
]

const form = ref({
  usageDate: new Date().toISOString().slice(0, 10),
  materialId: '',
  quantityUsed: null,
  reason: ''
})
const filters = ref({
  fromDate: '',
  toDate: ''
})
const usageLogs = ref([])
const isSubmitting = ref(false)
const isLoadingLogs = ref(false)
const isExportingUsage = ref(false)
const formError = ref('')
const formSuccess = ref('')

const materialOptions = computed(() => inventoryStore.materials)

watch(
  materialOptions,
  options => {
    if (!form.value.materialId && options.length) {
      form.value.materialId = options[0].itemId
    }
  },
  { immediate: true }
)

const padNumber = value => String(value).padStart(2, '0')

const formatUnit = unit => {
  if (!unit) return ''
  return unit.charAt(0).toUpperCase() + unit.slice(1)
}

const formatDisplayDate = value => {
  if (!value) return '-'
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    return `${month}/${day}/${year}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const fileTimestamp = () =>
  new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const resetForm = () => {
  form.value = {
    usageDate: new Date().toISOString().slice(0, 10),
    materialId: materialOptions.value[0]?.itemId ?? '',
    quantityUsed: null,
    reason: ''
  }
  formError.value = ''
}

const validateForm = () => {
  if (!form.value.materialId) {
    formError.value = 'Please select a material.'
    return false
  }
  if (!form.value.quantityUsed || Number(form.value.quantityUsed) <= 0) {
    formError.value = 'Enter a quantity greater than 0.'
    return false
  }
  formError.value = ''
  return true
}

const handleSubmit = async () => {
  if (!validateForm() || isSubmitting.value) return

  try {
    isSubmitting.value = true
    const now = new Date()
    const currentTime = `${padNumber(now.getHours())}:${padNumber(now.getMinutes())}:${padNumber(
      now.getSeconds()
    )}`
    const payload = {
      materialId: form.value.materialId,
      quantityUsed: form.value.quantityUsed,
      reason: form.value.reason || undefined,
      usageDate: form.value.usageDate ? `${form.value.usageDate} ${currentTime}` : undefined
    }
    await apiClient.createMaterialUsage(payload)
    formSuccess.value = 'Usage logged.'
    resetForm()
    await inventoryStore.fetchItems().catch(() => {})
    await fetchUsageLogs()
  } catch (error) {
    formError.value = error.message ?? 'Unable to log usage right now.'
  } finally {
    isSubmitting.value = false
    setTimeout(() => {
      formSuccess.value = ''
    }, 3000)
  }
}

const fetchUsageLogs = async () => {
  try {
    isLoadingLogs.value = true
    const params = {}
    if (filters.value.fromDate) params.fromDate = `${filters.value.fromDate} 00:00:00`
    if (filters.value.toDate) params.toDate = `${filters.value.toDate} 23:59:59`
    usageLogs.value = await apiClient.getMaterialUsage(params)
  } catch (error) {
    formError.value = error.message ?? 'Unable to load usage records.'
  } finally {
    isLoadingLogs.value = false
  }
}

const handleExportUsage = async () => {
  if (filters.value.fromDate && filters.value.toDate && filters.value.fromDate > filters.value.toDate) {
    formError.value = 'From date must be before To date.'
    return
  }

  try {
    isExportingUsage.value = true
    formError.value = ''
    const params = {}
    if (filters.value.fromDate) params.fromDate = filters.value.fromDate
    if (filters.value.toDate) params.toDate = filters.value.toDate
    const blob = await apiClient.exportMaterialUsageLog(params)
    triggerDownload(blob, `material-usage_${fileTimestamp()}.xlsx`)
  } catch (error) {
    formError.value = error.message ?? 'Unable to export usage records.'
  } finally {
    isExportingUsage.value = false
  }
}

onMounted(() => {
  if (!inventoryStore.items.length) {
    inventoryStore.fetchItems().catch(error => console.error(error))
  }
  fetchUsageLogs()
})
</script>

<style scoped>
.materials-used {
  padding: 1.5rem;
  background-color: #fff7ed;
  min-height: 100vh;
}

.usage-card,
.usage-list-card {
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.usage-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.usage-form label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  color: #2f7057;
  gap: 0.35rem;
}

.usage-form input,
.usage-form select {
  padding: 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
}

.form-actions {
  display: flex;
  align-items: flex-end;
}

.usage-form button {
  background-color: #2f7057;
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.usage-form button:disabled,
.filter-button:disabled,
.export-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.helper-text {
  color: #4b5563;
  margin: 0.5rem 0 0;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filters {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filters label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  color: #2f7057;
  gap: 0.25rem;
}

.filters input {
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.filter-button {
  background-color: #2f7057;
  color: #fff;
  border: none;
  padding: 0.65rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.export-button {
  background-color: #e6b553;
  color: #143029;
  border: none;
  padding: 0.65rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.usage-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.usage-table th,
.usage-table td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.usage-table th {
  color: #2f7057;
  font-size: 0.95rem;
}

.status-message {
  text-align: center;
  padding: 1rem 0;
  color: #2f7057;
  font-weight: 600;
}

.error {
  color: #b91c1c;
  grid-column: 1 / -1;
}

.success {
  color: #047857;
  grid-column: 1 / -1;
}

@media (max-width: 768px) {
  .materials-used {
    padding: 1rem;
  }
  .filters {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
