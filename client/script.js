// ── CONSTANTS ─────────────────────────────────────────────────
const STORAGE_KEY = 'organizer_items';

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
let modal = { idx: null, step: 1, data: {} };

// ── STORAGE ───────────────────────────────────────────────────
function normalizeItem(item) {
  return {
    id:            item.id || crypto.randomUUID(),
    sentence:      item.sentence || '',
    client:        item.client || '',
    campaign:      item.campaign || '',
    vendor:        item.vendor || '',
    vendorContact: item.vendorContact || '',
    actionType:    item.actionType || null,
    priority:      item.priority || null,
    deadline:      item.deadline || null,
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

function closeModal() {
  $('#decisionModal').addClass('hidden');
  modal = { idx: null, step: 1, data: {} };
}

function showStep(n) {
  modal.step = n;
  $('#step1, #step2').addClass('hidden');
  $(`#step${n}`).removeClass('hidden');

  const labels = { 1: 'Context', 2: 'Action details' };
  $('#stepLabel').text(`Step ${n} of 2 — ${labels[n]}`);

  // Animate step dots: white = reached, semi-transparent = future
  $('.step-dot').each(function () {
    const s = +$(this).data('step');
    $(this).css('background-color', s <= n ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.3)');
  });

  $('#modalBackBtn').toggleClass('hidden', n === 1);
  $('#modalNextBtn').toggleClass('hidden', n === 2);
  $('#modalSaveBtn').toggleClass('hidden', n !== 2);
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

// ── STEP 2: ACTION DETAILS ─────────────────────────────────────
function fg(label, content) {
  return `<div class="space-y-1.5">
    <label class="text-base font-semibold text-gray-500 uppercase tracking-wide">${label}</label>
    <div>${content}</div>
  </div>`;
}

function optChips(groupId, options, selVal) {
  const btns = options.map(o => {
    const active = o.v === selVal;
    return `<button type="button" class="opt-chip px-3 py-1.5 rounded-lg border-2 text-base font-semibold transition-all
             ${active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-blue-100 text-gray-600 hover:border-blue-300'}"
            data-group="${groupId}" data-value="${o.v}">${o.l}</button>`;
  }).join('');
  return `<div class="flex flex-wrap gap-2" id="${groupId}">${btns}</div>`;
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
  const inner = [
    fg('Action', optChips('g_action', [
      {v:'message',l:'💬 Message'}, {v:'meeting',l:'📅 Meeting'},
      {v:'document',l:'📄 Document'}, {v:'payment',l:'💳 Payment'}, {v:'other',l:'⚙️ Other'},
    ], modal.data.actionType)),
    fg('Priority', priorityRow(modal.data.priority)),
    fg('Deadline', `<input type="date" id="m_deadline" value="${esc(modal.data.deadline || '')}"
      class="border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
      <span class="text-base text-gray-400 ml-2">Leave blank if none</span>`),
  ].join('');
  $('#step2').html(`<div class="space-y-4">${inner}</div>`);
}

function collectStep2() {
  modal.data.actionType = $('#g_action .opt-chip.border-blue-600').data('value') || null;
  modal.data.priority   = $('.pri-chip.bg-blue-600').data('value') || null;
  modal.data.deadline   = $('#m_deadline').val() || null;
}

// ── SAVE ──────────────────────────────────────────────────────
function commitSave() {
  collectStep2();
  modal.data.sentence = $('#modalSentence').val().trim() || currentSentences[modal.idx];
  const item = {
    id:            modal.data.id            || crypto.randomUUID(),
    sentence:      modal.data.sentence,
    client:        modal.data.client        || '',
    campaign:      modal.data.campaign      || '',
    vendor:        modal.data.vendor        || '',
    vendorContact: modal.data.vendorContact || '',
    actionType:    modal.data.actionType    || null,
    priority:      modal.data.priority      || null,
    deadline:      modal.data.deadline      || null,
    dateAdded:     modal.data.dateAdded     || new Date().toISOString(),
  };
  upsertItem(item);
  renderTable();

  const nextIdx = modal.idx + 1;
  if (nextIdx < currentSentences.length) {
    openModal(nextIdx);
  } else {
    closeModal();
  }
}

// ── TABLE ─────────────────────────────────────────────────────
function renderTable() {
  const items = loadItems();
  if (!items.length) { $('#tableSection').addClass('hidden'); return; }

  // Sort: priority desc (5 = highest, null = last), then deadline asc (null = last)
  items.sort((a, b) => {
    const pa = a.priority || 0, pb = b.priority || 0;
    if (pa !== pb) return pb - pa;
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  $('#itemCount').text(`${items.length} item${items.length !== 1 ? 's' : ''}`);

  const ACT = { message: 'Message', meeting: 'Meeting', document: 'Document', payment: 'Payment', other: 'Other' };
  const PRI_CLASS = { 5: 'text-red-600 font-bold', 4: 'text-orange-500 font-semibold', 3: 'text-amber-500 font-medium' };

  const rows = items.map(item => {
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
      <td class="px-4 py-3 text-base text-gray-400 whitespace-nowrap">${fmtDate(item.dateAdded)}</td>
    </tr>`;
  }).join('');

  $('#tableBody').html(rows);
  $('#tableSection').removeClass('hidden');
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

// ── EVENT: Option chip (action group) ─────────────────────────
$(document).on('click', '.opt-chip', function () {
  const g = $(this).data('group');
  $(`[data-group="${g}"]`)
    .removeClass('border-blue-600 bg-blue-50 text-blue-700')
    .addClass('border-blue-100 text-gray-600');
  $(this)
    .addClass('border-blue-600 bg-blue-50 text-blue-700')
    .removeClass('border-blue-100 text-gray-600');
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
  }
});

// ── EVENT: Modal Back ─────────────────────────────────────────
$('#modalBackBtn').on('click', function () {
  if (modal.step === 2) {
    collectStep2();
    populateStep1();
    showStep(1);
  }
});

// ── EVENT: Modal Save ─────────────────────────────────────────
$('#modalSaveBtn').on('click', commitSave);

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
