<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(["update:open", "done"]);

const step = ref(0);
const STEPS = [
  {
    icon: "i-lucide-sparkles",
    title: "Welcome to TCG Collection",
    body: "Track every Pokémon card you own and build checklists for the sets you’re chasing — all in one place.",
  },
  {
    icon: "i-lucide-folder",
    title: "Binders organize your cards",
    body: "Create a binder for each theme: a full set, a favorite Pokémon, a master collection. Pick its mode when you create it:",
    bullets: [
      {
        icon: "i-lucide-package",
        title: "Collection",
        text: "Track cards you already own with quantities.",
      },
      {
        icon: "i-lucide-list-checks",
        title: "Checklist",
        text: "Pick the cards you want and tick them off as you find them.",
      },
    ],
  },
  {
    icon: "i-lucide-bookmark-check",
    title: "Use the Active binder",
    body: "Whichever binder is set as Active is the destination of the “+ Add” button on every card. Switch it any time from the sidebar.",
  },
];

const isLast = computed(() => step.value === STEPS.length - 1);
const current = computed(() => STEPS[step.value]);

watch(
  () => props.open,
  (open) => {
    if (open) step.value = 0;
  },
);

function setOpen(v) {
  emit("update:open", v);
}

function next() {
  if (isLast.value) {
    finish();
  } else {
    step.value++;
  }
}

function finish() {
  emit("done");
  setOpen(false);
}

function skip() {
  finish();
}
</script>

<template>
  <UModal
    :open="open"
    :dismissible="false"
    :ui="{ content: 'max-w-lg' }"
    @update:open="setOpen"
  >
    <template #content>
      <div class="flex flex-col">
        <div class="flex flex-col items-center gap-3 px-6 pt-8 pb-4 text-center">
          <div class="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon :name="current.icon" class="size-6 text-primary" />
          </div>
          <h2 class="text-lg font-semibold text-default">{{ current.title }}</h2>
          <p class="text-sm text-muted max-w-sm">{{ current.body }}</p>
        </div>

        <div v-if="current.bullets" class="px-6 pb-2 flex flex-col gap-3">
          <div
            v-for="b in current.bullets"
            :key="b.title"
            class="flex items-start gap-3 rounded-lg border border-default p-3"
          >
            <UIcon :name="b.icon" class="size-5 mt-0.5 text-primary shrink-0" />
            <div>
              <p class="text-sm font-medium text-default">{{ b.title }}</p>
              <p class="text-xs text-muted">{{ b.text }}</p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-center gap-1.5 py-4">
          <span
            v-for="(_, i) in STEPS"
            :key="i"
            class="size-1.5 rounded-full transition"
            :class="i === step ? 'bg-primary w-4' : 'bg-muted'"
          />
        </div>

        <div
          class="flex items-center justify-between gap-2 px-6 py-4 border-t border-default"
        >
          <UButton
            label="Skip tour"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="skip"
          />
          <div class="flex items-center gap-2">
            <UButton
              v-if="step > 0"
              label="Back"
              color="neutral"
              variant="outline"
              size="sm"
              @click="step--"
            />
            <UButton
              :label="isLast ? 'Get started' : 'Next'"
              :trailing-icon="isLast ? undefined : 'i-lucide-arrow-right'"
              size="sm"
              @click="next"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
