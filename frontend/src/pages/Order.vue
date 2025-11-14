<template>
  <main class="orders-container">
    <h2 class="page-title">Orders</h2>

    <!-- Orders Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Vendor</th>
            <th>Status</th>
            <th>Order Date</th>
            <th>Total ($)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>{{ order.id }}</td>
            <td>{{ order.vendor }}</td>
            <td>{{ order.status }}</td>
            <td>{{ order.date }}</td>
            <td>{{ order.total }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script setup>
import { ref } from 'vue'

// Hardcoded example orders
const orders = ref([
  { id: 101, vendor: 'DoorDash', status: 'Delivered', date: '2025-10-18', total: 45.50 },
  { id: 102, vendor: 'UberEats', status: 'Preparing', date: '2025-10-19', total: 32.75 },
  { id: 103, vendor: 'Grubhub', status: 'Pending', date: '2025-10-19', total: 28.90 },
  { id: 104, vendor: 'DoorDash', status: 'Cancelled', date: '2025-10-17', total: 15.00 },
])
</script>

<style scoped>
.orders-container {
  padding: 2rem;
  background-color: #f3f7f6;
  min-height: 100vh;
}

.page-title {
  font-size: 1.8rem;
  color:#143029;
  font-weight: 700;
  text-align: center;
  margin-bottom: 2rem;
}

.table-container {
  background-color: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 900px;
  margin: 0 auto;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid #D1D5DB;
}

th {
  color: #143029;
  font-weight: 700;
}

td {
  color: #000000;
  font-weight: 550;
}
</style>
