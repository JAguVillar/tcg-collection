<script setup>
definePageMeta({ layout: "auth" });

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const mode = ref("signIn");
const loading = ref(false);
const message = ref(null);
const state = reactive({ email: "", password: "" });

const title = computed(() =>
  mode.value === "signIn" ? "Welcome back" : "Create account"
);
const description = computed(() =>
  mode.value === "signIn"
    ? "Sign in to manage your binders."
    : "Start tracking your TCG collection."
);
const submitLabel = computed(() =>
  mode.value === "signIn" ? "Sign in" : "Sign up"
);

function validate(values) {
  const errors = [];
  if (!values.email) {
    errors.push({ name: "email", message: "Email is required" });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.push({ name: "email", message: "Invalid email" });
  }
  if (!values.password) {
    errors.push({ name: "password", message: "Password is required" });
  } else if (values.password.length < 6) {
    errors.push({ name: "password", message: "Must be at least 6 characters" });
  }
  return errors;
}

watchEffect(() => {
  if (user.value) {
    const redirect = typeof route.query.redirect === "string"
      ? route.query.redirect
      : "/";
    router.replace(redirect);
  }
});

async function onSubmit(event) {
  loading.value = true;
  message.value = null;
  try {
    if (mode.value === "signIn") {
      const { error } = await supabase.auth.signInWithPassword(event.data);
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.signUp(event.data);
      if (error) throw error;
      message.value = "Check your email to confirm your account.";
    }
  } catch (err) {
    toast.add({
      color: "error",
      title: "Authentication error",
      description: err?.message ?? "Something went wrong",
    });
  } finally {
    loading.value = false;
  }
}

function toggleMode() {
  mode.value = mode.value === "signIn" ? "signUp" : "signIn";
  message.value = null;
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col items-center gap-2 text-center">
        <UIcon name="i-lucide-layers" class="size-8 text-primary" />
        <h1 class="text-xl font-semibold text-highlighted">{{ title }}</h1>
        <p class="text-sm text-muted">{{ description }}</p>
      </div>
    </template>

    <UForm
      :state="state"
      :validate="validate"
      class="flex flex-col gap-4"
      @submit="onSubmit"
    >
      <UFormField label="Email" name="email" required>
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          icon="i-lucide-mail"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Password" name="password" required>
        <UInput
          v-model="state.password"
          type="password"
          :autocomplete="mode === 'signIn' ? 'current-password' : 'new-password'"
          placeholder="••••••••"
          icon="i-lucide-lock"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        :label="submitLabel"
        :loading="loading"
        block
      />

      <UAlert
        v-if="message"
        color="success"
        icon="i-lucide-mail-check"
        :description="message"
      />
    </UForm>

    <template #footer>
      <div class="flex flex-col items-center gap-1 text-center">
        <span class="text-sm text-muted">
          {{
            mode === "signIn"
              ? "Don't have an account?"
              : "Already have an account?"
          }}
        </span>
        <UButton
          :label="mode === 'signIn' ? 'Sign up' : 'Sign in'"
          color="primary"
          variant="link"
          size="sm"
          @click="toggleMode"
        />
      </div>
    </template>
  </UCard>
</template>
