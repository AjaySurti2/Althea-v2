import React, { useState, useEffect } from 'react';
import {
  Brain, Heart, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft,
  TrendingUp, Users, Calendar, Download, MessageCircle, Activity,
  Lightbulb, FileText, RefreshCw, Sliders, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UnifiedHealthInsightsProps {
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

interface ToneOption {
  value: string;
  label: string;
  description: string;
  icon: string;
}

interface LanguageOption {
  value: string;
  label: string;
  description: string;
}

export const UnifiedHealthInsights: React.FC<UnifiedHealthInsightsProps> = ({
  sessionId,
  darkMode,
  onContinue,
  onBack
}) => {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preference state
  const [tone, setTone] = useState('friendly');
  const [languageLevel, setLanguageLevel] = useState('simple');
  const [showPreferences, setShowPreferences] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Report caching state
  const [reportStoragePath, setReportStoragePath] = useState<string | null>(null);
  const [reportCached, setReportCached] = useState(false);

  const toneOptions: ToneOption[] = [
    {
      value: 'friendly',
      label: 'Friendly',
      description: 'Warm, conversational, and approachable tone',
      icon: '😊'
    },
    {
      value: 'professional',
      label: 'Professional',
      description: 'Clear, respectful, and informative language',
      icon: '💼'
    },
    {
      value: 'empathetic',
      label: 'Empathetic',
      description: 'Compassionate, understanding, and supportive',
      icon: '❤️'
    }
  ];

  const languageOptions: LanguageOption[] = [
    {
      value: 'simple',
      label: 'Simple',
      description: 'Easy-to-understand terms for everyone'
    },
    {
      value: 'moderate',
      label: 'Moderate',
      description: 'Balanced medical terminology'
    },
    {
      value: 'technical',
      label: 'Technical',
      description: 'Professional medical language'
    }
  ];

  useEffect(() => {
    loadInsights();
    loadUserPreferences();
  }, [sessionId]);

  const loadUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_insight_preferences')
        .select('tone, language_level')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTone(data.tone);
        setLanguageLevel(data.language_level);
      }
    } catch (err: any) {
      console.error('Error loading preferences:', err);
    }
  };

  const saveUserPreferences = async (newTone: string, newLanguageLevel: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_insight_preferences')
        .insert({
          user_id: user.id,
          tone: newTone,
          language_level: newLanguageLevel
        });

      if (error) throw error;
    } catch (err: any) {
      console.error('Error saving preferences:', err);
    }
  };

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: existingInsights, error: fetchError } = await supabase
        .from('health_insights')
        .select('*')
        .eq('session_id', sessionId)
        .eq('tone', tone)
        .eq('language_level', languageLevel)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingInsights) {
        setInsights(existingInsights.insights_data);

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
      setRegenerating(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

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
      setHasUnsavedChanges(false);

      await saveUserPreferences(tone, languageLevel);
    } catch (err: any) {
      console.error('Error generating insights:', err);
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleToneChange = (newTone: string) => {
    setTone(newTone);
    setHasUnsavedChanges(true);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguageLevel(newLanguage);
    setHasUnsavedChanges(true);
  };

  const handleRegenerate = async () => {
    await generateInsights();
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      let storagePath = reportStoragePath;

      // If report is not cached, generate it
      if (!reportCached) {
        console.log('Generating report for session:', sessionId);

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
            includeQuestions: true,
            tone,
            languageLevel
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate report');
        }

        const result = await response.json();
        console.log('Report result:', result.cached ? 'Using cached report' : 'Generated new report');

        if (result.storage_path) {
          storagePath = result.storage_path;
          setReportStoragePath(storagePath);
          setReportCached(true);
        } else {
          throw new Error('No storage path returned from report generation');
        }
      } else {
        console.log('Using cached report:', storagePath);
      }

      // Download the report from storage
      if (storagePath) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('health-reports')
          .download(storagePath);

        if (downloadError) throw new Error('Failed to download report: ' + downloadError.message);

        if (fileData) {
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
      }
    } catch (err: any) {
      console.error('Error with report:', err);
      setError(err.message);
    } finally {
      setGeneratingReport(false);
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

  if (regenerating) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Brain className="w-16 h-16 text-green-500 animate-pulse mb-4" />
        <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Althea is analyzing your health data...
        </p>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Applying {toneOptions.find(t => t.value === tone)?.label} tone with {languageOptions.find(l => l.value === languageLevel)?.label} language
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
      {/* Header with Logo and Preferences */}
      <div className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-md pb-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <img
              src="/AltheaLogoGreen.jpg"
              alt="Althea Logo"
              className="h-12 w-12 object-contain"
            />
            <div>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Your Health Insights & Report
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                AI-powered analysis by Althea
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Customize</span>
          </button>
        </div>

        {/* Preference Controls */}
        {showPreferences && (
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Tone Selection */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Communication Tone
                </label>
                <div className="space-y-2">
                  {toneOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleToneChange(option.value)}
                      className={`w-full flex items-start space-x-3 p-3 rounded-lg border-2 transition-all ${
                        tone === option.value
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : darkMode
                          ? 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className="text-2xl">{option.icon}</span>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {option.label}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {option.description}
                        </p>
                      </div>
                      {tone === option.value && (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Level Selection */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Language Level
                </label>
                <div className="space-y-2">
                  {languageOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleLanguageChange(option.value)}
                      className={`w-full flex items-start space-x-3 p-3 rounded-lg border-2 transition-all ${
                        languageLevel === option.value
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : darkMode
                          ? 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {option.label}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {option.description}
                        </p>
                      </div>
                      {languageLevel === option.value && (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {hasUnsavedChanges && (
              <div className="mt-4 flex items-center justify-end space-x-3">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Changes not applied yet
                </p>
                <button
                  onClick={handleRegenerate}
                  className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Apply & Regenerate</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Current Settings Display */}
        {!showPreferences && (
          <div className="flex items-center space-x-4 mt-3">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Current style:
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
            }`}>
              {toneOptions.find(t => t.value === tone)?.label}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
            }`}>
              {languageOptions.find(l => l.value === languageLevel)?.label}
            </span>
          </div>
        )}
      </div>

      {/* Urgency Flag */}
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

      {/* Summary Section */}
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

      {/* Key Findings */}
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

      {/* Abnormal Values */}
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

      {/* Questions for Doctor */}
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

      {/* Health Recommendations */}
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

      {/* Family Screening Suggestions */}
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

      {/* Follow-up Timeline */}
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

      {/* Disclaimer */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
        <p className={`text-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-800'}`}>
          <strong>Disclaimer:</strong> These insights are for informational purposes only and do not constitute medical advice.
          Always consult with your healthcare provider for medical decisions and before making any changes to your health routine.
        </p>
      </div>

      {/* Action Buttons - Floating Bar */}
      <div className={`sticky bottom-0 ${darkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-md py-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
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
            <button
              onClick={handleRegenerate}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              <RefreshCw className="w-5 h-5" />
              <span>Regenerate</span>
            </button>

            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                generatingReport
                  ? 'bg-gray-400 cursor-not-allowed'
                  : reportCached
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-600'
              }`}
            >
              {generatingReport ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  <span>{reportCached ? 'Downloading...' : 'Generating...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>{reportCached ? 'Download Report' : 'Generate & Download Report'}</span>
                </>
              )}
            </button>

            <button
              onClick={onContinue}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
