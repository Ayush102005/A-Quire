import React, { useState } from 'react';
import { Home, BookOpen, Video, BrainCircuit, LineChart, Bell, User, Settings as SettingsIcon, Menu, X, Check, AlertCircle, ChevronRight, Lock, Shield, Camera, Smartphone, LogOut, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';

const NAV=[{name:'Dashboard',icon:Home,href:'/dashboard'},{name:'My Courses',icon:BookOpen,href:'/courses'},{name:'Live Lessons',icon:Video,href:'#'},{name:'AI Mentor',icon:BrainCircuit,href:'#'},{name:'Progress',icon:LineChart,href:'/progress'},{name:'Notifications',icon:Bell,href:'/notifications'}];
const SECTIONS=[{id:'profile',label:'Profile',icon:User},{id:'learning',label:'Learning Preferences',icon:BookOpen},{id:'notifications',label:'Notifications',icon:Bell},{id:'privacy',label:'Privacy',icon:Eye},{id:'permissions',label:'Webcam & Mic',icon:Camera},{id:'security',label:'Account Security',icon:Shield}];

function Sidebar({open,onClose}){
  const body=(
    <div className="flex flex-col h-full bg-stone-50 border-r border-stone-200 w-64 p-6">
      <a href="/" className="inline-flex items-center gap-2 mb-10 pl-1"><div className="w-8 h-8 rounded bg-teal-700 text-white flex items-center justify-center font-bold text-base shadow-sm">A</div><span className="font-semibold text-xl tracking-tight text-stone-800">A-Quire</span></a>
      <nav className="space-y-1 flex-1">{NAV.map(({name,icon:Icon,href})=>(<a key={name} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-200/50 hover:text-stone-900 transition-colors"><Icon className="w-4 h-4 text-stone-400"/>{name}</a>))}</nav>
      <div className="pt-6 border-t border-stone-200/60 space-y-1">
        <a href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-white shadow-sm border border-stone-200 text-teal-800"><User className="w-4 h-4 text-teal-700"/>Profile &amp; Settings</a>
      </div>
    </div>
  );
  return(<><div className="hidden lg:flex h-screen sticky top-0 shrink-0">{body}</div>{open&&(<div className="lg:hidden fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm" onClick={onClose}><div className="fixed inset-y-0 left-0 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="relative">{body}<button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:bg-stone-200"><X className="w-4 h-4"/></button></div></div></div>)}</>);
}

function Field({label,hint,error,children}){
  return(<div className="space-y-1.5"><label className="block text-sm font-medium text-stone-700">{label}</label>{children}{hint&&!error&&<p className="text-xs text-stone-400">{hint}</p>}{error&&<p className="flex items-center gap-1 text-xs text-red-600 font-medium" role="alert"><AlertCircle className="w-3.5 h-3.5 shrink-0"/>{error}</p>}</div>);
}

function Input({error,...props}){
  return(<input className={`w-full px-3.5 py-2.5 border rounded-xl text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:ring-2 bg-white ${error?'border-red-400 focus:ring-red-400/20':'border-stone-200 hover:border-stone-300 focus:border-teal-600 focus:ring-teal-600/10'}`} {...props}/>);
}

function Toggle({checked,onChange,label,desc}){
  return(<div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-stone-800">{label}</p>{desc&&<p className="text-xs text-stone-400 mt-0.5">{desc}</p>}</div><button type="button" role="switch" aria-checked={checked} onClick={()=>onChange(!checked)} className={`relative w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${checked?'bg-teal-600':'bg-stone-200'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked?'left-5':'left-1'}`}/></button></div>);
}

function SectionCard({title,desc,children,saveState,onSave}){
  return(<div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden"><div className="px-6 py-5 border-b border-stone-100"><h2 className="text-base font-semibold text-stone-900">{title}</h2>{desc&&<p className="text-xs text-stone-500 mt-0.5">{desc}</p>}</div><div className="px-6 py-5 space-y-5">{children}</div>{onSave&&(<div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-4"><div>{saveState==='saved'&&<span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5"/>Saved</span>}{saveState==='error'&&<span className="flex items-center gap-1.5 text-xs font-semibold text-red-600"><AlertCircle className="w-3.5 h-3.5"/>Fix errors above</span>}</div><button onClick={onSave} className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">Save changes</button></div>)}</div>);
}

function WarningBox({children}){
  return(<div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/><div className="text-xs text-amber-800 leading-relaxed">{children}</div></div>);
}

function InfoBox({children}){
  return(<div className="flex items-start gap-3 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3"><Shield className="w-4 h-4 text-teal-600 shrink-0 mt-0.5"/><div className="text-xs text-teal-800 leading-relaxed">{children}</div></div>);
}

function DangerBox({children}){
  return(<div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3"><AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/><div className="text-xs text-red-800 leading-relaxed">{children}</div></div>);
}

export default function SettingsPage(){
  const [mobileOpen,setMobileOpen]=useState(false);
  const [activeSection,setActiveSection]=useState('profile');
  const [mobileNavOpen,setMobileNavOpen]=useState(false);

  // Profile
  const [profile,setProfile]=useState({name:'Ayush Singh',email:'ayush@iit.edu',institution:'IIT Delhi',bio:''});
  const [profileSave,setProfileSave]=useState(null);
  const [profileErrors,setProfileErrors]=useState({});

  // Learning
  const [learning,setLearning]=useState({dailyGoal:60,pace:'Balanced',helpStyle:'Intervene automatically',reminder:'Daily nudge'});
  const [learnSave,setLearnSave]=useState(null);

  // Notifications
  const [notifs,setNotifs]=useState({aiFollowUp:true,courseUpdates:true,reminders:true,announcements:false,weeklyDigest:true});
  const [notifSave,setNotifSave]=useState(null);

  // Privacy
  const [privacy,setPrivacy]=useState({sessionHistory:true,shareProgress:false,analyticsConsent:true});
  const [privacySave,setPrivacySave]=useState(null);

  // Permissions
  const [perms,setPerms]=useState({webcam:true,mic:false});

  // Security
  const [showPw,setShowPw]=useState(false);
  const [pw,setPw]=useState({current:'',next:'',confirm:''});
  const [pwSave,setPwSave]=useState(null);
  const [pwError,setPwError]=useState('');

  const SESSIONS=[{device:'Chrome on Windows',location:'New Delhi, IN',time:'Active now',current:true},{device:'Safari on iPhone',location:'Mumbai, IN',time:'2 days ago',current:false}];

  function saveProfile(){
    const e={};
    if(!profile.name.trim())e.name='Name is required.';
    if(!profile.email.includes('@'))e.email='Enter a valid email.';
    if(Object.keys(e).length){setProfileErrors(e);setProfileSave('error');return;}
    setProfileErrors({});setProfileSave('saved');setTimeout(()=>setProfileSave(null),3000);
  }
  function saveLearn(){setLearnSave('saved');setTimeout(()=>setLearnSave(null),3000);}
  function saveNotifs(){setNotifSave('saved');setTimeout(()=>setNotifSave(null),3000);}
  function savePrivacy(){setPrivacySave('saved');setTimeout(()=>setPrivacySave(null),3000);}
  function savePw(){
    if(!pw.current){setPwError('Enter your current password.');return;}
    if(pw.next.length<8){setPwError('New password must be at least 8 characters.');return;}
    if(pw.next!==pw.confirm){setPwError('Passwords do not match.');return;}
    setPwError('');setPwSave('saved');setPw({current:'',next:'',confirm:''});setTimeout(()=>setPwSave(null),3000);
  }

  const PACE=['Relaxed','Balanced','Intensive'];
  const HELP=['Always ask me','Intervene automatically','Only on long pauses'];
  const REMIND=['None','Daily nudge','Weekly digest'];

  function Pills({options,value,onChange}){
    return(<div className="flex flex-wrap gap-2">{options.map(o=>(<button key={o} type="button" onClick={()=>onChange(o)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${value===o?'bg-teal-700 text-white border-teal-700':'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}>{o}</button>))}</div>);
  }

  const sections={
    profile:(
      <SectionCard title="Profile" desc="Your public identity on A-Quire" saveState={profileSave} onSave={saveProfile}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-teal-100 border-2 border-teal-200 flex items-center justify-center shrink-0"><span className="text-xl font-bold text-teal-800">AS</span></div>
          <div><p className="text-sm font-semibold text-stone-800">{profile.name}</p><p className="text-xs text-stone-500">{profile.email}</p><button className="text-xs text-teal-700 hover:underline font-medium mt-1">Change avatar</button></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" error={profileErrors.name}><Input value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} error={profileErrors.name} placeholder="Your full name"/></Field>
          <Field label="Email address" error={profileErrors.email}><Input type="email" value={profile.email} onChange={e=>setProfile(p=>({...p,email:e.target.value}))} error={profileErrors.email} placeholder="you@institution.edu"/></Field>
          <Field label="Institution" hint="Where you study or work"><Input value={profile.institution} onChange={e=>setProfile(p=>({...p,institution:e.target.value}))} placeholder="e.g. IIT Delhi"/></Field>
          <Field label="Short bio" hint="Optional — visible to instructors"><Input value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))} placeholder="Tell us a bit about yourself"/></Field>
        </div>
      </SectionCard>
    ),
    learning:(
      <SectionCard title="Learning Preferences" desc="Controls how A-Quire adapts to your study style" saveState={learnSave} onSave={saveLearn}>
        <Field label="Daily study goal"><div className="flex items-center gap-4"><input type="range" min={15} max={180} step={15} value={learning.dailyGoal} onChange={e=>setLearning(p=>({...p,dailyGoal:+e.target.value}))} className="flex-1 accent-teal-600"/><span className="text-sm font-semibold text-teal-700 w-20 text-right">{learning.dailyGoal} min/day</span></div></Field>
        <Field label="Study pace"><Pills options={PACE} value={learning.pace} onChange={v=>setLearning(p=>({...p,pace:v}))}/></Field>
        <Field label="AI help style" hint="When should the mentor step in?"><Pills options={HELP} value={learning.helpStyle} onChange={v=>setLearning(p=>({...p,helpStyle:v}))}/></Field>
        <Field label="Study reminders"><Pills options={REMIND} value={learning.reminder} onChange={v=>setLearning(p=>({...p,reminder:v}))}/></Field>
      </SectionCard>
    ),
    notifications:(
      <SectionCard title="Notifications" desc="Choose what A-Quire notifies you about" saveState={notifSave} onSave={saveNotifs}>
        <div className="space-y-4">
          <Toggle checked={notifs.aiFollowUp} onChange={v=>setNotifs(p=>({...p,aiFollowUp:v}))} label="AI Mentor follow-ups" desc="Explanations and summaries after sessions"/>
          <Toggle checked={notifs.courseUpdates} onChange={v=>setNotifs(p=>({...p,courseUpdates:v}))} label="Course updates" desc="New lessons, instructor announcements"/>
          <Toggle checked={notifs.reminders} onChange={v=>setNotifs(p=>({...p,reminders:v}))} label="Daily study reminders" desc="Nudges to meet your daily goal"/>
          <Toggle checked={notifs.announcements} onChange={v=>setNotifs(p=>({...p,announcements:v}))} label="Platform announcements" desc="Product updates and new features"/>
          <Toggle checked={notifs.weeklyDigest} onChange={v=>setNotifs(p=>({...p,weeklyDigest:v}))} label="Weekly progress digest" desc="Summary of your week sent every Sunday"/>
        </div>
      </SectionCard>
    ),
    privacy:(
      <SectionCard title="Privacy" desc="Control how your data is used and shared" saveState={privacySave} onSave={savePrivacy}>
        <InfoBox>Your data is never sold. Webcam footage is processed locally and never stored. All data is encrypted in transit and at rest.</InfoBox>
        <div className="space-y-4">
          <Toggle checked={privacy.sessionHistory} onChange={v=>setPrivacy(p=>({...p,sessionHistory:v}))} label="Store session history" desc="Allows your AI mentor to reference past sessions for personalisation"/>
          <Toggle checked={privacy.shareProgress} onChange={v=>setPrivacy(p=>({...p,shareProgress:v}))} label="Share progress with instructor" desc="Instructors can view your lesson progress and weak areas"/>
          <Toggle checked={privacy.analyticsConsent} onChange={v=>setPrivacy(p=>({...p,analyticsConsent:v}))} label="Help improve A-Quire" desc="Share anonymised usage data to improve features"/>
        </div>
        <div className="pt-2 border-t border-stone-100">
          <button className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">Request data deletion</button>
        </div>
      </SectionCard>
    ),
    permissions:(
      <SectionCard title="Webcam & Microphone" desc="Device access for live learning sessions">
        <InfoBox>Webcam access is only requested when a live lesson begins. Footage is never recorded, stored, or transmitted to any server. All processing runs locally in your browser.</InfoBox>
        <div className="space-y-4">
          <div className={`flex items-start justify-between gap-4 p-4 rounded-xl border ${perms.webcam?'border-teal-200 bg-teal-50/40':'border-stone-200 bg-stone-50'}`}>
            <div><p className="text-sm font-semibold text-stone-800">Webcam</p><p className="text-xs text-stone-500 mt-0.5">Used to detect focus and struggle patterns during lessons</p>{perms.webcam&&<p className="text-xs text-teal-600 font-semibold mt-1 flex items-center gap-1"><Check className="w-3 h-3"/>Access granted</p>}</div>
            <button onClick={()=>setPerms(p=>({...p,webcam:!p.webcam}))} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${perms.webcam?'border-red-200 text-red-600 bg-red-50 hover:bg-red-100':'border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100'}`}>{perms.webcam?'Revoke':'Grant'}</button>
          </div>
          <div className={`flex items-start justify-between gap-4 p-4 rounded-xl border ${perms.mic?'border-teal-200 bg-teal-50/40':'border-stone-200 bg-stone-50'}`}>
            <div><p className="text-sm font-semibold text-stone-800">Microphone</p><p className="text-xs text-stone-500 mt-0.5">Only used when you start a voice session with the AI mentor</p>{perms.mic&&<p className="text-xs text-teal-600 font-semibold mt-1 flex items-center gap-1"><Check className="w-3 h-3"/>Access granted</p>}</div>
            <button onClick={()=>setPerms(p=>({...p,mic:!p.mic}))} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${perms.mic?'border-red-200 text-red-600 bg-red-50 hover:bg-red-100':'border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100'}`}>{perms.mic?'Revoke':'Grant'}</button>
          </div>
        </div>
        {(!perms.webcam)&&<WarningBox>Webcam is disabled. The AI mentor cannot detect struggle patterns during lessons. You can still use all other features.</WarningBox>}
      </SectionCard>
    ),
    security:(
      <div className="space-y-4">
        <SectionCard title="Change Password" desc="Use a strong password you don't use elsewhere" saveState={pwSave} onSave={savePw}>
          {pwError&&<p className="flex items-center gap-1.5 text-xs text-red-600 font-medium" role="alert"><AlertCircle className="w-3.5 h-3.5"/>{pwError}</p>}
          <Field label="Current password"><div className="relative"><Input type={showPw?'text':'password'} value={pw.current} onChange={e=>setPw(p=>({...p,current:e.target.value}))} placeholder="••••••••" error={pwError&&!pw.current}/><button type="button" onClick={()=>setShowPw(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">{showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="New password" hint="At least 8 characters"><Input type="password" value={pw.next} onChange={e=>setPw(p=>({...p,next:e.target.value}))} placeholder="New password"/></Field>
            <Field label="Confirm new password"><Input type="password" value={pw.confirm} onChange={e=>setPw(p=>({...p,confirm:e.target.value}))} placeholder="Repeat new password"/></Field>
          </div>
        </SectionCard>

        <SectionCard title="Active Sessions" desc="Devices currently signed into your account">
          <div className="space-y-3">
            {SESSIONS.map((s,i)=>(
              <div key={i} className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border ${s.current?'border-teal-200 bg-teal-50/30':'border-stone-200 bg-stone-50'}`}>
                <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.current?'bg-teal-100':'bg-stone-100'}`}><Smartphone className={`w-4 h-4 ${s.current?'text-teal-600':'text-stone-400'}`}/></div><div><p className="text-sm font-medium text-stone-800">{s.device}</p><p className="text-xs text-stone-400">{s.location} · {s.time}</p></div></div>
                {s.current?<span className="text-[10px] font-bold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">This device</span>:<button className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">Revoke</button>}
              </div>
            ))}
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            <LogOut className="w-3.5 h-3.5"/>Sign out of all devices
          </button>
        </SectionCard>

        <SectionCard title="Danger Zone" desc="Irreversible account actions">
          <DangerBox>Deleting your account permanently removes all data including progress, sessions, and preferences. This cannot be undone.</DangerBox>
          <button className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors border border-red-200 hover:border-red-300 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            Delete my account
          </button>
        </SectionCard>
      </div>
    ),
  };

  return(
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex">
      <Sidebar open={mobileOpen} onClose={()=>setMobileOpen(false)}/>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-stone-50/90 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 text-stone-600 hover:bg-stone-200/50 rounded-lg" onClick={()=>setMobileOpen(true)}><Menu className="w-5 h-5"/></button>
            <div className="hidden sm:block"><p className="text-base font-semibold text-stone-900">Profile &amp; Settings</p><p className="text-xs text-stone-500">Manage your account and preferences</p></div>
          </div>
          <button className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center border border-teal-200"><span className="text-sm font-bold text-teal-800">AS</span></button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">

            {/* Mobile section nav */}
            <div className="lg:hidden mb-4">
              <button onClick={()=>setMobileNavOpen(o=>!o)} className="w-full flex items-center justify-between px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-800 shadow-sm">
                <span className="flex items-center gap-2">{React.createElement(SECTIONS.find(s=>s.id===activeSection)?.icon||User,{className:'w-4 h-4 text-teal-600'})}{SECTIONS.find(s=>s.id===activeSection)?.label}</span>
                <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${mobileNavOpen?'rotate-90':''}`}/>
              </button>
              {mobileNavOpen&&(
                <div className="mt-1 bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
                  {SECTIONS.map(({id,label,icon:Icon})=>(<button key={id} onClick={()=>{setActiveSection(id);setMobileNavOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium border-b border-stone-100 last:border-0 transition-colors ${activeSection===id?'bg-teal-50 text-teal-800':'text-stone-600 hover:bg-stone-50'}`}><Icon className={`w-4 h-4 ${activeSection===id?'text-teal-600':'text-stone-400'}`}/>{label}</button>))}
                </div>
              )}
            </div>

            <div className="flex gap-7">
              {/* Desktop settings nav */}
              <aside className="hidden lg:block w-52 shrink-0">
                <nav className="space-y-1 sticky top-24">
                  {SECTIONS.map(({id,label,icon:Icon})=>(<button key={id} onClick={()=>setActiveSection(id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${activeSection===id?'bg-white shadow-sm border border-stone-200 text-teal-800':'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'}`}><Icon className={`w-4 h-4 ${activeSection===id?'text-teal-600':'text-stone-400'}`}/>{label}</button>))}
                </nav>
              </aside>

              {/* Content area */}
              <div className="flex-1 min-w-0">{sections[activeSection]}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
