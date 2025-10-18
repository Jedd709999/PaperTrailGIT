import React, { useState, useCallback } from "react";
import { useAuth } from "../../auth/AuthContext";
import { uploadThesisDocument } from "../../services/api";
import "../../styles/academic-theme.css";

const UploadThesisDoc: React.FC<{ thesisId: number; onUploadSuccess?: () => void }> = ({ 
  thesisId, 
  onUploadSuccess 
}) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Allow all students to upload documents, not just the thesis owner
  if (!user || user.role.toLowerCase() !== "student") return null;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidFileType(droppedFile)) {
        setFile(droppedFile);
      } else {
        alert("Please upload only PDF, DOC, or DOCX files.");
      }
    }
  }, []);

  const isValidFileType = (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    return validTypes.includes(file.type);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFileType(selectedFile)) {
      setFile(selectedFile);
    } else if (selectedFile) {
      alert("Please upload only PDF, DOC, or DOCX files.");
      e.target.value = '';
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a file.");
    if (!docType) return alert("Please select a document type.");

    setUploading(true);
    try {
      await uploadThesisDocument(thesisId, file, docType);
      alert("Document uploaded successfully!");
      setFile(null);
      setDocType("");
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error(err);
      alert("Error uploading document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="card-academic">
      <div className="flex items-center mb-4">
        <div className="p-1.5 bg-academic-light rounded-lg mr-3">
          <svg className="w-4 h-4 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h2 className="subheading-academic text-lg">Upload Thesis Document</h2>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        {/* Document Type Selection */}
        <div>
          <label className="form-label-academic text-xs mb-1">
            Document Type *
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            required
            className="form-select-academic text-sm py-1.5 px-2"
          >
            <option value="">Select Document Type</option>
            <option value="proposal">Thesis Proposal</option>
            <option value="chapter1">Chapter 1 - Introduction</option>
            <option value="chapter2">Chapter 2 - Literature Review</option>
            <option value="chapter3">Chapter 3 - Methodology</option>
            <option value="chapter4">Chapter 4 - Results</option>
            <option value="chapter5">Chapter 5 - Discussion</option>
            <option value="final">Final Manuscript</option>
            <option value="defense">Defense Presentation</option>
          </select>
        </div>

        {/* File Upload Area */}
        <div>
          <label className="form-label-academic text-xs mb-1">
            Document File *
          </label>
          
          {!file ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-academic-primary bg-academic-light' 
                  : 'border-academic-border hover:border-academic-primary'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-academic-light rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-academic-text">
                    Drop your file here, or{' '}
                    <label className="text-academic-primary hover:text-academic-secondary cursor-pointer underline text-sm">
                      browse
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-academic-muted mt-1">
                    Supports PDF, DOC, DOCX files up to 10MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-academic-border rounded-lg p-3 bg-academic-light">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-academic-light rounded-lg">
                    <svg className="w-4 h-4 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-academic-text text-sm">{file.name}</p>
                    <p className="text-xs text-academic-muted">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1.5 text-academic-muted hover:text-academic-text hover:bg-academic-border rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setDocType("");
            }}
            className="btn-academic-secondary py-1.5 px-3 text-sm"
            disabled={uploading}
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={!file || !docType || uploading}
            className="btn-academic py-1.5 px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-academic-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Upload Document</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadThesisDoc;