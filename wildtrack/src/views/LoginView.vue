<script setup>
  import LoginComponent from "../components/LoginComponent.vue";
  import LoadingComponent from "../components/LoadingComponent.vue";
  import { onErrorCaptured, ref } from "vue";

  const error = ref(null);

  onErrorCaptured((e) => {
    error.value = e;
    console.log("error", e);
  });
</script>

<template>
  <Transition>
    <div>
      <div v-if="error">Oops, Please try again, contact the support or check your settings!</div>
      <Suspense v-else>
        <template #default>
          <LoginComponent />
        </template>
        <template #fallback>
          <LoadingComponent />
        </template>
      </Suspense>
    </div>
  </Transition>
</template>
