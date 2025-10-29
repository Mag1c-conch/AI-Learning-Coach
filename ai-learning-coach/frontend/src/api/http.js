// src/api/http.js
import axios from "axios";

const http = axios.create({
  // backend port 5001  
  baseURL: process.env.REACT_APP_API_BASE || "http://localhost:5001", 
  timeout: 10000,
  withCredentials: false, 
});

export default http;