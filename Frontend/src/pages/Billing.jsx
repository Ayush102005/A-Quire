import React,{useState}from'react';
import { useNavigate } from 'react-router-dom';
import{Home,Users,BookOpen,BarChart2,Settings,Bell,Menu,X,CreditCard,Building,AlertTriangle,CheckCircle2,ChevronRight,Download,Plus,Edit2,Shield,Loader2,ChevronDown,Mail,Phone,Globe,LogOut}from'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { api } from '../services/api';
const NAV=[{name:'Dashboard',icon:Home,href:'/admin'},{name:'Users',icon:Users,href:'/users'},{name:'Courses',icon:BookOpen,href:'#'},{name:'Analytics',icon:BarChart2,href:'#'},{name:'Billing',icon:CreditCard,href:'/billing',active:true},{name:'Settings',icon:Settings,href:'#'}];

const INVOICES=[
  {id:'INV-2026-05',date:'May 1, 2026',amount:'₹48,000',status:'paid',desc:'Enterprise Plan – May 2026'},
  {id:'INV-2026-04',date:'Apr 1, 2026',amount:'₹48,000',status:'paid',desc:'Enterprise Plan – Apr 2026'},
  {id:'INV-2026-03',date:'Mar 1, 2026',amount:'₹48,000',status:'paid',desc:'Enterprise Plan – Mar 2026'},
  {id:'INV-2026-02',date:'Feb 1, 2026',amount:'₹42,000',status:'paid',desc:'Growth Plan – Feb 2026'},
  {id:'INV-2026-01',date:'Jan 1, 2026',amount:'₹42,000',status:'overdue',desc:'Growth Plan – Jan 2026'},
];

const USAGE=[
  {label:'Active Students',value:148,max:200,warn:160},
  {label:'Active Instructors',value:12,max:20,warn:18},
  {label:'Storage Used',value:34,max:100,unit:'GB',warn:80},
  {label:'AI Mentor Hours',value:412,max:500,unit:'hrs',warn:450},
];

const STATUS_S={paid:'bg-emerald-50 text-emerald-700 border-emerald-200',overdue:'bg-red-50 text-red-600 border-red-200',pending:'bg-amber-50 text-amber-700 border-amber-200'};

function Sidebar({open,onClose}){
  const navigate = useNavigate();
  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };
  const b=(
    <div className="flex flex-col h-full sidebar-dark w-64 p-5">
      <a href="/" className="inline-flex items-center gap-2 mb-10 pl-1">
        <div className="w-8 h-8 rounded bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-sm">A</div>
        <span className="font-semibold text-xl tracking-tight text-[var(--text)]">A-Quire</span>
      </a>
      <nav className="space-y-1 flex-1">
        {NAV.map(({name,icon:Icon,href,active})=>(
          <a key={name} href={href} className={`sidebar-nav-item ${active?'active':''}`}>
            <Icon className="w-4 h-4 shrink-0"/>{name}
          </a>
        ))}
      </nav>
      <div className="pt-5 border-t border-[var(--sidebar-border)] space-y-2">
        <div className="flex items-center gap-2.5 px-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold text-white">SA</div>
          <div>
            <p className="text-xs font-semibold text-[var(--text)]">Super Admin</p>
            <p className="text-[10px] text-[var(--sidebar-text)]">admin@aquire.io</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="truncate">Logout</span>
        </button>
      </div>
    </div>
  );
  return(
    <>
      <div className="hidden lg:flex h-screen sticky top-0 shrink-0">{b}</div>
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open?'opacity-100 pointer-events-auto':'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      >
        <div
          className={`fixed inset-y-0 left-0 shadow-2xl transition-transform duration-300 ${open?'translate-x-0':'-translate-x-full'}`}
          onClick={e=>e.stopPropagation()}
        >
          <div className="relative h-full">{b}
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--sidebar-hover)]">
              <X className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SectionCard({title,desc,action,children}){
  return(
    <div className="app-card overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
          {desc&&<p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>}
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function UsageBar({label,value,max,unit,warn}){
  const pct=Math.round((value/max)*100);
  const near=value>=warn;
  const over=value>=max;
  const bar=over?'bg-red-500':near?'bg-amber-400':'bg-teal-500';
  return(
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[var(--text-muted)]">{label}</span>
        <span className={`font-semibold ${over?'text-red-600':near?'text-amber-600':'text-[var(--text)]'}`}>{value}{unit?` ${unit}`:''} / {max}{unit?` ${unit}`:''}</span>
      </div>
      <div className="h-2 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{width:`${Math.min(pct,100)}%`}}/>
      </div>
      <div className="flex justify-between text-[10px] text-[var(--text-faint)]">
        <span>{pct}% used</span>
        {near&&!over&&<span className="text-amber-600 font-semibold flex items-center gap-0.5"><AlertTriangle className="w-3 h-3"/>Nearing limit</span>}
        {over&&<span className="text-red-600 font-semibold flex items-center gap-0.5"><AlertTriangle className="w-3 h-3"/>Limit reached</span>}
      </div>
    </div>
  );
}

export default function BillingPage(){
  const[mobileOpen,setMobileOpen]=useState(false);
  const[viewState,setViewState]=useState('active');// active|warning|overdue|nopayment|loading
  const[alertEmail,setAlertEmail]=useState(true);
  const[alertThreshold,setAlertThreshold]=useState(80);
  const[showCard,setShowCard]=useState(true);

  const isOverdue=viewState==='overdue';
  const isWarning=viewState==='warning';
  const noPayment=viewState==='nopayment';
  const isLoading=viewState==='loading';

  const seatUsed=isWarning?185:148;
  const seatMax=200;
  const seatPct=Math.round((seatUsed/seatMax)*100);
  const seatNear=seatUsed>=160;

  return(
    <div className="min-h-screen app-bg font-sans flex">
      <Sidebar open={mobileOpen} onClose={()=>setMobileOpen(false)}/>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-40 app-header backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              id="billing-mobile-menu"
              className="lg:hidden p-2 -ml-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
              onClick={()=>setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5"/>
            </button>
            <div className="hidden sm:block">
              <p className="text-base font-semibold text-[var(--text)]">Billing &amp; Institution</p>
              <p className="text-xs text-[var(--text-muted)]">IIT Delhi · Enterprise Plan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {['active','warning','overdue','nopayment','loading'].map(s=>(
              <button
                key={s}
                onClick={()=>setViewState(s)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize border transition-colors hidden sm:inline-flex ${viewState===s?'bg-amber-100 text-amber-800 border-amber-200':'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--surface-2)]'}`}
              >{s}</button>
            ))}
            <ThemeToggle />
            <button className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200 ml-1">
              <span className="text-sm font-bold text-amber-800">SA</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Loading skeleton */}
            {isLoading&&(
              <div className="space-y-6 animate-pulse">
                <div className="grid sm:grid-cols-3 gap-4">{[0,1,2].map(i=><div key={i} className="h-32 bg-[var(--surface-2)] rounded-2xl"/>)}</div>
                <div className="h-48 bg-[var(--surface-2)] rounded-2xl"/>
                <div className="h-64 bg-[var(--surface-2)] rounded-2xl"/>
              </div>
            )}

            {!isLoading&&(<>

              {/* Alerts */}
              {isOverdue&&<div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4"><AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5"/><div><p className="text-sm font-semibold text-red-800">Invoice overdue — action required</p><p className="text-xs text-red-700 mt-0.5 leading-relaxed">Invoice INV-2026-01 (₹42,000) is overdue. Platform access may be suspended in 3 days. <button className="font-semibold underline hover:no-underline">Pay now →</button></p></div></div>}
              {isWarning&&<div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4"><AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"/><div><p className="text-sm font-semibold text-amber-800">Approaching seat limit</p><p className="text-xs text-amber-700 mt-0.5">You've used 185 of 200 student seats. Consider upgrading before enrollment closes.</p></div></div>}
              {noPayment&&<div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4"><CreditCard className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"/><div><p className="text-sm font-semibold text-amber-800">No payment method on file</p><p className="text-xs text-amber-700 mt-0.5">Add a payment method to ensure uninterrupted service when your trial ends on May 31, 2026.</p></div></div>}

              {/* Plan + seat + cycle summary cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                {/* Plan */}
                <div className="app-card p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between"><p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider">Current Plan</p><span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-700">Active</span></div>
                  <div><p className="text-xl font-semibold text-[var(--text)]">Enterprise</p><p className="text-xs text-[var(--text-faint)] mt-0.5">Unlimited AI mentor · Priority support</p></div>
                  <button className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors mt-auto">Manage plan <ChevronRight className="w-3.5 h-3.5"/></button>
                </div>
                {/* Seats */}
                <div className={`app-card p-5 flex flex-col gap-3 ${seatNear?'border-amber-300':''}`}>
                  <div className="flex items-center justify-between"><p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider">Seat Usage</p>{seatNear&&<span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Near limit</span>}</div>
                  <div><p className="text-2xl font-semibold text-[var(--text)]">{seatUsed}<span className="text-base font-normal text-[var(--text-faint)]"> / {seatMax}</span></p><p className="text-xs text-[var(--text-faint)] mt-0.5">Student seats occupied</p></div>
                  <div className="h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${seatNear?'bg-amber-400':'bg-teal-500'}`} style={{width:`${seatPct}%`}}/></div>
                </div>
                {/* Billing cycle */}
                <div className="app-card p-5 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-[var(--text-faint)] uppercase tracking-wider">Billing Cycle</p>
                  <div><p className="text-xl font-semibold text-[var(--text)]">₹48,000</p><p className="text-xs text-[var(--text-faint)] mt-0.5">per month · Annual contract</p></div>
                  <div className="text-xs text-[var(--text-muted)] mt-auto"><span className="font-medium">Next invoice: </span>Jun 1, 2026</div>
                </div>
              </div>

              {/* Usage metrics */}
              <SectionCard title="Usage Metrics" desc="Current billing period · May 1 – May 31, 2026">
                <div className="grid sm:grid-cols-2 gap-6">
                  {USAGE.map(u=><UsageBar key={u.label} {...u} value={isWarning&&u.label==='Active Students'?185:u.value}/>)}
                </div>
              </SectionCard>

              {/* Invoice history */}
              <SectionCard
                title="Invoice History"
                desc="Last 5 invoices"
                action={
                  <button className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                    <Download className="w-3.5 h-3.5"/>Export all
                  </button>
                }
              >
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-xs font-semibold text-[var(--text-faint)] border-b border-[var(--border)]">
                        {['Invoice','Description','Date','Amount','Status',''].map(h=><th key={h} className="text-left pb-3 px-1 font-semibold">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {(isOverdue?INVOICES:INVOICES.filter(i=>i.status!=='overdue')).map(inv=>(
                        <tr key={inv.id} className="hover:bg-[var(--surface-2)] transition-colors">
                          <td className="py-3 px-1 font-mono text-xs text-[var(--text-muted)]">{inv.id}</td>
                          <td className="py-3 px-1 text-xs text-[var(--text)]">{inv.desc}</td>
                          <td className="py-3 px-1 text-xs text-[var(--text-muted)] whitespace-nowrap">{inv.date}</td>
                          <td className="py-3 px-1 font-semibold text-[var(--text)] whitespace-nowrap">{inv.amount}</td>
                          <td className="py-3 px-1"><span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${STATUS_S[inv.status]}`}>{inv.status}</span></td>
                          <td className="py-3 px-1 text-right"><button className="text-xs font-medium text-[var(--text-faint)] hover:text-teal-700 transition-colors flex items-center gap-1 ml-auto"><Download className="w-3 h-3"/>PDF</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              {/* Payment method + alerts side-by-side */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Payment method */}
                <SectionCard title="Payment Method" desc="Used for all future invoices">
                  {noPayment?(
                    <div className="flex flex-col items-center gap-4 py-4 text-center">
                      <div className="w-12 h-12 bg-[var(--surface-2)] rounded-full flex items-center justify-center"><CreditCard className="w-6 h-6 text-[var(--text-faint)]"/></div>
                      <div><p className="text-sm font-semibold text-[var(--text)]">No payment method</p><p className="text-xs text-[var(--text-faint)] mt-0.5">Add a card to ensure uninterrupted access</p></div>
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"><Plus className="w-3.5 h-3.5"/>Add payment method</button>
                    </div>
                  ):(
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl">
                        <div className="w-12 h-8 rounded-lg bg-[var(--text)] flex items-center justify-center shrink-0"><span className="text-[10px] font-bold text-[var(--card-bg)] tracking-widest">VISA</span></div>
                        <div className="flex-1"><p className="text-sm font-semibold text-[var(--text)]">•••• •••• •••• 4242</p><p className="text-xs text-[var(--text-faint)]">Expires 08/2028</p></div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Primary</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1"><Edit2 className="w-3 h-3"/>Update card</button>
                        <span className="text-[var(--border-2)]">·</span>
                        <button className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex items-center gap-1"><Plus className="w-3 h-3"/>Add backup</button>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-faint)]"><Shield className="w-3.5 h-3.5 text-teal-500"/>Secured with 256-bit encryption · PCI DSS compliant</div>
                    </div>
                  )}
                </SectionCard>

                {/* Usage alerts */}
                <SectionCard title="Usage Alerts" desc="Get notified before hitting limits">
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="text-sm font-medium text-[var(--text)]">Email notifications</p><p className="text-xs text-[var(--text-faint)] mt-0.5">Alert billing contacts when usage thresholds are reached</p></div>
                      <button type="button" role="switch" aria-checked={alertEmail} onClick={()=>setAlertEmail(a=>!a)} className={`relative w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${alertEmail?'bg-teal-600':'bg-[var(--border-2)]'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${alertEmail?'left-5':'left-1'}`}/></button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between"><p className="text-sm font-medium text-[var(--text)]">Alert threshold</p><span className="text-sm font-semibold text-teal-700">{alertThreshold}% usage</span></div>
                      <input type="range" min={50} max={95} step={5} value={alertThreshold} onChange={e=>setAlertThreshold(+e.target.value)} className="w-full accent-teal-600"/>
                      <div className="flex justify-between text-[10px] text-[var(--text-faint)]"><span>50%</span><span>95%</span></div>
                    </div>
                    <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl px-3.5 py-2.5 text-xs text-teal-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0"/>Alert set for {alertThreshold}% — emails will go to admin@iit.edu
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Institution profile + admin contacts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <SectionCard
                  title="Institution Profile"
                  desc="Organization details on record"
                  action={<button className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"><Edit2 className="w-3.5 h-3.5"/>Edit</button>}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0"><Building className="w-6 h-6 text-[var(--text-faint)]"/></div>
                      <div><p className="text-base font-semibold text-[var(--text)]">IIT Delhi</p><p className="text-xs text-[var(--text-faint)]">Indian Institute of Technology</p></div>
                    </div>
                    {[['Website','www.iitd.ac.in',Globe],['Admin Email','admin@iit.edu',Mail],['Support Phone','+91 11 2659 1000',Phone]].map(([l,v,Icon])=>(
                      <div key={l} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5 text-[var(--text-faint)]"/></div>
                        <div><p className="text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wider">{l}</p><p className="text-sm font-medium text-[var(--text)]">{v}</p></div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Admin Contacts" desc="People who can manage billing and users">
                  <div className="space-y-3">
                    {[{name:'Dr. Ramesh Kumar',email:'ramesh@iit.edu',role:'Primary Admin'},{name:'Anjali Singh',email:'anjali@iit.edu',role:'Billing Contact'},{name:'IT Department',email:'it-support@iit.edu',role:'Technical Contact'}].map(a=>(
                      <div key={a.email} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-800 shrink-0">{a.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium text-[var(--text)] truncate">{a.name}</p><p className="text-xs text-[var(--text-faint)]">{a.role}</p></div>
                        <button className="text-xs text-[var(--text-faint)] hover:text-teal-700 transition-colors shrink-0"><Mail className="w-3.5 h-3.5"/></button>
                      </div>
                    ))}
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[var(--border-2)] text-xs font-semibold text-[var(--text-muted)] hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50/50 transition-all"><Plus className="w-3.5 h-3.5"/>Add admin contact</button>
                  </div>
                </SectionCard>
              </div>

              {/* Upgrade / CTA */}
              <div className="app-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div><p className="text-sm font-semibold text-[var(--text)]">Need more seats or features?</p><p className="text-xs text-[var(--text-muted)] mt-0.5">Upgrade anytime — changes take effect on your next billing cycle.</p></div>
                <div className="flex items-center gap-3 shrink-0">
                  <button className="px-4 py-2.5 btn-secondary text-xs">Compare plans</button>
                  <button className="px-4 py-2.5 btn-primary text-xs">Upgrade plan</button>
                </div>
              </div>

            </>)}
          </div>
        </main>
      </div>
    </div>
  );
}
