import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../../services/appwrite';
import { useApiMutation } from '../../hooks/useApiMutation';
import './Auth.css';

function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState('');

    const { mutate: signUp, isLoading, error } = useApiMutation(
        async (data: { email: string; password: string; fullName: string }) => {
            // Register and auto-login with Appwrite
            await auth.register(data.email, data.password, data.fullName);
            const user = await auth.getUser();
            if (!user) throw new Error('Failed to get user after registration');

            // Send verification email
            try {
                const verifyUrl = `${window.location.origin}/verify`;
                await auth.sendVerification(verifyUrl);
                console.log('Verification email sent');
            } catch (verifyError) {
                console.log('Could not send verification email:', verifyError);
            }

            // Keep user logged in - they'll be blocked by verification check
            // After verification, they can go directly to onboarding

            return user;
        },
        {
            onSuccess: () => {
                setRegistrationComplete(true);
            },
        }
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }
        await signUp({ email, password, fullName });
    };

    const handleResendVerification = async () => {
        setResendLoading(true);
        setResendMessage('');

        try {
            // Need to login temporarily to resend verification
            await auth.login(email, password);
            const verifyUrl = `${window.location.origin}/verify`;
            await auth.sendVerification(verifyUrl);
            await auth.logout(); // Logout again
            setResendMessage('✓ Verification email sent! Check your inbox.');
        } catch (error: any) {
            setResendMessage('Failed to resend. Please try logging in first.');
        } finally {
            setResendLoading(false);
        }
    };

    // Show verification required screen after registration
    if (registrationComplete) {
        return (
            <div className="auth-container">
                <div className="auth-card glass fade-in">
                    <div className="auth-header">
                        <img src="/logo.png" alt="WAFlow" className="auth-logo" />
                        <h1 className="auth-title">📧 Verify Your Email</h1>
                    </div>

                    <div className="registration-success">
                        <div className="verification-notice" style={{ marginBottom: '1.5rem' }}>
                            <span className="notice-icon">✉️</span>
                            <div>
                                <p style={{ margin: 0, fontWeight: 500, color: '#22c55e' }}>
                                    We've sent a verification link to:
                                </p>
                                <p style={{ margin: '0.5rem 0', color: '#fff', fontSize: '1.1rem' }}>
                                    <strong>{email}</strong>
                                </p>
                                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem' }}>
                                    Please check your inbox (and spam folder) and click the link to verify your email.
                                </p>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(234, 179, 8, 0.1)',
                            border: '1px solid rgba(234, 179, 8, 0.3)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            marginBottom: '1.5rem'
                        }}>
                            <p style={{ margin: 0, color: '#fbbf24', fontSize: '0.85rem', textAlign: 'center' }}>
                                ⚠️ You must verify your email before you can access the dashboard.
                            </p>
                        </div>

                        {resendMessage && (
                            <p style={{
                                color: resendMessage.startsWith('✓') ? '#22c55e' : '#f87171',
                                fontSize: '0.85rem',
                                textAlign: 'center',
                                marginBottom: '1rem'
                            }}>
                                {resendMessage}
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={handleResendVerification}
                                disabled={resendLoading}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                {resendLoading ? 'Sending...' : '🔄 Resend Verification Email'}
                            </button>

                            <Link to="/login" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', textDecoration: 'none' }}>
                                Go to Login →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card glass fade-in">
                <div className="auth-header">
                    <img src="/logo.png" alt="WAFlow" className="auth-logo" />
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Get started with WAFlow</p>
                </div>

                {error && (
                    <div className="error-message">
                        {error.message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="label" htmlFor="fullName">
                            Full Name
                        </label>
                        <input
                            id="fullName"
                            type="text"
                            className="input"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label" htmlFor="password">
                            Password
                        </label>
                        <div className="password-input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <small style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                            Minimum 8 characters
                        </small>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                        {isLoading ? (
                            <span className="spinner-small"></span>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Already have an account?{' '}
                        <Link to="/login" className="auth-link">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;