import React, { useState } from 'react';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  onAuthClick: (mode: 'signin' | 'signup') => void;
  onLeadClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ darkMode, toggleDarkMode, onAuthClick, onLeadClick }) => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      darkMode ? 'bg-gray-900/95' : 'bg-white/95'
    } backdrop-blur-md shadow-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <img
              src="/Althea Logo Green.jpg"
              alt="Althea Logo"
              className="h-10 w-10 rounded-lg object-cover"
            />
            <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Althea
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <a href="#how-it-works" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
              How It Works
            </a>
            <a href="#benefits" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
              Benefits
            </a>
            <a href="#faq" className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
              FAQ
            </a>

            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <>
                <button
                  onClick={() => window.location.href = '#dashboard'}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={signOut}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onAuthClick('signin')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => onAuthClick('signup')}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className={darkMode ? 'text-white' : 'text-gray-900'} />
            ) : (
              <Menu className={darkMode ? 'text-white' : 'text-gray-900'} />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className={`md:hidden py-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex flex-col space-y-4">
              <a href="#how-it-works" className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                How It Works
              </a>
              <a href="#benefits" className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                Benefits
              </a>
              <a href="#faq" className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                FAQ
              </a>
              {user ? (
                <>
                  <button
                    onClick={() => window.location.href = '#dashboard'}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-left"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={signOut}
                    className={`px-4 py-2 rounded-lg text-left ${
                      darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onAuthClick('signin')}
                    className="px-4 py-2 text-left"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => onAuthClick('signup')}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
