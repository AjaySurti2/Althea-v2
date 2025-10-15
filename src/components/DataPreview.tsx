import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Activity,
  User,
  FileText,
  Stethoscope,
  Pill,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DataPreviewProps {
  sessionId: string;
  darkMode: boolean;
  customization: {
    tone: string;
    language: string;
  };
  onBack: () => void;
  onApprove: () => void;
}

interface ParsedDocument {
  fileId: string;
  fileName: string;
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
  metadata: {
    file_type: string;
    extraction_method: string;
  };
}

export const DataPreview: React.FC<DataPreviewProps> = ({
  sessionId,
  darkMode,
  customization,
  onBack,
  onApprove
}) => {
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [parsedDocuments, setParsedDocuments] = useState<ParsedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    startParsing();
  }, [sessionId]);

  const startParsing = async () => {
    try {
      setParsing(true);
      setError(null);

      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('id')
        .eq('session_id', sessionId);

      if (filesError) throw filesError;

      if (!files || files.length === 0) {
        throw new Error('No files found for this session');
      }

      const fileIds = files.map(f => f.id);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-documents`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          fileIds,
          customization,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse documents');
      }

      const result = await response.json();
      setParsedDocuments(result.parsed_documents || []);
    } catch (error: any) {
      console.error('Parsing error:', error);
      setError(error.message || 'Failed to parse documents');
    } finally {
      setParsing(false);
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase.from('parsing_previews').insert({
        session_id: sessionId,
        user_id: user.id,
        parsed_documents: parsedDocuments,
        preview_status: 'approved',
        user_feedback: feedback || null,
        approved_at: new Date().toISOString(),
      });

      onApprove();
    } catch (error: any) {
      console.error('Approval error:', error);
      alert(`Failed to save approval: ${error.message}`);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  if (loading || parsing) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
        <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {parsing ? 'Analyzing Documents with AI...' : 'Loading...'}
        </h3>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Extracting structured data using Claude AI
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className={`p-6 rounded-xl border ${
          darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className={`font-semibold mb-2 ${darkMode ? 'text-red-400' : 'text-red-800'}`}>
                Parsing Failed
              </h3>
              <p className={darkMode ? 'text-red-400/80' : 'text-red-700'}>
                {error}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Go Back</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Data Preview & Verification
        </h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Review the extracted data below. Verify accuracy before proceeding.
        </p>
      </div>

      {parsedDocuments.map((doc, docIndex) => (
        <div
          key={docIndex}
          className={`rounded-xl border p-6 space-y-6 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-green-600" />
              <div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {doc.fileName}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Extracted using {doc.metadata.extraction_method}
                </p>
              </div>
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
              doc.confidence_scores.overall >= 0.8
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-yellow-100 dark:bg-yellow-900/30'
            }`}>
              <Activity className={`w-4 h-4 ${getConfidenceColor(doc.confidence_scores.overall)}`} />
              <span className={`text-sm font-medium ${getConfidenceColor(doc.confidence_scores.overall)}`}>
                {getConfidenceLabel(doc.confidence_scores.overall)} Confidence
              </span>
            </div>
          </div>

          {doc.structured_data.patient_info && (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-2 mb-3">
                <User className="w-5 h-5 text-blue-600" />
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Patient Information
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {doc.structured_data.patient_info.name && (
                  <div>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Name:</span>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {doc.structured_data.patient_info.name}
                    </p>
                  </div>
                )}
                {doc.structured_data.patient_info.age && (
                  <div>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Age:</span>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {doc.structured_data.patient_info.age}
                    </p>
                  </div>
                )}
                {doc.structured_data.patient_info.gender && (
                  <div>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Gender:</span>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {doc.structured_data.patient_info.gender}
                    </p>
                  </div>
                )}
                {doc.structured_data.patient_info.id && (
                  <div>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>ID:</span>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {doc.structured_data.patient_info.id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {doc.structured_data.test_results && doc.structured_data.test_results.length > 0 && (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-2 mb-3">
                <Activity className="w-5 h-5 text-green-600" />
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Test Results ({doc.structured_data.test_results.length})
                </h4>
              </div>
              <div className="space-y-2">
                {doc.structured_data.test_results.map((test, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    }`}
                  >
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {test.test_name}
                      </p>
                      {test.reference_range && (
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Reference: {test.reference_range}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {test.value} {test.unit}
                      </p>
                      {test.status && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            test.status === 'normal'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : test.status === 'high' || test.status === 'low'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {test.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {doc.structured_data.diagnoses && doc.structured_data.diagnoses.length > 0 && (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-2 mb-3">
                <Stethoscope className="w-5 h-5 text-purple-600" />
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Diagnoses
                </h4>
              </div>
              <ul className="space-y-1">
                {doc.structured_data.diagnoses.map((diagnosis, idx) => (
                  <li key={idx} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    • {diagnosis}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {doc.structured_data.medications && doc.structured_data.medications.length > 0 && (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-2 mb-3">
                <Pill className="w-5 h-5 text-orange-600" />
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Medications
                </h4>
              </div>
              <ul className="space-y-1">
                {doc.structured_data.medications.map((medication, idx) => (
                  <li key={idx} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    • {medication}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {doc.structured_data.recommendations && doc.structured_data.recommendations.length > 0 && (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Recommendations
                </h4>
              </div>
              <ul className="space-y-1">
                {doc.structured_data.recommendations.map((rec, idx) => (
                  <li key={idx} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {doc.structured_data.summary && (
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Summary
              </h4>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {doc.structured_data.summary}
              </p>
            </div>
          )}
        </div>
      ))}

      <div className={`p-6 rounded-xl border ${
        darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className={`font-semibold mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
              Review Required
            </h3>
            <p className={`mb-4 ${darkMode ? 'text-blue-400/80' : 'text-blue-700'}`}>
              Please carefully review the extracted data above. Type 'PROCEED' below to confirm accuracy and continue to the next step, or provide feedback for adjustments.
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Optional: Provide feedback or corrections..."
              rows={3}
              className={`w-full px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-green-500`}
            />
          </div>
        </div>
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
          <span>Back to Customize</span>
        </button>

        <button
          onClick={handleApprove}
          disabled={feedback.toUpperCase() !== 'PROCEED' && feedback.length > 0 && feedback.toUpperCase().includes('PROCEED') === false}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{feedback.toUpperCase() === 'PROCEED' ? 'Proceed to Processing' : 'Approve & Continue'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
