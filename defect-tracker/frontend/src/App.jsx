import React, { useEffect, useState } from 'react';
import { api, getToken, clearToken } from './api/client';
import Dashboard from './components/Dashboard';

export default function App() {
    const [user, setUser]       = useState(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            window.location.replace('/');
            return;
        }
        api.me()
            .then((data) => setUser(data.user))
            .catch(() => { clearToken(); window.location.replace('/'); })
            .finally(() => setChecking(false));
    }, []);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-muted bg-bg">
                Loading…
            </div>
        );
    }

    if (!user) return null;

    function handleLogout() {
        clearToken();
        window.location.replace('/');
    }

    return <Dashboard user={user} onLogout={handleLogout} />;
}
