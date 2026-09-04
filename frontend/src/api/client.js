const TOKEN_KEY = 'todoapp_token';

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

    const res = await fetch(`/api${path}`, {
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
    register: (username, password) => request('/auth/register', { method: 'POST', body: { username, password }, auth: false }),
    login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password }, auth: false }),
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
    shareTask: (id, username, canEdit = true) => request(`/tasks/${id}/share`, { method: 'POST', body: { username, canEdit } }),
    listShares: (id) => request(`/tasks/${id}/shares`),
    unshareTask: (id, userId) => request(`/tasks/${id}/share/${userId}`, { method: 'DELETE' }),
};
