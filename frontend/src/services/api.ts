import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { account } from './appwrite';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token from Appwrite
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            // Get JWT from Appwrite
            const jwt = await account.createJWT();

            if (jwt?.jwt) {
                config.headers.Authorization = `Bearer ${jwt.jwt}`;
            }
        } catch (error) {
            // User not logged in or session expired
            console.log('No active session for API request');
        }

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Unauthorized - redirect to login
            try {
                await account.deleteSession('current');
            } catch {
                // Session may already be invalid
            }
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
