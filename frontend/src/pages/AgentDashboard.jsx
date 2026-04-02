import React, { useState, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
    Search, Edit2, Save, X, Phone, User, MapPin,
    Mail, Lock, CheckCircle, AlertCircle, Loader, PlusCircle, ChevronDown, ChevronUp, Copy
} from 'lucide-react';

/* ── blank manual form ────────────────────────────────────────────────────── */
const EMPTY_FORM = {
    phone: '', first_name: '', last_name: '', title: '',
    company: '', street: '', city: '', state: '', zip: '',
    web_site: '', annual_sales: '', employee_count: '',
    sic_code: '', industry: '', recording: '', contact_id: '',
};

/* ── small labelled input used in both forms ─────────────────────────────── */
const Field = ({ label, name, value, onChange, required = false, placeholder = '' }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{
            fontSize: '0.72rem', textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600,
        }}>
            {label}{required && <span style={{ color: '#ff6b6b', marginLeft: '3px' }}>*</span>}
        </label>
        <input
            className="glass-input"
            style={{ margin: 0, padding: '8px 12px', fontSize: '0.9rem' }}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder || label}
            required={required}
        />
    </div>
);

const AgentDashboard = () => {
    const { user } = useAuth();

    /* ── search state ──────────────────────────────────────────────────────── */
    const [searchPhone, setSearchPhone] = useState('');
    const [lead, setLead] = useState(null);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState(null);

    /* ── manual entry state ────────────────────────────────────────────────── */
    const [showManual, setShowManual] = useState(false);
    const [isSubLead, setIsSubLead] = useState(false);   // true when opened via 'Add Sub Lead'
    const [manualForm, setManualForm] = useState(EMPTY_FORM);
    const [manualError, setManualError] = useState('');
    const [manualSaving, setManualSaving] = useState(false);
    const manualFormRef = useRef(null);                  // used to scroll the form into view

    /* ── handlers ──────────────────────────────────────────────────────────── */
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
            setShowManual(false);
        } catch {
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
        } catch {
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
            if (status === 409) message = 'This lead is already submitted.';
            else if (status === 422) message = 'Missing required fields.';
            else if (status === 502) message = 'Could not reach the external API.';
            setSubmitResult({ success: false, message, detail });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleManualChange = (e) =>
        setManualForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleManualSave = async (e) => {
        e.preventDefault();
        setManualError('');
        setManualSaving(true);
        try {
            const res = await api.post('/leads/manual', manualForm);
            // Load the new lead into the card view
            setLead(res.data);
            setEditForm(res.data);
            setIsEditing(false);
            setSubmitResult(null);
            setManualForm(EMPTY_FORM);
            setShowManual(false);
            setIsSubLead(false);
            setError('');
        } catch (err) {
            setManualError(err.response?.data?.detail || 'Failed to save lead. Please check the phone number.');
        } finally {
            setManualSaving(false);
        }
    };

    const handleManualClear = () => {
        setManualForm(isSubLead
            ? { ...EMPTY_FORM, company: manualForm.company, street: manualForm.street, city: manualForm.city, state: manualForm.state, zip: manualForm.zip, web_site: manualForm.web_site, annual_sales: manualForm.annual_sales, employee_count: manualForm.employee_count, sic_code: manualForm.sic_code, industry: manualForm.industry, recording: manualForm.recording }
            : EMPTY_FORM
        );
        setManualError('');
    };

    /* Opens the manual form pre-filled with company/address from current lead,
       but with all Contact Info fields empty for the new person. */
    const handleAddSubLead = () => {
        setManualForm({
            // Contact Info — all empty for the agent to fill
            phone: '', first_name: '', last_name: '', title: '', contact_id: '',
            // Everything else inherited from the parent lead
            company:        lead.company        || '',
            street:         lead.street         || '',
            city:           lead.city           || '',
            state:          lead.state          || '',
            zip:            lead.zip            || '',
            web_site:       lead.web_site       || '',
            annual_sales:   lead.annual_sales   || '',
            employee_count: lead.employee_count || '',
            sic_code:       lead.sic_code       || '',
            industry:       lead.industry       || '',
            recording:      lead.recording      || '',
        });
        setManualError('');
        setIsSubLead(true);
        setShowManual(true);
        // Scroll to form after it renders
        setTimeout(() => manualFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    };

    /* ── renderField for the lead card (read/edit mode) ───────────────────── */
    const renderField = (label, key, icon, editable = true) => (
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

    /* ─────────────────────────────────────────────────────────────────────── */
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

            {/* ── Search Bar ──────────────────────────────────────────────── */}
            <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto 1.5rem auto', padding: '1rem' }}>
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
                <div style={{ textAlign: 'center', color: '#ff6b6b', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            {/* ── Manual Entry Toggle ──────────────────────────────────────── */}
            <div style={{ maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                <button
                    id="toggle-manual-entry"
                    onClick={() => { setShowManual(v => !v); setIsSubLead(false); setManualError(''); if (showManual) setManualForm(EMPTY_FORM); }}
                    style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '10px 0',
                        background: showManual
                            ? 'rgba(4,190,254,0.12)'
                            : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${showManual ? 'rgba(4,190,254,0.35)' : 'rgba(255,255,255,0.09)'}`,
                        borderRadius: '12px',
                        color: showManual ? 'hsl(var(--secondary))' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.88rem', fontWeight: 600,
                        transition: 'all 0.25s',
                    }}
                >
                    <PlusCircle size={16} />
                    Add Lead Manually
                    {showManual ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
            </div>

            {/* ── Manual Entry Form ────────────────────────────────────────── */}
            {showManual && (
                <div ref={manualFormRef} className="glass-panel fade-in" style={{ maxWidth: '800px', margin: '0 auto 2.5rem auto', padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <div>
                            <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>
                                {isSubLead ? <><Copy size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Add Sub Lead</> : 'Manual Lead Entry'}
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', margin: 0 }}>
                                {isSubLead
                                    ? <>Company &amp; address are pre-filled from the original lead. Fill in the new contact's details.</>  
                                    : 'Fill in the caller\'s information. Phone number is required.'}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowManual(false)}
                            style={{
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                color: 'var(--text-muted)', padding: '7px 8px', borderRadius: '8px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleManualSave}>
                        {/* Required fields row */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{
                                fontSize: '0.72rem', textTransform: 'uppercase',
                                letterSpacing: '0.06em', color: 'hsl(var(--secondary))',
                                fontWeight: 700, marginBottom: '0.75rem',
                            }}>
                                📞 Contact Info
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '0.8rem' }}>
                                <Field label="Phone" name="phone" value={manualForm.phone} onChange={handleManualChange} required placeholder="e.g. 3055551234" />
                                <Field label="First Name" name="first_name" value={manualForm.first_name} onChange={handleManualChange} required />
                                <Field label="Last Name" name="last_name" value={manualForm.last_name} onChange={handleManualChange} required />
                                <Field label="Title" name="title" value={manualForm.title} onChange={handleManualChange} />
                                <Field label="Company" name="company" value={manualForm.company} onChange={handleManualChange} required />
                                <Field label="Contact ID" name="contact_id" value={manualForm.contact_id} onChange={handleManualChange} />
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '1.25rem 0' }} />

                        {/* Address */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{
                                fontSize: '0.72rem', textTransform: 'uppercase',
                                letterSpacing: '0.06em', color: 'hsl(var(--secondary))',
                                fontWeight: 700, marginBottom: '0.75rem',
                            }}>
                                📍 Address
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: '0.8rem' }}>
                                <Field label="Street" name="street" value={manualForm.street} onChange={handleManualChange} required />
                                <Field label="City" name="city" value={manualForm.city} onChange={handleManualChange} required />
                                <Field label="State" name="state" value={manualForm.state} onChange={handleManualChange} required />
                                <Field label="ZIP" name="zip" value={manualForm.zip} onChange={handleManualChange} required />
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '1.25rem 0' }} />

                        {/* Optional business info */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{
                                fontSize: '0.72rem', textTransform: 'uppercase',
                                letterSpacing: '0.06em', color: 'hsl(var(--secondary))',
                                fontWeight: 700, marginBottom: '0.75rem',
                            }}>
                                💼 Business Info <span style={{ opacity: 0.6, fontWeight: 400, textTransform: 'none', fontSize: '0.7rem' }}>(optional)</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: '0.8rem' }}>
                                <Field label="Website" name="web_site" value={manualForm.web_site} onChange={handleManualChange} />
                                <Field label="Annual Sales" name="annual_sales" value={manualForm.annual_sales} onChange={handleManualChange} />
                                <Field label="Employee Count" name="employee_count" value={manualForm.employee_count} onChange={handleManualChange} />
                                <Field label="SIC Code" name="sic_code" value={manualForm.sic_code} onChange={handleManualChange} />
                                <Field label="Industry" name="industry" value={manualForm.industry} onChange={handleManualChange} />
                                <Field label="Recording" name="recording" value={manualForm.recording} onChange={handleManualChange} />
                            </div>
                        </div>

                        {/* Error banner */}
                        {manualError && (
                            <div style={{
                                marginBottom: '1.25rem', padding: '0.85rem 1.1rem',
                                background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b',
                                borderRadius: '10px', color: '#ff6b6b',
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem',
                            }}>
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                {manualError}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={handleManualClear}
                                className="btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <X size={15} /> Clear
                            </button>
                            <button
                                type="submit"
                                disabled={manualSaving}
                                className="btn-primary"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    opacity: manualSaving ? 0.7 : 1,
                                    cursor: manualSaving ? 'not-allowed' : 'pointer',
                                    minWidth: '140px', justifyContent: 'center',
                                }}
                            >
                                {manualSaving
                                    ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                                    : <><Save size={15} /> Save &amp; Load Lead</>
                                }
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Lead Card ───────────────────────────────────────────────── */}
            {lead && (
                <div className="glass-panel fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem' }}>

                    {/* Header row */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem',
                    }}>
                        <div>
                            <h2 style={{ fontSize: '1.8rem' }}>{lead.first_name} {lead.last_name}</h2>
                            <span style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>ID: {lead.contact_id || '—'}</span>
                            <div style={{
                                marginTop: '0.5rem', fontSize: '0.85rem',
                                color: lead.is_submitted ? '#4ecdc4' : '#ff6b6b',
                                display: 'flex', alignItems: 'center', gap: '6px',
                            }}>
                                {lead.is_submitted
                                    ? <><CheckCircle size={14} /> Submitted &amp; Locked</>
                                    : <><AlertCircle size={14} /> Pending Submission</>}
                            </div>
                        </div>

                        {/* Edit / Save / Cancel + Add Sub Lead controls */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Add Sub Lead — always shown when a lead is loaded */}
                            <button
                                id="add-sub-lead-btn"
                                onClick={handleAddSubLead}
                                title="Create a new lead using this company's info"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '7px 14px', borderRadius: '10px',
                                    background: 'rgba(120,80,255,0.1)',
                                    border: '1px solid rgba(120,80,255,0.35)',
                                    color: 'hsl(var(--primary))',
                                    cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600,
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(120,80,255,0.22)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(120,80,255,0.25)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(120,80,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <Copy size={15} /> Add Sub Lead
                            </button>

                            {/* Edit / Save / Cancel — only for non-submitted leads */}
                            {!lead.is_submitted && (
                                !isEditing ? (
                                    <button onClick={() => setIsEditing(true)} className="btn-secondary flex-center gap-4">
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
                            marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '10px',
                            background: submitResult.success ? 'rgba(78,205,196,0.12)' : 'rgba(255,107,107,0.12)',
                            border: `1px solid ${submitResult.success ? '#4ecdc4' : '#ff6b6b'}`,
                            display: 'flex', gap: '12px', alignItems: 'flex-start',
                        }}>
                            {submitResult.success
                                ? <CheckCircle size={20} color="#4ecdc4" style={{ flexShrink: 0, marginTop: '2px' }} />
                                : <AlertCircle size={20} color="#ff6b6b" style={{ flexShrink: 0, marginTop: '2px' }} />}
                            <div>
                                <div style={{ fontWeight: '600', color: submitResult.success ? '#4ecdc4' : '#ff6b6b', marginBottom: '4px' }}>
                                    {submitResult.message}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{submitResult.detail}</div>
                            </div>
                        </div>
                    )}

                    {/* ── Submit Footer ──────────────────────────────────── */}
                    <div style={{
                        paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        gap: '1rem', flexWrap: 'wrap',
                    }}>
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

                        {!lead.is_submitted && (
                            <button
                                id="submit-lead-btn"
                                onClick={handleSubmit}
                                disabled={isSubmitting || isEditing}
                                className="btn-primary"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    opacity: (isSubmitting || isEditing) ? 0.65 : 1,
                                    cursor: (isSubmitting || isEditing) ? 'not-allowed' : 'pointer',
                                    minWidth: '130px', justifyContent: 'center',
                                }}
                                title={isEditing ? 'Save your edits before submitting' : 'Submit this lead'}
                            >
                                {isSubmitting
                                    ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                                    : <><Lock size={16} /> Submit Lead</>
                                }
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
