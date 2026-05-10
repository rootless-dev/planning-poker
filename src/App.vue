<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import ToastsLayer from '@/components/ToastsLayer.vue'
</script>

<template>
  <AppHeader />
  <RouterView />
  <ToastsLayer />
</template>
