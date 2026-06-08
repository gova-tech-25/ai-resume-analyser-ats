import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { 
  Sparkles, FileText, CheckCircle, Brain, ArrowRight, 
  ShieldCheck, Mail, Phone, MapPin, Menu, X, Sun, Moon, Box,
  User as UserIcon, Settings
} from 'lucide-react';
import ProfileModal from '../components/ProfileModal';

export default function LandingPage() {
  const { theme, toggleTheme, isAuthenticated, activeUser } = useRole();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [is3DMode, setIs3DMode] = useState(() => {
    return localStorage.getItem('atsify-3d') === 'true';
  });

  const toggle3DMode = () => {
    setIs3DMode(prev => {
      const next = !prev;
      localStorage.setItem('atsify-3d', String(next));
      return next;
    });
  };

  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollOffset(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const curveHeight = Math.min(120, 30 + scrollOffset * 0.25);

  const handleMouseMove = (e) => {
    if (!is3DMode) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left; 
    const y = e.clientY - rect.top;  
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const angleX = -(y - yc) / (rect.height / 10);
    const angleY = (x - xc) / (rect.width / 10);
    card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = '';
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqs, setFaqs] = useState([
    {
      q: "How does the AI similarity score work?",
      a: "Our system runs a local Sentence-Transformer NLP model to compute semantic similarity. Instead of matching just words, it converts sentences to multi-dimensional vectors to understand the overall meaning and skills matches.",
      open: false
    },
    {
      q: "Are my uploaded resumes kept private?",
      a: "Yes, absolutely! The platform processes text locally, ensuring resumes and profiles are safely isolated on your local server. We do not transmit metrics to external public LLM APIs.",
      open: false
    },
    {
      q: "Can I test all role dashboards?",
      a: "Yes! You can register accounts for different roles (Student or Recruiter) and sign in to access their custom portals, or log in with our default pre-seeded profiles.",
      open: false
    }
  ]);

  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const toggleFaq = (index) => {
    setFaqs(faqs.map((f, i) => i === index ? { ...f, open: !f.open } : f));
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedMessage = formData.message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      alert('Please fill in all fields.');
      return;
    }

    if (trimmedName.length < 2) {
      alert('Name must be at least 2 characters long.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      alert('Please enter a valid email address.');
      return;
    }

    if (trimmedMessage.length < 10) {
      alert('Message must be at least 10 characters long.');
      return;
    }

    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setFormData({ name: '', email: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Glassy Landing Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-slate-200/50 dark:bg-slate-950/70 dark:border-slate-800/50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-indigo-500 to-cyan-500 p-2 rounded-xl text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-cyan-300">
              ATSify
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#home" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Home</a>
            <a href="#about" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">About</a>
            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Contact</a>
          </nav>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggle3DMode}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                is3DMode 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-400 shadow-sm' 
                  : 'border-slate-200/50 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
              title="Toggle Interactive 3D Mode"
            >
              <Box className={`w-4 h-4 ${is3DMode ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              <span>{is3DMode ? '3D UI' : '2D UI'}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200/50 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all"
              title="Toggle Dark/Light Mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            {isAuthenticated && (
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 rounded-xl border border-slate-200/50 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800/50 dark:hover:bg-indigo-950/20 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 transition-all flex items-center gap-2 shadow-sm"
                title="Manage Profile Settings"
              >
                {activeUser?.profileImage ? (
                  <img src={activeUser.profileImage} alt="Avatar" className="w-5 h-5 rounded-full" />
                ) : (
                  <UserIcon className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-xs font-bold hidden lg:inline">{activeUser?.username}</span>
                <Settings className="w-3.5 h-3.5 text-slate-450 dark:text-slate-400 animate-spin-slow" />
              </button>
            )}
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all text-xs"
            >
              Launch Dashboard
            </Link>
          </div>

          {/* Mobile menu controls */}
          <div className="flex items-center gap-3 md:hidden">
            {isAuthenticated && (
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 rounded-xl border border-slate-200/50 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center shadow-sm"
                title="Manage Profile Settings"
              >
                {activeUser?.profileImage ? (
                  <img src={activeUser.profileImage} alt="Avatar" className="w-4.5 h-4.5 rounded-full" />
                ) : (
                  <UserIcon className="w-4 h-4 text-slate-400" />
                )}
              </button>
            )}
            <button
              onClick={toggle3DMode}
              className={`p-2 rounded-xl border transition-all ${
                is3DMode 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-400 shadow-sm' 
                  : 'border-slate-200/50 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
              title="Toggle Interactive 3D Mode"
            >
              <Box className="w-4 h-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200/50 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200/50 hover:bg-slate-100 dark:border-slate-800/50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-all"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/50 dark:border-slate-800/50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg px-6 py-4 flex flex-col gap-4 animate-in slide-in-from-top duration-200">
            <a href="#home" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700 dark:text-slate-300 py-1 hover:text-indigo-600 dark:hover:text-indigo-400">Home</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700 dark:text-slate-300 py-1 hover:text-indigo-600 dark:hover:text-indigo-400">About</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700 dark:text-slate-300 py-1 hover:text-indigo-600 dark:hover:text-indigo-400">FAQ</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700 dark:text-slate-300 py-1 hover:text-indigo-600 dark:hover:text-indigo-400">Contact</a>
            <button
              onClick={() => {
                toggle3DMode();
                setMobileMenuOpen(false);
              }}
              className={`py-2 px-3 rounded-xl border text-left text-sm font-semibold flex items-center justify-between ${
                is3DMode 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-400' 
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <Box className="w-4 h-4" /> 3D Interactive UI
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {is3DMode ? 'ON' : 'OFF'}
              </span>
            </button>
            {isAuthenticated && (
              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-left text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/50"
              >
                {activeUser?.profileImage ? (
                  <img src={activeUser.profileImage} alt="Avatar" className="w-5 h-5 rounded-full" />
                ) : (
                  <UserIcon className="w-4 h-4 text-slate-400" />
                )}
                <span>Profile Settings ({activeUser?.username})</span>
              </button>
            )}
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md text-xs"
            >
              Launch Dashboard
            </Link>
          </div>
        )}
      </header>

      {/* Full-width curved hero wrapper */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-indigo-50/40 to-indigo-100/10 dark:from-indigo-950/10 dark:to-slate-950 pb-20 md:pb-28">
        {/* Hero Section */}
        <section id="home" className="relative px-6 pt-16 pb-6 md:pt-24 md:pb-12 max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
          {/* Glow overlays */}
          <div className="absolute top-10 left-1/4 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-10 right-1/4 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl -z-10" />

          {is3DMode && (
            <>
              {/* CSS 3D Ambient Shapes */}
              <div className="absolute top-16 left-12 w-16 h-16 border border-indigo-500/30 rounded-xl animate-float-3d -z-10 pointer-events-none" 
                   style={{ transform: 'rotateX(45deg) rotateY(45deg)' }} />
              <div className="absolute bottom-20 right-12 w-20 h-20 border border-cyan-500/30 rounded-2xl animate-float-3d-delayed -z-10 pointer-events-none"
                   style={{ transform: 'rotateX(30deg) rotateY(60deg)' }} />
            </>
          )}

          {/* Glassmorphic Hero Panel */}
          <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`glass-panel p-8 md:p-16 rounded-3xl max-w-4xl w-full flex flex-col items-center gap-6 border border-white/20 dark:border-slate-800/30 relative overflow-hidden backdrop-blur-lg ${
              is3DMode 
                ? 'preserve-3d perspective-1000 shadow-3d-card transition-all duration-200' 
                : 'shadow-xl'
            }`}
          >
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/50 transition-all duration-200 ${
              is3DMode ? 'translate-z-30' : ''
            }`}>
              <Sparkles className="w-3.5 h-3.5" /> 100% Local AI Resume Analyzer
            </span>

            <h1 className={`text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight transition-all duration-200 ${
              is3DMode ? 'translate-z-20' : ''
            }`}>
              Optimize Your Resume For{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">
                ATS Compatibility
              </span>
            </h1>

            <p className={`text-slate-500 dark:text-slate-400 max-w-2xl text-sm md:text-base leading-relaxed transition-all duration-200 ${
              is3DMode ? 'translate-z-10' : ''
            }`}>
              Upload your resume in PDF/DOCX format, get detailed parser insights, extract skills, and run semantic similarity comparisons with target job descriptions instantly.
            </p>

            <div className={`flex flex-col sm:flex-row gap-4 mt-2 w-full justify-center transition-all duration-200 ${
              is3DMode ? 'translate-z-20' : ''
            }`}>
              <Link
                to="/dashboard"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all text-xs md:text-sm"
              >
                Launch Platform Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
              {isAuthenticated ? (
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs md:text-sm text-slate-700 dark:text-slate-200 shadow-md"
                >
                  <Settings className="w-4 h-4 text-indigo-500 animate-spin-slow" /> Profile Management
                </button>
              ) : (
                <a
                  href="#about"
                  className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs md:text-sm text-slate-700 dark:text-slate-200"
                >
                  Explore Features
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Dynamic Curved Divider bottom mask */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none pointer-events-none z-10">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-[40px] md:h-[80px]">
            <path 
              d={`M0,0 Q600,${curveHeight} 1200,0 L1200,120 L0,120 Z`} 
              className="fill-slate-50 dark:fill-slate-950 transition-all duration-75"
            />
          </svg>
        </div>
      </div>

      {/* Features Grid (About) */}
      <section id="about" className="px-6 py-16 max-w-7xl mx-auto border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold">State-of-the-Art Features</h2>
          <p className="text-slate-400 text-sm mt-2">Engineered to optimize your job application success rate.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`glass-panel p-6 rounded-3xl flex flex-col gap-3 cursor-default transition-all duration-200 ${
              is3DMode 
                ? 'preserve-3d perspective-1000 shadow-3d-card' 
                : 'hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10'
            }`}
          >
            <div className={`w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center transition-all duration-200 ${is3DMode ? 'translate-z-30' : ''}`}>
              <FileText className="w-5 h-5" />
            </div>
            <h3 className={`text-lg font-bold transition-all duration-200 ${is3DMode ? 'translate-z-20' : ''}`}>Fast Parsing (PDF/DOCX)</h3>
            <p className={`text-sm text-slate-500 dark:text-slate-400 transition-all duration-200 ${is3DMode ? 'translate-z-10' : ''}`}>
              Extracts text automatically from PDF and DOCX documents and handles structured parser processing.
            </p>
          </div>
          <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`glass-panel p-6 rounded-3xl flex flex-col gap-3 cursor-default transition-all duration-200 ${
              is3DMode 
                ? 'preserve-3d perspective-1000 shadow-3d-card' 
                : 'hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-cyan-500/5 dark:hover:shadow-cyan-500/10'
            }`}
          >
            <div className={`w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center transition-all duration-200 ${is3DMode ? 'translate-z-30' : ''}`}>
              <Brain className="w-5 h-5" />
            </div>
            <h3 className={`text-lg font-bold transition-all duration-200 ${is3DMode ? 'translate-z-20' : ''}`}>Semantic Similarity</h3>
            <p className={`text-sm text-slate-500 dark:text-slate-400 transition-all duration-200 ${is3DMode ? 'translate-z-10' : ''}`}>
              Matches your resume against job specifications using NLP sentence vector models to check overall alignment.
            </p>
          </div>
          <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`glass-panel p-6 rounded-3xl flex flex-col gap-3 cursor-default transition-all duration-200 ${
              is3DMode 
                ? 'preserve-3d perspective-1000 shadow-3d-card' 
                : 'hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-purple-500/5 dark:hover:shadow-purple-500/10'
            }`}
          >
            <div className={`w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center transition-all duration-200 ${is3DMode ? 'translate-z-30' : ''}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className={`text-lg font-bold transition-all duration-200 ${is3DMode ? 'translate-z-20' : ''}`}>Keyword Optimization</h3>
            <p className={`text-sm text-slate-500 dark:text-slate-400 transition-all duration-200 ${is3DMode ? 'translate-z-10' : ''}`}>
              Detects matching keywords and highlights missing skills required to rank higher in recruiter dashboard databases.
            </p>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faq" className="px-6 py-16 max-w-4xl mx-auto border-t border-slate-200/50 dark:border-slate-800/50">
        <h2 className="text-3xl font-extrabold text-center mb-8">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="glass-panel rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full text-left px-6 py-4 flex items-center justify-between font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/35 transition-colors"
              >
                <span>{faq.q}</span>
                <span className="text-lg text-slate-400">{faq.open ? '−' : '+'}</span>
              </button>
              {faq.open && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-900 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="px-6 py-16 max-w-6xl mx-auto border-t border-slate-200/50 dark:border-slate-800/50 grid md:grid-cols-2 gap-12">
        <div className="flex flex-col gap-6 justify-center">
          <h2 className="text-3xl font-extrabold">Connect With Our Team</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Have questions about integrating our local parsing microservice or setting up enterprise similarity checkers for your recruiters? Submit a message and we'll reply shortly.
          </p>
          <div className="flex flex-col gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-indigo-500" /> support@atsify.local</div>
            <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-cyan-500" /> +1 (555) 234-5678</div>
            <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-purple-500" /> San Francisco, Tech District</div>
          </div>
        </div>
        
        {/* Contact Form */}
        <div 
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`glass-panel p-8 rounded-3xl transition-all duration-200 ${
            is3DMode 
              ? 'preserve-3d perspective-1000 shadow-3d-card' 
              : 'shadow-md'
          }`}
        >
          {contactSubmitted ? (
            <div className={`h-full flex flex-col items-center justify-center text-center p-6 gap-3 transition-all duration-200 ${is3DMode ? 'translate-z-20' : ''}`}>
              <CheckCircle className="w-12 h-12 text-emerald-500 animate-bounce" />
              <h3 className="text-lg font-bold">Message Sent!</h3>
              <p className="text-xs text-slate-400">Thanks for reaching out. We will get in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className={`flex flex-col gap-4 transition-all duration-200 ${is3DMode ? 'translate-z-10' : ''}`}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your full name"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500">Message</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we help?"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <button
                type="submit"
                className="py-3 mt-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all shadow-md"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </section>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
}
