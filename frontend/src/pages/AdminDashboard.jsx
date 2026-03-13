import React, { useState } from 'react';
import api from '../api';
import { Upload, UserPlus, CheckCircle, AlertCircle, FileText, Trash2 } from 'lucide-react';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'users', 'agents', 'leads'

    // Upload State
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(null);

    // User Creation State
    const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '', password: '' });
    const [passwordMode, setPasswordMode] = useState('generate'); // 'generate' or 'manual'
    const [createdUser, setCreatedUser] = useState(null);
    const [agents, setAgents] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState(new Set());
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    // Reset Password State
    const [resetPasswordModal, setResetPasswordModal] = useState(null); // { userId, user } or null
    const [resetPasswordMode, setResetPasswordMode] = useState('generate');
    const [resetPasswordInput, setResetPasswordInput] = useState('');
    const [resetPasswordResult, setResetPasswordResult] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setUploadStatus(null);
    };

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/leads/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadStatus({ type: 'success', data: res.data });
        } catch (err) {
            setUploadStatus({ type: 'error', message: err.response?.data?.detail || 'Upload failed' });
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email: newUser.email,
                password: passwordMode === 'manual' ? newUser.password : null
            };
            const res = await api.post('/users/agent/with-password', payload);
            setCreatedUser(res.data);
            setNewUser({ first_name: '', last_name: '', email: '', password: '' });
            setPasswordMode('generate');
            // Refresh agents list if visible
            if (activeTab === 'agents') fetchAgents();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to create user');
        }
    };

    const fetchAgents = async () => {
        setLoadingAgents(true);
        try {
            const res = await api.get('/users');
            setAgents(res.data || []);
        } catch (err) {
            alert('Failed to load agents');
        } finally {
            setLoadingAgents(false);
        }
    };

    const openResetPasswordModal = (agent) => {
        setResetPasswordModal({ userId: agent.id, user: agent });
        setResetPasswordMode('generate');
        setResetPasswordInput('');
        setResetPasswordResult(null);
    };

    const handleResetPassword = async () => {
        if (!resetPasswordModal) return;
        if (resetPasswordMode === 'manual' && !resetPasswordInput) {
            alert('Please enter a password');
            return;
        }

        try {
            const payload = {
                password: resetPasswordMode === 'manual' ? resetPasswordInput : null
            };
            const res = await api.post(`/users/${resetPasswordModal.userId}/reset-password`, payload);
            setResetPasswordResult(res.data);
            fetchAgents();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to reset password');
            setResetPasswordModal(null);
        }
    };

    const closeResetPasswordModal = () => {
        setResetPasswordModal(null);
        setResetPasswordInput('');
        setResetPasswordResult(null);
    };

    const deleteAgent = async (agentId, agentEmail) => {
        if (!window.confirm(`Delete agent ${agentEmail}? This cannot be undone.`)) return;
        try {
            await api.delete(`/users/${agentId}`);
            alert(`Agent ${agentEmail} deleted successfully`);
            fetchAgents();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to delete agent');
        }
    };

    const fetchLeads = async () => {
        setLoadingLeads(true);
        try {
            const res = await api.get('/leads');
            setLeads(res.data || []);
            setSelectedLeads(new Set());
        } catch (err) {
            alert('Failed to load leads');
        } finally {
            setLoadingLeads(false);
        }
    };

    const exportLeads = async (format) => {
        try {
            const res = await api.get(`/leads/export?format=${format}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', format === 'xlsx' ? 'leads.xlsx' : 'leads.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            alert('Failed to export leads');
        }
    };

    const fetchSubmissions = async () => {
        setLoadingSubmissions(true);
        try {
            const res = await api.get('/leads/submissions');
            setSubmissions(res.data || []);
        } catch (err) {
            alert('Failed to load submissions');
        } finally {
            setLoadingSubmissions(false);
        }
    };

    const exportSubmissions = async (format) => {
        try {
            const res = await api.get(`/leads/submissions/export?format=${format}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', format === 'xlsx' ? 'submissions.xlsx' : 'submissions.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            alert('Failed to export submissions');
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
            const ids = Array.from(selectedLeads);
            const res = await api.post('/leads/delete', { ids });
            alert(`Deleted ${res.data.deleted} leads.`);
            fetchLeads();
        } catch (err) {
            alert('Failed to delete leads');
        }
    };

    // Filter out admin accounts
    const agentsList = agents.filter(a => a.role !== 'admin');

    return (
        <div className="container fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <h1 className="text-gradient" style={{ fontSize: '2.5rem' }}>Admin Dashboard</h1>
                <div className="flex-center gap-4">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}
                    >
                        Upload CSV
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}
                    >
                        Create Agent
                    </button>
                    <button
                        onClick={() => { setActiveTab('agents'); fetchAgents(); }}
                        className={activeTab === 'agents' ? 'btn-primary' : 'btn-secondary'}
                    >
                        View Agents
                    </button>
                    <button
                        onClick={() => { setActiveTab('leads'); fetchLeads(); }}
                        className={activeTab === 'leads' ? 'btn-primary' : 'btn-secondary'}
                    >
                        View Leads
                    </button>
                    <button
                        onClick={() => { setActiveTab('submissions'); fetchSubmissions(); }}
                        className={activeTab === 'submissions' ? 'btn-primary' : 'btn-secondary'}
                    >
                        Submissions Reports
                    </button>
                </div>
            </header>

            {activeTab === 'upload' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Upload size={24} color="hsl(var(--secondary))" />
                        Upload Leads CSV
                    </h2>

                    <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '12px', padding: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            id="csv-upload"
                        />
                        <label htmlFor="csv-upload" className="btn-secondary" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                            Select File (CSV or Excel)
                        </label>
                        {file && <p style={{ color: 'var(--text-muted)' }}>Selected: {file.name}</p>}
                    </div>

                    <button onClick={handleUpload} disabled={!file} className="btn-primary w-full" style={{ opacity: !file ? 0.5 : 1 }}>
                        Process Upload
                    </button>

                    {uploadStatus && uploadStatus.type === 'success' && (
                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0, 255, 100, 0.1)', borderRadius: '8px' }}>
                            <h3 style={{ color: 'hsl(var(--success))', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CheckCircle size={20} /> Upload Successful
                            </h3>
                            <p>Processed: {uploadStatus.data.success_count} records</p>
                            {uploadStatus.data.errors && uploadStatus.data.errors.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <strong>Errors:</strong>
                                    <ul style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                        {uploadStatus.data.errors.map((e, i) => <li key={i}>{e}</li>)}
                                    </ul>
                                </div>
                            )}

                            {uploadStatus.data.success_count > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <div>{uploadStatus.data.success_count} records added successfully.</div>
                                </div>
                            )}

                            {uploadStatus.data.duplicate_count > 0 && (
                                <div style={{ marginTop: '1rem', color: 'hsl(var(--error))' }}>
                                    <div>{uploadStatus.data.duplicate_count} records already exist.</div>
                                </div>
                            )}

                            {uploadStatus.data.error_count > 0 && (
                                <div style={{ marginTop: '1rem', color: 'hsl(var(--error))' }}>
                                    <div>{uploadStatus.data.error_count} records had errors (see Errors section above).</div>
                                </div>
                            )}
                        </div>
                    )}

                    {uploadStatus && uploadStatus.type === 'error' && (
                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255, 50, 50, 0.1)', borderRadius: '8px', color: '#ff6b6b' }}>
                            <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                            {uploadStatus.message}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'users' && (
                <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <UserPlus size={24} color="hsl(var(--secondary))" />
                        Create New Agent
                    </h2>

                    <form onSubmit={handleCreateUser}>
                        <div className="mb-4">
                            <input
                                className="glass-input"
                                placeholder="First Name"
                                value={newUser.first_name}
                                onChange={e => setNewUser({ ...newUser, first_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <input
                                className="glass-input"
                                placeholder="Last Name"
                                value={newUser.last_name}
                                onChange={e => setNewUser({ ...newUser, last_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <input
                                type="email"
                                className="glass-input"
                                placeholder="Email"
                                value={newUser.email}
                                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Password Option:</label>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="password-mode"
                                        value="generate"
                                        checked={passwordMode === 'generate'}
                                        onChange={() => setPasswordMode('generate')}
                                    />
                                    Generate Password
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="password-mode"
                                        value="manual"
                                        checked={passwordMode === 'manual'}
                                        onChange={() => setPasswordMode('manual')}
                                    />
                                    Enter Password
                                </label>
                            </div>

                            {passwordMode === 'manual' && (
                                <input
                                    type="password"
                                    className="glass-input"
                                    placeholder="Enter password"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    required={passwordMode === 'manual'}
                                />
                            )}
                        </div>

                        <button type="submit" className="btn-primary w-full">Create Agent</button>
                    </form>

                    {createdUser && (
                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', border: '1px solid hsl(var(--success))' }}>
                            <h3 style={{ color: 'hsl(var(--success))', marginBottom: '0.5rem' }}>Agent Created!</h3>
                            <p><strong>Email:</strong> {createdUser.user.email}</p>
                            <p><strong>Password:</strong> {createdUser.generated_password}</p>
                            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                <AlertCircle size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                Save this password immediately. It will not be shown again.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'agents' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h2>Agents</h2>
                    {loadingAgents ? <p>Loading...</p> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Name</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Email</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Role</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>Created</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--glass-border)' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agentsList.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No agents found
                                            </td>
                                        </tr>
                                    ) : (
                                        agentsList.map(a => (
                                            <tr key={a.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                <td style={{ padding: '0.75rem' }}>{a.first_name} {a.last_name}</td>
                                                <td style={{ padding: '0.75rem' }}>{a.email}</td>
                                                <td style={{ padding: '0.75rem' }}>{a.role}</td>
                                                <td style={{ padding: '0.75rem' }}>{new Date(a.created_at).toLocaleString()}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    <button
                                                        className="btn-secondary"
                                                        onClick={() => openResetPasswordModal(a)}
                                                        style={{ marginRight: '0.5rem' }}
                                                    >
                                                        Reset Password
                                                    </button>
                                                    <button
                                                        className="btn-secondary"
                                                        onClick={() => deleteAgent(a.id, a.email)}
                                                        style={{ color: 'hsl(var(--error))', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                                    >
                                                        <Trash2 size={16} /> Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Reset Password Modal */}
            {resetPasswordModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#000000',
                        padding: '2rem',
                        borderRadius: '12px',
                        maxWidth: '500px',
                        width: '90%',
                        border: '1px solid var(--glass-border)'
                    }}>
                        {!resetPasswordResult ? (
                            <>
                                <h3 style={{ marginBottom: '1rem' }}>Reset Password for {resetPasswordModal.user.email}</h3>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Password Option:</label>
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="reset-password-mode"
                                                value="generate"
                                                checked={resetPasswordMode === 'generate'}
                                                onChange={() => setResetPasswordMode('generate')}
                                            />
                                            Generate Password
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="reset-password-mode"
                                                value="manual"
                                                checked={resetPasswordMode === 'manual'}
                                                onChange={() => setResetPasswordMode('manual')}
                                            />
                                            Enter Password
                                        </label>
                                    </div>

                                    {resetPasswordMode === 'manual' && (
                                        <input
                                            type="password"
                                            className="glass-input"
                                            placeholder="Enter new password"
                                            value={resetPasswordInput}
                                            onChange={e => setResetPasswordInput(e.target.value)}
                                        />
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn-secondary"
                                        onClick={closeResetPasswordModal}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-primary"
                                        onClick={handleResetPassword}
                                    >
                                        Reset Password
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ color: 'hsl(var(--success))', marginBottom: '1rem' }}>Password Reset Successful!</h3>
                                <p><strong>Email:</strong> {resetPasswordResult.email}</p>
                                <p><strong>New Password:</strong> {resetPasswordResult.new_password}</p>
                                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    <AlertCircle size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                                    Save this password immediately. It will not be shown again.
                                </p>
                                <button
                                    className="btn-primary w-full"
                                    onClick={closeResetPasswordModal}
                                    style={{ marginTop: '1.5rem' }}
                                >
                                    Close
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'leads' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'auto', paddingTop: '2rem', paddingBottom: '2rem', paddingRight: '2rem', paddingLeft: '2rem', gap: '1rem', alignItems: 'stretch' }}>
                    <h2>Leads</h2>
                    <div style={{ marginBottom: '0rem' }}>
                        <button className="btn-primary" onClick={() => exportLeads('csv')}>Export CSV</button>
                        <button className="btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={() => exportLeads('xlsx')}>Export Excel</button>
                        <button className="btn-primary" style={{ marginLeft: '1rem' }} onClick={() => fetchLeads()}>Refresh</button>
                        <button className="btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={deleteSelectedLeads}>Delete Selected</button>
                    </div>

                    {loadingLeads ? <p>Loading...</p> : (
                        <div className="table-wrapper">
                            <table className="table-compact">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>ID</th>
                                        <th>Contact ID</th>
                                        <th>Name</th>
                                        <th>Phone</th>
                                        <th>Company</th>
                                        <th>Title</th>
                                        <th>Street</th>
                                        <th>City</th>
                                        <th>State</th>
                                        <th>ZIP</th>
                                        <th>SIC</th>
                                        <th>Recording</th>
                                        <th>Submitted</th>
                                        <th>Created</th>
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
                                            <td>{l.is_submitted ? 'Yes' : 'No'}</td>
                                            <td>{new Date(l.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'submissions' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h2>Submissions</h2>
                    <div style={{ marginBottom: '1rem' }}>
                        <button className="btn-primary" onClick={() => fetchSubmissions()}>Refresh</button>
                        <button className="btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={() => exportSubmissions('csv')}>Export CSV</button>
                        <button className="btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={() => exportSubmissions('xlsx')}>Export Excel</button>
                    </div>

                    {loadingSubmissions ? <p>Loading...</p> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Lead ID</th>
                                        <th>Lead Contact</th>
                                        <th>Lead Phone</th>
                                        <th>Agent Name</th>
                                        <th>Agent Email</th>
                                        <th>Submitted At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map(s => (
                                        <tr key={s.id}>
                                            <td>{s.id}</td>
                                            <td>{s.lead_id}</td>
                                            <td>{s.details?.contact_id}</td>
                                            <td>{s.details?.phone1 || s.details?.phone || '—'}</td>
                                            <td>{s.details?.agent_name || (s.details?.submitted_by ? `${s.details.submitted_by.first_name} ${s.details.submitted_by.last_name}` : '—')}</td>
                                            <td>{s.details?.submitted_by?.email || '—'}</td>
                                            <td>{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
