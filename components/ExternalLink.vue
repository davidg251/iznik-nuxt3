<template>
  <!-- eslint-disable-next-line -->
  <a :href="href" target="_blank" rel="noopener noreferrer" @click="openInBrowser"><slot /></a>
</template>
<script>
export default {
  props: {
    href: {
      type: String,
      required: true,
    },
  },
  methods: {
    openInBrowser() {
      const runtimeConfig = useRuntimeConfig()

      if (runtimeConfig.public.IS_APP) {
        // eslint-disable-next-line no-undef
        cordova.InAppBrowser.open(this.href, '_system')
        return false
      }
      return true
    },
  },
}
</script>
