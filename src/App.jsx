import React, { useState } from 'react';
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

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const relativeDate = (d) => {
  const date = new Date(d);
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

const getStatusColor = (status) => ({
  'Waiting for cycle': DS.colors.status.waiting,
  'Ready to breed': DS.colors.status.ready,
  'Inseminated': DS.colors.status.bred,
  '14-day pregnancy check': DS.colors.status.bred,
  'Confirmed in foal': DS.colors.status.foal,
  'Lost - back open': DS.colors.status.open,
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

const getDaysUntilDue = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
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
// HORSE DETAIL SCREEN
// ============================================================================

function HorseDetailScreen({ horse, events, actions, onBack, onUpdateStatus, onUpdateStallion, onToggleBreedingList, onUpdateHorse }) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [status, setStatus] = useState(horse.breedingStatus || '');
  const [stallion, setStallion] = useState(horse.plannedStallion || '');
  const [onList, setOnList] = useState(horse.onBreedingList);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const fileInputRef = React.useRef(null);

  const horseEvents = events.filter(e => e.horseId === horse.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const horseActions = actions.filter(a => a.horseId === horse.id);
  const age = calculateAge(horse.yob);

  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const newFile = {
        id: `f${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedDate: new Date().toISOString().split('T')[0],
      };
      const updatedFiles = [...(horse.files || []), newFile];
      onUpdateHorse(horse.id, { ...horse, files: updatedFiles });
      setShowFileUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = (fileId) => {
    const updatedFiles = (horse.files || []).filter(f => f.id !== fileId);
    onUpdateHorse(horse.id, { ...horse, files: updatedFiles });
  };

  return (
    <div style={styles.page}>
      <Header title={horse.barnName} subtitle={horse.type.toUpperCase()} onBack={onBack} />

      <div style={styles.scrollable}>
        <div style={styles.contentPadding}>
          {/* Quick Info */}
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
                <div style={styles.label}>Born</div>
                <p style={{...styles.body, marginTop: DS.spacing.sm}}>{horse.yob}</p>
              </div>
            </div>
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
                <div>
                  <div style={styles.label}>Dam</div>
                  <p style={{...styles.body, marginTop: DS.spacing.sm}}>{horse.dam}</p>
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
                      onChange={handleFileUpload}
                      style={{ display: 'block', marginBottom: DS.spacing.md, width: '100%', padding: DS.spacing.md, border: `2px dashed ${DS.colors.primary}`, borderRadius: DS.radius.md, cursor: 'pointer', background: DS.colors.primaryVeryLight }}
                    />
                    <button 
                      onClick={() => setShowFileUpload(false)}
                      style={{...styles.buttonBase, background: DS.colors.border, color: DS.colors.text, width: '100%'}}>
                      Cancel
                    </button>
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
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DS.spacing.md }}>
                        <FileText size={24} color={DS.colors.primary} />
                        <div>
                          <p style={{...styles.body, marginTop: 0}}>{file.name}</p>
                          <p style={{...styles.bodySmall, color: DS.colors.textMuted}}>Uploaded {relativeDate(file.uploadedDate)}</p>
                        </div>
                      </div>
                    </div>
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

  const breedingMares = horses.filter(h => h.type === 'mare' && h.onBreedingList);
  const pendingActions = actions.filter(a => !a.done);

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
            {pendingActions.length === 0 ? (
              <div style={{...styles.card, textAlign: 'center', marginLeft: 0, marginRight: 0}}>
                <p style={styles.bodySmall}>No pending actions</p>
              </div>
            ) : (
              pendingActions.map(action => (
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

  const parseInput = (text) => {
    // Simple parser - in production this would use AI
    const horseMatches = horses.map(h => h.barnName.toLowerCase()).join('|');
    const horseRegex = new RegExp(`(${horseMatches})`, 'i');
    const horseMatch = text.match(horseRegex);
    
    const horse = horseMatch ? horses.find(h => h.barnName.toLowerCase() === horseMatch[0].toLowerCase()) : null;
    
    let actionType = 'check';
    let title = 'Event';
    let detail = text;
    let actionCategory = 'taken';
    let daysOffset = 0;
    
    // Extract timeframe mentions
    const daysMatch = text.match(/(\d+)\s*(?:day|days)/i);
    const weeksMatch = text.match(/(\d+)\s*(?:week|weeks)/i);
    
    if (daysMatch) {
      daysOffset = parseInt(daysMatch[1]);
      actionCategory = 'upcoming';
    } else if (weeksMatch) {
      daysOffset = parseInt(weeksMatch[1]) * 7;
      actionCategory = 'upcoming';
    }
    
    // Detect if it's a breeding scenario
    if (text.toLowerCase().includes('bred')) {
      actionType = 'breeding';
      
      // If there's a timeframe mentioned after bred
      if (daysOffset > 0) {
        title = `Check ${horse?.nickname || horse?.barnName || 'mare'} for pregnancy in ${daysOffset} day${daysOffset !== 1 ? 's' : ''}`;
        detail = text;
        actionCategory = 'upcoming';
      } else {
        title = 'Bred';
        detail = text;
        actionCategory = 'taken';
      }
    } else if (text.toLowerCase().includes('teased')) {
      title = 'Teased';
      detail = 'Positive to teaser';
      actionCategory = 'taken';
    } else if (text.toLowerCase().includes('ultrasound') || text.toLowerCase().includes('check')) {
      if (daysOffset > 0) {
        title = `Check ${horse?.nickname || horse?.barnName || 'mare'} - Ultrasound in ${daysOffset} day${daysOffset !== 1 ? 's' : ''}`;
        detail = text;
        actionCategory = 'upcoming';
      } else {
        title = 'Ultrasound Check';
        detail = text;
        actionCategory = 'taken';
      }
    } else if (text.toLowerCase().includes('schedule') || text.toLowerCase().includes('due') || text.toLowerCase().includes('need')) {
      actionCategory = 'upcoming';
      if (text.toLowerCase().includes('ultrasound')) {
        title = 'Schedule ultrasound';
      } else if (text.toLowerCase().includes('breed')) {
        title = 'Schedule breeding';
      } else {
        title = 'Upcoming action';
      }
    }

    // Calculate due date
    let dueDate = today();
    if (daysOffset > 0) {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    return {
      horseId: horse?.id || null,
      horseName: horse?.barnName || 'Unknown',
      actionType,
      title,
      detail,
      date: dueDate,
      actionCategory,
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput('');
    
    if (chatMode === 'log') {
      // Log action mode
      const parsed = parseInput(userMessage);
      
      setMessages([
        ...messages,
        { 
          role: 'user', 
          text: userMessage, 
          timestamp: new Date() 
        },
        { 
          role: 'assistant', 
          text: `I understood: logging this event for ${parsed.horseName}`, 
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
    if (confirmData.horseId) {
      onAddEvent({
        id: `e${Date.now()}`,
        horseId: confirmData.horseId,
        date: confirmData.date,
        type: confirmData.actionType,
        title: confirmData.title,
        detail: confirmData.detail,
      });
    }

    // Remove the confirmation message and add success message
    const updatedMessages = messages.filter(m => m.confirmData?.title !== confirmData.title);
    setMessages([
      ...updatedMessages,
      {
        role: 'assistant',
        text: `✅ Logged! "${confirmData.title}" for ${confirmData.horseName}`,
        timestamp: new Date(),
        success: true,
      },
    ]);
  };

  const handleSaveEdit = () => {
    if (editingConfirmation) {
      // Update the confirmation message with edited data
      const updatedMessages = messages.map(m => 
        m.confirmData?.title === editingConfirmation.title 
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
                      {/* Action Category Badge */}
                      <div style={{ marginBottom: DS.spacing.lg }}>
                        <div 
                          style={{
                            display: 'inline-block',
                            padding: `${DS.spacing.xs} ${DS.spacing.md}`,
                            background: msg.confirmData.actionCategory === 'taken' ? DS.colors.success : DS.colors.gold,
                            color: 'white',
                            borderRadius: DS.radius.full,
                            fontSize: DS.typography.size.xs,
                            fontWeight: DS.typography.weight.semibold,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {msg.confirmData.actionCategory === 'taken' ? '✓ Action Taken' : '→ Upcoming Action'}
                        </div>
                      </div>

                      <div style={{ marginBottom: DS.spacing.md }}>
                        <div style={styles.label}>Horse</div>
                        <p style={{...styles.body, marginTop: DS.spacing.sm}}>{msg.confirmData.horseName}</p>
                      </div>

                      <div style={{ marginBottom: DS.spacing.md }}>
                        <div style={styles.label}>Event</div>
                        <p style={{...styles.body, marginTop: DS.spacing.sm}}>{msg.confirmData.title}</p>
                      </div>

                      <div style={{ marginBottom: DS.spacing.md }}>
                        <div style={styles.label}>Details</div>
                        <p style={{...styles.body, marginTop: DS.spacing.sm}}>{msg.confirmData.detail}</p>
                      </div>

                      <div style={{ marginBottom: DS.spacing.md, paddingBottom: DS.spacing.md, borderBottom: `1px solid ${DS.colors.border}` }}>
                        <div style={styles.label}>Action</div>
                        <p style={{...styles.body, marginTop: DS.spacing.sm, fontWeight: DS.typography.weight.semibold, color: DS.colors.primary}}>{msg.confirmData.title}</p>
                      </div>

                      <div style={{ marginBottom: DS.spacing.md }}>
                        <div style={styles.label}>Date</div>
                        <p style={{...styles.body, marginTop: DS.spacing.sm}}>{relativeDate(msg.confirmData.date)}</p>
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
                    {editingConfirmation?.title === msg.confirmData.title && (
                      <div style={{...styles.card, marginLeft: 0, marginRight: 0, marginTop: DS.spacing.md, background: DS.colors.bgAlt, border: `2px solid ${DS.colors.gold}`}}>
                        <h3 style={{...styles.h3, color: DS.colors.gold}}>Edit Action</h3>

                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Action Title</label>
                          <input
                            type="text"
                            value={editingConfirmation.title}
                            onChange={(e) => setEditingConfirmation({...editingConfirmation, title: e.target.value})}
                            style={{...styles.input, marginTop: DS.spacing.sm}}
                          />
                        </div>

                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Details</label>
                          <textarea
                            value={editingConfirmation.detail}
                            onChange={(e) => setEditingConfirmation({...editingConfirmation, detail: e.target.value})}
                            style={{...styles.input, marginTop: DS.spacing.sm, minHeight: '80px', fontFamily: DS.typography.family.base}}
                          />
                        </div>

                        <div style={{ marginTop: DS.spacing.lg }}>
                          <label style={styles.label}>Date</label>
                          <input
                            type="date"
                            value={editingConfirmation.date}
                            onChange={(e) => setEditingConfirmation({...editingConfirmation, date: e.target.value})}
                            style={{...styles.input, marginTop: DS.spacing.sm}}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: DS.spacing.md, marginTop: DS.spacing.lg }}>
                          <button onClick={handleSaveEdit} style={{...styles.buttonBase, ...styles.buttonPrimary, flex: 1}}>Save Changes</button>
                          <button onClick={() => setEditingConfirmation(null)} style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1}}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}}

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
            placeholder="What happened? (e.g., 'Roma teased, ready to breed')"
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
  const [formData, setFormData] = useState({ barnName: '', nickname: '', breed: '', yob: new Date().getFullYear(), type: 'mare' });
  const [showBornModal, setShowBornModal] = useState(false);
  const [selectedBornHorse, setSelectedBornHorse] = useState(null);
  const [foalForm, setFoalForm] = useState({ name: '', gender: 'filly' });

  const handleAdd = () => {
    if (formData.barnName && formData.breed) {
      onAddHorse(formData);
      setFormData({ barnName: '', nickname: '', breed: '', yob: new Date().getFullYear(), type: 'mare' });
      setShowAddForm(false);
    }
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
              <div style={{ marginTop: DS.spacing.lg }}>
                <label style={styles.label}>Barn Name</label>
                <input type="text" value={formData.barnName} onChange={(e) => setFormData({...formData, barnName: e.target.value})} placeholder="e.g., Roma" style={{...styles.input, marginTop: DS.spacing.sm}} />
              </div>
              <div style={{ marginTop: DS.spacing.lg }}>
                <label style={styles.label}>Nickname (optional)</label>
                <input type="text" value={formData.nickname} onChange={(e) => setFormData({...formData, nickname: e.target.value})} placeholder="e.g., Rom" style={{...styles.input, marginTop: DS.spacing.sm}} />
              </div>
              <div style={{ marginTop: DS.spacing.lg }}>
                <label style={styles.label}>Type</label>
                <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white}}>
                  <option value="mare">Mare</option>
                  <option value="foal">Foal</option>
                  <option value="stallion">Stallion</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div style={{ marginTop: DS.spacing.lg }}>
                <label style={styles.label}>Breed</label>
                <input type="text" value={formData.breed} onChange={(e) => setFormData({...formData, breed: e.target.value})} placeholder="e.g., KWPN" style={{...styles.input, marginTop: DS.spacing.sm}} />
              </div>
              <div style={{ marginTop: DS.spacing.lg, display: 'flex', gap: DS.spacing.md }}>
                <button onClick={handleAdd} style={{...styles.buttonBase, ...styles.buttonPrimary, flex: 1}}>Save</button>
                <button onClick={() => setShowAddForm(false)} style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1}}>Cancel</button>
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
                          <p style={{...styles.bodySmall, marginTop: DS.spacing.xs}}>Due: {new Date(horse.foalDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          <p style={{...styles.bodySmall, marginTop: DS.spacing.xs}}>Conceived: {new Date(horse.conceptionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
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
                            {new Date(horse.conceptionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p style={{...styles.bodySmall, fontSize: DS.typography.size.xs}}>
                            {new Date(horse.foalDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                <h3 style={styles.h3}>{horse.barnName}</h3>
                <p style={styles.bodySmall}>{horse.breed} • {horse.type === 'foal' ? `Born ${horse.yob}` : `${calculateAge(horse.yob)} years old`}</p>
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

function CalendarScreen({ actions, horses }) {
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
                {getActionsForDay(currentDate).length === 0 ? (
                  <p style={{...styles.bodySmall, textAlign: 'center', padding: DS.spacing.lg}}>No actions scheduled for this day</p>
                ) : (
                  getActionsForDay(currentDate).map(action => (
                    <div key={action.id} onClick={() => setSelectedEvent(action)} style={{...styles.card, marginLeft: 0, marginRight: 0, marginBottom: DS.spacing.md, cursor: 'pointer', transition: 'all 0.2s ease'}} onMouseEnter={(e) => e.currentTarget.style.boxShadow = DS.shadow.md} onMouseLeave={(e) => e.currentTarget.style.boxShadow = DS.shadow.xs}>
                      <h3 style={styles.h3}>{getActionTitleWithMareName(action, horses)}</h3>
                      {action.note && <p style={{...styles.bodySmall, marginTop: DS.spacing.sm}}>{action.note}</p>}
                    </div>
                  ))
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
                        {dayActions.length > 0 && (
                          <div style={{...styles.label, color: DS.colors.primary}}>
                            {dayActions.length} action{dayActions.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      {dayActions.length === 0 ? (
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
            <div style={{...styles.card, marginLeft: 0, marginRight: 0, width: '100%', boxSizing: 'border-box', overflowX: 'auto'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.spacing.xl }}>
                <button onClick={goToPreviousMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: DS.spacing.md }}>
                  <ChevronLeft size={24} color={DS.colors.primary} />
                </button>
                <h2 style={{...styles.h2, margin: 0, fontSize: DS.typography.size['2xl']}}>{monthName}</h2>
                <button onClick={goToNextMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: DS.spacing.md }}>
                  <ChevronRight size={24} color={DS.colors.primary} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))', gap: '1px', marginBottom: DS.spacing.lg, background: DS.colors.border, padding: '1px', width: '100%' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} style={{ background: DS.colors.white, padding: DS.spacing.md, textAlign: 'center', fontWeight: DS.typography.weight.semibold, fontSize: DS.typography.size.sm, color: DS.colors.textSecondary }}>
                    {day}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))', gap: '1px', background: DS.colors.border, padding: '1px', width: '100%' }}>
                {days.map((day, i) => {
                  const isToday = isCurrentMonth && day === getTodayNum();
                  const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dayActions = day ? getActionsForDate(dayDate) : [];
                  
                  return (
                    <div
                      key={i}
                      style={{
                        background: isToday ? DS.colors.primaryVeryLight : DS.colors.white,
                        padding: `${DS.spacing.md}`,
                        minHeight: '100px',
                        textAlign: 'left',
                        color: day ? DS.colors.text : DS.colors.textMuted,
                        borderRadius: isToday ? DS.radius.md : '0',
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
                <h2 style={{...styles.h2, margin: 0, color: DS.colors.primary}}>Action Details</h2>
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

                {selectedEvent.note && (
                  <div style={{ marginBottom: DS.spacing.md }}>
                    <div style={styles.label}>Details</div>
                    <p style={{...styles.body, marginTop: DS.spacing.sm}}>{selectedEvent.note}</p>
                  </div>
                )}

                <div style={{ marginBottom: DS.spacing.md }}>
                  <div style={styles.label}>Due Date</div>
                  <p style={{...styles.body, marginTop: DS.spacing.sm}}>{relativeDate(selectedEvent.dueDate)}</p>
                </div>

                <div>
                  <div style={styles.label}>Priority</div>
                  <p style={{...styles.body, marginTop: DS.spacing.sm, textTransform: 'capitalize', color: selectedEvent.priority === 'high' ? DS.colors.error : selectedEvent.priority === 'medium' ? DS.colors.gold : DS.colors.success}}>
                    {selectedEvent.priority}
                  </p>
                </div>
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
  const [activeTab, setActiveTab] = useState('home');
  const [horses, setHorses] = useState(SAMPLE_HORSES);
  const [actions, setActions] = useState(SAMPLE_ACTIONS);
  const [events, setEvents] = useState(SAMPLE_EVENTS);
  const [selectedHorse, setSelectedHorse] = useState(null);
  const [toast, setToast] = useState('');

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleAddHorse = (formData) => {
    const newHorse = {
      id: `h${Date.now()}`,
      ...formData,
      name: formData.name || formData.barnName,
      nickname: formData.nickname || formData.barnName,
      color: formData.color || 'Bay',
      sire: formData.sire || 'Unknown',
      dam: formData.dam || 'Unknown',
      breedingStatus: formData.type === 'mare' ? 'Waiting for cycle' : null,
      plannedStallion: null,
      expectedFoalColor: null,
      foalDueDate: null,
      conceptionDate: null,
      onBreedingList: formData.type === 'mare',
      files: [],
    };
    setHorses([...horses, newHorse]);
    flash(`${newHorse.barnName} added!`);
  };

  const handleSelectHorse = (horseId) => {
    setSelectedHorse(horseId);
  };

  const handleUpdateStatus = (horseId, status) => {
    setHorses(horses.map(h => h.id === horseId ? {...h, breedingStatus: status} : h));
    const horse = horses.find(h => h.id === horseId);
    flash(`${horse.barnName} status updated`);
  };

  const handleUpdateStallion = (horseId, stallion) => {
    setHorses(horses.map(h => h.id === horseId ? {...h, plannedStallion: stallion} : h));
  };

  const handleToggleBreedingList = (horseId, onList) => {
    setHorses(horses.map(h => h.id === horseId ? {...h, onBreedingList: onList} : h));
    const horse = horses.find(h => h.id === horseId);
    flash(onList ? `${horse.barnName} added to breeding list` : `${horse.barnName} removed from breeding list`);
  };

  const handleUpdateHorse = (horseId, updatedData) => {
    setHorses(horses.map(h => h.id === horseId ? {...h, ...updatedData} : h));
  };

  const handleToggleAction = (actionId) => {
    setActions(actions.map(a => a.id === actionId ? {...a, done: !a.done} : a));
  };

  const handleDeleteAction = (actionId) => {
    setActions(actions.filter(a => a.id !== actionId));
    flash('Action deleted');
  };

  const handleEditAction = (actionId, updatedAction) => {
    setActions(actions.map(a => a.id === actionId ? updatedAction : a));
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
          onBack={() => setSelectedHorse(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdateStallion={handleUpdateStallion}
          onToggleBreedingList={handleToggleBreedingList}
          onUpdateHorse={handleUpdateHorse}
        />
      ) : activeTab === 'home' ? (
        <HomeScreen
          horses={horses}
          actions={actions}
          onSelectHorse={handleSelectHorse}
          onNavigateToChat={() => setActiveTab('chat')}
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
          onBack={() => setActiveTab('home')}
          onAddEvent={(event) => {
            setEvents([...events, event]);
            flash(`Event logged!`);
          }}
          onAddAction={(action) => {
            setActions([...actions, action]);
            flash(`Action added!`);
          }}
        />
      ) : activeTab === 'calendar' ? (
        <CalendarScreen actions={actions} horses={horses} />
      ) : (
        <SettingsScreen />
      )}

      {!selectedHorse && <BottomNav activeTab={activeTab} onChange={setActiveTab} />}

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
