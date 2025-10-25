import axios, { AxiosError, AxiosHeaders } from "axios";
import type { InternalAxiosRequestConfig, AxiosRequestConfig,RawAxiosRequestHeaders } from "axios";



const API_BASE = import.meta.env.VITE_API_BASE;

// --- instancia principal (con auth) ---
export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// --- instancia sin auth (para refresh y evitar loops) ---
const bare = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// --- helpers de token ---
function getAccess()  { return localStorage.getItem("access") || ""; }
function getRefresh() { return localStorage.getItem("refresh") || ""; }
function setAccess(t: string)  { localStorage.setItem("access", t); }
function setRefresh(t: string) { localStorage.setItem("refresh", t); }
function clearTokens() { localStorage.removeItem("access"); localStorage.removeItem("refresh"); }

// --- adjunta Authorization en cada request ---
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccess();
  if (token) {
    // Asegura que headers exista y sea un tipo válido
    if (!config.headers) {
      // crea un contenedor de headers válido de Axios
      config.headers = new AxiosHeaders();
    }

    // Si es AxiosHeaders, usa la API .set(); si es objeto plano, asigna por índice
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      (config.headers as RawAxiosRequestHeaders)["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});
// --- cola para reintentar mientras se refresca ---
let isRefreshing = false;
let pendingQueue: Array<(token: string) => void> = [];
const flushQueue = (token: string | null) => {
  pendingQueue.forEach((cb) => { if (token) cb(token); });
  pendingQueue = [];
};

// --- tipos de respuesta ---
type LoginResponse = { access: string; refresh: string };
type RefreshResponse = { access: string };

// --- refresh automático en 401 ---
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean });

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // espera a que otro refresh termine
      return new Promise((resolve, reject) => {
        pendingQueue.push((newToken: string) => {
          try {
            (originalRequest.headers ||= {}).Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          } catch (e) {
            reject(e);
          }
        });
      });
    }

    isRefreshing = true;
    try {
      const refresh = getRefresh();
      if (!refresh) {
        clearTokens();
        return Promise.reject(error);
      }

      const { data } = await bare.post<RefreshResponse>("/seguridad/auth/refresh", { refresh });
      const newAccess = data.access;
      setAccess(newAccess);

      flushQueue(newAccess);
      (originalRequest.headers ||= {}).Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (err) {
      clearTokens();
      flushQueue(null);
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

// --- helpers de login/logout ---
export async function login(username: string, password: string) {
  const { data } = await bare.post<LoginResponse>("/seguridad/auth/login", { username, password });
  setAccess(data.access);
  setRefresh(data.refresh);
  return data;
}

export function logout() {
  clearTokens();
}

export default api;
