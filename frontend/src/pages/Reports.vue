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

    <section class="export-card" v-if="inventorySettings">
      <h3>Excel Exports</h3>
      <p class="section-subtitle">
        Download inventory snapshots or an expense summary that match your current report settings.
      </p>

      <div class="export-grid">
        <div class="export-panel">
          <h4>Inventory Snapshots</h4>
          <p class="export-text">
            Use your saved thresholds or override them for this download only.
          </p>
          <div class="export-row">
            <button
              class="export-button primary"
              @click="handleExportFullInventory"
              :disabled="exporting.fullInventory"
            >
              {{ exporting.fullInventory ? 'Exporting...' : 'Full Inventory' }}
            </button>
          </div>
          <div class="export-row">
            <label>
              Low Stock Threshold
              <input
                type="number"
                min="1"
                v-model.number="exportFilters.lowStockThreshold"
                placeholder="Use saved value"
              />
            </label>
            <button
              class="export-button"
              @click="handleExportLowStock"
              :disabled="exporting.lowStock"
            >
              {{ exporting.lowStock ? 'Exporting...' : 'Low Stock Only' }}
            </button>
          </div>
          <div class="export-row">
            <label>
              Expiring Soon (days)
              <input
                type="number"
                min="1"
                v-model.number="exportFilters.expiringInDays"
                placeholder="Use saved value"
              />
            </label>
            <button
              class="export-button"
              @click="handleExportExpiringSoon"
              :disabled="exporting.expiringSoon"
            >
              {{ exporting.expiringSoon ? 'Exporting...' : 'Expiring Soon' }}
            </button>
          </div>
          <p class="export-hint">Leave the overrides blank to use the saved settings.</p>
        </div>

        <div class="export-panel">
          <h4>Expense Report</h4>
          <p class="export-text">
            Choose the date range and grouping period you want to export.
          </p>
          <div class="export-row">
            <label>
              Start Date
              <input type="date" v-model="reportFilters.startDate" />
            </label>
            <label>
              End Date
              <input type="date" v-model="reportFilters.endDate" />
            </label>
          </div>
          <div class="export-row">
            <label>
              Period
              <select v-model="reportFilters.period">
                <option v-for="option in periodOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>
          <button
            class="export-button primary"
            @click="handleExportExpenseReport"
            :disabled="exporting.expense"
          >
            {{ exporting.expense ? 'Exporting...' : 'Export Expense Report' }}
          </button>
        </div>
      </div>
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
            <td class="deleted-actions">
              <button class="restore-button" @click="handleRestore(item)">
                Undo Delete
              </button>
              <button class="purge-button" @click="handlePermanentDelete(item)">
                Delete Permanently
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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

const inventorySettings = ref(null)
const settingsForm = reactive({
  lowStockThreshold: '',
  expiringSoonDays: ''
})
const settingsStatus = ref('')
const savingSettings = ref(false)
const exportFilters = reactive({
  lowStockThreshold: '',
  expiringInDays: ''
})
const exporting = reactive({
  fullInventory: false,
  lowStock: false,
  expiringSoon: false,
  expense: false
})

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
const lowStockThresholdLabel = computed(() => inventorySettings.value?.lowStockThreshold ?? '-')
const expiringSoonDaysLabel = computed(() => inventorySettings.value?.expiringSoonDays ?? '-')

const handleRestore = async item => {
  try {
    await inventoryStore.restoreItem(item.itemId)
  } catch (error) {
    alert(error.message ?? 'Unable to restore item.')
  }
}

const handlePermanentDelete = async item => {
  const confirmed = window.confirm(
    `Permanently remove ${item.itemName}? This cannot be undone.`
  )
  if (!confirmed) return

  try {
    await inventoryStore.permanentlyDeleteItem(item.itemId)
  } catch (error) {
    alert(error.message ?? 'Unable to permanently delete this item.')
  }
}

const syncExportDefaults = settings => {
  if (!settings) return
  exportFilters.lowStockThreshold = settings.lowStockThreshold
  exportFilters.expiringInDays = settings.expiringSoonDays
}

const loadInventorySettings = async () => {
  try {
    const settings = await apiClient.getInventorySettings()
    inventorySettings.value = settings
    settingsForm.lowStockThreshold = settings.lowStockThreshold
    settingsForm.expiringSoonDays = settings.expiringSoonDays
    syncExportDefaults(settings)
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
    syncExportDefaults(updated)
    await inventoryStore.fetchSummary()
  } catch (error) {
    settingsStatus.value = error.message ?? 'Unable to save settings'
  } finally {
    savingSettings.value = false
  }
}

const fileTimestamp = () =>
  new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').replace('Z', '')

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const handleExportFullInventory = async () => {
  try {
    exporting.fullInventory = true
    const blob = await apiClient.exportFullInventory()
    triggerDownload(blob, `full-inventory-${fileTimestamp()}.xlsx`)
  } catch (error) {
    alert(error.message ?? 'Unable to export the full inventory right now.')
  } finally {
    exporting.fullInventory = false
  }
}

const handleExportLowStock = async () => {
  if (
    exportFilters.lowStockThreshold !== '' &&
    Number(exportFilters.lowStockThreshold) <= 0
  ) {
    alert('Low stock threshold must be greater than zero.')
    return
  }
  try {
    exporting.lowStock = true
    const params = {}
    if (exportFilters.lowStockThreshold !== '' && exportFilters.lowStockThreshold != null) {
      params.threshold = exportFilters.lowStockThreshold
    }
    const blob = await apiClient.exportLowStockInventory(params)
    const suffix = params.threshold ?? 'default'
    triggerDownload(blob, `low-stock-${suffix}-${fileTimestamp()}.xlsx`)
  } catch (error) {
    alert(error.message ?? 'Unable to export the low stock list right now.')
  } finally {
    exporting.lowStock = false
  }
}

const handleExportExpiringSoon = async () => {
  if (
    exportFilters.expiringInDays !== '' &&
    Number(exportFilters.expiringInDays) <= 0
  ) {
    alert('Expiring soon days must be greater than zero.')
    return
  }
  try {
    exporting.expiringSoon = true
    const params = {}
    if (exportFilters.expiringInDays !== '' && exportFilters.expiringInDays != null) {
      params.expiringInDays = exportFilters.expiringInDays
    }
    const blob = await apiClient.exportExpiringInventory(params)
    const suffix = params.expiringInDays ?? 'default'
    triggerDownload(blob, `expiring-soon-${suffix}-${fileTimestamp()}.xlsx`)
  } catch (error) {
    alert(error.message ?? 'Unable to export the expiring items right now.')
  } finally {
    exporting.expiringSoon = false
  }
}

const handleExportExpenseReport = async () => {
  try {
    if (!reportFilters.startDate || !reportFilters.endDate) {
      throw new Error('Select a start and end date first.')
    }
    if (reportFilters.startDate > reportFilters.endDate) {
      throw new Error('Start date must be before end date.')
    }
    exporting.expense = true
    const blob = await apiClient.exportExpenseReport({
      startDate: reportFilters.startDate,
      endDate: reportFilters.endDate,
      period: reportFilters.period
    })
    triggerDownload(
      blob,
      `expense-report_${reportFilters.startDate}_${reportFilters.endDate}_${reportFilters.period}_${fileTimestamp()}.xlsx`
    )
  } catch (error) {
    alert(error.message ?? 'Unable to export the expense report right now.')
  } finally {
    exporting.expense = false
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

.deleted-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.purge-button {
  background: #b91c1c;
  border: none;
  color: #fff;
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.purge-button:hover {
  background: #991b1b;
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

.export-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  max-width: 900px;
  margin: 1rem auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.export-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.export-panel {
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 1rem;
  background-color: #f9fafb;
}

.export-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  margin-bottom: 0.85rem;
}

.export-row label {
  flex: 1;
  font-weight: 600;
  color: #143029;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.export-row input {
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.export-button {
  background-color: #e6b553;
  color: #143029;
  border: none;
  padding: 0.65rem 1.2rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.export-button.primary {
  background-color: #2563eb;
  color: #fff;
}

.export-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.export-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.export-text {
  color: #4b5563;
  margin: 0 0 1rem 0;
}

.export-hint {
  font-size: 0.85rem;
  color: #6b7280;
}

.section-subtitle {
  margin: 0.5rem 0 1rem 0;
  color: #4b5563;
}

</style>
