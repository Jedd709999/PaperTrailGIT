import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { fetchStudentGroups, fetchThesisTopics, fetchThesisDocuments } from "../../services/api";
import "../../styles/academic-theme.css";

interface StudentGroup {
  id: number;
  name: string;
  students: any[];
  adviser: any;
  thesis_title?: string;
  created_at: string;
}

interface ThesisTopic {
  id: number;
  title: string;
  description: string;
  status: string;
  submitted_at: string;
  student: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    student_id?: string;
  };
  adviser?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  group?: {
    id: number;
    name: string;
  };
}

interface ThesisDocument {
  id: number;
  doc_type: string;
  version: number;
  uploaded_at: string;
  original_filename: string;
  file_size: number;
  is_latest: boolean;
  thesis: {
    id: number;
    title: string;
    student: {
      id: number;
      username: string;
      first_name: string;
      last_name: string;
    };
    group?: {
      id: number;
      name: string;
      students: {
        id: number;
        username: string;
        first_name: string;
        last_name: string;
      }[];
    };
  };
  comments_count: number;
  uploaded_by?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
}

const AdviserThesisView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [theses, setTheses] = useState<ThesisTopic[]>([]);
  const [documents, setDocuments] = useState<ThesisDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAdviserData();
  }, []);

  const loadAdviserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load groups and theses in parallel
      const [groupsData, thesesData] = await Promise.all([
        fetchStudentGroups(),
        fetchThesisTopics()
      ]);
      
      // Filter groups where this user is the adviser
      const adviserGroups = groupsData.filter((group: StudentGroup) => 
        group.adviser && group.adviser.id === user?.id
      );
      
      setGroups(adviserGroups);
      
      // Filter theses for this adviser's students
      // Since we've fixed the backend to automatically set the adviser field,
      // we can simply filter by the adviser field
      const adviserTheses = thesesData.filter((thesis: ThesisTopic) => {
        const isAdviserThesis = thesis.adviser && thesis.adviser.id === user?.id;
        console.log(`Thesis ${thesis.id} (${thesis.title}): adviser=${thesis.adviser?.id}, user=${user?.id}, isAdviserThesis=${isAdviserThesis}`);
        return isAdviserThesis;
      });
      
      setTheses(adviserTheses);
      
      // First try to fetch all documents, then fallback to individual thesis fetching
      let adviserDocuments: ThesisDocument[] = [];
      try {
        // Try fetching all documents first
        const allDocuments = await fetchThesisDocuments();
        console.log('All documents fetched:', allDocuments.length);
        
        // Filter documents to only include those from adviser's theses
        if (adviserTheses.length > 0) {
          const thesisIds = new Set(adviserTheses.map(thesis => thesis.id));
          adviserDocuments = allDocuments.filter((doc: ThesisDocument) => 
            doc.thesis && thesisIds.has(doc.thesis.id)
          );
        }
      } catch (err) {
        console.error('Failed to fetch all documents, trying individual thesis fetching:', err);
        // Fallback: Fetch documents for each thesis individually
        if (adviserTheses.length > 0) {
          const thesisIds = adviserTheses.map(thesis => thesis.id);
          console.log('Fetching documents for thesis IDs:', thesisIds);
          
          // Fetch documents for each thesis
          for (const thesisId of thesisIds) {
            try {
              const thesisDocuments = await fetchThesisDocuments(thesisId);
              adviserDocuments = [...adviserDocuments, ...thesisDocuments];
            } catch (err) {
              console.error(`Failed to fetch documents for thesis ${thesisId}:`, err);
              // Continue with other theses even if one fails
            }
          }
        }
      }
      
      // Debug information
      console.log('Adviser theses:', adviserTheses);
      console.log('Adviser documents:', adviserDocuments);
      
      setDocuments(adviserDocuments);
      
    } catch (err: any) {
      console.error('Failed to load adviser data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleOpenCollaborativeEditor = (documentId: number, thesisId: number) => {
    // Navigate to the collaborative editor with the document ID and thesis ID
    navigate(`/thesis?documentId=${documentId}&thesisId=${thesisId}`);
  };

  // Filter documents based on selected group, thesis, and search term
  const filteredDocuments = documents.filter(doc => {
    // If a group is selected, only show documents from that group
    if (selectedGroupId) {
      // Check if the document's thesis belongs to the selected group
      if (!doc.thesis?.group || doc.thesis.group.id !== selectedGroupId) {
        return false;
      }
    }
    
    // Filter by search term - search in multiple fields
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        (doc.thesis?.title && doc.thesis.title.toLowerCase().includes(term)) ||
        (doc.thesis?.student?.first_name && doc.thesis.student.first_name.toLowerCase().includes(term)) ||
        (doc.thesis?.student?.last_name && doc.thesis.student.last_name.toLowerCase().includes(term)) ||
        (doc.doc_type && doc.doc_type.toLowerCase().includes(term)) ||
        (doc.original_filename && doc.original_filename.toLowerCase().includes(term)) ||
        (getDocTypeDisplay(doc.doc_type).toLowerCase().includes(term));
      
      if (!matchesSearch) {
        return false;
      }
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-academic-light py-4">
        <div className="container-academic">
          <div className="flex items-center justify-center h-64">
            <div className="spinner-academic w-8 h-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-academic-light py-4">
        <div className="container-academic">
          <div className="card-academic p-4">
            <div className="text-academic-danger text-center">{error}</div>
            <div className="mt-4 text-center">
              <button 
                onClick={() => loadAdviserData()}
                className="btn-academic py-2 px-4"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-academic-light py-4">
      <div className="container-academic">
        {/* Header */}
        <div className="dashboard-header-academic rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1 text-academic-text">Thesis Management</h1>
              <p className="text-sm text-academic-muted">
                Review and collaborate on thesis documents from your assigned groups.
              </p>
            </div>
            <button 
              onClick={() => navigate(-1)}
              className="btn-academic py-2 px-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Filters - Now above the documents */}
          <div className="card-academic">
            <div className="card-academic-header p-3 mb-3 rounded-t-md" style={{ margin: '0 0 1rem 0' }}>
              <div className="flex items-center justify-between">
                <h2 className="card-academic-title text-lg font-semibold">Search & Filter</h2>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-academic-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-academic-muted mt-1">Filter documents by group, thesis, or search terms</p>
            </div>
            <div className="card-academic-body px-3 pb-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Search Input */}
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Search documents, theses, students..."
                    className="w-full p-2 border border-academic-border rounded-lg text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <svg className="w-4 h-4 absolute right-2 top-2.5 text-academic-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Group Filter Dropdown - Simplified */}
                <div className="relative">
                  <select
                    value={selectedGroupId || ''}
                    onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full p-2 border border-academic-border rounded-lg text-sm bg-white"
                  >
                    <option value="">All Groups</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Clear Filters Button */}
              {(selectedGroupId || searchTerm) && (
                <div className="mt-3 pt-3 border-t border-academic-border">
                  <button
                    className="px-3 py-1 text-sm text-academic-primary hover:bg-academic-border rounded-lg"
                    onClick={() => {
                      setSelectedGroupId(null);
                      setSearchTerm('');
                    }}
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Documents */}
          <div className="card-academic">
            <div className="card-academic-header p-3 mb-3 rounded-t-md" style={{ margin: '0 0 1rem 0' }}>
              <div className="flex items-center justify-between">
                <h2 className="card-academic-title text-lg font-semibold">Thesis Documents</h2>
                <span className="text-sm text-academic-muted bg-academic-light px-2 py-1 rounded-full">
                  {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-academic-muted mt-1">Review and collaborate on thesis documents from your assigned groups</p>
            </div>
            <div className="card-academic-body px-3 pb-3">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto text-academic-border mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-academic-muted">No documents found</p>
                  <p className="text-sm text-academic-muted mt-1">
                    {selectedGroupId 
                      ? "Try selecting a different filter" 
                      : documents.length === 0 
                        ? "No documents have been uploaded yet" 
                        : "No documents match the current filters"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDocuments.map(doc => (
                    <div key={doc.id} className="border border-academic-border rounded-lg p-4 hover:shadow-academic-shadow transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="font-medium text-academic-text text-lg">{getDocTypeDisplay(doc.doc_type)}</h3>
                            {doc.is_latest && (
                              <span className="ml-2 px-2 py-1 text-xs bg-academic-success bg-opacity-20 text-academic-success rounded-full">
                                Latest
                              </span>
                            )}
                            <span className="ml-2 px-2 py-1 text-xs bg-academic-border text-academic-text rounded-full">
                              v{doc.version}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-academic-muted">
                                <span className="font-medium text-academic-text">Thesis:</span> {doc.thesis?.title}
                              </p>
                              {doc.thesis?.group && (
                                <>
                                  <p className="text-academic-muted mt-1">
                                    <span className="font-medium text-academic-text">Group:</span> {doc.thesis.group.name}
                                  </p>
                                  <p className="text-academic-muted mt-1">
                                    <span className="font-medium text-academic-text">Students:</span> 
                                    {doc.thesis.group.students && doc.thesis.group.students.length > 0 ? (
                                      <span className="ml-1">
                                        {doc.thesis.group.students.map((student, index) => (
                                          <span key={student.id}>
                                            {student.first_name} {student.last_name}
                                            {index < doc.thesis.group.students.length - 1 ? ', ' : ''}
                                          </span>
                                        ))}
                                      </span>
                                    ) : (
                                      <span className="ml-1">No students assigned</span>
                                    )}
                                  </p>
                                </>
                              )}
                            </div>
                            <div>
                              <p className="text-academic-muted">
                                <span className="font-medium text-academic-text">File:</span> {doc.original_filename}
                              </p>
                              <p className="text-academic-muted mt-1">
                                <span className="font-medium text-academic-text">Size:</span> {formatFileSize(doc.file_size)}
                              </p>
                              {doc.uploaded_by && (
                                <p className="text-academic-muted mt-1">
                                  <span className="font-medium text-academic-text">Uploaded by:</span> 
                                  {doc.uploaded_by.first_name || doc.uploaded_by.last_name 
                                    ? ` ${doc.uploaded_by.first_name} ${doc.uploaded_by.last_name}` 
                                    : ` ${doc.uploaded_by.username}`}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center mt-3 text-xs text-academic-muted">
                            <span>
                              Uploaded on {new Date(doc.uploaded_at).toLocaleString()}
                            </span>
                            {doc.comments_count > 0 && (
                              <span className="ml-3">
                                {doc.comments_count} comment{doc.comments_count !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2 ml-4">
                          <button
                            onClick={() => handleOpenCollaborativeEditor(doc.id, doc.thesis.id)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors border border-blue-600 w-full"
                          >
                            Review & Collaborate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdviserThesisView;