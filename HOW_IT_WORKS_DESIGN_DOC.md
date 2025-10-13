# How It Works Module - Comprehensive Design Document

## Executive Summary

This document outlines the complete redesign of the "How It Works" module for Althea Health Interpreter, a clinical data interpretation platform. The redesign transforms a static presentation into an interactive, animated stepper interface that guides users through the 4-step process of uploading, customizing, processing, and downloading health reports.

---

## Table of Contents

1. [Design Overview](#design-overview)
2. [User Experience & Interface Design](#user-experience--interface-design)
3. [Technical Implementation](#technical-implementation)
4. [Step-by-Step Specifications](#step-by-step-specifications)
5. [Animation & Interaction Design](#animation--interaction-design)
6. [OpenAI API Integration Strategy](#openai-api-integration-strategy)
7. [Data Persistence & User Preferences](#data-persistence--user-preferences)
8. [Responsive Design Considerations](#responsive-design-considerations)
9. [Accessibility & Performance](#accessibility--performance)
10. [Future Enhancements](#future-enhancements)

---

## Design Overview

### Core Objectives

1. **Educational**: Clearly communicate the platform's 4-step workflow
2. **Interactive**: Allow users to explore each step in detail
3. **Engaging**: Use animations and transitions to maintain interest
4. **Action-oriented**: Drive user conversion through clear CTAs
5. **Professional**: Maintain medical credibility while being approachable

### Design Philosophy

- **Progressive Disclosure**: Show overview first, reveal details on interaction
- **Visual Hierarchy**: Use size, color, and spacing to guide attention
- **Feedback-Rich**: Provide immediate visual feedback for all interactions
- **Context-Aware**: Adapt content based on authentication status

---

## User Experience & Interface Design

### Navigation Paradigm

**Horizontal Stepper with Multiple Interaction Points:**

1. **Top Navigation Bar**
   - Circular icon buttons for each step
   - Visual states: Inactive, Active, Completed
   - Connecting lines show progress
   - Direct jump to any step (if authenticated)

2. **Content Cards**
   - Large, prominent display area
   - Smooth slide transitions between steps
   - Rich content including features, details, and technical specs

3. **Bottom Navigation**
   - Previous/Next buttons for linear progression
   - Progress dots indicator
   - Disabled states for boundary conditions

### Visual States

**Step Indicators:**
- **Inactive**: Gray background, muted icon
- **Active**: Green gradient, white icon, glow effect
- **Completed**: Solid green, checkmark icon
- **Disabled** (not authenticated): Reduced opacity, no hover

**Content Transitions:**
- Slide animation (20px horizontal movement)
- Fade effect (opacity 0 to 1)
- Duration: 300ms with ease-out timing

---

## Technical Implementation

### Technology Stack

**Core Technologies:**
- **React 18.3.1**: Component framework
- **TypeScript 5.5.3**: Type safety
- **Framer Motion 11.x**: Animation library
- **Tailwind CSS 3.4.1**: Styling framework
- **Lucide React**: Icon library

**Animation Library Choice: Framer Motion**

Selected for:
- Declarative animation syntax
- Built-in gesture support
- Layout animations
- Exit animations with AnimatePresence
- Performance optimization

### Component Architecture

```typescript
interface Step {
  id: number;                  // Step number (1-4)
  icon: React.ElementType;     // Lucide icon component
  title: string;               // Short title (Describe, Customize, etc.)
  subtitle: string;            // Descriptive subtitle
  description: string;         // Full description
  actionLabel: string;         // CTA button text
  features: string[];          // Key features (3-4 items)
  details: {                   // Detailed information section
    title: string;
    items: string[];
  };
  techSpecs?: {               // Technical specifications (optional)
    title: string;
    items: string[];
  };
}
```

### State Management

```typescript
const [currentStep, setCurrentStep] = useState(0);  // Active step index
const { user } = useAuth();                         // Authentication context
```

**State Transitions:**
- Step navigation updates `currentStep`
- Triggers AnimatePresence re-render
- Updates visual indicators across all UI elements

---

## Step-by-Step Specifications

### Step 1: Describe - Upload Clinical Documents

**Primary Goal**: Enable secure file upload with format validation

**Visual Design:**
- Icon: Upload (up arrow in box)
- Color: Green gradient (#4ade80 to #10b981)
- Primary action: "Choose Files"

**Supported Formats:**
- PDF (lab reports, medical documents)
- JPG/PNG (scanned documents, photos of reports)
- DOCX (doctor's notes)
- TXT (plain text medical records)

**Technical Requirements:**
- Maximum file size: 10MB per document
- Maximum files per session: 5
- Total session size limit: 50MB
- MIME type validation
- Drag & drop support with visual feedback

**Data Preview Components:**

```typescript
interface FilePreview {
  fileName: string;
  fileSize: number;
  fileType: string;
  extractedData: {
    profileName?: string;
    reportDate?: Date;
    labName?: string;
    keyMetrics: Array<{
      name: string;
      value: string;
      unit?: string;
    }>;
  };
}
```

**User Validation Workflow:**
1. Files uploaded and displayed in list
2. OCR/text extraction runs automatically
3. Preview modal shows extracted data
4. User confirms accuracy
5. System validates data completeness
6. Proceed to customization enabled

**Database Schema:**
```sql
-- Already exists in supabase/migrations
CREATE TABLE files (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES sessions,
  user_id uuid REFERENCES auth.users,
  storage_path text,
  file_name text,
  file_type text,
  file_size bigint,
  extracted_text text,
  validation_status text CHECK (validation_status IN ('pending', 'validated', 'rejected')),
  created_at timestamptz DEFAULT now()
);
```

---

### Step 2: Customize - Personalize Experience

**Primary Goal**: Capture user preferences for AI interpretation

**Visual Design:**
- Icon: Sliders (settings/customization)
- Color: Green gradient
- Primary action: "Set Preferences"

**Tone Options:**

| Option | Description | AI Prompt Modifier |
|--------|-------------|-------------------|
| **Friendly** | Warm, conversational, encouraging | "Explain in a warm, friendly tone as if talking to a friend. Use encouraging language and positive framing." |
| **Professional** | Clinical, detailed, precise | "Provide a professional medical explanation with precise terminology. Be thorough and clinical in your assessment." |
| **Empathetic** | Compassionate, supportive, reassuring | "Deliver information with empathy and compassion. Acknowledge concerns and provide reassuring context." |

**Language Level Options:**

| Level | Description | Target Audience | AI Prompt Modifier |
|-------|-------------|----------------|-------------------|
| **Basic** | Simple terms, minimal jargon | General public, patients with no medical background | "Use simple, everyday language. Avoid medical jargon or explain any technical terms in plain English." |
| **Intermediate** | Balanced medical terminology | Patients with some health literacy, family members | "Balance medical terminology with clear explanations. Use common medical terms but provide context." |
| **Professional** | Technical language, comprehensive | Healthcare professionals, patients with medical knowledge | "Use technical medical terminology and provide comprehensive clinical detail appropriate for healthcare professionals." |

**UI Components:**

```typescript
interface CustomizationOptions {
  tone: 'friendly' | 'professional' | 'empathetic';
  languageLevel: 'basic' | 'intermediate' | 'professional';
}

// Visual representation
<ToneSelector>
  <Option value="friendly" icon={Smile}>Friendly</Option>
  <Option value="professional" icon={Briefcase}>Professional</Option>
  <Option value="empathetic" icon={Heart}>Empathetic</Option>
</ToneSelector>

<LanguageLevelSlider>
  <Level value="basic">Basic - Simple terms, minimal jargon</Level>
  <Level value="intermediate">Intermediate - Balanced explanation</Level>
  <Level value="professional">Professional - Technical language</Level>
</LanguageLevelSlider>
```

**Preference Persistence:**
- Store in `profiles` table
- Load on subsequent sessions
- Update on change with instant feedback

**Database Extension:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_tone text DEFAULT 'friendly';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language_level text DEFAULT 'intermediate';
```

---

### Step 3: Generate - AI Interpretation

**Primary Goal**: Process documents and generate interpretations

**Visual Design:**
- Icon: Sparkles (AI/magic)
- Color: Green gradient
- Primary action: "Start Processing"

**Processing Pipeline:**

```typescript
interface ProcessingStage {
  stage: 'extracting' | 'analyzing' | 'generating' | 'validating';
  progress: number; // 0-100
  estimatedTime: number; // seconds remaining
}

async function processHealthDocument(
  fileId: string,
  customization: CustomizationOptions
): Promise<ProcessingResult> {

  // Stage 1: Text Extraction (if not already done)
  const extractedText = await extractTextFromFile(fileId);

  // Stage 2: Data Analysis
  const structuredData = await analyzeHealthData(extractedText);

  // Stage 3: OpenAI Generation
  const interpretation = await generateInterpretation(
    structuredData,
    customization
  );

  // Stage 4: Quality Validation
  const validated = await validateInterpretation(interpretation);

  return {
    summary: validated.summary,
    metrics: validated.metrics,
    doctorQuestions: validated.questions,
    recommendations: validated.recommendations,
    accuracy: validated.confidence
  };
}
```

**OpenAI API Integration:**

See detailed section below on [OpenAI API Integration Strategy](#openai-api-integration-strategy)

**Progress Indicators:**
- Real-time processing status
- Stage-by-stage updates
- Estimated completion time
- Accuracy confidence score

**Performance Metrics:**
- Target processing time: < 5 seconds per standard lab report
- Accuracy for standard lab data: 90%+
- Concurrent processing: Up to 5 files
- Fallback handling for API failures

---

### Step 4: Track & Download - Save and Share

**Primary Goal**: Deliver formatted results and enable data portability

**Visual Design:**
- Icon: Download
- Color: Green gradient
- Primary action: "Download Report"

**Report Generation:**

**PDF Structure:**
```
1. Cover Page
   - Althea logo
   - User name
   - Report date
   - Report ID

2. Executive Summary (1 page)
   - Key findings
   - Critical alerts
   - Overall health status

3. Detailed Metrics (2-3 pages)
   - Lab value table
   - Normal range comparisons
   - Visual charts and graphs
   - Trend analysis (if historical data)

4. Interpretation (2-3 pages)
   - Plain-language explanations
   - Risk indicators
   - Health recommendations

5. Doctor Discussion Guide (1 page)
   - Personalized questions
   - Preparation checklist
   - Important topics to discuss

6. Appendix
   - Technical details
   - Reference ranges
   - Methodology notes
```

**Export Formats:**
- **PDF**: Primary format, fully branded
- **JSON**: Machine-readable, for integrations
- **CSV**: Health metrics only, for spreadsheets

**Integration Points:**

```typescript
interface HealthAppIntegration {
  platform: 'apple' | 'google' | 'fitbit';
  dataTypes: Array<'lab_results' | 'vitals' | 'medications'>;
  syncEnabled: boolean;
  lastSync?: Date;
}

async function syncToHealthApp(
  platform: HealthAppIntegration['platform'],
  sessionId: string
): Promise<SyncResult> {
  // Platform-specific API calls
  switch (platform) {
    case 'apple':
      return await syncToAppleHealth(sessionId);
    case 'google':
      return await syncToGoogleFit(sessionId);
    case 'fitbit':
      return await syncToFitbit(sessionId);
  }
}
```

**Sharing Features:**

1. **Secure Link Sharing**
   - Time-limited access (24/48 hours)
   - Password protection optional
   - View-only mode
   - Access logging

2. **Email Delivery**
   - Encrypted PDF attachment
   - Password in separate email
   - Expiration notice

3. **Caregiver Portal**
   - Permanent shared access
   - Family member accounts
   - Activity notifications

**Database Schema:**
```sql
CREATE TABLE shared_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions,
  user_id uuid REFERENCES auth.users,
  share_token text UNIQUE,
  password_hash text,
  expires_at timestamptz,
  access_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE caregiver_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  caregiver_email text NOT NULL,
  relationship text,
  access_level text CHECK (access_level IN ('view', 'full')),
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## Animation & Interaction Design

### Framer Motion Implementation

**Entry Animations:**

```typescript
// Section header fade-in
<motion.h2
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
>
  How Althea Works
</motion.h2>

// Staggered feature badges
{features.map((feature, idx) => (
  <motion.span
    key={idx}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{
      delay: idx * 0.1,
      duration: 0.3,
      ease: 'easeOut'
    }}
  >
    {feature}
  </motion.span>
))}
```

**Transition Animations:**

```typescript
// Step content slide transition
<AnimatePresence mode="wait">
  <motion.div
    key={currentStep}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3 }}
  >
    {/* Content */}
  </motion.div>
</AnimatePresence>
```

**Interaction Animations:**

```typescript
// Button hover and tap
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  onClick={handleAction}
>
  Continue
</motion.button>

// Step indicator hover
<motion.button
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.9 }}
  className="step-indicator"
>
  <StepIcon />
</motion.button>
```

**Loading States:**

```typescript
// Processing spinner
<motion.div
  animate={{ rotate: 360 }}
  transition={{
    duration: 1,
    repeat: Infinity,
    ease: 'linear'
  }}
>
  <Loader className="w-8 h-8" />
</motion.div>

// Progress bar
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${progress}%` }}
  transition={{ duration: 0.3 }}
  className="h-2 bg-green-500 rounded-full"
/>
```

### Performance Considerations

**Optimization Strategies:**
1. Use `AnimatePresence` with `mode="wait"` to prevent overlap
2. Limit concurrent animations to 3-5 elements
3. Use `will-change` CSS property for frequently animated elements
4. Implement `useMemo` for heavy calculations
5. Lazy load non-critical animation assets

**Reduced Motion Support:**
```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

const transition = prefersReducedMotion
  ? { duration: 0 }
  : { duration: 0.3, ease: 'easeOut' };
```

---

## OpenAI API Integration Strategy

### API Architecture

**Endpoint**: OpenAI GPT-4 via Supabase Edge Function

**Edge Function Structure:**

```typescript
// supabase/functions/interpret-health-data/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface InterpretationRequest {
  extractedText: string;
  structuredData: HealthMetrics;
  tone: 'friendly' | 'professional' | 'empathetic';
  languageLevel: 'basic' | 'intermediate' | 'professional';
  userContext?: {
    age?: number;
    gender?: string;
    medicalHistory?: string[];
  };
}

serve(async (req) => {
  try {
    const { extractedText, structuredData, tone, languageLevel, userContext }
      = await req.json();

    // Build dynamic prompt
    const systemPrompt = buildSystemPrompt(tone, languageLevel);
    const userPrompt = buildUserPrompt(extractedText, structuredData, userContext);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Lower for consistent medical interpretations
        max_tokens: 2000,
        response_format: { type: 'json_object' } // Structured output
      }),
    });

    const data = await response.json();
    const interpretation = JSON.parse(data.choices[0].message.content);

    // Validate and enhance
    const validated = await validateInterpretation(interpretation);
    const enhanced = await addVisualizations(validated, structuredData);

    // Store in database
    await storeInterpretation(supabase, enhanced);

    return new Response(JSON.stringify(enhanced), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### Dynamic Prompt Engineering

**System Prompt Builder:**

```typescript
function buildSystemPrompt(
  tone: CustomizationOptions['tone'],
  languageLevel: CustomizationOptions['languageLevel']
): string {

  const basePrompt = `You are Althea, an AI health interpreter that helps people understand their medical reports.
Your role is to translate complex medical information into clear, actionable insights.

Always:
- Be accurate and evidence-based
- Cite normal ranges when discussing lab values
- Distinguish between concerning and normal findings
- Provide context for why tests are ordered
- Suggest relevant follow-up questions for doctors

Never:
- Provide specific medical advice or diagnoses
- Contradict explicit medical recommendations
- Create unnecessary alarm
- Make definitive statements about conditions`;

  const toneModifiers = {
    friendly: `\n\nTONE: Use a warm, conversational style. Be encouraging and positive while remaining honest.
Use phrases like "Let's look at", "This means", "You might want to ask". Make the information accessible and less intimidating.`,

    professional: `\n\nTONE: Maintain a professional, clinical tone. Use precise medical terminology and be thorough in your explanations.
Structure information logically with clear categories. Be direct and factual.`,

    empathetic: `\n\nTONE: Show compassion and understanding. Acknowledge that medical information can be overwhelming.
Use supportive language like "It's understandable to wonder", "Many people find this concerning". Provide reassurance where appropriate.`
  };

  const languageModifiers = {
    basic: `\n\nLANGUAGE LEVEL: Use simple, everyday language. Avoid medical jargon entirely or explain any necessary terms in plain English.
Write as if explaining to someone with no medical background. Use analogies and familiar comparisons.
Example: Instead of "elevated serum creatinine", say "kidney function markers are higher than normal".`,

    intermediate: `\n\nLANGUAGE LEVEL: Balance medical terminology with clear explanations. Use common medical terms but provide context.
Assume basic health literacy but explain complex concepts.
Example: "Your creatinine level (a marker of kidney function) is slightly elevated, which means..."`,

    professional: `\n\nLANGUAGE LEVEL: Use technical medical terminology appropriate for healthcare professionals.
Provide comprehensive clinical detail. Assume familiarity with medical concepts and diagnostic criteria.
Example: "Serum creatinine of 1.8 mg/dL suggests mild renal impairment (Stage 2 CKD by eGFR)..."`
  };

  return basePrompt + toneModifiers[tone] + languageModifiers[languageLevel];
}
```

**User Prompt Builder:**

```typescript
function buildUserPrompt(
  extractedText: string,
  structuredData: HealthMetrics,
  userContext?: UserContext
): string {

  const contextSection = userContext ? `
PATIENT CONTEXT:
- Age: ${userContext.age || 'Not provided'}
- Gender: ${userContext.gender || 'Not provided'}
- Relevant History: ${userContext.medicalHistory?.join(', ') || 'None provided'}
` : '';

  const structuredSection = `
STRUCTURED LAB DATA:
${JSON.stringify(structuredData, null, 2)}
`;

  const extractedSection = `
ORIGINAL REPORT TEXT:
${extractedText}
`;

  const outputFormat = `
Please provide your interpretation in the following JSON structure:
{
  "summary": "Executive summary of key findings (2-3 sentences)",
  "criticalFindings": [
    {
      "metric": "Name of the metric",
      "value": "Actual value",
      "normalRange": "Normal range",
      "significance": "What this means",
      "action": "Suggested follow-up"
    }
  ],
  "normalFindings": [
    {
      "category": "Category name",
      "metrics": ["List of normal metrics in this category"],
      "interpretation": "Brief statement about these being normal"
    }
  ],
  "doctorQuestions": [
    "Question 1",
    "Question 2",
    "Question 3"
  ],
  "recommendations": {
    "lifestyle": ["Lifestyle recommendations"],
    "followUp": ["Follow-up recommendations"],
    "monitoring": ["What to monitor"]
  },
  "educationalInsights": [
    {
      "topic": "Topic name",
      "explanation": "Educational content about this aspect of the report"
    }
  ],
  "confidence": 0.95 // Your confidence in this interpretation (0-1)
}`;

  return contextSection + structuredSection + extractedSection + outputFormat;
}
```

### Prompt Variations by Selection

**Example Combinations:**

1. **Friendly + Basic**
   - "Let's walk through your results together!"
   - "Your cholesterol is 210 mg/dL. Think of cholesterol like grease in your pipes..."
   - "You might want to ask your doctor: 'What foods should I focus on?'"

2. **Professional + Professional**
   - "Lipid panel analysis reveals dyslipidemia with TC 210 mg/dL..."
   - "Consider discussing: ASCVD risk calculator results and statin candidacy..."
   - "Recommend lipid-lowering therapy per ACC/AHA guidelines..."

3. **Empathetic + Intermediate**
   - "I understand lab results can feel overwhelming. Let's break this down together."
   - "Your cholesterol level (210 mg/dL) is slightly above the recommended range..."
   - "It's natural to have concerns. Here are questions that might help your discussion with your doctor..."

### Error Handling & Fallbacks

```typescript
async function interpretWithFallback(
  request: InterpretationRequest
): Promise<Interpretation> {

  try {
    // Primary: GPT-4
    return await callOpenAI('gpt-4-turbo', request);

  } catch (error) {
    console.error('GPT-4 failed:', error);

    try {
      // Fallback 1: GPT-3.5
      return await callOpenAI('gpt-3.5-turbo', request);

    } catch (error2) {
      console.error('GPT-3.5 failed:', error2);

      // Fallback 2: Rule-based interpretation
      return await ruleBasedInterpretation(request.structuredData);
    }
  }
}
```

### Cost Optimization

**Token Usage Strategy:**
- Average tokens per request: 1,500-2,000
- GPT-4 pricing: ~$0.03-0.06 per interpretation
- Monthly estimate (100 users, 4 reports each): ~$12-24

**Optimization Techniques:**
1. Cache common interpretations
2. Use structured data primarily, raw text as context
3. Implement token limits per user tier
4. Batch process when possible
5. Use GPT-3.5 for simpler reports

---

## Data Persistence & User Preferences

### Preference Storage

**Database Schema:**

```sql
-- Add to existing profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_tone text DEFAULT 'friendly'
    CHECK (preferred_tone IN ('friendly', 'professional', 'empathetic')),
  ADD COLUMN IF NOT EXISTS preferred_language_level text DEFAULT 'intermediate'
    CHECK (preferred_language_level IN ('basic', 'intermediate', 'professional')),
  ADD COLUMN IF NOT EXISTS save_preferences boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferences_updated_at timestamptz;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_preferences
  ON profiles(preferred_tone, preferred_language_level)
  WHERE save_preferences = true;
```

**TypeScript Interface:**

```typescript
interface UserPreferences {
  tone: 'friendly' | 'professional' | 'empathetic';
  languageLevel: 'basic' | 'intermediate' | 'professional';
  saveForFuture: boolean;
  notificationSettings?: {
    email: boolean;
    sms: boolean;
    reportReady: boolean;
  };
}

// Update function
async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      preferred_tone: preferences.tone,
      preferred_language_level: preferences.languageLevel,
      save_preferences: preferences.saveForFuture,
      preferences_updated_at: new Date().toISOString()
    })
    .eq('id', userId);
}

// Load function
async function loadUserPreferences(
  userId: string
): Promise<UserPreferences | null> {
  const { data } = await supabase
    .from('profiles')
    .select('preferred_tone, preferred_language_level, save_preferences')
    .eq('id', userId)
    .single();

  if (!data?.save_preferences) return null;

  return {
    tone: data.preferred_tone,
    languageLevel: data.preferred_language_level,
    saveForFuture: data.save_preferences
  };
}
```

### Session History

**Tracking Past Interactions:**

```typescript
interface SessionHistory {
  sessionId: string;
  completedSteps: number[];  // Which steps user completed
  timeSpent: Record<number, number>;  // Time spent on each step (seconds)
  abandonedAt?: number;  // Step where user abandoned
  completedAt?: Date;
  preferences: UserPreferences;
}

// Analytics tracking
async function trackStepProgress(
  userId: string,
  sessionId: string,
  step: number,
  action: 'enter' | 'exit' | 'complete'
): Promise<void> {
  // Track in analytics database
  await supabase.from('user_analytics').insert({
    user_id: userId,
    session_id: sessionId,
    event_type: `step_${step}_${action}`,
    timestamp: new Date().toISOString(),
    metadata: {
      currentStep: step,
      totalSteps: 4
    }
  });
}
```

---

## Responsive Design Considerations

### Breakpoint Strategy

**Tailwind Breakpoints:**
- `sm`: 640px (mobile landscape)
- `md`: 768px (tablet)
- `lg`: 1024px (small desktop)
- `xl`: 1280px (desktop)
- `2xl`: 1536px (large desktop)

### Mobile Adaptations (< 768px)

**Stepper Navigation:**
- Convert to vertical list or horizontal scroll
- Reduce icon sizes (48px instead of 64px)
- Hide connecting lines
- Show only active step title

**Content Cards:**
- Stack information vertically
- Reduce padding (16px instead of 48px)
- Collapse tech specs into accordion
- Single column layout

**Navigation Controls:**
- Full-width buttons
- Reduce button text ("Prev" / "Next")
- Hide progress dots on very small screens
- Sticky bottom navigation

### Tablet Adaptations (768px - 1024px)

**Hybrid Layout:**
- Keep horizontal stepper
- Two-column layout for details
- Moderate padding reduction
- Show abbreviated feature badges

### Implementation:

```typescript
// Responsive stepper
<div className="flex items-center space-x-4 overflow-x-auto pb-4 max-w-4xl
  md:overflow-x-visible md:justify-center
  sm:space-x-2">
  {/* Stepper content */}
</div>

// Responsive content grid
<div className="grid md:grid-cols-2 gap-6 mb-8
  grid-cols-1 gap-4">
  {/* Details and tech specs */}
</div>

// Responsive navigation
<div className="flex items-center justify-between mt-8
  flex-col gap-4 md:flex-row">
  {/* Navigation buttons */}
</div>
```

---

## Accessibility & Performance

### WCAG 2.1 AA Compliance

**Keyboard Navigation:**
```typescript
// Handle arrow key navigation
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key >= '1' && e.key <= '4') {
      handleStepClick(parseInt(e.key) - 1);
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [currentStep]);
```

**Screen Reader Support:**
```typescript
<button
  onClick={() => handleStepClick(index)}
  aria-label={`Go to step ${step.id}: ${step.title}`}
  aria-current={index === currentStep}
  role="tab"
  aria-selected={index === currentStep}
>
  {/* Button content */}
</button>

<div
  role="tabpanel"
  aria-labelledby={`step-${currentStep}-tab`}
  aria-live="polite"
>
  {/* Step content */}
</div>
```

**Focus Management:**
```typescript
const stepRefs = useRef<Array<HTMLButtonElement | null>>([]);

const focusStep = (index: number) => {
  stepRefs.current[index]?.focus();
};

// After navigation
useEffect(() => {
  focusStep(currentStep);
}, [currentStep]);
```

**Color Contrast:**
- All text meets 4.5:1 ratio minimum
- Interactive elements: 3:1 ratio
- Focus indicators: 3:1 ratio with 2px minimum

### Performance Optimization

**Code Splitting:**
```typescript
// Lazy load animation library
const MotionComponents = React.lazy(() =>
  import('framer-motion').then(mod => ({
    default: {
      motion: mod.motion,
      AnimatePresence: mod.AnimatePresence
    }
  }))
);
```

**Image Optimization:**
- Use WebP format with PNG fallback
- Lazy load non-critical images
- Implement placeholder blur effect
- Responsive image sizes

**Bundle Size:**
- Current bundle: ~460KB (gzipped: ~136KB)
- Framer Motion adds: ~60KB
- Target: Keep under 500KB total

**Performance Metrics:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.0s
- Cumulative Layout Shift: < 0.1

---

## Future Enhancements

### Phase 2 Features

1. **Interactive File Upload Preview**
   - Live drag-and-drop zones in Step 1
   - Real-time file validation
   - Progress bars for large files
   - Thumbnail previews for images

2. **Customization Preview**
   - Sample interpretation in each tone/level
   - Side-by-side comparison
   - Interactive examples with real data

3. **Live Processing View**
   - Real-time AI generation stream
   - Step-by-step reasoning display
   - Confidence scores per section
   - Edit and regenerate specific sections

4. **Enhanced Download Options**
   - Multiple language translations
   - Voice-narrated version
   - Simplified visual-only version
   - Printer-friendly format

### Phase 3 Features

1. **Guided Walkthrough Mode**
   - Auto-advance with timer
   - Voice narration option
   - Video tutorials per step
   - Interactive quiz at end

2. **Comparison Mode**
   - Side-by-side report comparison
   - Trend visualization
   - Change detection highlights
   - Historical analysis

3. **Collaboration Features**
   - Share with family members
   - Add notes and questions
   - Schedule doctor appointment
   - Telemedicine integration

4. **Advanced Analytics**
   - Predictive health insights
   - Risk trajectory modeling
   - Personalized recommendations
   - Integration with wearable devices

### Integration Roadmap

**Q1 2026:**
- Apple Health integration
- Google Fit integration
- PDF email delivery

**Q2 2026:**
- FHIR standard compliance
- EHR integration (Epic, Cerner)
- Pharmacy integration

**Q3 2026:**
- Telemedicine platform integration
- Insurance portal integration
- Clinical trial matching

**Q4 2026:**
- AI-powered follow-up scheduling
- Medication adherence tracking
- Social determinants of health integration

---

## Conclusion

This comprehensive redesign transforms the "How It Works" module from a static information section into an interactive, educational experience that drives user engagement and conversion. The implementation leverages modern web technologies, maintains accessibility standards, and provides a solid foundation for future enhancements.

**Key Success Metrics:**
- User completion rate > 80%
- Time on page > 2 minutes
- Click-through to signup > 15%
- User satisfaction score > 4.5/5

**Implementation Timeline:**
- Phase 1 (Current): Core stepper with animations - **COMPLETE**
- Phase 2: Interactive elements and live previews - 4 weeks
- Phase 3: Advanced features and integrations - 8 weeks

---

## Appendix

### A. Technical Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.57.4",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3"
  }
}
```

### B. Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo
OPENAI_MAX_TOKENS=2000

# Supabase Configuration
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Feature Flags
ENABLE_AI_INTERPRETATION=true
ENABLE_HEALTH_APP_SYNC=true
ENABLE_CAREGIVER_SHARING=true
```

### C. API Rate Limits

| Endpoint | Rate Limit | Burst |
|----------|-----------|-------|
| File Upload | 10/minute | 20 |
| OpenAI Interpretation | 5/minute | 10 |
| PDF Generation | 20/minute | 50 |
| Health App Sync | 30/hour | - |

### D. Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |
| Mobile Safari | 14+ |
| Chrome Mobile | 90+ |

---

**Document Version**: 1.0
**Last Updated**: October 13, 2025
**Author**: AI Development Team
**Status**: Implemented ✅
