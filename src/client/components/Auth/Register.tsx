import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useApiMutation } from '../../hooks/useApiMutation';
import './Auth.css';

function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const navigate = useNavigate();

    // Countdown timer for resend button
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const { mutate: signUp, isLoading: isSigningUp, error: signUpError } = useApiMutation(
        async (credentials: any) => {
            const { data, error } = await supabase.auth.signUp(credentials);
            if (error) throw error;
            return data;
        },
        {
            onSuccess: () => {
                setShowOtpInput(true);
                setResendCooldown(60);
            },
        }
    );

    const { mutate: verifyOtp, isLoading: isVerifying, error: verifyError } = useApiMutation(
        async (params: any) => {
            const { data, error } = await supabase.auth.verifyOtp(params);
            if (error) throw error;
            return data;
        },
        {
            onSuccess: () => navigate('/dashboard'),
        }
    );

    const { mutate: resendOtp, isLoading: isResending, error: resendError } = useApiMutation(
        async (params: any) => {
            const { error } = await supabase.auth.resend(params);
            if (error) throw error;
        },
        {
            onSuccess: () => setResendCooldown(60),
        }
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            // This is client-side validation, so we can handle it directly
            alert('Password must be at least 6 characters');
            return;
        }
        await signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        await resendOtp({ type: 'signup', email });
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        await verifyOtp({ email, token: otp, type: 'email' });
    };

    const error = signUpError || verifyError || resendError;
    const loading = isSigningUp || isVerifying || isResending;

    // Show OTP verification form
    if (showOtpInput) {
        return (
            <div className="auth-container">
                <div className="auth-card glass fade-in">
                    <div className="auth-header">
                        <h1 className="auth-title">Verify Email</h1>
                        <p className="auth-subtitle">
                            We sent a verification code to <strong>{email}</strong>
                        </p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error.message}
                        </div>
                    )}

                    <form onSubmit={handleVerifyOtp} className="auth-form">
                        <div className="form-group">
                            <label className="label" htmlFor="otp">
                                Verification Code
                            </label>
                            <input
                                id="otp"
                                type="text"
                                className="input"
                                placeholder="Enter 6-digit code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={6}
                                required
                                autoFocus
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? (
                                <span className="spinner-small"></span>
                            ) : (
                                'Verify Email'
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>
                            Didn't receive the code?{' '}
                            {resendCooldown > 0 ? (
                                <span style={{ color: 'var(--color-text-muted)' }}>
                                    Resend in {resendCooldown}s
                                </span>
                            ) : (
                                <button
                                    onClick={handleResendOtp}
                                    className="auth-link"
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                    disabled={loading}
                                >
                                    Resend code
                                </button>
                            )}
                        </p>
                        <p style={{ marginTop: '1rem' }}>
                            <button
                                onClick={() => {
                                    setShowOtpInput(false);
                                    setResendCooldown(0);
                                }}
                                className="auth-link"
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                                ← Back to signup
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Show registration form
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
                            Minimum 6 characters
                        </small>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? (
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