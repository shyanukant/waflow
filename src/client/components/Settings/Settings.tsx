// Settings Page - Trial status and WhatsApp API key management
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [apiKey, setApiKey] = useState('');
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch trial status and providers
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [trialRes, providersRes] = await Promise.all([
                    api.get('/settings/trial'),
                    api.get('/settings/providers'),
                ]);
                setTrialStatus(trialRes.data);
                setProviders(providersRes.data);
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
            // Refresh trial status
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

    if (loading) {
        return (
            <div className="settings-page">
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    const selectedProviderData = providers.find(p => p.id === selectedProvider);

    return (
        <div className="settings-page">
            <div className="settings-header">
                <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
                <h1>WhatsApp Settings</h1>
                <p>Configure your WhatsApp connection method</p>
            </div>

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

            {/* Connection Mode Selection */}
            <div className="settings-section">
                <h2>Connection Mode</h2>
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
                <h2>WhatsApp Business API</h2>
                <p className="section-description">
                    Enter your API credentials from one of the supported providers.
                </p>

                {message && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}

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
                                        <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer">
                                            📚 Documentation
                                        </a>
                                        <a href={provider.setupUrl} target="_blank" rel="noopener noreferrer">
                                            ⚙️ Get API Key
                                        </a>
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
                                        Find this in your <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">Meta App Dashboard</a> → WhatsApp → API Setup
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
