(() => {
  if (!document.querySelector('#buku-sndiy.paginated')) return;
  const shortcut = document.querySelector('.contact-shortcut');
  const heading = document.getElementById('kontak');
  const card = heading.closest('.contact-card');
  const allowMotion = window.matchMedia('(prefers-reduced-motion: no-preference) and (update: fast)');
  let motion;

  shortcut.addEventListener('click', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    motion?.cancel();

    // The folio's focus handler selects the sheet without scrolling the window.
    heading.focus({preventScroll:true});
    const bounds = card.getBoundingClientRect();
    const paper = card.closest('main').getBoundingClientRect();
    const visible = bounds.top >= Math.max(0,paper.top) &&
      bounds.bottom <= Math.min(document.documentElement.clientHeight,paper.bottom);
    if (!visible) card.scrollIntoView({block:'nearest',inline:'nearest',behavior:allowMotion.matches ? 'smooth' : 'instant'});

    if (!allowMotion.matches || !card.animate) return;
    motion = card.animate([
      {transform:'none'},
      {transform:'translateY(-3px) rotate(-1deg)', offset:.28},
      {transform:'translateY(-1px) rotate(.65deg)', offset:.57},
      {transform:'none'}
    ],{duration:440, delay:visible ? 0 : 150, easing:'ease-in-out'});
  });
})();
