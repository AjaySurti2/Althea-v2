import React, { useState, useEffect } from 'react';
import {
  Upload,
  Settings,
  Sparkles,
  Download,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  Image as ImageIcon,
  File,
  Clock,
  TrendingUp,
  Lock,
  AlertCircle,
  Sliders
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HowItWorksProps {
  darkMode: boolean;
  onAuthRequired: () => void;
  onNavigateToDashboard?: () => void;
}

interface Step {
  id: number;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  actionLabel: string;
  features: string[];
  details: {
    title: string;
    items: string[];
  };
  techSpecs?: {
    title: string;
    items: string[];
  };
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ darkMode, onAuthRequired, onNavigateToDashboard }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const steps: Step[] = [
    {
      id: 1,
      icon: Upload,
      title: 'Describe',
      subtitle: 'Upload clinical documents',
      description: 'Securely upload your medical documents. We support multiple formats and extract key information automatically.',
      actionLabel: 'Choose Files',
      features: ['PDF, JPG, PNG, DOCX, TXT', 'Multiple files per session', 'Drag & drop support'],
      details: {
        title: 'Data Preview & Validation',
        items: [
          'View extracted profile name and report date',
          'Review key metrics and lab information',
          'Confirm accuracy before AI processing',
          'Supported: Lab results, prescriptions, doctor notes'
        ]
      },
      techSpecs: {
        title: 'File Requirements',
        items: [
          'Maximum file size: 10MB per document',
          'Up to 5 files per session',
          'Automatic OCR for image-based reports',
          'HIPAA-compliant encrypted storage'
        ]
      }
    },
    {
      id: 2,
      icon: Sliders,
      title: 'Customize',
      subtitle: 'Personalize your experience',
      description: 'Choose how you want your health information explained. Select tone and language level that matches your preferences.',
      actionLabel: 'Set Preferences',
      features: ['Tone: Friendly | Professional | Empathetic', 'Language: Basic | Intermediate | Professional', 'Save preferences for future'],
      details: {
        title: 'Personalization Options',
        items: [
          'Friendly Tone: Warm, conversational, encouraging',
          'Professional Tone: Clinical, detailed, precise',
          'Empathetic Tone: Compassionate, supportive, reassuring',
          'Basic Language: Simple terms, minimal jargon',
          'Intermediate: Balanced medical terminology',
          'Professional: Technical language, comprehensive'
        ]
      },
      techSpecs: {
        title: 'AI Customization',
        items: [
          'OpenAI GPT-4 powered interpretations',
          'Dynamic prompt engineering per selection',
          'Context-aware explanations',
          'Preference memory for returning users'
        ]
      }
    },
    {
      id: 3,
      icon: Sparkles,
      title: 'Generate',
      subtitle: 'AI interprets your data',
      description: 'Our AI analyzes your documents and generates clear, personalized explanations in seconds with 90%+ accuracy.',
      actionLabel: 'Start Processing',
      features: ['Processing time: Under 5 seconds', 'Accuracy: 90%+ for standard labs', 'HIPAA compliant analysis'],
      details: {
        title: 'What You Get',
        items: [
          'Plain-language summary of findings',
          'Key health metrics extracted and explained',
          'Personalized questions for your doctor',
          'Risk indicators and recommendations',
          'Normal range comparisons',
          'Trend analysis (if historical data available)'
        ]
      },
      techSpecs: {
        title: 'Processing Pipeline',
        items: [
          'OpenAI API with custom health prompts',
          'Real-time processing status updates',
          'Automatic quality validation checks',
          'Error handling with fallback options'
        ]
      }
    },
    {
      id: 4,
      icon: Download,
      title: 'Track & Download',
      subtitle: 'Save and share results',
      description: 'Download your personalized health report as a professional PDF. Track trends and share with caregivers securely.',
      actionLabel: 'Download Report',
      features: ['Branded PDF with logo', 'Health App integration', 'Caregiver sharing'],
      details: {
        title: 'Report Contents',
        items: [
          'Executive summary with key findings',
          'Complete health metrics breakdown',
          'Visual charts and trend graphs',
          'Doctor discussion questions',
          'Personalized health recommendations',
          'Historical comparison (if available)'
        ]
      },
      techSpecs: {
        title: 'Export & Integration',
        items: [
          'PDF generation with custom branding',
          'Apple Health and Google Fit integration',
          'Secure sharing links with expiration',
          'Email delivery with password protection'
        ]
      }
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleStepClick = (index: number) => {
    if (index !== currentStep) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(index);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleActionClick = () => {
    if (!user) {
      onAuthRequired();
    } else {
      // User is logged in, navigate to dashboard
      if (onNavigateToDashboard) {
        onNavigateToDashboard();
      } else {
        // Fallback: use hash navigation
        window.location.hash = '#dashboard';
      }
    }
  };

  return (
    <section
      id="how-it-works"
      className={`py-20 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-b from-white via-green-50/30 to-white'}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            className={`text-4xl md:text-5xl font-bold mb-4 transition-all duration-500 ${darkMode ? 'text-white' : 'text-gray-900'}`}
          >
            How Althea Works
          </h2>
          <p
            className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'} max-w-3xl mx-auto mb-6 transition-all duration-500`}
          >
            From upload to insights in four simple steps
          </p>
          {!user && (
            <div
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-500 ${
                darkMode ? 'bg-amber-900/30 text-amber-400 border border-amber-800' : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Sign up to access full features</span>
            </div>
          )}
        </div>

        {/* Stepper Navigation */}
        <div className="mb-12">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4 overflow-x-auto pb-4 max-w-4xl">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;

                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => handleStepClick(index)}
                      className="flex flex-col items-center space-y-2 min-w-[100px] transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    >
                      <div
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/30'
                            : isCompleted
                            ? darkMode ? 'bg-green-600' : 'bg-green-500'
                            : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-8 h-8 text-white" />
                        ) : (
                          <Icon className={`w-8 h-8 ${isActive ? 'text-white' : darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        )}
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-semibold ${
                          isActive
                            ? darkMode ? 'text-white' : 'text-gray-900'
                            : darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {step.title}
                        </p>
                      </div>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={`hidden md:block w-16 h-0.5 ${
                        index < currentStep
                          ? darkMode ? 'bg-green-600' : 'bg-green-500'
                          : darkMode ? 'bg-gray-700' : 'bg-gray-300'
                      } transition-colors duration-300`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div
          className={`rounded-3xl p-8 md:p-12 transition-all duration-300 ${
            isAnimating ? 'opacity-50' : 'opacity-100'
          } ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white shadow-xl'
          }`}
        >
          {/* Step Header */}
          <div className="flex items-start space-x-6 mb-8">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                {React.createElement(steps[currentStep].icon, { className: "w-10 h-10 text-white" })}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                }`}>
                  Step {steps[currentStep].id}
                </span>
              </div>
              <h3 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {steps[currentStep].subtitle}
              </h3>
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {steps[currentStep].description}
              </p>
            </div>
          </div>

          {/* Key Features */}
          <div className="mb-8">
            <h4 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Key Features
            </h4>
            <div className="flex flex-wrap gap-3">
              {steps[currentStep].features.map((feature, idx) => (
                <span
                  key={idx}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all duration-300 ${
                    darkMode
                      ? 'bg-gray-700 text-gray-300 border border-gray-600'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <Check className="w-4 h-4" />
                  <span>{feature}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Detailed Information */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Details Section */}
            <div className={`p-6 rounded-xl ${
              darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {steps[currentStep].details.title}
              </h4>
              <ul className="space-y-3">
                {steps[currentStep].details.items.map((item, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start space-x-3 text-sm ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      darkMode ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tech Specs Section */}
            {steps[currentStep].techSpecs && (
              <div className={`p-6 rounded-xl border-2 border-dashed ${
                darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-emerald-50/50 border-emerald-200'
              }`}>
                <h4 className={`text-lg font-semibold mb-4 flex items-center space-x-2 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  <AlertCircle className="w-5 h-5 text-emerald-500" />
                  <span>{steps[currentStep].techSpecs.title}</span>
                </h4>
                <ul className="space-y-3">
                  {steps[currentStep].techSpecs.items.map((item, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start space-x-3 text-sm ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-center">
            <button
              onClick={handleActionClick}
              className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                user
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 cursor-pointer'
                  : 'bg-gradient-to-r from-green-500/70 to-emerald-600/70 text-white shadow-lg cursor-pointer hover:from-green-500 hover:to-emerald-600'
              }`}
            >
              {user ? steps[currentStep].actionLabel : 'Sign Up to Continue'}
            </button>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
              currentStep === 0
                ? darkMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-900 hover:shadow-lg border border-gray-200'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Previous</span>
          </button>

          {/* Progress Dots */}
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => handleStepClick(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-8 bg-gradient-to-r from-green-400 to-emerald-500'
                    : darkMode ? 'w-2.5 bg-gray-700 hover:bg-gray-600' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
              currentStep === steps.length - 1
                ? darkMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/30'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Call to Action */}
        {!user && (
          <div className="mt-12 text-center transition-all duration-500">
            <p className={`text-lg mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Ready to understand your health data?
            </p>
            <button
              onClick={onAuthRequired}
              className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-green-500/40 transition-all duration-300 transform hover:scale-105"
            >
              Get Started Free
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
