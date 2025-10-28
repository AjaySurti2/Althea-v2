# Family Health Management System - Technical Architecture

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────┐      ┌─────────────────────┐          │
│  │   Upload Workflow   │      │   Family Members    │          │
│  │   (6 Steps)         │      │   Management        │          │
│  └─────────────────────┘      └─────────────────────┘          │
│            │                            │                        │
│            └────────────┬───────────────┘                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────────┐
│                         │    COMPONENT LAYER                      │
├─────────────────────────┼────────────────────────────────────────┤
│            ┌────────────▼───────────────┐                        │
│            │  FamilyDetailsCapture      │                        │
│            │  • Add new member          │                        │
│            │  • Select existing         │                        │
│            │  • Validation & feedback   │                        │
│            └────────────┬───────────────┘                        │
│                         │                                         │
│            ┌────────────▼───────────────┐                        │
│            │  FamilyMembers             │                        │
│            │  • Full CRUD operations    │                        │
│            │  • Advanced management     │                        │
│            └────────────┬───────────────┘                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────────┐
│                         │    API/BUSINESS LOGIC LAYER             │
├─────────────────────────┼────────────────────────────────────────┤
│            ┌────────────▼───────────────┐                        │
│            │   familyApi.ts             │                        │
│            │   • getFamilyMembers()     │                        │
│            │   • createFamilyMember()   │                        │
│            │   • updateFamilyMember()   │                        │
│            │   • deleteFamilyMember()   │                        │
│            └────────────┬───────────────┘                        │
│                         │                                         │
│            ┌────────────▼───────────────┐                        │
│            │   Validation Logic         │                        │
│            │   • Age calculation        │                        │
│            │   • Data sanitization      │                        │
│            │   • Error handling         │                        │
│            └────────────┬───────────────┘                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────────┐
│                         │    DATA ACCESS LAYER (Supabase)         │
├─────────────────────────┼────────────────────────────────────────┤
│                         │                                         │
│      ┌──────────────────▼──────────────────┐                    │
│      │    Supabase Client (supabase.ts)    │                    │
│      │    • Authentication                  │                    │
│      │    • Database queries                │                    │
│      │    • Real-time subscriptions         │                    │
│      └──────────────────┬──────────────────┘                    │
│                         │                                         │
└─────────────────────────┼────────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────────────────┐
│                         │    DATABASE LAYER (PostgreSQL)          │
├─────────────────────────┼────────────────────────────────────────┤
│                         │                                         │
│      ┌──────────────────▼──────────────────┐                    │
│      │     family_members                   │                    │
│      │  ┌─────────────────────────────────┐│                    │
│      │  │ id (PK)                         ││                    │
│      │  │ user_id (FK → auth.users)       ││                    │
│      │  │ name                            ││                    │
│      │  │ relationship                    ││                    │
│      │  │ date_of_birth                   ││                    │
│      │  │ gender                          ││                    │
│      │  │ age (calculated)                ││                    │
│      │  │ existing_conditions (array)     ││                    │
│      │  │ allergies (array)               ││                    │
│      │  │ medical_history_notes           ││                    │
│      │  │ created_at, updated_at          ││                    │
│      │  └─────────────────────────────────┘│                    │
│      └──────────────────┬──────────────────┘                    │
│                         │                                         │
│      ┌──────────────────▼──────────────────┐                    │
│      │     sessions                         │                    │
│      │  ┌─────────────────────────────────┐│                    │
│      │  │ id (PK)                         ││                    │
│      │  │ user_id (FK → auth.users)       ││                    │
│      │  │ family_member_id (FK)   ← NEW! ││                    │
│      │  │ tone                            ││                    │
│      │  │ language_level                  ││                    │
│      │  │ status                          ││                    │
│      │  │ created_at, updated_at          ││                    │
│      │  └─────────────────────────────────┘│                    │
│      └──────────────────┬──────────────────┘                    │
│                         │                                         │
│      ┌──────────────────▼──────────────────┐                    │
│      │     files                            │                    │
│      │  ┌─────────────────────────────────┐│                    │
│      │  │ id (PK)                         ││                    │
│      │  │ session_id (FK → sessions)      ││                    │
│      │  │ user_id (FK → auth.users)       ││                    │
│      │  │ storage_path                    ││                    │
│      │  │ file_name, file_type, size      ││                    │
│      │  │ extracted_text                  ││                    │
│      │  └─────────────────────────────────┘│                    │
│      └──────────────────┬──────────────────┘                    │
│                         │                                         │
│      ┌──────────────────▼──────────────────┐                    │
│      │     health_metrics                   │                    │
│      │  ┌─────────────────────────────────┐│                    │
│      │  │ id (PK)                         ││                    │
│      │  │ session_id (FK → sessions)      ││                    │
│      │  │ metric_name, value, unit        ││                    │
│      │  │ date, notes                     ││                    │
│      │  └─────────────────────────────────┘│                    │
│      └─────────────────────────────────────┘                    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

      RELATIONSHIPS: family_member → sessions → files → metrics
```

---

## Data Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User (auth.users)                             │
│                    - id (PK)                                     │
│                    - email                                       │
│                    - created_at                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│  family_members      │  │  sessions            │
│  - id (PK)           │  │  - id (PK)           │
│  - user_id (FK)      │  │  - user_id (FK)      │
│  - name              │  │  - family_member_id  │──┐
│  - relationship      │  │  - tone              │  │
│  - date_of_birth     │  │  - language_level    │  │
│  - gender            │  │  - status            │  │
│  - age               │  └──────────────────────┘  │
│  - conditions[]      │             │              │
│  - allergies[]       │             │              │
│  - history_notes     │             ▼              │
└──────────────────────┘    ┌──────────────────────┐│
           ▲                │  files               ││
           │                │  - id (PK)           ││
           └────────────────│  - session_id (FK)   ││
                            │  - storage_path      ││
                            │  - file_name         ││
                            └──────────────────────┘│
                                     │              │
                                     ▼              │
                            ┌──────────────────────┐│
                            │  parsed_documents    ││
                            │  - id (PK)           ││
                            │  - session_id (FK)   ││
                            │  - file_id (FK)      ││
                            │  - parsed_data       ││
                            └──────────────────────┘│
                                     │              │
                                     ▼              │
                            ┌──────────────────────┐│
                            │  health_metrics      ││
                            │  - id (PK)           ││
                            │  - session_id (FK)   ││
                            │  - metric_name       ││
                            │  - value, unit       ││
                            └──────────────────────┘│
                                                    │
         ┌──────────────────────────────────────────┘
         │  FAMILY LINK: Enables family-aware
         │  analysis across all downstream data
         ▼
┌─────────────────────────────────────────────────┐
│  Hereditary Pattern Detection                   │
│  - Query metrics across family members          │
│  - Identify common conditions                   │
│  - Calculate genetic risk scores                │
└─────────────────────────────────────────────────┘
```

---

## Upload Workflow State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                      WORKFLOW STATES                         │
└─────────────────────────────────────────────────────────────┘

    [START]
       │
       ▼
 ┌───────────────┐
 │  Step 0       │
 │  Family       │◄────────────┐
 │  Details      │  "Add More" │
 └───────┬───────┘             │
         │                     │
    ┌────┴────┐                │
    │         │                │
    ▼         ▼                │
[Select]   [Skip]              │
    │         │                │
    ├─────────┤                │
    │ memberId│                │
    │ or null │                │
    └────┬────┘                │
         │                     │
         ▼                     │
 ┌───────────────┐             │
 │  Step 1       │             │
 │  Upload       │             │
 │  Files        │─────────────┘
 └───────┬───────┘  "Back to
         │          Family"
         ▼
 ┌───────────────┐
 │  Step 2       │
 │  Customize    │
 │  Settings     │
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │  CREATE       │
 │  SESSION      │◄────────┐
 │  WITH         │         │
 │  member_id    │         │
 └───────┬───────┘         │
         │                 │
         ▼                 │
 ┌───────────────┐         │
 │  UPLOAD       │         │
 │  FILES TO     │─────────┘
 │  STORAGE      │   Retry
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │  Step 3       │
 │  Preview      │
 │  Documents    │
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │  Step 4       │
 │  Parse &      │
 │  Process      │
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │  GENERATE     │
 │  INSIGHTS     │
 │  (Family-     │
 │   aware)      │
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │  Step 5       │
 │  Download     │
 │  Report       │
 └───────┬───────┘
         │
         ▼
     [COMPLETE]
```

---

## Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  USER INTERACTION FLOW                       │
└─────────────────────────────────────────────────────────────┘

User Opens Upload Workflow
         │
         ▼
┌────────────────────────────┐
│  UploadWorkflow Component  │
│  - currentStep = 0         │
│  - selectedMemberId = null │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│  FamilyDetailsCapture Component        │
│  ┌──────────────────────────────────┐ │
│  │  useEffect()                     │ │
│  │    ├─→ loadFamilyMembers()       │ │
│  │    │      ↓                       │ │
│  │    │   GET /family_members       │ │
│  │    │      ↓                       │ │
│  │    │   setMembers(data)          │ │
│  │    └─→ Render UI                 │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
         │
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐  ┌─────────┐
│ User    │  │ User    │
│ Clicks  │  │ Clicks  │
│ "Add    │  │ Select  │
│ Member" │  │ Existing│
└────┬────┘  └────┬────┘
     │            │
     ▼            ▼
┌─────────────────────────┐
│  handleSubmitMember()   │
│  ┌───────────────────┐  │
│  │ Validate input    │  │
│  │      ↓            │  │
│  │ Calculate age     │  │
│  │      ↓            │  │
│  │ POST /family_     │  │
│  │      members      │  │
│  │      ↓            │  │
│  │ Return member_id  │  │
│  │      ↓            │  │
│  │ Update UI         │  │
│  └───────────────────┘  │
└─────────────────────────┘
     │            │
     └────┬───────┘
          │
          ▼
┌─────────────────────────────┐
│  onContinue(member_id)      │
│  ┌───────────────────────┐  │
│  │ Set selectedMemberId  │  │
│  │      ↓                │  │
│  │ setCurrentStep(1)     │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
          │
          ▼
┌─────────────────────────────┐
│  Step 1: Upload Files       │
│  (memberId available)       │
└─────────────────────────────┘
          │
          ▼
┌─────────────────────────────┐
│  handleUpload()             │
│  ┌───────────────────────┐  │
│  │ Create session:       │  │
│  │  {                    │  │
│  │    user_id,           │  │
│  │    family_member_id,  │◄─┤ KEY LINK
│  │    tone,              │  │
│  │    language_level     │  │
│  │  }                    │  │
│  │      ↓                │  │
│  │ Upload files          │  │
│  │      ↓                │  │
│  │ Link to session       │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  SECURITY LAYERS                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  LAYER 1: Authentication (Supabase Auth)    │
│  - JWT tokens                               │
│  - Session management                        │
│  - Email/password authentication            │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  LAYER 2: Authorization (RLS Policies)      │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  family_members RLS:                  │ │
│  │  • SELECT: auth.uid() = user_id       │ │
│  │  • INSERT: auth.uid() = user_id       │ │
│  │  • UPDATE: auth.uid() = user_id       │ │
│  │  • DELETE: auth.uid() = user_id       │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  sessions RLS:                        │ │
│  │  • SELECT: auth.uid() = user_id       │ │
│  │  • INSERT: auth.uid() = user_id       │ │
│  │  • Can only link own family members   │ │
│  └───────────────────────────────────────┘ │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  LAYER 3: Data Encryption                   │
│  - Encryption at rest (Supabase)            │
│  - TLS/SSL in transit                       │
│  - Secure storage for files                 │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  LAYER 4: Input Validation                  │
│  - Client-side validation                   │
│  - Server-side validation                   │
│  - SQL injection prevention                 │
│  - XSS protection                           │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  LAYER 5: Audit Logging                     │
│  - family_audit_log table                   │
│  - Track all CRUD operations                │
│  - Immutable audit trail                    │
└─────────────────────────────────────────────┘
```

---

## Data Privacy & Compliance

```
┌─────────────────────────────────────────────────────────────┐
│                  PRIVACY SAFEGUARDS                          │
└─────────────────────────────────────────────────────────────┘

User Data Isolation
├── Row Level Security enforced on ALL tables
├── JWT-based authentication required for all operations
├── User can ONLY access their own family members
└── Cascade deletion on user account removal

Data Encryption
├── At Rest: Supabase PostgreSQL encryption
├── In Transit: TLS 1.3 for all connections
├── Storage: Encrypted blob storage for files
└── Backups: Encrypted database backups

HIPAA Readiness
├── Business Associate Agreement (BAA) available
├── Audit logging of all PHI access
├── Data retention policies configurable
├── Secure data deletion procedures
└── Access controls and user authentication

Compliance Features
├── Data portability (export functionality)
├── Right to erasure (delete account + data)
├── Data minimization (only essential fields)
├── Purpose limitation (health tracking only)
└── Consent management (terms acceptance)
```

---

## Performance Optimization

```
┌─────────────────────────────────────────────────────────────┐
│                  PERFORMANCE STRATEGIES                      │
└─────────────────────────────────────────────────────────────┘

Database Level
├── Indexes on foreign keys
│   ├── family_members.user_id
│   ├── sessions.family_member_id
│   └── files.session_id
├── Query optimization
│   ├── Select specific columns
│   ├── Limit result sets
│   └── Use proper joins
└── Connection pooling via Supabase

Application Level
├── Component-level state management
│   ├── Cache family members in state
│   ├── Avoid redundant API calls
│   └── Optimistic UI updates
├── Lazy loading
│   ├── Load family details only when needed
│   ├── Paginate large family lists
│   └── Defer non-critical data
└── Memoization
    ├── useMemo for expensive calculations
    ├── useCallback for event handlers
    └── React.memo for pure components

Network Level
├── Request batching where possible
├── Gzip compression enabled
├── CDN for static assets
└── Minimize bundle size

UI/UX Level
├── Loading skeletons
├── Progressive disclosure
├── Error boundaries
└── Graceful degradation
```

---

## Scalability Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                  SCALABILITY MATRIX                          │
└─────────────────────────────────────────────────────────────┘

                    Current  Target   Maximum
Users               1,000    100,000  1,000,000
Family Members/User 10       20       50
Sessions/User/Month 4        10       30
Files/Session       5        10       20
DB Size             1 GB     100 GB   1 TB
Concurrent Users    100      10,000   50,000

Scaling Strategies:
├── Horizontal scaling via Supabase
├── Read replicas for heavy queries
├── Caching layer (Redis) for hot data
├── CDN for file storage
├── Sharding by user_id if needed
└── Archive old data to cold storage
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-28
**Architecture Review Date**: 2025-10-28
**Next Review**: 2025-11-28
