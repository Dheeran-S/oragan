// src/pages/AllocationPage.jsx
// Confirm allocation. Detect override → prompt mandatory reason → submit batch.

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList, AlertTriangle, CheckCircle, AlertCircle,
  ArrowLeft, ShieldAlert, Info,
} from 'lucide-react';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { createAllocation } from '../utils/createAllocation';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';

export default function AllocationPage() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const state = location.state || {};
  const {
    organ_id, recipient_id, priority_score,
    is_top_match, top_recipient_id, all_matches,
  } = state;

  const [organData, setOrganData]         = useState(null);
  const [recipientData, setRecipientData] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading]             = useState(false);
  const [fetching, setFetching]           = useState(true);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState(false);
  const [allocationId, setAllocationId]   = useState('');

  const isOverride = !is_top_match && organ_id && recipient_id;

  useEffect(() => {
    if (!organ_id || !recipient_id) { setFetching(false); return; }
    const load = async () => {
      try {
        const [orgSnap, recSnap] = await Promise.all([
          getDoc(doc(db, 'organs', organ_id)),
          getDoc(doc(db, 'recipients', recipient_id)),
        ]);
        if (orgSnap.exists()) setOrganData({ id: orgSnap.id, ...orgSnap.data() });
        if (recSnap.exists()) setRecipientData({ id: recSnap.id, ...recSnap.data() });
      } catch (e) {
        setError('Failed to load data: ' + e.message);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [organ_id, recipient_id]);

  const handleConfirm = async () => {
    setError('');
    if (isOverride && !overrideReason.trim()) {
      setError('Override reason is required. You cannot skip this field.');
      return;
    }

    setLoading(true);
    try {
      const id = await createAllocation({
        organ_id,
        recipient_id,
        priority_score,
        is_override:    isOverride,
        override_reason: isOverride ? overrideReason : '',
        currentUser:    { uid: currentUser?.uid, name: userProfile?.name, role: userProfile?.role },
        topRecipientId: top_recipient_id,
      });
      setAllocationId(id);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── No state — user navigated here directly
  if (!organ_id || !recipient_id) {
    return (
      <div>
        <div className="page-header">
          <h1>Allocation</h1>
        </div>
        <div className="glass-card">
          <div className="alert alert-warning">
            <AlertCircle size={16}/>
            No allocation data found. Please use the <strong>Matching Page</strong> to start an allocation.
          </div>
          <button className="btn btn-secondary mt-4" onClick={() => navigate('/matching')}>
            <ArrowLeft size={14}/> Go to Matching
          </button>
        </div>
      </div>
    );
  }

  // ── Success screen
  if (success) {
    return (
      <div>
        <div className="page-header"><h1>Allocation</h1></div>
        <div className="glass-card" style={{textAlign:'center', padding:48}}>
          <div style={{
            width:72, height:72, borderRadius:'50%',
            background:'rgba(58,173,140,0.15)', border:'2px solid rgba(58,173,140,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 20px', color:'var(--success)',
          }}>
            <CheckCircle size={36}/>
          </div>
          <h2 style={{marginBottom:8}}>Allocation Confirmed</h2>
          <p className="text-muted" style={{marginBottom:20}}>
            The organ has been successfully allocated and audit log recorded.
          </p>
          <div style={{
            display:'inline-block', padding:'8px 16px',
            background:'rgba(92,124,137,0.1)', border:'1px solid rgba(92,124,137,0.2)',
            borderRadius:8, fontFamily:'var(--font-mono)', fontSize:'0.8rem', color:'var(--slate)',
            marginBottom:28,
          }}>
            Allocation ID: {allocationId}
          </div>
          {isOverride && (
            <div className="alert alert-warning" style={{textAlign:'left', marginBottom:20}}>
              <ShieldAlert size={14}/>
              Override recorded &amp; logged. Reason: <em>"{overrideReason}"</em>
            </div>
          )}
          <div className="flex gap-3" style={{justifyContent:'center'}}>
            <button className="btn btn-secondary" onClick={() => navigate('/matching')}>
              <ArrowLeft size={14}/> Back to Matching
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex items-center gap-3">
        <button className="btn-icon" onClick={() => navigate(-1)} title="Go back">
          <ArrowLeft size={16}/>
        </button>
        <div>
          <h1>Confirm Allocation</h1>
          <p>Review the allocation details before confirming</p>
        </div>
      </div>

      {fetching ? (
        <div className="loading-overlay">
          <span className="loading-spinner"/>Loading allocation data…
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'1fr 380px', gap:20, alignItems:'start'}}>

          {/* Left — Details */}
          <div>
            {/* Override Warning Banner */}
            {isOverride && (
              <div className="alert alert-warning" style={{marginBottom:20}}>
                <AlertTriangle size={16}/>
                <div>
                  <strong>Override Allocation</strong>
                  <p style={{marginTop:4, fontSize:'0.875rem', color:'rgba(255,255,255,0.7)'}}>
                    You are allocating to a <strong>non-top-ranked</strong> recipient. 
                    A mandatory override reason must be provided. This action is fully audited.
                  </p>
                </div>
              </div>
            )}

            {/* Organ Card */}
            <div className="glass-card mb-4">
              <div className="section-title"><ClipboardList size={16}/>Organ Details</div>
              {organData ? (
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                  {[
                    ['Organ Type',   organData.organ_type],
                    ['Blood Group',  organData.blood_group],
                    ['Status',       organData.availability_status],
                    ['Organ ID',     organData.id],
                  ].map(([label, val]) => (
                    <div key={label} style={{padding:'10px 14px', background:'rgba(92,124,137,0.08)', borderRadius:8}}>
                      <div style={{fontSize:'0.7rem', color:'var(--slate)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4}}>
                        {label}
                      </div>
                      <div style={{fontFamily: label === 'Organ ID' ? 'var(--font-mono)' : 'inherit', fontSize: label === 'Organ ID' ? '0.75rem' : '0.95rem', fontWeight:600}}>
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted">Organ data unavailable</p>}
            </div>

            {/* Recipient Card */}
            <div className="glass-card mb-4">
              <div className="section-title">
                <CheckCircle size={16} style={{color:'var(--success)'}}/>
                Selected Recipient
              </div>
              {recipientData ? (
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                  {[
                    ['Name',            recipientData.name],
                    ['Blood Group',     recipientData.blood_group],
                    ['Organ Needed',    recipientData.organ_needed],
                    ['Medical Urgency', `${recipientData.medical_urgency}/10`],
                    ['Waiting Days',    `${recipientData.waiting_days} days`],
                    ['Priority Score',  priority_score?.toFixed(2)],
                  ].map(([label, val]) => (
                    <div key={label} style={{padding:'10px 14px', background:'rgba(92,124,137,0.08)', borderRadius:8}}>
                      <div style={{fontSize:'0.7rem', color:'var(--slate)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4}}>
                        {label}
                      </div>
                      <div style={{fontWeight:600}}>{val}</div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted">Recipient data unavailable</p>}

              {!is_top_match && (
                <div className="alert alert-info" style={{marginTop:14, marginBottom:0}}>
                  <Info size={14}/>
                  This is <strong>not the top-ranked</strong> recipient. Override documentation is required.
                </div>
              )}
            </div>

            {/* Override Reason — only shown when needed */}
            {isOverride && (
              <div className="glass-card" style={{border:'1px solid rgba(232,164,74,0.3)'}}>
                <div className="section-title" style={{color:'var(--warning)'}}>
                  <ShieldAlert size={16}/>
                  Override Reason (Required)
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Provide a detailed reason for overriding the top match *</label>
                  <textarea
                    id="override-reason-input"
                    className={`form-textarea ${error && !overrideReason?.trim() ? 'error' : ''}`}
                    placeholder="e.g. Top-ranked recipient is currently undergoing a pre-surgical complication. Physician has recommended immediate allocation to second-ranked recipient…"
                    value={overrideReason}
                    onChange={e => { setOverrideReason(e.target.value); setError(''); }}
                    rows={5}
                  />
                  {error && !overrideReason?.trim() && (
                    <span className="form-error"><AlertCircle size={12}/>{error}</span>
                  )}
                  <span className="form-hint">This will be permanently recorded in the audit log and cannot be edited later.</span>
                </div>
              </div>
            )}
          </div>

          {/* Right — Confirm Panel */}
          <div>
            <div className="glass-card" style={{position:'sticky', top:24}}>
              <div className="section-title"><ClipboardList size={16}/>Confirm Allocation</div>

              <div style={{marginBottom:16}}>
                <div style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', marginBottom:8}}>
                  What happens when you confirm:
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:8}}>
                  {[
                    'Allocation record created (status: Approved)',
                    'Organ status → Allocated',
                    'Audit log entry written',
                    'In-app notification sent',
                    isOverride && 'Override reason permanently saved',
                  ].filter(Boolean).map((item, i) => (
                    <div key={i} className="flex items-center gap-2" style={{fontSize:'0.825rem', color:'rgba(255,255,255,0.7)'}}>
                      <CheckCircle size={13} style={{color:'var(--success)', flexShrink:0}}/>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {error && overrideReason?.trim() && (
                <div className="alert alert-danger" style={{marginBottom:12}}>
                  <AlertCircle size={14}/>{error}
                </div>
              )}

              <button
                id="confirm-allocation-btn"
                className={`btn w-full ${isOverride ? 'btn-danger' : 'btn-success'}`}
                style={{justifyContent:'center', width:'100%'}}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading
                  ? <><span className="loading-spinner" style={{width:16,height:16}}/> Processing…</>
                  : isOverride
                  ? <><ShieldAlert size={16}/>Confirm Override Allocation</>
                  : <><CheckCircle size={16}/>Confirm Allocation</>
                }
              </button>

              {isOverride && (
                <p className="text-xs text-muted" style={{marginTop:8, textAlign:'center'}}>
                  This override action is irreversible and fully audited.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
