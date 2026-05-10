<script setup lang="ts">
defineProps<{ id: string }>()
</script>

<template>
  <main class="p-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold">Sala {{ id }}</h1>
    <p style="color: var(--color-muted);">Sala vem na Task 7.</p>
  </main>
</template>
