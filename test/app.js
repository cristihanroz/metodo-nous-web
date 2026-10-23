/* Test "¿Estás listo para un déficit calórico?" — interfaz (una pregunta por pantalla). */
(function () {
  'use strict';

  var S = window.NousScoring;
  var CFG = window.NOUS_TEST_CONFIG || {};
  var Q = S.QUESTIONS;
  var STORE_KEY = 'nous-test-v1';
  var app = document.getElementById('app');

  var ICON = {
    back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    alert: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>'
  };

  // ---------- estado (se guarda en la pestaña por si recarga) ----------
  var state = load() || { step: 'intro', answers: {}, contact: {}, utm: readUtm() };

  function load() {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }
  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function readUtm() {
    var out = {};
    try {
      var q = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 't'].forEach(function (k) {
        if (q.get(k)) out[k] = q.get(k).slice(0, 200);
      });
    } catch (e) {}
    return out;
  }

  // ---------- helpers de DOM ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k]; // solo para íconos estáticos
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }

  function screen(nodes, opts) {
    app.innerHTML = '';
    var wrap = el('section', { class: 'quiz-screen' + (opts && opts.wide ? ' is-wide' : '') }, nodes);
    app.appendChild(wrap);
    window.scrollTo(0, 0);
    var focus = wrap.querySelector('[data-focus]');
    if (focus) focus.focus({ preventScroll: true });
  }

  function go(step) {
    state.step = step;
    save();
    render();
  }

  function fmt(n) { return S.formatInt(n); }

  // ---------- pantallas ----------
  function renderIntro() {
    screen([
      el('img', { class: 'quiz-mark', src: '/assets/nous-carnero.png', alt: '', 'aria-hidden': 'true', width: 600, height: 374 }),
      el('span', { class: 'eyebrow', text: 'Test gratuito · 3 minutos' }),
      el('h1', { class: 'quiz-title', tabindex: '-1', 'data-focus': true, text: '¿Estás listo para un déficit calórico?' }),
      el('p', { class: 'quiz-lead', text: 'Responde 24 preguntas y descubre cuántas calorías necesitas para bajar grasa sin rebotar, según tu cuerpo, tu rutina y tus hábitos.' }),
      el('ul', { class: 'quiz-points' }, [
        el('li', { html: ICON.check + '<span>Tu número de calorías y proteína</span>' }),
        el('li', { html: ICON.check + '<span>Cuánto podrías bajar en 90 días</span>' }),
        el('li', { html: ICON.check + '<span>Qué te está frenando hoy</span>' })
      ]),
      el('button', { class: 'btn-cta quiz-start', type: 'button', html: 'Empezar el test ' + ICON.arrow, onclick: function () { go(0); } }),
      el('p', { class: 'quiz-note', text: 'Solo para hombres mayores de 18 años.' })
    ]);
  }

  function renderUnderage() {
    screen([
      el('h1', { class: 'quiz-title', tabindex: '-1', 'data-focus': true, text: 'Este test es solo para mayores de 18 años' }),
      el('p', { class: 'quiz-lead', text: 'Gracias por tu interés. No guardamos ninguna de tus respuestas.' }),
      el('button', { class: 'btn-ghost', type: 'button', text: 'Volver al inicio', onclick: restart })
    ]);
  }

  function header(i) {
    var q = Q[i];
    var pct = Math.round((i / Q.length) * 100);
    return el('div', { class: 'quiz-head' }, [
      el('div', { class: 'quiz-head-row' }, [
        el('button', { class: 'quiz-back', type: 'button', 'aria-label': 'Pregunta anterior', html: ICON.back,
          onclick: function () { go(i === 0 ? 'intro' : i - 1); } }),
        el('span', { class: 'quiz-block', text: 'Bloque ' + q.block + ' de 5 · ' + S.BLOCKS[q.block] }),
        el('span', { class: 'quiz-count', text: (i + 1) + '/' + Q.length })
      ]),
      el('div', { class: 'quiz-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': Q.length, 'aria-valuenow': i }, [
        el('span', { style: 'width:' + pct + '%' })
      ])
    ]);
  }

  function next(i) {
    go(i + 1 < Q.length ? i + 1 : 'contact');
  }

  function renderQuestion(i) {
    var q = Q[i];
    var body;
    if (q.type === 'single') body = singleBody(q, i);
    else if (q.type === 'multi') body = multiBody(q, i);
    else if (q.type === 'scale') body = scaleBody(q, i);
    else body = numberBody(q, i);

    screen([
      header(i),
      el('h2', { class: 'quiz-q', tabindex: '-1', 'data-focus': true, text: q.text }),
      q.hint ? el('p', { class: 'quiz-hint', text: q.hint }) : null,
      body
    ]);
  }

  function singleBody(q, i) {
    var current = state.answers[q.id];
    return el('div', { class: 'quiz-options', role: 'list' }, q.options.map(function (o) {
      return el('button', {
        class: 'quiz-option' + (current === o.id ? ' is-selected' : ''), type: 'button', role: 'listitem',
        'aria-pressed': current === o.id ? 'true' : 'false',
        onclick: function (e) {
          state.answers[q.id] = o.id;
          save();
          Array.prototype.forEach.call(e.currentTarget.parentNode.children, function (b) { b.classList.remove('is-selected'); });
          e.currentTarget.classList.add('is-selected');
          setTimeout(function () { next(i); }, 220);
        }
      }, [el('span', { class: 'quiz-radio', 'aria-hidden': 'true' }), el('span', { text: o.label })]);
    }));
  }

  function multiBody(q, i) {
    var selected = (state.answers[q.id] || []).slice();
    var btn = el('button', { class: 'btn-cta quiz-continue', type: 'button', html: 'Continuar ' + ICON.arrow, disabled: selected.length === 0,
      onclick: function () { state.answers[q.id] = selected; save(); next(i); } });
    var list = el('div', { class: 'quiz-options' }, q.options.map(function (o) {
      return el('button', {
        class: 'quiz-option is-multi' + (selected.indexOf(o.id) > -1 ? ' is-selected' : ''), type: 'button', 'data-id': o.id,
        'aria-pressed': selected.indexOf(o.id) > -1 ? 'true' : 'false',
        onclick: function () {
          var at = selected.indexOf(o.id);
          if (at > -1) selected.splice(at, 1);
          else if (q.exclusive && o.id === q.exclusive) selected = [o.id];
          else {
            if (q.exclusive) selected = selected.filter(function (x) { return x !== q.exclusive; });
            selected.push(o.id);
          }
          Array.prototype.forEach.call(list.children, function (b) {
            var on = selected.indexOf(b.getAttribute('data-id')) > -1;
            b.classList.toggle('is-selected', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          btn.disabled = selected.length === 0;
        }
      }, [el('span', { class: 'quiz-check', 'aria-hidden': 'true', html: ICON.check }), el('span', { text: o.label })]);
    }));
    return el('div', {}, [list, btn]);
  }

  function scaleBody(q, i) {
    var current = state.answers[q.id];
    var nums = [];
    for (var n = q.min; n <= q.max; n++) nums.push(n);
    return el('div', {}, [
      el('div', { class: 'quiz-scale' }, nums.map(function (n) {
        return el('button', {
          class: 'quiz-scale-btn' + (current === n ? ' is-selected' : ''), type: 'button', text: String(n),
          'aria-pressed': current === n ? 'true' : 'false',
          onclick: function (e) {
            state.answers[q.id] = n;
            save();
            e.currentTarget.classList.add('is-selected');
            setTimeout(function () { next(i); }, 220);
          }
        });
      })),
      el('div', { class: 'quiz-scale-legend' }, [el('span', { text: 'Nada importante' }), el('span', { text: 'Lo más importante' })])
    ]);
  }

  function numberBody(q, i) {
    var isWeight = q.type === 'weight';
    var stored = state.answers[q.id];
    var unit = isWeight ? ((stored && stored.unit) || state.weightUnit || 'kg') : q.unit;
    var value = isWeight ? (stored && stored.value) : stored;

    var error = el('p', { class: 'quiz-error', role: 'alert' });
    var input = el('input', {
      class: 'quiz-input', type: 'number', inputmode: isWeight ? 'decimal' : 'numeric', step: isWeight ? '0.1' : '1',
      id: 'quiz-' + q.id, 'aria-label': q.text, placeholder: isWeight ? (unit === 'kg' ? 'Ej.: 85' : 'Ej.: 190') : (q.id === 'p1' ? 'Ej.: 40' : 'Ej.: 175'),
      value: value != null ? value : ''
    });
    var unitLabel = el('span', { class: 'quiz-unit', text: unit });

    function limits() {
      if (!isWeight) return [q.min, q.max];
      return unit === 'kg' ? [40, 250] : [88, 550];
    }

    function submit() {
      var raw = String(input.value).replace(',', '.').trim();
      var n = Number(raw);
      error.textContent = '';
      if (!raw || !isFinite(n)) { error.textContent = 'Escribe un número.'; input.focus(); return; }
      if (q.id === 'p1' && S.isUnderage(n)) { state.answers = {}; go('underage'); return; }
      var lim = limits();
      if (n < lim[0] || n > lim[1]) {
        error.textContent = 'Revisa el dato: debe estar entre ' + lim[0] + ' y ' + lim[1] + ' ' + unit + '.';
        input.focus();
        return;
      }
      state.answers[q.id] = isWeight ? { value: n, unit: unit } : (q.id === 'p1' ? Math.floor(n) : n);
      save();
      next(i);
    }

    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

    var children = [
      el('div', { class: 'quiz-input-wrap' }, [input, unitLabel])
    ];
    if (isWeight) {
      var toggle = el('div', { class: 'quiz-units', role: 'group', 'aria-label': 'Unidad de peso' }, ['kg', 'lb'].map(function (u) {
        return el('button', { type: 'button', class: 'quiz-unit-btn' + (u === unit ? ' is-selected' : ''), text: u === 'kg' ? 'Kilos' : 'Libras',
          'aria-pressed': u === unit ? 'true' : 'false',
          onclick: function () {
            unit = u; state.weightUnit = u; save();
            unitLabel.textContent = u;
            input.placeholder = u === 'kg' ? 'Ej.: 85' : 'Ej.: 190';
            Array.prototype.forEach.call(toggle.children, function (b) {
              var on = b.textContent === (u === 'kg' ? 'Kilos' : 'Libras');
              b.classList.toggle('is-selected', on);
              b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
          } });
      }));
      children.unshift(toggle);
    }
    children.push(error);
    children.push(el('button', { class: 'btn-cta quiz-continue', type: 'button', html: 'Continuar ' + ICON.arrow, onclick: submit }));
    setTimeout(function () { input.focus(); }, 50);
    return el('div', { class: 'quiz-number' }, children);
  }

  function renderContact() {
    var c = state.contact || {};
    var error = el('p', { class: 'quiz-error', role: 'alert' });
    var name = el('input', { class: 'quiz-field', id: 'c-name', name: 'name', autocomplete: 'given-name', required: true, value: c.name || '' });
    var phone = el('input', { class: 'quiz-field', id: 'c-phone', name: 'phone', type: 'tel', autocomplete: 'tel', inputmode: 'tel', placeholder: '+593 99 123 4567', required: true, value: c.phone || '' });
    var email = el('input', { class: 'quiz-field', id: 'c-email', name: 'email', type: 'email', autocomplete: 'email', inputmode: 'email', placeholder: 'tu@correo.com', required: true, value: c.email || '' });
    var consent = el('input', { type: 'checkbox', id: 'c-consent', name: 'consent', required: true, checked: !!c.consent });
    var submitBtn = el('button', { class: 'btn-cta quiz-continue', type: 'submit', html: 'Ver mi resultado ' + ICON.arrow });

    var form = el('form', { class: 'quiz-form', novalidate: true }, [
      field('c-name', 'Nombre', name),
      field('c-phone', 'WhatsApp (con código de país)', phone),
      field('c-email', 'Correo electrónico', email),
      el('label', { class: 'quiz-consent', for: 'c-consent' }, [
        consent,
        el('span', {}, [
          'Acepto que Cristihan Roz guarde mis respuestas y me contacte por WhatsApp con mi resultado. ',
          el('a', { href: CFG.privacyUrl || '#', target: '_blank', rel: 'noopener', text: 'Política de privacidad' })
        ])
      ]),
      error,
      submitBtn
    ]);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      error.textContent = '';
      var data = {
        name: name.value.trim().slice(0, 80),
        phone: phone.value.trim().slice(0, 25),
        email: email.value.trim().slice(0, 120),
        consent: consent.checked
      };
      var digits = data.phone.replace(/\D/g, '');
      if (!data.name) return fail('Escribe tu nombre.', name);
      if (!/^\+/.test(data.phone) || digits.length < 8 || digits.length > 15) return fail('Escribe tu WhatsApp con el código de país, por ejemplo +593 99 123 4567.', phone);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return fail('Revisa tu correo electrónico.', email);
      if (!data.consent) return fail('Para ver tu resultado necesitamos tu autorización.', consent);

      state.contact = data;
      save();
      submitBtn.disabled = true;
      sendResult().then(function () { go('result'); });
    });

    function fail(msg, input) { error.textContent = msg; input.focus(); }

    screen([
      el('div', { class: 'quiz-head' }, [
        el('div', { class: 'quiz-head-row' }, [
          el('button', { class: 'quiz-back', type: 'button', 'aria-label': 'Pregunta anterior', html: ICON.back, onclick: function () { go(Q.length - 1); } }),
          el('span', { class: 'quiz-block', text: 'Último paso' })
        ]),
        el('div', { class: 'quiz-progress' }, [el('span', { style: 'width:100%' })])
      ]),
      el('span', { class: 'eyebrow', text: 'Tu resultado está listo' }),
      el('h2', { class: 'quiz-q', tabindex: '-1', 'data-focus': true, text: '¿A dónde te enviamos tu plan?' }),
      el('p', { class: 'quiz-hint', text: 'Ves tu resultado al instante y te lo enviamos por WhatsApp.' }),
      form
    ]);
  }

  function field(id, label, input) {
    return el('div', { class: 'quiz-field-wrap' }, [el('label', { for: id, text: label }), input]);
  }

  // Siguiente fase: enviar a la función serverless (que recalcula todo y guarda en Kommo).
  function sendResult() {
    if (!CFG.submitUrl) return Promise.resolve();
    return fetch(CFG.submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: state.answers, contact: state.contact, utm: state.utm })
    }).catch(function () {});
  }

  function waLink(text) {
    var num = String(CFG.whatsappNumber || '').replace(/\D/g, '');
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
  }

  function renderResult() {
    var r;
    try { r = S.computeResult(state.answers); } catch (e) { go(0); return; }
    if (r.underage) { go('underage'); return; }

    var name = (state.contact && state.contact.name || '').split(' ')[0];
    var nodes = [
      el('span', { class: 'eyebrow', text: (name ? name + ', este es tu resultado' : 'Tu resultado') }),
      el('h1', { class: 'quiz-title result-title', tabindex: '-1', 'data-focus': true, text: r.title })
    ];

    if (r.profile === 'profesional') {
      nodes.push(el('p', { class: 'quiz-lead', text: 'Por lo que nos contaste, antes de hacer un déficit lo más responsable es que te acompañe un profesional de la salud especializado en conducta alimentaria. Tu bienestar está por encima de cualquier número.' }));
    } else {
      if (r.medicalAlert) {
        nodes.push(el('div', { class: 'result-alert', role: 'note', html: ICON.alert + '<span>Por tu condición, revisa este número con tu médico antes de empezar.</span>' }));
      }
      nodes.push(el('div', { class: 'result-grid' }, [
        stat('Calorías para bajar grasa', fmt(r.calories), 'kcal al día', true),
        stat('Mantenimiento', fmt(r.maintenance), 'kcal al día'),
        stat('Proteína', fmt(r.protein), 'g al día'),
        stat('En 90 días', '−' + String(r.kg90).replace('.', ','), 'kg aprox.')
      ]));
      nodes.push(el('p', { class: 'result-note', text: 'Estimación basada en tus respuestas. Tu número exacto se ajusta según cómo responda tu cuerpo las primeras semanas.' }));
    }

    if (r.brakes.length) {
      nodes.push(el('div', { class: 'result-brakes' }, [
        el('h3', { text: 'Lo que hoy te puede frenar' }),
        el('ul', {}, r.brakes.map(function (b) { return el('li', { text: b }); }))
      ]));
    }

    nodes.push(cta(r));
    nodes.push(el('button', { class: 'quiz-restart', type: 'button', text: 'Hacer el test de nuevo', onclick: restart }));
    screen(nodes, { wide: true });
  }

  function stat(label, value, unit, main) {
    return el('div', { class: 'result-stat' + (main ? ' is-main' : '') }, [
      el('span', { class: 'result-stat-label', text: label }),
      el('strong', { text: value }),
      el('span', { class: 'result-stat-unit', text: unit })
    ]);
  }

  function cta(r) {
    var c = state.contact || {};
    var box = el('div', { class: 'result-cta' });
    if (r.profile === 'profesional') {
      // Con TCA no se empuja a una llamada de venta: solo un contacto opcional.
      box.appendChild(el('p', { text: 'Si quieres, escríbenos y te orientamos sobre los siguientes pasos.' }));
      box.appendChild(el('a', { class: 'btn-cta', href: waLink('Hola Cristihan, hice el test.'), target: '_blank', rel: 'noopener', html: 'Escríbenos por WhatsApp ' + ICON.arrow }));
    } else if (r.level === 'A') {
      var url = CFG.calendlyUrl + (CFG.calendlyUrl.indexOf('?') > -1 ? '&' : '?') +
        'name=' + encodeURIComponent(c.name || '') + '&email=' + encodeURIComponent(c.email || '') +
        (state.utm.t ? '&utm_content=' + encodeURIComponent(state.utm.t) : '');
      box.appendChild(el('p', { text: 'Tu perfil encaja con el acompañamiento 1:1. Revisemos tu caso juntos y armemos tu plan.' }));
      box.appendChild(el('a', { class: 'btn-cta', href: url, target: '_blank', rel: 'noopener', html: 'Agenda tu llamada de diagnóstico gratis ' + ICON.arrow }));
    } else if (r.level === 'B') {
      var msg = r.calories ? 'Hola Cristihan, hice el test. Mi resultado: ' + fmt(r.calories) + ' kcal' : 'Hola Cristihan, hice el test.';
      box.appendChild(el('p', { text: 'Escríbenos y te enviamos tu plan para empezar con este número.' }));
      box.appendChild(el('a', { class: 'btn-cta', href: waLink(msg), target: '_blank', rel: 'noopener', html: 'Recibe tu plan por WhatsApp ' + ICON.arrow }));
    } else {
      box.appendChild(el('p', { text: 'Escríbenos y te enviamos una guía gratis para empezar.' }));
      box.appendChild(el('a', { class: 'btn-cta', href: waLink('Hola Cristihan, hice el test y quiero la guía gratis.'), target: '_blank', rel: 'noopener', html: 'Recibe tu guía gratis por WhatsApp ' + ICON.arrow }));
      if (CFG.storeUrl) box.appendChild(el('a', { class: 'result-store', href: CFG.storeUrl, target: '_blank', rel: 'noopener', text: 'Ver la tienda de suplementos' }));
    }
    return box;
  }

  function restart() {
    state = { step: 'intro', answers: {}, contact: state.contact || {}, utm: state.utm || readUtm() };
    save();
    render();
  }

  function render() {
    var s = state.step;
    if (s === 'intro') renderIntro();
    else if (s === 'underage') renderUnderage();
    else if (s === 'contact') renderContact();
    else if (s === 'result') renderResult();
    else if (typeof s === 'number' && Q[s]) renderQuestion(s);
    else go('intro');
  }

  render();
})();
