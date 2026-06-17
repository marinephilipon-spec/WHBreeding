// ============================================
// MARE PROFILE COMPONENT
// Add to App.jsx - This is the mare detail view
// ============================================

function MareProfileScreen({ horse, horses, events, actions, onBack, onUpdateHorse, onAddEvent, onAddAction }) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [showFoalModal, setShowFoalModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(horse);

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
        open: '#8B7E8A'
      },
      success: '#6BA881',
      error: '#C84C3C',
    },
    typography: {
      family: { base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
      size: { xs: '12px', sm: '13px', base: '15px', lg: '17px', xl: '20px', '2xl': '24px', '3xl': '32px' },
      weight: { normal: 400, medium: 500, semibold: 600, bold: 700 }
    },
    spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '20px', '2xl': '24px', '3xl': '32px' },
    radius: { sm: '6px', md: '10px', lg: '14px', full: '999px' },
    shadow: { xs: '0 1px 2px rgba(26,23,21,0.04)', sm: '0 1px 3px rgba(26,23,21,0.08)', md: '0 4px 6px rgba(26,23,21,0.08)' },
  };

  // Helper functions
  const getStatusColor = (status) => {
    const statusMap = {
      'Waiting for cycle': DS.colors.status.waiting,
      'Ready to breed': DS.colors.status.ready,
      'Inseminated': DS.colors.status.bred,
      'Confirmed in foal': DS.colors.status.foal,
      'Lost - back open': DS.colors.error,
    };
    return statusMap[status] || DS.colors.status.open;
  };

  const getHorseEvents = () => events.filter(e => e.horseId === horse.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const getHorseActions = () => actions.filter(a => a.horseId === horse.id).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const calculateFoalDueDate = () => {
    if (horse.foalDueDate) return horse.foalDueDate;
    // Look for insemination event and add 280 days
    const insemEvent = getHorseEvents().find(e => e.type === 'insemination');
    if (insemEvent) {
      const d = new Date(insemEvent.date);
      d.setDate(d.getDate() + 280);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return null;
  };

  const getDaysUntilFoal = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = due - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getPregnancyProgress = (insemDate, dueDate) => {
    const insem = new Date(insemDate);
    const due = new Date(dueDate);
    const today = new Date();
    const total = due - insem;
    const elapsed = today - insem;
    return Math.min(Math.round((elapsed / total) * 100), 100);
  };

  // ============================================
  // HEADER SECTION
  // ============================================
  const headerStyle = {
    background: DS.colors.white,
    borderBottom: `0.5px solid ${DS.colors.border}`,
    padding: DS.spacing.lg,
  };

  const headerTitle = {
    margin: 0,
    fontSize: DS.typography.size['2xl'],
    fontWeight: DS.typography.weight.semibold,
    color: DS.colors.text,
  };

  const headerSubtitle = {
    margin: `4px 0 0 0`,
    fontSize: DS.typography.size.sm,
    color: DS.colors.textSecondary,
  };

  const statusBox = {
    background: DS.colors.bgAlt,
    padding: DS.spacing.md,
    borderRadius: DS.radius.md,
    border: `0.5px solid ${DS.colors.border}`,
  };

  const statusLabel = {
    fontSize: DS.typography.size.xs,
    color: DS.colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: DS.typography.weight.semibold,
    marginBottom: DS.spacing.xs,
  };

  const statusValue = {
    fontSize: DS.typography.size.lg,
    fontWeight: DS.typography.weight.semibold,
    color: getStatusColor(horse.breedingStatus || 'Waiting for cycle'),
  };

  const foalDueDate = calculateFoalDueDate();
  const isPregnant = horse.breedingStatus === 'Confirmed in foal';

  // ============================================
  // TAB SECTION
  // ============================================
  const tabStyle = {
    background: DS.colors.white,
    borderBottom: `0.5px solid ${DS.colors.border}`,
    padding: 0,
    display: 'flex',
    gap: 0,
  };

  const tabButton = (active) => ({
    padding: `${DS.spacing.md} ${DS.spacing.lg}`,
    border: 'none',
    background: 'none',
    color: active ? DS.colors.text : DS.colors.textSecondary,
    fontWeight: DS.typography.weight.medium,
    fontSize: DS.typography.size.base,
    cursor: 'pointer',
    borderBottom: `2px solid ${active ? DS.colors.primary : 'transparent'}`,
  });

  // ============================================
  // TIMELINE & ACTIONS TAB
  // ============================================
  if (activeTab === 'timeline') {
    const horseEvents = getHorseEvents();
    const horseActions = getHorseActions();
    const lastEvent = horseEvents[0];

    return (
      <div style={{ minHeight: '100vh', background: DS.colors.bg }}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: DS.spacing.md }}>
            <div>
              <h1 style={headerTitle}>{horse.barnName}</h1>
              <p style={headerSubtitle}>{horse.breed} Mare • Age {new Date().getFullYear() - horse.yob}</p>
            </div>
            <button
              onClick={() => { setIsEditing(true); setEditData(horse); }}
              style={{
                background: DS.colors.primary,
                color: DS.colors.white,
                border: 'none',
                padding: `${DS.spacing.sm} ${DS.spacing.md}`,
                borderRadius: DS.radius.sm,
                fontSize: DS.typography.size.xs,
                fontWeight: DS.typography.weight.medium,
                cursor: 'pointer',
              }}
            >
              ✎ Edit Profile
            </button>
          </div>

          {/* Status Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: DS.spacing.md }}>
            {/* Status Box */}
            <div style={statusBox}>
              <div style={statusLabel}>Status</div>
              <div style={statusValue}>{horse.breedingStatus || 'Waiting for cycle'}</div>
            </div>

            {/* Last Event Box */}
            {lastEvent && (
              <div style={statusBox}>
                <div style={statusLabel}>Last Event</div>
                <div style={{ fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.medium, color: DS.colors.text }}>
                  {lastEvent.title}
                </div>
                <div style={{ fontSize: DS.typography.size.xs, color: DS.colors.textMuted, marginTop: DS.spacing.xs }}>
                  {new Date(lastEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            )}

            {/* Foal Due Box */}
            {isPregnant && foalDueDate && (
              <div
                onClick={() => setShowFoalModal(true)}
                style={{
                  ...statusBox,
                  background: DS.colors.white,
                  border: `2px solid ${DS.colors.primary}`,
                  cursor: 'pointer',
                  boxShadow: DS.colors.white,
                }}
              >
                <div style={statusLabel}>Foal Due</div>
                <div style={{ fontSize: DS.typography.size['2xl'], fontWeight: DS.typography.weight.semibold, color: DS.colors.primary }}>
                  {new Date(foalDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: DS.typography.size.xs, color: DS.colors.textMuted }}>Click to see timeline</div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={tabStyle}>
          <button style={tabButton(activeTab === 'timeline')} onClick={() => setActiveTab('timeline')}>
            Timeline & Actions
          </button>
          <button style={tabButton(activeTab === 'documents')} onClick={() => setActiveTab('documents')}>
            Documents
          </button>
          <button style={tabButton(activeTab === 'pedigree')} onClick={() => setActiveTab('pedigree')}>
            Pedigree
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: DS.spacing.lg }}>
          {/* Breeding Summary */}
          {horse.plannedStallion && (
            <div style={{
              background: DS.colors.white,
              border: `0.5px solid ${DS.colors.border}`,
              borderRadius: DS.radius.lg,
              padding: DS.spacing.lg,
              marginBottom: DS.spacing.lg,
            }}>
              <h3 style={{ margin: 0, marginBottom: DS.spacing.md, fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.semibold, color: DS.colors.text }}>
                Breeding Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: DS.spacing.md }}>
                <div>
                  <div style={{ fontSize: DS.typography.size.xs, color: DS.colors.textSecondary, marginBottom: DS.spacing.xs }}>Bred To</div>
                  <div style={{ fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.semibold, color: DS.colors.text }}>
                    {horse.plannedStallion}
                  </div>
                </div>
                {lastEvent?.type === 'insemination' && (
                  <>
                    <div>
                      <div style={{ fontSize: DS.typography.size.xs, color: DS.colors.textSecondary, marginBottom: DS.spacing.xs }}>Semen Type</div>
                      <div style={{ fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.semibold, color: DS.colors.text }}>
                        {lastEvent.detail?.semenType || 'Fresh'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: DS.typography.size.xs, color: DS.colors.textSecondary, marginBottom: DS.spacing.xs }}>Breeding Date</div>
                      <div style={{ fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.semibold, color: DS.colors.text }}>
                        {new Date(lastEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    {isPregnant && foalDueDate && (
                      <div>
                        <div style={{ fontSize: DS.typography.size.xs, color: DS.colors.textSecondary, marginBottom: DS.spacing.xs }}>Days in Foal</div>
                        <div style={{ fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.semibold, color: DS.colors.text }}>
                          {Math.round((new Date() - new Date(lastEvent.date)) / (1000 * 60 * 60 * 24))} days
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Timeline Section */}
          <div style={{ marginBottom: DS.spacing.lg }}>
            <h3 style={{ margin: 0, marginBottom: DS.spacing.md, fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.semibold, color: DS.colors.text }}>
              Timeline
            </h3>
            <div style={{ display: 'grid', gap: DS.spacing.sm }}>
              {horseEvents.length === 0 ? (
                <div style={{ color: DS.colors.textSecondary, fontSize: DS.typography.size.base, padding: DS.spacing.lg, textAlign: 'center' }}>
                  No events yet
                </div>
              ) : (
                horseEvents.map((event, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: DS.colors.white,
                      border: `0.5px solid ${DS.colors.border}`,
                      borderRadius: DS.radius.md,
                      padding: DS.spacing.md,
                      display: 'flex',
                      gap: DS.spacing.md,
                    }}
                  >
                    <div style={{ minWidth: '40px', height: '40px', background: DS.colors.primaryVeryLight, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                      {event.type === 'insemination' ? '💉' : event.type === 'ovulation_confirmed' ? '✓' : '🔍'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: DS.typography.weight.medium, color: DS.colors.text, fontSize: DS.typography.size.base }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: DS.typography.size.sm, color: DS.colors.textSecondary, marginTop: DS.spacing.xs }}>
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                        {event.time && ` • ${event.time}`}
                      </div>
                      {event.detail && typeof event.detail === 'object' && Object.keys(event.detail).length > 0 && (
                        <div style={{ fontSize: DS.typography.size.xs, color: DS.colors.textMuted, marginTop: DS.spacing.xs }}>
                          {Object.entries(event.detail)
                            .filter(([k, v]) => v)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' • ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions Section */}
          <div>
            <h3 style={{ margin: 0, marginBottom: DS.spacing.md, fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.semibold, color: DS.colors.text }}>
              Actions Due
            </h3>
            <div style={{ display: 'grid', gap: DS.spacing.sm }}>
              {horseActions.length === 0 ? (
                <div style={{ color: DS.colors.textSecondary, fontSize: DS.typography.size.base, padding: DS.spacing.lg, textAlign: 'center' }}>
                  No pending actions
                </div>
              ) : (
                horseActions.map((action, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: DS.colors.white,
                      border: `0.5px solid ${DS.colors.border}`,
                      borderRadius: DS.radius.md,
                      padding: DS.spacing.md,
                      display: 'flex',
                      gap: DS.spacing.md,
                      alignItems: 'center',
                    }}
                  >
                    <input type="checkbox" style={{ width: '18px', height: '18px', cursor: 'pointer' }} defaultChecked={action.done} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: DS.typography.weight.medium, color: DS.colors.text, fontSize: DS.typography.size.base }}>
                        {action.title}
                      </div>
                      <div style={{ fontSize: DS.typography.size.sm, color: DS.colors.textSecondary, marginTop: DS.spacing.xs }}>
                        Due: {new Date(action.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                        {action.dueTime && ` ${action.dueTime}`}
                      </div>
                    </div>
                    <span style={{
                      background: action.priority === 'high' ? '#DC8A4C' : action.priority === 'medium' ? '#5A8784' : DS.colors.bgAlt,
                      color: action.priority === 'high' || action.priority === 'medium' ? 'white' : DS.colors.text,
                      padding: `4px 8px`,
                      borderRadius: DS.radius.sm,
                      fontSize: DS.typography.size.xs,
                      fontWeight: DS.typography.weight.medium,
                    }}>
                      {action.priority?.toUpperCase() || 'MED'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div style={{ padding: DS.spacing.lg }}>
          <button
            onClick={onBack}
            style={{
              background: DS.colors.primary,
              color: DS.colors.white,
              border: 'none',
              padding: `${DS.spacing.md} ${DS.spacing.lg}`,
              borderRadius: DS.radius.md,
              fontSize: DS.typography.size.base,
              fontWeight: DS.typography.weight.medium,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            ← Back to Mares
          </button>
        </div>

        {/* Foal Timeline Modal */}
        {showFoalModal && foalDueDate && (
          <FoalTimelineModal
            horse={horse}
            foalDueDate={foalDueDate}
            events={getHorseEvents()}
            onClose={() => setShowFoalModal(false)}
            DS={DS}
          />
        )}
      </div>
    );
  }

  // ============================================
  // DOCUMENTS TAB (Keep existing)
  // ============================================
  if (activeTab === 'documents') {
    return (
      <div style={{ minHeight: '100vh', background: DS.colors.bg }}>
        <div style={headerStyle}>
          <h1 style={headerTitle}>{horse.barnName}</h1>
          <button onClick={onBack} style={{ color: DS.colors.primary, cursor: 'pointer', background: 'none', border: 'none', fontSize: DS.typography.size.lg }}>
            ← Back
          </button>
        </div>
        <div style={{ padding: DS.spacing.lg }}>
          {/* Existing documents code goes here */}
          <p style={{ color: DS.colors.textSecondary }}>Documents tab content (existing implementation)</p>
        </div>
      </div>
    );
  }

  // ============================================
  // PEDIGREE TAB (Keep existing)
  // ============================================
  if (activeTab === 'pedigree') {
    return (
      <div style={{ minHeight: '100vh', background: DS.colors.bg }}>
        <div style={headerStyle}>
          <h1 style={headerTitle}>{horse.barnName}</h1>
          <button onClick={onBack} style={{ color: DS.colors.primary, cursor: 'pointer', background: 'none', border: 'none', fontSize: DS.typography.size.lg }}>
            ← Back
          </button>
        </div>
        <div style={{ padding: DS.spacing.lg }}>
          {/* Existing pedigree code goes here */}
          <p style={{ color: DS.colors.textSecondary }}>Pedigree tab content (existing implementation)</p>
        </div>
      </div>
    );
  }
}

// ============================================
// FOAL TIMELINE MODAL COMPONENT
// ============================================

function FoalTimelineModal({ horse, foalDueDate, events, onClose, DS }) {
  const insemEvent = events.find(e => e.type === 'insemination');
  const confirmEvent = events.find(e => e.type === 'pregnancy_check_14d');
  const heartbeatEvent = events.find(e => e.type === 'pregnancy_check_28d');

  const insemDate = new Date(insemEvent?.date || foalDueDate);
  const dueDate = new Date(foalDueDate);
  const today = new Date();
  const totalDays = (dueDate - insemDate) / (1000 * 60 * 60 * 24);
  const elapsedDays = (today - insemDate) / (1000 * 60 * 60 * 24);
  const progressPercent = Math.min(Math.round((elapsedDays / totalDays) * 100), 100);
  const daysRemaining = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

  const modalOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(26,23,21,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalContent = {
    background: DS.colors.white,
    borderRadius: DS.radius.lg,
    border: `0.5px solid ${DS.colors.border}`,
    maxWidth: '520px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: DS.shadow.md,
  };

  const modalHeader = {
    padding: DS.spacing.lg,
    borderBottom: `0.5px solid ${DS.colors.border}`,
    position: 'sticky',
    top: 0,
    background: DS.colors.white,
  };

  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        {/* Header */}
        <div style={modalHeader}>
          <h2 style={{ margin: 0, marginBottom: DS.spacing.sm, fontSize: DS.typography.size.lg, fontWeight: DS.typography.weight.semibold, color: DS.colors.text }}>
            {horse.barnName} - Foal Timeline
          </h2>
          <p style={{ margin: 0, fontSize: DS.typography.size.sm, color: DS.colors.textSecondary }}>
            Expected due: {dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: DS.spacing.lg, display: 'flex', flexDirection: 'column', gap: DS.spacing['2xl'] }}>
          
          {/* Breeding Details */}
          <div style={{ background: DS.colors.bgAlt, padding: DS.spacing.lg, borderRadius: DS.radius.md, border: `0.5px solid ${DS.colors.border}` }}>
            <h3 style={{ margin: 0, marginBottom: DS.spacing.md, fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.semibold, color: DS.colors.text }}>
              Breeding Details
            </h3>
            <div style={{ display: 'grid', gap: DS.spacing.sm, fontSize: DS.typography.size.sm }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: DS.colors.textSecondary }}>Sire:</span>
                <span style={{ color: DS.colors.text, fontWeight: DS.typography.weight.medium }}>
                  {insemEvent?.detail?.stallionName || horse.plannedStallion || 'Unknown'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: DS.colors.textSecondary }}>Semen Type:</span>
                <span style={{ color: DS.colors.text, fontWeight: DS.typography.weight.medium }}>
                  {insemEvent?.detail?.semenType || 'Unknown'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: DS.colors.textSecondary }}>Bred Date:</span>
                <span style={{ color: DS.colors.text, fontWeight: DS.typography.weight.medium }}>
                  {insemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                </span>
              </div>
              {confirmEvent && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: DS.colors.textSecondary }}>Confirmed Date:</span>
                  <span style={{ color: DS.colors.text, fontWeight: DS.typography.weight.medium }}>
                    {new Date(confirmEvent.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: DS.spacing.sm }}>
              <span style={{ fontSize: DS.typography.size.sm, fontWeight: DS.typography.weight.medium, color: DS.colors.text }}>
                Pregnancy Progress
              </span>
              <span style={{ fontSize: DS.typography.size.sm, color: DS.colors.textSecondary }}>
                {Math.round(elapsedDays)}/{Math.round(totalDays)} days ({progressPercent}%)
              </span>
            </div>
            <div style={{ width: '100%', height: '12px', background: DS.colors.bgAlt, borderRadius: DS.radius.sm, overflow: 'hidden', border: `0.5px solid ${DS.colors.border}` }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: DS.colors.success, borderRadius: DS.radius.sm }}></div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 style={{ margin: 0, marginBottom: DS.spacing.md, fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.semibold, color: DS.colors.text }}>
              Pregnancy Timeline
            </h3>
            <div style={{ position: 'relative', paddingLeft: DS.spacing['2xl'] }}>
              {/* Timeline line */}
              <div style={{ position: 'absolute', left: '8px', top: 0, bottom: 0, width: '1px', background: DS.colors.border }}></div>

              {/* Timeline points */}
              {[
                { label: 'Insemination', date: insemEvent?.date, status: 'done', icon: '💉' },
                { label: '14-day Check', date: confirmEvent?.date, status: confirmEvent ? 'done' : 'pending', icon: '🔍' },
                { label: '28-day Heartbeat', date: heartbeatEvent?.date, status: heartbeatEvent ? 'done' : 'pending', icon: '💗' },
                { label: 'Expected Foaling', date: foalDueDate, status: 'future', icon: '🐴' },
              ].map((point, idx) => (
                <div key={idx} style={{ marginBottom: DS.spacing['2xl'] }}>
                  <div style={{
                    position: 'absolute',
                    left: '-6px',
                    width: '16px',
                    height: '16px',
                    background: point.status === 'done' ? DS.colors.primary : point.status === 'pending' ? DS.colors.status.ready : DS.colors.border,
                    border: `2px solid white`,
                    borderRadius: '50%',
                  }}></div>
                  <div style={{ paddingTop: DS.spacing.xs }}>
                    <div style={{ fontWeight: DS.typography.weight.medium, fontSize: DS.typography.size.sm, color: DS.colors.text }}>
                      {point.label}
                    </div>
                    <div style={{ fontSize: DS.typography.size.xs, color: DS.colors.textSecondary }}>
                      {point.date ? new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : 'TBD'}
                    </div>
                    <div style={{ fontSize: DS.typography.size.xs, color: point.status === 'done' ? DS.colors.success : point.status === 'pending' ? DS.colors.status.waiting : DS.colors.textMuted, marginTop: DS.spacing.xs }}>
                      {point.status === 'done' && '✓ Completed'}
                      {point.status === 'pending' && `⏳ Due in ${daysRemaining} days`}
                      {point.status === 'future' && `${daysRemaining} days to go`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Dates */}
          <div style={{ background: DS.colors.bgAlt, padding: DS.spacing.lg, borderRadius: DS.radius.md, border: `0.5px solid ${DS.colors.border}` }}>
            <h3 style={{ margin: 0, marginBottom: DS.spacing.md, fontSize: DS.typography.size.base, fontWeight: DS.typography.weight.semibold, color: DS.colors.text }}>
              Key Dates
            </h3>
            <div style={{ display: 'grid', gap: DS.spacing.sm, fontSize: DS.typography.size.sm }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: DS.colors.textSecondary }}>Expected foaling:</span>
                <span style={{ color: DS.colors.primary, fontWeight: DS.typography.weight.semibold }}>
                  {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: DS.spacing.lg, borderTop: `0.5px solid ${DS.colors.border}`, textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: `${DS.spacing.md} ${DS.spacing.lg}`,
              background: DS.colors.white,
              color: DS.colors.text,
              border: `0.5px solid ${DS.colors.border}`,
              borderRadius: DS.radius.md,
              fontWeight: DS.typography.weight.medium,
              fontSize: DS.typography.size.base,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPORT
// ============================================

export { MareProfileScreen, FoalTimelineModal };
