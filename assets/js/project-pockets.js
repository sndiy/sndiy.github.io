(() => {
  const book = document.getElementById('buku-sndiy');
  if (!getComputedStyle(book).getPropertyValue('--folio-styled').trim()) return;
  if (!book.querySelector('.album').showModal) return;
  function mountPocket(section) {
    const id = section.dataset.content;
    const pocket = book.querySelector('[data-pocket-template]').content.firstElementChild.cloneNode(true);
    const fallback = section.querySelector('.project-fallback');
    const note = fallback.querySelector('.project-note-copy');
    const question = note.querySelector('h2').textContent;
    const answer = note.querySelector('p').textContent;
    fallback.replaceWith(pocket);
    const insert = pocket.querySelector('.insert');
    const handle = pocket.querySelector('.handle');
    const copy = pocket.querySelector('.insert-text');
    copy.id = 'sisipan-' + id;
    copy.textContent = answer;
    copy.tabIndex = 0;
    copy.setAttribute('role','region');
    copy.setAttribute('aria-label',question);
    handle.setAttribute('aria-controls',copy.id);
    let open = false;
    let drag = null;
    let ignoreClick = false;
    function settle(value) {
      open = value;
      pocket.classList.remove('dragging');
      pocket.classList.toggle('opened',open);
      pocket.style.setProperty('--lift',open ? 1 : 0);
      handle.setAttribute('aria-expanded',String(open));
      handle.textContent = open ? '\u2193 Selipkan kembali' : 'Tarik \u2191 \u00b7 ' + question;
      copy.inert = !open;
      copy.setAttribute('aria-hidden',String(!open));
    }
    handle.addEventListener('pointerdown',event => {
      if (event.button !== 0 || !event.isPrimary || drag) return;
      ignoreClick = false;
      const distance = Math.max(1,insert.offsetHeight - handle.offsetHeight);
      const transform = getComputedStyle(insert).transform;
      const y = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
      const start = Math.min(1,Math.max(0,1-y/distance));
      drag = {id:event.pointerId,y:event.clientY,distance,start,progress:start,moved:false};
      pocket.style.setProperty('--lift',start);
      pocket.classList.add('dragging');
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove',event => {
      if (drag?.id !== event.pointerId) return;
      const delta = drag.y-event.clientY;
      if (Math.abs(delta)>4) drag.moved = true;
      drag.progress = Math.min(1,Math.max(0,drag.start+delta/drag.distance));
      pocket.style.setProperty('--lift',drag.progress);
    });
    function release(event) {
      if (drag?.id !== event.pointerId) return;
      const gesture = drag;
      drag = null;
      ignoreClick = gesture.moved;
      const completed = event.type === 'pointerup' && gesture.moved;
      settle(completed ? gesture.progress >= (open ? 2/3 : 1/3) : open);
    }
    for (const type of ['pointerup','pointercancel','lostpointercapture']) handle.addEventListener(type,release);
    handle.addEventListener('click',event => {
      if (!ignoreClick || event.detail === 0) settle(!open);
      ignoreClick = false;
    });
    settle(false);
    section.addEventListener('folio:leave',() => {
      drag = null;
      settle(false);
    });
  }
  book.querySelectorAll('.project-note').forEach(mountPocket);
})();
