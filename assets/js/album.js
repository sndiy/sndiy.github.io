(() => {
  const book = document.getElementById('buku-sndiy');
  if (!book.classList.contains('paginated')) return;
  const album = book.querySelector('.album');
  const grid = album.querySelector('.album-grid');
  const albums = {
    studyai: [
      {file:'editor-studyai', caption:'Editor catatan StudyAI', ratio:1280/760},
      {file:'editor-rangkum-studyai', caption:'Ringkasan di editor StudyAI', ratio:16/9},
      {file:'tanya-ai-studyai', caption:'Panel tanya AI', ratio:1280/760},
      {file:'pengaturan-studyai', caption:'Pengaturan StudyAI', ratio:16/9}
    ],
    sholattracker: [
      {file:'riwayat-sholattracker', caption:'Riwayat salat', ratio:480/1040},
      {file:'beranda-sholattracker', caption:'Beranda aplikasi', ratio:480/1557},
      {file:'pengingat-sholattracker', caption:'Pengaturan pengingat salat', ratio:480/1040}
    ]
  };
  const imagePath = (photo, small) => 'assets/karya/' + photo.file + (small ? '-kecil' : '') + '.webp';
  const displayedPhotos = new WeakMap();
  let albumCover = null;
  let selectedPhoto = null;
  let thumbnailObserver = null;
  function sizePrint(print, photo) {
    const ratio = photo.ratio ?? 1;
    print.style.setProperty('--photo-ratio',ratio);
    print.style.setProperty('--print-width','calc(var(--paper-width, 650px) * ' + (ratio > 1 ? 0.66 : ratio < 1 ? 0.4 : 0.33) + ')');
  }

  function setCover(button, photo, photos) {
    const count = photos.length;
    displayedPhotos.set(button,photo);
    const thumb = button.querySelector('img');
    thumb.loading = 'lazy';
    thumb.decoding = 'async';
    thumb.src = imagePath(photo,true);
    thumb.alt = '';
    button.querySelector('.photo-caption').textContent = photo.caption;
    const albumLabel = 'Lihat ' + count + ' foto';
    button.querySelector('.photo-count').textContent = count > 1 ? albumLabel : '';
    button.setAttribute('aria-label', (count > 1 ? albumLabel : 'Perbesar foto') + ', ' + photo.caption);
    const print = button.closest('.print');
    sizePrint(print,photo);
    print.classList.toggle('stacked',count > 1);
    button.querySelectorAll('.stack-layer').forEach(layer => layer.remove());
    for (const behind of photos.filter(item => item !== photo).slice(0,2)) {
      const layer = document.createElement('img');
      layer.className = 'stack-layer';
      layer.alt = '';
      layer.loading = 'lazy';
      layer.decoding = 'async';
      layer.src = imagePath(behind,true);
      sizePrint(layer,behind);
      button.append(layer);
    }
  }
  function photosFor(button) {
    return albums[button.closest('[data-content]').dataset.content];
  }

  for (const button of book.querySelectorAll('.pocket .photo-trigger')) {
    const photos = photosFor(button);
    setCover(button,photos[0],photos);
  }

  function openAlbum(button, photos) {
    albumCover = button;
    const name = button.closest('.project-note').querySelector('h1').textContent.trim();
    album.querySelector('h2').textContent = 'Album ' + name;
    if ('IntersectionObserver' in window) {
      thumbnailObserver = new IntersectionObserver(entries => {
        for (const {target,isIntersecting} of entries) {
          if (isIntersecting) target.src = target.dataset.thumb;
          else if (!book.querySelector('.photo-view[open]')) target.removeAttribute('src');
        }
      },{root:grid,rootMargin:'250px 0px'});
    }
    const cards = document.createDocumentFragment();
    const topPhoto = displayedPhotos.get(button);
    for (const photo of [topPhoto,...photos.filter(item => item !== topPhoto)]) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'album-photo';
      card.style.setProperty('--place-delay',Math.min(cards.childElementCount,3) * 15 + 'ms');
      card.style.setProperty('--photo-ratio',photo.ratio ?? 1);
      displayedPhotos.set(card,photo);
      card.setAttribute('aria-haspopup','dialog');
      card.setAttribute('aria-label','Perbesar ' + photo.caption);
      const thumb = document.createElement('img');
      thumb.alt = '';
      thumb.decoding = 'async';
      thumb.dataset.thumb = imagePath(photo,true);
      if (thumbnailObserver) thumbnailObserver.observe(thumb);
      else {
        thumb.loading = 'lazy';
        thumb.src = thumb.dataset.thumb;
      }
      card.append(thumb);
      const entry = document.createElement('figure');
      entry.className = 'album-entry';
      const mount = document.createElement('div');
      mount.className = 'album-mount';
      mount.append(card);
      const label = document.createElement('figcaption');
      label.textContent = photo.caption;
      entry.append(mount,label);
      cards.append(entry);
    }
    grid.replaceChildren(cards);
    document.documentElement.classList.add('photo-open');
    album.showModal();
    button.classList.add('spread-out');
    grid.scrollTop = 0;
  }

  book.addEventListener('click', event => {
    const button = event.target.closest('.pocket .photo-trigger,.album-photo');
    if (!button) return;
    const cover = albumCover || button;
    const photos = photosFor(cover);
    if (button === cover && photos.length > 1 && album.showModal) {
      openAlbum(cover,photos);
      return;
    }
    const photo = displayedPhotos.get(button);
    if (album.open) selectedPhoto = photo;
    book.dispatchEvent(new CustomEvent('folio:photo',{detail:{
      button,
      photo:{...photo,src:imagePath(photo,false),thumb:imagePath(photo,true)}
    }}));
  });
  album.querySelector('.album-close').addEventListener('click',() => album.close());
  album.addEventListener('close',() => {
    albumCover?.classList.remove('spread-out');
    thumbnailObserver?.disconnect();
    thumbnailObserver = null;
    grid.replaceChildren();
    document.documentElement.classList.remove('photo-open');
    if (albumCover && selectedPhoto && displayedPhotos.get(albumCover) !== selectedPhoto) {
      const photos = photosFor(albumCover);
      setCover(albumCover,selectedPhoto,photos);
    }
    selectedPhoto = null;
    albumCover?.focus({preventScroll:true});
    albumCover = null;
  });

})();
