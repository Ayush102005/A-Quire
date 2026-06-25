import React,{useState}from'react';
import{Home,BookOpen,Video,BrainCircuit,BarChart2,Bell,Settings,Menu,X,FileText,Download,Share2,ChevronRight,Clock,Users,TrendingUp,AlertTriangle,CheckCircle2,Loader2,Calendar,Filter}from'lucide-react';

const NAV=[{name:'Dashboard',icon:Home,href:'/instructor'},{name:'My Courses',icon:BookOpen,href:'#'},{name:'Live Lessons',icon:Video,href:'#'},{name:'AI Mentor',icon:BrainCircuit,href:'#'},{name:'Analytics',icon:BarChart2,href:'/struggle-analytics'},{name:'Reports',icon:FileText,href:'/reports',active:true},{name:'Notifications',icon:Bell,href:'#'}];
const REPORT_TYPES=[{id:'engagement',label:'Engagement Report',desc:'Attendance, watch time, and interaction rates'},{id:'struggle',label:'Struggle & Recovery',desc:'AI interventions, struggle hotspots, resolution rates'},{id:'outcomes',label:'Learning Outcomes',desc:'Quiz scores, concept mastery, and grade distribution'},{id:'cohort',label:'Cohort Comparison',desc:'Side-by-side comparison across batches or semesters'}];
const COURSES=['Data Structures & Algorithms','Operating Systems','Computer Networks','DBMS'];
const BATCHES=['Fall 2026 – Batch A','Fall 2026 – Batch B','Spring 2026'];
const RECENT=[{id:1,name:'Engagement Report – Fall 2026',type:'engagement',date:'May 16, 2026',status:'ready'},{id:2,name:'Struggle & Recovery – Week 4',type:'struggle',date:'May 12, 2026',status:'ready'},{id:3,name:'Learning Outcomes – Midterm',type:'outcomes',date:'May 8, 2026',status:'ready'},{id:4,name:'Cohort Comparison – Batch A vs B',type:'cohort',date:'Apr 30, 2026',status:'ready'}];
const METRICS=[{label:'Avg Engagement',value:'74%',trend:'+6%',up:true},{label:'AI Interventions',value:'84',trend:'-3',up:false},{label:'Avg Quiz Score',value:'71%',trend:'+9%',up:true},{label:'At-Risk Students',value:'2',trend:'-1',up:true}];
const INSIGHTS=[{type:'positive',text:'Class engagement improved 6% after the interactive Binary Trees lesson segment was introduced.'},{type:'warning',text:'Deadlock Detection has the lowest resolution rate (58%). Consider adding a supplementary worked example.'},{type:'info',text:'Batch A outperforms Batch B by 12 points on average quiz score. Review session attendance patterns.'}];
const TYPE_COLOR={engagement:'bg-teal-100 text-teal-700',struggle:'bg-amber-100 text-amber-700',outcomes:'bg-emerald-100 text-emerald-700',cohort:'bg-violet-100 text-violet-700'};

function Sidebar({open,onClose}){
  const body=(<div className="flex flex-col h-full bg-stone-50 border-r border-stone-200 w-64 p-6"><a href="/" className="inline-flex items-center gap-2 mb-10 pl-1"><div className="w-8 h-8 rounded bg-teal-700 text-white flex items-center justify-center font-bold text-base shadow-sm">A</div><span className="font-semibold text-xl tracking-tight text-stone-800">A-Quire</span></a><nav className="space-y-1 flex-1">{NAV.map(({name,icon:Icon,href,active})=>(<a key={name} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active?'bg-white shadow-sm border border-stone-200 text-teal-800':'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'}`}><Icon className={`w-4 h-4 ${active?'text-teal-700':'text-stone-400'}`}/>{name}</a>))}</nav><div className="pt-6 border-t border-stone-200/60"><button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-200/50 transition-colors"><Settings className="w-4 h-4 text-stone-400"/>Settings</button></div></div>);
  return(<><div className="hidden lg:flex h-screen sticky top-0 shrink-0">{body}</div>{open&&(<div className="lg:hidden fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm" onClick={onClose}><div className="fixed inset-y-0 left-0 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="relative">{body}<button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:bg-stone-200"><X className="w-4 h-4"/></button></div></div></div>)}</>);
}

function Sel({label,options,value,onChange}){
  return(<div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{label}</label><select value={value} onChange={e=>onChange(e.target.value)} className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-800 bg-white outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 transition-all cursor-pointer">{options.map(o=><option key={o}>{o}</option>)}</select></div>);
}

export default function InstructorReports(){
  const[mobileOpen,setMobileOpen]=useState(false);
  const[reportType,setReportType]=useState(null);
  const[course,setCourse]=useState(COURSES[0]);
  const[batch,setBatch]=useState(BATCHES[0]);
  const[from,setFrom]=useState('2026-04-01');
  const[to,setTo]=useState('2026-05-17');
  const[viewState,setViewState]=useState('idle');// idle|loading|generated|exporting
  const[exportType,setExportType]=useState(null);

  function generate(){
    if(!reportType)return;
    setViewState('loading');
    setTimeout(()=>setViewState('generated'),1800);
  }
  function doExport(type){
    setExportType(type);setViewState('exporting');
    setTimeout(()=>{setViewState('generated');setExportType(null);},2000);
  }

  return(
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex">
      <Sidebar open={mobileOpen} onClose={()=>setMobileOpen(false)}/>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <header className="sticky top-0 z-40 bg-stone-50/90 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 h-16 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 text-stone-600 hover:bg-stone-200/50 rounded-lg" onClick={()=>setMobileOpen(true)}><Menu className="w-5 h-5"/></button>
            <div className="hidden sm:block"><p className="text-base font-semibold text-stone-900">Reports</p><p className="text-xs text-stone-500">Generate and export course analytics reports</p></div>
          </div>
          <button className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center border border-violet-200"><span className="text-sm font-bold text-violet-800">AM</span></button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Report builder card */}
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-stone-100">
                <h1 className="text-base font-semibold text-stone-900">Build a Report</h1>
                <p className="text-xs text-stone-500 mt-0.5">Select a report type, apply filters, then generate.</p>
              </div>

              <div className="px-6 py-5 space-y-6">
                {/* Report type grid */}
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Report Type</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {REPORT_TYPES.map(r=>(
                      <button key={r.id} onClick={()=>setReportType(r.id)}
                        className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${reportType===r.id?'border-teal-600 bg-teal-50':'border-stone-200 bg-white hover:border-stone-300'}`}>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${reportType===r.id?'bg-teal-100 text-teal-700':TYPE_COLOR[r.id]}`}>{r.id}</span>
                        <p className={`text-sm font-semibold leading-snug ${reportType===r.id?'text-teal-900':'text-stone-800'}`}>{r.label}</p>
                        <p className={`text-xs leading-relaxed ${reportType===r.id?'text-teal-700':'text-stone-400'}`}>{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filters */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Sel label="Course" options={COURSES} value={course} onChange={setCourse}/>
                  <Sel label="Batch" options={BATCHES} value={batch} onChange={setBatch}/>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-800 bg-white outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 transition-all"/></div>
                  <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-800 bg-white outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 transition-all"/></div>
                </div>

                {/* Generate */}
                <div className="flex items-center gap-4">
                  <button onClick={generate} disabled={!reportType||viewState==='loading'}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${reportType&&viewState!=='loading'?'bg-teal-700 hover:bg-teal-800 text-white hover:shadow-md':'bg-stone-200 text-stone-400 cursor-not-allowed'}`}>
                    {viewState==='loading'?<><Loader2 className="w-4 h-4 animate-spin"/>Generating…</>:<><BarChart2 className="w-4 h-4"/>Generate Report</>}
                  </button>
                  {!reportType&&<p className="text-xs text-stone-400">Select a report type above to continue.</p>}
                </div>
              </div>
            </div>

            {/* Report preview */}
            {viewState==='loading'&&(
              <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-10 flex flex-col items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center"><BarChart2 className="w-6 h-6 text-stone-400"/></div>
                <div className="space-y-2 w-full max-w-xs"><div className="h-4 bg-stone-200 rounded w-2/3 mx-auto"/><div className="h-3 bg-stone-100 rounded w-1/2 mx-auto"/></div>
                <div className="w-full space-y-3 max-w-2xl"><div className="h-3 bg-stone-200 rounded"/><div className="h-3 bg-stone-100 rounded w-5/6"/><div className="h-3 bg-stone-200 rounded w-4/5"/></div>
              </div>
            )}

            {(viewState==='generated'||viewState==='exporting')&&(
              <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Preview header */}
                <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${TYPE_COLOR[reportType]}`}>{REPORT_TYPES.find(r=>r.id===reportType)?.id}</span>
                      <h2 className="text-sm font-semibold text-stone-900">{REPORT_TYPES.find(r=>r.id===reportType)?.label}</h2>
                    </div>
                    <p className="text-xs text-stone-400">{course} · {batch} · {from} to {to}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {['PDF','CSV'].map(t=>(
                      <button key={t} onClick={()=>doExport(t)} disabled={viewState==='exporting'}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${viewState==='exporting'&&exportType===t?'bg-teal-50 border-teal-200 text-teal-700':'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'}`}>
                        {viewState==='exporting'&&exportType===t?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Download className="w-3.5 h-3.5"/>}{t}
                      </button>
                    ))}
                    <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-all">
                      <Share2 className="w-3.5 h-3.5"/>Share
                    </button>
                  </div>
                </div>

                {/* Summary metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-stone-100 border-b border-stone-100">
                  {METRICS.map(m=>(
                    <div key={m.label} className="px-5 py-4">
                      <p className="text-xs font-medium text-stone-400 mb-1">{m.label}</p>
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-semibold text-stone-900 leading-none">{m.value}</p>
                        <span className={`text-xs font-semibold mb-0.5 ${m.up?'text-emerald-600':'text-red-500'}`}>{m.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Key insights */}
                <div className="px-6 py-5 border-b border-stone-100">
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Key Insights</h3>
                  <div className="space-y-2.5">
                    {INSIGHTS.map((ins,i)=>(
                      <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${ins.type==='positive'?'bg-emerald-50 border-emerald-100':ins.type==='warning'?'bg-amber-50 border-amber-100':'bg-stone-50 border-stone-200'}`}>
                        {ins.type==='positive'?<CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/>:ins.type==='warning'?<AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>:<TrendingUp className="w-4 h-4 text-stone-400 shrink-0 mt-0.5"/>}
                        <p className="text-xs text-stone-700 leading-relaxed">{ins.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulated table preview */}
                <div className="px-6 py-5">
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Data Preview</h3>
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50 border-b border-stone-200">
                        <tr>{['Lesson','Engaged Students','Avg Watch Time','Interventions','Resolution Rate'].map(h=>(<th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-stone-500 whitespace-nowrap">{h}</th>))}</tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {[['Binary Trees: Traversal','28 / 32','87%','22','82%'],['Process Scheduling','26 / 32','79%','17','58%'],['TCP/IP Stack','30 / 32','91%','15','73%'],['Big O Notation','24 / 32','71%','19','41%']].map((row,i)=>(
                          <tr key={i} className="hover:bg-stone-50 transition-colors">
                            {row.map((cell,j)=>(<td key={j} className={`px-4 py-3 text-xs ${j===0?'font-medium text-stone-800':'text-stone-600'}`}>{cell}</td>))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-2 text-right">Preview — export for full dataset</p>
                </div>
              </div>
            )}

            {/* Idle empty state */}
            {viewState==='idle'&&(
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-stone-200 rounded-2xl border-dashed">
                <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mb-4"><FileText className="w-6 h-6 text-stone-400"/></div>
                <p className="text-sm font-semibold text-stone-700 mb-1">No report generated yet</p>
                <p className="text-xs text-stone-400 max-w-xs leading-relaxed">Select a report type and apply filters above, then click Generate Report to build your preview.</p>
              </div>
            )}

            {/* Recent reports */}
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-900">Recent Reports</h2>
                <button className="text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors">View all</button>
              </div>
              <div className="divide-y divide-stone-100">
                {RECENT.map(r=>(
                  <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLOR[r.type].split(' ')[0]}`}>
                      <FileText className={`w-4 h-4 ${TYPE_COLOR[r.type].split(' ')[1]}`}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate group-hover:text-teal-800 transition-colors">{r.name}</p>
                      <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3"/>{r.date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Ready</span>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"><Download className="w-3.5 h-3.5"/></button>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors">
                        View<ChevronRight className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
