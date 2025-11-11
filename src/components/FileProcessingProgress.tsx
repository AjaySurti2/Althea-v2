import React from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, Loader, Play, Pause } from 'lucide-react';

interface FileProgress {
  fileId: string;
  fileName: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'parsing' | 'parsed' | 'failed' | 'skipped';
  stage: string;
  progress: number;
  error?: string;
  details?: {
    testCount?: number;
    patient?: string;
    lab?: string;
  };
}

interface FileProcessingProgressProps {
  files: FileProgress[];
  darkMode: boolean;
  onRetry?: (fileId: string) => void;
  onSkip?: (fileId: string) => void;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;
  overallProgress: number;
  estimatedTimeRemaining?: number;
}

export const FileProcessingProgress: React.FC<FileProcessingProgressProps> = ({
  files,
  darkMode,
  onRetry,
  onSkip,
  onPause,
  onResume,
  isPaused = false,
  overallProgress,
  estimatedTimeRemaining,
}) => {
  const getStatusIcon = (status: FileProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />;
      case 'uploading':
      case 'parsing':
        return <Loader className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'} animate-spin`} />;
      case 'uploaded':
      case 'parsed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'skipped':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: FileProgress['status'], stage: string) => {
    if (isPaused && (status === 'pending' || status === 'uploading' || status === 'parsing')) {
      return 'Paused';
    }
    switch (status) {
      case 'pending':
        return 'Waiting...';
      case 'uploading':
        return 'Uploading...';
      case 'uploaded':
        return 'Upload Complete';
      case 'parsing':
        return stage || 'Parsing...';
      case 'parsed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'skipped':
        return 'Skipped';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: FileProgress['status']) => {
    switch (status) {
      case 'parsed':
        return darkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200';
      case 'failed':
        return darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200';
      case 'skipped':
        return darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200';
      case 'uploading':
      case 'parsing':
        return darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200';
      default:
        return darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const successCount = files.filter(f => f.status === 'parsed').length;
  const failedCount = files.filter(f => f.status === 'failed').length;
  const skippedCount = files.filter(f => f.status === 'skipped').length;
  const totalCount = files.length;

  return (
    <div className={`rounded-xl border-2 p-6 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header with Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Processing Medical Reports
          </h3>
          {(onPause || onResume) && (
            <button
              onClick={isPaused ? onResume : onPause}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className={`relative h-4 rounded-full overflow-hidden ${
          darkMode ? 'bg-gray-700' : 'bg-gray-200'
        }`}>
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-4 text-sm">
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
              {successCount}/{totalCount} completed
            </span>
            {failedCount > 0 && (
              <span className="text-red-500">
                {failedCount} failed
              </span>
            )}
            {skippedCount > 0 && (
              <span className="text-yellow-500">
                {skippedCount} skipped
              </span>
            )}
          </div>
          {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              ~{formatTime(estimatedTimeRemaining)} remaining
            </span>
          )}
        </div>
      </div>

      {/* Individual File Progress */}
      <div className="space-y-3">
        {files.map((file, index) => (
          <div
            key={file.fileId}
            className={`p-4 rounded-lg border-2 transition-all ${getStatusColor(file.status)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {/* Status Icon */}
                <div className="mt-0.5">
                  {getStatusIcon(file.status)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-sm font-medium ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      File {index + 1}/{totalCount}:
                    </span>
                    <span className={`text-sm font-semibold truncate ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {file.fileName}
                    </span>
                  </div>

                  {/* Status Text */}
                  <div className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {getStatusText(file.status, file.stage)}
                  </div>

                  {/* Progress Bar for Active Files */}
                  {(file.status === 'uploading' || file.status === 'parsing') && (
                    <div className={`mt-2 h-2 rounded-full overflow-hidden ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Success Details */}
                  {file.status === 'parsed' && file.details && (
                    <div className={`mt-2 text-xs space-y-1 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {file.details.patient && (
                        <div>✓ Patient: {file.details.patient}</div>
                      )}
                      {file.details.lab && (
                        <div>✓ Lab: {file.details.lab}</div>
                      )}
                      {file.details.testCount !== undefined && (
                        <div>✓ {file.details.testCount} tests extracted</div>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {file.status === 'failed' && file.error && (
                    <div className={`mt-2 text-xs ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      Error: {file.error}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {file.status === 'failed' && (
                <div className="flex items-center space-x-2 ml-3">
                  {onRetry && (
                    <button
                      onClick={() => onRetry(file.fileId)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                      }`}
                      title="Retry"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  {onSkip && (
                    <button
                      onClick={() => onSkip(file.fileId)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                      }`}
                      title="Skip"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {overallProgress === 100 && (
        <div className={`mt-6 p-4 rounded-lg ${
          failedCount > 0
            ? darkMode
              ? 'bg-yellow-900/30 border-2 border-yellow-700'
              : 'bg-yellow-50 border-2 border-yellow-200'
            : darkMode
              ? 'bg-green-900/30 border-2 border-green-700'
              : 'bg-green-50 border-2 border-green-200'
        }`}>
          <p className={`text-sm font-semibold ${
            failedCount > 0
              ? darkMode ? 'text-yellow-400' : 'text-yellow-800'
              : darkMode ? 'text-green-400' : 'text-green-800'
          }`}>
            {failedCount > 0
              ? `Processing completed with ${failedCount} error(s). ${successCount} file(s) processed successfully.`
              : `All files processed successfully! ${successCount} medical report(s) ready.`}
          </p>
        </div>
      )}
    </div>
  );
};
