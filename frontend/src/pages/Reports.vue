<template>
  <main class="reports-container">
    <h2 class="page-title">Inventory Reports</h2>

    <div class="cards" v-if="!loadingSummary">
      <div class="card">
        <h3>Total Materials</h3>
        <p>{{ totalMaterials }}</p>
      </div>
      <div class="card">
        <h3>Total Quantity</h3>
        <p>{{ totalQuantity }}</p>
      </div>
      <div class="card">
        <h3>Low Stock Items</h3>
        <p>{{ lowStock.length }}</p>
      </div>
      <div class="card">
        <h3>Expiring Soon</h3>
        <p>{{ expiringSoon.length }}</p>
      </div>
      <div class="card secondary-card">
        <h3>Cutlery Low Stock</h3>
        <p>{{ cutleryLowStock.length }}</p>
      </div>
      <div class="card secondary-card">
        <h3>Serving Low Stock</h3>
        <p>{{ servingLowStock.length }}</p>
      </div>
    </div>
    <div v-else class="status-message">Loading report data...</div>

    <section class="settings-card" v-if="inventorySettings">
      <h3>Report Settings</h3>
      <form class="settings-form" @submit.prevent="saveInventorySettings">
        <label>
          Low Stock Threshold (qty)
          <input
            type="number"
            min="1"
            v-model.number="settingsForm.lowStockThreshold"
            required
          />
        </label>
        <label>
          Expiring Soon (days)
          <input
            type="number"
            min="1"
            v-model.number="settingsForm.expiringSoonDays"
            required
          />
        </label>
        <button type="submit" :disabled="savingSettings">
          {{ savingSettings ? 'Saving...' : 'Save Settings' }}
        </button>
      </form>
      <p v-if="settingsStatus" class="settings-status">{{ settingsStatus }}</p>
    </section>

    <!-- Low Stock Table -->
    <div class="table-container" v-if="lowStock.length">
      <h3>Low Stock Items (qty <= {{ lowStockThresholdLabel }})</h3>
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Qty</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in lowStock" :key="item.itemId">
            <td>{{ item.itemName }}</td>
            <td>{{ formatQuantityWithUnit(item.quantityInStock, item.unit) }}</td>
            <td>{{ item.categoryName }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Expiring Soon Table -->
    <div class="table-container" v-if="expiringSoon.length">
      <h3>Expiring Soon (next {{ expiringSoonDaysLabel }} days)</h3>
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Qty</th>
            <th>Purchase Date</th>
            <th>Expiration Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in expiringSoon" :key="item.itemId">
            <td>{{ item.itemName }}</td>
            <td>{{ formatQuantityWithUnit(item.quantityInStock, item.unit) }}</td>
            <td>{{ formatDate(item.purchaseDate) }}</td>
            <td>{{ formatDate(item.expirationDate) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Recently Deleted Table -->
    <div class="table-container" v-if="deletedItems.length">
      <h3>Recently Deleted Items (auto removed after 7 days)</h3>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Category</th>
            <th>Deleted On</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in deletedItems" :key="item.itemId">
           <td>{{ item.itemName }}</td>
            <td>{{ formatQuantityWithUnit(item.quantityInStock, item.unit) }}</td>
            <td>{{ item.categoryName }}</td>
            <td>{{ formatDate(item.deletedAt) }}</td>
            <td>
              <button class="restore-button" @click="handleRestore(item)">
                Undo Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <section class="custom-report-card">
      <h3>Custom Inventory & Expense Report</h3>
      <p class="section-subtitle">
        Choose a date range and grouping period to pull inventory usage and expense totals.
      </p>
      <form class="custom-report-form" @submit.prevent="runCustomReport">
        <label>
          Start Date
          <input type="date" v-model="reportFilters.startDate" />
        </label>
        <label>
          End Date
          <input type="date" v-model="reportFilters.endDate" />
        </label>
        <label>
          Period
          <select v-model="reportFilters.period">
            <option v-for="option in periodOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <button class="run-report-btn" type="submit" :disabled="loadingCustomReport">
          {{ loadingCustomReport ? 'Loading...' : 'Run Report' }}
        </button>
      </form>
      <p v-if="customReportError" class="error-message">{{ customReportError }}</p>
    </section>

    <div class="table-container" v-if="customReport">
      <h3>Report Results</h3>
      <div v-if="customReport.points.length" class="cards compact-cards">
        <div class="card">
          <h4>Total Items Used</h4>
          <p>{{ customReport.totals.totalUsedItems }}</p>
        </div>
        <div class="card">
          <h4>Total Spend</h4>
          <p>{{ formatCurrency(customReport.totals.totalSpent) }}</p>
        </div>
      </div>
      <table v-if="customReport.points.length">
        <thead>
          <tr>
            <th>Period</th>
            <th>Start</th>
            <th>End</th>
            <th>Items Used</th>
            <th>Total Spent</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="point in customReport.points" :key="point.bucket">
            <td>{{ point.label }}</td>
            <td>{{ point.rangeStart }}</td>
            <td>{{ point.rangeEnd }}</td>
            <td>{{ point.totalUsedItems }}</td>
            <td>{{ formatCurrency(point.totalSpent) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="status-message">No results for the selected range yet.</div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

import { apiClient } from '../services/apiClient'
import { useInventoryStore } from '../stores/inventoryStore'

const inventoryStore = useInventoryStore()

const reportFilters = reactive({
  startDate: '',
  endDate: '',
  period: 'day'
})

const customReportError = ref('')
const inventorySettings = ref(null)
const settingsForm = reactive({
  lowStockThreshold: '',
  expiringSoonDays: ''
})
const settingsStatus = ref('')
const savingSettings = ref(false)

const today = new Date()
const defaultEndDate = today.toISOString().slice(0, 10)
const defaultStart = new Date(today)
defaultStart.setDate(defaultStart.getDate() - 6)
reportFilters.startDate = defaultStart.toISOString().slice(0, 10)
reportFilters.endDate = defaultEndDate

onMounted(() => {
  if (!inventoryStore.items.length) {
    inventoryStore.fetchItems().catch(error => console.error(error))
  }
  if (!inventoryStore.summary) {
    inventoryStore.fetchSummary().catch(error => console.error(error))
  }
  if (!inventoryStore.deletedItems.length) {
    inventoryStore.fetchDeletedItems().catch(error => console.error(error))
  }

  runCustomReport()
  loadInventorySettings()
})

const loadingSummary = computed(() => inventoryStore.loading.summary)
const totalMaterials = computed(() => inventoryStore.totalMaterialsCount)
const totalQuantity = computed(() => inventoryStore.totalQuantity)
const lowStock = computed(() => inventoryStore.lowStockMaterials)
const expiringSoon = computed(() => inventoryStore.expiringSoonMaterials)
const cutleryLowStock = computed(() => inventoryStore.lowStockCutlery)
const servingLowStock = computed(() => inventoryStore.lowStockServing)
const deletedItems = computed(() => inventoryStore.deletedItems)
const customReport = computed(() => inventoryStore.customReport)
const loadingCustomReport = computed(() => inventoryStore.loading.customReport)
const lowStockThresholdLabel = computed(() => inventorySettings.value?.lowStockThreshold ?? '-')
const expiringSoonDaysLabel = computed(() => inventorySettings.value?.expiringSoonDays ?? '-')

const handleRestore = async item => {
  try {
    await inventoryStore.restoreItem(item.itemId)
  } catch (error) {
    alert(error.message ?? 'Unable to restore item.')
  }
}

const loadInventorySettings = async () => {
  try {
    const settings = await apiClient.getInventorySettings()
    inventorySettings.value = settings
    settingsForm.lowStockThreshold = settings.lowStockThreshold
    settingsForm.expiringSoonDays = settings.expiringSoonDays
  } catch (error) {
    console.error(error)
  }
}

const saveInventorySettings = async () => {
  try {
    savingSettings.value = true
    settingsStatus.value = ''
    const payload = {
      lowStockThreshold: Number(settingsForm.lowStockThreshold),
      expiringSoonDays: Number(settingsForm.expiringSoonDays)
    }
    const updated = await apiClient.updateInventorySettings(payload)
    inventorySettings.value = updated
    settingsStatus.value = 'Settings saved'
    await inventoryStore.fetchSummary()
  } catch (error) {
    settingsStatus.value = error.message ?? 'Unable to save settings'
  } finally {
    savingSettings.value = false
  }
}

const runCustomReport = async () => {
  customReportError.value = ''
  try {
    if (!reportFilters.startDate || !reportFilters.endDate) {
      throw new Error('Select both a start and end date.')
    }
    if (reportFilters.startDate > reportFilters.endDate) {
      throw new Error('Start date must be before end date.')
    }
    await inventoryStore.fetchCustomReport({
      startDate: reportFilters.startDate,
      endDate: reportFilters.endDate,
      period: reportFilters.period
    })
  } catch (error) {
    customReportError.value = error.message ?? 'Unable to load custom report.'
  }
}

const periodOptions = [
  { label: 'Daily', value: 'day' },
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' }
]

const formatDate = dateString => {
  if (!dateString) return '-'
  return dateString.slice(0, 10)
}

const formatQuantityWithUnit = (qty, unit) => {
  if (qty === undefined || qty === null) return '-'
  if (!unit) return qty
  const singularOrPlural = Number(qty) === 1 ? unit : unit
  return `${qty} ${singularOrPlural}`
}

const formatCurrency = value =>
  Number(value ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
</script>

<style scoped>
.reports-container {
  padding: 2rem;
  background-color: #f3f7f6;
  min-height: 100vh;
}

.page-title {
  font-size: 1.8rem;
  color: #143029;
  font-weight: 700;
  text-align: center;
  margin-bottom: 2rem;
}

.status-message {
  text-align: center;
  color: #8B2E1D;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.cards {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.card {
  background-color: #2f7057;
  color: #fff;
  padding: 1rem 2rem;
  border-radius: 12px;
  text-align: center;
  font-weight: 600;
  min-width: 150px;
}

.secondary-card {
  background-color: #2f7057;;
}

.table-container {
  background-color: #fff;
  border-radius: 16px;
  padding: 1rem;
  max-width: 900px;
  margin: 1rem auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

th, td {
  padding: 0.75rem;
  border-bottom: 1px solid #D1D5DB;
}

th {
  color: #143029;
  font-weight: 700;
  text-align: left;
}

td {
  color: #040303;
  font-weight: 550;
}

.restore-button {
  background: #2563eb;
  border: none;
  color: #fff;
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.restore-button:hover {
  background: #1d4ed8;
}

.settings-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 900px;
  margin: 1rem auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.settings-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
}

.settings-form label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  color: #143029;
}

.settings-form input {
  margin-top: 0.35rem;
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.settings-form button {
  background-color: #2563eb;
  color: #fff;
  border: none;
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.settings-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.settings-form button:not([disabled]):hover {
  background-color: #1d4ed8;
}

.settings-status {
  margin-top: 0.75rem;
  font-weight: 600;
  color: #065f46;
}

.custom-report-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 900px;
  margin: 2rem auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.section-subtitle {
  margin: 0.5rem 0 1rem 0;
  color: #4b5563;
}

.custom-report-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  align-items: end;
}

.custom-report-form label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  color: #143029;
}

.custom-report-form input,
.custom-report-form select {
  margin-top: 0.35rem;
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 0.95rem;
}

.run-report-btn {
  background-color: #2563eb;
  color: #fff;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.run-report-btn[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
}

.run-report-btn:not([disabled]):hover {
  background-color: #1d4ed8;
}

.error-message {
  color: #b91c1c;
  margin-top: 0.75rem;
  font-weight: 600;
}

.compact-cards {
  justify-content: flex-start;
  margin-bottom: 1rem;
}
</style>
