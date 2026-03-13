import React, { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
    Search, Edit2, Save, X, Phone, User, MapPin,
    Mail, Lock, CheckCircle, AlertCircle, Loader
} from 'lucide-react';

const AgentDashboard = () => {
    const { user } = useAuth();
    const [searchPhone, setSearchPhone] = useState('');
    const [lead, setLead] = useState(null);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState(null); // { success, message, detail }

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');
        setLead(null);
        setIsEditing(false);
        setSubmitResult(null);
        try {
            const res = await api.get(`/leads/search/${searchPhone}`);
            setLead(res.data);
            setEditForm(res.data);
        } catch (err) {
            setError('Lead not found. Please check the phone number.');
        }
    };

    const handleUpdate = async () => {
        try {
            const res = await api.put(`/leads/${lead.id}`, editForm);
            setLead(res.data);
            setEditForm(res.data);
            setIsEditing(false);
            alert('Lead updated successfully!');
        } catch (err) {
            alert('Failed to update lead');
        }
    };

    const handleSubmit = async () => {
        setSubmitResult(null);
        setIsSubmitting(true);
        try {
            const res = await api.post(`/leads/${lead.id}/submit`);
            setLead(res.data);
            setSubmitResult({
                success: true,
                message: 'Lead submitted successfully!',
                detail: 'The lead has been sent to the sales team and is now locked.',
            });
        } catch (err) {
            const status = err?.response?.status;
            const detail = err?.response?.data?.detail || 'An unexpected error occurred.';

            let message = 'Submission failed.';
            if (status === 409) {
                message = 'This lead is already submitted.';
            } else if (status === 422) {
                message = 'Missing required fields.';
            } else if (status === 502) {
                message = 'Could not reach the external API.';
            }

            setSubmitResult({ success: false, message, detail });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = (label, key, icon, editable = true) => {
        return (
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {icon}
                    {isEditing && editable && !lead.is_submitted ? (
                        <input
                            className="glass-input"
                            value={editForm[key] || ''}
                            onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                        />
                    ) : (
                        <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>{lead[key] || 'N/A'}</span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="container fade-in">
            <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h1 className="text-gradient" style={{ fontSize: '2.5rem' }}>Agent Portal</h1>
                <p style={{ color: 'var(--text-muted)' }}>Search and manage leads</p>
                {user && (
                    <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                        Logged in as: <strong>{user.first_name} {user.last_name}</strong>
                    </p>
                )}
            </header>

            {/* ── Search Bar ─────────────────────────────────────────────── */}
            <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto 2rem auto', padding: '1rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        className="glass-input"
                        placeholder="Enter Phone Number..."
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '0 1.5rem' }}>
                        <Search size={20} />
                    </button>
                </form>
            </div>

            {error && (
                <div style={{ textAlign: 'center', color: '#ff6b6b', marginBottom: '2rem' }}>
                    {error}
                </div>
            )}

            {/* ── Lead Card ──────────────────────────────────────────────── */}
            {lead && (
                <div className="glass-panel fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem' }}>

                    {/* Header row */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '2rem',
                        borderBottom: '1px solid var(--glass-border)',
                        paddingBottom: '1rem'
                    }}>
                        <div>
                            <h2 style={{ fontSize: '1.8rem' }}>{lead.first_name} {lead.last_name}</h2>
                            <span style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>ID: {lead.contact_id}</span>
                            <div style={{
                                marginTop: '0.5rem',
                                fontSize: '0.85rem',
                                color: lead.is_submitted ? '#4ecdc4' : '#ff6b6b',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                {lead.is_submitted
                                    ? <><CheckCircle size={14} /> Submitted & Locked</>
                                    : <><AlertCircle size={14} /> Pending Submission</>
                                }
                            </div>
                        </div>

                        {/* Edit / Save / Cancel controls */}
                        {!lead.is_submitted && (
                            !isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="btn-secondary flex-center gap-4"
                                >
                                    <Edit2 size={16} /> Edit
                                </button>
                            ) : (
                                <div className="flex-center gap-4">
                                    <button
                                        onClick={() => { setIsEditing(false); setEditForm(lead); }}
                                        className="btn-secondary"
                                        style={{ borderColor: '#ff6b6b', color: '#ff6b6b' }}
                                    >
                                        <X size={16} /> Cancel
                                    </button>
                                    <button onClick={handleUpdate} className="btn-primary flex-center gap-4">
                                        <Save size={16} /> Save Changes
                                    </button>
                                </div>
                            )
                        )}
                    </div>

                    {/* Fields grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                        {renderField('Phone Number (phone1)', 'phone', <Phone size={18} color="var(--text-muted)" />, false)}
                        {renderField('Contact ID', 'contact_id', <User size={18} color="var(--text-muted)" />, false)}
                        {renderField('First Name', 'first_name', <User size={18} color="var(--text-muted)" />)}
                        {renderField('Last Name', 'last_name', <User size={18} color="var(--text-muted)" />)}
                        {renderField('Title', 'title', <User size={18} color="var(--text-muted)" />)}
                        {renderField('Company', 'company', <Mail size={18} color="var(--text-muted)" />)}
                        {renderField('Street', 'street', <MapPin size={18} color="var(--text-muted)" />)}
                        {renderField('City', 'city', <MapPin size={18} color="var(--text-muted)" />)}
                        {renderField('State', 'state', <MapPin size={18} color="var(--text-muted)" />)}
                        {renderField('ZIP', 'zip', <MapPin size={18} color="var(--text-muted)" />)}
                        {renderField('Website', 'web_site', <Mail size={18} color="var(--text-muted)" />)}
                        {renderField('Annual Sales', 'annual_sales', <User size={18} color="var(--text-muted)" />)}
                        {renderField('Employee Count', 'employee_count', <User size={18} color="var(--text-muted)" />)}
                        {renderField('SIC Code', 'sic_code', <User size={18} color="var(--text-muted)" />)}
                        {renderField('Industry', 'industry', <User size={18} color="var(--text-muted)" />)}
                        {renderField('Recording', 'recording', <User size={18} color="var(--text-muted)" />)}
                    </div>

                    {/* ── Submit Result Banner ───────────────────────────── */}
                    {submitResult && (
                        <div style={{
                            marginBottom: '1.5rem',
                            padding: '1rem 1.25rem',
                            borderRadius: '10px',
                            background: submitResult.success
                                ? 'rgba(78, 205, 196, 0.12)'
                                : 'rgba(255, 107, 107, 0.12)',
                            border: `1px solid ${submitResult.success ? '#4ecdc4' : '#ff6b6b'}`,
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                        }}>
                            {submitResult.success
                                ? <CheckCircle size={20} color="#4ecdc4" style={{ flexShrink: 0, marginTop: '2px' }} />
                                : <AlertCircle size={20} color="#ff6b6b" style={{ flexShrink: 0, marginTop: '2px' }} />
                            }
                            <div>
                                <div style={{
                                    fontWeight: '600',
                                    color: submitResult.success ? '#4ecdc4' : '#ff6b6b',
                                    marginBottom: '4px'
                                }}>
                                    {submitResult.message}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {submitResult.detail}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Submit Footer ──────────────────────────────────── */}
                    <div style={{
                        paddingTop: '1.5rem',
                        borderTop: '1px solid var(--glass-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap',
                    }}>
                        {/* Status copy */}
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', flex: 1 }}>
                            {lead.is_submitted ? (
                                <span style={{ color: '#4ecdc4', fontWeight: '500' }}>
                                    ✓ This lead has been submitted to the sales team and is permanently locked.
                                </span>
                            ) : (
                                <>
                                    <div style={{ marginBottom: '4px' }}>
                                        Submitting will send this lead to the external API as <strong>Warm Transfer</strong>.
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                        Agent: {user ? `${user.first_name} ${user.last_name}` : '—'} &nbsp;·&nbsp; Disposition: <em>Warm Transfer</em>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Submit button — hidden if already submitted */}
                        {!lead.is_submitted && (
                            <button
                                id="submit-lead-btn"
                                onClick={handleSubmit}
                                disabled={isSubmitting || isEditing}
                                className="btn-primary"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: (isSubmitting || isEditing) ? 0.65 : 1,
                                    cursor: (isSubmitting || isEditing) ? 'not-allowed' : 'pointer',
                                    minWidth: '130px',
                                    justifyContent: 'center',
                                }}
                                title={isEditing ? 'Save your edits before submitting' : 'Submit this lead'}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                        Submitting…
                                    </>
                                ) : (
                                    <>
                                        <Lock size={16} /> Submit Lead
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Spinner keyframe */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default AgentDashboard;
