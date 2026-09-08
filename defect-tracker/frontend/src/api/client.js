const TOKEN_KEY = 'linxas_token'; // shared with portal & todo-app
const API_BASE  = `${import.meta.env.BASE_URL}api`;

export function getToken()        { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token)   { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken()      { localStorage.removeItem(TOKEN_KEY); }

async function request(path, { method = 'GET', body, formData, auth = true } = {}) {
    const headers = {};
    if (auth) {
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
    }
    if (body)     headers['Content-Type'] = 'application/json';

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: formData ? formData : (body ? JSON.stringify(body) : undefined),
    });

    let data = null;
    try { data = await res.json(); } catch {}

    if (!res.ok) {
        const err = new Error((data && data.error) || `Request failed (${res.status})`);
        err.status = res.status;
        throw err;
    }
    return data;
}

export const api = {
    me: () => request('/auth/me'),

    // Projects
    listProjects:  ()           => request('/projects'),
    createProject: (data)       => request('/projects', { method: 'POST', body: data }),
    updateProject: (id, patch)  => request(`/projects/${id}`, { method: 'PATCH', body: patch }),

    // Defects
    listDefects: (params = {}) => {
        const serialized = {
            ...params,
            status:   Array.isArray(params.status)   ? params.status.join(',')   : (params.status   || ''),
            priority: Array.isArray(params.priority)  ? params.priority.join(',') : (params.priority || ''),
        };
        const qs = new URLSearchParams(
            Object.entries(serialized).filter(([, v]) => v !== undefined && v !== '')
        ).toString();
        return request(`/defects${qs ? `?${qs}` : ''}`);
    },
    createDefect: (data)       => request('/defects', { method: 'POST', body: data }),
    updateDefect: (id, patch)  => request(`/defects/${id}`, { method: 'PATCH', body: patch }),
    deleteDefect: (id)         => request(`/defects/${id}`, { method: 'DELETE' }),

    // Attachments
    uploadAttachments: (defectId, files) => {
        const fd = new FormData();
        for (const file of files) fd.append('files', file);
        return request(`/defects/${defectId}/attachments`, { method: 'POST', formData: fd });
    },
    deleteAttachment: (defectId, attachId) =>
        request(`/defects/${defectId}/attachments/${attachId}`, { method: 'DELETE' }),

    // Users
    listUsers: () => request('/users'),
};
