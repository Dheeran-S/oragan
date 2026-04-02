// src/pages/AuditLogs.jsx
// Admin-only. Full audit trail with timestamp, user, action type, and filters.

import React, { useState, useEffect } from 'react';
import { ScrollText, Search, AlertCircle, ShieldAlert } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

const ACTION_TYPES = [
  'allocation_created', 'allocation_override', 'transplant_completed',
  'donor_added', 'recipient_added', 'organ_added',
];

export default function AuditLogs() {
  const { isAdmin } = useAuth();
  const navigate    = useNavigate();

  const [logs, setLogs]           = useState([]);
  const [search, setSearch]       = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDate, setFilterDate]     = useState('');

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, snap =>
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [isAdmin]);

  const filtered = logs.filter(l => {
    const matchSearch  = !search || l.description?.toLowerCase().includes(search.toLowerCase());
    const matchAction  = !filterAction || l.action_type === filterAction;
    const matchDate    = !filterDate || (
      l.timestamp?.toDate?.()?.toISOString().slice(0,10) === filterDate
    );
    return matchSearch && matchAction && matchDate;
  });

  const getActionBadge = (type) => {
    if (type?.includes('override')) return <span className="badge badge-override"><ShieldAlert style={{width:10,height:10}}/>{type}</span>;
    if (type?.includes('allocated') || type?.includes('allocation')) return <span className="badge badge-allocated">{type}</span>;
    if (type?.includes('transplant')) return <span className="badge badge-transplanted">{type}</span>;
    return <span className="badge badge-doctor">{type}</span>;
  };

  if (!isAdmin) return null;

  return (
    <div>
      <div className="page-header">
        <h1>Audit Logs</h1>
        <p>Complete tamper-evident audit trail of all system actions — Admin access only</p>
      </div>

      {/* Filters */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon"/>
          <input className="search-input" placeholder="Search log descriptions…"
            value={search} onChange={e => setSearch(e.target.value)} id="audit-search"/>
        </div>
        <select className="form-select" style={{width:200}} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="">All Action Types</option>
          {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          type="date"
          className="form-input"
          style={{width:160}}
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
        />
      </div>

      {/* Count */}
      <div className="text-sm text-muted mb-4">
        Showing <strong style={{color:'var(--white)'}}>{filtered.length}</strong> of {logs.length} entries
      </div>

      {/* Table */}
      <div className="glass-card" style={{padding:0}}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action Type</th>
                <th>User ID</th>
                <th>Description</th>
                <th>Allocation ID</th>
                <th>Override Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <ScrollText size={36}/>
                      <p>No audit logs found</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(log => (
                <tr key={log.id} style={log.action_type?.includes('override') ? {background:'rgba(232,164,74,0.04)'} : {}}>
                  <td className="font-mono text-xs text-muted">
                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('en-IN') : '—'}
                  </td>
                  <td>{getActionBadge(log.action_type)}</td>
                  <td className="font-mono text-xs text-muted">{log.user_id?.slice(0,14) || '—'}…</td>
                  <td style={{maxWidth:320, fontSize:'0.8rem', color:'rgba(255,255,255,0.75)'}}>
                    {log.description}
                  </td>
                  <td className="font-mono text-xs text-muted">{log.allocation_id?.slice(0,12) || '—'}</td>
                  <td>
                    {log.override_reason ? (
                      <div style={{
                        maxWidth: 200, fontSize:'0.78rem',
                        color:'var(--warning)', fontStyle:'italic',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
                      }} title={log.override_reason}>
                        "{log.override_reason}"
                      </div>
                    ) : <span className="text-muted text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
