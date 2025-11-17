const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api').replace(
  /\/$/,
  ''
)

const SESSION_TOKEN_KEY = 'sessionToken'
const buildQueryString = params => {
  const searchParams = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value)
    }
  })
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

const getSessionToken = () => window.localStorage.getItem(SESSION_TOKEN_KEY)

const handleUnauthorized = message => {
  window.localStorage.removeItem(SESSION_TOKEN_KEY)
  window.localStorage.removeItem('isAuthenticated')
  window.dispatchEvent(new Event('authChange'))
  if (message) {
    alert(message)
  }
  window.location.href = '/login'
}

const request = async (path, options = {}) => {
  const config = {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json'
    }
  }

  if (options.body) {
    config.headers['Content-Type'] = 'application/json'
    config.body = JSON.stringify(options.body)
  }

  const sessionToken = getSessionToken()
  if (sessionToken) {
    config.headers['X-Session-Token'] = sessionToken
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config)

  if (!response.ok) {
    let details
    try {
      const data = await response.json()
      details = data?.message ?? response.statusText
    } catch (error) {
      details = response.statusText
    }

    if (response.status === 401) {
      handleUnauthorized(details || 'Session expired due to inactivity. Please log in again.')
    }

    throw new Error(details || 'Request failed')
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

const downloadExcel = async (path, params = {}) => {
  const url = `${API_BASE_URL}${path}${buildQueryString(params)}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ...(getSessionToken() ? { 'X-Session-Token': getSessionToken() } : {})
    }
  })

  if (!response.ok) {
    let details
    try {
      const data = await response.json()
      details = data?.message ?? response.statusText
    } catch {
      details = response.statusText
    }
    if (response.status === 401) {
      handleUnauthorized(details || 'Session expired due to inactivity. Please log in again.')
    }
    throw new Error(details || 'Unable to download file')
  }

  return response.blob()
}

export const apiClient = {
  getHealth: () => request('/health'),

  // Categories
  getCategories: () => request('/categories'),

  // Items
  getItems: () => request('/items'),
  createItem: payload => request('/items', { method: 'POST', body: payload }),
  updateItem: (id, payload) => request(`/items/${id}`, { method: 'PUT', body: payload }),
  deleteItem: id => request(`/items/${id}`, { method: 'DELETE' }),
  getDeletedItems: () => request('/items/deleted'),
  restoreItem: id => request(`/items/${id}/restore`, { method: 'PATCH' }),
  purgeItem: id => request(`/items/${id}/purge`, { method: 'DELETE' }),
  logItemUsage: (id, payload) => request(`/items/${id}/usage`, { method: 'POST', body: payload }),

  // Purchases
  getPurchases: () => request('/purchases'),
  createPurchase: payload => request('/purchases', { method: 'POST', body: payload }),

  // Usage records
  getUsageRecords: () => request('/usage'),
  createUsageRecord: payload => request('/usage', { method: 'POST', body: payload }),

  // Reports
  getReports: () => request('/reports'),
  createReport: payload => request('/reports', { method: 'POST', body: payload }),
  getReportSummary: params => {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.period) searchParams.append('period', params.period)
    return request(`/reports/summary?${searchParams.toString()}`)
  },

  // Settings
  getInventorySettings: () => request('/settings/inventory'),
  updateInventorySettings: payload =>
    request('/settings/inventory', { method: 'PUT', body: payload }),
  getInventoryAlerts: () => request('/inventory/alerts'),

  // Material usage
  getMaterialUsage: params => {
    const searchParams = new URLSearchParams()
    if (params?.fromDate) searchParams.append('fromDate', params.fromDate)
    if (params?.toDate) searchParams.append('toDate', params.toDate)
    const query = searchParams.toString()
    return request(`/material-usage${query ? `?${query}` : ''}`)
  },
  createMaterialUsage: payload =>
    request('/material-usage', { method: 'POST', body: payload }),

  // Users
  getUsers: () => request('/users'),

  // Dashboard
  getDashboardSummary: () => request('/dashboard/summary'),

  // Excel exports
  exportFullInventory: () => downloadExcel('/exports/inventory/full'),
  exportLowStockInventory: params =>
    downloadExcel('/exports/inventory/low-stock', params),
  exportExpiringInventory: params =>
    downloadExcel('/exports/inventory/expiring-soon', params),
  exportExpenseReport: params => downloadExcel('/exports/expenses', params),

  // Expense tracker
  getExpenseTracker: params => {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.append('from', params.from)
    if (params?.to) searchParams.append('to', params.to)
    const query = searchParams.toString()
    return request(`/finance/tracker${query ? `?${query}` : ''}`)
  },
  createElectronicIncome: payload =>
    request('/finance/electronic-income', { method: 'POST', body: payload }),
  createCashIncome: payload =>
    request('/finance/cash-income', { method: 'POST', body: payload }),
  createExpense: payload => request('/finance/expenses', { method: 'POST', body: payload }),
  importFinanceEntries: ({ type, file }) => {
    const formData = new FormData()
    formData.append('type', type)
    formData.append('file', file)
    return fetch(`${API_BASE_URL}/finance/import`, {
      method: 'POST',
      body: formData,
      headers: getSessionToken() ? { 'X-Session-Token': getSessionToken() } : undefined
    }).then(async response => {
      if (!response.ok) {
        let details
        try {
          const data = await response.json()
          details = data?.message ?? response.statusText
        } catch {
          details = response.statusText
        }
        if (response.status === 401) {
          handleUnauthorized(details || 'Session expired due to inactivity. Please log in again.')
        }
        throw new Error(details || 'Unable to import file')
      }
      return response.json()
    })
  },

  // Auth
  login: payload => request('/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST' })
}
