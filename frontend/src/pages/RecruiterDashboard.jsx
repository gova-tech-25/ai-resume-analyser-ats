import React, { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import ProfileSettingsPanel from '../components/ProfileSettingsPanel';
import { 
  Briefcase, Users, FileText, CheckCircle, XCircle, 
  PlusCircle, Filter, ArrowRight, Download, BarChart2, Check, RefreshCw, Settings
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, PieChart, Pie, Cell, Legend 
} from 'recharts';

export default function RecruiterDashboard({ tab = 'jobs' }) {
  const { activeUser, getAuthHeaders } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubTab = searchParams.get('tab') || 'jobs';
  
  const setActiveSubTab = (newTab) => {
    setSearchParams({ tab: newTab });
  };
  
  // Job and Applicant State
  const [myJobs, setMyJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [recruiterApplications, setRecruiterApplications] = useState([]);
  const [recruiterAppsLoading, setRecruiterAppsLoading] = useState(false);
  
  // Job Form State
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    location: '',
    salaryRange: '',
    description: '',
    requirements: '',
    skillsRequired: ''
  });
  const [formPosting, setFormPosting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  
  // Filter/Sort & Comparison state
  const [skillFilter, setSkillFilter] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState([]); // for side-by-side comparison
  const [showComparison, setShowComparison] = useState(false);
  const [actioningId, setActioningId] = useState(null); // application ID being shortlisted/rejected
  const [feedbackText, setFeedbackText] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(null); // 'shortlist' or 'reject'

  useEffect(() => {
    if (activeUser) {
      fetchMyJobs();
      fetchRecruiterApplications();
    }
  }, [activeUser, activeSubTab]);

  const fetchMyJobs = async () => {
    try {
      setJobsLoading(true);
      const res = await axios.get('/api/jobs?myJobs=true', { headers: getAuthHeaders() });
      setMyJobs(res.data);
      if (res.data.length > 0 && !selectedJob) {
        handleSelectJob(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch recruiter jobs:', err);
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchRecruiterApplications = async () => {
    try {
      setRecruiterAppsLoading(true);
      const res = await axios.get('/api/applications/recruiter', { headers: getAuthHeaders() });
      setRecruiterApplications(res.data);
    } catch (err) {
      console.error('Failed to fetch recruiter applications:', err);
    } finally {
      setRecruiterAppsLoading(false);
    }
  };

  const handleSelectJob = async (job) => {
    setSelectedJob(job);
    setSelectedCandidates([]);
    setShowComparison(false);
    try {
      setApplicantsLoading(true);
      const res = await axios.get(`/api/jobs/${job._id}/applicants`, { headers: getAuthHeaders() });
      setApplicants(res.data.applications);
    } catch (err) {
      console.error('Failed to fetch applicants:', err);
    } finally {
      setApplicantsLoading(false);
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();

    // Strict Client-Side validation
    const trimmedTitle = newJob.title.trim();
    const trimmedCompany = newJob.company.trim();
    const trimmedLocation = newJob.location.trim();
    const trimmedSalaryRange = newJob.salaryRange.trim();
    const trimmedDescription = newJob.description.trim();
    const trimmedRequirements = newJob.requirements.trim();
    const trimmedSkillsRequired = newJob.skillsRequired.trim();

    if (!trimmedTitle || !trimmedCompany || !trimmedLocation || !trimmedSalaryRange || !trimmedDescription || !trimmedRequirements || !trimmedSkillsRequired) {
      alert('Please fill in all fields.');
      return;
    }

    if (trimmedTitle.length < 3) {
      alert('Job Title must be at least 3 characters.');
      return;
    }

    if (trimmedCompany.length < 2) {
      alert('Company Name must be at least 2 characters.');
      return;
    }

    if (trimmedDescription.length < 20) {
      alert('Core Job Description must be at least 20 characters.');
      return;
    }

    try {
      setFormPosting(true);
      const reqPayload = {
        title: trimmedTitle,
        company: trimmedCompany,
        location: trimmedLocation,
        salaryRange: trimmedSalaryRange,
        description: trimmedDescription,
        requirements: trimmedRequirements.split('\n').filter(r => r.trim().length > 0),
        skillsRequired: trimmedSkillsRequired.split(',').map(s => s.trim()).filter(s => s.length > 0)
      };

      await axios.post('/api/jobs', reqPayload, { headers: getAuthHeaders() });
      setFormSuccess(true);
      setNewJob({
        title: '',
        company: '',
        location: '',
        salaryRange: '',
        description: '',
        requirements: '',
        skillsRequired: ''
      });
      setTimeout(() => {
        setFormSuccess(false);
        setActiveSubTab('jobs');
      }, 2000);
    } catch (err) {
      console.error('Failed to post job:', err);
      alert('Failed to post job: ' + (err.response?.data?.error || err.message));
    } finally {
      setFormPosting(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    if (!actioningId) return;
    try {
      await axios.post(`/api/applications/${actioningId}/status`, {
        status,
        feedback: feedbackText
      }, {
        headers: getAuthHeaders()
      });
      
      // Update local state
      setApplicants(prev => prev.map(app => 
        app._id === actioningId ? { ...app, status, feedback: feedbackText } : app
      ));
      
      // Update recruiter applications state too
      setRecruiterApplications(prev => prev.map(app =>
        app._id === actioningId ? { ...app, status, feedback: feedbackText } : app
      ));
      
      // Reset status states
      setShowStatusModal(null);
      setActioningId(null);
      setFeedbackText('');
    } catch (err) {
      alert('Failed to update applicant: ' + (err.response?.data?.error || err.message));
    }
  };

  // Toggle selection for comparison
  const toggleCandidateSelection = (candidate) => {
    if (selectedCandidates.find(c => c._id === candidate._id)) {
      setSelectedCandidates(selectedCandidates.filter(c => c._id !== candidate._id));
    } else {
      if (selectedCandidates.length >= 3) {
        alert('You can compare a maximum of 3 candidates at once.');
        return;
      }
      setSelectedCandidates([...selectedCandidates, candidate]);
    }
  };

  // Filter applicants by skill
  const filteredApplicants = applicants.filter(app => {
    if (!skillFilter) return true;
    const skills = app.resume?.skills || [];
    return skills.some(s => s.toLowerCase().includes(skillFilter.toLowerCase()));
  });

  // Recharts analytics helpers
  const getAnalyticsData = () => {
    const total = recruiterApplications.length;
    const shortlisted = recruiterApplications.filter(a => a.status === 'shortlisted').length;
    const rejected = recruiterApplications.filter(a => a.status === 'rejected').length;
    const pending = recruiterApplications.filter(a => a.status === 'applied').length;

    const pieData = [
      { name: 'Shortlisted', value: shortlisted, color: '#10b981' },
      { name: 'Rejected', value: rejected, color: '#f43f5e' },
      { name: 'Pending Review', value: pending, color: '#eab308' }
    ].filter(d => d.value > 0);

    const barData = myJobs.map(j => ({
      name: j.title.substring(0, 15) + '...',
      applicants: j.applicantCount || 0
    }));

    return { total, shortlisted, rejected, pending, pieData, barData };
  };

  const stats = getAnalyticsData();

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto py-4">
      {/* Sub Tabs Toggle */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'jobs'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Manage Jobs & Applicants
        </button>
        <button
          onClick={() => setActiveSubTab('post-job')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'post-job'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <PlusCircle className="w-4 h-4" /> Post a Job Opening
        </button>
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'analytics'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> Job Analytics
        </button>
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
      </div>

      {/* RENDER VIEW: JOBS MANAGER & APPLICANTS LIST */}
      {activeSubTab === 'jobs' && (
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Col 1: Job Openings List */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <h2 className="text-md font-bold px-1">My Postings</h2>
            {jobsLoading ? (
              <div className="text-center py-6 text-xs text-slate-400">Loading jobs...</div>
            ) : myJobs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">No postings. Create one!</div>
            ) : (
              myJobs.map((job) => (
                <div 
                  key={job._id}
                  className={`glass-panel p-5 rounded-2xl flex flex-col gap-2 transition-all border-l-4 cursor-pointer hover:-translate-y-0.5 ${
                    selectedJob?._id === job._id 
                      ? 'border-l-indigo-600 bg-indigo-50/10' 
                      : 'border-l-transparent'
                  }`}
                  onClick={() => handleSelectJob(job)}
                >
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-snug">{job.title}</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{job.location}</span>
                </div>
              ))
            )}
          </div>

          {/* Col 2-4: Applicants Grid list & filters */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {!selectedJob ? (
              <div className="glass-panel p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-3">
                <Users className="w-12 h-12 text-slate-300" />
                <h3 className="text-lg font-bold">No Job Selected</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  Create or select a job opening in the left panel to review matching applicants.
                </p>
              </div>
            ) : (
              <>
                {/* Filters toolbar */}
                <div className="glass-panel p-4 rounded-3xl flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Filter candidate by skill (e.g. React)..."
                      value={skillFilter}
                      onChange={(e) => setSkillFilter(e.target.value)}
                      className="px-3 py-1.5 w-full md:w-64 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                    />
                  </div>
                  
                  {selectedCandidates.length > 0 && (
                    <button
                      onClick={() => setShowComparison(true)}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                    >
                      Compare Selected ({selectedCandidates.length})
                    </button>
                  )}
                </div>

                {/* Candidates table / list */}
                <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 dark:border-slate-800">
                    <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Candidates Ranked by AI Match Score
                    </h2>
                    <span className="text-[10px] text-slate-400 font-bold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {filteredApplicants.length} Applicants
                    </span>
                  </div>

                  {applicantsLoading ? (
                    <div className="text-center py-12 text-xs text-slate-400">Loading applicants...</div>
                  ) : filteredApplicants.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400">No applicants matching standard.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                            <th className="py-3 px-4 w-8">Compare</th>
                            <th className="py-3 px-4">Name</th>
                            <th className="py-3 px-4">Similarity</th>
                            <th className="py-3 px-4">ATS Grade</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredApplicants.map((app) => (
                            <tr key={app._id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                              <td className="py-3 px-4">
                                <input
                                  type="checkbox"
                                  checked={!!selectedCandidates.find(c => c._id === app._id)}
                                  onChange={() => toggleCandidateSelection(app)}
                                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <img src={app.student.profileImage} alt="Avatar" className="w-6 h-6 rounded-full" />
                                  <div>
                                    <div className="font-semibold text-slate-700 dark:text-slate-200">{app.student.username}</div>
                                    <div className="text-[10px] text-slate-400 leading-none mt-0.5">{app.student.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-full dark:bg-indigo-950/40 dark:text-indigo-400">
                                  {app.similarityScore}%
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 font-bold rounded-full dark:bg-cyan-950/40 dark:text-cyan-400">
                                  {app.atsScore}%
                                </span>
                              </td>
                              <td className="py-3 px-4 capitalize font-semibold">
                                {app.status === 'shortlisted' ? (
                                  <span className="text-emerald-500">Shortlisted</span>
                                ) : app.status === 'rejected' ? (
                                  <span className="text-rose-500">Rejected</span>
                                ) : (
                                  <span className="text-yellow-500">Applied</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right flex gap-1 justify-end items-center">
                                {/* Download Resume simulated link */}
                                <a 
                                  href={`/uploads/${app.resume?.filePath?.split('\\')?.pop()}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                  title="Download Resume"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                {app.status === 'applied' && (
                                  <>
                                    <button
                                      onClick={() => { setActioningId(app._id); setShowStatusModal('shortlist'); }}
                                      className="p-1.5 text-emerald-500 hover:text-emerald-600 transition-colors"
                                      title="Shortlist"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => { setActioningId(app._id); setShowStatusModal('reject'); }}
                                      className="p-1.5 text-rose-500 hover:text-rose-600 transition-colors"
                                      title="Reject"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: SHORTLIST/REJECT FEEDBACK DIALOG */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl w-full max-w-md flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <h2 className="text-md font-bold capitalize">
              {showStatusModal} Candidate Application
            </h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400">Add feedback / message (optional)</label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g. Strong React skills. Interview scheduled for Monday."
                rows={3}
                className="px-3 py-2 w-full rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
              />
            </div>
            <div className="flex gap-2 justify-end text-xs font-bold mt-2">
              <button 
                onClick={() => { setShowStatusModal(null); setActioningId(null); }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleStatusUpdate(showStatusModal === 'shortlist' ? 'shortlisted' : 'rejected')}
                className={`px-4 py-2 rounded-xl text-white shadow-md ${
                  showStatusModal === 'shortlist' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Submit Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: CANDIDATE COMPARISON SYSTEM */}
      {showComparison && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-y-auto flex flex-col gap-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3 dark:border-slate-800">
              <h2 className="text-lg font-bold">Candidate Side-By-Side Comparison Grid</h2>
              <button 
                onClick={() => setShowComparison(false)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 hover:dark:bg-slate-700 text-xs font-bold rounded-xl"
              >
                Close Panel
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {selectedCandidates.map((c) => (
                <div key={c._id} className="border border-slate-200/50 p-5 rounded-2xl dark:border-slate-800/80 flex flex-col gap-4">
                  <div className="text-center flex flex-col items-center">
                    <img src={c.student.profileImage} alt="Avatar" className="w-12 h-12 rounded-full border border-indigo-500/20" />
                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200 mt-2">{c.student.username}</h3>
                    <span className="text-[10px] text-slate-400 mt-0.5">{c.student.email}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-indigo-50/20 p-2.5 rounded-xl dark:bg-indigo-950/10">
                      <div className="text-indigo-500 font-extrabold">{c.similarityScore}%</div>
                      <div className="text-[9px] text-slate-400 mt-0.5 uppercase font-semibold">Similarity</div>
                    </div>
                    <div className="bg-cyan-50/20 p-2.5 rounded-xl dark:bg-cyan-950/10">
                      <div className="text-cyan-500 font-extrabold">{c.atsScore}%</div>
                      <div className="text-[9px] text-slate-400 mt-0.5 uppercase font-semibold">ATS Grade</div>
                    </div>
                  </div>

                  <hr className="border-slate-150 dark:border-slate-800" />

                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Skills Overlap</h4>
                    <div className="flex flex-wrap gap-1">
                      {c.resume?.skills?.slice(0, 8).map((s, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 bg-slate-100 rounded-lg dark:bg-slate-800 font-semibold">
                          {s}
                        </span>
                      ))}
                      {c.resume?.skills?.length > 8 && (
                        <span className="text-[9px] text-slate-400 mt-0.5">+{c.resume.skills.length - 8} more</span>
                      )}
                    </div>
                  </div>

                  <hr className="border-slate-150 dark:border-slate-800" />

                  <div className="flex flex-col gap-1 text-[11px]">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verdicts</span>
                    <div>Role applied: <span className="font-semibold">{selectedJob.title}</span></div>
                    <div>Status: <span className="font-semibold text-yellow-500 capitalize">{c.status}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: POST A JOB */}
      {activeSubTab === 'post-job' && (
        <div className="glass-panel p-8 rounded-3xl max-w-3xl mx-auto shadow-md">
          <h2 className="text-md font-bold mb-6">Create New Job Posting</h2>
          {formSuccess ? (
            <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
              <Check className="w-10 h-10 text-emerald-500 bg-emerald-100 p-2 rounded-full" />
              <h3 className="text-sm font-bold">Opening Created Successfully!</h3>
              <p className="text-xs text-slate-400">Loading your updated jobs grid...</p>
            </div>
          ) : (
            <form onSubmit={handlePostJob} className="grid md:grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-500">Job Title</label>
                <input
                  type="text"
                  required
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-500">Company Name</label>
                <input
                  type="text"
                  required
                  value={newJob.company}
                  onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                  placeholder="e.g. CloudTech Systems"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-500">Location</label>
                <input
                  type="text"
                  value={newJob.location}
                  onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                  placeholder="e.g. Remote (US/Canada)"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-500">Salary Range</label>
                <input
                  type="text"
                  value={newJob.salaryRange}
                  onChange={(e) => setNewJob({ ...newJob, salaryRange: e.target.value })}
                  placeholder="e.g. $120,000 - $145,000"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="font-bold text-slate-500">Core Job Description</label>
                <textarea
                  required
                  rows={4}
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder="Summarize the core roles, project architecture, and day-to-day items."
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="font-bold text-slate-500">Key Requirements (One item per line)</label>
                <textarea
                  rows={3}
                  value={newJob.requirements}
                  onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                  placeholder="e.g.&#10;3+ years React experience&#10;Deploying microservices on Docker"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="font-bold text-slate-500">Keywords / Skills Required (Comma separated)</label>
                <input
                  type="text"
                  value={newJob.skillsRequired}
                  onChange={(e) => setNewJob({ ...newJob, skillsRequired: e.target.value })}
                  placeholder="React, Node.js, MongoDB, AWS, Git"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-transparent text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <button
                type="submit"
                disabled={formPosting}
                className="md:col-span-2 py-3 mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {formPosting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Publish Opening'
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* RENDER VIEW: RECRUITER ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="flex flex-col gap-6">
          {/* Stats count cards */}
          <div className="grid md:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-3xl text-center">
              <span className="text-3xl font-extrabold text-indigo-500">{stats.total}</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Total Applicants</p>
            </div>
            <div className="glass-panel p-6 rounded-3xl text-center">
              <span className="text-3xl font-extrabold text-emerald-500">{stats.shortlisted}</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Shortlisted</p>
            </div>
            <div className="glass-panel p-6 rounded-3xl text-center">
              <span className="text-3xl font-extrabold text-rose-500">{stats.rejected}</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Rejected</p>
            </div>
            <div className="glass-panel p-6 rounded-3xl text-center">
              <span className="text-3xl font-extrabold text-yellow-500">{stats.pending}</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Pending Review</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4">
              <h2 className="text-sm font-bold">Applications Status Share</h2>
              <div className="h-60 w-full">
                {stats.pieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No application logs.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4">
              <h2 className="text-sm font-bold">Submission Volume by Job</h2>
              <div className="h-60 w-full">
                {myJobs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No active postings.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.barData}>
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8' }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="applicants" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: SETTINGS */}
      {activeSubTab === 'settings' && (
        <ProfileSettingsPanel />
      )}
    </div>
  );
}
