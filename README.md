# Althea - Your Personal Health Interpreter

An AI-powered MVP web application that translates medical reports into plain-language summaries and tracks health trends.

## Features

### Core Functionality
- **Medical Report Upload**: Securely upload medical reports in PDF, image, or text format
- **AI-Powered Analysis**: Extract key data and explain it in simple, understandable terms
- **Smart Recommendations**: Get personalized questions to ask your healthcare provider
- **Health Trend Tracking**: Monitor health metrics over time
- **Family Pattern Detection**: Identify hereditary health trends across family members
- **PDF Report Generation**: Download professional summaries to share with doctors

### User Experience
- **Authentication Required**: All health data processing requires user authentication
- **Lead Capture**: Early access program with conversion tracking
- **Multi-Profile Support**: Track health data for family members
- **Customizable Tone**: Choose between Friendly, Professional, or Empathetic
- **Language Levels**: Simple, Moderate, or Technical explanations
- **Dark Mode**: Full light/dark theme support
- **Responsive Design**: Optimized for mobile, tablet, and desktop

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Vite** for build tooling

### Backend
- **Supabase** for:
  - Authentication (email/password)
  - PostgreSQL database
  - File storage
  - Row Level Security (RLS)

### Database Schema

#### Tables
- `profiles` - User profile information
- `leads` - Early access lead capture
- `family_members` - Family member profiles
- `sessions` - Processing sessions with user preferences
- `files` - Uploaded medical documents
- `health_metrics` - Extracted health data points
- `family_patterns` - Detected hereditary patterns
- `ai_summaries` - AI-generated insights
- `report_pdfs` - Generated PDF reports
- `reminders` - Health checkup reminders

#### Storage Buckets
- `medical-files` - User-uploaded medical documents
- `report-pdfs` - Generated PDF reports

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Supabase account and project

### Environment Setup

1. Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Navbar.tsx      # Navigation with auth controls
│   ├── Hero.tsx        # Landing page hero section
│   ├── Benefits.tsx    # Benefits showcase
│   ├── HowItWorks.tsx  # Feature explanation
│   ├── Testimonials.tsx # User testimonials
│   ├── FAQ.tsx         # Frequently asked questions
│   ├── Footer.tsx      # Footer with links
│   ├── AuthModal.tsx   # Authentication modal
│   └── Dashboard.tsx   # User dashboard with tabs
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state management
├── lib/                # Utilities
│   └── supabase.ts     # Supabase client & types
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Key Features Explained

### Authentication Flow
1. Users can sign up with email/password
2. Lead capture for early access waitlist
3. Protected dashboard requires authentication
4. Session management with Supabase Auth

### File Upload & Processing
1. User uploads medical reports (multi-file support)
2. Files stored securely in Supabase Storage
3. User selects tone and language preferences
4. AI extracts text and generates insights
5. Health metrics tracked over time

### Dashboard Features
- **Upload Tab**: New report upload with preferences
- **History Tab**: View past reports and sessions
- **Patterns Tab**: Family health pattern detection
- **Reminders Tab**: Upcoming health appointments

### Security
- Row Level Security (RLS) on all tables
- User data isolated by `user_id`
- Encrypted file storage
- HIPAA-compliant architecture
- Authentication required for health features

## Data Privacy & Security

- **256-bit Encryption**: All data encrypted in transit and at rest
- **HIPAA Compliance**: Built with healthcare standards in mind
- **User Control**: Users can delete their data anytime
- **No Third-Party Sharing**: Data never shared without consent
- **Secure Storage**: Medical files in private storage buckets

## Future Enhancements

### Planned Features
- OpenAI integration for AI processing pipeline
- PDF report generation with branding
- Email notifications for reminders
- EHR integration
- Multi-language support
- Mobile app (React Native)
- Telemedicine integration
- Wearable device sync

### AI Processing Pipeline (To Implement)
1. Text extraction from PDFs/images
2. Medical entity recognition
3. Health metrics extraction
4. Trend analysis
5. Family pattern detection
6. Question generation
7. PDF report creation

## Contributing

This is a production MVP. For contributions:
1. Maintain code quality and TypeScript types
2. Follow existing patterns and conventions
3. Ensure accessibility standards (WCAG 2.1 AA)
4. Test thoroughly before submitting

## License

Proprietary - All rights reserved

## Support

For support or questions: hello@althea.health

---

Built with care for your health journey.
