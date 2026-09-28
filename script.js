(() => {
  // Работы — статическая разметка в index.html, там же порядок тропинки; здесь только поведение.
  const FIRST = 5; // столько работ на тропинке до «Ещё работы» — как nth-of-type(n+6) в styles.css

  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  // ---------- Шапка ----------
  const hdr = $('#hdr');
  const onScroll = () => hdr.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- Закреплённая кнопка (телефон): после первого экрана; кнопка в шапке прячется ----------
  const sticky = $('#sticky'), hero = $('#hero');
  new IntersectionObserver(([e]) => {
    const on = !e.isIntersecting && e.boundingClientRect.top < 0;
    sticky.classList.toggle('is-on', on);
    document.body.classList.toggle('sticky-on', on);
  }).observe(hero);

  // ---------- Фоны блока работ — на подходе к нему (за 200 px), а не при загрузке ----------
  const worksSec = $('#works');
  const nearIO = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    worksSec.classList.add('is-near'); nearIO.disconnect();
  }, { rootMargin: '200px 0px' });
  nearIO.observe(worksSec);

  // ---------- Светлячки: 14 на компьютере, 8 на телефоне; положения — с постоянным зерном ----------
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const wide = matchMedia('(min-width: 768px)').matches;
  const COUNT = { hero: wide ? 8 : 5, scene: wide ? 6 : 3 };
  document.querySelectorAll('[data-fireflies]').forEach(box => {
    const n = COUNT[box.dataset.fireflies];
    box.innerHTML = Array.from({ length: n }, () => {
      const st = `left:${(4 + rnd() * 92).toFixed(1)}%;top:${(8 + rnd() * 80).toFixed(1)}%;--s:${(5 + rnd() * 2).toFixed(1)}px;` +
        `--dx:${(rnd() * 80 - 40).toFixed(0)}px;--dy:${(rnd() * 60 - 30).toFixed(0)}px;` +
        `--dur:${(14 + rnd() * 12).toFixed(1)}s;--blink:${(3 + rnd() * 2).toFixed(1)}s;--delay:-${(rnd() * 20).toFixed(1)}s`;
      return `<span class="ff" style="${st}"></span>`;
    }).join('');
  });

  // ---------- Диалоги: закрытие по крестику и по клику мимо; фокус возвращается туда, откуда открыли ----------
  function wireDialog(dlg) {
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    // На следующем кадре: браузер при закрытии сам возвращает фокус туда, где он был до открытия (после касания — на страницу)
    dlg.addEventListener('close', () => requestAnimationFrame(() => dlg._from && dlg._from.focus({ preventScroll: true })));
  }

  // ---------- «Легенда» ----------
  const dlg = $('.legend');
  wireDialog(dlg);
  // Всё берётся из узла: имя — бирка, описание — alt фото, легенда — data-tale
  function openLegend(node) {
    const ph = $('.node__frame img', node), im = $('.legend__photo img', dlg);
    im.srcset = ph.getAttribute('srcset'); im.src = ph.getAttribute('src');
    im.width = ph.getAttribute('width'); im.height = ph.getAttribute('height'); im.alt = ph.alt;
    $('#lg-name').textContent = $('.node__tag', node).textContent;
    $('.legend__design', dlg).textContent = ph.alt + '.';
    $('.legend__tale', dlg).textContent = node.dataset.tale;
    dlg._from = node;
    dlg.showModal();
    dlg.scrollTop = 0;
  }

  // ---------- Фото крупно: педикюр и сертификаты ----------
  const lb = $('.lightbox'), lbImg = $('.lightbox__img');
  wireDialog(lb);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-zoom]');
    if (!b) return;
    lbImg.src = b.dataset.zoom;
    lbImg.alt = b.dataset.alt || (b.querySelector('img') || {}).alt || '';
    lb._from = b;
    lb.showModal();
  });

  // ---------- «Поляна» (с 1024 px) и «тропинка вниз» (до 1023 px) ----------
  const scene = $('.scene'), stage = $('.scene__stage');
  const far = $('.layer--far'), mid = $('.layer--mid'), ffl = $('.layer--ff'), nodes = $('.nodes'), near = $('.layer--near'), hint = $('.scene__hint');
  const vertical = matchMedia('(max-width: 1023px)');
  // Порядок узлов в DOM = порядок Tab: на тропинке — как в index.html, на поляне — слева направо по --x.
  // Переставляем только при смене режима, иначе перестановка на каждом resize сбивала бы фокус
  const PATH = [...nodes.querySelectorAll('.node')];
  const SCENE = [...PATH].sort((a, b) => parseFloat(a.style.getPropertyValue('--x')) - parseFloat(b.style.getPropertyValue('--x')));
  let arranged = null;
  function arrange() {
    if (arranged === vertical.matches) return;
    arranged = vertical.matches;
    (arranged ? PATH : SCENE).forEach(n => nodes.appendChild(n));
  }

  // «Ещё работы — N» (до 1023 px): после раскрытия фокус — на 6-й работе
  const works = $('#works'), more = $('.works__more .btn-sec');
  $('.btn-sec__label', more).textContent = `Ещё работы — ${PATH.length - FIRST}`;
  more.addEventListener('click', () => {
    works.classList.add('is-open');
    nodes.querySelectorAll('.node')[FIRST].focus();
  });

  const pathSvg = $('.path-line'), pathEl = $('.path-line path');
  // Тропинка на телефоне: плавная кривая через видимые узлы, пересчёт при изменении размеров
  function drawPath() {
    if (!vertical.matches) { pathEl.removeAttribute('d'); return; }
    const base = nodes.getBoundingClientRect();
    pathSvg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
    const pts = [...nodes.querySelectorAll('.node__dot')].filter(el => el.offsetParent).map(el => {
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2 - base.left, r.top + r.height / 2 - base.top];
    });
    pathEl.setAttribute('d', pts.map(([x, y], i) => {
      if (!i) return `M${x},${y - 40}L${x},${y}`;
      const [px, py] = pts[i - 1], k = (y - py) / 2;
      return `C${px},${py + k} ${x},${y - k} ${x},${y}`;
    }).join(''));
  }
  new ResizeObserver(drawPath).observe(nodes);

  let vw = 0, ex = 0, drift = 0, driftTo = 0, raf = 0;
  function measure() {
    arrange();
    scene.tabIndex = vertical.matches ? -1 : 0;
    if (vertical.matches) {
      far.style.width = near.style.width = '';
      far.style.transform = mid.style.transform = ffl.style.transform = nodes.style.transform = near.style.transform = '';
      drawPath();
      return;
    }
    vw = scene.clientWidth; ex = stage.offsetWidth - vw;
    const still = reduce.matches;
    far.style.width = still ? '' : (vw + ex * .6) + 'px';
    near.style.width = still ? '' : (stage.offsetWidth + ex * .25) + 'px';
    render();
  }
  function render() {
    raf = 0;
    if (vertical.matches) return;
    const s = scene.scrollLeft, still = reduce.matches;
    if (!still) drift += (driftTo - drift) * .12;
    const d = still ? 0 : drift;
    far.style.transform = still ? '' : `translate3d(${s * .4 - d * 10}px,0,0)`;
    mid.style.transform = ffl.style.transform = nodes.style.transform = still ? '' : `translate3d(${-d * 18}px,0,0)`;
    near.style.transform = still ? '' : `translate3d(${-s * .25 - d * 24}px,0,0)`;
    if (!still && Math.abs(driftTo - drift) > .002) raf = requestAnimationFrame(render);
  }
  const tick = () => { if (!raf) raf = requestAnimationFrame(render); };
  scene.addEventListener('scroll', () => { if (scene.scrollLeft > 8) hint.classList.add('is-gone'); tick(); }, { passive: true });
  scene.addEventListener('pointermove', e => {
    if (!fine.matches || vertical.matches || scene.classList.contains('is-dragging')) return;
    const r = scene.getBoundingClientRect();
    driftTo = ((e.clientX - r.left) / r.width) * 2 - 1; tick();
  });
  scene.addEventListener('pointerleave', () => { driftTo = 0; tick(); });

  // Перетаскивание мышью; тач — нативный свайп, прокрутку страницы не трогаем.
  let drag = null, dragged = false;
  scene.addEventListener('pointerdown', e => {
    if (vertical.matches || e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, s: scene.scrollLeft, id: e.pointerId, moved: false };
    dragged = false;
    hint.classList.add('is-gone');
  });
  scene.addEventListener('pointermove', e => {
    if (!drag) return;
    if (e.buttons === 0) { end(); return; }
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) { drag.moved = dragged = true; scene.setPointerCapture(drag.id); scene.classList.add('is-dragging'); }
    if (drag.moved) scene.scrollLeft = drag.s - dx;
  });
  // click приходит сразу после pointerup, поэтому флаг гасится таймером — следующий клик уже откроет «Легенду»
  const end = () => { if (!drag) return; scene.classList.remove('is-dragging'); drag = null; setTimeout(() => { dragged = false; }); };
  scene.addEventListener('pointerup', end); scene.addEventListener('pointercancel', end);

  nodes.addEventListener('click', e => {
    const n = e.target.closest('.node');
    if (!n) return;
    if (dragged) { dragged = false; return; } // после перетаскивания «Легенда» не открывается
    openLegend(n);
  });
  addEventListener('resize', measure);
  reduce.addEventListener('change', measure);
  vertical.addEventListener('change', measure);
  measure();
})();
