import React, { useState } from 'react';
import api from '../api';
import { Upload, UserPlus, CheckCircle, AlertCircle, FileText } from 'lucide-react';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'users'

    // Upload State
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(null);

    // User Creation State
    const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '' });
    const [createdUser, setCreatedUser] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setUploadStatus(null);
    };

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/api/leads/upload', formData, {
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
            const res = await api.post('/api/users/agent/with-password', newUser);
            setCreatedUser(res.data);
            setNewUser({ first_name: '', last_name: '', email: '' }); // Reset form
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to create user');
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
                            accept=".csv"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            id="csv-upload"
                        />
                        <label htmlFor="csv-upload" className="btn-secondary" style={{ display: 'inline-block', marginBottom: '1rem' }}>
                            Select CSV File
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
                            {uploadStatus.data.errors.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <strong>Errors:</strong>
                                    <ul style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                        {uploadStatus.data.errors.map((e, i) => <li key={i}>{e}</li>)}
                                    </ul>
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
        </div>
    );
};

export default AdminDashboard;
