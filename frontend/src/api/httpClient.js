import axios from "axios";
import { isSignInRequest, loginRedirectFor, isPublicSessionProbe } from "../utils/authRouting";
import { getApiRequestId } from "../utils/apiError";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "/api" : "http://localhost:3108/api"),
  timeout: 8000,
  withCredentials: true,
});

let csrfToken = null;
export const getCsrfToken=()=>csrfToken;
let authResetStarted = false;

httpClient.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  if (!["get", "head", "options"].includes(method) && csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => {
    if (response.data?.csrfToken) {
      csrfToken = response.data.csrfToken;
      authResetStarted = false;
    }
    return response;
  },
  (error) => {
    const requestId = getApiRequestId(error);
    if (requestId) error.requestId = requestId;

    if (error.response?.status === 403) {
      if (!error.config?.skipGlobalError) {
        window.dispatchEvent(
          new CustomEvent("api-forbidden", {
            detail: {
              message: error.response?.data?.message || "Bạn không có quyền thực hiện thao tác này",
            },
          }),
        );
      }
    }

    if (error.response?.status === 401) {
      if (isPublicSessionProbe(window.location.pathname,error.config?.url)) return Promise.reject(error);
      if (isSignInRequest(error.config?.url)) return Promise.reject(error);
      if (authResetStarted) return Promise.reject(error);
      authResetStarted = true;
      csrfToken = null;
      window.dispatchEvent(new Event("auth-session-cleared"));
      const loginPath = loginRedirectFor(window.location.pathname);
      if (window.location.pathname !== loginPath) {
        window.location.replace(loginPath);
      }
    }
    return Promise.reject(error);
  },
);
