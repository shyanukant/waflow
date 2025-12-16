import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import './WhatsApp.css';

function QRScanner() {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [status, setStatus] = useState('initializing');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            const socket = getSocket();
            if (sessionId) {
                socket.off(`qr-${sessionId}`);
                socket.off(`ready-${sessionId}`);
                socket.off(`disconnected-${sessionId}`);
            }
        };
    }, [sessionId]);

    const initializeConnection = useCallback(async () => {
        setLoading(true);
        setStatus('initializing');
        setQrCode(null);

        try {
            const socket = getSocket();

            // Make sure socket is connected
            if (!socket.connected) {
                socket.connect();
                // Wait for connection
                await new Promise<void>((resolve) => {
                    if (socket.connected) {
                        resolve();
                    } else {
                        socket.once('connect', () => resolve());
                    }
                });
            }

            console.log('Socket connected:', socket.connected);

            // Make the API call to create session
            const response = await api.post('/whatsapp/connect');
            const newSessionId = response.data.sessionId;

            console.log('Session created:', newSessionId);
            setSessionId(newSessionId);

            // Setup event listeners for this specific session
            socket.on(`qr-${newSessionId}`, (data: { qr: string }) => {
                console.log('QR code received via socket');
                setQrCode(data.qr);
                setStatus('qr_ready');
                setLoading(false);
            });

            socket.on(`ready-${newSessionId}`, () => {
                console.log('WhatsApp ready');
                setStatus('connected');
                setTimeout(() => navigate('/dashboard'), 2000);
            });

            socket.on(`disconnected-${newSessionId}`, () => {
                console.log('WhatsApp disconnected');
                setStatus('disconnected');
            });

            console.log('Listeners set up for session:', newSessionId);

            // If QR not received within 15s, show retry
            setTimeout(() => {
                setLoading(false);
                if (!qrCode) {
                    console.log('QR timeout - you may need to retry');
                }
            }, 15000);

        } catch (error) {
            console.error('Error initializing connection:', error);
            setStatus('error');
            setLoading(false);
        }
    }, [navigate, qrCode]);

    return (
        <div className="whatsapp-container">
            <div className="container">
                <div className="whatsapp-card card glass fade-in">
                    <Link to="/dashboard" className="back-link">
                        ← Back to Dashboard
                    </Link>

                    <h1 className="whatsapp-title">Connect WhatsApp</h1>

                    {status === 'initializing' && !qrCode && (
                        <div className="status-section">
                            {loading ? (
                                <>
                                    <div className="spinner"></div>
                                    <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>
                                        Generating QR code...
                                    </p>
                                </>
                            ) : (
                                <button onClick={initializeConnection} className="btn btn-primary">
                                    Start Connection
                                </button>
                            )}
                        </div>
                    )}

                    {status === 'qr_ready' && qrCode && (
                        <div className="qr-section">
                            <p className="instruction-text">Scan this QR code with your WhatsApp mobile app</p>
                            <div className="qr-container">
                                <img src={qrCode} alt="WhatsApp QR Code" className="qr-image" />
                            </div>
                            <div className="steps">
                                <p>1. Open WhatsApp on your phone</p>
                                <p>2. Tap Menu (⋮) or Settings</p>
                                <p>3. Tap "Linked Devices"</p>
                                <p>4. Tap "Link a Device"</p>
                                <p>5. Scan this QR code</p>
                            </div>
                        </div>
                    )}

                    {status === 'connected' && (
                        <div className="status-section success">
                            <div className="success-icon">✓</div>
                            <h2>Connected Successfully!</h2>
                            <p>Redirecting to dashboard...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="status-section error">
                            <p>Failed to initialize connection. Please try again.</p>
                            <button onClick={initializeConnection} className="btn btn-primary">
                                Retry
                            </button>
                        </div>
                    )}

                    {status === 'disconnected' && (
                        <div className="status-section">
                            <p>Connection lost. Try again.</p>
                            <button onClick={initializeConnection} className="btn btn-primary">
                                Reconnect
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default QRScanner;
