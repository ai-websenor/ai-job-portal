import { useAuthStore } from "@/stores/authStore";

const onLogout = () => {
  localStorage.clear();
  useAuthStore.getState().logout();
  window.location.href = "/login";
};

export default onLogout;
