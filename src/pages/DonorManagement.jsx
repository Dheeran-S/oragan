// src/pages/DonorManagement.jsx
// Full donor management: list (with live updates), add/edit modal, search/filter.

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, UserPlus, AlertCircle } from 'lucide-react';
import { db } from '../firebase/config';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import {
  BLOOD_GROUPS, DONOR_TYPES,
  validateDonorForm, formatDateShort, capitalize,
} from '../utils/helpers';

const EMPTY_FORM = {
  name: '', age: '', gender: '', blood_group: '',
  donor_type: '', medical_history: '', consent_status: 'true',
  hospital_id: '',
};

export default function DonorManagement() {
  const { currentUser, userProfile } = useAuth();

  const [donors, setDonors]         = useState([]);
  const [hospitals, setHospitals]   = useState([]);
  const [search, setSearch]         = useState('');
  const [filterBG, setFilterBG]     = useState('');
  const [filterType, setFilterType] = useState('');
  const [modal, setModal]           = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState(null);

  // Real-time donors
  useEffect(() => {
    const q = query(collection(db, 'donors'), orderBy('created_at', 'desc'));
    return onSnapshot(q, snap =>
      setDonors(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  // Hospitals for dropdown
  useEffect(() => {
    return onSnapshot(collection(db, 'hospitals'), snap =>
      setHospitals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter/search
  const filtered = donors.filter(d => {
    const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase());
    const matchBG     = !filterBG   || d.blood_group === filterBG;
    const matchType   = !filterType || d.donor_type  === filterType;
    return matchSearch && matchBG && matchType;
  });

  // Open Add modal
  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModal(true);
  };

  // Open Edit modal
  const openEdit = (donor) => {
    setEditId(donor.id);
    setForm({
      name: donor.name || '',
      age: donor.age ?? '',
      gender: donor.gender || '',
      blood_group: donor.blood_group || '',
      donor_type: donor.donor_type || '',
      medical_history: donor.medical_history || '',
      consent_status: String(donor.consent_status ?? 'true'),
      hospital_id: donor.hospital_id || '',
    });
    setErrors({});
    setModal(true);
  };

  // Field change with real-time validation
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: null }));
  };

  // Submit Add/Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { isValid, errors: errs } = validateDonorForm(form);
    if (!isValid) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        name:            form.name.trim(),
        age:             Number(form.age),
        gender:          form.gender,
        blood_group:     form.blood_group,
        donor_type:      form.donor_type,
        medical_history: form.medical_history.trim(),
        consent_status:  form.consent_status === 'true',
        hospital_id:     form.hospital_id,
      };

      if (editId) {
        await updateDoc(doc(db, 'donors', editId), payload);
        showToast('Donor updated successfully');
      } else {
        await addDoc(collection(db, 'donors'), {
          ...payload,
          created_by: currentUser?.uid || null,
          created_at: serverTimestamp(),
        });
        showToast('Donor added successfully');
      }
      setModal(false);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this donor? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'donors', id));
      showToast('Donor deleted');
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type === 'error' ? 'error' : 'success'}`}>
            <AlertCircle size={16} />
            {toast.msg}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Donor Management</h1>
          <p>Manage organ donors across all hospitals</p>
        </div>
        <button id="add-donor-btn" className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Donor
        </button>
      </div>

      {/* Search & Filters */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input
            className="search-input"
            placeholder="Search donors by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="donor-search"
          />
        </div>
        <select className="form-select" style={{width:140}} value={filterBG} onChange={e => setFilterBG(e.target.value)}>
          <option value="">All Blood Groups</option>
          {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
        </select>
        <select className="form-select" style={{width:140}} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {DONOR_TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
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
                <th>Gender</th>
                <th>Blood Group</th>
                <th>Type</th>
                <th>Consent</th>
                <th>Hospital</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      <UserPlus size={36} />
                      <p>No donors found. Add one to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(donor => {
                const hospital = hospitals.find(h => h.id === donor.hospital_id);
                return (
                  <tr key={donor.id}>
                    <td><strong>{donor.name}</strong></td>
                    <td>{donor.age}</td>
                    <td>{capitalize(donor.gender)}</td>
                    <td><span className="font-mono text-sm">{donor.blood_group}</span></td>
                    <td>
                      <span className={`badge badge-${donor.donor_type}`}>
                        <span className="badge-dot" />
                        {capitalize(donor.donor_type)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${donor.consent_status ? 'available' : 'expired'}`}>
                        {donor.consent_status ? 'Consented' : 'Not consented'}
                      </span>
                    </td>
                    <td className="text-sm text-slate">{hospital?.name || '—'}</td>
                    <td className="text-xs text-muted">{formatDateShort(donor.created_at)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-icon" onClick={() => openEdit(donor)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-icon" style={{color:'var(--danger)'}} onClick={() => handleDelete(donor.id)} title="Delete">
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
              <h3 className="modal-title">{editId ? 'Edit Donor' : 'Add New Donor'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input name="name" className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Donor's full name" value={form.name} onChange={handleChange} />
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
                  <label className="form-label">Donor Type *</label>
                  <select name="donor_type" className={`form-select ${errors.donor_type ? 'error' : ''}`}
                    value={form.donor_type} onChange={handleChange}>
                    <option value="">Select type</option>
                    {DONOR_TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
                  </select>
                  {errors.donor_type && <span className="form-error"><AlertCircle size={12}/>{errors.donor_type}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Consent Status</label>
                  <select name="consent_status" className="form-select"
                    value={form.consent_status} onChange={handleChange}>
                    <option value="true">Consented</option>
                    <option value="false">Not consented</option>
                  </select>
                </div>
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

              <div className="form-group">
                <label className="form-label">Medical History</label>
                <textarea name="medical_history" className="form-textarea"
                  placeholder="Relevant medical history, conditions, medications…"
                  value={form.medical_history} onChange={handleChange} rows={3} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading} id="donor-form-submit">
                  {loading ? <><span className="loading-spinner" style={{width:16,height:16}}/> Saving…</> : (editId ? 'Update Donor' : 'Add Donor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
