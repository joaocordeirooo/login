const base = import.meta.env.VITE_API_URL || '/api';
export function token() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}
export function logout() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem('token');
    storage.removeItem('usuario');
  }
}
export async function api(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      ...(options.body ? {
        'Content-Type': 'application/json'
      } : {}),
      ...(token() ? {
        Authorization: `Bearer ${token()}`
      } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== '/usuarios/login') {
      logout();
      window.location.assign('/login');
    }
    throw new Error(data.error || 'Não foi possível concluir a operação.');
  }
  return options.download ? response.blob() : response.json();
}
export const save = (path, body, method = 'POST') => api(path, {
  method,
  body: JSON.stringify(body)
});
