import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { User, MapPin, Users, Package, ChevronRight, Phone, Mail, Clock, CreditCard, Shield, ShieldCheck, CheckCircle2, Gift, Award, TrendingUp } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import './PatientProfile.css';

export default function PatientProfile() {
  const { currentUser, orders } = useDatabase();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = (searchParams.get('tab') as any) || 'profile';
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses' | 'payments' | 'rewards'>(initialTab);

  const userOrders = orders.filter(o => o.userId === currentUser?.id);

  return (
    <div className="profile-container animate-fade-in">
      <div className="profile-sidebar">
         <div className="panel profile-hero">
            <div className="avatar-large flex-center">
              <User size={48} className="text-primary" />
            </div>
            <h2 className="mt-4 text-2xl font-bold">{currentUser?.name || 'Guest User'}</h2>
            <p className="text-muted text-sm mb-6">{currentUser?.email}</p>
            <div className="badge badge-primary-light">Vip Member</div>
         </div>

         <div className="profile-nav-tabs">
            <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
               <User size={20} /> My Profile
            </button>
            <button className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
               <Package size={20} /> Order History
            </button>
            <button className={`tab-btn ${activeTab === 'addresses' ? 'active' : ''}`} onClick={() => setActiveTab('addresses')}>
               <MapPin size={20} /> Saved Addresses
            </button>
            <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
               <CreditCard size={20} /> Payment Methods
            </button>
            <button className={`tab-btn ${activeTab === 'rewards' ? 'active' : ''}`} onClick={() => setActiveTab('rewards')}>
               <Gift size={20} /> Loyalty & Rewards
            </button>
         </div>
      </div>

      <div className="tab-content-area">
         {activeTab === 'profile' && <AccountDetails currentUser={currentUser} />}
         {activeTab === 'orders' && <OrderHistory userOrders={userOrders} />}
         {activeTab === 'rewards' && <LoyaltyRewards currentUser={currentUser} userOrders={userOrders} />}
         {(activeTab === 'addresses' || activeTab === 'payments') && (
             <div className="flex-center py-20 opacity-50" style={{ flexDirection: 'column' }}>
                 <Clock size={64} className="mb-4" />
                 <h2 className="text-2xl font-bold">Coming Soon</h2>
                 <p>We are working on this feature!</p>
             </div>
         )}
      </div>
    </div>
  );
}

function AccountDetails({ currentUser }: any) {
    return (
        <div className="account-settings animate-slide-up">
            <div className="section-header" style={{ marginBottom: '2.5rem' }}>
                <h2 className="text-3xl font-bold">Account Settings</h2>
                <p className="text-muted text-lg mt-2">Manage your personal information and preferences.</p>
            </div>

            <div className="account-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <DetailCard icon={<Mail size={24} />} label="Email Address" value={currentUser?.email || ''} />
                <DetailCard icon={<Phone size={24} />} label="Phone Number" value={currentUser?.phone || 'Not Provided'} />
            </div>

            <div className="shipping-box panel" style={{ marginTop: '2rem', padding: '2rem' }}>
                <div className="flex-between" style={{ marginBottom: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={20} className="text-primary" />
                        <span className="font-bold">Shipping Address</span>
                    </div>
                    <button className="btn-text" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>Edit</button>
                </div>
                <p className="text-muted leading-relaxed" style={{ fontSize: '1.1rem' }}>{currentUser?.address || 'No address saved.'}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                <div className="panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <Users size={20} className="text-primary" />
                        <span className="font-bold text-sm uppercase tracking-wider text-muted">Family Members</span>
                    </div>
                    <p className="text-2xl font-bold">{currentUser?.familyMembers?.length || 0} Registered Citizens</p>
                </div>
                <div className="panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <Shield size={20} className="text-primary" />
                        <span className="font-bold text-sm uppercase tracking-wider text-muted">Security</span>
                    </div>
                    <p className="text-2xl font-bold">Two-Factor Enabled</p>
                </div>
            </div>
        </div>
    );
}

function OrderHistory({ userOrders }: any) {
    const downloadReceipt = async (order: any) => {
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();
            
            doc.setFontSize(22);
            doc.setTextColor(16, 185, 129);
            doc.text("Aesthetic Pharmacy", 105, 20, { align: "center" });
            
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text("PHARMACYCORE MEDICAL CENTER", 105, 28, { align: "center" });
            doc.text("Phone: +971 493926355", 105, 34, { align: "center" });
            
            doc.setDrawColor(226, 232, 240);
            doc.line(20, 42, 190, 42);
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text(`Order ID: ${order.id}`, 20, 52);
            doc.text(`Date: ${new Date(order.date).toLocaleString()}`, 20, 58);
            doc.text(`Payment: ${order.paymentMethod}`, 20, 64);
            
            doc.text(`Delivery: ${order.deliveryType}`, 190, 52, { align: "right" });
            doc.text(`Status: ${order.status}`, 190, 58, { align: "right" });

            doc.line(20, 72, 190, 72);
            
            let y = 82;
            doc.setFontSize(11);
            doc.setTextColor(100, 116, 139);
            doc.text("Particulars", 20, y);
            doc.text("Qty", 130, y);
            doc.text("Amount", 170, y);
            
            y += 4;
            doc.line(20, y, 190, y);
            y += 8;
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            order.items.forEach((item: any) => {
                doc.text(`${item.name} (${item.unit})`, 20, y);
                doc.text(item.quantity.toString(), 130, y);
                doc.text(item.price.toFixed(2), 170, y);
                y += 8;
            });
            
            y += 4;
            doc.line(20, y, 190, y);
            y += 10;
            
            doc.setFontSize(12);
            doc.text("Subtotal:", 130, y);
            doc.text(`AED ${order.subtotal.toFixed(2)}`, 190, y, { align: "right" });
            y += 8;
            
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text("VAT (5%):", 130, y);
            doc.text(`AED ${order.vat.toFixed(2)}`, 190, y, { align: "right" });
            y += 8;
            
            doc.setFontSize(14);
            doc.setTextColor(16, 185, 129);
            doc.text("Total:", 130, y);
            doc.text(`AED ${order.total.toFixed(2)}`, 190, y, { align: "right" });
            
            y += 20;
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text("Thank You For Your Order!", 105, y, { align: "center" });
            doc.text("Wish You a Speedy Recovery!", 105, y + 6, { align: "center" });
            
            doc.save(`receipt-${order.id}.pdf`);
        } catch (error) {
            console.error("Failed to generate PDF", error);
            alert("Failed to generate receipt. Please try again.");
        }
    };

    return (
        <div className="order-history animate-slide-up">
            <div style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Order History</h2>
                <p className="text-muted" style={{ fontSize: '1.125rem' }}>Track and manage your recent prescriptions and orders.</p>
            </div>
            
            {userOrders.length === 0 ? (
                <div className="flex-center py-20" style={{ flexDirection: 'column', opacity: 0.5 }}>
                    <Package size={64} className="mx-auto mb-4" />
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>No orders found yet</p>
                    <button className="btn btn-primary" style={{ padding: '0.75rem 2.5rem', fontSize: '1rem', fontWeight: 'bold' }} onClick={() => window.location.href='/patient/search'}>Place Your First Order</button>
                </div>
            ) : (
                <div className="order-list">
                    {userOrders.map((order: any) => (
                        <div key={order.id} className="order-history-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <p className="text-primary tracking-widest" style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Order ID: {order.id}</p>
                                    <p className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ordered on {new Date(order.date).toLocaleDateString()}</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                    <div className={`status-pill status-${order.status.toLowerCase().replace(/ /g, '-')}`}>
                                        {order.status}
                                    </div>
                                    <p className="text-muted tracking-widest" style={{ fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{order.deliveryType} Delivery</p>
                                </div>
                            </div>

                            <div className="tracking-visual-desktop mb-8">
                                <TrackingStep label="Placed" active={true} completed={true} />
                                <TrackingStep label="Processing" active={order.status !== 'Order Placed'} completed={['Packed', 'Out for Delivery', 'Delivered'].includes(order.status)} />
                                <TrackingStep label="Out for Delivery" active={['Out for Delivery', 'Delivered'].includes(order.status)} completed={order.status === 'Delivered'} />
                                <TrackingStep label="Delivered" active={order.status === 'Delivered'} completed={order.status === 'Delivered'} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', background: '#f8fafc', margin: '2.5rem -2.5rem -2.5rem -2.5rem', padding: '1.5rem 2.5rem', borderRadius: '0 0 20px 20px' }}>
                                <div>
                                    <span className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Total amount: </span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>AED {order.total.toFixed(2)}</span>
                                </div>
                                <button className="btn btn-outline" style={{ padding: '0.5rem 1.5rem', fontSize: '0.875rem', fontWeight: 'bold' }} onClick={() => downloadReceipt(order)}>View Receipt</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function DetailCard({ icon, label, value }: any) {
    return (
        <div className="panel hover-scale" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="text-muted uppercase text-[11px] font-bold tracking-wider">
                {icon} {label}
            </div>
            <p className="text-lg font-bold text-main" style={{ marginTop: '0.25rem' }}>{value}</p>
        </div>
    );
}

function TrackingStep({ label, active, completed }: any) {
    return (
        <div className={`track-node ${active ? 'active' : ''} ${completed ? 'completed' : ''}`}>
            <div className="track-circle">
                {completed ? <CheckCircle2 size={16} /> : <div className="dot" />}
            </div>
            <span className="track-label">{label}</span>
        </div>
    );
}

function LoyaltyRewards({ currentUser, userOrders }: any) {
    const totalSpent = userOrders.reduce((sum: number, o: any) => sum + o.total, 0);
    const points = Math.floor(totalSpent);
    
    let tier = 'Bronze';
    let nextTier = 'Silver';
    let progress = 0;
    let max = 1000;

    if (points >= 5000) {
        tier = 'Gold';
        nextTier = 'Max Tier';
        progress = 100;
        max = 5000;
    } else if (points >= 1000) {
        tier = 'Silver';
        nextTier = 'Gold';
        progress = ((points - 1000) / 4000) * 100;
        max = 5000;
    } else {
        progress = (points / 1000) * 100;
        max = 1000;
    }

    return (
        <div className="loyalty-rewards animate-slide-up">
            <div className="section-header mb-10">
                <h2 className="text-3xl font-bold">Loyalty & Rewards</h2>
                <p className="text-muted text-lg mt-2">Earn points on every purchase and unlock exclusive benefits.</p>
            </div>

            <div className={`tier-card tier-${tier.toLowerCase()} mb-10`}>
                <div className="flex-between">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-widest mb-2 opacity-80">Current Status</p>
                        <h3 className="text-5xl font-black mb-2 flex-center gap-3"><Award size={40} /> {tier} Member</h3>
                        <p className="text-lg opacity-90">{points.toLocaleString()} Points Balance</p>
                    </div>
                    <div className="progress-ring-container">
                        <svg className="progress-ring" width="120" height="120">
                            <circle className="ring-bg" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="transparent" r="52" cx="60" cy="60"/>
                            <circle className="ring-fill" stroke="white" strokeWidth="8" strokeDasharray={`${progress * 3.26} 326`} strokeLinecap="round" fill="transparent" r="52" cx="60" cy="60"/>
                        </svg>
                        <div className="ring-text">
                            <span className="font-bold text-xl">{Math.round(progress)}%</span>
                        </div>
                    </div>
                </div>
                {tier !== 'Gold' && (
                    <div className="mt-8 pt-6 border-t border-white/20">
                        <p className="font-bold opacity-90">Earn {(max - points).toLocaleString()} more points to reach {nextTier} tier!</p>
                    </div>
                )}
            </div>

            <h3 className="text-xl font-bold mb-6">Recent Point Activity</h3>
            <div className="points-history panel p-0 overflow-hidden">
                {userOrders.slice(0, 5).map((o: any) => (
                    <div key={o.id} className="point-row flex-between p-6 border-b border-slate-100 last:border-0">
                        <div className="flex-center gap-4">
                            <div className="icon-box bg-blue-50 text-primary p-3 rounded-xl">
                                <Package size={20} />
                            </div>
                            <div>
                                <p className="font-bold">Order #{o.id}</p>
                                <p className="text-xs text-muted">{new Date(o.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-success flex-center gap-1 justify-end"><TrendingUp size={16} /> +{Math.floor(o.total)}</p>
                            <p className="text-[10px] text-muted uppercase mt-1">Points Earned</p>
                        </div>
                    </div>
                ))}
                {userOrders.length === 0 && (
                    <p className="p-8 text-center text-muted font-bold">No point history yet. Make an order to start earning!</p>
                )}
            </div>
        </div>
    );
}
