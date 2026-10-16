<script setup lang="ts">
// 内联图标集（避免额外依赖；stroke 跟随 currentColor）
const props = defineProps<{ name: string }>()

const PATHS: Record<string, string> = {
  grid: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5',
  plus: 'M12 5v14M5 12h14',
  folder: 'M3 7a2 2 0 0 1 2-2h4.5l2 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  tag: 'M20.5 12.5 12 21l-8.5-8.5V4h8.5zM8.5 8.5h.01',
  chart: 'M3 21h18M6 21V11M11 21V5M16 21v-7',
  settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.3 5.3l1.9 1.9M16.8 16.8l1.9 1.9M18.7 5.3l-1.9 1.9M7.2 16.8l-1.9 1.9',
  spark: 'M12 3l1.9 5.4L19 10.3l-5.1 1.9L12 17.6l-1.9-5.4L5 10.3l5.1-1.9z',
  plug: 'M9 3v5M15 3v5M7 8h10v3.5a5 5 0 0 1-10 0zM12 16.5V21',
  check: 'M20.5 6.5 9.5 17.5 4 12',
  chat: 'M20.5 11.5a8 8 0 1 1-3.3-6.4l3.3-1-1 3.3a8 8 0 0 1 1 4.1zM8.5 11h7M8.5 14.5h4',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  wrench: 'M10.6 6.6 17 13l-4 4-6.4-6.4a4 4 0 1 1 4-4zM15 16l4.5 4.5',
  upload: 'M12 16.5V4M7.5 8.5 12 4l4.5 4.5M4 20h16',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  user: 'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-3.8 3.6-6 8-6s8 2.2 8 6',
  bell: 'M18 16.5V11a6 6 0 1 0-12 0v5.5L4 19h16zM10 21.5h4',
  external: 'M14 4h6v6M20 4l-8 8M18 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5',
  shield: 'M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z',
  copy: 'M9 9V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-4M5 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z',
  arrow: 'M5 12h14M13 5l7 7-7 7',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h9',
  filter: 'M4 6h16M7 12h10M10 18h4',
  notebook: 'M8 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8M8 4v16M8 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2M11 8h5M11 12h5',
  building: 'M4 21V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v15M15 10h4a1 1 0 0 1 1 1v10M3 21h18M8 9h3M8 13h3M8 17h3',
  target: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zM19 11.5a7 7 0 0 1-14 0M12 18.5V21M9 21h6',
}

const d = computed(() => PATHS[props.name] || PATHS.grid)
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="w-[18px] h-[18px] shrink-0"
    aria-hidden="true"
  >
    <path :d="d" />
  </svg>
</template>

