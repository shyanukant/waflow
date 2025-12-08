import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import './Auth.css';

function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (error) {
                console.error('Supabase signup error:', error);
                throw error;
            }

            console.log('Signup successful:', data);

            // Show OTP input and start cooldown
            setShowOtpInput(true);
            setResendCooldown(60);
            setLoading(false);
        } catch (err) {
            console.error('Full error:', err);
            const error = err as { message?: string };
            setError(error.message || 'Failed to register');
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;

        setError('');
        setLoading(true);

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });

            if (error) throw error;

            setResendCooldown(60);
            setError(''); // Clear any errors
        } catch (err) {
            console.error('Resend error:', err);
            const error = err as { message?: string };
            setError(error.message || 'Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: any) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email'
            });

            if (error) {
                console.error('OTP verification error:', error);
                throw error;
            }

            console.log('OTP verified successfully:', data);
            navigate('/dashboard');
        } catch (err) {
            console.error('Full error:', err);
            const error = err as { message?: string };
            setError(error.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

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
                            {error}
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
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Get started with WAFlow</p>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
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
                        <input
                            id="password"
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <small style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
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
