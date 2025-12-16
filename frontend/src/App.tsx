import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { account } from './services/appwrite';
import type { Models } from 'appwrite';

// Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import VerifyEmail from './components/Auth/VerifyEmail';
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

// Component for unverified users
function VerificationRequired() {
    const handleResend = async () => {
        try {
            const verifyUrl = `${window.location.origin}/verify`;
            await account.createVerification(verifyUrl);
            alert('Verification email sent! Check your inbox.');
        } catch (error) {
            alert('Could not send verification email. Please try again.');
        }
    };

    const handleLogout = async () => {
        await account.deleteSession('current');
        window.location.href = '/login';
    };

    return (
        <div className="auth-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f0d' }}>
            <div className="auth-card glass" style={{ maxWidth: '400px', padding: '2rem', background: 'rgba(17, 25, 22, 0.9)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📧</div>
                    <h1 style={{ color: '#22c55e', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Email Verification Required</h1>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                        Please verify your email address to access the dashboard.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                        onClick={handleResend}
                        style={{
                            padding: '0.75rem',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '8px',
                            color: '#22c55e',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        🔄 Resend Verification Email
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        const checkAuth = async () => {
            try {
                const currentUser = await account.get();
                setUser(currentUser);
            } catch {
                // User not logged in
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Listen for auth state changes (when user logs in/out in another tab)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'cookieFallback') {
                // Re-check auth when Appwrite storage changes
                account.get()
                    .then(setUser)
                    .catch(() => setUser(null));
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    if (loading) {
        return <PageLoader />;
    }

    // Check if user exists but is NOT verified
    const isLoggedIn = !!user;
    const isVerified = user?.emailVerification === true;

    // Protected route wrapper - requires login AND verification
    const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
        if (!isLoggedIn) {
            return <Navigate to="/login" />;
        }
        if (!isVerified) {
            return <VerificationRequired />;
        }
        return <>{children}</>;
    };

    return (
        <BrowserRouter>
            <Routes>
                {/* Public Landing Page */}
                <Route path="/" element={isLoggedIn && isVerified ? <Navigate to="/dashboard" /> : <Landing />} />

                {/* Auth - accessible without login */}
                <Route path="/login" element={isLoggedIn && isVerified ? <Navigate to="/dashboard" /> : <Login onLogin={setUser} />} />
                <Route path="/register" element={isLoggedIn && isVerified ? <Navigate to="/dashboard" /> : <Register />} />
                <Route path="/verify" element={<VerifyEmail />} />

                {/* Protected Routes - require login AND email verification */}
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard onLogout={() => setUser(null)} /></ProtectedRoute>} />
                <Route path="/whatsapp/connect" element={<ProtectedRoute><QRScanner /></ProtectedRoute>} />
                <Route path="/agent" element={<ProtectedRoute><AgentCreator /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/docs" element={<ProtectedRoute><Docs /></ProtectedRoute>} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to={isLoggedIn && isVerified ? "/dashboard" : "/"} />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;
