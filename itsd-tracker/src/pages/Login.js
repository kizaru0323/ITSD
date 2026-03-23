import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../apiConfig';
import './Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestForm, setRequestForm] = useState({ name: '', email: '', reason: '', type: 'reactivation' });
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestSuccess, setRequestSuccess] = useState('');
    const [modalError, setModalError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store user data in single source of truth
            sessionStorage.setItem('itsd_user', JSON.stringify(data));

            // Store the token for future authenticated requests
            if (data.token) {
                sessionStorage.setItem('itsd_auth_token', data.token);
            }

            // Auto-redirect based on role from database
            const isAdmin = data.role && data.role.toUpperCase() === 'ADMIN';
            if (isAdmin) {
                navigate('/admin/dashboard');
            } else {
                navigate('/user/dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        console.log('Submission started with:', requestForm);
        setRequestLoading(true);
        setRequestSuccess('');
        setModalError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/account-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestForm)
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);
            if (!response.ok) throw new Error(data.error || 'Failed to submit request');
            
            setRequestSuccess('Your request has been submitted. An administrator will review it soon.');
            setRequestForm({ name: '', email: '', reason: '' });
            setTimeout(() => {
                setShowRequestModal(false);
                setRequestSuccess('');
            }, 3000);
        } catch (err) {
            setModalError(err.message);
        } finally {
            setRequestLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-glow"></div>
            <div className="login-glow login-glow-2"></div>

            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                    </div>
                    <h1>ITSD Tracker</h1>
                    <p>Sign in to access your dashboard</p>
                </div>

                {error && (
                    <div className="error-msg">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        {error}
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <div className="input-wrapper">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <input
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoComplete="off"
                                readOnly
                                onFocus={(e) => e.target.readOnly = false}
                                onBlur={(e) => e.target.readOnly = true}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                readOnly
                                onFocus={(e) => e.target.readOnly = false}
                                onBlur={(e) => e.target.readOnly = true}
                            />
                            <button 
                                type="button" 
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94a10.07 10.07 0 0 1-12.06 0"></path>
                                        <path d="M1 1l22 22"></path>
                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
                                        <path d="M7.11 7.11A10.14 10.14 0 0 0 1 12s4 8 11 8a11.7 11.7 0 0 0 2.49-.3"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? (
                            <span className="login-loading">
                                <span className="spinner"></span>
                                Signing in...
                            </span>
                        ) : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Forgot your password? <a href="#!" onClick={(e) => { e.preventDefault(); setShowRequestModal(true); }}>Contact Admin</a></p>
                </div>
            </div>

            {/* Re-activation Request Modal */}
            {showRequestModal && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => setShowRequestModal(false)}>
                    <div className="modern-modal animate-zoom-in" style={{ width: '450px' }} onClick={e => e.stopPropagation()}>
                        <div className="modern-modal-header">
                            <h3>{requestForm.type === 'password_reset' ? 'Request Password Reset' : 'Request Account Re-activation'}</h3>
                            <button className="close-btn-modern" onClick={() => setShowRequestModal(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="modern-modal-body">
                            {modalError && (
                                <div className="error-msg animate-fade-in" style={{ marginBottom: '20px' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                    {modalError}
                                </div>
                            )}
                            {requestSuccess ? (
                                <div className="request-success-msg animate-fade-in">
                                    <div className="success-icon-check">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                    <p>{requestSuccess}</p>
                                </div>
                            ) : (
                                <form className="request-reactivation-form" onSubmit={handleRequestSubmit}>
                                    <div className="pu-field-v2">
                                        <label>Full Name</label>
                                        <input 
                                            value={requestForm.name} 
                                            onChange={e => setRequestForm(f => ({ ...f, name: e.target.value }))} 
                                            placeholder="Your full name" 
                                            required 
                                        />
                                    </div>
                                    <div className="pu-field-v2" style={{ marginTop: '15px' }}>
                                        <label>I need help with...</label>
                                        <select 
                                            value={requestForm.type} 
                                            onChange={e => setRequestForm(f => ({ ...f, type: e.target.value }))}
                                            style={{ 
                                                width: '100%', 
                                                padding: '12px', 
                                                borderRadius: '12px', 
                                                background: '#1a2540', 
                                                border: '1.5px solid rgba(255, 255, 255, 0.1)',
                                                color: 'white',
                                                appearance: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="reactivation">Account Re-activation</option>
                                            <option value="password_reset">Password Reset Request</option>
                                        </select>
                                    </div>
                                    <div className="pu-field-v2" style={{ marginTop: '15px' }}>
                                        <label>Email Address</label>
                                        <input 
                                            type="email"
                                            value={requestForm.email} 
                                            onChange={e => setRequestForm(f => ({ ...f, email: e.target.value }))} 
                                            placeholder="Your registered email" 
                                            required 
                                        />
                                    </div>
                                    <div className="pu-field-v2" style={{ marginTop: '15px' }}>
                                        <label>Reason for {requestForm.type === 'password_reset' ? 'Password Reset' : 'Re-activation'}</label>
                                        <textarea 
                                            value={requestForm.reason} 
                                            onChange={e => setRequestForm(f => ({ ...f, reason: e.target.value }))} 
                                            placeholder={requestForm.type === 'password_reset' ? 'Explain why you need a password reset...' : 'Explain why you need access...'} 
                                            rows="4"
                                            required 
                                        />
                                    </div>
                                    <div className="request-modal-footer" style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
                                        <button type="button" className="login-btn secondary" onClick={() => setShowRequestModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white' }}>Cancel</button>
                                        <button type="submit" className="login-btn" style={{ flex: 1, marginTop: 0 }} disabled={requestLoading}>
                                            {requestLoading ? 'Submitting...' : 'Submit Request'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Login;
