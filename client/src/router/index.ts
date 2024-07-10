import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/start",
      name: "start",
      component: () => import("../views/StartView.vue"),
    },
    {
      path: "/join",
      name: "join",
      component: () => import("../views/FormView.vue"),
    },
    {
      path: "/answers",
      name: "answers",
      component: () => import("../views/AnswersView.vue"),
    },
  ],
});

export default router;
