// src/pages/HospitalManagement.jsx
// Admin-only hospital management page.

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Building2, AlertCircle } from 'lucide-react';
import { db } from '../firebase/config';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const EMPTY_FORM = { name: '', address: '', city: '', state: '', contact_number: '', transplant_facility: false };

export default function HospitalManagement() {
  const { isAdmin } = useAuth();
  const navigate    = useNavigate();

  const [hospitals, setHospitals] = useState([]);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState(null);

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    return onSnapshot(collection(db, 'hospitals'), snap =>
      setHospitals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [isAdmin]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = hospitals.filter(h =>
    !search || h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.city?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModal(true);
  };

  const openEdit = (h) => {
    setEditId(h.id);
    setForm({
      name: h.name || '', address: h.address || '',
      city: h.city || '', state: h.state || '',
      contact_number: h.contact_number || '',
      transplant_facility: h.transplant_facility ?? false,
    });
    setErrors({});
    setModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm(f => ({ ...f, [name]: val }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: null }));
  };

  const validate = (f) => {
    const errs = {};
    if (!f.name.trim())  errs.name  = 'Hospital name is required';
    if (!f.city.trim())  errs.city  = 'City is required';
    if (!f.state.trim()) errs.state = 'State is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        name:                form.name.trim(),
        address:             form.address.trim(),
        city:                form.city.trim(),
        state:               form.state.trim(),
        contact_number:      form.contact_number.trim(),
        transplant_facility: form.transplant_facility,
      };

      if (editId) {
        await updateDoc(doc(db, 'hospitals', editId), payload);
        showToast('Hospital updated');
      } else {
        await addDoc(collection(db, 'hospitals'), { ...payload, created_at: serverTimestamp() });
        showToast('Hospital added');
      }
      setModal(false);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hospital? This will not remove associated donors/recipients.')) return;
    try {
      await deleteDoc(doc(db, 'hospitals', id));
      showToast('Hospital deleted');
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  if (!isAdmin) return null;

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
          <h1>Hospital Management</h1>
          <p>Manage transplant facilities across the network</p>
        </div>
        <button id="add-hospital-btn" className="btn btn-primary" onClick={openAdd}>
          <Plus size={16}/> Add Hospital
        </button>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon"/>
          <input className="search-input" placeholder="Search by name or city…"
            value={search} onChange={e => setSearch(e.target.value)} id="hospital-search"/>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16}}>
        {filtered.length === 0 ? (
          <div className="glass-card" style={{gridColumn:'1/-1'}}>
            <div className="empty-state">
              <Building2 size={40}/>
              <p>No hospitals found</p>
            </div>
          </div>
        ) : filtered.map(h => (
          <div key={h.id} className="glass-card">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div style={{
                  width:36, height:36, borderRadius:8,
                  background:'rgba(92,124,137,0.15)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--slate)',
                }}>
                  <Building2 size={18}/>
                </div>
                <div>
                  <div style={{fontWeight:600, fontSize:'0.95rem'}}>{h.name}</div>
                  <div className="text-xs text-muted">{h.city}, {h.state}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-icon" onClick={() => openEdit(h)}><Edit2 size={13}/></button>
                <button className="btn-icon" style={{color:'var(--danger)'}} onClick={() => handleDelete(h.id)}><Trash2 size={13}/></button>
              </div>
            </div>

            {h.address && <p style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', marginBottom:8}}>{h.address}</p>}
            {h.contact_number && (
              <p className="text-sm text-slate" style={{marginBottom:8}}>📞 {h.contact_number}</p>
            )}
            {h.transplant_facility && (
              <span className="badge badge-available">✓ Transplant Facility</span>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Hospital' : 'Add Hospital'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label">Hospital Name *</label>
                <input name="name" className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="e.g. Apollo Hospital" value={form.name} onChange={handleChange}/>
                {errors.name && <span className="form-error"><AlertCircle size={12}/>{errors.name}</span>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input name="city" className={`form-input ${errors.city ? 'error' : ''}`}
                    placeholder="City" value={form.city} onChange={handleChange}/>
                  {errors.city && <span className="form-error"><AlertCircle size={12}/>{errors.city}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <input name="state" className={`form-input ${errors.state ? 'error' : ''}`}
                    placeholder="State" value={form.state} onChange={handleChange}/>
                  {errors.state && <span className="form-error"><AlertCircle size={12}/>{errors.state}</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea name="address" className="form-textarea" rows={2}
                  placeholder="Full address" value={form.address} onChange={handleChange}/>
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input name="contact_number" className="form-input"
                  placeholder="+91 XXXXXXXXXX" value={form.contact_number} onChange={handleChange}/>
              </div>
              <div className="form-group" style={{flexDirection:'row', alignItems:'center', gap:12}}>
                <input type="checkbox" id="transplant_facility" name="transplant_facility"
                  checked={form.transplant_facility} onChange={handleChange}
                  style={{width:16, height:16, cursor:'pointer'}}/>
                <label htmlFor="transplant_facility" className="form-label" style={{marginBottom:0, cursor:'pointer'}}>
                  Designated Transplant Facility
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading} id="hospital-form-submit">
                  {loading ? <><span className="loading-spinner" style={{width:16,height:16}}/> Saving…</> : (editId ? 'Update' : 'Add Hospital')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
