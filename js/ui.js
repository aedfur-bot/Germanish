// Tiny DOM helpers. No framework: views are functions that render into an element.

/** h('div.card#x', {onclick, attrs...}, ...children) */
export function h(tag, props, ...children) {
  if (props == null || typeof props !== 'object' || props instanceof Node || Array.isArray(props)) {
    children.unshift(props);
    props = {};
  }
  const [, name = 'div', rest = ''] = tag.match(/^([a-z0-9-]*)(.*)$/i);
  const el = document.createElement(name || 'div');
  for (const part of rest.match(/[.#][^.#]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1));
    else el.id = part.slice(1);
  }
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className += ' ' + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function mount(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Very small markdown subset: headings, bullet lists, bold, italic, paragraphs, tables, [[case:…]] colouring.
export function md(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  let html = '', list = false, table = null;
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/(^|\W)_(.+?)_(?=\W|$)/g, '$1<em>$2</em>')
    .replace(/\[\[(nom|akk|dat|gen):(.+?)\]\]/g, '<span class="c-$1">$2</span>');
  const flush = () => {
    if (list) { html += '</ul>'; list = false; }
    if (table) {
      const [head, , ...body] = table;
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      html += '<div class="table-wrap"><table class="tbl"><thead><tr>' + cells(head).map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>'
        + body.map((r) => '<tr>' + cells(r).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
      table = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*\|/.test(line)) { if (list) { html += '</ul>'; list = false; } (table ||= []).push(line.trim()); continue; }
    if (table) flush();
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)/))) { flush(); const lv = Math.min(3, m[1].length + 1); html += `<h${lv}>${inline(m[2])}</h${lv}>`; }
    else if ((m = line.match(/^\s*[-*]\s+(.*)/))) { if (!list) { html += '<ul>'; list = true; } html += `<li>${inline(m[1])}</li>`; }
    else if (!line.trim()) flush();
    else { flush(); html += `<p>${inline(line)}</p>`; }
  }
  flush();
  return html;
}

let toastTimer;
export function toast(msg, ms = 2400) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/** Show a modal; `build(close)` returns its content. Resolves with whatever close() is given. */
export function modal(build) {
  return new Promise((resolve) => {
    const bg = h('div.modal-bg');
    const close = (v) => { bg.remove(); resolve(v); };
    bg.addEventListener('click', (e) => { if (e.target === bg) close(null); });
    bg.append(h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, build(close)));
    document.body.append(bg);
  });
}

export function confirmBox(message, okLabel = 'OK') {
  return modal((close) => [
    h('p', message),
    h('div.row', { style: { justifyContent: 'flex-end', marginTop: '12px' } },
      h('button.btn', { onclick: () => close(false) }, 'Cancel'),
      h('button.btn.primary', { onclick: () => close(true) }, okLabel)),
  ]);
}

export function tasksDots(done, total) {
  return h('span.tasks', { title: `${done}/${total}` },
    Array.from({ length: total }, (_, i) => h('i', { class: i < done ? 'on' : '' })));
}

export function spinner() { return h('span.spinner', { 'aria-label': 'Loading' }); }

export function segmented(options, value, onChange) {
  const wrap = h('div.seg-ctl', { role: 'group' });
  for (const [val, label] of options) {
    wrap.append(h('button', { class: val === value ? 'on' : '', type: 'button', onclick: () => onChange(val) }, label));
  }
  return wrap;
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
