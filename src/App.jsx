# Complete App.jsx Updates
## Smart Chat + Mare Profile Integration

---

## 📋 WHAT TO UPDATE IN App.jsx

This document shows EXACTLY what to add/change in your App.jsx file.

---

## 🔧 SECTION 1: ADD IMPORTS (at top of App.jsx)

```javascript
// Add this import at the top with your other imports
import { MareProfileScreen, FoalTimelineModal } from './MareProfileComponent';
```

---

## 🔧 SECTION 2: ADD STATE VARIABLES (in App component)

Add these to your existing useState declarations:

```javascript
// Add to your existing useState calls in the App component:

const [currentScreen, setCurrentScreen] = useState('mares'); // 'mares' | 'mareDetail' | 'chat'
const [selectedMareId, setSelectedMareId] = useState(null); // Which mare is being viewed

// For chat mode
const [chatMode, setChatMode] = useState('log'); // 'log' or 'ask'
const [smartPreview, setSmartPreview] = useState(null); // { event, autoActionsToCreate, confidence, clarifications }
const [isParsingChat, setIsParsingChat] = useState(false); // Loading state for AI parsing
```

---

## 🔧 SECTION 3: NEW CHAT FUNCTION - Parse with AI

Add this function to your App component (with other handlers):

```javascript
// Call Claude to parse breeding event
async function parseEventWithAI(userInput) {
  setIsParsingChat(true);
  
  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'log',
        input: userInput,
        mareNames: horses.filter(h => h.type === 'mare').map(h => h.barnName),
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Parsing error:', data.error);
      return null;
    }

    return data; // { eventType, mareName, eventDate, eventTime, eventDetails, autoActionsToCreate, confidence, clarifications }
  } catch (error) {
    console.error('Chat error:', error);
    return null;
  } finally {
    setIsParsingChat(false);
  }
}
```

---

## 🔧 SECTION 4: CREATE EVENT FROM PARSED DATA

Add this function:

```javascript
// Create EVENT object from parsed data
function createEventFromParsed(parsed) {
  const today = new Date();
  const dateStr = parsed.eventDate || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const titleMap = {
    ultrasound_check: `Ultrasound Check`,
    insemination: `Inseminated`,
    ovulation_confirmed: `Ovulation Confirmed`,
    ovulation_check_no_result: `No Ovulation Yet`,
    intensive_check_12h: `12-Hour Check`,
    intensive_check_6h: `6-Hour Check`,
    lutalyse_given: `Lutalyse Given`,
    double_ovulation: `Double Ovulation`,
    uterine_issue: `Uterine Issue`,
    pregnancy_check_14d: `14-Day Pregnancy Check`,
    pregnancy_check_28d: `28-Day Heartbeat Check`,
    pregnancy_failed: `Pregnancy Lost`,
  };

  const mare = horses.find(h => h.barnName === parsed.mareName);
  
  return {
    id: `e${Date.now()}`,
    horseId: mare?.id,
    date: dateStr,
    time: parsed.eventTime || '12:00',
    type: parsed.eventType,
    title: `${parsed.mareName} - ${titleMap[parsed.eventType] || parsed.eventType}`,
    detail: parsed.eventDetails || {},
    linkedActions: [],
  };
}
```

---

## 🔧 SECTION 5: CREATE ACTIONS FROM EVENT

Add this function:

```javascript
// Auto-create actions based on event type
function createActionsFromEvent(event, mare) {
  const actions = [];
  const eventDate = new Date(event.date);
  const eventTime = event.time || '12:00';

  const createAction = (type, title, daysOffset, priority = 'medium', note = '') => {
    const dueDate = new Date(eventDate);
    dueDate.setDate(dueDate.getDate() + daysOffset);
    
    return {
      id: `a${Date.now()}${Math.random()}`,
      horseId: mare.id,
      type,
      title: `${daysOffset > 0 ? `${daysOffset}-day ` : ''}${title} - ${mare.barnName}`,
      dueDate: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`,
      dueTime: daysOffset === 0 ? eventTime : '12:00', // Same time if same day
      priority,
      done: false,
      note,
      linkedEventType: event.type,
    };
  };

  // Smart protocol: Auto-create actions based on event
  switch (event.type) {
    case 'insemination':
      // 24-hour ovulation check + 14-day pregnancy check
      actions.push(createAction('ovulation_check_24h', 'Ovulation Check', 1, 'high', 'Check if follicle ruptured'));
      actions.push(createAction('pregnancy_check_14d', 'Pregnancy Check', 14, 'medium', 'Ultrasound to confirm pregnancy'));
      break;

    case 'ovulation_confirmed':
      // Delete 14d action, create 7d action instead
      actions.push(createAction('pregnancy_check_7d', '7-Day Recheck', 7, 'medium', 'Follow-up ultrasound'));
      break;

    case 'pregnancy_check_14d':
      if (event.detail?.result === 'positive' || event.detail?.embryo) {
        // Positive: create 28-day check
        actions.push(createAction('pregnancy_check_28d', 'Heartbeat Check', 28, 'medium', 'Ultrasound to confirm heartbeat'));
      } else {
        // Negative: create cycle restart action
        actions.push(createAction('cycle_restart', 'Cycle Restart', 7, 'medium', 'Monitor for new heat cycle'));
      }
      break;

    case 'pregnancy_check_28d':
      if (event.detail?.result !== 'negative') {
        // Heartbeat confirmed: monthly monitoring
        actions.push(createAction('monthly_check', 'Monthly Check', 30, 'low', 'Routine monthly pregnancy check'));
      }
      break;

    case 'lutalyse_given':
      // Monitor for new heat in 7 days
      actions.push(createAction('heat_check', 'New Heat Watch', 7, 'high', 'Monitor for signs of new heat'));
      break;

    case 'intensive_check_12h':
      // Recurring 12-hour checks
      actions.push(createAction('intensive_check_12h_next', '12-Hour Check', 0.5, 'high', 'Recurring 12-hour monitoring'));
      break;

    case 'intensive_check_6h':
      // Recurring 6-hour checks
      actions.push(createAction('intensive_check_6h_next', '6-Hour Check', 0.25, 'high', 'Recurring 6-hour monitoring'));
      break;

    case 'uterine_issue':
      // URGENT: flush needed today
      actions.push(createAction('uterine_flush', 'URGENT - Uterine Flush', 0, 'critical', 'Uterus needs flushing today'));
      break;

    case 'double_ovulation':
      // Alert + pregnancy complication watch
      actions.push(createAction('double_ov_watch', 'Double Ovulation Watch', 7, 'high', 'Monitor for complications'));
      break;
  }

  return actions;
}
```

---

## 🔧 SECTION 6: UPDATE MARE STATUS

Add this function:

```javascript
// Auto-update mare status based on event
function updateMareStatusFromEvent(mareId, eventType) {
  const statusMap = {
    insemination: 'Inseminated',
    ovulation_confirmed: 'Ovulation Confirmed',
    pregnancy_check_14d: (event) => event.detail?.result === 'positive' ? 'Confirmed in foal' : 'Lost - back open',
    pregnancy_check_28d: 'Confirmed in foal',
    pregnancy_failed: 'Lost - back open',
  };

  const newStatus = statusMap[eventType];
  if (newStatus) {
    setHorses(horses.map(h => 
      h.id === mareId 
        ? { ...h, breedingStatus: newStatus }
        : h
    ));
  }
}
```

---

## 🔧 SECTION 7: HANDLE LOG MODE SEND

Add this function:

```javascript
// Main handler for log mode chat
async function handleSendLog(text) {
  if (!text.trim()) return;

  // Add user message to chat
  const userMsg = { role: 'user', content: text };
  setChatMessages([...chatMessages, userMsg]);
  setUserInput('');

  // Parse with AI
  const parsed = await parseEventWithAI(text);
  
  if (!parsed) {
    setChatMessages(prev => [...prev, { role: 'assistant', content: '❌ Could not parse that. Try again or switch to Ask mode.' }]);
    return;
  }

  // Create event from parsed data
  const event = createEventFromParsed(parsed);
  const mare = horses.find(h => h.barnName === parsed.mareName);

  if (!mare) {
    setChatMessages(prev => [...prev, { role: 'assistant', content: `❌ Mare "${parsed.mareName}" not found. Check the name and try again.` }]);
    return;
  }

  // Create auto-actions
  const autoActions = createActionsFromEvent(event, mare);

  // Show smart preview
  setSmartPreview({
    event,
    autoActionsToCreate: autoActions,
    confidence: parsed.confidence || 0.85,
    clarifications: parsed.clarifications || [],
  });

  // Add assistant message
  const previewMsg = {
    role: 'assistant',
    content: `📋 Preview: ${event.title} + ${autoActions.length} actions. Click [Save] or [Edit] below.`,
  };
  setChatMessages(prev => [...prev, previewMsg]);
}
```

---

## 🔧 SECTION 8: SAVE PREVIEW

Add this function:

```javascript
// Save event + auto-actions to state
function handleSavePreview() {
  if (!smartPreview) return;

  const { event, autoActionsToCreate } = smartPreview;
  const mare = horses.find(h => h.id === event.horseId);

  // Add event
  setEvents([...events, event]);

  // Add auto-actions
  setActions([...actions, ...autoActionsToCreate]);

  // Update mare status
  updateMareStatusFromEvent(event.horseId, event.type);

  // Add confirmation message
  const confirmMsg = {
    role: 'assistant',
    content: `✅ Saved! ${event.title} created with ${autoActionsToCreate.length} actions. Ready for next update!`,
  };
  setChatMessages(prev => [...prev, confirmMsg]);

  // Clear preview
  setSmartPreview(null);
}
```

---

## 🔧 SECTION 9: UPDATE handleSend()

Replace your existing handleSend() with this:

```javascript
async function handleSend() {
  if (!userInput.trim()) return;

  if (chatMode === 'log') {
    await handleSendLog(userInput);
  } else {
    // Ask mode - use existing answerQuestion()
    await answerQuestion();
  }
}
```

---

## 🔧 SECTION 10: SMART PREVIEW UI (in chat screen)

Add this in your chat rendering (after chat messages, before input):

```javascript
{smartPreview && (
  <div style={{
    background: 'white',
    border: `2px solid ${DS.colors.primary}`,
    borderRadius: DS.radius.lg,
    padding: DS.spacing.lg,
    marginBottom: DS.spacing.lg,
    boxShadow: DS.shadow.md,
  }}>
    <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: DS.spacing.md, color: DS.colors.text }}>
      📋 This will create:
    </div>

    {/* EVENT PREVIEW */}
    <div style={{ marginBottom: DS.spacing.lg }}>
      <div style={{ fontSize: '12px', textTransform: 'uppercase', color: DS.colors.textSecondary, fontWeight: 600, marginBottom: DS.spacing.sm }}>
        Event
      </div>
      <div style={{
        background: DS.colors.bgAlt,
        padding: DS.spacing.md,
        borderRadius: DS.radius.md,
        border: `0.5px solid ${DS.colors.border}`,
      }}>
        <div style={{ fontWeight: 500, fontSize: '15px', color: DS.colors.text, marginBottom: DS.spacing.sm }}>
          {smartPreview.event.title}
        </div>
        <div style={{ fontSize: '13px', color: DS.colors.textSecondary }}>
          {new Date(smartPreview.event.date).toLocaleDateString()} {smartPreview.event.time}
        </div>
      </div>
    </div>

    {/* ACTIONS PREVIEW */}
    {smartPreview.autoActionsToCreate.length > 0 && (
      <div style={{ marginBottom: DS.spacing.lg, borderTop: `0.5px solid ${DS.colors.border}`, paddingTop: DS.spacing.lg }}>
        <div style={{ fontSize: '12px', textTransform: 'uppercase', color: DS.colors.textSecondary, fontWeight: 600, marginBottom: DS.spacing.sm }}>
          Auto-created actions
        </div>
        {smartPreview.autoActionsToCreate.map((action, idx) => (
          <div key={idx} style={{
            background: DS.colors.bgAlt,
            padding: DS.spacing.md,
            borderRadius: DS.radius.md,
            border: `0.5px solid ${DS.colors.border}`,
            marginBottom: DS.spacing.sm,
          }}>
            <div style={{ fontWeight: 500, fontSize: '13px', color: DS.colors.textSecondary, marginBottom: DS.spacing.xs }}>
              {idx + 1}. {action.type}
            </div>
            <div style={{ fontWeight: 500, fontSize: '15px', color: DS.colors.text }}>
              {action.title}
            </div>
            <div style={{ fontSize: '13px', color: DS.colors.textSecondary, marginTop: DS.spacing.xs }}>
              Due: {new Date(action.dueDate).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    )}

    {/* BUTTONS */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: DS.spacing.sm, borderTop: `0.5px solid ${DS.colors.border}`, paddingTop: DS.spacing.lg }}>
      <button
        onClick={handleSavePreview}
        style={{
          padding: DS.spacing.md,
          background: DS.colors.success,
          color: 'white',
          border: 'none',
          borderRadius: DS.radius.md,
          fontWeight: 500,
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        ✓ Save
      </button>
      <button
        onClick={() => setSmartPreview(null)}
        style={{
          padding: DS.spacing.md,
          background: DS.colors.white,
          color: DS.colors.text,
          border: `0.5px solid ${DS.colors.border}`,
          borderRadius: DS.radius.md,
          fontWeight: 500,
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        ✎ Edit
      </button>
      <button
        onClick={() => setSmartPreview(null)}
        style={{
          padding: DS.spacing.md,
          background: DS.colors.white,
          color: DS.colors.text,
          border: `0.5px solid ${DS.colors.border}`,
          borderRadius: DS.radius.md,
          fontWeight: 500,
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        ✕ Cancel
      </button>
    </div>
  </div>
)}
```

---

## 🔧 SECTION 11: MARE LIST - CLICK TO VIEW PROFILE

Update your mare list to show profiles. Add this onClick to each mare:

```javascript
onClick={() => {
  setSelectedMareId(horse.id);
  setCurrentScreen('mareDetail');
}}
```

---

## 🔧 SECTION 12: ADD MARE PROFILE SCREEN

Add this to your main render (update currentScreen logic):

```javascript
if (currentScreen === 'mareDetail') {
  const selectedMare = horses.find(h => h.id === selectedMareId);
  return (
    <MareProfileScreen
      horse={selectedMare}
      horses={horses}
      events={events}
      actions={actions}
      onBack={() => setCurrentScreen('mares')}
      onUpdateHorse={(id, updates) => setHorses(horses.map(h => h.id === id ? { ...h, ...updates } : h))}
      onAddEvent={(event) => setEvents([...events, event])}
      onAddAction={(action) => setActions([...actions, action])}
    />
  );
}
```

---

## 🔧 SECTION 13: UPDATE chat.js

Replace your `netlify/functions/chat.js` with the `chat-v2.js` file we created earlier.

---

## 📝 QUICK REFERENCE

**States added:**
- `currentScreen` - Track which screen is showing
- `selectedMareId` - Which mare profile is open
- `chatMode` - 'log' or 'ask'
- `smartPreview` - The preview card data
- `isParsingChat` - Loading state

**New functions:**
- `parseEventWithAI()` - Call Claude to parse
- `createEventFromParsed()` - Build event object
- `createActionsFromEvent()` - Build auto-actions
- `updateMareStatusFromEvent()` - Update mare status
- `handleSendLog()` - Main log mode handler
- `handleSavePreview()` - Save event + actions

**Smart Protocol:**
- Insemination → 24h + 14d actions
- Ovulation → Create 7d action
- 14d positive → "Confirmed in foal" status
- 14d negative → "Lost - back open" status
- Lutalyse → Heat watch action
- Uterine issue → URGENT flush action

---

## ✅ TESTING CHECKLIST

After updating, test:

1. **Chat parsing**
   - [ ] "Inseminate Roma fresh 11am" → Shows preview
   - [ ] "Spirit 36 right 36 left" → Shows preview
   - [ ] Click [Save] → Event + actions created

2. **Mare status updates**
   - [ ] After insemination → Status = "Inseminated"
   - [ ] After 14d positive → Status = "Confirmed in foal"
   - [ ] After 14d negative → Status = "Lost - back open"

3. **Mare profile**
   - [ ] Click mare name → Shows profile
   - [ ] Timeline shows all events
   - [ ] Actions due shows all pending actions
   - [ ] "Foal Due" button appears if pregnant
   - [ ] Click "Foal Due" → Modal shows timeline

4. **Complete flow**
   - [ ] Log event in chat
   - [ ] Save preview
   - [ ] Click mare name
   - [ ] Profile shows event + actions
   - [ ] Status is correct

---

**YOU'RE READY TO CODE!** 🚀
