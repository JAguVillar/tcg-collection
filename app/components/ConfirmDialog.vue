<script setup>
const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  confirmLabel: { type: String, default: "Confirm" },
  cancelLabel: { type: String, default: "Cancel" },
  color: { type: String, default: "primary" },
});

const emit = defineEmits(["close"]);

function confirm() {
  emit("close", true);
}

function cancel() {
  emit("close", false);
}
</script>

<template>
  <UModal
    :title="props.title"
    :description="props.description"
    :dismissible="true"
    :ui="{ footer: 'justify-end' }"
    @close="cancel"
  >
    <template #footer>
      <UButton
        :label="props.cancelLabel"
        color="neutral"
        variant="outline"
        @click="cancel"
      />
      <UButton
        :label="props.confirmLabel"
        :color="props.color"
        @click="confirm"
      />
    </template>
  </UModal>
</template>
