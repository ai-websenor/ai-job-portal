import dayjs from "dayjs";
import routePaths from "../config/routePaths";
import useUserStore from "../store/useUserStore";
import ENDPOINTS from "../api/endpoints";
import axios from "axios";
import APP_CONFIG from "../config/config";

class CommonUtils {
  static async onLogout() {
    if (typeof window !== "undefined") {
      localStorage.clear();
      useUserStore.getState().clearUser();
      window.location.href = routePaths.auth.login;
    }
  }

  static keyIntoTitle(key: string) {
    if (!key) return "";
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]+/g, " ")
      .trim()
      .replace(/^(.)/, (match) => match.toUpperCase());
  }

  static determineDays(date: string) {
    const today = dayjs();
    const jobDate = dayjs(date);
    const diffInDays = today.diff(jobDate, "day");
    if (diffInDays === 0) {
      return "Today";
    }
    if (diffInDays === 1) {
      return "1 day ago";
    }
    return `${diffInDays} days ago`;
  }

  static async refreshToken() {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("refreshToken")
        : null;

    if (!refreshToken) throw new Error("No refresh token");

    const response = await axios.post(
      `${APP_CONFIG.API_BASE_URL}${ENDPOINTS.AUTH.REFRESH_TOKEN}`,
      {
        refreshToken,
      },
    );

    const data = response.data?.data;

    if (data?.accessToken) {
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      return data;
    }

    throw new Error("Refresh failed");
  }

  static formatSalary(salaryMin: number = 0, salaryMax: number = 0) {
    if (!salaryMin && !salaryMax) return "Salary Undisclosed";
    return `${APP_CONFIG.CURRENCY}${salaryMin} - ${APP_CONFIG.CURRENCY}${salaryMax}`;
  }
}

export default CommonUtils;
