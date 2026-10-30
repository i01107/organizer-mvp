$(function () {
  var KEY = 'notesTriage.items.v1';
  var API_BASE_URL = window.NOTES_TRIAGE_API_BASE_URL || 'https://organizer-mvp-api.onrender.com';
  var mode = 'standard';
  var ACTIONS = {
    meeting:  {label: 'Create meeting',  key: 'M'},
    resource: {label: 'Resource search', key: 'R'},
    hold:     {label: 'Hold',            key: 'H'},
    reject:   {label: 'Reject',          key: 'X'}
  };
  var FIELDS = [['client','Client','text'],['campaign','Campaign','text'],['deadline','Deadline','date'],['reminderDate','Reminder date','date'],['reminderTime','Reminder time','time']];
  var PRIORITIES = ['LOW', 'STANDARD', 'URGENT'];
  var PRIORITY_RANK = {LOW: 1, STANDARD: 2, URGENT: 3};
  var PRIORITY_STYLE = {LOW: 'bg-slate-100 text-slate-700', STANDARD: 'bg-teal-100 text-teal-900', URGENT: 'bg-red-100 text-red-800'};

  var items = load(), queue = [], qi = 0, editId = null, cur = {p: null, a: null};

  function load() {
    try {
      var stored = JSON.parse(localStorage.getItem(KEY)) || [];
      return Array.isArray(stored) ? stored.map(function (item) {
        item.priority = normalizePriority(item.priority);
        (item.history || []).forEach(function (entry) { entry.priority = normalizePriority(entry.priority); });
        return item;
      }) : [];
    } catch (e) { return []; }
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }
  function esc(s) { return $('<div>').text(s == null ? '' : s).html(); }
  function normalizePriority(value) {
    if (typeof value === 'string') value = value.trim().toUpperCase();
    if (PRIORITIES.indexOf(value) >= 0) return value;
    var legacy = Number(value);
    if (legacy >= 1 && legacy <= 2) return 'LOW';
    if (legacy === 3) return 'STANDARD';
    if (legacy >= 4 && legacy <= 5) return 'URGENT';
    return null;
  }
  function fmtD(d) { return new Date(d + 'T00:00').toLocaleDateString(undefined, {day: '2-digit', month: 'short', year: 'numeric'}); }
  function prefill(t) {
    var m = function (re) { var r = t.match(re); return r ? $.trim(r[1]) : ''; };
    var sep = '(?:\\s*[:=]\\s*|\\s+[-\u2013\u2014]\\s+)';
    return {client: m(new RegExp('^\\s*(?:brand|client)' + sep + '(.+)$', 'im')), campaign: m(new RegExp('^\\s*campaign' + sep + '(.+)$', 'im'))};
  }
  function split(t) { return t.split(/^[ \t]*--[ \t]*$/m).map(function (s) { return $.trim(s); }).filter(Boolean); }
  function fmt(ts) { return new Date(ts).toLocaleString(undefined, {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}); }
  function queuedText(entry) { return typeof entry === 'string' ? entry : entry.text; }
  function setMode(next) {
    mode = next;
    $('#standardMode').attr('aria-pressed', String(mode === 'standard'))
      .toggleClass('bg-teal-700 text-white', mode === 'standard')
      .toggleClass('text-slate-600 hover:text-slate-900', mode !== 'standard');
    $('#aiMode').attr('aria-pressed', String(mode === 'ai'))
      .toggleClass('bg-teal-700 text-white', mode === 'ai')
      .toggleClass('text-slate-600 hover:text-slate-900', mode !== 'ai');
    $('#msg').text(mode === 'ai' ? 'AI mode interprets free-form notes and suggests fields for review.' : '');
  }

  /* ---------- input ---------- */
  $('#raw').on('input', function () {
    var n = split($(this).val()).length;
    $('#count').text(n ? n + (n === 1 ? ' note' : ' notes') + ' detected' : '');
    $('#process').prop('disabled', !n);
    $('#msg').text('');
  });
  $('#standardMode').on('click', function () { setMode('standard'); });
  $('#aiMode').on('click', function () { setMode('ai'); });
  $('#process').on('click', async function () {
    var rawNotes = $('#raw').val();
    if (!$.trim(rawNotes)) { $('#msg').text('No notes found. Paste some text first.'); return; }
    qi = 0; editId = null;
    if (mode === 'standard') {
      queue = split(rawNotes);
      if (!queue.length) { $('#msg').text('No notes found. Paste some text first.'); return; }
      show(queue[0]);
      return;
    }

    var $button = $('#process').prop('disabled', true);
    $('#processSpinner').removeClass('hidden');
    $('#processCaption').text('Analyzing…');
    $('#msg').text('Sending notes for AI analysis…');
    try {
      var response = await fetch(API_BASE_URL + '/api/triage', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({notes: rawNotes})
      });
      var payload = await response.json().catch(function () { return {}; });
      console.log(payload);
      if (!response.ok) throw new Error(payload.error || 'Could not analyze these notes.');
      if (!Array.isArray(payload.items) || !payload.items.length) {
        $('#msg').text('The AI could not find any items to review in these notes.');
        return;
      }
      queue = payload.items.filter(function (item) { return item && item.sentence; }).map(function (item) {
        var action = item.actionType === 'search_vendor' ? 'resource' : item.actionType;
        return {
          text: item.sentence,
          sourceText: item.noteGroupText || rawNotes,
          priority: item.priority,
          action: ACTIONS[action] ? action : null,
          rationale: item.rationale || '',
          fields: {
            client: item.client || '',
            campaign: item.campaign || '',
            deadline: item.deadline || '',
            reminderDate: item.reminderDate || '',
            reminderTime: item.reminderTime || '',
            vendor: item.vendor || '',
            vendorContact: item.vendorContact || '',
            noteGroupText: item.noteGroupText || rawNotes,
            meetingDate: item.meetingDate || '',
            meetingTime: item.meetingTime || '',
            meetingLocation: item.meetingLocation || '',
            vendorSearchNote: item.vendorSearchNote || ''
          }
        };
      });
      if (!queue.length) { $('#msg').text('The AI response did not contain any reviewable items.'); return; }
      $('#msg').text('AI suggestions loaded. Review each item before saving.');
      show(queue[0]);
    } catch (error) {
      $('#msg').text(error.message || 'Could not reach the AI server. Check that it is running and try again.');
    } finally {
      $button.prop('disabled', !split($('#raw').val()).length);
      $('#processSpinner').addClass('hidden');
      $('#processCaption').text('Process notes');
    }
  });

  var NOTICE_ICONS = {
    success: '<svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="m8 12.5 2.8 2.8L16 9.5"/></svg>',
    danger: '<svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3.5 2.5 20h19L12 3.5ZM12 10v4.5m0 2.5h.01"/></svg>'
  };
  function wakeNotice(kind, message) {
    $('#wakeNotice')
      .attr('class', 'mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm ' +
        (kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'))
      .html(NOTICE_ICONS[kind] + '<span>' + esc(message) + '</span>');
  }
  $('#wake').on('click', async function () {
    var $button = $(this).prop('disabled', true);
    $('#wakeNotice').addClass('hidden').removeClass('flex');
    $('#wakeDots').removeClass('hidden');
    var controller = new AbortController();
    // Render free instances can take a minute or more to wake from sleep.
    var timer = setTimeout(function () { controller.abort(); }, 120000);
    try {
      var response = await fetch(API_BASE_URL + '/', {method: 'GET', signal: controller.signal});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      wakeNotice('success', 'AI Server activated, you can use the AI mode');
    } catch (error) {
      wakeNotice('danger', 'AI Server failed to get activated');
    } finally {
      clearTimeout(timer);
      $('#wakeDots').addClass('hidden');
      $button.prop('disabled', false);
    }
  });

  $('#reset').on('click', function () {
    if (!window.confirm('Delete all saved notes and decisions from this browser? This cannot be undone.')) return;
    localStorage.removeItem(KEY);
    items = [];
    render();
    localStorage.removeItem(KEY);
    $('#msg').text('All saved records have been deleted.');
  });

  /* ---------- modal ---------- */
  function show(entry, existing) {
    var text = typeof entry === 'string' ? entry : entry.text;
    var suggestion = typeof entry === 'string' ? null : entry;
    var values = existing || suggestion;
    cur = {
      p: values ? normalizePriority(values.priority) : null,
      a: values ? values.action : null,
      suggestedP: suggestion ? normalizePriority(suggestion.priority) : null
    };
    $('#mtitle').text(editId ? 'Change decision' : 'Note ' + (qi + 1) + ' of ' + queue.length);
    $('#bar').css('width', (editId ? 100 : (qi / queue.length) * 100) + '%');
    $('#ntext').text(text); $('#err').text('');
    $('#rationale').text(suggestion && suggestion.rationale ? 'AI suggestion: ' + suggestion.rationale : '').toggleClass('hidden', !(suggestion && suggestion.rationale));
    $('#priHint').text(cur.suggestedP ? 'AI suggested: ' + cur.suggestedP : '').toggleClass('hidden', !cur.suggestedP);
    var source = suggestion && suggestion.sourceText;
    $('#sourceText').text(source || '');
    $('#sourceNote').toggleClass('hidden', !source || source === text);
    var $p = $('#pri').empty();
    $.each(PRIORITIES, function (_, priority) {
      $p.append('<button type="button" aria-pressed="false" data-p="' + priority + '" class="pb rounded-md border px-3 py-2 text-sm font-semibold">' + priority + '</button>');
    });
    var $a = $('#act').empty();
    $.each(ACTIONS, function (k, v) { $a.append('<button type="button" data-a="' + k + '" class="ab rounded-md border px-3 py-2 text-left text-sm">' + v.label + ' <span class="float-right text-slate-400">' + v.key + '</span></button>'); });
    paint(); fields(values && values.fields ? values.fields : prefill(text));
    $('#modal').removeClass('hidden').addClass('flex');
  }
  function paint() {
    $('.pb').each(function () {
      var p = $(this).data('p'), on = cur.p === p;
      $(this).attr('aria-pressed', String(on)).attr('class', 'pb rounded-md border px-3 py-2 text-sm font-semibold ' + (on ? PRIORITY_STYLE[p] + ' border-transparent ring-2 ring-slate-900' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'));
    });
    $('.ab').each(function () {
      var on = cur.a === $(this).data('a');
      $(this).attr('class', 'ab rounded-md border px-3 py-2 text-left text-sm ' + (on ? 'border-teal-700 bg-teal-50 font-medium text-teal-900 ring-1 ring-teal-700' : 'border-slate-300 bg-white hover:bg-slate-50'));
    });
  }
  function fields(vals) {
    vals = vals || {};
    if (vals.reminder && !vals.reminderDate) {
      vals = $.extend({}, vals, {
        reminderDate: vals.reminder.slice(0, 10),
        reminderTime: vals.reminder.slice(11, 16)
      });
    }
    var $f = $('#fields').empty();
    $.each(FIELDS, function (_, f) {
      var v = vals[f[0]] || '', ctl;
      if (f[2].indexOf('select:') === 0) {
        ctl = '<select data-k="' + f[0] + '" class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">' +
          f[2].slice(7).split(',').map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
      } else {
        ctl = '<input data-k="' + f[0] + '" type="' + f[2] + '"' + (f[0] === 'client' || f[0] === 'campaign' ? ' list="dl-' + f[0] + '"' : '') + ' value="' + esc(v).replace(/"/g, '&quot;') + '" class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">';
      }
      $f.append('<label class="block text-sm"><span class="mb-1 block text-slate-600">' + f[1] + '</span>' + ctl + '</label>');
    });
  }
  function pickP(p) { cur.p = p; paint(); }
  function pickA(a) { var old = collect(); cur.a = a; paint(); fields(old); }
  function collect() { var o = {}; $('#fields [data-k]').each(function () { o[$(this).data('k')] = $.trim($(this).val()); }); return o; }
  $('#pri').on('click', '.pb', function () { pickP($(this).data('p')); });
  $('#act').on('click', '.ab', function () { pickA($(this).data('a')); });

  function close() { $('#modal').addClass('hidden').removeClass('flex'); }
  function askAboutNotes() { $('#confirmModal').removeClass('hidden').addClass('flex'); $('#keepNotes').trigger('focus'); }
  function closeConfirm() { $('#confirmModal').addClass('hidden').removeClass('flex'); }
  function stop() {
    var wasEditing = !!editId;
    editId = null; close(); render();
    if (!wasEditing) askAboutNotes();
  }
  $('#keepNotes').on('click', closeConfirm);
  $('#deleteNotes').on('click', function () { $('#raw').val('').trigger('input'); closeConfirm(); });
  function saveDecision() {
    if (!cur.p) { $('#err').text('Choose a priority level.'); return; }
    if (!cur.a) { $('#err').text('Choose an action.'); return; }
    var now = Date.now(), f = collect();
    if (editId) {
      var it = items.filter(function (x) { return x.id === editId; })[0];
      it.history = (it.history || []).concat([{at: it.decidedAt, priority: it.priority, action: it.action}]);
      it.priority = cur.p; it.action = cur.a; it.fields = f; it.decidedAt = now;
      editId = null; close(); render(); return;
    }
    items.unshift({id: now + '-' + Math.random().toString(36).slice(2, 7), text: queuedText(queue[qi]), sourceText: queue[qi].sourceText || '', priority: cur.p, action: cur.a, fields: f, addedAt: now, decidedAt: now, history: []});
    persist(); qi++;
    if (qi >= queue.length) { close(); render(); askAboutNotes(); }
    else { persist(); show(queue[qi]); }
  }
  $('#save').on('click', function () { saveDecision(); if (!$('#modal').hasClass('flex')) persist(); });
  $('#stop').on('click', stop);
  $(document).on('keydown', function (e) {
    if ($('#confirmModal').hasClass('flex')) { if (e.key === 'Escape') closeConfirm(); return; }
    if (!$('#modal').hasClass('flex')) return;
    if (e.key === 'Escape') { stop(); return; }
    var tag = e.target.tagName;
    if (e.key === 'Enter' && tag !== 'TEXTAREA') { e.preventDefault(); saveDecision(); persist(); return; }
    if (tag === 'INPUT' || tag === 'SELECT' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[1-3]$/.test(e.key)) pickP(PRIORITIES[Number(e.key) - 1]);
    var k = e.key.toUpperCase();
    $.each(ACTIONS, function (a, v) { if (v.key === k) pickA(a); });
  });

  /* ---------- table ---------- */
  $('#fa').html('<option value="">All actions</option>' + $.map(ACTIONS, function (v, k) { return '<option value="' + k + '">' + v.label + '</option>'; }).join(''));
  $('#fp').html('<option value="">All priorities</option>' + PRIORITIES.map(function (p) { return '<option value="' + p + '">' + p + '</option>'; }).join(''));
  $('#q, #fa, #fp, #fs').on('input change', render);

  function render() {
    var q = $.trim($('#q').val()).toLowerCase(), fa = $('#fa').val(), fp = $('#fp').val();
    var list = items.filter(function (it) {
      if (fa && it.action !== fa) return false;
      if (fp && normalizePriority(it.priority) !== fp) return false;
      return !q || (it.text + ' ' + $.map(it.fields, function (v) { return v; }).join(' ')).toLowerCase().indexOf(q) > -1;
    });
    var so = $('#fs').val();
    if (so === 'due') list.sort(function (a, b) { var x = a.fields.deadline || '9999', y = b.fields.deadline || '9999'; return x < y ? -1 : x > y ? 1 : 0; });
    if (so === 'pri') list.sort(function (a, b) { return (PRIORITY_RANK[normalizePriority(b.priority)] || 0) - (PRIORITY_RANK[normalizePriority(a.priority)] || 0) || b.decidedAt - a.decidedAt; });
    var $r = $('#rows').empty();
    $.each(list, function (_, it) {
      var f = it.fields || {}, dash = '<span class="text-slate-300">&mdash;</span>';
      $r.append('<tr class="align-top hover:bg-slate-50">' +
        '<td class="max-w-xs px-4 py-3"><button class="tg text-left text-slate-700" title="Show or hide full note"><span class="clamp">' + esc(it.text) + '</span></button></td>' +
        '<td class="px-4 py-3">' + (esc(f.client) || dash) + '</td>' +
        '<td class="px-4 py-3">' + (esc(f.campaign) || dash) + '</td>' +
        '<td class="px-4 py-3 font-medium">' + ACTIONS[it.action].label + '</td>' +
        '<td class="px-4 py-3"><span class="inline-flex rounded px-2.5 py-1 text-xs font-semibold ' + (PRIORITY_STYLE[normalizePriority(it.priority)] || 'bg-slate-100 text-slate-500') + '">' + (normalizePriority(it.priority) || '—') + '</span></td>' +
        '<td class="px-4 py-3">' + (f.deadline ? fmtD(f.deadline) : dash) + '</td>' +
        '<td class="px-4 py-3">' + (f.reminderDate ? fmtD(f.reminderDate) + (f.reminderTime ? ' ' + esc(f.reminderTime) : '') : (f.reminder ? fmt(f.reminder) : dash)) + '</td>' +
        '<td class="px-4 py-3 text-slate-500">' + fmt(it.addedAt || it.decidedAt) + '</td>' +
        '<td class="px-4 py-3 text-right"><button data-id="' + it.id + '" class="ed text-teal-700 hover:underline">Change</button> <button data-id="' + it.id + '" class="dl ml-2 text-slate-400 hover:text-red-600">Delete</button></td></tr>');
    });
    $('#empty').toggleClass('hidden', list.length > 0).text(items.length ? 'No decisions match these filters.' : 'No decisions yet. Paste your notes above and select Process notes.');
    $.each(['client', 'campaign'], function (_, k) {
      var seen = {};
      $('#dl-' + k).html($.map(items, function (i) { var v = (i.fields || {})[k]; if (!v || seen[v]) return null; seen[v] = 1; return '<option value="' + esc(v).replace(/"/g, '&quot;') + '">'; }).join(''));
    });
    var hold = items.filter(function (i) { return i.action === 'hold'; }).length;
    $('#stats').text(items.length + ' decisions' + (hold ? ' · ' + hold + ' on hold' : ''));
    persist();
  }
  $('#rows').on('click', '.tg span', function () { $(this).toggleClass('expanded'); });
  $('#rows').on('click', '.ed', function () {
    var id = $(this).data('id'), it = items.filter(function (x) { return x.id === id; })[0];
    editId = id; show(it.text, it);
  });
  $('#rows').on('click', '.dl', function () {
    if (!confirm('Delete this decision? The note text will be removed too.')) return;
    var id = $(this).data('id'); items = items.filter(function (x) { return x.id !== id; }); render();
  });

  render();
});
