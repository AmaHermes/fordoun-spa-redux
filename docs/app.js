// Fordoun Spa booking — pure vanilla JS, no framework.
// State: which treatments selected, date/time prefs, contact details.
// Output: well-formed WhatsApp message to the spa.

const STATE = {
  data: null,
  selected: new Map(),   // id → treatment
  activeCategory: null,
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ──────────────── Boot ────────────────

(async function init() {
  try {
    const res = await fetch('treatments.json', { cache: 'no-cache' });
    STATE.data = await res.json();
  } catch (e) {
    console.error('Failed to load menu', e);
    $('#catContent').innerHTML = '<p>Sorry, we couldn\'t load the menu. Please reload.</p>';
    return;
  }
  renderCategories();
  renderPolicies();
  renderEmailLink();
  setupListeners();
  prefillDate();
})();

function prefillDate() {
  // default to two weekdays from now (spas like advance notice)
  const d = new Date();
  d.setDate(d.getDate() + 2);
  // skip Sundays
  while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  $('#prefDate').value = d.toISOString().split('T')[0];
  $('#prefDate').min = new Date().toISOString().split('T')[0];
}

// ──────────────── Categories ────────────────

function renderCategories() {
  const tabs = $('#catTabs');
  tabs.innerHTML = '';
  STATE.data.categories.forEach((cat, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-tab' + (i === 0 ? ' active' : '');
    btn.textContent = cat.name;
    btn.dataset.cat = cat.id;
    btn.addEventListener('click', () => switchCategory(cat.id));
    tabs.appendChild(btn);
  });
  STATE.activeCategory = STATE.data.categories[0].id;
  renderCategoryContent(STATE.activeCategory);
}

function switchCategory(id) {
  STATE.activeCategory = id;
  $$('.cat-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === id));
  renderCategoryContent(id);
}

function renderCategoryContent(id) {
  const cat = STATE.data.categories.find(c => c.id === id);
  if (!cat) return;
  const content = $('#catContent');
  content.innerHTML = '';
  if (cat.blurb) {
    const blurb = document.createElement('p');
    blurb.className = 'cat-blurb';
    blurb.textContent = cat.blurb;
    content.appendChild(blurb);
  }
  const list = document.createElement('div');
  list.className = 'treatments';
  cat.treatments.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'treatment' + (STATE.selected.has(t.id) ? ' selected' : '');
    btn.dataset.tid = t.id;
    btn.innerHTML = `
      <div class="treatment-main">
        <h3 class="treatment-name">${escapeHtml(t.name)}</h3>
        ${t.desc ? `<p class="treatment-desc">${escapeHtml(t.desc)}</p>` : ''}
      </div>
      <div class="treatment-meta">
        <span class="treatment-price">R${t.price.toLocaleString('en-ZA')}</span>
        <span class="treatment-duration">${t.duration} min</span>
        <span class="treatment-tick" aria-hidden="true">✓</span>
      </div>`;
    btn.addEventListener('click', () => toggleTreatment(t));
    list.appendChild(btn);
  });
  content.appendChild(list);
}

function toggleTreatment(t) {
  if (STATE.selected.has(t.id)) STATE.selected.delete(t.id);
  else STATE.selected.set(t.id, t);
  renderCategoryContent(STATE.activeCategory);
  renderSummary();
}

// ──────────────── Summary ────────────────

function renderSummary() {
  const box = $('#summaryContent');
  const sendBtn = $('#sendBtn');
  const sendLbl = $('.send-btn-label');
  const cart = $('#floatCart');

  if (STATE.selected.size === 0) {
    box.innerHTML = '';
    $('#summary').hidden = true;
    sendBtn.disabled = true;
    sendLbl.textContent = 'Choose a treatment to continue';
    cart.hidden = true;
    return;
  }
  $('#summary').hidden = false;

  let total = 0;
  let mins = 0;
  let rows = '';
  STATE.selected.forEach(t => {
    total += t.price;
    mins += t.duration;
    rows += `
      <div class="summary-row">
        <div>
          <div class="summary-row-name">${escapeHtml(t.name)}</div>
          <div class="summary-row-meta">${t.duration} min</div>
        </div>
        <div style="display:flex;align-items:center;">
          <span class="summary-row-price">R${t.price.toLocaleString('en-ZA')}</span>
          <button class="summary-remove" type="button" data-rid="${t.id}" aria-label="Remove">×</button>
        </div>
      </div>`;
  });
  box.innerHTML = rows + `
    <div class="summary-total">
      <div>
        <div>Estimated total</div>
        <div class="summary-total-note">${formatMinutes(mins)} of treatment</div>
      </div>
      <div>R${total.toLocaleString('en-ZA')}</div>
    </div>`;

  box.querySelectorAll('.summary-remove').forEach(b => {
    b.addEventListener('click', () => {
      STATE.selected.delete(b.dataset.rid);
      renderCategoryContent(STATE.activeCategory);
      renderSummary();
    });
  });

  sendBtn.disabled = false;
  sendLbl.textContent = 'Send booking request via WhatsApp';
  cart.hidden = false;
  $('.float-cart-count').textContent = STATE.selected.size;
}

function formatMinutes(m) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

// ──────────────── Policies & misc ────────────────

function renderPolicies() {
  const ul = $('#policyList');
  ul.innerHTML = '';
  STATE.data.policies.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p;
    ul.appendChild(li);
  });
}

function renderEmailLink() {
  $('#emailLink').href = `mailto:${STATE.data.contact.email}?subject=${encodeURIComponent('Spa booking enquiry')}`;
}

// ──────────────── WhatsApp send ────────────────

function setupListeners() {
  $('#sendBtn').addEventListener('click', sendBooking);
  $('#floatCart').addEventListener('click', () => {
    $('#summary').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function sendBooking() {
  if (STATE.selected.size === 0) return;
  const name = $('#yourName').value.trim();
  const phone = $('#yourPhone').value.trim();
  const date = $('#prefDate').value;
  const time = $('#prefTime').value;
  const guests = $('#prefGuests').value;
  const notes = $('#yourNotes').value.trim();

  let total = 0;
  let mins = 0;
  const lines = ['Hi Fordoun Spa, I\'d like to book the following treatments:'];
  lines.push('');
  STATE.selected.forEach(t => {
    lines.push(`• ${t.name} (${t.duration} min) — R${t.price.toLocaleString('en-ZA')}`);
    total += t.price;
    mins += t.duration;
  });
  lines.push('');
  lines.push(`Estimated total: R${total.toLocaleString('en-ZA')} (${formatMinutes(mins)} of treatment)`);
  lines.push('');
  lines.push(`Preferred date: ${formatDate(date)}`);
  lines.push(`Preferred time: ${time}`);
  lines.push(`Number of guests: ${guests}`);
  if (name)  lines.push(`Name: ${name}`);
  if (phone) lines.push(`Contact: ${phone}`);
  if (notes) {
    lines.push('');
    lines.push(`Notes: ${notes}`);
  }
  lines.push('');
  lines.push('Please confirm availability — thank you!');

  const msg = lines.join('\n');
  const num = STATE.data.contact.whatsapp_raw;
  const url = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;

  // Track for the demo — drop into localStorage so Razz can show "request log"
  try {
    const log = JSON.parse(localStorage.getItem('fordoun.requests') || '[]');
    log.push({ ts: new Date().toISOString(), name, phone, total, mins, count: STATE.selected.size });
    localStorage.setItem('fordoun.requests', JSON.stringify(log.slice(-20)));
  } catch {}

  window.open(url, '_blank', 'noopener');
}

function formatDate(iso) {
  if (!iso) return 'Flexible';
  const d = new Date(iso + 'T00:00:00');
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return `${day} ${d.getDate()} ${month} ${d.getFullYear()}`;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
