// src/pages/Dashboard.jsx
// Real-time dashboard with stat cards, charts, and live Firestore listeners.

import React, { useState, useEffect } from 'react';
import {
  Heart, Users, ClipboardList, Activity,
  TrendingUp, Clock, AlertTriangle,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { db } from '../firebase/config';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';

const CHART_COLORS = {
  kidney:   '#5B9BD5',
  liver:    '#3aad8c',
  heart:    '#d95f5f',
  lung:     '#e8a44a',
  pancreas: '#5C7C89',
  intestine:'#9b7fd4',
};

export default function Dashboard() {
  const { userProfile } = useAuth();

  // Live counts from Firestore
  const [stats, setStats]             = useState({ organs: 0, recipients: 0, allocations: 0, transplants: 0 });
  const [recentAllocs, setRecentAllocs] = useState([]);
  const [organsByType, setOrgansByType] = useState([]);
  const [monthlyData, setMonthlyData]   = useState([]);
  const [urgentRecipients, setUrgentRecipients] = useState([]);

  // Organs listener
  useEffect(() => {
    const qAvail = query(collection(db, 'organs'), where('availability_status', '==', 'available'));
    return onSnapshot(qAvail, snap => {
      setStats(s => ({ ...s, organs: snap.size }));

      // Organs by type (pie)
      const typeCounts = {};
      snap.docs.forEach(d => {
        const t = d.data().organ_type || 'Unknown';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      setOrgansByType(Object.entries(typeCounts).map(([name, value]) => ({ name, value })));
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

  // Static monthly mock data (replaced with real data when audit_logs aggregation is available)
  useEffect(() => {
    setMonthlyData([
      { month: 'Oct', donors: 3, allocations: 2, transplants: 1 },
      { month: 'Nov', donors: 5, allocations: 4, transplants: 3 },
      { month: 'Dec', donors: 4, allocations: 3, transplants: 2 },
      { month: 'Jan', donors: 7, allocations: 5, transplants: 4 },
      { month: 'Feb', donors: 6, allocations: 6, transplants: 5 },
      { month: 'Mar', donors: 8, allocations: 7, transplants: 6 },
    ]);
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

  const CUSTOM_TOOLTIP_STYLE = {
    background: '#0d2133',
    border: '1px solid rgba(92,124,137,0.3)',
    borderRadius: 8,
    color: '#fff',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 12,
  };

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

      {/* Charts Row */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:'20px', marginBottom:24}}>

        {/* Area Chart — Monthly Activity */}
        <div className="chart-wrapper">
          <div className="chart-title">Monthly Activity Trend</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyData} margin={{top:5,right:10,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="gradDonors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#5B9BD5" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#5B9BD5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradAlloc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3aad8c" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3aad8c" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradTransplant" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e8a44a" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#e8a44a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(92,124,137,0.1)" />
              <XAxis dataKey="month" tick={{fill:'rgba(255,255,255,0.4)', fontSize:11}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:'rgba(255,255,255,0.4)', fontSize:11}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{fontSize:11, color:'rgba(255,255,255,0.6)'}} />
              <Area type="monotone" dataKey="donors"       stroke="#5B9BD5" fill="url(#gradDonors)"    strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="allocations"  stroke="#3aad8c" fill="url(#gradAlloc)"     strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="transplants"  stroke="#e8a44a" fill="url(#gradTransplant)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart — Organs by Type */}
        <div className="chart-wrapper">
          <div className="chart-title">Organs by Type</div>
          {organsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={organsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {organsByType.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={Object.values(CHART_COLORS)[i % Object.values(CHART_COLORS).length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend
                  wrapperStyle={{fontSize:11, color:'rgba(255,255,255,0.6)'}}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{padding:40}}>
              <Heart size={36} style={{opacity:0.2, margin:'0 auto 8px', display:'block'}} />
              <p>No available organs yet</p>
            </div>
          )}
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
    </div>
  );
}
