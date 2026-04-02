// src/utils/createAllocation.js
// Client-side Allocation Logic
// Uses Firestore batch writes for atomicity — no Cloud Functions needed.

import { db } from '../firebase/config';
import {
  collection, doc, writeBatch,
  serverTimestamp, getDoc
} from 'firebase/firestore';

/**
 * Create an organ allocation.
 *
 * Status flows:
 *   Organ:      available → allocated
 *   Allocation: pending   → approved
 *
 * Also writes an entry to audit_logs and creates in-app notifications.
 *
 * @param {Object} params
 * @param {string} params.organ_id        - Firestore ID of the organ
 * @param {string} params.recipient_id    - Firestore ID of the recipient
 * @param {number} params.priority_score  - Computed matching score
 * @param {boolean} params.is_override    - true if non-top-rank recipient selected
 * @param {string}  params.override_reason - Required when is_override = true
 * @param {Object}  params.currentUser    - { uid, name, role, hospital_id }
 * @param {string}  params.topRecipientId - ID of the top-ranked recipient (for override check)
 * @returns {Promise<string>} allocation_id
 */
async function createAllocation({
  organ_id,
  recipient_id,
  priority_score,
  is_override = false,
  override_reason = '',
  currentUser,
  topRecipientId,
}) {
  // Guard: override_reason must be provided if is_override
  if (is_override && (!override_reason || override_reason.trim() === '')) {
    throw new Error('An override reason is required when selecting a non-top-ranked recipient.');
  }

  // Verify organ still available
  const organSnap = await getDoc(doc(db, 'organs', organ_id));
  if (!organSnap.exists()) throw new Error('Organ not found');
  if (organSnap.data().availability_status !== 'available') {
    throw new Error('This organ is no longer available for allocation.');
  }

  // ── Open batch ──────────────────────────────────────────────────────────
  const batch = writeBatch(db);

  // 1. Create allocation record
  const allocationRef = doc(collection(db, 'allocations'));
  batch.set(allocationRef, {
    organ_id,
    recipient_id,
    status:          'approved',  // auto-approved
    priority_score,
    is_override,
    override_reason: is_override ? override_reason.trim() : '',
    approved_by:     currentUser?.uid || null,
    created_at:      serverTimestamp(),
  });

  // 2. Update organ status → allocated
  batch.update(doc(db, 'organs', organ_id), {
    availability_status: 'allocated',
  });

  // 3. Write audit log
  const auditRef = doc(collection(db, 'audit_logs'));
  batch.set(auditRef, {
    user_id:       currentUser?.uid || null,
    action_type:   is_override ? 'allocation_override' : 'allocation_created',
    description:   is_override
      ? `Override allocation: Organ ${organ_id} → Recipient ${recipient_id} (bypassed top match ${topRecipientId}). Reason: ${override_reason}`
      : `Allocation: Organ ${organ_id} → Recipient ${recipient_id}`,
    allocation_id: allocationRef.id,
    override_reason: is_override ? override_reason.trim() : '',
    timestamp:     serverTimestamp(),
  });

  // 4. Create in-app notification for current user's hospital
  const notifRef = doc(collection(db, 'notifications'));
  batch.set(notifRef, {
    user_id:   currentUser?.uid || null,
    message:   `Allocation confirmed: Organ ${organ_id} allocated to recipient ${recipient_id}`,
    type:      'in-app',
    status:    'unread',
    timestamp: serverTimestamp(),
  });

  // ── Commit batch ─────────────────────────────────────────────────────────
  await batch.commit();

  return allocationRef.id;
}

/**
 * Mark an allocation as completed (transplant done).
 * Updates allocation status → completed and organ status → transplanted.
 */
async function completeAllocation({ allocation_id, organ_id, currentUser }) {
  const batch = writeBatch(db);

  batch.update(doc(db, 'allocations', allocation_id), {
    status: 'completed',
  });

  batch.update(doc(db, 'organs', organ_id), {
    availability_status: 'transplanted',
  });

  const auditRef = doc(collection(db, 'audit_logs'));
  batch.set(auditRef, {
    user_id:       currentUser?.uid || null,
    action_type:   'transplant_completed',
    description:   `Transplant completed. Allocation ${allocation_id}, Organ ${organ_id}`,
    allocation_id,
    override_reason: '',
    timestamp:     serverTimestamp(),
  });

  await batch.commit();
}

export { createAllocation, completeAllocation };
export default createAllocation;
