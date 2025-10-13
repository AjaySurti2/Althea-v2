import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface HeroProps {
  darkMode: boolean;
  onGetStarted: () => void;
  onEarlyAccess: () => void;
}

export const Hero: React.FC<HeroProps> = ({ darkMode, onGetStarted, onEarlyAccess }) => {
  return (
    <section className={`pt-32 pb-20 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-b from-green-50 to-white'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-green-500 rounded-full shadow-sm">
              <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                AI-Powered Health Intelligence
              </span>
            </div>

            <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold leading-tight ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              AI That Translates{' '}
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 text-transparent bg-clip-text">
                Medicine
              </span>{' '}
              into Meaning
            </h1>

            <p className={`text-xl leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Empower yourself with clear, personalized insights from your medical reports. Althea helps you
              understand your health, track trends, and ask the right questions—so you can take charge of your
              care with confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onGetStarted}
                className="group px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onEarlyAccess}
                className={`px-8 py-4 rounded-xl font-semibold border-2 transition-all duration-300 ${
                  darkMode
                    ? 'border-gray-700 text-white hover:bg-gray-800'
                    : 'border-gray-300 text-gray-900 hover:bg-gray-50'
                }`}
              >
                Join Early Access
              </button>
            </div>

            <div className="flex items-center space-x-8 pt-4">
              <div>
                <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  256-bit
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Encryption
                </div>
              </div>
              <div className={`h-12 w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <div>
                <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  HIPAA
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Compliant
                </div>
              </div>
              <div className={`h-12 w-px ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <div>
                <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  100%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Private
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-3xl blur-3xl opacity-20 animate-pulse`} />
            <div className={`relative rounded-3xl p-8 ${
              darkMode ? 'bg-gray-800/50' : 'bg-white'
            } shadow-2xl backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="space-y-6">
                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-green-50'}`}>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                      AI
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Instant Medical Report Analysis
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Upload your lab results, get clear explanations in seconds
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-emerald-50'}`}>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                      ��
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Track Health Trends Over Time
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Visualize your health journey and spot patterns early
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                      👨‍⚕️
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Smart Doctor Questions
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Get personalized questions to ask your healthcare provider
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
