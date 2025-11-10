import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InsightsRequest {
  sessionId: string;
  tone?: string;
  languageLevel?: string;
  forceRegenerate?: boolean;
}

const TONE_MAPPINGS = {
  professional: "formal, clinical, and precise",
  conversational: "friendly, approachable, and easy-to-understand",
  reassuring: "empathetic, comforting, and supportive",
  direct: "straightforward, concise, and factual"
};

const LANGUAGE_MAPPINGS = {
  medical_professional: "Use proper medical terminology and clinical language",
  educated_patient: "Use medical terms with brief explanations",
  simple_terms: "Avoid medical jargon, use everyday language",
  child_friendly: "Use very simple words suitable for children"
};

async function checkExistingInsights(supabase: any, sessionId: string, tone: string, languageLevel: string) {
  const { data: existingInsight } = await supabase
    .from("health_insights")
    .select("*")
    .eq("session_id", sessionId)
    .eq("tone", tone)
    .eq("language_level", languageLevel)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingInsight) {
    console.log(`✅ [Cache Hit] Found existing insights for session ${sessionId}`);
    return existingInsight;
  }

  console.log(`🔄 [Cache Miss] No existing insights found, generating new`);
  return null;
}

async function generateHealthInsights(
  labReports: any[],
  testResults: any[],
  patient: any,
  tone: string,
  languageLevel: string
): Promise<any> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const toneDescription = TONE_MAPPINGS[tone as keyof typeof TONE_MAPPINGS] || TONE_MAPPINGS.conversational;
  const languageDescription = LANGUAGE_MAPPINGS[languageLevel as keyof typeof LANGUAGE_MAPPINGS] || LANGUAGE_MAPPINGS.simple_terms;

  const systemPrompt = `You are Althea, an AI health interpreter combining deep medical knowledge with compassionate communication.

CORE EXPERTISE:
- Apply clinician-level medical reasoning to assess findings accurately
- Evaluate test results using established clinical guidelines
- Distinguish between statistical abnormality and clinical significance
- Consider age, gender, and demographic factors in interpretation
- Use evidence-based assessment to determine true urgency

CLINICAL INTELLIGENCE:
- A value outside reference range is not automatically concerning
- Assess the degree of abnormality (mildly elevated vs critically high)
- Consider common benign variations vs findings requiring attention
- Evaluate patterns across related tests for comprehensive assessment
- Use clinical practice standards to determine urgency levels

URGENCY ASSESSMENT (Clinical Guidelines):
- CRITICAL (emergency): Life-threatening values requiring immediate ER visit
- URGENT (same-day to 24hrs): Significant abnormalities needing prompt attention
- ROUTINE (days to weeks): Mild abnormalities for next scheduled appointment
- MONITORING: Variations to track over time but not immediately concerning

COMMUNICATION STYLE:
- Tone: ${toneDescription}
- Language Level: ${languageDescription}
- Always state medical term first, then plain language explanation
- Use medically accurate analogies that patients can understand
- Balance thorough explanation with accessibility

PERSONALIZATION:
- Use patient's name naturally: "Hello ${patient?.name || '[Name]'}!"
- Reference report type and date in context
- Acknowledge family relationships when analyzing multiple profiles
- Compare to previous results when available for trend analysis

EXPLANATION STRUCTURE FOR EACH FINDING:
1. What it is: Simple definition in everyday terms
2. Your result: State value with context (high/low/normal)
3. What it means: Clinical significance in plain language
4. Why it matters: Real-world impact on health
5. What to do: Clear actionable guidance based on clinical urgency

QUESTION GENERATION (5-8 clinically relevant questions):
- Understanding Results: About specific abnormal findings, symptom connections
- Clinical Significance: Health implications, urgency, risks
- Action Steps: Treatment options, lifestyle changes, activity restrictions
- Monitoring Plan: Retesting timeline, warning symptoms to watch

ABSOLUTE PROHIBITIONS - NEVER:
- Diagnose conditions ("You have diabetes" → "Your glucose is elevated, discuss with doctor")
- Prescribe medications or specific dosages
- Suggest stopping/changing prescribed medications
- Make prognosis predictions or survival estimates
- Override physician instructions
- Minimize genuine concerns or provide false reassurance
- Use fear-based language causing panic
- Make assumptions about causation without full medical context

SAFETY PROTOCOLS:
- Flag critical values requiring immediate medical attention
- Use clinical judgment to assess true urgency vs routine follow-up
- Provide clear emergency guidance when findings are dangerous
- Acknowledge limitations of interpretation without full medical history

OUTPUT FORMAT (JSON):
{
  "summary": "Brief overview with personalized greeting using patient name",
  "enhanced_summary": {
    "greeting": "Hello [Patient Name]! Here's a clear summary of what your lab results from [Date] tell us:",
    "overall_health_status": "excellent|good|requires_attention|concerning",
    "overall_assessment": "2-3 sentence summary explaining the big picture: what areas need care, what looks good, and overall trajectory",
    "body_response_pattern": "Clear explanation of what patterns show about how the body is functioning",
    "positive_signs": [
      "Specific positive finding 1",
      "Specific positive finding 2"
    ],
    "health_story_context": "Personalized 1-2 sentence narrative connecting findings to patient's wellbeing",
    "key_message": "One clear takeaway message that empowers the patient"
  },
  "key_findings": [
    {
      "category": "Blood Sugar / Heart Health / etc",
      "finding": "Description with clinical context",
      "significance": "What this means (degree of abnormality, common vs concerning)",
      "action_needed": "Specific guidance based on clinical urgency"
    }
  ],
  "abnormal_values": [
    {
      "test_name": "Test name",
      "value": "Current value with unit",
      "normal_range": "Normal range",
      "status": "HIGH/LOW/CRITICAL",
      "explanation": "Clinical significance in plain language"
    }
  ],
  "questions_for_doctor": [
    "Clinically relevant question 1",
    "Clinically relevant question 2",
    "Clinically relevant question 3",
    "Clinically relevant question 4",
    "Clinically relevant question 5"
  ],
  "health_recommendations": [
    {
      "category": "Diet / Exercise / Monitoring / Sleep / Stress",
      "recommendation": "Evidence-based actionable advice",
      "priority": "high/medium/low"
    }
  ],
  "family_screening_suggestions": [
    {
      "condition": "Condition with hereditary component",
      "reason": "Medical basis for family screening",
      "who_should_screen": "Which family members and at what age"
    }
  ],
  "follow_up_timeline": "Clinically appropriate follow-up schedule based on findings",
  "urgency_flag": "none/routine/urgent/emergency (based on clinical guidelines)"
}`;

  const reportSummary = labReports.map(report => ({
    lab: report.lab_name,
    date: report.report_date,
    doctor: report.referring_doctor
  }));

  const testSummary = testResults.map(test => ({
    test: test.test_name,
    value: test.observed_value,
    unit: test.unit,
    range: test.reference_range_text,
    status: test.status,
    category: test.test_category
  }));

  const patientName = patient?.name || 'there';
  const patientAge = patient?.age ? `${patient.age} years old` : 'age not specified';
  const patientGender = patient?.gender || 'gender not specified';
  const reportDate = labReports[0]?.report_date || 'recent date';
  const labName = labReports[0]?.lab_name || 'laboratory';

  const userPrompt = `You are analyzing medical results for ${patientName} (${patientAge}, ${patientGender}).

CONTEXT:
- Patient Name: ${patientName}
- Lab Report from: ${labName}
- Report Date: ${reportDate}
- Number of Tests: ${testResults.length}

IMPORTANT: Start your summary with a personalized greeting using the patient's first name.
Example: "Hello ${patientName}! Let's review your lab results from ${reportDate}..."

PATIENT INFORMATION:
${JSON.stringify(patient, null, 2)}

LAB REPORTS:
${JSON.stringify(reportSummary, null, 2)}

TEST RESULTS (Apply clinical reasoning to assess significance):
${JSON.stringify(testSummary, null, 2)}

CLINICAL ANALYSIS REQUIREMENTS:
1. Use the patient's name naturally throughout the summary
2. Consider their age and gender when evaluating normal ranges
3. Assess each abnormal value for clinical significance (not just statistical abnormality)
4. Generate 5-8 specific, clinically relevant questions based on THEIR results
5. Provide evidence-based recommendations appropriate for their findings
6. Set urgency_flag based on clinical guidelines, not just abnormal values
7. If multiple abnormal values, explain if they're related or independent issues

Provide your comprehensive analysis in JSON format.`;

  try {
    console.log(`🤖 [OpenAI] Generating insights with optimized prompt`);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`OpenAI API error: ${response.status}`, error);
      throw new Error(`Failed to generate insights: ${response.status}`);
    }

    const result = await response.json();
    const insights = JSON.parse(result.choices?.[0]?.message?.content || "{}");

    console.log(`✅ [OpenAI] Insights generated successfully`);

    return insights;
  } catch (error: any) {
    console.error("Error generating insights:", error);
    throw error;
  }
}

async function saveInsightsWithTracking(
  supabase: any,
  sessionId: string,
  userId: string,
  insights: any,
  tone: string,
  languageLevel: string,
  patient: any,
  parentInsightId: string | null = null
) {
  const executiveSummary = `${insights.enhanced_summary?.greeting || insights.summary || ''}\n\n${insights.enhanced_summary?.overall_assessment || ''}\n\n${insights.enhanced_summary?.body_response_pattern || ''}`.trim();

  const { data: savedInsight, error: saveError } = await supabase
    .from("health_insights")
    .insert({
      session_id: sessionId,
      user_id: userId,
      greeting: insights.enhanced_summary?.greeting || `Hello ${patient?.name || 'there'}!`,
      executive_summary: executiveSummary,
      detailed_findings: insights.key_findings || insights.abnormal_values || [],
      trend_analysis: [],
      family_patterns: insights.family_screening_suggestions || [],
      doctor_questions: insights.questions_for_doctor || [],
      next_steps: insights.follow_up_timeline || '',
      disclaimer: 'This interpretation is for educational purposes only. Please consult your healthcare provider for medical advice.',
      tone: tone,
      language_level: languageLevel,
      regeneration_count: parentInsightId ? 1 : 0,
      parent_insight_id: parentInsightId
    })
    .select()
    .single();

  if (saveError) {
    console.error("Failed to save insights to database:", saveError);
    throw new Error(`Failed to save insights: ${saveError.message}`);
  }

  const { error: summaryError } = await supabase
    .from("ai_summaries")
    .insert({
      session_id: sessionId,
      user_id: userId,
      summary_text: executiveSummary,
      doctor_questions: insights.questions_for_doctor || [],
      health_insights: JSON.stringify({
        key_findings: insights.key_findings,
        recommendations: insights.health_recommendations,
        urgency: insights.urgency_flag
      }),
      created_at: new Date().toISOString()
    });

  if (summaryError) {
    console.warn("Failed to save ai_summary:", summaryError.message);
  }

  console.log("✅ [Tracking] Insights saved with ai_summaries audit trail");

  return savedInsight;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      sessionId,
      tone = "conversational",
      languageLevel = "simple_terms",
      forceRegenerate = false
    }: InsightsRequest = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`=== Generate Health Insights (OPTIMIZED) ===`);
    console.log(`Session: ${sessionId}, Tone: ${tone}, Language: ${languageLevel}`);

    const startTime = Date.now();

    if (!forceRegenerate) {
      const cachedInsight = await checkExistingInsights(supabase, sessionId, tone, languageLevel);
      if (cachedInsight) {
        console.log(`⚡ [Cache] Returning cached insights - 0ms OpenAI latency`);

        const cachedInsights = {
          summary: cachedInsight.executive_summary?.split('\n\n')[0] || '',
          enhanced_summary: {
            greeting: cachedInsight.greeting,
            overall_assessment: cachedInsight.executive_summary
          },
          key_findings: cachedInsight.detailed_findings || [],
          questions_for_doctor: cachedInsight.doctor_questions || [],
          family_screening_suggestions: cachedInsight.family_patterns || []
        };

        return new Response(
          JSON.stringify({
            success: true,
            insights: cachedInsights,
            insight_id: cachedInsight.id,
            cached: true,
            metadata: {
              cached_at: cachedInsight.created_at,
              tone: cachedInsight.tone,
              language_level: cachedInsight.language_level
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { data: labReports, error: reportsError } = await supabase
      .from("lab_reports")
      .select("*")
      .eq("session_id", sessionId);

    if (reportsError) throw reportsError;
    if (!labReports || labReports.length === 0) {
      return new Response(
        JSON.stringify({ error: "No lab reports found for this session" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reportIds = labReports.map(r => r.id);
    const { data: testResults, error: testsError } = await supabase
      .from("test_results")
      .select("*")
      .in("lab_report_id", reportIds)
      .order("test_category", { ascending: true });

    if (testsError) throw testsError;

    const patientId = labReports[0].patient_id;
    const { data: patient } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    console.log(`📊 Analyzing ${testResults?.length || 0} test results`);

    const insights = await generateHealthInsights(
      labReports,
      testResults || [],
      patient,
      tone,
      languageLevel
    );

    const savedInsight = await saveInsightsWithTracking(
      supabase,
      sessionId,
      labReports[0].user_id,
      insights,
      tone,
      languageLevel,
      patient
    );

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ [Complete] Generated and saved insights in ${duration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        insights,
        insight_id: savedInsight.id,
        cached: false,
        metadata: {
          reports_analyzed: labReports.length,
          tests_analyzed: testResults?.length || 0,
          patient_name: patient?.name,
          duration: `${duration}s`,
          optimizations: {
            caching_enabled: true,
            ai_summaries_tracking: true,
            audit_trail: true
          }
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Generate insights error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate health insights",
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});