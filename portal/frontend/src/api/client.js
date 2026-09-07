// Shared token key — must match the TODO app's client.js so the token
// written here is readable by the TODO app (same origin, same localStorage).
const TOKEN_KEY = 'linxas_token';

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
    setup:  (username, password) => request('/auth/setup',  { method: 'POST', body: { username, password }, auth: false }),
    login:  (username, password) => request('/auth/login',  { method: 'POST', body: { username, password }, auth: false }),
    me:     ()                   => request('/auth/me'),

    listUsers:   ()              => request('/users'),
    createUser:  (data)          => request('/users',       { method: 'POST',   body: data }),
    updateUser:  (id, patch)     => request(`/users/${id}`, { method: 'PATCH',  body: patch }),
    deleteUser:  (id)            => request(`/users/${id}`, { method: 'DELETE' }),
};
