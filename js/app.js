(function () {
  'use strict';

  const CATEGORY_LABELS = {
    all: { en: 'All', et: 'Kõik' },
    technology: { en: 'Technology', et: 'Tehnoloogia' },
    science: { en: 'Science', et: 'Teadus' },
    history: { en: 'History', et: 'Ajalugu' },
    geography: { en: 'Geography', et: 'Geograafia' },
    biology: { en: 'Biology', et: 'Bioloogia' },
  };

  const TAG_LABELS = {
    all: { en: 'All', et: 'Kõik' },
    computing: { en: 'Computing', et: 'Arvutindus' },
    internet: { en: 'Internet', et: 'Internet' },
    engineering: { en: 'Engineering', et: 'Tehnika' },
    space: { en: 'Space', et: 'Kosmos' },
    chemistry: { en: 'Chemistry', et: 'Keemia' },
    physics: { en: 'Physics', et: 'Füüsika' },
    'world-history': { en: 'World History', et: 'Maailma ajalugu' },
    countries: { en: 'Countries', et: 'Riigid' },
    climate: { en: 'Climate', et: 'Kliima' },
    oceans: { en: 'Oceans', et: 'Ookeanid' },
    mountains: { en: 'Mountains', et: 'Mäed' },
    'animal-biology': { en: 'Animal Biology', et: 'Loomabioloogia' },
    'human-biology': { en: 'Human Biology', et: 'Inimese bioloogia' },
  };

  const STORAGE_KEYS = {
    lang: 'fotd.lang',
    category: 'fotd.category',
    tag: 'fotd.tag',
  };

  const state = {
    pool: [],
    daily: null,
    lang: localStorage.getItem(STORAGE_KEYS.lang) || 'en',
    category: localStorage.getItem(STORAGE_KEYS.category) || 'all',
    tag: localStorage.getItem(STORAGE_KEYS.tag) || 'all',
    heroFact: null,
    heroIsRandom: false,
  };

  const el = {
    langToggle: document.getElementById('lang-toggle'),
    categoryFilters: document.getElementById('category-filters'),
    tagFilters: document.getElementById('tag-filters'),
    heroCard: document.getElementById('hero-card'),
    heroBadge: document.getElementById('hero-badge'),
    heroLabel: document.getElementById('hero-label'),
    heroFact: document.getElementById('hero-fact'),
    heroDate: document.getElementById('hero-date'),
    randomizeBtn: document.getElementById('randomize-btn'),
    picksGrid: document.getElementById('picks-grid'),
  };

  function hashString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededPick(arr, seedStr) {
    const rng = mulberry32(hashString(seedStr));
    return arr[Math.floor(rng() * arr.length)];
  }

  function truePick(arr, exclude) {
    const options = exclude ? arr.filter((f) => f.id !== exclude.id) : arr;
    const pool = options.length ? options : arr;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function factText(fact) {
    return state.lang === 'et' ? fact.et : fact.en;
  }

  function label(map, key) {
    const entry = map[key];
    if (!entry) return key;
    return entry[state.lang] || entry.en;
  }

  function filteredPool() {
    return state.pool.filter((f) => {
      if (state.category !== 'all' && f.category !== state.category) return false;
      if (state.tag !== 'all' && f.tag !== state.tag) return false;
      return true;
    });
  }

  function tagsForCategory(category) {
    if (category === 'all') return [];
    const tags = new Set();
    state.pool.forEach((f) => {
      if (f.category === category) tags.add(f.tag);
    });
    return Array.from(tags);
  }

  function todaysPicks() {
    if (!state.daily) return [];
    const byId = new Map(state.pool.map((f) => [f.id, f]));
    return state.daily.factIds.map((id) => byId.get(id)).filter(Boolean);
  }

  function filteredDailyPicks() {
    return todaysPicks().filter((f) => {
      if (state.category !== 'all' && f.category !== state.category) return false;
      if (state.tag !== 'all' && f.tag !== state.tag) return false;
      return true;
    });
  }

  function chooseHeroForFilter() {
    const matchingDaily = filteredDailyPicks();
    if (matchingDaily.length) {
      state.heroFact = matchingDaily[0];
      state.heroIsRandom = false;
      return;
    }
    const pool = filteredPool();
    if (pool.length) {
      const seed = `${state.daily ? state.daily.date : 'no-date'}|${state.category}|${state.tag}`;
      state.heroFact = seededPick(pool, seed);
      state.heroIsRandom = false;
      return;
    }
    state.heroFact = null;
  }

  function renderLangToggle() {
    el.langToggle.setAttribute('aria-pressed', state.lang === 'et' ? 'true' : 'false');
  }

  function renderFilters() {
    el.categoryFilters.innerHTML = '';
    Object.keys(CATEGORY_LABELS).forEach((key) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (state.category === key ? ' active' : '');
      btn.textContent = label(CATEGORY_LABELS, key);
      btn.addEventListener('click', () => onCategorySelect(key));
      el.categoryFilters.appendChild(btn);
    });

    const tags = tagsForCategory(state.category);
    if (tags.length > 1) {
      el.tagFilters.hidden = false;
      el.tagFilters.innerHTML = '';
      ['all', ...tags].forEach((key) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip' + (state.tag === key ? ' active' : '');
        btn.textContent = label(TAG_LABELS, key);
        btn.addEventListener('click', () => onTagSelect(key));
        el.tagFilters.appendChild(btn);
      });
    } else {
      el.tagFilters.hidden = true;
      el.tagFilters.innerHTML = '';
    }
  }

  function renderHero() {
    if (!state.heroFact) {
      el.heroBadge.textContent = '—';
      el.heroFact.textContent =
        state.lang === 'et'
          ? 'Selle filtri jaoks fakte ei leitud.'
          : 'No facts found for this filter.';
      el.heroLabel.textContent = '';
      el.heroDate.textContent = '';
      return;
    }
    const fact = state.heroFact;
    el.heroBadge.textContent = `${label(CATEGORY_LABELS, fact.category)} · ${label(TAG_LABELS, fact.tag)}`;
    el.heroFact.textContent = factText(fact);
    el.heroLabel.textContent = state.heroIsRandom
      ? state.lang === 'et' ? '🎲 Juhuslik valik' : '🎲 Random pick'
      : state.lang === 'et' ? '📅 Tänane fakt' : '📅 Today’s fact';
    el.heroDate.textContent = state.daily ? state.daily.date : '';
  }

  function renderPicks() {
    const picks = todaysPicks();
    el.picksGrid.innerHTML = '';
    if (!picks.length) {
      const p = document.createElement('p');
      p.className = 'loading-text';
      p.textContent = state.lang === 'et' ? 'Fakte ei leitud.' : 'No facts found.';
      el.picksGrid.appendChild(p);
      return;
    }
    picks.forEach((fact) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'pick-card' + (state.heroFact && state.heroFact.id === fact.id ? ' active' : '');
      const dim = state.category !== 'all' && fact.category !== state.category
        ? true
        : state.tag !== 'all' && fact.tag !== state.tag;
      if (dim) card.style.opacity = '0.45';

      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = label(CATEGORY_LABELS, fact.category);

      const text = document.createElement('p');
      text.textContent = factText(fact);

      card.appendChild(badge);
      card.appendChild(text);
      card.addEventListener('click', () => {
        state.heroFact = fact;
        state.heroIsRandom = false;
        renderAll();
        el.heroCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      el.picksGrid.appendChild(card);
    });
  }

  function renderAll() {
    renderLangToggle();
    renderFilters();
    renderHero();
    renderPicks();
  }

  function onCategorySelect(key) {
    state.category = key;
    state.tag = 'all';
    localStorage.setItem(STORAGE_KEYS.category, key);
    localStorage.setItem(STORAGE_KEYS.tag, 'all');
    chooseHeroForFilter();
    renderAll();
  }

  function onTagSelect(key) {
    state.tag = key;
    localStorage.setItem(STORAGE_KEYS.tag, key);
    chooseHeroForFilter();
    renderAll();
  }

  function onRandomize() {
    const pool = filteredPool();
    if (!pool.length) return;
    state.heroFact = truePick(pool, state.heroFact);
    state.heroIsRandom = true;
    renderHero();
    renderPicks();
  }

  function onLangToggle() {
    state.lang = state.lang === 'en' ? 'et' : 'en';
    localStorage.setItem(STORAGE_KEYS.lang, state.lang);
    renderAll();
  }

  async function loadData() {
    const [poolRes, dailyRes] = await Promise.all([
      fetch('data/facts-pool.json', { cache: 'no-store' }),
      fetch('data/daily.json', { cache: 'no-store' }),
    ]);
    const poolJson = await poolRes.json();
    state.pool = poolJson.pool;
    state.daily = await dailyRes.json();
  }

  async function init() {
    // Validate persisted filter selections still exist in the data.
    if (!CATEGORY_LABELS[state.category]) state.category = 'all';

    el.langToggle.addEventListener('click', onLangToggle);
    el.randomizeBtn.addEventListener('click', onRandomize);

    try {
      await loadData();
    } catch (err) {
      el.heroFact.textContent = 'Could not load facts. Please refresh the page.';
      console.error(err);
      return;
    }

    if (!tagsForCategory(state.category).includes(state.tag)) {
      state.tag = 'all';
    }

    chooseHeroForFilter();
    renderAll();
  }

  init();
})();
