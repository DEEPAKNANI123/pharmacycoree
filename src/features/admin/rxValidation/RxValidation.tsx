import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, FileText, Loader2, User, Stethoscope, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../../context/DatabaseContext';
import './RxValidation.css';

// DO NOT USE THIS IN A REAL PRODUCTION APP
// API keys in frontend bundles are compromised.
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

interface ParsedPrescription {
  patientName?: string;
  doctorDetails?: string;
  hospitalDetails?: string;
  medicines: {
    name: string;
    prescribedDoseTiming: string;
    conditionTreated: string;
    standardDose: string;
  }[];
}

// Helper to repair truncated JSON response
function repairJson(content: string): string {
  let cleaned = content.trim();
  
  // Ensure we start with '{'
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) {
    throw new Error("No opening brace found");
  }
  cleaned = cleaned.substring(firstBrace);
  
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let repaired = '';
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escaped) {
      escaped = false;
      repaired += char;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      repaired += char;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      repaired += char;
      continue;
    }
    
    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length && stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
    
    repaired += char;
  }
  
  if (inString) {
    repaired += '"';
  }
  
  // Recursively clean up trailing commas, colons, or unfinished keys in the repaired string
  let progress = true;
  while (progress) {
    progress = false;
    repaired = repaired.trim();
    
    if (repaired.endsWith(',') || repaired.endsWith(':')) {
      repaired = repaired.slice(0, -1);
      progress = true;
    } else {
      const lastComma = repaired.lastIndexOf(',');
      const lastOpenBrace = repaired.lastIndexOf('{');
      const lastOpenBracket = repaired.lastIndexOf('[');
      const lastBoundary = Math.max(lastComma, lastOpenBrace, lastOpenBracket);
      
      if (lastBoundary !== -1) {
        const tail = repaired.substring(lastBoundary + 1).trim();
        // If the tail starts with a quote but lacks a matching close, or lacks colon/value, strip it
        if (tail.startsWith('"') && (!tail.includes(':') || tail.endsWith(':') || (tail.match(/"/g) || []).length < 2)) {
          repaired = repaired.substring(0, lastBoundary);
          progress = true;
        }
      }
    }
  }
  
  while (stack.length > 0) {
    const open = stack.pop();
    repaired = repaired.trim();
    if (repaired.endsWith(',')) {
      repaired = repaired.slice(0, -1);
    }
    if (open === '{') {
      repaired += '}';
    } else if (open === '[') {
      repaired += ']';
    }
  }
  
  return repaired;
}

// Helper to clean details and default to 'General' if empty/missing/unspecified
function cleanDetails(value: any): string {
  if (value === null || value === undefined) return 'General';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value).trim();
  const lowerStr = str.toLowerCase();
  return str === '' || lowerStr === 'n/a' || lowerStr === 'not specified' || lowerStr === 'unknown' ? 'General' : str;
}

// Fallback to extract medicines using simple regex if JSON parsing completely fails
function attemptManualRegexExtraction(str: string): ParsedPrescription {
  const result: ParsedPrescription = {
    patientName: "",
    doctorDetails: "",
    hospitalDetails: "",
    medicines: []
  };

  const patientMatch = str.match(/"patientName"\s*:\s*"([^"]*)"/);
  if (patientMatch) result.patientName = patientMatch[1];

  const doctorMatch = str.match(/"doctorDetails"\s*:\s*"([^"]*)"/);
  if (doctorMatch) result.doctorDetails = doctorMatch[1];

  const hospitalMatch = str.match(/"hospitalDetails"\s*:\s*"([^"]*)"/);
  if (hospitalMatch) result.hospitalDetails = hospitalMatch[1];

  result.patientName = cleanDetails(result.patientName);
  result.doctorDetails = cleanDetails(result.doctorDetails);
  result.hospitalDetails = cleanDetails(result.hospitalDetails);

  // Match all medication name matches
  const nameRegex = /"name"\s*:\s*"([^"]*)"/g;
  let match;
  while ((match = nameRegex.exec(str)) !== null) {
    const startIdx = match.index;
    const nextMatch = str.indexOf('"name"', startIdx + 1);
    const segment = nextMatch !== -1 ? str.substring(startIdx, nextMatch) : str.substring(startIdx);

    const timingMatch = segment.match(/"prescribedDoseTiming"\s*:\s*"([^"]*)"/);
    const conditionMatch = segment.match(/"conditionTreated"\s*:\s*"([^"]*)"/);
    const standardMatch = segment.match(/"standardDose"\s*:\s*"([^"]*)"/);

    result.medicines.push({
      name: cleanDetails(match[1]),
      prescribedDoseTiming: cleanDetails(timingMatch ? timingMatch[1] : ""),
      conditionTreated: cleanDetails(conditionMatch ? conditionMatch[1] : ""),
      standardDose: cleanDetails(standardMatch ? standardMatch[1] : "")
    });
  }

  return result;
}

// Extraction and parsing of JSON with fallback repair and manual regex capabilities
function extractAndParseJSON(content: string | null | undefined): ParsedPrescription {
  let sanitized = (content || "").trim();
  
  const firstBrace = sanitized.indexOf('{');
  const lastBrace = sanitized.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    sanitized = sanitized.substring(firstBrace, lastBrace + 1);
  }
  
  let parsed: ParsedPrescription;
  
  try {
    parsed = JSON.parse(sanitized);
  } catch (firstError) {
    console.warn("Standard JSON parsing failed, attempting repair:", firstError);
    try {
      const repaired = repairJson(content || "");
      parsed = JSON.parse(repaired);
    } catch (repairError) {
      console.error("JSON repair failed, attempting manual regex extraction:", repairError);
      try {
        parsed = attemptManualRegexExtraction(content || "");
      } catch (fallbackError) {
        throw new Error(`Failed to parse AI response into JSON: ${content}`);
      }
    }
  }

  // Normalize details to 'General' if they are missing or N/A
  parsed.patientName = cleanDetails(parsed.patientName);
  parsed.doctorDetails = cleanDetails(parsed.doctorDetails);
  parsed.hospitalDetails = cleanDetails(parsed.hospitalDetails);

  if (parsed.medicines) {
    parsed.medicines = parsed.medicines.map(med => ({
      name: cleanDetails(med.name),
      prescribedDoseTiming: cleanDetails(med.prescribedDoseTiming),
      conditionTreated: cleanDetails(med.conditionTreated),
      standardDose: cleanDetails(med.standardDose)
    }));
  }

  return parsed;
}

export default function RxValidation() {
  const navigate = useNavigate();
  const { rxQueue, users, inventory, updateRxStatus, approveManualPrescription, addMedicine } = useDatabase();
  const [activeRxId, setActiveRxId] = useState<string | null>(null);
  const [base64Str, setBase64Str] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedPrescription | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'New' | 'Refills'>('New');

  const filteredQueue = rxQueue.filter(rx => 
    activeTab === 'New' 
      ? rx.status !== 'Pending Prescriber Approval' 
      : rx.status === 'Pending Prescriber Approval'
  );

  const selectedRx = filteredQueue.find(rx => rx.id === activeRxId);
  const patientUser = users.find(u => u.id === selectedRx?.userId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setBase64Str(base64String);
        setParsedData(null);
        setError(null);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!base64Str) return;
    setIsLoading(true);
    setError(null);

    const MODELS = [
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.2-11b-vision-instruct:free',
      'qwen/qwen-2-vl-7b-instruct:free',
      'nvidia/nemotron-nano-12b-v2-vl:free',
      'openrouter/free'
    ];

    let success = false;
    let lastErrorMsg = '';
    let finalParsedData: ParsedPrescription | null = null;
    let fallbackParsedData: ParsedPrescription | null = null;

    for (const model of MODELS) {
      try {
        console.log(`Attempting image analysis with model: ${model}`);
        
        // Setup strict 8-second timeout for fast failover
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 8000);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Pharmacy App'
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "You are an automated pharmacy assistant. Please analyze this image (either a prescription or a medicine strip) and return ONLY a valid JSON object. Extract 'doctorDetails' as a single string (e.g., 'Dr. Name - Speciality'), 'hospitalDetails' as a single string, and 'patientName' as a single string. Then extract an array of 'medicines'. For each medicine, provide: 'name', 'prescribedDoseTiming' (string: the dosage and timing instructed), 'conditionTreated' (string: which problem it solves generally), and 'standardDose' (string: the normal recommended dosage generally). If the image is just a medicine strip, extract the medicine details and leave doctor/hospital blank strings. Format: { \"patientName\": \"...\", \"doctorDetails\": \"...\", \"hospitalDetails\": \"...\", \"medicines\": [ { \"name\": \"...\", \"prescribedDoseTiming\": \"...\", \"conditionTreated\": \"...\", \"standardDose\": \"...\" } ] }"
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: base64Str
                    }
                  }
                ]
              }
            ],
            temperature: 0.1,
            max_tokens: 1500
          })
        });

        window.clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message?.content) {
          throw new Error(`Unexpected API response structure or empty content`);
        }
        
        const content = data.choices[0].message.content;
        const parsed = extractAndParseJSON(content);
        
        if (!parsed.medicines || parsed.medicines.length === 0) {
            if (!fallbackParsedData) fallbackParsedData = parsed;
            throw new Error(`Model extracted 0 medications. Likely OCR failure, trying next model.`);
        }
        
        finalParsedData = parsed;
        success = true;
        break;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn(`Model ${model} timed out after 8 seconds.`);
          lastErrorMsg = 'Request timed out';
        } else {
          console.warn(`Model ${model} failed:`, err.message);
          lastErrorMsg = err.message;
        }
      }
    }

    setIsLoading(false);

    if (success && finalParsedData) {
      setParsedData(finalParsedData);
      setError(null);
    } else if (fallbackParsedData) {
      setParsedData(fallbackParsedData);
      setError("Warning: AI could not clearly detect specific medications from the handwriting. Please verify manually.");
    } else {
      setError(`All attempts to analyze the image failed. Last error: ${lastErrorMsg}`);
    }
  };

  return (
    <div className="rx-container">
      <div className="dashboard-header mb-4">
        <h1>Pharmacist Queue (Online submissions)</h1>
        <p className="text-muted">Review and validate prescriptions submitted by patients via the mobile app.</p>
      </div>

      <div className="flex gap-4 mb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button 
          className={`pb-2 ${activeTab === 'New' ? 'text-primary font-bold border-b-2 border-primary' : 'text-muted'}`}
          onClick={() => { setActiveTab('New'); setActiveRxId(null); setBase64Str(null); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          New Submissions
        </button>
        <button 
          className={`pb-2 ${activeTab === 'Refills' ? 'text-primary font-bold border-b-2 border-primary' : 'text-muted'}`}
          onClick={() => { setActiveTab('Refills'); setActiveRxId(null); setBase64Str(null); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Refill Approvals <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{rxQueue.filter(rx => rx.status === 'Pending Prescriber Approval').length}</span>
        </button>
      </div>

      <div className="rx-queue-selector flex gap-2 mb-4 overflow-x-auto pb-2">
         {filteredQueue.map(rx => {
            const user = users.find(u => u.id === rx.userId);
            return (
              <button 
                key={rx.id} 
                className={`panel rx-tab ${activeRxId === rx.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveRxId(rx.id);
                  setBase64Str(rx.imageUrl || null);
                  setParsedData(null);
                }}
                style={{ minWidth: '200px', cursor: 'pointer', border: activeRxId === rx.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }}
              >
                <div className="flex-between">
                   <span className="text-xs font-bold">{user?.name || 'Unknown'}</span>
                   <span className={`status-badge status-${rx.status.toLowerCase()}`}>{rx.status}</span>
                </div>
                <p className="text-[10px] text-muted mt-1">{new Date(rx.date).toLocaleString()}</p>
              </button>
            )
         })}
         {filteredQueue.length === 0 && <p className="text-muted p-4">Queue is empty in this category.</p>}
      </div>

      <style>{`
         .rx-tab.active { background: #eff6ff; }
         .status-badge { font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
         .status-reviewing { background: #fef3c7; color: #d97706; }
         .status-approved { background: #dcfce7; color: #166534; }
      `}</style>

      <div className="rx-grid">
        {activeTab === 'New' ? (
          <>
            <div className="panel upload-panel">
              <h3 className="mb-4">Upload Prescription</h3>
              <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                {!base64Str ? (
                  <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem', height: '100%', padding: '2rem' }}>
                    <UploadCloud size={48} className="text-primary opacity-70" />
                    <p className="font-medium">Click to upload or drag & drop</p>
                    <p className="text-sm text-muted">Supports JPG, PNG</p>
                  </div>
                ) : (
                  <img src={base64Str} alt="Prescription" className="uploaded-image" />
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                {base64Str && (
                   <button className="btn btn-outline" onClick={() => { setBase64Str(null); setParsedData(null); }} style={{ flex: 1 }}>Clear</button>
                )}
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 2 }} 
                  onClick={handleAnalyze} 
                  disabled={!base64Str || isLoading}
                >
                  {isLoading ? <><Loader2 size={16} className="spinner" /> Analyzing...</> : 'Analyze with AI'}
                </button>
              </div>
              
              {error && <div className="text-danger mt-3 text-sm">{error}</div>}
            </div>


        <div className="panel results-panel" style={{ minHeight: '500px' }}>
          <h3 className="mb-4">Validation Output</h3>
          
          {isLoading && (
            <div className="flex-center" style={{ height: '400px', flexDirection: 'column', gap: '1.5rem' }}>
              <Loader2 size={64} className="text-primary spinner" />
              <div className="scanning-line"></div>
              <p className="text-primary font-medium processing-text" style={{ fontSize: '1.1rem' }}>OpenRouter Vision is analyzing the image...</p>
              <p className="text-muted text-sm text-center px-4">Extracting doctor details, hospital details, medicines, dose timings, and evaluating condition & standard doses...</p>
            </div>
          )}

          {!isLoading && !parsedData && (
            <div className="flex-center" style={{ height: '300px', flexDirection: 'column', gap: '1rem' }}>
              <FileText size={48} className="text-muted opacity-30" />
              <p className="text-muted text-sm px-4 text-center">Results will appear here after the AI successfully analyzes the uploaded document.</p>
            </div>
          )}

          {!isLoading && parsedData && (
            <div className="parsed-output">
               <div className="success-banner panel mb-4">
                  <CheckCircle size={20} className="text-success" />
                  <span>Validation Complete. Please verify extracted details.</span>
               </div>

               <div className="patient-box-premium panel mb-4">
                  <div className="patient-premium-header">
                     <User size={18} className="text-primary" />
                     <h3>Patient File Details</h3>
                  </div>
                  
                  <div className="patient-details-grid">
                     <div className="details-row-premium">
                        <span className="details-label">Patient Name</span>
                        <strong className="details-value patient-highlight">
                           {typeof parsedData.patientName === 'object' ? JSON.stringify(parsedData.patientName) : parsedData.patientName || 'General'}
                        </strong>
                     </div>
                     <div className="details-row-premium">
                        <span className="details-label">Doctor Details</span>
                        <span className="details-value doctor-highlight">
                           {typeof parsedData.doctorDetails === 'object' ? JSON.stringify(parsedData.doctorDetails) : parsedData.doctorDetails || 'General'}
                        </span>
                     </div>
                     <div className="details-row-premium">
                        <span className="details-label">Hospital Details</span>
                        <span className="details-value hospital-highlight">
                           {typeof parsedData.hospitalDetails === 'object' ? JSON.stringify(parsedData.hospitalDetails) : parsedData.hospitalDetails || 'General'}
                        </span>
                     </div>
                  </div>
               </div>

               <h4 className="section-subtitle-premium">Prescribed Medications & Analysis</h4>
               <div className="medicines-analysis-list-premium">
                 {parsedData.medicines && parsedData.medicines.map((med, idx) => (
                    <div key={idx} className="medication-card-premium panel">
                      <div className="medication-card-header">
                        <span className="medication-serial">#{idx + 1}</span>
                        <strong className="medication-name-premium">{med.name}</strong>
                      </div>
                      
                        <div className="med-detail-grid">
                          <div className="med-detail-block">
                             <span className="med-detail-label">Prescribed Dose & Timing</span>
                             <span className="med-detail-value timing">{med.prescribedDoseTiming || 'General'}</span>
                          </div>
                          <div className="med-detail-block">
                             <span className="med-detail-label">Condition Treated</span>
                             <span className="med-detail-value condition">{med.conditionTreated || 'General'}</span>
                          </div>
                          <div className="med-detail-block full-width">
                             <span className="med-detail-label">Standard Recommended Dose</span>
                             <span className="med-detail-value standard">{med.standardDose || 'General'}</span>
                          </div>
                        </div>
                    </div>
                 ))}
                  {(!parsedData.medicines || parsedData.medicines.length === 0) && (
                    <p className="text-center text-muted py-4">No medications detected.</p>
                 )}
               </div>

               <div className="flex-between mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                 <button className="btn btn-outline text-danger border-danger" onClick={() => {
                   if (activeRxId) {
                     updateRxStatus(activeRxId, 'Rejected', 'Rejected after AI validation review.');
                   }
                   setParsedData(null);
                   setBase64Str(null);
                   setActiveRxId(null);
                 }}>Reject Prescription</button>
                 <button className="btn btn-primary" onClick={async () => {
                   const matchedIds: string[] = [];
                   if (parsedData.medicines) {
                     for (const pm of parsedData.medicines) {
                       const match = inventory.find(i => i.name.toLowerCase().includes(pm.name.toLowerCase()));
                       if (match) {
                         matchedIds.push(match.id);
                       } else {
                         // Auto-create missing medicine to ensure smooth POS flow
                         try {
                           const newMed = await addMedicine({
                             name: pm.name,
                             sku: `SKU-${Math.floor(Math.random() * 100000)}`,
                             category: 'Prescription (Rx)',
                             price: 25.00, // Default baseline price
                             purchasePrice: 15.00,
                             stock: 100,
                             expiryDate: new Date(Date.now() + 31536000000).toISOString().split('T')[0], // YYYY-MM-DD
                             batch: `BAT-${Math.floor(Math.random() * 1000)}`,
                             stripStock: 0,
                             unitsPerBox: 10,
                             pieceStock: 0,
                             piecesPerStrip: 10,
                             reorderPoint: 10,
                             storage: 'Room temp',
                             isPerishable: false
                           });
                           matchedIds.push(newMed.id);
                         } catch (e) {
                           console.error("Failed to auto-create medicine:", e);
                         }
                       }
                     }
                   }
                   if (activeRxId) {
                     await updateRxStatus(activeRxId, 'Approved', undefined, matchedIds);
                   } else if (base64Str) {
                     approveManualPrescription(base64Str, matchedIds);
                   }
                   navigate('/admin/pos', { state: { openRxModal: true } });
                 }}>
                   Approve & Process in POS <ArrowRight size={16} />
                 </button>
               </div>
            </div>
          )}
        </div>
        </>
        ) : (
          <div className="panel results-panel" style={{ gridColumn: '1 / -1', minHeight: '400px' }}>
            <h3 className="mb-4">Refill Request Details</h3>
            {!selectedRx ? (
              <div className="flex-center text-muted p-8">Select a refill request from the queue to view details.</div>
            ) : (
              <div>
                <div className="flex-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <h4 className="font-bold">{patientUser?.name || 'Unknown Patient'}</h4>
                    <p className="text-sm text-muted">Diagnosis Code: {selectedRx.diagnosisCode || 'Not specified'}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">{new Date(selectedRx.date).toLocaleDateString()}</div>
                    <p className="text-xs text-muted">Requested By: Patient / Pharmacist</p>
                  </div>
                </div>

                {selectedRx.isControlledSubstance && (
                  <div className="panel mb-4" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                    <div className="flex items-center gap-2 text-danger font-bold mb-2">
                      <Stethoscope size={20} />
                      CONTROLLED SUBSTANCE AUTHORIZATION REQUIRED
                    </div>
                    <p className="text-sm" style={{ color: '#991b1b' }}>
                      This refill contains a controlled substance. Digital Prescriber Authorization is required to dispense.
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="font-bold text-sm mb-2 text-muted uppercase">Requested Medications</h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {(selectedRx.associatedMedicines || []).map((medId, idx) => {
                      const med = inventory.find(m => m.id === medId);
                      return (
                        <li key={idx} className="panel p-3 mb-2 flex-between">
                          <span className="font-bold">{med?.name || medId}</span>
                          <span className="badge badge-success">Refill Request</span>
                        </li>
                      );
                    })}
                  </ul>
                  {(!selectedRx.associatedMedicines || selectedRx.associatedMedicines.length === 0) && (
                    <p className="text-sm text-muted">No specific medicines mapped to this request.</p>
                  )}
                </div>

                <div className="flex gap-4 mt-6">
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                    onClick={() => {
                      updateRxStatus(selectedRx.id, 'Rejected', 'Refill Denied by Prescriber');
                      setActiveRxId(null);
                    }}
                  >
                    Deny Refill
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 2, background: selectedRx.isControlledSubstance ? 'var(--color-danger)' : 'var(--color-primary)' }}
                    onClick={() => {
                      if (selectedRx.isControlledSubstance) {
                        const pass = window.prompt("Digital Signature Required: Enter Prescriber PIN to authorize controlled substance.");
                        if (pass !== '1234') {
                          alert("Invalid PIN. Refill authorization failed.");
                          return;
                        }
                      }
                      updateRxStatus(selectedRx.id, 'Approved');
                      alert("Refill Approved & Sent to Dispensing.");
                      setActiveRxId(null);
                    }}
                  >
                    {selectedRx.isControlledSubstance ? 'Sign & Authorize Refill' : 'Approve Refill'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
