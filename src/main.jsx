import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import {
  Activity, ArrowUpRight, BookOpen, Brain, CalendarDays, Check, CheckCircle2,
  ChevronLeft, ChevronRight, Circle, Clock3, Flame, Focus, HeartPulse, LogOut,
  Mail, Plus, ShieldCheck, Sparkles, Target, TrendingUp, Wallet, X
} from 'lucide-react'
import './styles.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const areas = [
  { id: 'discipline', label: 'Discipline', icon: Target, color: 'violet', defaultTask: 'Complete my most important task' },
  { id: 'skills', label: 'Skills', icon: BookOpen, color: 'blue', defaultTask: 'Practice a valuable skill' },
  { id: 'income', label: 'Income', icon: Wallet, color: 'green', defaultTask: 'Take one action toward earning' },
  { id: 'fitness', label: 'Fitness', icon: HeartPulse, color: 'orange', defaultTask: 'Move my body or exercise' },
  { id: 'content', label: 'Content', icon: Activity, color: 'pink', defaultTask: 'Create or improve one piece of content' },
  { id: 'focus', label: 'Focus', icon: Brain, color: 'cyan', defaultTask: 'Complete a distraction-free focus block' },
]
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const shiftDate = (iso, amount) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + amount)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const prettyDate = (iso, options = { weekday: 'long', month: 'long', day: 'numeric' }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, options)
const dayNumber = (iso, start) => Math.max(1, Math.min(90, Math.floor((new Date(`${iso}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000) + 1))

function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [startDate, setStartDate] = useState(todayISO())
  const [logs, setLogs] = useState([])
  const [notes, setNotes] = useState('')
  const [minutes, setMinutes] = useState({})
  const [saveState, setSaveState] = useState('')

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !supabase) return
    let active = true
    async function loadData() {
      setSaveState('Loading your notebook…')
      const { data, error } = await supabase.from('daily_logs')
        .select('log_date, category, completed, note, minutes, plan_start')
        .gte('log_date', shiftDate(todayISO(), -89))
        .lte('log_date', todayISO())
        .order('log_date', { ascending: true })
      if (!active) return
      if (error) {
        setSaveState(`Could not load data: ${error.message}`)
        return
      }
      setLogs(data || [])
      const first = (data || []).find(row => row.plan_start)?.plan_start
      if (first) setStartDate(first)
      const todayRows = (data || []).filter(row => row.log_date === selectedDate)
      setNotes(todayRows.find(row => row.note)?.note || '')
      setMinutes(Object.fromEntries(todayRows.map(row => [row.category, row.minutes || 0])))
      setSaveState('')
    }
    loadData()
    return () => { active = false }
  }, [session, selectedDate])

  const todayRows = logs.filter(row => row.log_date === selectedDate)
  const completed = new Set(todayRows.filter(row => row.completed).map(row => row.category))
  const doneCount = completed.size
  const todayPercent = Math.round(doneCount / areas.length * 100)
  const allCompletedDays = useMemo(() => {
    const grouped = {}
    logs.forEach(row => {
      if (!grouped[row.log_date]) grouped[row.log_date] = new Set()
      if (row.completed) grouped[row.log_date].add(row.category)
    })
    return grouped
  }, [logs])
  const last7 = Array.from({ length: 7 }, (_, i) => shiftDate(todayISO(), i - 6))
  const weeklyPercent = Math.round(last7.reduce((sum, date) => sum + (allCompletedDays[date]?.size || 0), 0) / (7 * areas.length) * 100)
  const totalDone = logs.filter(row => row.completed).length
  const currentDay = dayNumber(todayISO(), startDate)
  const planPercent = Math.round(currentDay / 90 * 100)

  const recommendation = useMemo(() => {
    const counts = areas.map(area => ({
      ...area,
      count: logs.filter(row => row.category === area.id && row.completed).length,
      entries: logs.filter(row => row.category === area.id).length,
    }))
    const least = [...counts].sort((a, b) => (a.count / Math.max(1, a.entries)) - (b.count / Math.max(1, b.entries)))[0]
    if (totalDone < 3) return 'Start small: complete just one action today. Showing up matters more than having a perfect day.'
    if (weeklyPercent < 35) return `Make ${least.label.toLowerCase()} easier: reduce the task to a 5-minute version and attach it to a routine you already have.`
    if (weeklyPercent < 70) return 'You are building momentum. Protect one repeatable time slot each day instead of relying on motivation.'
    return 'Good consistency. Keep your current routine and increase difficulty only slightly next week.'
  }, [logs, totalDone, weeklyPercent])

  async function handleAuth(e) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true); setAuthMessage('')
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) setAuthMessage(result.error.message)
    else if (authMode === 'signup' && !result.data.session) setAuthMessage('Account created. Check your email to confirm, then sign in.')
    else setAuthMessage('Welcome to your notebook.')
  }
  async function signOut() { await supabase.auth.signOut(); setLogs([]); setNotes(''); setMinutes({}) }

  async function toggleArea(areaId) {
    if (!session || !supabase) return
    const previous = logs.find(row => row.log_date === selectedDate && row.category === areaId)
    const nextCompleted = !previous?.completed
    const payload = {
      user_id: session.user.id,
      log_date: selectedDate,
      category: areaId,
      completed: nextCompleted,
      note: notes,
      minutes: Number(minutes[areaId] || 0),
      plan_start: startDate,
    }
    setSaveState('Saving…')
    const { data, error } = await supabase.from('daily_logs').upsert(payload, { onConflict: 'user_id,log_date,category' }).select().single()
    if (error) { setSaveState(`Save failed: ${error.message}`); return }
    setLogs(old => [...old.filter(row => !(row.log_date === selectedDate && row.category === areaId)), data])
    setSaveState('Saved securely')
  }

  async function saveNote() {
    if (!session || !supabase) return
    setSaveState('Saving…')
    const rows = areas.map(area => ({
      user_id: session.user.id, log_date: selectedDate, category: area.id,
      completed: completed.has(area.id), note: notes,
      minutes: Number(minutes[area.id] || 0), plan_start: startDate,
    }))
    const { data, error } = await supabase.from('daily_logs').upsert(rows, { onConflict: 'user_id,log_date,category' }).select()
    if (error) { setSaveState(`Save failed: ${error.message}`); return }
    setLogs(old => [...old.filter(row => row.log_date !== selectedDate), ...(data || [])])
    setSaveState('Saved securely')
  }

  if (authLoading) return <div className="loading-screen"><div className="brand-mark">BN</div><p>Opening your notebook…</p></div>
  if (!supabase) return <SetupScreen />
  if (!session) return <AuthScreen {...{ authMode, setAuthMode, email, setEmail, password, setPassword, handleAuth, busy, authMessage }} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">BN</div><div><b>BLACK NOTEBOOK</b><small>THE 90-DAY RESET</small></div></div>
        <div className="side-label">YOUR SYSTEM</div>
        <div className="nav-item active"><Activity size={17}/> Overview</div>
        <div className="nav-item"><CalendarDays size={17}/> Daily tracker <span className="nav-pill">90</span></div>
        <div className="nav-item"><TrendingUp size={17}/> Progress</div>
        <div className="side-label space-top">YOUR FOCUS AREAS</div>
        {areas.map(a => <div className="area-nav" key={a.id}><span className={`dot ${a.color}`}></span>{a.label}</div>)}
        <div className="sidebar-bottom"><div className="privacy-note"><ShieldCheck size={17}/><span><b>Private by design</b><small>Your data is tied to your account.</small></span></div><button className="logout" onClick={signOut}><LogOut size={16}/> Sign out</button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="mobile-brand"><div className="brand-mark">BN</div><b>BLACK NOTEBOOK</b></div><div className="top-date"><span className="status-dot"></span> YOUR PERSONAL SYSTEM <span className="top-divider">/</span> DAY {currentDay} OF 90</div><div className="user-chip"><span className="avatar">{session.user.email?.[0]?.toUpperCase() || 'U'}</span><span>{session.user.email}</span></div></header>
        <section className="welcome-row"><div><div className="eyebrow"><Sparkles size={14}/> SMALL ACTIONS. REAL CHANGE.</div><h1>Build the person<br/><span>you want to become.</span></h1><p className="subhead">A private space to track your actions, see patterns, and keep moving forward.</p></div><div className="day-card"><div className="day-card-top"><span>YOUR 90-DAY JOURNEY</span><Target size={18}/></div><div className="day-number">{String(currentDay).padStart(2,'0')}<span> / 90</span></div><div className="progress-track"><div style={{width:`${planPercent}%`}}/></div><div className="day-card-bottom"><span>Day {currentDay}</span><span>{90-currentDay} days to go</span></div></div></section>

        <section className="stats-grid">
          <Stat icon={CheckCircle2} label="TODAY'S COMPLETION" value={`${todayPercent}%`} sub={`${doneCount} of ${areas.length} actions done`} color="violet"/>
          <Stat icon={CalendarDays} label="7-DAY CONSISTENCY" value={`${weeklyPercent}%`} sub="Across all focus areas" color="green"/>
          <Stat icon={Flame} label="ACTIONS COMPLETED" value={String(totalDone)} sub="Every check-in counts" color="orange"/>
          <Stat icon={Clock3} label="DAY OF YOUR PLAN" value={`${currentDay}/90`} sub="One day at a time" color="blue"/>
        </section>

        <div className="section-heading"><div><div className="eyebrow">THE DAILY PRACTICE</div><h2>Today's actions</h2><p>Consistency over intensity. Check off what you actually did.</p></div><div className="date-switch"><button aria-label="Previous day" onClick={()=>setSelectedDate(d=>shiftDate(d,-1))}><ChevronLeft size={17}/></button><span>{prettyDate(selectedDate)}</span><button aria-label="Next day" disabled={selectedDate>=todayISO()} onClick={()=>setSelectedDate(d=>shiftDate(d,1))}><ChevronRight size={17}/></button></div></div>

        <section className="tracker-grid">
          {areas.map((area, index) => {
            const Icon = area.icon
            const isDone = completed.has(area.id)
            return <article key={area.id} className={`habit-card ${isDone?'is-done':''}`}>
              <div className="habit-card-top"><div className={`habit-icon ${area.color}`}><Icon size={19}/></div><span className="habit-index">0{index+1}</span></div>
              <div className="habit-title-row"><h3>{area.label}</h3>{isDone && <CheckCircle2 size={17} className="done-icon"/>}</div>
              <p>{area.defaultTask}</p>
              <div className="habit-card-bottom"><span className={isDone?'done-label':''}>{isDone?'COMPLETED':'DAILY ACTION'}</span><button className={`check-button ${isDone?'checked':''}`} onClick={()=>toggleArea(area.id)} aria-label={`${isDone?'Uncheck':'Complete'} ${area.label}`}>{isDone?<Check size={18}/>:<Plus size={18}/>}</button></div>
            </article>
          })}
        </section>

        <section className="lower-grid">
          <article className="panel reflection-panel"><div className="panel-heading"><div><div className="eyebrow">THINK. LEARN. ADJUST.</div><h2>Daily reflection</h2></div><BookOpen size={19}/></div><label htmlFor="notes">What went well? What got in the way? What will you do next?</label><textarea id="notes" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Write a few honest lines. No judgment, just information." rows={4}/><div className="panel-footer"><span>{saveState || 'Your reflection is saved to your account when you save.'}</span><button className="primary-button" onClick={saveNote}>Save reflection <ArrowUpRight size={15}/></button></div></article>
          <article className="panel insight-panel"><div className="panel-heading"><div><div className="eyebrow">PATTERN SPOTTED</div><h2>Your next improvement</h2></div><div className="insight-spark"><Sparkles size={17}/></div></div><p className="recommendation">{recommendation}</p><div className="insight-foot"><Brain size={16}/><span>Starter insights use your tracked activity. No paid AI required.</span></div><div className="mini-week">{last7.map(date=>{const n=allCompletedDays[date]?.size||0;return <div className="mini-day" key={date}><div className="mini-bar-bg"><div className="mini-bar" style={{height:`${Math.max(5,n/areas.length*100)}%`}}/></div><span>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{weekday:'short'}).slice(0,2)}</span></div>})}</div></article>
        </section>
        <footer className="footer"><span>BLACK NOTEBOOK <span className="footer-dot">•</span> BUILD YOUR BASELINE</span><span><ShieldCheck size={13}/> PRIVATE TRACKING <span className="footer-dot">•</span> V1.0</span></footer>
      </main>
    </div>
  )
}

function Stat({icon: Icon, label, value, sub, color}) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><div className={`stat-icon ${color}`}><Icon size={17}/></div></div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></article>
}
function AuthScreen(p) {
  return <div className="auth-page"><div className="auth-ambient"></div><div className="auth-card"><div className="brand auth-brand"><div className="brand-mark">BN</div><div><b>BLACK NOTEBOOK</b><small>THE 90-DAY RESET</small></div></div><div className="eyebrow"><Sparkles size={14}/> YOUR NEXT CHAPTER STARTS HERE</div><h1>Become your<br/><span>own proof.</span></h1><p className="auth-description">A quieter, clearer way to build discipline, skills, health, and momentum — one day at a time.</p><form onSubmit={p.handleAuth}><label htmlFor="email">EMAIL ADDRESS</label><div className="input-wrap"><Mail size={17}/><input id="email" type="email" value={p.email} onChange={e=>p.setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></div><label htmlFor="password">PASSWORD</label><input id="password" className="password-input" type="password" value={p.password} onChange={e=>p.setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required autoComplete={p.authMode==='signup'?'new-password':'current-password'}/><button className="auth-submit" disabled={p.busy}>{p.busy?'Please wait…':p.authMode==='signup'?'Create private account':'Sign in'} <ArrowUpRight size={17}/></button></form>{p.authMessage&&<div className="auth-message">{p.authMessage}</div>}<div className="auth-toggle">{p.authMode==='signup'?'Already have an account?':'New to the notebook?'} <button onClick={()=>{p.setAuthMode(p.authMode==='signup'?'signin':'signup')}}>{p.authMode==='signup'?'Sign in':'Create account'}</button></div><div className="auth-security"><ShieldCheck size={16}/><span>Your records are protected by account-level database policies.</span></div></div><div className="auth-side-note">01 / SHOW UP<br/>02 / TRACK HONESTLY<br/>03 / IMPROVE GENTLY</div></div>
}
function SetupScreen() {
  return <div className="setup-page"><div className="auth-card setup-card"><div className="brand"><div className="brand-mark">BN</div><div><b>BLACK NOTEBOOK</b><small>SETUP REQUIRED</small></div></div><h1>Connect your<br/><span>private notebook.</span></h1><p className="auth-description">The frontend is ready. Add your Supabase project URL and public browser key to connect authentication and cloud storage.</p><ol className="setup-steps"><li>Create a Supabase project.</li><li>Run <code>supabase/schema.sql</code> in its SQL Editor.</li><li>Copy <code>.env.example</code> to <code>.env.local</code> and add your project URL and publishable/anon key.</li><li>Run <code>npm install</code>, then <code>npm run dev</code>.</li></ol><p className="setup-warning"><ShieldCheck size={17}/> Never put a Supabase service-role key in frontend code.</p></div></div>
}

createRoot(document.getElementById('root')).render(<App />)
