<template>
  <div>
    <pre>{{ data }}</pre>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  setup() {
    const data = ref({ name: 'vue 示例', items: [1,2,3] })
    return { data }
  }
})
</script>
