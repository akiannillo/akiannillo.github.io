/* ---------------------------------------------------------------------------
   Collaborative gift pages -- progressive enhancement only.

   The page is already correct and usable with this file blocked: progress bars
   are rendered by Jekyll at build time, the PayPal/Revolut links work without
   an amount, and <noscript> blocks cover the bits that genuinely need script.
   Everything here is optional polish on top of that:

     - carries the chosen amount into the PayPal link and the mailto: body
     - assembles the IBAN from base64 parts on request
     - copy-to-clipboard buttons
     - opens the right panel when the page is opened on a #give-<id> link

   No dependencies, no third-party calls, no storage, no cookies.
   --------------------------------------------------------------------------- */

(function () {
  'use strict';

  var root = document.querySelector('.gifts');
  var configEl = document.getElementById('gifts-config');
  if (!root || !configEl) { return; }

  var cfg;
  try {
    cfg = JSON.parse(configEl.textContent);
  } catch (e) {
    return; // leave the no-JS rendering exactly as the server sent it
  }

  // Reveal controls that are useless without script (copy buttons, IBAN
  // toggle). The class is removed rather than overridden in CSS so this does
  // not depend on `display: revert`.
  root.classList.add('gifts--js');
  Array.prototype.forEach.call(root.querySelectorAll('.js-only'), function (el) {
    el.classList.remove('js-only');
  });

  var money = function (value) {
    try {
      return new Intl.NumberFormat(cfg.lang === 'it' ? 'it-IT' : 'en-IE', {
        style: 'currency',
        currency: cfg.currency || 'EUR'
      }).format(value);
    } catch (e) {
      return (cfg.currency || 'EUR') + ' ' + value.toFixed(2);
    }
  };

  // mailto: bodies must use %20, not the "+" that encodeURIComponent leaves for
  // spaces in some clients' parsing of the query string.
  var mailtoEncode = function (s) {
    return encodeURIComponent(s).replace(/%20/g, '%20').replace(/\+/g, '%2B');
  };

  var iban = function () {
    var parts = cfg.ibanParts || [];
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      try { out += atob(parts[i]); } catch (e) { return ''; }
    }
    return out;
  };

  var groupIban = function (value) {
    return value.replace(/(.{4})/g, '$1 ').trim();
  };

  var copyText = function (text, button) {
    var done = function (ok) {
      var original = cfg.t.copy;
      button.textContent = ok ? cfg.t.copied : cfg.t.copyFailed;
      button.classList.toggle('is-done', ok);
      window.setTimeout(function () {
        button.textContent = original;
        button.classList.remove('is-done');
      }, 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      return;
    }

    // Fallback for non-secure contexts (plain http previews).
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    done(ok);
  };

  var panels = root.querySelectorAll('[data-gift]');

  Array.prototype.forEach.call(panels, function (panel) {
    var giftName = panel.getAttribute('data-gift-name') || '';
    var reference = panel.getAttribute('data-reference') || '';
    var radios = panel.querySelectorAll('input[type="radio"]');
    var otherRadio = panel.querySelector('[data-amount-other-radio]');
    var otherInput = panel.querySelector('[data-amount-input]');
    var paypalLink = panel.querySelector('[data-paypal]');
    var revolutLink = panel.querySelector('[data-revolut]');
    var confirmLink = panel.querySelector('[data-confirm-link]');
    var confirmName = panel.querySelector('[data-confirm-name]');
    var confirmAnon = panel.querySelector('[data-confirm-anon]');
    var confirmAmount = panel.querySelector('[data-confirm-amount]');

    var currentAmount = function () {
      var checked = panel.querySelector('input[type="radio"]:checked');
      if (!checked) { return null; }
      if (checked.value === 'other') {
        var v = parseFloat(otherInput && otherInput.value);
        return isFinite(v) && v > 0 ? v : null;
      }
      var p = parseFloat(checked.value);
      return isFinite(p) && p > 0 ? p : null;
    };

    var refresh = function () {
      var amount = currentAmount();

      if (paypalLink) {
        paypalLink.href = amount
          ? 'https://paypal.me/' + cfg.paypal + '/' + amount.toFixed(2) + (cfg.currency || 'EUR')
          : 'https://paypal.me/' + cfg.paypal;
      }

      // revolut.me reads amount/currency/note from the query string. These
      // parameters are undocumented -- they were read off the site's own
      // bundle, then confirmed by hand. The amount is in MINOR units, so
      // amount=2550 is EUR 25.50; it is parsed with parseInt, which is why it
      // must be a whole number of cents.
      if (revolutLink) {
        var note = 'note=' + encodeURIComponent(reference);
        var cents = amount ? Math.round(amount * 100) : 0;
        revolutLink.href = cents > 0
          ? 'https://revolut.me/' + cfg.revolut + '?amount=' + cents +
            '&currency=' + (cfg.currency || 'EUR') + '&' + note
          : 'https://revolut.me/' + cfg.revolut + '?' + note;
      }

      if (confirmAmount) {
        confirmAmount.textContent = amount ? money(amount) : '\u2014';
      }

      if (confirmLink) {
        var name = (confirmName && confirmName.value.trim()) || '';
        var body = cfg.t.bodyTemplate
          .replace('%GIFT%', giftName)
          .replace('%AMOUNT%', amount ? money(amount) : '')
          .replace('%NAME%', name);
        if (confirmAnon && confirmAnon.checked) { body += cfg.t.bodyAnon; }
        confirmLink.href = 'mailto:' + cfg.email +
          '?subject=' + mailtoEncode(cfg.t.subject.replace('%GIFT%', giftName)) +
          '&body=' + mailtoEncode(body);
      }
    };

    Array.prototype.forEach.call(radios, function (r) {
      r.addEventListener('change', refresh);
    });

    if (otherInput) {
      otherInput.addEventListener('input', function () {
        if (otherRadio && otherInput.value !== '') { otherRadio.checked = true; }
        refresh();
      });
      otherInput.addEventListener('focus', function () {
        if (otherRadio && otherInput.value !== '') { otherRadio.checked = true; refresh(); }
      });
    }

    if (confirmName) { confirmName.addEventListener('input', refresh); }
    if (confirmAnon) { confirmAnon.addEventListener('change', refresh); }

    // IBAN is only assembled when the visitor actually asks for it.
    var reveal = panel.querySelector('[data-iban-reveal]');
    var bank = reveal && document.getElementById(reveal.getAttribute('aria-controls'));
    if (reveal && bank) {
      reveal.addEventListener('click', function () {
        var slot = bank.querySelector('[data-iban-slot]');
        if (slot && !slot.textContent) { slot.textContent = groupIban(iban()); }
        var open = bank.hasAttribute('hidden');
        if (open) { bank.removeAttribute('hidden'); } else { bank.setAttribute('hidden', ''); }
        reveal.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    Array.prototype.forEach.call(panel.querySelectorAll('[data-copy]'), function (button) {
      button.addEventListener('click', function () {
        var what = button.getAttribute('data-copy');
        var text = what === 'iban' ? iban()
                 : what === 'holder' ? cfg.holder
                 : reference;
        copyText(text, button);
      });
    });

    refresh();
  });

  // Opening the page on a #give-<id> link should show that panel already open.
  var openFromHash = function () {
    var hash = window.location.hash;
    if (!hash || hash.indexOf('#give-') !== 0) { return; }
    var target = document.getElementById(hash.slice(1));
    if (target && target.tagName.toLowerCase() === 'details') {
      target.open = true;
      target.scrollIntoView({ block: 'start' });
    }
  };

  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
