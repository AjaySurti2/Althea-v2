import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle, User, Calendar, Activity, FileText, Stethoscope, Edit2, Save, X as XIcon } from 'lucide-react';
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
    profile_name?: string;
    report_date?: string;
    lab_name?: string;
    doctor_name?: string;
    key_metrics?: Array<{
      test_name: string;
      value: string;
      unit?: string;
      reference_range?: string;
      interpretation?: string;
    }>;
    summary?: string;
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
  };
  confidence_scores: any;
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
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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
    const normalized = status.toLowerCase();
    if (normalized.includes('normal')) return 'text-green-600';
    if (normalized.includes('high') || normalized.includes('elevated')) return 'text-red-600';
    if (normalized.includes('low')) return 'text-amber-600';
    if (normalized.includes('borderline')) return 'text-orange-600';
    return darkMode ? 'text-gray-400' : 'text-gray-600';
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

  const handleEdit = (doc: ParsedDocument) => {
    setEditingDoc(doc.id);
    setEditedData(JSON.parse(JSON.stringify(doc.structured_data)));
  };

  const handleCancelEdit = () => {
    setEditingDoc(null);
    setEditedData(null);
  };

  const handleSave = async (docId: string) => {
    try {
      setSaving(true);
      const { error: updateError } = await supabase
        .from('parsed_documents')
        .update({ structured_data: editedData })
        .eq('id', docId);

      if (updateError) throw updateError;

      setParsedDocuments(docs =>
        docs.map(doc =>
          doc.id === docId ? { ...doc, structured_data: editedData } : doc
        )
      );

      setEditingDoc(null);
      setEditedData(null);
    } catch (err: any) {
      console.error('Error saving changes:', err);
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setEditedData((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateMetric = (index: number, field: string, value: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      key_metrics: prev.key_metrics.map((m: any, i: number) =>
        i === index ? { ...m, [field]: value } : m
      )
    }));
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
              <div className="flex items-center space-x-3">
                {doc.parsing_status === 'completed' && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Parsed</span>
                  </div>
                )}
                {editingDoc === doc.id ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSave(doc.id)}
                      disabled={saving}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className={`p-1.5 rounded-lg transition-colors ${
                        darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(doc)}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(doc.structured_data.profile_name || doc.structured_data.patient_info) && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Profile Name
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {(doc.structured_data.profile_name || editingDoc === doc.id) && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Patient:</span>
                        {editingDoc === doc.id ? (
                          <input
                            type="text"
                            value={editedData.profile_name || ''}
                            onChange={(e) => updateField('profile_name', e.target.value)}
                            className={`w-full mt-1 px-2 py-1 text-sm rounded border ${
                              darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                        ) : (
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {doc.structured_data.profile_name}
                          </p>
                        )}
                      </div>
                    )}
                    {doc.structured_data.patient_info?.name && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Name:</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {doc.structured_data.patient_info.name}
                        </p>
                      </div>
                    )}
                    {doc.structured_data.patient_info?.age && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Age:</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {doc.structured_data.patient_info.age}
                        </p>
                      </div>
                    )}
                    {doc.structured_data.patient_info?.gender && (
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

              {(doc.structured_data.report_date || doc.structured_data.dates) && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Report Date
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {(doc.structured_data.report_date || editingDoc === doc.id) && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Report Date:</span>
                        {editingDoc === doc.id ? (
                          <input
                            type="text"
                            value={editedData.report_date || ''}
                            onChange={(e) => updateField('report_date', e.target.value)}
                            className={`w-full mt-1 px-2 py-1 text-sm rounded border ${
                              darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                        ) : (
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {doc.structured_data.report_date}
                          </p>
                        )}
                      </div>
                    )}
                    {doc.structured_data.dates?.report_date && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Report Date:</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatDate(doc.structured_data.dates.report_date)}
                        </p>
                      </div>
                    )}
                    {doc.structured_data.dates?.test_date && (
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

              {(doc.structured_data.lab_name || doc.structured_data.doctor_name || doc.structured_data.doctor_info) && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Stethoscope className="w-5 h-5 text-teal-600" />
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Lab / Doctor Name
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {(doc.structured_data.lab_name || editingDoc === doc.id) && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Lab:</span>
                        {editingDoc === doc.id ? (
                          <input
                            type="text"
                            value={editedData.lab_name || ''}
                            onChange={(e) => updateField('lab_name', e.target.value)}
                            className={`w-full mt-1 px-2 py-1 text-sm rounded border ${
                              darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                        ) : (
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {doc.structured_data.lab_name}
                          </p>
                        )}
                      </div>
                    )}
                    {(doc.structured_data.doctor_name || editingDoc === doc.id) && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Doctor:</span>
                        {editingDoc === doc.id ? (
                          <input
                            type="text"
                            value={editedData.doctor_name || ''}
                            onChange={(e) => updateField('doctor_name', e.target.value)}
                            className={`w-full mt-1 px-2 py-1 text-sm rounded border ${
                              darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                        ) : (
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {doc.structured_data.doctor_name}
                          </p>
                        )}
                      </div>
                    )}
                    {doc.structured_data.doctor_info?.name && (
                      <div>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Name:</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {doc.structured_data.doctor_info.name}
                        </p>
                      </div>
                    )}
                    {doc.structured_data.doctor_info?.specialty && (
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

              {((doc.structured_data.key_metrics && doc.structured_data.key_metrics.length > 0) || (doc.structured_data.test_results && doc.structured_data.test_results.length > 0)) && (
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
                        {((editingDoc === doc.id ? editedData.key_metrics : doc.structured_data.key_metrics) || doc.structured_data.test_results || []).map((test: any, idx: number) => (
                          <tr key={idx} className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                            <td className={`py-2 px-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {editingDoc === doc.id ? (
                                <input
                                  type="text"
                                  value={test.test_name || ''}
                                  onChange={(e) => updateMetric(idx, 'test_name', e.target.value)}
                                  className={`w-full px-2 py-1 text-sm rounded border ${
                                    darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                  }`}
                                />
                              ) : test.test_name}
                            </td>
                            <td className={`py-2 px-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {editingDoc === doc.id ? (
                                <div className="flex space-x-1">
                                  <input
                                    type="text"
                                    value={test.value || ''}
                                    onChange={(e) => updateMetric(idx, 'value', e.target.value)}
                                    className={`w-16 px-2 py-1 text-sm rounded border ${
                                      darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                  />
                                  <input
                                    type="text"
                                    value={test.unit || ''}
                                    onChange={(e) => updateMetric(idx, 'unit', e.target.value)}
                                    placeholder="unit"
                                    className={`w-16 px-2 py-1 text-sm rounded border ${
                                      darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                  />
                                </div>
                              ) : `${test.value} ${test.unit || ''}`}
                            </td>
                            <td className={`py-2 px-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {editingDoc === doc.id ? (
                                <input
                                  type="text"
                                  value={test.reference_range || ''}
                                  onChange={(e) => updateMetric(idx, 'reference_range', e.target.value)}
                                  className={`w-full px-2 py-1 text-sm rounded border ${
                                    darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                  }`}
                                />
                              ) : (test.reference_range || 'N/A')}
                            </td>
                            <td className={`py-2 px-2`}>
                              {editingDoc === doc.id ? (
                                <input
                                  type="text"
                                  value={test.interpretation || test.status || ''}
                                  onChange={(e) => updateMetric(idx, 'interpretation', e.target.value)}
                                  className={`w-full px-2 py-1 text-sm rounded border ${
                                    darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                                  }`}
                                />
                              ) : (
                                <span className={`text-xs font-semibold uppercase ${getStatusColor(test.interpretation || test.status)}`}>
                                  {test.interpretation || test.status || 'N/A'}
                                </span>
                              )}
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
          <strong>Note:</strong> Please verify the extracted information is correct. Click the "Edit" button to modify any field, then save your changes.
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
