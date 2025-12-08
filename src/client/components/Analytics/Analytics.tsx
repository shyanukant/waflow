import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/formatters';
import PageLoader from '../common/PageLoader';
import './Analytics.css';

interface AnalyticsData {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    totalConversations: number;
    totalMessages: number;
}

interface Conversation {
    id: string;
    senderNumber: string;
    userMessage: string;
    agentResponse: string | null;
    createdAt: string;
}

function Analytics() {
    const [analytics, setAnalytics] = useState<AnalyticsData>({
        today: 0,
        yesterday: 0,
        thisWeek: 0,
        thisMonth: 0,
        totalConversations: 0,
        totalMessages: 0
    });
    const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const response = await api.get('/analytics/summary');
            setAnalytics(response.data.analytics);
            setRecentConversations(response.data.recentConversations || []);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatPhone = (phone: string) => {
        // Mask middle digits for privacy
        if (phone.length > 6) {
            return phone.slice(0, 3) + '***' + phone.slice(-3);
        }
        return phone;
    };

    if (loading) {
        return <PageLoader />;
    }

    return (
        <div className="analytics-container">
            <div className="container">
                <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>

                <h1 className="page-title">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Analytics
                </h1>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card card">
                        <div className="stat-icon today">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics.today}</span>
                            <span className="stat-label">Today</span>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon yesterday">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics.yesterday}</span>
                            <span className="stat-label">Yesterday</span>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon week">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                            </svg>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics.thisWeek}</span>
                            <span className="stat-label">This Week</span>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon month">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="1" x2="12" y2="23" />
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics.thisMonth}</span>
                            <span className="stat-label">This Month</span>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="summary-row">
                    <div className="summary-card card">
                        <span className="summary-value">{analytics.totalConversations}</span>
                        <span className="summary-label">Total Conversations</span>
                    </div>
                    <div className="summary-card card">
                        <span className="summary-value">{analytics.totalMessages}</span>
                        <span className="summary-label">Total Messages</span>
                    </div>
                </div>

                {/* Recent Conversations */}
                <div className="card conversations-section">
                    <h2 className="section-title">Recent Conversations</h2>

                    {recentConversations.length === 0 ? (
                        <p className="empty-state">No conversations yet. Connect WhatsApp and your agent will start chatting!</p>
                    ) : (
                        <div className="conversations-list">
                            {recentConversations.map(convo => (
                                <div key={convo.id} className="conversation-item">
                                    <div className="convo-header">
                                        <span className="convo-phone">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" />
                                            </svg>
                                            {formatPhone(convo.senderNumber)}
                                        </span>
                                        <span className="convo-time">{formatDate(convo.createdAt)}</span>
                                    </div>
                                    <div className="convo-messages">
                                        <div className="message user-message">
                                            <span className="message-label">User:</span>
                                            {convo.userMessage}
                                        </div>
                                        {convo.agentResponse && (
                                            <div className="message agent-message">
                                                <span className="message-label">Agent:</span>
                                                {convo.agentResponse.length > 200
                                                    ? convo.agentResponse.slice(0, 200) + '...'
                                                    : convo.agentResponse}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Analytics;