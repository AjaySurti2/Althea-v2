import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Download, Calendar, Activity,
  FileText, ArrowLeft, CheckCircle, Filter, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MetricsTrackingProps {
  sessionId: string;
  darkMode: boolean;
  onBack: () => void;
}

interface TestResult {
  id: string;
  test_name: string;
  test_category: string;
  observed_value: string;
  unit: string;
  reference_range_text: string;
  status: string;
  created_at: string;
  lab_report_id: string;
  report_date?: string;
}

interface MetricHistory {
  test_name: string;
  history: TestResult[];
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
}

export const MetricsTracking: React.FC<MetricsTrackingProps> = ({
  sessionId,
  darkMode,
  onBack
}) => {
  const [metrics, setMetrics] = useState<MetricHistory[]>([]);
  const [allTests, setAllTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'csv'>('pdf');

  useEffect(() => {
    loadMetrics();
  }, [sessionId]);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: labReports, error: reportsError } = await supabase
        .from('lab_reports')
        .select('id, report_date, session_id')
        .eq('user_id', user.id)
        .order('report_date', { ascending: false });

      if (reportsError) throw reportsError;

      const reportIds = labReports?.map(r => r.id) || [];
      const { data: testResults, error: testsError } = await supabase
        .from('test_results')
        .select('*')
        .in('lab_report_id', reportIds)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;

      const reportsMap = new Map(labReports?.map(r => [r.id, r]) || []);
      const enrichedTests = (testResults || []).map(test => ({
        ...test,
        report_date: reportsMap.get(test.lab_report_id)?.report_date
      }));

      setAllTests(enrichedTests);

      const uniqueCategories = [...new Set(enrichedTests.map(t => t.test_category).filter(Boolean))];
      setCategories(['all', ...uniqueCategories]);

      const testsByName = new Map<string, TestResult[]>();
      enrichedTests.forEach(test => {
        const existing = testsByName.get(test.test_name) || [];
        testsByName.set(test.test_name, [...existing, test]);
      });

      const metricsHistory: MetricHistory[] = [];
      testsByName.forEach((history, testName) => {
        if (history.length >= 1) {
          const sorted = history.sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          let trend: 'up' | 'down' | 'stable' = 'stable';
          let changePercentage = 0;

          if (sorted.length >= 2) {
            const firstValue = parseFloat(sorted[0].observed_value.replace(/[^0-9.]/g, ''));
            const lastValue = parseFloat(sorted[sorted.length - 1].observed_value.replace(/[^0-9.]/g, ''));

            if (!isNaN(firstValue) && !isNaN(lastValue)) {
              changePercentage = ((lastValue - firstValue) / firstValue) * 100;
              if (Math.abs(changePercentage) > 5) {
                trend = changePercentage > 0 ? 'up' : 'down';
              }
            }
          }

          metricsHistory.push({
            test_name: testName,
            history: sorted,
            trend,
            change_percentage: changePercentage
          });
        }
      });

      setMetrics(metricsHistory.sort((a, b) => b.history.length - a.history.length));
    } catch (err: any) {
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-5 h-5 text-orange-600" />;
      case 'down': return <TrendingDown className="w-5 h-5 text-blue-600" />;
      default: return <Minus className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return darkMode ? 'text-gray-400' : 'text-gray-600';
    const normalized = status.toLowerCase();
    if (normalized.includes('normal')) return 'text-green-600';
    if (normalized.includes('high') || normalized.includes('elevated')) return 'text-red-600';
    if (normalized.includes('low')) return 'text-amber-600';
    if (normalized.includes('critical')) return 'text-red-700';
    return darkMode ? 'text-gray-400' : 'text-gray-600';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const downloadCSV = () => {
    const headers = ['Test Name', 'Category', 'Value', 'Unit', 'Range', 'Status', 'Date'];
    const rows = filteredTests.map(test => [
      test.test_name,
      test.test_category || '',
      test.observed_value,
      test.unit || '',
      test.reference_range_text || '',
      test.status || '',
      formatDate(test.report_date || test.created_at)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-metrics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const content = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #10b981; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #10b981; color: white; }
            .status-high { color: #dc2626; font-weight: bold; }
            .status-low { color: #f59e0b; font-weight: bold; }
            .status-normal { color: #10b981; }
          </style>
        </head>
        <body>
          <h1>Health Metrics Report</h1>
          <p>Generated: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Value</th>
                <th>Range</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTests.map(test => `
                <tr>
                  <td>${test.test_name}</td>
                  <td>${test.observed_value} ${test.unit || ''}</td>
                  <td>${test.reference_range_text || 'N/A'}</td>
                  <td class="status-${test.status?.toLowerCase()}">${test.status || 'N/A'}</td>
                  <td>${formatDate(test.report_date || test.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-metrics-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    if (downloadFormat === 'csv') {
      downloadCSV();
    } else {
      downloadPDF();
    }
  };

  const filteredMetrics = metrics.filter(metric => {
    const matchesSearch = metric.test_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' ||
      metric.history.some(h => h.test_category === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const filteredTests = allTests.filter(test => {
    const matchesSearch = test.test_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || test.test_category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mb-4" />
        <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Loading metrics...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Health Metrics Tracking
          </h2>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            Track your health trends over time
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={downloadFormat}
            onChange={(e) => setDownloadFormat(e.target.value as 'pdf' | 'csv')}
            className={`px-4 py-2 rounded-lg border font-medium ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="pdf">PDF Report</option>
            <option value="csv">CSV Export</option>
          </select>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
          >
            <Download className="w-5 h-5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            darkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            type="text"
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>
        <div className="relative">
          <Filter className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            darkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`pl-10 pr-4 py-2 rounded-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center space-x-3 mb-4">
          <Activity className="w-6 h-6 text-green-600" />
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Metrics with History
          </h3>
        </div>

        {filteredMetrics.length === 0 ? (
          <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No metrics found. Upload more reports to track trends.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredMetrics.map((metric, idx) => (
              <div key={idx} className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {metric.test_name}
                    </h4>
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {metric.history.length} measurement{metric.history.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(metric.trend)}
                    {metric.trend !== 'stable' && (
                      <span className={`text-sm font-medium ${
                        metric.trend === 'up' ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        {Math.abs(metric.change_percentage).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        <th className={`text-left py-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Date</th>
                        <th className={`text-left py-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Value</th>
                        <th className={`text-left py-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Range</th>
                        <th className={`text-left py-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metric.history.map((test, testIdx) => (
                        <tr key={testIdx} className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                          <td className={`py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {formatDate(test.report_date || test.created_at)}
                          </td>
                          <td className={`py-2 ${darkMode ? 'text-white' : 'text-gray-900'} font-medium`}>
                            {test.observed_value} {test.unit}
                          </td>
                          <td className={`py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {test.reference_range_text || 'N/A'}
                          </td>
                          <td className="py-2">
                            <span className={`text-xs font-semibold uppercase ${getStatusColor(test.status)}`}>
                              {test.status || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-800'}`}>
              <strong>Workflow Complete!</strong> You can now download your health metrics or return to upload more reports.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-start pt-4">
        <button
          onClick={onBack}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Insights</span>
        </button>
      </div>
    </div>
  );
};
