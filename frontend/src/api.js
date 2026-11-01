import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Shared Axios instance.
 *
 * The request interceptor attaches the JWT from localStorage as a Bearer
 * token, so components never build headers by hand.
 *
 * No default Content-Type is set here: Axios must generate the multipart
 * boundary itself for the resume FormData upload.
 */
const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Pulls the most useful message out of an Axios error. */
export function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors).find(Boolean);
    if (first) return first;
  }

  return data?.message || error?.message || fallback;
}

export default api;
