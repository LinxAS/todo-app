import React, { useEffect, useState } from 'react';
import { api, getToken, clearToken } from './api/client';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';

export default function App() {
    const [user, setUser] = useState(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            setChecking(false);
            return;
        }
        api.me()
            .then((data) => setUser(data.user))
            .catch(() => clearToken())
            .finally(() => setChecking(false));
    }, []);

    if (checking) {
        return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Loading…</div>;
    }

    if (!user) {
        return <AuthScreen onAuthenticated={setUser} />;
    }

    return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
