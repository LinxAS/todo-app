// Must match the portal's TOKEN_KEY so the token set at login is readable here.
const TOKEN_KEY = 'linxas_token';
// In production (base=/todo/), API calls go to /todo/api/* which Nginx proxies
// to the TODO backend at port 3001. In dev (base=/), they go to /api/*.
const API_BASE = `${import.meta.env.BASE_URL}api`;

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
        data = await res.json();
    } catch {
        // no JSON body (e.g. 204)
    }

    if (!res.ok) {
        const message = (data && data.error) || `Request failed (${res.status})`;
        const err = new Error(message);
        err.status = res.status;
        throw err;
    }
    return data;
}

export const api = {
    me: () => request('/auth/me'),

    listTasks: (params = {}) => {
        const qs = new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
        ).toString();
        return request(`/tasks${qs ? `?${qs}` : ''}`);
    },
    createTask: (task) => request('/tasks', { method: 'POST', body: task }),
    updateTask: (id, patch) => request(`/tasks/${id}`, { method: 'PATCH', body: patch }),
    deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
    listUsers: () => request('/users'),
};
