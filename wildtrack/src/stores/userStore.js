import { ref, computed, reactive, unref } from "vue";
import { defineStore, storeToRefs } from "pinia";

export const useUserStore = defineStore("user", () => {
  const user = ref(null);

  const isAuthenticated = computed(() => !!unref(user) || sessionStorage.getItem("user"));

  /**
   * sitesList not in use
   *
   * however are passed to store and localstore upon signup/login and can be used in home component
   */
  const state = reactive({ sitesList: [], fullname: "" });
  const sitesList = computed(() => {
    if (state.sitesList.length) {
      return state.sitesList;
    } else {
      return sessionStorage.getItem("sitelist");
    }
  });
  const displayname = computed(() => {
    if (state.fullname !== "") {
      return state.fullname;
    } else {
      return sessionStorage.getItem("fullname");
    }
  });

  const setUser = (username) => {
    user.value = username;
  };
  const setDisplayName = (fullname) => {
    state.fullname = fullname;
  };
  const setSitesList = (data) => {
    state.sitesList = data;
  };

  return {
    user,
    isAuthenticated,
    setUser,
    setSitesList,
    sitesList,
    setDisplayName,
    displayname,
  };
});
