// src/api/http.js
import axios from "axios";

const http = axios.create({
  // backend port 5001  
  baseURL: process.env.REACT_APP_API_BASE || "http://localhost:5001", 
  timeout: 60000, // 增加到60秒，因为AI请求需要更长时间
  withCredentials: false, 
});

// 添加请求拦截器用于调试
http.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器用于调试
http.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export default http;