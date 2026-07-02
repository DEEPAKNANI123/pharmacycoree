import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldPlus, User, Lock, Mail, ChevronRight, UserPlus, CheckCircle, Smartphone, Globe, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import './Login.css';

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSignup = location.pathname === '/signup';
  
  const [mode, setMode] = useState<'login' | 'signup'>(isSignup ? 'signup' : 'login');
  
  useEffect(() => {
    setMode(location.pathname === '/signup' ? 'signup' : 'login');
  }, [location.pathname]);

  const [role, setRole] = useState<'admin' | 'patient'>('patient');
  const [email, setEmail] = useState('patient@example.com');
  const [password, setPassword] = useState('patient123');
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+971');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, signup } = useDatabase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      if (!/^[A-Za-z\s]+$/.test(name)) {
        setError('Name must contain only alphabetical characters');
        return;
      }
      if (!/^\d{9,12}$/.test(phone)) {
        setError('Phone number must be between 9 and 12 numeric digits');
        return;
      }
      if (!email.toLowerCase().endsWith('@gmail.com')) {
        setError('Email must be in @gmail.com format');
        return;
      }
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_-]).{8,}$/;
      if (!passwordRegex.test(password)) {
        setError('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character');
        return;
      }
    }

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
        const fullPhone = `${countryCode} ${phone}`;
        const success = await signup({ email, name, role, phone: fullPhone }, password);
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
              onClick={() => {
                setRole('patient');
                if (mode === 'login') {
                  setEmail('patient@example.com');
                  setPassword('patient123');
                }
              }}
              disabled={loading}
            >
              Patient
            </button>
            <button 
              className={`role-btn ${role === 'admin' ? 'active' : ''}`} 
              onClick={() => {
                setRole('admin');
                if (mode === 'login') {
                  setEmail('admin@pharmacy.com');
                  setPassword('admin123');
                }
              }}
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
                  <div className="phone-input-wrapper">
                    <select 
                      className="country-code-select"
                      value={countryCode} 
                      onChange={(e) => setCountryCode(e.target.value)}
                      disabled={loading}
                    >
                      <option value="+971">+971 (UAE)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+91">+91 (IN)</option>
                    </select>
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 12))} 
                      required 
                      placeholder="123456789012"
                      disabled={loading}
                      maxLength={12}
                    />
                  </div>
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
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder={role === 'admin' ? 'admin123' : 'patient123'}
                  required
                  disabled={loading}
                />
                <button 
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
              onClick={() => {
                const newMode = mode === 'login' ? 'signup' : 'login';
                navigate(`/${newMode}`);
                if (newMode === 'login') {
                  setEmail(role === 'admin' ? 'admin@pharmacy.com' : 'patient@example.com');
                  setPassword(role === 'admin' ? 'admin123' : 'patient123');
                } else {
                  setEmail('');
                  setPassword('');
                }
              }}
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
