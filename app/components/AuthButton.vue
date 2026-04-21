<script setup>
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const router = useRouter();

async function logout() {
  await supabase.auth.signOut();
  router.push("/");
}
</script>

<template>
  <div class="auth-button">
    <template v-if="user">
      <span class="auth-email">{{ user.email }}</span>
      <button class="auth-action" type="button" @click="logout">Sign out</button>
    </template>
    <template v-else>
      <NuxtLink to="/login" class="auth-action">Sign in</NuxtLink>
    </template>
  </div>
</template>

<style scoped>
.auth-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #c4c9db;
}
.auth-email {
  color: #9da8cf;
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.auth-action {
  padding: 0.45rem 0.85rem;
  background: rgba(22, 33, 62, 0.8);
  border: 1px solid #2f365a;
  border-radius: 999px;
  color: #d9e1ff;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.8rem;
}
.auth-action:hover {
  border-color: #f5a623;
  color: #fff;
}
</style>
