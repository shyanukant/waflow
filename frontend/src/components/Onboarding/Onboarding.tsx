import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import PageLoader from '../common/PageLoader';
import KnowledgeUploader from '../Knowledge/KnowledgeUploader';
import './Onboarding.css';

// Simplified to 3 steps: WhatsApp → Agent (with Knowledge) → Go Live
type Step = 'whatsapp' | 'agent' | 'activate';

interface KnowledgeItem {
    id: string;
    source_type: string;
    metadata: Record<string, any>;
}

// Personas for selection
const PERSONAS = [
    { id: 'professional', name: 'Professional', emoji: '💼' },
    { id: 'friendly', name: 'Friendly', emoji: '😊' },
    { id: 'casual', name: 'Casual', emoji: '🎉' },
];

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
    const [isUploading, setIsUploading] = useState(false);

    // Agent state
    const [agentId, setAgentId] = useState<string | null>(null);
    const [agentName, setAgentName] = useState('');
    const [agentPrompt, setAgentPrompt] = useState('');
    const [agentPersona, setAgentPersona] = useState('friendly');
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
                    // WhatsApp connected but no agent - go to agent step
                    setCurrentStep('agent');
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
            const items = res.data.items || [];
            setKnowledgeItems(items);
            // Auto-select all knowledge items
            setKnowledgeBaseIds(items.map((item: KnowledgeItem) => item.id));
        } catch (e) {
            console.error('Error refreshing knowledge:', e);
        }
    };

    // Handle upload state change
    const handleUploadStateChange = (uploading: boolean) => {
        setIsUploading(uploading);
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
                setTimeout(() => setCurrentStep('agent'), 1500);
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

    // Toggle knowledge selection
    const toggleKnowledge = (id: string) => {
        setKnowledgeBaseIds(prev =>
            prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
        );
    };

    // Save agent
    const saveAgent = async () => {
        if (!agentName.trim() || isUploading) return;
        setSaving(true);

        try {
            const payload = { name: agentName, systemPrompt: agentPrompt, knowledgeBaseIds, persona: agentPersona };

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
        return <PageLoader />;
    }

    return (
        <div className="onboarding">
            <div className="onboarding-container">
                {/* Progress - 3 Steps */}
                <div className="onboarding-steps">
                    <div className={`onboarding-step ${currentStep === 'whatsapp' ? 'active' : whatsappStatus === 'connected' ? 'done' : ''}`}>
                        <div className="step-num">{whatsappStatus === 'connected' ? '✓' : '1'}</div>
                        <span>WhatsApp</span>
                    </div>
                    <div className="onboarding-step-line"></div>
                    <div className={`onboarding-step ${currentStep === 'agent' ? 'active' : agentId ? 'done' : ''}`}>
                        <div className="step-num">{agentId ? '✓' : '2'}</div>
                        <span>Agent</span>
                    </div>
                    <div className="onboarding-step-line"></div>
                    <div className={`onboarding-step ${currentStep === 'activate' ? 'active' : agentActive ? 'done' : ''}`}>
                        <div className="step-num">{agentActive ? '✓' : '3'}</div>
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

                    {/* Step 2: Agent + Knowledge (Merged) */}
                    {currentStep === 'agent' && (
                        <div className="step-content fade-in">
                            <h2>🤖 Create Your Agent</h2>
                            <p>Name your AI and add knowledge for it to learn from.</p>

                            {/* Agent Name */}
                            <div className="form-field">
                                <label>Agent Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Sarah, Support Bot"
                                    value={agentName}
                                    onChange={(e) => setAgentName(e.target.value)}
                                />
                            </div>

                            {/* Instructions */}
                            <div className="form-field">
                                <label>
                                    Instructions (Optional)
                                    <a href="/docs" target="_blank" rel="noopener noreferrer" className="docs-link-small">📚 Templates</a>
                                </label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    placeholder="Leave empty for smart defaults..."
                                    value={agentPrompt}
                                    onChange={(e) => setAgentPrompt(e.target.value)}
                                />
                            </div>

                            {/* Persona Selection */}
                            <div className="form-field">
                                <label>Communication Style</label>
                                <div className="persona-buttons">
                                    {PERSONAS.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            className={`persona-btn ${agentPersona === p.id ? 'selected' : ''}`}
                                            onClick={() => setAgentPersona(p.id)}
                                        >
                                            <span className="persona-emoji">{p.emoji}</span>
                                            <span>{p.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Knowledge Upload */}
                            <div className="form-field">
                                <label>Knowledge Base (Optional)</label>
                                <div className="knowledge-section">
                                    <KnowledgeUploader
                                        onUploadComplete={refreshKnowledge}
                                        onUploadStateChange={handleUploadStateChange}
                                    />

                                    {knowledgeItems.length > 0 && (
                                        <div className="knowledge-list-compact">
                                            <span className="list-label">{knowledgeItems.length} item(s) added</span>
                                            <div className="knowledge-select">
                                                {knowledgeItems.map(item => (
                                                    <label key={item.id} className="knowledge-item">
                                                        <input
                                                            type="checkbox"
                                                            checked={knowledgeBaseIds.includes(item.id)}
                                                            onChange={() => toggleKnowledge(item.id)}
                                                        />
                                                        <span>
                                                            {item.source_type === 'web' ? '🌐' : '📄'}{' '}
                                                            {item.metadata?.filename || item.metadata?.url || 'Document'}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Upload indicator */}
                            {isUploading && (
                                <div className="upload-warning">
                                    ⏳ Uploading... Please wait
                                </div>
                            )}

                            <button
                                className="btn btn-primary btn-lg"
                                onClick={saveAgent}
                                disabled={!agentName.trim() || saving || isUploading}
                            >
                                {saving ? 'Saving...' : isUploading ? 'Please wait...' : 'Continue'}
                            </button>
                        </div>
                    )}

                    {/* Step 3: Activate */}
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
