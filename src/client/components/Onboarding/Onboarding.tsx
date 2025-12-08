import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import './Onboarding.css';

type Step = 'whatsapp' | 'knowledge' | 'agent' | 'activate';

interface KnowledgeItem {
    id: string;
    source_type: string;
    metadata: Record<string, any>;
}

function Onboarding() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState<Step>('whatsapp');

    // WhatsApp state
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [whatsappStatus, setWhatsappStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [sessionId, setSessionId] = useState<string | null>(null);

    // Knowledge state
    const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [urlInput, setUrlInput] = useState('');

    // Agent state
    const [agentId, setAgentId] = useState<string | null>(null);
    const [agentName, setAgentName] = useState('');
    const [agentPrompt, setAgentPrompt] = useState('');
    const [knowledgeBaseIds, setKnowledgeBaseIds] = useState<string[]>([]);
    const [agentActive, setAgentActive] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const [sessionRes, agentsRes, knowledgeRes] = await Promise.all([
                api.get('/whatsapp/session').catch(() => ({ data: { session: null } })),
                api.get('/agents/list').catch(() => ({ data: { agents: [] } })),
                api.get('/knowledge/list').catch(() => ({ data: { items: [] } }))
            ]);

            const isConnected = sessionRes.data.session?.status === 'connected';
            const agent = agentsRes.data.agents?.[0];
            const items = knowledgeRes.data.items || [];

            setKnowledgeItems(items);

            // Smart routing based on what's setup
            if (isConnected) {
                setWhatsappStatus('connected');

                if (agent) {
                    setAgentId(agent.id);
                    setAgentName(agent.name || '');
                    setAgentPrompt(agent.systemPrompt || '');
                    setKnowledgeBaseIds(agent.knowledgeBaseIds || []);
                    setAgentActive(agent.isActive || false);

                    if (agent.isActive) {
                        // Fully setup - go to dashboard
                        navigate('/dashboard');
                        return;
                    } else {
                        // Agent exists but not active
                        setCurrentStep('activate');
                    }
                } else {
                    // WhatsApp connected but no agent - start from knowledge
                    setCurrentStep('knowledge');
                }
            } else {
                // WhatsApp not connected
                if (agent && agent.isActive) {
                    // Has active agent but WhatsApp disconnected - reconnect
                    setAgentId(agent.id);
                    setAgentName(agent.name || '');
                    setAgentActive(true);
                }
                setCurrentStep('whatsapp');
            }
        } catch (error) {
            console.error('Error checking status:', error);
        } finally {
            setLoading(false);
        }
    };

    // Refresh knowledge list
    const refreshKnowledge = async () => {
        try {
            const res = await api.get('/knowledge/list');
            setKnowledgeItems(res.data.items || []);
        } catch (e) {
            console.error('Error refreshing knowledge:', e);
        }
    };

    // WhatsApp connection
    const connectWhatsApp = useCallback(async () => {
        setWhatsappStatus('connecting');
        setQrCode(null);

        try {
            const socket = getSocket();
            if (!socket.connected) {
                socket.connect();
                await new Promise<void>((resolve) => {
                    if (socket.connected) resolve();
                    else socket.once('connect', () => resolve());
                });
            }

            const response = await api.post('/whatsapp/connect');
            const newSessionId = response.data.sessionId;
            setSessionId(newSessionId);

            socket.on(`qr-${newSessionId}`, (data: { qr: string }) => {
                setQrCode(data.qr);
            });

            socket.on(`ready-${newSessionId}`, () => {
                setWhatsappStatus('connected');
                setTimeout(() => setCurrentStep('knowledge'), 1500);
            });

        } catch (error) {
            console.error('Error connecting:', error);
            setWhatsappStatus('disconnected');
        }
    }, []);

    useEffect(() => {
        return () => {
            if (sessionId) {
                const socket = getSocket();
                socket.off(`qr-${sessionId}`);
                socket.off(`ready-${sessionId}`);
            }
        };
    }, [sessionId]);

    // File upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post('/knowledge/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await refreshKnowledge();
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // URL add
    const handleAddUrl = async () => {
        if (!urlInput.trim()) return;

        setUploading(true);
        try {
            await api.post('/knowledge/scrape', { url: urlInput });
            await refreshKnowledge();
            setUrlInput('');
        } catch (error) {
            console.error('Error scraping:', error);
            alert('Failed to add URL');
        } finally {
            setUploading(false);
        }
    };

    // Toggle knowledge selection
    const toggleKnowledge = (id: string) => {
        setKnowledgeBaseIds(prev =>
            prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
        );
    };

    // Save agent
    const saveAgent = async () => {
        if (!agentName.trim()) return;
        setSaving(true);

        try {
            const payload = { name: agentName, systemPrompt: agentPrompt, knowledgeBaseIds };

            if (agentId) {
                await api.put(`/agents/${agentId}`, payload);
            } else {
                const res = await api.post('/agents/create', { ...payload, isActive: false });
                setAgentId(res.data.agent?.id);
            }
            setCurrentStep('activate');
        } catch (error) {
            console.error('Error saving agent:', error);
        } finally {
            setSaving(false);
        }
    };

    // Activate agent
    const activateAgent = async () => {
        if (!agentId) return;
        setSaving(true);

        try {
            await api.put(`/agents/${agentId}`, { isActive: true });
            setAgentActive(true);
            navigate('/dashboard');
        } catch (error) {
            console.error('Error activating:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="onboarding">
                <div className="onboarding-loader"><div className="spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="onboarding">
            <div className="onboarding-container">
                {/* Progress */}
                <div className="steps">
                    <div className={`step ${currentStep === 'whatsapp' ? 'active' : whatsappStatus === 'connected' ? 'done' : ''}`}>
                        <div className="step-num">{whatsappStatus === 'connected' ? '✓' : '1'}</div>
                        <span>WhatsApp</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${currentStep === 'knowledge' ? 'active' : knowledgeItems.length > 0 ? 'done' : ''}`}>
                        <div className="step-num">{knowledgeItems.length > 0 ? '✓' : '2'}</div>
                        <span>Knowledge</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${currentStep === 'agent' ? 'active' : agentId ? 'done' : ''}`}>
                        <div className="step-num">{agentId ? '✓' : '3'}</div>
                        <span>Agent</span>
                    </div>
                    <div className="step-line"></div>
                    <div className={`step ${currentStep === 'activate' ? 'active' : agentActive ? 'done' : ''}`}>
                        <div className="step-num">{agentActive ? '✓' : '4'}</div>
                        <span>Go Live</span>
                    </div>
                </div>

                {/* Content */}
                <div className="onboarding-card card glass">
                    {/* Step 1: WhatsApp */}
                    {currentStep === 'whatsapp' && (
                        <div className="step-content fade-in">
                            <h2>📱 Connect WhatsApp</h2>
                            <p>Link your WhatsApp to receive and respond to messages.</p>

                            {whatsappStatus === 'disconnected' && (
                                <button className="btn btn-primary btn-lg" onClick={connectWhatsApp}>
                                    Connect WhatsApp
                                </button>
                            )}

                            {whatsappStatus === 'connecting' && !qrCode && (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>Initializing...</p>
                                </div>
                            )}

                            {whatsappStatus === 'connecting' && qrCode && (
                                <div className="qr-box fade-in">
                                    <div className="qr-code">
                                        <img src={qrCode} alt="Scan QR Code" />
                                    </div>
                                    <p className="qr-hint">Open WhatsApp → Linked Devices → Scan</p>
                                </div>
                            )}

                            {whatsappStatus === 'connected' && (
                                <div className="success-box fade-in">
                                    <div className="success-icon">✓</div>
                                    <p>Connected!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Knowledge Base */}
                    {currentStep === 'knowledge' && (
                        <div className="step-content fade-in">
                            <h2>📚 Add Knowledge Base</h2>
                            <p>Upload files or add URLs for your AI to learn from.</p>

                            <div className="upload-section">
                                <div className="upload-box">
                                    <label className="upload-label">
                                        <input
                                            type="file"
                                            accept=".pdf,.txt,.doc,.docx"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                        />
                                        <span className="upload-icon">📄</span>
                                        <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
                                        <span className="upload-hint">PDF, TXT, DOC</span>
                                    </label>
                                </div>

                                <div className="url-box">
                                    <input
                                        type="url"
                                        className="input"
                                        placeholder="https://yourwebsite.com"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        disabled={uploading}
                                    />
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleAddUrl}
                                        disabled={!urlInput.trim() || uploading}
                                    >
                                        Add URL
                                    </button>
                                </div>
                            </div>

                            {knowledgeItems.length > 0 && (
                                <div className="knowledge-list">
                                    <label className="list-label">Added ({knowledgeItems.length})</label>
                                    {knowledgeItems.map(item => (
                                        <div key={item.id} className="knowledge-row">
                                            <span className="knowledge-icon">
                                                {item.source_type === 'web' ? '🌐' : '📄'}
                                            </span>
                                            <span className="knowledge-name">
                                                {item.metadata?.filename || item.metadata?.url || 'Document'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="step-actions">
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={() => setCurrentStep('agent')}
                                >
                                    Continue
                                </button>
                                {knowledgeItems.length === 0 && (
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => setCurrentStep('agent')}
                                    >
                                        Skip for now
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Agent */}
                    {currentStep === 'agent' && (
                        <div className="step-content fade-in">
                            <h2>🤖 Create Your Agent</h2>
                            <p>Give your AI a name and select knowledge.</p>

                            <div className="form-field">
                                <label>Agent Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Sarah, Support Bot"
                                    value={agentName}
                                    onChange={(e) => setAgentName(e.target.value)}
                                />
                            </div>

                            <div className="form-field">
                                <label>Instructions (Optional)</label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    placeholder="Leave empty for smart defaults..."
                                    value={agentPrompt}
                                    onChange={(e) => setAgentPrompt(e.target.value)}
                                />
                            </div>

                            {knowledgeItems.length > 0 && (
                                <div className="form-field">
                                    <label>Select Knowledge Base</label>
                                    <div className="knowledge-select">
                                        {knowledgeItems.map(item => (
                                            <label key={item.id} className="knowledge-item">
                                                <input
                                                    type="checkbox"
                                                    checked={knowledgeBaseIds.includes(item.id)}
                                                    onChange={() => toggleKnowledge(item.id)}
                                                />
                                                <span>{item.metadata?.filename || item.metadata?.url || 'Document'}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                className="btn btn-primary btn-lg"
                                onClick={saveAgent}
                                disabled={!agentName.trim() || saving}
                            >
                                {saving ? 'Saving...' : 'Continue'}
                            </button>
                        </div>
                    )}

                    {/* Step 4: Activate */}
                    {currentStep === 'activate' && (
                        <div className="step-content fade-in">
                            <h2>🚀 Ready to Go Live!</h2>
                            <p>Activate your agent to start responding to messages.</p>

                            <div className="checklist">
                                <div className="check-item">✓ WhatsApp Connected</div>
                                {knowledgeItems.length > 0 && (
                                    <div className="check-item">✓ {knowledgeItems.length} Knowledge Items</div>
                                )}
                                <div className="check-item">✓ Agent "{agentName}" Created</div>
                            </div>

                            <button
                                className="btn btn-primary btn-lg glow"
                                onClick={activateAgent}
                                disabled={saving}
                            >
                                {saving ? 'Activating...' : '⚡ Activate Agent'}
                            </button>
                        </div>
                    )}
                </div>

                <Link to="/dashboard" className="skip-link">Skip to Dashboard →</Link>
            </div>
        </div>
    );
}

export default Onboarding;
