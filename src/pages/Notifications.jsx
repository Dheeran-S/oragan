// src/pages/Notifications.jsx
// Real-time in-app notifications with mark-as-read functionality.

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCheck, AlertCircle } from 'lucide-react';
import { db } from '../firebase/config';
import {
  collection, onSnapshot, query, where, orderBy,
  updateDoc, doc, writeBatch,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';

export default function Notifications() {
  const { currentUser, userProfile } = useAuth();
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, snap =>
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [currentUser?.uid]);

  const markRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { status: 'read' });
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    const unread = notifs.filter(n => n.status === 'unread');
    if (!unread.length) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { status: 'read' }));
      await batch.commit();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifs.filter(n => n.status === 'unread').length;

  const getNotifIcon = (type, msg) => {
    if (msg?.toLowerCase().includes('allocation')) return '📋';
    if (msg?.toLowerCase().includes('organ'))      return '❤️';
    if (msg?.toLowerCase().includes('match'))      return '🔗';
    return '🔔';
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Notifications</h1>
          <p>
            {unreadCount > 0
              ? <><strong style={{color:'var(--slate)'}}>{unreadCount}</strong> unread notification{unreadCount !== 1 ? 's' : ''}</>
              : 'All caught up!'
            }
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead} disabled={loading} id="mark-all-read-btn">
            <CheckCheck size={14}/> Mark all as read
          </button>
        )}
      </div>

      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {notifs.length === 0 ? (
          <div className="glass-card">
            <div className="empty-state">
              <BellOff size={48}/>
              <p>No notifications yet</p>
            </div>
          </div>
        ) : notifs.map(n => (
          <div
            key={n.id}
            id={`notif-${n.id}`}
            style={{
              background: n.status === 'unread'
                ? 'rgba(92,124,137,0.12)'
                : 'rgba(31,73,89,0.2)',
              border: n.status === 'unread'
                ? '1px solid rgba(92,124,137,0.25)'
                : '1px solid rgba(92,124,137,0.1)',
              borderRadius:10,
              padding:'14px 18px',
              display:'flex',
              alignItems:'flex-start',
              gap:14,
              transition:'all 0.15s',
            }}
          >
            <div style={{fontSize:'1.3rem', lineHeight:1, marginTop:2}}>
              {getNotifIcon(n.type, n.message)}
            </div>
            <div style={{flex:1}}>
              <p style={{
                color: n.status === 'unread' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                fontSize:'0.875rem', marginBottom:4,
              }}>
                {n.message}
              </p>
              <span className="text-xs text-muted font-mono">
                {n.timestamp?.toDate ? n.timestamp.toDate().toLocaleString('en-IN') : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {n.status === 'unread' && (
                <div style={{
                  width:8, height:8, borderRadius:'50%',
                  background:'var(--slate)', flexShrink:0,
                }}/>
              )}
              {n.status === 'unread' && (
                <button
                  className="btn-icon"
                  title="Mark as read"
                  onClick={() => markRead(n.id)}
                  style={{padding:'5px'}}
                >
                  <CheckCheck size={13}/>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
