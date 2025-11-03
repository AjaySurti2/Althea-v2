# Technical Specification: Unified AI Health Insights and Report Generation System

## Executive Summary

This document provides a comprehensive technical specification for consolidating the current 6-step health report workflow into a streamlined 5-step process. The key innovation is merging Step 3 (Health Insights Display) and Step 4 (Metrics Tracking & Download) into a single unified experience with dynamic customization capabilities.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Database Schema Design](#2-database-schema-design)
3. [Component Architecture](#3-component-architecture)
4. [API Modifications](#4-api-modifications)
5. [User Experience Design](#5-user-experience-design)
6. [Implementation Plan](#6-implementation-plan)
7. [Testing Strategy](#7-testing-strategy)
8. [Performance Optimization](#8-performance-optimization)
9. [Migration Strategy](#9-migration-strategy)

---

## 1. System Architecture Overview

### 1.1 Current State (6 Steps)

```
┌─────────────────────────────────────────────────────────────┐
│                   Current Workflow                           │
├─────────────────────────────────────────────────────────────┤
│ Step 0: Family Details Capture                              │
│ Step 1: Document Upload                                     │
│ Step 2: Preferences (Tone & Language)                       │
│ Step 3: Health Insights Display         ← MERGE THESE       │
│ Step 4: Metrics Tracking & Download     ← MERGE THESE       │
│ Step 5: Document Review                                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Proposed State (5 Steps)

```
┌─────────────────────────────────────────────────────────────┐
│                   Unified Workflow                           │
├─────────────────────────────────────────────────────────────┤
│ Step 0: Family Details Capture                              │
│ Step 1: Document Upload                                     │
│ Step 2: AI Health Insights & Report Hub (UNIFIED)           │
│    ├─ Inline Preference Controls                            │
│    ├─ Real-time Regeneration                               │
│    ├─ Insights Display                                      │
│    └─ Integrated Download                                   │
│ Step 3: Document Review                                     │
│ Step 4: Completion                                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Key Benefits

- **Reduced Complexity**: 5 steps instead of 6 (16.7% reduction)
- **Improved UX**: All insights and actions on one screen
- **Real-time Customization**: No navigation required to change preferences
- **Integrated Downloads**: Generate reports directly from insights view
- **Better Context**: See insights while customizing preferences

---

## 2. Database Schema Design

### 2.1 New Tables

#### `user_insight_preferences`

Stores user's preferred communication style across sessions.

```sql
CREATE TABLE user_insight_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tone VARCHAR(50) NOT NULL DEFAULT 'friendly',
  language_level VARCHAR(50) NOT NULL DEFAULT 'simple',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Columns:**
- `id`: Unique identifier
- `user_id`: Reference to authenticated user
- `tone`: One of ['friendly', 'professional', 'empathetic']
- `language_level`: One of ['simple', 'moderate', 'technical']
- `created_at`: Timestamp of preference creation
- `updated_at`: Timestamp of last update (auto-updated via trigger)

**Indexes:**
```sql
CREATE INDEX idx_user_preferences_user_id ON user_insight_preferences(user_id);
CREATE INDEX idx_user_preferences_created_at ON user_insight_preferences(created_at DESC);
```

**RLS Policies:**
- Users can SELECT, INSERT, UPDATE, DELETE their own preferences only
- No public access

#### `report_generation_history`

Tracks all report generations with their customization preferences.

```sql
CREATE TABLE report_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES health_reports(id) ON DELETE CASCADE,
  insight_id UUID REFERENCES health_insights(id) ON DELETE SET NULL,
  tone VARCHAR(50) NOT NULL,
  language_level VARCHAR(50) NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ
);
```

**Columns:**
- `id`: Unique identifier
- `report_id`: Reference to generated health report
- `insight_id`: Reference to insights used for report (nullable)
- `tone`: Tone setting used for generation
- `language_level`: Language level used for generation
- `generated_at`: Timestamp of report generation
- `download_count`: Number of times report was downloaded
- `last_downloaded_at`: Timestamp of most recent download

**Indexes:**
```sql
CREATE INDEX idx_report_history_report_id ON report_generation_history(report_id);
CREATE INDEX idx_report_history_insight_id ON report_generation_history(insight_id);
```

**RLS Policies:**
- Users can SELECT their own report history
- System can INSERT on behalf of authenticated users
- System can UPDATE download counts

### 2.2 Modified Tables

#### `health_insights` (Enhancements)

```sql
ALTER TABLE health_insights
ADD COLUMN tone VARCHAR(50) DEFAULT 'friendly',
ADD COLUMN language_level VARCHAR(50) DEFAULT 'simple',
ADD COLUMN regeneration_count INTEGER DEFAULT 0,
ADD COLUMN parent_insight_id UUID REFERENCES health_insights(id);
```

**New Columns:**
- `tone`: Tone used to generate these insights
- `language_level`: Language level used to generate these insights
- `regeneration_count`: Number of times regenerated
- `parent_insight_id`: Links to original insight if this is a regeneration

**New Indexes:**
```sql
CREATE INDEX idx_insights_session_tone ON health_insights(session_id, tone, language_level);
CREATE INDEX idx_insights_parent_id ON health_insights(parent_insight_id);
```

### 2.3 Data Flow Diagram

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1. Selects preferences
       ▼
┌──────────────────────────┐
│ user_insight_preferences │ ← Stores user's default preferences
└──────────────────────────┘
       │
       │ 2. Generates insights
       ▼
┌──────────────────────────┐
│   health_insights        │ ← Stores AI-generated insights with tone/language
└──────────────────────────┘
       │
       │ 3. Generates report
       ▼
┌──────────────────────────┐
│    health_reports        │ ← Stores generated HTML/PDF reports
└──────────────────────────┘
       │
       │ 4. Logs generation
       ▼
┌──────────────────────────┐
│ report_generation_history│ ← Tracks all generations and downloads
└──────────────────────────┘
```

---

## 3. Component Architecture

### 3.1 Component Hierarchy

```
UploadWorkflow (Parent Component)
│
├── Step 0: FamilyDetailsCapture
│   └── Unchanged
│
├── Step 1: DocumentUpload
│   └── Unchanged (still collects files)
│
├── Step 2: UnifiedHealthInsights (NEW - MERGED COMPONENT)
│   ├── InsightsHeader
│   │   ├── Logo
│   │   ├── Title
│   │   └── Customize Button
│   │
│   ├── PreferenceControls (Collapsible)
│   │   ├── ToneSelector
│   │   │   ├── Friendly Option
│   │   │   ├── Professional Option
│   │   │   └── Empathetic Option
│   │   │
│   │   ├── LanguageLevelSelector
│   │   │   ├── Simple Option
│   │   │   ├── Moderate Option
│   │   │   └── Technical Option
│   │   │
│   │   └── ApplyButton (if changes detected)
│   │
│   ├── InsightsDisplay
│   │   ├── UrgencyFlag (if applicable)
│   │   ├── SummarySection
│   │   ├── KeyFindings
│   │   ├── AbnormalValues
│   │   ├── DoctorQuestions
│   │   ├── HealthRecommendations
│   │   ├── FamilyScreening
│   │   └── FollowUpTimeline
│   │
│   ├── ActionBar (Floating/Sticky)
│   │   ├── BackButton
│   │   ├── RegenerateButton
│   │   ├── DownloadButton
│   │   └── ContinueButton
│   │
│   └── LoadingStates
│       ├── InitialLoadSpinner
│       ├── RegenerationSpinner
│       └── ReportGenerationSpinner
│
├── Step 3: DocumentReview
│   └── Unchanged
│
└── Step 4: CompletionScreen
    └── Unchanged
```

### 3.2 Component Props and State

#### `UnifiedHealthInsights` Component

**Props:**
```typescript
interface UnifiedHealthInsightsProps {
  sessionId: string;        // Current upload session
  darkMode: boolean;        // Theme preference
  onContinue: () => void;   // Navigate to next step
  onBack: () => void;       // Navigate to previous step
}
```

**State:**
```typescript
interface UnifiedHealthInsightsState {
  // Data
  insights: InsightsData | null;

  // Preferences
  tone: 'friendly' | 'professional' | 'empathetic';
  languageLevel: 'simple' | 'moderate' | 'technical';
  hasUnsavedChanges: boolean;

  // UI State
  showPreferences: boolean;
  loading: boolean;
  regenerating: boolean;
  generatingReport: boolean;
  error: string | null;
}
```

### 3.3 State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Component Mount                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────────┐        ┌────────────────────┐
│ Load User         │        │ Load Existing      │
│ Preferences       │        │ Insights           │
│ (if available)    │        │ (for session)      │
└───────┬───────────┘        └────────┬───────────┘
        │                              │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ Display Insights             │
        │ (or Generate if not exists)  │
        └──────────┬───────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌────────┐   ┌──────────┐   ┌─────────┐
│ User   │   │ User     │   │ User    │
│ Changes│   │ Clicks   │   │ Clicks  │
│ Prefs  │   │ Download │   │Continue │
└───┬────┘   └─────┬────┘   └────┬────┘
    │              │              │
    ▼              ▼              ▼
┌────────────┐ ┌──────────┐  ┌──────────┐
│Regenerate  │ │Generate  │  │Next Step │
│Insights    │ │Report    │  │          │
└────────────┘ └──────────┘  └──────────┘
```

### 3.4 Key Component Functions

#### `loadUserPreferences()`
```typescript
const loadUserPreferences = async () => {
  // Fetch user's most recent preferences
  const { data } = await supabase
    .from('user_insight_preferences')
    .select('tone, language_level')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    setTone(data.tone);
    setLanguageLevel(data.language_level);
  }
};
```

#### `handleRegenerate()`
```typescript
const handleRegenerate = async () => {
  setRegenerating(true);

  // Call edge function with new preferences
  const response = await fetch('/functions/v1/generate-health-insights', {
    method: 'POST',
    body: JSON.stringify({ sessionId, tone, languageLevel })
  });

  const result = await response.json();
  setInsights(result.insights);

  // Save preferences for future sessions
  await saveUserPreferences(tone, languageLevel);

  setRegenerating(false);
  setHasUnsavedChanges(false);
};
```

#### `handleGenerateReport()`
```typescript
const handleGenerateReport = async () => {
  setGeneratingReport(true);

  // Generate report with current preferences
  const response = await fetch('/functions/v1/generate-health-report', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      tone,
      languageLevel,
      includeQuestions: true
    })
  });

  const result = await response.json();

  // Download the report
  const { data } = await supabase.storage
    .from('health-reports')
    .download(result.storage_path);

  // Trigger browser download
  downloadFile(data, `health-report-${sessionId}.html`);

  setGeneratingReport(false);
};
```

---

## 4. API Modifications

### 4.1 Enhanced Edge Functions

#### `generate-health-insights` Updates

**Current Request:**
```typescript
{
  sessionId: string;
  tone: 'conversational' | 'professional' | 'reassuring';
  languageLevel: 'simple_terms' | 'educated_patient' | 'medical_professional';
}
```

**New Response (Enhanced):**
```typescript
{
  insights: InsightsData;
  metadata: {
    generatedAt: string;
    tone: string;
    languageLevel: string;
    regenerationCount: number;
    parentInsightId?: string;
  };
  cacheStatus: {
    cached: boolean;
    cacheKey: string;
  };
}
```

**Caching Strategy:**
```typescript
// Cache key format: {sessionId}:{tone}:{languageLevel}
const cacheKey = `${sessionId}:${tone}:${languageLevel}`;

// Check cache before generating
const cachedInsights = await getCachedInsights(cacheKey);
if (cachedInsights && !forceRegenerate) {
  return cachedInsights;
}

// Generate new insights
const newInsights = await generateWithOpenAI(...);

// Cache for 1 hour
await cacheInsights(cacheKey, newInsights, 3600);
```

#### `generate-health-report` Updates

**New Request Parameters:**
```typescript
{
  sessionId: string;
  reportType: 'comprehensive' | 'summary';
  includeQuestions: boolean;
  tone: 'friendly' | 'professional' | 'empathetic';  // NEW
  languageLevel: 'simple' | 'moderate' | 'technical'; // NEW
  format: 'html' | 'pdf';                            // NEW
}
```

**Updated Response:**
```typescript
{
  success: boolean;
  report: {
    id: string;
    storage_path: string;
    file_size: number;
    format: string;
  };
  questions: Array<{
    question: string;
    priority: string;
    category: string;
  }>;
  generation_history_id: string;  // NEW - Track this generation
  download_url: string;
}
```

### 4.2 Rate Limiting and Optimization

```typescript
// Implement rate limiting for regeneration
const RATE_LIMITS = {
  insights: {
    maxPerHour: 10,
    maxPerDay: 50
  },
  reports: {
    maxPerHour: 5,
    maxPerDay: 20
  }
};

// Check rate limit before processing
const checkRateLimit = async (userId: string, action: string) => {
  const hourlyCount = await getActionCount(userId, action, '1 hour');
  const dailyCount = await getActionCount(userId, action, '24 hours');

  if (hourlyCount >= RATE_LIMITS[action].maxPerHour) {
    throw new Error('Hourly rate limit exceeded');
  }

  if (dailyCount >= RATE_LIMITS[action].maxPerDay) {
    throw new Error('Daily rate limit exceeded');
  }
};
```

### 4.3 API Endpoint Summary

| Endpoint | Method | Purpose | Changes |
|----------|--------|---------|---------|
| `/functions/v1/generate-health-insights` | POST | Generate AI insights | Added caching, rate limiting, metadata |
| `/functions/v1/generate-health-report` | POST | Generate downloadable report | Added tone/language params, format options |
| `/functions/v1/get-user-preferences` | GET | Fetch user's default preferences | NEW endpoint |
| `/functions/v1/save-user-preferences` | POST | Save user's preference changes | NEW endpoint |

---

## 5. User Experience Design

### 5.1 Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Your Health Insights & Report     [Customize ▼]    │
│  AI-powered analysis by Althea                              │
│                                                              │
│  Current style: [Friendly] [Simple]                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎨 PREFERENCE CONTROLS (Collapsible)                │   │
│  │                                                       │   │
│  │  Communication Tone:                                 │   │
│  │  [😊 Friendly] [💼 Professional] [❤️ Empathetic]   │   │
│  │                                                       │   │
│  │  Language Level:                                     │   │
│  │  [Simple] [Moderate] [Technical]                     │   │
│  │                                                       │   │
│  │  Changes not applied yet  [✨ Apply & Regenerate]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ⚠️ URGENT ATTENTION REQUIRED (if applicable)              │
│  Some findings require timely medical attention...          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🧠 Summary                                           │   │
│  │ Your overall health summary in plain language...    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Key Findings                                      │   │
│  │ • Finding 1: Category, significance, action         │   │
│  │ • Finding 2: Category, significance, action         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📈 Values Outside Normal Range                       │   │
│  │ [HIGH] Hemoglobin: 10.2 g/dL (Normal: 12-16)        │   │
│  │ Explanation: Lower than normal...                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💬 Questions for Your Doctor                         │   │
│  │ 1. What's causing my hemoglobin to be low?          │   │
│  │ 2. How serious is this level of anemia?             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💡 Health Recommendations                            │   │
│  │ • [HIGH] Increase iron intake through diet          │   │
│  │ • [MED] Consider iron supplements                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ⚠️ Disclaimer: For informational purposes only...         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  [← Back] [🔄 Regenerate] [📥 Download] [Continue →]      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Interaction Flow

**Scenario 1: Initial Load**
```
User lands on screen
  ↓
System loads user preferences (if saved)
  ↓
System checks for existing insights with those preferences
  ↓
IF insights exist:
  → Display insights immediately
ELSE:
  → Show loading spinner
  → Generate insights with default/saved preferences
  → Display insights
```

**Scenario 2: Changing Preferences**
```
User clicks "Customize" button
  ↓
Preference controls expand
  ↓
User selects new tone: Professional
  ↓
System detects change → Shows "Apply & Regenerate" button
  ↓
User clicks "Apply & Regenerate"
  ↓
System shows regeneration spinner with new preference labels
  ↓
System generates insights with new preferences
  ↓
Display updated insights
  ↓
Preferences auto-collapse
```

**Scenario 3: Downloading Report**
```
User clicks "Download Report" button
  ↓
Button shows loading spinner: "Generating..."
  ↓
System checks if report exists for current preferences
  ↓
IF report exists:
  → Download immediately
ELSE:
  → Generate report with current preferences
  → Save to storage
  → Log in report_generation_history
  → Trigger browser download
  ↓
Show success notification
```

### 5.3 Responsive Design

**Desktop (≥ 1024px):**
- Two-column preference selector (Tone left, Language right)
- Insights display full width
- Action bar fixed at bottom with all buttons visible

**Tablet (768px - 1023px):**
- Two-column preference selector (slightly narrower)
- Insights cards adapt to container
- Action bar remains fixed

**Mobile (< 768px):**
- Single-column preference selector (stacked)
- Insights cards full width
- Action bar scrolls with content
- Sticky "Continue" button at bottom

### 5.4 Accessibility Features

- **Keyboard Navigation**: Full support for Tab, Enter, Space
- **Screen Readers**: ARIA labels on all interactive elements
- **Color Contrast**: WCAG AA compliant (4.5:1 minimum)
- **Focus Indicators**: Clear visual focus states
- **Loading States**: Announce to screen readers
- **Error Messages**: Clear, actionable error text

---

## 6. Implementation Plan

### Phase 1: Database & Backend (Week 1)

**Day 1-2: Database Schema**
- [ ] Create `user_insight_preferences` table
- [ ] Create `report_generation_history` table
- [ ] Add columns to `health_insights` table
- [ ] Create indexes for performance
- [ ] Implement RLS policies
- [ ] Run migrations on staging environment
- [ ] Test all CRUD operations

**Day 3-4: Edge Function Updates**
- [ ] Update `generate-health-insights` to accept tone/language
- [ ] Implement caching mechanism
- [ ] Add rate limiting logic
- [ ] Update `generate-health-report` with new parameters
- [ ] Create preference management endpoints
- [ ] Write unit tests for edge functions

**Day 5: Testing & Documentation**
- [ ] Integration testing for edge functions
- [ ] API documentation updates
- [ ] Performance benchmarking
- [ ] Error handling verification

### Phase 2: Frontend Components (Week 2)

**Day 1-2: Core Component Development**
- [ ] Create `UnifiedHealthInsights.tsx` component
- [ ] Build preference selector UI
- [ ] Implement state management
- [ ] Add loading states and error handling

**Day 3-4: Integration & Polish**
- [ ] Update `UploadWorkflow.tsx` to use new component
- [ ] Remove old `HealthInsights` and `MetricsTracking` steps
- [ ] Update step indicators (6 → 5)
- [ ] Implement floating action bar
- [ ] Add animations and transitions

**Day 5: Responsive Design**
- [ ] Mobile layout optimization
- [ ] Tablet layout adjustments
- [ ] Touch interaction improvements
- [ ] Cross-browser testing

### Phase 3: Testing & QA (Week 3)

**Day 1-2: Unit & Integration Tests**
- [ ] Component unit tests
- [ ] Edge function tests
- [ ] Database query tests
- [ ] State management tests

**Day 3-4: User Acceptance Testing**
- [ ] Create test scenarios
- [ ] Manual testing across devices
- [ ] Accessibility audit
- [ ] Performance testing

**Day 5: Bug Fixes & Polish**
- [ ] Address QA findings
- [ ] Performance optimization
- [ ] Final polish and refinements

### Phase 4: Deployment (Week 4)

**Day 1: Staging Deployment**
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Verify all functionality

**Day 2: Production Preparation**
- [ ] Prepare rollback plan
- [ ] Document deployment steps
- [ ] Schedule deployment window

**Day 3: Production Deployment**
- [ ] Run database migrations
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Verify deployment

**Day 4-5: Monitoring & Support**
- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Gather user feedback
- [ ] Address any issues

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Component Tests (`UnifiedHealthInsights.test.tsx`)**
```typescript
describe('UnifiedHealthInsights', () => {
  it('loads user preferences on mount', async () => {
    // Test preference loading
  });

  it('detects unsaved preference changes', () => {
    // Test change detection
  });

  it('regenerates insights when Apply button clicked', async () => {
    // Test regeneration flow
  });

  it('generates and downloads report', async () => {
    // Test report generation
  });

  it('handles errors gracefully', async () => {
    // Test error states
  });
});
```

**Edge Function Tests**
```typescript
describe('generate-health-insights', () => {
  it('generates insights with specified preferences', async () => {
    // Test with different tone/language combinations
  });

  it('returns cached insights when available', async () => {
    // Test caching behavior
  });

  it('respects rate limits', async () => {
    // Test rate limiting
  });
});
```

### 7.2 Integration Tests

```typescript
describe('Unified Insights Flow', () => {
  it('completes full workflow from upload to download', async () => {
    // 1. Upload documents
    // 2. Generate insights
    // 3. Change preferences
    // 4. Regenerate insights
    // 5. Download report
    // 6. Verify all data saved correctly
  });
});
```

### 7.3 Manual Testing Checklist

**Functional Testing:**
- [ ] Preferences load from previous session
- [ ] Insights display correctly
- [ ] Preference changes trigger "Apply" button
- [ ] Regeneration updates insights
- [ ] Report downloads successfully
- [ ] All sections render properly
- [ ] Navigation buttons work

**Cross-browser Testing:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Device Testing:**
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (iPad)
- [ ] Mobile (iPhone, Android)

**Performance Testing:**
- [ ] Initial load < 3 seconds
- [ ] Regeneration < 10 seconds
- [ ] Report generation < 15 seconds
- [ ] No memory leaks

---

## 8. Performance Optimization

### 8.1 Caching Strategy

**Client-Side Caching:**
```typescript
// Use React Query for client-side caching
const { data: insights, refetch } = useQuery(
  ['insights', sessionId, tone, languageLevel],
  () => fetchInsights(sessionId, tone, languageLevel),
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  }
);
```

**Server-Side Caching:**
```typescript
// Redis cache for generated insights
const cacheKey = `insights:${sessionId}:${tone}:${languageLevel}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const insights = await generateInsights(...);
await redis.setex(cacheKey, 3600, JSON.stringify(insights));
return insights;
```

### 8.2 Code Splitting

```typescript
// Lazy load the unified component
const UnifiedHealthInsights = React.lazy(() =>
  import('./components/UnifiedHealthInsights')
);

// Use Suspense for loading state
<Suspense fallback={<LoadingSpinner />}>
  <UnifiedHealthInsights {...props} />
</Suspense>
```

### 8.3 Database Query Optimization

```sql
-- Use prepared statements for common queries
PREPARE get_insights AS
SELECT * FROM health_insights
WHERE session_id = $1 AND tone = $2 AND language_level = $3
ORDER BY created_at DESC
LIMIT 1;

-- Use connection pooling (configured in Supabase)
-- Max connections: 100
-- Min connections: 10
```

### 8.4 Asset Optimization

- **Logo**: Already optimized as SVG
- **Icons**: Use Lucide React (tree-shaken)
- **Bundle Size**: Target < 500KB gzipped
- **Code Splitting**: Separate vendor chunks

---

## 9. Migration Strategy

### 9.1 Data Migration

**Step 1: Run Database Migrations**
```bash
# Apply schema changes
supabase migration up

# Verify migrations
psql -h [host] -U [user] -d [database] -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_name IN (
    'user_insight_preferences',
    'report_generation_history'
  );
"
```

**Step 2: Backfill Existing Data**
```sql
-- Add default tone/language to existing insights
UPDATE health_insights
SET tone = 'friendly', language_level = 'simple'
WHERE tone IS NULL OR language_level IS NULL;

-- Verify backfill
SELECT COUNT(*) FROM health_insights
WHERE tone IS NULL OR language_level IS NULL;
-- Expected: 0
```

### 9.2 Gradual Rollout Plan

**Phase 1: Beta Users (Week 1)**
- Deploy to 5% of users
- Monitor error rates and performance
- Gather feedback

**Phase 2: Expanded Beta (Week 2)**
- Deploy to 25% of users
- Continue monitoring
- Address any issues

**Phase 3: Full Rollout (Week 3)**
- Deploy to 100% of users
- Monitor closely for first 48 hours
- Prepare rollback if needed

### 9.3 Rollback Plan

**If Critical Issue Detected:**

1. **Immediate Actions:**
   ```bash
   # Revert frontend deployment
   git revert [commit-hash]
   npm run build
   npm run deploy

   # Disable new feature flag
   UPDATE feature_flags SET enabled = false
   WHERE flag_name = 'unified_insights';
   ```

2. **Database Rollback:**
   ```sql
   -- If needed, revert schema changes
   -- (Keep new tables but don't require them)
   ALTER TABLE health_insights
   ALTER COLUMN tone DROP NOT NULL,
   ALTER COLUMN language_level DROP NOT NULL;
   ```

3. **Communication:**
   - Notify users of temporary service disruption
   - Provide ETA for resolution
   - Document incident in post-mortem

### 9.4 Success Metrics

**Technical Metrics:**
- Error rate < 0.1%
- P95 latency < 3 seconds
- Cache hit rate > 70%
- Database query time < 100ms

**User Metrics:**
- Preference customization rate > 30%
- Report download rate > 60%
- Workflow completion rate > 85%
- User satisfaction score > 4.0/5.0

---

## 10. Future Enhancements

### 10.1 Short-term (3-6 months)

- **A/B Testing**: Test different preference layouts
- **Preference Presets**: "Conservative", "Detailed", "Quick Summary"
- **Report Templates**: Multiple visual styles
- **Sharing**: Email reports to family members or doctors

### 10.2 Long-term (6-12 months)

- **Voice Integration**: Generate audio versions of reports
- **Trend Analysis**: Multi-session comparison
- **AI Chat**: Interactive Q&A about health data
- **Mobile App**: Native iOS/Android experience

---

## Appendix A: API Reference

### Generate Health Insights

**Endpoint:** `POST /functions/v1/generate-health-insights`

**Request:**
```json
{
  "sessionId": "uuid",
  "tone": "friendly" | "professional" | "empathetic",
  "languageLevel": "simple" | "moderate" | "technical",
  "forceRegenerate": boolean (optional)
}
```

**Response:**
```json
{
  "insights": {
    "summary": "string",
    "key_findings": [...],
    "abnormal_values": [...],
    "questions_for_doctor": [...],
    "health_recommendations": [...],
    "family_screening_suggestions": [...],
    "follow_up_timeline": "string",
    "urgency_flag": "string"
  },
  "metadata": {
    "generatedAt": "ISO 8601 timestamp",
    "tone": "string",
    "languageLevel": "string",
    "regenerationCount": number
  }
}
```

### Generate Health Report

**Endpoint:** `POST /functions/v1/generate-health-report`

**Request:**
```json
{
  "sessionId": "uuid",
  "reportType": "comprehensive" | "summary",
  "includeQuestions": boolean,
  "tone": "friendly" | "professional" | "empathetic",
  "languageLevel": "simple" | "moderate" | "technical",
  "format": "html" | "pdf" (optional, default: "html")
}
```

**Response:**
```json
{
  "success": boolean,
  "report": {
    "id": "uuid",
    "storage_path": "string",
    "file_size": number,
    "format": "string"
  },
  "questions": [...],
  "generation_history_id": "uuid",
  "download_url": "string"
}
```

---

## Appendix B: Component Code Examples

See the created files:
- `/src/components/UnifiedHealthInsights.tsx` - Main unified component
- `/supabase/migrations/20251103_create_unified_insights_schema.sql` - Database schema

---

## Conclusion

This specification provides a comprehensive blueprint for consolidating the 6-step health insights workflow into a streamlined 5-step process. The unified approach reduces complexity, improves user experience, and provides powerful real-time customization capabilities while maintaining all existing functionality.

**Key Success Factors:**
1. Thorough testing at each phase
2. Gradual rollout with monitoring
3. Clear rollback procedures
4. User feedback incorporation
5. Performance optimization focus

**Timeline:** 4 weeks from start to production deployment

**Resources Required:**
- 1 Backend Developer (full-time)
- 1 Frontend Developer (full-time)
- 1 QA Engineer (half-time)
- 1 Product Manager (quarter-time)

---

**Document Version:** 1.0
**Last Updated:** November 3, 2025
**Status:** Ready for Implementation
