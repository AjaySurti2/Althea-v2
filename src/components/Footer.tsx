import React from 'react';
import { Mail, Twitter, Linkedin, Github } from 'lucide-react';

interface FooterProps {
  darkMode: boolean;
}

export const Footer: React.FC<FooterProps> = ({ darkMode }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`py-12 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900 border-t border-gray-800' : 'bg-gray-50 border-t border-gray-200'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img
                src="/Althea-Logo-Green.jpg"
                alt="Althea Logo"
                className="h-10 w-10 rounded-lg object-cover"
              />
              <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Althea
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Your personal health interpreter. AI-powered insights that translate medicine into meaning.
            </p>
          </div>

          <div>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Product
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#how-it-works" className={`text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-green-400' : 'text-gray-600 hover:text-green-600'}`}>
                  How It Works
                </a>
              </li>
              <li>
                <a href="#benefits" className={`text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-green-400' : 'text-gray-600 hover:text-green-600'}`}>
                  Benefits
                </a>
              </li>
              <li>
                <a href="#faq" className={`text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-green-400' : 'text-gray-600 hover:text-green-600'}`}>
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-green-400' : 'text-gray-600 hover:text-green-600'}`}>
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className={`text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-green-400' : 'text-gray-600 hover:text-green-600'}`}>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-green-400' : 'text-gray-600 hover:text-green-600'}`}>
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-green-400' : 'text-gray-600 hover:text-green-600'}`}>
                  HIPAA Compliance
                </a>
              </li>
              <li>
                <a href="#" className={`text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-green-400' : 'text-gray-600 hover:text-green-600'}`}>
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Connect
            </h3>
            <div className="flex space-x-4 mb-4">
              <a
                href="#"
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-300'
                }`}
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-300'
                }`}
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="#"
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-300'
                }`}
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="mailto:hello@althea.health"
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-300'
                }`}
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              hello@althea.health
            </p>
          </div>
        </div>

        <div className={`pt-8 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              © {currentYear} Althea Health. All rights reserved.
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Made with care for your health journey
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
