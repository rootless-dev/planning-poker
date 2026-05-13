<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <footer class="text-center py-6 text-xs" style="color: var(--color-muted);">
    {{ t('home.footer.builtWith') }} <a
      href="https://github.com/rootless-dev/planning-poker"
      target="_blank"
      rel="noopener noreferrer"
      class="underline"
    >{{ t('home.footer.codeOnGitHub') }}</a>.
  </footer>
</template>
