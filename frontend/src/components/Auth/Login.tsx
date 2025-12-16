import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../../services/appwrite';
import { useApiMutation } from '../../hooks/useApiMutation';
import type { Models } from 'appwrite';
import './Auth.css';

interface LoginProps {
    onLogin?: (user: Models.User<Models.Preferences>) => void;
}

function Login({ onLogin }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const { mutate: login, isLoading, error } = useApiMutation(
        async (credentials: { email: string, password: string }) => {
            await auth.login(credentials.email, credentials.password);
            const user = await auth.getUser();
            if (!user) throw new Error('Failed to get user after login');
            return user;
        },
        {
            onSuccess: (user) => {
                onLogin?.(user);
                navigate('/dashboard');
            },
        }
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await login({ email, password });
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass fade-in">
                <div className="auth-header">
                    <img src="/logo.png" alt="WAFlow" className="auth-logo" />
                    <h1 className="auth-title">Welcome to WAFlow</h1>
                    <p className="auth-subtitle">Sign in to your account</p>
                </div>

                {error && (
                    <div className="error-message">
                        {error.message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
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
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                        {isLoading ? (
                            <span className="spinner-small"></span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Don't have an account?{' '}
                        <Link to="/register" className="auth-link">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;
