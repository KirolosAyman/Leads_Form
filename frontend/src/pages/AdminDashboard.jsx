import React, { useState } from 'react';
import api from '../api';
import { Upload, UserPlus, CheckCircle, AlertCircle, FileText } from 'lucide-react';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'users', 'agents', 'leads'

    // Upload State
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(null);

    // User Creation State
    const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '' });
    const [createdUser, setCreatedUser] = useState(null);
    const [agents, setAgents] = useState([]);
    const [leads, setLeads] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState(new Set());
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

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
            const res = await api.post('/users/agent/with-password', newUser);
            setCreatedUser(res.data);
            setNewUser({ first_name: '', last_name: '', email: '' }); // Reset form
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

    const resetPassword = async (userId) => {
        if (!window.confirm('Generate a new password for this user?')) return;
        try {
            const res = await api.post(`/users/${userId}/reset-password`);
            alert(`New password for ${res.data.email}: ${res.data.new_password}`);
            // refresh agents list
            fetchAgents();
        } catch (err) {
            alert('Failed to reset password');
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
                        Submissions
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

                            {/* Debug info when nothing was processed */}
                            {uploadStatus.data.success_count === 0 && (uploadStatus.data.columns || uploadStatus.data.sample_rows) && (
                                <div style={{ marginTop: '1rem' }}>
                                    <strong>Debug:</strong>
                                    {uploadStatus.data.columns && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Columns detected:</div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{uploadStatus.data.columns.join(', ')}</div>
                                        </div>
                                    )}
                                    {uploadStatus.data.sample_rows && uploadStatus.data.sample_rows.length > 0 && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Sample rows:</div>
                                            <pre style={{ background: 'rgba(0,0,0,0.04)', padding: '0.5rem', borderRadius: '6px' }}>{JSON.stringify(uploadStatus.data.sample_rows, null, 2)}</pre>
                                        </div>
                                    )}
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
                            <input className="glass-input" placeholder="First Name" value={newUser.first_name} onChange={e => setNewUser({ ...newUser, first_name: e.target.value })} required />
                        </div>
                        <div className="mb-4">
                            <input className="glass-input" placeholder="Last Name" value={newUser.last_name} onChange={e => setNewUser({ ...newUser, last_name: e.target.value })} required />
                        </div>
                        <div className="mb-4">
                            <input type="email" className="glass-input" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
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
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Created</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {agents.map(a => (
                                    <tr key={a.id}>
                                        <td>{a.first_name} {a.last_name}</td>
                                        <td>{a.email}</td>
                                        <td>{a.role}</td>
                                        <td>{new Date(a.created_at).toLocaleString()}</td>
                                        <td><button className="btn-secondary" onClick={() => resetPassword(a.id)}>Reset Password</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'leads' && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h2>Leads</h2>
                    <div style={{ marginBottom: '1rem' }}>
                        <button className="btn-primary" onClick={() => exportLeads('csv')}>Export CSV</button>
                        <button className="btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={() => exportLeads('xlsx')}>Export Excel</button>
                    </div>

                    {loadingLeads ? <p>Loading...</p> : (
                        <div>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <button className="btn-primary" onClick={() => fetchLeads()}>Refresh</button>
                                <button className="btn-secondary" style={{ marginLeft: '0.5rem' }} onClick={deleteSelectedLeads}>Delete Selected</button>
                            </div>
                            <div style={{ overflowX: 'auto', maxHeight: '60vh' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
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
                                        <th>Submitted By</th>
                                        <th>Submitted At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map(s => (
                                        <tr key={s.id}>
                                            <td>{s.id}</td>
                                            <td>{s.lead_id}</td>
                                            <td>{s.details?.contact_id}</td>
                                            <td>{s.details?.phone}</td>
                                            <td>{s.details?.submitted_by?.email}</td>
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
