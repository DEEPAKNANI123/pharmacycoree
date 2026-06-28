import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Minus, ShoppingBag, Info, Star, ShieldCheck } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import './PatientSearch.css';

export default function PatientSearch() {
  const { inventory, addToCart } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [qty, setQty] = useState(1);

  const filtered = useMemo(() => {
    return inventory.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter(m => m.category !== 'Controlled');
  }, [inventory, searchTerm]);

  const handleAddToCart = () => {
    if (selectedMed) {
        addToCart(selectedMed, qty);
        setSelectedMed(null);
        setQty(1);
    }
  };

  const fastAddToCart = (e: React.MouseEvent, med: any) => {
    e.stopPropagation();
    addToCart(med, 1);
  };

  return (
    <div className="patient-search-container">
      <div className="search-header">
        <div className="search-bar">
          <Search size={22} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search for medicines, vitamins, wellness products..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-between" style={{ marginBottom: '2rem', alignItems: 'center' }}>
          <h2 className="text-2xl font-extrabold text-main">Recommended for You</h2>
          <p className="text-sm font-bold text-muted bg-white px-4 py-1 rounded-full border">Showing {filtered.length} products</p>
      </div>

      <div className="search-results">
        {filtered.map(med => (
          <div key={med.id} className="med-result-card" onClick={() => { setSelectedMed(med); setQty(1); }}>
            <div className="med-img-placeholder">
              <PillIcon category={med.category} size={64} />
            </div>
            <div className="med-info">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">{med.category}</p>
              <h4 className="text-lg font-bold text-main line-clamp-1 mb-1">{med.name}</h4>
              <div className="flex items-center gap-1 mb-4">
                 {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#f59e0b" color="#f59e0b" />)}
                 <span className="text-[11px] font-bold text-muted ml-1">(4.8)</span>
              </div>
              <div className="flex-between mt-auto">
                <span className="text-xl font-black text-main">AED {med.price.toFixed(2)}</span>
                <button className="add-small" onClick={(e) => fastAddToCart(e, med)}><Plus size={20} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedMed && (
        <div className="med-details-overlay" onClick={() => setSelectedMed(null)}>
           <div className="med-details-panel animate-slide-up" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setSelectedMed(null)}><X size={20} /></button>
              
              <div className="med-details-left">
                 <div className="flex-center" style={{ flexDirection: 'column', height: '100%', padding: '2rem 0' }}>
                    <div className="mb-8 hover-scale" style={{ transformOrigin: 'center' }}>
                       <PillIcon category={selectedMed.category} size={160} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                       <div className="panel flex-center hover-scale" style={{ width: 80, height: 80, border: '2px solid var(--color-primary)', background: '#eff6ff', cursor: 'pointer' }}>
                           <PillIcon category={selectedMed.category} size={32} />
                       </div>
                       <div className="panel flex-center hover-scale" style={{ width: 80, height: 80, background: '#f8fafc', border: '2px solid transparent', cursor: 'pointer' }}>
                           <Info size={32} className="text-muted" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="med-details-right" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                 <div className="badge badge-primary-light mb-4" style={{ alignSelf: 'flex-start' }}>{selectedMed.category}</div>
                 <h1 className="text-4xl font-extrabold text-main mb-3">{selectedMed.name}</h1>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                       {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="#f59e0b" color="#f59e0b" />)}
                    </div>
                    <span className="text-sm font-bold text-muted">124 Reviews</span>
                 </div>

                 <p className="text-muted mb-10 leading-relaxed text-lg" style={{ opacity: 0.9 }}>
                    PharmaCore certified medication. This product is stored in a {selectedMed.storage.toLowerCase()} environment to ensure maximum efficacy and safety.
                 </p>

                 <div className="flex-between mb-8 pb-8" style={{ borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span className="text-xs text-muted font-bold uppercase tracking-widest">Total Price</span>
                        <span className="text-4xl font-black text-main">AED {selectedMed.price.toFixed(2)}</span>
                    </div>
                    <div className="qty-selector" style={{ background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '16px', display: 'flex', gap: '1.5rem', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                       <button onClick={() => setQty(q => Math.max(1, q-1))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0.5rem' }} className="hover-scale"><Minus size={20} /></button>
                       <span className="font-bold text-xl w-8 text-center" style={{ width: '2rem', textAlign: 'center' }}>{qty}</span>
                       <button onClick={() => setQty(q => q+1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0.5rem' }} className="hover-scale"><Plus size={20} /></button>
                    </div>
                 </div>

                 <div className="flex-column gap-4">
                    <button className="btn btn-primary btn-full py-4 flex-center gap-3 text-lg shadow-lg hover-scale" style={{ transition: 'all 0.2s' }} onClick={handleAddToCart}>
                       <ShoppingBag size={24} /> Add to Cart — AED {(selectedMed.price * qty).toFixed(2)}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f8fafc', borderRadius: '9999px', border: '1px solid #f1f5f9' }} className="text-xs text-muted font-bold">
                          <ShieldCheck size={16} className="text-success" />
                          <span>Genuine Product</span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f8fafc', borderRadius: '9999px', border: '1px solid #f1f5f9' }} className="text-xs text-muted font-bold">
                          <Star size={16} className="text-success" />
                          <span>Free Consultation</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function PillIcon({ category, size = 24 }: { category: string, size?: number }) {
    let color = '#ef4444'; // Default to red (Prescription)
    if (category === 'Cold Chain') color = '#3b82f6';
    else if (category === 'OTC') color = '#10b981';
    else if (category === 'Controlled') color = '#f59e0b';
    
    return <div style={{ color }}><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg></div>;
}
