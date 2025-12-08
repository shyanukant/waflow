import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './Agents.css';

interface KnowledgeItem {
    id: string;
    source_type: string;
    metadata: Record<string, any> | string;
    text_preview?: string;
    chunk_count?: number;
    created_at: string;
}

function AgentCreator() {
    const [existingAgentId, setExistingAgentId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        systemPrompt: '',
        knowledgeBaseIds: [] as string[]
    });
    const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [url, setUrl] = useState('');
    const [saved, setSaved] = useState(false);

    // Placeholder hint shown in textarea
    const promptPlaceholder = `Example instructions for your agent:

- Be friendly and professional
- Keep responses short for WhatsApp
- Answer questions using your knowledge base
- If unsure, offer to connect with a human

Leave empty to use smart default behavior.`;

    // Load existing agent and knowledge
    const loadData = useCallback(async () => {
        setPageLoading(true);
        try {
            const [agentsRes, knowledgeRes] = await Promise.all([
                api.get('/agents/list'),
                api.get('/knowledge/list')
            ]);

            setKnowledgeItems(knowledgeRes.data.items || []);

            // Check if user has an existing agent
            const agents = agentsRes.data.agents || [];
            if (agents.length > 0) {
                const agent = agents[0];
                setExistingAgentId(agent.id);
                setFormData({
                    name: agent.name || '',
                    systemPrompt: agent.systemPrompt || '', // Show empty if no custom prompt
                    knowledgeBaseIds: agent.knowledgeBaseIds || []
                });
            } else {
                // New agent - empty defaults, backend handles smart defaults
                setFormData({
                    name: '',
                    systemPrompt: '',
                    knowledgeBaseIds: []
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setPageLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Please enter an agent name');
            return;
        }
        setLoading(true);
        setSaved(false);

        try {
            // Replace placeholder with actual name in prompt
            const finalPrompt = formData.systemPrompt.replace(/{{agent_name}}/g, formData.name);
            const payload = { ...formData, systemPrompt: finalPrompt };

            if (existingAgentId) {
                // Update existing agent
                await api.put(`/agents/${existingAgentId}`, payload);
            } else {
                // Create new agent
                const response = await api.post('/agents/create', payload);
                setExistingAgentId(response.data.agent?.id);
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error saving agent:', error);
            alert('Failed to save agent');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            await api.post('/knowledge/upload', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await loadData();
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
            // Reset file input
            e.target.value = '';
        }
    };

    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        setUploading(true);
        try {
            await api.post('/knowledge/url', { url });
            setUrl('');
            await loadData();
        } catch (error) {
            console.error('Error adding URL:', error);
            alert('Failed to add URL');
        } finally {
            setUploading(false);
        }
    };

    const handleKnowledgeToggle = (id: string) => {
        setFormData(prev => ({
            ...prev,
            knowledgeBaseIds: prev.knowledgeBaseIds.includes(id)
                ? prev.knowledgeBaseIds.filter(i => i !== id)
                : [...prev.knowledgeBaseIds, id]
        }));
    };

    const handleDeleteKnowledge = async (id: string) => {
        if (!confirm('Delete this knowledge item?')) return;

        try {
            await api.delete(`/knowledge/${id}`);
            setFormData(prev => ({
                ...prev,
                knowledgeBaseIds: prev.knowledgeBaseIds.filter(i => i !== id)
            }));
            await loadData();
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const getMetadata = (item: KnowledgeItem) => {
        try {
            const meta = typeof item.metadata === 'string'
                ? JSON.parse(item.metadata)
                : item.metadata;
            return meta?.filename || meta?.url || 'Document';
        } catch {
            return 'Document';
        }
    };

    if (pageLoading) {
        return (
            <div className="agent-creator-container">
                <div className="container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="agent-creator-container">
            <div className="container">
                <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>

                <h1 className="page-title">
                    {existingAgentId ? 'Edit Your Agent' : 'Create Your Agent'}
                </h1>

                {saved && (
                    <div className="save-notification">
                        ✓ Agent saved successfully!
                    </div>
                )}

                <form onSubmit={handleSubmit} className="agent-form">
                    {/* Section 1: Agent Name */}
                    <div className="form-section card">
                        <h2 className="card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            Agent Name
                        </h2>
                        <div className="form-group">
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Maya, Support Bot, Sales Assistant"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                            <p className="form-hint">Give your agent a friendly name. Users will see this when they chat.</p>
                        </div>
                    </div>

                    {/* Section 2: System Prompt */}
                    <div className="form-section card">
                        <h2 className="card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            Instructions
                        </h2>
                        <div className="form-group">
                            <textarea
                                className="input instruction-textarea"
                                rows={10}
                                placeholder={promptPlaceholder}
                                value={formData.systemPrompt}
                                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                            />
                            <p className="form-hint">
                                Optional: Add custom instructions for your agent. Leave empty for smart defaults.
                            </p>
                        </div>
                    </div>

                    {/* Section 3: Knowledge Base */}
                    <div className="form-section card">
                        <h2 className="card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                            Knowledge Base
                        </h2>

                        {/* Upload Options */}
                        <div className="upload-methods">
                            <div className="upload-method">
                                <label className="file-upload-btn btn btn-secondary">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="12" y1="18" x2="12" y2="12" />
                                        <line x1="9" y1="15" x2="15" y2="15" />
                                    </svg>
                                    {uploading ? 'Uploading...' : 'Upload Document'}
                                    <input
                                        type="file"
                                        onChange={handleFileUpload}
                                        accept=".pdf,.docx,.txt"
                                        style={{ display: 'none' }}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>

                            <div className="upload-method url-upload">
                                <input
                                    type="url"
                                    className="input"
                                    placeholder="https://example.com/article"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    disabled={uploading}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleUrlSubmit}
                                    disabled={uploading || !url}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                    </svg>
                                    {uploading ? 'Adding...' : 'Add URL'}
                                </button>
                            </div>
                        </div>

                        {/* Knowledge Items List */}
                        <div className="knowledge-list">
                            {knowledgeItems.length === 0 ? (
                                <p className="empty-state">No knowledge items yet. Upload documents or add URLs above.</p>
                            ) : (
                                <div className="knowledge-items">
                                    <p className="form-hint">Select items to include in this agent's knowledge:</p>
                                    {knowledgeItems.map(item => (
                                        <div key={item.id} className="knowledge-item-row">
                                            <label className="knowledge-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.knowledgeBaseIds.includes(item.id)}
                                                    onChange={() => handleKnowledgeToggle(item.id)}
                                                />
                                                <span className="knowledge-icon">
                                                    {item.source_type === 'upload' ? (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                            <polyline points="14 2 14 8 20 8" />
                                                        </svg>
                                                    ) : (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                                        </svg>
                                                    )}
                                                </span>
                                                <span className="knowledge-name">{getMetadata(item)}</span>
                                                <span className="knowledge-meta">
                                                    {item.chunk_count || 0} chunks
                                                </span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteKnowledge(item.id)}
                                                className="btn btn-ghost btn-small"
                                                title="Delete"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
                            {loading ? 'Saving...' : (existingAgentId ? 'Save Changes' : 'Create Agent')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AgentCreator;
