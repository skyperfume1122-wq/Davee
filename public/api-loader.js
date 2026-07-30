/**
 * HÜFEL Data Injection Script
 * Loads all content from the API and patches the static Next.js page
 */
(async function() {
  'use strict';

  // Global state for favorites and compare
  window.__hufelState = {
    favorites: JSON.parse(localStorage.getItem('hufel_favorites') || '[]'),
    compare: JSON.parse(localStorage.getItem('hufel_compare') || '[]'),
    products: [],
    listeners: []
  };

  function notifyState() {
    var state = window.__hufelState;
    localStorage.setItem('hufel_favorites', JSON.stringify(state.favorites));
    localStorage.setItem('hufel_compare', JSON.stringify(state.compare));
    state.listeners.forEach(function(fn) { fn(state); });
    updateHeaderBadges();
  }

  window.toggleFavorite = function(productId) {
    var state = window.__hufelState;
    var idx = state.favorites.indexOf(productId);
    if (idx > -1) state.favorites.splice(idx, 1);
    else state.favorites.push(productId);
    notifyState();
  };

  window.toggleCompare = function(productId) {
    var state = window.__hufelState;
    var idx = state.compare.indexOf(productId);
    if (idx > -1) state.compare.splice(idx, 1);
    else {
      if (state.compare.length >= 4) return alert('Max 4 products for comparison');
      state.compare.push(productId);
    }
    notifyState();
  };

  function updateHeaderBadges() {
    var state = window.__hufelState;
    document.querySelectorAll('.lucide-heart').forEach(function(icon) {
      var parent = icon.parentElement;
      if (parent) {
        var badge = parent.querySelector('.badge-count');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'badge-count';
          badge.style.cssText = 'position:absolute;top:-2px;right:-2px;background:var(--accent);color:#000;font-size:9px;font-weight:700;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;';
          parent.style.position = 'relative';
          parent.appendChild(badge);
        }
        badge.textContent = state.favorites.length;
        badge.style.display = state.favorites.length > 0 ? 'flex' : 'none';
      }
    });
    document.querySelectorAll('.lucide-git-compare-arrows').forEach(function(icon) {
      var parent = icon.parentElement;
      if (parent) {
        var badge = parent.querySelector('.badge-count');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'badge-count';
          badge.style.cssText = 'position:absolute;top:-2px;right:-2px;background:var(--accent);color:#000;font-size:9px;font-weight:700;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;';
          parent.style.position = 'relative';
          parent.appendChild(badge);
        }
        badge.textContent = state.compare.length;
        badge.style.display = state.compare.length > 0 ? 'flex' : 'none';
      }
    });
  }

  function findElByText(text, tag) {
    if (tag === undefined) tag = '*';
    var elements = document.querySelectorAll(tag);
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].textContent.trim() === text.trim()) return elements[i];
    }
    return null;
  }

  function replaceTextContaining(oldText, newText) {
    if (!newText) return 0;
    var count = 0;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (node.textContent.indexOf(oldText.trim()) !== -1) nodes.push(node);
    }
    nodes.forEach(function(node) { node.textContent = newText; count++; });
    return count;
  }

  function loadGoogleFont(primary, display) {
    var families = [];
    if (primary && primary !== 'Inter') families.push('family=' + primary.replace(/ /g, '+') + ':wght@300;400;500;600;700');
    if (display && display !== 'Cormorant Garamond' && display !== 'Antrian') families.push('family=' + display.replace(/ /g, '+') + ':ital,wght@0,400;0,500;0,600;0,700;1,400');
    if (families.length === 0) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?' + families.join('&') + '&display=swap';
    document.head.appendChild(link);
  }

  function safeImg(src, alt, cls) {
    if (cls === undefined) cls = 'w-full h-full object-cover';
    if (!src) return '<div class="' + cls + ' flex items-center justify-center" style="background:var(--bg-card);color:var(--muted2);font-size:12px;">No image</div>';
    return '<img src="' + src + '" alt="' + (alt || '') + '" class="' + cls + '" loading="lazy" onerror="this.onerror=null;this.parentNode.innerHTML=\'<div class=\\\'' + cls + ' flex items-center justify-center\\\' style=\\\'background:var(--bg-card);color:var(--muted2);font-size:12px;\\\'>No image</div>\'">';
  }

  // ========================
  // PRODUCTS PAGE MODAL
  // ========================
  function showProductsPage(category) {
    var state = window.__hufelState;
    var prods = state.products;
    if (category) prods = prods.filter(function(p) { return p.category === category; });
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;overflow-y:auto;background:rgba(0,0,0,0.85);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);';
    overlay.innerHTML =
      '<div style="min-height:100vh;padding:32px 16px">' +
      '<div style="max-width:1280px;margin:0 auto">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px">' +
      '<h2 style="font-family:var(--font-display,\'Cormorant Garamond\',serif);font-size:2rem;color:white">' + (category || 'All Products') + '</h2>' +
      '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="color:rgba(255,255,255,0.6);background:none;border:none;cursor:pointer;padding:4px">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
      '</button></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">' +
      prods.map(function(p) {
        var isFav = state.favorites.indexOf(p.id) > -1;
        var isComp = state.compare.indexOf(p.id) > -1;
        return '<div style="border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);background:var(--bg-card,#181716)">' +
          '<div style="position:relative;aspect-ratio:1;overflow:hidden;background:var(--bg-card2,#1f1d1b)">' +
          safeImg(p.image_url, p.title_en, 'w-full h-full object-cover transition-transform duration-500 group-hover:scale-105') +
          '<div style="position:absolute;top:8px;right:8px;display:flex;gap:4px">' +
          '<button onclick="event.stopPropagation();window.toggleFavorite(' + p.id + ')" style="width:32px;height:32px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(0,0,0,0.5)">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="' + (isFav ? '#c8a45c' : 'none') + '" stroke="' + (isFav ? '#c8a45c' : 'white') + '" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>' +
          '</button>' +
          '<button onclick="event.stopPropagation();window.toggleCompare(' + p.id + ')" style="width:32px;height:32px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(0,0,0,0.5)">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="' + (isComp ? '#c8a45c' : 'none') + '" stroke="' + (isComp ? '#c8a45c' : 'white') + '" stroke-width="2"><circle cx="5" cy="6" r="3"/><path d="M12 6h5a2 2 0 0 1 2 2v7"/><path d="m15 9-3-3 3-3"/><circle cx="19" cy="18" r="3"/><path d="M12 18H7a2 2 0 0 1-2-2V9"/><path d="m9 15 3 3-3 3"/></svg>' +
          '</button></div>' +
          (p.is_new ? '<span style="position:absolute;top:8px;left:8px;padding:2px 8px;font-size:10px;border-radius:999px;font-weight:600;background:#c8a45c;color:#000">NEW</span>' : '') +
          '</div>' +
          '<div style="padding:12px">' +
          '<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#c8a45c">' + (p.category || '') + '</div>' +
          '<div style="font-family:var(--font-display,\'Cormorant Garamond\',serif);font-size:14px;font-weight:500;color:white;margin-top:2px">' + (p.title_en || '') + '</div>' +
          '<div style="font-size:11px;color:#8a8783;margin-top:2px">' + (p.finish || '') + '</div>' +
          '<div style="font-size:10px;margin-top:4px;font-family:monospace;color:#6b6965">' + (p.code || '') + '</div>' +
          '</div></div>';
      }).join('') +
      '</div></div></div>';
    document.body.appendChild(overlay);
  }

  function showFavorites() {
    var state = window.__hufelState;
    var favProducts = state.products.filter(function(p) { return state.favorites.indexOf(p.id) > -1; });
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;overflow-y:auto;background:rgba(0,0,0,0.85);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);';
    overlay.innerHTML =
      '<div style="min-height:100vh;padding:32px 16px">' +
      '<div style="max-width:1024px;margin:0 auto">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px">' +
      '<h2 style="font-family:var(--font-display,\'Cormorant Garamond\',serif);font-size:2rem;color:white">Favorites (' + favProducts.length + ')</h2>' +
      '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="color:rgba(255,255,255,0.6);background:none;border:none;cursor:pointer;padding:4px">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
      '</button></div>' +
      (favProducts.length === 0 ?
        '<div style="text-align:center;padding:80px 0"><p style="color:rgba(255,255,255,0.4);font-size:1.2rem">No favorites yet</p></div>' :
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px">' +
        favProducts.map(function(p) {
          return '<div style="border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);background:var(--bg-card,#181716)">' +
            '<div style="position:relative;aspect-ratio:1;overflow:hidden;background:var(--bg-card2,#1f1d1b)">' +
            safeImg(p.image_url, p.title_en) +
            '<button onclick="event.stopPropagation();window.toggleFavorite(' + p.id + ');this.closest(\'[style*=\"border-radius\"]\').remove()" style="position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(0,0,0,0.5)">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#c8a45c" stroke="#c8a45c" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>' +
            '</button></div>' +
            '<div style="padding:12px"><div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#c8a45c">' + (p.category || '') + '</div>' +
            '<div style="font-family:var(--font-display,\'Cormorant Garamond\',serif);font-size:14px;font-weight:500;color:white">' + (p.title_en || '') + '</div></div></div>';
        }).join('') +
        '</div>') +
      '</div></div>';
    document.body.appendChild(overlay);
  }

  function showCompare() {
    var state = window.__hufelState;
    var compProducts = state.products.filter(function(p) { return state.compare.indexOf(p.id) > -1; });
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;overflow-y:auto;background:rgba(0,0,0,0.85);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);';
    overlay.innerHTML =
      '<div style="min-height:100vh;padding:32px 16px">' +
      '<div style="max-width:1200px;margin:0 auto">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px">' +
      '<h2 style="font-family:var(--font-display,\'Cormorant Garamond\',serif);font-size:2rem;color:white">Compare Products (' + compProducts.length + '/4)</h2>' +
      '<button onclick="this.parentElement.parentElement.parentElement.remove()" style="color:rgba(255,255,255,0.6);background:none;border:none;cursor:pointer;padding:4px">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
      '</button></div>' +
      (compProducts.length === 0 ?
        '<div style="text-align:center;padding:80px 0"><p style="color:rgba(255,255,255,0.4);font-size:1.2rem">No products to compare</p></div>' :
        '<div style="display:grid;grid-template-columns:repeat(' + Math.min(compProducts.length, 4) + ',1fr);gap:16px">' +
        compProducts.map(function(p) {
          return '<div style="border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);background:var(--bg-card,#181716)">' +
            '<div style="position:relative;aspect-ratio:1;overflow:hidden;background:var(--bg-card2,#1f1d1b)">' +
            safeImg(p.image_url, p.title_en) +
            '<button onclick="event.stopPropagation();window.toggleCompare(' + p.id + ');location.reload()" style="position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(0,0,0,0.5)">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
            '</button></div>' +
            '<div style="padding:16px;display:flex;flex-direction:column;gap:8px">' +
            '<div style="font-family:var(--font-display,\'Cormorant Garamond\',serif);font-size:1.2rem;color:white">' + (p.title_en || '') + '</div>' +
            '<div style="font-size:12px;color:#6b6965"><strong>Code:</strong> ' + (p.code || '—') + '</div>' +
            '<div style="font-size:12px;color:#6b6965"><strong>Category:</strong> ' + (p.category || '—') + '</div>' +
            '<div style="font-size:12px;color:#6b6965"><strong>Finish:</strong> ' + (p.finish || '—') + '</div>' +
            '<div style="font-size:12px;color:#6b6965"><strong>Collection:</strong> ' + (p.collection || '—') + '</div>' +
            (p.description_en ? '<p style="font-size:12px;color:#8a8783;line-height:1.4">' + p.description_en.substring(0, 100) + (p.description_en.length > 100 ? '...' : '') + '</p>' : '') +
            '</div></div>';
        }).join('') +
        '</div>') +
      '</div></div>';
    document.body.appendChild(overlay);
  }

  function setupHeaderButtons() {
    document.querySelectorAll('header button, header .link-underline, nav button, nav .link-underline').forEach(function(btn) {
      var text = btn.textContent.trim();
      if ((text === 'Products' || text === 'محصولات') && !btn.getAttribute('data-hufel-bound')) {
        btn.setAttribute('data-hufel-bound', '1');
        btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); showProductsPage(); });
      }
    });
    document.querySelectorAll('.lucide-heart').forEach(function(icon) {
      var parent = icon.closest('button');
      if (parent && !parent.getAttribute('data-hufel-fav')) {
        parent.setAttribute('data-hufel-fav', '1');
        parent.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); showFavorites(); });
      }
    });
    document.querySelectorAll('.lucide-git-compare-arrows').forEach(function(icon) {
      var parent = icon.closest('button');
      if (parent && !parent.getAttribute('data-hufel-compare')) {
        parent.setAttribute('data-hufel-compare', '1');
        parent.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); showCompare(); });
      }
    });
    updateHeaderBadges();
  }

  try {
    await new Promise(function(resolve) {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve);
    });
    await new Promise(function(resolve) {
      var waited = 0;
      var check = setInterval(function() {
        waited += 200;
        var marquee = document.querySelector('.animate-marquee');
        if ((marquee && marquee.children.length > 0) || waited > 8000) {
          clearInterval(check);
          setTimeout(resolve, 500);
        }
      }, 200);
    });

    var data = await Promise.all([
      fetch('/api/settings').then(function(r) { return r.json(); }).catch(function() { return {}; }),
      fetch('/api/products').then(function(r) { return r.json(); }).catch(function() { return []; }),
      fetch('/api/settings/songs').then(function(r) { return r.json(); }).catch(function() { return []; }),
      fetch('/api/representatives').then(function(r) { return r.json(); }).catch(function() { return []; }),
      fetch('/api/beforeafter').then(function(r) { return r.json(); }).catch(function() { return []; }),
      fetch('/api/journal').then(function(r) { return r.json(); }).catch(function() { return []; })
    ]);
    var settings = data[0], products = data[1], songs = data[2], reps = data[3], beforeAfter = data[4], posts = data[5];

    window.__hufelState.products = products;

    // 1. THEME COLORS
    var themeKeys = ['accent','accent-soft','bg','bg-soft','fg','muted','muted2','line','card','card2'];
    var themeVars = ['accent','accent_soft','bg','bg_soft','fg','muted','muted2','line','card','card2'];
    for (var t = 0; t < themeKeys.length; t++) {
      var val = settings['theme_' + themeVars[t]];
      if (val) document.documentElement.style.setProperty('--' + themeKeys[t], val);
    }
    // Fallback: ensure muted2 is set
    if (!settings.theme_muted2 && settings.theme_muted) {
      document.documentElement.style.setProperty('--muted2', settings.theme_muted);
    }

    // Load custom fonts from settings
    if (settings.font_primary || settings.font_display) {
      loadGoogleFont(settings.font_primary, settings.font_display);
    }

    // 2. TAGLINE
    if (settings.site_tagline_en) {
      document.querySelectorAll('.font-antrian').forEach(function(el) {
        if (el.textContent.indexOf('Signature') !== -1 || el.classList.contains('text-2xl')) el.textContent = settings.site_tagline_en;
      });
    }

    // 3. HERO
    if (settings.hero_kicker_en) replaceTextContaining('Luxury Hardware', settings.hero_kicker_en);
    if (settings.hero_subtitle_en) replaceTextContaining('Premium hardware', settings.hero_subtitle_en);
    if (settings.hero_video) {
      var video = document.querySelector('video source');
      if (video && video.src.indexOf('VID-20260705') !== -1) { video.src = settings.hero_video; video.parentElement.load(); }
    }

    // 4. CONTACT
    if (settings.contact_phone) {
      document.querySelectorAll('.lucide-phone').forEach(function(icon) {
        var parent = icon.closest('[class*="flex"]');
        if (parent) { for (var n = 0; n < parent.childNodes.length; n++) { if (parent.childNodes[n].nodeType === 3 && parent.childNodes[n].textContent.indexOf('+49') !== -1) parent.childNodes[n].textContent = ' ' + settings.contact_phone; } }
      });
    }
    if (settings.contact_email) {
      document.querySelectorAll('.lucide-mail').forEach(function(icon) {
        var parent = icon.closest('[class*="flex"]');
        if (parent) { for (var n = 0; n < parent.childNodes.length; n++) { if (parent.childNodes[n].nodeType === 3 && parent.childNodes[n].textContent.indexOf('@') !== -1) parent.childNodes[n].textContent = ' ' + settings.contact_email; } }
      });
    }
    if (settings.contact_cities) {
      document.querySelectorAll('.lucide-map-pin').forEach(function(icon) {
        var parent = icon.closest('[class*="flex"]');
        if (parent) { for (var n = 0; n < parent.childNodes.length; n++) { if (parent.childNodes[n].nodeType === 3 && parent.childNodes[n].textContent.indexOf('Berlin') !== -1) parent.childNodes[n].textContent = ' ' + settings.contact_cities; } }
      });
    }

    // 5. STATS
    if (settings.stats_years) {
      var els = document.querySelectorAll('.font-display.text-5xl, .gold-gradient.font-medium');
      if (els.length >= 4) {
        els[0].textContent = settings.stats_years;
        els[1].textContent = settings.stats_products || String(products.length) + '+';
        els[2].textContent = settings.stats_countries;
        els[3].textContent = settings.stats_satisfaction;
      }
    }

    // 6. MARQUEE
    if (settings.marquee_items) {
      var items = settings.marquee_items.split(',');
      var marqueeEls = document.querySelectorAll('.animate-marquee span');
      if (marqueeEls.length > 0) {
        var half = Math.floor(marqueeEls.length / 2);
        for (var i = 0; i < half && i < items.length; i++) {
          for (var n = 0; n < marqueeEls[i].childNodes.length; n++) { if (marqueeEls[i].childNodes[n].nodeType === 3) marqueeEls[i].childNodes[n].textContent = items[i]; }
          if (i + half < marqueeEls.length) {
            for (var n = 0; n < marqueeEls[i + half].childNodes.length; n++) { if (marqueeEls[i + half].childNodes[n].nodeType === 3) marqueeEls[i + half].childNodes[n].textContent = items[i]; }
          }
        }
      }
    }

    // 7. PRODUCTS - Featured & Categories
    if (products.length > 0) {
      // Featured products
      var featHeading = findElByText('Featured Products');
      if (featHeading) {
        var featGrid = featHeading.closest('section');
        if (featGrid) featGrid = featGrid.querySelector('.grid');
        if (featGrid) {
          featGrid.innerHTML = products.filter(function(p) { return p.is_featured; }).slice(0, 4).map(function(p) {
            var isFav = window.__hufelState.favorites.indexOf(p.id) > -1;
            var isComp = window.__hufelState.compare.indexOf(p.id) > -1;
            return '<div class="group cursor-pointer">' +
              '<div class="relative overflow-hidden rounded-lg border border-line aspect-[3/4] mb-3" style="background:var(--bg-card2)">' +
              safeImg(p.image_url, p.title_en, 'w-full h-full object-cover transition-transform duration-700 group-hover:scale-105') +
              '<div class="absolute top-2 right-2 flex flex-col gap-1">' +
              '<button onclick="event.stopPropagation();window.toggleFavorite(' + p.id + ')" class="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style="background:rgba(0,0,0,0.5);border:none;cursor:pointer">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="' + (isFav ? 'var(--accent)' : 'none') + '" stroke="' + (isFav ? 'var(--accent)' : 'white') + '" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>' +
              '</button>' +
              '<button onclick="event.stopPropagation();window.toggleCompare(' + p.id + ')" class="w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform" style="background:rgba(0,0,0,0.5);border:none;cursor:pointer">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="' + (isComp ? 'var(--accent)' : 'none') + '" stroke="' + (isComp ? 'var(--accent)' : 'white') + '" stroke-width="2"><circle cx="5" cy="6" r="3"/><path d="M12 6h5a2 2 0 0 1 2 2v7"/><path d="m15 9-3-3 3-3"/><circle cx="19" cy="18" r="3"/><path d="M12 18H7a2 2 0 0 1-2-2V9"/><path d="m9 15 3 3-3 3"/></svg>' +
              '</button></div>' +
              (p.is_new ? '<span class="absolute top-2 left-2 px-2 py-0.5 text-[10px] rounded-full font-medium" style="background:var(--accent);color:#000;">NEW</span>' : '') +
              (p.is_best_seller ? '<span class="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] rounded-full bg-white/20 text-white">BEST</span>' : '') +
              '</div>' +
              '<div class="px-1"><div class="text-xs tracking-wider uppercase" style="color:var(--accent)">' + (p.category || '') + '</div>' +
              '<div class="font-display text-lg font-medium mt-0.5">' + (p.title_en || '') + '</div>' +
              '<div class="text-xs mt-0.5" style="color:var(--muted)">' + (p.finish || '') + '</div></div></div>';
          }).join('');
        }
      }
      // Categories
      var catHeading = findElByText('Product Categories');
      if (catHeading) {
        var catGrid = catHeading.closest('section');
        if (catGrid) catGrid = catGrid.querySelector('.grid');
        if (catGrid) {
          var uniqueCats = [];
          var catMap = {};
          for (var i = 0; i < products.length; i++) {
            var cat = products[i].category;
            if (cat && !catMap[cat]) { catMap[cat] = true; uniqueCats.push(cat); }
          }
          catGrid.innerHTML = uniqueCats.map(function(cat) {
            return '<button class="group cursor-pointer relative overflow-hidden rounded-lg border border-line text-start block aspect-square" style="background:var(--bg-card2)" onclick="showProductsPage(\'' + cat.replace(/'/g, "\\'") + '\')">' +
              '<div class="absolute inset-0" style="background:linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)"></div>' +
              '<div class="absolute bottom-0 inset-inline-0 p-4">' +
              '<div class="font-display text-lg md:text-xl text-white">' + cat + '</div>' +
              '<div class="text-xs mt-0.5" style="color:var(--accent-soft)">' + products.filter(function(p) { return p.category === cat; }).length + ' products</div></div></button>';
          }).join('');
        }
      }
    }

    // 8. HEADER BUTTONS
    setupHeaderButtons();
    setTimeout(setupHeaderButtons, 2000);

    // 9. MUSIC
    if (songs.length > 0) {
      var song = songs[0];
      var audio = document.getElementById('hufel-audio');
      if (audio && song.file_url && audio.src.indexOf(song.file_url) === -1) {
        var wasPlaying = !audio.paused;
        audio.src = song.file_url;
        audio.load();
        if (wasPlaying) { try { audio.play(); } catch(e) {} }
      }
    }

    // 10. SITE NAME
    if (settings.site_name) {
      var titleTag = document.querySelector('title');
      if (titleTag) titleTag.textContent = settings.site_name;
    }
    if (settings.logo_url) {
      document.querySelectorAll('.logo-img, img[alt="Hüfel"]').forEach(function(img) {
        if (img.src.indexOf('hufel-logo') !== -1 || img.alt === 'Hüfel') img.src = settings.logo_url;
      });
    }

    // 11. BEFORE/AFTER
    if (beforeAfter.length > 0) {
      var lbGrid = document.querySelector('.grid-cols-2.md\\:grid-cols-4');
      if (!lbGrid) {
        var inspoH = findElByText('Inspiration & Lookbook');
        if (inspoH) { var sec = inspoH.closest('section'); if (sec) lbGrid = sec.querySelector('.grid'); }
      }
      if (lbGrid) {
        lbGrid.innerHTML = beforeAfter.map(function(item) {
          var before = item.before_image ? '<img src="' + item.before_image + '" alt="Before" class="absolute inset-0 w-full h-full object-cover" style="clip-path:inset(0 50% 0 0)" onerror="this.style.display=\'none\'">' : '';
          var after = item.after_image ? '<img src="' + item.after_image + '" alt="After" class="absolute inset-0 w-full h-full object-cover" style="clip-path:inset(0 0 0 50%)" onerror="this.style.display=\'none\'">' : '';
          return '<div class="ba-item" style="opacity:0;transform:translateY(34px)"><div class="relative w-full rounded-lg overflow-hidden border border-line block aspect-[3/4] group">' + before + after +
            '<div class="absolute top-2 left-2 px-2 py-0.5 text-[10px] rounded-full" style="background:rgba(0,0,0,0.6);color:white">Before</div>' +
            '<div class="absolute top-2 right-2 px-2 py-0.5 text-[10px] rounded-full" style="background:rgba(0,0,0,0.6);color:white">After</div>' +
            (item.title_en ? '<div class="absolute bottom-0 inset-inline-0 p-3 text-center text-sm font-medium text-white" style="background:linear-gradient(to top, rgba(0,0,0,0.8), transparent)">' + item.title_en + '</div>' : '') +
            '</div></div>';
        }).join('');
        setTimeout(function() {
          lbGrid.querySelectorAll('.ba-item').forEach(function(el, i) {
            setTimeout(function() { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; el.style.transition = 'all 0.6s ease'; }, i * 150);
          });
        }, 300);
      }
    }

    // 12. JOURNAL
    if (posts && posts.length > 0) {
      var jH = findElByText('The Hüfel Journal');
      if (jH) {
        var jSec = jH.closest('section');
        var jGrid = jSec ? jSec.querySelector('.grid') : null;
        if (jGrid) {
          jGrid.innerHTML = posts.map(function(p) {
            return '<div class="journal-item" style="opacity:0;transform:translateY(34px)"><div class="group rounded-lg overflow-hidden border border-line block text-start" style="background:var(--bg-card2)">' +
              '<div class="aspect-[16/10] overflow-hidden" style="background:var(--bg-card)">' + safeImg(p.image_url, p.title_en) + '</div>' +
              '<div class="p-5"><div class="text-xs uppercase tracking-wider mb-2" style="color:var(--accent)">' + (p.author || 'Hüfel Journal') + '</div>' +
              '<h3 class="font-display text-lg font-medium leading-tight">' + (p.title_en || '') + '</h3>' +
              (p.excerpt_en ? '<p class="text-sm mt-2" style="color:var(--muted2);line-height:1.5;">' + p.excerpt_en + '</p>' : '') +
              '</div></div></div>';
          }).join('');
          setTimeout(function() {
            jGrid.querySelectorAll('.journal-item').forEach(function(el, i) {
              setTimeout(function() { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; el.style.transition = 'all 0.6s ease'; }, i * 150);
            });
          }, 400);
        }
      }
    }

    console.log('✓ HÜFEL Data Injection complete');
  } catch (err) {
    console.warn('HÜFEL Data Injection warning:', err.message);
  }
})();
