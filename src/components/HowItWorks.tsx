import React from 'react';
import { Upload, Settings, Sparkles, BarChart3, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HowItWorksProps {
  darkMode: boolean;
  onAuthRequired: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ darkMode, onAuthRequired }) => {
  const { user } = useAuth();

  const steps = [
    {
      icon: Upload,
      title: 'Upload Your Reports',
      description: 'Securely upload medical reports, lab results, or prescriptions in PDF, image, or text format. Multiple files supported.',
      features: ['Multi-file upload', 'Auto text extraction', 'Preview & validate'],
    },
    {
      icon: Settings,
      title: 'Customize Your Experience',
      description: 'Choose your preferred tone and language level for explanations that match your comfort level.',
      features: ['Friendly/Professional/Empathetic', 'Simple to Technical', 'Family profiles'],
    },
    {
      icon: Sparkles,
      title: 'Get AI Insights',
      description: 'Our AI analyzes your reports and generates clear summaries, health metrics, and personalized doctor questions.',
      features: ['Plain-language summaries', 'Key metrics extraction', 'Smart recommendations'],
    },
    {
      icon: BarChart3,
      title: 'Track & Share',
      description: 'View your health history, spot trends, detect family patterns, and download professional PDF reports.',
      features: ['Historical tracking', 'Family patterns', 'PDF downloads'],
    },
  ];

  const handleStepClick = () => {
    if (!user) {
      onAuthRequired();
    }
  };

  return (
    <section id="how-it-works" className={`py-20 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-b from-white to-green-50'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            How Althea Works
          </h2>
          <p className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'} max-w-3xl mx-auto mb-6`}>
            From upload to insights in four simple steps
          </p>
          {!user && (
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg ${
              darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
            }`}>
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Authentication required to access health features</span>
            </div>
          )}
        </div>

        <div className="space-y-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;

            return (
              <div
                key={index}
                className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 items-center`}
              >
                <div className="flex-1">
                  <div
                    onClick={handleStepClick}
                    className={`relative p-8 rounded-2xl transition-all duration-300 cursor-pointer ${
                      darkMode
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-white hover:shadow-xl'
                    } ${!user ? 'opacity-75' : ''} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    {!user && (
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-green-500/5 rounded-2xl pointer-events-none" />
                    )}

                    <div className="flex items-start space-x-4 mb-6">
                      <div className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {step.title}
                        </h3>
                        <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {step.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            darkMode
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div className={`w-48 h-48 rounded-3xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl ${
                    !user ? 'opacity-50' : ''
                  }`}>
                    <Icon className="w-24 h-24 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!user && (
          <div className="mt-12 text-center">
            <button
              onClick={onAuthRequired}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300"
            >
              Sign Up to Get Started
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
