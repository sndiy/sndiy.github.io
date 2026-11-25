(() => {
  const book = document.getElementById('buku-sndiy');
  if (!book.classList.contains('paginated')) return;
  const dialog = book.querySelector('.photo-view');
  const frame = dialog.querySelector('.enlargement');
  const printWindow = frame.querySelector('.print-window');
  const image = frame.querySelector('img');
  const caption = frame.querySelector('figcaption');
  const closeButton = dialog.querySelector('.photo-close');
  const allowMotion = window.matchMedia('(prefers-reduced-motion: no-preference) and (update: fast)');
  let origin = null;
  let motion = null;
  let closing = false;
  let fullImage = null;
  let cardScale = 1;
  let pinchDistance = 0;
  let pinchCard = null;

  // Measure the same image window on the sheet and in the enlarged print.
  function transformToPrint() {
    const thumbnail = origin.querySelector('img');
    if (!thumbnail.clientWidth || !image.clientWidth) return null;
    const source = thumbnail.getBoundingClientRect();
    const target = image.getBoundingClientRect();
    const x = source.left + source.width / 2 - target.left - target.width / 2;
    const y = source.top + source.height / 2 - target.top - target.height / 2;
    const print = thumbnail.closest('.print-window');
    const sourceStyle = getComputedStyle(print || origin);
    const tilt = sourceStyle.getPropertyValue('--tilt').trim() || '0deg';
    const liftScale = parseFloat(sourceStyle.scale) || 1;
    return `translate(${x}px,${y}px) rotate(${tilt}) scale(${thumbnail.clientWidth * liftScale / image.clientWidth})`;
  }

  function landPhoto() {
    // Restore the print before the native dialog disappears and returns focus.
    (origin.closest('.print') || origin).classList.remove('lifted');
    dialog.close();
  }

  function closePhoto() {
    if (!origin || closing) return;
    closing = true;
    if (!allowMotion.matches || !printWindow.animate) {
      landPhoto();
      return;
    }
    const start = getComputedStyle(printWindow).transform;
    const fraction = motion?.effect.getComputedTiming().progress ?? 1;
    motion?.cancel();
    printWindow.style.removeProperty('transform');
    const end = transformToPrint();
    if (!end || fraction === 0) {
      landPhoto();
      return;
    }
    const duration = Math.max(60,260 * fraction);
    dialog.style.setProperty('--return-time',duration + 'ms');
    dialog.classList.add('returning');
    motion = printWindow.animate([{transform:start},{transform:end}], {
      duration, easing:'cubic-bezier(.35,0,.25,1)', fill:'forwards'
    });
    motion.onfinish = landPhoto;
  }

  function openPhoto(button, photo) {
    origin = button;
    frame.style.setProperty('--photo-ratio',photo.ratio ?? 1);
    frame.classList.toggle('portrait',Boolean(button.closest('.portrait-mount')));
    const loading = new Image();
    fullImage = loading;
    const thumbnail = button.querySelector('img');
    if (!thumbnail.hasAttribute('src')) thumbnail.src = photo.thumb;
    image.src = thumbnail.currentSrc || thumbnail.src;
    image.alt = photo.caption;
    caption.textContent = photo.caption;
    const closeLabel = book.querySelector('.album[open]') ? 'Kembali ke album' : 'Tutup foto';
    closeButton.setAttribute('aria-label',closeLabel);
    closeButton.title = closeLabel;
    document.documentElement.classList.add('photo-open');
    dialog.showModal();
    closeButton.focus({preventScroll:true});
    const start = transformToPrint();
    (origin.closest('.print') || origin).classList.add('lifted');
    if (start && allowMotion.matches && printWindow.animate) {
      motion = printWindow.animate([{transform:start},{transform:'none'}], {
        duration:400, easing:'cubic-bezier(.18,.76,.24,1)'
      });
    }
    loading.src = photo.src;
    const showFullImage = () => {
      if (fullImage === loading && dialog.open && !closing) image.src = loading.src;
    };
    if (loading.decode) loading.decode().then(showFullImage,() => {});
    else if (loading.complete && loading.naturalWidth) showFullImage();
    else loading.onload = showFullImage;
  }

  book.addEventListener('click',event => {
    const link = event.target.closest('.single-photo');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !dialog.showModal) return;
    event.preventDefault();
    if (origin) return;
    openPhoto(link,{
      src:link.dataset.full || link.href,
      thumb:link.querySelector('img').src,
      ratio:Number(link.closest('.print').style.getPropertyValue('--photo-ratio')),
      caption:link.querySelector('.photo-caption').textContent
    });
  });
  book.addEventListener('folio:photo',({detail:{button,photo}}) => {
    if (origin) return;
    if (!dialog.showModal) location.assign(photo.src);
    else openPhoto(button,photo);
  });
  function resizeCard(card, factor) {
    if (closing || !card || !dialog.showModal) return;
    if (!origin) {
      if (factor <= 1) return;
      card.click();
      if (!origin) return;
      cardScale = origin.querySelector('img').clientWidth / image.clientWidth;
    }
    motion?.finish();
    motion = null;
    const minimum = origin.querySelector('img').clientWidth / image.clientWidth;
    const captionSpace = frame.offsetHeight - printWindow.offsetHeight;
    const maximum = Math.max(1, Math.min(dialog.clientWidth / printWindow.offsetWidth,
      (dialog.clientHeight - captionSpace - 24) / printWindow.offsetHeight));
    const next = cardScale * factor;
    if (factor < 1 && next <= minimum + .015) {
      closePhoto();
      return;
    }
    cardScale = Math.min(maximum, Math.max(minimum,next));
    const nearSource = minimum < 1 ? Math.max(0,(1 - cardScale) / (1 - minimum)) : 0;
    const source = origin.querySelector('img').getBoundingClientRect();
    const resting = frame.getBoundingClientRect();
    const x = (source.left + source.width / 2 - resting.left - resting.width / 2) * nearSource;
    const y = (source.top + source.height / 2 - resting.top - printWindow.offsetHeight / 2) * nearSource;
    const tilt = parseFloat(getComputedStyle(origin).getPropertyValue('--tilt')) || 0;
    printWindow.style.transform = `translate(${x}px,${y}px) rotate(${tilt * nearSource}deg) scale(${cardScale})`;
    caption.style.top = y + (cardScale - 1) * printWindow.offsetHeight / 2 + 'px';
  }
  function gestureCard(target) {
    return origin || target.closest('.single-photo,.album-photo');
  }
  book.addEventListener('wheel',event => {
    const card = gestureCard(event.target);
    if (!card || (!origin && event.deltaY >= 0) || !event.deltaY) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    resizeCard(card,Math.exp(Math.max(-1,Math.min(1,-event.deltaY * unit / 420))));
  },{passive:false});
  const distance = ([a,b]) => Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  book.addEventListener('touchstart',event => {
    if (event.touches.length !== 2) return;
    pinchCard = gestureCard(event.target);
    if (!pinchCard) return;
    event.preventDefault();
    pinchDistance = distance(event.touches);
  },{passive:false});
  book.addEventListener('touchmove',event => {
    if (!pinchCard || event.touches.length !== 2 || !pinchDistance) return;
    event.preventDefault();
    const next = distance(event.touches);
    if (next > 0) resizeCard(pinchCard,next / pinchDistance);
    pinchDistance = next;
  },{passive:false});
  function endPinch() { pinchCard = null; pinchDistance = 0; }
  book.addEventListener('touchend',endPinch);
  book.addEventListener('touchcancel',endPinch);
  closeButton.addEventListener('click',closePhoto);
  dialog.addEventListener('click',event => { if (event.target === dialog) closePhoto(); });
  dialog.addEventListener('keydown',event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePhoto();
    }
  });
  dialog.addEventListener('cancel',event => { event.preventDefault(); closePhoto(); });
  dialog.addEventListener('close',() => {
    if (fullImage) {
      fullImage.onload = null;
      fullImage.removeAttribute('src');
      fullImage = null;
    }
    motion?.cancel();
    motion = null;
    cardScale = 1;
    endPinch();
    printWindow.style.removeProperty('transform');
    dialog.classList.remove('returning');
    caption.style.removeProperty('top');
    dialog.style.removeProperty('--return-time');
    image.removeAttribute('src');
    document.documentElement.classList.toggle('photo-open',Boolean(book.querySelector('.album[open]')));
    (origin?.closest('.print') || origin)?.classList.remove('lifted');
    origin?.focus({preventScroll:true});
    origin = null;
    closing = false;
  });
})();
