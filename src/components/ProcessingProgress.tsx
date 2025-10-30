import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader, FileText, Download, Upload, Search, Save } from 'lucide-react';

interface FileProgress {
  fileId: string;
  fileName: string;
  fileType: string;
  status: string;
  progress: number;
  error?: string;
  processingTime?: number;
  attemptNumber?: number;
  isRetryable?: boolean;
}

interface ProcessingProgressProps {
  sessionId: string;
  darkMode: boolean;
  onComplete: () => void;
}

const statusIcons: { [key: string]: any } = {
  pending: Upload,
  downloading: Download,
  extracting: Search,
  parsing: FileText,
  saving: Save,
  completed: CheckCircle,
  failed: AlertCircle,
  timeout: AlertCircle,
};

const statusColors: { [key: string]: string } = {
  pending: 'text-gray-400',
  downloading: 'text-blue-500',
  extracting: 'text-yellow-500',
  parsing: 'text-purple-500',
  saving: 'text-green-500',
  completed: 'text-green-600',
  failed: 'text-red-500',
  timeout: 'text-orange-500',
};

const statusLabels: { [key: string]: string } = {
  pending: 'Waiting...',
  downloading: 'Downloading',
  extracting: 'Extracting text',
  parsing: 'Parsing data',
  saving: 'Saving results',
  completed: 'Completed',
  failed: 'Failed',
  timeout: 'Timeout',
};

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  sessionId,
  darkMode,
  onComplete,
}) => {
  const [progress, setProgress] = useState<any>(null);
  const [polling, setPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const pollProgress = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-processing-progress?sessionId=${sessionId}`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch progress');
        }

        const data = await response.json();
        setProgress(data);

        // Check if processing is complete
        const summary = data.summary;
        if (summary && summary.session_status === 'completed') {
          setPolling(false);
          setTimeout(() => onComplete(), 2000); // Wait 2 seconds before calling onComplete
        } else if (summary && summary.session_status === 'failed' && summary.processing_files === 0) {
          setPolling(false);
        }
      } catch (err: any) {
        console.error('Failed to poll progress:', err);
        setError(err.message);
        setPolling(false);
      }
    };

    // Initial poll
    pollProgress();

    // Set up polling interval (every 2 seconds)
    if (polling) {
      pollInterval = setInterval(pollProgress, 2000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [sessionId, polling, onComplete]);

  if (error) {
    return (
      <div className={`p-6 rounded-xl ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-800'}`}>
              Error Loading Progress
            </h3>
            <p className={`text-sm ${darkMode ? 'text-red-400/70' : 'text-red-700'}`}>
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  const summary = progress.summary;
  const files: FileProgress[] = progress.files || [];

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Processing Your Medical Reports
          </h3>
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {summary.completed_files + summary.failed_files} of {summary.total_files} completed
          </span>
        </div>

        {/* Progress Bar */}
        <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
            style={{ width: `${summary.overall_progress || 0}%` }}
          />
        </div>

        {/* Status Counts */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Completed
            </div>
            <div className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              {summary.completed_files}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Processing
            </div>
            <div className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {summary.processing_files}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Pending
            </div>
            <div className={`text-xl font-bold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {summary.pending_files}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Failed
            </div>
            <div className={`text-xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
              {summary.failed_files}
            </div>
          </div>
        </div>
      </div>

      {/* Individual File Progress */}
      <div>
        <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          File Details
        </h4>
        <div className="space-y-2">
          {files.map((file) => {
            const StatusIcon = statusIcons[file.status] || Loader;
            const isProcessing = ['downloading', 'extracting', 'parsing', 'saving'].includes(file.status);

            return (
              <div
                key={file.fileId}
                className={`p-4 rounded-xl border ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <StatusIcon
                      className={`w-5 h-5 ${statusColors[file.status]} ${
                        isProcessing ? 'animate-spin' : ''
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {file.fileName}
                        </p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          file.fileType === 'application/pdf'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {file.fileType === 'application/pdf' ? 'PDF' : 'IMAGE'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 mt-1">
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {statusLabels[file.status]}
                        </p>
                        {file.processingTime && file.status === 'completed' && (
                          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {(file.processingTime / 1000).toFixed(1)}s
                          </span>
                        )}
                        {file.error && (
                          <span className="text-xs text-red-500">
                            {file.error}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress percentage */}
                  <div className={`text-sm font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {file.progress}%
                  </div>
                </div>

                {/* Progress bar for individual file */}
                {file.status !== 'completed' && file.status !== 'failed' && (
                  <div className={`h-1 rounded-full overflow-hidden mt-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion message */}
      {summary.session_status === 'completed' && (
        <div className={`p-4 rounded-xl ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <h4 className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-800'}`}>
                Processing Complete!
              </h4>
              <p className={`text-sm ${darkMode ? 'text-green-400/70' : 'text-green-700'}`}>
                All files have been processed successfully. Redirecting...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
