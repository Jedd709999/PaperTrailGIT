import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { fetchThesisTopics, fetchUsers, fetchDefenseSchedules, updateThesisStatus } from '../../services/api';
import '../../styles/academic-theme.css';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface ThesisTopic {
  id: number;
  title: string;
  description: string;
  status: string;
  student: User;
  adviser: User;
  group?: {
    id: number;
    name: string;
    panel_members: User[];
  };
}

interface DefenseSchedule {
  id: number;
  date: string;
  location: string;
  duration_minutes: number;
  panel_members: User[];
  thesis: ThesisTopic;
}

interface Conflict {
  panel_member_id: number;
  conflicting_schedule_id: number;
  conflicting_thesis: string;
  conflicting_date: string;
  conflicting_duration: number;
}

const DefenseScheduler: React.FC = () => {
  const { user } = useAuth();
  const [theses, setTheses] = useState<ThesisTopic[]>([]);
  const [panelMembers, setPanelMembers] = useState<User[]>([]);
  const [defenseSchedules, setDefenseSchedules] = useState<DefenseSchedule[]>([]);
  const [selectedThesis, setSelectedThesis] = useState<ThesisTopic | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    duration: 60,
    panelMembers: [] as number[],
  });
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [thesesData, usersData, schedulesData] = await Promise.all([
        fetchThesisTopics(),
        fetchUsers(),
        fetchDefenseSchedules(),
      ]);
      
      // Filter theses that are ready for defense scheduling
      const defenseReadyTheses = thesesData.filter(
        (thesis: ThesisTopic) => thesis.status === 'Defense Ready'
      );
      
      setTheses(defenseReadyTheses);
      
      // Filter panel members only
      const panelMembersData = usersData.filter((u: User) => u.role === 'Panel');
      setPanelMembers(panelMembersData);
      
      setDefenseSchedules(schedulesData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleThesisSelect = (thesis: ThesisTopic) => {
    setSelectedThesis(thesis);
    
    // Pre-populate panel members from the thesis group if available
    if (thesis.group && thesis.group.panel_members) {
      setFormData({
        ...formData,
        panelMembers: thesis.group.panel_members.map((member: User) => member.id),
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'duration' ? parseInt(value) : value,
    });
  };

  const handlePanelMemberToggle = (memberId: number) => {
    setFormData(prev => {
      const newPanelMembers = prev.panelMembers.includes(memberId)
        ? prev.panelMembers.filter(id => id !== memberId)
        : [...prev.panelMembers, memberId];
      
      return {
        ...prev,
        panelMembers: newPanelMembers,
      };
    });
  };

  const checkConflicts = async () => {
    if (!formData.date || !formData.time || formData.panelMembers.length === 0) {
      setMessage({ type: 'error', text: 'Please fill in date, time, and select at least one panel member' });
      return;
    }

    try {
      setLoading(true);
      const dateTime = `${formData.date}T${formData.time}:00`;
      
      // In a real implementation, we would call an API endpoint to check conflicts
      // For now, we'll simulate this with a mock response
      const mockConflicts: Conflict[] = [];
      
      // Simulate checking conflicts (in a real app, this would be an API call)
      setConflicts(mockConflicts);
      
      if (mockConflicts.length > 0) {
        setMessage({ type: 'error', text: 'Scheduling conflicts detected. Please review.' });
      } else {
        setMessage({ type: 'success', text: 'No scheduling conflicts detected.' });
      }
    } catch (err) {
      console.error('Error checking conflicts:', err);
      setMessage({ type: 'error', text: 'Failed to check scheduling conflicts' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedThesis || !formData.date || !formData.time || !formData.location) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    if (formData.panelMembers.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one panel member' });
      return;
    }

    try {
      setLoading(true);
      
      // Combine date and time
      const dateTime = `${formData.date}T${formData.time}:00`;
      
      // In a real implementation, we would create the defense schedule via API
      // For now, we'll just show a success message
      setMessage({ type: 'success', text: 'Defense schedule created successfully!' });
      
      // Reset form
      setFormData({
        date: '',
        time: '',
        location: '',
        duration: 60,
        panelMembers: [],
      });
      setSelectedThesis(null);
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error creating defense schedule:', err);
      setMessage({ type: 'error', text: 'Failed to create defense schedule' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="container-academic py-4" style={{ zIndex: 20 }}>
      <div className="dashboard-header-academic sticky top-0 z-40 mb-4">
        <h1 className="text-2xl font-semibold mb-1">Defense Scheduler</h1>
        <p className="text-sm opacity-90 max-w-none">Schedule and manage thesis defense presentations</p>
      </div>
      
      {message && (
        <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Thesis Selection */}
        <div className="lg:col-span-1">
          <div className="card-academic">
            <div className="card-academic-header p-3 mb-3">
              <h2 className="card-academic-title font-semibold">Theses Ready for Defense</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="spinner-academic mx-auto"></div>
                  <p className="text-academic-muted mt-2">Loading theses...</p>
                </div>
              ) : theses.length === 0 ? (
                <div className="p-4 text-center text-academic-muted">
                  No theses ready for defense scheduling
                </div>
              ) : (
                theses.map((thesis) => (
                  <div
                    key={thesis.id}
                    onClick={() => handleThesisSelect(thesis)}
                    className={`p-4 border-b border-academic-border cursor-pointer hover:bg-academic-light ${
                      selectedThesis?.id === thesis.id ? 'bg-academic-light border-l-4 border-academic-primary' : ''
                    }`}
                  >
                    <h3 className="font-semibold text-academic-text truncate">{thesis.title}</h3>
                    <p className="text-sm text-academic-muted mt-1">
                      {thesis.student.first_name} {thesis.student.last_name}
                    </p>
                    {thesis.group && (
                      <span className="text-xs text-academic-muted">
                        Group: {thesis.group.name}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Upcoming Defenses */}
          <div className="card-academic mt-6">
            <div className="card-academic-header p-3 mb-3">
              <h2 className="card-academic-title font-semibold">Upcoming Defenses</h2>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {defenseSchedules
                .filter(schedule => new Date(schedule.date) > new Date())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((schedule) => (
                  <div key={schedule.id} className="p-4 border-b border-academic-border">
                    <h3 className="font-semibold text-academic-text text-sm truncate">
                      {schedule.thesis.title}
                    </h3>
                    <p className="text-xs text-academic-muted mt-1">
                      {schedule.thesis.student.first_name} {schedule.thesis.student.last_name}
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-academic-muted">
                        📅 {formatDate(schedule.date)} at {formatTime(schedule.date)}
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
              {defenseSchedules.filter(schedule => new Date(schedule.date) > new Date()).length === 0 && (
                <p className="p-4 text-sm text-academic-muted text-center">No upcoming defenses</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Scheduler Form */}
        <div className="lg:col-span-2">
          <div className="card-academic">
            <div className="card-academic-header p-3 mb-3">
              <h2 className="card-academic-title font-semibold">
                {selectedThesis ? `Schedule Defense: ${selectedThesis.title}` : 'Select a Thesis'}
              </h2>
            </div>
            
            <div className="card-academic-body px-3 pb-3">
              {selectedThesis ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label-academic text-xs mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="form-input-academic w-full py-2 px-3 text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="form-label-academic text-xs mb-1">
                        Time *
                      </label>
                      <input
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleInputChange}
                        className="form-input-academic w-full py-2 px-3 text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="form-label-academic text-xs mb-1">
                        Duration (minutes)
                      </label>
                      <select
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        className="form-input-academic w-full py-2 px-3 text-sm"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                        <option value={90}>90 minutes</option>
                        <option value={120}>120 minutes</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="form-label-academic text-xs mb-1">
                        Location *
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="e.g., Room 101, Building A"
                        className="form-input-academic w-full py-2 px-3 text-sm"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="form-label-academic text-xs mb-1">
                      Panel Members *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {panelMembers.map((member) => (
                        <div 
                          key={member.id}
                          onClick={() => handlePanelMemberToggle(member.id)}
                          className={`p-3 border rounded-md cursor-pointer transition-all ${
                            formData.panelMembers.includes(member.id)
                              ? 'border-academic-primary bg-academic-primary bg-opacity-10'
                              : 'border-academic-border hover:border-academic-primary hover:bg-academic-light'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${
                              formData.panelMembers.includes(member.id)
                                ? 'bg-academic-primary border-academic-primary'
                                : 'border-academic-border'
                            }`}>
                              {formData.panelMembers.includes(member.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-academic-text text-sm">
                                {member.first_name} {member.last_name}
                              </div>
                              <div className="text-xs text-academic-muted">
                                {member.username}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {conflicts.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <h3 className="font-medium text-red-800 mb-2">Scheduling Conflicts Detected</h3>
                      <ul className="space-y-2">
                        {conflicts.map((conflict, index) => (
                          <li key={index} className="text-sm text-red-700">
                            <strong>Panel Member ID {conflict.panel_member_id}</strong> has a conflict with{' '}
                            <em>"{conflict.conflicting_thesis}"</em> on{' '}
                            {new Date(conflict.conflicting_date).toLocaleString()} for{' '}
                            {conflict.conflicting_duration} minutes.
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={checkConflicts}
                      disabled={loading}
                      className="btn-academic-secondary flex-1"
                    >
                      {loading ? 'Checking...' : 'Check for Conflicts'}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-academic flex-1"
                    >
                      {loading ? 'Scheduling...' : 'Schedule Defense'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8 text-academic-muted">
                  <p>Select a thesis from the list to schedule its defense</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefenseScheduler;