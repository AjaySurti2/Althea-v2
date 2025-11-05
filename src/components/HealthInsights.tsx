import React, { useState, useEffect } from 'react';
import {
  Brain, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft,
  TrendingUp, Users, Calendar, Download, MessageCircle, Activity,
  Lightbulb, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HealthInsightsProps {
  sessionId: string;
  darkMode: boolean;
  onContinue: () => void;
  onBack: () => void;
}

interface InsightsData {
  summary: string;
  key_findings: Array<{
    category: string;
    finding: string;
    significance: string;
    action_needed: string;
  }>;
  abnormal_values: Array<{
    test_name: string;
    value: string;
    normal_range: string;
    status: string;
    explanation: string;
  }>;
  questions_for_doctor: string[];
  health_recommendations: Array<{
    category: string;
    recommendation: string;
    priority: string;
  }>;
  family_screening_suggestions: Array<{
    condition: string;
    reason: string;
    who_should_screen: string;
  }>;
  follow_up_timeline: string;
  urgency_flag: string;
}

export const HealthInsights: React.FC<HealthInsightsProps> = ({
  sessionId,
  darkMode,
  onContinue,
  onBack
}) => {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Simplified mode: Use default preferences automatically
  const [tone] = useState('friendly');
  const [languageLevel] = useState('simple');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportStoragePath, setReportStoragePath] = useState<string | null>(null);
  const [reportCached, setReportCached] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [sessionId]);

  // Auto-generate report in background after insights are loaded (Step 3)
  useEffect(() => {
    if (insights && !reportCached && !generatingReport && !loading) {
      // Automatically trigger report generation in the background
      generateReportInBackground();
    }
  }, [insights, reportCached, loading]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: existingInsights, error: fetchError } = await supabase
        .from('health_insights')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingInsights) {
        setInsights(existingInsights.insights_data);
        // Simplified mode: Ignore stored preferences, always use defaults

        // Check if report is already cached
        if (existingInsights.report_storage_path) {
          setReportStoragePath(existingInsights.report_storage_path);
          setReportCached(true);
        }
      } else {
        await generateInsights();
      }
    } catch (err: any) {
      console.error('Error loading insights:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    try {
      setGenerating(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Map session tone/languageLevel to edge function format
      const toneMap: Record<string, string> = {
        'friendly': 'conversational',
        'professional': 'professional',
        'empathetic': 'reassuring'
      };

      const languageMap: Record<string, string> = {
        'simple': 'simple_terms',
        'moderate': 'educated_patient',
        'technical': 'medical_professional'
      };

      const mappedTone = toneMap[tone] || 'conversational';
      const mappedLanguageLevel = languageMap[languageLevel] || 'simple_terms';

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-health-insights`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          tone: mappedTone,
          languageLevel: mappedLanguageLevel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate insights');
      }

      const result = await response.json();
      setInsights(result.insights);
    } catch (err: any) {
      console.error('Error generating insights:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    await generateInsights();
  };

  // Generate report in background (called automatically in Step 3)
  const generateReportInBackground = async () => {
    try {
      setGeneratingReport(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // CRITICAL: Verify insights are saved in database before generating report
      console.log('Verifying insights are saved before generating report...');
      const { data: savedInsights, error: verifyError } = await supabase
        .from('health_insights')
        .select('id, insights_data')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verifyError || !savedInsights || !savedInsights.insights_data) {
        console.error('Insights not yet saved to database, skipping report generation');
        setGeneratingReport(false);
        return;
      }

      console.log('Insights confirmed in database, auto-generating report in background for session:', sessionId);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-health-report`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          reportType: 'comprehensive',
          includeQuestions: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Background report generation failed:', errorData);
        return; // Don't throw error - just log it
      }

      const result = await response.json();
      console.log('Background report generated:', result.cached ? 'Using cached' : 'New report created');

      if (result.storage_path) {
        // Cache the report path for instant download later
        setReportStoragePath(result.storage_path);
        setReportCached(true);
      }
    } catch (err: any) {
      console.error('Error in background report generation:', err);
      // Don't show error to user - this is a background operation
    } finally {
      setGeneratingReport(false);
    }
  };

  // Handle report download (Step 4 - downloads cached report from Step 3)
  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // If report is already cached from Step 3, just download it
      if (reportCached && reportStoragePath) {
        console.log('Downloading cached report from Step 3:', reportStoragePath);
        await downloadReport(reportStoragePath);
        return;
      }

      // If not cached yet (shouldn't happen in normal flow), generate it now
      console.log('Report not cached, generating now for session:', sessionId);

      // CRITICAL: Verify insights exist before attempting report generation
      const { data: savedInsights, error: verifyError } = await supabase
        .from('health_insights')
        .select('id, insights_data')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verifyError || !savedInsights || !savedInsights.insights_data) {
        throw new Error('Health insights not found in database. Please wait for insights to finish generating.');
      }

      console.log('Insights verified in database, proceeding with report generation');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-health-report`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          reportType: 'comprehensive',
          includeQuestions: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const result = await response.json();
      console.log('Report result:', result.cached ? 'Using cached' : 'Generated new');

      if (result.storage_path) {
        setReportStoragePath(result.storage_path);
        setReportCached(true);
        await downloadReport(result.storage_path);
      } else {
        throw new Error('No storage path returned from report generation');
      }
    } catch (err: any) {
      console.error('Error with report:', err);
      setError(err.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Helper function to download report from storage
  const downloadReport = async (storagePath: string) => {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('health-reports')
      .download(storagePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error('Failed to download report: ' + downloadError.message);
    }

    if (fileData) {
      // Create download link
      const url = window.URL.createObjectURL(fileData);
      const a = document.createElement('a');
      a.href = url;
      a.download = `althea-health-report-${sessionId.substring(0, 8)}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('Report downloaded successfully');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'text-red-600 bg-red-100 border-red-300';
      case 'urgent': return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'routine': return 'text-blue-600 bg-blue-100 border-blue-300';
      default: return 'text-green-600 bg-green-100 border-green-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium': return <Activity className="w-5 h-5 text-orange-600" />;
      default: return <Lightbulb className="w-5 h-5 text-blue-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mb-4" />
        <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Loading health insights...
        </p>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Brain className="w-16 h-16 text-green-500 animate-pulse mb-4" />
        <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Althea is analyzing your health data...
        </p>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          This may take a few moments
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-xl flex items-start space-x-4 ${
          darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
        }`}>
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className={`font-semibold mb-2 ${darkMode ? 'text-red-400' : 'text-red-800'}`}>
              Failed to Generate Insights
            </p>
            <p className={`text-sm ${darkMode ? 'text-red-400/80' : 'text-red-700'}`}>
              {error}
            </p>
          </div>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <button
            onClick={handleRegenerate}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-center p-12">
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          No insights available
        </p>
      </div>
    );
  }

  // Helper to categorize findings
  const categorizeFindings = () => {
    const genetic: any[] = [];
    const lifestyle: any[] = [];
    const riskFactors: any[] = [];

    (insights.key_findings || []).forEach((finding: any) => {
      const category = (finding.category || '').toLowerCase();
      if (category.includes('genetic') || category.includes('family') || category.includes('hereditary')) {
        genetic.push(finding);
      } else if (category.includes('lifestyle') || category.includes('diet') || category.includes('exercise')) {
        lifestyle.push(finding);
      } else if (category.includes('risk')) {
        riskFactors.push(finding);
      } else {
        lifestyle.push(finding);
      }
    });

    return { genetic, lifestyle, riskFactors };
  };

  const categorizedFindings = categorizeFindings();

  return (
    <div className="space-y-6">
      {/* Brand Header - Matches Downloaded Report */}
      <div className={`flex items-center justify-between p-5 rounded-xl border-2 ${
        darkMode ? 'bg-gray-800 border-green-600' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-500'
      }`}>
        <div className="flex items-center space-x-4">
          <img
            src="/Althea-Logo-Green.jpg"
            alt="Althea Logo"
            className="h-16 w-16 object-contain"
          />
          <div>
            <h1 className="text-3xl font-bold text-green-600">Althea</h1>
            <p className="text-sm italic text-green-700">Your Personal Health Interpreter</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Comprehensive Health Report
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Urgency Flag - Matches Report */}
      {insights.urgency_flag && insights.urgency_flag !== 'none' && insights.urgency_flag !== 'routine' && (
        <div className="p-4 rounded-lg border-2 border-red-500 bg-red-50">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-800 font-bold uppercase text-sm mb-1">
                URGENCY FLAG: {insights.urgency_flag.toUpperCase()}
              </h4>
              <p className="text-red-700 text-sm">
                Some findings require timely medical attention. Please consult your healthcare provider promptly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Enhanced Executive Summary */}
      <div className={`p-6 rounded-xl border-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-2xl font-bold mb-4 pb-3 border-b-2 ${darkMode ? 'text-green-400 border-gray-700' : 'text-green-600 border-gray-200'}`}>
          1. Executive Summary
        </h2>

        {insights.enhanced_summary && Object.keys(insights.enhanced_summary).length > 0 ? (
          <div className="space-y-4">
            {/* Greeting */}
            {insights.enhanced_summary.greeting && (
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <p className={`text-lg font-medium ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                  {insights.enhanced_summary.greeting}
                </p>
              </div>
            )}

            {/* Overall Health Status */}
            {insights.enhanced_summary.overall_assessment && (
              <div className={`p-4 rounded-lg border-l-4 border-blue-500 ${darkMode ? 'bg-gray-900/50' : 'bg-blue-50'}`}>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                  Overall Health Status
                </h3>
                <p className={`text-base leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                  {insights.enhanced_summary.overall_assessment}
                </p>
              </div>
            )}

            {/* Body Response Pattern */}
            {insights.enhanced_summary.body_response_pattern && (
              <div className={`p-4 rounded-lg border-l-4 border-purple-500 ${darkMode ? 'bg-gray-900/50' : 'bg-purple-50'}`}>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                  Body Response Pattern
                </h3>
                <p className={`text-base leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                  {insights.enhanced_summary.body_response_pattern}
                </p>
              </div>
            )}

            {/* Positive Signs */}
            {insights.enhanced_summary.positive_signs && insights.enhanced_summary.positive_signs.length > 0 && (
              <div className={`p-4 rounded-lg border-l-4 border-green-500 ${darkMode ? 'bg-gray-900/50' : 'bg-green-50'}`}>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                  Positive Signs
                </h3>
                <ul className="space-y-2">
                  {insights.enhanced_summary.positive_signs.map((sign: string, idx: number) => (
                    <li key={idx} className={`flex items-start space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{sign}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Health Story Context */}
            {insights.enhanced_summary.health_story_context && (
              <div className={`p-4 rounded-lg border-l-4 border-teal-500 ${darkMode ? 'bg-gray-900/50' : 'bg-teal-50'}`}>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-teal-400' : 'text-teal-700'}`}>
                  What This Means for You
                </h3>
                <p className={`text-base leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                  {insights.enhanced_summary.health_story_context}
                </p>
              </div>
            )}

            {/* Key Message */}
            {insights.enhanced_summary.key_message && (
              <div className={`p-4 rounded-lg text-center ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <p className={`text-base italic font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {insights.enhanced_summary.key_message}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Fallback to basic summary */
          <div className={`p-5 rounded-lg border-l-4 border-green-600 ${darkMode ? 'bg-gray-900/50' : 'bg-green-50'}`}>
            <p className={`text-base leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              {insights.summary}
            </p>
          </div>
        )}
      </div>

      {/* Section 2: Key Findings by Category */}
      {(categorizedFindings.genetic.length > 0 || categorizedFindings.lifestyle.length > 0 || categorizedFindings.riskFactors.length > 0) && (
        <div className={`p-6 rounded-xl border-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-2xl font-bold mb-4 pb-3 border-b-2 ${darkMode ? 'text-green-400 border-gray-700' : 'text-green-600 border-gray-200'}`}>
            2. Key Findings by Category
          </h2>

          {categorizedFindings.genetic.length > 0 && (
            <div className="mb-6">
              <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                Genetic & Hereditary Factors
              </h3>
              <div className="space-y-3">
                {categorizedFindings.genetic.map((finding: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg border-l-3 border-blue-500 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <strong>Finding:</strong> {finding.finding}
                    </p>
                    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <strong>Significance:</strong> {finding.significance}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <strong>Action:</strong> {finding.action_needed}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {categorizedFindings.lifestyle.length > 0 && (
            <div className="mb-6">
              <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                Lifestyle Factors
              </h3>
              <div className="space-y-3">
                {categorizedFindings.lifestyle.map((finding: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg border-l-3 border-green-500 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <strong>Finding:</strong> {finding.finding}
                    </p>
                    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <strong>Significance:</strong> {finding.significance}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <strong>Action:</strong> {finding.action_needed}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {categorizedFindings.riskFactors.length > 0 && (
            <div>
              <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                Risk Factors
              </h3>
              <div className="space-y-3">
                {categorizedFindings.riskFactors.map((finding: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg border-l-3 border-red-500 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <strong>Finding:</strong> {finding.finding}
                    </p>
                    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <strong>Significance:</strong> {finding.significance}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <strong>Action:</strong> {finding.action_needed}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 3: Abnormal Values Analysis */}
      {insights.abnormal_values && insights.abnormal_values.length > 0 && (
        <div className={`p-6 rounded-xl border-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-2xl font-bold mb-4 pb-3 border-b-2 ${darkMode ? 'text-green-400 border-gray-700' : 'text-green-600 border-gray-200'}`}>
            3. Abnormal Values Analysis
          </h2>
          <div className="space-y-4">
            {insights.abnormal_values.map((test, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                test.status === 'CRITICAL' ? 'border-red-600 bg-red-50' :
                test.status === 'HIGH' ? 'border-orange-500 bg-orange-50' :
                'border-yellow-500 bg-yellow-50'
              }`}>
                <h4 className="font-bold text-gray-900 mb-3">{test.test_name}</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <span className="font-semibold text-gray-700">Your Value:</span>
                    <p className="text-gray-900">{test.value}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Reference Range:</span>
                    <p className="text-gray-900">{test.normal_range}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-800"><strong>Clinical Explanation:</strong> {test.explanation}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                  test.status === 'CRITICAL' ? 'bg-red-200 text-red-900' :
                  test.status === 'HIGH' ? 'bg-orange-200 text-orange-900' :
                  'bg-yellow-200 text-yellow-900'
                }`}>
                  {test.status} Priority
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Personalized Health Recommendations */}
      {insights.health_recommendations && insights.health_recommendations.length > 0 && (
        <div className={`p-6 rounded-xl border-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-2xl font-bold mb-4 pb-3 border-b-2 ${darkMode ? 'text-green-400 border-gray-700' : 'text-green-600 border-gray-200'}`}>
            4. Personalized Health Recommendations
          </h2>
          <div className="space-y-4">
            {insights.health_recommendations.map((rec, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                rec.priority === 'high' ? 'border-red-500 bg-red-50' :
                rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <strong className="text-gray-900">{idx + 1}. {rec.recommendation}</strong>
                <span className={`inline-block mt-2 ml-2 px-3 py-1 rounded-full text-xs font-bold ${
                  rec.priority === 'high' ? 'bg-red-200 text-red-900' :
                  rec.priority === 'medium' ? 'bg-yellow-200 text-yellow-900' :
                  'bg-blue-200 text-blue-900'
                }`}>
                  {rec.priority} Priority
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5: Family Screening Suggestions */}
      {insights.family_screening_suggestions && insights.family_screening_suggestions.length > 0 && (
        <div className={`p-6 rounded-xl border-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-2xl font-bold mb-4 pb-3 border-b-2 ${darkMode ? 'text-green-400 border-gray-700' : 'text-green-600 border-gray-200'}`}>
            5. Family Screening Suggestions
          </h2>
          <div className="space-y-4">
            {insights.family_screening_suggestions.map((suggestion, idx) => (
              <div key={idx} className="p-4 rounded-lg border-l-4 border-purple-500 bg-purple-50">
                <h4 className="font-bold text-gray-900 mb-2">{suggestion.condition}</h4>
                <p className="text-sm text-gray-800 mb-1">
                  <strong>Recommendation:</strong> {suggestion.reason}
                </p>
                <p className="text-sm text-gray-800">
                  <strong>Family Members:</strong> {suggestion.who_should_screen}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 6: Follow-up Timeline */}
      {insights.follow_up_timeline && (
        <div className={`p-6 rounded-xl border-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-2xl font-bold mb-4 pb-3 border-b-2 ${darkMode ? 'text-green-400 border-gray-700' : 'text-green-600 border-gray-200'}`}>
            6. Follow-up Timeline
          </h2>
          <div className="p-5 rounded-lg border-l-4 border-teal-500 bg-teal-50">
            <p className="text-base text-gray-800 leading-relaxed">
              {insights.follow_up_timeline}
            </p>
          </div>
        </div>
      )}

      {/* Section 7: AI Health Insights (Questions) */}
      {insights.questions_for_doctor && insights.questions_for_doctor.length > 0 && (
        <div className={`p-6 rounded-xl border-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-2xl font-bold mb-4 pb-3 border-b-2 ${darkMode ? 'text-green-400 border-gray-700' : 'text-green-600 border-gray-200'}`}>
            7. AI Health Insights (Step 3 Analysis)
          </h2>
          <div className="p-5 rounded-lg border-l-4 border-purple-500 bg-purple-50 mb-4">
            <h3 className="text-lg font-bold text-purple-800 mb-3">Questions for Your Doctor</h3>
            <div className="space-y-3">
              {insights.questions_for_doctor.map((question, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-3 rounded-lg bg-white">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-gray-800 flex-1">{question}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`p-4 rounded-lg ${darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
        <p className={`text-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>
          <strong>Disclaimer:</strong> These insights are for informational purposes only and do not constitute medical advice.
          Always consult with your healthcare provider for medical decisions and before making any changes to your health routine.
        </p>
      </div>

      {/* Simplified Action Bar - Unified Download Button */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="flex items-center space-x-3">
          {/* Unified Download Button - Uses cached report generated in background */}
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              generatingReport
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            title={reportCached ? "Download your comprehensive health report" : "Generating your report..."}
          >
            {generatingReport ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                <span>Preparing...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download Report</span>
              </>
            )}
          </button>

          <button
            onClick={onContinue}
            className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            <span>Complete</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
