<script setup>
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();

const mode = ref("signIn");
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref(null);
const message = ref(null);

watchEffect(() => {
  if (user.value) router.replace("/binders");
});

async function submit() {
  loading.value = true;
  error.value = null;
  message.value = null;
  try {
    if (mode.value === "signIn") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      });
      if (err) throw err;
    } else {
      const { error: err } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      });
      if (err) throw err;
      message.value = "Check your email to confirm your account.";
    }
  } catch (err) {
    error.value = err?.message ?? "Authentication error";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">{{ mode === "signIn" ? "Sign in" : "Create account" }}</h1>

      <form class="auth-form" @submit.prevent="submit">
        <label class="auth-label">
          <span>Email</span>
          <input v-model="email" type="email" required autocomplete="email" />
        </label>
        <label class="auth-label">
          <span>Password</span>
          <input
            v-model="password"
            type="password"
            required
            minlength="6"
            :autocomplete="mode === 'signIn' ? 'current-password' : 'new-password'"
          />
        </label>

        <button class="auth-submit" type="submit" :disabled="loading">
          {{ loading ? "..." : mode === "signIn" ? "Sign in" : "Sign up" }}
        </button>
      </form>

      <button class="auth-toggle" type="button" @click="mode = mode === 'signIn' ? 'signUp' : 'signIn'">
        {{ mode === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in" }}
      </button>

      <p v-if="error" class="auth-error">{{ error }}</p>
      <p v-if="message" class="auth-message">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #e0e0e0;
}
.auth-card {
  width: 100%;
  max-width: 380px;
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 16px;
  padding: 2rem;
}
.auth-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  background: linear-gradient(135deg, #f8d847, #f5a623, #e8792f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.auth-label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #9da8cf;
}
.auth-label input {
  padding: 0.7rem 0.85rem;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  color: #e0e0e0;
  font-size: 0.95rem;
}
.auth-label input:focus {
  outline: none;
  border-color: #f5a623;
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
}
.auth-submit {
  padding: 0.8rem;
  background: linear-gradient(135deg, #f5a623, #e8792f);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
}
.auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-toggle {
  margin-top: 1rem;
  background: none;
  border: none;
  color: #9da8cf;
  cursor: pointer;
  font-size: 0.85rem;
}
.auth-error { margin-top: 1rem; color: #f87171; font-size: 0.85rem; }
.auth-message { margin-top: 1rem; color: #4ade80; font-size: 0.85rem; }
</style>
