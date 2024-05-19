<script setup>
  import HomeComponent from "../components/HomeComponent.vue";
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
      <div v-if="error">Oops, Please contact support or check your settings!</div>
      <Suspense v-else>
        <template #default>
          <HomeComponent />
        </template>
        <template #fallback>
          <LoadingComponent />
        </template>
      </Suspense>
    </div>
  </Transition>
</template>
