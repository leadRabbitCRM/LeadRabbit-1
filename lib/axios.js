import axios from "axios";

const rawBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const normalizedBaseURL = rawBaseURL.replace(/\/$/, "");

const api = axios.create({
  baseURL: `${normalizedBaseURL}/`,
  withCredentials: true,
});

// Redirect to login on 401 (expired/missing token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      console.warn("⚠️ Session expired — redirecting to login");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
