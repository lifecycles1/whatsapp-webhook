<script setup>
  import { onMounted, reactive, ref } from "vue";
  import { useUserStore } from "@/stores/userStore";
  import axios from "axios";
  import { useRouter } from "vue-router";
  import CryptoJS from "crypto-js";
  const sheetId = import.meta.env.VITE_GOOGLE_SHEETS_ID;
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const store = useUserStore();
  const router = useRouter();
  const signup = reactive({
    firstname: "",
    lastname: "",
    telephone: "",
    username: "",
    //assign a default site list to user upon sign up
    site_list: "A,B,C,D,E,F",
    password: "",
  });

  const onSumbit = async () => {
    // check if username exists
    if (signup.firstname.trim() === "" || signup.lastname.trim() === "" || signup.telephone.trim() === "" || signup.username.trim() === "" || signup.password === "") {
      alert("Please fill in all fields");
      return;
    }
    //not sure why these axios calls to these type of google sheets endpoints stopped working in node v16 as of the beginning of November 2022 (additional information - the more complex calls require oauth authentication anyhow but the simple get requests are still working with API keys so that is why I kept this format. The node server does more than a get request therefore I am using an official google auth library to authenticate and do POST calls like update/append/etc. via the authenticated client (not via endpoint urls like this). On the last attempt I still had some normal get requests in the server with these normal endpoint urls and they completely stopped working with a error status "bad request" yet they are still working in the frontend. I migrated the normal ones in the node server to use the authenticated client as well, while these are still working through the browser (if it's only a simple get request)). I have the need further below in this file to post to google sheets and since I need oauth consent to do that I am posting the user through the node server where I can use the already authenticated client to do the POST request to google sheets.
    const getlastindex = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/USER DB!E:E?key=${GOOGLE_MAPS_API_KEY}`);
    const arr = getlastindex.data.values;
    var r;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].toString() === signup.username) {
        r = i + 1;
        break;
      }
    }
    if (r) {
      signup.firstname = "";
      signup.lastname = "";
      signup.telephone = "";
      signup.username = "";
      signup.password = "";
      return alert("Username already exists");
    }

    // if not exists, encrypt password and add to sheet
    // 1. encrypt password
    const key = CryptoJS.enc.Utf8.parse("12345678901234567890123456789012");
    const iv = CryptoJS.enc.Utf8.parse("1234567890123456");
    const encrypted = CryptoJS.AES.encrypt(signup.password, key, { iv });

    // 2. add to sheet (user data)
    // authenticate.then((client) => {}); //authenticate client doesnt work here
    // 2.1 post user via backend
    await axios
      .post(`${import.meta.env.VITE_APP_API_BASE_URL}/saveuser`, {
        firstname: signup.firstname,
        lastname: signup.lastname,
        telephone: signup.telephone,
        username: signup.username,
        site_list: signup.site_list,
        password: encrypted.toString(),
        passwordnormal: signup.password,
      })
      .then((res) => {
        console.log("post via", res.data);
        console.log("User posted to backend successfully");
        //we don't know if the backend has posted the user to the sheet yet but we are doing these next steps regardless
        //more work needs to be done (validation)
        const sitelist = signup.site_list.split(",");
        sessionStorage.setItem("sitelist", sitelist);
        store.setSitesList(sitelist);
        sessionStorage.setItem("user", signup.username);
        store.setUser(signup.username);
        sessionStorage.setItem("fullname", signup.firstname.concat(" ", signup.lastname));
        store.setDisplayName(signup.firstname.concat(" ", signup.lastname));
        router.push("/");
      })
      .catch((err) => {
        console.log(err);
      });
  };
</script>

<template>
  <div>
    <div class="p-4">
      <div class="flex justify-center bg-white rounded-lg shadow-lg overflow-hidden mx-auto max-w-sm lg:max-w-4xl">
        <div class="w-full p-2 lg:w-1/2">
          <div>
            <h2 class="text-2xl font-semibold text-gray-700 text-center">Sign up</h2>
            <!-- <p class="text-xl text-gray-600 text-center">Welcome!</p> -->
            <div class="flex items-center justify-between"></div>
          </div>
          <div>
            <form @submit.prevent="onSumbit">
              <div class="mt-2">
                <label class="block text-gray-700 text-sm font-bold mb-1">First Name</label>
                <input v-model="signup.firstname" class="bg-gray-200 text-gray-700 focus:outline-none focus:shadow-outline border border-gray-300 rounded block w-full appearance-none" type="text" />
              </div>
              <div class="mt-2">
                <label class="block text-gray-700 text-sm font-bold mb-1">Last Name</label>
                <input v-model="signup.lastname" class="bg-gray-200 text-gray-700 focus:outline-none focus:shadow-outline border border-gray-300 rounded block w-full appearance-none" type="text" />
              </div>
              <div class="mt-2">
                <label class="block text-gray-700 text-sm font-bold mb-1">Phone Number</label>
                <input v-model="signup.telephone" class="bg-gray-200 text-gray-700 focus:outline-none focus:shadow-outline border border-gray-300 rounded block w-full appearance-none" type="text" />
              </div>
              <div class="mt-2">
                <label class="block text-gray-700 text-sm font-bold mb-1">Username</label>
                <input v-model="signup.username" class="bg-gray-200 text-gray-700 focus:outline-none focus:shadow-outline border border-gray-300 rounded block w-full appearance-none" type="text" />
              </div>
              <div class="mt-2">
                <div class="flex justify-between">
                  <label class="block text-gray-700 text-sm font-bold mb-1">Password</label>
                </div>
                <input v-model="signup.password" class="bg-gray-200 text-gray-700 focus:outline-none focus:shadow-outline border border-gray-300 rounded block w-full appearance-none" type="password" />
              </div>
              <div class="mt-5">
                <button class="bg-gray-700 text-white font-bold py-2 px-4 w-full rounded hover:bg-gray-600">Signup</button>
              </div>
            </form>
            <div class="mt-4 flex items-center justify-between">
              <span class="border-b w-1/5 md:w-1/4"></span>
              <RouterLink to="/login">
                <a class="text-xs text-gray-500 uppercase">or login</a>
              </RouterLink>
              <span class="border-b w-1/5 md:w-1/4"></span>
            </div>
          </div>
        </div>
        <div class="hidden lg:block lg:w-1/2 bg-cover" style="background-image: url('https://storage.googleapis.com/wa_images/login.jpg')"></div>
      </div>
    </div>
  </div>
</template>

<style></style>
