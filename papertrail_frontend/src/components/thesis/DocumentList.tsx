import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchThesisDocuments, downloadDocument, deleteThesisDocument } from "../../services/api";
import "../../styles/academic-theme.css";

interface Document {
  id: number;
  doc_type: string;
  version: number;
  uploaded_at: string;
  file: string;
  original_filename: string;
  file_size: number;
  is_latest: boolean;
  uploaded_by?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  comments_count: number;
  file_url?: string;
}

const DocumentList: React.FC<{ 
  thesisId: number,
  onOpenCollaborativeEditor?: (documentId: number) => void 
}> = ({ thesisId, onOpenCollaborativeEditor }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDocs = async () => {
      setLoading(true);
      try {
        // Fetch documents - the backend now handles group-based access control
        console.log("Fetching documents for thesisId:", thesisId);
        const data = await fetchThesisDocuments(thesisId);
        console.log("Fetched documents:", data);
        setDocuments(data);
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDocs();
  }, [thesisId]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocTypeDisplay = (docType: string) => {
    const types: { [key: string]: string } = {
      'proposal': 'Thesis Proposal',
      'chapter1': 'Chapter 1 - Introduction',
      'chapter2': 'Chapter 2 - Literature Review',
      'chapter3': 'Chapter 3 - Methodology',
      'chapter4': 'Chapter 4 - Results',
      'chapter5': 'Chapter 5 - Discussion',
      'final': 'Final Manuscript',
      'defense': 'Defense Presentation',
    };
    return types[docType] || docType;
  };

  const handleDownload = async (docId: number) => {
    try {
      await downloadDocument(docId);
    } catch (err) {
      console.error(err);
      alert('Error downloading document. Please try again.');
    }
  };

  const handleDelete = async (docId: number) => {
    if (window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      try {
        await deleteThesisDocument(docId);
        // Refresh the document list
        const data = await fetchThesisDocuments(thesisId);
        setDocuments(data);
        alert("Document deleted successfully!");
      } catch (err) {
        console.error(err);
        alert("Error deleting document. Please try again.");
      }
    }
  };

  const handleOpenCollaborativeEditor = (docId: number) => {
    if (onOpenCollaborativeEditor) {
      onOpenCollaborativeEditor(docId);
    }
  };

  if (loading) {
    return (
      <div className="card-academic mt-4 p-4">
        <div className="flex items-center justify-center h-24">
          <div className="spinner-academic w-6 h-6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-academic mt-4 p-4">
      <div className="flex items-center mb-4">
        <div className="p-1.5 bg-academic-light rounded-lg mr-3">
          <svg className="w-4 h-4 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="font-bold text-academic-text text-lg">Thesis Documents</h2>
      </div>
      
      {documents.length === 0 ? (
        <div className="text-center py-6 text-academic-muted">
          <svg className="w-12 h-12 mx-auto mb-3 text-academic-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-academic-muted text-sm">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`border rounded-lg p-3 transition-all duration-200 hover:shadow-sm ${doc.is_latest ? 'border-academic-primary bg-academic-light' : 'border-academic-border'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <h3 className="font-medium text-academic-text text-sm">{getDocTypeDisplay(doc.doc_type)}</h3>
                    {doc.is_latest && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-academic-primary bg-opacity-20 text-academic-primary rounded-full">Latest</span>
                    )}
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-academic-border text-academic-text rounded-full">v{doc.version}</span>
                  </div>
                  
                  <div className="text-xs text-academic-muted space-y-1">
                    <p><span className="font-medium text-academic-text">File:</span> {doc.original_filename}</p>
                    <p><span className="font-medium text-academic-text">Size:</span> {formatFileSize(doc.file_size)}</p>
                    <p><span className="font-medium text-academic-text">Uploaded:</span> {new Date(doc.uploaded_at).toLocaleString()}</p>
                    {doc.uploaded_by && (
                      <p>
                        <span className="font-medium text-academic-text">By:</span> 
                        {doc.uploaded_by.first_name || doc.uploaded_by.last_name 
                          ? ` ${doc.uploaded_by.first_name} ${doc.uploaded_by.last_name}` 
                          : ` ${doc.uploaded_by.username}`}
                      </p>
                    )}
                    {doc.comments_count > 0 && (
                      <p><span className="font-medium text-academic-text">Comments:</span> {doc.comments_count}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1 ml-3">
                  {/* Collaborative Editor Button - Only for students and advisers */}
                  {user && (user.role === 'Student' || user.role === 'Adviser') && (
                    <button
                      onClick={() => handleOpenCollaborativeEditor(doc.id)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors border border-blue-600"
                      style={{ minWidth: '60px', minHeight: '24px' }}
                    >
                      Edit Live
                    </button>
                  )}
                  
                  {doc.file_url && (
                    <a
                      href={`http://127.0.0.1:8000${doc.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 text-xs bg-white text-academic-primary rounded hover:bg-academic-border transition-colors border border-academic-border hover:border-academic-text"
                    >
                      Preview
                    </a>
                  )}
                  <button
                    onClick={() => handleDownload(doc.id)}
                    className="px-2 py-1 text-xs bg-white text-academic-primary rounded hover:bg-academic-border transition-colors border border-academic-border hover:border-academic-text"
                  >
                    Download
                  </button>
                  {/* Delete Button - Only for students who own the document */}
                  {user && user.role === 'Student' && doc.uploaded_by?.id === user.id && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors border border-red-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentList;