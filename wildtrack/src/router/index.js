import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import { useUserStore } from "@/stores/userStore";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      meta: { auth: false },
      component: () => import("../views/LoginView.vue"),
    },
    {
      path: "/signup",
      name: "signup",
      meta: { auth: false },
      component: () => import("../views/SignupView.vue"),
    },
    {
      path: "/",
      name: "home",
      meta: { auth: true },
      component: HomeView,
    },
    {
      path: "/map",
      name: "map",
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      meta: { auth: true },
      component: () => import("../views/MapView.vue"),
    },
    {
      path: "/report",
      name: "report",
      meta: { auth: true },
      component: () => import("../views/ReportDetails.vue"),
    },
    {
      path: "/statistics",
      name: "statistics",
      meta: { auth: true },
      component: () => import("../views/Statistics.vue"),
    },
  ],
});

// very basic version of navguard
router.beforeEach(async (to, from) => {
  const store = useUserStore();
  if (to.meta.auth && !store.isAuthenticated) {
    return { name: "login" };
  } else if ((store.isAuthenticated && to.name === "login") || (store.isAuthenticated && to.name === "signup")) {
    return { name: "home" };
  }
});

export default router;
