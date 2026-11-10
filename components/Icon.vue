<template>
  <svg
    :width="size" :height="size" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
    <circle v-for="(c, i) in circles" :key="'c' + i" :cx="c[0]" :cy="c[1]" :r="c[2]" />
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ name: string; size?: number | string; stroke?: number | string }>(), {
  size: 18,
  stroke: 1.8
})

const MAP: Record<string, { d?: string[]; c?: [number, number, number][] }> = {
  search: { c: [[11, 11, 7]], d: ['M20 20l-3.5-3.5'] },
  cart: { d: ['M3 4h2.2l2.3 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6'], c: [[9.5, 20.5, 1.2], [17.5, 20.5, 1.2]] },
  heart: { d: ['M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 3.2C19.5 15.4 12 20 12 20z'] },
  compare: { d: ['M8 3v18M16 3v18M3 8h18M3 16h18'] },
  user: { c: [[12, 8, 3.6]], d: ['M4.5 20a7.5 7.5 0 0 1 15 0'] },
  phone: { d: ['M6.5 3h3l1.5 4-2 1.6a12 12 0 0 0 6.4 6.4L17 13l4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 3.5 5.2 2 2 0 0 1 5.5 3z'] },
  mail: { d: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'] },
  pin: { d: ['M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z'], c: [[12, 10, 2.4]] },
  clock: { c: [[12, 12, 9]], d: ['M12 7.5V12l3 2'] },
  chevronDown: { d: ['M6 9l6 6 6-6'] },
  chevronRight: { d: ['M9 6l6 6-6 6'] },
  chevronLeft: { d: ['M15 6l-6 6 6 6'] },
  arrowRight: { d: ['M4 12h15', 'M13 6l6 6-6 6'] },
  close: { d: ['M6 6l12 12M18 6L6 18'] },
  menu: { d: ['M4 7h16M4 12h16M4 17h16'] },
  grid: { d: ['M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'] },
  check: { d: ['M4 12.5l5 5L20 6.5'] },
  truck: { d: ['M3 7h11v9H3zM14 10h4l3 3v3h-7z'], c: [[7, 18.5, 1.6], [17.5, 18.5, 1.6]] },
  download: { d: ['M12 4v11', 'M7.5 11l4.5 4.5L16.5 11', 'M4 19h16'] },
  star: { d: ['M12 4l2.5 5 5.5.8-4 3.9 1 5.4-5-2.7-5 2.7 1-5.4-4-3.9 5.5-.8z'] },
  shield: { d: ['M12 3l7 3v5.5c0 4.3-3 7.7-7 9.5-4-1.8-7-5.2-7-9.5V6z', 'M9 12l2 2 4-4'] },
  headphones: { d: ['M4 14v-2a8 8 0 0 1 16 0v2', 'M4 14h2.5v5H5.5A1.5 1.5 0 0 1 4 17.5z', 'M20 14h-2.5v5h1A1.5 1.5 0 0 0 20 17.5z'] },
  facebook: { d: ['M14.5 8.5h2.2V5.6h-2.4c-2.4 0-3.8 1.5-3.8 3.9v1.7H8.4v3h2.1V21h3.1v-6.8h2.3l.4-3h-2.7V9.7c0-.8.3-1.2 1-1.2z'] },
  instagram: { d: ['M4.5 8.2A3.7 3.7 0 0 1 8.2 4.5h7.6a3.7 3.7 0 0 1 3.7 3.7v7.6a3.7 3.7 0 0 1-3.7 3.7H8.2a3.7 3.7 0 0 1-3.7-3.7z'], c: [[12, 12, 3.6], [17, 7, 0.9]] },
  chat: { d: ['M4 5h16v11H9l-5 4z'] },
  filter: { d: ['M4 6h16M7 12h10M10 18h4'] },
  plus: { d: ['M12 5v14M5 12h14'] },
  minus: { d: ['M5 12h14'] },
  spark: { d: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'] }
}

const entry = computed(() => MAP[props.name] || MAP.grid)
const paths = computed(() => entry.value.d || [])
const circles = computed(() => entry.value.c || [])
</script>
