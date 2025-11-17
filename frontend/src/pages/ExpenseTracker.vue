<template>
  <main class="expense-tracker">
    <h2 class="page-title">Expense Tracker</h2>
    <p class="page-subtitle">
      Review your cash and electronic income alongside outgoing expenses for the selected period.
    </p>

    <section class="filters-card">
      <label>
        From
        <input type="date" v-model="filters.from" />
      </label>
      <label>
        To
        <input type="date" v-model="filters.to" />
      </label>
      <button class="filter-button" @click="fetchTracker" :disabled="isLoading">
        {{ isLoading ? 'Loading...' : 'Apply Filters' }}
      </button>
      <button class="clear-button" @click="resetFilters" :disabled="isLoading">
        Reset
      </button>
    </section>

    <section class="export-report-card">
      <h3>Export Expense Report</h3>
      <p class="helper-text">
        Download an Excel summary of expenses grouped by day, week, or month.
      </p>
      <div class="export-fields">
        <label>
          Start Date
          <input type="date" v-model="expenseReportFilters.startDate" />
        </label>
        <label>
          End Date
          <input type="date" v-model="expenseReportFilters.endDate" />
        </label>
        <label>
          Period
          <select v-model="expenseReportFilters.period">
            <option v-for="option in periodOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <button
          class="export-button"
          type="button"
          @click="handleExportExpenseReport"
          :disabled="exportingExpenseReport"
        >
          {{ exportingExpenseReport ? 'Exporting...' : 'Export Expense Report' }}
        </button>
      </div>
    </section>

    <section v-if="tracker" class="summary-grid">
      <div class="summary-card income-card">
        <p>Electronic Income</p>
        <span>{{ formatCurrency(tracker.electronicIncome.total) }}</span>
      </div>
      <div class="summary-card income-card">
        <p>Cash Income</p>
        <span>{{ formatCurrency(tracker.cashIncome.total) }}</span>
      </div>
      <div class="summary-card expense-card">
        <p>Expenses</p>
        <span>{{ formatCurrency(tracker.expenses.total) }}</span>
        <div class="expense-breakdown">
          <div>
            <small>Inventory</small>
            <strong>{{ formatCurrency(tracker.expenses.inventoryTotal) }}</strong>
          </div>
          <div>
            <small>Other</small>
            <strong>{{ formatCurrency(tracker.expenses.otherTotal) }}</strong>
          </div>
        </div>
      </div>
      <div class="summary-card net-card" :class="{ positive: tracker.netIncome >= 0, negative: tracker.netIncome < 0 }">
        <p>Net Income</p>
        <span>{{ formatCurrency(tracker.netIncome) }}</span>
      </div>
    </section>

    <section class="entry-grid" v-if="!isLoading">
      <div class="entry-card">
        <h3>Add Electronic Income</h3>
        <form class="entry-form" @submit.prevent="submitElectronicIncome">
          <label>
            Date
            <input type="date" v-model="electronicForm.incomeDate" required />
          </label>
          <label>
            Channel
            <input v-model="electronicForm.channel" placeholder="e.g., Card, DoorDash" required />
          </label>
          <label>
            Amount
            <input type="number" step="0.01" min="0" v-model.number="electronicForm.amount" required />
          </label>
          <label>
            Notes
            <input v-model="electronicForm.notes" placeholder="Optional" />
          </label>
          <button type="submit" :disabled="saving.electronic">
            {{ saving.electronic ? 'Saving...' : 'Add Income' }}
          </button>
        </form>
        <p v-if="entryFeedback.electronic.message" :class="['form-status', entryFeedback.electronic.type]">
          {{ entryFeedback.electronic.message }}
        </p>
      </div>

      <div class="entry-card">
        <h3>Add Cash Income</h3>
        <form class="entry-form" @submit.prevent="submitCashIncome">
          <label>
            Date
            <input type="date" v-model="cashForm.incomeDate" required />
          </label>
          <label>
            Amount
            <input type="number" step="0.01" min="0" v-model.number="cashForm.amount" required />
          </label>
          <label>
            Notes
            <input v-model="cashForm.notes" placeholder="Optional" />
          </label>
          <button type="submit" :disabled="saving.cash">
            {{ saving.cash ? 'Saving...' : 'Add Cash Income' }}
          </button>
        </form>
        <p v-if="entryFeedback.cash.message" :class="['form-status', entryFeedback.cash.type]">
          {{ entryFeedback.cash.message }}
        </p>
      </div>

      <div class="entry-card">
        <h3>Add Expense</h3>
        <form class="entry-form" @submit.prevent="submitExpense">
          <label>
            Date
            <input type="date" v-model="expenseForm.expenseDate" required />
          </label>
          <label>
            Payment Type
            <input v-model="expenseForm.paymentType" placeholder="e.g., CHASE, Cash" required />
          </label>
          <label>
            Paid To
            <input v-model="expenseForm.paidTo" placeholder="Vendor / recipient" required />
          </label>
          <label>
            Description
            <input v-model="expenseForm.description" placeholder="Optional" />
          </label>
          <label>
            Amount
            <input type="number" step="0.01" min="0" v-model.number="expenseForm.amount" required />
          </label>
          <button type="submit" :disabled="saving.expense">
            {{ saving.expense ? 'Saving...' : 'Add Expense' }}
          </button>
        </form>
        <p v-if="entryFeedback.expense.message" :class="['form-status', entryFeedback.expense.type]">
          {{ entryFeedback.expense.message }}
        </p>
      </div>

      <div class="entry-card import-card">
        <h3>Import From Excel</h3>
        <p class="helper-text">
          Upload a spreadsheet (.xlsx) that has headers in the first row. Only the first worksheet will be read.
        </p>
        <label>
          Import Type
          <select v-model="importForm.type">
            <option value="expenses">Expenses</option>
            <option value="cash">Cash Income</option>
            <option value="electronic">Electronic Income</option>
          </select>
        </label>
        <label class="file-input">
          Excel File
          <input
            type="file"
            accept=".xlsx,.xls"
            @change="handleImportFile"
            ref="importInput"
          />
        </label>
        <p class="file-name">{{ importForm.file?.name ?? 'No file selected' }}</p>
        <button class="import-button" @click="handleImportExcel" :disabled="saving.import">
          {{ saving.import ? 'Importing...' : 'Import Excel' }}
        </button>
        <p v-if="entryFeedback.import.message" :class="['form-status', entryFeedback.import.type]">
          {{ entryFeedback.import.message }}
        </p>
      </div>
    </section>

    <div v-if="isLoading" class="status-message">Loading expense tracker...</div>
    <div v-else-if="errorMessage" class="status-message error">{{ errorMessage }}</div>

    <section v-else-if="tracker" class="tables-wrapper">
      <div class="table-card">
        <div class="table-header">
          <h3>Electronic Income</h3>
          <p>Total: <strong>{{ formatCurrency(tracker.electronicIncome.total) }}</strong></p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Channel</th>
              <th>Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tracker.electronicIncome.rows" :key="row.electronicIncomeId">
              <td>{{ formatDate(row.incomeDate) }}</td>
              <td>{{ row.paymentType }}</td>
              <td>{{ formatCurrency(row.amount) }}</td>
              <td>{{ row.notes || '-' }}</td>
            </tr>
            <tr v-if="!tracker.electronicIncome.rows.length">
              <td colspan="4" class="status-message">No electronic income in range.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-card">
        <div class="table-header">
          <h3>Cash Income</h3>
          <p>Total: <strong>{{ formatCurrency(tracker.cashIncome.total) }}</strong></p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tracker.cashIncome.rows" :key="row.cashIncomeId">
              <td>{{ formatDate(row.incomeDate) }}</td>
              <td>{{ formatCurrency(row.amount) }}</td>
              <td>{{ row.notes || '-' }}</td>
            </tr>
            <tr v-if="!tracker.cashIncome.rows.length">
              <td colspan="3" class="status-message">No cash income in range.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-card">
        <div class="table-header">
          <h3>Expenses</h3>
          <p>
            Total: <strong>{{ formatCurrency(tracker.expenses.total) }}</strong>
            <span class="badge legend inventory">Inventory {{ formatCurrency(tracker.expenses.inventoryTotal) }}</span>
            <span class="badge legend manual">Other {{ formatCurrency(tracker.expenses.otherTotal) }}</span>
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Payment Type</th>
              <th>Paid To</th>
              <th>Description</th>
              <th>Source</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tracker.expenses.rows" :key="row.expenseId">
              <td>{{ formatDate(row.expenseDate) }}</td>
              <td>{{ row.paymentType }}</td>
              <td>{{ row.paidTo }}</td>
              <td>{{ row.description || '-' }}</td>
              <td>
                <span class="source-badge" :class="row.source">
                  {{ row.source === 'inventory' ? 'Inventory' : 'Other' }}
                </span>
              </td>
              <td>{{ formatCurrency(row.amount) }}</td>
            </tr>
            <tr v-if="!tracker.expenses.rows.length">
              <td colspan="6" class="status-message">No expenses in range.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'

import { apiClient } from '../services/apiClient'

const tracker = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

const filters = reactive({
  from: '',
  to: ''
})

const expenseReportFilters = reactive({
  startDate: '',
  endDate: '',
  period: 'day'
})

const exportingExpenseReport = ref(false)

const getToday = () => new Date().toISOString().slice(0, 10)

const electronicForm = reactive({
  incomeDate: getToday(),
  channel: 'Card',
  amount: null,
  notes: ''
})

const cashForm = reactive({
  incomeDate: getToday(),
  amount: null,
  notes: ''
})

const expenseForm = reactive({
  expenseDate: getToday(),
  paymentType: 'CHASE',
  paidTo: '',
  description: '',
  amount: null
})

const importForm = reactive({
  type: 'expenses',
  file: null
})
const importInput = ref(null)

const saving = reactive({
  electronic: false,
  cash: false,
  expense: false,
  import: false
})

const entryFeedback = reactive({
  electronic: { type: '', message: '' },
  cash: { type: '', message: '' },
  expense: { type: '', message: '' },
  import: { type: '', message: '' }
})

const setFeedback = (key, type, message) => {
  entryFeedback[key].type = type
  entryFeedback[key].message = message
}

const periodOptions = [
  { label: 'Daily', value: 'day' },
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' }
]

const formatCurrency = value =>
  Number(value ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const formatDate = value => {
  if (!value) return '-'
  return value.slice(0, 10)
}

const fileTimestamp = () =>
  new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const getDefaultRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10)
  }
}

const resetFilters = () => {
  const range = getDefaultRange()
  filters.from = range.from
  filters.to = range.to
  expenseReportFilters.startDate = range.from
  expenseReportFilters.endDate = range.to
  fetchTracker()
}

const fetchTracker = async () => {
  if (isLoading.value) return
  try {
    isLoading.value = true
    errorMessage.value = ''
    const params = {}
    if (filters.from) params.from = filters.from
    if (filters.to) params.to = filters.to
    tracker.value = await apiClient.getExpenseTracker(params)
  } catch (error) {
    errorMessage.value = error.message ?? 'Unable to load expense tracker.'
  } finally {
    isLoading.value = false
  }
}

const handleExportExpenseReport = async () => {
  try {
    if (!expenseReportFilters.startDate || !expenseReportFilters.endDate) {
      throw new Error('Select a start and end date first.')
    }
    if (expenseReportFilters.startDate > expenseReportFilters.endDate) {
      throw new Error('Start date must be before end date.')
    }
    exportingExpenseReport.value = true
    const blob = await apiClient.exportExpenseReport({
      startDate: expenseReportFilters.startDate,
      endDate: expenseReportFilters.endDate,
      period: expenseReportFilters.period
    })
    triggerDownload(
      blob,
      `expense-report_${expenseReportFilters.startDate}_${expenseReportFilters.endDate}_${expenseReportFilters.period}_${fileTimestamp()}.xlsx`
    )
  } catch (error) {
    alert(error.message ?? 'Unable to export the expense report right now.')
  } finally {
    exportingExpenseReport.value = false
  }
}

const resetElectronicForm = () => {
  electronicForm.incomeDate = getToday()
  electronicForm.channel = 'Card'
  electronicForm.amount = null
  electronicForm.notes = ''
}

const resetCashForm = () => {
  cashForm.incomeDate = getToday()
  cashForm.amount = null
  cashForm.notes = ''
}

const resetExpenseForm = () => {
  expenseForm.expenseDate = getToday()
  expenseForm.paymentType = 'CHASE'
  expenseForm.paidTo = ''
  expenseForm.description = ''
  expenseForm.amount = null
}

const submitElectronicIncome = async () => {
  setFeedback('electronic', '', '')
  if (!electronicForm.incomeDate || !electronicForm.channel || electronicForm.amount == null) {
    setFeedback('electronic', 'error', 'Please fill all required fields.')
    return
  }
  try {
    saving.electronic = true
    await apiClient.createElectronicIncome({
      incomeDate: electronicForm.incomeDate,
      channel: electronicForm.channel.trim(),
      amount: Number(electronicForm.amount),
      notes: electronicForm.notes || undefined
    })
    setFeedback('electronic', 'success', 'Electronic income added.')
    resetElectronicForm()
    await fetchTracker()
  } catch (error) {
    setFeedback('electronic', 'error', error.message ?? 'Unable to add electronic income.')
  } finally {
    saving.electronic = false
  }
}

const submitCashIncome = async () => {
  setFeedback('cash', '', '')
  if (!cashForm.incomeDate || cashForm.amount == null) {
    setFeedback('cash', 'error', 'Please fill all required fields.')
    return
  }
  try {
    saving.cash = true
    await apiClient.createCashIncome({
      incomeDate: cashForm.incomeDate,
      amount: Number(cashForm.amount),
      notes: cashForm.notes || undefined
    })
    setFeedback('cash', 'success', 'Cash income added.')
    resetCashForm()
    await fetchTracker()
  } catch (error) {
    setFeedback('cash', 'error', error.message ?? 'Unable to add cash income.')
  } finally {
    saving.cash = false
  }
}

const submitExpense = async () => {
  setFeedback('expense', '', '')
  if (
    !expenseForm.expenseDate ||
    !expenseForm.paymentType ||
    !expenseForm.paidTo ||
    expenseForm.amount == null
  ) {
    setFeedback('expense', 'error', 'Please fill all required fields.')
    return
  }
  try {
    saving.expense = true
    await apiClient.createExpense({
      expenseDate: expenseForm.expenseDate,
      paymentType: expenseForm.paymentType.trim(),
      paidTo: expenseForm.paidTo.trim(),
      description: expenseForm.description || undefined,
      amount: Number(expenseForm.amount)
    })
    setFeedback('expense', 'success', 'Expense recorded.')
    resetExpenseForm()
    await fetchTracker()
  } catch (error) {
    setFeedback('expense', 'error', error.message ?? 'Unable to add expense.')
  } finally {
    saving.expense = false
  }
}

const handleImportFile = event => {
  const file = event.target.files && event.target.files[0] ? event.target.files[0] : null
  importForm.file = file
}

const handleImportExcel = async () => {
  setFeedback('import', '', '')
  if (!importForm.file) {
    setFeedback('import', 'error', 'Select an Excel file first.')
    return
  }
  try {
    saving.import = true
    const result = await apiClient.importFinanceEntries({
      type: importForm.type,
      file: importForm.file
    })
    setFeedback(
      'import',
      'success',
      `Imported ${result.imported} ${importForm.type === 'cash' ? 'cash income' : importForm.type}.`
    )
    importForm.file = null
    if (importInput.value) {
      importInput.value.value = ''
    }
    await fetchTracker()
  } catch (error) {
    setFeedback('import', 'error', error.message ?? 'Unable to import Excel file.')
  } finally {
    saving.import = false
  }
}

onMounted(() => {
  resetFilters()
})
</script>

<style scoped>
.expense-tracker {
  padding: 2rem;
  background-color: #FFF7ED;
  min-height: 100vh;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #123929;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: #4b5563;
  margin-bottom: 1.5rem;
}

.filters-card {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  background-color: #fff;
  padding: 1rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;
  align-items: flex-end;
}

.export-report-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;
}

.export-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  align-items: flex-end;
}

.export-fields label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  color: #1f4e3d;
  gap: 0.35rem;
}

.export-fields input,
.export-fields select {
  padding: 0.55rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.export-button {
  background-color: #2563eb;
  color: #fff;
  border: none;
  padding: 0.7rem 1.4rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.export-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.filters-card label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  color: #1f4e3d;
  gap: 0.35rem;
}

.filters-card input {
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.filter-button,
.clear-button {
  border: none;
  padding: 0.6rem 1.4rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.filter-button {
  background-color: #1f4e3d;
  color: #fff;
}

.filter-button:disabled,
.clear-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.clear-button {
  background-color: #e5e7eb;
  color: #1f2937;
}

.filter-button:not(:disabled):hover,
.clear-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 1rem 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.summary-card p {
  margin: 0;
  color: #4b5563;
  font-weight: 600;
}

.summary-card span {
  font-size: 1.6rem;
  font-weight: 700;
}

.income-card span {
  color: #0f9d58;
}

.expense-card span {
  color: #b45309;
}

.net-card span {
  color: inherit;
}

.net-card.positive span {
  color: #0f9d58;
}

.net-card.negative span {
  color: #b91c1c;
}

.expense-breakdown {
  margin-top: 0.75rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.expense-breakdown small {
  color: #6b7280;
  display: block;
}

.expense-breakdown strong {
  color: #b45309;
  font-size: 1rem;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.entry-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}

.entry-card h3 {
  margin-bottom: 0.5rem;
  color: #123929;
}

.entry-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.entry-form label {
  display: flex;
  flex-direction: column;
  font-weight: 600;
  color: #1f4e3d;
  gap: 0.35rem;
}

.entry-card input,
.entry-card select {
  padding: 0.55rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.entry-form button,
.import-button {
  background-color: #1f4e3d;
  color: #fff;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.entry-form button:disabled,
.import-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.entry-form button:not(:disabled):hover,
.import-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.helper-text {
  color: #4b5563;
  margin-bottom: 0.75rem;
}

.file-input input {
  margin-top: 0.35rem;
}

.file-name {
  font-size: 0.9rem;
  color: #374151;
  margin: 0.25rem 0 0.75rem 0;
  word-break: break-all;
}

.form-status {
  margin-top: 0.5rem;
  font-weight: 600;
}

.form-status.success {
  color: #0f9d58;
}

.form-status.error {
  color: #b91c1c;
}

.tables-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.table-card {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow-x: auto;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  color: #1f2937;
}

th {
  font-weight: 700;
  color: #0f4c3a;
}

.source-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
}

.source-badge.inventory {
  background-color: #fef3c7;
  color: #b45309;
}

.source-badge.manual {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.badge.legend {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.badge.legend.inventory {
  color: #b45309;
}

.badge.legend.manual {
  color: #1d4ed8;
}

.status-message {
  margin-top: 1rem;
  text-align: center;
  color: #1f4e3d;
  font-weight: 600;
}

.status-message.error {
  color: #b91c1c;
}

@media (max-width: 768px) {
  .expense-tracker {
    padding: 1rem;
  }

  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>
