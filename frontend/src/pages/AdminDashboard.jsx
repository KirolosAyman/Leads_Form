import React, { useState } from 'react';
import api from '../api';
import { Upload, UserPlus, CheckCircle, AlertCircle, Trash2, X, Eye, ExternalLink } from 'lucide-react';

/* ─── shared modal & table styles ─────────────────────────────────────────── */
const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.8)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, backdropFilter: 'blur(6px)',
};
const modalBase = {
    background: 'linear-gradient(135deg, #0d0d1e 0%, #0a0a16 100%)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '18px', padding: '2rem',
    width: '90%', maxHeight: '88vh',
    overflowY: 'auto',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
};
const closeBtnStyle = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'var(--text-muted)', padding: '7px 8px', borderRadius: '8px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
};
const thStyle = {
    padding: '13px 16px', textAlign: 'left',
    fontWeight: 700, color: 'hsl(var(--secondary))',
    whiteSpace: 'nowrap', fontSize: '0.82rem', letterSpacing: '0.05em',
    textTransform: 'uppercase',
};
const tdStyle = { padding: '13px 16px', verticalAlign: 'middle', fontSize: '0.88rem' };

/* ─── helper to rebuild the payload that was sent to the external API ──────── */
const buildPayload = (details) => {
    if (!details) return null;
    return {
        title:          details.title          || '',
        first_name:     details.first_name     || '',
        last_name:      details.last_name      || '',
        company:        details.company        || '',
        phone1:         details.phone1 || details.phone || '',
        street:         details.street         || '',
        city:           details.city           || '',
        state:          details.state          || '',
        zip:            details.zip            || '',
        web_site:       details.web_site       || '',
        annual_sales:   details.annual_sales   || '',
        employee_count: details.employee_count || '',
        industry:       details.industry       || '',
        sic_code:       details.sic_code       || '',
        disposition:    details.disposition    || 'Warm Transfer',
        agent_name:     details.agent_name     || '',
    };
};

/* ────────────────────────────────────────────────────────────────────────── */
const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('upload');

    // Upload
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(null);

    // User creation
    const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '', password: '' });
    const [passwordMode, setPasswordMode] = useState('generate');
    const [createdUser, setCreatedUser] = useState(null);

    // Agents
    const [agents, setAgents] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(false);

    // Reset password modal
    const [resetPasswordModal, setResetPasswordModal] = useState(null);
    const [resetPasswordMode, setResetPasswordMode] = useState('generate');
    const [resetPasswordInput, setResetPasswordInput] = useState('');
    const [resetPasswordResult, setResetPasswordResult] = useState(null);

    // Leads
    const [leads, setLeads] = useState([]);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState(new Set());

    // Submissions
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    // Submissions modals
    const [leadModal, setLeadModal] = useState(null);   // null | 'loading' | lead object
    const [apiModal, setApiModal]   = useState(null);   // null | submission object

    /* ── data fetchers ───────────────────────────────────────────────────── */
    const handleFileChange = (e) => { setFile(e.target.files[0]); setUploadStatus(null); };

    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/leads/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setUploadStatus({ type: 'success', data: res.data });
        } catch (err) {
            setUploadStatus({ type: 'error', message: err.response?.data?.detail || 'Upload failed' });
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                first_name: newUser.first_name, last_name: newUser.last_name,
                email: newUser.email,
                password: passwordMode === 'manual' ? newUser.password : null
            };
            const res = await api.post('/users/agent/with-password', payload);
            setCreatedUser(res.data);
            setNewUser({ first_name: '', last_name: '', email: '', password: '' });
            setPasswordMode('generate');
            if (activeTab === 'agents') fetchAgents();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to create user');
        }
    };

    const fetchAgents = async () => {
        setLoadingAgents(true);
        try { const res = await api.get('/users'); setAgents(res.data || []); }
        catch { alert('Failed to load agents'); }
        finally { setLoadingAgents(false); }
    };

    const openResetPasswordModal = (agent) => {
        setResetPasswordModal({ userId: agent.id, user: agent });
        setResetPasswordMode('generate');
        setResetPasswordInput('');
        setResetPasswordResult(null);
    };

    const handleResetPassword = async () => {
        if (!resetPasswordModal) return;
        if (resetPasswordMode === 'manual' && !resetPasswordInput) { alert('Please enter a password'); return; }
        try {
            const res = await api.post(`/users/${resetPasswordModal.userId}/reset-password`, {
                password: resetPasswordMode === 'manual' ? resetPasswordInput : null
            });
            setResetPasswordResult(res.data);
            fetchAgents();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to reset password');
            setResetPasswordModal(null);
        }
    };

    const closeResetPasswordModal = () => { setResetPasswordModal(null); setResetPasswordInput(''); setResetPasswordResult(null); };

    const deleteAgent = async (agentId, agentEmail) => {
        if (!window.confirm(`Delete agent ${agentEmail}? This cannot be undone.`)) return;
        try { await api.delete(`/users/${agentId}`); alert(`Agent ${agentEmail} deleted.`); fetchAgents(); }
        catch (err) { alert(err.response?.data?.detail || 'Failed to delete agent'); }
    };

    const fetchLeads = async () => {
        setLoadingLeads(true);
        try { const res = await api.get('/leads'); setLeads(res.data || []); setSelectedLeads(new Set()); }
        catch { alert('Failed to load leads'); }
        finally { setLoadingLeads(false); }
    };

    const exportLeads = async (format) => {
        try {
            const res = await api.get(`/leads/export?format=${format}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', format === 'xlsx' ? 'leads.xlsx' : 'leads.csv');
            document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
        } catch { alert('Failed to export leads'); }
    };

    const fetchSubmissions = async () => {
        setLoadingSubmissions(true);
        try { const res = await api.get('/leads/submissions'); setSubmissions(res.data || []); }
        catch { alert('Failed to load submissions'); }
        finally { setLoadingSubmissions(false); }
    };

    const exportSubmissions = async (format) => {
        try {
            const res = await api.get(`/leads/submissions/export?format=${format}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', format === 'xlsx' ? 'submissions.xlsx' : 'submissions.csv');
            document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
        } catch { alert('Failed to export submissions'); }
    };

    const fetchLeadById = async (leadId) => {
        setLeadModal('loading');
        try {
            const res = await api.get(`/leads/${leadId}`);
            setLeadModal(res.data);
        } catch {
            setLeadModal(null);
            alert('Failed to load lead details.');
        }
    };

    const toggleSelectLead = (id) => {
        const next = new Set(selectedLeads);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedLeads(next);
    };

    const deleteSelectedLeads = async () => {
        if (selectedLeads.size === 0) { alert('No leads selected'); return; }
        if (!window.confirm(`Delete ${selectedLeads.size} selected leads? This cannot be undone.`)) return;
        try {
            const res = await api.post('/leads/delete', { ids: Array.from(selectedLeads) });
            alert(`Deleted ${res.data.deleted} leads.`); fetchLeads();
        } catch { alert('Failed to delete leads'); }
    };

    const agentsList = agents.filter(a => a.role !== 'admin');

    /* ── helpers ───────────────────────────────────────────────────────────── */
    const FieldRow = ({ label, value }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: '0.92rem', fontWeight: 500, color: value ? 'var(--text-main)' : 'var(--text-muted)' }}>{value || 'N/A'}</span>
        </div>
    );

    /* ─────────────────────────────────────────────────────────────────────── */
    return (
        <div className="container fade-in">
            {/* ── Header nav ─────────────────────────────────────────────── */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 className="text-gradient" style={{ fontSize: '2.5rem' }}>Admin Dashboard</h1>
                <div className="flex-center gap-4" style={{ flexWrap: 'wrap' }}>
                    {[['upload','Upload CSV'],['users','Create Agent'],['agents','View Agents'],['leads','View Leads'],['submissions','Submission Reports']].map(([tab, label]) => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); if (tab === 'agents') fetchAgents(); if (tab === 'leads') fetchLeads(); if (tab === 'submissions') fetchSubmissions(); }}
                            className={activeTab === tab ? 'btn-primary' : 'btn-secondary'}
                        >{label}</button>
                    ))}
                </div>
            </header>

            {/* ── Upload tab ─────────────────────────────────────────────── */}
            {activeTab === 'upload' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Upload size={24} color="hsl(var(--secondary))" /> Upload Leads CSV
                    </h2>
                    <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '12px', padding: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
                        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} id="csv-upload" />
                        <label htmlFor="csv-upload" className="btn-secondary" style={{ display: 'inline-block', marginBottom: '1rem' }}>Select File (CSV or Excel)</label>
                        {file && <p style={{ color: 'var(--text-muted)' }}>Selected: {file.name}</p>}
                    </div>
                    <button onClick={handleUpload} disabled={!file} className="btn-primary w-full" style={{ opacity: !file ? 0.5 : 1 }}>Process Upload</button>
                    {uploadStatus?.type === 'success' && (
                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0,255,100,0.1)', borderRadius: '8px' }}>
                            <h3 style={{ color: 'hsl(var(--success))', display: 'flex', alignItems: 'center', gap: '10px' }}><CheckCircle size={20} /> Upload Successful</h3>
                            <p>Processed: {uploadStatus.data.success_count} records</p>
                            
                            {uploadStatus.data.skipped_count > 0 && (
                                <div style={{ marginTop: '0.5rem', color: 'hsl(var(--warning))' }}>
                                    <strong>{uploadStatus.data.skipped_count} rows skipped.</strong>
                                    {uploadStatus.data.skipped && uploadStatus.data.skipped.length > 0 && (
                                        <ul style={{ margin: '5px 0 0 20px', fontSize: '0.85rem' }}>
                                            {uploadStatus.data.skipped.map((msg, i) => <li key={i}>{msg}</li>)}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {uploadStatus.data.duplicate_count > 0 && (
                                <div style={{ marginTop: '0.5rem', color: 'hsl(var(--error))' }}>
                                    <strong>{uploadStatus.data.duplicate_count} duplicates skipped.</strong>
                                    {uploadStatus.data.duplicates && uploadStatus.data.duplicates.length > 0 && (
                                        <ul style={{ margin: '5px 0 0 20px', fontSize: '0.85rem' }}>
                                            {uploadStatus.data.duplicates.map((msg, i) => <li key={i}>{msg}</li>)}
                                        </ul>
                                    )}
                                </div>
                            )}
                            
                            {uploadStatus.data.error_count > 0 && (
                                <div style={{ marginTop: '0.5rem', color: 'hsl(var(--error))' }}>
                                    <strong>{uploadStatus.data.error_count} rows had errors.</strong>
                                    {uploadStatus.data.errors && uploadStatus.data.errors.length > 0 && (
                                        <ul style={{ margin: '5px 0 0 20px', fontSize: '0.85rem' }}>
                                            {uploadStatus.data.errors.map((msg, i) => <li key={i}>{msg}</li>)}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {uploadStatus?.type === 'error' && (
                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,50,50,0.1)', borderRadius: '8px', color: '#ff6b6b' }}>
                            <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }} />{uploadStatus.message}
                        </div>
                    )}
                </div>
            )}

            {/* ── Create Agent tab ────────────────────────────────────────── */}
            {activeTab === 'users' && (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <UserPlus size={24} color="hsl(var(--secondary))" /> Create New Agent
                    </h2>
                    <form onSubmit={handleCreateUser}>
                        <div className="mb-4"><input className="glass-input" placeholder="First Name" value={newUser.first_name} onChange={e => setNewUser({ ...newUser, first_name: e.target.value })} required /></div>
                        <div className="mb-4"><input className="glass-input" placeholder="Last Name" value={newUser.last_name} onChange={e => setNewUser({ ...newUser, last_name: e.target.value })} required /></div>
                        <div className="mb-4"><input type="email" className="glass-input" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required /></div>
                        <div className="mb-4">
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password Option:</label>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><input type="radio" name="password-mode" value="generate" checked={passwordMode === 'generate'} onChange={() => setPasswordMode('generate')} /> Generate Password</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><input type="radio" name="password-mode" value="manual" checked={passwordMode === 'manual'} onChange={() => setPasswordMode('manual')} /> Enter Password</label>
                            </div>
                            {passwordMode === 'manual' && <input type="password" className="glass-input" placeholder="Enter password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />}
                        </div>
                        <button type="submit" className="btn-primary w-full">Create Agent</button>
                    </form>
                    {createdUser && (
                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', border: '1px solid hsl(var(--success))' }}>
                            <h3 style={{ color: 'hsl(var(--success))', marginBottom: '0.5rem' }}>Agent Created!</h3>
                            <p><strong>Email:</strong> {createdUser.user.email}</p>
                            <p><strong>Password:</strong> {createdUser.generated_password}</p>
                            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}><AlertCircle size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} />Save this password immediately. It will not be shown again.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Agents tab ─────────────────────────────────────────────── */}
            {activeTab === 'agents' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h2>Agents</h2>
                    {loadingAgents ? <p>Loading...</p> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                                <thead>
                                    <tr>
                                        {['Name','Email','Role','Created','Actions'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {agentsList.length === 0 ? (
                                        <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No agents found</td></tr>
                                    ) : agentsList.map(a => (
                                        <tr key={a.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <td style={{ padding: '0.75rem' }}>{a.first_name} {a.last_name}</td>
                                            <td style={{ padding: '0.75rem' }}>{a.email}</td>
                                            <td style={{ padding: '0.75rem' }}>{a.role}</td>
                                            <td style={{ padding: '0.75rem' }}>{new Date(a.created_at).toLocaleString()}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <button className="btn-secondary" onClick={() => openResetPasswordModal(a)} style={{ marginRight: '0.5rem' }}>Reset Password</button>
                                                <button className="btn-secondary" onClick={() => deleteAgent(a.id, a.email)} style={{ color: 'hsl(var(--error))', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Trash2 size={16} /> Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Reset Password Modal ─────────────────────────────────────── */}
            {resetPasswordModal && (
                <div style={overlayStyle}>
                    <div style={{ ...modalBase, maxWidth: '500px' }}>
                        {!resetPasswordResult ? (
                            <>
                                <h3 style={{ marginBottom: '1rem' }}>Reset Password for {resetPasswordModal.user.email}</h3>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password Option:</label>
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><input type="radio" name="reset-password-mode" value="generate" checked={resetPasswordMode === 'generate'} onChange={() => setResetPasswordMode('generate')} /> Generate Password</label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><input type="radio" name="reset-password-mode" value="manual" checked={resetPasswordMode === 'manual'} onChange={() => setResetPasswordMode('manual')} /> Enter Password</label>
                                    </div>
                                    {resetPasswordMode === 'manual' && <input type="password" className="glass-input" placeholder="Enter new password" value={resetPasswordInput} onChange={e => setResetPasswordInput(e.target.value)} />}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                    <button className="btn-secondary" onClick={closeResetPasswordModal}>Cancel</button>
                                    <button className="btn-primary" onClick={handleResetPassword}>Reset Password</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ color: 'hsl(var(--success))', marginBottom: '1rem' }}>Password Reset Successful!</h3>
                                <p><strong>Email:</strong> {resetPasswordResult.email}</p>
                                <p><strong>New Password:</strong> {resetPasswordResult.new_password}</p>
                                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}><AlertCircle size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} />Save this password immediately.</p>
                                <button className="btn-primary w-full" onClick={closeResetPasswordModal} style={{ marginTop: '1.5rem' }}>Close</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Leads tab ──────────────────────────────────────────────── */}
            {activeTab === 'leads' && (
                <div style={{ display: 'flex', flexDirection: 'column', padding: '2rem', gap: '1rem' }}>
                    <h2>Leads</h2>
                    <div>
                        <button className="btn-primary" onClick={() => exportLeads('csv')}>Export CSV</button>
                        <button className="btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={() => exportLeads('xlsx')}>Export Excel</button>
                        <button className="btn-primary" style={{ marginLeft: '1rem' }} onClick={fetchLeads}>Refresh</button>
                        <button className="btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={deleteSelectedLeads}>Delete Selected</button>
                    </div>
                    {loadingLeads ? <p>Loading...</p> : (
                        <div className="table-wrapper">
                            <table className="table-compact">
                                <thead>
                                    <tr>
                                        <th></th>
                                        {['ID','Contact ID','Name','Phone','Company','Title','Street','City','State','ZIP','SIC','Recording','Submitted','Created'].map(h => <th key={h}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map(l => (
                                        <tr key={l.id}>
                                            <td style={{ textAlign: 'center' }}><input type="checkbox" checked={selectedLeads.has(l.id)} onChange={() => toggleSelectLead(l.id)} /></td>
                                            <td>{l.id}</td>
                                            <td>{l.contact_id}</td>
                                            <td>{l.first_name} {l.last_name}</td>
                                            <td>{l.phone}</td>
                                            <td>{l.company}</td>
                                            <td>{l.title}</td>
                                            <td>{l.street}</td>
                                            <td>{l.city}</td>
                                            <td>{l.state}</td>
                                            <td>{l.zip}</td>
                                            <td>{l.sic_code}</td>
                                            <td>{l.recording}</td>
                                            <td>{l.is_submitted ? '✓ Yes' : 'No'}</td>
                                            <td>{new Date(l.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Submissions tab ─────────────────────────────────────────── */}
            {activeTab === 'submissions' && (
                <div style={{ display: 'flex', flexDirection: 'column', padding: '2rem', gap: '1.5rem' }}>
                    {/* Toolbar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <h2 style={{ margin: 0 }}>Submission Reports</h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-primary" onClick={fetchSubmissions}>Refresh</button>
                            <button className="btn-secondary" onClick={() => exportSubmissions('csv')}>Export CSV</button>
                            <button className="btn-secondary" onClick={() => exportSubmissions('xlsx')}>Export Excel</button>
                        </div>
                    </div>

                    {loadingSubmissions ? <p style={{ color: 'var(--text-muted)' }}>Loading…</p> : (
                        <div className="table-wrapper">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '2px solid var(--glass-border)' }}>
                                        <th style={thStyle}>Lead ID</th>
                                        <th style={thStyle}>Lead Contact</th>
                                        <th style={thStyle}>Lead Phone</th>
                                        <th style={thStyle}>Submitted By</th>
                                        <th style={thStyle}>Submitted At</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>API Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                No submissions yet.
                                            </td>
                                        </tr>
                                    )}
                                    {submissions.map(s => {
                                        const phone = s.lead_phone || s.details?.phone1 || s.details?.phone || '—';
                                        const agentName = s.details?.agent_name ||
                                            (s.details?.submitted_by
                                                ? `${s.details.submitted_by.first_name ?? ''} ${s.details.submitted_by.last_name ?? ''}`.trim()
                                                : '—');
                                        const agentEmail = s.details?.submitted_by?.email || '—';
                                        return (
                                            <tr key={s.id}
                                                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {/* Lead ID */}
                                                <td style={{ ...tdStyle, fontWeight: 600, color: 'hsl(var(--secondary))' }}>
                                                    #{s.lead_id}
                                                </td>

                                                {/* Lead Contact — clickable chip */}
                                                <td style={tdStyle}>
                                                    <button
                                                        id={`lead-contact-${s.id}`}
                                                        onClick={() => fetchLeadById(s.lead_id)}
                                                        title="Click to view full lead details"
                                                        style={{
                                                            background: 'rgba(4, 190, 254, 0.1)',
                                                            border: '1px solid rgba(4, 190, 254, 0.3)',
                                                            color: 'hsl(var(--secondary))',
                                                            padding: '5px 13px', borderRadius: '20px',
                                                            cursor: 'pointer', fontSize: '0.83rem',
                                                            fontFamily: 'Outfit, sans-serif', fontWeight: 600,
                                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                            transition: 'all 0.2s',
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(4,190,254,0.22)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(4,190,254,0.25)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(4,190,254,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                                                    >
                                                        {s.details?.contact_id || `Lead ${s.lead_id}`}
                                                        <ExternalLink size={11} />
                                                    </button>
                                                </td>

                                                {/* Lead Phone */}
                                                <td style={{ ...tdStyle, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                                                    {phone}
                                                </td>

                                                {/* Submitted By */}
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: 500 }}>{agentName}</div>
                                                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>{agentEmail}</div>
                                                </td>

                                                {/* Submitted At */}
                                                <td style={{ ...tdStyle, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.83rem' }}>
                                                    {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}
                                                </td>

                                                {/* API Data button */}
                                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                    <button
                                                        id={`api-data-${s.id}`}
                                                        onClick={() => setApiModal(s)}
                                                        title="View what was sent to the API"
                                                        style={{
                                                            background: 'rgba(120,80,255,0.1)',
                                                            border: '1px solid rgba(120,80,255,0.3)',
                                                            color: 'hsl(var(--primary))',
                                                            padding: '6px 12px', borderRadius: '8px',
                                                            cursor: 'pointer', fontSize: '0.8rem',
                                                            fontFamily: 'Outfit, sans-serif',
                                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                            transition: 'all 0.2s',
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(120,80,255,0.22)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(120,80,255,0.25)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(120,80,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                                                    >
                                                        <Eye size={14} /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* MODAL — Lead Details                                         */}
            {/* ════════════════════════════════════════════════════════════ */}
            {leadModal && (
                <div style={overlayStyle} onClick={() => setLeadModal(null)}>
                    <div style={{ ...modalBase, maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
                        {leadModal === 'loading' ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading lead…</div>
                        ) : (
                            <>
                                {/* Modal header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>
                                            {leadModal.first_name} {leadModal.last_name}
                                        </h3>
                                        <span style={{ color: 'hsl(var(--secondary))', fontSize: '0.85rem' }}>Contact ID: {leadModal.contact_id}</span>
                                        <span style={{ marginLeft: '1rem', fontSize: '0.82rem', padding: '3px 10px', borderRadius: '12px', background: leadModal.is_submitted ? 'rgba(78,205,196,0.15)' : 'rgba(255,107,107,0.15)', color: leadModal.is_submitted ? '#4ecdc4' : '#ff6b6b' }}>
                                            {leadModal.is_submitted ? '✓ Submitted' : 'Pending'}
                                        </span>
                                    </div>
                                    <button style={closeBtnStyle} onClick={() => setLeadModal(null)}><X size={18} /></button>
                                </div>

                                {/* Fields grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <FieldRow label="Phone (phone1)" value={leadModal.phone} />
                                    <FieldRow label="Title"          value={leadModal.title} />
                                    <FieldRow label="Company"        value={leadModal.company} />
                                    <FieldRow label="SIC Code"       value={leadModal.sic_code} />
                                    <FieldRow label="Street"         value={leadModal.street} />
                                    <FieldRow label="City"           value={leadModal.city} />
                                    <FieldRow label="State"          value={leadModal.state} />
                                    <FieldRow label="ZIP"            value={leadModal.zip} />
                                    <FieldRow label="Industry"       value={leadModal.industry} />
                                    <FieldRow label="Website"        value={leadModal.web_site} />
                                    <FieldRow label="Annual Sales"   value={leadModal.annual_sales} />
                                    <FieldRow label="Employee Count" value={leadModal.employee_count} />
                                    <FieldRow label="Recording"      value={leadModal.recording} />
                                    <FieldRow label="Created At"     value={new Date(leadModal.created_at).toLocaleString()} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* MODAL — API Data                                             */}
            {/* ════════════════════════════════════════════════════════════ */}
            {apiModal && (() => {
                const payload = buildPayload(apiModal.details);
                let parsedResponse = null;
                try { parsedResponse = JSON.parse(apiModal.api_response); } catch { parsedResponse = null; }

                return (
                    <div style={overlayStyle} onClick={() => setApiModal(null)}>
                        <div style={{ ...modalBase, maxWidth: '750px' }} onClick={e => e.stopPropagation()}>

                            {/* Modal header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>API Submission Data</h3>
                                    {apiModal.api_status_code ? (
                                        <span style={{ fontSize: '0.82rem', padding: '3px 12px', borderRadius: '12px', background: apiModal.api_status_code < 300 ? 'rgba(78,205,196,0.15)' : 'rgba(255,107,107,0.15)', color: apiModal.api_status_code < 300 ? '#4ecdc4' : '#ff6b6b', fontWeight: 600 }}>
                                            HTTP {apiModal.api_status_code}
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Legacy record — no API call made</span>
                                    )}
                                </div>
                                <button style={closeBtnStyle} onClick={() => setApiModal(null)}><X size={18} /></button>
                            </div>

                            {payload ? (
                                <>
                                    {/* Payload section */}
                                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--secondary))', marginBottom: '10px' }}>
                                        📤 Payload Sent (application/x-www-form-urlencoded)
                                    </h4>
                                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: '1.5rem' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <tbody>
                                                {Object.entries(payload).map(([key, val]) => (
                                                    <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '8px 14px', color: 'hsl(var(--secondary))', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap', width: '38%' }}>{key}</td>
                                                        <td style={{ padding: '8px 14px', color: val ? 'var(--text-main)' : 'var(--text-muted)', fontFamily: 'monospace' }}>{val || <em style={{ opacity: 0.5 }}>empty</em>}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* API Response section */}
                                    {apiModal.api_response ? (
                                        <>
                                            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--secondary))', marginBottom: '10px' }}>
                                                📥 API Response
                                            </h4>
                                            <pre style={{
                                                background: 'rgba(0,0,0,0.35)', borderRadius: '10px',
                                                border: '1px solid rgba(255,255,255,0.07)',
                                                padding: '14px', fontSize: '0.78rem', overflowX: 'auto',
                                                maxHeight: '260px', overflowY: 'auto',
                                                color: '#a8dadc', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-all',
                                            }}>
                                                {parsedResponse
                                                    ? JSON.stringify(parsedResponse, null, 2)
                                                    : apiModal.api_response}
                                            </pre>
                                        </>
                                    ) : (
                                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center' }}>
                                            No API response recorded for this submission.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No payload data available for this record.
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

        </div>
    );
};

export default AdminDashboard;
