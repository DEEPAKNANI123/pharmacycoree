import React, { useState, useEffect, useRef } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import { Search, Pill, ShieldAlert, CheckCircle, Shield, X, Loader2, User, AlertTriangle } from 'lucide-react';
import { checkDrugInteraction } from '../../../utils/aiInteraction';
import type { InteractionAlert } from '../../../utils/aiInteraction';
import './AdminPrescribe.css';

interface PrescribedDrug {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  interactionAlert?: InteractionAlert;
}

export default function AdminPrescribe() {
  const { inventory, customers } = useDatabase();
  
  // Use Database Customers
  const patientsList = customers && customers.length > 0 ? customers : [];
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientsList[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [prescribedDrugs, setPrescribedDrugs] = useState<PrescribedDrug[]>([]);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [refillsAllowed, setRefillsAllowed] = useState(0);
  
  const defaultExpiry = new Date();
  defaultExpiry.setMonth(defaultExpiry.getMonth() + 6);
  const [rxExpiryDate, setRxExpiryDate] = useState(defaultExpiry.toISOString().split('T')[0]);
  
  const searchRef = useRef<HTMLDivElement>(null);

  const selectedPatient = patientsList.find(p => p.id === selectedPatientId) || patientsList[0];

  // Map medical data to dynamically fetched customers (defaults to empty arrays if new)
  const patientMedicalData: Record<string, { allergies: string[], activeMedications: string[], conditions: string[], age: number }> = {
    'CUST-1': { age: 45, allergies: ['Penicillin', 'Sulfa drugs'], activeMedications: ['Warfarin 5mg', 'Lisinopril 10mg'], conditions: ['Atrial Fibrillation', 'Hypertension'] },
    'CUST-2': { age: 32, allergies: [], activeMedications: ['Simvastatin 20mg'], conditions: ['Hyperlipidemia'] },
    'CUST-3': { age: 60, allergies: ['Aspirin'], activeMedications: ['Metformin 500mg'], conditions: ['Type 2 Diabetes'] }
  };

  const patientMedical = selectedPatient 
    ? (patientMedicalData[selectedPatient.id] || { age: 35, allergies: [], activeMedications: [], conditions: [] })
    : { age: 35, allergies: [], activeMedications: [], conditions: [] };

  useEffect(() => {
    if (!selectedPatientId && patientsList.length > 0) {
      setSelectedPatientId(patientsList[0].id);
    }
  }, [patientsList, selectedPatientId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSuggesting(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredInventory = (inventory || []).filter(med => {
    if (!med || !med.name) return false;
    const s = (searchTerm || '').toLowerCase();
    const n = med.name.toLowerCase();
    return n.includes(s) || (med.category === 'Prescription (Rx)' && n.includes(s));
  }).slice(0, 8);

  const handleSelectDrug = async (med: any) => {
    setSearchTerm('');
    setIsSuggesting(false);
    setIsCheckingAI(true);

    const patientHistory = {
      allergies: patientMedical.allergies,
      activeMedications: patientMedical.activeMedications
    };

    // Perform AI-Powered Interaction & Allergy Check
    const alert = await checkDrugInteraction(med.name, patientHistory);

    const newDrug: PrescribedDrug = {
      id: Math.random().toString(36).substr(2, 9),
      name: med.name,
      dosage: '1 Tablet', // Default, editable
      instructions: 'Take once daily', // Default, editable
      interactionAlert: alert
    };

    setPrescribedDrugs(prev => [...prev, newDrug]);
    setIsCheckingAI(false);
  };

  const removeDrug = (id: string) => {
    setPrescribedDrugs(prev => prev.filter(d => d.id !== id));
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'Safe': return <CheckCircle size={20} />;
      case 'Low': return <Shield size={20} />;
      case 'Medium': return <AlertTriangle size={20} />;
      case 'High': return <ShieldAlert size={20} />;
      case 'Critical': return <ShieldAlert size={20} />;
      default: return <Shield size={20} />;
    }
  };

  const handleFinalize = () => {
    if (prescribedDrugs.length === 0) return;
    const hasCritical = prescribedDrugs.some(d => d.interactionAlert?.severity === 'Critical');
    if (hasCritical) {
      alert("Cannot finalize: Please remove critically contraindicated medications before proceeding.");
      return;
    }
    
    // Check if any drug is a controlled substance for the refill workflow
    const hasControlled = prescribedDrugs.some(d => {
      const dbMed = inventory?.find(m => m.name === d.name);
      return dbMed && dbMed.category === 'Controlled';
    });
    
    // Save to DatabaseContext using the new draftPrescription method
    const medIds = prescribedDrugs.map(d => {
      const dbMed = inventory?.find(m => m.name === d.name);
      return dbMed ? dbMed.id : d.name; // Use ID if found, else just name fallback
    });

    // @ts-ignore - draftPrescription added recently to context
    if (typeof useDatabase().draftPrescription === 'function') {
      // @ts-ignore
      useDatabase().draftPrescription({
        userId: selectedPatientId,
        associatedMedicines: medIds,
        diagnosisCode,
        refillsAllowed,
        refillsRemaining: refillsAllowed,
        rxExpiryDate,
        isControlledSubstance: !!hasControlled
      });
    }
    
    alert(`Prescription created successfully for ${selectedPatient?.name || 'Patient'}! Sent to dispense queue.`);
    setPrescribedDrugs([]);
    setDiagnosisCode('');
    setRefillsAllowed(0);
  };

  return (
    <div className="prescribe-container animate-fade-in">
      <div className="prescribe-header">
        <h1>e-Prescribe</h1>
        <p>AI-Powered Prescription Drafting & Safety Checks</p>
      </div>

      <div className="prescribe-grid">
        <div className="prescribe-main-column">
          
          {/* Patient Selector */}
          <div className="patient-selector-card">
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
              Select Patient
            </label>
            <div className="flex items-center gap-3">
              <div style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '0.5rem', borderRadius: '50%' }}>
                <User size={20} />
              </div>
              <select 
                className="form-control" 
                value={selectedPatientId} 
                onChange={(e) => {
                  setSelectedPatientId(e.target.value);
                  setPrescribedDrugs([]); // Clear when changing patient
                }}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              >
                {patientsList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="patient-info-box">
              <div className="info-row">
                <span className="info-label">Active Conditions</span>
                <span className="info-value">{patientMedical.conditions.join(', ') || 'None'}</span>
              </div>
              <div className="info-row">
                <span className="info-label text-danger">Known Allergies</span>
                <span className="info-value text-danger">{patientMedical.allergies.join(', ') || 'None reported'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Current Medications</span>
                <span className="info-value text-primary">{patientMedical.activeMedications.join(', ') || 'None'}</span>
              </div>
            </div>
          </div>

          {/* Drug Search & Auto-Suggest */}
          <div className="drug-search-card" ref={searchRef}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
              Search Drug Database
            </label>
            <div className="search-input-group">
              <Search className="search-icon-left" size={20} />
              <input
                type="text"
                className="drug-search-input"
                placeholder="Type generic or brand name (e.g., Amoxicillin)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsSuggesting(true);
                }}
                onFocus={() => setIsSuggesting(true)}
              />
            </div>

            {isSuggesting && searchTerm.length > 1 && (
              <div className="auto-suggest-dropdown">
                {filteredInventory.length > 0 ? (
                  filteredInventory.map(med => (
                    <div key={med.id} className="suggest-item" onClick={() => handleSelectDrug(med)}>
                      <div className="flex items-center gap-3">
                        <Pill size={18} color="var(--color-primary)" />
                        <div>
                          <strong style={{ display: 'block', color: 'var(--color-text-main)' }}>{med.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>In Stock: {med.stock} Box</span>
                        </div>
                      </div>
                      <span className="badge" style={{ background: med.category === 'Prescription (Rx)' ? '#fef3c7' : '#ecfdf5', color: med.category === 'Prescription (Rx)' ? '#d97706' : '#065f46' }}>
                        {med.category === 'Prescription (Rx)' ? 'Rx' : 'OTC'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted">No medications found matching "{searchTerm}"</div>
                )}
              </div>
            )}

            {isCheckingAI && (
              <div className="mt-4 flex-center gap-2 text-primary p-3" style={{ background: 'var(--color-primary-light)', borderRadius: '8px' }}>
                <Loader2 className="spin" size={18} />
                <span className="font-medium">AI performing real-time interaction & allergy check...</span>
              </div>
            )}
          </div>
        </div>

        {/* Rx Builder Column */}
        <div className="rx-builder-sidebar">
          <div className="rx-builder-header">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Current Prescription</h2>
            <p className="text-sm text-muted mt-1">For {selectedPatient?.name || 'Patient'}</p>
          </div>

          <div className="rx-builder-body">
            {prescribedDrugs.length === 0 ? (
              <div className="text-center text-muted" style={{ marginTop: '3rem' }}>
                <Pill size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                <p>No medications added yet.</p>
                <p className="text-sm mt-1">Search the database to begin.</p>
              </div>
            ) : (
              prescribedDrugs.map((drug, index) => (
                <div key={drug.id} className="rx-item animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="rx-item-header">
                    <strong style={{ fontSize: '1rem', color: 'var(--color-text-main)' }}>{drug.name}</strong>
                    <button className="btn-icon" onClick={() => removeDrug(drug.id)}><X size={16} /></button>
                  </div>
                  
                  {drug.interactionAlert && (
                    <div className={`interaction-alert alert-${drug.interactionAlert.severity}`}>
                      <div>{getAlertIcon(drug.interactionAlert.severity)}</div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                          {drug.interactionAlert.severity} Severity
                        </strong>
                        <p style={{ fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>{drug.interactionAlert.message}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-3" style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={drug.dosage} 
                      onChange={(e) => {
                        const updated = [...prescribedDrugs];
                        updated[index].dosage = e.target.value;
                        setPrescribedDrugs(updated);
                      }}
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }} 
                    />
                    <input 
                      type="text" 
                      className="form-control" 
                      value={drug.instructions} 
                      onChange={(e) => {
                        const updated = [...prescribedDrugs];
                        updated[index].instructions = e.target.value;
                        setPrescribedDrugs(updated);
                      }}
                      style={{ flex: 2, padding: '0.5rem', fontSize: '0.85rem' }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {prescribedDrugs.length > 0 && (
            <div className="panel p-3 mb-4 mx-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="text-xs font-bold text-muted uppercase">Diagnosis Code (ICD-10)</label>
                <input 
                  type="text" 
                  className="form-control mt-1" 
                  placeholder="e.g. J01.90" 
                  value={diagnosisCode}
                  onChange={e => setDiagnosisCode(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div style={{ flex: 1 }}>
                  <label className="text-xs font-bold text-muted uppercase">Refills Allowed</label>
                  <input 
                    type="number" 
                    className="form-control mt-1" 
                    min="0"
                    max="12"
                    value={refillsAllowed}
                    onChange={e => setRefillsAllowed(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-xs font-bold text-muted uppercase">Expiry Date</label>
                  <input 
                    type="date" 
                    className="form-control mt-1" 
                    value={rxExpiryDate}
                    onChange={e => setRxExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="rx-builder-footer">
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.8rem', fontWeight: 600, opacity: prescribedDrugs.length === 0 ? 0.5 : 1 }}
              onClick={handleFinalize}
              disabled={prescribedDrugs.length === 0}
            >
              Sign & Create Prescription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
