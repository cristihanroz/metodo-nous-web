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
  // Se carga el reproductor al hacer clic (la página carga más rápido).
  document.querySelectorAll('[data-vimeo-id]').forEach(function (frame) {
    var id = (frame.getAttribute('data-vimeo-id') || '').trim();
    if (!id) return;

    var label = frame.querySelector('[data-video-label]');
    if (label) label.textContent = frame.getAttribute('data-ready-label') || 'Ver video';
    frame.style.cursor = 'pointer';
    frame.setAttribute('role', 'button');
    frame.setAttribute('tabindex', '0');

    function load() {
      if (frame.querySelector('iframe')) return;
      var iframe = document.createElement('iframe');
      iframe.src = 'https://player.vimeo.com/video/' + encodeURIComponent(id) + '?autoplay=1&title=0&byline=0&portrait=0&dnt=1';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.title = frame.getAttribute('aria-label') || 'Video';
      frame.removeAttribute('role');
      frame.removeAttribute('tabindex');
      frame.style.cursor = '';
      frame.appendChild(iframe);
    }
    frame.addEventListener('click', load);
    frame.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); load(); }
    });
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
