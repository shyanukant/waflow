import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import api from '../../services/api';
import './Dashboard.css';

interface User {
    user_metadata?: {
        full_name?: string;
    };
}

function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [whatsappConnected, setWhatsappConnected] = useState(false);
    const [hasAgent, setHasAgent] = useState(false);
    const [knowledgeCount, setKnowledgeCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            const [sessions, agents, knowledge] = await Promise.all([
                api.get('/whatsapp/sessions').catch(() => ({ data: { sessions: [] } })),
                api.get('/agents/list').catch(() => ({ data: { agents: [] } })),
                api.get('/knowledge/list').catch(() => ({ data: { items: [] } }))
            ]);

            setWhatsappConnected((sessions.data.sessions?.length || 0) > 0);
            setHasAgent((agents.data.agents?.length || 0) > 0);
            setKnowledgeCount(knowledge.data.items?.length || 0);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container flex justify-between items-center">
                    <h1 className="dashboard-logo">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.789l4.89-1.56A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.104 0-4.102-.648-5.784-1.872l-.414-.268-3.224 1.03 1.014-3.144-.29-.436A9.72 9.72 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75S21.75 6.615 21.75 12s-4.365 9.75-9.75 9.75z" />
                        </svg>
                        WAFlow
                    </h1>
                    <button onClick={handleLogout} className="btn btn-ghost">
                        Logout
                    </button>
                </div>
            </header>

            <main className="container dashboard-content">
                <div className="dashboard-welcome fade-in">
                    <h2>Welcome, {user?.user_metadata?.full_name || 'User'}!</h2>
                    <p>Your WhatsApp AI Agent Automation Platform</p>
                </div>

                {/* Status Cards */}
                <div className="status-grid">
                    <div className={`status-card card ${whatsappConnected ? 'status-success' : 'status-pending'}`}>
                        <div className="status-icon">
                            {whatsappConnected ? (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            ) : (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                            )}
                        </div>
                        <div className="status-info">
                            <h3>WhatsApp</h3>
                            <p>{whatsappConnected ? 'Connected' : 'Not Connected'}</p>
                        </div>
                        <Link to="/whatsapp/connect" className="btn btn-secondary btn-small">
                            {whatsappConnected ? 'Manage' : 'Connect'}
                        </Link>
                    </div>

                    <div className={`status-card card ${hasAgent ? 'status-success' : 'status-pending'}`}>
                        <div className="status-icon">
                            {hasAgent ? (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            ) : (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    <circle cx="12" cy="16" r="1" />
                                </svg>
                            )}
                        </div>
                        <div className="status-info">
                            <h3>AI Agent</h3>
                            <p>{hasAgent ? 'Configured' : 'Not Set Up'}</p>
                        </div>
                        <Link to="/agent" className="btn btn-secondary btn-small">
                            {hasAgent ? 'Edit' : 'Create'}
                        </Link>
                    </div>

                    <div className="status-card card">
                        <div className="status-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                        </div>
                        <div className="status-info">
                            <h3>Knowledge</h3>
                            <p>{knowledgeCount} items</p>
                        </div>
                        <Link to="/agent" className="btn btn-secondary btn-small">
                            Manage
                        </Link>
                    </div>

                    <div className="status-card card">
                        <div className="status-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                        </div>
                        <div className="status-info">
                            <h3>Analytics</h3>
                            <p>View insights</p>
                        </div>
                        <Link to="/analytics" className="btn btn-secondary btn-small">
                            View
                        </Link>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                    <h3 className="section-title">Quick Setup</h3>
                    <div className="setup-steps">
                        <div className={`setup-step ${whatsappConnected ? 'completed' : ''}`}>
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h4>Connect WhatsApp</h4>
                                <p>Scan QR code to link your account</p>
                            </div>
                            {!whatsappConnected && (
                                <Link to="/whatsapp/connect" className="btn btn-primary">
                                    Connect Now
                                </Link>
                            )}
                        </div>

                        <div className={`setup-step ${hasAgent ? 'completed' : ''}`}>
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h4>Configure Agent</h4>
                                <p>Set up your AI assistant and knowledge base</p>
                            </div>
                            {!hasAgent && (
                                <Link to="/agent" className="btn btn-primary">
                                    Set Up Agent
                                </Link>
                            )}
                        </div>

                        <div className="setup-step">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h4>Start Automating</h4>
                                <p>Your agent will handle WhatsApp messages</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
