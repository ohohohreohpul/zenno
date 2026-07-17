/**
 * Zenno web chat widget. Embed on any site:
 *   <script src="https://<your-app>/widget.js" data-key="wc_..." async></script>
 * Appearance is configured in Zenno (Settings → Channels → Web Chat) and
 * fetched at load; data-title / data-color attributes act as fallbacks.
 */
;(function () {
  'use strict'

  var script = document.currentScript
  if (!script) return
  var KEY = script.getAttribute('data-key')
  if (!KEY) return
  var HOST = new URL(script.src).origin
  var POLL_MS = 2500

  var FALLBACK = {
    accentColor: script.getAttribute('data-color') || '#18181B',
    title: script.getAttribute('data-title') || 'Chat with us',
    subtitle: 'Typically replies in seconds',
    greeting: '',
    position: 'right',
  }

  var visitor = localStorage.getItem('zenno_visitor')
  if (!visitor) {
    visitor = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('zenno_visitor', visitor)
  }

  var lastAt = null
  var open = false
  var pollTimer = null
  var seen = {}
  var greeted = false
  var hasHistory = false
  // Texts rendered optimistically on send — their server copies are skipped once.
  var pendingLocal = []

  fetch(HOST + '/api/webchat?config=1&key=' + encodeURIComponent(KEY))
    .then(function (r) { return r.ok ? r.json() : null })
    .then(function (body) { init((body && body.data) || FALLBACK) })
    .catch(function () { init(FALLBACK) })

  function init(cfg) {
    var COLOR = /^#[0-9a-fA-F]{6}$/.test(cfg.accentColor || '') ? cfg.accentColor : FALLBACK.accentColor
    var SIDE = cfg.position === 'left' ? 'left' : 'right'

    /* ---------- DOM ---------- */

    var css =
      '.zn-bubble{position:fixed;bottom:20px;' + SIDE + ':20px;width:56px;height:56px;border-radius:50%;background:' + COLOR + ';color:#fff;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;z-index:999999;transition:transform .15s}' +
      '.zn-bubble:hover{transform:scale(1.06)}' +
      '.zn-panel{position:fixed;bottom:88px;' + SIDE + ':20px;width:340px;max-width:calc(100vw - 32px);height:480px;max-height:calc(100vh - 120px);background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.24);display:none;flex-direction:column;overflow:hidden;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
      '.zn-panel.zn-open{display:flex}' +
      '.zn-head{background:' + COLOR + ';color:#fff;padding:14px 16px;font-size:14px;font-weight:600}' +
      '.zn-head small{display:block;font-weight:400;font-size:11px;opacity:.75;margin-top:2px}' +
      '.zn-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#FAFAFA}' +
      '.zn-msg{max-width:82%;padding:9px 12px;border-radius:12px;font-size:13px;line-height:1.45;white-space:pre-wrap;word-break:break-word}' +
      '.zn-msg.zn-in{align-self:flex-end;background:' + COLOR + ';color:#fff;border-bottom-right-radius:4px}' +
      '.zn-msg.zn-out{align-self:flex-start;background:#fff;border:1px solid #E4E4E7;color:#18181B;border-bottom-left-radius:4px}' +
      '.zn-typing{align-self:flex-start;font-size:11px;color:#A1A1AA;padding:2px 4px}' +
      '.zn-form{display:flex;border-top:1px solid #E4E4E7;background:#fff}' +
      '.zn-input{flex:1;border:none;outline:none;padding:12px 14px;font-size:13px;font-family:inherit}' +
      '.zn-send{border:none;background:none;color:' + COLOR + ';font-weight:600;font-size:13px;padding:0 16px;cursor:pointer}'

    var style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)

    var bubble = document.createElement('button')
    bubble.className = 'zn-bubble'
    bubble.setAttribute('aria-label', 'Open chat')
    bubble.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'

    var panel = document.createElement('div')
    panel.className = 'zn-panel'
    panel.innerHTML =
      '<div class="zn-head">' + esc(cfg.title || FALLBACK.title) + (cfg.subtitle ? '<small>' + esc(cfg.subtitle) + '</small>' : '') + '</div>' +
      '<div class="zn-msgs" role="log" aria-live="polite"></div>' +
      '<form class="zn-form"><input class="zn-input" type="text" placeholder="Type a message…" maxlength="2000" aria-label="Message"/><button class="zn-send" type="submit">Send</button></form>'

    document.body.appendChild(bubble)
    document.body.appendChild(panel)

    var msgsEl = panel.querySelector('.zn-msgs')
    var formEl = panel.querySelector('.zn-form')
    var inputEl = panel.querySelector('.zn-input')

    bubble.addEventListener('click', function () {
      open = !open
      panel.classList.toggle('zn-open', open)
      if (open) {
        inputEl.focus()
        fetchMessages().then(maybeGreet)
        pollTimer = setInterval(fetchMessages, POLL_MS)
      } else if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    })

    formEl.addEventListener('submit', function (e) {
      e.preventDefault()
      var text = inputEl.value.trim()
      if (!text) return
      inputEl.value = ''
      pendingLocal.push(text)
      render({ id: 'local-' + Date.now(), direction: 'inbound', text: text })
      showTyping(true)
      fetch(HOST + '/api/webchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: KEY, visitor: visitor, text: text }),
      })
        .then(function () { return fetchMessages() })
        .catch(function () { showTyping(false) })
    })

    /* ---------- data ---------- */

    function fetchMessages() {
      var url = HOST + '/api/webchat?key=' + encodeURIComponent(KEY) + '&visitor=' + encodeURIComponent(visitor)
      if (lastAt) url += '&after=' + encodeURIComponent(lastAt)
      return fetch(url)
        .then(function (r) { return r.json() })
        .then(function (body) {
          var list = (body && body.data) || []
          if (list.length > 0) hasHistory = true
          for (var i = 0; i < list.length; i++) {
            var m = list[i]
            if (m.at) lastAt = m.at
            if (m.direction === 'outbound') showTyping(false)
            if (m.direction === 'inbound') {
              var idx = pendingLocal.indexOf(m.text)
              if (idx !== -1) {
                pendingLocal.splice(idx, 1)
                if (m.id) seen[m.id] = true
                continue
              }
            }
            render(m)
          }
        })
        .catch(function () {})
    }

    // Show the configured greeting once, only for visitors with no history.
    function maybeGreet() {
      if (greeted || hasHistory || !cfg.greeting) return
      greeted = true
      render({ id: 'greeting', direction: 'outbound', text: cfg.greeting })
    }

    /* ---------- rendering ---------- */

    function render(m) {
      if (m.id && seen[m.id]) return
      if (m.id) seen[m.id] = true
      var el = document.createElement('div')
      el.className = 'zn-msg ' + (m.direction === 'inbound' ? 'zn-in' : 'zn-out')
      el.textContent = m.text
      msgsEl.appendChild(el)
      msgsEl.scrollTop = msgsEl.scrollHeight
    }

    var typingEl = null
    function showTyping(on) {
      if (on && !typingEl) {
        typingEl = document.createElement('div')
        typingEl.className = 'zn-typing'
        typingEl.textContent = 'typing…'
        msgsEl.appendChild(typingEl)
        msgsEl.scrollTop = msgsEl.scrollHeight
      } else if (!on && typingEl) {
        typingEl.remove()
        typingEl = null
      }
    }
  }

  function esc(s) {
    var d = document.createElement('div')
    d.textContent = s
    return d.innerHTML
  }
})()
