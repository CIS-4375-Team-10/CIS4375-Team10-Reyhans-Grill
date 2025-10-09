import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../pages/Dashboard.vue'
import Materials from '../pages/Materials.vue'
import Utensils from '../pages/Utensils.vue'
import Reports from '../pages/Reports.vue'

const routes = [
  { path: '/', component: Dashboard },
  { path: '/materials', component: Materials },
  { path: '/utensils', component: Utensils },
  { path: '/reports', component: Reports }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
