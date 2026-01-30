import axios from 'axios';
import type { ApiResponse } from '../types';

// Configuration Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Gérer la déconnexion
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Exemple de fonctions API
export const fetchUsers = async () => {
  const response = await api.get<ApiResponse<any[]>>('/users');
  return response.data;
};

export const createUser = async (userData: any) => {
  const response = await api.post<ApiResponse<any>>('/users', userData);
  return response.data;
};

export default api;
