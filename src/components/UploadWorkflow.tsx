import React, { useState } from 'react';
import { Upload, Sliders, Sparkles, Download, CheckCircle, ArrowRight, ArrowLeft, FileText, X, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DocumentReview } from './DocumentReview';
import { DataPreview } from './DataPreview';
import { ParsedDataReview } from './ParsedDataReview';

interface UploadWorkflowProps {
  darkMode: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export const UploadWorkflow: React.FC<UploadWorkflowProps> = ({ darkMode, onComplete, onCancel }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showReview, setShowReview] = useState(false);
  const [showParsedDataReview, setShowParsedDataReview] = useState(false);
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [parsingInProgress, setParsingInProgress] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [tone, setTone] = useState<'friendly' | 'professional' | 'empathetic'>('friendly');
  const [languageLevel, setLanguageLevel] = useState<'simple' | 'moderate' | 'technical'>('simple');
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const MAX_FILES = 5;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const remainingSlots = MAX_FILES - files.length;

      if (selectedFiles.length > remainingSlots) {
        alert(`You can only upload ${MAX_FILES} files per session. ${remainingSlots} slots remaining.`);
        setFiles([...files, ...selectedFiles.slice(0, remainingSlots)]);
      } else {
        setFiles([...files, ...selectedFiles]);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handlePreviewFile = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  };

  const handleDownloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleStep1Next = async () => {
    if (files.length === 0) {
      alert('Please upload at least one file');
      return;
    }

    if (files.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files allowed per session`);
      return;
    }

    await handleUploadFiles();
  };

  const handleUploadFiles = async () => {
    if (!user || files.length === 0) return;

    setProcessing(true);
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
      setSessionId(session.id);

      const uploadedFileIds: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `${user.id}/${session.id}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('medical-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: fileData, error: insertError } = await supabase.from('files')
          .insert({
            session_id: session.id,
            user_id: user.id,
            storage_path: filePath,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
          })
          .select()
          .single();

        if (insertError) {
          console.error('File insert error:', insertError);
          throw insertError;
        }

        if (fileData) {
          uploadedFileIds.push(fileData.id);
        }
      }

      setProcessing(false);
      setParsingInProgress(true);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-documents`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              sessionId: session.id,
              fileIds: uploadedFileIds,
              customization: {
                tone,
                language: languageLevel,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to parse documents');
        }

        setParsingInProgress(false);
        setShowParsedDataReview(true);
      } catch (parseError: any) {
        console.error('Parsing error:', parseError);
        setParsingInProgress(false);
        alert(`Document parsing failed: ${parseError.message}. You can still continue.`);
        setShowReview(true);
      }
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
      setProcessing(false);
      setParsingInProgress(false);
    }
  };

  const handleStep3Process = async () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setCurrentStep(5);
    }, 2000);
  };

  const handleDownloadReport = () => {
    setUploadComplete(true);
  };

  const handleViewDashboard = () => {
    onComplete();
    window.location.hash = '#dashboard';
  };

  const handleStartNew = () => {
    setFiles([]);
    setTone('friendly');
    setLanguageLevel('simple');
    setCurrentStep(1);
    setSessionId(null);
    setUploadComplete(false);
    setShowReview(false);
    setShowParsedDataReview(false);
    setShowDataPreview(false);
    setParsingInProgress(false);
  };

  const handleReviewContinue = () => {
    setShowReview(false);
    setCurrentStep(2);
  };

  const handleParsedDataContinue = () => {
    setShowParsedDataReview(false);
    setCurrentStep(2);
  };

  const handleParsedDataBack = () => {
    setShowParsedDataReview(false);
    setCurrentStep(1);
  };

  const handleReviewBack = () => {
    setShowReview(false);
    setCurrentStep(1);
  };

  const handleCustomizeContinue = () => {
    setShowDataPreview(true);
  };

  const handleDataPreviewBack = () => {
    setShowDataPreview(false);
  };

  const handleDataPreviewApprove = () => {
    setShowDataPreview(false);
    setCurrentStep(4);
  };

  if (showParsedDataReview && sessionId) {
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="min-h-screen px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Upload Health Report
                </h1>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Step 2: Review Parsed Data
                </p>
              </div>
              <button
                onClick={onCancel}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className={`rounded-2xl p-8 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <ParsedDataReview
                sessionId={sessionId}
                darkMode={darkMode}
                onConfirm={handleParsedDataContinue}
                onBack={handleParsedDataBack}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showDataPreview && sessionId) {
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="min-h-screen px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Upload Health Report
                </h1>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Data Preview & Verification
                </p>
              </div>
              <button
                onClick={onCancel}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className={`rounded-2xl p-8 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <DataPreview
                sessionId={sessionId}
                darkMode={darkMode}
                customization={{ tone, language: languageLevel }}
                onBack={handleDataPreviewBack}
                onApprove={handleDataPreviewApprove}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showReview && sessionId) {
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="min-h-screen px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Upload Health Report
                </h1>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Review Documents
                </p>
              </div>
              <button
                onClick={onCancel}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className={`rounded-2xl p-8 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <DocumentReview
                sessionId={sessionId}
                darkMode={darkMode}
                onContinue={handleReviewContinue}
                onBack={handleReviewBack}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = (currentStep / 5) * 100;

  const steps = [
    { number: 1, icon: Upload, label: 'Upload' },
    { number: 2, icon: Sliders, label: 'Customize' },
    { number: 3, icon: Eye, label: 'Preview' },
    { number: 4, icon: Sparkles, label: 'Process' },
    { number: 5, icon: Download, label: 'Download' },
  ];

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Upload Health Report
              </h1>
              <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Step {currentStep} of 5
              </p>
            </div>
            <button
              onClick={onCancel}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
              }`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-8">
            <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="flex justify-between mt-4">
              {steps.map((step) => {
                const StepIcon = step.icon;
                const isCompleted = step.number < currentStep;
                const isCurrent = step.number === currentStep;

                return (
                  <div key={step.number} className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                          : darkMode
                          ? 'bg-gray-800 text-gray-500'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : <StepIcon className="w-6 h-6" />}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        isCurrent || isCompleted
                          ? darkMode
                            ? 'text-white'
                            : 'text-gray-900'
                          : darkMode
                          ? 'text-gray-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`rounded-2xl p-8 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Upload Your Medical Documents
                  </h2>
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Select your lab results, prescriptions, or medical reports. We support PDF, JPG, PNG, and text files.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="file-upload"
                    className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      darkMode
                        ? 'border-gray-700 hover:border-green-500 bg-gray-900/50'
                        : 'border-gray-300 hover:border-green-500 bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className={`w-12 h-12 mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <p className={`mb-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        PDF, JPG, PNG, TXT (MAX. 10MB each)
                      </p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Selected Files ({files.length}/{MAX_FILES})
                    </h3>
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          darkMode
                            ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            darkMode ? 'bg-green-500/20' : 'bg-green-50'
                          }`}>
                            <FileText className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {file.name}
                            </p>
                            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {/* Preview Button */}
                          {(file.type.startsWith('image/') || file.type === 'application/pdf') && (
                            <button
                              onClick={() => handlePreviewFile(file)}
                              className={`p-2 rounded-lg transition-colors ${
                                darkMode
                                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                              }`}
                              title="Preview"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          )}
                          {/* Download Button */}
                          <button
                            onClick={() => handleDownloadFile(file)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode
                                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                            }`}
                            title="Download"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-500/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(processing || parsingInProgress) && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {processing ? 'Uploading files...' : 'Parsing documents with AI...'}
                    </p>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {processing ? 'Please wait while we upload your documents' : 'Extracting health information from your documents'}
                    </p>
                  </div>
                )}

                {!processing && !parsingInProgress && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleStep1Next}
                      disabled={files.length === 0}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <span>Next: Review</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Customize Your Experience
                  </h2>
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Choose how you want your health information explained to you.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Tone Preference
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: 'friendly', label: 'Friendly', description: 'Warm and conversational' },
                        { value: 'professional', label: 'Professional', description: 'Clinical and precise' },
                        { value: 'empathetic', label: 'Empathetic', description: 'Supportive and caring' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setTone(option.value as any)}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            tone === option.value
                              ? 'border-green-500 bg-green-500/10'
                              : darkMode
                              ? 'border-gray-700 hover:border-gray-600'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {option.label}
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {option.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Language Level
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: 'simple', label: 'Simple', description: 'Easy to understand' },
                        { value: 'moderate', label: 'Moderate', description: 'Some medical terms' },
                        { value: 'technical', label: 'Technical', description: 'Medical jargon' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setLanguageLevel(option.value as any)}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            languageLevel === option.value
                              ? 'border-green-500 bg-green-500/10'
                              : darkMode
                              ? 'border-gray-700 hover:border-gray-600'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {option.label}
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {option.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setShowReview(true)}
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
                    onClick={handleCustomizeContinue}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    <span>Next: Preview Data</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Ready to Process
                  </h2>
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Review your selections and start final processing.
                  </p>
                </div>

                <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="space-y-4">
                    <div>
                      <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Files Processed
                      </h3>
                      <p className={darkMode ? 'text-white' : 'text-gray-900'}>
                        {files.length} file{files.length !== 1 ? 's' : ''} analyzed
                      </p>
                    </div>
                    <div>
                      <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Tone
                      </h3>
                      <p className={`capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>{tone}</p>
                    </div>
                    <div>
                      <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Language Level
                      </h3>
                      <p className={`capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>{languageLevel}</p>
                    </div>
                  </div>
                </div>

                {processing && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Generating your report...
                    </p>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      This usually takes less than 5 seconds
                    </p>
                  </div>
                )}

                {!processing && (
                  <div className="flex justify-between">
                    <button
                      onClick={() => setShowDataPreview(true)}
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
                      onClick={handleStep3Process}
                      className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Generate Report</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                  <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Processing Complete!
                  </h2>
                  <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Your health report is ready
                  </p>
                </div>

                <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    What's Next?
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                        Your personalized health report has been generated
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                        Download it as a PDF or view in your dashboard
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                        Track your health trends over time
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleDownloadReport}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download Report (PDF)</span>
                  </button>

                  <button
                    onClick={handleViewDashboard}
                    className={`w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-semibold transition-all ${
                      darkMode
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                  >
                    <span>View in Dashboard</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleStartNew}
                    className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                      darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Upload Another Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
