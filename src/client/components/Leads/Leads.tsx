import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './Leads.css';

interface Lead {
    id: string;
    phoneNumber: string;
    name: string | null;
    email: string | null;
    interest: string | null;
    status: string;
    notes: string | null;
    createdAt: string;
}

function Leads() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    useEffect(() => {
        loadLeads();
    }, []);

    const loadLeads = async () => {
        try {
            const response = await api.get('/leads/list');
            setLeads(response.data.leads || []);
        } catch (error) {
            console.error('Error loading leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateLeadStatus = async (leadId: string, status: string) => {
        try {
            await api.put(`/leads/${leadId}`, { status });
            setLeads(leads.map(l =>
                l.id === leadId ? { ...l, status } : l
            ));
        } catch (error) {
            console.error('Error updating lead:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'status-new';
            case 'contacted': return 'status-contacted';
            case 'converted': return 'status-converted';
            case 'closed': return 'status-closed';
            default: return '';
        }
    };

    if (loading) {
        return (
            <div className="leads-container">
                <div className="container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="leads-container">
            <div className="container">
                <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>

                <h1 className="page-title">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Leads ({leads.length})
                </h1>

                {leads.length === 0 ? (
                    <div className="card empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                        </svg>
                        <h3>No Leads Yet</h3>
                        <p>When users show interest via WhatsApp, they'll appear here!</p>
                    </div>
                ) : (
                    <div className="leads-grid">
                        {leads.map(lead => (
                            <div key={lead.id} className="lead-card card" onClick={() => setSelectedLead(lead)}>
                                <div className="lead-header">
                                    <div className="lead-phone">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" />
                                        </svg>
                                        +{lead.phoneNumber}
                                    </div>
                                    <span className={`lead-status ${getStatusColor(lead.status)}`}>
                                        {lead.status}
                                    </span>
                                </div>

                                {lead.name && (
                                    <div className="lead-name">{lead.name}</div>
                                )}

                                {lead.email && (
                                    <div className="lead-email">{lead.email}</div>
                                )}

                                {lead.interest && (
                                    <div className="lead-interest">
                                        "{lead.interest.slice(0, 100)}{lead.interest.length > 100 ? '...' : ''}"
                                    </div>
                                )}

                                <div className="lead-footer">
                                    <span className="lead-date">{formatDate(lead.createdAt)}</span>
                                    <select
                                        value={lead.status}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            updateLeadStatus(lead.id, e.target.value);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="status-select"
                                    >
                                        <option value="new">New</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="converted">Converted</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Lead Detail Modal */}
                {selectedLead && (
                    <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
                        <div className="modal card" onClick={(e) => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setSelectedLead(null)}>×</button>
                            <h2>Lead Details</h2>
                            <div className="modal-content">
                                <div className="detail-row">
                                    <span className="label">Phone:</span>
                                    <span>+{selectedLead.phoneNumber}</span>
                                </div>
                                {selectedLead.name && (
                                    <div className="detail-row">
                                        <span className="label">Name:</span>
                                        <span>{selectedLead.name}</span>
                                    </div>
                                )}
                                {selectedLead.email && (
                                    <div className="detail-row">
                                        <span className="label">Email:</span>
                                        <span>{selectedLead.email}</span>
                                    </div>
                                )}
                                <div className="detail-row">
                                    <span className="label">Status:</span>
                                    <span className={`lead-status ${getStatusColor(selectedLead.status)}`}>
                                        {selectedLead.status}
                                    </span>
                                </div>
                                {selectedLead.interest && (
                                    <div className="detail-section">
                                        <span className="label">Interest:</span>
                                        <p>{selectedLead.interest}</p>
                                    </div>
                                )}
                                {selectedLead.notes && (
                                    <div className="detail-section">
                                        <span className="label">Notes:</span>
                                        <p>{selectedLead.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Leads;
