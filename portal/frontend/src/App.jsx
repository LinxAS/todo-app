import React, { useEffect, useState } from 'react';
import { api, getToken, clearToken } from './api/client';
import LoginScreen from './components/LoginScreen';
import PortalDashboard from './components/PortalDashboard';
import UserManagement from './components/UserManagement';

export default function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('portal'); // 'portal' | 'users'
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

    function handleLogout() {
        clearToken();
        setUser(null);
        setView('portal');
    }

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-muted">
                Loading…
            </div>
        );
    }

    if (!user) {
        return <LoginScreen onAuthenticated={setUser} />;
    }

    if (view === 'users') {
        return <UserManagement user={user} onBack={() => setView('portal')} onLogout={handleLogout} />;
    }

    return (
        <PortalDashboard
            user={user}
            onLogout={handleLogout}
            onNavigate={setView}
        />
    );
}
