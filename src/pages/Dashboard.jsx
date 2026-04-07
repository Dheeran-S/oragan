// src/pages/Dashboard.jsx
// Real-time dashboard with stat cards, charts, and live Firestore listeners.

import React, { useState, useEffect } from 'react';
import {
  Heart, Users, ClipboardList, Activity,
  TrendingUp, Clock, AlertTriangle,
} from 'lucide-react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import { completeAllocation } from '../utils/createAllocation';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();

  const handleCompleteTransplant = async (alloc) => {
    if (!window.confirm(`Complete transplant for allocation ${alloc.id.slice(0, 8)}?`)) return;
    try {
      await completeAllocation({
        allocation_id: alloc.id,
        organ_id: alloc.organ_id,
        currentUser: { uid: currentUser?.uid, name: userProfile?.name, role: userProfile?.role }
      });
    } catch (err) {
      alert("Failed to complete transplant: " + err.message);
    }
  };

  // Live counts from Firestore
  const [stats, setStats]             = useState({ organs: 0, recipients: 0, allocations: 0, transplants: 0 });
  const [recentAllocs, setRecentAllocs] = useState([]);
  const [urgentRecipients, setUrgentRecipients] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [recentOverrides, setRecentOverrides] = useState([]);

  // Organs listener
  useEffect(() => {
    const qAvail = query(collection(db, 'organs'), where('availability_status', '==', 'available'));
    return onSnapshot(qAvail, snap => {
      setStats(s => ({ ...s, organs: snap.size }));
    });
  }, []);

  // Recipients listener
  useEffect(() => {
    return onSnapshot(collection(db, 'recipients'), snap => {
      setStats(s => ({ ...s, recipients: snap.size }));
      // Top urgent recipients
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      all.sort((a, b) => (b.medical_urgency || 0) - (a.medical_urgency || 0));
      setUrgentRecipients(all.slice(0, 5));
    });
  }, []);

  // Allocations listener — pending
  useEffect(() => {
    const qPend = query(collection(db, 'allocations'), where('status', '==', 'approved'));
    return onSnapshot(qPend, snap => {
      setStats(s => ({ ...s, allocations: snap.size }));
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.created_at?.toDate?.() || 0;
          const tb = b.created_at?.toDate?.() || 0;
          return tb - ta;
        })
        .slice(0, 5);
      setRecentAllocs(sorted);
    });
  }, []);

  // Transplants listener
  useEffect(() => {
    const qDone = query(collection(db, 'organs'), where('availability_status', '==', 'transplanted'));
    return onSnapshot(qDone, snap => {
      setStats(s => ({ ...s, transplants: snap.size }));
    });
  }, []);

  // Matches listener (from audit_logs)
  useEffect(() => {
    const qMatches = query(collection(db, 'audit_logs'), where('action_type', '==', 'allocation_created'));
    return onSnapshot(qMatches, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      all.sort((a, b) => {
        const ta = a.timestamp?.toDate?.() || 0;
        const tb = b.timestamp?.toDate?.() || 0;
        return tb - ta;
      });
      setRecentMatches(all.slice(0, 5));
    });
  }, []);

  // Overrides listener (from audit_logs)
  useEffect(() => {
    const qOverrides = query(collection(db, 'audit_logs'), where('action_type', '==', 'allocation_override'));
    return onSnapshot(qOverrides, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      all.sort((a, b) => {
        const ta = a.timestamp?.toDate?.() || 0;
        const tb = b.timestamp?.toDate?.() || 0;
        return tb - ta;
      });
      setRecentOverrides(all.slice(0, 5));
    });
  }, []);

  const successRate = stats.organs + stats.transplants > 0
    ? Math.round((stats.transplants / (stats.organs + stats.transplants)) * 100)
    : 0;

  const STAT_CARDS = [
    { label: 'Available Organs',     value: stats.organs,      icon: Heart,         accent: '#d95f5f', id: 'stat-organs' },
    { label: 'Active Recipients',    value: stats.recipients,  icon: Users,         accent: '#5B9BD5', id: 'stat-recipients' },
    { label: 'Approved Allocations', value: stats.allocations, icon: ClipboardList, accent: '#e8a44a', id: 'stat-allocations' },
    { label: 'Transplants Done',     value: stats.transplants, icon: Activity,      accent: '#3aad8c', id: 'stat-transplants' },
  ];
  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, <strong style={{color:'#5C7C89'}}>{userProfile?.name || 'User'}</strong> — here's your real-time overview.</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {STAT_CARDS.map(card => (
          <div key={card.id} id={card.id} className="stat-card" style={{'--accent': card.accent}}>
            <div className="stat-card-icon" style={{background:`${card.accent}20`, color: card.accent}}>
              <card.icon size={20} strokeWidth={1.75} />
            </div>
            <div className="stat-card-value">{card.value}</div>
            <div className="stat-card-label">{card.label}</div>
          </div>
        ))}
        {/* Success Rate Card */}
        <div className="stat-card" style={{'--accent': '#5C7C89'}} id="stat-success-rate">
          <div className="stat-card-icon" style={{background:'rgba(92,124,137,0.15)', color:'#5C7C89'}}>
            <TrendingUp size={20} strokeWidth={1.75} />
          </div>
          <div className="stat-card-value">{successRate}%</div>
          <div className="stat-card-label">Allocation Success Rate</div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>

        {/* Recent Allocations */}
        <div className="glass-card">
          <div className="section-title">
            <ClipboardList size={18} />
            Recent Allocations
          </div>
          {recentAllocs.length === 0 ? (
            <div className="empty-state" style={{padding:24}}>
              <p>No allocations yet</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Allocation ID</th>
                    <th>Status</th>
                    <th>Override</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAllocs.map(a => (
                    <tr key={a.id}>
                      <td className="font-mono text-xs text-slate">{a.id.slice(0,12)}…</td>
                      <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                      <td>
                        {a.is_override
                          ? <span className="badge badge-override">Override</span>
                          : <span className="text-muted text-xs">—</span>}
                      </td>
                      <td className="text-xs text-muted">{formatDate(a.created_at)}</td>
                      <td>
                        <button 
                          className="btn btn-secondary" 
                          style={{padding: '4px 8px', fontSize: '0.75rem', height: 'auto'}}
                          onClick={() => handleCompleteTransplant(a)}
                        >
                          Complete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* High-Urgency Recipients */}
        <div className="glass-card">
          <div className="section-title">
            <AlertTriangle size={18} style={{color:'var(--warning)'}} />
            High-Priority Recipients
          </div>
          {urgentRecipients.length === 0 ? (
            <div className="empty-state" style={{padding:24}}>
              <p>No recipients found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Organ</th>
                    <th>Urgency</th>
                    <th>Blood</th>
                  </tr>
                </thead>
                <tbody>
                  {urgentRecipients.map(r => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td className="text-slate text-sm">{r.organ_needed}</td>
                      <td>
                        <span className={`urgency-badge urgency-${r.medical_urgency >= 8 ? 'high' : r.medical_urgency >= 5 ? 'medium' : 'low'}`}>
                          {r.medical_urgency}
                        </span>
                      </td>
                      <td className="font-mono text-sm">{r.blood_group}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Matches and Overrides Row */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginTop:24}}>
        
        {/* Matches */}
        <div className="glass-card">
          <div className="section-title">
            <Activity size={18} style={{color:'#3aad8c'}} />
            Matches
          </div>
          {recentMatches.length === 0 ? (
            <div className="empty-state" style={{padding:24}}>
              <p>No matches yet</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Match ID</th>
                    <th>Organ ID</th>
                    <th>Recip. ID</th>
                    <th>Score</th>
                    <th>Selected</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMatches.map(m => {
                    const organIdStr = m.description?.match(/Organ ([\w]+)/)?.[1] || 'N/A';
                    const recipIdStr = m.description?.match(/Recipient ([\w]+)/)?.[1] || 'N/A';
                    return (
                    <tr key={m.id}>
                      <td className="font-mono text-xs text-slate">{m.allocation_id ? m.allocation_id.slice(0,8) : m.id.slice(0,8)}</td>
                      <td className="font-mono text-xs" title={organIdStr}>{organIdStr !== 'N/A' ? organIdStr.slice(0,5) + '…' : 'N/A'}</td>
                      <td className="font-mono text-xs" title={recipIdStr}>{recipIdStr !== 'N/A' ? recipIdStr.slice(0,5) + '…' : 'N/A'}</td>
                      <td className="font-mono text-xs">—</td>
                      <td>
                        <span className="badge badge-approved">
                          Yes
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Overrides */}
        <div className="glass-card">
          <div className="section-title">
            <AlertTriangle size={18} style={{color:'var(--warning)'}} />
            Overrides
          </div>
          {recentOverrides.length === 0 ? (
            <div className="empty-state" style={{padding:24}}>
              <p>No overrides yet</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Override ID</th>
                    <th>Match ID</th>
                    <th>Reason</th>
                    <th>User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOverrides.map(o => (
                    <tr key={o.id}>
                      <td className="font-mono text-xs text-slate">{o.id.slice(0,8)}</td>
                      <td className="font-mono text-xs" title={o.allocation_id}>{o.allocation_id ? o.allocation_id.slice(0,5) + '…' : 'N/A'}</td>
                      <td className="text-sm" title={o.override_reason || o.description}>
                        {o.override_reason ? (o.override_reason.length > 30 ? o.override_reason.slice(0,30) + '…' : o.override_reason) : (o.description ? o.description.slice(0, 30) + '…' : '—')}
                      </td>
                      <td className="font-mono text-xs">{o.user_id ? o.user_id.slice(0,5) + '…' : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
