import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Truck, CreditCard, ChevronRight, CheckCircle, MapPin, Clock, Wallet, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import './PatientCart.css';

export default function PatientCart() {
  const navigate = useNavigate();
  const { currentUser, createOrder, cart, updateCartQuantity, removeFromCart, clearCart } = useDatabase();
  const [step, setStep] = useState<'cart' | 'delivery' | 'payment' | 'success'>('cart');
  const [deliveryType, setDeliveryType] = useState<'Instant' | 'Scheduled' | 'Pickup'>('Instant');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Card'>('COD');

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vat = subtotal * 0.05;
  const deliveryFee = deliveryType === 'Instant' ? 10 : 0;
  const total = subtotal + vat + deliveryFee;

  const handleConfirmOrder = () => {
    createOrder({
      userId: currentUser?.id || 'GUEST',
      items: cart,
      subtotal,
      vat,
      total,
      deliveryType,
      paymentMethod
    });
    clearCart();
    setStep('success');
  };

  if (step === 'success') {
    return (
      <div className="checkout-success-view flex-center animate-fade-in" style={{ flexDirection: 'column', padding: '5rem 2rem' }}>
        <div className="panel flex-center success-3d-circle" style={{ width: 140, height: 140, borderRadius: '50%', background: '#dcfce7', marginBottom: '2rem', border: '8px solid white' }}>
           <CheckCircle size={72} className="text-success" />
        </div>
        <h1 className="font-extrabold tracking-tight" style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--color-text-main)' }}>Order Confirmed!</h1>
        <p className="text-muted text-center" style={{ fontSize: '1.25rem', marginBottom: '3rem', maxWidth: '32rem', lineHeight: '1.6' }}>
          Your healthcare essentials are being prepared. You can track your rider and live updates in your profile.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)' }} onClick={() => navigate('/patient/profile?tab=orders')}>Track Live Status</button>
            <button className="btn btn-outline" style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', fontWeight: 'bold' }} onClick={() => navigate('/patient/search')}>Continue Shopping</button>
        </div>
      </div>
    );
  }

  if (cart.length === 0 && step === 'cart') {
    return (
        <div className="cart-empty flex-center py-24" style={{ flexDirection: 'column' }}>
            <div className="mb-8 opacity-10"><ShoppingBag size={120} /></div>
            <h2 className="text-3xl font-bold mb-3">Your bag is empty</h2>
            <p className="text-muted mb-10 text-center max-w-sm text-lg">Add some health essentials to your bag to get started with your order.</p>
            <button className="btn btn-primary px-12 py-4 text-lg font-bold" onClick={() => navigate('/patient/search')}>Explore Store</button>
        </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="checkout-steps-horizontal">
         <StepNode num={1} label="Bag" status={step === 'cart' ? 'active' : 'completed'} onClick={() => setStep('cart')} />
         <StepNode num={2} label="Delivery" status={step === 'delivery' ? 'active' : (step === 'payment' ? 'completed' : 'pending')} onClick={() => setStep('delivery')} />
         <StepNode num={3} label="Payment" status={step === 'payment' ? 'active' : 'pending'} onClick={() => setStep('payment')} />
      </div>

      <div className="checkout-page-layout">
        <div className="checkout-main-area">
          {step === 'cart' && (
            <div className="panel-group animate-slide-up">
               <div className="section-header-cart">
                  <h2>Shopping Bag</h2>
                  <p>{cart.length} Items</p>
               </div>
               <div className="cart-list">
                  {cart.map(item => (
                    <div key={item.medicineId} className="patient-cart-item">
                      <div className="item-img-min">
                         <PillIcon category={item.category} size={40} />
                      </div>
                      <div className="item-details">
                        <div className="item-details-top">
                            <div>
                                <h4 className="item-title">{item.name}</h4>
                                <p className="item-category">{item.category} • {item.quantity > 1 ? 'Multi-pack' : 'Single Item'}</p>
                            </div>
                            <div className="item-price">
                                <span>AED {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="item-details-bottom">
                            <button className="btn-remove" onClick={() => removeFromCart(item.medicineId)}>Remove</button>
                            <div className="qty-controls-mini">
                                <button onClick={() => updateCartQuantity(item.medicineId, -1)} disabled={item.quantity <= 1}>-</button>
                                <span>{item.quantity}</span>
                                <button onClick={() => updateCartQuantity(item.medicineId, 1)}>+</button>
                            </div>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {step === 'delivery' && (
            <div className="panel-group animate-slide-up">
               <button onClick={() => setStep('cart')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '1.5rem', padding: '0.5rem 0' }} className="hover-scale"><ArrowLeft size={16}/> Back to Bag</button>
               <h2 className="text-3xl font-extrabold mb-6">Delivery Options</h2>
               <div className="delivery-grid">
                  <DeliveryOption 
                    active={deliveryType === 'Instant'} 
                    onClick={() => setDeliveryType('Instant')}
                    icon={<Truck size={32} />}
                    title="Instant"
                    desc="30-45 Minutes"
                    price="AED 10.00"
                  />
                  <DeliveryOption 
                    active={deliveryType === 'Scheduled'} 
                    onClick={() => setDeliveryType('Scheduled')}
                    icon={<Clock size={32} />}
                    title="Scheduled"
                    desc="Pick your time"
                    price="FREE"
                  />
                  <DeliveryOption 
                    active={deliveryType === 'Pickup'} 
                    onClick={() => setDeliveryType('Pickup')}
                    icon={<MapPin size={32} />}
                    title="Self Pickup"
                    desc="Nearby Branch"
                    price="FREE"
                  />
               </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="panel-group animate-slide-up">
                <button onClick={() => setStep('delivery')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '1.5rem', padding: '0.5rem 0' }} className="hover-scale"><ArrowLeft size={16}/> Back to Delivery</button>
                <h2 className="text-3xl font-extrabold mb-6">Choose Payment Method</h2>
                <div className="payment-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                   <div className={`option-card panel ${paymentMethod === 'COD' ? 'active' : ''}`} onClick={() => setPaymentMethod('COD')}>
                      <Wallet size={32} className="mb-4" />
                      <h4 className="font-bold">Cash on Delivery</h4>
                      <p className="text-xs text-muted">Pay at doorstep</p>
                   </div>
                   <div className={`option-card panel ${paymentMethod === 'Card' ? 'active' : ''}`} onClick={() => setPaymentMethod('Card')}>
                      <CreditCard size={32} className="mb-4" />
                      <h4 className="font-bold">Online Payment</h4>
                      <p className="text-xs text-muted">Secure transaction</p>
                   </div>
                </div>
            </div>
          )}
        </div>

        <div className="summary-sidebar animate-slide-up" style={{ animationDelay: '0.1s' }}>
           <div className="panel" style={{ padding: '2rem' }}>
              <h3 className="text-xl font-extrabold" style={{ marginBottom: '1.5rem' }}>Order Summary</h3>
              <div className="mb-6" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                 <div className="flex-between text-sm">
                    <span className="text-muted font-bold">Subtotal</span>
                    <span className="font-bold">AED {subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex-between text-sm">
                    <span className="text-muted font-bold">VAT (5%)</span>
                    <span className="font-bold">AED {vat.toFixed(2)}</span>
                 </div>
                 <div className="flex-between text-sm">
                    <span className="text-muted font-bold">Delivery Fee</span>
                    <span className="font-bold">{deliveryFee > 0 ? `AED ${deliveryFee.toFixed(2)}` : 'FREE'}</span>
                 </div>
              </div>
              <div className="flex-between" style={{ marginBottom: '2rem', alignItems: 'center' }}>
                 <span className="text-lg font-bold">Total</span>
                 <span className="text-2xl font-black text-primary">AED {total.toFixed(2)}</span>
              </div>

              {step === 'cart' && <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', fontWeight: 700 }} onClick={() => setStep('delivery')}>Checkout Now <ChevronRight size={20} /></button>}
              {step === 'delivery' && <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', fontWeight: 700 }} onClick={() => setStep('payment')}>Continue to Payment <ChevronRight size={20} /></button>}
              {step === 'payment' && <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', fontWeight: 700 }} onClick={handleConfirmOrder}>Finalize Order — AED {total.toFixed(2)}</button>}
              
              <div className="flex-center gap-2 text-xs text-muted" style={{ marginTop: '1.5rem' }}>
                 <ShieldCheck size={16} className="text-success" />
                 <span>Secure Checkout Powered by PharmaCore</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StepNode({ num, label, status, onClick }: any) {
    return (
        <div className={`step-node ${status}`} onClick={onClick} style={{ cursor: 'pointer' }}>
            <div className="step-num">{num}</div>
            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        </div>
    );
}

function DeliveryOption({ active, onClick, icon, title, desc, price }: any) {
    return (
        <div className={`option-card panel ${active ? 'active' : ''}`} onClick={onClick}>
            <div style={{ color: 'var(--color-primary)' }}>{icon}</div>
            <h4 className="text-md font-bold mt-4">{title}</h4>
            <p className="text-xs text-muted mb-2">{desc}</p>
            <span className="text-sm font-bold text-primary">{price}</span>
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
