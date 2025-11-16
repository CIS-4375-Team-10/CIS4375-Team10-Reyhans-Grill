const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api').replace(
  /\/$/,
  ''
)

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

  const response = await fetch(`${API_BASE_URL}${path}`, config)

  if (!response.ok) {
    let details
    try {
      const data = await response.json()
      details = data?.message ?? response.statusText
    } catch (error) {
      details = response.statusText
    }

    throw new Error(details || 'Request failed')
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
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

  // Users
  getUsers: () => request('/users'),

  // Dashboard
  getDashboardSummary: () => request('/dashboard/summary')
}
