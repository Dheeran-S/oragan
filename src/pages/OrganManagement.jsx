// src/pages/OrganManagement.jsx
// Organ management: add organs (linked to donors), view status badges, status flow indicator.

import React, { useState, useEffect } from 'react';
import { Plus, Search, Heart, AlertCircle, ArrowRight } from 'lucide-react';
import { db } from '../firebase/config';
import {
  collection, onSnapshot, addDoc, doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import {
  BLOOD_GROUPS, ORGAN_TYPES, ORGAN_STATUSES,
  validateOrganForm, formatDateShort,
} from '../utils/helpers';

const EMPTY_FORM = { organ_type: '', blood_group: '', donor_id: '' };

const STATUS_FLOW = ['available', 'allocated', 'transplanted'];

export default function OrganManagement() {
  const { currentUser } = useAuth();

  const [organs, setOrgans]     = useState([]);
  const [donors, setDonors]     = useState([]);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType]     = useState('');
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'organs'), orderBy('created_at', 'desc'));
    return onSnapshot(q, snap =>
      setOrgans(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'donors'), snap =>
      setDonors(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = organs.filter(o => {
    const matchSearch = !search || o.organ_type?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || o.availability_status === filterStatus;
    const matchType   = !filterType   || o.organ_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const openModal = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: null }));
  };

  // Auto-populate blood group from selected donor
  const handleDonorChange = (e) => {
    const donorId = e.target.value;
    const donor   = donors.find(d => d.id === donorId);
    setForm(f => ({
      ...f,
      donor_id:    donorId,
      blood_group: donor?.blood_group || f.blood_group,
    }));
    if (errors.donor_id) setErrors(er => ({ ...er, donor_id: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { isValid, errors: errs } = validateOrganForm(form);
    if (!isValid) { setErrors(errs); return; }

    setLoading(true);
    try {
      await addDoc(collection(db, 'organs'), {
        organ_type:          form.organ_type,
        blood_group:         form.blood_group,
        donor_id:            form.donor_id,
        availability_status: 'available',
        created_at:          serverTimestamp(),
      });

      // Notify all users — new organ available
      await addDoc(collection(db, 'notifications'), {
        user_id:   currentUser?.uid || null,
        message:   `New ${form.organ_type} (${form.blood_group}) organ is now available.`,
        type:      'in-app',
        status:    'unread',
        timestamp: serverTimestamp(),
      });

      showToast(`${form.organ_type} organ added successfully`);
      setModal(false);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':   return 'var(--success)';
      case 'allocated':   return 'var(--info)';
      case 'transplanted':return 'var(--slate)';
      case 'expired':     return 'var(--danger)';
      default:            return 'var(--slate)';
    }
  };

  return (
    <div>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type === 'error' ? 'error' : 'success'}`}>
            <AlertCircle size={16}/>{toast.msg}
          </div>
        </div>
      )}

      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Organ Management</h1>
          <p>Track organ availability and status through the transplant pipeline</p>
        </div>
        <button id="add-organ-btn" className="btn btn-primary" onClick={openModal}>
          <Plus size={16}/> Add Organ
        </button>
      </div>

      {/* Status Flow Diagram */}
      <div className="glass-card flex items-center gap-3 mb-6" style={{padding:'14px 20px', flexWrap:'wrap'}}>
        <span className="text-xs text-muted" style={{letterSpacing:'0.05em', textTransform:'uppercase'}}>Status Flow:</span>
        {STATUS_FLOW.map((s, i) => (
          <React.Fragment key={s}>
            <span className={`badge badge-${s}`}>
              <span className="badge-dot" />{s}
            </span>
            {i < STATUS_FLOW.length - 1 && <ArrowRight size={14} style={{color:'var(--slate)', opacity:0.5}} />}
          </React.Fragment>
        ))}
        <span className="text-xs text-muted" style={{marginLeft:8}}>+</span>
        <span className="badge badge-expired"><span className="badge-dot"/>expired</span>
      </div>

      {/* Filters */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon"/>
          <input className="search-input" placeholder="Search by organ type…"
            value={search} onChange={e => setSearch(e.target.value)} id="organ-search"/>
        </div>
        <select className="form-select" style={{width:150}} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Organ Types</option>
          {ORGAN_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="form-select" style={{width:150}} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {ORGAN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{padding:0}}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Organ ID</th>
                <th>Organ Type</th>
                <th>Blood Group</th>
                <th>Donor</th>
                <th>Status</th>
                <th>Added On</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <Heart size={36}/>
                      <p>No organs registered yet</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(organ => {
                const donor = donors.find(d => d.id === organ.donor_id);
                return (
                  <tr key={organ.id}>
                    <td className="font-mono text-xs text-muted">{organ.id.slice(0,10)}…</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Heart size={14} style={{color: getStatusColor(organ.availability_status)}}/>
                        <strong>{organ.organ_type}</strong>
                      </div>
                    </td>
                    <td><span className="font-mono text-sm">{organ.blood_group}</span></td>
                    <td className="text-slate text-sm">{donor?.name || '—'}</td>
                    <td>
                      <span className={`badge badge-${organ.availability_status}`}>
                        <span className="badge-dot"/>
                        {organ.availability_status}
                      </span>
                    </td>
                    <td className="text-xs text-muted">{formatDateShort(organ.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add New Organ</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label">Donor *</label>
                <select name="donor_id" className={`form-select ${errors.donor_id ? 'error' : ''}`}
                  value={form.donor_id} onChange={handleDonorChange}>
                  <option value="">Select donor</option>
                  {donors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.blood_group} ({d.donor_type})
                    </option>
                  ))}
                </select>
                {errors.donor_id && <span className="form-error"><AlertCircle size={12}/>{errors.donor_id}</span>}
                <span className="form-hint">Selecting a donor auto-fills blood group</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Organ Type *</label>
                  <select name="organ_type" className={`form-select ${errors.organ_type ? 'error' : ''}`}
                    value={form.organ_type} onChange={handleChange}>
                    <option value="">Select organ</option>
                    {ORGAN_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {errors.organ_type && <span className="form-error"><AlertCircle size={12}/>{errors.organ_type}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Blood Group *</label>
                  <select name="blood_group" className={`form-select ${errors.blood_group ? 'error' : ''}`}
                    value={form.blood_group} onChange={handleChange}>
                    <option value="">Select blood group</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                  {errors.blood_group && <span className="form-error"><AlertCircle size={12}/>{errors.blood_group}</span>}
                </div>
              </div>

              <div className="alert alert-info" style={{marginBottom:0}}>
                <AlertCircle size={14}/>
                New organs are automatically set to <strong>Available</strong> status.
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading} id="organ-form-submit">
                  {loading ? <><span className="loading-spinner" style={{width:16,height:16}}/> Adding…</> : 'Add Organ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
