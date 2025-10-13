import React from 'react';
import { Star } from 'lucide-react';

interface TestimonialsProps {
  darkMode: boolean;
}

export const Testimonials: React.FC<TestimonialsProps> = ({ darkMode }) => {
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Mother of Two',
      avatar: '👩',
      content: 'Althea helped me understand my cholesterol results in simple terms. I finally knew what questions to ask my doctor!',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      role: 'Software Engineer',
      avatar: '👨‍💻',
      content: 'As someone who struggles with medical terminology, this is a game-changer. The family pattern detection caught something we never noticed.',
      rating: 5,
    },
    {
      name: 'Emma Rodriguez',
      role: 'Teacher',
      avatar: '👩‍🏫',
      content: 'I can now track my health trends over time and see how lifestyle changes impact my results. The PDF reports are perfect for sharing with specialists.',
      rating: 5,
    },
    {
      name: 'David Thompson',
      role: 'Retired Veteran',
      avatar: '👴',
      content: 'Finally, a tool that respects my privacy while helping me manage multiple health conditions. The empathetic tone option is wonderful.',
      rating: 5,
    },
    {
      name: 'Lisa Park',
      role: 'Fitness Coach',
      avatar: '🏃‍♀️',
      content: 'I use Althea to help my clients understand their lab work and how it relates to their fitness goals. The insights are incredibly valuable.',
      rating: 5,
    },
    {
      name: 'James Wilson',
      role: 'Business Owner',
      avatar: '👨‍💼',
      content: 'Managing my family\'s health records was chaotic until Althea. Now everything is organized and easy to understand. Worth every penny!',
      rating: 5,
    },
  ];

  return (
    <section className={`py-20 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Trusted by Thousands
          </h2>
          <p className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            See what our users are saying about their Althea experience
          </p>
        </div>

        <div className="relative overflow-hidden">
          <div className="flex space-x-6 animate-scroll">
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <div
                key={index}
                className={`flex-shrink-0 w-80 p-6 rounded-2xl ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gradient-to-br from-gray-50 to-gray-100'
                } transition-all duration-300 hover:scale-105`}
              >
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                <p className={`mb-6 leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  "{testimonial.content}"
                </p>

                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {testimonial.name}
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll {
          animation: scroll 30s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};
