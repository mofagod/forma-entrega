const FORM_CONTENT_SELECTOR = '.field, .form-row-contact, button[type="submit"], .form-reassurance';

// Admite formato visual y prefijo internacional; comprueba 7–15 dígitos.
// No verifica que el número exista o tenga una cuenta de WhatsApp.
function isValidPhone(value) {
  const text = value.trim();
  if (!text) return true;
  if (!/^\+?[0-9\s()-]+$/.test(text)) return false;
  let balance = 0;
  for (const char of text) {
    if (char === '(') balance++;
    if (char === ')' && --balance < 0) return false;
  }
  if (balance !== 0) return false;
  const digits = text.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

// ============================================
// 1. NAV — Sombra dinámica al hacer scroll
// ============================================
function setupNavScroll() {
  const header = document.getElementById('header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ============================================
// 2. REVEAL & STAGGER — IntersectionObserver
// ============================================
function setupReveal() {
  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
  );

  document.documentElement.classList.add('motion-enabled');

  // Al imprimir o exportar a PDF el observer no dispara: se fuerza el estado final.
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('.reveal, .stagger-item').forEach((el) => el.classList.add('visible'));
  });

  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  const staggerContainers = document.querySelectorAll('.stagger');
  staggerContainers.forEach((container) => {
    const items = container.querySelectorAll('.stagger-item');
    items.forEach((item, i) => {
      item.style.transitionDelay = `${i * 0.1}s`;
      io.observe(item);
    });
  });
}

// ============================================
// 3. FORMULARIO — Validación y simulación
// ============================================
function setupForm() {
  const form = document.getElementById('leadForm');
  if (!form) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const fields = {
    name: {
      el: document.getElementById('name'),
      err: document.getElementById('name-error'),
      validate: (v) => v.trim().length >= 2 || 'Por favor, ingresa tu nombre.',
    },
    email: {
      el: document.getElementById('email'),
      err: document.getElementById('email-error'),
      validate: (v) => {
        const val = v.trim();
        if (!val) return 'El correo electrónico es obligatorio.';
        return emailRegex.test(val) || 'Ingresa un correo electrónico válido (ejemplo: nombre@dominio.com).';
      },
    },
    phone: {
      el: document.getElementById('phone'),
      err: document.getElementById('phone-error'),
      validate: (v) => isValidPhone(v) || 'Ingresa un número de contacto válido o déjalo vacío.',
    },
    service: {
      el: document.getElementById('service'),
      err: document.getElementById('service-error'),
      validate: (v) => v !== '' || 'Selecciona el servicio que más te interesa.',
    },
    privacy: {
      el: document.getElementById('privacy'),
      err: document.getElementById('privacy-error'),
      validate: (_, el) => el.checked || 'Debes aceptar la política de privacidad para continuar.',
    },
  };

  function clearError(field) {
    field.el.classList.remove('invalid');
    if (field.err) field.err.textContent = '';
    field.el.removeAttribute('aria-invalid');
  }

  function showError(field, msg) {
    field.el.classList.add('invalid');
    if (field.err) field.err.textContent = msg;
    field.el.setAttribute('aria-invalid', 'true');
  }

  function validateField(key) {
    const f = fields[key];
    if (!f || !f.el) return true;
    const value = key === 'privacy' ? f.el.checked : f.el.value;
    const result = f.validate(value, f.el);
    if (result === true) {
      clearError(f);
      return true;
    }
    showError(f, result);
    return false;
  }

  // Validar al salir de cada campo o al escribir si ya tenía error
  Object.keys(fields).forEach((key) => {
    const f = fields[key];
    if (!f || !f.el) return;

    f.el.addEventListener('blur', () => {
      if (key !== 'privacy' || f.el.checked) validateField(key);
    });

    const eventName = f.el.type === 'checkbox' || f.el.tagName === 'SELECT' ? 'change' : 'input';
    f.el.addEventListener(eventName, () => {
      if (f.el.getAttribute('aria-invalid') === 'true' || f.el.classList.contains('invalid')) {
        validateField(key);
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const keys = Object.keys(fields);
    const results = keys.map((k) => validateField(k));
    const firstInvalidKey = keys.find((k, i) => !results[i]);

    if (firstInvalidKey) {
      fields[firstInvalidKey].el.focus();
      return;
    }

    // Preparar mensaje de éxito personalizado
    const nameVal = fields.name.el.value.trim();
    const serviceSelect = fields.service.el;
    const serviceText = serviceSelect.options[serviceSelect.selectedIndex]?.text || 'tu servicio de interés';

    const successMsg = document.getElementById('successMessage');
    if (successMsg) {
      successMsg.textContent = `¡Gracias, ${nameVal}! Completaste la prueba del formulario para "${serviceText}". No se envió ninguna solicitud y no recibirás una confirmación de reserva.`;
    }

    // Ocultar campos y mostrar contenedor de éxito
    const success = document.getElementById('form-success');
    form.querySelectorAll(FORM_CONTENT_SELECTOR).forEach((el) => {
      el.style.display = 'none';
    });

    form.reset();
    Object.keys(fields).forEach((k) => clearError(fields[k]));

    if (success) {
      success.hidden = false;
      success.focus?.();
    }
  });
}

function setupFormReset() {
  const resetBtn = document.getElementById('formReset');
  const form = document.getElementById('leadForm');
  const success = document.getElementById('form-success');
  if (!resetBtn || !form || !success) return;

  resetBtn.addEventListener('click', () => {
    form.reset();
    form.querySelectorAll(FORM_CONTENT_SELECTOR).forEach((el) => {
      el.style.removeProperty('display');
    });
    success.hidden = true;
    document.getElementById('name')?.focus();
  });
}

// ============================================
// 4. MENÚ MÓVIL — Diálogo con foco contenido
// ============================================
function setupMobileMenu() {
  const openBtn = document.getElementById('burger');
  const closeBtn = document.getElementById('menuClose');
  const menu = document.getElementById('mobileMenu');
  if (!openBtn || !closeBtn || !menu) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let closeTimer;
  let previousOverflow = '';
  let destination = null;
  function finishClose() {
    clearTimeout(closeTimer);
    menu.classList.remove('is-open');
    if (menu.open) menu.close();
  }
  function closeMenu(target = null) {
    destination = target;
    menu.classList.remove('is-open');
    if (reduced.matches) finishClose();
    else closeTimer = setTimeout(finishClose, 180);
  }
  openBtn.addEventListener('click', () => {
    if (menu.open) return;
    clearTimeout(closeTimer);
    destination = null;
    previousOverflow = document.body.style.overflow;
    menu.showModal();
    document.body.style.overflow = 'hidden';
    openBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => { if (menu.open) menu.classList.add('is-open'); });
    closeBtn.focus();
  });
  closeBtn.addEventListener('click', () => closeMenu());
  menu.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  menu.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    openBtn.setAttribute('aria-expanded', 'false');
    const target = destination || (window.innerWidth < 768 ? openBtn : document.querySelector('#header .logo'));
    if (target) {
      const temporary = !target.hasAttribute('tabindex') && !target.matches('a, button, input, select');
      if (temporary) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll:true });
      if (temporary) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once:true });
    }
    destination = null;
  });
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      const target = link.hash ? document.getElementById(link.hash.slice(1)) : document.getElementById('contenido');
      closeMenu(target);
    });
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && menu.open) { destination = null; finishClose(); }
  });
  const trigger = document.getElementById('accordionTrigger');
  const content = document.getElementById('menuSubServices');
  trigger?.addEventListener('click', () => {
    const expanded = trigger.getAttribute('aria-expanded') !== 'true';
    trigger.setAttribute('aria-expanded', String(expanded));
    document.getElementById('menuAccordion').classList.toggle('is-open', expanded);
    content.inert = !expanded;
  });
}

// ============================================
// 5. HERO — Animación editorial de palabras
// ============================================
function setupHeroWordSplit() {
  const title = document.querySelector('.hero-title');
  if (!title || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  title.parentElement?.classList.remove('reveal');
  title.setAttribute('aria-label', title.innerText.replace(/\s+/g, ' ').trim());
  let index = 0;

  function split(parent) {
    [...parent.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part.trim()) {
            fragment.append(document.createTextNode(part));
            return;
          }
          const word = document.createElement('span');
          word.className = 'word';
          word.textContent = part;
          word.setAttribute('aria-hidden', 'true');
          word.style.animationDelay = `${0.2 + index++ * 0.04}s`;
          fragment.append(word);
        });
        node.replaceWith(fragment);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        split(node);
      }
    });
  }
  split(title);
}

// ============================================
// 6. CARRUSEL AUTOMÁTICO CON CONTROLES MANUALES
// ============================================
function setupStoriesCarousel() {
  const grid = document.querySelector('#historias .grid-2');
  if (!grid || grid.dataset.carouselInitialized === 'true') return;
  const slides = [...grid.querySelectorAll('.testimonial')];
  if (slides.length < 2) return;
  grid.dataset.carouselInitialized = 'true';
  grid.classList.remove('stagger');
  grid.classList.add('stories-carousel');
  grid.id = 'storiesCarousel';
  grid.setAttribute('role', 'region');
  grid.setAttribute('aria-roledescription', 'carrusel');
  grid.setAttribute('aria-label', 'Historias ilustrativas');
  slides.forEach((slide, i) => {
    slide.classList.remove('stagger-item');
    slide.classList.toggle('is-current', i === 0);
    slide.setAttribute('aria-hidden', String(i !== 0));
    slide.inert = i !== 0;
  });
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  const previous = document.createElement('button');
  const next = document.createElement('button');
  previous.type = next.type = 'button';
  previous.textContent = '←'; next.textContent = '→';
  previous.setAttribute('aria-label', 'Historia anterior');
  next.setAttribute('aria-label', 'Historia siguiente');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  status.textContent = `Historia 1 de ${slides.length}`;
  [previous, next].forEach(button => button.setAttribute('aria-controls', grid.id));
  controls.append(previous, status, next);
  grid.after(controls);
  let current = 0;
  let busy = false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pause = document.createElement('button');
  pause.type = 'button';
  pause.className = 'carousel-pause';
  controls.append(pause);
  let stopped = reduced.matches;
  let timer;
  function schedule() {
    clearTimeout(timer);
    pause.textContent = stopped ? 'Reanudar' : 'Pausar';
    pause.setAttribute('aria-label', stopped ? 'Reanudar carrusel automático' : 'Pausar carrusel automático');
    if (stopped || busy || document.hidden || grid.matches(':hover') || controls.matches(':hover') || grid.contains(document.activeElement) || controls.contains(document.activeElement)) return;
    timer = setTimeout(() => move(1), 5500);
  }
  pause.addEventListener('click', () => { stopped = !stopped; schedule(); });
  [grid, controls].forEach(element => {
    element.addEventListener('mouseenter', () => clearTimeout(timer));
    element.addEventListener('mouseleave', schedule);
    element.addEventListener('focusin', () => clearTimeout(timer));
    element.addEventListener('focusout', () => requestAnimationFrame(schedule));
  });
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('pagehide', () => clearTimeout(timer));
  window.addEventListener('pageshow', schedule);
  reduced.addEventListener('change', () => { if (reduced.matches) stopped = true; schedule(); });
  async function animate(slide, entering, direction) {
    if (reduced.matches || !slide.animate) return;
    const animation = slide.animate(entering ? [
      { opacity:0, transform:`translateX(${direction * 20}px)` },
      { opacity:1, transform:'translateX(0)' }
    ] : [
      { opacity:1, transform:'translateX(0)' },
      { opacity:0, transform:`translateX(${-direction * 20}px)` }
    ], { duration:350, easing:'cubic-bezier(0.16, 1, 0.3, 1)', fill:'forwards' });
    const finish = () => { if (reduced.matches) animation.finish(); };
    reduced.addEventListener('change', finish);
    try { await animation.finished; } catch {} finally { reduced.removeEventListener('change', finish); }
    return animation;
  }
  async function move(direction) {
    if (busy) return;
    clearTimeout(timer);
    busy = true;
    [previous, next].forEach(button => button.setAttribute('aria-disabled', 'true'));
    const old = slides[current];
    const exit = await animate(old, false, direction);
    old.classList.remove('is-current'); old.inert = true; old.setAttribute('aria-hidden', 'true');
    exit?.cancel();
    current = (current + direction + slides.length) % slides.length;
    const active = slides[current];
    active.classList.add('is-current'); active.inert = false; active.setAttribute('aria-hidden', 'false');
    const entrance = await animate(active, true, direction);
    entrance?.cancel();
    status.textContent = `Historia ${current + 1} de ${slides.length}`;
    busy = false;
    [previous, next].forEach(button => button.removeAttribute('aria-disabled'));
    schedule();
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  schedule();
}

// ============================================
// 7. DIÁLOGO MODAL DE PRIVACIDAD
// ============================================
function setupPrivacyDialog() {
  const dialog = document.getElementById('privacyDialog');
  if (!dialog) return;

  document.querySelectorAll('[data-privacy]').forEach((btn) => {
    btn.addEventListener('click', () => dialog.showModal());
  });

  dialog.querySelectorAll('.dialog-close, .dialog-accept').forEach((btn) => {
    btn.addEventListener('click', () => dialog.close());
  });
}

// ============================================
// 8. SCROLL-SPY — Sección activa sin alterar URL
// ============================================
function setupScrollSpy() {
  const links = [...document.querySelectorAll('#main-nav a, #mobileMenu a:not(.btn)')];
  const sections = [...document.querySelectorAll('main > section, footer[id]')];
  const header = document.getElementById('header');
  if (!header || !links.length || !sections.length) return;

  let scheduled = false;

  function updateCurrentSection() {
    scheduled = false;
    const readingLine = header.getBoundingClientRect().bottom + 80;
    let currentId = '';

    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= readingLine && rect.bottom > readingLine) {
        currentId = section.id;
      }
    }

    const footer = document.getElementById('contacto');
    if (
      window.scrollY > 0 &&
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2 &&
      footer &&
      footer.getBoundingClientRect().top < window.innerHeight
    ) {
      currentId = footer.id;
    }

    links.forEach((link) => {
      if (link.hash === `#${currentId}`) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function scheduleUpdate() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateCurrentSection);
    }
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  updateCurrentSection();
}

// ============================================
// 9. UTILIDADES (Año dinámico)
// ============================================
function setDynamicYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

// ============================================
// INICIALIZACIÓN UNIFICADA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavScroll();
  setupForm();
  setupFormReset();
  setupMobileMenu();
  setupHeroWordSplit();
  setupStoriesCarousel();
  setupReveal();
  setupPrivacyDialog();
  setupScrollSpy();
  setDynamicYear();
});
