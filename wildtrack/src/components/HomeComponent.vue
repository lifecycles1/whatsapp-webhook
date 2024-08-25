<script setup>
  import { onMounted, reactive } from "vue";
  import { useUserStore } from "@/stores/userStore";
  import NavBar from "../components/NavBar.vue";
  // const navClickMapToggle = () => {
  //   console.log("filterMsg", info.filterMsg);
  //   const x = document.getElementById("map");
  //   return x.style.display === "none" ? (x.style.display = "block") : ((x.style.display = "none"), (info.filterMsg = ""));
  // };
  // navClickMapToggle
  // v-on:toggleMap="navClickMapToggle"
  const store = useUserStore();
  const state = reactive({});

  onMounted(async () => {
    console.log("home mounted");
  });
</script>

<template>
  <div>
    <NavBar />
    <h1 style="font-family: 'Roboto Condensed'" class="text-center text-3xl">Welcome</h1>
    <div class="w-1/4 px-5 ml-5 items-center justify-center text-center"></div>
  </div>
</template>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300&display=swap");
</style>
