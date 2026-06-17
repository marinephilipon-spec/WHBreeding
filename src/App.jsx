import React, { useState, useEffect } from 'react';
import {
  Home, Calendar as CalIcon, Heart, MessageSquare, Settings,
  ChevronRight, ChevronLeft, Plus, Sparkles, Check, X,
  Trash2, Edit2, FileText,
} from 'lucide-react';

// ============================================================================
// DESIGN SYSTEM
// ============================================================================

const DS = {
  colors: {
    white: '#FFFFFF',
    bg: '#FAFAF7',
    bgAlt: '#F5F2ED',
    bgAccent: '#F0E9E1',
    text: '#1A1715',
    textSecondary: '#6B6560',
    textMuted: '#9C9490',
    border: '#E8E2D9',
    primary: '#2C5250',
    primaryLight: '#5A8784',
    primaryVeryLight: '#E8F1F0',
    gold: '#D4A574',
    status: {
      waiting: '#DC8A4C',
      ready: '#D4A574',
      bred: '#5A8784',
      foal: '#6BA881',
      open: '#8B7E8A',
    },
    success: '#6BA881',
    error: '#C84C3C',
  },
  typography: {
    family: { base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    size: { xs: '12px', sm: '13px', base: '15px', lg: '17px', xl: '20px', '2xl': '24px', '3xl': '32px' },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  },
  spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '20px', '2xl': '24px', '3xl': '32px' },
  radius: { sm: '6px', md: '10px', lg: '14px', full: '999px' },
  shadow: { xs: '0 1px 2px rgba(26, 23, 21, 0.04)', sm: '0 1px 3px rgba(26, 23, 21, 0.08)', md: '0 4px 6px rgba(26, 23, 21, 0.08)' },
};

// ============================================================================
// UTILITIES
// ============================================================================

const formatDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const today = () => formatDate(new Date());

// The action categories the breeding-log chat can infer. The key is stored on
// events/actions (as `category`); the label is what the review card and editor
// show. Keeping them here means the chat parser, the review card, and the edit
// dropdown all stay in sync.
const ACTION_CATEGORIES = [
  { key: 'check', label: 'Check' },
  { key: 'breed', label: 'Breed / Inseminate' },
  { key: 'drug', label: 'Administer Drug' },
  { key: 'short-cycle', label: 'Short Cycle' },
  { key: 'foaled', label: 'Foaled Out' },
];
const categoryLabel = (key) =>
  (ACTION_CATEGORIES.find(c => c.key === key) || ACTION_CATEGORIES[0]).label;

// Parse a date value into a Date in the LOCAL timezone. A bare "YYYY-MM-DD"
// string is otherwise parsed by the Date constructor as UTC midnight, which
// renders as the *previous* day for anyone in a timezone behind UTC — that is
// why something logged "today" kept showing up as "Yesterday".
const parseLocalDate = (d) => {
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return new Date(d);
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const relativeDate = (d) => {
  const date = parseLocalDate(d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = Math.round((date - now) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0 && diff < 7) return `In ${diff} days`;
  if (diff < 0 && diff > -7) return `${-diff} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Pull an explicit calendar date out of free-form text, e.g. "May 28th, 2026",
// "28 May", "5/28/2026" or "2026-05-28". Returns a local "YYYY-MM-DD" string, or
// null when the text contains no date. When no year is given the current year is
// assumed. This lets the chat log an event on the date the user actually states
// instead of defaulting to today.
const MONTHS = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const parseExplicitDate = (text) => {
  const monthNames = Object.keys(MONTHS).join('|');
  const currentYear = new Date().getFullYear();

  // "May 28th, 2026" / "May 28" / "May 28 2026". The (?!\d) guard stops a bare
  // year ("May 2026") being misread as a day-of-month.
  let m = text.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?!\\d)(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?`, 'i'));
  if (m) {
    return formatDate(new Date(m[3] ? Number(m[3]) : currentYear, MONTHS[m[1].toLowerCase()], Number(m[2])));
  }

  // "28th May 2026" / "28 May"
  m = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})(?:[,\\s]+(\\d{4}))?`, 'i'));
  if (m) {
    return formatDate(new Date(m[3] ? Number(m[3]) : currentYear, MONTHS[m[2].toLowerCase()], Number(m[1])));
  }

  // ISO "2026-05-28"
  m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // Numeric "5/28/2026" or "5/28"
  m = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m) {
    let year = m[3] ? Number(m[3]) : currentYear;
    if (year < 100) year += 2000;
    return formatDate(new Date(year, Number(m[1]) - 1, Number(m[2])));
  }

  return null;
};

const getStatusColor = (status) => ({
  'Waiting for cycle': DS.colors.status.waiting,
  'Ready to breed': DS.colors.status.ready,
  'Inseminated': DS.colors.status.bred,
  '14-day pregnancy check': DS.colors.status.bred,
  'Confirmed in foal': DS.colors.status.foal,
  'Lost - back open': DS.colors.status.open,
}[status] || DS.colors.textMuted);

// A horse's lifecycle status — independent of where a mare is in her breeding
// cycle. Used both for the dropdown in the profile and the colored badge.
const HORSE_STATUSES = ['Breeding this season', 'Idle', 'Archive'];

const getHorseStatusColor = (status) => ({
  'Breeding this season': DS.colors.primary,
  'Idle': DS.colors.gold,
  'Archive': DS.colors.textMuted,
}[status] || DS.colors.textMuted);

const calculateAge = (yob) => {
  const now = new Date();
  return now.getFullYear() - yob;
};

const getActionTitleWithMareName = (action, horses) => {
  const horse = horses.find(h => h.id === action.horseId);
  const mareName = horse ? horse.nickname || horse.barnName : 'Unknown';
  return `${mareName} - ${action.title}`;
};

// Action-taken events are shown on the calendar as a colored dot rather than a
// filled box, with a distinct color per milestone so the timeline is scannable
// at a glance. The category covers the broad type, but the title/detail is also
// inspected so the two pregnancy milestones (14-day check vs 28-day heartbeat)
// and a birth each read as their own color even though they share a category.
const getEventColor = (event) => {
  const t = `${event.title || ''} ${event.detail || ''}`.toLowerCase();
  if (/heartbeat|28[\s-]?day/.test(t)) return '#C84C3C';            // 28-day heartbeat check
  if (/pregnan|14[\s-]?day/.test(t)) return '#D4A574';             // 14-day pregnancy check
  if (/birth|foaled|foaling/.test(t)) return '#6BA881';            // gave birth
  switch (event.type) {
    case 'breed': return '#5A8784';        // bred / inseminated
    case 'drug': return '#DC8A4C';         // administered drug
    case 'short-cycle': return '#8B7E8A';  // short cycle
    case 'foaled': return '#6BA881';       // foaled out (gave birth)
    case 'check': return '#3E6FB0';        // general check
    default: return DS.colors.primaryLight;
  }
};

const getDaysUntilDue = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = due - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getDaysInMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFirstDayOfMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

// ============================================================================
// ROUTING
// ============================================================================

// The app is a single page, but every screen — and every individual horse —
// gets its own URL so links can be bookmarked, shared, and navigated with the
// browser's back/forward buttons. A "/*  ->  /index.html" rewrite (netlify.toml)
// means any of these paths loads the app, which then reads the path back.
const VALID_TABS = ['home', 'horses', 'chat', 'calendar', 'settings'];

const pathToRoute = (pathname) => {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts[0] === 'horses' && parts[1]) {
    return { tab: 'horses', horseId: decodeURIComponent(parts[1]) };
  }
  const tab = parts[0] || 'home';
  return { tab: VALID_TABS.includes(tab) ? tab : 'home', horseId: null };
};

const routeToPath = (tab, horseId) => {
  if (horseId) return `/horses/${encodeURIComponent(horseId)}`;
  if (!tab || tab === 'home') return '/';
  return `/${tab}`;
};

// ============================================================================
// SAMPLE DATA
// ============================================================================

const SAMPLE_HORSES = [];

const SAMPLE_EVENTS = [];

const SAMPLE_ACTIONS = [];

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  page: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: DS.colors.bg },
  scrollable: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: '20px' },
  contentPadding: { padding: `${DS.spacing.lg} ${DS.spacing.lg} ${DS.spacing.xl}` },
  header: { paddingTop: '24px', paddingBottom: DS.spacing.lg, paddingLeft: DS.spacing.lg, paddingRight: DS.spacing.lg, borderBottom: `1px solid ${DS.colors.border}`, background: DS.colors.white, display: 'flex', alignItems: 'center', gap: DS.spacing.lg },
  card: { background: DS.colors.white, border: `1px solid ${DS.colors.border}`, borderRadius: DS.radius.lg, padding: DS.spacing.lg, boxShadow: DS.shadow.xs, marginBottom: DS.spacing.lg },
  buttonBase: { border: 'none', borderRadius: DS.radius.md, fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.semibold, cursor: 'pointer', transition: 'all 0.2s ease', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: DS.spacing.sm, minHeight: '44px', fontFamily: DS.typography.family.base },
  buttonPrimary: { background: DS.colors.primary, color: 'white' },
  buttonSecondary: { background: DS.colors.bgAccent, color: DS.colors.text, border: `1.5px solid ${DS.colors.primary}` },
  h1: { fontSize: DS.typography.size['3xl'], fontWeight: DS.typography.weight.bold, color: DS.colors.text, margin: 0 },
  h2: { fontSize: DS.typography.size.xl, fontWeight: DS.typography.weight.bold, color: DS.colors.text, margin: `0 0 ${DS.spacing.lg} 0` },
  h3: { fontSize: DS.typography.size.lg, fontWeight: DS.typography.weight.semibold, color: DS.colors.text, margin: 0 },
  body: { fontSize: DS.typography.size.base, color: DS.colors.text },
  bodySmall: { fontSize: DS.typography.size.sm, color: DS.colors.textSecondary },
  label: { fontSize: DS.typography.size.sm, fontWeight: DS.typography.weight.semibold, color: DS.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { width: '100%', padding: `${DS.spacing.md} ${DS.spacing.lg}`, fontSize: DS.typography.size.base, border: `1px solid ${DS.colors.border}`, borderRadius: DS.radius.md, background: DS.colors.bgAlt, color: DS.colors.text, fontFamily: DS.typography.family.base, minHeight: '44px' },
};

// ============================================================================
// HEADER COMPONENT
// ============================================================================

function Header({ title, subtitle, onBack, action }) {
  return (
    <div style={styles.header}>
      {onBack && (
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: DS.colors.primary, cursor: 'pointer', padding: DS.spacing.md, fontSize: '24px', display: 'flex', alignItems: 'center' }}>
          ←
        </button>
      )}
      <div style={{ flex: 1 }}>
        {subtitle && <div style={styles.label}>{subtitle}</div>}
        <h1 style={{ marginTop: subtitle ? DS.spacing.sm : 0 }}>{title}</h1>
      </div>
      {action && action}
    </div>
  );
}

// ============================================================================
// HORSE FORM FIELDS
// ============================================================================

// Every field captured when a horse is first created. Shared between the "Add
// New Horse" form and the "Edit Profile" form so the two can never drift apart —
// adding a field here makes it both creatable and editable.
// Shared horse create/edit form. `errors` is an optional map of field name to
// message; a field present in it renders a red border and the message beneath
// it. Required fields (registered name and breed) always show a red asterisk.
function HorseFormFields({ formData, setFormData, errors = {} }) {
  const text = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });
  const RequiredStar = () => <span style={{ color: DS.colors.error, marginLeft: '2px' }}>*</span>;
  const fieldError = (key) => errors[key] ? (
    <p style={{ ...styles.bodySmall, color: DS.colors.error, marginTop: DS.spacing.xs }}>{errors[key]}</p>
  ) : null;
  const inputStyle = (key) => ({
    ...styles.input,
    marginTop: DS.spacing.sm,
    ...(errors[key] ? { borderColor: DS.colors.error } : {}),
  });
  return (
    <>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Registered Name<RequiredStar /></label>
        <input type="text" value={formData.barnName || ''} onChange={text('barnName')} placeholder="e.g., Romanova VH" style={inputStyle('barnName')} />
        {fieldError('barnName')}
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Barn Name (nickname)</label>
        <input type="text" value={formData.nickname || ''} onChange={text('nickname')} placeholder="e.g., Roma" style={{...styles.input, marginTop: DS.spacing.sm}} />
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Type</label>
        <select value={formData.type || 'mare'} onChange={text('type')} style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white}}>
          <option value="mare">Mare</option>
          <option value="foal">Foal</option>
          <option value="stallion">Stallion</option>
          <option value="retired">Retired</option>
        </select>
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Breed<RequiredStar /></label>
        <input type="text" value={formData.breed || ''} onChange={text('breed')} placeholder="e.g., KWPN" style={inputStyle('breed')} />
        {fieldError('breed')}
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Date of Birth</label>
        <input type="date" value={formData.dateOfBirth || ''} onChange={text('dateOfBirth')} style={{...styles.input, marginTop: DS.spacing.sm}} />
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Color</label>
        <input type="text" value={formData.color || ''} onChange={text('color')} placeholder="e.g., Bay" style={{...styles.input, marginTop: DS.spacing.sm}} />
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Owner</label>
        <input type="text" value={formData.owner || ''} onChange={text('owner')} placeholder="e.g., Jane Smith" style={{...styles.input, marginTop: DS.spacing.sm}} />
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Sire (father)</label>
        <input type="text" value={formData.sire || ''} onChange={text('sire')} placeholder="e.g., Vitalis" style={{...styles.input, marginTop: DS.spacing.sm}} />
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Dam (mother)</label>
        <input type="text" value={formData.dam || ''} onChange={text('dam')} placeholder="e.g., Roma" style={{...styles.input, marginTop: DS.spacing.sm}} />
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Dam-Sire (maternal grandsire)</label>
        <input type="text" value={formData.damSire || ''} onChange={text('damSire')} placeholder="e.g., Negro" style={{...styles.input, marginTop: DS.spacing.sm}} />
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Discipline</label>
        <input type="text" value={formData.discipline || ''} onChange={text('discipline')} placeholder="e.g., Dressage, Jumping" style={{...styles.input, marginTop: DS.spacing.sm}} />
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Size</label>
        <input type="text" value={formData.size || ''} onChange={text('size')} placeholder="e.g., 16.2 hands" style={{...styles.input, marginTop: DS.spacing.sm}} />
      </div>
      <div style={{ marginTop: DS.spacing.lg }}>
        <label style={styles.label}>Additional Information</label>
        <textarea value={formData.additionalInfo || ''} onChange={text('additionalInfo')} placeholder="Anything else worth recording…" rows={4} style={{...styles.input, marginTop: DS.spacing.sm, resize: 'vertical', minHeight: '88px'}} />
      </div>
    </>
  );
}

// ============================================================================
// FILE VIEWER
// ============================================================================

// Full-screen overlay that renders an uploaded file in place. The bytes are
// served by the `files` function with their original content type, so images,
// PDFs and plain text render natively (img / iframe). Anything the browser
// cannot display inline falls back to an "Open in new tab" link.
function FileViewer({ file, onClose }) {
  const src = `/.netlify/functions/files?id=${file.id}`;
  const type = file.type || '';
  const isImage = type.startsWith('image/');
  const isPdf = type === 'application/pdf';
  const isText = type.startsWith('text/') || type === 'application/json';

  // Load the bytes ourselves into an object URL rather than pointing an <img>/
  // <iframe> straight at the endpoint. That way a file whose content can't be
  // served — e.g. one added before file contents were ever stored — shows a
  // clear message instead of a broken-image icon, and the preview only renders
  // once we know the bytes actually arrived.
  const [load, setLoad] = useState({ status: 'loading', url: null });

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    setLoad({ status: 'loading', url: null });
    fetch(src)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setLoad({ status: 'ready', url: objectUrl });
      })
      .catch(() => {
        if (!cancelled) setLoad({ status: 'error', url: null });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(26, 23, 21, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: DS.spacing.lg, zIndex: 400 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: DS.colors.white, borderRadius: DS.radius.lg, boxShadow: DS.shadow.md, width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: DS.spacing.lg, borderBottom: `1px solid ${DS.colors.border}` }}>
          <p style={{...styles.body, marginTop: 0, marginBottom: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
          <div style={{ display: 'flex', gap: DS.spacing.md, alignItems: 'center', flexShrink: 0, marginLeft: DS.spacing.md }}>
            {load.status === 'ready' && (
              <a href={src} target="_blank" rel="noopener noreferrer" style={{ ...styles.bodySmall, color: DS.colors.primary, textDecoration: 'none', fontWeight: 600 }}>Open in new tab</a>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: DS.colors.text, padding: DS.spacing.sm }} title="Close"><X size={22} /></button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: DS.colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          {load.status === 'loading' ? (
            <p style={styles.bodySmall}>Loading…</p>
          ) : load.status === 'error' ? (
            <div style={{ textAlign: 'center', padding: DS.spacing.xl }}>
              <FileText size={40} color={DS.colors.textMuted} style={{ marginBottom: DS.spacing.md }} />
              <p style={styles.body}>This file's contents aren't available to preview.</p>
              <p style={styles.bodySmall}>It may have been added before file contents were stored. Delete it and upload the file again to view it here.</p>
            </div>
          ) : isImage ? (
            <img src={load.url} alt={file.name} style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block' }} />
          ) : (isPdf || isText) ? (
            <iframe src={load.url} title={file.name} style={{ width: '100%', height: '80vh', border: 'none', background: DS.colors.white }} />
          ) : (
            <div style={{ textAlign: 'center', padding: DS.spacing.xl }}>
              <FileText size={40} color={DS.colors.textMuted} style={{ marginBottom: DS.spacing.md }} />
              <p style={styles.bodySmall}>This file type can't be previewed here.</p>
              <a href={load.url} download={file.name} style={{ ...styles.body, color: DS.colors.primary, fontWeight: 600 }}>Download it</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HORSE DETAIL SCREEN
// ============================================================================

function HorseDetailScreen({ horse, events, actions, onBack, onUpdateStatus, onUpdateStallion, onToggleBreedingList, onUpdateHorse, onUpdateHorseStatus, onDeleteHorse }) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [status, setStatus] = useState(horse.breedingStatus || '');
  const [stallion, setStallion] = useState(horse.plannedStallion || '');
  const [onList, setOnList] = useState(horse.onBreedingList);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(horse);
  const [editErrors, setEditErrors] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = React.useRef(null);

  const horseEvents = events.filter(e => e.horseId === horse.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const horseActions = actions.filter(a => a.horseId === horse.id);
  const age = calculateAge(horse.yob);

  const startEditing = () => {
    setEditForm(horse);
    setEditErrors({});
    setIsEditing(true);
  };

  // Persist every edited field. Barn/registered name and nickname fall back to
  // the barn name (as on creation), and the year-of-birth is recomputed from the
  // date of birth so age stays correct after an edit.
  const handleSaveEdit = () => {
    const errors = {};
    if (!editForm.barnName || !editForm.barnName.trim()) errors.barnName = 'Registered name is required';
    if (!editForm.breed || !editForm.breed.trim()) errors.breed = 'Breed is required';
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    setEditErrors({});
    const yob = editForm.dateOfBirth
      ? new Date(editForm.dateOfBirth).getFullYear()
      : horse.yob;
    onUpdateHorse(horse.id, {
      ...editForm,
      yob,
      name: editForm.name || editForm.barnName,
      nickname: editForm.nickname || editForm.barnName,
    });
    setIsEditing(false);
  };

  // Step 1 of uploading: the user picked a file. Hold onto it and pre-fill the
  // name field with the original filename (minus extension) so they can rename
  // it before it is saved.
  const handleFileSelected = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setFileName(file.name.replace(/\.[^.]+$/, ''));
  };

  const resetUpload = () => {
    setShowFileUpload(false);
    setPendingFile(null);
    setFileName('');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Step 2: actually store the file. The raw bytes go to the `files` function
  // (Netlify Blobs); only the lightweight metadata — including the user's chosen
  // display name and the original extension — is kept on the horse record.
  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    const id = `f${Date.now()}`;
    const ext = (pendingFile.name.match(/\.[^.]+$/) || [''])[0];
    const displayName = (fileName.trim() || pendingFile.name.replace(/\.[^.]+$/, '')) + ext;
    try {
      const res = await fetch(`/.netlify/functions/files?id=${id}&name=${encodeURIComponent(displayName)}`, {
        method: 'POST',
        headers: { 'Content-Type': pendingFile.type || 'application/octet-stream' },
        body: pendingFile,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newFile = {
        id,
        name: displayName,
        size: pendingFile.size,
        type: pendingFile.type,
        uploadedDate: new Date().toISOString().split('T')[0],
      };
      const updatedFiles = [...(horse.files || []), newFile];
      onUpdateHorse(horse.id, { ...horse, files: updatedFiles });
      resetUpload();
    } catch (err) {
      console.error('Failed to upload file:', err);
      setUploading(false);
      alert('Could not upload the file — please check your connection and try again.');
    }
  };

  const handleDeleteFile = (fileId) => {
    const updatedFiles = (horse.files || []).filter(f => f.id !== fileId);
    onUpdateHorse(horse.id, { ...horse, files: updatedFiles });
    // Remove the stored bytes too; ignore failures since the metadata is already
    // gone and a stray blob is harmless.
    fetch(`/.netlify/functions/files?id=${fileId}`, { method: 'DELETE' }).catch(() => {});
  };

  const headerActions = (
    <div style={{ display: 'flex', gap: DS.spacing.sm }}>
      <button
        onClick={startEditing}
        style={{...styles.buttonBase, ...styles.buttonSecondary, padding: `${DS.spacing.sm} ${DS.spacing.md}`}}
        title="Edit profile"
      >
        <Edit2 size={18} /> Edit
      </button>
      <button
        onClick={() => setShowDeleteConfirm(true)}
        style={{...styles.buttonBase, background: 'transparent', border: `1.5px solid ${DS.colors.error}`, color: DS.colors.error, padding: `${DS.spacing.sm} ${DS.spacing.md}`}}
        title="Delete horse"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );

  // Edit mode replaces the whole detail view with the shared creation form, so
  // every field captured at creation can be changed.
  if (isEditing) {
    return (
      <div style={styles.page}>
        <Header title={`Edit ${horse.barnName}`} subtitle="EDIT PROFILE" onBack={() => setIsEditing(false)} />
        <div style={styles.scrollable}>
          <div style={styles.contentPadding}>
            <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
              <HorseFormFields formData={editForm} setFormData={setEditForm} errors={editErrors} />
              <div style={{ marginTop: DS.spacing.lg, display: 'flex', gap: DS.spacing.md }}>
                <button onClick={handleSaveEdit} style={{...styles.buttonBase, ...styles.buttonPrimary, flex: 1}}>Save Changes</button>
                <button onClick={() => setIsEditing(false)} style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Header title={horse.barnName} subtitle={horse.nickname && horse.nickname !== horse.barnName ? `${horse.type.toUpperCase()} • BARN NAME: ${horse.nickname.toUpperCase()}` : horse.type.toUpperCase()} onBack={onBack} action={headerActions} />

      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26, 23, 21, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: DS.spacing.xl, zIndex: 300 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: DS.colors.white, borderRadius: DS.radius.lg, padding: DS.spacing.xl, maxWidth: '420px', width: '100%', boxShadow: DS.shadow.md }}
          >
            <h2 style={styles.h2}>Delete {horse.barnName}?</h2>
            <p style={{...styles.body, color: DS.colors.textSecondary, marginBottom: DS.spacing.xl}}>
              This permanently removes this horse and its profile. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: DS.spacing.md }}>
              <button
                onClick={() => { setShowDeleteConfirm(false); onDeleteHorse(horse.id); }}
                style={{...styles.buttonBase, background: DS.colors.error, color: 'white', flex: 1}}
              >
                <Trash2 size={18} /> Delete
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {viewingFile && (
        <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />
      )}

      <div style={styles.scrollable}>
        <div style={styles.contentPadding}>
          {/* Status */}
          <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
            <label style={styles.label}>Status</label>
            <select
              value={horse.status || ''}
              onChange={(e) => onUpdateHorseStatus(horse.id, e.target.value)}
              style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white, border: `1.5px solid ${getHorseStatusColor(horse.status)}`}}
            >
              <option value="">Select status...</option>
              {HORSE_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: DS.spacing.lg, marginBottom: DS.spacing.lg }}>
              <div>
                <div style={styles.label}>Breed</div>
                <p style={{...styles.body, marginTop: DS.spacing.sm}}>{horse.breed}</p>
              </div>
              <div>
                <div style={styles.label}>Age</div>
                <p style={{...styles.body, marginTop: DS.spacing.sm}}>{age} years old</p>
              </div>
              <div>
                <div style={styles.label}>Color</div>
                <p style={{...styles.body, marginTop: DS.spacing.sm}}>{horse.color}</p>
              </div>
              <div>
                <div style={styles.label}>{horse.dateOfBirth ? 'Date of Birth' : 'Born'}</div>
                <p style={{...styles.body, marginTop: DS.spacing.sm}}>{horse.dateOfBirth ? parseLocalDate(horse.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : horse.yob}</p>
              </div>
              {horse.owner && (
                <div>
                  <div style={styles.label}>Owner</div>
                  <p style={{...styles.body, marginTop: DS.spacing.sm}}>{horse.owner}</p>
                </div>
              )}
              {horse.discipline && (
                <div>
                  <div style={styles.label}>Discipline</div>
                  <p style={{...styles.body, marginTop: DS.spacing.sm}}>{horse.discipline}</p>
                </div>
              )}
              {horse.size && (
                <div>
                  <div style={styles.label}>Size</div>
                  <p style={{...styles.body, marginTop: DS.spacing.sm}}>{horse.size}</p>
                </div>
              )}
            </div>
            {horse.additionalInfo && (
              <div style={{ paddingTop: DS.spacing.md, borderTop: `1px solid ${DS.colors.border}` }}>
                <div style={styles.label}>Additional Information</div>
                <p style={{...styles.body, marginTop: DS.spacing.sm, whiteSpace: 'pre-wrap'}}>{horse.additionalInfo}</p>
              </div>
            )}
          </div>

          {/* Breeding Management */}
          {horse.type === 'mare' && (
            <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
              <div style={{ marginBottom: DS.spacing.lg }}>
                <label style={{...styles.label, display: 'flex', alignItems: 'center', gap: DS.spacing.md}}>
                  <input
                    type="checkbox"
                    checked={onList}
                    onChange={(e) => {
                      setOnList(e.target.checked);
                      onToggleBreedingList(horse.id, e.target.checked);
                    }}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  On 2026 Breeding List
                </label>
              </div>

              <div style={{ marginBottom: DS.spacing.lg }}>
                <label style={styles.label}>Breeding Status</label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    onUpdateStatus(horse.id, e.target.value);
                  }}
                  style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white, border: `1.5px solid ${getStatusColor(status)}`}}
                >
                  <option value="">Select status...</option>
                  <option value="Waiting for cycle">Waiting for cycle</option>
                  <option value="Ready to breed">Ready to breed</option>
                  <option value="Inseminated">Inseminated</option>
                  <option value="14-day pregnancy check">14-day pregnancy check</option>
                  <option value="Confirmed in foal">Confirmed in foal</option>
                  <option value="Lost - back open">Lost - back open</option>
                </select>
              </div>

              <div>
                <label style={styles.label}>Planned Stallion</label>
                <input
                  type="text"
                  value={stallion}
                  onChange={(e) => {
                    setStallion(e.target.value);
                    onUpdateStallion(horse.id, e.target.value);
                  }}
                  placeholder="e.g., Vitalis"
                  style={{...styles.input, marginTop: DS.spacing.sm}}
                />
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: DS.spacing.sm,
            marginTop: DS.spacing.xl,
            marginBottom: DS.spacing.lg,
            borderBottom: `1px solid ${DS.colors.border}`,
          }}>
            {['timeline', 'pedigree', 'files'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: `${DS.spacing.md} 0`,
                  borderBottom: activeTab === tab ? `2px solid ${DS.colors.primary}` : 'transparent',
                  color: activeTab === tab ? DS.colors.primary : DS.colors.textMuted,
                  fontWeight: activeTab === tab ? DS.typography.weight.semibold : DS.typography.weight.normal,
                  cursor: 'pointer',
                  fontSize: DS.typography.size.base,
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab === 'timeline' && '📅 Timeline'}
                {tab === 'pedigree' && '🐴 Pedigree'}
                {tab === 'files' && '📄 Files'}
              </button>
            ))}
          </div>

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <>
              <h2 style={styles.h2}>Events</h2>
              {horseEvents.length === 0 ? (
                <div style={{...styles.card, textAlign: 'center', marginLeft: 0, marginRight: 0}}>
                  <p style={styles.bodySmall}>No events recorded yet</p>
                </div>
              ) : (
                horseEvents.map(event => (
                  <div key={event.id} style={{...styles.card, marginLeft: 0, marginRight: 0}}>
                    <h3 style={styles.h3}>{event.title}</h3>
                    <p style={{...styles.bodySmall, marginTop: DS.spacing.sm}}>{event.detail}</p>
                    <p style={{...styles.bodySmall, marginTop: DS.spacing.sm, color: DS.colors.textMuted}}>{relativeDate(event.date)}</p>
                  </div>
                ))
              )}

              <h2 style={{...styles.h2, marginTop: DS.spacing.xl}}>Actions</h2>
              {horseActions.length === 0 ? (
                <div style={{...styles.card, textAlign: 'center', marginLeft: 0, marginRight: 0}}>
                  <p style={styles.bodySmall}>No actions scheduled</p>
                </div>
              ) : (
                horseActions.map(action => (
                  <div key={action.id} style={{...styles.card, marginLeft: 0, marginRight: 0, opacity: action.done ? 0.6 : 1, background: action.done ? DS.colors.bgAlt : DS.colors.white}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: DS.spacing.md }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{...styles.h3, textDecoration: action.done ? 'line-through' : 'none'}}>{action.title}</h3>
                        {action.note && <p style={{...styles.bodySmall, marginTop: DS.spacing.sm}}>{action.note}</p>}
                        <p style={{...styles.bodySmall, marginTop: DS.spacing.sm, color: DS.colors.textMuted}}>Due: {relativeDate(action.dueDate)}</p>
                      </div>
                      {action.done && (
                        <div style={{ flexShrink: 0, marginTop: '2px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: DS.colors.success,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            color: 'white',
                            fontWeight: DS.typography.weight.bold,
                          }}>
                            ✓
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Pedigree Tab */}
          {activeTab === 'pedigree' && (
            <>
              <h2 style={styles.h2}>Pedigree</h2>
              <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
                <div style={{ marginBottom: DS.spacing.lg }}>
                  <div style={styles.label}>Sire</div>
                  <p style={{...styles.body, marginTop: DS.spacing.sm}}>{horse.sire}</p>
                </div>
                <div style={{ marginBottom: DS.spacing.lg }}>
                  <div style={styles.label}>Dam</div>
                  <p style={{...styles.body, marginTop: DS.spacing.sm}}>{horse.dam}</p>
                </div>
                <div>
                  <div style={styles.label}>Dam-Sire (maternal grandsire)</div>
                  <p style={{...styles.body, marginTop: DS.spacing.sm}}>{horse.damSire || 'Unknown'}</p>
                </div>
              </div>
            </>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <>
              <h2 style={styles.h2}>Files & Documents</h2>
              <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
                {!showFileUpload ? (
                  <button
                    onClick={() => setShowFileUpload(true)}
                    style={{...styles.buttonBase, ...styles.buttonPrimary, width: '100%'}}>
                    <Plus size={20} /> Add Document
                  </button>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelected}
                      style={{ display: 'block', marginBottom: DS.spacing.md, width: '100%', padding: DS.spacing.md, border: `2px dashed ${DS.colors.primary}`, borderRadius: DS.radius.md, cursor: 'pointer', background: DS.colors.primaryVeryLight }}
                    />
                    {pendingFile && (
                      <>
                        <div style={styles.label}>File name</div>
                        <input
                          type="text"
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          placeholder="Name this file"
                          style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: DS.spacing.sm, marginBottom: DS.spacing.md, padding: DS.spacing.md, border: `1.5px solid ${DS.colors.border}`, borderRadius: DS.radius.md, fontSize: '16px' }}
                        />
                      </>
                    )}
                    <div style={{ display: 'flex', gap: DS.spacing.md }}>
                      <button
                        onClick={handleConfirmUpload}
                        disabled={!pendingFile || uploading}
                        style={{...styles.buttonBase, ...styles.buttonPrimary, flex: 1, opacity: (!pendingFile || uploading) ? 0.5 : 1, cursor: (!pendingFile || uploading) ? 'not-allowed' : 'pointer'}}>
                        {uploading ? 'Uploading…' : 'Upload'}
                      </button>
                      <button
                        onClick={resetUpload}
                        style={{...styles.buttonBase, background: DS.colors.border, color: DS.colors.text, flex: 1}}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {(!horse.files || horse.files.length === 0) ? (
                <div style={{...styles.card, textAlign: 'center', marginLeft: 0, marginRight: 0}}>
                  <FileText size={32} color={DS.colors.textMuted} style={{ marginBottom: DS.spacing.md }} />
                  <p style={styles.bodySmall}>No files uploaded yet</p>
                </div>
              ) : (
                horse.files.map(file => (
                  <div key={file.id} style={{...styles.card, marginLeft: 0, marginRight: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <button
                      onClick={() => setViewingFile(file)}
                      style={{ flex: 1, background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                      title="View file"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: DS.spacing.md }}>
                        <FileText size={24} color={DS.colors.primary} />
                        <div>
                          <p style={{...styles.body, marginTop: 0, color: DS.colors.primary}}>{file.name}</p>
                          <p style={{...styles.bodySmall, color: DS.colors.textMuted}}>Uploaded {relativeDate(file.uploadedDate)}</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      style={{ background: 'transparent', border: 'none', color: DS.colors.error, cursor: 'pointer', padding: DS.spacing.md }}
                      title="Delete file"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HOME SCREEN
// ============================================================================

function HomeScreen({ horses, actions, onSelectHorse, onNavigateToChat, onToggleAction, onDeleteAction, onEditAction }) {
  const [editingAction, setEditingAction] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [actionFilter, setActionFilter] = useState('all');

  const breedingMares = horses.filter(h => h.type === 'mare' && h.onBreedingList);
  const pendingActions = actions.filter(a => !a.done);

  // Tabbed views over the pending reminders, mirroring the Horses page tabs.
  // "Today" is due exactly today; "This Week" is due within the next 7 days
  // (today through six days out); "All" is every outstanding reminder.
  const todayActions = pendingActions.filter(a => a.dueDate === today());
  const weekActions = pendingActions.filter(a => {
    const d = getDaysUntilDue(a.dueDate);
    return d >= 0 && d <= 6;
  });
  const actionTabs = [
    { id: 'all', label: 'All', count: pendingActions.length, list: pendingActions },
    { id: 'today', label: 'Today', count: todayActions.length, list: todayActions },
    { id: 'week', label: 'This Week', count: weekActions.length, list: weekActions },
  ];
  const visibleActions = (actionTabs.find(t => t.id === actionFilter) || actionTabs[0]).list;

  const startEdit = (action) => {
    setEditingAction(action.id);
    setEditForm({...action});
  };

  const saveEdit = () => {
    onEditAction(editingAction, editForm);
    setEditingAction(null);
  };

  return (
    <div style={styles.page}>
      <Header title="Breeding Log" subtitle="White Horse Estate" />

      <div style={styles.scrollable}>
        <div style={styles.contentPadding}>
          {/* Chat CTA Banner */}
          <div 
            onClick={onNavigateToChat}
            style={{
              background: `linear-gradient(135deg, ${DS.colors.primary} 0%, ${DS.colors.primaryLight} 100%)`,
              borderRadius: DS.radius.lg,
              padding: `${DS.spacing.xl} ${DS.spacing.lg}`,
              marginBottom: DS.spacing.xl,
              marginLeft: 0,
              marginRight: 0,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: DS.spacing.lg,
              transition: 'all 0.3s ease',
              boxShadow: DS.shadow.md,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = DS.shadow.md;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = DS.shadow.md;
            }}
          >
            <div style={{ flex: 1 }}>
              <h3 style={{ ...styles.h3, color: 'white', marginTop: 0 }}>What do you want to log today?</h3>
              <p style={{ ...styles.bodySmall, color: 'rgba(255,255,255,0.9)', marginTop: DS.spacing.sm }}>Track breeding updates, actions, and events</p>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: DS.spacing.md }}>
              <Sparkles size={28} color="white" />
              <ChevronRight size={24} color="white" />
            </div>
          </div>

          {/* Breeding Mares */}
          <div>
            <h2 style={styles.h2}>Your Breeding Mares</h2>
            {breedingMares.length === 0 ? (
              <div style={{...styles.card, textAlign: 'center', marginLeft: 0, marginRight: 0}}>
                <p style={styles.bodySmall}>No mares on breeding list</p>
              </div>
            ) : (
              breedingMares.map(mare => (
                <div key={mare.id} style={{...styles.card, marginLeft: 0, marginRight: 0, cursor: 'pointer'}} onClick={() => onSelectHorse(mare.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.spacing.md }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={styles.h3}>{mare.barnName}</h3>
                      <p style={styles.bodySmall}>{mare.breed} • {calculateAge(mare.yob)} years old</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: DS.spacing.md, flexShrink: 0 }}>
                      {mare.breedingStatus && (
                        <div style={{ display: 'inline-block', padding: `${DS.spacing.sm} ${DS.spacing.md}`, background: getStatusColor(mare.breedingStatus), color: 'white', borderRadius: DS.radius.full, fontSize: DS.typography.size.xs, fontWeight: DS.typography.weight.semibold, whiteSpace: 'nowrap' }}>
                          {mare.breedingStatus}
                        </div>
                      )}
                      <ChevronRight size={20} color={DS.colors.primary} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Calendar - Actions */}
          <div style={{ marginTop: DS.spacing['3xl'] }}>
            <h2 style={styles.h2}>📅 Upcoming Actions</h2>

            {/* Tabs: All / Today / This Week */}
            <div style={{ display: 'flex', gap: DS.spacing.sm, marginBottom: DS.spacing.lg, overflowX: 'auto', paddingBottom: DS.spacing.xs }}>
              {actionTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActionFilter(tab.id)}
                  style={{
                    padding: `${DS.spacing.sm} ${DS.spacing.lg}`,
                    border: actionFilter === tab.id ? `2px solid ${DS.colors.primary}` : `1px solid ${DS.colors.border}`,
                    background: actionFilter === tab.id ? DS.colors.primary : DS.colors.white,
                    color: actionFilter === tab.id ? 'white' : DS.colors.text,
                    borderRadius: DS.radius.full,
                    cursor: 'pointer',
                    fontWeight: DS.typography.weight.semibold,
                    fontSize: DS.typography.size.sm,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {visibleActions.length === 0 ? (
              <div style={{...styles.card, textAlign: 'center', marginLeft: 0, marginRight: 0}}>
                <p style={styles.bodySmall}>{actionFilter === 'all' ? 'No pending actions' : actionFilter === 'today' ? 'Nothing due today' : 'Nothing due this week'}</p>
              </div>
            ) : (
              visibleActions.map(action => (
                <div key={action.id} style={{...styles.card, marginLeft: 0, marginRight: 0}}>
                  {editingAction === action.id ? (
                    <div>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                        style={{...styles.input, marginBottom: DS.spacing.md}}
                      />
                      <input
                        type="text"
                        value={editForm.note}
                        onChange={(e) => setEditForm({...editForm, note: e.target.value})}
                        placeholder="Notes"
                        style={{...styles.input, marginBottom: DS.spacing.md}}
                      />
                      <input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) => setEditForm({...editForm, dueDate: e.target.value})}
                        style={{...styles.input, marginBottom: DS.spacing.md}}
                      />
                      <div style={{ display: 'flex', gap: DS.spacing.md }}>
                        <button onClick={saveEdit} style={{...styles.buttonBase, ...styles.buttonPrimary, flex: 1}}>Save</button>
                        <button onClick={() => setEditingAction(null)} style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1}}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: DS.spacing.md }}>
                        <input
                          type="checkbox"
                          checked={action.done}
                          onChange={() => onToggleAction(action.id)}
                          style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <h3 style={styles.h3}>{getActionTitleWithMareName(action, horses)}</h3>
                          {action.note && <p style={{...styles.bodySmall, marginTop: DS.spacing.sm}}>{action.note}</p>}
                          <p style={{...styles.bodySmall, marginTop: DS.spacing.sm, color: DS.colors.textMuted}}>Due: {relativeDate(action.dueDate)}</p>
                        </div>
                        <div style={{ display: 'flex', gap: DS.spacing.sm, flexShrink: 0 }}>
                          <button
                            onClick={() => startEdit(action)}
                            style={{ background: 'transparent', border: 'none', color: DS.colors.primary, cursor: 'pointer', padding: DS.spacing.sm, display: 'flex', alignItems: 'center', transition: 'all 0.2s ease' }}
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => onDeleteAction(action.id)}
                            style={{ background: 'transparent', border: 'none', color: DS.colors.error, cursor: 'pointer', padding: DS.spacing.sm, display: 'flex', alignItems: 'center', transition: 'all 0.2s ease' }}
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CHAT SCREEN
// ============================================================================

function ChatScreen({ horses, actions, events, onBack, onAddEvent, onAddAction }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [editingConfirmation, setEditingConfirmation] = useState(null);
  const [chatMode, setChatMode] = useState('log'); // 'log' or 'ask'

  // Infer the structured fields the user wants out of a free-form chat message:
  // the category, the mare, an action that was taken (with the date it was taken),
  // an action item to schedule (with its due date), and an additional note. Any
  // field can be left blank — a message can describe only something that happened,
  // only an upcoming reminder, or both at once. Everything is editable afterwards.
  const parseInput = (text, fallbackHorse = null) => {
    const lower = text.toLowerCase();

    // Identify which horse the message is about. If the message names no horse
    // (e.g. a follow-up "remind me at day 28"), fall back to the horse the
    // conversation was already about.
    const horseMatches = horses.map(h => h.barnName.toLowerCase()).join('|');
    const horseMatch = horseMatches ? text.match(new RegExp(`(${horseMatches})`, 'i')) : null;
    const horse = horseMatch
      ? horses.find(h => h.barnName.toLowerCase() === horseMatch[0].toLowerCase())
      : fallbackHorse;

    const mareLabel = horse?.nickname || horse?.barnName || 'the mare';

    // Pull timing signals out of the text.
    const explicitDate = parseExplicitDate(text);          // "May 28th, 2026"
    const dayNumberMatch = lower.match(/\bday\s+(\d+)\b/);  // "day 28" -> day of the cycle
    const dayNumber = dayNumberMatch ? parseInt(dayNumberMatch[1], 10) : null;
    const daysMatch = lower.match(/(\d+)\s*(?:day|days)\b/); // "in 28 days" -> from today
    const weeksMatch = lower.match(/(\d+)\s*(?:week|weeks)\b/);
    let daysOffset = 0;
    if (daysMatch && dayNumber === null) daysOffset = parseInt(daysMatch[1], 10);
    else if (weeksMatch) daysOffset = parseInt(weeksMatch[1], 10) * 7;

    // Category of the action being logged.
    let category = 'check';
    if (/\bfoaled?\s*out\b|\bfoaled\b|\bfoaling\b|gave birth|\bdelivered\b/.test(lower)) category = 'foaled';
    else if (/\bshort[\s-]?cycl/.test(lower)) category = 'short-cycle';
    else if (/\b(bred|breed|breeding|inseminat|covered|live cover|\bai\b)\b/.test(lower)) category = 'breed';
    else if (/\b(administer|administered|drug|inject|injected|dose|dosed|gave|medication|meds?|regumate|altrenogest|oxytocin|prostaglandin|lutalyse|estrumate|hcg|chorulon|deslorelin|sucromate|progesterone|p4)\b/.test(lower)) category = 'drug';

    // Named drug, if any, so "gave Regumate" reads back as "Administered Regumate".
    const DRUGS = ['regumate', 'altrenogest', 'oxytocin', 'prostaglandin', 'lutalyse', 'estrumate', 'hcg', 'chorulon', 'deslorelin', 'sucromate', 'progesterone'];
    const drugRaw = DRUGS.find(d => lower.includes(d));
    const drugName = drugRaw ? drugRaw.charAt(0).toUpperCase() + drugRaw.slice(1) : null;

    // A specific check/task named in the message.
    const checkTask =
      /heart ?beat/.test(lower) ? 'Heartbeat check' :
      /ultra ?sound|\bscan\b/.test(lower) ? 'Ultrasound check' :
      /pregnan|preg ?check/.test(lower) ? 'Pregnancy check' :
      /teased|teaser/.test(lower) ? 'Teased' :
      /\bcheck\b/.test(lower) ? 'Check' : null;

    // The most recent breeding date on record for this mare. A "day N" reminder
    // is counted from when she was bred, not from today.
    const breedAnchor = () => {
      if (category === 'breed' && explicitDate) return explicitDate;
      if (!horse) return null;
      const bred = events
        .filter(e => e.horseId === horse.id && (e.type === 'breed' || e.type === 'breeding' || /bred|inseminat/i.test(e.title || '')))
        .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
      return bred.length ? bred[0].date : null;
    };

    // Did the message describe something that already happened?
    const takenVerb = /\b(bred|inseminat|covered|teased|administered|gave|injected|dosed|checked|performed|short[\s-]?cycled|foaled|delivered|did|done)\b/.test(lower);
    // Does it describe something to do later?
    const scheduleSignal = dayNumber !== null || daysOffset > 0
      || /\b(remind|reminder|schedule|scheduled|due|need to|needs to|will need|follow ?up|recheck|re-check|book)\b/.test(lower);

    // --- Action taken (becomes a logged event when it has a date) ---
    let actionTaken = '';
    if (takenVerb) {
      if (category === 'breed') actionTaken = /inseminat/.test(lower) ? 'Inseminated' : 'Bred';
      else if (category === 'short-cycle') actionTaken = 'Short cycled';
      else if (category === 'foaled') actionTaken = 'Foaled out';
      else if (category === 'drug') actionTaken = drugName ? `Administered ${drugName}` : 'Administered drug';
      else actionTaken = checkTask || 'Check';
    }
    // If nothing was scheduled and we couldn't spot a past-tense verb, treat the
    // message as a logged note so the user still gets an event to keep or edit.
    if (!actionTaken && !scheduleSignal) {
      actionTaken = checkTask || (category === 'breed' ? 'Bred' : category === 'short-cycle' ? 'Short cycled' : category === 'foaled' ? 'Foaled out' : category === 'drug' ? (drugName ? `Administered ${drugName}` : 'Administered drug') : 'Note');
    }
    const actionTakenDate = actionTaken ? (explicitDate || today()) : '';

    // --- Action item (becomes a scheduled reminder) ---
    let actionItem = '';
    let dueDate = '';
    if (scheduleSignal) {
      if (checkTask) {
        actionItem = checkTask;
      } else if (category === 'breed') {
        actionItem = takenVerb ? `Check ${mareLabel} for pregnancy` : `Breed ${mareLabel}`;
      } else if (category === 'drug') {
        actionItem = drugName ? `Administer ${drugName}` : 'Administer drug';
      } else if (category === 'short-cycle') {
        actionItem = `Short cycle ${mareLabel}`;
      } else if (category === 'foaled') {
        actionItem = `${mareLabel} foaling due`;
      } else {
        actionItem = 'Reminder';
      }
      if (dayNumber !== null && !/\(day \d+\)/.test(actionItem)) actionItem += ` (day ${dayNumber})`;

      if (dayNumber !== null) {
        dueDate = formatDate(addDays(parseLocalDate(breedAnchor() || actionTakenDate || today()), dayNumber));
      } else if (daysOffset > 0) {
        dueDate = formatDate(addDays(new Date(), daysOffset));
      } else {
        dueDate = explicitDate && !takenVerb ? explicitDate : today();
      }
    }

    return {
      horseId: horse?.id || null,
      horseName: horse?.barnName || 'Unknown',
      category,
      actionTaken,
      actionTakenDate,
      actionItem,
      dueDate,
      note: text,
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput('');
    
    if (chatMode === 'log') {
      // Log action mode. If the new message doesn't name a horse, reuse the one
      // the conversation was already about so follow-ups like "remind at day 28"
      // still attach to the right mare.
      const lastHorseId = [...messages].reverse().find(m => m.confirmData?.horseId)?.confirmData.horseId;
      const fallbackHorse = horses.find(h => h.id === lastHorseId) || null;
      const parsed = { ...parseInput(userMessage, fallbackHorse), id: `c${Date.now()}` };

      setMessages([
        ...messages,
        { 
          role: 'user', 
          text: userMessage, 
          timestamp: new Date() 
        },
        { 
          role: 'assistant', 
          text: `Here's what I understood for ${parsed.horseName}. Review or edit, then save.`,
          action: 'confirm',
          confirmData: parsed,
          timestamp: new Date(),
        },
      ]);
    } else {
      // Ask question mode - show loading state
      setMessages(prev => [
        ...prev,
        { 
          role: 'user', 
          text: userMessage, 
          timestamp: new Date() 
        },
        { 
          role: 'assistant', 
          text: '🤔 Thinking...',
          isAnswer: true,
          isLoading: true,
          timestamp: new Date(),
        },
      ]);

      // Get AI answer
      const answer = await answerQuestion(userMessage);
      
      setMessages(prev => 
        prev.map((msg, idx) => 
          msg.isLoading ? { ...msg, text: answer, isLoading: false } : msg
        )
      );
    }
  };

  const handleSaveConfirmation = (confirmData) => {
    const created = [];
    if (confirmData.horseId) {
      // An action taken with a date is recorded as a logged event on the horse's
      // timeline. With no action-taken text (or no date) nothing is logged.
      if (confirmData.actionTaken && confirmData.actionTakenDate) {
        onAddEvent({
          id: `e${Date.now()}`,
          horseId: confirmData.horseId,
          date: confirmData.actionTakenDate,
          type: confirmData.category,
          title: confirmData.actionTaken,
          detail: confirmData.note || '',
        });
        created.push('event');
      }
      // An action item becomes a scheduled reminder, so it surfaces on the horse
      // profile, the home reminders list, and the calendar on its due date.
      if (confirmData.actionItem) {
        onAddAction({
          id: `a${Date.now() + 1}`,
          horseId: confirmData.horseId,
          category: confirmData.category,
          title: confirmData.actionItem,
          note: confirmData.note || '',
          dueDate: confirmData.dueDate || today(),
          done: false,
        });
        created.push('action item');
      }
    }

    // Remove the confirmation message and add a success (or "nothing to save") note.
    const summary = !confirmData.horseId
      ? `⚠️ Pick a horse first — nothing was saved.`
      : created.length === 0
        ? `⚠️ Nothing to save — add an action taken or an action item.`
        : `✅ Saved ${created.join(' and ')} for ${confirmData.horseName}.`;

    const updatedMessages = messages.filter(m => m.confirmData?.id !== confirmData.id);
    setMessages([
      ...updatedMessages,
      {
        role: 'assistant',
        text: summary,
        timestamp: new Date(),
        success: created.length > 0,
      },
    ]);
  };

  const handleSaveEdit = () => {
    if (editingConfirmation) {
      // Update the confirmation message with edited data
      const updatedMessages = messages.map(m =>
        m.confirmData?.id === editingConfirmation.id
          ? { ...m, confirmData: editingConfirmation }
          : m
      );
      setMessages(updatedMessages);
      setEditingConfirmation(null);
    }
  };

  const answerQuestion = async (question) => {
    try {
      // Prepare context data about the user's breeding operation
      const context = {
        horses: horses.map(h => ({
          name: h.nickname || h.barnName,
          type: h.type,
          breed: h.breed,
          age: calculateAge(h.yob),
          breedingStatus: h.breedingStatus,
          plannedStallion: h.plannedStallion,
          foalDueDate: h.foalDueDate,
        })),
        actions: actions.map(a => ({
          title: a.title,
          horseName: horses.find(h => h.id === a.horseId)?.nickname || 'Unknown',
          dueDate: a.dueDate,
          done: a.done,
          note: a.note,
        })),
        events: events.map(e => ({
          title: e.title,
          horseName: horses.find(h => h.id === e.horseId)?.nickname || 'Unknown',
          date: e.date,
        })),
      };

      // Call Netlify serverless function instead of API directly
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        body: JSON.stringify({ question, context }),
      });

      const data = await response.json();
      
      if (data.text) {
        return data.text;
      } else if (data.error) {
        return `Error: ${data.error}`;
      } else {
        return "I couldn't process that question. Please try asking about your mares, actions, or schedule.";
      }
    } catch (error) {
      return "I encountered an error processing your question. Please try again.";
    }
  };

  return (
    <div style={styles.page}>
      <Header title="Breeding Log Chat" subtitle="AI-Powered" onBack={onBack} />

      {/* Chat Mode Toggle */}
      <div style={{ padding: `${DS.spacing.md} ${DS.spacing.lg}`, background: DS.colors.white, borderBottom: `1px solid ${DS.colors.border}`, display: 'flex', gap: DS.spacing.md }}>
        <button
          onClick={() => { setChatMode('log'); setMessages([]); }}
          style={{
            flex: 1,
            padding: `${DS.spacing.sm} ${DS.spacing.md}`,
            border: chatMode === 'log' ? `2px solid ${DS.colors.primary}` : `1px solid ${DS.colors.border}`,
            background: chatMode === 'log' ? DS.colors.primary : DS.colors.white,
            color: chatMode === 'log' ? 'white' : DS.colors.text,
            borderRadius: DS.radius.md,
            cursor: 'pointer',
            fontWeight: DS.typography.weight.semibold,
            fontSize: DS.typography.size.sm,
            transition: 'all 0.2s ease',
          }}
        >
          📝 Log Actions
        </button>
        <button
          onClick={() => { setChatMode('ask'); setMessages([]); }}
          style={{
            flex: 1,
            padding: `${DS.spacing.sm} ${DS.spacing.md}`,
            border: chatMode === 'ask' ? `2px solid ${DS.colors.primary}` : `1px solid ${DS.colors.border}`,
            background: chatMode === 'ask' ? DS.colors.primary : DS.colors.white,
            color: chatMode === 'ask' ? 'white' : DS.colors.text,
            borderRadius: DS.radius.md,
            cursor: 'pointer',
            fontWeight: DS.typography.weight.semibold,
            fontSize: DS.typography.size.sm,
            transition: 'all 0.2s ease',
          }}
        >
          💬 Ask Questions
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: '180px' }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: DS.spacing.lg }}>
            <div>
              <Sparkles size={48} color={DS.colors.primary} style={{ marginBottom: DS.spacing.lg }} />
              <h2 style={styles.h2}>{chatMode === 'log' ? 'Start Logging' : 'Ask Away'}</h2>
              <p style={styles.bodySmall}>{chatMode === 'log' ? 'Describe what happened with your mares' : 'Ask questions about your breeding list'}</p>
            </div>
          </div>
        ) : (
          <div style={{ padding: DS.spacing.lg }}>
            {messages.map((msg, i) => (
              <div key={i}>
                {/* User message */}
                {msg.role === 'user' && (
                  <div style={{ marginBottom: DS.spacing.lg, display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '80%', padding: `${DS.spacing.md} ${DS.spacing.lg}`, borderRadius: DS.radius.lg, background: DS.colors.primary, color: 'white', fontSize: DS.typography.size.base, lineHeight: 1.5 }}>
                      {msg.text}
                    </div>
                  </div>
                )}

                {/* AI response with confirmation card */}
                {msg.role === 'assistant' && msg.action === 'confirm' && msg.confirmData && (
                  <div style={{ marginBottom: DS.spacing.lg }}>
                    <div style={{ marginBottom: DS.spacing.md, textAlign: 'left' }}>
                      <p style={styles.bodySmall}>{msg.text}</p>
                    </div>

                    {/* Confirmation Card Preview */}
                    <div style={{
                      background: DS.colors.bgAlt,
                      border: `2px solid ${DS.colors.primary}`,
                      borderRadius: DS.radius.lg,
                      padding: DS.spacing.lg,
                      marginBottom: DS.spacing.md,
                    }}>
                      {/* Category Badge */}
                      <div style={{ marginBottom: DS.spacing.lg }}>
                        <div
                          style={{
                            display: 'inline-block',
                            padding: `${DS.spacing.xs} ${DS.spacing.md}`,
                            background: DS.colors.primary,
                            color: 'white',
                            borderRadius: DS.radius.full,
                            fontSize: DS.typography.size.xs,
                            fontWeight: DS.typography.weight.semibold,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {categoryLabel(msg.confirmData.category)}
                        </div>
                      </div>

                      <div style={{ marginBottom: DS.spacing.md, paddingBottom: DS.spacing.md, borderBottom: `1px solid ${DS.colors.border}` }}>
                        <div style={styles.label}>Mare</div>
                        <p style={{...styles.body, marginTop: DS.spacing.sm}}>{msg.confirmData.horseName}</p>
                      </div>

                      {/* Action taken -> becomes a timeline event */}
                      <div style={{ marginBottom: DS.spacing.md }}>
                        <div style={{...styles.label, color: msg.confirmData.actionTaken ? DS.colors.success : DS.colors.textMuted}}>
                          ✓ Action Taken
                        </div>
                        {msg.confirmData.actionTaken ? (
                          <>
                            <p style={{...styles.body, marginTop: DS.spacing.sm, fontWeight: DS.typography.weight.semibold}}>{msg.confirmData.actionTaken}</p>
                            <p style={{...styles.bodySmall, marginTop: DS.spacing.xs, color: DS.colors.textMuted}}>
                              {msg.confirmData.actionTakenDate ? `on ${relativeDate(msg.confirmData.actionTakenDate)}` : 'No date — won’t be logged'}
                            </p>
                          </>
                        ) : (
                          <p style={{...styles.bodySmall, marginTop: DS.spacing.sm, color: DS.colors.textMuted}}>None</p>
                        )}
                      </div>

                      {/* Action item -> becomes a scheduled reminder */}
                      <div style={{ marginBottom: DS.spacing.md, paddingBottom: DS.spacing.md, borderBottom: `1px solid ${DS.colors.border}` }}>
                        <div style={{...styles.label, color: msg.confirmData.actionItem ? DS.colors.gold : DS.colors.textMuted}}>
                          → Action Required
                        </div>
                        {msg.confirmData.actionItem ? (
                          <>
                            <p style={{...styles.body, marginTop: DS.spacing.sm, fontWeight: DS.typography.weight.semibold}}>{msg.confirmData.actionItem}</p>
                            <p style={{...styles.bodySmall, marginTop: DS.spacing.xs, color: DS.colors.textMuted}}>
                              {msg.confirmData.dueDate ? `Due ${relativeDate(msg.confirmData.dueDate)}` : 'Due today'}
                            </p>
                          </>
                        ) : (
                          <p style={{...styles.bodySmall, marginTop: DS.spacing.sm, color: DS.colors.textMuted}}>None</p>
                        )}
                      </div>

                      <div style={{ marginBottom: DS.spacing.md }}>
                        <div style={styles.label}>Additional Note</div>
                        <p style={{...styles.body, marginTop: DS.spacing.sm}}>{msg.confirmData.note || '—'}</p>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: DS.spacing.md, paddingTop: DS.spacing.lg, borderTop: `1px solid ${DS.colors.border}` }}>
                        <button
                          onClick={() => handleSaveConfirmation(msg.confirmData)}
                          style={{...styles.buttonBase, ...styles.buttonPrimary, flex: 1, fontSize: DS.typography.size.sm}}
                        >
                          <Check size={16} /> Save
                        </button>
                        <button
                          onClick={() => setEditingConfirmation(msg.confirmData)}
                          style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1, fontSize: DS.typography.size.sm}}
                        >
                          <Edit2 size={16} /> Edit
                        </button>
                      </div>
                    </div>

                    {/* Edit Modal */}
                    {editingConfirmation?.id === msg.confirmData.id && (
                      <div style={{...styles.card, marginLeft: 0, marginRight: 0, marginTop: DS.spacing.md, background: DS.colors.bgAlt, border: `2px solid ${DS.colors.gold}`}}>
                        <h3 style={{...styles.h3, color: DS.colors.gold}}>Edit Action</h3>

                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Horse</label>
                          <select
                            value={editingConfirmation.horseId || ''}
                            onChange={(e) => {
                              const selected = horses.find(h => h.id === e.target.value);
                              setEditingConfirmation({
                                ...editingConfirmation,
                                horseId: selected ? selected.id : null,
                                horseName: selected ? selected.barnName : 'Unknown',
                              });
                            }}
                            style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white}}
                          >
                            <option value="">Unknown</option>
                            {horses.map(h => (
                              <option key={h.id} value={h.id}>{h.barnName}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Category</label>
                          <select
                            value={editingConfirmation.category}
                            onChange={(e) => setEditingConfirmation({...editingConfirmation, category: e.target.value})}
                            style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white}}
                          >
                            {ACTION_CATEGORIES.map(c => (
                              <option key={c.key} value={c.key}>{c.label}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Action Taken</label>
                          <input
                            type="text"
                            value={editingConfirmation.actionTaken}
                            onChange={(e) => setEditingConfirmation({...editingConfirmation, actionTaken: e.target.value})}
                            placeholder="Leave blank if nothing was done"
                            style={{...styles.input, marginTop: DS.spacing.sm}}
                          />
                        </div>

                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Date Taken</label>
                          <input
                            type="date"
                            value={editingConfirmation.actionTakenDate}
                            onChange={(e) => setEditingConfirmation({...editingConfirmation, actionTakenDate: e.target.value})}
                            style={{...styles.input, marginTop: DS.spacing.sm}}
                          />
                        </div>

                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Action Required</label>
                          <input
                            type="text"
                            value={editingConfirmation.actionItem}
                            onChange={(e) => setEditingConfirmation({...editingConfirmation, actionItem: e.target.value})}
                            placeholder="Leave blank for no reminder"
                            style={{...styles.input, marginTop: DS.spacing.sm}}
                          />
                        </div>

                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Due Date</label>
                          <input
                            type="date"
                            value={editingConfirmation.dueDate}
                            onChange={(e) => setEditingConfirmation({...editingConfirmation, dueDate: e.target.value})}
                            style={{...styles.input, marginTop: DS.spacing.sm}}
                          />
                        </div>

                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Additional Note</label>
                          <textarea
                            value={editingConfirmation.note}
                            onChange={(e) => setEditingConfirmation({...editingConfirmation, note: e.target.value})}
                            style={{...styles.input, marginTop: DS.spacing.sm, minHeight: '80px', fontFamily: DS.typography.family.base}}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: DS.spacing.md, marginTop: DS.spacing.lg }}>
                          <button onClick={handleSaveEdit} style={{...styles.buttonBase, ...styles.buttonPrimary, flex: 1}}>Save Changes</button>
                          <button onClick={() => setEditingConfirmation(null)} style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1}}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Success message */}
                {msg.role === 'assistant' && msg.success && (
                  <div style={{ marginBottom: DS.spacing.lg, display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ maxWidth: '80%', padding: `${DS.spacing.md} ${DS.spacing.lg}`, borderRadius: DS.radius.lg, background: DS.colors.success, color: 'white', fontSize: DS.typography.size.base, lineHeight: 1.5 }}>
                      {msg.text}
                    </div>
                  </div>
                )}

                {/* Regular AI message */}
                {msg.role === 'assistant' && !msg.action && !msg.success && !msg.isAnswer && (
                  <div style={{ marginBottom: DS.spacing.lg, display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ maxWidth: '80%', padding: `${DS.spacing.md} ${DS.spacing.lg}`, borderRadius: DS.radius.lg, background: DS.colors.bgAlt, color: DS.colors.text, fontSize: DS.typography.size.base, lineHeight: 1.5 }}>
                      {msg.text}
                    </div>
                  </div>
                )}

                {/* Answer message */}
                {msg.role === 'assistant' && msg.isAnswer && (
                  <div style={{ marginBottom: DS.spacing.lg, display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ maxWidth: '90%', padding: `${DS.spacing.md} ${DS.spacing.lg}`, borderRadius: DS.radius.lg, background: DS.colors.primaryVeryLight, color: DS.colors.text, fontSize: DS.typography.size.base, lineHeight: 1.6, whiteSpace: 'pre-wrap', border: `1px solid ${DS.colors.primary}` }}>
                      {msg.text}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Input at Bottom */}
      <div style={{ 
        position: 'fixed', 
        bottom: '80px', 
        left: 0, 
        right: 0, 
        padding: DS.spacing.lg, 
        borderTop: `1px solid ${DS.colors.border}`, 
        background: DS.colors.white,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', gap: DS.spacing.md, maxWidth: '100%' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="What happened? (e.g., 'Bred Roma to Vitalis on May 28th, check pregnancy at day 28')"
            style={{...styles.input, flex: 1, minHeight: '44px', maxHeight: '100px', resize: 'none', borderColor: input ? DS.colors.primary : DS.colors.border}}
          />
          <button onClick={handleSend} style={{...styles.buttonBase, ...styles.buttonPrimary, width: '44px', height: '44px', padding: 0, minWidth: 'auto', flexShrink: 0}}>
            <Sparkles size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HORSES SCREEN
// ============================================================================

function HorsesScreen({ horses, onSelectHorse, onAddHorse, flash }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const emptyForm = {
    barnName: '', nickname: '', breed: '', type: 'mare',
    dateOfBirth: '', color: '', owner: '',
    sire: '', dam: '', damSire: '',
    discipline: '', size: '', additionalInfo: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [showBornModal, setShowBornModal] = useState(false);
  const [selectedBornHorse, setSelectedBornHorse] = useState(null);
  const [foalForm, setFoalForm] = useState({ name: '', gender: 'filly' });
  const [query, setQuery] = useState('');

  const handleAdd = () => {
    const errors = {};
    if (!formData.barnName || !formData.barnName.trim()) errors.barnName = 'Registered name is required';
    if (!formData.breed || !formData.breed.trim()) errors.breed = 'Breed is required';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    onAddHorse(formData);
    setFormData(emptyForm);
    setShowAddForm(false);
  };

  const mares = horses.filter(h => h.type === 'mare');
  const foals = horses.filter(h => h.type === 'foal');
  const foalsDue = horses.filter(h => h.type === 'mare' && h.foalDueDate);

  let filteredHorses = horses;
  if (filterType === 'mare') {
    filteredHorses = mares;
  } else if (filterType === 'foal') {
    filteredHorses = foals;
  } else if (filterType === 'foals-due') {
    filteredHorses = foalsDue;
  }

  // Free-text search across the registered name, barn name, discipline, breed,
  // and age (so typing a number like "12" matches 12-year-olds).
  const q = query.trim().toLowerCase();
  if (q) {
    filteredHorses = filteredHorses.filter(h => {
      const age = h.yob ? String(calculateAge(h.yob)) : '';
      return [h.barnName, h.nickname, h.name, h.discipline, h.breed, age]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q));
    });
  }

  const filterOptions = [
    { id: 'all', label: 'All', count: horses.length },
    { id: 'mare', label: 'Mares', count: mares.length },
    { id: 'foal', label: 'Foals', count: foals.length },
    { id: 'foals-due', label: 'Foals due', count: foalsDue.length },
  ];

  return (
    <div style={styles.page}>
      <Header title={`Horses (${filteredHorses.length})`} subtitle="All Horses" action={<button onClick={() => setShowAddForm(!showAddForm)} style={{...styles.buttonBase, ...styles.buttonPrimary, padding: `${DS.spacing.md} ${DS.spacing.lg}`}}><Plus size={20} /> Add</button>} />

      <div style={styles.scrollable}>
        <div style={styles.contentPadding}>
          {/* Search */}
          <div style={{ marginBottom: DS.spacing.lg, position: 'relative' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, age, or discipline…"
              style={{ ...styles.input, paddingRight: query ? '40px' : DS.spacing.lg }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: DS.spacing.md, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: DS.colors.textMuted, padding: DS.spacing.xs, display: 'flex' }}
                title="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: DS.spacing.sm, marginBottom: DS.spacing.xl, overflowX: 'auto', paddingBottom: DS.spacing.md, marginLeft: 0, marginRight: 0 }}>
            {filterOptions.map(option => (
              <button
                key={option.id}
                onClick={() => setFilterType(option.id)}
                style={{
                  padding: `${DS.spacing.sm} ${DS.spacing.lg}`,
                  border: filterType === option.id ? `2px solid ${DS.colors.primary}` : `1px solid ${DS.colors.border}`,
                  background: filterType === option.id ? DS.colors.primary : DS.colors.white,
                  color: filterType === option.id ? 'white' : DS.colors.text,
                  borderRadius: DS.radius.full,
                  cursor: 'pointer',
                  fontWeight: DS.typography.weight.semibold,
                  fontSize: DS.typography.size.sm,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {showAddForm && (
            <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
              <h3 style={styles.h3}>Add New Horse</h3>
              <HorseFormFields formData={formData} setFormData={setFormData} errors={formErrors} />
              <div style={{ marginTop: DS.spacing.lg, display: 'flex', gap: DS.spacing.md }}>
                <button onClick={handleAdd} style={{...styles.buttonBase, ...styles.buttonPrimary, flex: 1}}>Save</button>
                <button onClick={() => { setShowAddForm(false); setFormErrors({}); }} style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1}}>Cancel</button>
              </div>
            </div>
          )}

          {filteredHorses.length === 0 ? (
            <div style={{...styles.card, textAlign: 'center', marginLeft: 0, marginRight: 0}}>
              <p style={styles.bodySmall}>No horses</p>
            </div>
          ) : filterType === 'foals-due' ? (
            <>
              {filteredHorses.map(horse => {
                const daysUntil = getDaysUntilDue(horse.foalDueDate);
                const progressPercent = Math.max(0, Math.min(100, 100 - (daysUntil / 320) * 100));
                
                const handleBorn = () => {
                  const defaultName = `${horse.nickname || horse.barnName} + ${horse.plannedStallion} foal`;
                  setFoalForm({ name: defaultName, gender: 'filly' });
                  setSelectedBornHorse(horse);
                  setShowBornModal(true);
                };

                const handleSaveFoal = () => {
                  if (foalForm.name) {
                    onAddHorse({
                      name: foalForm.name,
                      barnName: foalForm.name,
                      nickname: foalForm.name,
                      type: 'foal',
                      breed: horse.breed,
                      yob: new Date().getFullYear(),
                      color: horse.expectedFoalColor || horse.color,
                      sire: horse.plannedStallion,
                      dam: horse.barnName,
                    });
                    flash(`${foalForm.name} born!`);
                    setShowBornModal(false);
                    setSelectedBornHorse(null);
                    setFoalForm({ name: '', gender: 'filly' });
                  }
                };
                
                return (
                  <div key={horse.id}>
                    <div onClick={() => onSelectHorse(horse.id)} style={{...styles.card, marginLeft: 0, marginRight: 0, cursor: 'pointer', marginBottom: showBornModal && selectedBornHorse?.id === horse.id ? 0 : DS.spacing.lg}}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: DS.spacing.md }}>
                        <div>
                          <h3 style={styles.h3}>{horse.nickname || horse.barnName}</h3>
                          <p style={{...styles.bodySmall, marginTop: DS.spacing.xs}}>Stallion: {horse.plannedStallion || 'Unknown'}</p>
                          <p style={{...styles.bodySmall, marginTop: DS.spacing.xs}}>Breed: {horse.breed}</p>
                          <p style={{...styles.bodySmall, marginTop: DS.spacing.xs}}>Expected: {horse.expectedFoalColor || 'Unknown color'}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: DS.typography.size.lg, fontWeight: DS.typography.weight.bold, color: daysUntil <= 30 ? DS.colors.error : DS.colors.primary }}>
                            {daysUntil > 0 ? `${daysUntil}d` : 'Due!'}
                          </div>
                          <p style={{...styles.bodySmall, marginTop: DS.spacing.xs}}>Due: {parseLocalDate(horse.foalDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          <p style={{...styles.bodySmall, marginTop: DS.spacing.xs}}>Conceived: {parseLocalDate(horse.conceptionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>
                      
                      {/* Timeline Tracker */}
                      <div style={{ marginTop: DS.spacing.md, paddingTop: DS.spacing.md, borderTop: `1px solid ${DS.colors.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.spacing.sm }}>
                          <p style={{...styles.label}}>Pregnancy Timeline</p>
                          <p style={{...styles.label}}>{Math.round(progressPercent)}%</p>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: DS.colors.bgAlt, borderRadius: DS.radius.full, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${progressPercent}%`,
                              background: progressPercent < 50 ? DS.colors.primary : progressPercent < 85 ? DS.colors.gold : DS.colors.error,
                              transition: 'width 0.3s ease',
                              borderRadius: DS.radius.full,
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: DS.spacing.sm }}>
                          <p style={{...styles.bodySmall, fontSize: DS.typography.size.xs}}>
                            {parseLocalDate(horse.conceptionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p style={{...styles.bodySmall, fontSize: DS.typography.size.xs}}>
                            {parseLocalDate(horse.foalDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Born Button */}
                      <button
                        onClick={() => handleBorn()}
                        style={{...styles.buttonBase, ...styles.buttonPrimary, width: '100%', marginTop: DS.spacing.lg}}
                      >
                        🎉 Born
                      </button>
                    </div>

                    {/* Born Modal */}
                    {showBornModal && selectedBornHorse?.id === horse.id && (
                      <div style={{...styles.card, marginLeft: 0, marginRight: 0, marginBottom: DS.spacing.lg, background: DS.colors.bgAlt, border: `2px solid ${DS.colors.primary}`}}>
                        <h3 style={styles.h3}>Register Foal</h3>
                        
                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Foal Name</label>
                          <input
                            type="text"
                            value={foalForm.name}
                            onChange={(e) => setFoalForm({...foalForm, name: e.target.value})}
                            style={{...styles.input, marginTop: DS.spacing.sm}}
                          />
                        </div>

                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Gender</label>
                          <select
                            value={foalForm.gender}
                            onChange={(e) => setFoalForm({...foalForm, gender: e.target.value})}
                            style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white}}
                          >
                            <option value="filly">Filly</option>
                            <option value="colt">Colt</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: DS.spacing.md, marginTop: DS.spacing.lg }}>
                          <button onClick={handleSaveFoal} style={{...styles.buttonBase, ...styles.buttonPrimary, flex: 1}}>Save</button>
                          <button onClick={() => { setShowBornModal(false); setSelectedBornHorse(null); }} style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1}}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            filteredHorses.map(horse => (
              <div key={horse.id} onClick={() => onSelectHorse(horse.id)} style={{...styles.card, marginLeft: 0, marginRight: 0, cursor: 'pointer'}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: DS.spacing.md }}>
                  <div>
                    <h3 style={styles.h3}>{horse.barnName}</h3>
                    {horse.nickname && horse.nickname !== horse.barnName && (
                      <p style={{...styles.bodySmall, color: DS.colors.textMuted}}>Barn name: {horse.nickname}</p>
                    )}
                    <p style={styles.bodySmall}>{horse.breed} • {horse.type === 'foal' ? `Born ${horse.yob}` : `${calculateAge(horse.yob)} years old`}</p>
                  </div>
                  {horse.status && (
                    <span style={{ flexShrink: 0, fontSize: DS.typography.size.xs, fontWeight: DS.typography.weight.semibold, color: 'white', background: getHorseStatusColor(horse.status), padding: `${DS.spacing.xs} ${DS.spacing.md}`, borderRadius: DS.radius.full, whiteSpace: 'nowrap' }}>
                      {horse.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CALENDAR SCREEN
// ============================================================================

function CalendarScreen({ actions, events = [], horses }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToPreviousWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const goToNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const goToPreviousDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const goToNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const getTodayNum = () => new Date().getDate();
  const isCurrentMonth = currentDate.getFullYear() === new Date().getFullYear() && currentDate.getMonth() === new Date().getMonth();

  const getWeekDays = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const weekStart = new Date(d.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getActionsForDate = (date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return actions.filter(a => a.dueDate === dateStr && !a.done);
  };

  // Action-taken events live on a horse's timeline under `date`. They are shown
  // on the calendar alongside reminders, but as colored dots rather than boxes.
  const getEventsForDate = (date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const getActionsForDay = (date) => {
    return getActionsForDate(date);
  };

  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const currentDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const weekDays = getWeekDays(currentDate);

  return (
    <div style={styles.page}>
      <Header title="Calendar" subtitle="Schedule" />

      <div style={styles.scrollable}>
        <div style={styles.contentPadding}>
          {/* View Mode Buttons */}
          <div style={{ display: 'flex', gap: DS.spacing.md, marginBottom: DS.spacing.xl, marginLeft: 0, marginRight: 0 }}>
            {['day', 'week', 'month'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  flex: 1,
                  padding: `${DS.spacing.md} ${DS.spacing.lg}`,
                  border: viewMode === mode ? 'none' : `1px solid ${DS.colors.border}`,
                  background: viewMode === mode ? DS.colors.primary : DS.colors.white,
                  color: viewMode === mode ? 'white' : DS.colors.text,
                  borderRadius: DS.radius.md,
                  cursor: 'pointer',
                  fontWeight: DS.typography.weight.semibold,
                  fontSize: DS.typography.size.sm,
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Day View */}
          {viewMode === 'day' && (
            <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.spacing.xl }}>
                <button onClick={goToPreviousDay} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: DS.spacing.md }}>
                  <ChevronLeft size={24} color={DS.colors.primary} />
                </button>
                <h2 style={{...styles.h2, margin: 0, fontSize: DS.typography.size['2xl']}}>{getDayName(currentDate)}</h2>
                <button onClick={goToNextDay} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: DS.spacing.md }}>
                  <ChevronRight size={24} color={DS.colors.primary} />
                </button>
              </div>

              <div style={{ marginTop: DS.spacing.xl }}>
                {getActionsForDay(currentDate).length === 0 && getEventsForDate(currentDate).length === 0 ? (
                  <p style={{...styles.bodySmall, textAlign: 'center', padding: DS.spacing.lg}}>No actions scheduled for this day</p>
                ) : (
                  <>
                    {getActionsForDay(currentDate).map(action => (
                      <div key={action.id} onClick={() => setSelectedEvent(action)} style={{...styles.card, marginLeft: 0, marginRight: 0, marginBottom: DS.spacing.md, cursor: 'pointer', transition: 'all 0.2s ease'}} onMouseEnter={(e) => e.currentTarget.style.boxShadow = DS.shadow.md} onMouseLeave={(e) => e.currentTarget.style.boxShadow = DS.shadow.xs}>
                        <h3 style={styles.h3}>{getActionTitleWithMareName(action, horses)}</h3>
                        {action.note && <p style={{...styles.bodySmall, marginTop: DS.spacing.sm}}>{action.note}</p>}
                      </div>
                    ))}
                    {getEventsForDate(currentDate).map(event => (
                      <div key={event.id} onClick={() => setSelectedEvent(event)} style={{ display: 'flex', alignItems: 'center', gap: DS.spacing.sm, padding: `${DS.spacing.sm} 0`, cursor: 'pointer' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getEventColor(event), flexShrink: 0 }} />
                        <h3 style={{...styles.h3, margin: 0, color: DS.colors.text}}>{getActionTitleWithMareName(event, horses)}</h3>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Week View */}
          {viewMode === 'week' && (
            <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.spacing.xl }}>
                <button onClick={goToPreviousWeek} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: DS.spacing.md }}>
                  <ChevronLeft size={24} color={DS.colors.primary} />
                </button>
                <h2 style={{...styles.h2, margin: 0, fontSize: DS.typography.size.lg}}>
                  {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </h2>
                <button onClick={goToNextWeek} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: DS.spacing.md }}>
                  <ChevronRight size={24} color={DS.colors.primary} />
                </button>
              </div>

              {/* Vertical Week View */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: DS.spacing.md }}>
                {weekDays.map((day, idx) => {
                  const dayActions = getActionsForDate(day);
                  const dayEvents = getEventsForDate(day);
                  const isToday = day.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={idx}
                      style={{
                        background: isToday ? DS.colors.primaryVeryLight : DS.colors.bgAlt,
                        border: `1px solid ${DS.colors.border}`,
                        borderRadius: DS.radius.md,
                        padding: DS.spacing.md,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.spacing.md, paddingBottom: DS.spacing.md, borderBottom: `1px solid ${DS.colors.border}` }}>
                        <div>
                          <div style={{...styles.label, marginBottom: DS.spacing.xs}}>
                            {day.toLocaleDateString('en-US', { weekday: 'long' })}
                          </div>
                          <div style={{...styles.h3, margin: 0}}>
                            {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        {(dayActions.length + dayEvents.length) > 0 && (
                          <div style={{...styles.label, color: DS.colors.primary}}>
                            {dayActions.length + dayEvents.length} item{(dayActions.length + dayEvents.length) !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      {dayActions.length === 0 && dayEvents.length === 0 ? (
                        <p style={{...styles.bodySmall, color: DS.colors.textMuted}}>No actions</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: DS.spacing.sm }}>
                          {dayActions.map(action => (
                            <div
                              key={action.id}
                              onClick={() => setSelectedEvent(action)}
                              style={{
                                background: DS.colors.primary,
                                color: 'white',
                                padding: DS.spacing.md,
                                borderRadius: DS.radius.sm,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                transform: 'translateY(0)',
                                opacity: 1,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = DS.shadow.md;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <h4 style={{...styles.h3, color: 'white', margin: '0 0 4px 0'}}>
                                {getActionTitleWithMareName(action, horses)}
                              </h4>
                              <p style={{...styles.bodySmall, color: 'rgba(255,255,255,0.9)', margin: 0}}>
                                {action.note || 'No details'}
                              </p>
                            </div>
                          ))}
                          {dayEvents.map(event => (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              style={{ display: 'flex', alignItems: 'center', gap: DS.spacing.sm, padding: `${DS.spacing.xs} 0`, cursor: 'pointer' }}
                            >
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getEventColor(event), flexShrink: 0 }} />
                              <span style={{...styles.body, color: DS.colors.text}}>
                                {getActionTitleWithMareName(event, horses)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month View */}
          {viewMode === 'month' && (
            <div style={{...styles.card, marginLeft: 0, marginRight: 0, padding: DS.spacing.md, width: '100%', boxSizing: 'border-box'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.spacing.xl }}>
                <button onClick={goToPreviousMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: DS.spacing.md }}>
                  <ChevronLeft size={24} color={DS.colors.primary} />
                </button>
                <h2 style={{...styles.h2, margin: 0, fontSize: DS.typography.size['2xl']}}>{monthName}</h2>
                <button onClick={goToNextMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: DS.spacing.md }}>
                  <ChevronRight size={24} color={DS.colors.primary} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '1px', marginBottom: DS.spacing.lg, background: DS.colors.border, padding: '1px', width: '100%' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} style={{ background: DS.colors.white, padding: `${DS.spacing.sm} 0`, textAlign: 'center', fontWeight: DS.typography.weight.semibold, fontSize: DS.typography.size.xs, color: DS.colors.textSecondary }}>
                    {day}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '1px', background: DS.colors.border, padding: '1px', width: '100%' }}>
                {days.map((day, i) => {
                  const isToday = isCurrentMonth && day === getTodayNum();
                  const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dayActions = day ? getActionsForDate(dayDate) : [];
                  const dayEvents = day ? getEventsForDate(dayDate) : [];
                  
                  return (
                    <div
                      key={i}
                      style={{
                        background: isToday ? DS.colors.primaryVeryLight : DS.colors.white,
                        padding: DS.spacing.xs,
                        minHeight: '72px',
                        textAlign: 'left',
                        color: day ? DS.colors.text : DS.colors.textMuted,
                        borderRadius: isToday ? DS.radius.md : '0',
                        overflow: 'hidden',
                      }}
                    >
                      {day && (
                        <>
                          <div style={{ fontSize: DS.typography.size.base, fontWeight: isToday ? DS.typography.weight.bold : DS.typography.weight.normal, marginBottom: DS.spacing.sm }}>
                            {day}
                          </div>
                          <div style={{ maxHeight: '60px', overflowY: 'hidden' }}>
                            {dayActions.map(action => (
                              <div
                                key={action.id}
                                onClick={() => setSelectedEvent(action)}
                                style={{
                                  background: DS.colors.primary,
                                  color: 'white',
                                  padding: `${DS.spacing.xs} ${DS.spacing.sm}`,
                                  borderRadius: DS.radius.sm,
                                  fontSize: DS.typography.size.xs,
                                  marginBottom: DS.spacing.xs,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  height: '20px',
                                  lineHeight: '20px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                                title={getActionTitleWithMareName(action, horses)}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                              >
                                {getActionTitleWithMareName(action, horses)}
                              </div>
                            ))}
                            {dayEvents.map(event => (
                              <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: DS.spacing.xs,
                                  color: DS.colors.text,
                                  fontSize: DS.typography.size.xs,
                                  marginBottom: DS.spacing.xs,
                                  height: '20px',
                                  lineHeight: '20px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                                title={getActionTitleWithMareName(event, horses)}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                              >
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getEventColor(event), flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {getActionTitleWithMareName(event, horses)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Event Detail Modal */}
          {selectedEvent && (
            <div style={{...styles.card, marginLeft: 0, marginRight: 0, marginTop: DS.spacing.xl, background: DS.colors.bgAlt, border: `2px solid ${DS.colors.primary}`}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: DS.spacing.lg }}>
                <h2 style={{...styles.h2, margin: 0, color: DS.colors.primary}}>
                  {selectedEvent.dueDate ? 'Action Required' : 'Action Taken'}
                </h2>
                <button onClick={() => setSelectedEvent(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px', color: DS.colors.text }}>
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: DS.spacing.lg, paddingBottom: DS.spacing.lg, borderBottom: `1px solid ${DS.colors.border}` }}>
                <div style={{ marginBottom: DS.spacing.md }}>
                  <div style={styles.label}>Action</div>
                  <h3 style={{...styles.h3, marginTop: DS.spacing.sm}}>
                    {getActionTitleWithMareName(selectedEvent, horses)}
                  </h3>
                </div>

                {(selectedEvent.note || selectedEvent.detail) && (
                  <div style={{ marginBottom: DS.spacing.md }}>
                    <div style={styles.label}>Details</div>
                    <p style={{...styles.body, marginTop: DS.spacing.sm}}>{selectedEvent.note || selectedEvent.detail}</p>
                  </div>
                )}

                <div style={{ marginBottom: (selectedEvent.dueDate && selectedEvent.priority) ? DS.spacing.md : 0 }}>
                  <div style={styles.label}>{selectedEvent.dueDate ? 'Due Date' : 'Date Taken'}</div>
                  <p style={{...styles.body, marginTop: DS.spacing.sm}}>{relativeDate(selectedEvent.dueDate || selectedEvent.date)}</p>
                </div>

                {selectedEvent.dueDate && selectedEvent.priority && (
                  <div>
                    <div style={styles.label}>Priority</div>
                    <p style={{...styles.body, marginTop: DS.spacing.sm, textTransform: 'capitalize', color: selectedEvent.priority === 'high' ? DS.colors.error : selectedEvent.priority === 'medium' ? DS.colors.gold : DS.colors.success}}>
                      {selectedEvent.priority}
                    </p>
                  </div>
                )}
              </div>

              <button onClick={() => setSelectedEvent(null)} style={{...styles.buttonBase, ...styles.buttonSecondary, width: '100%'}}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS SCREEN
// ============================================================================

function SettingsScreen() {
  return (
    <div style={styles.page}>
      <Header title="Settings" subtitle="Farm Profile" />

      <div style={styles.scrollable}>
        <div style={styles.contentPadding}>
          <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
            <h3 style={styles.h3}>White Horse Estate</h3>
            <p style={styles.bodySmall}>Breeding Farm</p>
            <div style={{ marginTop: DS.spacing.lg }}>
              <div style={styles.label}>Farm Manager</div>
              <p style={{...styles.body, marginTop: DS.spacing.sm}}>Sarah Hartwell</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BOTTOM NAVIGATION
// ============================================================================

function BottomNav({ activeTab, onChange }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'horses', label: 'Horses', icon: Heart },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'calendar', label: 'Calendar', icon: CalIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '80px',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      background: DS.colors.white,
      borderTop: `1px solid ${DS.colors.border}`,
      display: 'flex',
      justifyContent: 'space-around',
      zIndex: 100,
    }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: `${DS.spacing.md} ${DS.spacing.lg}`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: DS.spacing.xs,
              color: active ? DS.colors.primary : DS.colors.textMuted,
              transition: 'all 0.2s ease',
              fontSize: DS.typography.size.xs,
              fontWeight: active ? DS.typography.weight.semibold : DS.typography.weight.normal,
              minHeight: '64px',
              justifyContent: 'center',
            }}
          >
            <Icon size={24} strokeWidth={active ? 2 : 1.5} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const [route, setRoute] = useState(() => pathToRoute(window.location.pathname));
  const [horses, setHorses] = useState(SAMPLE_HORSES);
  const [actions, setActions] = useState(SAMPLE_ACTIONS);
  const [events, setEvents] = useState(SAMPLE_EVENTS);
  const [toast, setToast] = useState('');

  const activeTab = route.tab;
  const selectedHorse = route.horseId;

  // Push a new browser history entry and update the in-app route together, so
  // the address bar always matches the screen and back/forward work naturally.
  const navigate = (tab, horseId = null) => {
    const path = routeToPath(tab, horseId);
    if (path !== window.location.pathname) {
      window.history.pushState({}, '', path);
    }
    setRoute({ tab, horseId: horseId || null });
  };

  // Keep the view in sync when the user presses the browser back/forward buttons.
  useEffect(() => {
    const onPop = () => setRoute(pathToRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Load all previously saved data once on startup so records survive refreshes.
  // Retries a couple of times because the storage function can be slow to wake
  // on a cold start, and a single failed request would otherwise leave the app
  // looking empty even though the data is safely stored.
  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 0) => {
      try {
        const res = await fetch('/.netlify/functions/store');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled || !data) return;
        if (Array.isArray(data.horses)) setHorses(data.horses);
        if (Array.isArray(data.actions)) setActions(data.actions);
        if (Array.isArray(data.events)) setEvents(data.events);
      } catch (err) {
        console.error('Failed to load saved data:', err);
        if (cancelled) return;
        if (attempt < 2) {
          setTimeout(() => load(attempt + 1), 800 * (attempt + 1));
        } else {
          flash('Could not load saved data — check your connection');
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Save (insert or update) a single record. Awaits the server so the write
  // actually commits before the user can navigate away or refresh — a
  // fire-and-forget write could be dropped mid-flight on a slow connection,
  // making it look like nothing was saved. Surfaces any failure to the user
  // instead of swallowing it silently.
  const persistItem = async (collection, item) => {
    try {
      const res = await fetch('/.netlify/functions/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, item }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`);
      return true;
    } catch (err) {
      console.error(`Failed to save ${collection}:`, err);
      flash('Could not save — check your connection and try again');
      return false;
    }
  };

  const removeItem = async (collection, id) => {
    try {
      const res = await fetch('/.netlify/functions/store', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      console.error(`Failed to delete ${collection}:`, err);
      flash('Could not delete — check your connection and try again');
      return false;
    }
  };

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleAddHorse = (formData) => {
    const yob = formData.yob
      || (formData.dateOfBirth ? new Date(formData.dateOfBirth).getFullYear() : new Date().getFullYear());
    const newHorse = {
      id: `h${Date.now()}`,
      ...formData,
      yob,
      name: formData.name || formData.barnName,
      nickname: formData.nickname || formData.barnName,
      dateOfBirth: formData.dateOfBirth || '',
      color: formData.color || 'Bay',
      owner: formData.owner || '',
      sire: formData.sire || 'Unknown',
      dam: formData.dam || 'Unknown',
      damSire: formData.damSire || '',
      discipline: formData.discipline || '',
      size: formData.size || '',
      additionalInfo: formData.additionalInfo || '',
      breedingStatus: formData.type === 'mare' ? 'Waiting for cycle' : null,
      plannedStallion: null,
      expectedFoalColor: null,
      foalDueDate: null,
      conceptionDate: null,
      onBreedingList: formData.type === 'mare',
      status: formData.type === 'mare' ? 'Breeding this season' : 'Idle',
      files: [],
    };
    setHorses([...horses, newHorse]);
    persistItem('horses', newHorse);
    flash(`${newHorse.barnName} added!`);
  };

  const handleSelectHorse = (horseId) => {
    navigate('horses', horseId);
  };

  // Applies a change to one horse, updates state, and persists the new record.
  const updateHorse = (horseId, changes) => {
    const existing = horses.find(h => h.id === horseId);
    if (!existing) return null;
    const updated = { ...existing, ...changes };
    setHorses(horses.map(h => h.id === horseId ? updated : h));
    persistItem('horses', updated);
    return updated;
  };

  const handleUpdateStatus = (horseId, status) => {
    const horse = updateHorse(horseId, { breedingStatus: status });
    if (horse) flash(`${horse.barnName} status updated`);
  };

  const handleUpdateStallion = (horseId, stallion) => {
    updateHorse(horseId, { plannedStallion: stallion });
  };

  const handleToggleBreedingList = (horseId, onList) => {
    const horse = updateHorse(horseId, { onBreedingList: onList });
    if (horse) flash(onList ? `${horse.barnName} added to breeding list` : `${horse.barnName} removed from breeding list`);
  };

  const handleUpdateHorse = (horseId, updatedData) => {
    updateHorse(horseId, updatedData);
  };

  const handleUpdateHorseStatus = (horseId, status) => {
    const horse = updateHorse(horseId, { status });
    if (horse) flash(`${horse.barnName} marked "${status}"`);
  };

  const handleDeleteHorse = (horseId) => {
    const horse = horses.find(h => h.id === horseId);
    setHorses(horses.filter(h => h.id !== horseId));
    removeItem('horses', horseId);
    navigate('horses');
    if (horse) flash(`${horse.barnName} deleted`);
  };

  const handleToggleAction = (actionId) => {
    const existing = actions.find(a => a.id === actionId);
    if (!existing) return;
    const updated = { ...existing, done: !existing.done };
    setActions(actions.map(a => a.id === actionId ? updated : a));
    persistItem('actions', updated);
  };

  const handleDeleteAction = (actionId) => {
    setActions(actions.filter(a => a.id !== actionId));
    removeItem('actions', actionId);
    flash('Action deleted');
  };

  const handleEditAction = (actionId, updatedAction) => {
    setActions(actions.map(a => a.id === actionId ? updatedAction : a));
    persistItem('actions', updatedAction);
    flash('Action updated');
  };

  const selectedHorseData = horses.find(h => h.id === selectedHorse);

  return (
    <div style={{ width: '100%', height: '100vh', background: DS.colors.bg, fontFamily: DS.typography.family.base, color: DS.colors.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; padding: 0; background: ${DS.colors.bg}; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: ${DS.colors.primary} !important; background: ${DS.colors.white} !important; }
        button:hover { opacity: 0.9; }
        button:active { opacity: 0.85; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${DS.colors.border}; border-radius: 3px; }
      `}</style>

      {selectedHorse && selectedHorseData ? (
        <HorseDetailScreen
          horse={selectedHorseData}
          events={events}
          actions={actions}
          onBack={() => navigate('horses')}
          onUpdateStatus={handleUpdateStatus}
          onUpdateStallion={handleUpdateStallion}
          onToggleBreedingList={handleToggleBreedingList}
          onUpdateHorse={handleUpdateHorse}
          onUpdateHorseStatus={handleUpdateHorseStatus}
          onDeleteHorse={handleDeleteHorse}
        />
      ) : activeTab === 'home' ? (
        <HomeScreen
          horses={horses}
          actions={actions}
          onSelectHorse={handleSelectHorse}
          onNavigateToChat={() => navigate('chat')}
          onToggleAction={handleToggleAction}
          onDeleteAction={handleDeleteAction}
          onEditAction={handleEditAction}
        />
      ) : activeTab === 'horses' ? (
        <HorsesScreen horses={horses} onSelectHorse={handleSelectHorse} onAddHorse={handleAddHorse} flash={flash} />
      ) : activeTab === 'chat' ? (
        <ChatScreen
          horses={horses}
          actions={actions}
          events={events}
          onBack={() => navigate('home')}
          onAddEvent={(event) => {
            setEvents([...events, event]);
            persistItem('events', event);
            flash(`Event logged!`);
          }}
          onAddAction={(action) => {
            setActions([...actions, action]);
            persistItem('actions', action);
            flash(`Action added!`);
          }}
        />
      ) : activeTab === 'calendar' ? (
        <CalendarScreen actions={actions} events={events} horses={horses} />
      ) : (
        <SettingsScreen />
      )}

      {!selectedHorseData && <BottomNav activeTab={activeTab} onChange={(tab) => navigate(tab)} />}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: DS.colors.primary,
          color: 'white',
          padding: `${DS.spacing.md} ${DS.spacing.lg}`,
          borderRadius: DS.radius.full,
          fontSize: DS.typography.size.sm,
          fontWeight: DS.typography.weight.semibold,
          zIndex: 200,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
