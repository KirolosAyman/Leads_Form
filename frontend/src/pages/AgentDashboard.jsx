import React, { useState } from 'react';
import api from '../api';
import { Search, Edit2, Save, X, Phone, User, MapPin, Mail } from 'lucide-react';

const AgentDashboard = () => {
    const [searchPhone, setSearchPhone] = useState('');
    const [lead, setLead] = useState(null);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');
        setLead(null);
        setIsEditing(false);
        try {
            const res = await api.get(`/api/leads/search/${searchPhone}`);
            setLead(res.data);
            setEditForm(res.data);
        } catch (err) {
            setError('Lead not found. Please check the phone number.');
        }
    };

    const handleUpdate = async () => {
        try {
            const res = await api.put(`/api/leads/${lead.id}`, editForm);
            setLead(res.data);
            setIsEditing(false);
            alert('Lead updated successfully!');
        } catch (err) {
            alert('Failed to update lead');
        }
    };

    const renderField = (label, key, icon, editable = true) => {
        return (
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {icon}
                    {isEditing && editable ? (
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
            </header>

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

            {lead && (
                <div className="glass-panel fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.8rem' }}>{lead.first_name} {lead.last_name}</h2>
                            <span style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>ID: leads_{lead.id}</span>
                        </div>
                        {!isEditing ? (
                            <button onClick={() => setIsEditing(true)} className="btn-secondary flex-center gap-4">
                                <Edit2 size={16} /> Edit
                            </button>
                        ) : (
                            <div className="flex-center gap-4">
                                <button onClick={() => setIsEditing(false)} className="btn-secondary" style={{ borderColor: '#ff6b6b', color: '#ff6b6b' }}>
                                    <X size={16} /> Cancel
                                </button>
                                <button onClick={handleUpdate} className="btn-primary flex-center gap-4">
                                    <Save size={16} /> Save Changes
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {renderField('Phone Number', 'phone_number', <Phone size={18} color="var(--text-muted)" />, false)}
                        {renderField('Email Address', 'email', <Mail size={18} color="var(--text-muted)" />)}
                        {renderField('First Name', 'first_name', <User size={18} color="var(--text-muted)" />)}
                        {renderField('Last Name', 'last_name', <User size={18} color="var(--text-muted)" />)}
                        <div style={{ gridColumn: '1 / -1' }}>
                            {renderField('Address', 'address', <MapPin size={18} color="var(--text-muted)" />)}
                        </div>
                    </div>

                    {/* Extra Payload Data */}
                    {lead.data_payload && (
                        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}>Additional Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {Object.entries(JSON.parse(lead.data_payload)).map(([key, val]) => (
                                    <div key={key} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6, marginBottom: '4px' }}>{key.replace(/_/g, ' ')}</div>
                                        <div>{val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '3rem', textAlign: 'right' }}>
                        <button className="btn-primary" style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Feature coming soon">
                            Submit to External API
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentDashboard;
