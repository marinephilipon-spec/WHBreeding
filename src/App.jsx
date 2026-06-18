import React, { useState, useEffect } from 'react';
import {
  Home, Calendar as CalIcon, Heart, MessageSquare, Settings,
  ChevronRight, ChevronLeft, ChevronDown, Plus, Sparkles, Check, X,
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

// The current local time of day as "HH:MM". Used to stamp a logged event with
// the moment it was created when the note itself doesn't state a time of day.
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// The action categories used by the timeline-event / action editor on a horse
// profile. The key is stored on events/actions (as `category`); the label is
// what the editor's dropdown shows.
const ACTION_CATEGORIES = [
  { key: 'check', label: 'Check' },
  { key: 'breed', label: 'Breed / Inseminate' },
  { key: 'drug', label: 'Administer Drug' },
  { key: 'short-cycle', label: 'Short Cycle' },
  { key: 'foaled', label: 'Foaled Out' },
];

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

// Capitalize the first letter — used so "fresh" reads back as "Fresh" in the
// preview details while the lowercase form is kept inside the event title.
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Add N days to a local "YYYY-MM-DD" string and return the same string format,
// used to lay out the auto-created follow-up actions relative to an event date.
const addDaysStr = (dateStr, n) =>
  formatDate(addDays(parseLocalDate(dateStr || today()), n));

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

// Day-of-week names (plus common short forms) mapped to their getDay() index.
const WEEKDAYS = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, weds: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6,
};

// Resolve a relative day reference — "today", "yesterday", "3 days ago",
// "last week", "last Sunday", "on Tuesday" — into a local "YYYY-MM-DD" string,
// computed against the current date. Returns null when the text names no
// relative day. This lets the chat log events that already happened on the day
// they actually happened ("bred her last Tuesday") instead of defaulting to
// today. `lower` is the message already lower-cased. Only past references are
// resolved here; future scheduling is handled separately by the day/week offset
// logic in the message parser.
const parseRelativeDate = (lower) => {
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  if (/\bday before yesterday\b/.test(lower)) return formatDate(addDays(base, -2));
  if (/\b(yesterday|yday)\b/.test(lower)) return formatDate(addDays(base, -1));
  if (/\btoday\b/.test(lower)) return formatDate(base);

  // "3 days ago", "2 weeks ago", "a week ago", "last week".
  let m = lower.match(/\b(\d+)\s*(day|days|week|weeks)\s+ago\b/);
  if (m) {
    const mult = /week/.test(m[2]) ? 7 : 1;
    return formatDate(addDays(base, -parseInt(m[1], 10) * mult));
  }
  if (/\b(a\s+week\s+ago|last\s+week)\b/.test(lower)) return formatDate(addDays(base, -7));

  // "last Sunday" / "this Monday" / "on Tuesday" / a bare weekday — interpreted
  // as the most recent past occurrence of that weekday. A leading "next" is
  // explicitly excluded so future references aren't pulled into the past.
  const dayNames = Object.keys(WEEKDAYS).join('|');
  m = lower.match(new RegExp(`\\b(next\\s+)?(?:last|this|past|on)?\\s*(${dayNames})\\b`, 'i'));
  if (m && !m[1]) {
    const target = WEEKDAYS[m[2].toLowerCase()];
    let diff = base.getDay() - target;
    if (diff <= 0) diff += 7; // strictly in the past; today's weekday means a week ago
    return formatDate(addDays(base, -diff));
  }

  return null;
};

// Pull a time of day out of free-form text — "11am", "11:00", "2:30pm" — and
// return it as a 24-hour "HH:MM" string, or '' when none is stated.
const parseTime = (lower) => {
  let m = lower.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m[2]}`;
  }
  m = lower.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (m[2] === 'pm' && h < 12) h += 12;
    if (m[2] === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:00`;
  }
  return '';
};

// Classify a logged chat message into one of the EVENT_TYPES. The order matters:
// foaling and the negative/loss outcomes are checked before the positive ones so
// "not in foal" never reads as "pregnant"; "double ovulation" is matched before a
// bare "ovulation"; and the 28-day heartbeat is matched before the 14-day check.
const classifyEventType = (lower) => {
  if (/foaled?\s*out|gave\s*birth|\bdelivered\b|\bfoaled\b/.test(lower)) return 'foaled';
  if (/miscarriage|reabsorb|resorb|abort|slipped|pregnancy\s*loss|lost\s+(?:the|her)\s+(?:foal|pregnancy)/.test(lower)) return 'pregnancy-loss';
  if (/double\s*ovulation/.test(lower)) return 'double-ovulation';
  if (/uterine|dirty\s*uterus|\buterus\b|\bfluid\b|endometritis/.test(lower)) return 'uterine-issue';
  if (/lutalyse|\blute\b|estrumate|dinoprost|prostaglandin/.test(lower)) return 'lutalyse';
  if (/(\d+\s*-?\s*(?:hour|hr)s?\s*checks?)|(\bevery\s+\d+\s*(?:hour|hr))/.test(lower)) return 'monitoring';
  if (/28[\s-]?day|heart\s?beat/.test(lower)) return 'heartbeat';
  if (/14[\s-]?day|preg(?:nancy)?\s*check|embryo|\bin\s*foal\b|\bpregnant\b/.test(lower)) return 'pregnancy-check';
  if (/ovulat/.test(lower)) return 'ovulation';
  if (/inseminat|\bbred\b|\bbreed\b|breeding|covered|live\s*cover|\bai\b/.test(lower)) return 'insemination';
  if (/ultra\s?sound|\bscan\b|follicle|\d+\s*(?:mm)?\s*(?:right|left)|(?:right|left)\s*\d+/.test(lower)) return 'ultrasound';
  return 'note';
};

// Best-effort guess at the stallion named in a breeding message. An explicit
// "to/by/with Vitalis" wins; otherwise the last capitalized word that isn't the
// mare's own name or a breeding keyword is taken (e.g. "Inseminate Roma fresh
// Vitalis" -> "Vitalis"); failing that, the mare's planned stallion is used.
// Always editable afterwards.
const STALLION_STOPWORDS = new Set([
  'inseminate', 'inseminated', 'bred', 'breed', 'breeding', 'covered', 'fresh', 'frozen',
  'chilled', 'cooled', 'natural', 'ovulation', 'ovulated', 'check', 'pregnancy', 'ultrasound',
  'scan', 'lutalyse', 'lute', 'foaled', 'foal', 'heartbeat', 'day', 'right', 'left', 'am', 'pm',
  'double', 'uterine', 'uterus', 'heat', 'embryo', 'monitoring', 'note', 'flush',
]);
const parseStallion = (text, horse) => {
  let m = text.match(/\b(?:to|by|with|stallion|sire)\s+([A-Z][a-zA-Z'-]+)/);
  if (m) return m[1];
  const mare = (horse?.barnName || '').toLowerCase();
  const nick = (horse?.nickname || '').toLowerCase();
  const tokens = text.match(/[A-Z][a-zA-Z'-]+/g) || [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tl = tokens[i].toLowerCase();
    if (tl === mare || tl === nick || STALLION_STOPWORDS.has(tl)) continue;
    return tokens[i];
  }
  return horse?.plannedStallion || '';
};

// The breeding-cycle statuses a mare can be in. Shared by the profile dropdown
// and the chat, so logging "bred Bella" in the chat can move her status here.
const BREEDING_STATUSES = [
  'Waiting for cycle',
  'Ready to breed',
  'Inseminated',
  'Ovulation Confirmed',
  '14-day pregnancy check',
  'Confirmed in foal',
  'Lost - back open',
  'Foaled',
];

const getStatusColor = (status) => ({
  'Waiting for cycle': DS.colors.status.waiting,
  'Ready to breed': DS.colors.status.ready,
  'Inseminated': DS.colors.status.bred,
  'Ovulation Confirmed': DS.colors.gold,
  '14-day pregnancy check': DS.colors.status.bred,
  'Confirmed in foal': DS.colors.status.foal,
  'Lost - back open': DS.colors.status.open,
  'Foaled': DS.colors.status.open,
}[status] || DS.colors.textMuted);

// Average equine gestation, used to estimate a foaling date from the breeding
// date when an explicit foal-due date hasn't been entered.
const GESTATION_DAYS = 340;

// The event types the breeding-log chat can recognise. The key is stored on the
// logged event (`event.type`); the label is what the preview card and the Edit
// Event "Event Type" dropdown show. One catalog keeps the parser, the preview,
// and the editor in sync.
const EVENT_TYPES = [
  { key: 'insemination', label: 'insemination' },
  { key: 'ultrasound', label: 'ultrasound check' },
  { key: 'ovulation', label: 'ovulation confirmed' },
  { key: 'pregnancy-check', label: '14-day pregnancy check' },
  { key: 'heartbeat', label: '28-day heartbeat check' },
  { key: 'lutalyse', label: 'lutalyse given' },
  { key: 'monitoring', label: 'intensive monitoring' },
  { key: 'double-ovulation', label: 'double ovulation' },
  { key: 'uterine-issue', label: 'uterine issue' },
  { key: 'pregnancy-loss', label: 'pregnancy loss' },
  { key: 'foaled', label: 'foaled out' },
  { key: 'note', label: 'note' },
];

// Map number words to digits so relative-time phrases like "in two days" or
// "in a week" resolve to a day offset alongside the numeric "in 2 days".
const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const parseCount = (w) => NUMBER_WORDS[w.toLowerCase()] ?? parseInt(w, 10);

// Signals that a clause is asking for a follow-up to be scheduled — an action
// verb ("recheck", "scan again"), a reminder request, or an explicit "create
// action / reminder / task". Used to tell a genuine request ("recheck in 2
// days") apart from text that merely states timing ("checked her 2 days ago").
const ACTION_REQUEST_RE = /\b(recheck|re-?check|check\s+again|rescan|re-?scan|scan\s+again|follow[\s-]?up|remind|reminder|(?:create|add|set|schedule|make)\s+(?:up\s+)?(?:an?\s+)?(?:action|reminder|task|follow[\s-]?up)|action\s+to)\b/i;

// Pull explicitly-requested follow-up actions out of a chat message — e.g.
// "create action to recheck in 2 days", "remind me in a week to call the vet",
// "follow up in 3 days". These are scheduled in addition to whatever follow-ups
// the event type already implies, so an action the user spells out in words is
// never silently dropped (a plain "note" used to create nothing at all). The due
// date is counted forward from today, since an imperative "in N days" is meant
// from the moment of logging — unlike the biological intervals that key off the
// event's own date. Returns ready-built action objects in the same shape the
// `deriveEvent` factory produces, so they render and save identically.
const parseExplicitActions = (text, name) => {
  const out = [];
  const timeRe = /\bin\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months)\b/gi;
  let m;
  while ((m = timeRe.exec(text)) !== null) {
    const before = text.slice(0, m.index);
    if (!ACTION_REQUEST_RE.test(before)) continue;
    const qty = parseCount(m[1]);
    if (!qty || qty < 1) continue;
    const unit = m[2].toLowerCase();
    const days = qty * (/week/.test(unit) ? 7 : /month/.test(unit) ? 30 : 1);

    // Derive a human label from the clause. Prefer the verb phrase after "to" —
    // which may come before the time ("action to recheck in 2 days") or after it
    // ("remind me in a week to call the vet"); else a recognised action verb in
    // the clause; else fall back to "Follow-up"/"Recheck".
    const after = text.slice(m.index + m[0].length);
    let label = '';
    const toBefore = before.match(/\bto\s+([a-z][a-z\s'-]*?)\s*$/i);
    const toAfter = after.match(/^\s*to\s+([a-z][a-z\s'-]+)/i);
    if (toBefore) label = toBefore[1];
    else if (toAfter) label = toAfter[1];
    if (!label) {
      const verb = before.match(/\b(recheck|re-?check|check\s+again|rescan|re-?scan|scan\s+again|flush|breed|ultrasound|monitor|teas[e]?)\b[a-z\s'-]*$/i);
      if (verb) label = verb[0];
    }
    label = label
      .replace(/\b(her|him|it|them|me|us|again|the\s+mare)\b/gi, '')
      .replace(/[^a-z\s'-]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    const fallback = /follow[\s-]?up/i.test(before) ? 'Follow-up' : 'Recheck';
    const title = label ? cap(label) : fallback;
    out.push({
      label: title,
      bullet: title,
      title: `${title} - ${name}`,
      dueDate: addDaysStr(today(), days),
      dueTime: '',
      priority: 'medium',
      category: 'check',
    });
  }
  return out;
};

// Signals tying a still-open follow-up to a note that reports it was carried
// out. If an action's title matches `title`, that action is treated as resolved
// only when the note also matches `note`. Checked before the generic verb test
// below so a *specific* check (pregnancy, heartbeat, ovulation, …) is resolved
// only by a note that plausibly reports that particular check — never by an
// unrelated update about the same mare.
const ACTION_DONE_SIGNALS = [
  { title: /pregnan|14[\s-]?day|7[\s-]?day|embryo/i, note: /pregnan|in\s*foal|not\s+(?:in\s+foal|pregnant)|embryo|negative|positive|\bopen\b|\bempty\b|checked|scan|ultra/i },
  { title: /heartbeat|28[\s-]?day/i, note: /heartbeat|checked|scan|ultra/i },
  { title: /ovulation/i, note: /ovulat|checked|scan|ultra/i },
  { title: /uterine|flush/i, note: /flush|uterine|uterus/i },
  { title: /heat|cycle\s*restart/i, note: /\bheat\b|in\s*season|cycl|\bbred\b|inseminat/i },
  { title: /monitor/i, note: /monitor|checked|scan|ultra/i },
];

// Past-tense / completion verbs meaning "I did the thing the reminder asked for".
// Used to resolve a plain check / recheck / follow-up reminder that carries no
// more specific signal of its own.
const ACTION_DONE_VERBS = /\b(check(?:ed)?|recheck(?:ed)?|look(?:ed)?|examin(?:ed)?|scann?(?:ed)?|saw|did|done|complet(?:ed)?|gave|administer(?:ed)?|teas(?:ed)?|flush(?:ed)?|bred|inseminat(?:ed)?|covered|monitor(?:ed)?)\b/i;

// Given a freshly typed note, return the mare's still-open actions it reports as
// done, so the chat can offer to tick them off — each shown for confirm/deny in
// the preview before anything is actually marked done. Conservative by design:
// only this mare's pending actions are candidates; a specific check resolves
// only on a matching note; and a generic check/recheck/follow-up/watch resolves
// only when the note states it was actually carried out (e.g. an action to
// "check Thelma" is resolved by "checked Thelma, not pregnant yet"). Returns the
// matched action records unchanged.
const findResolvedActions = (text, horseId, actions) => {
  if (!horseId || !Array.isArray(actions)) return [];
  const lower = text.toLowerCase();
  return actions.filter((a) => {
    if (a.horseId !== horseId || a.done) return false;
    const title = `${a.title || ''}`.toLowerCase();
    for (const sig of ACTION_DONE_SIGNALS) {
      if (sig.title.test(title)) return sig.note.test(lower);
    }
    if (/check|recheck|follow|watch/i.test(title) || a.category === 'check') {
      return ACTION_DONE_VERBS.test(text);
    }
    return false;
  });
};

// Given a fully-resolved set of event fields, derive everything that flows from
// the event type: the display title, the detail rows shown on the preview card,
// the follow-up actions to auto-create (each with its due date, priority, and a
// one-line bullet), and the breeding-status the event implies. This is the
// single source of truth shared by the chat parser, the preview card, and the
// Edit Event modal, so what you see in the preview is exactly what gets saved.
//
// `f` carries: { name, eventType, date, time, semenType, stallion,
// follicleRight, follicleLeft, dose, result, series, extraActions }.
// `extraActions` are follow-ups the user asked for in words (see
// parseExplicitActions); they're appended to whatever the event type implies.
const deriveEvent = (f) => {
  const name = f.name || 'Mare';
  const dateTime = f.date ? (f.time ? `${f.date} ${f.time}` : f.date) : '';
  const details = [{ label: 'Mare', value: name }];
  if (dateTime) details.push({ label: 'Date/Time', value: dateTime });

  // Follow-up action factory: due dates are counted off the event's own date.
  const act = (label, bullet, title, days, priority, opts = {}) => ({
    label,
    bullet,
    title: `${title} - ${name}`,
    dueDate: addDaysStr(f.date, days),
    dueTime: opts.time ? (f.time || '') : '',
    priority,
    category: opts.category || 'check',
    ...(opts.series ? { series: opts.series } : {}),
  });

  let title = `${name} - Note`;
  let actions = [];
  let status = '';

  switch (f.eventType) {
    case 'insemination': {
      title = `${name} - Inseminated${f.semenType ? ` (${f.semenType})` : ''}${f.stallion ? ` - ${f.stallion}` : ''}`;
      if (f.semenType) details.push({ label: 'Semen', value: cap(f.semenType) });
      if (f.stallion) details.push({ label: 'Stallion', value: f.stallion });
      actions = [
        act('24-hour Check', '24-hour Ovulation Check', 'Ovulation Check', 1, 'high', { time: true }),
        act('Pregnancy Check', '14-day Pregnancy Check', '14-day Pregnancy Check', 14, 'medium'),
      ];
      status = 'Inseminated';
      break;
    }
    case 'ovulation': {
      title = `${name} - Ovulation Confirmed`;
      actions = [act('Pregnancy Check', '7-day Pregnancy Check', '7-day Pregnancy Check', 7, 'medium')];
      status = 'Ovulation Confirmed';
      break;
    }
    case 'pregnancy-check': {
      title = `${name} - 14-day Pregnancy Check`;
      if (f.result === 'positive') {
        details.push({ label: 'Result', value: 'Positive — embryo detected' });
        actions = [act('Heartbeat Check', '28-day Heartbeat Check', '28-day Heartbeat Check', 28, 'medium')];
        status = 'Confirmed in foal';
      } else if (f.result === 'negative') {
        details.push({ label: 'Result', value: 'Negative — not in foal' });
        actions = [act('Cycle Restart', 'Cycle Restart Watch', 'Cycle Restart Watch', 7, 'medium')];
        status = 'Lost - back open';
      } else {
        status = '14-day pregnancy check';
      }
      break;
    }
    case 'heartbeat': {
      title = `${name} - 28-day Heartbeat Check`;
      details.push({ label: 'Result', value: 'Heartbeat detected' });
      actions = [act('Monthly Check', 'Monthly Check', 'Monthly Check', 30, 'low')];
      status = 'Confirmed in foal';
      break;
    }
    case 'lutalyse': {
      title = `${name} - Lutalyse Given`;
      if (f.dose) details.push({ label: 'Dose', value: f.dose });
      actions = [act('Heat Watch', 'New Heat Watch', 'New Heat Watch', 7, 'high')];
      break;
    }
    case 'monitoring': {
      const hrs = f.series ? f.series.intervalHours : 12;
      title = `${name} - Intensive Monitoring (${hrs}-hour checks)`;
      if (f.follicleRight || f.follicleLeft) {
        details.push({ label: 'Follicle', value: `Right ${f.follicleRight || '?'}mm, Left ${f.follicleLeft || '?'}mm` });
      }
      actions = [{
        label: `${hrs}-hour Check`,
        bullet: `${hrs}-hour Check`,
        title: `${hrs}-hour Check - ${name}`,
        dueDate: f.date || today(),
        dueTime: f.time || '',
        priority: 'high',
        category: 'check',
        series: f.series || { intervalHours: hrs, days: 3, count: Math.max(1, Math.floor((3 * 24) / hrs)) },
      }];
      break;
    }
    case 'double-ovulation': {
      title = `${name} - Double Ovulation`;
      actions = [act('Complication Watch', 'Double Ovulation Watch', 'Double Ovulation Watch', 7, 'high')];
      break;
    }
    case 'uterine-issue': {
      title = `${name} - Uterine Issue`;
      actions = [act('URGENT', 'URGENT Uterine Flush', 'URGENT - Uterine Flush', 0, 'critical')];
      break;
    }
    case 'pregnancy-loss': {
      title = `${name} - Pregnancy Lost`;
      actions = [act('Cycle Restart', 'Cycle Restart Watch', 'Cycle Restart Watch', 7, 'medium')];
      status = 'Lost - back open';
      break;
    }
    case 'foaled': {
      title = `${name} - Foaled Out`;
      status = 'Foaled';
      break;
    }
    case 'ultrasound': {
      title = `${name} - Ultrasound Check`;
      if (f.follicleRight || f.follicleLeft) {
        details.push({ label: 'Follicle', value: `Right ${f.follicleRight || '?'}mm, Left ${f.follicleLeft || '?'}mm` });
      }
      break;
    }
    default:
      title = `${name} - Note`;
  }

  // Append any follow-ups the user explicitly requested in the message
  // ("create action to recheck in 2 days"), so they're scheduled regardless of
  // the event type — including a plain note, which otherwise creates nothing.
  if (Array.isArray(f.extraActions) && f.extraActions.length) {
    actions = [...actions, ...f.extraActions];
  }

  return { eventTitle: title, eventDetails: details, actions, breedingStatusUpdate: status };
};

// The short "detail" string stored alongside a logged event, shown after the
// date on the timeline and read by the profile's breeding summary (e.g. semen
// type and stallion). Derived from whichever fields the event type carries.
const buildEventDetail = (f) => {
  const parts = [];
  if (f.eventType === 'insemination') {
    if (f.semenType) parts.push(cap(f.semenType));
    if (f.stallion) parts.push(f.stallion);
  } else if (f.eventType === 'ultrasound' || f.eventType === 'monitoring') {
    if (f.follicleRight || f.follicleLeft) parts.push(`R ${f.follicleRight || '?'}mm / L ${f.follicleLeft || '?'}mm`);
  } else if (f.eventType === 'lutalyse') {
    if (f.dose) parts.push(`Dose ${f.dose}`);
  } else if (f.eventType === 'pregnancy-check' && f.result) {
    parts.push(cap(f.result));
  }
  return parts.join(' • ');
};
// the wording of a breeding event, so the foaling timeline and breeding summary
// can show it without a dedicated field. Returns null when nothing is stated.
const getSemenType = (event) => {
  if (!event) return null;
  const t = `${event.title || ''} ${event.detail || ''}`.toLowerCase();
  if (/frozen/.test(t)) return 'Frozen';
  if (/chilled|cooled|cool\b/.test(t)) return 'Chilled';
  if (/fresh/.test(t)) return 'Fresh';
  if (/natural|live\s*cover|pasture/.test(t)) return 'Natural';
  return null;
};

// Build a pregnancy summary for a mare straight from her logged breeding events,
// so the profile can show a foaling estimate, a progress bar, and a milestone
// timeline without anyone having to fill in a due date by hand. The most recent
// breeding event anchors the timeline; an explicit `foalDueDate` on the horse
// wins over the estimate when present. Returns null when there is nothing to
// show (no breeding on record and no explicit due date).
const derivePregnancy = (horse, events) => {
  const bred = events
    .filter(e => e.horseId === horse.id
      && (e.type === 'breed' || e.type === 'breeding' || /\b(bred|inseminat|covered)\b/i.test(e.title || '')))
    .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
  const bredEvent = bred[0] || null;
  const bredDate = bredEvent ? bredEvent.date : (horse.conceptionDate || null);

  if (!bredDate && !horse.foalDueDate) return null;

  const dueDate = horse.foalDueDate
    || (bredDate ? formatDate(addDays(parseLocalDate(bredDate), GESTATION_DAYS)) : null);
  if (!dueDate) return null;

  const start = bredDate
    ? parseLocalDate(bredDate)
    : addDays(parseLocalDate(dueDate), -GESTATION_DAYS);
  const due = parseLocalDate(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const total = Math.max(1, Math.round((due - start) / 86400000));
  const elapsed = Math.max(0, Math.round((now - start) / 86400000));
  const progress = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));

  // Semen type (parsed from the breeding event) and the pregnancy-confirmation
  // event — the first post-breeding check that reports a result — both surfaced
  // in the foaling timeline.
  const stallionName = horse.plannedStallion || '';
  const semenType = getSemenType(bredEvent);
  const confirmedEvent = events
    .filter(e => e.horseId === horse.id
      && parseLocalDate(e.date) >= start
      && /confirm|in\s*foal|embryo|preg|14[\s-]?day|heartbeat|scan|ultra/i.test(`${e.title || ''} ${e.detail || ''}`))
    .sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date))[0] || null;
  const confirmedDate = confirmedEvent ? confirmedEvent.date : null;

  // The pregnancy milestones shown on the foaling timeline: insemination, the
  // 7- and 14-day embryo checks, the 28-day heartbeat check, and the expected
  // foaling date. Each is marked done once its date has passed.
  const milestones = [
    { key: 'insemination', label: 'Insemination', date: bredDate, color: '#A8C5E8', detail: semenType ? [semenType, stallionName].filter(Boolean).join(' • ') : stallionName },
    { key: 'embryo7', label: 'Embryo Detected (7-day)', date: bredDate ? formatDate(addDays(start, 7)) : null, color: '#C9E2CC', detail: '' },
    { key: 'embryo14', label: 'Embryo Confirmed (14-day)', date: confirmedDate || (bredDate ? formatDate(addDays(start, 14)) : null), color: '#A9D3AE', detail: (confirmedEvent && confirmedEvent.detail) || '' },
    { key: 'heartbeat28', label: 'Heartbeat Check (28-day)', date: bredDate ? formatDate(addDays(start, 28)) : null, color: '#E8D5A8', detail: '' },
    { key: 'foaling', label: 'Expected Foaling', date: dueDate, color: '#D4A574', detail: '' },
  ].map(m => ({
    ...m,
    done: m.date ? parseLocalDate(m.date) <= now : false,
    daysUntil: m.date ? getDaysUntilDue(m.date) : null,
  }));

  return {
    bredEvent,
    bredDate,
    dueDate,
    total,
    elapsed,
    progress,
    daysToFoal: getDaysUntilDue(dueDate),
    semenType,
    confirmedDate,
    confirmedEvent,
    milestones,
  };
};

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
    case 'breed': case 'insemination': return '#5A8784';   // bred / inseminated
    case 'drug': case 'lutalyse': return '#DC8A4C';         // administered drug
    case 'short-cycle': return '#8B7E8A';  // short cycle
    case 'ovulation': case 'foaled': return '#6BA881';      // ovulation / gave birth
    case 'double-ovulation': return '#D4A574';
    case 'uterine-issue': return '#C84C3C';
    case 'monitoring': return '#3E6FB0';   // intensive monitoring
    case 'pregnancy-loss': return '#8B7E8A';
    case 'check': return '#3E6FB0';        // general check
    default: return DS.colors.primaryLight;
  }
};

// A glyph to show inside the colored circle next to a timeline event, picked
// from the event's wording first (so the two pregnancy checks and a birth each
// get their own icon) and falling back to the broad category.
const getEventIcon = (event) => {
  const t = `${event.title || ''} ${event.detail || ''}`.toLowerCase();
  if (/ovulat/.test(t)) return '✓';
  if (/heartbeat|28[\s-]?day/.test(t)) return '💗';
  if (/embryo|14[\s-]?day|pregnan|scan|ultra/.test(t)) return '🔍';
  if (/foaled|birth|foaling/.test(t)) return '🐴';
  if (/drug|inject|hcg|prostag|regumate/.test(t)) return '💊';
  switch (event.type) {
    case 'breed': case 'insemination': return '💉';
    case 'drug': case 'lutalyse': return '💊';
    case 'monitoring': return '⏱️';
    case 'double-ovulation': return '✓';
    case 'uterine-issue': return '⚠️';
    case 'pregnancy-loss': return '💔';
    case 'foaled': return '🐴';
    case 'check': return '🔍';
    case 'short-cycle': return '🔄';
    default: return '•';
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

function HorseDetailScreen({ horse, events, actions, onBack, onUpdateStatus, onUpdateStallion, onToggleBreedingList, onUpdateHorse, onUpdateHorseStatus, onDeleteHorse, onSaveTimelineItem, onDeleteEvent, onDeleteAction, onToggleAction }) {
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
  const [showFoalModal, setShowFoalModal] = useState(false);
  // Whether the editable breeding controls (status, planned stallion, breeding
  // list) are expanded. Collapsed by default so the profile reads cleanly, but
  // every control stays one tap away.
  const [showManage, setShowManage] = useState(false);
  // The timeline item (event or action) currently being edited, and its working
  // copy. `itemForm` normalizes both record shapes onto common fields so a single
  // editor can edit either kind — and switch between them via the type dropdown.
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemForm, setItemForm] = useState(null);
  const fileInputRef = React.useRef(null);

  const horseEvents = events.filter(e => e.horseId === horse.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const horseActions = actions.filter(a => a.horseId === horse.id);
  const age = calculateAge(horse.yob);
  // A foaling estimate + milestone timeline derived from this mare's breeding
  // events, shown on her profile once she has been bred. Null for non-mares and
  // for mares with no breeding on record.
  const pregnancy = horse.type === 'mare' ? derivePregnancy(horse, events) : null;

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

  // Open the inline editor for a timeline item, normalizing the event/action
  // shape onto shared fields so one form serves both. `note` doubles as an
  // event's detail; `date` doubles as an action's due date.
  const startEditItem = (kind, item) => {
    setEditingItemId(item.id);
    setItemForm(
      kind === 'event'
        ? { kind: 'event', id: item.id, title: item.title || '', note: item.detail || '', date: item.date || today(), category: item.type || ACTION_CATEGORIES[0].key, done: false }
        : { kind: 'action', id: item.id, title: item.title || '', note: item.note || '', date: item.dueDate || today(), category: item.category || ACTION_CATEGORIES[0].key, done: !!item.done },
    );
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setItemForm(null);
  };

  // Save the editor, rebuilding the record into whichever shape the chosen type
  // requires. When the type changed, the parent moves it between collections.
  const saveEditItem = (originalKind) => {
    if (!itemForm) return;
    const built =
      itemForm.kind === 'event'
        ? { id: itemForm.id, horseId: horse.id, title: itemForm.title, detail: itemForm.note, date: itemForm.date, type: itemForm.category }
        : { id: itemForm.id, horseId: horse.id, title: itemForm.title, note: itemForm.note, dueDate: itemForm.date, category: itemForm.category, done: itemForm.done };
    onSaveTimelineItem(originalKind, itemForm.kind, built);
    cancelEditItem();
  };

  // The shared edit form for a timeline item. The type dropdown lets the user
  // turn an event into an action (and back); the date/note labels follow suit.
  const renderItemEditor = (originalKind) => (
    <div>
      <label style={styles.label}>Type</label>
      <select
        value={itemForm.kind}
        onChange={(e) => setItemForm({ ...itemForm, kind: e.target.value })}
        style={{...styles.input, marginTop: DS.spacing.sm, marginBottom: DS.spacing.md, background: DS.colors.white}}
      >
        <option value="event">Event (something that happened)</option>
        <option value="action">Action (a reminder / to-do)</option>
      </select>

      <label style={styles.label}>Title</label>
      <input
        type="text"
        value={itemForm.title}
        onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
        placeholder="Title"
        style={{...styles.input, marginTop: DS.spacing.sm, marginBottom: DS.spacing.md}}
      />

      <label style={styles.label}>Category</label>
      <select
        value={itemForm.category}
        onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
        style={{...styles.input, marginTop: DS.spacing.sm, marginBottom: DS.spacing.md, background: DS.colors.white}}
      >
        {ACTION_CATEGORIES.map(c => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>

      <label style={styles.label}>{itemForm.kind === 'event' ? 'Detail' : 'Note'}</label>
      <input
        type="text"
        value={itemForm.note}
        onChange={(e) => setItemForm({ ...itemForm, note: e.target.value })}
        placeholder={itemForm.kind === 'event' ? 'What happened' : 'Notes'}
        style={{...styles.input, marginTop: DS.spacing.sm, marginBottom: DS.spacing.md}}
      />

      <label style={styles.label}>{itemForm.kind === 'event' ? 'Date' : 'Due date'}</label>
      <input
        type="date"
        value={itemForm.date}
        onChange={(e) => setItemForm({ ...itemForm, date: e.target.value })}
        style={{...styles.input, marginTop: DS.spacing.sm, marginBottom: DS.spacing.md}}
      />

      {itemForm.kind === 'action' && (
        <label style={{...styles.label, display: 'flex', alignItems: 'center', gap: DS.spacing.md, textTransform: 'none', marginBottom: DS.spacing.md}}>
          <input
            type="checkbox"
            checked={itemForm.done}
            onChange={(e) => setItemForm({ ...itemForm, done: e.target.checked })}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          Mark as done
        </label>
      )}

      <div style={{ display: 'flex', gap: DS.spacing.md }}>
        <button onClick={() => saveEditItem(originalKind)} style={{...styles.buttonBase, ...styles.buttonPrimary, flex: 1}}>Save</button>
        <button onClick={cancelEditItem} style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1}}>Cancel</button>
      </div>
    </div>
  );

  const headerActions = (
    <div style={{ display: 'flex', gap: DS.spacing.sm }}>
      <button
        onClick={startEditing}
        style={{...styles.buttonBase, ...styles.buttonPrimary, padding: `${DS.spacing.sm} ${DS.spacing.md}`}}
        title="Edit profile"
      >
        <Edit2 size={16} /> Edit Profile
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

  // Values derived for the redesigned profile: the most recent event (shown in
  // the "Last event" stat card), a helper for the "Day N" badge on each timeline
  // event (days since breeding), and small date formatters.
  const lastEvent = horseEvents[0] || null;
  const bredDateObj = pregnancy && pregnancy.bredDate ? parseLocalDate(pregnancy.bredDate) : null;
  const eventDay = (date) => {
    if (!bredDateObj) return null;
    const n = Math.round((parseLocalDate(date) - bredDateObj) / 86400000);
    return n >= 0 ? n : null;
  };
  const statCardBase = { flex: '1 1 140px', minWidth: '128px', background: DS.colors.white, border: `1px solid ${DS.colors.border}`, borderRadius: DS.radius.lg, padding: DS.spacing.lg, boxShadow: DS.shadow.xs };
  const PRIORITY_BADGE = { critical: { label: 'CRIT', bg: DS.colors.error }, high: { label: 'HIGH', bg: DS.colors.status.waiting }, medium: { label: 'MED', bg: DS.colors.primary }, low: { label: 'LOW', bg: DS.colors.textMuted } };
  const shortDate = (d) => parseLocalDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const longDate = (d) => parseLocalDate(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const mediumDate = (d) => parseLocalDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isMare = horse.type === 'mare';
  const statusValue = isMare ? status : (horse.status || '');
  const statusColor = isMare ? getStatusColor(status) : getHorseStatusColor(horse.status);

  return (
    <div style={styles.page}>
      {/* Profile header — name, a one-line summary, and the edit/delete actions. */}
      <div style={{ ...styles.header, alignItems: 'flex-start' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: DS.colors.primary, cursor: 'pointer', padding: `0 ${DS.spacing.md} 0 0`, fontSize: '24px', display: 'flex', alignItems: 'center', marginTop: '2px' }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={styles.h1}>{horse.nickname || horse.barnName}</h1>
          <p style={{ ...styles.body, color: DS.colors.textSecondary, marginTop: DS.spacing.xs }}>
            {[horse.breed, isMare ? 'Mare' : horse.type.charAt(0).toUpperCase() + horse.type.slice(1)].filter(Boolean).join(' ')} · Age {age}
          </p>
        </div>
        {headerActions}
      </div>

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

      {showFoalModal && pregnancy && (
        <div
          onClick={() => setShowFoalModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26, 23, 21, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: DS.spacing.xl, zIndex: 300 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: DS.colors.white, borderRadius: DS.radius.lg, maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: DS.shadow.md }}
          >
            <div style={{ padding: DS.spacing.xl, borderBottom: `1px solid ${DS.colors.border}` }}>
              <h2 style={{...styles.h2, margin: 0}}>{horse.nickname || horse.barnName} — Foal Timeline</h2>
              <p style={{...styles.bodySmall, marginTop: DS.spacing.xs}}>
                Expected due: {longDate(pregnancy.dueDate)}
              </p>
            </div>

            <div style={{ padding: DS.spacing.xl, display: 'flex', flexDirection: 'column', gap: DS.spacing.xl }}>
              {/* Breeding details */}
              <div style={{ background: DS.colors.bgAlt, borderRadius: DS.radius.md, border: `1px solid ${DS.colors.border}`, padding: DS.spacing.lg }}>
                <h3 style={{...styles.h3, marginBottom: DS.spacing.md}}>Breeding Details</h3>
                {[
                  { label: 'Sire', value: stallion || 'Unknown' },
                  { label: 'Semen Type', value: pregnancy.semenType || '—' },
                  { label: 'Bred Date', value: pregnancy.bredDate ? mediumDate(pregnancy.bredDate) : '—' },
                  {
                    label: 'Confirmed Date',
                    value: pregnancy.confirmedDate
                      ? `${mediumDate(pregnancy.confirmedDate)}${/14[\s-]?day/i.test(`${pregnancy.confirmedEvent.title || ''} ${pregnancy.confirmedEvent.detail || ''}`) ? ' (14-day)' : ''}`
                      : 'Pending',
                  },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i < arr.length - 1 ? DS.spacing.sm : 0 }}>
                    <span style={styles.bodySmall}>{row.label}:</span>
                    <span style={{...styles.bodySmall, fontWeight: DS.typography.weight.semibold, color: DS.colors.text}}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: DS.spacing.sm }}>
                  <span style={{...styles.body, fontWeight: DS.typography.weight.semibold, color: DS.colors.text}}>Pregnancy Progress</span>
                  <span style={styles.bodySmall}>{pregnancy.elapsed}/{pregnancy.total} days ({pregnancy.progress}%)</span>
                </div>
                <div style={{ width: '100%', height: '12px', background: DS.colors.bgAlt, borderRadius: DS.radius.full, overflow: 'hidden', border: `1px solid ${DS.colors.border}` }}>
                  <div style={{ width: `${pregnancy.progress}%`, height: '100%', background: DS.colors.status.foal, borderRadius: DS.radius.full }} />
                </div>
              </div>

              {/* Pregnancy timeline */}
              <div>
                <h3 style={{...styles.h3, marginBottom: DS.spacing.md}}>Pregnancy Timeline</h3>
                {pregnancy.milestones.map((m, idx) => (
                  <div key={m.key} style={{ display: 'flex', gap: DS.spacing.md }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: m.color, flexShrink: 0, marginTop: '3px', border: `2px solid ${m.done ? m.color : DS.colors.white}`, boxShadow: m.done ? 'none' : `0 0 0 1px ${DS.colors.border}` }} />
                      {idx < pregnancy.milestones.length - 1 && (
                        <div style={{ width: '2px', flex: 1, minHeight: '24px', background: DS.colors.border, marginTop: '2px' }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: idx < pregnancy.milestones.length - 1 ? DS.spacing.lg : 0 }}>
                      <div style={{...styles.body, fontWeight: DS.typography.weight.medium}}>{m.label}</div>
                      <div style={{...styles.bodySmall, color: DS.colors.textMuted}}>
                        {m.date ? longDate(m.date) : 'TBD'}{m.detail ? ` • ${m.detail}` : ''}
                      </div>
                      <div style={{ ...styles.bodySmall, marginTop: '2px', color: m.done ? DS.colors.success : DS.colors.textSecondary, fontWeight: DS.typography.weight.medium }}>
                        {m.done
                          ? '✓ Completed'
                          : m.daysUntil != null
                            ? `⏳ Due in ${m.daysUntil} day${m.daysUntil === 1 ? '' : 's'}`
                            : 'Upcoming'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: DS.spacing.xl, borderTop: `1px solid ${DS.colors.border}` }}>
              <button onClick={() => setShowFoalModal(false)} style={{...styles.buttonBase, ...styles.buttonSecondary, width: '100%'}}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.scrollable}>
        <div style={styles.contentPadding}>
          {/* Summary stat cards — Status, Last Event, and (for a bred mare) a
              tappable Foal Due card that opens the foaling timeline. */}
          <div style={{ display: 'flex', gap: DS.spacing.md, marginBottom: DS.spacing.lg, flexWrap: 'wrap' }}>
            <div style={statCardBase}>
              <div style={styles.label}>Status</div>
              <p style={{ ...styles.body, marginTop: DS.spacing.sm, fontWeight: DS.typography.weight.semibold, color: statusColor }}>
                {statusValue || 'Not set'}{isMare && status === 'Confirmed in foal' ? ' ✓' : ''}
              </p>
            </div>
            <div style={statCardBase}>
              <div style={styles.label}>Last Event</div>
              {lastEvent ? (
                <>
                  <p style={{ ...styles.body, marginTop: DS.spacing.sm, fontWeight: DS.typography.weight.semibold }}>{lastEvent.title}</p>
                  <p style={{ ...styles.bodySmall, marginTop: DS.spacing.xs, color: DS.colors.textMuted }}>{shortDate(lastEvent.date)}</p>
                </>
              ) : (
                <p style={{ ...styles.body, marginTop: DS.spacing.sm, color: DS.colors.textMuted }}>No events yet</p>
              )}
            </div>
            {pregnancy && (
              <button
                onClick={() => setShowFoalModal(true)}
                style={{ ...statCardBase, border: `2px solid ${DS.colors.primary}`, cursor: 'pointer', textAlign: 'left', fontFamily: DS.typography.family.base }}
                title="View foal timeline"
              >
                <div style={styles.label}>Foal Due</div>
                <p style={{ ...styles.body, marginTop: DS.spacing.sm, fontWeight: DS.typography.weight.semibold, color: DS.colors.primary }}>{shortDate(pregnancy.dueDate)}</p>
                <p style={{ ...styles.bodySmall, marginTop: DS.spacing.xs, color: DS.colors.textMuted }}>Click to see</p>
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: DS.spacing.xl,
            marginTop: DS.spacing.xl,
            marginBottom: DS.spacing.lg,
            borderBottom: `1px solid ${DS.colors.border}`,
          }}>
            {[
              { key: 'timeline', label: 'Timeline & Actions' },
              { key: 'documents', label: 'Documents' },
              { key: 'pedigree', label: 'Pedigree' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: `${DS.spacing.md} 0`,
                  borderBottom: activeTab === tab.key ? `2px solid ${DS.colors.primary}` : '2px solid transparent',
                  color: activeTab === tab.key ? DS.colors.primary : DS.colors.textMuted,
                  fontWeight: activeTab === tab.key ? DS.typography.weight.semibold : DS.typography.weight.normal,
                  cursor: 'pointer',
                  fontSize: DS.typography.size.base,
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Timeline & Actions Tab */}
          {activeTab === 'timeline' && (
            <>
              {/* Breeding summary — read-only snapshot for a bred mare. */}
              {isMare && pregnancy && (
                <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
                  <h3 style={{...styles.h3, marginBottom: DS.spacing.lg}}>Breeding Summary</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: DS.spacing.lg }}>
                    <div>
                      <div style={styles.label}>Bred To</div>
                      <p style={{...styles.body, marginTop: DS.spacing.xs, fontWeight: DS.typography.weight.semibold}}>{stallion || '—'}</p>
                    </div>
                    <div>
                      <div style={styles.label}>Semen Type</div>
                      <p style={{...styles.body, marginTop: DS.spacing.xs, fontWeight: DS.typography.weight.semibold}}>{pregnancy.semenType || '—'}</p>
                    </div>
                    <div>
                      <div style={styles.label}>Breeding Date</div>
                      <p style={{...styles.body, marginTop: DS.spacing.xs, fontWeight: DS.typography.weight.semibold}}>{pregnancy.bredDate ? shortDate(pregnancy.bredDate) : '—'}</p>
                    </div>
                    <div>
                      <div style={styles.label}>Days in Foal</div>
                      <p style={{...styles.body, marginTop: DS.spacing.xs, fontWeight: DS.typography.weight.semibold}}>{pregnancy.elapsed} days</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Manage breeding — collapsible editable controls (mares only). */}
              {isMare && (
                <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
                  <button
                    onClick={() => setShowManage(v => !v)}
                    style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0, fontFamily: DS.typography.family.base }}
                  >
                    <span style={styles.h3}>Manage Breeding</span>
                    <ChevronDown size={20} color={DS.colors.textMuted} style={{ transform: showManage ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </button>
                  {showManage && (
                    <div style={{ marginTop: DS.spacing.lg }}>
                      <label style={{...styles.label, display: 'flex', alignItems: 'center', gap: DS.spacing.md, marginBottom: DS.spacing.lg}}>
                        <input type="checkbox" checked={onList} onChange={(e) => { setOnList(e.target.checked); onToggleBreedingList(horse.id, e.target.checked); }} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                        On 2026 Breeding List
                      </label>

                      <div style={{ marginBottom: DS.spacing.lg }}>
                        <label style={styles.label}>Breeding Status</label>
                        <select value={status} onChange={(e) => { setStatus(e.target.value); onUpdateStatus(horse.id, e.target.value); }} style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white, border: `1.5px solid ${getStatusColor(status)}`}}>
                          <option value="">Select status...</option>
                          {BREEDING_STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </div>

                      <div style={{ marginBottom: DS.spacing.lg }}>
                        <label style={styles.label}>Planned Stallion</label>
                        <input type="text" value={stallion} onChange={(e) => { setStallion(e.target.value); onUpdateStallion(horse.id, e.target.value); }} placeholder="e.g., Vitalis" style={{...styles.input, marginTop: DS.spacing.sm}} />
                      </div>

                      <div>
                        <label style={styles.label}>Lifecycle Status</label>
                        <select value={horse.status || ''} onChange={(e) => onUpdateHorseStatus(horse.id, e.target.value)} style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white, border: `1.5px solid ${getHorseStatusColor(horse.status)}`}}>
                          <option value="">Select status...</option>
                          {HORSE_STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Non-mares keep an editable lifecycle status here. */}
              {!isMare && (
                <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
                  <label style={styles.label}>Status</label>
                  <select value={horse.status || ''} onChange={(e) => onUpdateHorseStatus(horse.id, e.target.value)} style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white, border: `1.5px solid ${getHorseStatusColor(horse.status)}`}}>
                    <option value="">Select status...</option>
                    {HORSE_STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
              )}

              <h2 style={styles.h2}>Timeline</h2>
              {horseEvents.length === 0 ? (
                <div style={{...styles.card, textAlign: 'center', marginLeft: 0, marginRight: 0}}>
                  <p style={styles.bodySmall}>No events recorded yet</p>
                </div>
              ) : (
                horseEvents.map(event => {
                  const day = eventDay(event.date);
                  return (
                  <div key={event.id} style={{...styles.card, marginLeft: 0, marginRight: 0}}>
                    {editingItemId === event.id ? renderItemEditor('event') : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: DS.spacing.md }}>
                        <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: `${getEventColor(event)}22`, border: `1px solid ${DS.colors.border}` }}>
                          {getEventIcon(event)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={styles.h3}>{event.title}</h3>
                          <p style={{...styles.bodySmall, marginTop: DS.spacing.xs, color: DS.colors.textMuted}}>
                            {mediumDate(event.date)}{event.detail ? ` • ${event.detail}` : ''}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: DS.spacing.xs, flexShrink: 0 }}>
                          {day != null && (
                            <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
                              <div style={{...styles.bodySmall, color: DS.colors.textMuted}}>Day</div>
                              <div style={{...styles.body, fontWeight: DS.typography.weight.semibold, color: DS.colors.textSecondary}}>{day}</div>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: DS.spacing.xs }}>
                            <button onClick={() => startEditItem('event', event)} style={{ background: 'transparent', border: 'none', color: DS.colors.primary, cursor: 'pointer', padding: DS.spacing.xs, display: 'flex', alignItems: 'center' }} title="Edit"><Edit2 size={16} /></button>
                            <button onClick={() => onDeleteEvent(event.id)} style={{ background: 'transparent', border: 'none', color: DS.colors.error, cursor: 'pointer', padding: DS.spacing.xs, display: 'flex', alignItems: 'center' }} title="Delete"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })
              )}

              <h2 style={{...styles.h2, marginTop: DS.spacing.xl}}>Actions Due</h2>
              {horseActions.length === 0 ? (
                <div style={{...styles.card, textAlign: 'center', marginLeft: 0, marginRight: 0}}>
                  <p style={styles.bodySmall}>No actions scheduled</p>
                </div>
              ) : (
                horseActions.map(action => {
                  const badge = action.priority ? PRIORITY_BADGE[action.priority] : null;
                  return (
                  <div key={action.id} style={{...styles.card, marginLeft: 0, marginRight: 0, opacity: action.done ? 0.6 : 1, background: action.done ? DS.colors.bgAlt : DS.colors.white}}>
                    {editingItemId === action.id ? renderItemEditor('action') : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: DS.spacing.md }}>
                      <input type="checkbox" checked={!!action.done} onChange={() => onToggleAction && onToggleAction(action.id)} style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} title={action.done ? 'Mark not done' : 'Mark done'} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{...styles.h3, textDecoration: action.done ? 'line-through' : 'none'}}>{action.title}</h3>
                        {action.note && <p style={{...styles.bodySmall, marginTop: DS.spacing.xs}}>{action.note}</p>}
                        <p style={{...styles.bodySmall, marginTop: DS.spacing.xs, color: DS.colors.textMuted}}>Due: {mediumDate(action.dueDate)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: DS.spacing.sm, flexShrink: 0 }}>
                        {badge && (
                          <span style={{ background: badge.bg, color: 'white', borderRadius: DS.radius.sm, padding: '3px 8px', fontSize: DS.typography.size.xs, fontWeight: DS.typography.weight.bold, letterSpacing: '0.04em' }}>{badge.label}</span>
                        )}
                        <button onClick={() => startEditItem('action', action)} style={{ background: 'transparent', border: 'none', color: DS.colors.primary, cursor: 'pointer', padding: DS.spacing.xs, display: 'flex', alignItems: 'center' }} title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => onDeleteAction(action.id)} style={{ background: 'transparent', border: 'none', color: DS.colors.error, cursor: 'pointer', padding: DS.spacing.xs, display: 'flex', alignItems: 'center' }} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    )}
                  </div>
                  );
                })
              )}
            </>
          )}

          {/* Pedigree Tab — lineage plus the horse's static details. */}
          {activeTab === 'pedigree' && (
            <>
              <h2 style={styles.h2}>Details</h2>
              <div style={{...styles.card, marginLeft: 0, marginRight: 0}}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: DS.spacing.lg, marginBottom: horse.additionalInfo ? DS.spacing.lg : 0 }}>
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

              <h2 style={{...styles.h2, marginTop: DS.spacing.xl}}>Pedigree</h2>
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

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <>
              <h2 style={styles.h2}>Documents</h2>
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
  // Which home sections are collapsed. Persisted to localStorage so the choice
  // survives refreshes.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('homeCollapsed') || '{}');
    } catch {
      return {};
    }
  });
  const toggleSection = (key) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('homeCollapsed', JSON.stringify(next)); } catch {}
      return next;
    });
  };

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
            <h2
              style={{...styles.h2, display: 'flex', alignItems: 'center', gap: DS.spacing.sm, cursor: 'pointer', userSelect: 'none'}}
              onClick={() => toggleSection('mares')}
            >
              {collapsed.mares ? <ChevronRight size={22} color={DS.colors.primary} /> : <ChevronDown size={22} color={DS.colors.primary} />}
              Your Breeding Mares
              <span style={{...styles.bodySmall, color: DS.colors.textMuted, fontWeight: DS.typography.weight.normal}}>({breedingMares.length})</span>
            </h2>
            {!collapsed.mares && (breedingMares.length === 0 ? (
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
            ))}
          </div>

          {/* Calendar - Actions */}
          <div style={{ marginTop: DS.spacing['3xl'] }}>
            <h2
              style={{...styles.h2, display: 'flex', alignItems: 'center', gap: DS.spacing.sm, cursor: 'pointer', userSelect: 'none'}}
              onClick={() => toggleSection('actions')}
            >
              {collapsed.actions ? <ChevronRight size={22} color={DS.colors.primary} /> : <ChevronDown size={22} color={DS.colors.primary} />}
              📅 Upcoming Actions
              <span style={{...styles.bodySmall, color: DS.colors.textMuted, fontWeight: DS.typography.weight.normal}}>({pendingActions.length})</span>
            </h2>

            {!collapsed.actions && (<>
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
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CHAT SCREEN
// ============================================================================

function ChatScreen({ horses, actions, events, onBack, onAddEvent, onAddAction, onUpdateBreedingStatus, onResolveActions }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [editingConfirmation, setEditingConfirmation] = useState(null);
  const [chatMode, setChatMode] = useState('log'); // 'log' or 'ask'

  // Turn a free-form chat message into a reviewable event: which mare it is
  // about, what kind of event it is (insemination, ultrasound, ovulation,
  // pregnancy/heartbeat check, lutalyse, intensive monitoring, double ovulation,
  // uterine issue, pregnancy loss, foaling), and the date/time and any details
  // stated. Everything derived from the type — the title, the follow-up actions,
  // and the resulting breeding status — is filled in by deriveEvent so the
  // preview, the editor, and what gets saved all stay in sync. Every field is
  // editable afterwards from the Edit Event modal.
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
    const name = horse?.nickname || horse?.barnName || 'the mare';

    // When the event happened (a relative reference like "yesterday" wins over an
    // explicit calendar date), defaulting to today, and the time of day. When the
    // note doesn't state a time, fall back to the moment the update is logged so
    // the event is stamped with a real time rather than left blank.
    const date = parseRelativeDate(lower) || parseExplicitDate(text) || today();
    const time = parseTime(lower) || nowTime();

    const eventType = classifyEventType(lower);

    // Semen type ("Inseminate Roma fresh Vitalis"), kept lowercase for the title.
    const semenRaw =
      /frozen/.test(lower) ? 'frozen' :
      /chilled|cooled|cool\b/.test(lower) ? 'chilled' :
      /natural|live\s*cover|pasture/.test(lower) ? 'natural' :
      /fresh/.test(lower) ? 'fresh' : '';

    // Follicle sizes from "36 right 36 left" / "right 36 left 38".
    const rightMatch = lower.match(/(\d+)\s*(?:mm)?\s*right\b/) || lower.match(/\bright\s*(\d+)/);
    const leftMatch = lower.match(/(\d+)\s*(?:mm)?\s*left\b/) || lower.match(/\bleft\s*(\d+)/);
    const follicleRight = rightMatch ? rightMatch[1] : '';
    const follicleLeft = leftMatch ? leftMatch[1] : '';

    // A positive vs negative pregnancy-check result. Negatives are checked
    // first and cover negation phrasing ("did not see an embryo", "didn't find
    // a sac") so a note isn't mis-read as positive just because the word
    // "embryo"/"pregnant" appears inside a negation.
    const result =
      /(?:did|does|do|could|can|was|were|is|are|wo|would)\s*n['’]?o?t\s+(?:see|saw|seen|find|found|detect|confirm)|n['’]t\s+(?:see|saw|seen|find|found|detect|confirm)|\bno\s+(?:embryo|sac|pregnan|sign|heartbeat|foal|fetus)|not\s+(?:in\s*foal|pregnant)|negative|\bempty\b|came?\s+back\s+open|\bopen\b/.test(lower) ? 'negative' :
      /embryo|in\s*foal|pregnant|positive|heartbeat|confirmed/.test(lower) ? 'positive' : '';

    // Lutalyse / drug dose, e.g. ".5 lute".
    const doseMatch = lower.match(/(\d*\.\d+|\d+)\s*(?:ml|cc|mg)?/);
    const dose = eventType === 'lutalyse' && doseMatch ? doseMatch[1] : '';

    // Intensive-monitoring interval ("12 hour checks", "6 hr checks").
    const intervalMatch = lower.match(/(\d+)\s*-?\s*(?:hour|hr)s?\b/);
    let series = null;
    if (eventType === 'monitoring' && intervalMatch) {
      const intervalHours = Math.max(1, parseInt(intervalMatch[1], 10));
      series = { intervalHours, days: 3, count: Math.max(1, Math.floor((3 * 24) / intervalHours)) };
    }

    const fields = {
      horseId: horse?.id || null,
      horseName: horse?.barnName || 'Unknown',
      name,
      eventType,
      date,
      time,
      semenType: eventType === 'insemination' ? semenRaw : '',
      stallion: eventType === 'insemination' ? parseStallion(text, horse) : '',
      follicleRight: (eventType === 'ultrasound' || eventType === 'monitoring') ? follicleRight : '',
      follicleLeft: (eventType === 'ultrasound' || eventType === 'monitoring') ? follicleLeft : '',
      dose,
      result: eventType === 'pregnancy-check' ? result : '',
      series,
      // Follow-ups the user spelled out in the message ("recheck in 2 days"),
      // scheduled on top of anything the event type already implies.
      extraActions: parseExplicitActions(text, name),
      note: text,
    };

    // Still-open reminders for this mare that the note reports as done, surfaced
    // in the preview so they can be ticked off alongside logging the event.
    const resolvedActions = findResolvedActions(text, horse?.id || null, actions)
      .map((a) => ({ id: a.id, title: a.title, confirmed: true }));

    return { ...fields, ...deriveEvent(fields), resolvedActions };
  };

  // Recompute everything derived from a confirmation's fields after the user
  // edits one in the Edit Event modal, so the title, preview details, follow-up
  // actions, and status stay correct as the event type or any field changes.
  const recomputeConfirmation = (f) => {
    const horse = horses.find(h => h.id === f.horseId) || null;
    const next = {
      ...f,
      name: horse?.nickname || horse?.barnName || f.name || 'Unknown',
      horseName: horse?.barnName || f.horseName || 'Unknown',
    };
    // Re-match resolved reminders against the (possibly edited) mare/note so the
    // preview never offers to close out another mare's actions after an edit,
    // preserving any the user has already unchecked for ones that still match.
    const priorConfirmed = new Map((f.resolvedActions || []).map((a) => [a.id, a.confirmed]));
    const resolvedActions = findResolvedActions(next.note || '', next.horseId, actions)
      .map((a) => ({ id: a.id, title: a.title, confirmed: priorConfirmed.get(a.id) !== false }));
    return { ...next, ...deriveEvent(next), resolvedActions };
  };

  // The most recent breeding date on record for a horse, so Claude can resolve
  // "day N" reminders (counted from when she was bred) on the server side.
  const recentBreedingDate = (horseId) => {
    const bred = events
      .filter(e => e.horseId === horseId && (e.type === 'breed' || e.type === 'breeding' || /bred|inseminat/i.test(e.title || '')))
      .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
    return bred.length ? bred[0].date : null;
  };

  // Coerce Claude's structured response into the exact shape the confirmation
  // card and save handler expect — backfilling the horse from the conversation
  // fallback, validating categories, and computing the recurring-check count.
  const normalizeParsed = (p, text, fallbackHorse) => {
    const horseId = p.horseId || fallbackHorse?.id || null;
    const horse = horses.find(h => h.id === horseId) || null;
    const name = horse?.nickname || horse?.barnName || 'the mare';

    // Trust only an event type the catalog knows; anything else is a plain note.
    const eventType = EVENT_TYPES.some(t => t.key === p.eventType) ? p.eventType : 'note';

    // Recurring-check series: backfill the count from interval + window so the
    // monitoring branch of deriveEvent schedules the right number of reminders,
    // exactly as the local parser does.
    let series = null;
    if (p.series && p.series.intervalHours) {
      const intervalHours = Math.max(1, Math.round(p.series.intervalHours));
      const days = Math.max(1, Math.round(p.series.days || 3));
      series = { intervalHours, days, count: Math.max(1, Math.floor((days * 24) / intervalHours)) };
    } else if (eventType === 'monitoring') {
      series = { intervalHours: 12, days: 3, count: Math.max(1, Math.floor((3 * 24) / 12)) };
    }

    // Explicitly-requested extra reminders -> the same action shape deriveEvent
    // emits, so they render in the preview and save identically.
    const validPriority = (pr) => (['low', 'medium', 'high', 'critical'].includes(pr) ? pr : 'medium');
    const extraActions = Array.isArray(p.extraActions)
      ? p.extraActions
          .filter(a => a && a.title)
          .map(a => {
            const label = cap(String(a.title).trim());
            return {
              label,
              bullet: label,
              title: `${label} - ${name}`,
              dueDate: a.dueDate || today(),
              dueTime: '',
              priority: validPriority(a.priority),
              category: 'check',
            };
          })
      : [];

    // Assemble the exact field set the local rule-based parser produces, then run
    // it through the shared deriveEvent() factory. This is what makes the AI path
    // and the offline fallback yield an identical confirmation card, save payload,
    // and editable form — the AI only supplies smarter field extraction.
    const fields = {
      horseId,
      horseName: horse?.barnName || 'Unknown',
      name,
      eventType,
      date: p.date || today(),
      time: p.time || nowTime(),
      semenType: eventType === 'insemination' ? (p.semenType || '') : '',
      stallion: eventType === 'insemination' ? (p.stallion || '') : '',
      follicleRight: (eventType === 'ultrasound' || eventType === 'monitoring') ? (p.follicleRight || '') : '',
      follicleLeft: (eventType === 'ultrasound' || eventType === 'monitoring') ? (p.follicleLeft || '') : '',
      dose: eventType === 'lutalyse' ? (p.dose || '') : '',
      result: eventType === 'pregnancy-check' ? (p.result || '') : '',
      series,
      extraActions,
      note: p.note || text,
    };

    // Still-open reminders this note reports as done, surfaced for confirm/deny —
    // matched client-side against the live action list, just like the local path.
    const resolvedActions = findResolvedActions(text, horseId, actions)
      .map((a) => ({ id: a.id, title: a.title, confirmed: true }));

    return { ...fields, ...deriveEvent(fields), resolvedActions };
  };

  // Ask Claude (via the Netlify AI Gateway function) to parse a free-form note
  // into the structured log entry. Throws on any failure so the caller can fall
  // back to the local rule-based parser.
  const parseInputAI = async (text, fallbackHorse) => {
    const horseList = horses.map(h => ({
      id: h.id,
      barnName: h.barnName,
      nickname: h.nickname || null,
      breedingStatus: h.breedingStatus || null,
    }));
    const breedingDates = {};
    horses.forEach(h => {
      const d = recentBreedingDate(h.id);
      if (d) breedingDates[h.id] = d;
    });

    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'log',
        message: text,
        horses: horseList,
        breedingDates,
        today: today(),
        fallbackHorseId: fallbackHorse?.id || null,
      }),
    });
    const data = await response.json();
    if (!data.parsed) throw new Error(data.error || 'No parse returned');
    return normalizeParsed(data.parsed, text, fallbackHorse);
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

      // Show a thinking state while Claude reads the note.
      const loadingId = `t${Date.now()}`;
      setMessages(prev => [
        ...prev,
        { role: 'user', text: userMessage, timestamp: new Date() },
        { role: 'assistant', text: '🤔 Reading your note...', isLoading: true, loadingId, timestamp: new Date() },
      ]);

      // Claude turns the free-form note into the structured confirmation card.
      // If the AI call fails for any reason (gateway hiccup, offline), fall back
      // to the local rule-based parser so logging still works.
      let parsed;
      try {
        parsed = await parseInputAI(userMessage, fallbackHorse);
      } catch (error) {
        parsed = parseInput(userMessage, fallbackHorse);
      }
      parsed = { ...parsed, id: `c${Date.now()}` };

      setMessages(prev =>
        prev.map(m =>
          m.loadingId === loadingId
            ? {
                role: 'assistant',
                text: `Here's what I understood for ${parsed.horseName}. Review or edit, then save.`,
                action: 'confirm',
                confirmData: parsed,
                timestamp: new Date(),
              }
            : m,
        ),
      );
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
    if (!confirmData.horseId) {
      const updated = messages.filter(m => m.confirmData?.id !== confirmData.id);
      setMessages([...updated, { role: 'assistant', text: '⚠️ Pick a mare first — nothing was saved.', timestamp: new Date() }]);
      return;
    }

    const created = [];
    const base = Date.now();

    // The logged event itself goes on the mare's timeline. The detail string keeps
    // the semen/stallion/follicle/result wording so the profile's breeding summary
    // and foaling timeline can read it back.
    onAddEvent({
      id: `e${base}`,
      horseId: confirmData.horseId,
      date: confirmData.date,
      time: confirmData.time || '',
      type: confirmData.eventType,
      title: confirmData.eventTitle,
      detail: buildEventDetail(confirmData),
      note: confirmData.note || '',
    });
    created.push('event');

    // Each derived follow-up becomes a scheduled action with its priority. An
    // intensive-monitoring series expands into one reminder per interval across
    // its window, each stamped with the time it falls on.
    (confirmData.actions || []).forEach((a, i) => {
      if (a.series) {
        const { intervalHours, count } = a.series;
        const seriesBase = Date.now();
        for (let k = 1; k <= count; k++) {
          const when = new Date(seriesBase + k * intervalHours * 60 * 60 * 1000);
          const timeLabel = when.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
          onAddAction({
            id: `a${base}_${i}_${k}`,
            horseId: confirmData.horseId,
            category: 'check',
            title: `${a.title} (${timeLabel})`,
            note: '',
            dueDate: formatDate(when),
            priority: a.priority,
            done: false,
          });
        }
      } else {
        onAddAction({
          id: `a${base}_${i}`,
          horseId: confirmData.horseId,
          category: a.category || 'check',
          title: a.title,
          note: '',
          dueDate: a.dueDate || today(),
          priority: a.priority,
          done: false,
        });
      }
    });
    if ((confirmData.actions || []).length) created.push(`${confirmData.actions.length} action${confirmData.actions.length > 1 ? 's' : ''}`);

    // Close out any still-open reminders the note resolved (e.g. logging a check
    // ticks off the "check this mare" action). Only the ones still checked in the
    // preview are touched, since the user can uncheck any they don't want closed.
    const resolvedIds = (confirmData.resolvedActions || [])
      .filter((a) => a.confirmed !== false)
      .map((a) => a.id);
    if (resolvedIds.length && onResolveActions) {
      onResolveActions(resolvedIds);
      created.push(`${resolvedIds.length} action${resolvedIds.length > 1 ? 's' : ''} marked done`);
    }

    // The event can also advance the mare's breeding-cycle status, which in turn
    // keeps her foaling estimate / "foals due" listing in step on her profile.
    if (confirmData.breedingStatusUpdate && onUpdateBreedingStatus) {
      onUpdateBreedingStatus(confirmData.horseId, confirmData.breedingStatusUpdate);
      created.push('mare status');
    }

    const updatedMessages = messages.filter(m => m.confirmData?.id !== confirmData.id);
    setMessages([
      ...updatedMessages,
      {
        role: 'assistant',
        text: `✅ Saved ${created.join(', ')} for ${confirmData.horseName}.`,
        timestamp: new Date(),
        success: true,
      },
    ]);
  };

  // Discard a pending confirmation card without saving anything.
  const handleCancelConfirmation = (confirmData) => {
    setMessages(messages.filter(m => m.confirmData?.id !== confirmData.id));
    if (editingConfirmation?.id === confirmData.id) setEditingConfirmation(null);
  };

  // Toggle whether a matched "marking action as done" suggestion will be applied
  // when the card is saved, so the user can confirm or deny each one inline.
  const toggleResolvedAction = (confirmData, actionId) => {
    setMessages(messages.map(m => {
      if (m.confirmData?.id !== confirmData.id) return m;
      return {
        ...m,
        confirmData: {
          ...m.confirmData,
          resolvedActions: (m.confirmData.resolvedActions || []).map(a =>
            a.id === actionId ? { ...a, confirmed: a.confirmed === false } : a
          ),
        },
      };
    }));
  };

  const handleSaveEdit = () => {
    if (editingConfirmation) {
      const recomputed = recomputeConfirmation(editingConfirmation);
      setMessages(messages.map(m =>
        m.confirmData?.id === recomputed.id ? { ...m, confirmData: recomputed } : m
      ));
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

      // Call the Netlify function, which reaches Claude through the AI Gateway.
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        body: JSON.stringify({ mode: 'ask', question, context }),
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
                    {/* Preview card — "This will create" */}
                    <div style={{
                      background: DS.colors.white,
                      border: `1px solid ${DS.colors.border}`,
                      borderLeft: `4px solid ${DS.colors.primary}`,
                      borderRadius: DS.radius.lg,
                      padding: DS.spacing.lg,
                      boxShadow: DS.shadow.sm,
                    }}>
                      <h3 style={{...styles.h3, marginBottom: DS.spacing.lg}}>📋 This will create:</h3>

                      {/* EVENT */}
                      <div style={styles.label}>Event</div>
                      <div style={{ background: DS.colors.bgAlt, borderRadius: DS.radius.md, padding: DS.spacing.lg, marginTop: DS.spacing.sm }}>
                        <p style={{...styles.body, fontWeight: DS.typography.weight.bold}}>{msg.confirmData.eventTitle}</p>
                        {(msg.confirmData.eventDetails || []).map(d => (
                          <p key={d.label} style={{...styles.bodySmall, marginTop: DS.spacing.xs, color: DS.colors.textSecondary}}>
                            {d.label}: <strong style={{ color: DS.colors.text }}>{d.value}</strong>
                          </p>
                        ))}
                      </div>

                      {/* AUTO-CREATED ACTIONS */}
                      {(msg.confirmData.actions || []).length > 0 && (
                        <div style={{ marginTop: DS.spacing.lg, paddingTop: DS.spacing.lg, borderTop: `1px solid ${DS.colors.border}` }}>
                          <div style={styles.label}>Auto-Created Actions</div>
                          {msg.confirmData.actions.map((a, idx) => (
                            <div key={idx} style={{ background: DS.colors.bgAlt, borderRadius: DS.radius.md, padding: DS.spacing.lg, marginTop: DS.spacing.sm }}>
                              <p style={{...styles.bodySmall, color: DS.colors.textMuted}}>{idx + 1}. {a.label}</p>
                              <p style={{...styles.body, fontWeight: DS.typography.weight.bold, marginTop: DS.spacing.xs}}>{a.title}</p>
                              <p style={{...styles.bodySmall, marginTop: DS.spacing.xs, color: DS.colors.textSecondary}}>
                                Due: <strong style={{ color: DS.colors.text }}>{a.series ? `every ${a.series.intervalHours}h` : (a.dueTime ? `${a.dueDate} ${a.dueTime}` : a.dueDate)}</strong>
                                {a.priority ? <> | Priority: <strong style={{ color: DS.colors.text }}>{a.priority.toUpperCase()}</strong></> : null}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* RESOLVED ACTIONS — "Marking action X as done" */}
                      {(msg.confirmData.resolvedActions || []).length > 0 && (
                        <div style={{ marginTop: DS.spacing.lg, paddingTop: DS.spacing.lg, borderTop: `1px solid ${DS.colors.border}` }}>
                          <div style={styles.label}>Marking Actions Done</div>
                          {msg.confirmData.resolvedActions.map((a) => (
                            <label
                              key={a.id}
                              style={{ display: 'flex', alignItems: 'flex-start', gap: DS.spacing.md, background: DS.colors.bgAlt, borderRadius: DS.radius.md, padding: DS.spacing.lg, marginTop: DS.spacing.sm, cursor: 'pointer' }}
                            >
                              <input
                                type="checkbox"
                                checked={a.confirmed !== false}
                                onChange={() => toggleResolvedAction(msg.confirmData, a.id)}
                                style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '1px', flexShrink: 0 }}
                              />
                              <span style={{ flex: 1 }}>
                                <p style={{...styles.body, fontWeight: DS.typography.weight.bold, textDecoration: a.confirmed === false ? 'line-through' : 'none', opacity: a.confirmed === false ? 0.5 : 1}}>
                                  ✓ Mark “{a.title}” as done
                                </p>
                                <p style={{...styles.bodySmall, marginTop: DS.spacing.xs, color: DS.colors.textMuted}}>
                                  {a.confirmed === false ? 'Will stay open' : 'This note resolves it'}
                                </p>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* MARE STATUS — shown as the step she moves from → to */}
                      {msg.confirmData.breedingStatusUpdate && (() => {
                        const currentStatus = horses.find(h => h.id === msg.confirmData.horseId)?.breedingStatus;
                        return (
                          <div style={{ marginTop: DS.spacing.lg, paddingTop: DS.spacing.lg, borderTop: `1px solid ${DS.colors.border}` }}>
                            <div style={styles.label}>Mare Status</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: DS.spacing.sm, marginTop: DS.spacing.sm, flexWrap: 'wrap' }}>
                              {currentStatus && currentStatus !== msg.confirmData.breedingStatusUpdate && (
                                <>
                                  <span style={{...styles.body, color: getStatusColor(currentStatus), textDecoration: 'line-through', opacity: 0.7}}>
                                    {currentStatus}
                                  </span>
                                  <span style={{...styles.body, color: DS.colors.textMuted}}>→</span>
                                </>
                              )}
                              <span style={{...styles.body, fontWeight: DS.typography.weight.semibold, color: getStatusColor(msg.confirmData.breedingStatusUpdate)}}>
                                {msg.confirmData.breedingStatusUpdate}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: DS.spacing.md, marginTop: DS.spacing.lg, paddingTop: DS.spacing.lg, borderTop: `1px solid ${DS.colors.border}` }}>
                        <button
                          onClick={() => handleSaveConfirmation(msg.confirmData)}
                          style={{...styles.buttonBase, background: DS.colors.success, color: 'white', flex: 1, fontSize: DS.typography.size.sm}}
                        >
                          <Check size={16} /> Save
                        </button>
                        <button
                          onClick={() => setEditingConfirmation(recomputeConfirmation(msg.confirmData))}
                          style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1, fontSize: DS.typography.size.sm}}
                        >
                          <Edit2 size={16} /> Edit
                        </button>
                        <button
                          onClick={() => handleCancelConfirmation(msg.confirmData)}
                          style={{...styles.buttonBase, ...styles.buttonSecondary, flex: 1, fontSize: DS.typography.size.sm}}
                        >
                          <X size={16} /> Cancel
                        </button>
                      </div>
                    </div>
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

      {/* Edit Event modal — opens over the chat when "Edit" is tapped on a
          preview card. Editing any field live-recomputes the title, the details,
          and the auto-created actions so the preview matches what gets saved. */}
      {editingConfirmation && (
        <div
          onClick={() => setEditingConfirmation(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26, 23, 21, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: DS.spacing.lg, zIndex: 300 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: DS.colors.white, borderRadius: DS.radius.lg, width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: DS.shadow.md }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: DS.spacing.lg, borderBottom: `1px solid ${DS.colors.border}` }}>
              <h2 style={styles.h2}>Edit Event</h2>
              <button onClick={() => setEditingConfirmation(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: DS.colors.textSecondary, display: 'flex' }} title="Close"><X size={22} /></button>
            </div>

            <div style={{ padding: DS.spacing.lg }}>
              {/* Mare */}
              <div>
                <label style={styles.label}>Mare</label>
                <select
                  value={editingConfirmation.horseId || ''}
                  onChange={(e) => setEditingConfirmation(recomputeConfirmation({ ...editingConfirmation, horseId: e.target.value || null }))}
                  style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white}}
                >
                  <option value="">Unknown</option>
                  {horses.map(h => (<option key={h.id} value={h.id}>{h.barnName}</option>))}
                </select>
              </div>

              {/* Event Type */}
              <div style={{ marginTop: DS.spacing.lg }}>
                <label style={styles.label}>Event Type</label>
                <select
                  value={editingConfirmation.eventType}
                  onChange={(e) => setEditingConfirmation(recomputeConfirmation({ ...editingConfirmation, eventType: e.target.value }))}
                  style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white}}
                >
                  {EVENT_TYPES.map(t => (<option key={t.key} value={t.key}>{t.label}</option>))}
                </select>
              </div>

              {/* Date */}
              <div style={{ marginTop: DS.spacing.lg }}>
                <label style={styles.label}>Date</label>
                <input
                  type="date"
                  value={editingConfirmation.date || ''}
                  onChange={(e) => setEditingConfirmation(recomputeConfirmation({ ...editingConfirmation, date: e.target.value }))}
                  style={{...styles.input, marginTop: DS.spacing.sm}}
                />
              </div>

              {/* Time */}
              <div style={{ marginTop: DS.spacing.lg }}>
                <label style={styles.label}>Time (HH:MM)</label>
                <input
                  type="text"
                  value={editingConfirmation.time || ''}
                  placeholder="e.g. 11:00"
                  onChange={(e) => setEditingConfirmation(recomputeConfirmation({ ...editingConfirmation, time: e.target.value }))}
                  style={{...styles.input, marginTop: DS.spacing.sm}}
                />
              </div>

              {/* Semen Type + Stallion — insemination only */}
              {editingConfirmation.eventType === 'insemination' && (
                <>
                  <div style={{ marginTop: DS.spacing.lg }}>
                    <label style={styles.label}>Semen Type</label>
                    <select
                      value={editingConfirmation.semenType || ''}
                      onChange={(e) => setEditingConfirmation(recomputeConfirmation({ ...editingConfirmation, semenType: e.target.value }))}
                      style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white}}
                    >
                      <option value="">Not set</option>
                      {['fresh', 'frozen', 'chilled', 'natural'].map(s => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                  <div style={{ marginTop: DS.spacing.lg }}>
                    <label style={styles.label}>Stallion Name</label>
                    <input
                      type="text"
                      value={editingConfirmation.stallion || ''}
                      onChange={(e) => setEditingConfirmation(recomputeConfirmation({ ...editingConfirmation, stallion: e.target.value }))}
                      style={{...styles.input, marginTop: DS.spacing.sm}}
                    />
                  </div>
                </>
              )}

              {/* Follicle sizes — ultrasound / intensive monitoring */}
              {(editingConfirmation.eventType === 'ultrasound' || editingConfirmation.eventType === 'monitoring') && (
                <div style={{ marginTop: DS.spacing.lg, display: 'flex', gap: DS.spacing.md }}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Follicle Right (mm)</label>
                    <input
                      type="text"
                      value={editingConfirmation.follicleRight || ''}
                      onChange={(e) => setEditingConfirmation(recomputeConfirmation({ ...editingConfirmation, follicleRight: e.target.value }))}
                      style={{...styles.input, marginTop: DS.spacing.sm}}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Follicle Left (mm)</label>
                    <input
                      type="text"
                      value={editingConfirmation.follicleLeft || ''}
                      onChange={(e) => setEditingConfirmation(recomputeConfirmation({ ...editingConfirmation, follicleLeft: e.target.value }))}
                      style={{...styles.input, marginTop: DS.spacing.sm}}
                    />
                  </div>
                </div>
              )}

              {/* Dose — lutalyse */}
              {editingConfirmation.eventType === 'lutalyse' && (
                <div style={{ marginTop: DS.spacing.lg }}>
                  <label style={styles.label}>Dose</label>
                  <input
                    type="text"
                    value={editingConfirmation.dose || ''}
                    onChange={(e) => setEditingConfirmation(recomputeConfirmation({ ...editingConfirmation, dose: e.target.value }))}
                    style={{...styles.input, marginTop: DS.spacing.sm}}
                  />
                </div>
              )}

              {/* Result — pregnancy check */}
              {editingConfirmation.eventType === 'pregnancy-check' && (
                <div style={{ marginTop: DS.spacing.lg }}>
                  <label style={styles.label}>Result</label>
                  <select
                    value={editingConfirmation.result || ''}
                    onChange={(e) => setEditingConfirmation(recomputeConfirmation({ ...editingConfirmation, result: e.target.value }))}
                    style={{...styles.input, marginTop: DS.spacing.sm, background: DS.colors.white}}
                  >
                    <option value="">Not stated</option>
                    <option value="positive">Positive — in foal</option>
                    <option value="negative">Negative — not in foal</option>
                  </select>
                </div>
              )}

              {/* Notes */}
              <div style={{ marginTop: DS.spacing.lg }}>
                <label style={styles.label}>Notes</label>
                <textarea
                  value={editingConfirmation.note || ''}
                  placeholder="Additional notes..."
                  onChange={(e) => setEditingConfirmation({ ...editingConfirmation, note: e.target.value })}
                  style={{...styles.input, marginTop: DS.spacing.sm, minHeight: '80px', fontFamily: DS.typography.family.base}}
                />
              </div>

              {/* Auto-created actions preview */}
              {(editingConfirmation.actions || []).length > 0 && (
                <div style={{ marginTop: DS.spacing.lg, background: DS.colors.bgAlt, borderLeft: `3px solid ${DS.colors.primary}`, borderRadius: DS.radius.md, padding: DS.spacing.lg }}>
                  <p style={{...styles.bodySmall, fontWeight: DS.typography.weight.semibold, color: DS.colors.text}}>Auto-created actions will be:</p>
                  <ul style={{ margin: `${DS.spacing.sm} 0 0`, paddingLeft: DS.spacing.xl }}>
                    {editingConfirmation.actions.map((a, i) => (
                      <li key={i} style={{...styles.bodySmall, marginTop: DS.spacing.xs}}>
                        {a.bullet} ({a.series ? `every ${a.series.intervalHours}h` : (a.dueTime ? `${a.dueDate} ${a.dueTime}` : a.dueDate)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: DS.spacing.md, padding: DS.spacing.lg, borderTop: `1px solid ${DS.colors.border}` }}>
              <button onClick={() => setEditingConfirmation(null)} style={{...styles.buttonBase, ...styles.buttonSecondary}}>Cancel</button>
              <button onClick={handleSaveEdit} style={{...styles.buttonBase, ...styles.buttonPrimary}}>Update &amp; Save</button>
            </div>
          </div>
        </div>
      )}

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
    const changes = { breedingStatus: status };

    // Keep the mare's foaling estimate in step with her breeding status, so that
    // whichever way the status moves — a chat log or the profile dropdown — the
    // foaling timeline on her profile and the "foals due" list on the home
    // screen reflect it without anyone re-entering a due date by hand.
    if (status === 'Confirmed in foal') {
      const horse = horses.find(h => h.id === horseId);
      const lastBred = events
        .filter(e => e.horseId === horseId
          && (e.type === 'breed' || e.type === 'breeding' || /\b(bred|inseminat|covered)\b/i.test(e.title || '')))
        .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date))[0];
      // Only fill in an estimate when she has a breeding on record and no due
      // date has been set already, so a hand-entered date is never overwritten.
      if (lastBred && !horse?.foalDueDate) {
        changes.conceptionDate = lastBred.date;
        changes.foalDueDate = formatDate(addDays(parseLocalDate(lastBred.date), GESTATION_DAYS));
      }
    } else if (status === 'Lost - back open' || status === 'Waiting for cycle' || status === 'Foaled') {
      // The pregnancy ended (she came back open or foaled out) — drop the
      // foaling estimate so she no longer shows as due.
      changes.foalDueDate = null;
      changes.conceptionDate = null;
    }

    const horse = updateHorse(horseId, changes);
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

  // Mark a batch of actions done at once — used when a chat note resolves one or
  // more open reminders. Done in a single state update (and one persist call per
  // record) so several toggles can't clobber one another off a stale snapshot.
  const handleResolveActions = (actionIds) => {
    if (!actionIds || !actionIds.length) return;
    const ids = new Set(actionIds);
    const updatedOnes = actions
      .filter(a => ids.has(a.id) && !a.done)
      .map(a => ({ ...a, done: true }));
    if (!updatedOnes.length) return;
    const byId = new Map(updatedOnes.map(a => [a.id, a]));
    setActions(actions.map(a => byId.get(a.id) || a));
    updatedOnes.forEach(a => persistItem('actions', a));
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

  const handleDeleteEvent = (eventId) => {
    setEvents(events.filter(e => e.id !== eventId));
    removeItem('events', eventId);
    flash('Event deleted');
  };

  // Save an edited timeline item, handling the case where the user changed what
  // it is (event <-> action) via the editor's type dropdown. When the kind is
  // unchanged the record is updated in place. When it changed, the record is
  // removed from its old collection and written to the new one (events and
  // actions are stored separately), so the item moves cleanly between the two.
  const handleSaveTimelineItem = (originalKind, kind, item) => {
    if (originalKind === kind) {
      if (kind === 'event') {
        setEvents(events.map(e => e.id === item.id ? item : e));
        persistItem('events', item);
      } else {
        setActions(actions.map(a => a.id === item.id ? item : a));
        persistItem('actions', item);
      }
      flash(kind === 'event' ? 'Event updated' : 'Action updated');
      return;
    }

    if (originalKind === 'event') {
      setEvents(events.filter(e => e.id !== item.id));
      removeItem('events', item.id);
    } else {
      setActions(actions.filter(a => a.id !== item.id));
      removeItem('actions', item.id);
    }

    if (kind === 'event') {
      setEvents(prev => [...prev, item]);
      persistItem('events', item);
    } else {
      setActions(prev => [...prev, item]);
      persistItem('actions', item);
    }
    flash(kind === 'event' ? 'Changed to event' : 'Changed to action');
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
          onSaveTimelineItem={handleSaveTimelineItem}
          onDeleteEvent={handleDeleteEvent}
          onDeleteAction={handleDeleteAction}
          onToggleAction={handleToggleAction}
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
            setEvents(prev => [...prev, event]);
            persistItem('events', event);
            flash(`Event logged!`);
          }}
          onAddAction={(action) => {
            setActions(prev => [...prev, action]);
            persistItem('actions', action);
            flash(`Action added!`);
          }}
          onUpdateBreedingStatus={handleUpdateStatus}
          onResolveActions={handleResolveActions}
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
