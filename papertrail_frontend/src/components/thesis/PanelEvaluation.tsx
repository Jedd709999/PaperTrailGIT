import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import '../styles/academic-theme.css';

interface ThesisTopic {
  id: number;
  title: string;
  description: string;
  keywords: string;
  status: string;
  student: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  group?: {
    id: number;
    name: string;
  };
}

interface Evaluation {
  id?: number;
  criteria: string;
  score: number;
  comments: string;
  submitted_at?: string;
  is_final: boolean;
}

interface DefenseSchedule {
  id: number;
  date: string;
  location: string;
  duration_minutes: number;
  thesis: ThesisTopic;
}

const PanelEvaluation: React.FC = () => {
  const { user } = useAuth();
  const [theses, setTheses] = useState<ThesisTopic[]>([]);
  const [selectedThesis, setSelectedThesis] = useState<ThesisTopic | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [defenseSchedules, setDefenseSchedules] = useState<DefenseSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'evaluate' | 'schedule'>('overview');

  const criteriaOptions = [
    { value: 'content', label: 'Content Quality', description: 'Depth, accuracy, and relevance of content' },
    { value: 'methodology', label: 'Methodology', description: 'Research approach and methods used' },
    { value: 'analysis', label: 'Analysis & Results', description: 'Data analysis and interpretation of results' },
    { value: 'presentation', label: 'Presentation', description: 'Clarity and organization of presentation' },
    { value: 'originality', label: 'Originality', description: 'Innovation and contribution to the field' },
    { value: 'overall', label: 'Overall Assessment', description: 'General evaluation of the thesis' }
  ];

  const [evaluationForm, setEvaluationForm] = useState<Evaluation>({
    criteria: 'overall',
    score: 0,
    comments: '',
    is_final: false
  });

  useEffect(() => {
    fetchTheses();
    fetchDefenseSchedules();
  }, []);

  useEffect(() => {
    if (selectedThesis) {
      fetchEvaluations();
    }
  }, [selectedThesis]);

  const fetchTheses = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/thesis-topics/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTheses(data);
      }
    } catch (err) {
      console.error('Error fetching theses:', err);
    }
  };

  const fetchEvaluations = async () => {
    if (!selectedThesis) return;
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/evaluations/?thesis_id=${selectedThesis.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvaluations(data);
      }
    } catch (err) {
      console.error('Error fetching evaluations:', err);
    }
  };

  const fetchDefenseSchedules = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/defense-schedules/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDefenseSchedules(data);
      }
    } catch (err) {
      console.error('Error fetching defense schedules:', err);
    }
  };

  const handleEvaluationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThesis) return;

    setLoading(true);
    try {
      const payload = {
        ...evaluationForm,
        thesis: selectedThesis.id
      };

      const response = await fetch('http://127.0.0.1:8000/api/evaluations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Evaluation submitted successfully!');
        setEvaluationForm({
          criteria: 'overall',
          score: 0,
          comments: '',
          is_final: false
        });
        fetchEvaluations();
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Failed to submit evaluation');
      }
    } catch (err) {
      alert('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Defense Ready': return 'status-academic-warning';
      case 'Defense Scheduled': return 'status-academic-info';
      case 'Defense Completed': return 'status-academic-success';
      case 'Approved': return 'status-academic-success';
      case 'Final Review': return 'status-academic-warning';
      default: return 'status-academic-muted';
    }
  };

  const getScoreClass = (score: number) => {
    if (score >= 90) return 'text-academic-success';
    if (score >= 80) return 'text-academic-primary';
    if (score >= 70) return 'text-academic-warning';
    if (score >= 60) return 'text-academic-accent';
    return 'text-academic-danger';
  };

  const calculateAverageScore = (): number => {
    if (evaluations.length === 0) return 0;
    const total = evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
    return total / evaluations.length;
  };

  const getFormattedAverageScore = (): string => {
    return calculateAverageScore().toFixed(1);
  };

  const getExistingEvaluation = (criteria: string) => {
    return evaluations.find(evaluation => evaluation.criteria === criteria);
  };

  return (
    <div className="container-academic section-academic">
      <div className="flex-1">
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Thesis List */}
            <div className="lg:col-span-1">
              <div className="card-academic">
                <div className="card-academic-header">
                  <h2 className="card-academic-title">Assigned for Evaluation</h2>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {theses.map((thesis) => (
                    <div
                      key={thesis.id}
                      onClick={() => setSelectedThesis(thesis)}
                      className={`p-4 border-b border-academic-border cursor-pointer hover:bg-academic-light ${
                        selectedThesis?.id === thesis.id ? 'bg-academic-light border-l-4 border-academic-primary' : ''
                      }`}
                    >
                      <h3 className="font-semibold text-academic-text truncate">{thesis.title}</h3>
                      <p className="text-sm text-academic-muted mt-1">
                        {thesis.student.first_name} {thesis.student.last_name}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          thesis.status === 'Defense Ready' ? 'bg-academic-warning bg-opacity-20 text-academic-warning' :
                          thesis.status === 'Defense Scheduled' ? 'bg-academic-primary bg-opacity-20 text-academic-primary' :
                          thesis.status === 'Defense Completed' ? 'bg-academic-success bg-opacity-20 text-academic-success' :
                          thesis.status === 'Approved' ? 'bg-academic-success bg-opacity-20 text-academic-success' :
                          'bg-academic-border bg-opacity-20 text-academic-text'
                        }`}>
                          {thesis.status}
                        </span>
                        {thesis.group && (
                          <span className="text-xs text-academic-muted">
                            {thesis.group.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

              {/* Defense Schedule */}
              <div className="card-academic mt-6">
                <div className="card-academic-header">
                  <h2 className="card-academic-title">Upcoming Defenses</h2>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {defenseSchedules.map((schedule) => (
                    <div key={schedule.id} className="p-4 border-b border-academic-border">
                      <h3 className="font-semibold text-academic-text text-sm truncate">
                        {schedule.thesis.title}
                      </h3>
                      <p className="text-xs text-academic-muted mt-1">
                    {schedule.thesis.student.first_name} {schedule.thesis.student.last_name}
                  </p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-academic-muted">
                      📅 {new Date(schedule.date).toLocaleDateString()} at{' '}
                      {new Date(schedule.date).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-academic-muted">
                      📍 {schedule.location}
                    </p>
                    <p className="text-xs text-academic-muted">
                      ⏱️ {schedule.duration_minutes} minutes
                    </p>
                  </div>
                </div>
              ))}
              {defenseSchedules.length === 0 && (
                <p className="p-4 text-sm text-academic-muted text-center">No upcoming defenses</p>
              )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              {selectedThesis ? (
                <div className="card-academic">
                  <div className="card-academic-header p-3 mb-3">
                    <div>
                      <h1 className="card-academic-title text-lg">{selectedThesis.title}</h1>
                      <p className="text-sm text-academic-muted mt-1">
                        Student: {selectedThesis.student.first_name} {selectedThesis.student.last_name} ({selectedThesis.student.email})
                      </p>
                      {evaluations.length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm text-academic-muted">Average Score: </span>
                          <span className="font-bold text-academic-text">
                            {getFormattedAverageScore()}/100
                          </span>
                        </div>
                      )}
                    </div>
                    <nav className="flex space-x-8 px-4 border-t border-academic-border mt-3 pt-3">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'overview'
                            ? 'border-academic-primary text-academic-primary'
                            : 'border-transparent text-academic-muted hover:text-academic-primary'
                        }`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab('evaluate')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'evaluate'
                            ? 'border-academic-primary text-academic-primary'
                            : 'border-transparent text-academic-muted hover:text-academic-primary'
                        }`}
                      >
                        Evaluate
                      </button>
                    </nav>
                  </div>

                  <div className="card-academic-body px-3 pb-3">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="subheading-academic mb-3">Thesis Description</h3>
                      <p className="text-academic-text whitespace-pre-wrap">{selectedThesis.description}</p>
                    </div>

                    {selectedThesis.keywords && (
                      <div>
                        <h3 className="subheading-academic mb-3">Keywords</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedThesis.keywords.split(',').map((keyword, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-academic-accent bg-opacity-20 text-academic-accent rounded-full text-sm font-medium"
                            >
                              {keyword.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="subheading-academic mb-3">Current Evaluations</h3>
                      {evaluations.length === 0 ? (
                        <p className="text-academic-muted">No evaluations submitted yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {criteriaOptions.map((criteria) => {
                            const evaluationItem = getExistingEvaluation(criteria.value);
                            return (
                              <div key={criteria.value} className="bg-academic-white p-4 rounded-lg border border-academic-border hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-semibold text-academic-text">{criteria.label}</h4>
                                    <p className="text-sm text-academic-muted">{criteria.description}</p>
                                  </div>
                                  {evaluationItem ? (
                                    <div className="text-right">
                                      <div className={`text-lg font-bold ${getScoreClass(evaluationItem.score)}`}>
                                        {evaluationItem.score}/100
                                      </div>
                                      {evaluationItem.is_final && (
                                        <span className="px-2 py-1 bg-academic-primary text-academic-white rounded-full text-xs font-medium">
                                          Final
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-academic-muted">Not evaluated</span>
                                  )}
                                </div>
                                {evaluationItem && evaluationItem.comments && (
                                  <div className="mt-3 pt-3 border-t border-academic-border">
                                    <p className="text-sm text-academic-text">{evaluationItem.comments}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'evaluate' && (
                  <div className="space-y-6">
                    <form onSubmit={handleEvaluationSubmit} className="space-y-6">
                      <div>
                        <label className="form-label-academic text-xs mb-1">
                          Evaluation Criteria *
                        </label>
                        <select
                          value={evaluationForm.criteria}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, criteria: e.target.value })}
                          className="form-input-academic w-full py-2 px-3 text-sm"
                          required
                        >
                          {criteriaOptions.map((criteria) => (
                            <option key={criteria.value} value={criteria.value}>
                              {criteria.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-sm text-academic-muted">
                          {criteriaOptions.find(c => c.value === evaluationForm.criteria)?.description}
                        </p>
                      </div>

                      <div>
                        <label className="form-label-academic text-xs mb-1">
                          Score (0-100) *
                        </label>
                        <div className="flex items-center space-x-4">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={evaluationForm.score}
                            onChange={(e) => setEvaluationForm({ ...evaluationForm, score: parseInt(e.target.value) })}
                            className="flex-1 accent-academic-primary"
                          />
                          <div className={`text-2xl font-bold text-academic-text min-w-[60px]`}>
                            {evaluationForm.score}
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-academic-muted mt-1">
                          <span>Poor (0)</span>
                          <span>Fair (50)</span>
                          <span>Excellent (100)</span>
                        </div>
                      </div>

                      <div>
                        <label className="form-label-academic text-xs mb-1">
                          Comments *
                        </label>
                        <textarea
                          value={evaluationForm.comments}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, comments: e.target.value })}
                          rows={6}
                          className="form-input-academic w-full py-2 px-3 text-sm"
                          placeholder="Provide detailed feedback on this criteria..."
                          required
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_final"
                          checked={evaluationForm.is_final}
                          onChange={(e) => setEvaluationForm({ ...evaluationForm, is_final: e.target.checked })}
                          className="h-4 w-4 text-academic-primary focus:ring-academic-primary border-academic-border rounded transition-colors bg-academic-white"
                        />
                        <label htmlFor="is_final" className="ml-2 block text-sm text-academic-text">
                          Mark as final evaluation (cannot be changed later)
                        </label>
                      </div>

                      <div className="flex space-x-4">
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn-academic flex-1 py-2 px-4 text-sm"
                        >
                          {loading ? 'Submitting...' : 'Submit Evaluation'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEvaluationForm({
                            criteria: 'overall',
                            score: 0,
                            comments: '',
                            is_final: false
                          })}
                          className="btn-academic-secondary"
                        >
                          Reset
                        </button>
                      </div>
                    </form>

                    {/* Show existing evaluation for selected criteria */}
                    {(() => {
                      const existing = getExistingEvaluation(evaluationForm.criteria);
                      return existing ? (
                        <div className="bg-academic-light border border-academic-border rounded-lg p-4">
                          <h4 className="font-medium text-academic-text mb-2">
                            Existing Evaluation for {criteriaOptions.find(c => c.value === evaluationForm.criteria)?.label}
                          </h4>
                          <p className="text-sm text-academic-text">
                            Score: <span className={`font-bold ${getScoreClass(existing.score)}`}>{existing.score}/100</span>
                            {existing.is_final && <span className="ml-2 px-2 py-1 bg-academic-primary text-academic-white rounded-full text-xs font-medium">Final</span>}
                          </p>
                          <p className="text-sm text-academic-text mt-1">{existing.comments}</p>
                          <p className="text-xs text-academic-muted mt-2">
                            Submitted: {new Date(existing.submitted_at!).toLocaleDateString()}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card-academic p-8 text-center">
              <p className="text-academic-muted">Select a thesis from the list to evaluate</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanelEvaluation;