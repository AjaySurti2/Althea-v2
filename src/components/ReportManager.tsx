import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Trash2, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Report {
  id: string;
  report_type: string;
  report_version: number;
  report_data: any;
  storage_path: string;
  generated_at: string;
  created_at: string;
}

interface ReportQuestion {
  id: string;
  question_text: string;
  priority: string;
  category: string;
  clinical_context: string;
  sort_order: number;
}

interface ReportManagerProps {
  sessionId: string;
  darkMode?: boolean;
  onClose?: () => void;
}

export const ReportManager: React.FC<ReportManagerProps> = ({ sessionId, darkMode = false, onClose }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [questions, setQuestions] = useState<ReportQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'questions'>('list');

  useEffect(() => {
    loadReports();
  }, [sessionId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: reportsData, error: reportsError } = await supabase
        .from('health_reports')
        .select('*')
        .eq('session_id', sessionId)
        .order('generated_at', { ascending: false });

      if (reportsError) throw reportsError;
      setReports(reportsData || []);

      if (reportsData && reportsData.length > 0) {
        setSelectedReport(reportsData[0]);
        await loadQuestions(reportsData[0].id);
      }
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (reportId: string) => {
    try {
      const { data: questionsData, error: questionsError } = await supabase
        .from('report_questions')
        .select('*')
        .eq('report_id', reportId)
        .order('sort_order', { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (err: any) {
      console.error('Error loading questions:', err);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

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
      console.log('Report generated successfully:', result);

      await loadReports();
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (report: Report) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.storage
        .from('health-reports')
        .download(report.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-report-${report.id.substring(0, 8)}.html`;
      a.click();
      URL.revokeObjectURL(url);

      // Log download
      await supabase.from('report_access_log').insert({
        report_id: report.id,
        user_id: user.id,
        action: 'downloaded'
      });
    } catch (err: any) {
      console.error('Error downloading report:', err);
      setError(err.message);
    }
  };

  const viewReport = async (report: Report) => {
    setSelectedReport(report);
    await loadQuestions(report.id);
    setViewMode('detail');

    // Log view
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('report_access_log').insert({
        report_id: report.id,
        user_id: user.id,
        action: 'viewed'
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'genetic': return '🧬';
      case 'lifestyle': return '🏃';
      case 'follow_up': return '📅';
      default: return '💡';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mb-4" />
        <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Loading reports...
        </p>
      </div>
    );
  }

  if (viewMode === 'detail' && selectedReport) {
    const report = selectedReport.report_data;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Health Report Details
            </h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Generated: {new Date(selectedReport.generated_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => downloadReport(selectedReport)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
            >
              <Download className="w-5 h-5" />
              <span>Download</span>
            </button>
            <button
              onClick={() => setViewMode('questions')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Questions ({questions.length})</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              Back to List
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-green-50 border border-green-200'}`}>
          <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Executive Summary
          </h3>
          <p className={`text-base leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {report.executive_summary}
          </p>
        </div>

        {/* Key Findings */}
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Key Findings by Category
          </h3>

          {report.key_findings?.genetic?.length > 0 && (
            <div className="mb-6">
              <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                🧬 Genetic Factors
              </h4>
              <div className="space-y-3">
                {report.key_findings.genetic.map((finding: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium">Finding:</span> {finding.finding}
                    </p>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium">Significance:</span> {finding.significance}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                      <span className="font-medium">Action:</span> {finding.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.key_findings?.lifestyle?.length > 0 && (
            <div className="mb-6">
              <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                🏃 Lifestyle Factors
              </h4>
              <div className="space-y-3">
                {report.key_findings.lifestyle.map((finding: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium">Finding:</span> {finding.finding}
                    </p>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium">Significance:</span> {finding.significance}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                      <span className="font-medium">Action:</span> {finding.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.key_findings?.risk_factors?.length > 0 && (
            <div>
              <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                ⚠️ Risk Factors
              </h4>
              <div className="space-y-3">
                {report.key_findings.risk_factors.map((finding: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium">Finding:</span> {finding.finding}
                    </p>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium">Significance:</span> {finding.significance}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                      <span className="font-medium">Action:</span> {finding.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Abnormal Values */}
        {report.abnormal_values?.length > 0 && (
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Abnormal Values Analysis
            </h3>
            <div className="space-y-3">
              {report.abnormal_values.map((value: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                  value.severity === 'high' ? 'border-red-600 bg-red-50 dark:bg-red-900/20' :
                  value.severity === 'medium' ? 'border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                  'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {value.test_name}
                    </h4>
                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                      value.severity === 'high' ? 'bg-red-600 text-white' :
                      value.severity === 'medium' ? 'bg-yellow-600 text-white' :
                      'bg-blue-600 text-white'
                    }`}>
                      {value.severity}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                    <div>
                      <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Your Value:</span>
                      <span className={`ml-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value.value}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Normal:</span>
                      <span className={`ml-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value.reference_range}</span>
                    </div>
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {value.clinical_explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Recommendations */}
        {report.health_recommendations?.length > 0 && (
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Personalized Health Recommendations
            </h3>
            <div className="space-y-4">
              {report.health_recommendations.map((rec: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-lg ${
                  rec.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600' :
                  rec.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-600' :
                  'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {idx + 1}. {rec.recommendation}
                    </h4>
                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${getPriorityColor(rec.priority)}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="font-medium">Rationale:</span> {rec.rationale}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span className="font-medium">Timeline:</span> {rec.timeline}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Family Screening */}
        {report.family_screening?.length > 0 && (
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Family Screening Suggestions
            </h3>
            <div className="space-y-4">
              {report.family_screening.map((screening: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-lg border-l-4 border-purple-600 ${
                  darkMode ? 'bg-purple-900/20' : 'bg-purple-50'
                }`}>
                  <h4 className={`font-semibold mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    {screening.condition}
                  </h4>
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="font-medium">Recommendation:</span> {screening.recommendation}
                  </p>
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="font-medium">Family Members:</span> {screening.family_members}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span className="font-medium">Urgency:</span> {screening.urgency}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Timeline */}
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-teal-50 border border-teal-200'}`}>
          <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Follow-up Timeline
          </h3>
          <p className={`text-base leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {report.follow_up_timeline}
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === 'questions' && selectedReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Questions for Your Doctor
            </h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {questions.length} prioritized questions based on your report
            </p>
          </div>
          <button
            onClick={() => setViewMode('detail')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            Back to Report
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((question, idx) => (
            <div key={question.id} className={`p-5 rounded-xl ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-start space-x-4">
                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  question.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  question.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <p className={`text-base font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {question.question_text}
                    </p>
                    <div className="flex items-center space-x-2 ml-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${getPriorityColor(question.priority)}`}>
                        {question.priority}
                      </span>
                      <span className="text-xl">{getCategoryIcon(question.category)}</span>
                    </div>
                  </div>
                  {question.clinical_context && (
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="font-medium">Context:</span> {question.clinical_context}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <div className={`text-center p-12 rounded-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
          }`}>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              No questions available for this report
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Health Reports
          </h2>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            Comprehensive health analysis reports
          </p>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {generating ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              <span>Generate New Report</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className={`p-4 rounded-xl flex items-start space-x-3 ${
          darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
        }`}>
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-800'}`}>
              Error
            </p>
            <p className={`text-sm ${darkMode ? 'text-red-400/80' : 'text-red-700'}`}>
              {error}
            </p>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className={`text-center p-12 rounded-xl ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
        }`}>
          <FileText className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            No Reports Generated Yet
          </p>
          <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Generate your first Health Insights Report
          </p>
          <button
            onClick={generateReport}
            disabled={generating}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-all"
          >
            Generate Report
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className={`p-6 rounded-xl cursor-pointer transition-all ${
                darkMode
                  ? 'bg-gray-800 border border-gray-700 hover:border-green-500'
                  : 'bg-white border border-gray-200 hover:border-green-500 hover:shadow-md'
              }`}
              onClick={() => viewReport(report)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <FileText className="w-6 h-6 text-green-600" />
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {report.report_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Report
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                    }`}>
                      v{report.report_version}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {new Date(report.generated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        Complete
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadReport(report);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      darkMode
                        ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                    title="Download Report"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      viewReport(report);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      darkMode
                        ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                        : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                    }`}
                    title="View Report"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
