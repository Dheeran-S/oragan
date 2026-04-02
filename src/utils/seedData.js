// src/utils/seedData.js
// Seed script — creates demo hospitals, users, donors, recipients, organs, allocations & audit logs.
// Strategy: Create Admin auth account → sign in as admin → write all Firestore data.

import { db, auth } from '../firebase/config';
import {
  collection, addDoc, setDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

export async function seedDatabase() {
  console.log('🌱 Starting database seed…');

  // ── Step 1: Create / sign-in Admin account first ─────────────────────────
  // We need to be authenticated before writing Firestore docs (security rules).
  const ADMIN_EMAIL    = 'admin@organnet.com';
  const ADMIN_PASSWORD = 'admin123';

  let adminUid;

  try {
    const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminUid   = cred.user.uid;
    console.log(`✅ Admin account created: ${ADMIN_EMAIL}`);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      console.log(`⚠️  Admin already exists — signing in…`);
      const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      adminUid   = cred.user.uid;
      console.log(`✅ Signed in as admin`);
    } else {
      throw new Error(`Failed to create admin: ${e.message}`);
    }
  }

  // Write admin's Firestore profile (will be updated with hospital_id later)
  await setDoc(doc(db, 'users', adminUid), {
    name:        'Dr. Admin Kumar',
    email:       ADMIN_EMAIL,
    role:        'admin',
    hospital_id: '', // placeholder, updated below
    created_at:  serverTimestamp(),
  });
  console.log('✅ Admin Firestore profile created');

  // ── Step 2: Hospitals ─────────────────────────────────────────────────────
  const hospitalRefs = {};
  const hospitals = [
    {
      name: 'Apollo Hospitals Chennai',
      city: 'Chennai', state: 'Tamil Nadu',
      address: '21 Greams Lane, Thousand Lights, Chennai',
      contact_number: '+91-44-28290200', transplant_facility: true,
    },
    {
      name: 'AIIMS Delhi',
      city: 'New Delhi', state: 'Delhi',
      address: 'Ansari Nagar East, New Delhi 110029',
      contact_number: '+91-11-26588500', transplant_facility: true,
    },
    {
      name: 'Manipal Hospital Bengaluru',
      city: 'Bengaluru', state: 'Karnataka',
      address: '98 HAL Airport Road, Bengaluru 560017',
      contact_number: '+91-80-25023452', transplant_facility: true,
    },
  ];

  for (const h of hospitals) {
    try {
      const ref = await addDoc(collection(db, 'hospitals'), { ...h, created_at: serverTimestamp() });
      hospitalRefs[h.name] = ref.id;
      console.log(`✅ Hospital: ${h.name} → ${ref.id}`);
    } catch (e) {
      throw new Error(`Failed writing hospital ${h.name}: ${e.message}`);
    }
  }

  const hospChennai   = hospitalRefs['Apollo Hospitals Chennai'];
  const hospDelhi     = hospitalRefs['AIIMS Delhi'];
  const hospBengaluru = hospitalRefs['Manipal Hospital Bengaluru'];

  // Update admin's hospital_id
  await setDoc(doc(db, 'users', adminUid), {
    name: 'Dr. Admin Kumar', email: ADMIN_EMAIL,
    role: 'admin', hospital_id: hospChennai, created_at: serverTimestamp(),
  });

  // ── Step 3: Doctor accounts ────────────────────────────────────────────────
  const doctorUsers = [
    { email: 'dralice@hospitalA.com', password: 'doctor123', name: 'Dr. Alice Sharma', hospital_id: hospDelhi     },
    { email: 'drbob@hospitalB.com',   password: 'doctor123', name: 'Dr. Bob Mathew',   hospital_id: hospBengaluru },
  ];

  const userIds = { [ADMIN_EMAIL]: adminUid };

  for (const u of doctorUsers) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, u.email, u.password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: u.name, email: u.email,
        role: 'doctor', hospital_id: u.hospital_id, created_at: serverTimestamp(),
      });
      userIds[u.email] = cred.user.uid;
      console.log(`✅ Doctor: ${u.email}`);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        console.log(`⚠️  Already exists: ${u.email}`);
      } else {
        console.log(`❌ Error creating ${u.email}: ${e.message}`);
      }
    }
  }

  // Sign back in as admin after creating other accounts (Firebase signs us into the last created)
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log('✅ Re-signed in as admin for Firestore writes');

  // ── Step 4: Donors ────────────────────────────────────────────────────────
  const donorRefs = {};
  const donors = [
    { name: 'Rajesh Mehta',  age: 45, gender: 'male',   blood_group: 'O+',  donor_type: 'deceased', consent_status: true,  hospital_id: hospChennai,   medical_history: 'Brain dead due to road accident. Healthy organs confirmed.' },
    { name: 'Priya Nair',    age: 32, gender: 'female', blood_group: 'A+',  donor_type: 'living',   consent_status: true,  hospital_id: hospDelhi,     medical_history: 'Donating one kidney to sibling. No pre-existing conditions.' },
    { name: 'Suresh Pillai', age: 55, gender: 'male',   blood_group: 'B+',  donor_type: 'deceased', consent_status: true,  hospital_id: hospBengaluru, medical_history: 'Cardiac arrest. Liver and kidneys viable.' },
    { name: 'Ananya Das',    age: 28, gender: 'female', blood_group: 'AB-', donor_type: 'living',   consent_status: true,  hospital_id: hospChennai,   medical_history: 'Voluntary donor. Full health check completed.' },
    { name: 'Vikram Singh',  age: 39, gender: 'male',   blood_group: 'O-',  donor_type: 'deceased', consent_status: false, hospital_id: hospDelhi,     medical_history: 'Consent pending from family. Organs on ice.' },
  ];

  for (const d of donors) {
    try {
      const ref = await addDoc(collection(db, 'donors'), { ...d, created_by: adminUid, created_at: serverTimestamp() });
      donorRefs[d.name] = ref.id;
      console.log(`✅ Donor: ${d.name}`);
    } catch (e) {
      throw new Error(`Failed writing donor ${d.name}: ${e.message}`);
    }
  }

  // ── Step 5: Recipients ────────────────────────────────────────────────────
  const recipientRefs = {};
  const recipients = [
    { name: 'Kavitha Rajan',  age: 42, gender: 'female', blood_group: 'O+',  organ_needed: 'Kidney',   medical_urgency: 9,  waiting_days: 120, hospital_id: hospChennai   },
    { name: 'Mohan Desai',    age: 60, gender: 'male',   blood_group: 'A+',  organ_needed: 'Liver',    medical_urgency: 8,  waiting_days: 90,  hospital_id: hospDelhi     },
    { name: 'Sunita Verma',   age: 35, gender: 'female', blood_group: 'B+',  organ_needed: 'Heart',    medical_urgency: 10, waiting_days: 45,  hospital_id: hospBengaluru },
    { name: 'Arun Krishnan',  age: 48, gender: 'male',   blood_group: 'AB-', organ_needed: 'Liver',    medical_urgency: 7,  waiting_days: 200, hospital_id: hospChennai   },
    { name: 'Lakshmi Rao',    age: 25, gender: 'female', blood_group: 'O-',  organ_needed: 'Kidney',   medical_urgency: 6,  waiting_days: 60,  hospital_id: hospDelhi     },
    { name: 'Gopal Sharma',   age: 55, gender: 'male',   blood_group: 'A-',  organ_needed: 'Pancreas', medical_urgency: 5,  waiting_days: 180, hospital_id: hospBengaluru },
    { name: 'Meena Iyer',     age: 38, gender: 'female', blood_group: 'B-',  organ_needed: 'Lung',     medical_urgency: 8,  waiting_days: 75,  hospital_id: hospChennai   },
    { name: 'Durga Prasad',   age: 52, gender: 'male',   blood_group: 'O+',  organ_needed: 'Kidney',   medical_urgency: 3,  waiting_days: 30,  hospital_id: hospDelhi     },
  ];

  for (const r of recipients) {
    try {
      const ref = await addDoc(collection(db, 'recipients'), { ...r, created_by: adminUid, created_at: serverTimestamp() });
      recipientRefs[r.name] = ref.id;
      console.log(`✅ Recipient: ${r.name} (urgency ${r.medical_urgency})`);
    } catch (e) {
      throw new Error(`Failed writing recipient ${r.name}: ${e.message}`);
    }
  }

  // ── Step 6: Organs ────────────────────────────────────────────────────────
  const organRefs = {};
  const organs = [
    { organ_type: 'Kidney',   blood_group: 'O+',  donor_name: 'Rajesh Mehta',  availability_status: 'available'    },
    { organ_type: 'Liver',    blood_group: 'A+',  donor_name: 'Priya Nair',    availability_status: 'available'    },
    { organ_type: 'Heart',    blood_group: 'B+',  donor_name: 'Suresh Pillai', availability_status: 'available'    },
    { organ_type: 'Liver',    blood_group: 'AB-', donor_name: 'Ananya Das',    availability_status: 'allocated'    },
    { organ_type: 'Pancreas', blood_group: 'O+',  donor_name: 'Rajesh Mehta',  availability_status: 'transplanted' },
    { organ_type: 'Lung',     blood_group: 'O-',  donor_name: 'Vikram Singh',  availability_status: 'available'    },
  ];

  for (const o of organs) {
    const key = `${o.organ_type}_${o.blood_group}`;
    try {
      const ref = await addDoc(collection(db, 'organs'), {
        organ_type:          o.organ_type,
        blood_group:         o.blood_group,
        donor_id:            donorRefs[o.donor_name] || '',
        availability_status: o.availability_status,
        created_at:          serverTimestamp(),
      });
      organRefs[key] = ref.id;
      console.log(`✅ Organ: ${o.organ_type} (${o.blood_group}) — ${o.availability_status}`);
    } catch (e) {
      throw new Error(`Failed writing organ ${o.organ_type}: ${e.message}`);
    }
  }

  // ── Step 7: Allocations ───────────────────────────────────────────────────
  const allocRef1 = await addDoc(collection(db, 'allocations'), {
    organ_id:        organRefs['Liver_AB-'] || '',
    recipient_id:    recipientRefs['Arun Krishnan'] || '',
    status:          'approved',
    priority_score:  12.45,
    is_override:     false,
    override_reason: '',
    approved_by:     adminUid,
    created_at:      serverTimestamp(),
  });
  console.log(`✅ Allocation (normal): ${allocRef1.id}`);

  const allocRef2 = await addDoc(collection(db, 'allocations'), {
    organ_id:        organRefs['Pancreas_O+'] || '',
    recipient_id:    recipientRefs['Gopal Sharma'] || '',
    status:          'approved',
    priority_score:  8.20,
    is_override:     true,
    override_reason: 'Top-ranked recipient (Kavitha Rajan) is undergoing emergency dialysis and is temporarily ineligible. Physician recommendation to proceed with second-ranked recipient.',
    approved_by:     adminUid,
    created_at:      serverTimestamp(),
  });
  console.log(`✅ Allocation (override): ${allocRef2.id}`);

  // ── Step 8: Audit Logs ────────────────────────────────────────────────────
  const auditEntries = [
    { action_type: 'allocation_created',  description: `Normal allocation: Liver (AB-) → Arun Krishnan`,                                               allocation_id: allocRef1.id, override_reason: '' },
    { action_type: 'allocation_override', description: `Override allocation: Pancreas (O+) → Gopal Sharma. Reason: Top-ranked recipient on dialysis.`,  allocation_id: allocRef2.id, override_reason: 'Top-ranked recipient on dialysis' },
    { action_type: 'organ_added',         description: `New organ registered: Kidney (O+) from donor Rajesh Mehta`,                                     allocation_id: '',            override_reason: '' },
    { action_type: 'donor_added',         description: `Donor Rajesh Mehta (deceased) registered at Apollo Hospitals Chennai`,                           allocation_id: '',            override_reason: '' },
    { action_type: 'recipient_added',     description: `Recipient Sunita Verma registered. Heart needed. Urgency: 10/10`,                                allocation_id: '',            override_reason: '' },
  ];

  for (const entry of auditEntries) {
    await addDoc(collection(db, 'audit_logs'), { ...entry, user_id: adminUid, timestamp: serverTimestamp() });
    console.log(`✅ Audit log: ${entry.action_type}`);
  }

  // ── Step 9: Sample notifications ──────────────────────────────────────────
  await addDoc(collection(db, 'notifications'), {
    user_id:   adminUid,
    message:   'New Kidney (O+) organ is now available for allocation.',
    type:      'in-app',
    status:    'unread',
    timestamp: serverTimestamp(),
  });
  await addDoc(collection(db, 'notifications'), {
    user_id:   adminUid,
    message:   'Allocation confirmed: Liver (AB-) → Arun Krishnan',
    type:      'in-app',
    status:    'unread',
    timestamp: serverTimestamp(),
  });
  console.log('✅ Sample notifications created');

  console.log('✅ Seeding complete! All demo data loaded.');
  return true;
}
