import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import api from '../../services/api';
import './Dashboard.css';

interface Lead {
    id: string;
    phoneNumber: string;
    name: string | null;
    interest: string | null;
    status: string;
    createdAt: string;
}

interface Analytics {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    totalConversations: number;
    totalMessages: number;
}

interface Notification {
    id: string;
    type: 'lead' | 'message';
    message: string;
    time: Date;
}

function Dashboard() {
    const [userName, setUserName] = useState('');
    const [whatsappConnected, setWhatsappConnected] = useState(false);
    const [agentActive, setAgentActive] = useState(false);
    const [agentName, setAgentName] = useState('');
    const [analytics, setAnalytics] = useState<Analytics>({
        today: 0, yesterday: 0, thisWeek: 0, thisMonth: 0, totalConversations: 0, totalMessages: 0
    });
    const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSetupAlert, setShowSetupAlert] = useState(false);
    const navigate = useNavigate();

    const previousLeadCount = useRef(0);
    const previousMessageCount = useRef(0);

    // Load initial user data (once)
    useEffect(() => {
        const loadUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUserName(user?.user_metadata?.full_name || 'there');
        };
        loadUserData();
    }, []);

    // Fetch real-time data (reusable)
    const fetchData = useCallback(async (isInitial = false) => {
        try {
            const [sessionRes, agentsRes, analyticsRes, leadsRes] = await Promise.all([
                api.get('/whatsapp/session').catch(() => ({ data: { session: null } })),
                api.get('/agents/list').catch(() => ({ data: { agents: [] } })),
                api.get('/analytics/summary').catch(() => ({ data: { analytics: {} } })),
                api.get('/leads/list').catch(() => ({ data: { leads: [] } }))
            ]);

            // WhatsApp status
            const isConnected = sessionRes.data.session?.status === 'connected';
            setWhatsappConnected(isConnected);

            // Agent status
            const agent = agentsRes.data.agents?.[0];
            setAgentActive(agent?.isActive || false);
            setAgentName(agent?.name || '');
            setShowSetupAlert(!isConnected || !agent?.isActive);

            // Analytics from DB
            const stats = analyticsRes.data.analytics || {};
            setAnalytics({
                today: stats.today || 0,
                yesterday: stats.yesterday || 0,
                thisWeek: stats.thisWeek || 0,
                thisMonth: stats.thisMonth || 0,
                totalConversations: stats.totalConversations || 0,
                totalMessages: stats.totalMessages || 0
            });

            // Leads
            const leads = (leadsRes.data.leads || []).slice(0, 5);
            setRecentLeads(leads);

            // Check for new notifications (not on initial load)
            if (!isInitial) {
                const newLeadCount = leadsRes.data.leads?.length || 0;
                const newMessageCount = stats.totalMessages || 0;

                if (newLeadCount > previousLeadCount.current) {
                    const diff = newLeadCount - previousLeadCount.current;
                    addNotification('lead', `${diff} new lead${diff > 1 ? 's' : ''} captured!`);
                }

                if (newMessageCount > previousMessageCount.current) {
                    const diff = newMessageCount - previousMessageCount.current;
                    addNotification('message', `${diff} new message${diff > 1 ? 's' : ''} received`);
                }

                previousLeadCount.current = newLeadCount;
                previousMessageCount.current = newMessageCount;
            } else {
                previousLeadCount.current = leadsRes.data.leads?.length || 0;
                previousMessageCount.current = stats.totalMessages || 0;
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            if (isInitial) setLoading(false);
        }
    }, []);

    // Add notification
    const addNotification = (type: 'lead' | 'message', message: string) => {
        const notification: Notification = {
            id: Date.now().toString(),
            type,
            message,
            time: new Date()
        };
        setNotifications(prev => [notification, ...prev].slice(0, 5));

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
    };

    // Initial load
    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    // Polling every 30 seconds for real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData(false);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchData]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            {/* Notifications Toast */}
            {notifications.length > 0 && (
                <div className="notifications-container">
                    {notifications.map(n => (
                        <div key={n.id} className={`notification-toast ${n.type}`}>
                            <span className="notification-icon">
                                {n.type === 'lead' ? '👤' : '💬'}
                            </span>
                            <span className="notification-message">{n.message}</span>
                            <button onClick={() => dismissNotification(n.id)} className="notification-close">×</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Header */}
            <header className="dashboard-header glass">
                <div className="header-content">
                    <div className="header-left">
                        <h1 className="logo">
                            <span className="logo-icon">⚡</span>
                            WaFlow
                        </h1>
                    </div>
                    <div className="header-right">
                        <span className="user-greeting">Hey, {userName}!</span>
                        <button className="btn btn-ghost btn-small" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="container">
                    {/* Setup Alert */}
                    {showSetupAlert && (
                        <div className="setup-alert card fade-in">
                            <div className="alert-icon">⚠️</div>
                            <div className="alert-content">
                                <h3>Complete Your Setup</h3>
                                <p>
                                    {!whatsappConnected && 'WhatsApp is not connected. '}
                                    {!agentActive && 'Your AI agent is not active. '}
                                </p>
                            </div>
                            <Link to="/onboarding" className="btn btn-primary">
                                Complete Setup
                            </Link>
                        </div>
                    )}

                    {/* Status Cards */}
                    <div className="status-grid">
                        <div className={`status-card card ${whatsappConnected ? 'status-good' : 'status-warn'}`}>
                            <div className="status-indicator">
                                <span className={`dot ${whatsappConnected ? 'dot-green' : 'dot-yellow'}`}></span>
                            </div>
                            <div className="status-info">
                                <h4>WhatsApp</h4>
                                <p>{whatsappConnected ? 'Connected' : 'Disconnected'}</p>
                            </div>
                            <Link to="/whatsapp/connect" className="status-action">
                                {whatsappConnected ? 'View' : 'Connect'}
                            </Link>
                        </div>

                        <div className={`status-card card ${agentActive ? 'status-good' : 'status-warn'}`}>
                            <div className="status-indicator">
                                <span className={`dot ${agentActive ? 'dot-green' : 'dot-yellow'}`}></span>
                            </div>
                            <div className="status-info">
                                <h4>AI Agent</h4>
                                <p>{agentActive ? agentName : 'Not Active'}</p>
                            </div>
                            <Link to="/agent" className="status-action">
                                Manage
                            </Link>
                        </div>
                    </div>

                    {/* Analytics Section */}
                    <section className="analytics-section">
                        <div className="section-header">
                            <h2>📊 Analytics</h2>
                            <Link to="/analytics" className="view-all">View All →</Link>
                        </div>
                        <div className="analytics-grid">
                            <div className="analytics-card card">
                                <div className="analytics-value">{analytics.today}</div>
                                <div className="analytics-label">Today</div>
                            </div>
                            <div className="analytics-card card">
                                <div className="analytics-value">{analytics.thisWeek}</div>
                                <div className="analytics-label">This Week</div>
                            </div>
                            <div className="analytics-card card">
                                <div className="analytics-value">{analytics.thisMonth}</div>
                                <div className="analytics-label">This Month</div>
                            </div>
                            <div className="analytics-card card highlight">
                                <div className="analytics-value">{analytics.totalMessages}</div>
                                <div className="analytics-label">Total Messages</div>
                            </div>
                        </div>
                    </section>

                    {/* Leads Section */}
                    <section className="leads-section">
                        <div className="section-header">
                            <h2>👥 Recent Leads</h2>
                            <Link to="/leads" className="view-all">View All →</Link>
                        </div>
                        {recentLeads.length === 0 ? (
                            <div className="empty-leads card">
                                <p>No leads captured yet. Start chatting on WhatsApp!</p>
                            </div>
                        ) : (
                            <div className="leads-list">
                                {recentLeads.map(lead => (
                                    <div key={lead.id} className="lead-row card">
                                        <div className="lead-avatar">
                                            {lead.name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="lead-info">
                                            <div className="lead-name">{lead.name || `+${lead.phoneNumber}`}</div>
                                            <div className="lead-interest">
                                                {lead.interest ? `${lead.interest.slice(0, 50)}...` : 'New lead'}
                                            </div>
                                        </div>
                                        <span className={`lead-status status-${lead.status}`}>
                                            {lead.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <footer className="dashboard-footer">
                Created by <a href="https://krtrim.tech" target="_blank" rel="noopener noreferrer">krtrim</a>
            </footer>
        </div>
    );
}

export default Dashboard;
