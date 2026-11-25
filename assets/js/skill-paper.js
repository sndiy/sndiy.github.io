(() => {
  if (!document.querySelector('#buku-sndiy.paginated')) return;
  const allowMotion = window.matchMedia('(prefers-reduced-motion: no-preference) and (update: fast)');

  document.querySelectorAll('.skill-list li').forEach((scrap) => {
    const paper = scrap.querySelector('.skill-paper');
    let drag = null;
    paper.addEventListener('contextmenu', (event) => event.preventDefault());
    paper.addEventListener('dragstart', (event) => event.preventDefault());

    scrap.addEventListener('pointerenter', (event) => {
      if (drag || event.pointerType !== 'mouse' || !allowMotion.matches) return;

      const lift = 2 + Math.random() * 2;
      const tilt = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 2);
      scrap.style.setProperty('--skill-lift', `-${lift}px`);
      scrap.style.setProperty('--skill-tilt', `${tilt}deg`);
      scrap.classList.add('is-lifted');
    });

    scrap.addEventListener('pointerleave', () => scrap.classList.remove('is-lifted'));

    paper.addEventListener('pointerdown', (event) => {
      if (drag || !event.isPrimary || event.button !== 0) return;
      drag = { id:event.pointerId, x:event.clientX, y:event.clientY };
      paper.setPointerCapture(drag.id);
      scrap.classList.add('is-dragging');
    });

    paper.addEventListener('pointermove', (event) => {
      if (drag?.id !== event.pointerId) return;
      const x = event.clientX - drag.x;
      const y = event.clientY - drag.y;
      const limit = 36;
      const resistance = limit / (limit + Math.hypot(x,y));
      paper.style.setProperty('--skill-drag', `${x * resistance}px ${y * resistance}px`);
    });

    const returnToPaper = (event) => {
      if (drag?.id !== event.pointerId) return;
      drag = null;
      scrap.classList.remove('is-dragging','is-lifted');
      paper.style.removeProperty('--skill-drag');
    };
    for (const type of ['pointerup','pointercancel','lostpointercapture']) {
      paper.addEventListener(type,returnToPaper);
    }
  });
})();
