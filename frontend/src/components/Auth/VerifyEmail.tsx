import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { auth } from '../../services/appwrite';
import './Auth.css';

function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            // Get userId and secret from URL params (Appwrite sends these)
            const userId = searchParams.get('userId');
            const secret = searchParams.get('secret');

            if (!userId || !secret) {
                setStatus('error');
                setMessage('Invalid verification link. Missing parameters.');
                return;
            }

            try {
                await auth.confirmVerification(userId, secret);
                setStatus('success');
                setMessage('Email verified successfully! Redirecting to setup...');

                // Redirect to onboarding after 2 seconds
                setTimeout(() => {
                    navigate('/onboarding');
                }, 2000);
            } catch (error: any) {
                console.error('Verification error:', error);
                setStatus('error');

                if (error.code === 401) {
                    setMessage('Verification link has expired. Please request a new one.');
                } else if (error.code === 404) {
                    setMessage('Invalid verification link.');
                } else {
                    setMessage(error.message || 'Verification failed. Please try again.');
                }
            }
        };

        verifyEmail();
    }, [searchParams, navigate]);

    return (
        <div className="auth-container">
            <div className="auth-card glass fade-in">
                <div className="auth-header">
                    <img src="/logo.png" alt="WAFlow" className="auth-logo" />
                    <h1 className="auth-title">Email Verification</h1>
                </div>

                <div className="verification-status">
                    {status === 'loading' && (
                        <div className="status-loading">
                            <div className="spinner"></div>
                            <p>Verifying your email...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="status-success">
                            <div className="status-icon">✅</div>
                            <p>{message}</p>
                            <p className="status-redirect">Redirecting to setup...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="status-error">
                            <div className="status-icon">❌</div>
                            <p>{message}</p>
                            <div className="verify-actions">
                                <Link to="/login" className="btn btn-primary">
                                    Go to Login
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VerifyEmail;
