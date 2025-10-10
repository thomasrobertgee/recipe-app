import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000', // Or http://localhost:8000
});

// Interceptor to add the token to every request
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

export default api;