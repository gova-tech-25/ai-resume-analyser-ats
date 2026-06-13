import React, { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import ProfileSettingsPanel from '../components/ProfileSettingsPanel';
import { 
  Upload, FileText, CheckCircle, Lightbulb, 
  ArrowRight, RefreshCw, Briefcase, History, Compass, Award, ExternalLink,
  Trash2, AlertTriangle, HelpCircle, Settings
} from 'lucide-react';
import { 
  ResponsiveContainer, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';

export default function StudentDashboard({ tab = 'resumes' }) {
  const { activeUser, activeRole, getAuthHeaders } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubTab = searchParams.get('tab') || 'resumes';
  
  const setActiveSubTab = (newTab) => {
    setSearchParams({ tab: newTab });
  };
  
  // State variables
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  
  // Latest scan data
  const [latestResume, setLatestResume] = useState(null);
  const [latestReport, setLatestReport] = useState(null);
  const [providerUsed, setProviderUsed] = useState(null);
  
  // History data
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  
  // Jobs data
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [matchingJob, setMatchingJob] = useState(null);
  const [matchReport, setMatchReport] = useState(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [applications, setApplications] = useState([]);

  // Fetch initial history, jobs, and applications
  useEffect(() => {
    if (activeUser) {
      fetchHistory();
      fetchJobs();
      fetchApplications();
    }
  }, [activeUser, activeSubTab]);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await axios.get('/api/resumes/history', { headers: getAuthHeaders() });
      setHistoryList(res.data);
      if (res.data.length > 0 && !latestResume) {
        setLatestResume(res.data[0].resume);
        setLatestReport(res.data[0].report);
      }
    } catch (err) {
      console.error('Failed to fetch resume history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleClearHistory = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear your resume scan history? This will permanently delete all uploaded resumes and ATS reports from the database and disk."
    );
    if (!confirmed) return;

    try {
      setClearingHistory(true);
      await axios.delete('/api/resumes/history', { headers: getAuthHeaders() });
      
      // Reset local states
      setHistoryList([]);
      setLatestResume(null);
      setLatestReport(null);
      setMatchReport(null);
      setMatchingJob(null);
      
      alert("Scan history cleared successfully!");
    } catch (err) {
      console.error("Failed to clear scan history:", err);
      alert(err.response?.data?.error || "Failed to clear scan history.");
    } finally {
      setClearingHistory(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setJobsLoading(true);
      const res = await axios.get('/api/jobs');
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await axios.get('/api/applications/student', { headers: getAuthHeaders() });
      setApplications(res.data);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    }
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
  const ALLOWED_TYPES = ['pdf', 'docx'];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      setUploadError('Only PDF and DOCX file types are allowed.');
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError(`File too large (${sizeMB}MB). Maximum allowed size is 5MB.`);
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setUploadError('File is empty. Please select a valid resume file.');
      setSelectedFile(null);
      return;
    }

    setUploadError('');
    setSelectedFile(file);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    
    try {
      setUploading(true);
      setUploadError('');
      setProviderUsed(null);
      
      const formData = new FormData();
      formData.append('resume', selectedFile);

      const res = await axios.post('/api/resumes/upload', formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });

      setLatestResume(res.data.resume);
      setLatestReport(res.data.report);
      setProviderUsed(res.data.providerUsed || 'local');
      setSelectedFile(null);
      fetchHistory();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to upload resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleJobMatch = async (job) => {
    if (!latestResume) {
      alert('Please upload a resume first.');
      return;
    }
    try {
      setMatchingLoading(true);
      setMatchingJob(job);
      setProviderUsed(null);
      const res = await axios.post('/api/resumes/analyze', {
        resumeId: latestResume._id,
        jobId: job._id
      }, {
        headers: getAuthHeaders()
      });
      setMatchReport(res.data);
      setProviderUsed(res.data.providerUsed || 'local');
    } catch (err) {
      console.error('Match analysis failed:', err);
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleApply = async (jobId) => {
    if (!latestResume) {
      alert('Upload your resume before applying!');
      return;
    }
    try {
      await axios.post('/api/applications/apply', {
        jobId,
        resumeId: latestResume._id
      }, {
        headers: getAuthHeaders()
      });
      alert('Application submitted successfully!');
      setMatchReport(null);
      setMatchingJob(null);
      fetchApplications();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to apply.');
    }
  };

  // Recharts Chart Formatter
  const getRadarData = (report) => {
    if (!report) return [];
    return [
      { subject: 'ATS Score', value: report.atsScore },
      { subject: 'Grammar', value: report.grammarScore },
      { subject: 'Sections', value: report.sectionsScore },
      { subject: 'Skills Density', value: Math.min(100, (report.matchingKeywords?.length || 0) * 15 + 40) }
    ];
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto py-4">
      {/* Sub Tabs Toggle */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('resumes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'resumes'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" /> Scanner & Analyzer
        </button>
        <button
          onClick={() => setActiveSubTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'jobs'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <Compass className="w-4 h-4" /> Match & Browse Jobs
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'history'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" /> Analysis History
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

      {/* RENDER VIEW: RESUME SCANNER & ANALYZER */}
      {activeSubTab === 'resumes' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT: File Upload & Brief History List */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4">
              <h2 className="text-md font-bold">Upload New Resume</h2>
              
              <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    accept=".pdf,.docx"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {selectedFile ? selectedFile.name : 'Select or drag PDF/DOCX file'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {selectedFile
                        ? `${formatFileSize(selectedFile.size)} / 5MB max`
                        : 'Max size: 5MB'
                      }
                    </span>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-[11px] font-semibold dark:bg-rose-950/20 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {uploadError}
                  </div>
                )}

                {selectedFile && (
                  <button
                    type="submit"
                    disabled={uploading}
                    className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing File...
                      </>
                    ) : (
                      'Extract & Audit'
                    )}
                  </button>
                )}
              </form>
            </div>

            {/* Provider Used Badge */}
            {providerUsed && (
              <div className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 text-[11px] font-bold ${
                providerUsed === 'gemini'
                  ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                  : providerUsed === 'openrouter'
                    ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40'
                    : 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}>
                <span className="text-sm">{providerUsed === 'gemini' ? '✨' : providerUsed === 'openrouter' ? '🔄' : '🏠'}</span>
                Analyzed with {providerUsed === 'gemini' ? 'Gemini AI' : providerUsed === 'openrouter' ? 'OpenRouter' : 'Local NLP'}
                {providerUsed === 'local' && (
                  <span className="font-normal opacity-60">(fallback)</span>
                )}
              </div>
            )}

            {/* Quick Summary metrics */}
            {latestReport && (
              <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4 text-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall ATS Grade</h3>
                <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                  {/* Circle SVG */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="54" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="10" fill="transparent" />
                    <circle 
                      cx="64" cy="64" r="54" 
                      className="stroke-indigo-600 dark:stroke-indigo-500" 
                      strokeWidth="10" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 54}
                      strokeDashoffset={2 * Math.PI * 54 * (1 - latestReport.atsScore / 100)}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-3xl font-extrabold">{latestReport.atsScore}%</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Score</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-medium">Grammar</span>
                    <span className="font-extrabold text-indigo-500">{latestReport.grammarScore}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-medium">Sections</span>
                    <span className="font-extrabold text-cyan-500">{latestReport.sectionsScore}%</span>
                  </div>
                </div>
              </div>
            )}

            {historyList.length > 0 && (
              <button
                onClick={handleClearHistory}
                disabled={clearingHistory}
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold transition-all text-xs dark:border-rose-950/40 dark:hover:bg-rose-950/20 dark:text-rose-400 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {clearingHistory ? 'Clearing History...' : 'Clear Scan History'}
              </button>
            )}
          </div>

          {/* RIGHT: Detailed Analysis reports */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {!latestReport ? (
              <div className="glass-panel p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-3">
                <FileText className="w-12 h-12 text-slate-300" />
                <h3 className="text-lg font-bold">No Resume Analyzed Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Upload a PDF or DOCX file using the uploader panel on the left to see your parsing score, keyword gap audits, and bullet optimizations.
                </p>
              </div>
            ) : (
              <>
                {/* Visual Chart Card */}
                <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4">
                  <h2 className="text-md font-bold">Score Audit Metrics</h2>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData(latestReport)}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                        <Radar name="Grade" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Skill Keywords matches */}
                <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4">
                  <h2 className="text-md font-bold">Extracted Keywords & Skills</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {!latestResume?.skills || latestResume.skills.length === 0 ? (
                      <span className="text-xs text-slate-400">No skills parsed automatically.</span>
                    ) : (
                      latestResume.skills.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Suggestions & Recommendations */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Suggested Projects */}
                  <div className="glass-panel p-6 rounded-3xl flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-indigo-500" />
                      <h3 className="text-sm font-bold">Suggested Projects</h3>
                    </div>
                    <ul className="flex flex-col gap-2 text-xs">
                      {latestReport.suggestedProjects.map((p, idx) => (
                        <li key={idx} className="flex gap-2 items-start text-slate-600 dark:text-slate-400">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggested Certifications */}
                  <div className="glass-panel p-6 rounded-3xl flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-cyan-500" />
                      <h3 className="text-sm font-bold">Recommended Certifications</h3>
                    </div>
                    <ul className="flex flex-col gap-2 text-xs">
                      {latestReport.suggestedCertifications.map((c, idx) => (
                        <li key={idx} className="flex gap-2 items-start text-slate-600 dark:text-slate-400">
                          <CheckCircle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Interview Questions */}
                {latestReport.interviewQuestions && latestReport.interviewQuestions.length > 0 && (
                  <div className="glass-panel p-6 rounded-3xl flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-purple-500" />
                      <h3 className="text-sm font-bold">Practice Interview Questions</h3>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Based on your resume and target role</p>
                    <ul className="flex flex-col gap-2.5 text-xs">
                      {latestReport.interviewQuestions.map((q, idx) => (
                        <li key={idx} className="flex gap-2 items-start text-slate-600 dark:text-slate-400 p-3 bg-purple-50/50 dark:bg-purple-950/10 rounded-xl border border-purple-100/50 dark:border-purple-900/20">
                          <span className="w-5 h-5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Bullet Optimization Rewriter */}
                <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4">
                  <h2 className="text-md font-bold">AI Heuristics Bullet Rewriter</h2>
                  <div className="flex flex-col gap-4">
                    {latestReport.improvements.map((imp, idx) => (
                      <div key={idx} className="border border-slate-100 rounded-2xl p-4 dark:border-slate-800 flex flex-col gap-2.5">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Before (Weak & Passive)</span>
                          <p className="text-xs text-slate-500 line-through leading-relaxed">{imp.original}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">After (Strong & Impact-driven)</span>
                          <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">{imp.improved}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">💡 Reason: {imp.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* RENDER VIEW: MATCH & BROWSE JOBS */}
      {activeSubTab === 'jobs' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Job listings */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <h2 className="text-md font-bold px-1">Available Job Openings</h2>
            {jobsLoading ? (
              <div className="text-center py-6 text-xs text-slate-400">Loading jobs...</div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">No active job listings.</div>
            ) : (
              jobs.map((job) => {
                const applied = applications.some(app => app.job && app.job._id === job._id);
                return (
                  <div 
                    key={job._id}
                    className={`glass-panel p-5 rounded-2xl flex flex-col gap-3 transition-all border-l-4 cursor-pointer hover:-translate-y-0.5 ${
                      matchingJob?._id === job._id 
                        ? 'border-l-indigo-600 bg-indigo-50/10' 
                        : 'border-l-transparent'
                    }`}
                    onClick={() => handleJobMatch(job)}
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{job.title}</h3>
                      <span className="text-[10px] text-slate-400 font-semibold">{job.company} &bull; {job.location}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {job.skillsRequired.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 bg-slate-100 rounded dark:bg-slate-800 text-slate-500">
                          {s}
                        </span>
                      ))}
                      {job.skillsRequired.length > 3 && (
                        <span className="text-[9px] text-slate-400 px-1 mt-0.5">+{job.skillsRequired.length - 3} more</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-emerald-500">{job.salaryRange || 'Not Specified'}</span>
                      {applied ? (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full dark:bg-emerald-950/30 dark:text-emerald-400">Applied</span>
                      ) : (
                        <span className="text-[9px] text-indigo-500 font-bold flex items-center gap-1">Analyze Match <ArrowRight className="w-3 h-3" /></span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Similarity Scoring & Application panel */}
          <div className="lg:col-span-2">
            {!matchingJob ? (
              <div className="glass-panel p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-3">
                <Briefcase className="w-12 h-12 text-slate-300" />
                <h3 className="text-lg font-bold">Select Job to Analyze Alignment</h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  Click on one of the job postings on the left. The local AI will compare the job description with your uploaded resume to calculate similarity scores and identify skill gaps.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-md font-bold">{matchingJob.title}</h2>
                      <span className="text-xs text-slate-400 font-semibold">{matchingJob.company} &bull; {matchingJob.location}</span>
                    </div>
                    {!applications.some(app => app.job && app.job._id === matchingJob._id) && (
                      <button 
                        onClick={() => handleApply(matchingJob._id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                      >
                        Apply for Job
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{matchingJob.description}</p>
                </div>

                {matchingLoading ? (
                  <div className="glass-panel p-12 rounded-3xl text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Calculating NLP Semantic similarity vector...
                  </div>
                ) : matchReport ? (
                  <>
                    {/* Similarity score summary card */}
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="glass-panel p-6 rounded-3xl text-center flex flex-col items-center justify-center gap-1">
                        <span className="text-3xl font-extrabold text-indigo-500">{matchReport.atsScore}%</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Semantic Similarity</span>
                      </div>
                      <div className="glass-panel p-6 rounded-3xl text-center flex flex-col items-center justify-center gap-1 md:col-span-2">
                        <div className="text-xs font-bold text-slate-500">Resume Alignment Verdict</div>
                        <p className="text-xs mt-1 leading-relaxed text-slate-600 dark:text-slate-400">
                          {matchReport.atsScore > 75 
                            ? '🎉 High Compatibility! Your experience and skills closely match the requirements.' 
                            : '⚠️ Moderate alignment. Suggest implementing the missing keywords below to raise scoring.'}
                        </p>
                      </div>
                    </div>

                    {/* Matching & Missing keywords */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Matching */}
                      <div className="glass-panel p-6 rounded-3xl flex flex-col gap-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matching Skills ({matchReport.matchingKeywords.length})</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {matchReport.matchingKeywords.length === 0 ? (
                            <span className="text-xs text-slate-400">No direct overlaps detected.</span>
                          ) : (
                            matchReport.matchingKeywords.map((k, i) => (
                              <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30">
                                {k}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Missing */}
                      <div className="glass-panel p-6 rounded-3xl flex flex-col gap-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missing Skills ({matchReport.missingKeywords.length})</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {matchReport.missingKeywords.length === 0 ? (
                            <span className="text-xs text-emerald-500">Perfect match! No missing skills.</span>
                          ) : (
                            matchReport.missingKeywords.map((k, i) => (
                              <span key={i} className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30">
                                {k}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Interview Questions for Job Match */}
                    {matchReport.interviewQuestions && matchReport.interviewQuestions.length > 0 && (
                      <div className="glass-panel p-6 rounded-3xl flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-purple-500" />
                          <h3 className="text-sm font-bold">Practice Interview Questions</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Tailored to this job posting and your resume</p>
                        <ul className="flex flex-col gap-2.5 text-xs">
                          {matchReport.interviewQuestions.map((q, idx) => (
                            <li key={idx} className="flex gap-2 items-start text-slate-600 dark:text-slate-400 p-3 bg-purple-50/50 dark:bg-purple-950/10 rounded-xl border border-purple-100/50 dark:border-purple-900/20">
                              <span className="w-5 h-5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="glass-panel p-6 rounded-3xl text-center text-xs text-slate-400">
                    Upload a resume and select a job to see NLP scoring breakdown.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER VIEW: SCAN HISTORY */}
      {activeSubTab === 'history' && (
        <div className="glass-panel p-6 rounded-3xl flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-md font-bold">Resume Scan History Logs</h2>
            {historyList.length > 0 && (
              <button
                onClick={handleClearHistory}
                disabled={clearingHistory}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-md disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {clearingHistory ? 'Clearing...' : 'Clear Scan History'}
              </button>
            )}
          </div>
          {historyLoading ? (
            <div className="text-center py-12 text-xs text-slate-400">Loading histories...</div>
          ) : historyList.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">No scan logs cached. Upload a resume to create logs.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4">ATS score</th>
                    <th className="py-3 px-4">Skills count</th>
                    <th className="py-3 px-4">Uploaded Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-200">{item.resume.fileName}</td>
                      <td className="py-3 px-4 uppercase font-bold text-slate-400">{item.resume.fileType}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold dark:bg-indigo-950/40 dark:text-indigo-400">
                          {item.report?.atsScore || 0}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{item.resume.skills.length} skills</td>
                      <td className="py-3 px-4 text-slate-400">{new Date(item.resume.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setLatestResume(item.resume);
                            setLatestReport(item.report);
                            setActiveSubTab('resumes');
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 rounded font-semibold transition-colors"
                        >
                          Load Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RENDER VIEW: SETTINGS */}
      {activeSubTab === 'settings' && (
        <ProfileSettingsPanel />
      )}
    </div>
  );
}
