import React,{useState,useMemo}from'react';
import{Home,Users,BookOpen,BarChart2,Settings,Bell,Menu,X,Search,ChevronLeft,ChevronRight,MoreHorizontal,Filter,Trash2,UserCheck,UserX,Download,Shield,Mail,Clock,Building,CheckSquare,Square,AlertTriangle,CheckCircle2,XCircle,Loader2,ChevronDown}from'lucide-react';

const NAV=[{name:'Dashboard',icon:Home,href:'/admin'},{name:'Users',icon:Users,href:'/users',active:true},{name:'Courses',icon:BookOpen,href:'#'},{name:'Analytics',icon:BarChart2,href:'#'},{name:'Notifications',icon:Bell,href:'#'},{name:'Settings',icon:Settings,href:'#'}];

const STATUS_S={active:'bg-emerald-50 text-emerald-700 border-emerald-200',inactive:'bg-stone-100 text-stone-500 border-stone-200',suspended:'bg-red-50 text-red-600 border-red-200',pending:'bg-amber-50 text-amber-600 border-amber-200'};
const ROLE_S={Student:'bg-teal-50 text-teal-700 border-teal-200',Instructor:'bg-violet-50 text-violet-700 border-violet-200',Admin:'bg-amber-50 text-amber-700 border-amber-200'};

const USERS=[
  {id:1,name:'Ayush Singh',email:'ayush@iit.edu',role:'Student',institution:'IIT Delhi',status:'active',lastActive:'2 hours ago',joined:'Mar 2026',courses:4},
  {id:2,name:'Prof. Alan Mehta',email:'alan@iit.edu',role:'Instructor',institution:'IIT Delhi',status:'active',lastActive:'1 day ago',joined:'Jan 2026',courses:3},
  {id:3,name:'Riya Sharma',email:'riya@bits.edu',role:'Student',institution:'BITS Pilani',status:'active',lastActive:'3 hours ago',joined:'Feb 2026',courses:5},
  {id:4,name:'Dev Kapoor',email:'dev@iit.edu',role:'Student',institution:'IIT Delhi',status:'suspended',lastActive:'5 days ago',joined:'Mar 2026',courses:2},
  {id:5,name:'Dr. Neha Gupta',email:'neha@iim.edu',role:'Instructor',institution:'IIM Ahmedabad',status:'active',lastActive:'30 min ago',joined:'Dec 2025',courses:2},
  {id:6,name:'Arjun Mehta',email:'arjun@iit.edu',role:'Student',institution:'IIT Delhi',status:'inactive',lastActive:'2 weeks ago',joined:'Mar 2026',courses:3},
  {id:7,name:'Sneha Rao',email:'sneha@nit.edu',role:'Student',institution:'NIT Trichy',status:'pending',lastActive:'Never',joined:'May 2026',courses:0},
  {id:8,name:'Vijay Sharma',email:'vijay@iit.edu',role:'Instructor',institution:'IIT Bombay',status:'active',lastActive:'4 hours ago',joined:'Nov 2025',courses:4},
  {id:9,name:'Priya Nair',email:'priya@amrita.edu',role:'Student',institution:'Amrita University',status:'active',lastActive:'1 hour ago',joined:'Apr 2026',courses:6},
  {id:10,name:'Admin User',email:'admin@aquire.io',role:'Admin',institution:'A-Quire',status:'active',lastActive:'Active now',joined:'Oct 2025',courses:0},
];

const PAGE_SIZE=8;

function Sidebar({open,onClose}){
  const b=(<div className="flex flex-col h-full sidebar-dark w-64 p-5"><a href="/" className="inline-flex items-center gap-2 mb-10 pl-1"><div className="w-8 h-8 rounded bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-sm">A</div><span className="font-semibold text-xl tracking-tight text-[var(--text)]">A-Quire</span></a><nav className="space-y-1 flex-1">{NAV.map(({name,icon:Icon,href,active})=>(<a key={name} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active?'bg-white/10 text-[var(--sidebar-active-text)]':'text-[var(--sidebar-text)] hover:bg-white/5 hover:text-stone-200'}`}><Icon className={`w-4 h-4 ${active?'text-amber-400':'text-stone-500'}`}/>{name}</a>))}</nav><div className="pt-5 border-t border-[var(--sidebar-border)]"><div className="flex items-center gap-2.5 px-2"><div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-xs font-bold text-white">SA</div><div><p className="text-xs font-semibold text-[var(--text)]">Super Admin</p><p className="text-[10px] text-[var(--sidebar-text)]">admin@aquire.io</p></div></div></div></div>);
  return(<><div className="hidden lg:flex h-screen sticky top-0 shrink-0">{b}</div><div className={`lg:hidden fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm transition-opacity duration-300 ${open?'opacity-100 pointer-events-auto':'opacity-0 pointer-events-none'}`} onClick={onClose}><div className={`fixed inset-y-0 left-0 shadow-2xl transition-transform duration-300 ${open?'translate-x-0':'-translate-x-full'}`} onClick={e=>e.stopPropagation()}><div className="relative h-full">{b}<button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:bg-white/10"><X className="w-4 h-4"/></button></div></div></div></>);
}

function Badge({label,style}){return<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${style}`}>{label}</span>;}

function Drawer({user,onClose,onAction}){
  if(!user)return null;
  return(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm animate-page-enter" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col overflow-y-auto animate-drawer-enter">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-stone-900">User Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"><X className="w-4 h-4"/></button>
        </div>
        <div className="px-6 py-6 space-y-6 flex-1">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-teal-100 border-2 border-teal-200 flex items-center justify-center text-xl font-bold text-teal-800 shrink-0">{user.name.split(' ').map(n=>n[0]).join('')}</div>
            <div><p className="text-base font-semibold text-stone-900">{user.name}</p><p className="text-sm text-stone-500">{user.email}</p><div className="flex items-center gap-2 mt-1.5"><Badge label={user.role} style={ROLE_S[user.role]}/><Badge label={user.status} style={STATUS_S[user.status]}/></div></div>
          </div>
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            {[['Institution',user.institution,Building],['Joined',user.joined,Clock],['Last Active',user.lastActive,Clock],['Courses',user.courses,BookOpen]].map(([l,v,Icon])=>(
              <div key={l} className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3.5 h-3.5 text-stone-400"/><p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{l}</p></div>
                <p className="text-sm font-semibold text-stone-800">{v}</p>
              </div>
            ))}
          </div>
          {/* Actions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Actions</p>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"><Mail className="w-4 h-4 text-stone-400"/>Send Message</button>
            {user.status!=='suspended'
              ?<button onClick={()=>onAction('suspend',user)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"><UserX className="w-4 h-4 text-amber-500"/>Suspend Account</button>
              :<button onClick={()=>onAction('activate',user)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"><UserCheck className="w-4 h-4 text-emerald-500"/>Reactivate Account</button>
            }
            <button onClick={()=>onAction('delete',user)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4 text-red-400"/>Delete User</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement(){
  const[mobileOpen,setMobileOpen]=useState(false);
  const[query,setQuery]=useState('');
  const[roleF,setRoleF]=useState('All');
  const[statusF,setStatusF]=useState('All');
  const[selected,setSelected]=useState(new Set());
  const[drawer,setDrawer]=useState(null);
  const[viewState,setViewState]=useState('full');
  const[page,setPage]=useState(1);
  const[users,setUsers]=useState(USERS);

  const filtered=useMemo(()=>{
    let d=[...users];
    if(query)d=d.filter(u=>u.name.toLowerCase().includes(query.toLowerCase())||u.email.toLowerCase().includes(query.toLowerCase()));
    if(roleF!=='All')d=d.filter(u=>u.role===roleF);
    if(statusF!=='All')d=d.filter(u=>u.status===statusF);
    return d;
  },[users,query,roleF,statusF]);

  const pageCount=Math.ceil(filtered.length/PAGE_SIZE);
  const paged=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  function toggleRow(id){setSelected(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});}
  function toggleAll(){setSelected(s=>s.size===paged.length?new Set():new Set(paged.map(u=>u.id)));}

  function handleAction(type,user){
    if(type==='suspend')setUsers(u=>u.map(x=>x.id===user.id?{...x,status:'suspended'}:x));
    if(type==='activate')setUsers(u=>u.map(x=>x.id===user.id?{...x,status:'active'}:x));
    if(type==='delete'){setUsers(u=>u.filter(x=>x.id!==user.id));setDrawer(null);}
    if(drawer)setDrawer(prev=>prev?{...prev,...users.find(u=>u.id===prev.id)||{}}:null);
  }

  function bulkAction(type){
    if(type==='suspend')setUsers(u=>u.map(x=>selected.has(x.id)?{...x,status:'suspended'}:x));
    if(type==='activate')setUsers(u=>u.map(x=>selected.has(x.id)?{...x,status:'active'}:x));
    if(type==='delete'){setUsers(u=>u.filter(x=>!selected.has(x.id)));setSelected(new Set());}
  }

  const FSelect=({label,options,value,onChange})=>(
    <div className="relative"><select value={value} onChange={e=>onChange(e.target.value)} className="appearance-none pl-3.5 pr-8 py-2 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 bg-white outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all cursor-pointer shadow-sm">{['All',...options].map(o=><option key={o}>{o==='All'?`All ${label}s`:o}</option>)}</select><ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none"/></div>
  );

  return(
    <div className="min-h-screen app-bg font-sans flex">
      <Sidebar open={mobileOpen} onClose={()=>setMobileOpen(false)}/>
      {drawer&&<Drawer user={drawer} onClose={()=>setDrawer(null)} onAction={handleAction}/>}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-40 app-header backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 text-stone-600 hover:bg-stone-200/50 rounded-lg" onClick={()=>setMobileOpen(true)}><Menu className="w-5 h-5"/></button>
            <div className="hidden sm:block"><p className="text-base font-semibold text-[var(--text)]">User Management</p><p className="text-xs text-[var(--text-muted)]">{users.length} total users</p></div>
          </div>
          <div className="flex items-center gap-2">
            {['full','loading','empty'].map(s=>(<button key={s} onClick={()=>setViewState(s)} className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize border transition-colors hidden sm:inline-flex ${viewState===s?'bg-amber-100 text-amber-800 border-amber-200':'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}>{s}</button>))}
            <button className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200 ml-1"><span className="text-sm font-bold text-amber-800">SA</span></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"/>
                <input type="text" placeholder="Search by name or email…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl text-sm bg-white outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all placeholder:text-stone-400 shadow-sm"/>
                {query&&<button onClick={()=>setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"><X className="w-3.5 h-3.5"/></button>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <FSelect label="Role" options={['Student','Instructor','Admin']} value={roleF} onChange={v=>{setRoleF(v);setPage(1);}}/>
                <FSelect label="Status" options={['active','inactive','suspended','pending']} value={statusF} onChange={v=>{setStatusF(v);setPage(1);}}/>
                <button className="flex items-center gap-1.5 px-3.5 py-2 border border-stone-200 rounded-xl text-xs font-semibold text-stone-600 bg-white hover:bg-stone-50 shadow-sm transition-all"><Download className="w-3.5 h-3.5"/>Export</button>
              </div>
            </div>

            {/* Bulk action bar */}
            {selected.size>0&&(
              <div className="flex items-center gap-3 px-4 py-2.5 bg-teal-50 border border-teal-200 rounded-xl">
                <span className="text-xs font-semibold text-teal-700">{selected.size} selected</span>
                <div className="flex items-center gap-2 ml-2">
                  <button onClick={()=>bulkAction('activate')} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"><UserCheck className="w-3.5 h-3.5"/>Activate</button>
                  <span className="text-stone-300">·</span>
                  <button onClick={()=>bulkAction('suspend')} className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"><UserX className="w-3.5 h-3.5"/>Suspend</button>
                  <span className="text-stone-300">·</span>
                  <button onClick={()=>bulkAction('delete')} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"><Trash2 className="w-3.5 h-3.5"/>Delete</button>
                </div>
                <button onClick={()=>setSelected(new Set())} className="ml-auto text-xs text-stone-400 hover:text-stone-600"><X className="w-3.5 h-3.5"/></button>
              </div>
            )}

            {/* Table card */}
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

              {/* Loading */}
              {viewState==='loading'&&(
                <div className="divide-y divide-stone-100 animate-pulse">
                  <div className="h-11 bg-stone-50"/>
                  {Array.from({length:6}).map((_,i)=><div key={i} className="flex items-center gap-4 px-5 py-4"><div className="w-4 h-4 bg-stone-200 rounded"/><div className="w-8 h-8 bg-stone-200 rounded-full"/><div className="flex-1 space-y-1.5"><div className="h-3 bg-stone-200 rounded w-1/3"/><div className="h-2.5 bg-stone-100 rounded w-1/4"/></div><div className="h-5 bg-stone-100 rounded-full w-16"/><div className="h-5 bg-stone-100 rounded-full w-16"/><div className="h-3 bg-stone-100 rounded w-20"/><div className="h-3 bg-stone-100 rounded w-16"/></div>)}
                </div>
              )}

              {/* Empty */}
              {(viewState==='empty'||(viewState==='full'&&filtered.length===0))&&(
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mb-4"><Users className="w-6 h-6 text-stone-400"/></div>
                  <p className="text-sm font-semibold text-stone-700 mb-1">{query?'No users found':'No users yet'}</p>
                  <p className="text-xs text-stone-400 max-w-xs leading-relaxed">{query?`No results for "${query}". Try a different name or email.`:'Users will appear here once they register.'}</p>
                </div>
              )}

              {/* Full table */}
              {viewState==='full'&&filtered.length>0&&(
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[860px]">
                    <thead className="bg-stone-50 border-b border-stone-200">
                      <tr>
                        <th className="w-10 pl-5 pr-2 py-3"><button onClick={toggleAll}>{selected.size===paged.length&&paged.length>0?<CheckSquare className="w-4 h-4 text-teal-600"/>:<Square className="w-4 h-4 text-stone-400"/>}</button></th>
                        {['Name','Role','Institution','Status','Last Active',''].map(h=><th key={h} className="text-left px-3 py-3 text-xs font-semibold text-stone-500 whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {paged.map(u=>{
                        const isSel=selected.has(u.id);
                        return(
                          <tr key={u.id} className={`transition-colors ${isSel?'bg-teal-50/40':'hover:bg-stone-50'}`}>
                            <td className="pl-5 pr-2 py-3.5"><button onClick={()=>toggleRow(u.id)}>{isSel?<CheckSquare className="w-4 h-4 text-teal-600"/>:<Square className="w-4 h-4 text-stone-300 hover:text-stone-500"/>}</button></td>
                            <td className="px-3 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600 shrink-0">{u.name.split(' ').map(n=>n[0]).join('')}</div>
                                <div><p className="text-sm font-medium text-stone-900 leading-tight">{u.name}</p><p className="text-xs text-stone-400">{u.email}</p></div>
                              </div>
                            </td>
                            <td className="px-3 py-3.5"><Badge label={u.role} style={ROLE_S[u.role]}/></td>
                            <td className="px-3 py-3.5 text-xs text-stone-600 max-w-[140px] truncate">{u.institution}</td>
                            <td className="px-3 py-3.5"><Badge label={u.status} style={STATUS_S[u.status]}/></td>
                            <td className="px-3 py-3.5 text-xs text-stone-400 whitespace-nowrap">{u.lastActive}</td>
                            <td className="px-3 py-3.5 text-right pr-5">
                              <button onClick={()=>setDrawer(u)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><MoreHorizontal className="w-4 h-4"/></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {viewState==='full'&&filtered.length>0&&(
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-stone-100 bg-stone-50/50">
                  <p className="text-xs text-stone-400 font-medium">Showing {Math.min((page-1)*PAGE_SIZE+1,filtered.length)}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</p>
                  <div className="flex items-center gap-1.5">
                    <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"><ChevronLeft className="w-3.5 h-3.5"/></button>
                    {Array.from({length:pageCount}).map((_,i)=><button key={i} onClick={()=>setPage(i+1)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${page===i+1?'bg-teal-600 text-white':'border border-stone-200 text-stone-600 hover:bg-stone-100'}`}>{i+1}</button>)}
                    <button disabled={page===pageCount} onClick={()=>setPage(p=>p+1)} className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"><ChevronRight className="w-3.5 h-3.5"/></button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
