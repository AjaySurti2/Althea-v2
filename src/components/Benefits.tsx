import React from 'react';
import { FileText, TrendingUp, Shield, Download } from 'lucide-react';

interface BenefitsProps {
  darkMode: boolean;
}

export const Benefits: React.FC<BenefitsProps> = ({ darkMode }) => {
  const benefits = [
    {
      icon: FileText,
      title: 'Simplify Medical Records',
      description: 'Transform complex medical jargon into clear, easy-to-understand language that empowers you to make informed decisions.',
      gradient: 'from-green-400 to-emerald-500',
    },
    {
      icon: TrendingUp,
      title: 'Empower Smart Decisions',
      description: 'Get personalized insights and actionable recommendations based on your unique health data and family history.',
      gradient: 'from-blue-400 to-cyan-500',
    },
    {
      icon: Shield,
      title: 'Personalized & Secure',
      description: 'Your health data is encrypted end-to-end and never shared. HIPAA-compliant infrastructure ensures complete privacy.',
      gradient: 'from-purple-400 to-pink-500',
    },
    {
      icon: Download,
      title: 'Download & Share',
      description: 'Generate professional PDF reports of your health summaries to share with doctors, family, or keep for your records.',
      gradient: 'from-orange-400 to-red-500',
    },
  ];

  return (
    <section id="benefits" className={`py-20 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Why Choose Althea?
          </h2>
          <p className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'} max-w-3xl mx-auto`}>
            Take control of your health with AI-powered insights that are secure, personal, and easy to understand
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className={`group p-6 rounded-2xl transition-all duration-300 hover:scale-105 ${
                  darkMode
                    ? 'bg-gray-700/50 hover:bg-gray-700'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-xl'
                }`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {benefit.title}
                </h3>
                <p className={`leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
