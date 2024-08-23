<script setup>
  // const emit = defineEmits(["toggleMap"]);
  // const emitToParent = () => {
  //   emit("toggleMap");
  // };
  // <button type="button" @click="emitToParent" class="rounded-md h-8 w-24">toggleMap</button>
  const logout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("sitelist");
    window.location.href = "/";
  };
</script>

<template>
  <main class="flex items-center justify-between px-4 w-full h-16 shadow-md sticky top-0 z-50 bg-white">
    <div class="flex items-center">
      <RouterLink to="/">
        <img class="w-20 mt-1.5" src="../assets/nls_logo.png" alt="" />
      </RouterLink>
      <h1 class="text-2xl">wildtrack</h1>
    </div>
    <!-- navigation icons div -->
    <div class="flex items-center justify-center space-x-4">
      <div class="">
        <RouterLink to="/map">
          <svg class="w-9" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
            <!--! Font Awesome Free 6.1.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2022 Fonticons, Inc. -->
            <path
              d="M408 120C408 174.6 334.9 271.9 302.8 311.1C295.1 321.6 280.9 321.6 273.2 311.1C241.1 271.9 168 174.6 168 120C168 53.73 221.7 0 288 0C354.3 0 408 53.73 408 120zM288 152C310.1 152 328 134.1 328 112C328 89.91 310.1 72 288 72C265.9 72 248 89.91 248 112C248 134.1 265.9 152 288 152zM425.6 179.8C426.1 178.6 426.6 177.4 427.1 176.1L543.1 129.7C558.9 123.4 576 135 576 152V422.8C576 432.6 570 441.4 560.9 445.1L416 503V200.4C419.5 193.5 422.7 186.7 425.6 179.8zM150.4 179.8C153.3 186.7 156.5 193.5 160 200.4V451.8L32.91 502.7C17.15 508.1 0 497.4 0 480.4V209.6C0 199.8 5.975 190.1 15.09 187.3L137.6 138.3C140 152.5 144.9 166.6 150.4 179.8H150.4zM327.8 331.1C341.7 314.6 363.5 286.3 384 255V504.3L192 449.4V255C212.5 286.3 234.3 314.6 248.2 331.1C268.7 357.6 307.3 357.6 327.8 331.1L327.8 331.1z"
            />
          </svg>
        </RouterLink>
      </div>
      <!-- <div class="">
        <RouterLink to="/report">
          <svg class="w-9" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M8 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h5.697" />
            <path d="M18 12v-5a2 2 0 0 0 -2 -2h-2" />
            <rect x="8" y="3" width="6" height="4" rx="2" />
            <path d="M8 11h4" />
            <path d="M8 15h3" />
            <circle cx="16.5" cy="17.5" r="2.5" />
            <path d="M18.5 19.5l2.5 2.5" />
          </svg>
        </RouterLink>
      </div>
      <div class="">
        <RouterLink to="/statistics">
          <svg class="w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <title>ionicons-v5-q</title>
            <path d="M128,496H48V304h80Z" />
            <path d="M352,496H272V208h80Z" />
            <path d="M464,496H384V96h80Z" />
            <path d="M240,496H160V16h80Z" />
          </svg>
        </RouterLink>
      </div> -->
      <div class="pl-10">
        <svg @click="logout" class="w-9 cursor-pointer" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <g>
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M5 22a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3h-2V4H6v16h12v-2h2v3a1 1 0 0 1-1 1H5zm13-6v-3h-7v-2h7V8l5 4-5 4z" />
          </g>
        </svg>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
