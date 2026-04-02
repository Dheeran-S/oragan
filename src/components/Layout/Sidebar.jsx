// src/components/Layout/Sidebar.jsx
// Main navigation sidebar with role-based visibility and real-time notification count.

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Heart, GitMerge,
  ClipboardList, ScrollText, Bell, LogOut, Activity,
  ChevronLeft, ChevronRight, Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/dashboard',   label: 'Dashboard',       icon: LayoutDashboard, roles: ['admin', 'doctor'] },
  { path: '/donors',      label: 'Donors',           icon: UserPlus,        roles: ['admin', 'doctor'] },
  { path: '/recipients',  label: 'Recipients',       icon: Users,           roles: ['admin', 'doctor'] },
  { path: '/organs',      label: 'Organs',           icon: Heart,           roles: ['admin', 'doctor'] },
  { path: '/matching',    label: 'Matching',         icon: GitMerge,        roles: ['admin', 'doctor'] },
  { path: '/allocation',  label: 'Allocation',       icon: ClipboardList,   roles: ['admin', 'doctor'] },
  { path: '/hospitals',   label: 'Hospitals',        icon: Building2,       roles: ['admin'] },
  { path: '/audit-logs',  label: 'Audit Logs',       icon: ScrollText,      roles: ['admin'] },
];

export default function Sidebar() {
  const { userProfile, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Real-time unread notifications count
  useEffect(() => {
    if (!userProfile?.id) return;
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', userProfile.id),
      where('status', '==', 'unread')
    );
    const unsub = onSnapshot(q, snap => setUnreadCount(snap.size));
    return () => unsub();
  }, [userProfile?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role  = userProfile?.role || 'doctor';
  const items = NAV_ITEMS.filter(n => n.roles.includes(role));

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <Activity size={22} strokeWidth={2} />
        </div>
        {!collapsed && (
          <div>
            <span className="sidebar-brand-name">OrganNet</span>
            <span className="sidebar-brand-sub">Procurement System</span>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed(v => !v)}
        aria-label="Toggle sidebar"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {items.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
            title={collapsed ? item.label : ''}
          >
            <item.icon size={18} strokeWidth={1.75} className="sidebar-link-icon" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Notifications */}
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
          }
          title={collapsed ? 'Notifications' : ''}
        >
          <div className="sidebar-notif-icon">
            <Bell size={18} strokeWidth={1.75} className="sidebar-link-icon" />
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
          {!collapsed && <span>Notifications</span>}
          {!collapsed && unreadCount > 0 && (
            <span className="notif-count">{unreadCount}</span>
          )}
        </NavLink>
      </nav>

      {/* User Profile */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(userProfile?.name || 'U')[0].toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{userProfile?.name || 'User'}</span>
              <span className={`badge badge-${role} sidebar-user-role`}>
                {role}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="sidebar-logout-btn"
          title={collapsed ? 'Logout' : ''}
        >
          <LogOut size={16} strokeWidth={1.75} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
