import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldPlus, User, Lock, Mail, ChevronRight, UserPlus, CheckCircle, Smartphone, Globe, ShieldCheck } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import './Login.css';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<'admin' | 'patient'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, signup } = useDatabase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await login(email, password);
        if (user) {
          // If they chose the "wrong" tab but authenticated, we redirect to their correct dashboard
          setTimeout(() => {
            navigate(user.role === 'admin' ? '/admin/dashboard' : '/patient/dashboard');
          }, 500);
        } else {
          setError('Authentication failed. Please check your credentials.');
        }
      } else {
        const success = await signup({ email, name, role, phone }, password);
        if (success) {
          setMode('login');
          setError('Account created! Please check your email for a confirmation link (if enabled) and then sign in.');
        } else {
          setError('Registration failed.');
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Email not confirmed') {
        setError('Please confirm your email address before signing in.');
      } else if (err.message === 'invalid password or username' || err.message.includes('Invalid login credentials')) {
        setError('invalid password or username');
      } else if (err.message === 'user not registered') {
        setError('user not registered');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Hero Section - Only on Desktop */}
      <div className="login-hero animate-fade-in">
         <div className="hero-logo">
            <ShieldPlus size={48} color="white" fill="white" style={{ opacity: 0.9 }} />
            <h1>PharmaCore</h1>
         </div>
         <div className="hero-content">
            <h2>The smarter way to <br/>manage pharmacy.</h2>
            <p className="text-xl opacity-80 max-w-md">Experience a unified healthcare ecosystem designed for pharmacists and patients alike.</p>
            
            <div className="hero-features">
               <div className="feature-item">
                  <Smartphone size={24} className="text-white" />
                  <span>Real-time Mobile Order Tracking</span>
               </div>
               <div className="feature-item">
                  <Globe size={24} className="text-white" />
                  <span>Seamless Global Stock Management</span>
               </div>
               <div className="feature-item">
                  <ShieldCheck size={24} className="text-white" />
                  <span>AI-Powered Rx Validation</span>
               </div>
            </div>
         </div>
         <div className="hero-footer mt-auto opacity-50 text-xs">
            © 2026 PharmaCore Systems. UAE Approved Software.
         </div>
      </div>

      {/* Right Form Section */}
      <div className="login-form-area animate-slide-up">
        <div className="login-panel">
          <div className="login-header">
            <div className="logo-box">
              <ShieldPlus size={32} color="white" />
            </div>
            <h2 className="text-2xl font-bold text-main">
              {mode === 'login' ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="text-muted mt-2">
               {mode === 'login' ? `Sign in as ${role === 'admin' ? 'pharmacist' : 'patient'}` : `Join our network as a ${role === 'admin' ? 'pharmacist' : 'patient'}`}
            </p>
          </div>
          
          <div className="role-selector">
            <button 
              className={`role-btn ${role === 'patient' ? 'active' : ''}`} 
              onClick={() => setRole('patient')}
              disabled={loading}
            >
              Patient
            </button>
            <button 
              className={`role-btn ${role === 'admin' ? 'active' : ''}`} 
              onClick={() => setRole('admin')}
              disabled={loading}
            >
              Pharmacist
            </button>
          </div>

          {error && (
            <div className={`login-error ${error.includes('created') ? 'success' : 'danger'}`}>
               {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'signup' && (
              <>
                <div className="form-group">
                  <label><User size={16} /> Full Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label><Smartphone size={16} /> Phone Number (Unique ID)</label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    required 
                    placeholder="+971 50 123 4567"
                    disabled={loading}
                  />
                </div>
              </>
            )}
            <div className="form-group">
              <label><Mail size={16} /> Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder={role === 'admin' ? 'admin@pharmacy.com' : 'patient@example.com'}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label><Lock size={16} /> Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder={role === 'admin' ? 'admin123' : 'patient123'}
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? (
                <span className="spinner-text">Authenticating...</span>
              ) : (
                <>
                  {mode === 'login' ? `Sign In as ${role === 'admin' ? 'Pharmacist' : 'Patient'}` : 'Create Account'}
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>



          <div className="login-footer">
            <button 
              className="link-btn" 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              disabled={loading}
            >
              {mode === 'login' ? (
                <><UserPlus size={16} /> New here? Create account</>
              ) : (
                'Already have an account? Sign In'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
