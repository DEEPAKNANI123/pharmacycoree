import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Search, Pill, Thermometer, Activity, Heart, Clock, CheckCircle2, ChevronRight, Info, Star, Plus, Loader2 } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import { extractAndParseJSON } from '../../../utils/aiParsing';
import './PatientDashboard.css';


export default function PatientDashboard() {
  const { currentUser, submitPrescription, inventory, addToCart } = useDatabase();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [parsedRx, setParsedRx] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recommendedMeds = inventory;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64String = reader.result as string;
        handleAnalyze(base64String);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async (base64Str: string) => {
    setIsScanning(true);
    setIsUploading(true);
    setError(null);
    setParsedRx(null);

    try {
      let content: any = null;
      const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
      
      if (!OPENROUTER_API_KEY) {
        throw new Error("Missing AI API Key. Please check your configuration.");
      }

      const MODELS = [
        'meta-llama/llama-3.2-11b-vision-instruct:free',
        'qwen/qwen-2-vl-7b-instruct:free',
        'google/gemini-2.0-flash-exp:free',
        'openrouter/free'
      ];

      let lastError = '';
      for (const model of MODELS) {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'HTTP-Referer': window.location.origin,
              'X-Title': 'PharmaCore Patient App'
            },
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "You are an automated pharmacy assistant. Please analyze this image (either a prescription or a medicine strip) and return ONLY a valid JSON object. Extract 'doctorDetails' as a single string (e.g., 'Dr. Name - Speciality'), 'hospitalDetails' as a single string, and 'patientName' as a single string. Then extract an array of 'medicines'. For each medicine, provide: 'name', 'prescribedDoseTiming' (string: the dosage and timing instructed), 'conditionTreated' (string: which problem it solves generally), and 'standardDose' (string: the normal recommended dosage generally). If the image is just a medicine strip, extract the medicine details and leave doctor/hospital blank strings. Format: { \"patientName\": \"...\", \"doctorDetails\": \"...\", \"hospitalDetails\": \"...\", \"medicines\": [ { \"name\": \"...\", \"prescribedDoseTiming\": \"...\", \"conditionTreated\": \"...\", \"standardDose\": \"...\" } ] }" },
                    { type: "image_url", image_url: { url: base64Str } }
                  ]
                }
              ]
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText);
          }

          const data = await response.json();
          if (data.choices && data.choices[0]?.message?.content) {
            const rawContent = data.choices[0].message.content;
            
            // Check if the AI returned a pure safety violation string without any JSON
            if (!rawContent.includes('{') && rawContent.toLowerCase().includes('safet')) {
              throw new Error("AI Safety filter blocked this image. Please try a clearer scan.");
            }

            content = extractAndParseJSON(rawContent);
            
            if (content && content.medicines && content.medicines.length > 0) {
              break; // Success! Break out of the loop
            }
          }
        } catch (err: any) {
          lastError = err.message;
          console.warn(`Model ${model} failed:`, err.message);
        }
      }

      if (!content || !content.medicines) {
        throw new Error(`AI API Error across all models. Last error: ${lastError}`);
      }
      
      setParsedRx(content);
      setUploadSuccess(true);
      
      // Submit to global context so admin can see it too
      submitPrescription(base64Str);
      
      setTimeout(() => setUploadSuccess(false), 8000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Connection to analysis service failed.');
    } finally {
      setIsScanning(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="patient-home animate-fade-in">
      <section className="welcome-banner">
        <div className="welcome-content">
           <h1 className="text-6xl font-black mb-6 tracking-tight leading-tight">Your health support, <br/><span className="text-primary text-glow">delivered to you.</span></h1>
           <p className="text-xl text-muted mb-10 max-w-xl leading-relaxed opacity-80">PharmaCore is your trusted partner in medicine management. Order prescriptions, browse wellness products, and get expert advice 24/7.</p>
           
           <div className="search-box-home">
              <Search size={22} className="text-primary" />
              <input type="text" placeholder="Search medicines, supplements or orders..." />
              <button className="btn btn-primary px-8 py-3 rounded-xl font-bold">Search Now</button>
           </div>
        </div>
        <div className="welcome-stats">
           <div className="panel stat-card text-center">
              <p className="text-4xl font-black text-primary">15min</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-50">Fast Delivery</p>
           </div>
           <div className="panel stat-card text-center">
              <p className="text-4xl font-black text-success">100%</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-50">Original Only</p>
           </div>
        </div>
      </section>

      <section className="rx-upload-row">
        <div className="rx-upload-card">
          <div className="rx-text">
            <div className="badge badge-white mb-6">Live AI Verification</div>
            <h2 className="text-4xl font-black text-white mb-6">Quick Prescription <br/>Digital Scanner</h2>
            <p className="text-white opacity-80 mb-10 text-lg leading-relaxed">Using GPT-4o vision technology, we validate your doctor's instructions instantly. Your medicines are automatically detected and prepared for check-out.</p>
            
            <div className="rx-action-buttons">
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={handleFileChange}
              />
              <button className="btn-white shadow-xl" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <><Loader2 size={20} className="spinner" /> Analyzing...</> : <><Camera size={20} /> Start Scan</>}
              </button>
              <button className="btn-glass" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                 <ImageIcon size={20} /> From Gallery
              </button>
            </div>

            {error && <div className="error-box">{error}</div>}

            {uploadSuccess && (
              <div className="mt-8 flex items-center gap-2 text-white font-bold animate-slide-up">
                <div className="bg-success text-white p-1 rounded-full"><CheckCircle2 size={18} /></div>
                <span>Analysis Complete. Our pharmacist is reviewing your results now!</span>
              </div>
            )}
          </div>
          <div className="rx-visual flex-center">
             <div className={`circle-bg ${isScanning ? 'scanning-active' : ''}`}>
                {isScanning ? <Loader2 size={100} color="white" className="spinner" /> : <Info size={100} color="white" className="opacity-40" />}
             </div>
          </div>
        </div>
      </section>

      {/* AI Validation Modal */}
      {parsedRx && (
          <div className="ai-preview-overlay flex-center" onClick={() => setParsedRx(null)}>
              <div className="ai-preview-panel animate-slide-up" onClick={e => e.stopPropagation()}>
                  <div className="val-header">
                      <h3 className="text-2xl font-black text-main">Validation Output</h3>
                      <button className="close-btn" onClick={() => setParsedRx(null)}>×</button>
                  </div>

                  <div className="val-banner">
                      <CheckCircle2 size={22} />
                      <span>Validation Complete. Please verify extracted details.</span>
                  </div>

                  <div className="val-info-grid">
                      <div className="val-info-item">
                           <span className="val-label">Patient:</span>
                           <span className="val-value">{parsedRx.patientName || 'Not Found'}</span>
                      </div>
                      <div className="val-info-item text-right">
                           <span className="val-label">Doctor Details:</span>
                           <span className="val-value">{parsedRx.doctorDetails || 'Not Found'}</span>
                           <span className="val-label mt-2">Hospital:</span>
                           <span className="text-xs text-muted font-bold">{parsedRx.hospitalDetails || 'Not Found'}</span>
                      </div>
                  </div>

                  <h4 className="val-section-title">Prescribed Medications & Analysis</h4>
                  
                  <div className="val-medicines">
                      {parsedRx.medicines && parsedRx.medicines.map((m: any, i: number) => (
                          <div key={i} className="val-med-card">
                              <p className="val-med-name">{m.name}</p>
                              
                              <div className="val-analysis-grid">
                                  <div className="val-sub-section">
                                      <span className="val-sub-label">Prescribed Dose & Timing</span>
                                      <span className="val-sub-content">{m.prescribedDoseTiming}</span>
                                  </div>
                                  <div className="val-sub-section">
                                      <span className="val-sub-label">Condition Treated</span>
                                      <span className="val-sub-content">{m.conditionTreated}</span>
                                  </div>
                              </div>

                              <hr className="val-divider" />

                              <div className="val-sub-section">
                                  <span className="val-sub-label">Standard Recommended Dose</span>
                                  <div className="val-standard-dose mt-2">
                                      <span className="val-sub-content">{m.standardDose}</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                      {(!parsedRx.medicines || parsedRx.medicines.length === 0) && <p className="text-center text-muted py-8 font-bold">No medications detected. Please try a clearer scan.</p>}
                  </div>
              </div>
          </div>
      )}


      <section className="dashboard-section">
        <div className="section-header">
           <h2 className="text-2xl font-bold">Recommended for You</h2>
           <button className="btn-text">View All <ChevronRight size={18} /></button>
        </div>
        <div className="featured-meds-grid">
           {recommendedMeds.map(med => (
             <div key={med.id} className="med-mini-card panel hover-scale">
                <div className="mini-img flex-center">
                   < PillIcon category={med.category} size={48} />
                </div>
                <div className="mini-info mt-4">
                   <h4 className="font-bold text-main">{med.name}</h4>
                   <p className="text-xs text-muted mb-3">{med.category}</p>
                   <div className="flex-between">
                      <span className="font-bold">AED {med.price.toFixed(2)}</span>
                      <button className="add-mini" onClick={() => addToCart(med, 1)}><Plus size={16} /></button>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </section>

      <section className="dashboard-section mb-20">
        <div className="section-header">
          <h2 className="text-2xl font-bold">Health Categories</h2>
        </div>
        <div className="category-grid-full">
          <CategoryCard icon={<Pill size={32} />} label="Medicines" color="#3b82f6" bg="#eff6ff" count="1.2k+ Items" />
          <CategoryCard icon={<Thermometer size={32} />} label="Personal Care" color="#ef4444" bg="#fef2f2" count="800+ Items" />
          <CategoryCard icon={<Activity size={32} />} label="Devices" color="#10b981" bg="#ecfdf5" count="240+ Items" />
          <CategoryCard icon={<Heart size={32} />} label="Nutrition" color="#f59e0b" bg="#fffbeb" count="560+ Items" />
        </div>
      </section>
    </div>
  );
}

function CategoryCard({ icon, label, color, bg, count }: any) {
    return (
        <div className="cat-card panel-hover flex-center p-8" style={{ flexDirection: 'column', textAlign: 'center' }}>
            <div className="cat-icon-large" style={{ background: bg, color: color }}>
              {icon}
            </div>
            <span className="text-lg font-bold text-main mt-4">{label}</span>
            <p className="text-xs text-muted mt-2">{count}</p>
        </div>
    );
}

function PillIcon({ category, size = 24 }: any) {
    let color = '#ef4444'; // Default to red (Prescription)
    if (category === 'Cold Chain') color = '#3b82f6';
    else if (category === 'OTC') color = '#10b981';
    else if (category === 'Controlled') color = '#f59e0b';
    
    return <div style={{ color }}><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg></div>;
}
