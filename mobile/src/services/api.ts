import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://ishlu-backend.onrender.com/api';

export const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    if (error.response?.status === 401) await AsyncStorage.removeItem('access_token');
    return Promise.reject(error);
  }
);

export const saveToken = async (token: string) => AsyncStorage.setItem('access_token', token);
export const getToken = async () => AsyncStorage.getItem('access_token');
export const clearToken = async () => AsyncStorage.removeItem('access_token');
