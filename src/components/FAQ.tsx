import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQProps {
  darkMode: boolean;
}

export const FAQ: React.FC<FAQProps> = ({ darkMode }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Is my health data safe and private?',
      answer: 'Absolutely. Your data is encrypted with 256-bit encryption both in transit and at rest. We are HIPAA-compliant and never share your information with third parties. You have complete control over your data and can delete it anytime.',
    },
    {
      question: 'How accurate are the AI-generated insights?',
      answer: 'Our AI uses advanced natural language processing trained on medical literature and validated datasets. However, Althea is designed to complement—not replace—professional medical advice. Always consult with your healthcare provider for medical decisions.',
    },
    {
      question: 'Can Althea replace my doctor?',
      answer: 'No. Althea is a tool to help you understand your health information better and communicate more effectively with your doctor. It provides educational insights and helps you prepare questions, but it does not diagnose conditions or prescribe treatments.',
    },
    {
      question: 'What file formats do you support?',
      answer: 'We support PDF documents, images (JPG, PNG), and plain text files. Our AI can extract information from lab reports, discharge summaries, prescriptions, and most other medical documents.',
    },
    {
      question: 'Can I track health data for my family members?',
      answer: 'Yes! You can create separate profiles for family members and track their health data independently. Our family pattern detection feature can even identify genetic health trends across family members.',
    },
    {
      question: 'How does the family pattern detection work?',
      answer: 'Our AI analyzes health metrics across family member profiles to identify recurring conditions or trends. This can help you understand hereditary health risks and discuss preventive measures with your doctor.',
    },
    {
      question: 'What languages and tones are available?',
      answer: 'You can choose from three tones (Friendly, Professional, Empathetic) and three language levels (Simple, Moderate, Technical). This ensures the explanations match your comfort level and preferred communication style.',
    },
    {
      question: 'Can I download my health reports?',
      answer: 'Yes! You can generate and download professional PDF reports of your health summaries, metrics, and AI insights to share with healthcare providers or keep for your records.',
    },
    {
      question: 'How much does Althea cost?',
      answer: 'We offer a free tier for basic features and premium plans for advanced analytics, unlimited file uploads, and family pattern detection. Join our early access program for special pricing.',
    },
    {
      question: 'Do you integrate with electronic health records (EHR)?',
      answer: 'Currently, we support manual uploads. EHR integration is on our roadmap and will be available in future updates based on user demand and partnerships with healthcare systems.',
    },
  ];

  return (
    <section id="faq" className={`py-20 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-b from-white to-green-50'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Frequently Asked Questions
          </h2>
          <p className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Everything you need to know about Althea
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-xl border overflow-hidden transition-all duration-300 ${
                darkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              } ${openIndex === index ? 'shadow-lg' : ''}`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left transition-colors hover:bg-opacity-80"
              >
                <span className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className={`w-5 h-5 flex-shrink-0 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                )}
              </button>

              {openIndex === index && (
                <div className={`px-6 pb-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
