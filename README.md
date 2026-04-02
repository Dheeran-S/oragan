# OrganNet — Organ Donation & Procurement Network Management System

A full-stack, real-time web application for managing organ donors, recipients, matching, and allocation. Built with **React.js + Firebase** for clinical-grade reliability and a premium dark medical aesthetic.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ and npm
- Firebase project (already configured)

### Setup
```bash
# Clone / navigate to project
cd organ-donation-system

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🔐 Test Credentials

| Role  | Email                   | Password   | Access |
|-------|-------------------------|------------|--------|
| Admin | admin@organnet.com      | admin123   | Full access including Audit Logs & Hospitals |
| Doctor | dralice@hospitalA.com  | doctor123  | All except Audit Logs & Hospital management |
| Doctor | drbob@hospitalB.com    | doctor123  | All except Audit Logs & Hospital management |

> **Note:** These accounts are created by the seed script (see below).

---

## 🌱 Seed Demo Data

The app comes with a built-in seed utility. After running the app:

1. Log in as **admin@organnet.com** (first create the account manually in Firebase Auth, OR use the Firebase Console to create it)
2. Navigate to **http://localhost:5173/seed**
3. Click **"Run Seed"** — this will populate:
   - 3 Hospitals (Chennai, Delhi, Bengaluru)
   - 3 Users (Admin + 2 Doctors)
   - 5 Donors
   - 8 Recipients
   - 6 Organs
   - 2 Allocations (1 normal, 1 override)
   - 5 Audit Log entries

> ⚠️ Run seed **only once** to avoid duplicate data.

---

## 🏗️ Architecture

```
src/
├── firebase/               # Firebase config & initialization
│   └── config.js
├── context/                # React context
│   └── AuthContext.jsx     # Auth state + role management
├── utils/                  # Core business logic
│   ├── matchOrgan.js       # Client-side matching engine
│   ├── createAllocation.js # Allocation batched writes
│   ├── helpers.js          # Validation, blood compatibility
│   └── seedData.js         # Demo data seeder
├── components/
│   └── Layout/
│       ├── Sidebar.jsx     # Collapsible nav with notification badge
│       └── Sidebar.css
├── pages/
│   ├── Login.jsx           # Auth with demo quick-fill
│   ├── Dashboard.jsx       # Real-time stats + charts
│   ├── DonorManagement.jsx # CRUD + search/filter
│   ├── RecipientManagement.jsx # CRUD + inline urgency update
│   ├── OrganManagement.jsx # Status flow tracker
│   ├── MatchingPage.jsx    # Matching engine UI
│   ├── AllocationPage.jsx  # Override detection + confirm
│   ├── AuditLogs.jsx       # Admin-only immutable log
│   ├── Notifications.jsx   # Real-time in-app alerts
│   ├── HospitalManagement.jsx # Admin-only facilities
│   └── SeedPage.jsx        # Demo data seeder UI
├── App.jsx                 # Router + protected routes
├── main.jsx
└── index.css               # Full design system
```

---

## 🧮 Matching Algorithm

```
score = (medical_urgency × 0.5) + (waiting_days × 0.3) + (proximity_score × 0.2)
```

**Proximity scoring:**
- Same city  → 10 points
- Same state → 5 points
- Different  → 1 point

**Blood group compatibility:** Standard ABO/Rh rules (O- is universal donor, AB+ is universal recipient).

---

## 🔒 Security Rules Summary

| Collection   | Read       | Write             |
|-------------|------------|-------------------|
| users       | Own + Admin | Own + Admin       |
| hospitals   | All auth   | Admin only        |
| donors      | Admin+Doctor | Admin+Doctor    |
| recipients  | Admin+Doctor | Admin+Doctor    |
| organs      | Admin+Doctor | Admin+Doctor    |
| allocations | Admin+Doctor | Admin+Doctor    |
| audit_logs  | Admin only | Any auth (create) |
| notifications | Any auth | Any auth          |

Override allocations **cannot** be submitted without a mandatory reason — enforced on both frontend and Firestore rules.

---

## 🛠️ Firebase Deploy

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Initialize project
```bash
firebase init
# Select: Firestore + Hosting
# Hosting: public directory = dist
# SPA: Yes
```

### 3. Build & Deploy
```bash
npm run build
firebase deploy
```

### 4. Deploy Firestore rules & indexes only
```bash
firebase deploy --only firestore
```

---

## 📊 Tech Stack

| Layer        | Technology            |
|--------------|-----------------------|
| Frontend     | React 18 + Vite       |
| Auth         | Firebase Authentication |
| Database     | Cloud Firestore       |
| Hosting      | Firebase Hosting      |
| Charts       | Recharts              |
| Icons        | Lucide React          |
| Fonts        | Cormorant Garamond, DM Sans, DM Mono |

---

## ✅ Manual Test Checklist

- [ ] Login as Admin → full access confirmed
- [ ] Login as Doctor → Audit Logs tab hidden
- [ ] Add a donor → appears in table instantly (real-time)
- [ ] Add an organ → notification created
- [ ] Run matching on an organ → ranked list shown with scores
- [ ] Allocate top match → success screen, organ status → Allocated
- [ ] Allocate non-top match without reason → blocked with error
- [ ] Allocate non-top match with reason → override recorded in audit log
- [ ] Open two tabs → add organ in tab 1 → dashboard updates in tab 2 (no refresh)
- [ ] Doctor tries `/audit-logs` → redirected to dashboard
