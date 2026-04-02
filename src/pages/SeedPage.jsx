// src/pages/SeedPage.jsx
// PUBLIC utility page — seed demo data before any accounts exist.
// Visit /seed and click "Run Seed". Do this only ONCE.

import React, { useState } from 'react';
import { seedDatabase } from '../utils/seedData';
import { useNavigate } from 'react-router-dom';
import { Database, AlertCircle, CheckCircle, Activity } from 'lucide-react';

export default function SeedPage() {
  const navigate    = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');
  const [log, setLog]         = useState([]);

  const runSeed = async () => {
    setLoading(true);
    setError('');
    setLog([]);

    // Capture console.log output for display
    const originalLog = console.log;
    const captured = [];
    console.log = (...args) => {
      captured.push(args.join(' '));
      setLog([...captured]);
      originalLog(...args);
    };

    try {
      await seedDatabase();
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      console.log = originalLog;
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #011425 0%, #0d2133 60%, #142b3d 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 560,
        background: 'rgba(13, 33, 51, 0.85)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(92, 124, 137, 0.25)',
        borderRadius: 20,
        padding: 40,
        boxShadow: '0 20px 60px rgba(1, 20, 37, 0.7)',
      }}>
        {/* Header */}
        <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:28}}>
          <div style={{
            width:48, height:48, borderRadius:12,
            background:'linear-gradient(135deg, #5C7C89, #1F4959)',
            display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
          }}>
            <Activity size={24}/>
          </div>
          <div>
            <div style={{fontFamily:'Cormorant Garamond, serif', fontSize:'1.6rem', fontWeight:700, color:'#fff'}}>
              OrganNet
            </div>
            <div style={{fontSize:'0.75rem', color:'rgba(92,124,137,0.8)', letterSpacing:'0.06em', textTransform:'uppercase'}}>
              Database Setup
            </div>
          </div>
        </div>

        <h2 style={{fontFamily:'Cormorant Garamond, serif', fontSize:'1.4rem', color:'#fff', marginBottom:8}}>
          Seed Demo Data
        </h2>
        <p style={{fontSize:'0.875rem', color:'rgba(255,255,255,0.5)', marginBottom:22, lineHeight:1.7}}>
          This will populate the database with demo hospitals, users, donors, recipients, organs, allocations, and audit logs for immediate testing.
        </p>

        {/* What will be seeded */}
        <div style={{
          background:'rgba(92,124,137,0.08)', border:'1px solid rgba(92,124,137,0.2)',
          borderRadius:10, padding:'14px 18px', marginBottom:20,
        }}>
          <div style={{fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'rgba(92,124,137,0.7)', marginBottom:10}}>
            Will create:
          </div>
          {[
            ['🏥', '3 Hospitals', 'Chennai, Delhi, Bengaluru'],
            ['👤', '3 Users',     'admin@organnet.com + 2 doctors'],
            ['❤️', '5 Donors',    'Mixed blood groups & types'],
            ['🧑‍⚕️', '8 Recipients','Urgency levels 3–10'],
            ['🫀', '6 Organs',    'Mix of available/allocated'],
            ['📋', '2 Allocations','1 normal + 1 override'],
            ['📜', '5 Audit Logs','Full trace'],
          ].map(([icon, label, sub]) => (
            <div key={label} style={{display:'flex', gap:10, alignItems:'baseline', marginBottom:6}}>
              <span>{icon}</span>
              <span style={{fontSize:'0.85rem', color:'#fff', fontWeight:500, minWidth:90}}>{label}</span>
              <span style={{fontSize:'0.78rem', color:'rgba(255,255,255,0.4)'}}>{sub}</span>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div style={{
          display:'flex', gap:10, alignItems:'flex-start',
          background:'rgba(232,164,74,0.1)', border:'1px solid rgba(232,164,74,0.25)',
          borderRadius:8, padding:'10px 14px', marginBottom:20, fontSize:'0.8rem', color:'#e8a44a',
        }}>
          <AlertCircle size={14} style={{marginTop:2, flexShrink:0}}/>
          Run this <strong style={{margin:'0 3px'}}>only once</strong>. Running multiple times will create duplicate entries.
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display:'flex', gap:10, alignItems:'flex-start',
            background:'rgba(217,95,95,0.1)', border:'1px solid rgba(217,95,95,0.3)',
            borderRadius:8, padding:'10px 14px', marginBottom:16,
            fontSize:'0.8rem', color:'#d95f5f',
          }}>
            <AlertCircle size={14} style={{flexShrink:0, marginTop:2}}/>
            <div>
              <strong>Error: </strong>{error}
              <br/><span style={{opacity:0.7}}>If "email already in use", accounts may already exist — try logging in directly.</span>
            </div>
          </div>
        )}

        {/* Success */}
        {done ? (
          <div>
            <div style={{
              display:'flex', gap:10, alignItems:'center',
              background:'rgba(58,173,140,0.1)', border:'1px solid rgba(58,173,140,0.3)',
              borderRadius:8, padding:'12px 16px', marginBottom:18,
              fontSize:'0.875rem', color:'#3aad8c',
            }}>
              <CheckCircle size={16}/>
              <strong>Seeding complete!</strong> — All demo data has been loaded.
            </div>
            <div style={{marginBottom:12, fontSize:'0.825rem', color:'rgba(255,255,255,0.5)'}}>
              You can now log in with:
              <div style={{fontFamily:'DM Mono, monospace', marginTop:6, color:'rgba(255,255,255,0.75)', lineHeight:1.8}}>
                admin@organnet.com / admin123<br/>
                dralice@hospitalA.com / doctor123<br/>
                drbob@hospitalB.com / doctor123
              </div>
            </div>
            <button
              onClick={() => navigate('/login')}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'12px 24px', borderRadius:10,
                background:'linear-gradient(135deg, #5C7C89, #1F4959)',
                color:'#fff', border:'1px solid rgba(92,124,137,0.5)',
                fontFamily:'DM Sans, sans-serif', fontWeight:500,
                cursor:'pointer', fontSize:'0.9rem',
              }}
            >
              Go to Login →
            </button>
          </div>
        ) : (
          <button
            id="run-seed-btn"
            onClick={runSeed}
            disabled={loading}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'12px 24px', borderRadius:10, width:'100%',
              justifyContent:'center',
              background: loading ? 'rgba(92,124,137,0.2)' : 'linear-gradient(135deg, #5C7C89, #1F4959)',
              color:'#fff', border:'1px solid rgba(92,124,137,0.5)',
              fontFamily:'DM Sans, sans-serif', fontWeight:500,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize:'0.95rem', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width:18, height:18, border:'2px solid rgba(255,255,255,0.3)',
                  borderTopColor:'#fff', borderRadius:'50%',
                  animation:'spin 0.8s linear infinite',
                }}/>
                Seeding database…
              </>
            ) : (
              <><Database size={18}/>Run Seed</>
            )}
          </button>
        )}

        {/* Live log output */}
        {log.length > 0 && (
          <div style={{
            marginTop:16, padding:14,
            background:'rgba(1,20,37,0.7)', border:'1px solid rgba(92,124,137,0.15)',
            borderRadius:8, fontFamily:'DM Mono, monospace', fontSize:'0.72rem',
            color:'rgba(255,255,255,0.6)', maxHeight:220, overflowY:'auto',
            lineHeight:1.8,
          }}>
            {log.map((l, i) => (
              <div key={i} style={{color: l.includes('✅') ? '#3aad8c' : l.includes('❌') ? '#d95f5f' : l.includes('⚠️') ? '#e8a44a' : 'rgba(255,255,255,0.6)'}}>
                {l}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
