import { defineStore } from 'pinia'

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    materials: [],      // list of raw materials
    utensils: [],       // list of utensils
    weeklyCosts: []     // weekly inventory costs
  }),
  actions: {
    // Add a material
    addMaterial(material) {
      this.materials.push(material)
    },
    // Add a utensil
    addUtensil(utensil) {
      this.utensils.push(utensil)
    },
    // Add a weekly cost record
    addWeeklyCost(cost) {
      this.weeklyCosts.push(cost)
    }
  },
  getters: {
    // Example: total weekly cost
    totalWeeklyCost: (state) => state.weeklyCosts.reduce((sum, c) => sum + c.amount, 0)
  }
})
