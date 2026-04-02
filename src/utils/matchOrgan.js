// src/utils/matchOrgan.js
// Client-side Matching Engine
// Reads data from Firestore and computes eligibility scores in-browser.

import { db } from '../firebase/config';
import {
  doc, getDoc, collection, getDocs, query, where
} from 'firebase/firestore';
import { isBloodCompatible, proximityScore } from './helpers';

/**
 * Blood group compatibility check:
 *   score = (medical_urgency × 0.5) + (waiting_days × 0.3) + (proximity_score × 0.2)
 *
 * @param {string} organ_id - Firestore document ID of the organ to match
 * @returns {Object} { organ, matches: [{recipient, score, breakdown}], noMatch: boolean }
 */
async function matchOrgan(organ_id) {
  // 1. Fetch the organ document
  const organRef  = doc(db, 'organs', organ_id);
  const organSnap = await getDoc(organRef);

  if (!organSnap.exists()) {
    throw new Error(`Organ ${organ_id} not found`);
  }

  const organ = { id: organSnap.id, ...organSnap.data() };

  // Organ must be "available" to be matched
  if (organ.availability_status !== 'available') {
    return {
      organ,
      matches: [],
      noMatch: true,
      reason: `Organ is currently "${organ.availability_status}" — only "available" organs can be matched`,
    };
  }

  // 2. Fetch the donor's hospital (for proximity scoring)
  let donorHospital = null;
  if (organ.donor_id) {
    const donorSnap = await getDoc(doc(db, 'donors', organ.donor_id));
    if (donorSnap.exists()) {
      const donorData = donorSnap.data();
      if (donorData.hospital_id) {
        const hospSnap = await getDoc(doc(db, 'hospitals', donorData.hospital_id));
        if (hospSnap.exists()) donorHospital = hospSnap.data();
      }
    }
  }

  // 3. Fetch all recipients who need this organ type
  const recipientsQuery = query(
    collection(db, 'recipients'),
    where('organ_needed', '==', organ.organ_type)
  );
  const recipientsSnap = await getDocs(recipientsQuery);

  // 4. Filter by blood compatibility and collect hospital data
  const eligible = [];

  for (const rDoc of recipientsSnap.docs) {
    const recipient = { id: rDoc.id, ...rDoc.data() };

    // Blood group compatibility check
    if (!isBloodCompatible(organ.blood_group, recipient.blood_group)) continue;

    // Fetch recipient's hospital for proximity
    let recipientHospital = null;
    if (recipient.hospital_id) {
      const rHospSnap = await getDoc(doc(db, 'hospitals', recipient.hospital_id));
      if (rHospSnap.exists()) recipientHospital = rHospSnap.data();
    }

    const prox = proximityScore(donorHospital, recipientHospital);

    // 5. Calculate score
    const urgencyScore   = (Number(recipient.medical_urgency) || 0) * 0.5;
    const waitingScore   = (Number(recipient.waiting_days)    || 0) * 0.3;
    const proximityScore_= prox                                       * 0.2;
    const totalScore     = urgencyScore + waitingScore + proximityScore_;

    eligible.push({
      recipient,
      recipientHospital,
      score: Math.round(totalScore * 100) / 100,
      breakdown: {
        urgency:   Math.round(urgencyScore    * 100) / 100,
        waiting:   Math.round(waitingScore    * 100) / 100,
        proximity: Math.round(proximityScore_ * 100) / 100,
        rawProximityScore: prox,
      },
    });
  }

  // 6. No compatible recipients
  if (eligible.length === 0) {
    return {
      organ,
      matches: [],
      noMatch: true,
      reason: 'No compatible recipient found for this organ',
    };
  }

  // 7. Sort by score descending
  eligible.sort((a, b) => b.score - a.score);

  return {
    organ,
    matches:  eligible,
    noMatch:  false,
    topMatch: eligible[0],
  };
}

export default matchOrgan;
