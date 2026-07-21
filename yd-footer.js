
(function() {
  'use strict';

  if (window.__YD_FOOTER_V3_13__) {
    return;
  }
  window.__YD_FOOTER_V3_13__ = true;

  const CONFIG = {
    BEST_URL: 'https://www.yundiet.com/best',
    KAKAO_CHAT_URL: 'http://pf.kakao.com/_Lxexcxkj/friend',
    MODAL_ID: 'yd-custom-modal',
    CART_API: '/shop/cart/get_cart_content.cm?cart_type=normal',
    FREE_SHIP_THRESHOLD: 90000,
    FREE_SHIP_DONE_TEXT: '장바구니 포함, 무료배송 조건 충족!',
    DAYS: ['일', '월', '화', '수', '목', '금', '토']
  };

  const IS_IFRAME = (function() {
    try {
      return window.self !== window.top;
    } catch (err) {
      return true;
    }
  })();

  /* ── 자체 검증 (콘솔에서 YD_CHECK() 실행) ── */
  const ydStatus = { version: '3.13', page: location.pathname, features: {} };
  function ydMark(key, ok, note) {
    ydStatus.features[key] = { ok: !!ok, note: note || '' };
  }
  window.YD_CHECK = function() {
    try {
      console.table(ydStatus.features);
    } catch (err) {
      console.log(ydStatus);
    }
    return ydStatus;
  };

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function pageIs(pathPart) {
    return location.pathname.indexOf(pathPart) !== -1;
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
      return;
    }
    fn();
  }

  function stopEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }
  }

  /* ── 공유 MutationObserver 1개 + 100ms 디바운스 ── */
  const observerCallbacks = {};
  const observerState = { scheduled: false, pending: [], instance: null };

  function ensureObserver(key, fn) {
    if (observerCallbacks[key]) {
      return;
    }
    observerCallbacks[key] = fn;

    if (observerState.instance) {
      return;
    }

    observerState.instance = new MutationObserver(function(mutations) {
      observerState.pending = observerState.pending.concat(mutations);
      if (observerState.scheduled) {
        return;
      }
      observerState.scheduled = true;
      window.setTimeout(function() {
        observerState.scheduled = false;
        const batch = observerState.pending;
        observerState.pending = [];
        Object.keys(observerCallbacks).forEach(function(k) {
          try {
            observerCallbacks[k](batch);
          } catch (err) {
            /* 콜백 오류 격리 */
          }
        });
      }, 100);
    });
    observerState.instance.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function isProductDetailPage() {
    return /\/shop_view/.test(location.pathname) || location.search.indexOf('idx=') !== -1;
  }

  function isPaymentCompletePage() {
    return /\/shop_payment_complete/.test(location.pathname);
  }

  function isCheckoutPage() {
    return /\/shop_payment/.test(location.pathname) || /\/order/.test(location.pathname);
  }

  function isCartPage() {
    return /\/shop_cart/.test(location.pathname);
  }

  function isHomePage() {
    const p = location.pathname.replace(/\/+$/, '');
    return p === '' || p === '/index' || p === '/home';
  }

  function isGuestUser() {
    return !!qs('.member-info.guest');
  }

  function getHeaderOffsetPx() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--site-header-height').trim();
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  /* ── 팝업 열림 중 뒷페이지 스크롤 잠금 ── */
  function lockBodyScroll() {
    if (document.body.dataset.ydScrollLock !== undefined) {
      return;
    }
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.dataset.ydScrollLock = String(y);
    document.body.style.position = 'fixed';
    document.body.style.top = -y + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    const stored = document.body.dataset.ydScrollLock;
    if (stored === undefined) {
      return;
    }
    delete document.body.dataset.ydScrollLock;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, parseInt(stored, 10) || 0);
  }

  /* ═══ 상품 옵션 목록 유지 ═══ */
  const optionKeepState = { idx: -1, until: 0 };

  function enforceOptionOpen() {
    if (optionKeepState.idx < 0 || Date.now() > optionKeepState.until) {
      return;
    }
    const wraps = qsa('._form_select_wrap');
    const target = wraps[optionKeepState.idx];
    if (target && !target.classList.contains('open')) {
      target.classList.add('open');
    }
  }

  function bindOptionKeepOpen() {
    document.addEventListener('click', function(e) {
      const optionLink = e.target.closest('._form_select_wrap .dropdown-menu a');
      if (!optionLink) {
        optionKeepState.until = 0;
        return;
      }
      const wrap = optionLink.closest('._form_select_wrap');
      if (!wrap) {
        return;
      }

      optionKeepState.idx = qsa('._form_select_wrap').indexOf(wrap);
      optionKeepState.until = Date.now() + 2000;

      if (!wrap.classList.contains('open')) {
        wrap.classList.add('open');
      }
    }, false);

    window.setInterval(enforceOptionOpen, 150);
    ensureObserver('optionKeepOpen', enforceOptionOpen);
    ydMark('optionKeepOpen', true, '2초 유지창 + 재생성 대응');
  }

  /* ═══ 무료배송 안내를 장바구니 기준으로 보정 ═══ */
  function bindCartAwareFreeShip() {
    if (!isProductDetailPage()) {
      return;
    }

    let cartBase = null;

    function refreshCartBase() {
      fetch(CONFIG.CART_API, { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(j) {
          const s = j && j.data && j.data.cart_price_summary;
          cartBase = s
            ? Math.max(0, (parseInt(s.product_price, 10) || 0) - (parseInt(s.total_discount_price, 10) || 0))
            : 0;
        })
        .catch(function() {});
    }

    function collectRoots() {
      const roots = [document];
      function walk(root) {
        root.querySelectorAll('*').forEach(function(el) {
          if (el.tagName.indexOf('-') !== -1 && el.shadowRoot) {
            roots.push(el.shadowRoot);
            walk(el.shadowRoot);
          }
        });
      }
      walk(document);
      return roots;
    }

    function syncBar(el, root, remain) {
      const pct = Math.max(0, Math.min(100,
        Math.round(((CONFIG.FREE_SHIP_THRESHOLD - remain) / CONFIG.FREE_SHIP_THRESHOLD) * 100)
      ));

      function setBar(b) {
        if (b.style.width !== pct + '%') {
          b.style.width = pct + '%';
        }
      }

      if (root !== document) {
        root.querySelectorAll('div, span').forEach(function(b) {
          const w = b.style && b.style.width;
          if (w && /%$/.test(w)) {
            setBar(b);
          }
        });
        return;
      }

      let scope = el.parentElement;
      for (let i = 0; i < 3 && scope; i += 1) {
        const bars = Array.from(scope.querySelectorAll('div, span')).filter(function(b) {
          const w = b.style && b.style.width;
          return w && /%$/.test(w) && !b.contains(el) && b.offsetHeight > 0 && b.offsetHeight <= 14;
        });
        if (bars.length) {
          bars.forEach(setBar);
          return;
        }
        scope = scope.parentElement;
      }
    }

    function applyAmount(el, sibling, shown, isWhole) {
      let orig;
      if (el.dataset.ydWritten !== undefined && parseInt(el.dataset.ydWritten, 10) === shown) {
        orig = parseInt(el.dataset.ydOrig, 10);
      } else {
        orig = shown;
        el.dataset.ydOrig = String(orig);
      }

      const remain = Math.max(0, orig - cartBase);

      if (remain > 0) {
        const want = isWhole
          ? remain.toLocaleString() + '원 더 주문하면 무료배송'
          : remain.toLocaleString() + '원';
        if ((el.textContent || '').replace(/\s+/g, ' ').trim() !== want) {
          el.textContent = want;
        }
        el.dataset.ydWritten = String(remain);
        if (sibling && sibling.style.display === 'none') {
          sibling.style.display = '';
        }
      } else {
        if ((el.textContent || '').trim() !== CONFIG.FREE_SHIP_DONE_TEXT) {
          el.textContent = CONFIG.FREE_SHIP_DONE_TEXT;
        }
        el.dataset.ydWritten = '0';
        if (sibling && sibling.style.display !== 'none') {
          sibling.style.display = 'none';
        }
      }
      return remain;
    }

    function patchFreeShip() {
      if (cartBase === null || cartBase <= 0) {
        return;
      }

      let patched = 0;
      collectRoots().forEach(function(root) {
        root.querySelectorAll('p, span, div, strong').forEach(function(el) {
          const t = (el.textContent || '').replace(/\s+/g, ' ').trim();

          if (el.children.length === 0) {
            const mAmt = t.match(/^([\d,]+)원$/);
            if (mAmt) {
              const next = el.nextElementSibling;
              if (next && /더 주문하면 무료\s?배송/.test(next.textContent || '')) {
                const remain = applyAmount(el, next, parseInt(mAmt[1].replace(/,/g, ''), 10), false);
                syncBar(el, root, remain);
                patched += 1;
              }
              return;
            }
            if (t === CONFIG.FREE_SHIP_DONE_TEXT && el.dataset.ydOrig) {
              const orig = parseInt(el.dataset.ydOrig, 10);
              const remain = Math.max(0, orig - cartBase);
              if (remain > 0) {
                const isWhole = el.dataset.ydWhole === '1';
                el.textContent = isWhole
                  ? remain.toLocaleString() + '원 더 주문하면 무료배송'
                  : remain.toLocaleString() + '원';
                el.dataset.ydWritten = String(remain);
                const sib = el.nextElementSibling;
                if (!isWhole && sib) {
                  sib.style.display = '';
                }
              }
              syncBar(el, root, remain);
              patched += 1;
              return;
            }
          }

          if (el.children.length <= 3) {
            const mWhole = t.match(/^([\d,]+)원 더 주문하면 무료\s?배송$/);
            if (mWhole) {
              const childSame = Array.from(el.children).some(function(c) {
                return /더 주문하면 무료\s?배송/.test(c.textContent || '');
              });
              if (childSame) {
                return;
              }
              el.dataset.ydWhole = '1';
              const remain = applyAmount(el, null, parseInt(mWhole[1].replace(/,/g, ''), 10), true);
              syncBar(el, root, remain);
              patched += 1;
            }
          }
        });
      });

      if (patched > 0) {
        ydMark('cartAwareFreeShip', true, '보정 ' + patched + '건 (장바구니 ' + cartBase.toLocaleString() + '원 반영)');
      }
    }

    refreshCartBase();
    window.setInterval(refreshCartBase, 10000);

    document.addEventListener('click', function(e) {
      if (e.target.closest('a._btn_cart, .btn.cart, .defualt-cart')) {
        window.setTimeout(refreshCartBase, 1200);
      }
    }, true);

    window.setInterval(patchFreeShip, 1000);
    ensureObserver('cartAwareFreeShip', patchFreeShip);
    ydMark('cartAwareFreeShip', true, '대기 중(게이지 노출 시 보정)');
  }

  /* ═══ 장바구니 담기 완료 팝업 ═══ */
  function hideAddCartPopup(popup) {
    if (window.SITE_SHOP_DETAIL && typeof window.SITE_SHOP_DETAIL.hideAddCartAlarm === 'function') {
      window.SITE_SHOP_DETAIL.hideAddCartAlarm();
      return;
    }
    const original = popup && qs('[onclick*="hideAddCartAlarm"], [onclick*="hideCartAlarm"]', popup);
    if (original) {
      original.click();
    }
  }

  function patchLayerPopupButtons() {
    qsa('.layer_pop').forEach(function(popup) {
      const btns = qsa('.btn-group-justified > *', popup);
      const cartBtn = btns.find(function(node) {
        return ((node.innerText || '').trim() === '장바구니');
      });
      const continueBtn = btns.find(function(node) {
        return ((node.innerText || '').trim() === '계속쇼핑');
      });

      if (cartBtn && continueBtn) {
        cartBtn.innerText = '결제하기';
        continueBtn.innerText = '특가상품 더보기';
        continueBtn.style.setProperty('background', '#2a341e', 'important');
        continueBtn.style.setProperty('color', '#ffffff', 'important');

        const group = cartBtn.parentElement;
        if (group) {
          group.style.setProperty('display', 'flex', 'important');
          group.style.setProperty('border', '1px solid #e0e0e0', 'important');
          group.style.setProperty('border-radius', '8px', 'important');
          group.style.setProperty('overflow', 'hidden', 'important');
        }

        [continueBtn, cartBtn].forEach(function(btn) {
          btn.style.setProperty('border', 'none', 'important');
          btn.style.setProperty('flex', '1 1 50%', 'important');
          btn.style.setProperty('height', '46px', 'important');
          btn.style.setProperty('display', 'flex', 'important');
          btn.style.setProperty('align-items', 'center', 'important');
          btn.style.setProperty('justify-content', 'center', 'important');
          btn.style.setProperty('padding', '0', 'important');
          btn.style.setProperty('box-sizing', 'border-box', 'important');
        });
        cartBtn.style.setProperty('border-left', '1px solid #e0e0e0', 'important');

        if (!continueBtn.dataset.ydCloseBound) {
          continueBtn.dataset.ydCloseBound = '1';
          continueBtn.addEventListener('click', function(e) {
            stopEvent(e);
            hideAddCartPopup(popup);
          }, true);
          if (continueBtn.tagName === 'A') {
            continueBtn.setAttribute('href', 'javascript:void(0)');
          }
        }
      }

      qsa('button, a', popup).forEach(function(el) {
        if ((el.textContent || '').trim() === '바로구매' && el.style.display !== 'none') {
          el.style.setProperty('display', 'none', 'important');
        }
      });

      if (!qs('.custom-modal-close-v5', popup)) {
        const dlg = popup.closest('.modal-dialog');
        if (dlg) {
          dlg.style.position = 'relative';
        }

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'custom-modal-close-v5';
        closeBtn.innerText = '×';
        Object.assign(closeBtn.style, {
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '28px',
          height: '28px',
          padding: '0',
          border: 'none',
          background: 'rgba(0,0,0,0.3)',
          color: '#fff',
          fontSize: '20px',
          lineHeight: '1',
          borderRadius: '50%',
          cursor: 'pointer',
          zIndex: '1001'
        });

        closeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          hideAddCartPopup(popup);
        }, true);

        popup.appendChild(closeBtn);
      }
    });
  }

  /* ═══ 상품 페이지 프리페치 ═══
     터치/호버 시작 시 상세 HTML을 미리 받아 팝업 iframe 로드를 앞당긴다. */
  function bindProductPrefetch() {
    var done = {};
    function prefetch(url) {
      if (!url || done[url]) { return; }
      done[url] = 1;
      try {
        var l = document.createElement('link');
        l.rel = 'prefetch';
        l.as = 'document';
        l.href = url;
        document.head.appendChild(l);
      } catch (err) {}
    }
    function urlFor(trigger) {
      var id = extractProductId(trigger);
      if (id) { return window.location.origin + '/shop_view/?idx=' + id; }
      var href = trigger.getAttribute && trigger.getAttribute('href');
      return href && href.indexOf('shop_view') !== -1 ? href : null;
    }
    ['touchstart', 'mouseover'].forEach(function(evt) {
      document.body.addEventListener(evt, function(e) {
        if (!e.target || !e.target.closest) { return; }
        var t = e.target.closest('[onclick*="openProdDetailFromShoppingList"], .shop-item._shop_item a, a[href*="shop_view"]');
        if (t) { prefetch(urlFor(t)); }
      }, { passive: true, capture: true });
    });
    /* 유휴 시점에 첫 화면 상품 4개 선제 프리페치 */
    window.setTimeout(function() {
      Array.from(document.querySelectorAll('a[href*="shop_view"]')).slice(0, 4).forEach(function(a) {
        prefetch(a.href);
      });
    }, 3500);
  }

  /* ═══ 요약설명 원문 노출 방어 ═══
     일부 상품(예: idx=1117)은 요약설명 필드에 상세 HTML 소스가 텍스트로 저장돼
     PC 상세에서 <img ...> 원문이 그대로 노출된다 — 감지 시 요약 블록을 숨긴다. */
  function bindBrokenSummaryGuard() {
    function run() {
      qsa('.goods_summary').forEach(function(box) {
        if (box.dataset.ydSummaryChecked === '1') { return; }
        var text = box.textContent || '';
        if (/<\s*(img|p|br|div|span)[\s>/]/i.test(text)) {
          box.style.display = 'none';
          ydMark('brokenSummaryHidden');
        }
        box.dataset.ydSummaryChecked = '1';
      });
    }
    run();
    ensureObserver('brokenSummary', run);
  }

  /* ═══ 상품 클릭 → 상세페이지 팝업 ═══ */
  function removeModal() {
    const modal = qs('#' + CONFIG.MODAL_ID);
    if (modal) {
      modal.remove();
    }
    unlockBodyScroll();
  }
  window.__ydRemoveModal = removeModal;
  /* 옵션 시트가 열려 있는 동안 팝업 닫기 버튼 숨김 (iframe에서 호출) */
  window.__ydSetModalClose = function(visible) {
    var c = qs('#' + CONFIG.MODAL_ID + ' .yd-modal-close');
    if (c) c.style.visibility = visible ? '' : 'hidden';
  };

  function openModal(url) {
    removeModal();
    lockBodyScroll();

    const overlay = document.createElement('div');
    overlay.id = CONFIG.MODAL_ID;

    const box = document.createElement('div');
    box.className = 'yd-modal-box';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'yd-modal-close';
    closeBtn.innerHTML = '닫기';
    closeBtn.addEventListener('click', removeModal);

    const iframe = document.createElement('iframe');
    iframe.src = url;

    box.appendChild(closeBtn);
    box.appendChild(iframe);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        removeModal();
      }
    });

    bindModalIframeEvents(iframe);
  }

  function bindModalIframeEvents(iframe) {
    iframe.addEventListener('load', function() {
      try {
        const iwin = iframe.contentWindow;
        const idoc = iframe.contentDocument || iwin.document;
        const href = iwin.location.href || '';

        if (href.indexOf('/login') !== -1) {
          removeModal();
          window.location.href = href;
          return;
        }

        idoc.addEventListener('click', function(e) {
          const btn = e.target.closest('button, a');
          if (!btn) {
            return;
          }

          const text = (btn.textContent || '').trim();
          const onclickAttr = btn.getAttribute('onclick') || '';
          const isCheckoutBtn =
            btn.matches('.btn-group-justified .btn.right') &&
            (text.indexOf('결제하기') !== -1 || onclickAttr.indexOf('moveCart') !== -1);

          if (isCheckoutBtn) {
            stopEvent(e);
            removeModal();
            window.setTimeout(function() {
              window.location.href = '/shop_cart';
            }, 80);
            return;
          }

          if (text.indexOf('특가상품 더보기') !== -1) {
            stopEvent(e);
            removeModal();
          }
        }, true);
      } catch (err) {
        return;
      }
    });
  }

  function extractProductId(trigger) {
    const onclickText = trigger.getAttribute('onclick') || '';
    const onclickMatch = onclickText.match(/openProdDetailFromShoppingList\(\s*['"](\d+)['"]/);
    if (onclickMatch) {
      return onclickMatch[1];
    }

    const href = trigger.getAttribute('href') || '';
    const hrefMatch = href.match(/idx=(\d+)/);
    if (hrefMatch) {
      return hrefMatch[1];
    }
    return null;
  }

  function bindCustomProductModal() {
    if (window.SITE_SHOP_DETAIL && typeof window.SITE_SHOP_DETAIL.openProdDetailFromShoppingList === 'function') {
      window.SITE_SHOP_DETAIL.openProdDetailFromShoppingList = function() {};
    }

    document.body.addEventListener('click', function(e) {
      const trigger = e.target.closest(
        '[onclick*="openProdDetailFromShoppingList"], .shop-item._shop_item .item-thumbs a._fade_link, .shop-item._shop_item a.blocked'
      );
      if (!trigger) {
        return;
      }

      const prodId = extractProductId(trigger) || (function() {
        const item = trigger.closest('.shop-item._shop_item');
        const cartAnchor = item && qs('span.im-icon-wrap a[onclick*="openProdDetailFromShoppingList"]', item);
        return cartAnchor ? extractProductId(cartAnchor) : null;
      })();

      if (!prodId) {
        return;
      }

      stopEvent(e);
      openModal(window.location.origin + '/shop_view/?idx=' + prodId);
    }, true);
  }

  /* ═══ 배송일정 계산 ═══ */
  function formatDate(date) {
    return (date.getMonth() + 1) + '/' + date.getDate() + '(' + CONFIG.DAYS[date.getDay()] + ')';
  }

  function isFreshProduct() {
    const title = (qs('h1, .goods_summary, .product-title') || {}).textContent || '';
    return /샐러드|그릭요거트|Fresh/i.test(title.trim());
  }

  function getTodayCutoff(now) {
    const cutoff = new Date(now);
    if (now.getDay() >= 1 && now.getDay() <= 5) {
      cutoff.setHours(15, 0, 0, 0);
      return cutoff;
    }
    cutoff.setHours(0, 0, 0, 0);
    return cutoff;
  }

  function getNextShipDate(now) {
    const ship = new Date(now);
    const cutoff = getTodayCutoff(now);

    if (now.getDay() >= 1 && now.getDay() <= 5 && now <= cutoff) {
      return ship;
    }

    ship.setDate(ship.getDate() + 1);
    while (ship.getDay() === 0 || ship.getDay() === 6) {
      ship.setDate(ship.getDate() + 1);
    }
    return ship;
  }

  function getNextCutoff(now) {
    const todayCutoff = getTodayCutoff(now);
    if (now.getDay() >= 1 && now.getDay() <= 5 && now <= todayCutoff) {
      return todayCutoff;
    }

    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(15, 0, 0, 0);

    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
      next.setHours(15, 0, 0, 0);
    }

    return next;
  }

  function dayDiff(from, to) {
    const a = new Date(from);
    a.setHours(0, 0, 0, 0);
    const b = new Date(to);
    b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 86400000);
  }

  function computeShippingTexts() {
    const now = new Date();
    const cutoff = getTodayCutoff(now);
    const beforeCutoff = now.getDay() >= 1 && now.getDay() <= 5 && now <= cutoff;

    const ship = getNextShipDate(now);
    const arrival = new Date(ship);
    arrival.setDate(arrival.getDate() + 1);

    let shipLabel;
    if (beforeCutoff) {
      shipLabel = '오늘';
    } else if (dayDiff(now, ship) === 1) {
      shipLabel = '내일';
    } else {
      shipLabel = CONFIG.DAYS[ship.getDay()] + '요일';
    }

    const arrivalTomorrow = dayDiff(now, arrival) === 1;

    const nextCut = getNextCutoff(now);
    const cutDiff = dayDiff(now, nextCut);
    const cutDayLabel = cutDiff === 0 ? '오늘' : (cutDiff === 1 ? '내일' : CONFIG.DAYS[nextCut.getDay()] + '요일');

    const diff = nextCut - now;
    const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    const hms = hours + ':' + minutes + ':' + seconds;

    return {
      title: shipLabel + ' 출발 · ' + formatDate(arrival) + ' 도착',
      pill: shipLabel + ' 출발',
      leftLabel: cutDayLabel + ' 오후 3시 마감',
      rightLabel: (arrivalTomorrow ? '내일' : formatDate(arrival)) + ' 도착',
      timerValue: hms,
      badge: beforeCutoff ? '오늘 출발' : '발송 안내',
      main: beforeCutoff ? '지금 주문시 내일 도착' : '지금 주문시 ' + shipLabel + ' 출발',
      timer: '마감까지 ' + hms
    };
  }

  function setTextIfChanged(el, text) {
    if (el && el.textContent !== text) {
      el.textContent = text;
    }
  }

  function findHomeHeadingRows() {
    const rows = [];
    qsa('h1, h2, h3, h4, p, div, span, strong').forEach(function(el) {
      if ((el.textContent || '').replace(/\s+/g, '') === '윤식단전상품') {
        const row = el.closest('.doz_row');
        if (row && rows.indexOf(row) === -1) {
          rows.push(row);
        }
      }
    });
    return rows;
  }

  function cartBannerScrollSync() {
    const banner = qs('#yd-ship-banner-cart');
    const spacer = qs('#yd-ship-banner-spacer');
    if (!banner || !spacer) {
      return;
    }

    const headerH = getHeaderOffsetPx();
    const naturalTop = parseFloat(banner.dataset.naturalTop || '0');
    const shouldFix = naturalTop > 0 && (window.scrollY + headerH) > naturalTop;

    if (shouldFix && banner.dataset.ydFixed !== '1') {
      banner.dataset.ydFixed = '1';
      spacer.style.height = banner.offsetHeight + 'px';
      spacer.style.display = 'block';
      banner.style.position = 'fixed';
      banner.style.top = 'var(--site-header-height, 0px)';
      banner.style.left = '12px';
      banner.style.right = '12px';
      banner.style.margin = '8px 0';
      banner.style.zIndex = '9998';
      banner.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
    } else if (!shouldFix && banner.dataset.ydFixed === '1') {
      banner.dataset.ydFixed = '';
      spacer.style.display = 'none';
      banner.style.position = '';
      banner.style.top = '';
      banner.style.left = '';
      banner.style.right = '';
      banner.style.margin = '';
      banner.style.zIndex = '';
      banner.style.boxShadow = '';
    }
  }

  function bindShippingSchedule() {
    const onDetail = isProductDetailPage() && !isFreshProduct();
    const onHome = !IS_IFRAME && isHomePage();
    const onCart = !IS_IFRAME && isCartPage();

    if (!onDetail && !onHome && !onCart) {
      return;
    }

    /* 장바구니 상품 개수: DOM 구조와 무관하게 API로 판단 */
    let cartItemCount = null;

    function refreshCartCount() {
      fetch(CONFIG.CART_API, { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(j) {
          const m = j && j.data && j.data.meta;
          cartItemCount = m ? (parseInt(m.total_normal_cart_item_count, 10) || 0) : 0;
        })
        .catch(function() {});
    }

    const PILL_ICON =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>';

    function buildShipCard(idOrNull, extraClass) {
      const card = document.createElement('div');
      if (idOrNull) {
        card.id = idOrNull;
      }
      card.className = 'yd-ship-card' + (extraClass ? ' ' + extraClass : '');
      card.innerHTML =
        '<div class="yd-card-top">' +
        '<div class="yd-card-title"></div>' +
        '<div class="yd-card-timer"><span class="yd-timer-label">마감까지</span><span class="yd-timer-value"></span></div>' +
        '</div>' +
        '<div class="yd-card-track">' +
        '<div class="yd-track-line"></div>' +
        '<span class="yd-dot yd-dot-start"></span>' +
        '<span class="yd-dot yd-dot-end"></span>' +
        '<div class="yd-track-pill">' + PILL_ICON + '<span class="yd-pill-text"></span></div>' +
        '</div>' +
        '<div class="yd-card-labels"><span class="yd-label-left"></span><span class="yd-label-right"></span></div>';
      return card;
    }

    function updateShipCard(card, texts) {
      setTextIfChanged(qs('.yd-card-title', card), texts.title);
      setTextIfChanged(qs('.yd-timer-value', card), texts.timerValue);
      setTextIfChanged(qs('.yd-pill-text', card), texts.pill);
      setTextIfChanged(qs('.yd-label-left', card), texts.leftLabel);
      setTextIfChanged(qs('.yd-label-right', card), texts.rightLabel);
    }

    function syncHomeCardEdges(card) {
      const items = qsa('.shop-item').filter(function(el) {
        return el.offsetParent !== null;
      }).slice(0, 8);
      if (!items.length) {
        return;
      }
      let L = Infinity;
      let R = -Infinity;
      items.forEach(function(it) {
        const r = it.getBoundingClientRect();
        if (r.width > 0) {
          if (r.left < L) L = r.left;
          if (r.right > R) R = r.right;
        }
      });
      if (!isFinite(L) || !isFinite(R) || R - L < 100) {
        return;
      }
      const w = Math.round(R - L);
      if (card.dataset.ydW !== String(w)) {
        card.dataset.ydW = String(w);
        card.style.width = w + 'px';
        card.style.maxWidth = 'calc(100% - 8px)';
        card.style.marginLeft = 'auto';
        card.style.marginRight = 'auto';
        card.style.boxSizing = 'border-box';
      }
    }

    function buildBanner(idOrNull) {
      const banner = document.createElement('div');
      if (idOrNull) {
        banner.id = idOrNull;
      }
      banner.className = 'yd-ship-banner';
      banner.innerHTML =
        '<span class="yd-badge"></span>' +
        '<span class="yd-main"></span>' +
        '<span class="yd-timer"></span>';
      return banner;
    }

    function updateBanner(banner, texts) {
      setTextIfChanged(qs('.yd-badge', banner), texts.badge);
      setTextIfChanged(qs('.yd-main', banner), texts.main);
      setTextIfChanged(qs('.yd-timer', banner), texts.timer);
    }

    function cardAfterRow(row) {
      let node = row.nextElementSibling;
      for (let i = 0; i < 3 && node; i += 1) {
        if (node.classList && node.classList.contains('yd-ship-card-home')) {
          return node;
        }
        node = node.nextElementSibling;
      }
      return null;
    }

    function tick() {
      const texts = computeShippingTexts();

      if (onDetail) {
        let card = qs('#yd-ship-card-detail');
        if (!card) {
          const anchor = ['.categorize-mobile.buy_btns', '.today_arrival_wrap', '.prod-detail-section']
            .map(function(sel) { return qs(sel); })
            .find(function(el) { return el && !el.closest('.yd-bs-native-source'); });
          if (anchor) {
            card = buildShipCard('yd-ship-card-detail', '');
            card.style.margin = '12px 0';
            if (anchor.classList.contains('prod-detail-section')) {
              anchor.insertAdjacentElement('beforebegin', card);
            } else {
              anchor.insertAdjacentElement('afterend', card);
            }
          }
        }
        if (card) {
          updateShipCard(card, texts);
        }
        ydMark('detailShipCard', !!card, card ? '표시됨' : '앵커 탐색 중');
      }

      if (onHome) {
        const rows = findHomeHeadingRows();
        let visibleCount = 0;
        rows.forEach(function(row) {
          let card = cardAfterRow(row);
          if (!card) {
            card = buildShipCard(null, 'yd-ship-card-home');
            row.insertAdjacentElement('afterend', card);
          }
          const rowHidden = row.offsetParent === null;
          const want = rowHidden ? 'none' : '';
          if (card.style.display !== want) {
            card.style.display = want;
          }
          if (!rowHidden) {
            visibleCount += 1;
            syncHomeCardEdges(card);
          }
          updateShipCard(card, texts);
        });
        ydMark('homeShipCard', visibleCount > 0, '행 ' + rows.length + '개 / 노출 카드 ' + visibleCount + '개');
      }

      if (onCart) {
        let banner = qs('#yd-ship-banner-cart');

        /* 빈 장바구니면 배너 제거 */
        if (banner && cartItemCount === 0) {
          const sp = qs('#yd-ship-banner-spacer');
          if (sp) {
            sp.remove();
          }
          banner.remove();
          banner = null;
        }

        /* React 영역 밖(장바구니 컴포넌트 바로 앞)에 삽입 → 재렌더에도 안 밀림 */
        if (!banner && cartItemCount !== null && cartItemCount > 0) {
          const host = qs('fo-shopping-cart') || qs('.shop-table._shop_table');
          if (host && host.parentNode) {
            banner = buildBanner('yd-ship-banner-cart');
            host.insertAdjacentElement('beforebegin', banner);
            const spacer = document.createElement('div');
            spacer.id = 'yd-ship-banner-spacer';
            banner.insertAdjacentElement('afterend', spacer);
          }
        }

        if (banner) {
          updateBanner(banner, texts);
          if (banner.dataset.ydFixed !== '1') {
            banner.dataset.naturalTop = String(banner.getBoundingClientRect().top + window.scrollY);
          }
          cartBannerScrollSync();
        }
        ydMark('cartBanner', !!banner, banner
          ? '표시됨 (상품 ' + cartItemCount + '개)'
          : (cartItemCount === 0 ? '빈 장바구니: 미표시(정상)' : '장바구니 확인 중'));
      }
    }

    if (onCart) {
      refreshCartCount();
      window.setInterval(refreshCartCount, 10000);
      window.addEventListener('scroll', cartBannerScrollSync, { passive: true });
    }

    tick();
    window.setInterval(tick, 1000);
  }

  /* ═══ 신규. 옵션 선택 플로우 (바텀시트 UI — 레갈로 시안 이식) ═══
     대상 상품에서 네이티브 옵션 UI를 숨기고 3단계 바텀시트로 대체한다.
     옵션·가격은 네이티브 DOM에서 동적으로 읽고, 선택은 네이티브 클릭으로 위임한다. */
  function bindOptionFlow() {
    if (!isProductDetailPage()) return;
    var flowIdx = new URLSearchParams(location.search).get('idx') || '';
    /* 상품별 세부 오버라이드 (자동 감지 값 덮어쓰기) */
    var FLOW_OVERRIDES = {
      '672': { min: 6,
               headline: '단백밥 메뉴를 6개 이상 골라주세요.',
               lead: 'S, L, 프리미엄을 자유롭게 섞어 총 6개 이상 선택할 수 있습니다.' }
    };
    var cfg = null; /* 옵션 로드 후 buildFlowCfg()가 확정 */
    if (document.getElementById('yd-bs-root')) return;
    window.__YD_FLOW_ACTIVE__ = true;

    var money = function(n){ return (Number(n)||0).toLocaleString('ko-KR') + '원'; };
    var escT = function(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
    var copyFitClass = function(v){ var len = Array.from(String(v).replace(/\s+/g,'')).length; return len > 30 ? ' is-copy-long' : len > 22 ? ' is-copy-medium' : ''; };
    var normalizeT = function(s){ return String(s||'').replace(/ /g,' ').replace(/\s+/g,' ').trim(); };
    var numberFrom = function(s){ return Number(String(s||'').replace(/[^0-9-]/g,'')) || 0; };

    var step = 1, activeTab = null, cartPopup = false, bootAttempts = 0, rafId = 0, followupTimer = 0;
    var wrapLabels = [], prevMainsLen = 0;
    var flowBooted = false, bootWatcher = null, bootLoadedAt = 0;
    var cartSubtotal = 0, cartSubtotalReady = false, cartSubtotalLoading = false;
    var pendingNames = new Set();

    var root = document.createElement('section');
    root.id = 'yd-bs-root';
    root.dataset.mode = 'flow';
    root.setAttribute('aria-label', '상품 옵션 선택');
    root.innerHTML = '';
    document.documentElement.appendChild(root);

    var optionNameOf = function(a){ return normalizeT(a && (a.querySelector('.margin-bottom-lg') || {}).textContent || a && a.textContent); };
    var isNoticeOption = function(name){ return /주말\s*수령|배송메모/.test(name); };
    var priceFromAnchor = function(a){
      var el = a && a.querySelector('.no-margin strong');
      var text = normalizeT(el ? el.textContent : '');
      return text ? numberFrom(text) : null;
    };

    /* 계열(단백밥/밸런시/순수단백)·스킴·최소수량 자동 감지 — 새 상품에도 즉시 적용 */
    function buildFlowCfg() {
      var rawTitle = normalizeT(((document.querySelector('#prod_detail h1') || document.querySelector('h1') || {}).textContent) || document.title.split(':')[0] || '');
      var fam;
      if (/밸런시|곡물볶음밥/.test(rawTitle)) fam = { k: 'balancy', unit: '밸런시', label: '밸런시', theme: 'yd-bs-family-balancy' };
      else if (/순수단백/.test(rawTitle)) fam = { k: 'soonsu', unit: '순수단백', label: '순수단백', theme: 'yd-bs-family-soonsu' };
      else if (/단백밥|단백질\s*도시락|제육|불고기|함박|훈제오리|닭가슴살|단백질/.test(rawTitle)) fam = { k: 'danbaekbap', unit: '단백밥', label: '단백밥', theme: '' };
      else fam = { k: 'generic', unit: '상품', label: '', theme: '' };
      var reqNames = Array.from(document.querySelectorAll('#prod_options a[onclick*="selectRequireOption"]')).map(optionNameOf);
      var scheme = (reqNames.some(function(n) { return /^\[S\]/i.test(n); }) && reqNames.some(function(n) { return /^\[L\]/i.test(n); })) ? 'size' : 'groups';
      var ov = FLOW_OVERRIDES[flowIdx] || {};
      var min = ov.min != null ? ov.min : (scheme === 'size' ? 6 : 1);
      cfg = {
        family: fam.k,
        unit: ov.unit || fam.unit,
        scheme: scheme,
        min: min,
        title: ov.title || (fam.label ? '윤식단 ' + fam.label : rawTitle.slice(0, 22)),
        headline: ov.headline || (scheme === 'size'
          ? fam.unit + ' 메뉴를 ' + min + '개 이상 골라주세요.'
          : '원하는 구성을 선택해 주세요.'),
        lead: ov.lead || (scheme === 'size'
          ? '자유롭게 섞어 총 ' + min + '개 이상 선택할 수 있습니다.'
          : '메뉴·수량·세트 구성을 자유롭게 선택할 수 있습니다.')
      };
      if (fam.theme) root.classList.add(fam.theme);
      root.setAttribute('aria-label', cfg.title + ' 옵션 선택');
    }

    var ADDON_LABEL = /소스|아이스팩|알룰로스|추가/;
    var MAIN_LABEL = /골라담기|단품|세트|SET|구성|선택하기/i;

    /* 네이티브 옵션 카탈로그: 그룹(필수/선택, 주상품/추가상품)과 항목·가격 */
    function buildCatalog() {
      var groups = [], itemInfo = new Map();
      document.querySelectorAll('#prod_options .form-select-wrap').forEach(function(wrap, wrapIndex) {
        var anchors = Array.from(wrap.querySelectorAll('a[onclick*="selectRequireOption"], a[onclick*="selectOptionalOption"]'));
        if (!anchors.length) return;
        var kind = (anchors[0].getAttribute('onclick') || '').indexOf('selectRequireOption') !== -1 ? 'Require' : 'Optional';
        /* 조합형: 선택 후 토글 텍스트가 선택값으로 바뀌므로 부팅 시 캐시한 라벨을 우선 사용 */
        var rawLabel = wrapLabels[wrapIndex] ||
                       normalizeT(wrap.previousElementSibling ? wrap.previousElementSibling.textContent : '') ||
                       normalizeT((wrap.querySelector('.dropdown-toggle') || {}).textContent || '');
        var label = rawLabel.replace(/\(선택\)\s*$/, '').replace(/[▪️⭐🍀]/g, '').trim() || '옵션';
        var items = [], seen = new Set();
        anchors.forEach(function(a) {
          var n = optionNameOf(a);
          if (!n || isNoticeOption(n) || seen.has(n)) return;
          seen.add(n);
          items.push([n, priceFromAnchor(a)]);
        });
        if (!items.length) return;
        var isAddon = ADDON_LABEL.test(label);
        var main = kind === 'Require' ? true : (!isAddon && MAIN_LABEL.test(label));
        groups.push({ label: label, kind: kind, main: main, items: items });
        items.forEach(function(it) { itemInfo.set(it[0], { kind: kind, main: main }); });
      });
      return { groups: groups, itemInfo: itemInfo };
    }

    var nativeLink = function(kind, name) {
      return Array.from(document.querySelectorAll('#prod_options a[onclick*="select' + kind + 'Option"]')).find(function(a) { return optionNameOf(a) === name; });
    };
    var labelOfRow = function(row) {
      var el = row.querySelector('.area_tit span');
      var full = normalizeT(el ? el.textContent : '');
      return full.indexOf(': ') !== -1 ? normalizeT(full.slice(full.indexOf(': ') + 2)) : full;
    };
    var rowsOf = function() {
      return Array.from(document.querySelectorAll('#prod_selected_options > .opt_block:not(.total)')).map(function(row) {
        var cnt = row.querySelector('input._count');
        var priceEl = row.querySelector('.area_price');
        return { row: row, label: labelOfRow(row), qty: parseInt(cnt ? cnt.value : '1', 10) || 1,
                 nativeRequired: row.classList.contains('_selected_require_option'),
                 priceText: normalizeT(priceEl ? priceEl.textContent : '') };
      });
    };
    function flowState() {
      var cat = buildCatalog();
      var all = rowsOf();
      all.forEach(function(x) { pendingNames.delete(x.label); });
      var isMain = function(x) { var info = cat.itemInfo.get(x.label); return info ? info.main : x.nativeRequired; };
      var req = all.filter(isMain), opt = all.filter(function(x) { return !isMain(x); });
      var totalEl = document.querySelector('#prod_selected_options .total_price');
      var total = normalizeT(totalEl ? totalEl.textContent : '0원');
      return { cat: cat, all: all, req: req, opt: opt,
               reqQty: req.reduce(function(s, x) { return s + x.qty; }, 0),
               optQty: opt.reduce(function(s, x) { return s + x.qty; }, 0),
               total: total, totalValue: numberFrom(total) };
    }

    /* 조합형 1단 선택 감지: 필수 셀렉트 토글에 표시된 선택값 */
    function selectedToggleNames() {
      var names = new Set();
      document.querySelectorAll('#prod_options .form-select-wrap').forEach(function(wrap) {
        var t = normalizeT((wrap.querySelector('.dropdown-toggle') || {}).textContent || '');
        if (t) names.add(t);
      });
      return names;
    }

    /* 사이즈 스킴(단백밥): S / L / 프리미엄 분류 */
    var premiumPattern = /함박|쌈장|불고기|제육|훈제오리/;
    var categoryOf = function(name) { return premiumPattern.test(name) ? 'P' : /^\[S\]/i.test(name) ? 'S' : 'L'; };
    var categoryLabel = function(v) { return v === 'S' ? '단백밥 S' : v === 'P' ? '프리미엄' : '단백밥 L'; };

    function scheduleRender(withFollowup) {
      if (!rafId) rafId = requestAnimationFrame(function() { rafId = 0; render(); });
      if (withFollowup) { clearTimeout(followupTimer); followupTimer = setTimeout(function() { scheduleRender(false); }, 24); }
    }
    function showPendingSelection(name, nextQty) {
      /* 같은 상품의 모든 노출 지점(카드·미니수량·검토행)에 즉시 반영 */
      var controls = Array.from(root.querySelectorAll('[data-pick],[data-addon],[data-plus],[data-minus]')).filter(function(el) {
        return el.dataset.pick === name || el.dataset.addon === name || el.dataset.plus === name || el.dataset.minus === name;
      });
      var seenCards = new Set();
      controls.forEach(function(control) {
        var card = control.closest('.yd-bs-menu-card,.yd-bs-addon-choice,.yd-bs-review-row');
        if (!card || seenCards.has(card)) return;
        seenCards.add(card);
        card.classList.add('is-selected', 'is-pending');
        card.setAttribute('aria-busy', 'true');
        var main = card.querySelector('[aria-pressed]');
        if (main) main.setAttribute('aria-pressed', 'true');
        var qty = card.querySelector('.yd-bs-qty-mini strong, .yd-bs-qty strong');
        if (qty && Number.isFinite(nextQty)) qty.textContent = String(Math.max(0, nextQty));
        var add = card.querySelector('.yd-bs-menu-plus,.yd-bs-addon-plus');
        if (add && Number(nextQty) > 0) { add.textContent = '✓'; add.setAttribute('aria-label', '추가 반영 중'); }
      });
    }
    function markPending(name, trigger, nextQty) {
      pendingNames.add(name);
      showPendingSelection(name, nextQty);
      trigger();
      scheduleRender(true);
      setTimeout(function() { if (pendingNames.delete(name)) scheduleRender(false); }, 150);
    }
    function changeQty(item, dir) {
      var links = item.row.querySelectorAll('.option_btn_tools a');
      markPending(item.label, function() {
        if (dir > 0) { if (links[1]) links[1].click(); }
        else if (item.qty > 1) { if (links[0]) links[0].click(); }
        else { var rm = item.row.querySelector('.area_tit a'); if (rm) rm.click(); }
      }, Math.max(0, item.qty + dir));
    }
    function removeFlowItem(item) {
      markPending(item.label, function() { var rm = item.row.querySelector('.area_tit a'); if (rm) rm.click(); }, 0);
    }
    function selectByName(name) {
      if (pendingNames.has(name)) return;
      var s = flowState();
      var found = s.all.find(function(x) { return x.label === name; });
      if (found) { changeQty(found, 1); return; }
      var info = s.cat.itemInfo.get(name);
      var kind = info ? info.kind : 'Require';
      markPending(name, function() { var a = nativeLink(kind, name); if (a) a.click(); }, 1);
    }

    function loadCartSubtotal() {
      if (cartSubtotalLoading) return;
      cartSubtotalLoading = true;
      fetch(CONFIG.CART_API, { credentials: 'same-origin', cache: 'no-store' })
        .then(function(r) { if (!r.ok) throw new Error('cart'); return r.json(); })
        .then(function(j) {
          var sum = (j && j.data && j.data.cart_price_summary) || {};
          cartSubtotal = Math.max(0, (Number(sum.product_price) || 0) - (Number(sum.total_discount_price) || 0));
          cartSubtotalReady = true;
        })
        .catch(function() { cartSubtotalReady = false; })
        .then(function() { cartSubtotalLoading = false; scheduleRender(false); });
    }

    var priceLabel = function(p) { return p === null ? '선택 후 금액 반영' : p ? (p > 0 ? '+ ' : '- ') + money(Math.abs(p)) : '추가금 없음'; };
    var saucePattern = /볼케이노|양념치킨|블랙\s*알리오|블랙알리오|데리야끼|바베큐/;
    var hasSeparateSauce = function(name) { return !/\(소스X\)/.test(name) && saucePattern.test(name); };

    function sizeTabs(s) {
      var totals = { S: 0, L: 0, P: 0 };
      s.cat.groups.forEach(function(g) { if (g.main) g.items.forEach(function(it) { totals[categoryOf(it[0])] += 1; }); });
      var counts = { S: 0, L: 0, P: 0 };
      s.req.forEach(function(x) { counts[categoryOf(x.label)] += x.qty; });
      var btn = function(v, strong, span) {
        return '<button class="yd-bs-category ' + (activeTab === v ? 'is-selected' : '') + '" data-category="' + v + '" aria-pressed="' + (activeTab === v) + '"><strong>' + strong + '</strong><span>' + span + '</span><b>' + totals[v] + '종 · 선택 ' + counts[v] + '개</b></button>';
      };
      return '<div class="yd-bs-category-grid" role="group" aria-label="라인 선택">' + btn('S', 'S', '단백밥 도시락') + btn('L', 'L', '단백밥 도시락') + btn('P', 'PREMIUM', '프리미엄 도시락') + '</div>';
    }
    function groupTabs(s, mains) {
      if (mains.length < 2) return '';
      var counts = mains.map(function(g) {
        return g.items.reduce(function(sum, it) {
          var found = s.req.find(function(x) { return x.label === it[0]; });
          return sum + (found ? found.qty : 0);
        }, 0);
      });
      return '<div class="yd-bs-category-grid" role="group" aria-label="구성 선택">' + mains.map(function(g, i) {
        return '<button class="yd-bs-category ' + (activeTab === i ? 'is-selected' : '') + '" data-category="' + i + '" aria-pressed="' + (activeTab === i) + '"><strong>' + (i + 1) + '</strong><span>' + escT(g.label) + '</span><b>' + g.items.length + '종 · 선택 ' + counts[i] + '개</b></button>';
      }).join('') + '</div>';
    }
    function menuCards(items, s, tag) {
      var toggled = selectedToggleNames();
      return '<div class="yd-bs-menu-grid">' + items.map(function(pair) {
        var name = pair[0], price = pair[1];
        var found = s.req.find(function(x) { return x.label === name; });
        var q = found ? found.qty : 0, pending = pendingNames.has(name) || (!q && toggled.has(name));
        return '<div class="yd-bs-menu-card ' + ((q || pending) ? 'is-selected ' : '') + (pending ? 'is-pending' : '') + '" aria-busy="' + pending + '">' +
          (tag ? '<span class="yd-bs-line-tag" aria-hidden="true">' + tag + '</span>' : '') +
          '<button class="yd-bs-menu-main" data-pick="' + escT(name) + '" aria-pressed="' + Boolean(q || pending) + '"><span class="yd-bs-menu-name' + copyFitClass(name) + '">' + escT(name) + '</span><span class="yd-bs-menu-meta"><span class="yd-bs-menu-price">' + priceLabel(price) + '</span>' + (hasSeparateSauce(name) ? '<span class="yd-bs-menu-note">· 소스는 별도 제공됩니다</span>' : '') + '</span></button>' +
          (q ? '<span class="yd-bs-qty-mini"><button data-minus="' + escT(name) + '" aria-label="' + escT(name) + ' 수량 줄이기">−</button><strong aria-live="polite">' + q + '</strong><button data-plus="' + escT(name) + '" aria-label="' + escT(name) + ' 수량 늘리기">＋</button></span>' : '<button class="yd-bs-menu-plus" data-pick="' + escT(name) + '" aria-label="' + escT(name) + ' 추가">＋</button>') + '</div>';
      }).join('') + '</div>';
    }
    function minNotice(s) {
      if (cfg.min > 1) {
        return '<div class="yd-bs-min ' + (s.reqQty >= cfg.min ? 'is-ok' : '') + '" aria-live="polite">' + (s.reqQty >= cfg.min ? '최소 수량을 충족했습니다. 총 ' + s.reqQty + '개' : '현재 ' + s.reqQty + '개 · ' + (cfg.min - s.reqQty) + '개 더 선택해 주세요.') + '</div>';
      }
      return '<div class="yd-bs-min ' + (s.reqQty >= 1 ? 'is-ok' : '') + '" aria-live="polite">' + (s.reqQty >= 1 ? '상품 선택 완료 · 총 ' + s.reqQty + '개' : cfg.unit + ' 상품을 1개 이상 선택해 주세요.') + '</div>';
    }
    function reviewCategoryOf(label) {
      if (cfg.scheme === 'size') return categoryLabel(categoryOf(label));
      return cfg.unit;
    }
    function reviewHtml(s) {
      var rowHtml = function(x, catText) {
        return '<div class="yd-bs-review-row"><div><span class="yd-bs-review-category">' + escT(catText) + '</span><div class="yd-bs-review-name">' + escT(x.label) + '</div><div class="yd-bs-review-price">' + escT(x.priceText) + '</div></div><div class="yd-bs-qty"><button data-minus="' + escT(x.label) + '" aria-label="' + escT(x.label) + ' 수량 줄이기">−</button><strong aria-live="polite">' + x.qty + '</strong><button data-plus="' + escT(x.label) + '" aria-label="' + escT(x.label) + ' 수량 늘리기">＋</button></div><button class="yd-bs-remove" data-remove="' + escT(x.label) + '" aria-label="' + escT(x.label) + ' 삭제">삭제</button></div>';
      };
      return '<section class="yd-bs-review-section"><h4>' + escT(cfg.unit) + ' ' + s.reqQty + '개</h4><div class="yd-bs-review-list">' + (s.req.length ? s.req.map(function(x) { return rowHtml(x, reviewCategoryOf(x.label)); }).join('') : '<div class="yd-bs-empty">아직 선택한 메뉴가 없습니다.</div>') + '</div></section>' +
        '<section class="yd-bs-review-section"><h4>추가상품 ' + s.optQty + '개</h4><div class="yd-bs-review-list">' + (s.opt.length ? s.opt.map(function(x) { return rowHtml(x, '선택 상품'); }).join('') : '<div class="yd-bs-empty">선택한 추가상품이 없습니다.</div>') + '</div></section>' + minNotice(s);
    }
    function unitPricePer100g(name, price) {
      var match = String(name).match(/(\d+)\s*g\s*[*×xX]\s*(\d+)\s*개/i);
      if (!match || !Number(price)) return null;
      var grams = Number(match[1]) * Number(match[2]);
      return grams > 0 ? Math.round(Number(price) * 100 / grams) : null;
    }
    function addonsHtml(s) {
      var addonGroups = s.cat.groups.filter(function(g) { return !g.main; });
      if (!addonGroups.length) return '<div class="yd-bs-empty">추가 상품이 없습니다. 다음 단계로 이동해 주세요.</div>';
      return '<div class="yd-bs-addon-groups">' + addonGroups.map(function(g) {
        var groupQty = g.items.reduce(function(sum, pair) {
          var found = s.opt.find(function(x) { return x.label === pair[0]; });
          return sum + (found ? found.qty : 0);
        }, 0);
        var proteinGroup = /단백질\s*추가구성/.test(g.label);
        return '<section class="yd-bs-addon-group"><div class="yd-bs-addon-head"><h4>' + escT(g.label) + '</h4><span>' + groupQty + '개 선택</span></div><div class="yd-bs-addon-list">' + g.items.map(function(pair) {
          var name = pair[0], price = pair[1];
          var found = s.opt.find(function(x) { return x.label === name; });
          var q = found ? found.qty : 0, pending = pendingNames.has(name), unit = proteinGroup ? unitPricePer100g(name, price) : null;
          return '<div class="yd-bs-addon-choice ' + ((q || pending) ? 'is-selected ' : '') + (pending ? 'is-pending' : '') + '" aria-busy="' + pending + '"><button class="yd-bs-addon-main" data-addon="' + escT(name) + '" aria-pressed="' + Boolean(q || pending) + '"><span class="yd-bs-check" aria-hidden="true"></span><span class="yd-bs-addon-copy"><strong class="' + copyFitClass(name).trim() + '">' + escT(name) + '</strong><span class="yd-bs-addon-meta"><em>' + priceLabel(price) + '</em>' + (unit ? '<span class="yd-bs-unit-badge">100g당 ' + money(unit) + '</span>' : '') + '</span></span></button>' +
            (q ? '<span class="yd-bs-qty-mini"><button data-minus="' + escT(name) + '" aria-label="' + escT(name) + ' 수량 줄이기">−</button><strong aria-live="polite">' + q + '</strong><button data-plus="' + escT(name) + '" aria-label="' + escT(name) + ' 수량 늘리기">＋</button></span>' : '<button class="yd-bs-addon-plus" data-addon="' + escT(name) + '" aria-label="' + escT(name) + ' 추가">＋</button>') + '</div>';
        }).join('') + '</div></section>';
      }).join('') + '</div>';
    }
    function stepContent(s) {
      var progress = '<div class="yd-bs-progress" role="list" aria-label="옵션 선택 진행 단계">' + [1, 2, 3].map(function(n) {
        return '<span role="listitem" aria-label="' + n + '단계" ' + (n === step ? 'aria-current="step"' : '') + ' class="' + (n <= step ? 'is-active' : '') + '"></span>';
      }).join('') + '</div>';
      var html = '';
      if (step === 1) {
        var body = '';
        if (cfg.scheme === 'size') {
          if (activeTab === null) activeTab = 'L';
          var items = [];
          s.cat.groups.forEach(function(g) { if (g.main) g.items.forEach(function(it) { if (categoryOf(it[0]) === activeTab) items.push(it); }); });
          body = sizeTabs(s) + menuCards(items, s, activeTab === 'P' ? 'P' : activeTab);
        } else {
          var mains = s.cat.groups.filter(function(g) { return g.main; });
          if (mains.length > prevMainsLen && prevMainsLen > 0) activeTab = mains.length - 1;
          prevMainsLen = mains.length;
          if (activeTab === null || activeTab >= mains.length) activeTab = 0;
          var group = mains[activeTab];
          body = groupTabs(s, mains) + (group ? menuCards(group.items, s, '') : '<div class="yd-bs-empty">옵션을 불러오는 중입니다…</div>');
        }
        html = '<div class="yd-bs-step yd-bs-step-1"><div class="yd-bs-step-meta"><span class="yd-bs-badge">필수 선택</span><span class="yd-bs-step-count">STEP 1 / 3</span></div><h3>' + escT(cfg.headline) + '</h3><p class="yd-bs-lead">' + escT(cfg.lead) + '</p>' + body + minNotice(s) + '</div>';
      }
      if (step === 2) html = '<div class="yd-bs-step yd-bs-step-2"><div class="yd-bs-step-meta"><span class="yd-bs-badge">선택 사항</span><span class="yd-bs-step-count">STEP 2 / 3</span></div><h3>이 상품도 추천해요</h3><p class="yd-bs-lead">필요한 상품은 + 버튼으로 수량을 늘릴 수 있으며 선택하지 않아도 다음으로 넘어갈 수 있습니다.</p>' + addonsHtml(s) + '</div>';
      if (step === 3) html = '<div class="yd-bs-step yd-bs-step-3"><div class="yd-bs-step-meta"><span class="yd-bs-badge">최종 확인</span><span class="yd-bs-step-count">STEP 3 / 3</span></div><h3>선택한 상품을 확인해 주세요.</h3><p class="yd-bs-lead">장바구니에 담기기 전 메뉴와 수량, 추가상품을 마지막으로 확인하고 수정할 수 있습니다.</p>' + reviewHtml(s) + '</div>';
      return progress + html;
    }
    function shippingGauge(s) {
      var estimated = (cartSubtotalReady ? cartSubtotal : 0) + s.totalValue;
      var remaining = Math.max(0, CONFIG.FREE_SHIP_THRESHOLD - estimated);
      var percent = Math.max(0, Math.min(100, Math.round(estimated / CONFIG.FREE_SHIP_THRESHOLD * 100)));
      var marker = Math.max(7, Math.min(93, percent));
      var status = !cartSubtotalReady ? '장바구니 금액 확인 중…' : remaining ? money(remaining) + ' 더 담으면 무료배송' : '무료배송 조건을 충족했어요';
      var detail = cartSubtotalReady ? '장바구니 ' + money(cartSubtotal) + ' + 현재 선택 ' + money(s.totalValue) : '현재 선택 ' + money(s.totalValue);
      return '<aside class="yd-bs-shipping ' + (remaining === 0 && cartSubtotalReady ? 'is-complete' : '') + '" aria-label="무료배송 진행 상황"><div class="yd-bs-shipping-head"><span>9만원 이상 무료배송</span><strong aria-live="polite">' + status + '</strong></div><div class="yd-bs-shipping-track" role="progressbar" aria-valuemin="0" aria-valuemax="' + CONFIG.FREE_SHIP_THRESHOLD + '" aria-valuenow="' + Math.min(CONFIG.FREE_SHIP_THRESHOLD, estimated) + '"><div class="yd-bs-shipping-fill" style="width:' + percent + '%"></div><span class="yd-bs-shipping-percent" style="left:' + marker + '%">' + percent + '%</span></div><div class="yd-bs-shipping-meta"><span>장바구니 상품 기준</span><span>' + detail + '</span></div></aside>';
    }
    var canNext = function(s) { return (step === 1 || step === 3) ? s.reqQty >= cfg.min : true; };
    var primaryLabel = function() { return step === 3 ? '장바구니 담기' : '다음으로'; };
    var cartChoice = function() {
      return cartPopup ? '<div class="yd-bs-cart-result" role="dialog" aria-modal="true" aria-label="장바구니 담기 완료"><div class="yd-bs-cart-result-card"><span class="yd-bs-cart-result-badge">장바구니 담기 완료</span><h3>선택한 상품을 장바구니에 담았습니다.</h3><p>장바구니에서 주문을 확인하거나 다른 상품을 계속 둘러보세요.</p><div class="yd-bs-cart-result-actions"><a class="yd-bs-cart-pay" href="/shop_cart">결제하기</a><a class="yd-bs-cart-continue" href="/best">계속 쇼핑하기</a></div></div></div>' : '';
    };

    function render() {
      var scrollEl = root.querySelector('.yd-bs-scroll');
      var previousScroll = scrollEl ? scrollEl.scrollTop : 0;
      var s = flowState();
      var sheetOpen = root.classList.contains('is-open');
      root.innerHTML = '<div class="yd-bs-dock"><button class="yd-bs-review-btn" type="button">리뷰보기</button><button class="yd-bs-open"><span>옵션 보기</span></button></div><button class="yd-bs-backdrop" aria-label="옵션 창 닫기"></button><section class="yd-bs-sheet" role="dialog" aria-modal="true" aria-hidden="' + (sheetOpen ? 'false' : 'true') + '" aria-label="상품 옵션 선택"><div class="yd-bs-grab"></div><header class="yd-bs-head"><div class="yd-bs-head-text"><span class="yd-bs-mode">' + escT(cfg.title) + '</span><h2>상품 옵션 선택</h2></div><button class="yd-bs-close" aria-label="옵션 창 닫기">닫기</button></header><div class="yd-bs-scroll">' + (sheetOpen ? shippingGauge(s) : '') + stepContent(s) + '</div><footer class="yd-bs-foot">' + '<div class="yd-bs-total" aria-live="polite"><span>' + escT(cfg.unit) + ' ' + s.reqQty + '개 · 추가상품 ' + s.optQty + '개</span><strong>' + escT(s.total) + '</strong></div><div class="yd-bs-actions"><button class="yd-bs-back" ' + (step === 1 ? 'disabled' : '') + '>이전으로 돌아가기</button><button class="yd-bs-primary" ' + (canNext(s) ? '' : 'disabled') + '>' + primaryLabel() + '</button></div></footer></section>' + cartChoice();
      root.classList.toggle('is-cart-result', cartPopup);
      var scroll = root.querySelector('.yd-bs-scroll');
      if (scroll) scroll.scrollTop = previousScroll;
    }
    var openSheet = function() {
      root.classList.add('is-open'); document.body.classList.remove('yd-bs-cart-choice-active'); document.body.classList.add('yd-bs-lock'); render();
      try { if (IS_IFRAME && window.parent.__ydSetModalClose) window.parent.__ydSetModalClose(false); } catch (err) {}
    };
    var closeSheet = function() {
      root.classList.remove('is-open'); document.body.classList.remove('yd-bs-lock'); render();
      try { if (IS_IFRAME && window.parent.__ydSetModalClose) window.parent.__ydSetModalClose(true); } catch (err) {}
    };
    var dismissNativeCartModal = function() {
      var modal = document.getElementById('shop_detail_add_cart_alarm');
      try { if (modal && window.jQuery) window.jQuery(modal).modal('hide'); } catch (err) {}
      if (modal) { modal.classList.remove('in'); modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); }
      document.querySelectorAll('.modal-backdrop').forEach(function(x) { x.remove(); });
      document.body.classList.remove('modal-open');
      document.body.style.paddingRight = '';
    };
    var showCartChoice = function() {
      dismissNativeCartModal();
      /* 네이티브 담기완료 팝업이 지연 재표시되는 경우 대비 반복 정리 */
      [250, 600, 1200, 2000].forEach(function(ms) { setTimeout(dismissNativeCartModal, ms); });
      cartPopup = true; root.classList.remove('is-open'); render();
      document.body.classList.add('yd-bs-lock', 'yd-bs-cart-choice-active');
      try { if (IS_IFRAME && window.parent.__ydSetModalClose) window.parent.__ydSetModalClose(false); } catch (err) {}
    };
    var waitForNativeCartResult = function(attempt) {
      attempt = attempt || 0;
      var modal = document.getElementById('shop_detail_add_cart_alarm');
      var visible = modal && (modal.classList.contains('in') || getComputedStyle(modal).display !== 'none');
      var success = visible && /담았습니다|건강담기/.test(normalizeT(modal.textContent));
      if (success) { showCartChoice(); return; }
      if (attempt < 40) { setTimeout(function() { waitForNativeCartResult(attempt + 1); }, 100); return; }
      showCartChoice();
    };

    root.addEventListener('click', function(event) {
      var target = event.target.closest('button,a');
      if (!target || !root.contains(target)) return;
      if (target.matches('.yd-bs-review-btn')) {
        var revTab = Array.from(document.querySelectorAll('a')).find(function(a) {
          var s = (a.textContent || '') + (a.getAttribute('href') || '') + (a.getAttribute('onclick') || '') + (a.className || '');
          return /구매평|리뷰|_review|prod_detail_review/.test(s) &&
                 (a.closest('.detail_tab, ._prod_detail_tab_fixed, #fixed_tab, #fixed_tab_mobile') || /_review/.test(a.className || ''));
        });
        if (revTab) revTab.click();
        else {
          var revSec = document.querySelector('.detail_review_wrap, ._detail_review_wrap, #first_review, .detail_review_wrap_mobile');
          if (revSec) revSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (root.classList.contains('is-open')) closeSheet();
        return;
      }
      if (target.matches('.yd-bs-open')) { openSheet(); return; }
      if (target.matches('.yd-bs-close,.yd-bs-backdrop')) { closeSheet(); return; }
      if (target.matches('.yd-bs-cart-pay')) {
        dismissNativeCartModal();
        if (IS_IFRAME) { event.preventDefault(); try { window.top.location.href = '/shop_cart'; } catch (err) { location.href = '/shop_cart'; } }
        return;
      }
      if (target.matches('.yd-bs-cart-continue')) {
        dismissNativeCartModal();
        if (IS_IFRAME) {
          event.preventDefault();
          cartPopup = false;
          document.body.classList.remove('yd-bs-lock', 'yd-bs-cart-choice-active');
          render();
          /* 상품 팝업(부모 모달)까지 함께 닫고 목록으로 복귀 */
          try { if (window.parent.__ydRemoveModal) window.parent.__ydRemoveModal(); } catch (err) {}
        }
        return;
      }
      if (target.dataset.category !== undefined && target.dataset.category !== '') {
        activeTab = cfg.scheme === 'size' ? target.dataset.category : parseInt(target.dataset.category, 10) || 0;
        render(); return;
      }
      if (target.dataset.pick) { event.stopPropagation(); selectByName(target.dataset.pick); return; }
      if (target.dataset.addon) { event.stopPropagation(); selectByName(target.dataset.addon); return; }
      if (target.dataset.plus) { event.stopPropagation(); var itP = flowState().all.find(function(x) { return x.label === target.dataset.plus; }); if (itP) changeQty(itP, 1); return; }
      if (target.dataset.minus) { event.stopPropagation(); var itM = flowState().all.find(function(x) { return x.label === target.dataset.minus; }); if (itM) changeQty(itM, -1); return; }
      if (target.dataset.remove) { var itR = flowState().all.find(function(x) { return x.label === target.dataset.remove; }); if (itR) removeFlowItem(itR); return; }
      if (target.matches('.yd-bs-back')) { step = Math.max(1, step - 1); cartPopup = false; render(); var sc = root.querySelector('.yd-bs-scroll'); if (sc) sc.scrollTop = 0; return; }
      if (target.matches('.yd-bs-primary')) {
        var s = flowState();
        if (!canNext(s)) return;
        if (step < 3) { step += 1; cartPopup = false; render(); var sc2 = root.querySelector('.yd-bs-scroll'); if (sc2) sc2.scrollTop = 0; return; }
        var native = document.querySelector('#prod_detail a._btn_cart[onclick*="addCart"]') ||
                     document.querySelector('a.btn.cart.opt._btn_cart') ||
                     document.querySelector('#prod_detail a._btn_cart');
        if (native) { cartPopup = false; closeSheet(); native.click(); waitForNativeCartResult(0); }
      }
    });
    document.addEventListener('keydown', function(event) { if (event.key === 'Escape' && root.classList.contains('is-open') && !cartPopup) closeSheet(); });
    /* 안전망: 10초가 지나도 플로우가 없으면(스크립트 오류 등) 네이티브 UI 복원 */
    window.setTimeout(function() {
      if (!document.getElementById('yd-bs-root')) {
        document.documentElement.classList.add('yd-bs-native-visible');
      }
    }, 10000);

    function initialiseFlow() {
      var source = document.querySelector('#prod_detail .goods_wrapper');
      var selected = document.getElementById('prod_selected_options');
      var optionReady = document.querySelector('#prod_options a[onclick*="selectRequireOption"], #prod_options a[onclick*="selectOptionalOption"]');
      if (flowBooted) return;
      if (!source || !selected || !optionReady) {
        bootAttempts += 1;
        if (bootAttempts === 1) {
          /* DOM 변화 감시로 옵션이 뜨는 즉시 부팅 (폴링 대기 없음) */
          bootWatcher = new MutationObserver(function() { initialiseFlow(); });
          bootWatcher.observe(document.documentElement, { childList: true, subtree: true });
        }
        /* 로드 완료 후 1.5초 내 옵션이 없으면 옵션 없는 상품으로 조기 판정 (네이티브 UI 복원) */
        var loadDone = document.readyState === 'complete';
        if (loadDone && !bootLoadedAt) { bootLoadedAt = Date.now(); }
        var noOptionProduct = loadDone && bootLoadedAt && (Date.now() - bootLoadedAt > 1500) && !document.querySelector('#prod_options a');
        if (bootAttempts < 240 && !noOptionProduct) { setTimeout(initialiseFlow, 30); return; }
        if (bootWatcher) bootWatcher.disconnect();
        /* 옵션 없는 상품(단일 구매형 등) — 플로우 미적용, 흔적 없이 제거 + 네이티브 복원 */
        root.remove();
        document.documentElement.classList.add('yd-bs-native-visible');
        ydMark('optionFlow', true, '옵션 없는 상품 — 네이티브 유지');
        return;
      }
      flowBooted = true;
      if (bootWatcher) bootWatcher.disconnect();
      buildFlowCfg();
      /* 윤식단은 goods_wrapper가 상품 전체를 감싸므로 옵션 UI 요소만 개별 숨김 */
      var HIDE_SELECTORS = '#prod_options, #prod_selected_options, #prod_detail .categorize-mobile.buy_btns, #prod_detail .buy_btns, #prod_detail a.btn.defualt-cart, #prod_detail .defualt-cart, #prod_detail .today_arrival_wrap';
      document.querySelectorAll(HIDE_SELECTORS).forEach(function(el) { el.classList.add('yd-bs-native-source'); });
      /* 부팅 시점(선택 전) 그룹 라벨 캐시 — 조합형 토글 오염 방지 */
      document.querySelectorAll('#prod_options .form-select-wrap').forEach(function(wrap, i) {
        wrapLabels[i] = normalizeT(wrap.previousElementSibling ? wrap.previousElementSibling.textContent : '') ||
                        normalizeT((wrap.querySelector('.dropdown-toggle') || {}).textContent || '');
      });
      var observer = new MutationObserver(function() { scheduleRender(false); });
      observer.observe(selected, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['value'] });
      /* 조합형 2단 옵션이 늦게 채워지는 것을 감지 */
      var optionsBox = document.getElementById('prod_options');
      if (optionsBox) observer.observe(optionsBox, { childList: true, subtree: true });
      render();
      loadCartSubtotal();
      ydMark('optionFlow', true, cfg.title + ' 활성 (' + cfg.scheme + ')');
    }
    initialiseFlow();
  }

  /* ═══ 장바구니 UX 통합 ═══ */
  function bindCartUx() {
    if (!isCartPage()) {
      return;
    }

    const HIDE_LABELS = ['상품금액', '상품 할인금액', '즉시/기간 할인', '배송비', '배송 방식'];

    function hideItemDetailRows() {
      let hidden = 0;
      qsa('p, span, div, dt, th').forEach(function(el) {
        const t = (el.textContent || '').trim();
        if (HIDE_LABELS.indexOf(t) === -1) {
          return;
        }
        if (el.closest('aside')) {
          return;
        }
        if (el.children.length > 1) {
          return;
        }
        let row = el.parentElement;
        if (t === '즉시/기간 할인') {
          const block = row && row.parentElement;
          if (block && /border-l-2/.test(block.className || '')) {
            row = block;
          }
        }
        if (row && row.style.display !== 'none') {
          row.style.display = 'none';
        }
        hidden += 1;
      });
      ydMark('cartDetailRowsHidden', hidden > 0, '숨김 행 ' + hidden + '개');
    }

    function applyOrderButton() {
      const guest = isGuestUser();

      const legacy = qs('.clearfix.bottom-btn.btn-wrap');
      if (legacy) {
        const want = guest ? 'none' : '';
        if (legacy.style.display !== want) {
          legacy.style.display = want;
        }
      }

      let found = false;
      qsa('button').forEach(function(btn) {
        if (!/^주문하기/.test((btn.textContent || '').trim())) {
          return;
        }
        found = true;
        const wrap = btn.parentElement || btn;

        if (guest) {
          if (wrap.style.display !== 'none') {
            wrap.style.display = 'none';
          }
          return;
        }

        if (wrap.style.display === 'none') {
          wrap.style.display = '';
        }

        if (wrap.dataset.ydFixedBtn !== '1') {
          wrap.dataset.ydFixedBtn = '1';
          wrap.style.position = 'fixed';
          wrap.style.left = '0';
          wrap.style.right = '0';
          wrap.style.bottom = '0';
          wrap.style.zIndex = '10000';
          wrap.style.background = '#fff';
          wrap.style.margin = '0';
          wrap.style.padding = '10px 16px calc(10px + env(safe-area-inset-bottom))';
          wrap.style.boxShadow = '0 -2px 10px rgba(0,0,0,0.08)';
          const aside = wrap.closest('aside');
          if (aside) {
            aside.style.paddingBottom = '110px';
          }
        }
      });
      ydMark('cartOrderButton', found, guest ? '비로그인: 숨김' : '로그인: 하단 고정');
    }

    function polishCartControls() {
      /* 바로구매 버튼 숨김 (소유자 지시 2026-07-21) */
      qsa('fo-shopping-cart button').forEach(function(btn) {
        if ((btn.textContent || '').trim() === '바로구매' && btn.style.display !== 'none') {
          btn.style.display = 'none';
        }
      });
      /* 수량 스텝퍼 박스를 타원형으로 */
      qsa('fo-shopping-cart button[class*="disabled:bg-transparent"]').forEach(function(b) {
        var box = b.parentElement;
        if (box && box.dataset.ydPill !== '1') {
          box.dataset.ydPill = '1';
          box.style.border = '1px solid #dce1da';
          box.style.borderRadius = '999px';
          box.style.background = '#fff';
          box.style.overflow = 'hidden';
        }
      });
    }

    function run() {
      hideItemDetailRows();
      applyOrderButton();
      polishCartControls();
    }

    run();
    window.setInterval(run, 1000);
    ensureObserver('cartUx', run);
  }

  /* ═══ 결제 완료 페이지 ═══ */
  function bindPaymentCompletePatches() {
    if (!isPaymentCompletePage()) {
      return;
    }

    function patch() {
      const scope = qs('.order-complete, .payment_complete, .shop_payment_complete, .doz_sys') || document;
      const allEls = qsa('li *, tr *, td, th, div, span, a', scope);
      const labelEl = allEls.find(function(el) {
        return ((el.textContent || '').trim().replace(/\s+/g, '') === '배송방법');
      });

      if (labelEl) {
        labelEl.textContent = '배송일정';

        const valueEl =
          labelEl.nextElementSibling ||
          (labelEl.parentElement && labelEl.parentElement.nextElementSibling) ||
          null;

        if (valueEl && /직접\s*배송/.test(valueEl.textContent || '') && !valueEl.dataset.ydPatched) {
          valueEl.dataset.ydPatched = '1';
          valueEl.textContent = formatDate(getNextShipDate(new Date())) + ' 발송 예정';
          valueEl.style.fontWeight = '700';
          valueEl.style.color = '#2a341e';
        }
      }

      const anchors = qsa('a', scope).filter(function(a) {
        return a.offsetParent !== null;
      });

      const orderBtn = anchors.find(function(a) {
        return /주문서로|주문내역|주문상세/.test((a.textContent || '').trim());
      });
      const myBtn = anchors.find(function(a) {
        return /마이페이지|마이 페이지/.test((a.textContent || '').trim());
      });

      if (orderBtn && myBtn && !orderBtn.dataset.ydPatched) {
        orderBtn.dataset.ydPatched = '1';

        const wrap = orderBtn.parentElement;
        if (wrap) {
          Object.assign(wrap.style, {
            display: 'flex',
            width: '100%',
            justifyContent: 'center',
            alignItems: 'stretch'
          });

          [orderBtn, myBtn].forEach(function(btn) {
            Object.assign(btn.style, {
              flex: '0 0 50%',
              width: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0',
              height: '46px',
              fontSize: '15px',
              lineHeight: '1.4',
              textAlign: 'center',
              whiteSpace: 'nowrap'
            });
          });

          orderBtn.style.borderRight = '1px solid #ffffff80';
          myBtn.style.fontWeight = '700';
        }
      }
    }

    patch();
    ensureObserver('paymentCompletePatch', patch);
  }

  /* ═══ 마이페이지 다운로드 쿠폰 숨김 ═══ */
  function bindMyPageCouponHide() {
    if (!pageIs('/shop_mypage')) {
      return;
    }

    function hide() {
      qsa('.mypage-coupon-wrap').forEach(function(coupon) {
        if (qs('button._down_coupon_btn', coupon) && coupon.style.display !== 'none') {
          coupon.style.display = 'none';
        }
      });
    }

    hide();
    ensureObserver('myPageCouponHide', hide);
  }

  /* ═══ 결제 페이지 ═══ */
  function findNearestSelectFromBlock(block) {
    if (!block) {
      return null;
    }

    return (
      qs('select', block) ||
      qs('select', block.parentElement || block) ||
      qs('select', block.closest('form') || block.closest('div') || block)
    );
  }

  function findDeliveryMemoSelect() {
    let select = qs('.css-8stab4');
    if (select) {
      return select;
    }

    const candidates = qsa('label, div, span').filter(function(el) {
      return ((el.textContent || '').replace(/\s+/g, '').indexOf('배송메모') !== -1);
    });

    for (let i = 0; i < candidates.length; i += 1) {
      const el = candidates[i];
      const block =
        el.closest('label') ||
        el.closest('.form-group') ||
        el.closest('.input_block') ||
        el.parentElement;

      select = findNearestSelectFromBlock(block);
      if (select) {
        return select;
      }
    }

    return null;
  }

  function bindCheckoutPatches() {
    if (!isCheckoutPage()) {
      return;
    }

    function addDeliveryMemoOption() {
      const select = findDeliveryMemoSelect();
      if (!select) {
        return;
      }

      if (!qs('option[value="주말/공휴일 수령 불가합니다."]', select)) {
        const option = document.createElement('option');
        option.value = '주말/공휴일 수령 불가합니다.';
        option.textContent = '주말/공휴일 수령 불가';

        const firstOption = qs('option[value="배송메모를 선택해 주세요."]', select);
        if (firstOption && firstOption.nextElementSibling) {
          select.insertBefore(option, firstOption.nextElementSibling);
        } else if (select.children[1]) {
          select.insertBefore(option, select.children[1]);
        } else {
          select.appendChild(option);
        }
      }

      if (!qs('#yd-delivery-memo-notice')) {
        const parent = select.closest('label') || select.parentElement;
        if (parent && parent.parentNode) {
          const notice = document.createElement('div');
          notice.id = 'yd-delivery-memo-notice';
          notice.className = 'yd-notice-box';
          notice.innerHTML = '<strong>주말 또는 공휴일 수령이 불가하면 꼭 배송메모를 선택해주세요.</strong>';
          parent.parentNode.insertBefore(notice, parent.nextSibling);
        }
      }
    }

    function patchPaymentText() {
      qsa('span.css-149340u, span.css-epvm6').forEach(function(span) {
        const text = (span.textContent || '').trim();
        if (text === '신용카드' || text === '카드 / 간편결제') {
          span.textContent = '간편결제 / 신용카드';
          span.style.fontSize = '15px';
          span.style.fontWeight = '700';
        }
      });
    }

    function run() {
      addDeliveryMemoOption();
      patchPaymentText();
    }

    run();
    ensureObserver('checkoutPatches', run);
  }

  /* ═══ 회원정보 팝업 높이 ═══ */
  function bindProfileModalHeight() {
    const TARGET = 'article.modal_article.login.p_lr_space.pb24';

    function setVhVar() {
      document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
    }

    function forceSize(el) {
      const h = 'calc(var(--vh, 1vh) * 98)';
      el.style.setProperty('height', h, 'important');
      el.style.setProperty('max-height', h, 'important');
      el.style.setProperty('min-height', h, 'important');
      el.style.setProperty('overflow-y', 'auto', 'important');
      el.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
      el.style.setProperty('box-sizing', 'border-box', 'important');
      el.style.setProperty('padding-bottom', 'calc(24px + env(safe-area-inset-bottom))', 'important');
    }

    function applyAll() {
      qsa(TARGET).forEach(forceSize);
    }

    setVhVar();
    applyAll();
    window.addEventListener('resize', function() {
      setVhVar();
      applyAll();
    }, { passive: true });
    ensureObserver('profileModalHeight', applyAll);
  }

  /* ═══ 구매평 작성 팝업 높이 ═══ */
  function bindReviewModalHeight() {
    const TARGET_SEL = 'div.modal-body._add_review_wrap, .modal-body._add_review_wrap, ._add_review_wrap';

    function setVhVar() {
      document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
    }

    function applyStyles(body) {
      const h = 'calc(var(--vh, 1vh) * 98)';
      const shell =
        body.closest('[role="dialog"]') ||
        body.closest('.modal-content') ||
        body.closest('.modal-dialog') ||
        body.closest('.modal') ||
        body.closest('.modal_wrap') ||
        body.closest('.modal_container') ||
        body.closest('.modal_article') ||
        body.closest('article') ||
        body.parentElement;

      if (shell) {
        shell.style.setProperty('height', h, 'important');
        shell.style.setProperty('max-height', h, 'important');
        shell.style.setProperty('min-height', h, 'important');
        shell.style.setProperty('box-sizing', 'border-box', 'important');
        shell.style.setProperty('display', 'flex', 'important');
        shell.style.setProperty('flex-direction', 'column', 'important');
        shell.style.setProperty('overflow', 'hidden', 'important');
      }

      body.style.setProperty('flex', '1 1 auto', 'important');
      body.style.setProperty('min-height', '0', 'important');
      body.style.setProperty('overflow-y', 'auto', 'important');
      body.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
      body.style.setProperty('box-sizing', 'border-box', 'important');
      body.style.setProperty('padding-bottom', 'calc(28px + env(safe-area-inset-bottom))', 'important');
    }

    function applyAll() {
      qsa(TARGET_SEL).forEach(applyStyles);
    }

    setVhVar();
    applyAll();
    window.addEventListener('resize', function() {
      setVhVar();
      applyAll();
    }, { passive: true });
    ensureObserver('reviewModalHeight', applyAll);
  }

  /* ═══ 비회원 장바구니 카카오 배너 ═══ */
  function bindCartKakaoBanner() {
    const CONFIG_BANNER = {
      bannerLink: CONFIG.KAKAO_CHAT_URL,
      cartKeywords: ['cart', 'basket', 'order/basket']
    };

    function isCartKeywordPage() {
      const currentUrl = window.location.href.toLowerCase();
      return CONFIG_BANNER.cartKeywords.some(function(keyword) {
        return currentUrl.indexOf(keyword) !== -1;
      });
    }

    function renderBanner() {
      const existing = qs('#agp-persistent-banner');
      if (!isGuestUser() || !isCartKeywordPage()) {
        if (existing) {
          existing.remove();
        }
        return;
      }

      if (existing) {
        return;
      }

      const banner = document.createElement('div');
      banner.id = 'agp-persistent-banner';
      banner.style.cssText = [
        'position:fixed',
        'bottom:95px',
        'left:5%',
        'width:90%',
        'height:43px',
        'z-index:10001',
        'background-color:#FFEB00',
        'border-radius:15px',
        'box-shadow:0 2px 8px rgba(0,0,0,0.15)',
        'overflow:hidden',
        'display:flex',
        'align-items:center',
        'justify-content:center'
      ].join(';');

      const anchor = document.createElement('a');
      anchor.href = CONFIG_BANNER.bannerLink;
      anchor.target = '_blank';
      anchor.style.cssText = [
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'width:100%',
        'height:100%',
        'text-decoration:none',
        'color:#333',
        'font-weight:bold',
        'font-size:14px'
      ].join(';');
      anchor.textContent = '카카오 채널 추가하고 18,000원 쿠폰받기 >';

      banner.appendChild(anchor);
      document.body.appendChild(banner);
    }

    renderBanner();
    ensureObserver('cartKakaoBanner', renderBanner);
  }

  /* 옵션 플로우는 본문 파싱 직후 즉시 부팅 (yd-bs-root 가드로 중복 방지) */
  try { bindOptionFlow(); } catch (err) {}

  onReady(function() {
    bindBrokenSummaryGuard();
    if (!IS_IFRAME) {
      bindProductPrefetch();
      bindCustomProductModal();
      bindCartKakaoBanner();
    }

    bindOptionKeepOpen();
    bindCartAwareFreeShip();
    bindOptionFlow();
    patchLayerPopupButtons();
    ensureObserver('patchLayerPopupButtons', patchLayerPopupButtons);
    bindShippingSchedule();
    bindCartUx();
    bindPaymentCompletePatches();
    bindMyPageCouponHide();
    bindCheckoutPatches();
    bindProfileModalHeight();
    bindReviewModalHeight();

    window.setTimeout(function() {
      Object.keys(ydStatus.features).forEach(function(key) {
        if (!ydStatus.features[key].ok) {
          console.warn('[YD v3.13] 미적용 감지: ' + key + ' — ' + ydStatus.features[key].note + ' (YD_CHECK()로 상세 확인)');
        }
      });
    }, 6000);
  });
})();
