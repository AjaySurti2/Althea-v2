import React, { useState, useEffect } from 'react';
import { Upload, FileText, TrendingUp, Users, Calendar, Download, Settings, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Session, HealthMetric, FamilyPattern, Reminder } from '../lib/supabase';

interface DashboardProps {
  darkMode: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ darkMode }) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'patterns' | 'reminders'>('upload');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [patterns, setPatterns] = useState<FamilyPattern[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [sessionsData, metricsData, patternsData, remindersData] = await Promise.all([
        supabase.from('sessions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('health_metrics').select('*').eq('user_id', user!.id).order('recorded_date', { ascending: false }),
        supabase.from('family_patterns').select('*').eq('user_id', user!.id).order('detected_at', { ascending: false }),
        supabase.from('reminders').select('*').eq('user_id', user!.id).eq('completed', false).order('due_date', { ascending: true }),
      ]);

      if (sessionsData.data) setSessions(sessionsData.data);
      if (metricsData.data) setMetrics(metricsData.data);
      if (patternsData.data) setPatterns(patternsData.data);
      if (remindersData.data) setReminders(remindersData.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'upload' as const, label: 'New Upload', icon: Upload },
    { id: 'history' as const, label: 'Health History', icon: TrendingUp },
    { id: 'patterns' as const, label: 'Family Patterns', icon: Users },
    { id: 'reminders' as const, label: 'Reminders', icon: Calendar },
  ];

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <section id="dashboard" className={`min-h-screen py-24 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome back, {profile?.full_name || 'there'}!
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage your health data and insights
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Reports
              </span>
              <FileText className="w-5 h-5 text-green-500" />
            </div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {sessions.length}
            </div>
          </div>

          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Health Metrics
              </span>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {metrics.length}
            </div>
          </div>

          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Family Patterns
              </span>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {patterns.length}
            </div>
          </div>

          <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Upcoming
              </span>
              <Calendar className="w-5 h-5 text-orange-500" />
            </div>
            <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {reminders.length}
            </div>
          </div>
        </div>

        <div className={`rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg overflow-hidden`}>
          <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex space-x-1 p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-green-500 text-white shadow-lg'
                        : darkMode
                        ? 'text-gray-400 hover:bg-gray-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'upload' && <UploadTab darkMode={darkMode} />}
            {activeTab === 'history' && <HistoryTab darkMode={darkMode} sessions={sessions} metrics={metrics} />}
            {activeTab === 'patterns' && <PatternsTab darkMode={darkMode} patterns={patterns} />}
            {activeTab === 'reminders' && <RemindersTab darkMode={darkMode} reminders={reminders} onUpdate={loadDashboardData} />}
          </div>
        </div>
      </div>
    </section>
  );
};

const UploadTab: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const { user } = useAuth();
  const [tone, setTone] = useState<'friendly' | 'professional' | 'empathetic'>('friendly');
  const [languageLevel, setLanguageLevel] = useState<'simple' | 'moderate' | 'technical'>('simple');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (!user || files.length === 0) return;

    setUploading(true);
    try {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          tone,
          language_level: languageLevel,
          status: 'pending',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      for (const file of files) {
        const filePath = `${user.id}/${session.id}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('medical-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        await supabase.from('files').insert({
          session_id: session.id,
          user_id: user.id,
          storage_path: filePath,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        });
      }

      alert('Files uploaded successfully! Processing will begin shortly.');
      setFiles([]);
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Upload Medical Reports
        </h3>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
          Upload your medical reports, lab results, or prescriptions for AI-powered analysis
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Tone Preference
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as any)}
            className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-green-500 ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
            }`}
          >
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="empathetic">Empathetic</option>
          </select>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Language Level
          </label>
          <select
            value={languageLevel}
            onChange={(e) => setLanguageLevel(e.target.value as any)}
            className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-green-500 ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
            }`}
          >
            <option value="simple">Simple (Easy to understand)</option>
            <option value="moderate">Moderate (Some medical terms)</option>
            <option value="technical">Technical (Medical jargon)</option>
          </select>
        </div>
      </div>

      <div>
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Select Files
        </label>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.txt"
          onChange={handleFileChange}
          className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-green-500 ${
            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
          }`}
        />
        {files.length > 0 && (
          <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {files.length} file(s) selected
          </p>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {uploading ? 'Uploading...' : 'Upload & Process'}
      </button>
    </div>
  );
};

const HistoryTab: React.FC<{ darkMode: boolean; sessions: Session[]; metrics: HealthMetric[] }> = ({ darkMode, sessions, metrics }) => {
  return (
    <div className="space-y-6">
      <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Health History
      </h3>

      {sessions.length === 0 ? (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No reports uploaded yet. Start by uploading your first medical report!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-6 rounded-xl border ${
                darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Session {new Date(session.created_at).toLocaleDateString()}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  session.status === 'completed' ? 'bg-green-100 text-green-700' :
                  session.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                  session.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {session.status}
                </span>
              </div>
              <div className="flex space-x-4 text-sm">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Tone: {session.tone}
                </span>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Level: {session.language_level}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PatternsTab: React.FC<{ darkMode: boolean; patterns: FamilyPattern[] }> = ({ darkMode, patterns }) => {
  return (
    <div className="space-y-6">
      <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Family Health Patterns
      </h3>

      {patterns.length === 0 ? (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No family patterns detected yet. Upload more reports to discover trends!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              className={`p-6 rounded-xl border ${
                darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className={`font-semibold text-lg mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {pattern.pattern_type}
                  </h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Detected on {new Date(pattern.detected_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  pattern.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                  pattern.risk_level === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {pattern.risk_level} risk
                </span>
              </div>
              <p className={`mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {pattern.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {pattern.affected_members.map((member, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {member}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RemindersTab: React.FC<{ darkMode: boolean; reminders: Reminder[]; onUpdate: () => void }> = ({ darkMode, reminders, onUpdate }) => {
  const handleComplete = async (id: string) => {
    await supabase.from('reminders').update({ completed: true }).eq('id', id);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Upcoming Reminders
      </h3>

      {reminders.length === 0 ? (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No upcoming reminders. Stay on top of your health!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`p-6 rounded-xl border ${
                darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className={`font-semibold text-lg mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {reminder.title}
                  </h4>
                  {reminder.description && (
                    <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {reminder.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Due: {new Date(reminder.due_date).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {reminder.reminder_type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleComplete(reminder.id)}
                  className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Complete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
