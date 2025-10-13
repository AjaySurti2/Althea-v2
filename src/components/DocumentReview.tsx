import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Eye, ArrowRight, ArrowLeft, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DocumentReviewProps {
  sessionId: string;
  darkMode: boolean;
  onContinue: () => void;
  onBack: () => void;
}

export const DocumentReview: React.FC<DocumentReviewProps> = ({
  sessionId,
  darkMode,
  onContinue,
  onBack
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<any | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [sessionId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('session_id', sessionId)
        .is('deleted_at', null)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const doc = documents.find(d => d.id === fileId);
      if (!doc) return;

      // Soft delete: set deleted_at timestamp
      const { error } = await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fileId);

      if (error) throw error;

      // Remove from Supabase Storage
      await supabase.storage
        .from('medical-files')
        .remove([doc.storage_path]);

      // Reload documents
      await loadDocuments();
      setDeleteConfirm(null);

    } catch (error: any) {
      alert(`Failed to delete document: ${error.message}`);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-files')
        .createSignedUrl(doc.storage_path, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      alert(`Failed to download: ${error.message}`);
    }
  };

  const handlePreview = async (doc: any) => {
    if (doc.file_type.startsWith('image/') || doc.file_type === 'application/pdf') {
      try {
        const { data, error } = await supabase.storage
          .from('medical-files')
          .createSignedUrl(doc.storage_path, 3600);

        if (error) throw error;

        setPreviewDocument({ ...doc, previewUrl: data.signedUrl });
      } catch (error: any) {
        alert(`Failed to load preview: ${error.message}`);
      }
    } else {
      alert('Preview not available for this file type');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Review Your Documents
        </h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Review, preview, or remove documents before proceeding
        </p>
      </div>

      {/* Document Count Alert */}
      {documents.length === 0 && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${
          darkMode ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'
        }`}>
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className={`font-medium ${darkMode ? 'text-amber-400' : 'text-amber-800'}`}>
              No documents uploaded
            </p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-amber-400/80' : 'text-amber-700'}`}>
              Please go back and upload at least one document to continue.
            </p>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3">
        {documents.map((doc, index) => (
          <div
            key={doc.id}
            className={`p-4 rounded-xl border transition-all ${
              darkMode
                ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                {/* File Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  darkMode ? 'bg-green-500/20' : 'bg-green-50'
                }`}>
                  <FileText className="w-6 h-6 text-green-600" />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold truncate ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {doc.file_name}
                  </h3>

                  <div className={`flex items-center space-x-4 mt-1 text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <span>
                      {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <span>•</span>
                    <span>
                      {doc.file_type.split('/')[1]?.toUpperCase()}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Document Number */}
                  <div className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    Document {index + 1} of {documents.length}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                {/* Preview Button */}
                {(doc.file_type.startsWith('image/') || doc.file_type === 'application/pdf') && (
                  <button
                    onClick={() => handlePreview(doc)}
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
                  onClick={() => handleDownload(doc)}
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
                {deleteConfirm === doc.id ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Confirm
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
                    onClick={() => setDeleteConfirm(doc.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
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
          <span>Back to Upload</span>
        </button>

        <button
          onClick={onContinue}
          disabled={documents.length === 0}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Continue to Customize</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Preview Modal */}
      {previewDocument && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewDocument(null)}
        >
          <div
            className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {previewDocument.file_name}
              </h3>
              <button
                onClick={() => setPreviewDocument(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              {previewDocument.file_type.startsWith('image/') ? (
                <img
                  src={previewDocument.previewUrl}
                  alt={previewDocument.file_name}
                  className="w-full h-auto"
                />
              ) : previewDocument.file_type === 'application/pdf' ? (
                <iframe
                  src={previewDocument.previewUrl}
                  className="w-full h-[60vh]"
                  title={previewDocument.file_name}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
