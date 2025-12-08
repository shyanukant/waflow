import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import type { Session } from '@supabase/supabase-js';

// Import components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import QRScanner from './components/WhatsApp/QRScanner';
import AgentCreator from './components/Agents/AgentCreator';
import Analytics from './components/Analytics/Analytics';

function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route
                    path="/login"
                    element={session ? <Navigate to="/dashboard" /> : <Login />}
                />
                <Route
                    path="/register"
                    element={session ? <Navigate to="/dashboard" /> : <Register />}
                />

                {/* Protected routes */}
                <Route
                    path="/dashboard"
                    element={session ? <Dashboard /> : <Navigate to="/login" />}
                />
                <Route
                    path="/whatsapp/connect"
                    element={session ? <QRScanner /> : <Navigate to="/login" />}
                />
                <Route
                    path="/agent"
                    element={session ? <AgentCreator /> : <Navigate to="/login" />}
                />
                <Route
                    path="/analytics"
                    element={session ? <Analytics /> : <Navigate to="/login" />}
                />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
