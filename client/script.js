// ── CONSTANTS ─────────────────────────────────────────────────
const STORAGE_KEY = 'organizer_items';

const ACTION_TYPES = [
  { id: 'meeting',       label: 'Meeting',       icon: '📅', desc: 'Set up a meeting schedule' },
  { id: 'search_vendor', label: 'Search Vendor', icon: '🔎', desc: 'Create a brief for the vendor search' },
  { id: 'hold',          label: 'Hold',          icon: '⏸', desc: 'Put this action on hold' },
  { id: 'reject',        label: 'Reject',        icon: '↩', desc: 'Mark this action as rejected' },
];

// ── MOCK DATA ────────────────────────────────────────────────
const mockData = {
  clients: [
    {
      name: 'Bonteh',
      projects: ['Campus Ambassador', 'Warkop Campaign', 'StandupIndo Bogor', 'General']
    },
    {
      name: 'WRPR',
      projects: ['Vendor Briefing', 'Budget Planning']
    },
    {
      name: 'Atisfyreach',
      projects: ['3-Month Proposal', 'Influencer Campaign', 'AI Campaign']
    },
    {
      name: 'Playup',
      projects: ['Warkop Activation', 'Jingle Production', 'TJ Campaign']
    },
    {
      name: 'TJ',
      projects: ['Bus Campaign', 'General']
    }
  ]
};

// ── STATE ──────────────────────────────────────────────────────
let currentSentences = [];
let pendingNewClient  = null; // 'modal' source flag
let modal = { idx: null, step: 1, data: {}, reviewItemId: null };

// ── STORAGE ───────────────────────────────────────────────────
function normalizeItem(item) {
  const actionType = ACTION_TYPES.some(action => action.id === item.actionType)
    ? item.actionType
    : null;
  const needsFollowUp = ['meeting', 'search_vendor'].includes(actionType);
  const decision = ['active', 'pending_review', 'held', 'rejected'].includes(item.decision)
    ? item.decision
    : actionType === 'hold'
      ? 'held'
      : actionType === 'reject'
        ? 'rejected'
        : actionType
          ? 'active'
          : 'pending_review';

  return {
    id:            item.id || crypto.randomUUID(),
    sentence:      item.sentence || '',
    client:        item.client || '',
    campaign:      item.campaign || '',
    vendor:        item.vendor || '',
    vendorContact: item.vendorContact || '',
    actionType,
    decision,
    priority:        needsFollowUp ? item.priority || null : null,
    deadline:        needsFollowUp ? item.deadline || null : null,
    meetingDate:     actionType === 'meeting' ? item.meetingDate || null : null,
    meetingTime:     actionType === 'meeting' ? item.meetingTime || null : null,
    meetingLocation: actionType === 'meeting' ? item.meetingLocation || '' : '',
    vendorSearchNote: actionType === 'search_vendor' ? item.vendorSearchNote || '' : '',
    reminderDate:    needsFollowUp ? item.reminderDate || null : null,
    reminderTime:    needsFollowUp ? item.reminderTime || null : null,
    holdReason:      actionType === 'hold' ? item.holdReason || '' : '',
    reviewOn:        actionType === 'hold' ? item.reviewOn || null : null,
    rejectionReason: actionType === 'reject' ? item.rejectionReason || '' : '',
    dateAdded:     item.dateAdded || new Date().toISOString(),
  };
}

function loadItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    if (!Array.isArray(parsed)) return [];
    const items = parsed.map(normalizeItem);
    // Migrate prior browser data to the current, deliberately small schema.
    if (JSON.stringify(parsed) !== JSON.stringify(items)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
    return items;
  }
  catch { return []; }
}

function upsertItem(item) {
  const items = loadItems();
  const i = items.findIndex(x => x.id === item.id);
  if (i >= 0) items[i] = item; else items.push(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ── HELPERS ───────────────────────────────────────────────────
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(date, time) {
  if (!date) return '—';
  return `${fmtDate(date)}${time ? ` · ${time}` : ''}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildClientOptions(sel) {
  let h = `<option value="">— Select client —</option>`;
  mockData.clients.forEach(c => {
    h += `<option value="${esc(c.name)}"${c.name === sel ? ' selected' : ''}>${esc(c.name)}</option>`;
  });
  return h + `<option value="__new__">＋ Add new client…</option>`;
}

function buildCampaignOptions(clientName, sel) {
  const c = mockData.clients.find(x => x.name === clientName);
  if (!c) return `<option value="">— Select campaign —</option>`;
  let h = `<option value="">— Select campaign —</option>`;
  c.projects.forEach(p => {
    h += `<option value="${esc(p)}"${p === sel ? ' selected' : ''}>${esc(p)}</option>`;
  });
  return h;
}

// ── SENTENCE SPLITTING & DETECTION ────────────────────────────
function splitSentences(text) {
  const cleaned = text
    .split('\n')
    .filter(l => {
      const t = l.trim();
      return t.length > 0 && t !== '--' && !/^[\w\s]{1,25}:\s*.+$/.test(t);
    })
    .join(' ');

  return nlp(cleaned)
    .sentences()
    .out('array')
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

function detectClient(sentence) {
  const low = sentence.toLowerCase();
  for (const c of mockData.clients) {
    if (low.includes(c.name.toLowerCase())) return c.name;
  }
  return '';
}

// ── MODAL: OPEN / CLOSE / STEP ────────────────────────────────
function openModal(idx) {
  modal.idx  = idx;
  modal.step = 1;
  modal.reviewItemId = null;

  modal.data = {
    client: detectClient(currentSentences[idx]),
    sentence: currentSentences[idx],
  };

  $('#modalSentence').val(modal.data.sentence);
  $('#decisionModalTitle').text(`Assign Action · ${idx + 1} of ${currentSentences.length}`);
  populateStep1();
  showStep(1);
  $('#decisionModal').removeClass('hidden');
}

function openReviewModal(id) {
  const item = loadItems().find(entry => entry.id === id);
  if (!item) return;

  modal = {
    idx: null,
    step: 1,
    data: { ...item, actionType: null, decision: 'pending_review' },
    reviewItemId: id
  };
  $('#modalSentence').val(modal.data.sentence);
  $('#decisionModalTitle').text('Review decision');
  populateStep1();
  showStep(1);
  $('#decisionModal').removeClass('hidden');
}

function closeModal() {
  $('#decisionModal').addClass('hidden');
  modal = { idx: null, step: 1, data: {}, reviewItemId: null };
}

function showStep(n) {
  modal.step = n;
  $('#step1, #step2, #step3').addClass('hidden');
  $(`#step${n}`).removeClass('hidden');

  const labels = { 1: 'Context', 2: 'Action', 3: 'Action setup' };
  const stepCount = modalNeedsSetup() ? 3 : 2;
  $('#stepLabel').text(`Step ${n} of ${stepCount} — ${labels[n]}`);

  // Animate step dots: white = reached, semi-transparent = future
  $('.step-dot').each(function () {
    const s = +$(this).data('step');
    $(this).toggleClass('hidden', s > stepCount);
    $(this).css('background-color', s <= n ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.3)');
  });

  $('#modalBackBtn').toggleClass('hidden', n === 1);
  const canSave = n === stepCount && (n !== 2 || Boolean(modal.data.actionType));
  $('#modalNextBtn').toggleClass('hidden', canSave);
  $('#modalSaveBtn').toggleClass('hidden', !canSave);
  $('#modalSaveBtn').text(isTerminalAction() ? 'Save action' : 'Save');
}

function modalNeedsSetup() {
  return ['meeting', 'search_vendor'].includes(modal.data.actionType);
}

function isTerminalAction() {
  return ['hold', 'reject'].includes(modal.data.actionType);
}

// ── STEP 1: CONTEXT ───────────────────────────────────────────
function populateStep1() {
  $('#step1').html(`
    <div class="space-y-1.5">
      <label class="text-base font-semibold text-gray-500 uppercase tracking-wide">Client / Brand</label>
      <select id="m_client" class="w-full border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
        ${buildClientOptions(modal.data.client || '')}
      </select>
    </div>
    <div class="space-y-1.5">
      <label class="text-base font-semibold text-gray-500 uppercase tracking-wide">Campaign / Project</label>
      <select id="m_campaign" class="w-full border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
        ${buildCampaignOptions(modal.data.client || '', modal.data.campaign || '')}
      </select>
    </div>
    <div class="space-y-1.5">
      <label class="text-base font-semibold text-gray-500 uppercase tracking-wide">
        Vendor <span class="text-gray-400 font-normal normal-case">(if applicable)</span>
      </label>
      <input id="m_vendor" type="text" value="${esc(modal.data.vendor || '')}" placeholder="e.g. WRPR"
        class="w-full border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
    </div>
    <div class="space-y-1.5">
      <label class="text-base font-semibold text-gray-500 uppercase tracking-wide">
        Vendor Contact <span class="text-gray-400 font-normal normal-case">(if applicable)</span>
      </label>
      <input id="m_vendorContact" type="text" value="${esc(modal.data.vendorContact || '')}" placeholder="e.g. Tyo &amp; Adhyt"
        class="w-full border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
    </div>
  `);
}

function collectStep1() {
  modal.data.client        = $('#m_client').val();
  modal.data.campaign      = $('#m_campaign').val();
  modal.data.vendor        = $('#m_vendor').val().trim();
  modal.data.vendorContact = $('#m_vendorContact').val().trim();
}

// ── STEP 2: ACTION ─────────────────────────────────────────────
function fg(label, content) {
  return `<div class="space-y-1.5">
    <label class="text-base font-semibold text-gray-500 uppercase tracking-wide">${label}</label>
    <div>${content}</div>
  </div>`;
}

function priorityRow(sel) {
  const btns = [1,2,3,4,5].map(n => {
    const active = n === sel;
    return `<button type="button" class="pri-chip w-10 h-10 rounded-xl border-2 text-sm font-bold transition-all
             ${active ? 'bg-blue-600 text-white border-blue-600' : 'border-blue-100 text-blue-400 hover:border-blue-400'}"
            data-value="${n}">${n}</button>`;
  }).join('');
  return `<div class="flex items-center gap-2">${btns}
    <span class="text-base text-gray-400 ml-1">\u2190 Low \u00a0 High \u2192</span>
  </div>`;
}

function populateStep2() {
  const actionOptions = ACTION_TYPES.map(action => {
    const active = modal.data.actionType === action.id;
    return `<button type="button" class="action-chip text-left p-3 rounded-xl border-2 transition-all
             ${active ? 'border-blue-600 bg-blue-50' : 'border-blue-100 hover:border-blue-300 bg-white'}"
            data-value="${action.id}">
      <div class="text-xl mb-1">${action.icon}</div>
      <div class="text-base font-semibold text-gray-700">${action.label}</div>
      <div class="text-base text-gray-400 mt-0.5 leading-tight">${action.desc}</div>
    </button>`;
  }).join('');

  const actionDetails = modalNeedsSetup()
    ? [
        fg('Priority', priorityRow(modal.data.priority)),
        fg('Preparation deadline', `<input type="date" id="m_deadline" value="${esc(modal.data.deadline || '')}"
          class="border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <span class="text-base text-gray-400 ml-2">Leave blank if none</span>`),
        fg('Reminder', `<div class="flex flex-wrap gap-2 items-center">
          <input type="date" id="m_reminderDate" value="${esc(modal.data.reminderDate || '')}"
            class="border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <input type="time" id="m_reminderTime" value="${esc(modal.data.reminderTime || '')}"
            class="border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
          <span class="text-base text-gray-400">Optional</span>
        </div>`),
      ].join('')
    : modal.data.actionType === 'hold'
      ? [
          fg('Reason for holding', `<textarea id="m_holdReason" rows="3" placeholder="Why should this wait? (optional)"
            class="w-full resize-y rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300">${esc(modal.data.holdReason || '')}</textarea>`),
          fg('Review on', `<input type="date" id="m_reviewOn" value="${esc(modal.data.reviewOn || '')}"
            class="border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <span class="text-base text-gray-400 ml-2">Required</span>`),
        ].join('')
    : modal.data.actionType === 'reject'
      ? fg('Reason for rejecting', `<textarea id="m_rejectionReason" rows="3" placeholder="Why is this not moving forward? (optional)"
          class="w-full resize-y rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300">${esc(modal.data.rejectionReason || '')}</textarea>`)
    : '';

  const inner = [
    '<p class="text-sm text-gray-500">What should happen with this item?</p>',
    `<div class="grid grid-cols-2 gap-2.5">${actionOptions}</div>`,
    actionDetails,
  ].join('');
  $('#step2').html(`<div class="space-y-4">${inner}</div>`);
}

function collectStep2() {
  modal.data.priority = modalNeedsSetup()
    ? $('.pri-chip.bg-blue-600').data('value') || null
    : null;
  modal.data.deadline = modalNeedsSetup() ? $('#m_deadline').val() || null : null;
  modal.data.reminderDate = modalNeedsSetup() ? $('#m_reminderDate').val() || null : null;
  modal.data.reminderTime = modalNeedsSetup() ? $('#m_reminderTime').val() || null : null;
  modal.data.holdReason = modal.data.actionType === 'hold' ? $('#m_holdReason').val().trim() : '';
  modal.data.reviewOn = modal.data.actionType === 'hold' ? $('#m_reviewOn').val() || null : null;
  modal.data.rejectionReason = modal.data.actionType === 'reject' ? $('#m_rejectionReason').val().trim() : '';
}

// ── STEP 3: ACTION SETUP ───────────────────────────────────────
function populateStep3() {
  let inner = '';

  if (modal.data.actionType === 'meeting') {
    inner = [
      fg('Meeting date', `<input type="date" id="m_meetingDate" value="${esc(modal.data.meetingDate || '')}"
        class="border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />`),
      fg('Start time', `<input type="time" id="m_meetingTime" value="${esc(modal.data.meetingTime || '')}"
        class="border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />`),
      fg('Location or meeting link', `<input type="text" id="m_meetingLocation" value="${esc(modal.data.meetingLocation || '')}"
        placeholder="e.g. Google Meet or Client office"
        class="w-full border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />`),
    ].join('');
  } else if (modal.data.actionType === 'search_vendor') {
    inner = fg('Vendor search note', `<textarea id="m_vendorSearchNote" rows="5"
      placeholder="Describe the vendor, capabilities, budget, or other requirements to search for."
      class="w-full resize-y rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-300">${esc(modal.data.vendorSearchNote || '')}</textarea>`);
  }

  $('#step3').html(`<div class="space-y-4">${inner}</div>`);
}

function collectStep3() {
  if (modal.data.actionType === 'meeting') {
    modal.data.meetingDate = $('#m_meetingDate').val() || null;
    modal.data.meetingTime = $('#m_meetingTime').val() || null;
    modal.data.meetingLocation = $('#m_meetingLocation').val().trim();
  } else if (modal.data.actionType === 'search_vendor') {
    modal.data.vendorSearchNote = $('#m_vendorSearchNote').val().trim();
  }
}

// ── SAVE ──────────────────────────────────────────────────────
function buildItem(decision, actionType = modal.data.actionType || null) {
  const needsFollowUp = ['meeting', 'search_vendor'].includes(actionType);
  modal.data.sentence = $('#modalSentence').val().trim() || currentSentences[modal.idx];
  return {
    id:            modal.reviewItemId || modal.data.id || crypto.randomUUID(),
    sentence:      modal.data.sentence,
    client:        modal.data.client        || '',
    campaign:      modal.data.campaign      || '',
    vendor:        modal.data.vendor        || '',
    vendorContact: modal.data.vendorContact || '',
    actionType,
    decision,
    priority:      needsFollowUp ? modal.data.priority || null : null,
    deadline:      needsFollowUp ? modal.data.deadline || null : null,
    meetingDate:     actionType === 'meeting' ? modal.data.meetingDate || null : null,
    meetingTime:     actionType === 'meeting' ? modal.data.meetingTime || null : null,
    meetingLocation: actionType === 'meeting' ? modal.data.meetingLocation || '' : '',
    vendorSearchNote: actionType === 'search_vendor' ? modal.data.vendorSearchNote || '' : '',
    reminderDate: needsFollowUp ? modal.data.reminderDate || null : null,
    reminderTime: needsFollowUp ? modal.data.reminderTime || null : null,
    holdReason: actionType === 'hold' ? modal.data.holdReason || '' : '',
    reviewOn: actionType === 'hold' ? modal.data.reviewOn || null : null,
    rejectionReason: actionType === 'reject' ? modal.data.rejectionReason || '' : '',
    dateAdded:     modal.data.dateAdded     || new Date().toISOString(),
  };
}

function continueToNextSentence() {
  if (Number.isInteger(modal.idx)) {
    const nextIdx = modal.idx + 1;
    if (nextIdx < currentSentences.length) {
      openModal(nextIdx);
      return;
    }
  }
  closeModal();
}

function commitSave() {
  if (modal.step === 3) collectStep3(); else collectStep2();
  const decision = modal.data.actionType === 'hold'
    ? 'held'
    : modal.data.actionType === 'reject'
      ? 'rejected'
      : 'active';
  const item = buildItem(decision);
  upsertItem(item);
  renderTable();
  continueToNextSentence();
}

function skipForNow() {
  if (modal.step === 1) collectStep1();
  if (modal.step === 2) collectStep2();
  if (modal.step === 3) collectStep3();
  upsertItem(buildItem('pending_review', null));
  renderTable();
  continueToNextSentence();
}

// ── TABLE ─────────────────────────────────────────────────────
function renderTable() {
  const items = loadItems();
  const activeItems = items.filter(item => item.decision === 'active');
  const reviewItems = items.filter(item => item.decision === 'pending_review'
    || (item.decision === 'held' && (!item.reviewOn || item.reviewOn <= todayIso())));
  const rejectedItems = items.filter(item => item.decision === 'rejected');

  // Sort: priority desc (5 = highest, null = last), then deadline asc (null = last)
  activeItems.sort((a, b) => {
    const pa = a.priority || 0, pb = b.priority || 0;
    if (pa !== pb) return pb - pa;
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  $('#itemCount').text(`${activeItems.length} item${activeItems.length !== 1 ? 's' : ''}`);

  const ACT = Object.fromEntries(ACTION_TYPES.map(action => [action.id, action.label]));
  const PRI_CLASS = { 5: 'text-red-600 font-bold', 4: 'text-orange-500 font-semibold', 3: 'text-amber-500 font-medium' };

  const rows = activeItems.map(item => {
    const priClass  = PRI_CLASS[item.priority]   || 'text-gray-400';

    return `<tr class="hover:bg-blue-50/40 transition-colors">
      <td class="px-4 py-3 max-w-[180px]">
        <p class="text-base text-gray-700 leading-relaxed line-clamp-2" title="${esc(item.sentence)}">${esc(item.sentence)}</p>
      </td>
      <td class="px-4 py-3 text-base text-gray-700 whitespace-nowrap">${esc(item.client   || '—')}</td>
      <td class="px-4 py-3 text-base text-gray-600 whitespace-nowrap">${esc(item.campaign || '—')}</td>
      <td class="px-4 py-3 text-base text-gray-600 whitespace-nowrap">${esc(ACT[item.actionType] || '—')}</td>
      <td class="px-4 py-3 text-center">
        ${item.priority
          ? `<span class="text-sm ${priClass}">${item.priority}</span>`
          : '<span class="text-gray-300 text-sm">—</span>'}
      </td>
      <td class="px-4 py-3 text-base text-gray-600 whitespace-nowrap">${fmtDate(item.deadline)}</td>
      <td class="px-4 py-3 text-base text-gray-600 whitespace-nowrap">${fmtDateTime(item.reminderDate, item.reminderTime)}</td>
      <td class="px-4 py-3 text-base text-gray-400 whitespace-nowrap">${fmtDate(item.dateAdded)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" class="px-4 py-8 text-center text-sm text-gray-400">No active items right now.</td></tr>`;

  $('#tableBody').html(rows);
  $('#tableSection').toggleClass('hidden', !items.length);

  const reviewRows = reviewItems.map(item => {
    const held = item.decision === 'held';
    const reason = held ? item.holdReason || 'Held item is ready for review' : 'Skipped for later review';
    return `<tr class="hover:bg-blue-50/40 transition-colors">
      <td class="px-4 py-3 max-w-[280px]"><p class="text-base text-gray-700 leading-relaxed line-clamp-2" title="${esc(item.sentence)}">${esc(item.sentence)}</p></td>
      <td class="px-4 py-3 text-base text-gray-600">${esc(reason)}</td>
      <td class="px-4 py-3 text-base text-gray-600 whitespace-nowrap">${held ? fmtDate(item.reviewOn) : '—'}</td>
      <td class="px-4 py-3 text-right"><button class="review-item border border-blue-200 text-blue-700 font-semibold px-3 py-1.5 rounded-lg text-sm hover:bg-blue-50 transition" data-item-id="${esc(item.id)}">Review</button></td>
    </tr>`;
  }).join('');
  $('#reviewCount').text(`${reviewItems.length} item${reviewItems.length !== 1 ? 's' : ''}`);
  $('#reviewTableBody').html(reviewRows);
  $('#reviewSection').toggleClass('hidden', !reviewItems.length);

  const rejectedRows = rejectedItems.map(item => `<tr class="hover:bg-blue-50/40 transition-colors">
    <td class="px-4 py-3 max-w-[280px]"><p class="text-base text-gray-700 leading-relaxed line-clamp-2" title="${esc(item.sentence)}">${esc(item.sentence)}</p></td>
    <td class="px-4 py-3 text-base text-gray-600">${esc(item.rejectionReason || 'No reason given')}</td>
    <td class="px-4 py-3 text-base text-gray-400 whitespace-nowrap">${fmtDate(item.dateAdded)}</td>
    <td class="px-4 py-3 text-right"><button class="restore-item border border-blue-200 text-blue-700 font-semibold px-3 py-1.5 rounded-lg text-sm hover:bg-blue-50 transition" data-item-id="${esc(item.id)}">Restore</button></td>
  </tr>`).join('');
  $('#rejectedCount').text(`${rejectedItems.length} item${rejectedItems.length !== 1 ? 's' : ''}`);
  $('#rejectedTableBody').html(rejectedRows);
  $('#rejectedSection').toggleClass('hidden', !rejectedItems.length);
}

// ── EVENT: Analyze ─────────────────────────────────────────────
$('#analyzeBtn').on('click', function () {
  const text = $('#noteInput').val().trim();
  if (!text) return;
  const sentences = splitSentences(text);
  if (!sentences.length) {
    alert('No sentences detected. Try writing at least one complete sentence.');
    return;
  }
  currentSentences = sentences;
  openModal(0);
});

// ── EVENT: Close modal ─────────────────────────────────────────
$('#closeDecisionModal').on('click', closeModal);
$('#decisionModal').on('click', function (e) {
  if ($(e.target).is('#decisionModal')) closeModal();
});

// ── EVENT: Client select in modal ─────────────────────────────
$(document).on('change', '#m_client', function () {
  const val = $(this).val();
  if (val === '__new__') {
    pendingNewClient = 'modal';
    $('#newClientName, #newClientProject').val('');
    $('#newClientModal').removeClass('hidden');
    return;
  }
  modal.data.client = val;
  $('#m_campaign').html(buildCampaignOptions(val, ''));
});

// ── EVENT: Action selection ───────────────────────────────────
$(document).on('click', '.action-chip', function () {
  collectStep2();
  modal.data.actionType = $(this).data('value');
  populateStep2();
  showStep(2);
});

// ── EVENT: Priority chip ───────────────────────────────────────
$(document).on('click', '.pri-chip', function () {
  $('.pri-chip')
    .removeClass('bg-blue-600 text-white border-blue-600')
    .addClass('border-blue-100 text-blue-400');
  $(this)
    .addClass('bg-blue-600 text-white border-blue-600')
    .removeClass('border-blue-100 text-blue-400');
});

// ── EVENT: Modal Next ─────────────────────────────────────────
$('#modalNextBtn').on('click', function () {
  if (modal.step === 1) {
    collectStep1();
    if (!modal.data.client || modal.data.client === '__new__') {
      alert('Please select a client before proceeding.');
      return;
    }
    populateStep2();
    showStep(2);
  } else if (modal.step === 2) {
    collectStep2();
    if (!modal.data.actionType) {
      alert('Please select an action before proceeding.');
      return;
    }
    if (isTerminalAction()) {
      commitSave();
      return;
    }
    populateStep3();
    showStep(3);
  }
});

// ── EVENT: Modal Back ─────────────────────────────────────────
$('#modalBackBtn').on('click', function () {
  if (modal.step === 2) {
    collectStep2();
    populateStep1();
    showStep(1);
  } else if (modal.step === 3) {
    collectStep3();
    populateStep2();
    showStep(2);
  }
});

// ── EVENT: Modal Save ─────────────────────────────────────────
$('#modalSaveBtn').on('click', function () {
  if (!modal.data.actionType) {
    alert('Please select an action before saving.');
    return;
  }

  if (modal.step === 3) {
    collectStep3();
    if (modal.data.actionType === 'meeting' && !modal.data.meetingDate) {
      alert('Please set the meeting date before saving.');
      return;
    }
    if (modal.data.actionType === 'search_vendor' && !modal.data.vendorSearchNote) {
      alert('Please enter a vendor search note before saving.');
      return;
    }
  }

  if (modal.step === 2) collectStep2();
  if (modal.data.actionType === 'hold' && !modal.data.reviewOn) {
    alert('Please set a review date before holding this item.');
    return;
  }
  if (modal.data.reminderTime && !modal.data.reminderDate) {
    alert('Please set a reminder date when choosing a reminder time.');
    return;
  }

  commitSave();
});

// ── EVENT: Skip / review / restore ────────────────────────────
$('#modalSkipBtn').on('click', skipForNow);

$(document).on('click', '.review-item', function () {
  openReviewModal($(this).data('item-id'));
});

$(document).on('click', '.restore-item', function () {
  const id = $(this).data('item-id');
  const items = loadItems();
  const item = items.find(entry => entry.id === id);
  if (!item) return;
  item.actionType = null;
  item.decision = 'pending_review';
  item.rejectionReason = '';
  upsertItem(item);
  renderTable();
});

// ── EVENT: Reset saved app data ───────────────────────────────
$('#resetBtn').on('click', function () {
  const confirmed = window.confirm('Reset all saved items? This cannot be undone.');
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  renderTable();
});

// ── NEW CLIENT MODAL ──────────────────────────────────────────
$('#cancelNewClient').on('click', function () {
  $('#newClientModal').addClass('hidden');
  if (pendingNewClient === 'modal') $('#m_client').val(modal.data.client || '');
  pendingNewClient = null;
});

$('#confirmNewClient').on('click', function () {
  const name    = $('#newClientName').val().trim();
  const project = $('#newClientProject').val().trim();
  if (!name) { alert('Please enter a client name.'); return; }

  mockData.clients.push({ name, projects: project ? [project, 'General'] : ['General'] });

  if (pendingNewClient === 'modal') {
    $('#m_client').html(buildClientOptions(name)).val(name);
    $('#m_campaign').html(buildCampaignOptions(name, ''));
    modal.data.client = name;
  }

  $('#newClientModal').addClass('hidden');
  pendingNewClient = null;
});

$('#newClientModal').on('click', function (e) {
  if ($(e.target).is('#newClientModal')) $('#cancelNewClient').trigger('click');
});

// Render records saved in a previous browser session.
renderTable();

// ── INIT ──────────────────────────────────────────────────────
$(function () { renderTable(); });
