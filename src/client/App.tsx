import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import type { Session } from '@supabase/supabase-js';

// Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import Onboarding from './components/Onboarding/Onboarding';
import QRScanner from './components/WhatsApp/QRScanner';
import AgentCreator from './components/Agents/AgentCreator';
import Analytics from './components/Analytics/Analytics';
import Leads from './components/Leads/Leads';
import Landing from './components/Landing/Landing';
import Settings from './components/Settings/Settings';
import Docs from './components/Docs/Docs';
import PageLoader from './components/common/PageLoader';

function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return <PageLoader />;
    }

    return (
        <BrowserRouter>
            <Routes>
                {/* Public Landing Page */}
                <Route path="/" element={session ? <Navigate to="/dashboard" /> : <Landing />} />

                {/* Auth */}
                <Route path="/login" element={session ? <Navigate to="/onboarding" /> : <Login />} />
                <Route path="/register" element={session ? <Navigate to="/onboarding" /> : <Register />} />

                {/* Onboarding - handles smart routing internally */}
                <Route path="/onboarding" element={session ? <Onboarding /> : <Navigate to="/login" />} />

                {/* Main */}
                <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/whatsapp/connect" element={session ? <QRScanner /> : <Navigate to="/login" />} />
                <Route path="/agent" element={session ? <AgentCreator /> : <Navigate to="/login" />} />
                <Route path="/analytics" element={session ? <Analytics /> : <Navigate to="/login" />} />
                <Route path="/leads" element={session ? <Leads /> : <Navigate to="/login" />} />
                <Route path="/settings" element={session ? <Settings /> : <Navigate to="/login" />} />
                <Route path="/docs" element={session ? <Docs /> : <Navigate to="/login" />} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to={session ? "/dashboard" : "/"} />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;