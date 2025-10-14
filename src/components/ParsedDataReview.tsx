import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle, User, Calendar, Activity, FileText, Stethoscope } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ParsedDataReviewProps {
  sessionId: string;
  darkMode: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

interface ParsedDocument {
  id: string;
  file_id: string;
  file_name?: string;
  parsing_status: string;
  structured_data: {
    patient_info?: {
      name?: string;
      age?: string;
      gender?: string;
      id?: string;
    };
    test_results?: Array<{
      test_name: string;
      value: string;
      unit?: string;
      reference_range?: string;
      status?: string;
    }>;
    dates?: {
      test_date?: string;
      report_date?: string;
    };
    doctor_info?: {
      name?: string;
      specialty?: string;
    };
    recommendations?: string[];
    diagnoses?: string[];
    medications?: string[];
    summary?: string;
  };
  confidence_scores: {
    overall: number;
    patient_info: number;
    test_results: number;
    recommendations: number;
  };
}

export const ParsedDataReview: React.FC<ParsedDataReviewProps> = ({
  sessionId,
  darkMode,
  onConfirm,
  onBack
}) => {
  const [parsedDocuments, setParsedDocuments] = useState<ParsedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadParsedDocuments();
  }, [sessionId]);

  const loadParsedDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: parsedData, error: parsedError } = await supabase
        .from('parsed_documents')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (parsedError) throw parsedError;

      if (!parsedData || parsedData.length === 0) {
        setError('No parsed documents found. Please go back and try uploading again.');
        return;
      }

      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('id, file_name')
        .eq('session_id', sessionId);

      if (filesError) throw filesError;

      const filesMap = new Map(filesData?.map(f => [f.id, f.file_name]) || []);

      const enrichedData = parsedData.map(doc => ({
        ...doc,
        file_name: filesMap.get(doc.file_id) || 'Unknown File'
      }));

      setParsedDocuments(enrichedData);
    } catch (err: any) {
      console.error('Error loading parsed documents:', err);
      setError(err.message || 'Failed to load parsed documents');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return darkMode ? 'text-gray-400' : 'text-gray-600';
    switch (status.toLowerCase()) {
      case 'normal':
        return 'text-green-600';
      case 'high':
        return 'text-red-600';
      case 'low':
        return 'text-amber-600';
      default:
        return darkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mb-4" />
        <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Loading parsed data...
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
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className={`font-semibold mb-1 ${darkMode ? 'text-red-400' : 'text-red-800'}`}>
              Unable to Load Parsed Data
            </p>
            <p className={`text-sm ${darkMode ? 'text-red-400/80' : 'text-red-700'}`}>
              {error}
            </p>
          </div>
        </div>

        <div className="flex justify-start">
          <button
            onClick={onBack}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              darkMode
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Upload</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Review Your Documents
        </h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Verify the extracted information before continuing to AI analysis
        </p>
      </div>

      <div className="space-y-4">
        {parsedDocuments.map((doc, docIndex) => (
          <div
            key={doc.id}
            className={`rounded-xl border p-6 ${
              darkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  darkMode ? 'bg-green-500/20' : 'bg-green-50'
                }`}>
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {doc.file_name}
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Document {docIndex + 1} of {parsedDocuments.length}
                  </p>
                </div>
              </div>
              {doc.parsing_status === 'completed' && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Parsed</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {doc.structured_data.patient_info && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Profile Name
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {doc.structured_data.patient_info.name && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Name:</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {doc.structured_data.patient_info.name}
                        </p>
                      </div>
                    )}
                    {doc.structured_data.patient_info.age && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Age:</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {doc.structured_data.patient_info.age}
                        </p>
                      </div>
                    )}
                    {doc.structured_data.patient_info.gender && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Gender:</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {doc.structured_data.patient_info.gender}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {doc.structured_data.dates && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Report Date
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {doc.structured_data.dates.report_date && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Report Date:</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatDate(doc.structured_data.dates.report_date)}
                        </p>
                      </div>
                    )}
                    {doc.structured_data.dates.test_date && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Test Date:</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatDate(doc.structured_data.dates.test_date)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {doc.structured_data.doctor_info && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Stethoscope className="w-5 h-5 text-teal-600" />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Lab / Doctor Name
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {doc.structured_data.doctor_info.name && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Name:</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {doc.structured_data.doctor_info.name}
                        </p>
                      </div>
                    )}
                    {doc.structured_data.doctor_info.specialty && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Specialty:</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {doc.structured_data.doctor_info.specialty}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {doc.structured_data.test_results && doc.structured_data.test_results.length > 0 && (
                <div className={`p-4 rounded-lg md:col-span-2 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Activity className="w-5 h-5 text-green-600" />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Key Health Metrics
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Test</th>
                          <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Value</th>
                          <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Range</th>
                          <th className={`text-left py-2 px-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doc.structured_data.test_results.map((test, idx) => (
                          <tr key={idx} className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                            <td className={`py-2 px-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {test.test_name}
                            </td>
                            <td className={`py-2 px-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {test.value} {test.unit}
                            </td>
                            <td className={`py-2 px-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {test.reference_range || 'N/A'}
                            </td>
                            <td className={`py-2 px-2`}>
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
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
        <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
          <strong>Note:</strong> Please verify the extracted information is correct. You can edit or update details after AI processing.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            darkMode
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <button
          onClick={onConfirm}
          className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          <span>Confirm & Continue</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
