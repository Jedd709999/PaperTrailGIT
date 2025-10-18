import { useState, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { fetchThesisTopics, fetchEvaluations, createEvaluation, fetchStudentGroups } from "../../services/api";
import "../../styles/academic-theme.css";

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface StudentGroup {
  id: number;
  name: string;
  students: User[];
  adviser?: User;
  panel_members: User[];
}

interface ThesisTopic {
  id: number;
  title: string;
  description: string;
  status: string;
  student: User;
  adviser?: User;
  group?: StudentGroup;
  submitted_at: string;
}

interface Evaluation {
  id: number;
  thesis: ThesisTopic;
  criteria: string;
  score: number;
  comments: string;
  submitted_at: string;
  is_final: boolean;
}

interface ThesisReview {
  thesis: ThesisTopic;
  evaluations: Evaluation[];
  averageScore?: number;
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ThesisReview[]>([]);
  const [theses, setTheses] = useState<ThesisTopic[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedThesis, setSelectedThesis] = useState<ThesisTopic | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');
  
  // Evaluation form state
  const [evaluationForm, setEvaluationForm] = useState({
    criteria: 'overall',
    score: 0,
    comments: '',
    is_final: false
  });

  const criteriaOptions = [
    { value: 'content', label: 'Content Quality', description: 'Depth, accuracy, and relevance of content' },
    { value: 'methodology', label: 'Methodology', description: 'Research approach and methods used' },
    { value: 'analysis', label: 'Analysis & Results', description: 'Data analysis and interpretation of results' },
    { value: 'presentation', label: 'Presentation', description: 'Clarity and organization of presentation' },
    { value: 'originality', label: 'Originality', description: 'Innovation and contribution to the field' },
    { value: 'overall', label: 'Overall Assessment', description: 'General evaluation of the thesis' }
  ];

  useEffect(() => {
    loadReviewsData();
  }, []);

  const loadReviewsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all data in parallel
      const [thesesData, evaluationsData] = await Promise.all([
        fetchThesisTopics(),
        fetchEvaluations()
      ]);
      
      setTheses(thesesData);
      setEvaluations(evaluationsData);
      
      // Process reviews
      const processedReviews = thesesData.map(thesis => {
        const thesisEvaluations = evaluationsData.filter(evaluation => evaluation.thesis.id === thesis.id);
        const averageScore = thesisEvaluations.length > 0 
          ? thesisEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / thesisEvaluations.length 
          : undefined;
        
        return {
          thesis,
          evaluations: thesisEvaluations,
          averageScore
        };
      });
      
      setReviews(processedReviews);
      
    } catch (err: any) {
      console.error('Failed to load reviews data:', err);
      const message = err?.response?.data?.detail || err?.message || 'Failed to load reviews data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const submitEvaluation = async (thesisId: number) => {
    try {
      await createEvaluation({
        thesis: thesisId,
        criteria: evaluationForm.criteria,
        score: evaluationForm.score,
        comments: evaluationForm.comments,
        is_final: evaluationForm.is_final
      });
      
      // Reset form and reload data
      setEvaluationForm({
        criteria: 'overall',
        score: 0,
        comments: '',
        is_final: false
      });
      
      await loadReviewsData();
      alert('Evaluation submitted successfully!');
      
    } catch (err: any) {
      console.error('Failed to submit evaluation:', err);
      const message = err?.response?.data?.detail || err?.message || 'Failed to submit evaluation';
      alert(message);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'defense ready': return 'bg-academic-warning bg-opacity-20 text-academic-warning';
      case 'defense scheduled': return 'bg-academic-primary bg-opacity-20 text-academic-primary';
      case 'defense completed': return 'bg-academic-success bg-opacity-20 text-academic-success';
      case 'approved': return 'bg-academic-success bg-opacity-20 text-academic-success';
      case 'final review': return 'bg-academic-accent bg-opacity-20 text-academic-accent';
      case 'proposal approved': return 'bg-academic-secondary bg-opacity-20 text-academic-secondary';
      default: return 'bg-academic-border bg-opacity-20 text-academic-text';
    }
  };

  const getScoreClass = (score: number) => {
    if (score >= 90) return 'text-academic-success';
    if (score >= 80) return 'text-academic-primary';
    if (score >= 70) return 'text-academic-warning';
    if (score >= 60) return 'text-academic-accent';
    return 'text-academic-danger';
  };

  const getFilteredReviews = () => {
    switch (activeTab) {
      case 'pending':
        return reviews.filter(review => review.evaluations.length === 0);
      case 'completed':
        return reviews.filter(review => review.evaluations.some(evaluation => evaluation.is_final));
      default:
        return reviews;
    }
  };

  const getExistingEvaluation = (thesisId: number, criteria: string) => {
    return evaluations.find(evaluation => evaluation.thesis.id === thesisId && evaluation.criteria === criteria);
  };

  if (user?.role.toLowerCase() !== "panel") {
    return (
      <div className="container-academic py-4" style={{ zIndex: 20 }}>
        <div className="flex-1">
          <div className="flex items-center justify-center min-h-screen">
            <div className="card-academic text-center">
              <div className="card-academic-body p-4">
                <h1 className="text-lg font-bold text-academic-text mb-2">Access Denied</h1>
                <p className="text-academic-muted text-sm">You don't have permission to access this page.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-academic section-academic">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="spinner-academic mx-auto mb-4"></div>
            <p className="text-academic-text">Loading reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-academic section-academic">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-academic-error mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-academic-error mb-2">{error}</p>
            <button 
              onClick={loadReviewsData}
              className="btn-academic"
              disabled={loading}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredReviews = getFilteredReviews();

  return (
    <div className="container-academic py-4" style={{ zIndex: 20 }}>
      <div className="flex-1">
        <div className="dashboard-header-academic sticky top-0 z-40 mb-4">
          <h1 className="text-2xl font-semibold mb-1">Panel Reviews</h1>
          <p className="text-sm opacity-90 max-w-none">
            Evaluate thesis submissions, provide feedback, and manage defense reviews
          </p>
        </div>
        <div className="px-4">
          {/* Tabs */}
          <div className="mb-4">
            <div className="border-b border-academic-border">
              <nav className="-mb-px flex space-x-6">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`py-2 px-1 border-b-2 font-medium text-xs ${activeTab === 'pending' ? 'border-academic-primary text-academic-primary' : 'border-transparent text-academic-muted hover:text-academic-text hover:border-academic-border'}`}
                >
                  Pending ({reviews.filter(r => r.evaluations.length === 0).length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`py-2 px-1 border-b-2 font-medium text-xs ${activeTab === 'completed' ? 'border-academic-primary text-academic-primary' : 'border-transparent text-academic-muted hover:text-academic-text hover:border-academic-border'}`}
                >
                  Completed ({reviews.filter(r => r.evaluations.some(e => e.is_final)).length})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-2 px-1 border-b-2 font-medium text-xs ${activeTab === 'all' ? 'border-academic-primary text-academic-primary' : 'border-transparent text-academic-muted hover:text-academic-text hover:border-academic-border'}`}
                >
                  All Theses ({reviews.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map((review) => (
              <div key={review.thesis.id} className="card-academic">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-academic-text mb-1">{review.thesis.title}</h3>
                      <p className="text-xs text-academic-muted">
                        by {review.thesis.student.first_name} {review.thesis.student.last_name}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(review.thesis.status)}`}>
                      {review.thesis.status}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-academic-text line-clamp-2">{review.thesis.description}</p>
                  </div>

                  {review.averageScore && (
                    <div className="mb-3">
                      <div className="flex items-center">
                        <span className="text-xs font-medium text-academic-text mr-2">Average Score:</span>
                        <span className={`text-sm font-bold ${getScoreClass(review.averageScore)}`}>
                          {review.averageScore.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="flex items-center text-xs text-academic-muted">
                      <span className="mr-3">
                        {review.evaluations.length} evaluation{review.evaluations.length !== 1 ? 's' : ''}
                      </span>
                      <span>
                        Submitted: {new Date(review.thesis.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setSelectedThesis(review.thesis)}
                      className="btn-academic py-1.5 px-3 text-xs"
                    >
                      {review.evaluations.length > 0 ? 'View Details' : 'Start Evaluation'}
                    </button>
                    {review.evaluations.length > 0 && (
                      <span className="text-xs text-academic-success font-medium">
                        {review.evaluations.filter(e => e.is_final).length} final evaluation{review.evaluations.filter(e => e.is_final).length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredReviews.length === 0 && (
            <div className="text-center py-8">
              <div className="text-academic-border mb-3">
                <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-academic-text mb-1">No theses found</h3>
              <p className="text-academic-muted text-xs">
                {activeTab === 'pending' ? 'No pending evaluations available.' : 
                 activeTab === 'completed' ? 'No completed evaluations yet.' : 
                 'No theses assigned for evaluation.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Evaluation Modal */}
      {selectedThesis && (
        <div className="fixed inset-0 bg-academic-dark bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-3 border w-11/12 max-w-3xl shadow-lg rounded-md bg-academic-white">
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm leading-5 font-medium text-academic-text">
                  Evaluate: {selectedThesis.title}
                </h3>
                <button
                  onClick={() => setSelectedThesis(null)}
                  className="text-academic-muted hover:text-academic-text"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-medium text-academic-text">Student:</span>
                    <span className="ml-2 text-academic-text">{selectedThesis.student.first_name} {selectedThesis.student.last_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-academic-text">Status:</span>
                    <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(selectedThesis.status)}`}>
                      {selectedThesis.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-academic-text">Submitted:</span>
                    <span className="ml-2 text-academic-text">{new Date(selectedThesis.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-medium text-academic-text mb-2">Description</h4>
                <p className="text-xs text-academic-text bg-academic-light p-2 rounded-md">{selectedThesis.description}</p>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-medium text-academic-text mb-3">Submit Evaluation</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-academic-text mb-1">
                      Evaluation Criteria
                    </label>
                    <select
                      value={evaluationForm.criteria}
                      onChange={(e) => setEvaluationForm({...evaluationForm, criteria: e.target.value})}
                      className="w-full px-2 py-1.5 border border-academic-border rounded-md focus:outline-none focus:ring-2 focus:ring-academic-primary focus:border-transparent bg-academic-white text-academic-text text-xs"
                    >
                      {criteriaOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-academic-text mb-1">
                      Score (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={evaluationForm.score}
                      onChange={(e) => setEvaluationForm({...evaluationForm, score: parseInt(e.target.value) || 0})}
                      className="w-full px-2 py-1.5 border border-academic-border rounded-md focus:outline-none focus:ring-2 focus:ring-academic-primary focus:border-transparent bg-academic-white text-academic-text text-xs"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-academic-text mb-1">
                    Comments
                  </label>
                  <textarea
                    rows={3}
                    value={evaluationForm.comments}
                    onChange={(e) => setEvaluationForm({...evaluationForm, comments: e.target.value})}
                    className="w-full px-2 py-1.5 border border-academic-border rounded-md focus:outline-none focus:ring-2 focus:ring-academic-primary focus:border-transparent bg-academic-white text-academic-text text-xs"
                    placeholder="Provide detailed feedback and suggestions for improvement..."
                  />
                </div>

                <div className="mt-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={evaluationForm.is_final}
                      onChange={(e) => setEvaluationForm({...evaluationForm, is_final: e.target.checked})}
                      className="rounded border-academic-border text-academic-primary focus:ring-academic-primary bg-academic-white"
                    />
                    <span className="ml-2 text-xs text-academic-text">
                      Mark as final evaluation
                    </span>
                  </label>
                </div>
              </div>

              {/* Existing Evaluations */}
              {evaluations.filter(evaluation => evaluation.thesis.id === selectedThesis.id).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-academic-text mb-3">Existing Evaluations</h4>
                  <div className="space-y-2">
                    {evaluations
                      .filter(evaluation => evaluation.thesis.id === selectedThesis.id)
                      .map((evaluation) => (
                        <div key={evaluation.id} className="bg-academic-light p-2 rounded-md">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-academic-text">
                              {criteriaOptions.find(opt => opt.value === evaluation.criteria)?.label || evaluation.criteria}
                            </span>
                            <span className={`text-xs font-bold ${getScoreClass(evaluation.score)}`}>
                              {evaluation.score}/100
                            </span>
                          </div>
                          <p className="text-xs text-academic-muted">{evaluation.comments}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-academic-muted">
                              {new Date(evaluation.submitted_at).toLocaleDateString()}
                            </span>
                            {evaluation.is_final && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-academic-success bg-opacity-20 text-academic-success">
                                Final
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setSelectedThesis(null)}
                  className="btn-academic-secondary py-1.5 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitEvaluation(selectedThesis.id)}
                  disabled={evaluationForm.score === 0 || !evaluationForm.comments.trim()}
                  className="btn-academic py-1.5 px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Evaluation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}