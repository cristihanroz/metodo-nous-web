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
  // El reproductor se carga debajo de la miniatura y el toque/clic pasa directo a Vimeo,
  // así el video arranca CON SONIDO también en iPhone (Safari solo permite audio si el
  // toque ocurre dentro del reproductor). Al empezar a reproducir, la miniatura se oculta.
  var vimeoFrames = [];
  document.querySelectorAll('[data-vimeo-id]').forEach(function (frame) {
    var id = (frame.getAttribute('data-vimeo-id') || '').trim();
    if (!id) return;

    var label = frame.querySelector('[data-video-label]');
    if (label) label.textContent = frame.getAttribute('data-ready-label') || 'Ver video';

    var iframe = document.createElement('iframe');
    iframe.src = 'https://player.vimeo.com/video/' + encodeURIComponent(id) + '?title=0&byline=0&portrait=0&playsinline=1&dnt=1';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.title = frame.getAttribute('aria-label') || 'Video';
    frame.insertBefore(iframe, frame.firstChild);
    frame.classList.add('is-armed');
    vimeoFrames.push({ frame: frame, iframe: iframe });
  });

  function markPlaying(frame) { frame.classList.add('is-playing'); }

  if (vimeoFrames.length) {
    // 1) Escucha directa de los mensajes del reproductor de Vimeo (sin depender del SDK)
    function subscribe(v) {
      try {
        ['play', 'playProgress', 'timeupdate'].forEach(function (ev) {
          v.iframe.contentWindow.postMessage(JSON.stringify({ method: 'addEventListener', value: ev }), 'https://player.vimeo.com');
        });
      } catch (err) {}
    }
    vimeoFrames.forEach(function (v) { v.iframe.addEventListener('load', function () { subscribe(v); }); });

    window.addEventListener('message', function (e) {
      if (!/^https:\/\/player\.vimeo\.com$/.test(e.origin)) return;
      var data = e.data;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch (err) { return; } }
      if (!data || !data.event) return;
      vimeoFrames.forEach(function (v) {
        if (e.source !== v.iframe.contentWindow) return;
        if (data.event === 'ready') subscribe(v);
        if (data.event === 'play' || data.event === 'playProgress' || data.event === 'timeupdate' || data.event === 'playing') markPlaying(v.frame);
      });
    });

    // 2) SDK oficial de Vimeo como segunda vía
    var sdk = document.createElement('script');
    sdk.src = 'https://player.vimeo.com/api/player.js';
    sdk.async = true;
    sdk.onload = function () {
      vimeoFrames.forEach(function (v) {
        try {
          var player = new window.Vimeo.Player(v.iframe);
          player.on('play', function () { markPlaying(v.frame); });
          player.on('timeupdate', function () { markPlaying(v.frame); });
        } catch (err) {}
      });
    };
    document.head.appendChild(sdk);

    // 3) Respaldo: si el foco entra al reproductor (clic/toque), ocultar la miniatura
    window.addEventListener('blur', function () {
      setTimeout(function () {
        vimeoFrames.forEach(function (v) {
          if (document.activeElement === v.iframe) markPlaying(v.frame);
        });
      }, 0);
    });
  }

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
