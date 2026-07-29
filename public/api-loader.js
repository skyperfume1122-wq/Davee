/**
 * HÜFEL Data Injection Script
 * Loads all content from the API and patches the static Next.js page
 * Runs after page load and hydration
 */
(async function() {
  'use strict';

  // Helper: wait for element to exist in DOM
  function waitForEl(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const start = Date.now();
      function check() {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        if (Date.now() - start > timeout) return resolve(null);
        requestAnimationFrame(check);
      }
      check();
    });
  }

  // Helper: replace text content of elements containing a specific string
  function replaceTextContaining(oldText, newText) {
    if (!newText) return 0;
    var count = 0;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (node.textContent.indexOf(oldText.trim()) !== -1) {
        nodes.push(node);
      }
    }
    nodes.forEach(function(node) { node.textContent = newText; count++; });
    return count;
  }

  // Helper: find element by text content
  function findElByText(text, tag = '*') {
    const elements = document.querySelectorAll(tag);
    for (const el of elements) {
      if (el.textContent.trim() === text.trim()) return el;
    }
    return null;
  }

  // Helper: load Google Fonts dynamically
  function loadGoogleFont(primary, display) {
    const families = [];
    if (primary && !['Inter'].includes(primary)) {
      families.push(`family=${primary.replace(/ /g, '+')}:wght@300;400;500;600;700`);
    }
    if (display && !['Cormorant Garamond', 'Antrian'].includes(display)) {
      families.push(`family=${display.replace(/ /g, '+')}:ital,wght@0,400;0,500;0,600;0,700;1,400`);
    }
    if (families.length === 0) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
    document.head.appendChild(link);
  }

  try {
    // Wait for page to fully load and hydrate
    await new Promise(resolve => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve);
    });
    // Wait for Next.js hydration (poll for a known rendered element)
    await (function waitForHydration() {
      return new Promise(function(resolve) {
        var waited = 0;
        var check = setInterval(function() {
          waited += 200;
          // Check if the Next.js app has mounted by looking for React-managed DOM
          var marquee = document.querySelector('.animate-marquee');
          var main = document.querySelector('main[style*="opacity"]');
          if ((marquee && marquee.children.length > 0) || waited > 8000) {
            clearInterval(check);
            // Small extra delay to let animations start
            setTimeout(resolve, 500);
          }
        }, 200);
      });
    })();

    // ---- FETCH ALL DATA IN PARALLEL ----
    const [settings, products, songs, reps, beforeAfter, posts] = await Promise.all([
      fetch('/api/settings').then(r => r.json()).catch(() => ({})),
      fetch('/api/products').then(r => r.json()).catch(() => []),
      fetch('/api/settings/songs').then(r => r.json()).catch(() => []),
      fetch('/api/representatives').then(r => r.json()).catch(() => []),
      fetch('/api/beforeafter').then(r => r.json()).catch(() => []),
      fetch('/api/journal').then(r => r.json()).catch(() => [])
    ]);

    // ========================
    // 1. THEME COLORS
    // ========================
    const themeMap = {
      '--accent': settings.theme_accent,
      '--accent-soft': settings.theme_accent_soft,
      '--bg': settings.theme_bg,
      '--bg-soft': settings.theme_bg_soft,
      '--fg': settings.theme_fg,
      '--muted': settings.theme_muted,
      '--muted2': settings.theme_muted,
      '--line': settings.theme_line,
      '--card': settings.theme_card,
      '--card2': settings.theme_card,
    };
    for (const [prop, val] of Object.entries(themeMap)) {
      if (val) document.documentElement.style.setProperty(prop, val);
    }

    // Update meta theme-color
    if (settings.theme_bg) {
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.theme_bg);
    }

    // ========================
    // 2. FONTS
    // ========================
    if (settings.font_primary || settings.font_display) {
      loadGoogleFont(settings.font_primary, settings.font_display);
      // Update font-family on elements
      if (settings.font_primary) {
        document.documentElement.style.setProperty('--font-primary', settings.font_primary);
        document.body.style.fontFamily = `${settings.font_primary}, sans-serif`;
      }
      if (settings.font_display) {
        document.documentElement.style.setProperty('--font-display', settings.font_display);
        document.querySelectorAll('.font-display, [class*="font-display"]').forEach(el => {
          el.style.fontFamily = `"${settings.font_display}", serif`;
        });
      }
    }

    // ========================
    // 3. TAGLINE (splash screen)
    // ========================
    if (settings.site_tagline_en) {
      const taglineEls = document.querySelectorAll('.font-antrian');
      taglineEls.forEach(el => {
        if (el.textContent.includes('Signature') || el.classList.contains('text-2xl')) {
          el.textContent = settings.site_tagline_en;
        }
      });
    }

    // ========================
    // 4. HERO SECTION
    // ========================
    if (settings.hero_kicker_en) {
      replaceTextContaining('Luxury Hardware · European Engineering', settings.hero_kicker_en);
    }
    if (settings.hero_subtitle_en) {
      // Use the HTML-encoded version (&amp;) to match the minified HTML
      replaceTextContaining(
        'Premium hardware &amp; fittings for kitchens and cabinetry built to last a lifetime. Designed for perfection.',
        settings.hero_subtitle_en
      );
    }
    if (settings.hero_video) {
      const video = document.querySelector('video source');
      if (video && video.src.includes('VID-20260705')) {
        video.src = settings.hero_video;
        video.parentElement.load();
      }
    }

    // ========================
    // 5. CONTACT INFO
    // ========================
    if (settings.contact_phone) {
      const phoneItems = document.querySelectorAll('[class*="lucide-phone"]');
      phoneItems.forEach(icon => {
        const parent = icon.closest('[class*="flex"]');
        if (parent) {
          const textNode = Array.from(parent.childNodes).find(n => n.nodeType === 3 && n.textContent.includes('+49'));
          if (textNode) textNode.textContent = ` ${settings.contact_phone}`;
        }
      });
    }
    if (settings.contact_email) {
      const mailItems = document.querySelectorAll('[class*="lucide-mail"]');
      mailItems.forEach(icon => {
        const parent = icon.closest('[class*="flex"]');
        if (parent) {
          const textNode = Array.from(parent.childNodes).find(n => n.nodeType === 3 && n.textContent.includes('@'));
          if (textNode) textNode.textContent = ` ${settings.contact_email}`;
        }
      });
    }
    if (settings.contact_cities) {
      const pinItems = document.querySelectorAll('[class*="lucide-map-pin"]');
      pinItems.forEach(icon => {
        const parent = icon.closest('[class*="flex"]');
        if (parent) {
          const textNode = Array.from(parent.childNodes).find(n => n.nodeType === 3 && n.textContent.includes('Berlin'));
          if (textNode) textNode.textContent = ` ${settings.contact_cities}`;
        }
      });
    }

    // ========================
    // 6. STATS / COUNTERS
    // ========================
    const statValues = document.querySelectorAll('.gold-gradient.font-medium span, .stat-value .font-display');
    const statLabels = document.querySelectorAll('.stat-card .stat-label, [class*="stat"] + .text-sm');
    
    if (settings.stats_years) {
      var els = document.querySelectorAll('.font-display.text-5xl, .gold-gradient.font-medium');
      if (els.length >= 4) {
        els[0].textContent = settings.stats_years;
        els[1].textContent = settings.stats_products || String(products.length) + '+';
        els[2].textContent = settings.stats_countries;
        els[3].textContent = settings.stats_satisfaction;
      }
    }

    // ========================
    // 7. MARQUEE ITEMS
    // ========================
    if (settings.marquee_items) {
      var items = settings.marquee_items.split(',');
      var marqueeEls = document.querySelectorAll('.animate-marquee span, [class*="marquee"] span, .animate-marquee > span');
      if (marqueeEls.length > 0) {
        var totalItems = marqueeEls.length;
        var half = Math.floor(totalItems / 2);
        for (var i = 0; i < half && i < items.length; i++) {
          var span = marqueeEls[i];
          var textNodes = [];
          for (var n = 0; n < span.childNodes.length; n++) {
            if (span.childNodes[n].nodeType === 3) textNodes.push(span.childNodes[n]);
          }
          if (textNodes.length > 0) textNodes[0].textContent = items[i];
          if (i + half < totalItems) {
            var span2 = marqueeEls[i + half];
            var textNodes2 = [];
            for (var n = 0; n < span2.childNodes.length; n++) {
              if (span2.childNodes[n].nodeType === 3) textNodes2.push(span2.childNodes[n]);
            }
            if (textNodes2.length > 0) textNodes2[0].textContent = items[i];
          }
        }
      }
    }

    // ========================
    // 8. PRODUCTS - Populate Featured Products Grid
    // ========================
    if (products.length > 0) {
      // Find the featured products grid (the empty grid after "Featured Products" heading)
      const featuredHeading = findElByText('Featured Products');
      if (featuredHeading) {
        const grid = featuredHeading.closest('section')?.querySelector('.grid');
        if (grid) {
          grid.innerHTML = products.filter(p => p.is_featured).slice(0, 4).map(p => `
            <div class="group cursor-pointer">
              <div class="relative overflow-hidden rounded-lg border border-line aspect-[3/4] mb-3" style="background:var(--bg-card2)">
                <img src="${p.image_url || ''}" alt="${p.title_en}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" onerror="this.style.display='none'">
                <div class="absolute top-2 right-2 flex gap-1">
                  ${p.is_new ? '<span class="px-2 py-0.5 text-[10px] rounded-full font-medium" style="background:var(--accent);color:#000;">NEW</span>' : ''}
                  ${p.is_best_seller ? '<span class="px-2 py-0.5 text-[10px] rounded-full bg-white/20 text-white">BEST</span>' : ''}
                </div>
              </div>
              <div class="px-1">
                <div class="text-xs tracking-wider uppercase" style="color:var(--accent)">${p.category || ''}</div>
                <div class="font-display text-lg font-medium mt-0.5">${p.title_en}</div>
                <div class="text-xs mt-0.5" style="color:var(--muted)">${p.finish || ''}</div>
              </div>
            </div>
          `).join('');
        }
      }

      // Populate categories grid
      // Find the categories section
      const catHeading = findElByText('Product Categories');
      if (catHeading) {
        const catGrid = catHeading.closest('section')?.querySelector('.grid');
        if (catGrid) {
          const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
          catGrid.innerHTML = categories.map(cat => `
            <button class="group relative overflow-hidden rounded-lg border border-line text-start block aspect-square" style="background:var(--bg-card2)" data-cursor="true">
              <div class="absolute inset-0" style="background:linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)"></div>
              <div class="absolute bottom-0 inset-inline-0 p-4">
                <div class="font-display text-lg md:text-xl text-white">${cat}</div>
                <div class="text-xs mt-0.5" style="color:var(--accent-soft)">${products.filter(p => p.category === cat).length} products</div>
              </div>
            </button>
          `).join('');
        }
      }
    }

    // ========================
    // 9. REPRESENTATIVES - Update contact section
    // ========================
    if (reps.length > 0) {
      // Update the cities display
      const repCities = reps.map(r => r.city_en).filter(Boolean).join(', ');
      if (repCities && settings.contact_cities) {
        // Already handled above
      }
    }

    // ========================
    // 10. MUSIC PLAYER - Load from API
    // ========================
    if (songs.length > 0) {
      var song = songs[0];
      var audio = document.getElementById('hufel-audio');
      var titleEl = document.getElementById('hufel-player-title');
      if (audio && song.file_url && audio.src.indexOf(song.file_url) === -1) {
        var wasPlaying = !audio.paused;
        audio.src = song.file_url;
        audio.load();
        if (wasPlaying) audio.play()['catch'](function(){});
      }
      if (titleEl && song.title_en) {
        titleEl.textContent = song.title_en;
      }
    }

    // Restore play/pause on toggle from API-loaded music
    if (songs.length > 0) {
      var playerEl = document.getElementById('hufel-player');
      if (playerEl && !playerEl.getAttribute('data-api-ready')) {
        playerEl.setAttribute('data-api-ready', '1');
        var s = document.getElementById('hufel-player-status');
        var icon = document.getElementById('hufel-player-icon');
        if (s) s.textContent = 'Tap';
    }

    // ========================
    // 11. SITE NAME in various places
    // ========================
    if (settings.site_name) {
      // Update page title if possible
      const titleEl = document.querySelector('title');
      if (titleEl) titleEl.textContent = settings.site_name;
    }

    // Logo
    if (settings.logo_url) {
      document.querySelectorAll('.logo-img, img[alt="Hüfel"]').forEach(img => {
        if (img.src.includes('hufel-logo') || img.alt === 'Hüfel') {
          img.src = settings.logo_url;
        }
      });
    }

    // ========================
    // 12. BEFORE/AFTER IMAGES - Inject into lookbook
    // ========================
    if (beforeAfter.length > 0) {
      var lookbookGrid = document.querySelector('.grid-cols-2.md\\:grid-cols-4');
      if (!lookbookGrid) {
        // Try to find the lookbook section by heading text
        var inspoHeading = findElByText('Inspiration & Lookbook');
        if (inspoHeading) {
          var section = inspoHeading.closest('section');
          if (section) lookbookGrid = section.querySelector('.grid');
        }
      }
      if (lookbookGrid) {
        lookbookGrid.innerHTML = beforeAfter.map(function(item) {
          return '<div style="opacity:0;transform:translateY(34px)">' +
            '<div class="relative w-full rounded-lg overflow-hidden border border-line block aspect-[3/4] group">' +
            (item.before_image ? '<img src="' + item.before_image + '" alt="Before" class="absolute inset-0 w-full h-full object-cover" style="clip-path:inset(0 50% 0 0)">' : '') +
            (item.after_image ? '<img src="' + item.after_image + '" alt="After" class="absolute inset-0 w-full h-full object-cover" style="clip-path:inset(0 0 0 50%)">' : '') +
            '<div class="absolute top-2 left-2 px-2 py-0.5 text-[10px] rounded-full" style="background:rgba(0,0,0,0.6);color:white">Before</div>' +
            '<div class="absolute top-2 right-2 px-2 py-0.5 text-[10px] rounded-full" style="background:rgba(0,0,0,0.6);color:white">After</div>' +
            (item.title_en ? '<div class="absolute bottom-0 inset-inline-0 p-3 text-center text-sm font-medium text-white" style="background:linear-gradient(to top, rgba(0,0,0,0.8), transparent)">' + item.title_en + '</div>' : '') +
            '</div></div>';
        }).join('');
        // Animate in
        setTimeout(function() {
          lookbookGrid.querySelectorAll('> div').forEach(function(el, i) {
            setTimeout(function() {
              el.style.opacity = '1';
              el.style.transform = 'translateY(0)';
              el.style.transition = 'all 0.6s ease';
            }, i * 150);
          });
        }, 300);
      }
    }

    // ========================
    // 13. JOURNAL POSTS - Inject into journal grid
    // ========================
    if (posts && posts.length > 0) {
      var journalHeading = findElByText('The Hüfel Journal');
      if (journalHeading) {
        var journalSection = journalHeading.closest('section');
        var journalGrid = journalSection ? journalSection.querySelector('.grid') : null;
        if (journalGrid) {
          journalGrid.innerHTML = posts.map(function(p) {
            return '<div style="opacity:0;transform:translateY(34px)">' +
              '<div class="group rounded-lg overflow-hidden border border-line block text-start" style="background:var(--bg-card2)">' +
              '<div class="aspect-[16/10] overflow-hidden" style="background:var(--bg-card)">' +
              (p.image_url ? '<img src="' + p.image_url + '" alt="' + (p.title_en || '') + '" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105">' : '<div class="w-full h-full flex items-center justify-center" style="color:var(--muted2);font-size:12px;">No image</div>') +
              '</div>' +
              '<div class="p-5">' +
              '<div class="text-xs uppercase tracking-wider mb-2" style="color:var(--accent)">' + (p.author || 'Hüfel Journal') + '</div>' +
              '<h3 class="font-display text-lg font-medium leading-tight">' + (p.title_en || '') + '</h3>' +
              (p.excerpt_en ? '<p class="text-sm mt-2" style="color:var(--muted2);line-height:1.5;">' + p.excerpt_en + '</p>' : '') +
              '</div></div></div>';
          }).join('');
          // Animate in
          setTimeout(function() {
            journalGrid.querySelectorAll('> div').forEach(function(el, i) {
              setTimeout(function() {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
                el.style.transition = 'all 0.6s ease';
              }, i * 150);
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
