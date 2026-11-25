const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.navigation');
const navigationLinks = [...navigation.querySelectorAll('a')];
const mobileLayout = matchMedia('(max-width: 620px)');
const tiltElements = [...document.querySelectorAll('.hero-media, .about-inner > img')];

if (tiltElements.length && matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  for (const element of tiltElements) {
    let bounds;
    let tiltFrame = 0;
    let pointerTiltX = 0;
    let pointerTiltY = 0;
    element.addEventListener('pointerenter', () => {
      bounds = element.getBoundingClientRect();
      element.classList.add('is-tilting');
    });
    element.addEventListener('pointermove', event => {
      if (!bounds) return;
      pointerTiltX = -((event.clientY - bounds.top) / bounds.height - .5) * 8;
      pointerTiltY = ((event.clientX - bounds.left) / bounds.width - .5) * 8;
      if (tiltFrame) return;
      tiltFrame = requestAnimationFrame(() => {
        element.style.setProperty('--tilt-x', `${pointerTiltX}deg`);
        element.style.setProperty('--tilt-y', `${pointerTiltY}deg`);
        tiltFrame = 0;
      });
    });
    element.addEventListener('pointerleave', () => {
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      tiltFrame = 0;
      bounds = null;
      element.classList.remove('is-tilting');
      element.style.removeProperty('--tilt-x');
      element.style.removeProperty('--tilt-y');
    });
  }
}

if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let lastHeartAt = 0;
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const now = performance.now();
    if (now - lastHeartAt < 70) return;
    lastHeartAt = now;

    const heart = document.createElement('span');
    heart.className = 'cursor-heart';
    heart.setAttribute('aria-hidden', 'true');
    heart.textContent = '♥';
    heart.style.left = `${event.clientX}px`;
    heart.style.top = `${event.clientY}px`;
    heart.addEventListener('animationend', () => heart.remove(), { once: true });
    document.body.append(heart);
  });
}

function setMenu(open) {
  navigation.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
}

menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') === 'false'));
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuToggle.focus();
  }
});
document.addEventListener('click', event => {
  if (!navigation.contains(event.target) && !menuToggle.contains(event.target)) setMenu(false);
});
mobileLayout.addEventListener('change', () => setMenu(false));

function highlightSection() {
  const marker = Math.min(innerHeight * .34, 230);
  const nearBottom = scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
  const current = nearBottom ? navigationLinks.at(-1) : navigationLinks.reduce((latest, link) => {
    const section = document.querySelector(link.hash);
    return section.getBoundingClientRect().top <= marker ? link : latest;
  }, navigationLinks[0]);
  for (const link of navigationLinks) {
    if (link === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

// One passive listener tracks navigation. CSS handles the scroll-driven artwork.
let queued = false;
window.addEventListener('scroll', () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    highlightSection();
    queued = false;
  });
}, { passive: true });
window.addEventListener('resize', highlightSection);
highlightSection();

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const reveals = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  }, { threshold: .12 });
  document.querySelectorAll('[data-reveal]').forEach(element => reveals.observe(element));
}

const viewer = document.querySelector('#viewer');
const viewerTitle = document.querySelector('#viewer-title');
const viewerImage = viewer.querySelector('.viewer-image');
const albumGrid = viewer.querySelector('#flower-album');
const viewerControls = viewer.querySelector('.viewer-controls');
const positionText = document.querySelector('#photo-position');
let photoGroup = [];
let photoIndex = 0;

function showPhoto(offset) {
  photoIndex = (photoIndex + offset + photoGroup.length) % photoGroup.length;
  const button = photoGroup[photoIndex];
  const photo = button.querySelector('img');
  viewerTitle.textContent = button.querySelector('.photo-label').textContent;
  viewerImage.src = photo.src;
  viewerImage.alt = photo.alt;
  positionText.textContent = `${photoIndex + 1} of ${photoGroup.length}`;
}

document.querySelectorAll('.photo-grid').forEach(grid => {
  const buttons = [...grid.querySelectorAll('[data-photo]')];
  buttons.forEach(button => button.addEventListener('click', () => {
    const groupName = button.dataset.photoGroup;
    if (groupName) {
      const flowers = buttons.filter(item => item.dataset.photoGroup === groupName);
      albumGrid.replaceChildren(...flowers.map(item => {
        const source = item.querySelector('img');
        const figure = document.createElement('figure');
        const image = document.createElement('img');
        image.src = source.src;
        image.alt = source.alt;
        image.loading = 'lazy';
        figure.append(image);
        return figure;
      }));
      viewerTitle.textContent = button.querySelector('.photo-label').textContent;
      viewer.classList.add('is-album');
      viewerImage.hidden = true;
      viewerControls.hidden = true;
      albumGrid.hidden = false;
      viewer.showModal();
      return;
    }

    viewer.classList.remove('is-album');
    viewerImage.hidden = false;
    viewerControls.hidden = false;
    albumGrid.hidden = true;
    photoGroup = groupName
      ? buttons.filter(item => item.dataset.photoGroup === groupName)
      : buttons.filter(item => !item.closest('li').hidden);
    photoIndex = photoGroup.indexOf(button);
    showPhoto(0);
    viewer.showModal();
  }));
});
document.querySelector('#previous-photo').addEventListener('click', () => showPhoto(-1));
document.querySelector('#next-photo').addEventListener('click', () => showPhoto(1));
viewer.addEventListener('keydown', event => {
  if (viewer.classList.contains('is-album')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPhoto(event.key === 'ArrowRight' ? 1 : -1);
  }
});

const article = document.querySelector('#article-dialog');
const articleIntro = article.querySelector('.article-intro');
const articlePattern = article.querySelector('.article-pattern');
const articleTools = article.querySelector('.article-tools');
const articleGranny = article.querySelector('.article-granny');
const articleAvailability = article.querySelector('.article-availability');
const articleContent = {
  'bunny-keychain-pattern': {
    intro: 'Are you new to the wonderful world of crochet and looking for some easy patterns to kickstart your crafting journey? Look no further! Here are the Bunny Keychain Pattern that are perfect for beginners.',
    section: articlePattern
  },
  'crochet-tools': {
    intro: 'Crochet enthusiasts know that having the right tools can make all the difference in their crafting experience. Whether you are a seasoned crocheter or just starting out, having the essential tools at your disposal is key to creating beautiful and intricate pieces. Here are 10 must-have crochet tools that every enthusiast should have in their collection:',
    section: articleTools
  },
  'granny-square': {
    intro: 'Are you looking to enhance your crochet skills and add a classic touch to your projects? Mastering the timeless Granny Square stitch is a must for any crochet enthusiast. This versatile stitch is the building block for countless patterns, from blankets and scarves to garments and home decor.',
    section: articleGranny
  }
};
for (const card of document.querySelectorAll('[data-post]')) {
  const preview = card.querySelector('.post-open');
  preview.addEventListener('click', () => {
    const content = articleContent[card.dataset.post];
    const previewImage = article.querySelector('.article-image');
    const cardImage = card.querySelector('img');
    previewImage.src = cardImage.src;
    previewImage.alt = cardImage.alt;
    articleIntro.textContent = content ? content.intro : '';
    articleIntro.hidden = !content;
    articlePattern.hidden = !content || content.section !== articlePattern;
    articleTools.hidden = !content || content.section !== articleTools;
    articleGranny.hidden = !content || content.section !== articleGranny;
    articleAvailability.hidden = Boolean(content);
    article.querySelector('#article-title').textContent = preview.textContent;
    for (const selector of ['.byline', '.metadata']) {
      article.querySelector(selector).replaceChildren(...card.querySelector(selector).cloneNode(true).childNodes);
    }
    article.showModal();
  });

  const favorite = card.querySelector('.favorite');
  const key = `maybe-knot:favorite:${card.dataset.post}`;

  function showFavorite(saved) {
    favorite.setAttribute('aria-pressed', String(saved));
    favorite.firstElementChild.textContent = saved ? '♥' : '♡';
  }

  try { showFavorite(localStorage.getItem(key) === 'true'); }
  catch { /* Favorites still work until reload when browser storage is blocked. */ }

  favorite.addEventListener('click', () => {
    const saved = favorite.getAttribute('aria-pressed') !== 'true';
    showFavorite(saved);
    try { localStorage.setItem(key, String(saved)); }
    catch { /* The visible button state is updated even without persistent storage. */ }
  });
}

const chat = document.querySelector('#chat-dialog');
document.querySelectorAll('[data-chat]').forEach(button => button.addEventListener('click', () => chat.showModal()));

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
}

const form = document.querySelector('#contact-form');
const status = form.querySelector('.status');
const requiredTextFields = [form.elements.name, form.elements.message];

for (const field of requiredTextFields) {
  field.addEventListener('input', () => {
    field.setCustomValidity(field.value && !field.value.trim() ? 'Please enter text.' : '');
  });
}

form.addEventListener('input', () => { status.textContent = ''; });
form.addEventListener('submit', event => {
  event.preventDefault();
  const recipient = 'tricianneborres@gmail.com';
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const message = form.elements.message.value.trim();
  const subject = `Maybe Knot website message from ${name}`;
  const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
  status.textContent = `Opening your email app. If it doesn't open, email ${recipient} directly.`;
  window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
