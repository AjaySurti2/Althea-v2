import React, { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup' | 'lead';
  darkMode: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, mode: initialMode, darkMode }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'lead'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signIn, signUp } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'lead') {
        const { error } = await supabase.from('leads').insert({
          email,
          name: fullName,
          source: 'hero_cta',
        });

        if (error) throw error;
        setSuccess('Thank you! We\'ll be in touch soon with early access details.');
        setTimeout(() => {
          onClose();
          setEmail('');
          setFullName('');
        }, 2000);
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        setSuccess('Account created successfully! You can now sign in.');
        setTimeout(() => {
          setMode('signin');
          setPassword('');
        }, 1500);
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="mb-6">
            <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {mode === 'lead' ? 'Join Early Access' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {mode === 'lead'
                ? 'Get exclusive early access to Althea'
                : mode === 'signup'
                ? 'Start your health journey with Althea'
                : 'Sign in to continue your health journey'}
            </p>
          </div>

          {error && (
            <div className={`mb-4 p-4 rounded-lg border flex items-start space-x-3 ${
              darkMode
                ? 'bg-red-950/50 border-red-800 text-red-200'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                darkMode ? 'text-red-400' : 'text-red-600'
              }`} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className={`mb-4 p-4 rounded-lg border ${
              darkMode
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}>
              <p className="text-sm font-medium">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(mode === 'signup' || mode === 'lead') && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'lead' && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : (
                <span>
                  {mode === 'lead' ? 'Join Waitlist' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                </span>
              )}
            </button>
          </form>

          {mode === 'signin' && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '#forgot-password';
                }}
                className="text-sm text-green-500 hover:text-green-600 font-medium"
              >
                Forgot password?
              </button>
            </div>
          )}

          {mode !== 'lead' && (
            <div className="mt-6 text-center">
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                  className="text-green-500 hover:text-green-600 font-semibold"
                >
                  {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
          )}

          {mode === 'lead' && (
            <p className={`mt-4 text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              By joining, you agree to receive updates about Althea. We respect your privacy and won't spam you.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
