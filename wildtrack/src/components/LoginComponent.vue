<script setup>
  import { computed, onMounted, reactive, ref, watch } from "vue";
  import { useUserStore } from "@/stores/userStore";
  import { useRouter } from "vue-router";
  import axios from "axios";
  import CryptoJS from "crypto-js";
  const sheetId = import.meta.env.VITE_GOOGLE_SHEETS_ID;
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  // const navClickMapToggle = () => {
  //   console.log("filterMsg", info.filterMsg);
  //   const x = document.getElementById("map");
  //   return x.style.display === "none" ? (x.style.display = "block") : ((x.style.display = "none"), (info.filterMsg = ""));
  // };
  // navClickMapToggle
  // v-on:toggleMap="navClickMapToggle"
  const store = useUserStore();
  const router = useRouter();
  const login = reactive({ username: "", password: "" });

  const onSumbit = async () => {
    // call sheets and match
    // 1. call to find the row number of the username
    if (login.username.trim() === "" || login.password === "") {
      alert("Please fill in all fields");
      return;
    }
    const getlastindex = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?majorDimension=rows&ranges=USER DB!A:H&key=${GOOGLE_MAPS_API_KEY}`);
    const arr = getlastindex.data?.valueRanges?.[0].values;
    var userfound = [];
    arr.map((item) => {
      if (item[4] === login.username) {
        userfound = item;
      }
    });
    // 3. decrypt database password and check if it matches input
    if (userfound.length) {
      const encrypted = userfound?.[6];
      const key = CryptoJS.enc.Utf8.parse("12345678901234567890123456789012");
      const iv = CryptoJS.enc.Utf8.parse("1234567890123456");
      const decrypted = CryptoJS.AES.decrypt(encrypted, key, { iv }).toString(CryptoJS.enc.Utf8);
      // 3.1. return if password mismatches
      if (decrypted !== login.password) {
        return alert("Password is incorrect");
      }
      const sitelist = userfound?.[5].split(",");
      sessionStorage.setItem("sitelist", sitelist);
      store.setSitesList(sitelist);
      sessionStorage.setItem("user", userfound?.[4]);
      store.setUser(userfound?.[4]);
      login.username = "";
      sessionStorage.setItem("fullname", userfound?.[2]);
      store.setDisplayName(userfound?.[2]);
      if (store.isAuthenticated) {
        router.push("/");
      }
    } else {
      return alert("Username not found");
    }
  };
</script>

<template>
  <div class="py-6">
    <div class="flex bg-white rounded-lg shadow-lg overflow-hidden mx-auto max-w-sm lg:max-w-4xl">
      <div class="w-full p-8 lg:w-1/2">
        <h2 class="text-2xl font-semibold text-gray-700 text-center">Login</h2>
        <p class="text-xl text-gray-600 text-center">Welcome back!</p>
        <!-- was testing a spring boot + vue js oauth2 login flow but deleted the callback file which captured the query parameters from the auth callback -->
        <!-- <a href="http://localhost:8080/oauth2/authorize/google?redirect_uri=http://localhost:5173" class="flex items-center justify-center mt-4 text-white rounded-lg shadow-md hover:bg-gray-100"> -->
        <a href="#" class="flex items-center justify-center mt-4 text-white rounded-lg shadow-md hover:bg-gray-100">
          <div class="px-4 py-3">
            <svg class="h-6 w-6" viewBox="0 0 40 40">
              <path
                d="M36.3425 16.7358H35V16.6667H20V23.3333H29.4192C28.045 27.2142 24.3525 30 20 30C14.4775 30 10 25.5225 10 20C10 14.4775 14.4775 9.99999 20 9.99999C22.5492 9.99999 24.8683 10.9617 26.6342 12.5325L31.3483 7.81833C28.3717 5.04416 24.39 3.33333 20 3.33333C10.7958 3.33333 3.33335 10.7958 3.33335 20C3.33335 29.2042 10.7958 36.6667 20 36.6667C29.2042 36.6667 36.6667 29.2042 36.6667 20C36.6667 18.8825 36.5517 17.7917 36.3425 16.7358Z"
                fill="#FFC107"
              />
              <path d="M5.25497 12.2425L10.7308 16.2583C12.2125 12.59 15.8008 9.99999 20 9.99999C22.5491 9.99999 24.8683 10.9617 26.6341 12.5325L31.3483 7.81833C28.3716 5.04416 24.39 3.33333 20 3.33333C13.5983 3.33333 8.04663 6.94749 5.25497 12.2425Z" fill="#FF3D00" />
              <path d="M20 36.6667C24.305 36.6667 28.2167 35.0192 31.1742 32.34L26.0159 27.975C24.3425 29.2425 22.2625 30 20 30C15.665 30 11.9842 27.2359 10.5975 23.3784L5.16254 27.5659C7.92087 32.9634 13.5225 36.6667 20 36.6667Z" fill="#4CAF50" />
              <path d="M36.3425 16.7358H35V16.6667H20V23.3333H29.4192C28.7592 25.1975 27.56 26.805 26.0133 27.9758C26.0142 27.975 26.015 27.975 26.0158 27.9742L31.1742 32.3392C30.8092 32.6708 36.6667 28.3333 36.6667 20C36.6667 18.8825 36.5517 17.7917 36.3425 16.7358Z" fill="#1976D2" />
            </svg>
          </div>
          <h1 class="px-4 py-3 w-5/6 text-center text-gray-600 font-bold">Sign in with Google</h1>
        </a>
        <div class="mt-4 flex items-center justify-between">
          <span class="border-b w-1/5 lg:w-1/4"></span>
          <p href="#" class="text-xs text-center text-gray-500 uppercase">or login with a username</p>
          <span class="border-b w-1/5 lg:w-1/4"></span>
        </div>
        <form @submit.prevent="onSumbit">
          <div class="mt-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">Username</label>
            <input v-model="login.username" class="bg-gray-200 text-gray-700 focus:outline-none focus:shadow-outline border border-gray-300 rounded py-2 px-4 block w-full appearance-none" type="text" />
          </div>
          <div class="mt-4">
            <div class="flex justify-between">
              <label class="block text-gray-700 text-sm font-bold mb-2">Password</label>
              <a href="#" class="text-xs text-gray-500">Forgot Password?</a>
            </div>
            <input v-model="login.password" class="bg-gray-200 text-gray-700 focus:outline-none focus:shadow-outline border border-gray-300 rounded py-2 px-4 block w-full appearance-none" type="password" />
          </div>
          <div class="mt-8">
            <button class="bg-gray-700 text-white font-bold py-2 px-4 w-full rounded hover:bg-gray-600">Login</button>
          </div>
        </form>
        <div class="mt-4 flex items-center justify-between">
          <span class="border-b w-1/5 md:w-1/4"></span>
          <RouterLink to="/signup">
            <a class="text-xs text-gray-500 uppercase">or sign up</a>
          </RouterLink>
          <span class="border-b w-1/5 md:w-1/4"></span>
        </div>
      </div>
      <div class="hidden lg:block lg:w-1/2 bg-cover" style="background-image: url('https://storage.googleapis.com/wa_images/login.jpg')"></div>
    </div>
  </div>
</template>

<style></style>
