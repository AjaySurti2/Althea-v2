import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReportRequest {
  sessionId: string;
  reportType?: string;
  includeQuestions?: boolean;
}

interface ReportSection {
  executive_summary: string;
  key_findings: {
    genetic: any[];
    lifestyle: any[];
    risk_factors: any[];
  };
  abnormal_values: any[];
  health_recommendations: any[];
  family_screening: any[];
  follow_up_timeline: string;
}

async function generateReportContent(
  labReports: any[],
  testResults: any[],
  patient: any,
  insights: any
): Promise<ReportSection> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const systemPrompt = `You are a medical report generator creating comprehensive health reports.

Generate a structured health report with these EXACT sections:

1. EXECUTIVE SUMMARY (2-3 sentences overview)
2. KEY FINDINGS BY CATEGORY (organized by: genetic, lifestyle, risk_factors)
3. ABNORMAL VALUES ANALYSIS (with clinical explanations and reference ranges)
4. PERSONALIZED HEALTH RECOMMENDATIONS (3-5 actionable items)
5. FAMILY SCREENING SUGGESTIONS (genetic counseling recommendations)
6. FOLLOW-UP TIMELINE (specific dates and intervals)

OUTPUT FORMAT (JSON):
{
  "executive_summary": "2-3 sentence overview",
  "key_findings": {
    "genetic": [{"finding": "...", "significance": "...", "action": "..."}],
    "lifestyle": [{"finding": "...", "significance": "...", "action": "..."}],
    "risk_factors": [{"finding": "...", "significance": "...", "action": "..."}]
  },
  "abnormal_values": [{
    "test_name": "...",
    "value": "...",
    "reference_range": "...",
    "clinical_explanation": "...",
    "severity": "high/medium/low"
  }],
  "health_recommendations": [{
    "recommendation": "...",
    "rationale": "...",
    "priority": "high/medium/low",
    "timeline": "..."
  }],
  "family_screening": [{
    "condition": "...",
    "recommendation": "...",
    "family_members": "...",
    "urgency": "..."
  }],
  "follow_up_timeline": "Detailed schedule with specific dates"
}`;

  const testSummary = testResults.map(test => ({
    test: test.test_name,
    value: test.observed_value,
    unit: test.unit,
    range: test.reference_range_text,
    status: test.status,
    category: test.test_category
  }));

  try {
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
            content: `Generate a comprehensive health report for:

PATIENT: ${JSON.stringify(patient, null, 2)}

TEST RESULTS (${testResults.length} tests):
${JSON.stringify(testSummary, null, 2)}

EXISTING INSIGHTS:
${JSON.stringify(insights, null, 2)}

Generate the structured report in JSON format.`,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const reportContent = JSON.parse(result.choices?.[0]?.message?.content || "{}");
    return reportContent;
  } catch (error: any) {
    console.error("Error generating report content:", error);
    throw error;
  }
}

async function generateQuestions(
  reportContent: ReportSection,
  testResults: any[]
): Promise<any[]> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const systemPrompt = `Generate 3-5 clinically relevant questions a patient should ask their doctor.

REQUIREMENTS:
- Based on actual test results and findings
- Prioritize by clinical significance (high, medium, low)
- Encourage patient engagement
- Help clarify health concerns
- Specific to the patient's results

OUTPUT FORMAT (JSON):
{
  "questions": [{
    "question": "Specific question text",
    "priority": "high/medium/low",
    "category": "genetic/lifestyle/follow_up/general",
    "clinical_context": "Why this question matters"
  }]
}`;

  try {
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
            content: `Based on this health report, generate 3-5 priority questions:

ABNORMAL VALUES:
${JSON.stringify(reportContent.abnormal_values, null, 2)}

KEY FINDINGS:
${JSON.stringify(reportContent.key_findings, null, 2)}

Generate the questions in JSON format.`,
          },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const questionsData = JSON.parse(result.choices?.[0]?.message?.content || '{"questions":[]}');
    return questionsData.questions || [];
  } catch (error: any) {
    console.error("Error generating questions:", error);
    return [];
  }
}

async function generateHTMLReport(
  reportContent: ReportSection,
  patient: any,
  reportMetadata: any,
  aiInsights?: any
): Promise<string> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Althea Health Report - ${reportMetadata.reportId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 40px;
      max-width: 1000px;
      margin: 0 auto;
    }
    .brand-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 20px;
      background: linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%);
      border-radius: 12px;
      border: 2px solid #10b981;
    }
    .brand-logo-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .brand-logo {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .brand-name-section {
      display: flex;
      flex-direction: column;
    }
    .brand-name {
      font-size: 28px;
      font-weight: bold;
      color: #10b981;
      letter-spacing: -0.5px;
    }
    .brand-tagline {
      font-size: 13px;
      color: #059669;
      font-style: italic;
    }
    .report-title {
      text-align: right;
      color: #6b7280;
    }
    .report-title h2 {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }
    .report-title p {
      font-size: 12px;
      color: #6b7280;
    }
    .header {
      border-bottom: 4px solid #10b981;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #10b981;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .metadata {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      font-size: 14px;
      color: #666;
    }
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .section-title {
      color: #10b981;
      font-size: 24px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .executive-summary {
      background: #f0fdf4;
      padding: 20px;
      border-left: 4px solid #10b981;
      font-size: 16px;
      line-height: 1.8;
    }
    .finding-category {
      margin-bottom: 20px;
    }
    .finding-category h3 {
      color: #059669;
      font-size: 18px;
      margin-bottom: 10px;
    }
    .finding-item {
      background: #f9fafb;
      padding: 15px;
      margin-bottom: 10px;
      border-left: 3px solid #10b981;
    }
    .abnormal-value {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin-bottom: 15px;
    }
    .abnormal-value.medium {
      background: #fefce8;
      border-left-color: #f59e0b;
    }
    .abnormal-value.low {
      background: #eff6ff;
      border-left-color: #3b82f6;
    }
    .abnormal-value h4 {
      color: #1f2937;
      margin-bottom: 8px;
    }
    .value-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin: 10px 0;
      font-size: 14px;
    }
    .recommendation {
      background: #fefce8;
      border-left: 4px solid #eab308;
      padding: 15px;
      margin-bottom: 15px;
    }
    .recommendation.high-priority {
      background: #fef2f2;
      border-left-color: #ef4444;
    }
    .priority-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .priority-high { background: #fee2e2; color: #991b1b; }
    .priority-medium { background: #fef3c7; color: #92400e; }
    .priority-low { background: #dbeafe; color: #1e40af; }
    .family-screening {
      background: #f5f3ff;
      border-left: 4px solid #8b5cf6;
      padding: 15px;
      margin-bottom: 15px;
    }
    .timeline {
      background: #f0fdfa;
      padding: 20px;
      border-left: 4px solid #14b8a6;
      font-size: 15px;
      line-height: 1.8;
    }
    .ai-insights {
      background: #faf5ff;
      border-left: 4px solid #a855f7;
      padding: 15px;
      margin-bottom: 15px;
    }
    .question-item {
      background: #f9fafb;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 8px;
      border-left: 3px solid #10b981;
    }
    .question-number {
      display: inline-block;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #10b981;
      color: white;
      text-align: center;
      line-height: 24px;
      font-size: 12px;
      font-weight: bold;
      margin-right: 10px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .footer-logo {
      display: inline-block;
      width: 24px;
      height: 24px;
      vertical-align: middle;
      margin-right: 8px;
    }
    .disclaimer {
      background: #fffbeb;
      border: 1px solid #fde047;
      padding: 15px;
      margin-top: 30px;
      font-size: 13px;
      line-height: 1.6;
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="brand-header">
    <div class="brand-logo-section">
      <div class="brand-logo">
        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2310b981'/%3E%3Ctext x='50' y='70' font-family='Arial, sans-serif' font-size='60' font-weight='bold' fill='white' text-anchor='middle'%3EA%3C/text%3E%3C/svg%3E" alt="Althea Logo" />
      </div>
      <div class="brand-name-section">
        <div class="brand-name">Althea</div>
        <div class="brand-tagline">Your Personal Health Interpreter</div>
      </div>
    </div>
    <div class="report-title">
      <h2>Comprehensive Health Report</h2>
      <p>Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  </div>

  <div class="header">
    <h1>Patient Health Summary</h1>
    <div class="metadata">
      <div><strong>Patient:</strong> ${patient?.name || 'N/A'}</div>
      <div><strong>Report ID:</strong> ${reportMetadata.reportId.substring(0, 8)}</div>
      <div><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div><strong>Version:</strong> ${reportMetadata.version}</div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">1. Executive Summary</h2>
    <div class="executive-summary">
      ${reportContent.executive_summary}
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">2. Key Findings by Category</h2>

    ${reportContent.key_findings.genetic?.length > 0 ? `
    <div class="finding-category">
      <h3>Genetic Factors</h3>
      ${reportContent.key_findings.genetic.map(f => `
        <div class="finding-item">
          <strong>Finding:</strong> ${f.finding}<br>
          <strong>Significance:</strong> ${f.significance}<br>
          <strong>Action:</strong> ${f.action}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${reportContent.key_findings.lifestyle?.length > 0 ? `
    <div class="finding-category">
      <h3>Lifestyle Factors</h3>
      ${reportContent.key_findings.lifestyle.map(f => `
        <div class="finding-item">
          <strong>Finding:</strong> ${f.finding}<br>
          <strong>Significance:</strong> ${f.significance}<br>
          <strong>Action:</strong> ${f.action}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${reportContent.key_findings.risk_factors?.length > 0 ? `
    <div class="finding-category">
      <h3>Risk Factors</h3>
      ${reportContent.key_findings.risk_factors.map(f => `
        <div class="finding-item">
          <strong>Finding:</strong> ${f.finding}<br>
          <strong>Significance:</strong> ${f.significance}<br>
          <strong>Action:</strong> ${f.action}
        </div>
      `).join('')}
    </div>
    ` : ''}
  </div>

  ${reportContent.abnormal_values?.length > 0 ? `
  <div class="section">
    <h2 class="section-title">3. Abnormal Values Analysis</h2>
    ${reportContent.abnormal_values.map(v => `
      <div class="abnormal-value ${v.severity}">
        <h4>${v.test_name}</h4>
        <div class="value-grid">
          <div><strong>Your Value:</strong> ${v.value}</div>
          <div><strong>Reference Range:</strong> ${v.reference_range}</div>
        </div>
        <p><strong>Clinical Explanation:</strong> ${v.clinical_explanation}</p>
        <span class="priority-badge priority-${v.severity}">${v.severity} Priority</span>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${reportContent.health_recommendations?.length > 0 ? `
  <div class="section">
    <h2 class="section-title">4. Personalized Health Recommendations</h2>
    ${reportContent.health_recommendations.map((r, idx) => `
      <div class="recommendation ${r.priority === 'high' ? 'high-priority' : ''}">
        <strong>${idx + 1}. ${r.recommendation}</strong>
        <p><strong>Rationale:</strong> ${r.rationale}</p>
        <p><strong>Timeline:</strong> ${r.timeline}</p>
        <span class="priority-badge priority-${r.priority}">${r.priority} Priority</span>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${reportContent.family_screening?.length > 0 ? `
  <div class="section">
    <h2 class="section-title">5. Family Screening Suggestions</h2>
    ${reportContent.family_screening.map(s => `
      <div class="family-screening">
        <h4>${s.condition}</h4>
        <p><strong>Recommendation:</strong> ${s.recommendation}</p>
        <p><strong>Family Members:</strong> ${s.family_members}</p>
        <p><strong>Urgency:</strong> ${s.urgency}</p>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="section">
    <h2 class="section-title">6. Follow-up Timeline</h2>
    <div class="timeline">
      ${reportContent.follow_up_timeline}
    </div>
  </div>

  ${aiInsights ? `
  <div class="section">
    <h2 class="section-title">7. AI Health Insights (Step 3 Analysis)</h2>

    ${aiInsights.summary ? `
    <div class="ai-insights">
      <h3 style="color: #8b5cf6; margin-bottom: 10px;">AI-Generated Summary</h3>
      <p>${aiInsights.summary}</p>
    </div>
    ` : ''}

    ${aiInsights.questions_for_doctor?.length > 0 ? `
    <div class="ai-insights">
      <h3 style="color: #8b5cf6; margin-bottom: 10px;">Questions for Your Doctor</h3>
      ${aiInsights.questions_for_doctor.map((q: string, idx: number) => `
        <div class="question-item">
          <span class="question-number">${idx + 1}</span>
          ${q}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${aiInsights.health_recommendations?.length > 0 ? `
    <div class="ai-insights">
      <h3 style="color: #8b5cf6; margin-bottom: 10px;">Additional AI Recommendations</h3>
      ${aiInsights.health_recommendations.map((rec: any, idx: number) => `
        <div class="recommendation">
          <strong>${idx + 1}. ${rec.category || rec.recommendation}</strong>
          <p>${rec.recommendation}</p>
          ${rec.priority ? `<span class="priority-badge priority-${rec.priority}">${rec.priority} Priority</span>` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${aiInsights.urgency_flag && aiInsights.urgency_flag !== 'none' ? `
    <div style="background: #fef2f2; border: 2px solid #ef4444; padding: 15px; border-radius: 8px; margin-top: 15px;">
      <h4 style="color: #dc2626; margin-bottom: 8px;">⚠️ URGENCY FLAG: ${aiInsights.urgency_flag.toUpperCase()}</h4>
      <p style="color: #7f1d1d;">Some findings require timely medical attention. Please consult your healthcare provider promptly.</p>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <div class="disclaimer">
    <strong>Important Disclaimer:</strong> This report is for informational purposes only and does not constitute medical advice, diagnosis, or treatment.
    Always consult with qualified healthcare professionals for medical decisions. This report is generated by AI and should be reviewed by your healthcare provider.
  </div>

  <div class="footer">
    <p>
      <img class="footer-logo" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2310b981'/%3E%3Ctext x='50' y='70' font-family='Arial, sans-serif' font-size='60' font-weight='bold' fill='white' text-anchor='middle'%3EA%3C/text%3E%3C/svg%3E" alt="Althea Logo" />
      <strong>Althea</strong> - Your Personal Health Interpreter | Generated on ${new Date().toLocaleString()}
    </p>
    <p>Report ID: ${reportMetadata.reportId.substring(0, 8)} | Version: ${reportMetadata.version}</p>
    <p style="margin-top: 8px; font-size: 11px;">This report is confidential and intended solely for the patient named above.</p>
  </div>
</body>
</html>`;

  return html;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId, reportType = "comprehensive", includeQuestions = true }: ReportRequest = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Generating health report for session: ${sessionId}`);

    // Get lab reports and test results
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
    const { data: testResults } = await supabase
      .from("test_results")
      .select("*")
      .in("lab_report_id", reportIds);

    const patientId = labReports[0].patient_id;
    const { data: patient } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .maybeSingle();

    // Get existing insights
    const { data: existingInsights } = await supabase
      .from("health_insights")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    console.log(`Generating report content for ${testResults?.length || 0} tests`);

    // Generate report content
    const reportContent = await generateReportContent(
      labReports,
      testResults || [],
      patient,
      existingInsights?.insights_data
    );

    // Generate report ID and metadata
    const reportId = crypto.randomUUID();
    const reportMetadata = {
      reportId,
      version: 1,
      generatedAt: new Date().toISOString()
    };

    // Generate HTML report with AI insights
    const htmlContent = await generateHTMLReport(
      reportContent,
      patient,
      reportMetadata,
      existingInsights?.insights_data
    );

    // Save HTML to storage
    const userId = labReports[0].user_id;
    const storagePath = `${userId}/${reportId}.html`;

    const { error: uploadError } = await supabase.storage
      .from("health-reports")
      .upload(storagePath, new Blob([htmlContent], { type: "text/html" }), {
        contentType: "text/html",
        upsert: false
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
    }

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from("health_reports")
      .insert({
        id: reportId,
        user_id: userId,
        session_id: sessionId,
        report_type: reportType,
        report_version: 1,
        report_data: reportContent,
        storage_path: storagePath,
        file_size: htmlContent.length,
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // Generate and save questions
    let questions = [];
    if (includeQuestions) {
      questions = await generateQuestions(reportContent, testResults || []);

      for (let i = 0; i < questions.length; i++) {
        await supabase.from("report_questions").insert({
          report_id: reportId,
          user_id: userId,
          question_text: questions[i].question,
          priority: questions[i].priority,
          category: questions[i].category,
          clinical_context: questions[i].clinical_context,
          sort_order: i
        });
      }
    }

    // Log access
    await supabase.from("report_access_log").insert({
      report_id: reportId,
      user_id: userId,
      action: "generated",
      accessed_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        report: savedReport,
        questions: questions,
        storage_path: storagePath,
        download_url: `${supabaseUrl}/storage/v1/object/public/health-reports/${storagePath}`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Generate health report error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate health report",
        details: error.toString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
