<!-- src/views/Dashboard.vue -->
<template>
  <main class="p-6 bg-[#FFF7ED] min-h-screen">
    <h1 class="text-3xl font-bold text-[#8B2E1D] mb-6">Dashboard</h1>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
      <InventoryCard title="Total Materials" :value="120" icon="🥩" />
      <InventoryCard title="Utensils in Use" :value="45" icon="🍴" />
      <InventoryCard title="Weekly Cost ($)" :value="1250" icon="💰" />
    </div>

    <BarGraph />
  </main>
</template>

<script setup>
import BarGraph from '@/components/BarGraph.vue'
import InventoryCard from '@/components/InventoryCard.vue'
</script>
