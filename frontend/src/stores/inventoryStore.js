import { defineStore } from 'pinia'

import { apiClient } from '../services/apiClient'

const MATERIAL_CATEGORY_DEFAULTS = [
  { categoryId: 'CAT_FRUITS', categoryName: 'Fruits' },
  { categoryId: 'CAT_VEG', categoryName: 'Vegetables' },
  { categoryId: 'CAT_GRAINS', categoryName: 'Grains' },
  { categoryId: 'CAT_PROTEIN', categoryName: 'Protein' },
  { categoryId: 'CAT_DAIRY', categoryName: 'Dairy' },
  { categoryId: 'CAT_DRINK', categoryName: 'Drinks' }
]

const UTENSIL_CATEGORY_DEFAULTS = [
  { categoryId: 'CAT_COOK', categoryName: 'Cooking' },
  { categoryId: 'CAT_SERVE', categoryName: 'Serving' },
  { categoryId: 'CAT_BAKE', categoryName: 'Baking' },
  { categoryId: 'CAT_CUT', categoryName: 'Cutlery' },
  { categoryId: 'CAT_STORE', categoryName: 'Storage' }
]

const materialCategoryNames = new Set(MATERIAL_CATEGORY_DEFAULTS.map(c => c.categoryName))
const utensilCategoryNames = new Set(UTENSIL_CATEGORY_DEFAULTS.map(c => c.categoryName))

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    items: [],
    purchases: [],
    usageRecords: [],
    reports: [],
    customReport: null,
    categories: [],
    users: [],
    summary: null,
    deletedItems: [],
    loading: {
      items: false,
      purchases: false,
      usage: false,
      reports: false,
      categories: false,
      summary: false,
      deletedItems: false,
      customReport: false
    },
    lastError: null,
    initialized: false
  }),
  getters: {
    materials(state) {
      return state.items.filter(item =>
        item.itemType
          ? item.itemType.toUpperCase() === 'MATERIAL'
          : materialCategoryNames.has(item.categoryName)
      )
    },
    utensils(state) {
      return state.items.filter(item =>
        item.itemType
          ? item.itemType.toUpperCase() === 'UTENSIL'
          : utensilCategoryNames.has(item.categoryName)
      )
    },
    materialCategoryOptions(state) {
      return state.categories.filter(cat => materialCategoryNames.has(cat.categoryName)).length
        ? state.categories.filter(cat => materialCategoryNames.has(cat.categoryName))
        : MATERIAL_CATEGORY_DEFAULTS
    },
    utensilCategoryOptions(state) {
      return state.categories.filter(cat => utensilCategoryNames.has(cat.categoryName)).length
        ? state.categories.filter(cat => utensilCategoryNames.has(cat.categoryName))
        : UTENSIL_CATEGORY_DEFAULTS
    },
    totalItemsCount: state => state.summary?.totalItems ?? state.items.length,
    totalQuantity: state => {
      const deletedQuantity = state.deletedItems.reduce(
        (sum, item) => sum + Number(item.quantityInStock ?? 0),
        0
      )

      const itemsQuantity = state.items.reduce(
        (sum, item) => sum + Number(item.quantityInStock ?? 0),
        0
      )

      if (state.items.length) {
        return Math.max(itemsQuantity - deletedQuantity, 0)
      }

      const summaryQuantity = state.summary?.totalQuantity ?? 0
      return Math.max(summaryQuantity - deletedQuantity, 0)
    },
    utensilsInUse: state =>
      state.summary?.utensilsInUse ??
      state.utensils.reduce((sum, item) => sum + Number(item.quantityInStock ?? 0), 0),
    recentSpend: state => state.summary?.recentSpend ?? 0,
    lowStockItems: state => state.summary?.lowStock ?? [],
    expiringSoonItems: state => state.summary?.expiringSoon ?? [],
    materialsQuantity(state) {
      if (state.summary?.materialsQuantity != null) {
        return Number(state.summary.materialsQuantity) || 0
      }
      return state.materials.reduce((sum, item) => sum + Number(item.quantityInStock ?? 0), 0)
    },
    utensilsQuantity(state) {
      if (state.summary?.utensilsQuantity != null) {
        return Number(state.summary.utensilsQuantity) || 0
      }
      return state.utensils.reduce((sum, item) => sum + Number(item.quantityInStock ?? 0), 0)
    },
    totalMaterialsCount() {
      return this.totalItemsCount
    },
    weeklyCostTotal() {
      return this.recentSpend
    },
    lowStockMaterials() {
      return this.lowStockItems
    },
    expiringSoonMaterials() {
      return this.expiringSoonItems
    },
    utensilsInUse(state) {
      if (state.summary?.utensilsInUse != null) {
        return Number(state.summary.utensilsInUse) || 0
      }
      return state.utensils.reduce((sum, item) => sum + Number(item.quantityInStock ?? 0), 0)
    },
    lowStockCutlery() {
      return this.summary?.lowStockCutlery ?? []
    },
    lowStockServing() {
      return this.summary?.lowStockServing ?? []
    }
  },
  actions: {
    setError(message) {
      this.lastError = message
    },
    clearError() {
      this.lastError = null
    },
    async fetchCategories() {
      this.loading.categories = true
      try {
        this.categories = await apiClient.getCategories()
      } catch (error) {
        this.setError(error.message ?? 'Unable to load categories')
        throw error
      } finally {
        this.loading.categories = false
      }
    },
    async fetchItems() {
      this.loading.items = true
      try {
        this.items = await apiClient.getItems()
      } catch (error) {
        this.setError(error.message ?? 'Unable to load items')
        throw error
      } finally {
        this.loading.items = false
      }
    },
    async createItem(payload) {
      try {
        const body = {
          ...payload,
          status: payload.status ?? 'AVAILABLE',
          itemType: payload.itemType ?? 'OTHER',
          parLevel: payload.parLevel ?? 0,
          reorderPoint: payload.reorderPoint ?? 0
        }

        const created = await apiClient.createItem(body)
        this.items.push(created)
        await this.fetchSummary()
        return created
      } catch (error) {
        this.setError(error.message ?? 'Unable to create item')
        throw error
      }
    },
    async updateItem(itemId, payload) {
      try {
        const body = {
          ...payload,
          parLevel: payload.parLevel ?? 0,
          reorderPoint: payload.reorderPoint ?? 0
        }
        const updated = await apiClient.updateItem(itemId, body)
        this.items = this.items.map(item => (item.itemId === itemId ? updated : item))
        await this.fetchSummary()
        return updated
      } catch (error) {
        this.setError(error.message ?? 'Unable to update item')
        throw error
      }
    },
    async deleteItem(itemId) {
      try {
        await apiClient.deleteItem(itemId)
        this.items = this.items.filter(item => item.itemId !== itemId)
        await this.fetchSummary()
        await this.fetchDeletedItems()
      } catch (error) {
        this.setError(error.message ?? 'Unable to delete item')
        throw error
      }
    },
    async fetchDeletedItems() {
      this.loading.deletedItems = true
      try {
        this.deletedItems = await apiClient.getDeletedItems()
      } catch (error) {
        this.setError(error.message ?? 'Unable to load deleted items')
        throw error
      } finally {
        this.loading.deletedItems = false
      }
    },
    async restoreItem(itemId) {
      try {
        const restored = await apiClient.restoreItem(itemId)
        this.deletedItems = this.deletedItems.filter(item => item.itemId !== itemId)
        this.items.push(restored)
        await this.fetchSummary()
      } catch (error) {
        this.setError(error.message ?? 'Unable to restore item')
        throw error
      }
    },
    async permanentlyDeleteItem(itemId) {
      try {
        await apiClient.purgeItem(itemId)
        this.deletedItems = this.deletedItems.filter(item => item.itemId !== itemId)
      } catch (error) {
        this.setError(error.message ?? 'Unable to permanently delete item')
        throw error
      }
    },
    async logItemUsage(itemId, payload) {
      try {
        const response = await apiClient.logItemUsage(itemId, payload)
        if (response?.item) {
          this.items = this.items.map(item => (item.itemId === response.item.itemId ? response.item : item))
        }
        await this.fetchSummary()
        return response
      } catch (error) {
        this.setError(error.message ?? 'Unable to log usage')
        throw error
      }
    },
    async fetchPurchases() {
      this.loading.purchases = true
      try {
        this.purchases = await apiClient.getPurchases()
      } catch (error) {
        this.setError(error.message ?? 'Unable to load purchases')
        throw error
      } finally {
        this.loading.purchases = false
      }
    },
    async createPurchase(payload) {
      try {
        const created = await apiClient.createPurchase(payload)
        this.purchases.unshift(created)
        return created
      } catch (error) {
        this.setError(error.message ?? 'Unable to create purchase')
        throw error
      }
    },
    async fetchReports() {
      this.loading.reports = true
      try {
        this.reports = await apiClient.getReports()
      } catch (error) {
        this.setError(error.message ?? 'Unable to load reports')
        throw error
      } finally {
        this.loading.reports = false
      }
    },
    async fetchCustomReport(filters) {
      this.loading.customReport = true
      try {
        const data = await apiClient.getReportSummary(filters)
        this.customReport = data
        return data
      } catch (error) {
        this.setError(error.message ?? 'Unable to load custom report')
        throw error
      } finally {
        this.loading.customReport = false
      }
    },
    async fetchUsage() {
      this.loading.usage = true
      try {
        this.usageRecords = await apiClient.getUsageRecords()
      } catch (error) {
        this.setError(error.message ?? 'Unable to load usage records')
        throw error
      } finally {
        this.loading.usage = false
      }
    },
    async fetchUsers() {
      this.users = await apiClient.getUsers()
    },
    async fetchSummary() {
      this.loading.summary = true
      try {
        this.summary = await apiClient.getDashboardSummary()
      } catch (error) {
        this.setError(error.message ?? 'Unable to load dashboard summary')
        throw error
      } finally {
        this.loading.summary = false
      }
    },
    async bootstrap() {
      if (this.initialized) return

      await Promise.all([
        this.fetchCategories(),
        this.fetchItems(),
        this.fetchPurchases(),
        this.fetchReports(),
        this.fetchSummary(),
        this.fetchUsers(),
        this.fetchDeletedItems()
      ])

      this.initialized = true
    }
  }
})
