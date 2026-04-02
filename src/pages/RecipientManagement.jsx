// src/pages/RecipientManagement.jsx
// Recipient management: list table with urgency indicators, add/edit modal, inline urgency update.

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Users, AlertCircle } from 'lucide-react';
import { db } from '../firebase/config';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import {
  BLOOD_GROUPS, ORGAN_TYPES,
  validateRecipientForm, formatDateShort, capitalize, getUrgencyClass,
} from '../utils/helpers';

const EMPTY_FORM = {
  name: '', age: '', gender: '', blood_group: '',
  organ_needed: '', medical_urgency: '', waiting_days: '', hospital_id: '',
};

export default function RecipientManagement() {
  const { currentUser } = useAuth();

  const [recipients, setRecipients] = useState([]);
  const [hospitals, setHospitals]   = useState([]);
  const [search, setSearch]         = useState('');
  const [filterOrgan, setFilterOrgan] = useState('');
  const [filterBG, setFilterBG]     = useState('');
  const [modal, setModal]           = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'recipients'), orderBy('medical_urgency', 'desc'));
    return onSnapshot(q, snap =>
      setRecipients(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'hospitals'), snap =>
      setHospitals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = recipients.filter(r => {
    const matchSearch = !search || r.name?.toLowerCase().includes(search.toLowerCase());
    const matchOrgan  = !filterOrgan || r.organ_needed === filterOrgan;
    const matchBG     = !filterBG    || r.blood_group  === filterBG;
    return matchSearch && matchOrgan && matchBG;
  });

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModal(true);
  };

  const openEdit = (r) => {
    setEditId(r.id);
    setForm({
      name: r.name || '',
      age: r.age ?? '',
      gender: r.gender || '',
      blood_group: r.blood_group || '',
      organ_needed: r.organ_needed || '',
      medical_urgency: r.medical_urgency ?? '',
      waiting_days: r.waiting_days ?? '',
      hospital_id: r.hospital_id || '',
    });
    setErrors({});
    setModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: null }));
  };

  // Inline urgency update
  const handleUrgencyUpdate = async (id, newUrgency) => {
    const n = Number(newUrgency);
    if (isNaN(n) || n < 1 || n > 10) return;
    try {
      await updateDoc(doc(db, 'recipients', id), { medical_urgency: n });
    } catch (err) {
      showToast('Failed to update urgency: ' + err.message, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { isValid, errors: errs } = validateRecipientForm(form);
    if (!isValid) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        name:             form.name.trim(),
        age:              Number(form.age),
        gender:           form.gender,
        blood_group:      form.blood_group,
        organ_needed:     form.organ_needed,
        medical_urgency:  Number(form.medical_urgency),
        waiting_days:     Number(form.waiting_days),
        hospital_id:      form.hospital_id,
      };

      if (editId) {
        await updateDoc(doc(db, 'recipients', editId), payload);
        showToast('Recipient updated successfully');
      } else {
        await addDoc(collection(db, 'recipients'), {
          ...payload,
          created_by: currentUser?.uid || null,
          created_at: serverTimestamp(),
        });
        showToast('Recipient added successfully');
      }
      setModal(false);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recipient?')) return;
    try {
      await deleteDoc(doc(db, 'recipients', id));
      showToast('Recipient deleted');
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  return (
    <div>
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type === 'error' ? 'error' : 'success'}`}>
            <AlertCircle size={16} />{toast.msg}
          </div>
        </div>
      )}

      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Recipient Management</h1>
          <p>Track patients awaiting organ transplants — sorted by medical urgency</p>
        </div>
        <button id="add-recipient-btn" className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Recipient
        </button>
      </div>

      {/* Filters */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input className="search-input" placeholder="Search recipients by name…"
            value={search} onChange={e => setSearch(e.target.value)} id="recipient-search" />
        </div>
        <select className="form-select" style={{width:150}} value={filterOrgan} onChange={e => setFilterOrgan(e.target.value)}>
          <option value="">All Organ Types</option>
          {ORGAN_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="form-select" style={{width:140}} value={filterBG} onChange={e => setFilterBG(e.target.value)}>
          <option value="">All Blood Groups</option>
          {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{padding:0}}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Blood Group</th>
                <th>Organ Needed</th>
                <th>Urgency</th>
                <th>Waiting Days</th>
                <th>Hospital</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <Users size={36} />
                      <p>No recipients found</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(r => {
                const hospital = hospitals.find(h => h.id === r.hospital_id);
                return (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.age}</td>
                    <td><span className="font-mono text-sm">{r.blood_group}</span></td>
                    <td className="text-slate">{r.organ_needed}</td>
                    <td>
                      {/* Inline urgency edit */}
                      <div className="flex items-center gap-2">
                        <span className={`urgency-badge ${getUrgencyClass(r.medical_urgency)}`}>
                          {r.medical_urgency}
                        </span>
                        <input
                          type="number" min={1} max={10}
                          defaultValue={r.medical_urgency}
                          onBlur={e => handleUrgencyUpdate(r.id, e.target.value)}
                          className="form-input text-sm"
                          style={{width:60, padding:'4px 8px'}}
                          title="Click to update urgency"
                        />
                      </div>
                    </td>
                    <td>{r.waiting_days} days</td>
                    <td className="text-sm text-slate">{hospital?.name || '—'}</td>
                    <td className="text-xs text-muted">{formatDateShort(r.created_at)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-icon" onClick={() => openEdit(r)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-icon" style={{color:'var(--danger)'}} onClick={() => handleDelete(r.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Recipient' : 'Add New Recipient'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input name="name" className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Recipient's full name" value={form.name} onChange={handleChange} />
                  {errors.name && <span className="form-error"><AlertCircle size={12}/>{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Age *</label>
                  <input name="age" type="number" className={`form-input ${errors.age ? 'error' : ''}`}
                    placeholder="Age" value={form.age} onChange={handleChange} min={0} max={120} />
                  {errors.age && <span className="form-error"><AlertCircle size={12}/>{errors.age}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select name="gender" className={`form-select ${errors.gender ? 'error' : ''}`}
                    value={form.gender} onChange={handleChange}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.gender && <span className="form-error"><AlertCircle size={12}/>{errors.gender}</span>}
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

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Organ Needed *</label>
                  <select name="organ_needed" className={`form-select ${errors.organ_needed ? 'error' : ''}`}
                    value={form.organ_needed} onChange={handleChange}>
                    <option value="">Select organ</option>
                    {ORGAN_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {errors.organ_needed && <span className="form-error"><AlertCircle size={12}/>{errors.organ_needed}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Medical Urgency (1–10) *</label>
                  <input name="medical_urgency" type="number" min={1} max={10}
                    className={`form-input ${errors.medical_urgency ? 'error' : ''}`}
                    placeholder="1 (low) — 10 (critical)" value={form.medical_urgency} onChange={handleChange} />
                  {errors.medical_urgency && <span className="form-error"><AlertCircle size={12}/>{errors.medical_urgency}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Waiting Days *</label>
                  <input name="waiting_days" type="number" min={0}
                    className={`form-input ${errors.waiting_days ? 'error' : ''}`}
                    placeholder="Days on waiting list" value={form.waiting_days} onChange={handleChange} />
                  {errors.waiting_days && <span className="form-error"><AlertCircle size={12}/>{errors.waiting_days}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Hospital *</label>
                  <select name="hospital_id" className={`form-select ${errors.hospital_id ? 'error' : ''}`}
                    value={form.hospital_id} onChange={handleChange}>
                    <option value="">Select hospital</option>
                    {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                  {errors.hospital_id && <span className="form-error"><AlertCircle size={12}/>{errors.hospital_id}</span>}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading} id="recipient-form-submit">
                  {loading ? <><span className="loading-spinner" style={{width:16,height:16}}/> Saving…</> : (editId ? 'Update Recipient' : 'Add Recipient')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
