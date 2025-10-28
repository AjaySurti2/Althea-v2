import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { sendPasswordResetEmail } from '../lib/passwordResetApi';

interface ForgotPasswordProps {
  darkMode: boolean;
  onBackToLogin: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ darkMode, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await sendPasswordResetEmail(email);

      if (resetError) {
        throw resetError;
      }

      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-emerald-50 to-teal-100'
    }`}>
      <div className="max-w-md w-full space-y-8">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl p-8`}>
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Forgot Password?
            </h2>
            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No worries! Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className={`p-4 rounded-lg border flex items-start space-x-3 ${
                darkMode
                  ? 'bg-green-950/50 border-green-800'
                  : 'bg-green-50 border-green-300'
              }`}>
                <CheckCircle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                  darkMode ? 'text-green-400' : 'text-green-600'
                }`} />
                <div>
                  <p className={`font-medium ${darkMode ? 'text-green-200' : 'text-green-900'}`}>
                    Check your email!
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                    If an account exists with that email, we've sent password reset instructions.
                    Please check your inbox and spam folder.
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} border ${
                darkMode ? 'border-gray-600' : 'border-blue-200'
              }`}>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-blue-900'}`}>
                  <strong>Important:</strong>
                </p>
                <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-gray-400' : 'text-blue-800'}`}>
                  <li>• The reset link expires in 1 hour for security</li>
                  <li>• Check your spam or junk folder</li>
                  <li>• Make sure you entered the correct email</li>
                  <li>• You can request another link if needed</li>
                  <li>• Click the link immediately after receiving it</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setSuccess(false);
                  setError('');
                }}
                className="w-full py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
              >
                Send Another Email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className={`p-4 rounded-lg border flex items-start space-x-3 ${
                  darkMode
                    ? 'bg-red-950/50 border-red-800'
                    : 'bg-red-50 border-red-300'
                }`}>
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    darkMode ? 'text-red-400' : 'text-red-600'
                  }`} />
                  <p className={`text-sm font-medium ${darkMode ? 'text-red-200' : 'text-red-900'}`}>
                    {error}
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="email" className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6">
            <button
              onClick={onBackToLogin}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Login</span>
            </button>
          </div>

          <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong>Security Note:</strong> For your protection, we don't reveal whether an email address
              is registered in our system. You'll receive an email only if your account exists.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
