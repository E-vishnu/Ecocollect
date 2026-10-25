import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  Leaf, 
  Smartphone, 
  Truck, 
  ShieldCheck,
  Lock, 
  User as UserIcon, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { User, Role } from '../types';

interface AuthPageProps {
  onLogin: (user: User) => void;
  onSignUp: (newUser: User) => void;
  existingUsers: User[];
  defaultRole?: Role;
  onCancel?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLogin,
  onSignUp,
  existingUsers,
  defaultRole = 'resident',
  onCancel
}) => {
  const { t } = useLanguage();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [activeRole, setActiveRole] = useState<Role>(defaultRole);
  
  // Login Form
  const [loginUsername, setLoginUsername] = useState(
    defaultRole === 'agent' ? 'agent@ecocollect.demo' : defaultRole === 'admin' ? 'admin@ecocollect.demo' : 'resident@ecocollect.demo'
  );
  const [loginPassword, setLoginPassword] = useState(
    defaultRole === 'agent' ? 'Agent@123' : defaultRole === 'admin' ? 'Admin@123' : 'Resident@123'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sign Up Form
  const [signupFullName, setSignupFullName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupStreet, setSignupStreet] = useState('');
  const [signupArea, setSignupArea] = useState('');
  const [signupPincode, setSignupPincode] = useState('');
  const [signupUpiId, setSignupUpiId] = useState('');

  const handleRoleChange = (role: Role) => {
    setActiveRole(role);
    setErrorMsg('');
    setSuccessMsg('');
    if (role === 'resident') {
      setLoginUsername('resident@ecocollect.demo');
      setLoginPassword('Resident@123');
    } else if (role === 'agent') {
      setLoginUsername('agent@ecocollect.demo');
      setLoginPassword('Agent@123');
    } else if (role === 'admin') {
      setLoginUsername('admin@ecocollect.demo');
      setLoginPassword('Admin@123');
    }
  };

  const executeRealLogin = async (emailOrUser: string, pass: string, profileRole?: Role) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    const expectedRole = profileRole || activeRole;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailOrUser.trim(),
          password: pass,
          role: expectedRole
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || t('auth.invalidCredentials', 'Invalid email or password.'));
        setIsLoading(false);
        return;
      }

      // Read authenticated user's actual role and verify against selected profile
      if (data.user.role !== expectedRole) {
        setErrorMsg('These credentials belong to a different account type.');
        setIsLoading(false);
        return;
      }

      // Save JWT token & session state
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ecocollect_token', data.token);
        localStorage.setItem('ecocollect_user', JSON.stringify(data.user));
        localStorage.setItem('ecocollect_session_role', data.user.role);
      }

      setSuccessMsg(t('auth.loginSuccess', 'Successfully authenticated! Redirecting to portal...'));
      setTimeout(() => {
        setIsLoading(false);
        onLogin(data.user);
      }, 350);
    } catch (err: any) {
      console.error('Login error:', err);
      // Fallback to local match if server unavailable
      const local = existingUsers.find(
        u => u.email.toLowerCase() === emailOrUser.trim().toLowerCase() ||
             u.username.toLowerCase() === emailOrUser.trim().toLowerCase()
      );
      if (local) {
        if (local.role !== expectedRole) {
          setErrorMsg('These credentials belong to a different account type.');
          setIsLoading(false);
          return;
        }

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('ecocollect_user', JSON.stringify(local));
          localStorage.setItem('ecocollect_session_role', local.role);
        }

        setSuccessMsg(t('auth.loginSuccess', 'Successfully authenticated! Redirecting to portal...'));
        setTimeout(() => {
          setIsLoading(false);
          onLogin(local);
        }, 350);
      } else {
        setErrorMsg('Authentication error. Please verify credentials.');
        setIsLoading(false);
      }
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setErrorMsg('Please enter both username/email and password.');
      return;
    }
    executeRealLogin(loginUsername, loginPassword, activeRole);
  };

  const handleQuickDemoLogin = (email: string, pass: string, role: Role) => {
    setActiveRole(role);
    setLoginUsername(email);
    setLoginPassword(pass);
    executeRealLogin(email, pass, role);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    if (!signupFullName.trim() || !signupPassword.trim()) {
      setErrorMsg('Please fill in Full Name and Password.');
      setIsLoading(false);
      return;
    }

    const emailToUse = signupEmail.trim() || `${signupUsername.trim().toLowerCase() || 'resident_' + Date.now()}@ecocollect.demo`;

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupFullName.trim(),
          username: signupUsername.trim() || emailToUse.split('@')[0],
          email: emailToUse,
          password: signupPassword,
          role: activeRole,
          phone: signupPhone.trim() || '+91 98450 00000',
          address: {
            street: signupStreet.trim() || 'Ward Collection Point',
            area: signupArea.trim() || 'Indiranagar',
            city: 'Bengaluru',
            pincode: signupPincode.trim() || '560001'
          },
          upiId: signupUpiId.trim() || `${emailToUse.split('@')[0]}@okbank`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Registration failed. Try a different email.');
        setIsLoading(false);
        return;
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ecocollect_token', data.token);
        localStorage.setItem('ecocollect_user', JSON.stringify(data.user));
        localStorage.setItem('ecocollect_session_role', data.user.role);
      }

      setSuccessMsg(t('auth.signUpSuccess', 'Account created and authenticated!'));
      setTimeout(() => {
        setIsLoading(false);
        onSignUp(data.user);
      }, 350);
    } catch (err: any) {
      console.error('Sign up error:', err);
      setErrorMsg('Network error creating account.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        
        {/* Top Header with Brand */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white p-6 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-inner shadow-emerald-400">
                <Leaf className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <h1 className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
                  <span>EcoCollect</span>
                  <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Auth
                  </span>
                </h1>
                <p className="text-xs text-slate-300">
                  {t('appName')} • {t('tagline')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
            <p className="text-xs text-emerald-300 font-medium">
              {authMode === 'login' ? t('auth.welcomeBack') : t('auth.createAccountTitle')}
            </p>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
              >
                {t('auth.closeContinueGuest', 'Close / Continue as Guest')}
              </button>
            )}
          </div>
        </div>

        {/* Role Toggle Selector */}
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            {t('auth.roleSelectPrompt')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              id="auth-role-resident-btn"
              onClick={() => handleRoleChange('resident')}
              className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                activeRole === 'resident'
                  ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${activeRole === 'resident' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">
                  {t('auth.roleResident', 'Resident')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                  {t('auth.roleResidentDesc', 'Doorstep pickup & buyback payouts')}
                </div>
              </div>
            </button>

            <button
              type="button"
              id="auth-role-agent-btn"
              onClick={() => handleRoleChange('agent')}
              className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                activeRole === 'agent'
                  ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${activeRole === 'agent' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">
                  {t('auth.roleAgent', 'Collection Agent')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                  {t('auth.roleAgentDesc', 'Ward routes & IoT scale weighing')}
                </div>
              </div>
            </button>

            <button
              type="button"
              id="auth-role-admin-btn"
              onClick={() => handleRoleChange('admin')}
              className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                activeRole === 'admin'
                  ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${activeRole === 'admin' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">
                  {t('auth.roleAdmin', 'Municipal Admin')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                  {t('auth.roleAdminDesc', 'Citywide oversight & pricing rules')}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Tab switcher: Login vs Sign Up */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            id="tab-auth-login"
            onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
              authMode === 'login'
                ? 'border-emerald-600 text-emerald-700 bg-white font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 bg-slate-100/60'
            }`}
          >
            {t('login')} ({activeRole === 'resident' ? t('auth.roleResident') : activeRole === 'agent' ? t('auth.roleAgent') : t('auth.roleAdmin')})
          </button>
          <button
            type="button"
            id="tab-auth-signup"
            onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
              authMode === 'signup'
                ? 'border-emerald-600 text-emerald-700 bg-white font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900 bg-slate-100/60'
            }`}
          >
            {t('signUp')} (New {activeRole === 'resident' ? 'Resident' : activeRole === 'agent' ? 'Agent' : 'Admin'})
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Body Forms */}
        <div className="p-6">
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('auth.username')}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="login-username-input"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder={t('auth.usernamePlaceholder')}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password-input"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="login-submit-button"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>{t('auth.signInButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Quick Demo Logins */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {t('auth.quickDemoLogins', 'Verified Demo Accounts (1-Click Authenticate)')}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {t('auth.realJwtFlow', 'Real JWT Auth Flow')}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    id="demo-account-resident"
                    disabled={isLoading}
                    onClick={() => handleQuickDemoLogin('resident@ecocollect.demo', 'Resident@123', 'resident')}
                    className="text-left p-3 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/80 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                        <Smartphone className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900 truncate">
                          {t('auth.residentDemo', 'Resident Demo: Priya Sharma')}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          resident@ecocollect.demo • Indiranagar
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-800 self-start sm:self-auto shrink-0">
                      {t('nav.resident', 'Resident Portal')}
                    </span>
                  </button>

                  <button
                    type="button"
                    id="demo-account-agent"
                    disabled={isLoading}
                    onClick={() => handleQuickDemoLogin('agent@ecocollect.demo', 'Agent@123', 'agent')}
                    className="text-left p-3 rounded-xl bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200/80 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-blue-900 truncate">
                          {t('auth.agentDemo', 'Agent Demo: Rajesh Kumar')}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          agent@ecocollect.demo • EV Van KA-01-EQ-9988
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-200 text-blue-800 self-start sm:self-auto shrink-0">
                      {t('nav.agent', 'Agent HUD')}
                    </span>
                  </button>

                  <button
                    type="button"
                    id="demo-account-admin"
                    disabled={isLoading}
                    onClick={() => handleQuickDemoLogin('admin@ecocollect.demo', 'Admin@123', 'admin')}
                    className="text-left p-3 rounded-xl bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200/80 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-purple-900 truncate">
                          {t('auth.adminDemo', 'Admin Demo: Dr. Ramesh Rao')}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          admin@ecocollect.demo • Municipal Oversight
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-200 text-purple-800 self-start sm:self-auto shrink-0">
                      {t('nav.admin', 'Admin Hub')}
                    </span>
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="text-xs text-slate-600 hover:text-emerald-600 font-semibold"
                >
                  {t('auth.noAccountPrompt')} <span className="text-emerald-600 font-bold underline">{t('signUp')}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('auth.fullName')} *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="signup-fullname-input"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      placeholder={t('auth.fullNamePlaceholder')}
                      required
                      className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('auth.username')} *
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 text-xs font-bold absolute left-3.5 top-1/2 -translate-y-1/2">@</span>
                    <input
                      type="text"
                      id="signup-username-input"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      placeholder={t('auth.usernamePlaceholder')}
                      required
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('auth.password')} *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      id="signup-password-input"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                      className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('auth.phone')}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      id="signup-phone-input"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      placeholder={t('auth.phonePlaceholder')}
                      className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    id="signup-email-input"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Address Details */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{t('auth.serviceLocationTitle', 'Service Location & Doorstep Address')}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {t('auth.street')}
                  </label>
                  <input
                    type="text"
                    id="signup-street-input"
                    value={signupStreet}
                    onChange={(e) => setSignupStreet(e.target.value)}
                    placeholder={t('auth.streetPlaceholder')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {t('auth.area')}
                    </label>
                    <input
                      type="text"
                      id="signup-area-input"
                      value={signupArea}
                      onChange={(e) => setSignupArea(e.target.value)}
                      placeholder={t('auth.areaPlaceholder')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {t('auth.pincode')}
                    </label>
                    <input
                      type="text"
                      id="signup-pincode-input"
                      value={signupPincode}
                      onChange={(e) => setSignupPincode(e.target.value)}
                      placeholder={t('auth.pincodePlaceholder')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* UPI ID for resident payouts */}
              {activeRole === 'resident' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('auth.upiId')}
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="signup-upi-input"
                      value={signupUpiId}
                      onChange={(e) => setSignupUpiId(e.target.value)}
                      placeholder={t('auth.upiIdPlaceholder')}
                      className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <Sparkles className="w-3 h-3" />
                    {t('auth.upiNote')}
                  </p>
                </div>
              )}

              <button
                type="submit"
                id="signup-submit-button"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>{t('auth.signUpButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-xs text-slate-600 hover:text-emerald-600 font-semibold"
                >
                  {t('auth.haveAccountPrompt')} <span className="text-emerald-600 font-bold underline">{t('login')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
