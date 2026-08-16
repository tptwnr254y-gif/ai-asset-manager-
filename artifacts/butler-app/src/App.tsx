import { useEffect, useMemo, useState, createContext, useContext, type ReactNode, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowRight, CalendarDays, Check, ChevronRight, CircleUserRound, Clock3,
  Coffee, Crown, Heart, Home, LogOut, MessageCircle, Moon, Pencil,
  Plus, RotateCcw, Save, Settings, ShieldCheck, Sparkles, Sun, Target, Trash2, Utensils,
  X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

type User = { id: string; name: string; email: string };
type Butler = { id: string; name: string; tagline: string; personality: string; voice: string; image: string | null; accent: string };
type ScheduleItem = { id: string; title: string; time: string; category: string; completed: boolean; date: string };
type LifeLog = { date: string; breakfast: string; lunch: string; dinner: string; sleepHours: number; sleepTime: string; wakeTime: string; condition: number; conditionNote: string };
type Goal = { id: string; title: string; progress: number; target: number; unit: string };
type Memory = { id: string; text: string; createdAt: string };
type ChatMessage = { id: string; role: 'user' | 'butler'; text: string; createdAt: string };
type ResidenceStyle = 'luxury' | 'wallpaper' | 'river' | 'hotel';
type UserData = {
  butlerId: string | null;
  schedule: ScheduleItem[];
  logs: LifeLog[];
  goals: Goal[];
  memories: Memory[];
  chat: ChatMessage[];
  dark: boolean;
  residenceStyle: ResidenceStyle;
};

const BUTLERS: Butler[] = [
  { id: 'noah', name: '노아', tagline: '고요한 항해를 돕는 집사', personality: '차분하고 통찰력 있는 안내자', voice: '낮고 고른 말투', image: null, accent: '청록' },
  { id: 'lumi', name: '루미', tagline: '하루의 빛을 정돈하는 집사', personality: '따뜻하고 섬세한 관찰자', voice: '부드럽고 명료한 말투', image: null, accent: '금빛' },
  { id: 'theo', name: '테오', tagline: '명료한 실행을 설계하는 집사', personality: '단정하고 현실적인 전략가', voice: '짧고 확신 있는 말투', image: null, accent: '자주' },
  { id: 'sera', name: '세라', tagline: '생활의 결을 읽는 집사', personality: '우아하고 세심한 큐레이터', voice: '정중하고 서정적인 말투', image: null, accent: '라일락' },
];

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const formatKoreanDate = (value: string) => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${value}T12:00:00`));
const formatShortDate = (value: string) => new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric' }).format(new Date(`${value}T12:00:00`));
const starterSchedule = (): ScheduleItem[] => [
  { id: 'sample-1', title: '아침 산책 20분', time: '08:00', category: '건강', completed: false, date: today() },
  { id: 'sample-2', title: '주간 기획안 마무리', time: '11:30', category: '집중', completed: false, date: today() },
  { id: 'sample-3', title: '민서와 저녁 약속', time: '19:00', category: '약속', completed: false, date: today() },
];
const starterLog = (): LifeLog => ({ date: today(), breakfast: '그릭요거트와 견과류', lunch: '', dinner: '', sleepHours: 7.2, sleepTime: '23:40', wakeTime: '06:55', condition: 4, conditionNote: '조금 바쁘지만 집중은 잘 되는 날' });
const starterGoals: Goal[] = [
  { id: 'goal-1', title: '아침 산책', progress: 4, target: 7, unit: '회' },
  { id: 'goal-2', title: '책 읽기', progress: 86, target: 120, unit: '분' },
  { id: 'goal-3', title: '물 마시기', progress: 5, target: 8, unit: '잔' },
];
const starterMemories: Memory[] = [
  { id: 'memory-1', text: '오전에는 깊은 집중이 잘 됩니다.', createdAt: now() },
  { id: 'memory-2', text: '저녁 식사는 가볍게 먹는 편을 선호합니다.', createdAt: now() },
];
const starterChat = (name = '집사'): ChatMessage[] => [
  { id: 'welcome', role: 'butler', text: `${name}입니다. 오늘은 어떤 일을 맡겨 볼까요?`, createdAt: now() },
];

type AppContextValue = {
  authReady: boolean; user: User | null; butler: Butler | null; schedule: ScheduleItem[]; logs: LifeLog[]; goals: Goal[]; memories: Memory[]; chat: ChatMessage[];
  dark: boolean; setButler: (butler: Butler) => void; setSchedule: (items: ScheduleItem[]) => void;
  saveLog: (log: LifeLog) => void; setGoals: (goals: Goal[]) => void; setMemories: (memories: Memory[]) => void;
  setChat: (messages: ChatMessage[]) => void; setDark: (value: boolean) => void;
  residenceStyle: ResidenceStyle; setResidenceStyle: (style: ResidenceStyle) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AppContext = createContext<AppContextValue | null>(null);
const queryClient = new QueryClient();
async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || '요청을 처리하지 못했습니다.');
  return body as T;
}

const useApp = () => {
  const value = useContext(AppContext);
  if (!value) throw new Error('앱 상태를 찾을 수 없습니다.');
  return value;
};

function Portrait({ butler, small = false, dark = false }: { butler: Butler; small?: boolean; dark?: boolean }) {
  return <div className={`portrait ${dark ? 'portrait-dark' : ''}`} style={{ width: small ? 42 : 112, height: small ? 42 : 112, fontSize: small ? 14 : 38, fontWeight: 700 }} aria-label={`${butler.name} 집사 초상`}>{butler.name.slice(0, 1)}</div>;
}

function AuthPage() {
  const { signIn, signUp } = useApp();
  const [, setLocation] = useLocation();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !email.includes('@') || !password) {
      setMessage(register ? '이름, 이메일, 비밀번호를 모두 입력해 주세요.' : '이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    if (register && !name.trim()) {
      setMessage('이름을 입력해 주세요.');
      return;
    }
    if (register && password !== passwordConfirm) {
      setMessage('비밀번호가 서로 다릅니다.');
      return;
    }
    setPending(true);
    setMessage('');
    try {
      if (register) await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
      setLocation('/butler');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '인증 중 문제가 발생했습니다.');
    } finally {
      setPending(false);
    }
  };
  return (
    <main className="min-h-[100dvh] grid lg:grid-cols-[1.06fr_.94fr] bg-[hsl(var(--background))]">
      <section className="hero-ink relative overflow-hidden px-7 py-10 sm:px-14 sm:py-14 lg:px-20 lg:py-20 flex flex-col justify-between min-h-[330px] lg:min-h-[100dvh]">
        <div className="relative z-10 flex items-center gap-3"><div className="livi-mark"><Crown size={17} /></div><span className="font-semibold tracking-[.2em] text-xs">LIVI</span></div>
        <div className="relative z-10 max-w-xl mt-16 lg:mt-0">
          <p className="eyebrow text-[hsl(var(--accent))] mb-5">당신의 집에 머무는 개인 집사</p>
          <h1 className="display-font text-5xl sm:text-7xl leading-[.95] font-semibold tracking-[-.04em]">어느 날,<br /><span className="text-[hsl(var(--accent))]">당신의 집에</span><br />네 명의 집사가 찾아왔습니다.</h1>
          <p className="mt-7 max-w-md text-sm leading-7 text-[hsl(39 30% 92% / .7)]">시험 공부 계획 · 일상 · AI 스케줄 관리 · 플래너를 한 공간에서. 호텔 컨시어지처럼 조용하고 정확하게, 당신의 하루를 돌봅니다.</p>
        </div>
        <div className="relative z-10 hidden lg:flex items-center gap-3 text-xs text-[hsl(39 30% 92% / .55)]"><ShieldCheck size={15} /> 기록은 이 기기 안에만 안전하게 보관됩니다.</div>
      </section>
      <section className="flex items-center px-6 py-12 sm:px-14 lg:px-20">
        <div className="w-full max-w-md mx-auto fade-up">
          <div className="mb-10"><p className="eyebrow mb-3">LIVI private residence</p><h2 className="text-3xl font-semibold tracking-tight">{register ? '처음 뵙겠습니다.' : '다시 오셨군요.'}</h2><p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">{register ? '당신만을 위한 집을 열어 보세요.' : '오늘도 당신의 리듬부터 살피겠습니다.'}</p></div>
          <form onSubmit={submit} className="space-y-5">
            {register && <div><label className="label" htmlFor="auth-name">이름</label><input data-testid="input-auth-name" id="auth-name" className="field" value={name} onChange={e => setName(e.target.value)} placeholder="어떻게 불러드릴까요?" autoComplete="name" /></div>}
            <div><label className="label" htmlFor="auth-email">이메일</label><input data-testid="input-auth-email" id="auth-email" type="email" className="field" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일 주소를 입력해 주세요" /></div>
            <div><label className="label" htmlFor="auth-password">비밀번호</label><input data-testid="input-auth-password" id="auth-password" type="password" className="field" value={password} onChange={e => setPassword(e.target.value)} placeholder="8자 이상" autoComplete={register ? 'new-password' : 'current-password'} /></div>
            {register && <div><label className="label" htmlFor="auth-password-confirm">비밀번호 확인</label><input data-testid="input-auth-password-confirm" id="auth-password-confirm" type="password" className="field" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="비밀번호를 한 번 더 입력해 주세요" autoComplete="new-password" /></div>}
            {message && <p data-testid="status-auth-error" className="text-sm text-[hsl(var(--destructive))]">{message}</p>}
            <button data-testid="button-auth-submit" disabled={pending} className="btn-primary w-full flex items-center justify-center gap-2" type="submit">{pending ? '확인 중…' : register ? '공간 열기' : '입장하기'}<ArrowRight size={17} /></button>
          </form>
          <div className="my-8 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]"><span className="h-px bg-[hsl(var(--border))] flex-1" />LIVI private access<span className="h-px bg-[hsl(var(--border))] flex-1" /></div>
          <button data-testid="button-auth-toggle" className="btn-quiet w-full" onClick={() => { setRegister(v => !v); setMessage(''); setPassword(''); setPasswordConfirm(''); }}>{register ? '이미 계정이 있어요' : '처음 시작해 볼게요'}</button>
          <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">계정과 기록은 안전한 서버 세션으로 보호됩니다.</p>
        </div>
      </section>
    </main>
  );
}

function ButlerSelectPage() {
  const { user, butler, setButler } = useApp();
  const [, setLocation] = useLocation();
  if (!user) return null;
  return (
    <main className="min-h-[100dvh] app-frame px-5 py-8 sm:px-10 sm:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-16"><div className="flex items-center gap-3"><div className="livi-mark livi-mark-dark"><Crown size={17} /></div><span className="font-bold tracking-[.18em] text-xs">LIVI</span></div><span className="text-sm text-[hsl(var(--muted-foreground))]">{user.name}님</span></div>
        <div className="max-w-2xl mb-12 fade-up"><p className="eyebrow mb-4">첫 번째 선택</p><h1 className="display-font text-5xl sm:text-7xl font-semibold leading-none tracking-[-.04em]">오늘, 누구에게<br /><span className="text-[hsl(var(--muted-foreground))]">맡겨볼까요?</span></h1><p className="mt-6 text-sm leading-7 text-[hsl(var(--muted-foreground))]">집사는 생활을 대신 결정하지 않습니다. 당신의 방식과 속도를 이해하고, 필요한 순간 가장 알맞은 질문을 건넵니다.</p></div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {BUTLERS.map((item, index) => <button data-testid={`button-select-butler-${item.id}`} key={item.id} onClick={() => { setButler(item); setLocation('/app'); }} className={`surface text-left p-6 min-h-[285px] flex flex-col justify-between group hover:-translate-y-1 transition-transform fade-up delay-${Math.min(index + 1, 3)} ${butler?.id === item.id ? 'ring-2 ring-[hsl(var(--accent))]' : ''}`}>
            <div className="flex items-start justify-between"><Portrait butler={item} /><span className="text-[10px] tracking-[.16em] text-[hsl(var(--muted-foreground))]">0{index + 1}</span></div>
            <div><p className="text-xl font-semibold">{item.name}</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{item.tagline}</p><p className="mt-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{item.personality} · {item.voice}</p></div>
            <div className="mt-5 flex items-center justify-between text-xs font-bold"><span>이 집사와 시작</span><ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></div>
          </button>)}
        </div>
      </div>
    </main>
  );
}

const navItems = [
  { href: '/app', label: '오늘', icon: Home },
  { href: '/app/schedule', label: '일정', icon: CalendarDays },
  { href: '/app/life', label: '생활', icon: Utensils },
  { href: '/app/relationship', label: '관계', icon: Heart },
  { href: '/app/settings', label: '설정', icon: Settings },
];

function AppShell({ children }: { children: ReactNode }) {
  const { user, butler, dark, setDark, logout, residenceStyle } = useApp();
  const [location, setLocation] = useLocation();
  if (!user || !butler) return null;
  const active = (href: string) => href === '/app' ? location === '/app' : location.startsWith(href);
  const hour = new Date().getHours();
  const timeOfDay = hour >= 5 && hour < 11 ? 'morning' : hour >= 11 && hour < 17 ? 'day' : hour >= 17 && hour < 22 ? 'evening' : 'night';
  const room = location === '/app' ? 'living-room' : location.startsWith('/app/schedule') ? 'study' : location.startsWith('/app/life') ? 'dining' : location.startsWith('/app/chat') ? 'lounge' : location.startsWith('/app/relationship') ? 'library' : 'hall';
  return <div className={`app-frame noise livi-residence style-${residenceStyle} time-${timeOfDay} room-${room} min-h-[100dvh] md:grid md:grid-cols-[236px_1fr]`}>
    <aside className="shell-sidebar hidden md:flex flex-col px-5 py-7 sticky top-0 h-[100dvh]">
      <Link href="/app" data-testid="link-brand-home" className="flex items-center gap-3 px-2"><div className="livi-mark livi-mark-dark"><Crown size={17} /></div><span className="font-bold tracking-[.18em] text-xs">LIVI</span></Link>
      <div className="mt-12 px-2 flex items-center gap-3"><Portrait butler={butler} small dark /><div className="min-w-0"><p className="text-sm font-semibold truncate">{butler.name} 집사</p><p className="text-[11px] text-[hsl(39 30% 92% / .55)] truncate">{butler.tagline}</p></div></div>
      <nav className="mt-12 space-y-1">{navItems.map(({ href, label, icon: Icon }) => <Link data-testid={`link-nav-${label}`} key={href} href={href} className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors ${active(href) ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(39 30% 92%/.58)] hover:text-[hsl(var(--sidebar-foreground))]'}`}><Icon size={17} />{label}</Link>)}</nav>
      <Link data-testid="link-nav-chat" href="/app/chat" className={`mt-7 flex items-center gap-3 px-3 py-3 rounded-xl text-sm ${active('/app/chat') ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'text-[hsl(39 30% 92%/.72)] hover:bg-[hsl(var(--sidebar-accent))]'}`}><MessageCircle size={17} />집사에게 묻기</Link>
      <div className="mt-auto space-y-2"><button data-testid="button-theme-toggle" onClick={() => setDark(!dark)} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs text-[hsl(39 30% 92%/.65)] hover:bg-[hsl(var(--sidebar-accent))]">{dark ? <Sun size={16} /> : <Moon size={16} />}{dark ? '밝은 화면으로' : '어두운 화면으로'}</button><button data-testid="button-logout" onClick={() => { logout(); setLocation('/'); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs text-[hsl(39 30% 92%/.65)] hover:bg-[hsl(var(--sidebar-accent))]"><LogOut size={16} />로그아웃</button></div>
    </aside>
    <div className="shell-main min-w-0">
      <header className="h-[72px] px-[18px] md:px-12 flex items-center justify-between border-b border-[hsl(var(--border)/.7)]">
      <div className="md:hidden flex items-center gap-2"><div className="livi-mark livi-mark-dark livi-mark-small"><Crown size={15} /></div><span className="font-bold tracking-[.15em] text-[10px]">LIVI</span></div>
        <div className="hidden md:block text-xs text-[hsl(var(--muted-foreground))]">{formatKoreanDate(today())}</div>
        <div className="flex items-center gap-3"><button data-testid="button-header-theme" className="icon-btn" onClick={() => setDark(!dark)} aria-label="화면 모드 전환">{dark ? <Sun size={16} /> : <Moon size={16} />}</button><div className="hidden sm:flex items-center gap-2 text-sm"><span>{user.name}님</span><CircleUserRound size={19} className="text-[hsl(var(--muted-foreground))]" /></div></div>
      </header>
      <main>{children}</main>
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-30 md:hidden grid grid-cols-6 px-2 py-2">{[...navItems, { href: '/app/chat', label: '대화', icon: MessageCircle }].map(({ href, label, icon: Icon }) => <Link data-testid={`link-mobile-nav-${label}`} key={href} href={href} className={`flex flex-col items-center gap-1 py-1.5 text-[10px] ${active(href) ? 'text-[hsl(var(--primary))] font-bold' : 'text-[hsl(var(--muted-foreground))]'}`}><Icon size={18} />{label}</Link>)}</nav>
    </div>
  </div>;
}

function HomePage() {
  const { user, butler, schedule, logs, goals } = useApp();
  const todayItems = schedule.filter(item => item.date === today()).sort((a, b) => a.time.localeCompare(b.time));
  const log = logs.find(item => item.date === today());
  const completed = todayItems.filter(item => item.completed).length;
  return <AppShell><div className="page-width">
    <div className="flex items-end justify-between gap-4 mb-8 fade-up"><div><p className="eyebrow mb-3">오늘의 장면</p><h1 className="display-font text-5xl sm:text-6xl font-semibold leading-none tracking-[-.04em]">{user?.name}님의 하루</h1><p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">{formatKoreanDate(today())}</p></div><Link data-testid="link-home-chat" href="/app/chat" className="btn-primary hidden sm:flex items-center gap-2">집사에게 말하기 <MessageCircle size={16} /></Link></div>
    <section className="hero-ink relative overflow-hidden rounded-3xl p-6 sm:p-9 flex flex-col sm:flex-row sm:items-center justify-between gap-7 fade-up delay-1"><div className="relative z-10"><p className="text-[hsl(var(--accent))] text-xs font-bold tracking-[.15em] mb-3">{butler?.name}의 아침 메모</p><h2 className="display-font text-3xl sm:text-4xl font-semibold leading-tight">“오늘은 속도를 내기보다<br />리듬을 먼저 찾겠습니다.”</h2><p className="mt-4 text-sm text-[hsl(39 30% 92%/.65)]">{butler?.personality} · {butler?.voice}</p></div><Portrait butler={butler!} dark /></section>
    <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-5 mt-5">
      <section className="surface rounded-3xl p-6 sm:p-7 fade-up delay-2"><div className="flex items-center justify-between mb-6"><div><p className="eyebrow mb-2">오늘의 일정</p><h2 className="text-xl font-semibold">{completed}/{todayItems.length}개를 마쳤어요</h2></div><Link data-testid="link-home-schedule" href="/app/schedule" className="text-xs font-bold flex items-center gap-1">전체 보기 <ChevronRight size={14} /></Link></div>{todayItems.length === 0 ? <EmptyState icon={<CalendarDays size={20} />} title="아직 잡힌 일정이 없습니다" detail="오늘의 작은 약속부터 기록해 보세요." action={<Link href="/app/schedule" className="btn-quiet text-xs">일정 추가</Link>} /> : <div className="space-y-1">{todayItems.slice(0, 4).map(item => <div data-testid={`row-home-schedule-${item.id}`} key={item.id} className="flex items-center gap-3 py-3 border-b border-[hsl(var(--border)/.65)] last:border-0"><div className={`w-2 h-2 rounded-full ${item.completed ? 'bg-[hsl(var(--muted-foreground))]' : 'bg-[hsl(var(--accent))]'}`} /><span className={`text-sm flex-1 ${item.completed ? 'line-through text-[hsl(var(--muted-foreground))]' : ''}`}>{item.title}</span><span className="text-xs text-[hsl(var(--muted-foreground))]">{item.time}</span>{item.completed && <Check size={14} className="text-[hsl(var(--muted-foreground))]" />}</div>)}</div>}</section>
      <section className="surface rounded-3xl p-6 sm:p-7 fade-up delay-3"><div className="flex items-center justify-between"><div><p className="eyebrow mb-2">생활의 온도</p><h2 className="text-xl font-semibold">오늘의 컨디션</h2></div><Link data-testid="link-home-life" href="/app/life" className="icon-btn"><ChevronRight size={16} /></Link></div><div className="mt-7 flex items-end gap-3"><span data-testid="text-condition-score" className="display-font text-6xl font-semibold">{log?.condition || '—'}</span><span className="pb-2 text-sm text-[hsl(var(--muted-foreground))]">/ 5</span></div><div className="progress-track mt-4"><div className="progress-fill" style={{ width: `${(log?.condition || 0) * 20}%` }} /></div><p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{log?.conditionNote || '오늘의 상태를 한 줄로 남겨 보세요.'}</p></section>
    </div>
    <section className="mt-5 grid md:grid-cols-3 gap-5">{goals.slice(0, 3).map(goal => <div data-testid={`card-home-goal-${goal.id}`} key={goal.id} className="surface rounded-3xl p-6"><div className="flex justify-between items-start"><div><p className="eyebrow mb-2">진행 중인 목표</p><h3 className="font-semibold">{goal.title}</h3></div><Target size={19} className="text-[hsl(var(--muted-foreground))]" /></div><div className="mt-6 flex items-baseline gap-1"><span className="display-font text-4xl font-semibold">{goal.progress}</span><span className="text-xs text-[hsl(var(--muted-foreground))]">/ {goal.target}{goal.unit}</span></div><div className="progress-track mt-3"><div className="progress-fill" style={{ width: `${Math.min(100, goal.progress / goal.target * 100)}%` }} /></div></div>)}</section>
  </div></AppShell>;
}

function SchedulePage() {
  const { schedule, setSchedule } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(today());
  const [form, setForm] = useState({ title: '', time: '09:00', category: '개인' });
  const items = schedule.filter(item => item.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const add = (event: FormEvent) => { event.preventDefault(); if (!form.title.trim()) return; setSchedule([...schedule, { id: makeId(), title: form.title.trim(), time: form.time, category: form.category, completed: false, date }]); setForm({ title: '', time: '09:00', category: '개인' }); setShowForm(false); };
  const toggle = (id: string) => setSchedule(schedule.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  const remove = (id: string) => setSchedule(schedule.filter(item => item.id !== id));
  return <AppShell><div className="page-width"><div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-9 fade-up"><div><p className="eyebrow mb-3">시간의 서랍</p><h1 className="display-font text-5xl font-semibold leading-none">일정</h1><p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">해야 할 일보다, 지키고 싶은 약속을 먼저 놓아 주세요.</p></div><button data-testid="button-open-schedule-form" className="btn-primary flex items-center justify-center gap-2" onClick={() => setShowForm(v => !v)}>{showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? '닫기' : '일정 추가'}</button></div>
    {showForm && <form data-testid="form-schedule" onSubmit={add} className="surface rounded-3xl p-5 sm:p-7 mb-5 grid sm:grid-cols-[1fr_140px_140px_auto] gap-3 items-end fade-up"><div><label className="label">무엇을 할까요?</label><input data-testid="input-schedule-title" className="field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="예: 팀과 점심 식사" autoFocus /></div><div><label className="label">시간</label><input data-testid="input-schedule-time" type="time" className="field" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div><div><label className="label">분류</label><select data-testid="select-schedule-category" className="field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option>개인</option><option>집중</option><option>건강</option><option>약속</option></select></div><button data-testid="button-submit-schedule" className="btn-accent h-[48px]" type="submit">저장하기</button></form>}
    <div className="surface rounded-3xl p-5 sm:p-7"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[hsl(var(--border))]"><div><p className="eyebrow mb-2">선택한 하루</p><h2 className="text-lg font-semibold">{formatKoreanDate(date)}</h2></div><input data-testid="input-schedule-date" type="date" className="field max-w-[170px]" value={date} onChange={e => setDate(e.target.value)} /></div>{items.length === 0 ? <EmptyState icon={<CalendarDays size={22} />} title="이 날에는 일정이 비어 있습니다" detail="조금의 여백도 좋은 일정입니다." action={<button className="btn-quiet text-xs" onClick={() => setShowForm(true)}>첫 일정 추가</button>} /> : <div className="divide-y divide-[hsl(var(--border)/.7)]">{items.map(item => <div data-testid={`row-schedule-${item.id}`} key={item.id} className="py-5 flex items-center gap-4"><button data-testid={`button-toggle-schedule-${item.id}`} onClick={() => toggle(item.id)} className={`w-7 h-7 rounded-full border grid place-items-center shrink-0 ${item.completed ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--input))]'}`} aria-label={item.completed ? '일정 미완료로 바꾸기' : '일정 완료하기'}>{item.completed && <Check size={14} />}</button><div className="flex-1 min-w-0"><p className={`font-medium ${item.completed ? 'line-through text-[hsl(var(--muted-foreground))]' : ''}`}>{item.title}</p><div className="flex items-center gap-3 mt-1 text-xs text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1"><Clock3 size={12} />{item.time}</span><span>{item.category}</span></div></div><button data-testid={`button-delete-schedule-${item.id}`} className="icon-btn border-0 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" onClick={() => remove(item.id)} aria-label="일정 삭제"><Trash2 size={16} /></button></div>)}</div>}</div>
  </div></AppShell>;
}

function LifePage() {
  const { logs, saveLog } = useApp();
  const [date, setDate] = useState(today());
  const existing = logs.find(item => item.date === date);
  const [draft, setDraft] = useState<LifeLog>(existing || { ...starterLog(), date });
  useEffect(() => setDraft(existing || { ...starterLog(), date }), [date, existing?.date]);
  const change = (key: keyof LifeLog, value: string | number) => setDraft(prev => ({ ...prev, [key]: value }));
  const save = (event: FormEvent) => { event.preventDefault(); saveLog({ ...draft, date }); };
  return <AppShell><div className="page-width"><div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-9 fade-up"><div><p className="eyebrow mb-3">몸과 마음의 기록</p><h1 className="display-font text-5xl font-semibold leading-none">생활 기록</h1><p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">좋고 나쁨보다, 지금의 상태를 알아차리는 일입니다.</p></div><input data-testid="input-life-date" type="date" className="field max-w-[170px]" value={date} onChange={e => setDate(e.target.value)} /></div>
    <form onSubmit={save} className="grid lg:grid-cols-[1fr_.82fr] gap-5"><div className="surface rounded-3xl p-6 sm:p-8"><div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 rounded-2xl bg-[hsl(var(--secondary))] grid place-items-center"><Utensils size={18} /></div><div><p className="eyebrow">하루의 식탁</p><h2 className="font-semibold mt-1">무엇을 먹었나요?</h2></div></div><div className="space-y-5">{[['breakfast', '아침', '가볍게 시작한 메뉴'], ['lunch', '점심', '한낮에 힘이 된 메뉴'], ['dinner', '저녁', '마무리한 메뉴']].map(([key, label, placeholder]) => <div key={key}><label className="label" htmlFor={`life-${key}`}>{label}</label><div className="relative"><Coffee size={16} className="absolute left-3 top-3.5 text-[hsl(var(--muted-foreground))]" /><input data-testid={`input-life-${key}`} id={`life-${key}`} className="field pl-10" value={String(draft[key as keyof LifeLog] || '')} onChange={e => change(key as keyof LifeLog, e.target.value)} placeholder={placeholder} /></div></div>)}</div></div>
      <div className="space-y-5"><div className="surface rounded-3xl p-6 sm:p-8"><div className="flex items-center gap-3 mb-7"><div className="w-10 h-10 rounded-2xl bg-[hsl(var(--secondary))] grid place-items-center"><Moon size={18} /></div><div><p className="eyebrow">밤의 리듬</p><h2 className="font-semibold mt-1">수면 기록</h2></div></div><div className="grid grid-cols-3 gap-3"><div><label className="label">수면 시간</label><input data-testid="input-life-sleep-hours" type="number" step=".1" min="0" max="24" className="field" value={draft.sleepHours} onChange={e => change('sleepHours', Number(e.target.value))} /></div><div><label className="label">잠든 시각</label><input data-testid="input-life-sleep-time" type="time" className="field" value={draft.sleepTime} onChange={e => change('sleepTime', e.target.value)} /></div><div><label className="label">일어난 시각</label><input data-testid="input-life-wake-time" type="time" className="field" value={draft.wakeTime} onChange={e => change('wakeTime', e.target.value)} /></div></div></div>
        <div className="surface rounded-3xl p-6 sm:p-8"><p className="eyebrow mb-2">지금의 온도</p><h2 className="font-semibold">오늘의 컨디션은 어떤가요?</h2><div className="flex items-center gap-2 mt-5">{[1, 2, 3, 4, 5].map(score => <button data-testid={`button-condition-${score}`} type="button" key={score} onClick={() => change('condition', score)} className={`flex-1 h-10 rounded-xl text-sm font-bold border ${draft.condition === score ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))]'}`}>{score}</button>)}</div><input data-testid="input-life-note" className="field mt-5" value={draft.conditionNote} onChange={e => change('conditionNote', e.target.value)} placeholder="상태를 한 문장으로 남겨 보세요" /></div><button data-testid="button-save-life" type="submit" className="btn-accent w-full flex items-center justify-center gap-2"><Save size={16} />생활 기록 저장</button></div>
    </form>
  </div></AppShell>;
}

function RelationshipPage() {
  const { butler, goals, setGoals } = useApp();
  const [newGoal, setNewGoal] = useState('');
  const addGoal = (event: FormEvent) => { event.preventDefault(); if (!newGoal.trim()) return; setGoals([...goals, { id: makeId(), title: newGoal.trim(), progress: 0, target: 7, unit: '회' }]); setNewGoal(''); };
  const adjust = (id: string, delta: number) => setGoals(goals.map(goal => goal.id === id ? { ...goal, progress: Math.max(0, Math.min(goal.target, goal.progress + delta)) } : goal));
  return <AppShell><div className="page-width"><div className="mb-9 fade-up"><p className="eyebrow mb-3">함께 쌓아가는 이해</p><h1 className="display-font text-5xl font-semibold leading-none">관계</h1><p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">집사와의 관계는 대화의 양보다, 당신을 더 잘 이해하는 방향으로 자랍니다.</p></div>
    <div className="grid lg:grid-cols-[.8fr_1.2fr] gap-5"><section className="hero-ink relative overflow-hidden rounded-3xl p-7 sm:p-9 min-h-[320px] flex flex-col justify-between"><div className="relative z-10 flex items-center gap-4"><Portrait butler={butler!} dark /><div><p className="text-xs tracking-[.15em] text-[hsl(var(--accent))] font-bold">현재의 집사</p><h2 className="display-font text-4xl font-semibold mt-1">{butler?.name}</h2></div></div><div className="relative z-10"><p className="text-lg leading-8">{butler?.tagline}</p><div className="mt-6 flex items-center gap-2 text-xs text-[hsl(39 30% 92%/.62)]"><Heart size={14} className="text-[hsl(var(--accent))]" /> 매일의 선택을 존중하며 돕습니다.</div></div></section>
      <section className="surface rounded-3xl p-6 sm:p-8"><div className="flex justify-between items-start mb-7"><div><p className="eyebrow mb-2">나의 목표</p><h2 className="text-xl font-semibold">작은 진전의 기록</h2></div><Target className="text-[hsl(var(--muted-foreground))]" size={21} /></div><div className="space-y-6">{goals.map(goal => <div data-testid={`row-goal-${goal.id}`} key={goal.id}><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">{goal.title}</span><span className="text-xs text-[hsl(var(--muted-foreground))]">{goal.progress}/{goal.target}{goal.unit}</span></div><div className="flex items-center gap-3"><div className="progress-track flex-1"><div className="progress-fill" style={{ width: `${goal.progress / goal.target * 100}%` }} /></div><button data-testid={`button-decrease-goal-${goal.id}`} className="w-6 h-6 rounded-full border border-[hsl(var(--border))] text-xs" onClick={() => adjust(goal.id, -1)}>−</button><button data-testid={`button-increase-goal-${goal.id}`} className="w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs" onClick={() => adjust(goal.id, 1)}>+</button></div></div>)}</div><form onSubmit={addGoal} className="flex gap-2 mt-8 pt-6 border-t border-[hsl(var(--border))]"><input data-testid="input-new-goal" className="field" value={newGoal} onChange={e => setNewGoal(e.target.value)} placeholder="새 목표를 적어 보세요" /><button data-testid="button-add-goal" className="btn-primary shrink-0 px-4" type="submit"><Plus size={17} /></button></form></section></div>
  </div></AppShell>;
}

function SettingsPage() {
  const { user, butler, dark, setDark, memories, setMemories, residenceStyle, setResidenceStyle } = useApp();
  const [text, setText] = useState('');
  const add = (event: FormEvent) => { event.preventDefault(); if (!text.trim()) return; setMemories([{ id: makeId(), text: text.trim(), createdAt: now() }, ...memories]); setText(''); };
  return <AppShell><div className="page-width"><div className="mb-9 fade-up"><p className="eyebrow mb-3">나만의 서랍</p><h1 className="display-font text-5xl font-semibold leading-none">설정</h1><p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">집사와 나누는 정보와 집 안의 분위기를 관리합니다.</p></div><div className="grid lg:grid-cols-[.75fr_1.25fr] gap-5">
    <section className="surface rounded-3xl p-6 sm:p-8 h-fit"><p className="eyebrow mb-5">내 프로필</p><div className="flex items-center gap-4 pb-6 border-b border-[hsl(var(--border))]"><div className="w-12 h-12 rounded-full bg-[hsl(var(--secondary))] grid place-items-center text-lg font-semibold">{user?.name.slice(0, 1)}</div><div><h2 className="font-semibold">{user?.name}님</h2><p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{user?.email}</p></div></div><div className="py-6 border-b border-[hsl(var(--border))]"><p className="text-xs text-[hsl(var(--muted-foreground))]">현재 집사</p><div className="flex items-center gap-3 mt-3"><Portrait butler={butler!} small /><div><p className="font-semibold">{butler?.name}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">{butler?.tagline}</p></div></div><Link data-testid="link-change-butler" href="/butler" className="btn-quiet text-xs inline-block mt-5">집사 다시 고르기</Link></div><div className="py-6 border-b border-[hsl(var(--border))]"><p className="font-medium text-sm">집의 분위기</p><p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">거실과 각 방의 결을 고릅니다.</p><div className="grid grid-cols-2 gap-2 mt-4">{([['river', '한강뷰 아파트'], ['luxury', '부잣집'], ['wallpaper', '깔끔한 아파트 벽지'], ['hotel', '고급 호텔 컨시어지']] as [ResidenceStyle, string][]).map(([value, label]) => <button key={value} onClick={() => setResidenceStyle(value)} className={`text-left px-3 py-3 rounded-lg border text-xs transition-colors ${residenceStyle === value ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.14)] font-semibold' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]'}`}>{label}</button>)}</div></div><div className="pt-6 flex items-center justify-between"><div><p className="font-medium text-sm">화면 분위기</p><p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{dark ? '어두운 화면' : '밝은 화면'}</p></div><button data-testid="button-settings-theme" onClick={() => setDark(!dark)} className="icon-btn">{dark ? <Sun size={17} /> : <Moon size={17} />}</button></div></section>
    <section className="surface rounded-3xl p-6 sm:p-8"><div className="flex items-start justify-between mb-6"><div><p className="eyebrow mb-2">집사의 기억</p><h2 className="text-xl font-semibold">당신에 대해 알아둘 것</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] leading-6">기억은 내 계정에 안전하게 저장되며, 언제든 지울 수 있습니다.</p></div><Pencil size={19} className="text-[hsl(var(--muted-foreground))]" /></div><form onSubmit={add} className="flex gap-2 mb-7"><input data-testid="input-memory" className="field" value={text} onChange={e => setText(e.target.value)} placeholder="예: 금요일에는 회의가 많아요" /><button data-testid="button-add-memory" className="btn-accent px-4 shrink-0" type="submit"><Plus size={17} /></button></form>{memories.length === 0 ? <EmptyState icon={<Pencil size={20} />} title="아직 저장한 기억이 없습니다" detail="집사가 더 알았으면 하는 사실을 남겨 주세요." /> : <div className="space-y-2">{memories.map(memory => <div data-testid={`row-memory-${memory.id}`} key={memory.id} className="surface-soft rounded-2xl p-4 flex items-start gap-3"><div className="w-2 h-2 rounded-full bg-[hsl(var(--accent))] mt-2 shrink-0" /><p className="text-sm leading-6 flex-1">{memory.text}</p><button data-testid={`button-delete-memory-${memory.id}`} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" onClick={() => setMemories(memories.filter(item => item.id !== memory.id))} aria-label="기억 삭제"><Trash2 size={15} /></button></div>)}</div>}</section>
  </div></div></AppShell>;
}

function preparedButlerReply(message: string, butler: Butler): string {
  const value = message.toLowerCase();
  if (value.includes('일정') || value.includes('계획')) return `${butler.name}입니다. 오늘의 일정 화면에 먼저 적어 두면, 중요한 약속부터 차분히 살펴볼 수 있어요. 지금은 ${formatKoreanDate(today())}의 흐름을 기준으로 생각해 보겠습니다.`;
  if (value.includes('피곤') || value.includes('힘들') || value.includes('컨디션')) return `그렇군요. 오늘은 해내는 양보다 회복할 틈을 먼저 남겨 두겠습니다. 생활 기록에 지금의 상태를 한 줄로 적어 두면 다음 대화에서 참고할 수 있어요.`;
  if (value.includes('목표')) return `목표는 크게 잡기보다 다시 돌아오기 쉬운 크기가 좋습니다. 관계 화면에서 오늘 할 수 있는 가장 작은 단위를 하나 정해 보시겠어요?`;
  if (value.includes('안녕') || value.includes('처음')) return `반갑습니다. 저는 ${butler.name}입니다. 오늘은 어떤 장면부터 함께 정돈해 볼까요?`;
  return `말씀해 주셔서 감사합니다. 저는 ${butler.name}으로서 결정을 대신하기보다, 다음 한 걸음이 선명해지도록 곁에서 정리하겠습니다. 조금 더 구체적으로 들려주셔도 좋아요.`;
}

function ChatPage() {
  const { butler, chat: messages, setChat } = useApp();
  const [text, setText] = useState('');
  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || !butler) return;
    const userText = text.trim();
    setChat([
      ...messages,
      { id: makeId(), role: 'user', text: userText, createdAt: now() },
      { id: makeId(), role: 'butler', text: preparedButlerReply(userText, butler), createdAt: now() },
    ]);
    setText('');
  };
  return <AppShell><div className="page-width room-lounge"><div className="mb-8 fade-up"><p className="eyebrow mb-3">집사의 라운지</p><h1 className="display-font text-5xl font-semibold leading-none">집사에게 묻기</h1><p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">당신의 집사 서재에서 조용히 대화를 나눠 보세요.</p></div><div className="max-w-3xl mx-auto surface room-console overflow-hidden"><div className="p-5 sm:p-7 border-b border-[hsl(var(--border))] flex items-center gap-3"><Portrait butler={butler!} small /><div><p className="font-semibold">{butler?.name} 집사</p><p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">개인 서재 · 당신의 기록과 함께</p></div><button data-testid="button-reset-chat" className="icon-btn ml-auto" onClick={() => setChat([{ id: makeId(), role: 'butler', text: `${butler?.name}입니다. 대화를 새로 시작할게요.`, createdAt: now() }])} aria-label="대화 초기화"><RotateCcw size={15} /></button></div><div className="min-h-[360px] max-h-[52vh] overflow-y-auto p-5 sm:p-7 space-y-5">{messages.map(message => <div data-testid={`message-chat-${message.id}`} key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>{message.role === 'butler' && <Portrait butler={butler!} small />}<div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-br-sm' : 'bg-[hsl(var(--secondary))] rounded-bl-sm'}`}>{message.text}</div></div>)}</div><form onSubmit={send} className="p-4 sm:p-5 border-t border-[hsl(var(--border))] flex gap-2"><input data-testid="input-chat-message" className="field" value={text} onChange={e => setText(e.target.value)} placeholder="오늘의 마음이나 할 일을 말해 주세요" /><button data-testid="button-send-chat" className="btn-primary px-4" type="submit"><ArrowRight size={17} /></button></form></div><div className="max-w-3xl mx-auto mt-4 flex flex-wrap gap-2">{['오늘 일정을 정리해 줘', '조금 피곤해', '이번 주 목표를 세우고 싶어'].map(prompt => <button data-testid={`button-prompt-${prompt.slice(0, 3)}`} key={prompt} onClick={() => setText(prompt)} className="btn-quiet text-xs">{prompt}</button>)}</div></div></AppShell>;
}

function EmptyState({ icon, title, detail, action }: { icon: ReactNode; title: string; detail: string; action?: ReactNode }) {
  return <div className="py-14 text-center"><div className="w-12 h-12 rounded-2xl bg-[hsl(var(--secondary))] mx-auto grid place-items-center text-[hsl(var(--muted-foreground))]">{icon}</div><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function Guard({ children }: { children: ReactNode }) {
  const { authReady, user, butler } = useApp();
  const [, setLocation] = useLocation();
  useEffect(() => { if (!user) setLocation('/'); else if (!butler) setLocation('/butler'); }, [user, butler, setLocation]);
  return authReady && user && butler ? <>{children}</> : <div className="min-h-[100dvh] grid place-items-center app-frame"><div className="skeleton w-40 h-4" /></div>;
}

function Entry() {
  const { authReady, user } = useApp();
  const [, setLocation] = useLocation();
  useEffect(() => { if (user) setLocation('/app'); }, [user, setLocation]);
  return !authReady || user ? <div className="min-h-[100dvh] grid place-items-center app-frame"><div className="skeleton w-40 h-4" /></div> : <AuthPage />;
}

function Router() {
  return <Switch><Route path="/" component={Entry} /><Route path="/butler" component={() => <Guard><ButlerSelectPage /></Guard>} /><Route path="/app" component={() => <Guard><HomePage /></Guard>} /><Route path="/app/schedule" component={() => <Guard><SchedulePage /></Guard>} /><Route path="/app/life" component={() => <Guard><LifePage /></Guard>} /><Route path="/app/relationship" component={() => <Guard><RelationshipPage /></Guard>} /><Route path="/app/settings" component={() => <Guard><SettingsPage /></Guard>} /><Route path="/app/chat" component={() => <Guard><ChatPage /></Guard>} /><Route component={() => <div className="min-h-[100dvh] grid place-items-center app-frame"><div className="text-center"><h1 className="display-font text-5xl">페이지를 찾을 수 없습니다</h1><Link href="/" className="btn-primary inline-block mt-6">처음으로</Link></div></div>} /></Switch>;
}

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [butlerId, setButlerId] = useState<string | null>(null);
  const [schedule, setScheduleState] = useState<ScheduleItem[]>(starterSchedule);
  const [logs, setLogs] = useState<LifeLog[]>(() => [starterLog()]);
  const [goals, setGoalsState] = useState<Goal[]>(starterGoals);
  const [memories, setMemoriesState] = useState<Memory[]>(starterMemories);
  const [chat, setChat] = useState<ChatMessage[]>(starterChat);
  const [dark, setDarkState] = useState(false);
  const [residenceStyle, setResidenceStyle] = useState<ResidenceStyle>('river');
  const butler = useMemo(() => BUTLERS.find(item => item.id === butlerId) || null, [butlerId]);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  const hydrateUserData = async () => {
    const result = await apiRequest<{ data: Partial<UserData> }>('/api/data');
    const data = result.data || {};
    setButlerId(data.butlerId ?? null);
    setScheduleState(Array.isArray(data.schedule) ? data.schedule : starterSchedule());
    setLogs(Array.isArray(data.logs) ? data.logs : [starterLog()]);
    setGoalsState(Array.isArray(data.goals) ? data.goals : starterGoals);
    setMemories(Array.isArray(data.memories) ? data.memories : starterMemories);
    setChat(Array.isArray(data.chat) ? data.chat : starterChat());
    setDarkState(Boolean(data.dark));
    setResidenceStyle(data.residenceStyle === 'luxury' || data.residenceStyle === 'wallpaper' || data.residenceStyle === 'hotel' ? data.residenceStyle : 'river');
    setDataReady(true);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await apiRequest<{ user: User }>('/api/auth/me');
        if (!cancelled) {
          setUser(result.user);
          await hydrateUserData();
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user || !dataReady) return;
    const timer = window.setTimeout(() => {
      void apiRequest('/api/data', {
        method: 'PUT',
        body: JSON.stringify({ data: { butlerId, schedule, logs, goals, memories, chat, dark, residenceStyle } }),
      }).catch(() => undefined);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [user, dataReady, butlerId, schedule, logs, goals, memories, chat, dark, residenceStyle]);

  const setButler = (item: Butler) => setButlerId(item.id);
  const setSchedule = (items: ScheduleItem[]) => setScheduleState(items);
  const saveLog = (log: LifeLog) => setLogs(prev => [...prev.filter(item => item.date !== log.date), log]);
  const setGoals = (items: Goal[]) => setGoalsState(items);
  const setMemories = (items: Memory[]) => setMemoriesState(items);
  const setDark = (value: boolean) => setDarkState(value);
  const signIn = async (email: string, password: string) => {
    const result = await apiRequest<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setUser(result.user);
    await hydrateUserData();
  };
  const signUp = async (name: string, email: string, password: string) => {
    const result = await apiRequest<{ user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    setUser(result.user);
    await hydrateUserData();
  };
  const logout = async () => {
    try { await apiRequest('/api/auth/logout', { method: 'POST' }); } finally {
      setUser(null);
      setDataReady(false);
      setButlerId(null);
      setScheduleState(starterSchedule());
      setLogs([starterLog()]);
      setGoalsState(starterGoals);
      setMemoriesState(starterMemories);
      setChat(starterChat());
      setResidenceStyle('river');
    }
  };
  const value: AppContextValue = { authReady, user, butler, schedule, logs, goals, memories, chat, dark, residenceStyle, setButler, setSchedule, saveLog, setGoals, setMemories, setChat, setDark, setResidenceStyle, signIn, signUp, logout };
  return <QueryClientProvider client={queryClient}><TooltipProvider><AppContext.Provider value={value}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary><Router /></ErrorBoundary></WouterRouter></AppContext.Provider><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;