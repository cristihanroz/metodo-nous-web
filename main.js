/* MÉTODO NOUS — interacciones compartidas */
(function () {
  document.documentElement.classList.remove('no-js');

  // Nav con fondo al hacer scroll
  var nav = document.querySelector('.nav');
  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Animaciones de entrada
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Videos de Vimeo: basta con poner el ID en data-vimeo-id.
  // Se muestra la miniatura 2 s y luego el video arranca solo, EN SILENCIO (los navegadores
  // no permiten arrancar con sonido sin un toque). Encima aparece "Toca para activar el sonido":
  // al tocarlo, el video vuelve al inicio y sigue con sonido.
  var AUTOPLAY_DELAY = 2000;
  var sdkPromise = null;
  function loadVimeoSDK() {
    if (window.Vimeo && window.Vimeo.Player) return Promise.resolve(window.Vimeo);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://player.vimeo.com/api/player.js';
      s.async = true;
      s.onload = function () { resolve(window.Vimeo); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return sdkPromise;
  }

  var soundIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';

  document.querySelectorAll('[data-vimeo-id]').forEach(function (frame) {
    var id = (frame.getAttribute('data-vimeo-id') || '').trim();
    if (!id) return;

    var base = 'https://player.vimeo.com/video/' + encodeURIComponent(id) + '?title=0&byline=0&portrait=0&playsinline=1&dnt=1';
    var label = frame.querySelector('[data-video-label]');
    if (label) label.textContent = 'El video comienza en un momento…';
    loadVimeoSDK().catch(function () {});

    setTimeout(function () {
      var iframe = document.createElement('iframe');
      iframe.src = base + '&autoplay=1&muted=1';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.title = frame.getAttribute('aria-label') || 'Video';
      Array.prototype.slice.call(frame.children).forEach(function (c) { frame.removeChild(c); });
      frame.appendChild(iframe);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'unmute-btn';
      btn.innerHTML = soundIcon + '<span>Toca para activar el sonido</span>';
      frame.appendChild(btn);

      var player = null;
      loadVimeoSDK().then(function (Vimeo) { player = new Vimeo.Player(iframe); }).catch(function () {});

      btn.addEventListener('click', function () {
        btn.remove();
        if (player) {
          player.setMuted(false).catch(function () {});
          player.setVolume(1).catch(function () {});
          player.setCurrentTime(0).catch(function () {});
          player.play().catch(function () {});
        } else {
          // Sin SDK: recargar el video desde el inicio con sonido
          iframe.src = base + '&autoplay=1';
        }
      });
    }, AUTOPLAY_DELAY);
  });

  // Imágenes de casos de éxito que aún no existen: se ocultan y queda el placeholder
  document.querySelectorAll('.caso-media img').forEach(function (img) {
    function hide() { img.style.visibility = 'hidden'; }
    if (img.complete && img.naturalWidth === 0) hide();
    img.addEventListener('error', hide);
  });

  // CTA fijo en móvil: visible tras el hero y oculto al llegar a la agenda
  var sticky = document.querySelector('.sticky-cta');
  var hero = document.querySelector('.hero');
  var booking = document.getElementById('agenda-section');
  if (sticky && hero && booking && 'IntersectionObserver' in window) {
    var heroVisible = true;
    var bookingVisible = false;
    function update() { sticky.classList.toggle('is-visible', !heroVisible && !bookingVisible); }
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }).observe(hero);
    new IntersectionObserver(function (e) { bookingVisible = e[0].isIntersecting; update(); }).observe(booking);
  }
})();
