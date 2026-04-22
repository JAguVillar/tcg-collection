<script setup>
const props = defineProps({
  overrides: {
    type: Object,
    default: () => ({}),
  },
});

const route = useRoute();

const items = computed(() => {
  const segments = route.path.split("/").filter(Boolean);
  const base = [{ label: "Home", icon: "i-lucide-home", to: "/" }];
  let acc = "";
  for (const segment of segments) {
    acc += "/" + segment;
    const override = props.overrides[acc];
    base.push({
      label: override ?? decodeURIComponent(segment),
      to: acc,
    });
  }
  return base;
});
</script>

<template>
  <UBreadcrumb :items="items" />
</template>
