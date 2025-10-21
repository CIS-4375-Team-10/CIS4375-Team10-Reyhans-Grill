import { createRouter, createWebHistory } from 'vue-router'
import Login from '../pages/Login.vue'
import Dashboard from '../pages/Dashboard.vue'
import Materials from '../pages/Materials.vue'
import Utensils from '../pages/Utensils.vue'
import Reports from '../pages/Reports.vue'
import Order from '../pages/Order.vue'

const routes = [
  { path: '/login', component: Login, name: 'login' },
  { path: '/dashboard', component: Dashboard, name: 'dashboard' },
  { path: '/materials', component: Materials, name: 'materials' },
  { path: '/utensils', component: Utensils, name: 'utensils' },
  { path: '/reports', component: Reports, name: 'reports' },
  { path: '/orders', component: Order, name: 'order' }, 
  { path: '/', component: Login } // root path
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// ✅ Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  
  // Handle root path
  if (to.path === '/') {
    if (isAuthenticated) {
      next('/dashboard')
    } else {
      next('/login')
    }
    return
  }
  
  // Protect authenticated routes
  if (!isAuthenticated && to.path !== '/login') {
    next('/login')
    return
  }
  
  // Redirect authenticated users from login
  if (isAuthenticated && to.path === '/login') {
    next('/dashboard')
    return
  }
  
  next()
})

export default router
