(() => {
  const book = document.getElementById('buku-sndiy');
  if (!getComputedStyle(book).getPropertyValue('--folio-styled').trim()) return;
  const album = book.querySelector('.album');
  if (album && !album.showModal) return;
  const paper = book.querySelector('main');
  const sheets = paper.querySelector('.sheets');
  const folio = book.querySelector('.folio');
  const singleSheet = folio.matches('.single-folio,.profile-folio');
  let sheetIndex = 0;
  const readingPlaces = new Map();
  sheets.addEventListener('focusin',event => {
    if (singleSheet || event.target.hasAttribute('data-content')) return;
    const width = sheets.getBoundingClientRect().width;
    const box = event.target.getClientRects()[0];
    if (width && box) updateSheets(Math.floor((box.left - sheets.getBoundingClientRect().left + sheets.scrollLeft + 1) / width));
  });
  function updateSheets(index = sheetIndex) {
    const width = sheets.getBoundingClientRect().width;
    if (!width) return;
    const count = singleSheet ? 1 : Math.max(1,Math.round(sheets.scrollWidth / width));
    sheetIndex = Math.max(0,Math.min(count - 1,index));
    sheets.scrollLeft = sheetIndex * width;
    book.querySelector('.page-controls').hidden = count === 1;
    book.querySelector('[data-folio]').textContent = (sheetIndex + 1) + ' / ' + count;
    book.querySelectorAll('[data-turn]').forEach(button => {
      const direction = Number(button.dataset.turn);
      const within = sheetIndex + direction >= 0 && sheetIndex + direction < count;
      button.disabled = !within;
      button.textContent = direction < 0 ? '\u2190 Sebelumnya' : 'Lanjut \u2192';
    });
  }
  const sections = [...sheets.querySelectorAll('[data-content]')];
  const index = sections[0];
  const backLink = book.querySelector('[data-back-to-index]');
  let current = null;
  book.classList.add('paginated');
  const notes = [...paper.querySelectorAll('h1:not(.signed-heading),h2,p,.contents strong,.skill-group h3')].filter(el => !el.closest('aside,.contact-card'));
  const inserts = [...paper.querySelectorAll('.insert-text')];
  const ruling = folio.querySelector('.ruling');
  for (const note of [...notes,...inserts]) {
    const marker = document.createElement('span');
    marker.className = 'baseline';
    marker.setAttribute('aria-hidden','true');
    note.prepend(marker);
  }
  for (const note of notes) note.classList.add('ruled');
  function alignInsertRules(text) {
    const baseline = text.firstElementChild.getClientRects()[0];
    if (!baseline) return;
    const sheet = text.parentElement;
    const origin = sheet.getBoundingClientRect().top + sheet.clientTop;
    const pitch = parseFloat(getComputedStyle(text).lineHeight);
    const offset = ((baseline.top - origin) % pitch + pitch) % pitch;
    sheet.style.setProperty('--rule-offset',offset + 'px');
  }
  for (const text of inserts) {
    text.addEventListener('scroll',() => alignInsertRules(text),{passive:true});
  }
  function alignWriting() {
    const width = folio.getBoundingClientRect().width;
    if (!width) return;
    folio.style.setProperty('--paper-width',width + 'px');
    folio.style.setProperty('--folio-height',(width * 330 / 210) + 'px');
    const bounds = ruling.getBoundingClientRect();
    const scale = bounds.height / ruling.viewBox.baseVal.height;
    const firstRule = bounds.top + 24 * scale;
    const pitch = 8 * scale;
    if (!pitch) return;
    const readingText = current.querySelector('p');
    const minimumLeading = parseFloat(getComputedStyle(readingText).fontSize) * 1.25;
    const writingPitch = Math.max(1,Math.ceil(minimumLeading / pitch)) * pitch;
    folio.style.setProperty('--folio-rule',pitch + 'px');
    folio.style.setProperty('--pitch',writingPitch + 'px');
    const mainStyle = getComputedStyle(paper);
    const available = paper.clientHeight - parseFloat(mainStyle.paddingTop) - parseFloat(mainStyle.paddingBottom);
    const columnHeight = Math.max(writingPitch,Math.floor(available / writingPitch) * writingPitch);
    paper.style.setProperty('--column-height',columnHeight + 'px');
    const offsets = [];
    for (const note of notes) {
      if (!note.firstElementChild.getClientRects().length) continue;
      const oldNudge = parseFloat(note.style.getPropertyValue('--nudge')) || 0;
      const baseline = note.firstElementChild.getBoundingClientRect().top - oldNudge;
      const pitches = Math.round((baseline - firstRule) / pitch);
      offsets.push([note,firstRule + pitches * pitch - baseline]);
    }
    for (const text of inserts) alignInsertRules(text);
    for (const [note,offset] of offsets) note.style.setProperty('--nudge',offset + 'px');
    updateSheets();
  }
  let pendingLayout = 0;
  function scheduleLayout() {
    if (pendingLayout) return;
    pendingLayout = requestAnimationFrame(() => { pendingLayout = 0; alignWriting(); });
  }
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(paper);
    observer.observe(book.querySelector('.font-probe'));
  }
  window.addEventListener('resize',scheduleLayout);
  document.fonts?.ready.then(scheduleLayout);
  document.fonts?.addEventListener('loadingdone',scheduleLayout);
  document.fonts?.addEventListener('loadingerror',scheduleLayout);
  function activeSection() {
    return sections.find(section => section.id && '#' + section.id === location.hash) || index;
  }

  function render(next, place) {
    current?.dispatchEvent(new Event('folio:leave'));
    current = next;
    sections.forEach(section => section.hidden = section !== next);
    if (backLink) backLink.hidden = next === index;
    sheetIndex = place?.sheet ?? 0;
    alignWriting();
  }

  function savePlace() {
    const focused = document.activeElement;
    return {
      sheet: sheetIndex,
      top: window.scrollY,
      entry: focused?.closest('.contents a')?.hash
    };
  }

  function focusReadingPlace(place) {
    const entry = [...current.querySelectorAll('.contents a')].find(link => link.hash === place?.entry);
    const target = entry || (sheetIndex === 0 ? current.querySelector('h1') : current);
    if (!entry) target.tabIndex = -1;
    target.focus({preventScroll:true});
    window.scrollTo(0,place?.top ?? 0);
  }

  render(activeSection(),history.state?.folio);
  if (backLink) {
    window.addEventListener('hashchange',() => {
      const next = activeSection();
      if (next === current) return;
      const previous = current;
      readingPlaces.set(previous,savePlace());
      const place = readingPlaces.get(next);
      render(next,place);
      focusReadingPlace(next === index ? {...place,entry:'#' + previous.id} : place);
    });
  }

  const skillLink = book.querySelector('#bukti-kotlin');
  let skillDeparture = null;
  skillLink?.addEventListener('click',event => {
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      skillDeparture = {...savePlace(),focusId:skillLink.id};
    }
  });
  window.addEventListener('pageshow',() => {
    const place = history.state?.folio;
    if (!skillLink || place?.focusId !== skillLink.id) return;
    skillDeparture = null;
    skillLink.focus({preventScroll:true});
    window.scrollTo(0,place.top);
  });
  window.addEventListener('pagehide',() => {
    try { history.replaceState({...history.state,folio:skillDeparture || savePlace()},''); }
    catch { /* Pagination and regular links also work without history state. */ }
  });
  book.querySelector('.page-controls').addEventListener('click',event => {
    const turn = event.target.closest('[data-turn]');
    if (!turn) return;
    updateSheets(sheetIndex + Number(turn.dataset.turn));
    if (turn.disabled) book.querySelector('.page-controls button:not(:disabled)')?.focus({preventScroll:true});
  });
})();
