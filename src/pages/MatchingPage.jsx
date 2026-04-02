// src/pages/MatchingPage.jsx
// Select an organ → run client-side matching engine → display ranked recipients with score breakdown.

import React, { useState, useEffect } from 'react';
import {
  GitMerge, Search, ChevronDown, AlertCircle, CheckCircle,
  Clock, MapPin, Activity, Loader,
} from 'lucide-react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import matchOrgan from '../utils/matchOrgan';
import { getUrgencyClass } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

export default function MatchingPage() {
  const navigate = useNavigate();
  const [organs, setOrgans]           = useState([]);
  const [selectedOrganId, setSelectedOrganId] = useState('');
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState('');

  // Only available organs can be matched
  useEffect(() => {
    const q = query(collection(db, 'organs'), where('availability_status', '==', 'available'));
    return onSnapshot(q, snap =>
      setOrgans(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const handleMatch = async () => {
    if (!selectedOrganId) { setError('Please select an organ to match'); return; }
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await matchOrgan(selectedOrganId);
      setResult(res);
    } catch (err) {
      setError('Matching failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = (recipientId, score, rank) => {
    navigate('/allocation', {
      state: {
        organ_id:       selectedOrganId,
        recipient_id:   recipientId,
        priority_score: score,
        is_top_match:   rank === 0,
        top_recipient_id: result?.topMatch?.recipient?.id,
        all_matches:    result?.matches,
      }
    });
  };

  const selectedOrgan = organs.find(o => o.id === selectedOrganId);
  const maxScore      = result?.matches?.[0]?.score || 1;

  return (
    <div>
      <div className="page-header">
        <h1>Organ Matching Engine</h1>
        <p>Select an available organ to find compatible, priority-ranked recipients</p>
      </div>

      {/* Organ Selection */}
      <div className="glass-card mb-6">
        <div className="section-title"><GitMerge size={18}/>Select Organ</div>

        <div className="form-row" style={{alignItems:'end'}}>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Available Organ</label>
            <select
              id="match-organ-select"
              className="form-select"
              value={selectedOrganId}
              onChange={e => { setSelectedOrganId(e.target.value); setResult(null); setError(''); }}
            >
              <option value="">— Choose an organ —</option>
              {organs.map(o => (
                <option key={o.id} value={o.id}>
                  {o.organ_type} · {o.blood_group} · ID: {o.id.slice(0,8)}
                </option>
              ))}
            </select>
          </div>

          <button
            id="run-matching-btn"
            className="btn btn-primary"
            onClick={handleMatch}
            disabled={loading || !selectedOrganId}
            style={{alignSelf:'end'}}
          >
            {loading
              ? <><Loader size={16} className="animate-pulse"/> Running…</>
              : <><Search size={16}/> Find Matches</>
            }
          </button>
        </div>

        {/* Selected organ details */}
        {selectedOrgan && (
          <div style={{
            marginTop:16, padding:'12px 16px',
            background:'rgba(92,124,137,0.08)',
            borderRadius:8, border:'1px solid rgba(92,124,137,0.2)',
            display:'flex', gap:24, flexWrap:'wrap',
          }}>
            <span className="text-sm"><span className="text-muted">Type:</span> <strong>{selectedOrgan.organ_type}</strong></span>
            <span className="text-sm"><span className="text-muted">Blood Group:</span> <span className="font-mono">{selectedOrgan.blood_group}</span></span>
            <span className="text-sm"><span className="text-muted">Status:</span> <span className={`badge badge-${selectedOrgan.availability_status}`}>{selectedOrgan.availability_status}</span></span>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{marginTop:12, marginBottom:0}}>
            <AlertCircle size={14}/>{error}
          </div>
        )}
      </div>

      {/* No Match */}
      {result?.noMatch && (
        <div className="glass-card">
          <div className="alert alert-warning" style={{marginBottom:0}}>
            <AlertCircle size={16}/>
            <div>
              <strong>No Compatible Recipients Found</strong>
              <p style={{marginTop:4, fontSize:'0.875rem', color:'rgba(255,255,255,0.6)'}}>
                {result.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Matching Results */}
      {result && !result.noMatch && (
        <div>
          <div className="section-title mb-4">
            <CheckCircle size={18} style={{color:'var(--success)'}}/>
            {result.matches.length} Compatible Match{result.matches.length !== 1 ? 'es' : ''} Found
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:14}}>
            {result.matches.map((match, idx) => (
              <div
                key={match.recipient.id}
                id={`match-result-${idx}`}
                style={{
                  background: idx === 0
                    ? 'linear-gradient(135deg, rgba(58,173,140,0.08), rgba(31,73,89,0.4))'
                    : 'var(--bg-card)',
                  backdropFilter:'blur(20px)',
                  border: idx === 0
                    ? '1px solid rgba(58,173,140,0.3)'
                    : '1px solid var(--border-card)',
                  borderRadius:12,
                  padding:'18px 20px',
                  transition:'all 0.2s',
                }}
              >
                <div className="flex justify-between items-center" style={{marginBottom:12}}>
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    <div style={{
                      width:32, height:32, borderRadius:'50%',
                      background: idx === 0 ? 'rgba(58,173,140,0.2)' : 'rgba(92,124,137,0.15)',
                      color: idx === 0 ? 'var(--success)' : 'var(--slate)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:700, fontSize:'0.85rem', fontFamily:'var(--font-mono)',
                      border:`1px solid ${idx === 0 ? 'rgba(58,173,140,0.3)' : 'rgba(92,124,137,0.2)'}`,
                    }}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong style={{fontSize:'1rem'}}>{match.recipient.name}</strong>
                        {idx === 0 && (
                          <span className="badge badge-available" style={{fontSize:'0.65rem'}}>
                            Top Match
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted">
                        {match.recipient.blood_group} · {match.recipient.organ_needed} · Age {match.recipient.age}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Total Score */}
                    <div style={{textAlign:'right'}}>
                      <div style={{
                        fontFamily:'var(--font-display)',
                        fontSize:'1.6rem', fontWeight:700,
                        color: idx === 0 ? 'var(--success)' : 'var(--white)',
                      }}>
                        {match.score.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted">Priority Score</div>
                    </div>

                    <button
                      className={`btn ${idx === 0 ? 'btn-success' : 'btn-secondary'} btn-sm`}
                      id={`allocate-btn-${idx}`}
                      onClick={() => handleAllocate(match.recipient.id, match.score, idx)}
                    >
                      Allocate
                    </button>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="score-bar-wrap" style={{marginBottom:12}}>
                  <div
                    className="score-bar-fill"
                    style={{
                      width: `${(match.score / maxScore) * 100}%`,
                      background: idx === 0
                        ? 'linear-gradient(90deg, var(--success), #1F4959)'
                        : 'linear-gradient(90deg, var(--teal-dark), var(--slate))',
                    }}
                  />
                </div>

                {/* Score Breakdown */}
                <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
                  <div style={{
                    background:'rgba(91,155,213,0.08)', border:'1px solid rgba(91,155,213,0.15)',
                    borderRadius:8, padding:'8px 12px',
                  }}>
                    <div className="flex items-center gap-1 mb-1">
                      <Activity size={12} style={{color:'var(--info)'}}/> 
                      <span style={{fontSize:'0.7rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Urgency</span>
                    </div>
                    <div style={{fontFamily:'var(--font-mono)', fontSize:'1.1rem', color:'var(--info)'}}>
                      {match.breakdown.urgency.toFixed(2)}
                    </div>
                    <div style={{fontSize:'0.7rem', color:'rgba(255,255,255,0.4)'}}>
                      urgency {match.recipient.medical_urgency} × 0.5
                    </div>
                    <span className={`urgency-badge ${getUrgencyClass(match.recipient.medical_urgency)}`} style={{marginTop:6}}>
                      {match.recipient.medical_urgency}/10
                    </span>
                  </div>

                  <div style={{
                    background:'rgba(232,164,74,0.08)', border:'1px solid rgba(232,164,74,0.15)',
                    borderRadius:8, padding:'8px 12px',
                  }}>
                    <div className="flex items-center gap-1 mb-1">
                      <Clock size={12} style={{color:'var(--warning)'}}/> 
                      <span style={{fontSize:'0.7rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Waiting</span>
                    </div>
                    <div style={{fontFamily:'var(--font-mono)', fontSize:'1.1rem', color:'var(--warning)'}}>
                      {match.breakdown.waiting.toFixed(2)}
                    </div>
                    <div style={{fontSize:'0.7rem', color:'rgba(255,255,255,0.4)'}}>
                      {match.recipient.waiting_days} days × 0.3
                    </div>
                  </div>

                  <div style={{
                    background:'rgba(92,124,137,0.08)', border:'1px solid rgba(92,124,137,0.15)',
                    borderRadius:8, padding:'8px 12px',
                  }}>
                    <div className="flex items-center gap-1 mb-1">
                      <MapPin size={12} style={{color:'var(--slate)'}}/> 
                      <span style={{fontSize:'0.7rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Proximity</span>
                    </div>
                    <div style={{fontFamily:'var(--font-mono)', fontSize:'1.1rem', color:'var(--slate)'}}>
                      {match.breakdown.proximity.toFixed(2)}
                    </div>
                    <div style={{fontSize:'0.7rem', color:'rgba(255,255,255,0.4)'}}>
                      score {match.breakdown.rawProximityScore} × 0.2
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
