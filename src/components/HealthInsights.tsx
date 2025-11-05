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

      console.log('Auto-generating report in background for session:', sessionId);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img
            src="/Althea-Logo-Green.jpg"
            alt="Althea Logo"
            className="h-12 w-12 object-contain"
          />
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Your Health Insights & Report
            </h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              AI-powered analysis by Althea in friendly, plain language
            </p>
          </div>
        </div>
        {/* Simplified mode: Hide regenerate button - reports auto-generated with friendly defaults */}
      </div>

      {insights.urgency_flag && insights.urgency_flag !== 'none' && (
        <div className={`p-4 rounded-xl border-2 ${getUrgencyColor(insights.urgency_flag)}`}>
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold uppercase text-sm mb-1">
                {insights.urgency_flag} ATTENTION REQUIRED
              </p>
              <p className="text-sm">
                Some findings require timely medical attention. Please consult your healthcare provider.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="w-6 h-6 text-purple-600" />
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Summary
          </h3>
        </div>
        <p className={`text-base leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {insights.summary}
        </p>
      </div>

      {insights.key_findings && insights.key_findings.length > 0 && (
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="w-6 h-6 text-blue-600" />
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Key Findings
            </h3>
          </div>
          <div className="space-y-4">
            {insights.key_findings.map((finding, idx) => (
              <div key={idx} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {finding.category}
                </h4>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="font-medium">Finding:</span> {finding.finding}
                </p>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="font-medium">Significance:</span> {finding.significance}
                </p>
                <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                  <span className="font-medium">Action:</span> {finding.action_needed}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.abnormal_values && insights.abnormal_values.length > 0 && (
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="w-6 h-6 text-orange-600" />
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Values Outside Normal Range
            </h3>
          </div>
          <div className="space-y-3">
            {insights.abnormal_values.map((test, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                test.status === 'CRITICAL' ? 'border-red-600 bg-red-50 dark:bg-red-900/20' :
                test.status === 'HIGH' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20' :
                'border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {test.test_name}
                  </h4>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    test.status === 'CRITICAL' ? 'bg-red-600 text-white' :
                    test.status === 'HIGH' ? 'bg-orange-600 text-white' :
                    'bg-yellow-600 text-white'
                  }`}>
                    {test.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                  <div>
                    <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your Value:</span>
                    <span className={`ml-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{test.value}</span>
                  </div>
                  <div>
                    <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Normal:</span>
                    <span className={`ml-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{test.normal_range}</span>
                  </div>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {test.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.questions_for_doctor && insights.questions_for_doctor.length > 0 && (
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center space-x-3 mb-4">
            <MessageCircle className="w-6 h-6 text-teal-600" />
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Questions for Your Doctor
            </h3>
          </div>
          <ul className="space-y-3">
            {insights.questions_for_doctor.map((question, idx) => (
              <li key={idx} className={`flex items-start space-x-3 p-3 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  darkMode ? 'bg-teal-900/50 text-teal-400' : 'bg-teal-100 text-teal-700'
                }`}>
                  {idx + 1}
                </span>
                <p className={`text-sm flex-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {question}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.health_recommendations && insights.health_recommendations.length > 0 && (
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center space-x-3 mb-4">
            <Lightbulb className="w-6 h-6 text-yellow-600" />
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Health Recommendations
            </h3>
          </div>
          <div className="space-y-3">
            {insights.health_recommendations.map((rec, idx) => (
              <div key={idx} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <div className="flex items-start space-x-3">
                  {getPriorityIcon(rec.priority)}
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {rec.category}
                    </h4>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {rec.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.family_screening_suggestions && insights.family_screening_suggestions.length > 0 && (
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center space-x-3 mb-4">
            <Users className="w-6 h-6 text-pink-600" />
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Family Screening Suggestions
            </h3>
          </div>
          <div className="space-y-4">
            {insights.family_screening_suggestions.map((suggestion, idx) => (
              <div key={idx} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>
                  {suggestion.condition}
                </h4>
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="font-medium">Why:</span> {suggestion.reason}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span className="font-medium">Who should screen:</span> {suggestion.who_should_screen}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.follow_up_timeline && (
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Follow-up Timeline
            </h3>
          </div>
          <p className={`text-base ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {insights.follow_up_timeline}
          </p>
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
