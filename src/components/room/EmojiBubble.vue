<script setup lang="ts">
defineProps<{ value: string }>()
defineEmits<{ done: [] }>()
</script>
<template><span class="bubble-stub">{{ value }}</span></template>
