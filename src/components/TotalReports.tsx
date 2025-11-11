import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Filter,
  Search,
  AlertCircle,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface TotalReportsProps {
  darkMode: boolean;
}

interface GeneratedReport {
  id: string;
  session_id: string;
  insight_id: string;
  title: string;
  report_type: string;
  storage_path: string;
  file_size: number;
  created_at: string;
}

export const TotalReports: React.FC<TotalReportsProps> = ({ darkMode }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'file' | 'session'; id: string } | null>(null);
  const [viewingReport, setViewingReport] = useState<string | null>(null);
  const [viewingGeneratedReport, setViewingGeneratedReport] = useState<GeneratedReport | null>(null);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [reportPreviewHtml, setReportPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;

    try {
      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Load all files for this user
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (filesError) throw filesError;

      // Load parsed documents
      const { data: parsedData, error: parsedError } = await supabase
        .from('parsed_documents')
        .select('*')
        .eq('user_id', user.id)
        .eq('parsing_status', 'completed')
        .order('created_at', { ascending: false });

      if (parsedError) throw parsedError;

      // Load health insights
      const { data: healthInsights, error: insightsError } = await supabase
        .from('health_insights')
        .select('id, session_id, executive_summary, detailed_findings, report_storage_path, report_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (insightsError) {
        console.warn('Error loading health insights:', insightsError);
      }

      // Load generated health reports
      const { data: healthReports, error: reportsError } = await supabase
        .from('health_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false });

      if (reportsError) {
        console.warn('Error loading health reports:', reportsError);
      }

      // Group files, parsed data, health insights, and generated reports by session
      const processedSessions = sessionsData?.map(session => ({
        ...session,
        files: filesData?.filter((f: any) =>
          f.session_id === session.id
        ) || [],
        parsedReports: parsedData?.filter((p: any) =>
          p.session_id === session.id
        ) || [],
        healthInsights: healthInsights?.filter((i: any) =>
          i.session_id === session.id
        ) || [],
        generatedReports: healthReports?.filter((r: any) =>
          r.session_id === session.id
        ) || []
      })) || [];

      setSessions(processedSessions);

      // Background check: Trigger report pre-generation for sessions with insights but no reports
      checkAndPreGenerateReports(processedSessions);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      alert(`Failed to load sessions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Check for sessions with insights but no generated reports and trigger background generation
  const checkAndPreGenerateReports = async (sessions: any[]) => {
    if (!user) return;

    for (const session of sessions) {
      // Skip if session already has generated reports
      if (session.generatedReports && session.generatedReports.length > 0) {
        continue;
      }

      // Skip if session has no parsed reports (no insights to generate from)
      if (!session.parsedReports || session.parsedReports.length === 0) {
        continue;
      }

      // Check if health insights exist for this session
      try {
        const { data: insights, error } = await supabase
          .from('health_insights')
          .select('id, report_storage_path')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn(`Error checking insights for session ${session.id}:`, error);
          continue;
        }

        // If insights exist but no report is cached, trigger background generation
        if (insights && !insights.report_storage_path) {
          console.log(`Background: Triggering report generation for session ${session.id}`);
          // Don't await - let it run in background
          generateReportInBackground(session.id);
        }
      } catch (err) {
        console.warn(`Error in background check for session ${session.id}:`, err);
      }
    }
  };

  // Background report generation (non-blocking)
  const generateReportInBackground = async (sessionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-health-report`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          sessionId,
          reportType: 'comprehensive',
          includeQuestions: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Background report generated for session ${sessionId}:`, result.cached ? 'cached' : 'new');
        // Silently reload sessions to update UI
        await loadSessions();
      }
    } catch (error) {
      // Silent failure - this is background operation
      console.warn(`Background report generation failed for session ${sessionId}:`, error);
    }
  };

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleDeleteFile = async (fileId: string, storagePath: string) => {
    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('medical-files')
        .remove([storagePath]);

      if (storageError) {
        console.warn('Storage delete error:', storageError);
      }

      // Hard delete from database
      const { error: deleteError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (deleteError) throw deleteError;

      // Reload sessions
      await loadSessions();
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('Delete file error:', error);
      alert(`Failed to delete file: ${error.message}`);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      // Delete all files from storage
      for (const file of session.files) {
        const { error } = await supabase.storage
          .from('medical-files')
          .remove([file.storage_path]);

        if (error) {
          console.warn('Storage delete warning:', error);
        }
      }

      // Hard delete files from database
      const { error: filesError } = await supabase
        .from('files')
        .delete()
        .eq('session_id', sessionId);

      if (filesError) {
        console.warn('Files delete warning:', filesError);
      }

      // Delete session
      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      // Reload sessions
      await loadSessions();
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('Delete session error:', error);
      alert(`Failed to delete session: ${error.message}`);
    }
  };

  const handleDownloadFile = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-files')
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      alert(`Failed to download: ${error.message}`);
    }
  };

  const handleGenerateReport = async (sessionId: string) => {
    try {
      setGeneratingReport(sessionId);

      // Verify authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication error: ' + sessionError.message);
      }
      if (!session) {
        console.error('No active session found');
        throw new Error('Not authenticated. Please sign in again.');
      }

      // CRITICAL: Check if health insights exist before generating report
      console.log('Checking for existing health insights for session:', sessionId);
      const { data: existingInsights, error: insightsError } = await supabase
        .from('health_insights')
        .select('id, executive_summary, detailed_findings, report_storage_path, report_id')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (insightsError) {
        console.error('Error checking insights:', insightsError);
        throw new Error('Failed to check health insights: ' + insightsError.message);
      }

      if (!existingInsights || !existingInsights.executive_summary) {
        throw new Error('No health insights found. Please generate insights first by completing the upload workflow.');
      }

      console.log('Health insights verified. Generating report for session:', sessionId);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-health-report`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          sessionId,
          reportType: 'comprehensive',
          includeQuestions: true
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate report';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('Edge function error response:', errorData);
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
          console.error('Edge function error (text):', errorText);
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }

      const result = await response.json();
      console.log('Report generation result:', result.cached ? 'Using cached report' : 'Generated new report');

      // Reload sessions to show the new report
      await loadSessions();
      alert('Health Insights Report generated successfully! You can now download it from the reports list.');
    } catch (error: any) {
      console.error('Error generating report:', error);
      alert(`Failed to generate report: ${error.message}\n\nPlease try again or contact support if the problem persists.`);
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleViewGeneratedReport = async (report: GeneratedReport) => {
    try {
      const { data, error } = await supabase.storage
        .from('health-reports')
        .download(report.storage_path);

      if (error) throw error;

      const htmlContent = await data.text();
      setReportPreviewHtml(htmlContent);
      setViewingGeneratedReport(report);

      // Log view access
      await supabase.from('report_access_log').insert({
        report_id: report.id,
        user_id: user?.id,
        action: 'viewed'
      });
    } catch (error: any) {
      console.error('Error viewing report:', error);
      alert(`Failed to view report: ${error.message}`);
    }
  };

  const handleDownloadGeneratedReport = async (report: GeneratedReport) => {
    try {
      const { data, error } = await supabase.storage
        .from('health-reports')
        .download(report.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `althea-health-report-${report.id.substring(0, 8)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log download access
      await supabase.from('report_access_log').insert({
        report_id: report.id,
        user_id: user?.id,
        action: 'downloaded'
      });

      alert('Report downloaded successfully!');
    } catch (error: any) {
      console.error('Error downloading report:', error);
      alert(`Failed to download report: ${error.message}`);
    }
  };

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    // Filter by status
    if (filterStatus !== 'all' && session.status !== filterStatus) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSession =
        session.profile_name?.toLowerCase().includes(searchLower) ||
        session.lab_name?.toLowerCase().includes(searchLower);

      const matchesFile = session.files.some((file: any) =>
        file.file_name.toLowerCase().includes(searchLower)
      );

      return matchesSession || matchesFile;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="relative">
          <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full" />
          <div className="absolute inset-0 animate-ping w-12 h-12 border-4 border-green-300 border-t-transparent rounded-full opacity-20" />
        </div>
        <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Loading your health reports...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Total Reports
        </h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          View and manage all your health report sessions
        </p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search sessions or files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`pl-10 pr-8 py-2 rounded-lg border appearance-none ${
              darkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className={`text-center py-12 rounded-xl ${
          darkMode ? 'bg-gray-800' : 'bg-gray-50'
        }`}>
          <FileText className={`w-16 h-16 mx-auto mb-4 ${
            darkMode ? 'text-gray-600' : 'text-gray-400'
          }`} />
          <p className={`text-lg font-medium mb-2 ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {searchTerm || filterStatus !== 'all' ? 'No sessions match your filters' : 'No sessions yet'}
          </p>
          <p className={darkMode ? 'text-gray-500' : 'text-gray-600'}>
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Upload your first health report to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`rounded-xl border overflow-hidden transition-all hover:shadow-xl ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
              }`}
            >
              {/* Session Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleSessionExpansion(session.id)}
                        className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                      >
                        {expandedSessions.has(session.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            darkMode ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'
                          }`}>
                            #{filteredSessions.indexOf(session) + 1}
                          </span>
                          <h3 className={`text-lg font-semibold ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {session.parsedReports?.[0]?.structured_data?.profile_name || 'Health Report Session'}
                          </h3>
                        </div>
                        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(session.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span>•</span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {new Date(session.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            {session.files.length} {session.files.length === 1 ? 'document' : 'documents'}
                          </span>
                          {session.parsedReports && session.parsedReports.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center">
                                <Activity className="w-4 h-4 mr-1" />
                                {session.parsedReports.length} parsed
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            session.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : session.status === 'processing'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : session.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Actions */}
                  {deleteConfirm?.type === 'session' && deleteConfirm.id === session.id ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className={`px-3 py-1 text-sm rounded ${
                          darkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm({ type: 'session', id: session.id })}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-500/20 transition-colors"
                      title="Delete entire session"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Documents and Parsed Data */}
              {expandedSessions.has(session.id) && (
                <div className={`border-t ${
                  darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                }`}>
                  {/* Files Section */}
                  <div className="px-4 py-3 space-y-2">
                    <h4 className={`text-sm font-semibold mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Uploaded Documents
                    </h4>
                    {session.files.length === 0 ? (
                      <div className="text-center py-4">
                        <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${
                          darkMode ? 'text-gray-600' : 'text-gray-400'
                        }`} />
                        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                          No documents in this session
                        </p>
                      </div>
                    ) : (
                      session.files.map((file: any) => (
                        <div
                          key={file.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            darkMode ? 'bg-gray-800' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {file.file_name}
                              </p>
                              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                {(file.file_size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Download Button */}
                            <button
                              onClick={() => handleDownloadFile(file.storage_path, file.file_name)}
                              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            {deleteConfirm?.type === 'file' && deleteConfirm.id === file.id ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleDeleteFile(file.id, file.storage_path)}
                                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className={`px-2 py-1 text-xs rounded ${
                                    darkMode
                                      ? 'bg-gray-700 text-gray-300'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm({ type: 'file', id: file.id })}
                                className="p-2 rounded text-red-500 hover:bg-red-500/20 transition-colors"
                                title="Delete file"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Parsed Data Section */}
                  {session.parsedReports && session.parsedReports.length > 0 && (
                    <div className={`px-4 py-3 border-t ${
                      darkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <h4 className={`text-sm font-semibold mb-3 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Parsed Medical Data
                      </h4>
                      <div className="space-y-3">
                        {session.parsedReports.map((report: any, idx: number) => {
                          const data = report.structured_data;
                          const isExpanded = viewingReport === report.id;

                          return (
                            <div
                              key={report.id}
                              className={`rounded-lg border ${
                                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                              }`}
                            >
                              {/* Report Header */}
                              <div className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                                        darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                      }`}>
                                        Report {idx + 1}
                                      </span>
                                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                        {data?.lab_name || 'Lab Report'}
                                      </span>
                                    </div>
                                    <p className={`font-medium ${
                                      darkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                      {data?.profile_name || data?.patient_info?.name || 'Patient Report'}
                                    </p>
                                    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs ${
                                      darkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                      {data?.report_date && (
                                        <span>Report Date: {data.report_date}</span>
                                      )}
                                      {data?.doctor_name && (
                                        <><span>•</span><span>By: {data.doctor_name}</span></>
                                      )}
                                      {data?.key_metrics && (
                                        <><span>•</span><span>{data.key_metrics.length} tests</span></>
                                      )}
                                      {data?.abnormal_findings && data.abnormal_findings.length > 0 && (
                                        <><span>•</span>
                                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                                          {data.abnormal_findings.length} abnormal
                                        </span></>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setViewingReport(isExpanded ? null : report.id)}
                                    className={`ml-3 p-2 rounded-lg transition-colors ${
                                      darkMode
                                        ? 'hover:bg-gray-700 text-gray-400'
                                        : 'hover:bg-gray-100 text-gray-600'
                                    }`}
                                    title={isExpanded ? 'Hide details' : 'View details'}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Expanded Report Details */}
                              {isExpanded && data && (
                                <div className={`border-t px-4 py-3 space-y-4 ${
                                  darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                                }`}>
                                  {/* Patient Info */}
                                  {data.patient_info && (
                                    <div>
                                      <h5 className={`text-xs font-semibold mb-2 ${
                                        darkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>
                                        Patient Information
                                      </h5>
                                      <div className={`grid grid-cols-2 gap-2 text-sm ${
                                        darkMode ? 'text-gray-300' : 'text-gray-700'
                                      }`}>
                                        {data.patient_info.age && <div><span className="font-medium">Age:</span> {data.patient_info.age}</div>}
                                        {data.patient_info.gender && <div><span className="font-medium">Gender:</span> {data.patient_info.gender}</div>}
                                        {data.patient_info.contact && <div className="col-span-2"><span className="font-medium">Contact:</span> {data.patient_info.contact}</div>}
                                      </div>
                                    </div>
                                  )}

                                  {/* Key Metrics */}
                                  {data.key_metrics && data.key_metrics.length > 0 && (
                                    <div>
                                      <h5 className={`text-xs font-semibold mb-2 ${
                                        darkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>
                                        Test Results ({data.key_metrics.length})
                                      </h5>
                                      <div className="max-h-64 overflow-y-auto space-y-2">
                                        {data.key_metrics.map((metric: any, midx: number) => (
                                          <div
                                            key={midx}
                                            className={`flex items-center justify-between p-2 rounded text-sm ${
                                              darkMode ? 'bg-gray-800' : 'bg-white'
                                            }`}
                                          >
                                            <div className="flex-1">
                                              <p className={`font-medium ${
                                                darkMode ? 'text-white' : 'text-gray-900'
                                              }`}>
                                                {metric.test || metric.test_name}
                                              </p>
                                              <p className={`text-xs ${
                                                darkMode ? 'text-gray-500' : 'text-gray-600'
                                              }`}>
                                                Range: {metric.range || metric.reference_range}
                                              </p>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                              <span className={`font-semibold ${
                                                darkMode ? 'text-gray-300' : 'text-gray-700'
                                              }`}>
                                                {metric.value} {metric.unit}
                                              </span>
                                              {metric.status === 'HIGH' || metric.interpretation === 'High' ? (
                                                <span className="flex items-center text-red-600 dark:text-red-400">
                                                  <TrendingUp className="w-4 h-4 mr-1" />
                                                  HIGH
                                                </span>
                                              ) : metric.status === 'LOW' || metric.interpretation === 'Low' ? (
                                                <span className="flex items-center text-blue-600 dark:text-blue-400">
                                                  <TrendingDown className="w-4 h-4 mr-1" />
                                                  LOW
                                                </span>
                                              ) : (
                                                <span className="flex items-center text-green-600 dark:text-green-400">
                                                  <Minus className="w-4 h-4 mr-1" />
                                                  NORMAL
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Summary */}
                                  {data.summary && (
                                    <div>
                                      <h5 className={`text-xs font-semibold mb-2 ${
                                        darkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>
                                        Clinical Summary
                                      </h5>
                                      <p className={`text-sm ${
                                        darkMode ? 'text-gray-300' : 'text-gray-700'
                                      }`}>
                                        {data.summary}
                                      </p>
                                    </div>
                                  )}

                                  {/* Abnormal Findings */}
                                  {data.abnormal_findings && data.abnormal_findings.length > 0 && (
                                    <div>
                                      <h5 className={`text-xs font-semibold mb-2 text-amber-600 dark:text-amber-400`}>
                                        Abnormal Findings ({data.abnormal_findings.length})
                                      </h5>
                                      <ul className={`space-y-1 text-sm ${
                                        darkMode ? 'text-gray-300' : 'text-gray-700'
                                      }`}>
                                        {data.abnormal_findings.map((finding: string, fidx: number) => (
                                          <li key={fidx} className="flex items-start">
                                            <span className="text-amber-500 mr-2">•</span>
                                            <span>{finding}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Recommendations */}
                                  {data.recommendations && data.recommendations.length > 0 && (
                                    <div>
                                      <h5 className={`text-xs font-semibold mb-2 ${
                                        darkMode ? 'text-gray-400' : 'text-gray-600'
                                      }`}>
                                        Recommendations
                                      </h5>
                                      <ul className={`space-y-1 text-sm ${
                                        darkMode ? 'text-gray-300' : 'text-gray-700'
                                      }`}>
                                        {data.recommendations.map((rec: string, ridx: number) => (
                                          <li key={ridx} className="flex items-start">
                                            <span className="text-green-500 mr-2">✓</span>
                                            <span>{rec}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Health Insights Reports Section - Smart Display Logic */}
                  {session.parsedReports && session.parsedReports.length > 0 && (
                    <div className={`px-4 py-3 border-t ${
                      darkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <h4 className={`text-sm font-semibold mb-3 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Health Insights Report
                      </h4>

                      {/*
                        SMART DISPLAY LOGIC:
                        1. Check if health_insights exist (insights generated)
                        2. Check if health_reports exist (report file generated)
                        3. Show View/Download ONLY if both exist
                        4. Show Generate button ONLY if insights exist but report doesn't
                        5. Don't show anything if no insights exist yet
                      */}
                      {session.healthInsights && session.healthInsights.length > 0 && session.generatedReports && session.generatedReports.length > 0 ? (
                        /* BOTH health_insights AND health_reports exist - Show View/Download buttons */
                        <div className="space-y-3">
                          {session.generatedReports.map((report: GeneratedReport) => (
                            <div
                              key={report.id}
                              className={`rounded-lg border p-4 ${
                                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <FileText className="w-5 h-5 text-green-600" />
                                    <span className={`font-medium ${
                                      darkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                      {report.title || report.report_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                    }`}>
                                      v1
                                    </span>
                                  </div>
                                  <div className={`flex items-center space-x-3 text-xs ${
                                    darkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    <span className="flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {new Date(report.created_at).toLocaleDateString()}
                                    </span>
                                    <span>•</span>
                                    <span>{(report.file_size / 1024).toFixed(1)} KB</span>
                                    <span>•</span>
                                    <span className="flex items-center text-green-600 dark:text-green-400">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Complete
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                  <button
                                    onClick={() => handleViewGeneratedReport(report)}
                                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg font-medium transition-all ${
                                      darkMode
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                    title="View Report Data"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span className="hidden sm:inline">View</span>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadGeneratedReport(report)}
                                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg font-medium transition-all ${
                                      darkMode
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                    }`}
                                    title="Download Report"
                                  >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Download</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : session.healthInsights && session.healthInsights.length > 0 ? (
                        /* health_insights exist but health_reports don't - Show Generate button */
                        <button
                          onClick={() => handleGenerateReport(session.id)}
                          disabled={generatingReport === session.id}
                          className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                            generatingReport === session.id
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg'
                          }`}
                        >
                          {generatingReport === session.id ? (
                            <>
                              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                              <span>Generating Report...</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-5 h-5" />
                              <span>Generate Health Insights Report</span>
                            </>
                          )}
                        </button>
                      ) : (
                        /* No health_insights exist yet - Show informational message */
                        <div className={`text-center py-4 px-3 rounded-lg ${
                          darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                        }`}>
                          <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Complete the upload workflow to generate health insights first.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Report Preview Modal */}
      {viewingGeneratedReport && reportPreviewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className={`relative w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Health Report Preview
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Generated {new Date(viewingGeneratedReport.generated_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadGeneratedReport(viewingGeneratedReport)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => {
                    setViewingGeneratedReport(null);
                    setReportPreviewHtml(null);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4">
              <iframe
                srcDoc={reportPreviewHtml}
                className="w-full h-[800px] border-0"
                title="Report Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Sessions
          </p>
          <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {sessions.length}
          </p>
        </div>

        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Documents
          </p>
          <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {sessions.reduce((sum, s) => sum + s.files.length, 0)}
          </p>
        </div>

        <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Completed
          </p>
          <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {sessions.filter(s => s.status === 'completed').length}
          </p>
        </div>
      </div>
    </div>
  );
};
