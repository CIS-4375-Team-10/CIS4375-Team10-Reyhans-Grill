import { createRouter, createWebHistory } from 'vue-router'
import Login from '../pages/Login.vue'
import Dashboard from '../pages/Dashboard.vue'
import Materials from '../pages/Materials.vue'
import Utensils from '../pages/Utensils.vue'
import Reports from '../pages/Reports.vue'

const routes = [
  { path: '/login', component: Login, name: 'login' },
  { path: '/dashboard', component: Dashboard, name: 'dashboard' },
  { path: '/materials', component: Materials, name: 'materials' },
  { path: '/utensils', component: Utensils, name: 'utensils' },
  { path: '/reports', component: Reports, name: 'reports' },
  { path: '/', component: Login } // Use component instead of redirect
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// ✅ Enhanced navigation guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  
  // Handle root path - replace instead of redirect to avoid history issues
  if (to.path === '/') {
    if (isAuthenticated) {
      next('/dashboard')
    } else {
      next('/login')
    }
    return
  }
  
  // Protect routes if not authenticated
  if (!isAuthenticated && to.path !== '/login') {
    next('/login')
    return
  }
  
  // Redirect authenticated users away from login
  if (isAuthenticated && to.path === '/login') {
    next('/dashboard')
    return
  }
  
  next()
})

export default router