// src/api/http.js
import axios from "axios";
import { getAuthToken } from "./authStorage";

export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5001";

const http = axios.create({
  baseURL: API_BASE,
  timeout: 60000, 
  withCredentials: false,
});

// add request interceptor: print log and automatically append Authorization
http.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    console.log("API Request:", config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    console.error("Request Error:", error);
    return Promise.reject(error);
  }
);

// add response interceptor for debugging
http.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error("API Error:", {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

export function withAuthHeaders(headers = {}) {
  const token = getAuthToken();
  if (token && !headers.Authorization) {
    return {
      ...headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return { ...headers };
}

export function authFetch(url, options = {}) {
  const mergedHeaders = withAuthHeaders(options.headers || {});
  return fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
}

export default http;
