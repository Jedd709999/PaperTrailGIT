import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchThesisDocuments, createComment, fetchComments, updateComment, resolveComment, uploadThesisDocument, downloadDocument } from "../../services/api";
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

interface Comment {
  id: number;
  text: string;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  comment_type: string;
  page_number?: number;
  is_resolved: boolean;
  parent_comment?: number;
}

const CollaborativeEditor: React.FC<{ 
  thesisId: number; 
  documentId: number;
  onBack: () => void;
  onDocumentSaved?: () => void;
}> = ({ thesisId, documentId, onBack, onDocumentSaved }) => {
  console.log('CollaborativeEditor rendered with:', { thesisId, documentId });
  console.log('ThesisId type:', typeof thesisId, 'DocumentId type:', typeof documentId);
  const { user } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const [content, setContent] = useState<string>("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [commentType, setCommentType] = useState<string>("general");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [documentStatus, setDocumentStatus] = useState<string>("Draft");
  const [documentVersions, setDocumentVersions] = useState<Document[]>([]);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    console.log('CollaborativeEditor mounted or documentId changed:', documentId);
    let isMounted = true;
    
    const loadAllData = async () => {
      if (isMounted) {
        await loadDocument();
        await loadComments();
      }
    };
    
    loadAllData();
    
    return () => {
      isMounted = false;
    };
  }, [documentId]);

  const loadDocument = async () => {
    try {
      console.log('Loading document with thesisId:', thesisId);
      setLoading(true);
      // Prevent multiple simultaneous calls
      const documents = await fetchThesisDocuments(thesisId);
      
      // Filter documents by the same doc_type to get all versions
      const currentDoc = documents.find((d: Document) => d.id === documentId);
      if (currentDoc) {
        // Get all versions of this document type
        const versions = documents.filter((d: Document) => d.doc_type === currentDoc.doc_type);
        
        // Sort by version number descending
        versions.sort((a, b) => b.version - a.version);
        
        console.log('Document versions loaded:', versions);
        
        setDocument(currentDoc);
        setDocumentVersions(versions);
        
        // For demo purposes, we'll use a placeholder content
        // In a real implementation, this would connect to Firebase or another real-time service
        setContent(`# ${currentDoc.original_filename}

This is a collaborative document editor.

Start typing here to edit the document...

## Section 1

Content for section 1...

## Section 2

Content for section 2...`);
      }
    } catch (err) {
      console.error("Error loading document:", err);
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await fetchComments(thesisId, documentId);
      setComments(data);
    } catch (err) {
      console.error("Error loading comments:", err);
    }
  };

  const handleSave = async () => {
    if (!document) return;
    
    setSaving(true);
    try {
      // Create content with proper formatting
      const contentWithHeader = `Thesis Document: ${document.original_filename}\n\n${content}`;
      
      // Determine the correct file extension based on the original filename
      let fileName = document.original_filename;
      let fileType = 'text/plain';
      
      if (fileName.endsWith('.pdf')) {
        fileType = 'application/pdf';
      } else if (fileName.endsWith('.doc')) {
        fileType = 'application/msword';
      } else if (fileName.endsWith('.docx')) {
        fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }
      
      // Create a file with the original filename and proper MIME type
      const blob = new Blob([contentWithHeader], { type: fileType });
      const file = new File([blob], fileName, { type: fileType });
      
      // Validate that we have all required parameters
      if (!thesisId) {
        throw new Error('Thesis ID is missing');
      }
      
      if (!document.doc_type) {
        throw new Error('Document type is missing');
      }
      
      // Upload as a new version of the document
      await uploadThesisDocument(thesisId, file, document.doc_type);
      
      // Refresh document list to show new version
      // Add a small delay to ensure backend has processed the new version
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Reload the document to update the version history
      await loadDocument();
      
      // Notify parent component that document was saved
      if (onDocumentSaved) {
        onDocumentSaved();
      }
      
      alert("Document saved successfully as a new version!");
    } catch (err: any) {
      console.error("Error saving document:", err);
      // More detailed error message
      let errorMessage = "Failed to save document";
      if (err.response?.data) {
        // Try to get a more detailed error message
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (Object.keys(err.response.data).length > 0) {
          // If it's an object with validation errors, show the first one
          const firstKey = Object.keys(err.response.data)[0];
          errorMessage = `${firstKey}: ${err.response.data[firstKey]}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(`Failed to save document: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const commentData = {
        thesis: thesisId,
        thesis_document: documentId,
        text: newComment,
        comment_type: commentType,
      };
      
      await createComment(commentData);
      setNewComment("");
      loadComments(); // Refresh comments
    } catch (err) {
      console.error("Error adding comment:", err);
      setError("Failed to add comment");
    }
  };

  const handleResolveComment = async (commentId: number) => {
    try {
      await resolveComment(commentId);
      loadComments(); // Refresh comments
    } catch (err) {
      console.error("Error resolving comment:", err);
      setError("Failed to resolve comment");
    }
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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleMarkForReview = async () => {
    if (window.confirm("Are you sure you want to mark this document for review by your adviser?")) {
      try {
        // In a real implementation, this would call the backend API
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
        setDocumentStatus("For Review");
        alert("Document marked for review! Your adviser has been notified.");
      } catch (err) {
        console.error("Error marking document for review:", err);
        setError("Failed to mark document for review");
      }
    }
  };

  const handleApproveDocument = async () => {
    if (window.confirm("Are you sure you want to approve this document?")) {
      try {
        // In a real implementation, this would call the backend API
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
        setDocumentStatus("Approved");
        alert("Document approved successfully!");
      } catch (err) {
        console.error("Error approving document:", err);
        setError("Failed to approve document");
      }
    }
  };

  const handleRequestRevisions = async () => {
    const reason = prompt("Please provide a brief reason for requesting revisions:");
    if (reason) {
      try {
        // In a real implementation, this would call the backend API
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
        setDocumentStatus("For Revision");
        alert("Revision request sent to student!");
      } catch (err) {
        console.error("Error requesting revisions:", err);
        setError("Failed to request revisions");
      }
    }
  };

  const handleDownload = async (documentId: number) => {
    try {
      await downloadDocument(documentId);
    } catch (err) {
      console.error("Error downloading document:", err);
      setError("Failed to download document");
    }
  };

  if (loading) {
    return (
      <div className="container-academic py-4" style={{ zIndex: 20 }}>
        <div className="flex items-center justify-center h-64">
          <div className="spinner-academic w-8 h-8"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-academic py-4" style={{ zIndex: 20 }}>
        <div className="card-academic p-4">
          <div className="text-academic-danger text-center">{error}</div>
          <div className="mt-4 text-center">
            <button 
              onClick={onBack}
              className="btn-academic py-2 px-4"
            >
              Back to Documents
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-academic py-4" style={{ zIndex: 20 }}>
      {/* Header */}
      <div className="dashboard-header-academic sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <button 
              onClick={onBack}
              className="flex items-center text-academic-primary hover:text-academic-secondary mb-2"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Documents
            </button>
            <h1 className="text-2xl font-bold text-academic-text">
              {document ? getDocTypeDisplay(document.doc_type) : "Collaborative Editor"}
            </h1>
            {document && (
              <p className="text-academic-muted text-sm">
                Version {document.version} • Last saved {new Date(document.uploaded_at).toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-academic py-2 px-4 flex items-center"
            >
              {saving ? (
                <>
                  <div className="spinner-academic w-4 h-4 mr-2"></div>
                  Saving as New Version...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save as New Version
                </>
              )}
            </button>
            
            {/* Action buttons based on user role */}
            {user?.role === "Student" && (
              <button
                onClick={handleMarkForReview}
                className="btn-academic py-2 px-4 flex items-center bg-academic-warning hover:bg-yellow-600"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mark for Review
              </button>
            )}
            
            {user?.role === "Adviser" && (
              <>
                <button
                  onClick={handleApproveDocument}
                  className="btn-academic py-2 px-4 flex items-center bg-academic-success hover:bg-green-600"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Approve
                </button>
                <button
                  onClick={handleRequestRevisions}
                  className="btn-academic py-2 px-4 flex items-center bg-academic-danger hover:bg-red-600"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Request Revisions
                </button>
              </>
            )}
            
            <button 
              onClick={() => document && handleDownload(document.id)}
              className="btn-academic-secondary py-2 px-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Download
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Editor */}
          <div className="lg:col-span-3">
            <div className="card-academic">
              <div className="card-academic-header p-3 mb-3 flex items-center justify-between">
                <h2 className="card-academic-title text-lg">Document Editor</h2>
                <p className="text-xs text-academic-muted mt-1">Editing content will be saved as a new version when you click Save. In production, this will connect to Firebase for real-time collaboration.</p>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  documentStatus === "Draft" ? "bg-academic-warning bg-opacity-20 text-academic-warning" :
                  documentStatus === "For Review" ? "bg-academic-primary bg-opacity-20 text-academic-primary" :
                  documentStatus === "For Revision" ? "bg-academic-danger bg-opacity-20 text-academic-danger" :
                  documentStatus === "Approved" ? "bg-academic-success bg-opacity-20 text-academic-success" :
                  "bg-academic-border bg-opacity-20 text-academic-text"
                }`}>
                  {documentStatus}
                </span>
              </div>
              <div className="card-academic-body px-3 pb-3">
                <textarea
                  ref={editorRef}
                  value={content}
                  onChange={handleContentChange}
                  className="w-full h-96 p-4 border border-academic-border rounded-lg focus:ring-2 focus:ring-academic-primary focus:border-academic-primary"
                  placeholder="Start typing your document here..."
                />
              </div>
            </div>
          </div>

          {/* Sidebar - Comments and Status */}
          <div className="space-y-4">
            {/* Document Status */}
            <div className="card-academic">
              <div className="card-academic-header p-3 mb-3">
                <h2 className="card-academic-title text-lg">Document Status</h2>
              </div>
              <div className="card-academic-body px-3 pb-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-academic-text">Status</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      documentStatus === "Draft" ? "bg-academic-warning bg-opacity-20 text-academic-warning" :
                      documentStatus === "For Review" ? "bg-academic-primary bg-opacity-20 text-academic-primary" :
                      documentStatus === "For Revision" ? "bg-academic-danger bg-opacity-20 text-academic-danger" :
                      documentStatus === "Approved" ? "bg-academic-success bg-opacity-20 text-academic-success" :
                      "bg-academic-border bg-opacity-20 text-academic-text"
                    }`}>
                      {documentStatus}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-academic-text">Collaborators</span>
                    <span className="text-sm text-academic-muted">2</span>
                  </div>
                  
                  <div className="pt-2 border-t border-academic-border">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-academic-primary flex items-center justify-center text-white text-xs">
                        S
                      </div>
                      <span className="text-xs text-academic-text">Student (You)</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="w-6 h-6 rounded-full bg-academic-secondary flex items-center justify-center text-white text-xs">
                        A
                      </div>
                      <span className="text-xs text-academic-text">Adviser</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div className="card-academic">
              <div className="card-academic-header p-3 mb-3">
                <h2 className="card-academic-title text-lg">Comments ({comments.length})</h2>
              </div>
              <div className="card-academic-body px-3 pb-3">
                {/* Add Comment Form */}
                <div className="mb-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-2 text-sm border border-academic-border rounded-lg mb-2"
                    rows={3}
                  />
                  <div className="flex justify-between items-center">
                    <select
                      value={commentType}
                      onChange={(e) => setCommentType(e.target.value)}
                      className="text-sm border border-academic-border rounded px-2 py-1"
                    >
                      <option value="general">General Comment</option>
                      <option value="suggestion">Suggestion</option>
                      <option value="correction">Correction Required</option>
                      <option value="question">Question</option>
                    </select>
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="btn-academic py-1 px-3 text-sm"
                    >
                      Add Comment
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {comments.length === 0 ? (
                    <div className="text-center py-4 text-academic-muted">
                      <p className="text-sm">No comments yet</p>
                      <p className="text-xs mt-1">Be the first to add a comment</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="border-b border-academic-border pb-3 last:border-0 last:pb-0">
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 rounded-full bg-academic-light flex items-center justify-center text-xs text-academic-text mt-1">
                            {comment.user.first_name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-academic-text">
                                {comment.user.first_name} {comment.user.last_name}
                              </span>
                              <span className="text-xs text-academic-muted">
                                {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-academic-text mt-1">{comment.text}</p>
                            <div className="flex items-center mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                comment.comment_type === 'suggestion' ? 'bg-academic-info bg-opacity-20 text-academic-info' :
                                comment.comment_type === 'correction' ? 'bg-academic-danger bg-opacity-20 text-academic-danger' :
                                comment.comment_type === 'question' ? 'bg-academic-warning bg-opacity-20 text-academic-warning' :
                                'bg-academic-border bg-opacity-20 text-academic-text'
                              }`}>
                                {comment.comment_type}
                              </span>
                              {!comment.is_resolved && (
                                <button 
                                  onClick={() => handleResolveComment(comment.id)}
                                  className="ml-2 text-xs text-academic-primary hover:text-academic-secondary"
                                >
                                  Mark as Resolved
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Version History */}
            <div className="card-academic">
              <div className="card-academic-header p-3 mb-3">
                <h2 className="card-academic-title text-lg">Version History</h2>
              </div>
              <div className="card-academic-body px-3 pb-3">
                <div className="space-y-2">
                  {documentVersions.length > 0 ? (
                    documentVersions.map((version) => (
                      <div 
                        key={version.id} 
                        className={`flex items-center justify-between p-2 rounded cursor-pointer ${version.id === documentId ? 'bg-academic-light' : 'hover:bg-academic-light'}`}
                      >
                        <div>
                          <div className="text-sm font-medium text-academic-text">Version {version.version}</div>
                          <div className="text-xs text-academic-muted">
                            {new Date(version.uploaded_at).toLocaleDateString()} {new Date(version.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {version.id === documentId ? (
                          <span className="px-2 py-1 text-xs bg-academic-success bg-opacity-20 text-academic-success rounded-full">
                            Current
                          </span>
                        ) : (
                          <button 
                            onClick={() => {
                              // In a real implementation, this would load the selected version
                              alert('In production, this would load version ' + version.version);
                            }}
                            className="text-xs text-academic-primary hover:text-academic-secondary"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-academic-muted">
                      <p className="text-sm">No version history available</p>
                    </div>
                  )}
                </div>
                {/* Debug info */}
                <div className="text-xs text-academic-muted mt-2">
                  Debug: {documentVersions.length} versions loaded
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollaborativeEditor;