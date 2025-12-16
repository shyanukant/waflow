// Settings Page - Trial status, WhatsApp API key, and Calendar management
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import './Settings.css';

interface TrialStatus {
    isTrialActive: boolean;
    isTrialExpired: boolean;
    hoursRemaining: number;
    minutesRemaining: number;
    trialStartedAt: string | null;
    connectionMode: 'trial' | 'api';
    hasApiKey: boolean;
}

interface Provider {
    id: string;
    name: string;
    description: string;
    docsUrl: string;
    setupUrl: string;
    free: boolean;
    fields: string[];
}

function Settings() {
    const [searchParams] = useSearchParams();
    const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [apiKey, setApiKey] = useState('');
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Calendar state
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [calendarLoading, setCalendarLoading] = useState(false);

    // Check for calendar callback
    useEffect(() => {
        const calendarStatus = searchParams.get('calendar');
        if (calendarStatus === 'connected') {
            setMessage({ type: 'success', text: '✅ Google Calendar connected successfully!' });
            setCalendarConnected(true);
        } else if (calendarStatus === 'error') {
            setMessage({ type: 'error', text: 'Failed to connect Google Calendar. Please try again.' });
        }
    }, [searchParams]);

    // Fetch trial status and providers
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [trialRes, providersRes, calendarRes] = await Promise.all([
                    api.get('/settings/trial'),
                    api.get('/settings/providers'),
                    api.get('/calendar/status').catch(() => ({ data: { connected: false } })),
                ]);
                setTrialStatus(trialRes.data);
                setProviders(providersRes.data);
                setCalendarConnected(calendarRes.data.connected);
            } catch (error) {
                console.error('Failed to fetch settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        // Refresh trial status every minute
        const interval = setInterval(async () => {
            try {
                const res = await api.get('/settings/trial');
                setTrialStatus(res.data);
            } catch (error) {
                console.error('Failed to refresh trial status');
            }
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const handleSaveApiKey = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            await api.post('/settings/api-key', {
                provider: selectedProvider,
                apiKey,
                phoneNumberId: selectedProvider === 'meta' ? phoneNumberId : undefined,
            });
            setMessage({ type: 'success', text: 'API settings saved successfully!' });
            const res = await api.get('/settings/trial');
            setTrialStatus(res.data);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleClearApiKey = async () => {
        if (!confirm('Are you sure you want to clear your API settings and switch to trial mode?')) {
            return;
        }
        try {
            await api.delete('/settings/api-key');
            setSelectedProvider('');
            setApiKey('');
            setPhoneNumberId('');
            setMessage({ type: 'success', text: 'API settings cleared. Switched to trial mode.' });
            const res = await api.get('/settings/trial');
            setTrialStatus(res.data);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to clear settings' });
        }
    };

    const handleConnectCalendar = async () => {
        setCalendarLoading(true);
        try {
            const res = await api.get('/calendar/connect');
            if (res.data.authUrl) {
                window.location.href = res.data.authUrl;
            } else {
                setMessage({ type: 'error', text: 'Failed to get calendar authorization URL' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Calendar integration not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
        } finally {
            setCalendarLoading(false);
        }
    };

    const handleDisconnectCalendar = async () => {
        if (!confirm('Disconnect Google Calendar? Meeting scheduling will stop working.')) {
            return;
        }
        try {
            await api.delete('/calendar/disconnect');
            setCalendarConnected(false);
            setMessage({ type: 'success', text: 'Google Calendar disconnected.' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to disconnect calendar' });
        }
    };

    if (loading) {
        return (
            <div className="settings-page">
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="settings-header">
                <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
                <h1>⚙️ Settings</h1>
                <p>Configure WhatsApp connection and integrations</p>
            </div>

            {message && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* Trial Status Card */}
            <div className={`trial-card ${trialStatus?.isTrialExpired ? 'expired' : ''}`}>
                <div className="trial-icon">
                    {trialStatus?.connectionMode === 'api' ? '🔑' : trialStatus?.isTrialExpired ? '⏰' : '🎉'}
                </div>
                <div className="trial-info">
                    {trialStatus?.connectionMode === 'api' ? (
                        <>
                            <h3>Using API Key</h3>
                            <p>Connected via WhatsApp Business API</p>
                        </>
                    ) : trialStatus?.isTrialExpired ? (
                        <>
                            <h3>Trial Expired</h3>
                            <p>Please add your WhatsApp Business API key to continue</p>
                        </>
                    ) : trialStatus?.trialStartedAt ? (
                        <>
                            <h3>Trial Active</h3>
                            <div className="trial-timer">
                                <span className="time-value">{trialStatus.hoursRemaining}</span>
                                <span className="time-label">hrs</span>
                                <span className="time-value">{trialStatus.minutesRemaining}</span>
                                <span className="time-label">min</span>
                                <span className="time-remaining">remaining</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3>24-Hour Trial Available</h3>
                            <p>Start your trial by connecting WhatsApp via QR code</p>
                        </>
                    )}
                </div>
            </div>

            {/* Google Calendar Integration */}
            <div className="settings-section">
                <h2>📅 Google Calendar</h2>
                <p className="section-description">
                    Connect your Google Calendar for AI-powered meeting scheduling and reminders.
                </p>

                <div className="calendar-card">
                    <div className="calendar-status">
                        <div className={`status-indicator ${calendarConnected ? 'connected' : 'disconnected'}`}>
                            {calendarConnected ? '✓' : '○'}
                        </div>
                        <div className="status-info">
                            <h4>{calendarConnected ? 'Calendar Connected' : 'Not Connected'}</h4>
                            <p>
                                {calendarConnected
                                    ? 'AI can schedule meetings and send calendar invites.'
                                    : 'Connect to enable meeting scheduling via WhatsApp.'}
                            </p>
                        </div>
                    </div>

                    {calendarConnected ? (
                        <button className="btn btn-secondary" onClick={handleDisconnectCalendar}>
                            Disconnect Calendar
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={handleConnectCalendar} disabled={calendarLoading}>
                            {calendarLoading ? 'Connecting...' : '🔗 Connect Google Calendar'}
                        </button>
                    )}
                </div>

                <div className="calendar-features">
                    <h4>What your AI can do:</h4>
                    <ul>
                        <li>📅 <strong>Schedule meetings</strong> - "Book a demo for tomorrow at 2pm"</li>
                        <li>⏰ <strong>Set reminders</strong> - "Remind me about this quote"</li>
                        <li>🔄 <strong>Auto follow-ups</strong> - Send reminders for scheduled calls</li>
                    </ul>
                </div>
            </div>

            {/* Connection Mode Selection */}
            <div className="settings-section">
                <h2>📱 WhatsApp Connection Mode</h2>
                <div className="mode-cards">
                    <div
                        className={`mode-card ${trialStatus?.connectionMode === 'trial' ? 'active' : ''} ${trialStatus?.isTrialExpired ? 'disabled' : ''}`}
                        onClick={() => !trialStatus?.isTrialExpired && handleClearApiKey()}
                    >
                        <div className="mode-icon">📱</div>
                        <h4>Demo Mode (QR Code)</h4>
                        <p>Scan QR code to connect. 24-hour trial period.</p>
                        {trialStatus?.connectionMode === 'trial' && <span className="active-badge">Active</span>}
                        {trialStatus?.isTrialExpired && <span className="expired-badge">Expired</span>}
                    </div>
                    <div className={`mode-card ${trialStatus?.connectionMode === 'api' ? 'active' : ''}`}>
                        <div className="mode-icon">🔑</div>
                        <h4>API Key Mode</h4>
                        <p>Use your own WhatsApp Business API key. Unlimited usage.</p>
                        {trialStatus?.connectionMode === 'api' && <span className="active-badge">Active</span>}
                    </div>
                </div>
            </div>

            {/* API Key Form */}
            <div className="settings-section">
                <h2>🔑 WhatsApp Business API</h2>
                <p className="section-description">
                    Enter your API credentials from one of the supported providers.
                </p>

                <form onSubmit={handleSaveApiKey} className="api-form">
                    <div className="form-group">
                        <label>Select Provider</label>
                        <div className="provider-cards">
                            {providers.map(provider => (
                                <div
                                    key={provider.id}
                                    className={`provider-card ${selectedProvider === provider.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedProvider(provider.id)}
                                >
                                    <div className="provider-header">
                                        <h4>{provider.name}</h4>
                                        {provider.free && <span className="free-badge">Free</span>}
                                    </div>
                                    <p>{provider.description}</p>
                                    <div className="provider-links">
                                        <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer">📚 Docs</a>
                                        <a href={provider.setupUrl} target="_blank" rel="noopener noreferrer">⚙️ Get Key</a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedProvider && (
                        <>
                            <div className="form-group">
                                <label htmlFor="apiKey">API Key / Access Token</label>
                                <input
                                    id="apiKey"
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter your API key"
                                    required
                                />
                            </div>

                            {selectedProvider === 'meta' && (
                                <div className="form-group">
                                    <label htmlFor="phoneNumberId">Phone Number ID</label>
                                    <input
                                        id="phoneNumberId"
                                        type="text"
                                        value={phoneNumberId}
                                        onChange={(e) => setPhoneNumberId(e.target.value)}
                                        placeholder="Enter your Phone Number ID"
                                        required
                                    />
                                    <small>
                                        Find this in your <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">Meta App Dashboard</a>
                                    </small>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Save API Settings'}
                            </button>
                        </>
                    )}
                </form>

                {trialStatus?.hasApiKey && (
                    <button onClick={handleClearApiKey} className="btn btn-secondary btn-clear">
                        Clear API Key & Switch to Trial
                    </button>
                )}
            </div>
        </div>
    );
}

export default Settings;
