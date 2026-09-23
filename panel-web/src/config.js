const API_URL_KEY = 'signage_api_url';
const TOKEN_KEY = 'signage_token';

function guessDefaultApiUrl() {
  const { protocol, hostname } = window.location;
  // Suposicion razonable: el backend corre en el mismo host, puerto 4000
  return `${protocol}//${hostname}:4000`;
}

export function getApiUrl() {
  return localStorage.getItem(API_URL_KEY) || '';
}

export function setApiUrl(url) {
  const clean = url.trim().replace(/\/+$/, '');
  localStorage.setItem(API_URL_KEY, clean);
}

export function hasApiUrl() {
  return Boolean(getApiUrl());
}

export { guessDefaultApiUrl };

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
