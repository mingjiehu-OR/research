/* Optional, consent-gated GA4 for the research homepage. No remote tag before opt-in. */
(() => {
  'use strict';

  const measurementId = 'G-96EXSX3T07';
  const storageKey = 'mingjiehu-research.analytics-consent.v1';
  const choiceLifetime = 180 * 24 * 60 * 60 * 1000;
  const cookiePrefix = 'mh_research';
  const cookiePath = '/research/';
  const canonicalUrl = 'https://mingjiehu-or.github.io/research/';
  const production = location.protocol === 'https:' &&
    location.hostname === 'mingjiehu-or.github.io' &&
    (location.pathname === cookiePath || location.pathname === cookiePath + 'index.html');
  const notice = document.getElementById('analytics-notice');
  const settings = document.getElementById('analytics-settings');
  const allow = document.getElementById('analytics-allow');
  const decline = document.getElementById('analytics-decline');
  const status = document.getElementById('analytics-status');
  if (!notice || !settings || !allow || !decline || !status) return;

  let initialized = false;
  let openedFromSettings = false;
  let currentChoice = readChoice();
  window['ga-disable-' + measurementId] = true;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  function readChoice() {
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = JSON.parse(raw);
      const age = Date.now() - saved?.time;
      if (saved?.version === 1 && ['granted', 'denied'].includes(saved.choice) &&
          Number.isFinite(age) && age >= 0 && age < choiceLifetime) {
        // Never trust an old grant in read-only storage: withdrawal must remain possible.
        if (saved.choice === 'granted') localStorage.setItem(storageKey, raw);
        return saved.choice;
      }
    } catch (_) { /* Unavailable storage means no remembered consent. */ }
    return null;
  }

  function remember(choice) {
    currentChoice = choice;
    try {
      localStorage.setItem(storageKey, JSON.stringify({version: 1, choice, time: Date.now()}));
      return true;
    } catch (_) {
      if (choice === 'denied') {
        try {
          localStorage.removeItem(storageKey);
          return localStorage.getItem(storageKey) === null;
        } catch (_) { /* Keep collection disabled even if storage is read-only. */ }
      }
      return false;
    }
  }

  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith(cookiePrefix + '_')) {
        document.cookie = name + '=; Max-Age=0; Path=' + cookiePath + '; SameSite=Lax; Secure';
      }
    });
  }

  function referrerOrigin() {
    try {
      const referrer = new URL(document.referrer);
      return ['http:', 'https:'].includes(referrer.protocol) ? referrer.origin + '/' : '';
    } catch (_) { return ''; }
  }

  function startAnalytics() {
    if (!production || currentChoice !== 'granted') return;
    window['ga-disable-' + measurementId] = false;
    if (initialized) return;
    initialized = true;
    gtag('consent', 'update', {analytics_storage: 'granted'});
    gtag('js', new Date());
    gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: canonicalUrl,
      page_referrer: referrerOrigin(),
      cookie_domain: 'none',
      cookie_path: cookiePath,
      cookie_prefix: cookiePrefix,
      cookie_expires: 90 * 24 * 60 * 60,
      cookie_update: false,
      cookie_flags: 'SameSite=Lax;Secure'
    });
    const script = document.createElement('script');
    script.id = 'research-google-analytics';
    script.async = true;
    script.referrerPolicy = 'origin';
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);
  }

  function updateStatus() {
    status.textContent = currentChoice === 'granted' ? '(allowed)' : '(off)';
  }

  function closeNotice() {
    notice.hidden = true;
    updateStatus();
    if (openedFromSettings) settings.focus();
    openedFromSettings = false;
  }

  allow.addEventListener('click', () => {
    remember('granted');
    startAnalytics();
    closeNotice();
  });

  decline.addEventListener('click', () => {
    // Disable first; reload after withdrawal removes the already-loaded tag and its timers.
    window['ga-disable-' + measurementId] = true;
    const safelyRemembered = remember('denied');
    clearAnalyticsCookies();
    closeNotice();
    if (initialized && safelyRemembered) location.reload();
    if (!safelyRemembered) status.textContent = '(off; browser could not save this choice)';
  });

  function showSettings() {
    openedFromSettings = true;
    notice.hidden = false;
    decline.focus();
  }
  settings.hidden = false;
  settings.addEventListener('click', showSettings);
  window.addEventListener('hashchange', () => {
    if (location.hash === '#analytics-settings') showSettings();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    currentChoice = readChoice();
    if (currentChoice !== 'granted') {
      window['ga-disable-' + measurementId] = true;
      clearAnalyticsCookies();
      if (initialized) location.reload();
      else notice.hidden = currentChoice !== null;
    } else {
      startAnalytics();
      notice.hidden = true;
    }
    updateStatus();
  });

  if (currentChoice === 'granted') startAnalytics();
  else clearAnalyticsCookies();
  notice.hidden = currentChoice !== null;
  updateStatus();
  if (location.hash === '#analytics-settings') showSettings();
})();
