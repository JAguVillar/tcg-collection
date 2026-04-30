<script setup>
defineProps({
  collapsed: { type: Boolean, default: false },
});

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const router = useRouter();
const onboardingOpen = useState("onboarding-open", () => false);

async function signOut() {
  await supabase.auth.signOut();
  router.push("/login");
}

const items = computed(() => [
  [
    {
      label: "Binders",
      icon: "i-lucide-library",
      to: "/binders",
    },
    {
      label: "Take the tour",
      icon: "i-lucide-sparkles",
      onSelect: () => (onboardingOpen.value = true),
    },
  ],
  [
    {
      label: "Sign out",
      icon: "i-lucide-log-out",
      onSelect: signOut,
    },
  ],
]);
</script>

<template>
  <UDropdownMenu
    v-if="user"
    :items="items"
    :content="{ align: 'start', side: 'top' }"
    :ui="{ content: 'w-56' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      :block="!collapsed"
      :square="collapsed"
      class="justify-start"
    >
      <UAvatar
        :alt="user.email"
        size="2xs"
        icon="i-lucide-user"
      />
      <span v-if="!collapsed" class="truncate text-sm">
        {{ user.email }}
      </span>
    </UButton>
  </UDropdownMenu>

  <UButton
    v-else
    to="/login"
    icon="i-lucide-log-in"
    :label="collapsed ? undefined : 'Sign in'"
    color="primary"
    variant="soft"
    :block="!collapsed"
    :square="collapsed"
  />
</template>
