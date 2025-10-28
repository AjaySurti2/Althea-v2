import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { resetPassword, verifyResetToken } from '../lib/passwordResetApi';
import { useAuth } from '../contexts/AuthContext';

interface ResetPasswordProps {
  darkMode: boolean;
  onSuccess: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ darkMode, onSuccess }) => {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      setVerifying(true);
      const { isValid, error: verifyError } = await verifyResetToken();

      if (verifyError || !isValid) {
        setError('Invalid or expired reset link. Please request a new password reset.');
        setTokenValid(false);
      } else {
        setTokenValid(true);
      }
      setVerifying(false);
    };

    checkToken();
  }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (password.length > 72) {
      return 'Password must be less than 72 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { success: resetSuccess, error: resetError } = await resetPassword(newPassword);

      if (resetError) {
        throw resetError;
      }

      if (resetSuccess) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string; width: string } => {
    if (password.length === 0) return { strength: '', color: '', width: '0%' };
    if (password.length < 6) return { strength: 'Weak', color: 'bg-red-500', width: '33%' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { strength: 'Weak', color: 'bg-red-500', width: '33%' };
    if (score <= 4) return { strength: 'Medium', color: 'bg-yellow-500', width: '66%' };
    return { strength: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (verifying) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-emerald-50 to-teal-100'
      }`}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            Verifying reset link...
          </p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className={`min-h-screen flex items-center justify-center py-12 px-4 ${
        darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-emerald-50 to-teal-100'
      }`}>
        <div className="max-w-md w-full">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl p-8`}>
            <div className={`p-4 rounded-lg border flex items-start space-x-3 mb-6 ${
              darkMode
                ? 'bg-red-950/50 border-red-800'
                : 'bg-red-50 border-red-300'
            }`}>
              <AlertCircle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                darkMode ? 'text-red-400' : 'text-red-600'
              }`} />
              <div>
                <p className={`font-medium ${darkMode ? 'text-red-200' : 'text-red-900'}`}>
                  Invalid Reset Link
                </p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                  {error}
                </p>
              </div>
            </div>

            <button
              onClick={() => window.location.href = '#forgot-password'}
              className="w-full py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              Request New Reset Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-emerald-50 to-teal-100'
    }`}>
      <div className="max-w-md w-full space-y-8">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl p-8`}>
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Reset Your Password
            </h2>
            <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Create a strong, secure password for your account
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
                    Password Reset Successful!
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                    Your password has been updated. Redirecting to dashboard...
                  </p>
                </div>
              </div>
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
                <label htmlFor="newPassword" className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  New Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    placeholder="Enter new password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                      darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Password Strength:
                      </span>
                      <span className={`text-xs font-medium ${
                        passwordStrength.strength === 'Strong' ? 'text-green-500' :
                        passwordStrength.strength === 'Medium' ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {passwordStrength.strength}
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                  </div>
                )}

                <div className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <p className="font-medium mb-1">Password must contain:</p>
                  <ul className="space-y-1 ml-4">
                    <li className={newPassword.length >= 6 ? 'text-green-500' : ''}>
                      • At least 6 characters
                    </li>
                    <li className={/[A-Z]/.test(newPassword) ? 'text-green-500' : ''}>
                      • One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(newPassword) ? 'text-green-500' : ''}>
                      • One lowercase letter
                    </li>
                    <li className={/[0-9]/.test(newPassword) ? 'text-green-500' : ''}>
                      • One number
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-2 ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                    placeholder="Confirm new password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                      darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || newPassword !== confirmPassword}
                className="w-full py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
