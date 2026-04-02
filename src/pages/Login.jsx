// src/pages/Login.jsx
// Login page — Firebase Auth with role-based redirect.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { login, authError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Email is required'); return; }
    if (!password)      { setError('Password is required'); return; }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick-fill demo credentials
  const fillAdmin  = () => { setEmail('admin@organnet.com');   setPassword('admin123'); setError(''); };
  const fillDoctor1= () => { setEmail('dralice@hospitalA.com'); setPassword('doctor123'); setError(''); };
  const fillDoctor2= () => { setEmail('drbob@hospitalB.com');   setPassword('doctor123'); setError(''); };

  return (
    <div className="login-page">
      {/* Animated background blobs */}
      <div className="login-bg-blob login-bg-blob--1" />
      <div className="login-bg-blob login-bg-blob--2" />
      <div className="login-bg-blob login-bg-blob--3" />

      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <Activity size={28} strokeWidth={2} />
          </div>
          <h1 className="login-title">OrganNet</h1>
          <p className="login-subtitle">Organ Donation &amp; Procurement Network</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" id="login-form" noValidate>
          {(error || authError) && (
            <div className="alert alert-danger">
              <AlertCircle size={16} />
              <span>{error || authError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@hospital.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div className="login-pass-wrapper">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPass(v => !v)}
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            className="btn btn-primary btn-lg w-full login-submit"
            disabled={loading}
          >
            {loading ? (
              <><span className="loading-spinner" style={{width:18,height:18}} />  Signing in…</>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="login-demo">
          <p className="login-demo-title">Demo Credentials</p>
          <div className="login-demo-btns">
            <button onClick={fillAdmin}   className="login-demo-btn" id="demo-admin-btn">
              <span className="badge badge-admin">Admin</span>
              admin@organnet.com
            </button>
            <button onClick={fillDoctor1} className="login-demo-btn" id="demo-doc1-btn">
              <span className="badge badge-doctor">Doctor</span>
              dralice@hospitalA.com
            </button>
            <button onClick={fillDoctor2} className="login-demo-btn" id="demo-doc2-btn">
              <span className="badge badge-doctor">Doctor</span>
              drbob@hospitalB.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
