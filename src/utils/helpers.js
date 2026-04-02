// src/utils/helpers.js
// Shared validation helpers, blood compatibility matrix, and formatting utilities

// ── Blood Group Compatibility ──────────────────────────────────────────────
// Key = recipient blood group → Value = array of compatible donor blood groups
export const BLOOD_COMPATIBILITY = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],  // Universal donor
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const ORGAN_TYPES   = ['Kidney', 'Liver', 'Heart', 'Lung', 'Pancreas', 'Intestine'];
export const DONOR_TYPES   = ['living', 'deceased'];
export const ORGAN_STATUSES= ['available', 'allocated', 'transplanted', 'expired'];

/**
 * Check if a donor's blood group is compatible with a recipient's blood group.
 * @param {string} donorBG   - e.g. "O+"
 * @param {string} recipientBG - e.g. "A+"
 * @returns {boolean}
 */
export function isBloodCompatible(donorBG, recipientBG) {
  const compatibleDonors = BLOOD_COMPATIBILITY[recipientBG] || [];
  return compatibleDonors.includes(donorBG);
}

// ── Validation ─────────────────────────────────────────────────────────────

export function validateBloodGroup(bg) {
  if (!BLOOD_GROUPS.includes(bg)) return 'Blood group must be one of: ' + BLOOD_GROUPS.join(', ');
  return null;
}

export function validateUrgency(u) {
  const n = Number(u);
  if (!Number.isInteger(n) || n < 1 || n > 10)
    return 'Medical urgency must be an integer between 1 and 10';
  return null;
}

export function validateWaitingDays(d) {
  const n = Number(d);
  if (isNaN(n) || n < 0) return 'Waiting days must be 0 or more';
  return null;
}

export function validateOrganType(t) {
  if (!ORGAN_TYPES.includes(t)) return 'Organ type must be one of: ' + ORGAN_TYPES.join(', ');
  return null;
}

export function validateRequired(value, fieldName) {
  if (!value || String(value).trim() === '') return `${fieldName} is required`;
  return null;
}

export function validateAge(age) {
  const n = Number(age);
  if (isNaN(n) || n < 0 || n > 120) return 'Age must be between 0 and 120';
  return null;
}

// Validate a full donor form object; returns { isValid, errors }
export function validateDonorForm(data) {
  const errors = {};
  errors.name       = validateRequired(data.name, 'Name');
  errors.age        = validateAge(data.age);
  errors.gender     = validateRequired(data.gender, 'Gender');
  errors.blood_group= validateBloodGroup(data.blood_group);
  errors.donor_type = validateRequired(data.donor_type, 'Donor type');
  errors.hospital_id= validateRequired(data.hospital_id, 'Hospital');

  // Remove null errors
  Object.keys(errors).forEach(k => !errors[k] && delete errors[k]);
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateRecipientForm(data) {
  const errors = {};
  errors.name          = validateRequired(data.name, 'Name');
  errors.age           = validateAge(data.age);
  errors.gender        = validateRequired(data.gender, 'Gender');
  errors.blood_group   = validateBloodGroup(data.blood_group);
  errors.organ_needed  = validateOrganType(data.organ_needed);
  errors.medical_urgency = validateUrgency(data.medical_urgency);
  errors.waiting_days  = validateWaitingDays(data.waiting_days);
  errors.hospital_id   = validateRequired(data.hospital_id, 'Hospital');

  Object.keys(errors).forEach(k => !errors[k] && delete errors[k]);
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateOrganForm(data) {
  const errors = {};
  errors.organ_type  = validateOrganType(data.organ_type);
  errors.blood_group = validateBloodGroup(data.blood_group);
  errors.donor_id    = validateRequired(data.donor_id, 'Donor');

  Object.keys(errors).forEach(k => !errors[k] && delete errors[k]);
  return { isValid: Object.keys(errors).length === 0, errors };
}

// ── Formatting Utilities ───────────────────────────────────────────────────

export function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDateShort(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatTimestamp(ts) {
  if (!ts) return '—';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

export function getUrgencyClass(urgency) {
  if (urgency >= 8) return 'urgency-high';
  if (urgency >= 5) return 'urgency-medium';
  return 'urgency-low';
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Compute proximity score between two hospitals.
 * @param {Object} h1 - { city, state }
 * @param {Object} h2 - { city, state }
 * @returns {number} 10 (same city) | 5 (same state) | 1 (different state)
 */
export function proximityScore(h1, h2) {
  if (!h1 || !h2) return 1;
  if (h1.city && h2.city && h1.city.toLowerCase() === h2.city.toLowerCase()) return 10;
  if (h1.state && h2.state && h1.state.toLowerCase() === h2.state.toLowerCase()) return 5;
  return 1;
}
