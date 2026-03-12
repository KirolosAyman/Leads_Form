import React, { useState } from 'react';
import api from '../api';
import { Search, Edit2, Save, X, Phone, User, MapPin, Mail, Lock, Unlock } from 'lucide-react';

const AgentDashboard = () => {
    const [searchPhone, setSearchPhone] = useState('');
    const [lead, setLead] = useState(null);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');
        setLead(null);
        setIsEditing(false);
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
            setIsEditing(false);
            alert('Lead updated successfully!');
        } catch (err) {
            alert('Failed to update lead');
        }
    };

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            const res = await api.post(`/leads/${lead.id}/submit`);
            setLead(res.data);
            alert(`Lead ${res.data.is_submitted ? 'submitted' : 'unlocked'} successfully!`);
        } catch (err) {
            alert('Failed to update submission status');
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
                            <span style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>ID: {lead.contact_id}</span>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: lead.is_submitted ? '#4ecdc4' : '#ff6b6b' }}>
                                Status: {lead.is_submitted ? '✓ Submitted' : 'Pending'}
                            </div>
                        </div>
                        {!isEditing ? (
                            <button 
                                onClick={() => setIsEditing(true)} 
                                className="btn-secondary flex-center gap-4"
                                disabled={lead.is_submitted}
                                style={{ opacity: lead.is_submitted ? 0.5 : 1, cursor: lead.is_submitted ? 'not-allowed' : 'pointer' }}
                            >
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                        {renderField('Phone Number', 'phone', <Phone size={18} color="var(--text-muted)" />, false)}
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

                    <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {lead.is_submitted ? (
                                <span style={{ color: '#4ecdc4' }}>This lead has been submitted and is locked.</span>
                            ) : (
                                <span>Click Submit to lock this lead for processing.</span>
                            )}
                        </div>
                        <button 
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={lead.is_submitted ? "btn-secondary" : "btn-primary"}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {lead.is_submitted ? (
                                <>
                                    <Unlock size={16} /> Unlock
                                </>
                            ) : (
                                <>
                                    <Lock size={16} /> Submit
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentDashboard;
