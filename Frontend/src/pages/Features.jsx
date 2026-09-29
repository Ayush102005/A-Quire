import React, { useState } from "react";
import { 
  Menu, X, ShieldCheck, CheckCircle2,
  BookOpen, BrainCircuit, Mic, RotateCcw, 
  BarChart3, UserCheck, LayoutDashboard, FileText, Lock
} from "lucide-react";

export default function Features() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen app-bg font-sans">
      
      {/* 1. Top Navigation */}
      <nav className="sticky top-0 z-50 app-header backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-teal-700 text-white flex items-center justify-center font-bold text-lg">A</div>
            <span className="font-semibold text-xl tracking-tight">A-Quire</span>
          </a>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            <a href="/features" className="text-teal-700 transition-colors">Features</a>
            <a href="/#how-it-works" className="hover:text-teal-700 transition-colors">How it Works</a>
            <a href="/#privacy" className="hover:text-teal-700 transition-colors">Privacy</a>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
            <a href="/login" className="text-stone-600 hover:text-teal-700 transition-colors">Log in</a>
            <a href="/demo" className="bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-800 transition-colors shadow-sm">Get Demo</a>
          </div>

          <button 
            className="md:hidden text-stone-600 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-200 px-6 py-4 flex flex-col gap-4">
            <a href="/features" className="text-teal-700 font-medium">Features</a>
            <a href="/#how-it-works" className="text-stone-600 font-medium">How it Works</a>
            <a href="/#privacy" className="text-stone-600 font-medium">Privacy</a>
            <hr className="border-stone-100" />
            <a href="/login" className="text-stone-600 font-medium">Log in</a>
            <a href="/demo" className="bg-teal-700 text-white px-4 py-2 rounded-md text-center font-medium">Get Demo</a>
          </div>
        )}
      </nav>

      <main>
        {/* Hero Section */}
        <section className="bg-white border-b border-stone-200 pt-20 pb-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-stone-900 mb-6">
              Platform Capabilities
            </h1>
            <p className="text-lg md:text-xl text-stone-600 leading-relaxed max-w-3xl mx-auto">
              A-Quire provides an integrated ecosystem for digital learning. From private, real-time student interventions to macroscopic syllabus analytics for administration.
            </p>
          </div>
        </section>

        {/* Features Group: Students */}
        <section className="py-24 max-w-7xl mx-auto px-6 border-b border-stone-200">
          <div className="flex flex-col md:flex-row gap-16">
            <div className="md:w-1/3">
              <div className="sticky top-24">
                <h2 className="text-3xl font-semibold mb-4">For Students</h2>
                <p className="text-stone-600 leading-relaxed mb-6">
                  Tools designed to gently guide learners back to comprehension without bypassing the cognitive effort required to learn.
                </p>
              </div>
            </div>
            <div className="md:w-2/3 grid sm:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm hover:border-teal-200 transition-colors">
                <BrainCircuit className="w-8 h-8 text-teal-700 mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-medium mb-3">Layered Socratic AI</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Avoids giving direct answers. Instead, it asks guiding questions that scale in specificity based on the learner&apos;s current confusion level.
                </p>
              </div>
              <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm hover:border-teal-200 transition-colors">
                <BookOpen className="w-8 h-8 text-teal-700 mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-medium mb-3">Concept Transcripts</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Interactive lecture transcripts dynamically highlight key concepts, allowing instant clicking to review confusing definitions.
                </p>
              </div>
              <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm hover:border-teal-200 transition-colors">
                <RotateCcw className="w-8 h-8 text-teal-700 mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-medium mb-3">Lesson Recovery</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  When a distraction or deep struggle is detected, the video pauses intelligently, prompting a review segment to get the student back on track.
                </p>
              </div>
              <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm hover:border-teal-200 transition-colors">
                <Mic className="w-8 h-8 text-teal-700 mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-medium mb-3">Voice Help</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Optional hands-free conversational learning. Students can verbalize their questions and receive spoken, tutor-like feedback.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Group: Instructors */}
        <section className="py-24 max-w-7xl mx-auto px-6 border-b border-stone-200 bg-stone-50">
          <div className="flex flex-col md:flex-row gap-16">
            <div className="md:w-1/3">
              <div className="sticky top-24">
                <h2 className="text-3xl font-semibold mb-4">For Instructors</h2>
                <p className="text-stone-600 leading-relaxed mb-6">
                  Clear, actionable insights that remove the guesswork from online curriculum effectiveness.
                </p>
              </div>
            </div>
            <div className="md:w-2/3 grid sm:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm hover:border-teal-200 transition-colors">
                <BarChart3 className="w-8 h-8 text-teal-700 mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-medium mb-3">Struggle Analytics</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  View aggregated data showing exactly which timestamps in your lecture frequently trigger student confusion or replays.
                </p>
              </div>
              <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm hover:border-teal-200 transition-colors">
                <UserCheck className="w-8 h-8 text-teal-700 mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-medium mb-3">Progress Tracking</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Monitor individual and cohort progression through material without invasive tracking. Spot at-risk students before the midterm.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Group: Institutions & Admins */}
        <section className="py-24 max-w-7xl mx-auto px-6 pb-32">
          <div className="flex flex-col md:flex-row gap-16">
            <div className="md:w-1/3">
              <div className="sticky top-24">
                <h2 className="text-3xl font-semibold mb-4">For Institutions</h2>
                <p className="text-stone-600 leading-relaxed mb-6">
                  Secure, scalable infrastructure that respects student privacy while generating systemic reporting.
                </p>
              </div>
            </div>
            <div className="md:w-2/3 grid sm:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm hover:border-teal-200 transition-colors">
                <FileText className="w-8 h-8 text-teal-700 mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-medium mb-3">Syllabus Reports</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Generate department-wide recommendations on curriculum effectiveness, highlighting macro trends in student comprehension.
                </p>
              </div>
              <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-sm hover:border-teal-200 transition-colors">
                <LayoutDashboard className="w-8 h-8 text-teal-700 mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-medium mb-3">LMS Integration</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  Plug-and-play compatibility with Canvas, Blackboard, and Moodle. Unified single sign-on (SSO) for administrative management.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Product Workflow */}
        <section className="py-24 bg-white border-y border-stone-200">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold mb-4">The Intervention Workflow</h2>
              <p className="text-stone-600 text-lg">How A-Quire moves a student from confusion back to clarity.</p>
            </div>

            <div className="space-y-12 relative">
              <div className="absolute left-6 top-10 bottom-10 w-px bg-stone-200 md:left-1/2 md:-ml-px"></div>
              
              {[
                {
                  title: "Real-time Detection",
                  desc: "While the student watches a video lecture, local heuristics analyze engagement factors to detect struggle without sending raw video feeds anywhere.",
                  align: "right"
                },
                {
                  title: "Pause & Probe",
                  desc: "The system gently pauses the lecture. The AI Mentor appears and asks a low-stakes, probing question to assess the root cause behind the breakdown in understanding.",
                  align: "left"
                },
                {
                  title: "Socratic Dialogue",
                  desc: "A brief chat or voice interaction occurs. The AI refuses to spoon-feed answers, instead offering hints that require the student to connect concepts together.",
                  align: "right"
                },
                {
                  title: "Knowledge Verification",
                  desc: "Once the concept is clarified, a quick 1-question knowledge check is generated. Passing it resumes the lecture, updating the instructor dashboard.",
                  align: "left"
                }
              ].map((step, i) => (
                <div key={i} className={`relative flex flex-col md:flex-row items-center gap-8 ${step.align === "left" ? "md:flex-row-reverse" : ""}`}>
                  <div className="md:w-1/2 xs:pl-16 md:pl-0 flex flex-col w-full">
                    <div className={`p-8 bg-stone-50 rounded-xl border border-stone-200 ${step.align === "left" ? "md:text-left" : "md:text-right"}`}>
                      <span className="text-teal-700 font-bold text-sm tracking-wider uppercase mb-2 block">Step 0{i + 1}</span>
                      <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                      <p className="text-stone-600 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                  <div className="absolute left-0 md:left-1/2 md:-ml-6 w-12 h-12 rounded-full bg-white border-4 border-stone-50 flex items-center justify-center shadow-sm">
                    <div className="w-4 h-4 rounded-full bg-teal-700"></div>
                  </div>
                  <div className="hidden md:block w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy & Trust Section */}
        <section className="bg-stone-900 text-stone-50 py-24">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2">
                <div className="w-16 h-16 bg-stone-800 rounded-2xl flex items-center justify-center mb-8 border border-stone-700">
                  <Lock className="w-8 h-8 text-teal-500" />
                </div>
                <h2 className="text-3xl font-semibold mb-6">Zero-Trust Architecture</h2>
                <p className="text-stone-400 leading-relaxed mb-6">
                  Student data should never be a commodity. A-Quire utilizes local processing infrastructure to ensure total privacy.
                </p>
                <ul className="space-y-4">
                  {[
                    "No raw video sent to external servers",
                    "FERPA and COPPA compliant by design",
                    "Anonymized aggregate reporting for admins",
                    "Strict data retention & deletion controls"
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                      <span className="text-stone-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:w-1/2 w-full">
                <div className="bg-stone-800 border border-stone-700 rounded-xl p-8 shadow-xl">
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <div className="text-xs text-stone-400 uppercase tracking-widest font-semibold">Local Compute</div>
                        <div className="text-xs text-teal-400 font-bold">100%</div>
                      </div>
                      <div className="h-2 w-full bg-stone-700 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 w-[100%]"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <div className="text-xs text-stone-400 uppercase tracking-widest font-semibold">Cloud Video Storage</div>
                        <div className="text-xs text-stone-500 font-bold">0%</div>
                      </div>
                      <div className="h-2 w-full bg-stone-700 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 w-[0%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Strip */}
        <section className="py-24 bg-teal-50">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold text-stone-900 mb-6">
              See the platform in action
            </h2>
            <p className="text-lg text-stone-600 mb-10">
              Schedule a technical walk-through or sign up for a pilot program.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/demo" className="w-full sm:w-auto bg-teal-700 text-white px-8 py-3.5 rounded-md hover:bg-teal-800 transition-colors font-medium shadow-sm text-lg">
                Request a Demo
              </a>
              <a href="/signup" className="w-full sm:w-auto px-8 py-3.5 rounded-md border border-stone-300 bg-white text-stone-900 hover:bg-stone-50 transition-colors font-medium text-lg">
                Start Pilot
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
       <footer className="bg-stone-50 py-16 border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded bg-teal-700 text-white flex items-center justify-center font-bold text-lg">A</div>
              <span className="font-semibold text-xl text-stone-900">A-Quire</span>
            </div>
            <p className="text-stone-600 leading-relaxed max-w-sm">
              AI-powered educational infrastructure ensuring no student struggles silently.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-6 text-stone-900">Product</h4>
            <ul className="space-y-4 text-sm text-stone-600">
              <li><a href="/features" className="hover:text-teal-700 transition-colors">Features</a></li>
              <li><a href="/#how-it-works" className="hover:text-teal-700 transition-colors">How it Works</a></li>
              <li><a href="/security" className="hover:text-teal-700 transition-colors">Security</a></li>
              <li><a href="/pricing" className="hover:text-teal-700 transition-colors">Pricing</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-6 text-stone-900">Company</h4>
            <ul className="space-y-4 text-sm text-stone-600">
              <li><a href="/about" className="hover:text-teal-700 transition-colors">About Us</a></li>
              <li><a href="/careers" className="hover:text-teal-700 transition-colors">Careers</a></li>
              <li><a href="/contact" className="hover:text-teal-700 transition-colors">Contact Sales</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-6 text-stone-900">Legal</h4>
            <ul className="space-y-4 text-sm text-stone-600">
              <li><a href="/privacy" className="hover:text-teal-700 transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-teal-700 transition-colors">Terms of Service</a></li>
              <li><a href="/ferpa" className="hover:text-teal-700 transition-colors">FERPA Compliance</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-stone-200 text-sm text-stone-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <span>{`© ${new Date().getFullYear()} A-Quire EdTech. All rights reserved.`}</span>
          <div className="flex gap-6">
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> Locally Processed</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> FERPA Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
