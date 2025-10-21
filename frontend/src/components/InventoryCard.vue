<!-- src/components/InventoryCard.vue -->
<template>
  <div class="bg-white rounded-2xl shadow-md p-4 text-center border-t-4 border-[#D97706] hover:scale-105 transition-transform">
    <div class="text-3xl mb-2">{{ icon }}</div>
    <h2 class="text-lg font-semibold text-[#3F2E2E]">{{ title }}</h2>
    <p class="text-2xl font-bold text-[#8B2E1D] mt-1">{{ value }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  value: Number,
  icon: String
})
</script>
