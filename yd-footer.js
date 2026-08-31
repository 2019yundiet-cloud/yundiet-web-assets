
(function() {
  'use strict';

  if (window.__YD_FOOTER_V3_135__) {
    return;
  }
  window.__YD_FOOTER_V3_135__ = true;

  const CONFIG = {
    BEST_URL: 'https://www.yundiet.com/best',
    KAKAO_CHAT_URL: 'http://pf.kakao.com/_Lxexcxkj/friend',
    MODAL_ID: 'yd-custom-modal',
    CART_API: '/shop/cart/get_cart_content.cm?cart_type=normal',
    FREE_SHIP_THRESHOLD: 90000,
    FREE_SHIP_DONE_TEXT: '장바구니 포함, 무료배송 조건 충족!',
    MEMBERSHIP_UI_ENABLED: false,
    MEMBERSHIP_STATE_ENDPOINT: '',
    MEMBERSHIP_SCHEMA: 'yundiet-membership-ui/v1',
    MEMBERSHIP_REQUEST_TIMEOUT: 5000,
    BOOST_COUPON_URL: '/?coupon=7C18FC5909F58&utm_source=onsite_popup&utm_medium=popup&utm_campaign=first_buy_boost&utm_content=coupon2000',
    DISCOUNT_MAP_URL: 'https://2019yundiet-cloud.github.io/yundiet-web-assets/discount-map.json',
    DAYS: ['일', '월', '화', '수', '목', '금', '토'],
    TOP_BANNER_AB: {
      experimentId: 'top_banner_coupon_20260817',
      storageKey: 'yd_exp_top_banner_coupon_20260817',
      previewParam: 'yd_top_banner_variant',
      selector: '#w202207150ee0a4036592b a._fade_link, #w20240730fec120873ad50 a._fade_link',
      variants: {
        A: {
          copy: '3초 회원가입 18,000원 쿠폰 받기',
          href: '/site_join_type_choice',
          destinationType: 'signup'
        },
        B: {
          copy: '카카오채널 추가하고 18,000원 쿠폰받기',
          href: '/site_join_type_choice',
          destinationType: 'signup'
        }
      }
    }
  };

  const IS_IFRAME = (function() {
    try {
      return window.self !== window.top;
    } catch (err) {
      return true;
    }
  })();

  /* ── 자체 검증 (콘솔에서 YD_CHECK() 실행) ── */
  const ydStatus = { version: '3.135', page: location.pathname, features: {} };
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

  /* ═══ 상단 띠지 회원가입 vs 카카오채널 A/B 실험 (2026-08-17) ═══
     - 비회원만 실험에 포함: 기존 회원에게 회원가입 안을 노출하지 않는다.
     - 브라우저별 A/B 50:50 최초 배정 후 localStorage로 고정한다.
     - 검증 쿼리 강제값은 계측하지 않아 운영 집계를 오염시키지 않는다. */
  function bindTopBannerExperiment() {
    const exp = CONFIG.TOP_BANNER_AB;
    let impressionFired = false;
    let assignment = null;

    function previewVariant() {
      try {
        const value = new URLSearchParams(location.search).get(exp.previewParam);
        return value && exp.variants[String(value).toUpperCase()] ? String(value).toUpperCase() : '';
      } catch (err) {
        return '';
      }
    }

    function storedVariant() {
      try {
        const value = window.localStorage.getItem(exp.storageKey);
        return value && exp.variants[value] ? value : '';
      } catch (err) {
        return '';
      }
    }

    function randomVariant() {
      try {
        if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
          const value = new Uint32Array(1);
          window.crypto.getRandomValues(value);
          return value[0] % 2 === 0 ? 'A' : 'B';
        }
      } catch (err) {}
      return Math.random() < 0.5 ? 'A' : 'B';
    }

    function resolveAssignment() {
      if (assignment) {
        return assignment;
      }
      const preview = previewVariant();
      if (preview) {
        assignment = { variant: preview, preview: true };
        return assignment;
      }
      /* 실험 종료(2026-08-31 소유자 확정): 관측 우세안 B의 문구를 운영안으로 고정한다.
         실제 혜택은 회원가입 뒤 자동발행되는 18,000원 가입쿠폰 5종이며,
         과거 친구추가 다운로드 쿠폰 5종은 계속 숨긴다. */
      assignment = { variant: 'B', preview: false };
      return assignment;
    }

    function analyticsEvent(name, variant, config) {
      const params = {
        experiment_id: exp.experimentId,
        variant_id: variant,
        exp_variant_string: 'yundiet-' + exp.experimentId + '-' + variant,
        experiment_surface: 'top_banner',
        destination_type: config.destinationType,
        transport_type: 'beacon'
      };
      try {
        if (typeof window.gtag === 'function') {
          window.gtag('event', name, params);
        } else {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push(Object.assign({ event: name }, params));
        }
        return true;
      } catch (err) {
        return false;
      }
    }

    function render() {
      const preview = previewVariant();
      if (!preview && !isGuestUser()) {
        ydMark('topBannerExperiment', true, '회원 제외 · 기존 카카오채널 띠지 유지');
        return;
      }

      const links = qsa(exp.selector);
      if (!links.length) {
        ydMark('topBannerExperiment', false, '대상 띠지 위젯 미발견');
        return;
      }

      const resolved = resolveAssignment();
      const variant = resolved.variant;
      const config = exp.variants[variant];
      links.forEach(function(link) {
        if (link.textContent !== config.copy) {
          link.textContent = config.copy;
        }
        if (link.getAttribute('href') !== config.href) {
          link.setAttribute('href', config.href);
        }
        link.setAttribute('data-yd-top-banner-experiment', exp.experimentId);
        link.setAttribute('data-yd-top-banner-variant', variant);
        link.setAttribute('aria-label', config.copy);

        if (link.getAttribute('data-yd-top-banner-ab-bound') !== 'true') {
          link.setAttribute('data-yd-top-banner-ab-bound', 'true');
          link.addEventListener('click', function() {
            if (!resolved.preview) {
              analyticsEvent('yd_tb_' + variant.toLowerCase() + '_click', variant, config);
            }
          });
        }
      });

      if (!impressionFired && !resolved.preview) {
        impressionFired = analyticsEvent('yd_tb_' + variant.toLowerCase() + '_view', variant, config);
      }

      window.YD_TOP_BANNER_AB = {
        experimentId: exp.experimentId,
        variant: variant,
        preview: resolved.preview,
        audience: preview ? 'preview' : 'guest',
        copy: config.copy,
        href: config.href,
        impressionFired: impressionFired
      };
      ydMark('topBannerExperiment', true,
        variant + '안 · ' + (resolved.preview ? '검증 미계측' : '비회원 계측'));
    }

    render();
    ensureObserver('topBannerExperiment', render);
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

  /* 모바일 헤더의 60x30 썸네일을 동일 로고의 Retina 대응 원본으로 교체 */
  function bindHeaderLogoResolution() {
    const highResolutionLogo = 'https://cdn.imweb.me/thumbnail/20250523/87954525425e9.png';
    const selector = '#doz_header_wrap .inline_widget.logo img.normal_logo, #doz_header_wrap .inline_widget.logo img.scroll_logo';

    function upgrade() {
      const logos = qsa(selector);
      logos.forEach(function(img) {
        if (img.getAttribute('src') !== highResolutionLogo) {
          img.setAttribute('src', highResolutionLogo);
        }
        if (img.hasAttribute('data-src')) {
          img.setAttribute('data-src', highResolutionLogo);
        }
        if (img.hasAttribute('srcset')) {
          img.removeAttribute('srcset');
        }
        img.setAttribute('data-yd-logo-resolution', '363x180');
      });
      ydMark('headerLogoResolution', logos.length > 0,
        logos.length ? '고해상도 363x180 원본 적용 · 표시 크기 유지' : '헤더 로고 미발견');
    }

    upgrade();
    ensureObserver('headerLogoResolution', upgrade);
  }

  function isProductDetailPage() {
    return /\/shop_view/.test(location.pathname) || location.search.indexOf('idx=') !== -1;
  }

  const PURE_PROTEIN_NO_SHIP_GAUGE_IDS = new Set(['1125', '1214', '1233', '1235', '1242', '1246']);
  const DANBAEKBAP_HIDE_COUPON_IDS = new Set(['672', '675']);
  const PURE_PROTEIN_COUPON_LABELS = {
    '1125': '[순수단백 3세트] 한돈스테이크 무료배송',
    '1214': '[순수단백 3세트] 단백 직화 불고기 무료배송',
    '1233': '[순수단백 3세트] 단백 제육 고추장맛 무료배송',
    '1235': '[순수단백 3세트] 단백 제육 쌈장맛 무료배송',
    '1242': '[순수단백 3세트] 스팀 닭가슴살 무료배송',
    '1246': '[순수단백 3세트] 돈다리살 고추장맛 무료배송'
  };
  const PURE_PROTEIN_COUPON_CODES = {
    '1125': 'c20260817fc5bb105c440d',
    '1214': 'c202608175c5ddf30ea17e',
    '1233': 'c202608179025c3ef98627',
    '1235': 'c202608170df82d164cb07',
    '1242': 'c2026081701cf3e1a233be',
    '1246': 'c202608176c4d225051240'
  };

  function currentProductIdx() {
    return new URLSearchParams(location.search).get('idx') || '';
  }

  function isPureProteinNoShipGaugeProduct() {
    return isProductDetailPage() && PURE_PROTEIN_NO_SHIP_GAUGE_IDS.has(currentProductIdx());
  }

  function isDanbaekbapCouponHiddenProduct() {
    return isProductDetailPage() && DANBAEKBAP_HIDE_COUPON_IDS.has(currentProductIdx());
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
    /* /main = 모바일 하단 탭 '홈' 버튼의 랜딩 경로(홈과 동일 구성) — v3.45에서 추가 */
    const p = location.pathname.replace(/\/+$/, '').toLowerCase();
    return p === '' || p === '/index' || p === '/home' || p === '/main';
  }

  function isWholesalePage() {
    return location.pathname.replace(/\/+$/, '').toLowerCase() === '/wholesale';
  }

  function applyWholesalePageFixes() {
    if (!isWholesalePage()) {
      return;
    }

    document.documentElement.classList.add('yd-wholesale-page');

    qsa('.option_badge').forEach(function(badge) {
      const match = badge.textContent.trim().match(/^(100g|1팩)(?:당)?\s*([0-9,]+)원$/);
      if (!match) {
        return;
      }
      const amount = String(Number(match[2].replace(/,/g, ''))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const label = match[1] + '당 ' + amount + '원';
      if (badge.textContent !== label) {
        badge.textContent = label;
      }
      badge.setAttribute('data-yd-wholesale-unit-badge', '');
    });

    const formUrl = 'https://naver.me/5W9uV6OC';
    const heroSelector = '#s20251029368218a9f271d, #s202510297c0ef98f0e934';
    qsa(heroSelector + ' a.visual_link').forEach(function(link) {
      if (link.getAttribute('href') !== formUrl) {
        link.setAttribute('href', formUrl);
      }
      if (link.getAttribute('aria-label') !== '윤식단 공동구매 신청하기') {
        link.setAttribute('aria-label', '윤식단 공동구매 신청하기');
      }
    });

    qsa(heroSelector + ' .item.holder.section').forEach(function(item) {
      if (qs('a.visual_link', item)) {
        return;
      }
      const link = document.createElement('a');
      link.className = 'visual_link yd-wholesale-cta-fix';
      link.href = formUrl;
      link.setAttribute('aria-label', '윤식단 공동구매 신청하기');
      link.style.cssText = 'position:absolute;inset:0;display:block;z-index:3;';
      item.appendChild(link);
    });

    const savingCopy = {
      '1098': { text: '센터 회원 특별가 · 9% 혜택' },
      '1111': { text: '센터 회원 특별가 · 8% 혜택' },
      '1108': { text: '센터 회원 특별가 · 21% 혜택' },
      '1101': { text: '센터 회원 전용 대용량가' },
      '1106': { text: '센터 회원 특별가 · 10% 혜택' },
      '1221': { text: '센터 회원 특별가 · 3% 혜택' },
      '1252': { text: '센터 회원 특별가 · 3% 혜택' },
      '1220': { text: '센터 회원 전용 구성', neutral: true },
      '1222': { text: '센터 회원 전용 구성', neutral: true }
    };
    const unitPriceCopy = {
      '1108': '100g당 1,090원부터',
      '1101': '100g당 1,130원부터',
      '1106': '100g당 1,390원부터',
      '1221': '100g당 1,915원부터',
      '1252': '100g당 1,967원부터',
      '1222': '100g당 1,995원부터',
      '1253': '100g당 1,670원부터'
    };
    const wholesaleOrder = ['1098', '1111', '1108', '1101', '1106', '1221', '1220', '1253', '1252', '1222'];
    const wholesaleRank = new Map(wholesaleOrder.map(function(idx, rank) { return [idx, rank]; }));
    const cardsByParent = new Map();

    qsa('.shop-item').forEach(function(card) {
      let idx = '';
      try {
        const props = JSON.parse(card.getAttribute('data-product-properties') || '{}');
        idx = String(props.idx || '');
      } catch (err) {}

      if (wholesaleRank.has(idx) && card.parentElement) {
        const group = cardsByParent.get(card.parentElement) || [];
        group.push({ card: card, idx: idx });
        cardsByParent.set(card.parentElement, group);
      }

      const compare = savingCopy[idx];
      const detail = qs('.item-pay-detail', card);
      if (compare && detail) {
        let saving = qs('[data-yd-wholesale-saving]', detail);
        if (!saving) {
          saving = document.createElement('p');
          saving.className = 'yd-wholesale-saving';
          saving.setAttribute('data-yd-wholesale-saving', idx);
          detail.appendChild(saving);
        }
        saving.classList.toggle('is-neutral', !!compare.neutral);
        if (saving.textContent !== compare.text) {
          saving.textContent = compare.text;
        }
      }

      const unitPrice = unitPriceCopy[idx];
      if (unitPrice && detail) {
        qsa(':scope > .sale_price, :scope > .special-sale-wrap, :scope > .pay', detail).forEach(function(el) {
          if (el.style.display !== 'none') {
            el.style.display = 'none';
          }
          el.setAttribute('data-yd-wholesale-total-price-source', '');
        });
        qsa('[data-yd-discount-display="root"]', detail).forEach(function(el) {
          if (el.style.display !== 'none') {
            el.style.display = 'none';
          }
          el.setAttribute('data-yd-wholesale-total-price-source', '');
        });
        let row = qs('[data-yd-wholesale-unit-price]', detail);
        if (!row) {
          row = document.createElement('p');
          row.className = 'yd-wholesale-unit-price';
          row.setAttribute('data-yd-wholesale-unit-price', idx);
          detail.insertBefore(row, detail.firstChild);
        }
        if (row.textContent !== unitPrice) {
          row.textContent = unitPrice;
        }
      }

      if (idx !== '1220') {
        return;
      }

      if (!detail) {
        return;
      }
      qsa('[data-yd-discount-display="root"]', detail).forEach(function(el) { el.remove(); });
      const source = qs('p.pay', detail);
      if (source && source.textContent.replace(/[^0-9]/g, '') === '0') {
        source.style.display = 'none';
        source.setAttribute('data-yd-wholesale-price-source', '');
      }
      if (!qs('[data-yd-wholesale-price]', detail)) {
        const price = document.createElement('p');
        price.className = 'no-margin yd-wholesale-balancy-price';
        price.setAttribute('data-yd-wholesale-price', '');
        price.innerHTML = '<span style="font-size:12px;color:#666;margin-right:6px;">4팩 체험가</span><strong style="font-size:16px;color:#2a341e;">9,800원부터</strong>';
        detail.insertBefore(price, source || detail.firstChild);
      }
    });

    cardsByParent.forEach(function(group, parent) {
      const desired = group.slice().sort(function(a, b) {
        return wholesaleRank.get(a.idx) - wholesaleRank.get(b.idx);
      });
      const currentKey = group.map(function(item) { return item.idx; }).join(',');
      const desiredKey = desired.map(function(item) { return item.idx; }).join(',');
      if (currentKey !== desiredKey) {
        desired.forEach(function(item) { parent.appendChild(item.card); });
      }
    });

    if (isProductDetailPage() && new URLSearchParams(location.search).get('idx') === '1220') {
      const root = qs('.pay_detail');
      const current = root && qs('.real_price', root);
      const currentValue = current ? current.textContent.replace(/[^0-9]/g, '') : '';
      if (root && currentValue === '0') {
        qsa('[data-yd-discount-display="root"]', root).forEach(function(el) { el.remove(); });
        const holder = current.closest('.holder');
        if (holder) {
          holder.style.display = 'none';
          holder.setAttribute('data-yd-wholesale-price-source', '');
        }
        if (!qs('[data-yd-wholesale-price]', root)) {
          const row = document.createElement('div');
          row.className = 'holder table-row';
          row.setAttribute('data-yd-wholesale-price', '');
          row.innerHTML = '<span style="font-size:13px;color:#666;margin-right:8px;">4팩 체험가</span><strong class="real_price">9,800원부터</strong>';
          root.insertBefore(row, root.firstChild);
        }
      }
    }

    ydMark('wholesalePageFixes', true, 'PC 가로 스크롤·밸런시 0원·모바일 CTA 보정');
  }

  function isGuestUser() {
    return !!qs('.member-info.guest');
  }

  function getHeaderOffsetPx() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--site-header-height').trim();
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  /* ═══ 판매가 전환 후 네이티브 할인 표시 재현 ═══
     CDN 맵 + 네이티브 할인 부재 + 현재 판매가 일치의 3중 가드.
     네이티브 클래스는 DOM에만 재사용하며 공용 클래스 CSS는 추가하지 않는다. */
  function bindDiscountDisplay() {
    const warnedMismatches = new Set();
    let mapPromise = null;

    function fetchMapOnce() {
      if (mapPromise) {
        return mapPromise;
      }
      mapPromise = fetch(CONFIG.DISCOUNT_MAP_URL + '?v=' + encodeURIComponent(ydStatus.version), {
        cache: 'force-cache',
        credentials: 'omit'
      }).then(function(res) {
        if (!res.ok) {
          throw new Error('discount map HTTP ' + res.status);
        }
        return res.json();
      }).then(function(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          throw new Error('discount map schema');
        }
        Object.keys(raw).forEach(function(idx) {
          const row = raw[idx];
          if (!/^\d+$/.test(idx) || !row ||
              !Number.isInteger(row.org) || !Number.isInteger(row.sale) || !Number.isInteger(row.pct) ||
              row.org < 0 || row.sale < 0 || row.pct < 0 || row.pct > 100) {
            throw new Error('discount map row ' + idx);
          }
        });
        return raw;
      }).catch(function() {
        return null;
      });
      return mapPromise;
    }

    function parseWon(text) {
      const digits = String(text || '').replace(/[^0-9]/g, '');
      return digits === '' ? null : Number(digits);
    }

    function money(value) {
      return Number(value).toLocaleString('ko-KR') + '원';
    }

    function hasNativeDiscount(root) {
      return qsa('.sale_price, .sale_percentage, .special-sale-wrap', root).some(function(el) {
        return !el.closest('[data-yd-discount-display]');
      });
    }

    function warnMismatchOnce(surface, idx, actual, expected) {
      const key = surface + ':' + idx;
      if (warnedMismatches.has(key)) {
        return;
      }
      warnedMismatches.add(key);
      console.warn('[YD price-display] 상품 ' + idx + ' ' + surface +
        ' 표시가 불일치 — 현재 ' + actual + '원 / 맵 ' + expected + '원 (렌더 생략)');
    }

    function hideSource(el) {
      el.setAttribute('data-yd-discount-source-hidden', '');
      el.setAttribute('data-yd-discount-source-display', el.style.display || '');
      el.style.display = 'none';
    }

    function restoreSources(root) {
      qsa('[data-yd-discount-source-hidden]', root).forEach(function(el) {
        const previous = el.getAttribute('data-yd-discount-source-display') || '';
        if (previous) {
          el.style.display = previous;
        } else {
          el.style.removeProperty('display');
        }
        el.removeAttribute('data-yd-discount-source-hidden');
        el.removeAttribute('data-yd-discount-source-display');
      });
    }

    function removeCustom(root) {
      qsa('[data-yd-discount-display="root"]', root).forEach(function(el) { el.remove(); });
      restoreSources(root);
    }

    function patchDetail(map) {
      if (!isProductDetailPage()) {
        return;
      }
      const idx = new URLSearchParams(location.search).get('idx');
      const row = idx && map[idx];
      const root = qs('.pay_detail');
      if (!row || !root) {
        return;
      }

      if (hasNativeDiscount(root)) {
        if (qs('[data-yd-discount-display="root"]', root)) {
          removeCustom(root);
        }
        return;
      }
      if (qs('[data-yd-discount-display="root"]', root)) {
        return;
      }

      const current = qs('.real_price', root);
      const currentHolder = current && current.closest('.holder');
      const actual = current ? parseWon(current.textContent) : null;
      if (actual === null || actual !== row.sale) {
        if (actual !== null) {
          warnMismatchOnce('detail', idx, actual, row.sale);
        }
        return;
      }
      if (!currentHolder || currentHolder.parentElement !== root) {
        return;
      }

      const orgHolder = document.createElement('div');
      orgHolder.className = 'holder table-row';
      orgHolder.setAttribute('data-yd-discount-display', 'root');
      const org = document.createElement('span');
      org.className = 'sale_price pay_number';
      org.textContent = money(row.org);
      orgHolder.appendChild(org);

      const saleHolder = document.createElement('div');
      saleHolder.className = 'holder table-row';
      saleHolder.setAttribute('data-yd-discount-display', 'root');
      const pct = document.createElement('span');
      pct.className = 'sale_percentage';
      pct.textContent = row.pct + '%';
      const sale = document.createElement('span');
      sale.className = 'real_price';
      sale.textContent = money(row.sale);
      saleHolder.appendChild(pct);
      saleHolder.appendChild(sale);

      hideSource(currentHolder);
      root.insertBefore(orgHolder, currentHolder);
      const share = qs('.comment_num_warp', root);
      if (share && share.parentElement === root) {
        share.insertAdjacentElement('afterend', saleHolder);
      } else {
        currentHolder.insertAdjacentElement('afterend', saleHolder);
      }
    }

    function cardIdx(card) {
      try {
        const props = JSON.parse(card.getAttribute('data-product-properties') || '{}');
        if (props.idx !== undefined && props.idx !== null) {
          return String(props.idx);
        }
      } catch (err) {}
      const link = qs('a[href*="idx="]', card);
      if (!link) {
        return '';
      }
      try {
        return new URL(link.href, location.href).searchParams.get('idx') || '';
      } catch (err) {
        return '';
      }
    }

    function patchCardPrice(current, idx, row) {
      const area = current && current.parentElement;
      if (!area || current.closest('[data-yd-discount-display]') ||
          current.closest('.special-sale-wrap')) {
        return;
      }
      if (hasNativeDiscount(area)) {
        if (qs('[data-yd-discount-display="root"]', area)) {
          removeCustom(area);
        }
        return;
      }
      if (qs('[data-yd-discount-display="root"]', area)) {
        return;
      }
      const actual = current ? parseWon(current.textContent) : null;
      if (actual === null || actual !== row.sale) {
        if (actual !== null) {
          warnMismatchOnce('card', idx, actual, row.sale);
        }
        return;
      }

      const org = document.createElement('p');
      org.className = 'sale_price no-margin body_font_color_50';
      org.style.opacity = '1';
      org.setAttribute('data-yd-discount-display', 'root');
      org.textContent = money(row.org);

      const saleWrap = document.createElement('p');
      saleWrap.className = 'no-margin special-sale-wrap';
      saleWrap.setAttribute('data-yd-discount-display', 'root');
      const pct = document.createElement('span');
      pct.className = 'sale_percentage';
      pct.textContent = row.pct + '%';
      const sale = document.createElement('span');
      sale.className = 'pay';
      sale.style.cssText = 'font-weight:bold; font-size:16px; color:#2a341e';
      sale.textContent = money(row.sale);
      saleWrap.appendChild(pct);
      saleWrap.appendChild(sale);

      hideSource(current);
      area.insertBefore(org, current);
      area.insertBefore(saleWrap, current);
    }

    function patchCards(map) {
      qsa('.shop-item._shop_item[data-product-properties]').forEach(function(card) {
        const idx = cardIdx(card);
        const row = idx && map[idx];
        if (!row) {
          return;
        }
        qsa('.pay', card).forEach(function(current) {
          patchCardPrice(current, idx, row);
        });
      });
    }

    fetchMapOnce().then(function(map) {
      if (!map) {
        return;
      }
      function run() {
        patchDetail(map);
        patchCards(map);
      }
      run();
      ensureObserver('discountDisplay', run);
      ydMark('discountDisplay', true, 'CDN 맵 ' + Object.keys(map).length + '개 + 네이티브/판매가 가드');
    });
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

    if (isPureProteinNoShipGaugeProduct()) {
      document.documentElement.classList.add('yd-pure-protein-no-ship-gauge');
      ydMark('cartAwareFreeShip', true, '순수단백 쿠폰 대상 상품은 배송비 게이지 비노출');
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

  /* ═══ 단백밥 상품상세 쿠폰 UI 비노출 ═══
   * 쿠폰 자체의 발급 조건·사용 가능 여부는 변경하지 않고, 요청한 두 단백밥 상품의
   * 가격 아래 쿠폰 카드와 쿠폰받기 버튼만 고객 화면에서 숨긴다. */
  function bindDanbaekbapCouponHide() {
    if (!isProductDetailPage()) {
      return;
    }

    if (!isDanbaekbapCouponHiddenProduct()) {
      document.documentElement.classList.remove('yd-danbaekbap-hide-coupon');
      return;
    }

    document.documentElement.classList.add('yd-danbaekbap-hide-coupon');

    function sync() {
      const hosts = qsa('.prod-detail-coupon-container-style-a');
      hosts.forEach(function(host) {
        host.setAttribute('aria-hidden', 'true');
      });

      if (hosts.length > 0) {
        ydMark('danbaekbapCouponHide', true, currentProductIdx() + ' 쿠폰 카드 비노출');
      } else {
        ydMark('danbaekbapCouponHide', false, currentProductIdx() + ' 쿠폰 카드 렌더 대기');
      }
    }

    sync();
    ensureObserver('danbaekbapCouponHide', sync);
  }

  /* ═══ 단백밥 SET 무료배송 기준 태그 ═══
   * 675 상품의 제목과 상세정보 본문 시작점에 배송비 기준을 빨간 태그로 안내한다.
   * 기존 아임웹 배송정책/결제 로직은 변경하지 않는다. */
  function bindDanbaekbapSetFreeShippingTag() {
    const titleSelector = '[data-yd-set-free-shipping-tag]';
    const detailSelector = '[data-yd-set-free-shipping-detail-tag]';
    const copy = '9만원 이상 상품 무료배송';

    function sync() {
      const isTarget = isProductDetailPage() && currentProductIdx() === '675';

      if (!isTarget) {
        qsa(titleSelector).forEach(function(tag) { tag.remove(); });
        qsa(detailSelector).forEach(function(tag) { tag.remove(); });
        ydMark('danbaekbapSetFreeShippingTag', true, '비대상 상품');
        return;
      }

      const title = qsa('h1.view_tit').find(function(el) {
        return /단백밥\s*SET|단백질\s*도시락\s*세트상품/i.test(el.textContent || '');
      });
      if (!title) {
        ydMark('danbaekbapSetFreeShippingTag', false, '675 상품명 렌더 대기');
        return;
      }

      qsa(titleSelector).forEach(function(tag) {
        if (tag.parentElement !== title) { tag.remove(); }
      });

      let tag = qs(titleSelector, title);
      if (!tag) {
        tag = document.createElement('span');
        tag.className = 'yd-set-free-shipping-tag';
        tag.setAttribute('data-yd-set-free-shipping-tag', '675');
        tag.setAttribute('aria-label', copy);
        const nativeIcon = qs('.ns-icon', title);
        title.insertBefore(tag, nativeIcon || null);
      }

      if (tag.textContent !== copy) {
        tag.textContent = copy;
      }

      const detailBodies = qsa('#prod_detail_body');
      detailBodies.forEach(function(body) {
        let wrap = qs(detailSelector, body);
        if (wrap && wrap.parentElement !== body) {
          wrap.remove();
          wrap = null;
        }
        if (!wrap) {
          wrap = document.createElement('div');
          wrap.className = 'yd-set-free-shipping-detail-tag-wrap';
          wrap.setAttribute('data-yd-set-free-shipping-detail-tag', '675');
          const detailTag = document.createElement('span');
          detailTag.className = 'yd-set-free-shipping-detail-tag';
          detailTag.setAttribute('aria-label', copy);
          detailTag.textContent = copy;
          wrap.appendChild(detailTag);
          body.insertBefore(wrap, body.firstChild);
        }
      });

      ydMark(
        'danbaekbapSetFreeShippingTag',
        detailBodies.length > 0,
        detailBodies.length > 0 ? '675 제목·상세 태그 표시' : '675 상세 본문 렌더 대기'
      );
    }

    sync();
    ensureObserver('danbaekbapSetFreeShippingTag', sync);
  }

  /* ═══ 순수단백 무료배송 쿠폰 받기 버튼 ═══
   * 아임웹 네이티브 버튼은 고객 다운로드형 중 '금액 할인'만 자동 노출한다.
   * 배송비 무료 쿠폰은 네이티브 컨테이너가 비어 있으므로, 같은 카드 디자인 안에서
   * 아임웹의 기존 SITE_COUPON 다운로드 모달만 연다. 쿠폰 발급/조건은 변경하지 않는다. */
  function bindPureProteinCouponButton() {
    if (!isProductDetailPage()) {
      return;
    }

    const idx = currentProductIdx();
    const couponLabel = PURE_PROTEIN_COUPON_LABELS[idx];
    const couponCode = PURE_PROTEIN_COUPON_CODES[idx];
    if (!couponLabel) {
      return;
    }

    function filterCouponModal() {
      const modal = qs('#cocoaModal.modal_download_coupon');
      if (!modal || !couponCode) {
        return;
      }

      const rows = qsa('.coupon-item-row', modal);
      if (!rows.length) {
        return;
      }

      const candidates = rows.filter(function(row) {
        const card = qs('.coupon-wrap', row);
        const download = card && qs('[data-code]', card);
        const cardCode = download ? download.getAttribute('data-code') : '';
        const cardText = (card && card.textContent || '').replace(/\s+/g, ' ').trim();
        return cardCode === couponCode || cardText.indexOf(couponLabel) !== -1;
      });

      /* 코드/이름 대조 결과가 정확히 1개가 아니면 빈 모달을 만들지 않고 원본을 유지한다. */
      if (candidates.length !== 1) {
        ydMark('pureProteinCouponModalFilter', false, '상품 쿠폰 1개 식별 실패(' + candidates.length + '개)');
        return;
      }

      const targetRow = candidates[0];
      rows.forEach(function(row) {
        const isTarget = row === targetRow;
        row.style.setProperty('display', isTarget ? '' : 'none', isTarget ? '' : 'important');
        if (isTarget) {
          row.removeAttribute('aria-hidden');
        } else {
          row.setAttribute('aria-hidden', 'true');
        }
      });

      const totalWrap = qs('.total_coupon_wrap', modal);
      if (totalWrap) {
        totalWrap.style.setProperty('display', 'none', 'important');
        totalWrap.setAttribute('aria-hidden', 'true');

        const footer = totalWrap.parentElement;
        if (footer) {
          footer.style.height = '52px';
          footer.style.minHeight = '52px';
          footer.style.paddingTop = '16px';
          footer.style.paddingBottom = '16px';
          footer.style.justifyContent = 'center';
        }
      }

      modal.setAttribute('data-yd-product-coupon-filter', idx);
      modal.setAttribute('data-yd-product-coupon-code', couponCode);
      ydMark('pureProteinCouponModalFilter', true, couponLabel + ' 1개만 노출');
    }

    function findProductCode() {
      const dataNode = qs('[data-prod-code]');
      if (dataNode && dataNode.getAttribute('data-prod-code')) {
        return dataNode.getAttribute('data-prod-code');
      }

      const scripts = Array.from(document.scripts || []);
      for (let i = 0; i < scripts.length; i += 1) {
        const text = scripts[i].textContent || '';
        const match = text.match(/SITE_COUPON\.openCouponDownloadModal\(['\"]([^'\"]+)['\"]\)/);
        if (match) {
          return match[1];
        }
      }
      return '';
    }

    function render() {
      const host = qs('.prod-detail-coupon-container-style-a');
      if (!host) {
        return;
      }

      if (host.querySelector('.yd-pure-protein-coupon-card')) {
        return;
      }

      /* 향후 아임웹이 자체 쿠폰 카드를 다시 만들면 네이티브 UI를 우선한다. */
      if (host.children.length > 0 || (host.textContent || '').trim()) {
        ydMark('pureProteinCouponButton', true, '아임웹 네이티브 쿠폰 카드 우선');
        return;
      }

      const card = document.createElement('div');
      card.className = 'prod-detail-coupon-container yd-pure-protein-coupon-card';

      const copy = document.createElement('div');
      copy.className = 'prod-detail-coupon-container-price-text';

      const benefit = document.createElement('div');
      benefit.className = 'price-title';
      benefit.style.fontSize = '1.2em';
      const benefitText = document.createElement('span');
      benefitText.style.whiteSpace = 'nowrap';
      benefitText.textContent = '배송비 무료';
      benefit.appendChild(benefitText);

      const title = document.createElement('div');
      title.className = 'price-sub-title';
      title.style.fontSize = '11.2px';
      title.textContent = couponLabel;

      copy.appendChild(benefit);
      copy.appendChild(title);

      const action = document.createElement('div');
      action.className = 'prod-detail-coupon-container-btn _coupon_down_wrap_';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-coupon-square yd-pure-protein-coupon-btn';
      button.setAttribute('aria-label', couponLabel + ' 쿠폰 받기');
      button.innerHTML = '<span class="tw-text-[12px] tw-font-[400]" style="white-space:nowrap;">쿠폰받기</span><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M13 13H1M11 6.33333L7 10.3333M7 10.3333L3 6.33333M7 10.3333V1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
      button.addEventListener('click', function() {
        if (isGuestUser()) {
          const loginLink = qs('a[href^="/login?back_url="], a[href*="/login?back_url="]');
          if (loginLink && loginLink.href) {
            ydMark('pureProteinCouponButton', true, '비회원 로그인 후 쿠폰 받기로 연결');
            location.href = loginLink.href;
            return;
          }
        }

        const productCode = findProductCode();
        if (window.SITE_COUPON && typeof window.SITE_COUPON.openCouponDownloadModal === 'function' && productCode) {
          window.SITE_COUPON.openCouponDownloadModal(productCode);
          window.setTimeout(filterCouponModal, 0);
          window.setTimeout(filterCouponModal, 150);
          window.setTimeout(filterCouponModal, 500);
          ydMark('pureProteinCouponButton', true, '쿠폰 다운로드 모달 열림');
          return;
        }
        ydMark('pureProteinCouponButton', false, '아임웹 쿠폰 모달 연결값 없음');
      });

      action.appendChild(button);
      card.appendChild(copy);
      card.appendChild(action);
      host.appendChild(card);
      ydMark('pureProteinCouponButton', true, couponLabel + ' 버튼 노출');
    }

    function sync() {
      render();
      filterCouponModal();
    }

    sync();
    ensureObserver('pureProteinCouponButton', sync);
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

  /* ═══ 상세 이미지 선행 워밍 ═══
     아임웹이 lazy로 미룬 아래쪽 상세 이미지를 페이지 로드 후 유휴 시간에 미리 받아 캐시한다
     → 스크롤 도달 시 즉시 표시. 아직 시작 안 된 다운로드만 다루므로 실효가 있다.
     동시에 sizes를 실제 렌더 폭으로 고정해 1920px 과대 변형 대신 적정 크기를 받게 한다. */
  function bindDetailImageWarm() {
    try { if (navigator.connection && navigator.connection.saveData) { return; } } catch (err) {}
    var startedWarm = false;
    function pickFromSrcset(img, needW) {
      var srcset = img.getAttribute('srcset');
      if (!srcset) { return img.getAttribute('src'); }
      var best = null;
      srcset.split(',').forEach(function(part) {
        var m = part.trim().match(/^(\S+)\s+(\d+)w$/);
        if (!m) { return; }
        var cand = { url: m[1], w: Number(m[2]) };
        if (cand.w >= needW) { if (!best || cand.w < best.w) { best = cand; } }
      });
      if (!best) {
        srcset.split(',').forEach(function(part) {
          var m = part.trim().match(/^(\S+)\s+(\d+)w$/);
          if (m && (!best || Number(m[2]) > best.w)) { best = { url: m[1], w: Number(m[2]) }; }
        });
      }
      return best ? best.url : img.getAttribute('src');
    }
    function startWarm() {
      if (startedWarm) { return; }
      startedWarm = true;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var imgs = Array.prototype.slice.call(document.querySelectorAll('#prod_detail img[loading="lazy"], .fr-view img[loading="lazy"]'))
        .filter(function(im) { return !(im.complete && im.naturalWidth > 0); });
      var queue = [];
      imgs.forEach(function(im) {
        var cssW = Math.round(im.getBoundingClientRect().width) || Math.min(680, window.innerWidth);
        var needW = Math.ceil(cssW * dpr);
        if (im.getAttribute('srcset')) { im.setAttribute('sizes', cssW + 'px'); }
        var url = pickFromSrcset(im, needW);
        if (url) { queue.push(url); }
      });
      var active = 0, MAX = 3;
      var pump = function() {
        while (active < MAX && queue.length) {
          var url = queue.shift();
          active += 1;
          var warm = new Image();
          warm.onload = warm.onerror = function() { active -= 1; pump(); };
          warm.src = url;
        }
      };
      pump();
      if (imgs.length) { ydMark('detailImageWarm', true, '아래쪽 이미지 ' + imgs.length + '장 선행 캐시'); }
    }
    var kick = function() { window.setTimeout(startWarm, 800); };
    /* 안전망 포함 전부 load 이후에만 발화 — 콜드 로드(load 19s 실측)에서
       고정 12s 타이머가 임계 리소스와 대역폭 경쟁하던 문제 수정(v3.59) */
    var arm = function() {
      kick();
      window.setTimeout(startWarm, 15000); /* kick 경로 실패 대비 안전망 */
    };
    if (document.readyState === 'complete') { arm(); }
    else { window.addEventListener('load', arm); }
  }

  /* ═══ 상세 비디오 로드 픽스 ═══
     아임웹 상세 지연삽입(_prod_detail_detail_lazy_load_*)이 넣은 <video>는 초기 로드가
     'URL safety check'로 거부되는 경우가 있다(실측). load() 재시도 한 번이면 정상 로드된다. */
  function bindDetailVideoFix() {
    function run() {
      document.querySelectorAll('.fr-view video[src], #prod_detail video[src]').forEach(function(v) {
        var tries = Number(v.dataset.ydVfix || 0);
        if ((v.error || v.readyState === 0) && tries < 2) {
          v.dataset.ydVfix = String(tries + 1);
          try { v.load(); } catch (err) {}
        }
        if (v.autoplay && v.muted && v.paused && v.readyState >= 2) {
          var pr = v.play(); if (pr && pr.catch) pr.catch(function() {});
        }
      });
    }
    run();
    window.setInterval(run, 1500);
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
    /* 유휴 시점에 첫 화면 상품 4개 선제 프리페치 — load 이후로 게이트(v3.59):
       콜드 로드 중 3.5s 고정 발화가 임계 리소스와 대역폭 경쟁하던 문제 수정 */
    var warmTop = function() {
      window.setTimeout(function() {
        Array.from(document.querySelectorAll('a[href*="shop_view"]')).slice(0, 4).forEach(function(a) {
          prefetch(a.href);
        });
      }, 2000);
    };
    if (document.readyState === 'complete') { warmTop(); }
    else { window.addEventListener('load', warmTop); }
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
          ydMark('brokenSummaryHidden', true, '요약설명 원문 노출 상품 숨김 처리');
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

  /* ═══ 광고 랜딩 전용 3일 할인 타이머 ═══
     노출 조건: 메타 광고 랜딩 상품(PROMO.PRODUCTS) + 광고 유입(UTM/fbclid)으로 최초 진입.
     최초 진입 시각 기준 72시간이며 기기(localStorage)에 저장돼 재방문에도 이어진다.
     만료되면 표시하지 않는다(없는 할인을 표시하지 않기 위함).
     옵션 선택 중(바텀시트 열림)에는 숨긴다. */
  const PROMO = {
    PRODUCTS: ['672', '1117', '1138', '1218', '1240', '1241'],
    HOURS: 72,
    KEY: 'ydPromoEnd_'
  };

  function promoIdx() {
    const m = location.search.match(/[?&]idx=(\d+)/);
    return m ? m[1] : '';
  }

  function isAdEntry() {
    const p = new URLSearchParams(location.search);
    if (p.get('fbclid') || p.get('gclid')) {
      return true;
    }
    const src = (p.get('utm_source') || '').toLowerCase();
    const med = (p.get('utm_medium') || '').toLowerCase();
    if (/^(fb|ig|meta|facebook|instagram|an|msg)$/.test(src)) {
      return true;
    }
    return med === 'cpc' || med === 'paid' || med === 'paid_social';
  }

  /* 만료 시각(ms). 광고로 처음 들어왔을 때만 생성하고, 이후에는 저장된 값을 그대로 쓴다. */
  function promoDeadline(idx) {
    const key = PROMO.KEY + idx;
    let end = 0;
    try {
      end = parseInt(window.localStorage.getItem(key), 10) || 0;
    } catch (err) {}
    /* 만료된 뒤 광고로 다시 들어오면 3일을 새로 부여한다(진행 중이면 그대로 유지) */
    if ((!end || end <= Date.now()) && isAdEntry()) {
      end = Date.now() + PROMO.HOURS * 3600000;
      try {
        window.localStorage.setItem(key, String(end));
      } catch (err) {}
    }
    return end;
  }

  function promoTexts(end) {
    const left = end - Date.now();
    const d = Math.floor(left / 86400000);
    const h = String(Math.floor((left % 86400000) / 3600000)).padStart(2, '0');
    const m = String(Math.floor((left % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
    return { value: (d > 0 ? d + '일 ' : '') + h + ':' + m + ':' + s };
  }

  function buildPromoCard() {
    const card = document.createElement('div');
    card.id = 'yd-promo-card';
    card.className = 'yd-promo-card';
    card.innerHTML =
      '<div class="yd-promo-top">' +
      '<div class="yd-promo-title">특가 할인 마감까지</div>' +
      '<div class="yd-promo-clock"><span class="yd-promo-label">남은 시간</span><span class="yd-promo-value"></span></div>' +
      '</div>';
    return card;
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
      /*
       * 홈에는 PC/모바일 상품 목록이 따로 있다. 보이는 첫 .shop-item의 폭을
       * 기준으로 삼으면 목록 가시성이 바뀔 때 배송 카드 폭도 함께 변한다.
       * 배송 카드는 제목 행의 컨테이너를 기준으로 고정해 두 화면에서 같은
       * 4px 좌우 여백을 유지한다.
       */
      if (card.dataset.ydW !== 'container') {
        card.dataset.ydW = 'container';
        card.style.width = 'calc(100% - 8px)';
        card.style.maxWidth = 'none';
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

        /* 광고 랜딩 전용 할인 타이머 — 배송 카드 바로 아래 */
        const pIdx = promoIdx();
        if (card && PROMO.PRODUCTS.indexOf(pIdx) >= 0) {
          const end = promoDeadline(pIdx);
          const live = end > Date.now();
          let promo = qs('#yd-promo-card');
          if (live && !promo) {
            promo = buildPromoCard();
            promo.style.margin = '12px 0';
            card.insertAdjacentElement('afterend', promo);
          }
          if (promo) {
            /* 옵션 선택 중에는 노출하지 않는다 */
            const hidden = !live || document.body.classList.contains('yd-bs-lock');
            const want = hidden ? 'none' : '';
            if (promo.style.display !== want) {
              promo.style.display = want;
            }
            if (!hidden) {
              setTextIfChanged(qs('.yd-promo-value', promo), promoTexts(end).value);
            }
          }
          ydMark('promoTimer', live, live ? '노출 중' : (end ? '기간 만료' : '광고 유입 아님'));
        }
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

  /* 무료배송 옵션은 쿠폰 적용 조건을 가격 바로 옆에서 확인할 수 있게 표시한다.
     커스텀 옵션 플로우가 아직 뜨지 않은 초기/복구 상태에서도 네이티브 옵션에 동일하게 적용한다. */
  function bindFreeShipOptionCouponNote() {
    if (!isProductDetailPage()) return;
    function patch() {
      qsa('#prod_options a[onclick*="selectRequireOption"], #prod_options a[onclick*="selectOptionalOption"]').forEach(function(anchor) {
        var name = ((anchor.querySelector('.margin-bottom-lg') || anchor).textContent || '').replace(/\s+/g, ' ').trim();
        var note = anchor.querySelector('.yd-option-coupon-note');
        if (!/무료배송/.test(name)) {
          if (note) note.remove();
          return;
        }
        if (note) return;
        var price = anchor.querySelector('.no-margin strong');
        if (!price || !price.parentElement) return;
        note = document.createElement('span');
        note.className = 'yd-option-coupon-note';
        note.textContent = '[쿠폰 받기 후 적용]';
        price.insertAdjacentElement('afterend', note);
      });
    }
    patch();
    ensureObserver('freeShipOptionCouponNote', patch);
  }

  /* ═══ 신규. 옵션 선택 플로우 (바텀시트 UI — 레갈로 시안 이식) ═══
     대상 상품에서 네이티브 옵션 UI를 숨기고 3단계 바텀시트로 대체한다.
     옵션·가격은 네이티브 DOM에서 동적으로 읽고, 선택은 네이티브 클릭으로 위임한다. */
  function bindOptionFlow() {
    if (!isProductDetailPage()) return;
    document.documentElement.classList.add('yd-product-detail-page');
    var flowIdx = new URLSearchParams(location.search).get('idx') || '';
    /* 상품별 세부 오버라이드 (자동 감지 값 덮어쓰기) */
    var FLOW_OVERRIDES = {
      '672': { min: 6,
               headline: '단백밥 메뉴를 6개 이상 골라주세요.',
               lead: 'S, L, 프리미엄을 자유롭게 섞어 총 6개 이상 선택할 수 있습니다.' },
      '1098': { min: 6, scheme: 'size', categories: ['L', 'P'],
                title: '윤식단 단백밥 L · 프리미엄',
                headline: '단백밥 L·프리미엄 메뉴를 6개 이상 골라주세요.',
                lead: '원하는 L·프리미엄 메뉴를 자유롭게 섞어 총 6개 이상 선택할 수 있습니다.' },
      '1111': { min: 6, scheme: 'size', categories: ['S'],
                title: '윤식단 단백밥 S',
                headline: '단백밥 S 메뉴를 6개 이상 골라주세요.',
                lead: '원하는 S 메뉴를 자유롭게 섞어 총 6개 이상 선택할 수 있습니다.' }
    };
    var cfg = null; /* 옵션 로드 후 buildFlowCfg()가 확정 */
    if (document.getElementById('yd-bs-root')) return;
    window.__YD_FLOW_ACTIVE__ = true;

    var money = function(n){ return (Number(n)||0).toLocaleString('ko-KR') + '원'; };
    var escT = function(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
    var copyFitClass = function(v){ var len = Array.from(String(v).replace(/\s+/g,'')).length; return len > 30 ? ' is-copy-long' : len > 22 ? ' is-copy-medium' : ''; };
    var normalizeT = function(s){ return String(s||'').replace(/ /g,' ').replace(/\s+/g,' ').trim(); };
    var numberFrom = function(s){ return Number(String(s||'').replace(/[^0-9-]/g,'')) || 0; };

    var step = 1, activeTab = null, cartPopup = false, bootAttempts = 0, rafId = 0, followupTimer = 0, prevLv1Sel = '';
    var wrapLabels = [], prevMainsLen = 0;
    var flowBooted = false, bootWatcher = null, bootLoadedAt = 0;
    var cartSubtotal = 0, cartSubtotalReady = false, cartSubtotalLoading = false;
    var pendingNames = new Set();
    var pendingQty = new Map(); /* 낙관 표시용 목표 수량 — 네이티브가 목표에 도달할 때까지 유지 */

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
    var unitLabelFromAnchor = function(a){
      var el = a && a.querySelector('.option_badge');
      var match = normalizeT(el ? el.textContent : '').match(/^(100g|1팩)(?:당)?\s*([0-9,]+)원$/);
      if (!match) return '';
      return match[1] + '당 ' + String(Number(match[2].replace(/,/g, ''))).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원';
    };

    /* 계열(단백밥/밸런시/순수단백)·스킴·최소수량 자동 감지 — 새 상품에도 즉시 적용 */
    function buildFlowCfg() {
      var rawTitle = normalizeT(((document.querySelector('#prod_detail h1') || document.querySelector('h1') || {}).textContent) || document.title.split(':')[0] || '');
      var fam;
      if (/밸런시|곡물볶음밥/.test(rawTitle)) fam = { k: 'balancy', unit: '밸런시', label: '밸런시', theme: 'yd-bs-family-balancy' };
      else if (/순수\s*단백|그릴드\s*포크|돈다리살/.test(rawTitle)) fam = { k: 'soonsu', unit: '순수단백', label: '순수단백', theme: 'yd-bs-family-soonsu' };
      else if (/단백밥|단백질\s*도시락|제육|불고기|함박|훈제오리|닭가슴살|단백질/.test(rawTitle)) fam = { k: 'danbaekbap', unit: '단백밥', label: '단백밥', theme: '' };
      else fam = { k: 'generic', unit: '상품', label: '', theme: '' };
      var reqNames = Array.from(document.querySelectorAll('#prod_options a[onclick*="selectRequireOption"]')).map(optionNameOf);
      var ov = FLOW_OVERRIDES[flowIdx] || {};
      var detectedScheme = (reqNames.some(function(n) { return /^\[S\]/i.test(n); }) && reqNames.some(function(n) { return /^\[L\]/i.test(n); })) ? 'size' : 'groups';
      var scheme = ov.scheme || detectedScheme;
      var min = ov.min != null ? ov.min : (scheme === 'size' ? 6 : 1);
      cfg = {
        family: fam.k,
        unit: ov.unit || fam.unit,
        scheme: scheme,
        categories: ov.categories || null,
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
          items.push([n, priceFromAnchor(a), unitLabelFromAnchor(a)]);
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
      all.forEach(function(x) {
        var t = pendingQty.get(x.label);
        if (t === undefined) { pendingNames.delete(x.label); return; }
        if (x.qty === t) { pendingQty.delete(x.label); pendingNames.delete(x.label); }
        else { x.qty = t; }
      });
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
    /* S 전용 도매 상품처럼 옵션명에 [S] 접두사가 없는 단일 라인은 전부 지정 탭으로 묶는다. */
    var flowCategoryOf = function(name) {
      return cfg && cfg.categories && cfg.categories.length === 1 ? cfg.categories[0] : categoryOf(name);
    };
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
        if (add && Number(nextQty) > 0) {
          /* 0→1 첫 담기: 네이티브 응답을 기다리지 않고 즉시 수량 컨트롤로 교체 (체감 속도) */
          var mini = document.createElement('span');
          mini.className = 'yd-bs-qty-mini';
          mini.innerHTML = '<button aria-label="수량 줄이기">−</button><strong aria-live="polite">' + Math.max(1, Number(nextQty)) + '</strong><button aria-label="수량 늘리기">＋</button>';
          mini.querySelectorAll('button')[0].dataset.minus = name;
          mini.querySelectorAll('button')[1].dataset.plus = name;
          add.replaceWith(mini);
        }
      });
    }
    function markPending(name, trigger, nextQty) {
      pendingNames.add(name);
      if (Number.isFinite(nextQty)) pendingQty.set(name, Math.max(0, nextQty));
      showPendingSelection(name, nextQty);
      trigger();
      scheduleRender(true);
      /* 안전망: 네이티브가 4초 내 목표에 못 오면 낙관 표시 해제(실상태로 복귀)
         — 아임웹 개편 후 행 생성이 비동기화되어 1.5초로는 정상 응답도 오탈락 */
      setTimeout(function() { if (pendingNames.delete(name)) { pendingQty.delete(name); scheduleRender(false); } }, 4000);
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

    /* 순수단백은 '선택 후 금액 반영' 문구 미표기 (소유자 지시 2026-07-21) */
    var priceLabel = function(p) { return p === null ? (cfg.family === 'soonsu' ? '' : '선택 후 금액 반영') : p ? (p > 0 ? '+ ' : '- ') + money(Math.abs(p)) : '추가금 없음'; };
    var saucePattern = /볼케이노|양념치킨|블랙\s*알리오|블랙알리오|데리야끼|바베큐/;
    var hasSeparateSauce = function(name) { return !/\(소스X\)/.test(name) && saucePattern.test(name); };

    function danbaekbapMenuDescription(name, category) {
      if (!cfg || cfg.family !== 'danbaekbap' || cfg.scheme !== 'size') return '';
      var clean = normalizeT(String(name).replace(/\[[^\]]*\]/g, ' ').replace(/[🌶️]/g, ' '));
      if (category === 'S' && hasSeparateSauce(name)) return '오리지널S+저당소스가 별도 제공됩니다.';
      if (category === 'S') return '단백질 38g의 식단 정석 닭가슴살 도시락';
      if (/쌈장\s*제육/.test(clean)) return '구수한 저당 쌈장에 부드러운 목전지를 볶아 깊은 감칠맛을 살린 단백질 32g 도시락';
      if (/직화\s*제육|제육\s*볶음/.test(clean)) return '매콤한 저당 제육 양념을 부드러운 목전지에 입히고 은은한 직화 풍미를 더한 단백질 32g 도시락';
      if (/불고기/.test(clean)) return '달콤짭짤한 저당 불고기 양념을 부드러운 목전지에 입혀 촉촉한 단짠 풍미를 살린 단백질 32g 도시락';
      if (/훈제\s*오리/.test(clean)) return '은은한 훈연 향의 오리고기를 한 번 삶아 담백하고 부드럽게 완성한 단백질 29g 도시락';
      if (/함박/.test(clean) && hasSeparateSauce(name)) return '그릴드함박+저당소스가 별도 제공됩니다.';
      if (/함박/.test(clean)) return '지방이 적은 돼지 뒷다리살로 빚어 담백한 고기 맛과 부드러운 식감을 살린 단백질 32g 도시락';
      if (/오리지널/.test(clean)) return '단백질50g 당1g의 식단 정석 닭가슴살 도시락';
      if (category === 'L' && hasSeparateSauce(name)) return '오리지널L+저당소스가 별도 제공됩니다.';
      return category === 'L' ? '단백질50g 당1g의 식단 정석 닭가슴살 도시락' : '';
    }

    function premiumNotice() {
      return '<aside class="yd-bs-premium-notice">프리미엄 도시락은 윤식단이 오랜 시간 연구한 저당 양념/소스를 사용해 맛과 성분까지 모두 잡아낸 단백질 도시락입니다. 맛있는 음식 더 건강하게 즐겨주세요.</aside>';
    }

    function sizeTabs(s, available) {
      var counts = { S: 0, L: 0, P: 0 };
      s.req.forEach(function(x) { counts[flowCategoryOf(x.label)] += x.qty; });
      var guide = { S: '325g', L: '420g', P: '' };
      var tabPrice = flowIdx === '1251' ? { S: '4,800원', L: '4,990원', P: '' } : {};
      var btn = function(v, strong, span) {
        var sizeGuide = guide[v] ? '<b class="yd-bs-size-guide">' + guide[v] + '</b>' : '';
        var price = tabPrice[v] ? '<em class="yd-bs-cat-price">' + tabPrice[v] + '</em>' : '';
        var aria = span + (guide[v] ? ', ' + guide[v] : '') + ', ' + counts[v] + '개 선택';
        return '<button class="yd-bs-category ' + (activeTab === v ? 'is-selected' : '') + '" data-category="' + v + '" aria-label="' + aria + '" aria-pressed="' + (activeTab === v) + '"><strong' + (strong.length > 3 ? ' class="is-wide"' : '') + '>' + strong + '</strong><span>' + span + '</span>' + price + sizeGuide + '</button>';
      };
      var defs = {
        S: ['S', '닭가슴살 도시락'],
        L: ['L', '닭가슴살 도시락'],
        P: ['PREMIUM', '프리미엄 도시락']
      };
      available = available && available.length ? available : ['S', 'L', 'P'];
      return '<div class="yd-bs-category-grid' + (available.length === 3 ? '' : ' is-fit') + '" role="group" aria-label="라인 선택">' + available.map(function(v) {
        return btn(v, defs[v][0], defs[v][1]);
      }).join('') + '</div>';
    }
    /* 네이티브 그룹 라벨 → 고객용 표기 (소유자 지시 2026-07-21) */
    function displayGroupLabel(label) {
      var t = normalizeT(label);
      if (/옵션\s*선택/.test(t)) return '메뉴선택';
      if (/세트\s*구성/.test(t)) return '수량선택';
      return t;
    }
    function groupTabs(s, mains, pendingLabels) {
      pendingLabels = pendingLabels || [];
      var tabCount = mains.length + pendingLabels.length;
      if (tabCount < 2) return '';
      var counts = mains.map(function(g) {
        return g.items.reduce(function(sum, it) {
          var found = s.req.find(function(x) { return x.label === it[0]; });
          return sum + (found ? found.qty : 0);
        }, 0);
      });
      var html = mains.map(function(g, i) {
        return '<button class="yd-bs-category ' + (activeTab === i ? 'is-selected' : '') + '" data-category="' + i + '" aria-pressed="' + (activeTab === i) + '"><strong>' + (i + 1) + '</strong><span>' + escT(displayGroupLabel(g.label)) + '</span><b>' + g.items.length + '종 · 선택 ' + counts[i] + '개</b></button>';
      }).join('');
      /* 조합형 2단: 아직 열리지 않은 다음 그룹을 대기 탭으로 미리 보여준다 (소유자 지시 2026-07-21) */
      html += pendingLabels.map(function(label, j) {
        return '<button class="yd-bs-category is-pending-tab" disabled aria-disabled="true"><strong>' + (mains.length + j + 1) + '</strong><span>' + escT(displayGroupLabel(label)) + '</span><b>이전 탭 선택 후</b></button>';
      }).join('');
      /* 탭이 3개가 아니면(2개 등) 개수에 맞춰 균등 분할 — 2개면 5:5 */
      return '<div class="yd-bs-category-grid' + (tabCount === 3 ? '' : ' is-fit') + '" role="group" aria-label="구성 선택">' + html + '</div>';
    }
    /* 단일 그룹 조합상품(1117류): 제품명 기준 가상 탭 파생 — 제품 먼저 고르고 용량을 고르는 2단 선택.
       이름에서 [태그]·중량·개입수를 걷어낸 키가 2~4종이고 한 종이라도 용량 변형이 2개 이상일 때만 적용 */
    function deriveProductGroups(items) {
      var keyOf = function(name) {
        return normalizeT(String(name)
          .replace(/[\uD800-\uDFFF]/g, ' ')
          .replace(/\[[^\]]*\]/g, ' ')
          .replace(/\b(?:BEST|NEW|HOT|MD)\b/gi, ' ')
          .replace(/\d+(?:\.\d+)?\s*(?:g|kg|팩|개입|개|입)/gi, ' ')
          .replace(/[\-·]/g, ' '));
      };
      /* 탭 표시용 짧은 라벨: 괄호 제거, 혼합 세트(+)는 '세트' */
      var labelOf = function(key) {
        var t = normalizeT(key.replace(/\([^)]*\)/g, ' '));
        return /\+/.test(t) ? '세트' : t;
      };
      var order = [], map = {};
      for (var i = 0; i < items.length; i++) {
        var k = keyOf(items[i][0]);
        if (!k) { return null; }
        if (!map[k]) { map[k] = []; order.push(k); }
        map[k].push(items[i]);
      }
      if (order.length < 2 || order.length > 4 || order.length === items.length) { return null; }
      var hasVariant = order.some(function(k) { return map[k].length >= 2; });
      if (!hasVariant) { return null; }
      return order.map(function(k) { return { label: labelOf(k), items: map[k] }; });
    }
    function derivedTabs(s, groups) {
      var counts = groups.map(function(g) {
        return g.items.reduce(function(sum, it) {
          var found = s.req.find(function(x) { return x.label === it[0]; });
          return sum + (found ? found.qty : 0);
        }, 0);
      });
      var anyWide = groups.some(function(g) { return g.label.length > 3; });
      return '<div class="yd-bs-category-grid is-derived" role="group" aria-label="제품 선택">' + groups.map(function(g, i) {
        return '<button class="yd-bs-category ' + (activeTab === i ? 'is-selected' : '') + '" data-category="' + i + '" aria-pressed="' + (activeTab === i) + '"><strong' + (anyWide ? ' class="is-wide"' : '') + '>' + escT(g.label) + '</strong><span>용량 선택</span><b>' + g.items.length + '종 · 선택 ' + counts[i] + '개</b></button>';
      }).join('') + '</div>';
    }
    function menuCards(items, s, tag) {
      var toggled = selectedToggleNames();
      return '<div class="yd-bs-menu-grid">' + items.map(function(pair) {
        var name = pair[0], price = pair[1], unit = cfg.family === 'soonsu' ? pair[2] : '';
        var category = cfg.scheme === 'size' ? flowCategoryOf(name) : '';
        var description = danbaekbapMenuDescription(name, category);
        var couponNote = /무료배송/.test(name) ? '<span class="yd-bs-free-ship-coupon">[쿠폰 받기 후 적용]</span>' : '';
        var found = s.req.find(function(x) { return x.label === name; });
        var q = found ? found.qty : 0, pending = pendingNames.has(name) || (!q && toggled.has(name));
        if (!found && pendingQty.has(name)) q = pendingQty.get(name);
        return '<div class="yd-bs-menu-card ' + ((q || pending) ? 'is-selected ' : '') + (pending ? 'is-pending' : '') + '" aria-busy="' + pending + '">' +
          (tag ? '<span class="yd-bs-line-tag" aria-hidden="true">' + tag + '</span>' : '') +
          '<button class="yd-bs-menu-main" data-pick="' + escT(name) + '" aria-pressed="' + Boolean(q || pending) + '"><span class="yd-bs-menu-name' + copyFitClass(name) + '">' + escT(name) + '</span>' + (description ? '<span class="yd-bs-menu-description">' + escT(description) + '</span>' : '') + '<span class="yd-bs-menu-meta"><span class="yd-bs-menu-price">' + priceLabel(price) + '</span>' + couponNote + (unit ? '<span class="yd-bs-unit-badge">' + escT(unit) + '</span>' : '') + (!description && hasSeparateSauce(name) ? '<span class="yd-bs-menu-note">· 소스는 별도 제공됩니다</span>' : '') + '</span></button>' +
          (q ? '<span class="yd-bs-qty-mini"><button data-minus="' + escT(name) + '" aria-label="' + escT(name) + ' 수량 줄이기">−</button><strong aria-live="polite">' + q + '</strong><button data-plus="' + escT(name) + '" aria-label="' + escT(name) + ' 수량 늘리기">＋</button></span>' : '<button class="yd-bs-menu-plus" data-pick="' + escT(name) + '" aria-label="' + escT(name) + ' 추가">＋</button>') + '</div>';
      }).join('') + '</div>';
    }
    function minNotice(s) {
      if (cfg.min > 1) {
        return '<div class="yd-bs-min ' + (s.reqQty >= cfg.min ? 'is-ok' : '') + '" aria-live="polite">' + (s.reqQty >= cfg.min ? '최소 수량을 충족했습니다. 총 ' + s.reqQty + '개' : '현재 ' + s.reqQty + '개 · ' + (cfg.min - s.reqQty) + '개 더 선택해 주세요.') + '</div>';
      }
      return '<div class="yd-bs-min ' + (s.reqQty >= 1 ? 'is-ok' : '') + '" aria-live="polite">' + (s.reqQty >= 1 ? '상품 선택 완료 · 총 ' + s.reqQty + '개' : cfg.unit + ' 상품을 1개 이상 선택해 주세요.') + '</div>';
    }
    /* 단백밥 외 상품: 1·2단계에서 담은 상품을 3단계와 같은 UX(수량 조절·삭제)로 확인 (소유자 지시 2026-07-21) */
    function pickedCard(s) {
      if (cfg.min > 1) { return ''; }
      var rows = s.req.filter(function(x) { return x.qty > 0; }).map(function(x) { return reviewRowHtml(x, reviewCategoryOf(x.label), cleanShownLabel(x.label)); })
        .concat(s.opt.filter(function(x) { return x.qty > 0; }).map(function(x) { return reviewRowHtml(x, '선택 상품', cleanShownLabel(x.label)); }))
        .join('');
      if (!rows) { return ''; }
      return '<div class="yd-bs-picked-card" aria-label="담은 상품"><h4>담은 상품</h4><div class="yd-bs-review-list">' + rows + '</div></div>';
    }
    function reviewCategoryOf(label) {
      if (cfg.scheme === 'size') return categoryLabel(flowCategoryOf(label));
      return cfg.unit;
    }
    /* 표시용 라벨 정리(장식문자 제거) — data 속성은 반드시 원본 유지 */
    function cleanShownLabel(label) { return normalizeT(String(label).replace(/[\u25A0-\u25FF\u2600-\u27BF\uFE0F\uD800-\uDFFF]/g, ' ')); }
    /* 3단계 확인 행 — 수량 조절·삭제 포함 (1·2단계 담은상품 카드에서도 재사용).
       shownLabel: 표시용 라벨(장식 정리본) — data 속성은 반드시 원본 x.label 유지 */
    function reviewRowHtml(x, catText, shownLabel) {
      return '<div class="yd-bs-review-row"><div><span class="yd-bs-review-category">' + escT(catText) + '</span><div class="yd-bs-review-name">' + escT(shownLabel || x.label) + '</div><div class="yd-bs-review-price">' + escT(x.priceText) + '</div></div><div class="yd-bs-qty"><button data-minus="' + escT(x.label) + '" aria-label="' + escT(x.label) + ' 수량 줄이기">−</button><strong aria-live="polite">' + x.qty + '</strong><button data-plus="' + escT(x.label) + '" aria-label="' + escT(x.label) + ' 수량 늘리기">＋</button></div><button class="yd-bs-remove" data-remove="' + escT(x.label) + '" aria-label="' + escT(x.label) + ' 삭제">삭제</button></div>';
    }
    function reviewHtml(s) {
      return '<section class="yd-bs-review-section"><h4>' + escT(cfg.unit) + ' ' + s.reqQty + '개</h4><div class="yd-bs-review-list">' + (s.req.length ? s.req.map(function(x) { return reviewRowHtml(x, reviewCategoryOf(x.label), cleanShownLabel(x.label)); }).join('') : '<div class="yd-bs-empty">아직 선택한 메뉴가 없습니다.</div>') + '</div></section>' +
        '<section class="yd-bs-review-section"><h4>추가상품 ' + s.optQty + '개</h4><div class="yd-bs-review-list">' + (s.opt.length ? s.opt.map(function(x) { return reviewRowHtml(x, '선택 상품', cleanShownLabel(x.label)); }).join('') : '<div class="yd-bs-empty">선택한 추가상품이 없습니다.</div>') + '</div></section>';
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
        var discountMatch = flowIdx === '1220' ? g.label.match(/(\d+)%\s*할인/) : null;
        var discountBadge = discountMatch ? '<span class="yd-bs-discount-badge">' + escT(discountMatch[1]) + '% 할인</span>' : '';
        var welcomeOffer = proteinGroup && promoIdx() === '1241';
        return '<section class="yd-bs-addon-group' + (welcomeOffer ? ' yd-bs-welcome-offer' : '') + '"><div class="yd-bs-addon-head"><h4>' + escT(g.label) + '</h4><span>' + groupQty + '개 선택</span></div><div class="yd-bs-addon-list">' + g.items.map(function(pair) {
          var name = pair[0], price = pair[1];
          var found = s.opt.find(function(x) { return x.label === name; });
          var q = found ? found.qty : 0, pending = pendingNames.has(name), unit = proteinGroup ? unitPricePer100g(name, price) : null;
          if (!found && pendingQty.has(name)) q = pendingQty.get(name);
          var limitSeal = welcomeOffer ? '<span class="yd-bs-limit-seal"><span>30개</span><span>한정</span></span>' : '';
          var limitStock = welcomeOffer ? '<span class="yd-bs-limit-stock"><span class="yd-bs-limit-stock-dot" aria-hidden="true"></span><span>30개 한정 · 이제 <b>8개</b> 남았어요</span></span>' : '';
          return '<div class="yd-bs-addon-choice ' + ((q || pending) ? 'is-selected ' : '') + (pending ? 'is-pending' : '') + '" aria-busy="' + pending + '"><button class="yd-bs-addon-main" data-addon="' + escT(name) + '" aria-pressed="' + Boolean(q || pending) + '"><span class="yd-bs-check" aria-hidden="true"></span>' + limitSeal + '<span class="yd-bs-addon-copy"><strong class="' + copyFitClass(name).trim() + '">' + escT(name) + '</strong><span class="yd-bs-addon-meta"><em>' + priceLabel(price) + '</em>' + discountBadge + (unit ? '<span class="yd-bs-unit-badge">100g당 ' + money(unit) + '</span>' : '') + '</span>' + limitStock + '</span></button>' +
            (q ? '<span class="yd-bs-qty-mini"><button data-minus="' + escT(name) + '" aria-label="' + escT(name) + ' 수량 줄이기">−</button><strong aria-live="polite">' + q + '</strong><button data-plus="' + escT(name) + '" aria-label="' + escT(name) + ' 수량 늘리기">＋</button></span>' : '<button class="yd-bs-addon-plus" data-addon="' + escT(name) + '" aria-label="' + escT(name) + ' 추가">＋</button>') + '</div>';
        }).join('') + '</div></section>';
      }).join('') + '</div>';
    }
    function stepContent(s) {
      var stepNames = ['옵션 선택', '추가상품', '최종확인'];
      var progress = '<div class="yd-bs-progress" role="tablist" aria-label="옵션 선택 진행 단계">' + [1, 2, 3].map(function(n) {
        var reachable = n <= step || s.reqQty >= cfg.min;
        return '<button type="button" data-step="' + n + '" role="tab" aria-selected="' + (n === step) + '" ' + (reachable ? '' : 'disabled') + ' class="' + (n <= step ? 'is-active ' : '') + (n === step ? 'is-current' : '') + '"><i></i><em>' + n + ' ' + stepNames[n - 1] + '</em></button>';
      }).join('') + '</div>';
      var html = '';
      if (step === 1) {
        var body = '';
        if (cfg.scheme === 'size') {
          var availableSizes = cfg.categories || ['S', 'L', 'P'].filter(function(v) {
            return s.cat.groups.some(function(g) {
              return g.main && g.items.some(function(it) { return flowCategoryOf(it[0]) === v; });
            });
          });
          if (!availableSizes.length) availableSizes = ['L'];
          if (activeTab === null || availableSizes.indexOf(activeTab) === -1) activeTab = availableSizes[0];
          var items = [];
          s.cat.groups.forEach(function(g) { if (g.main) g.items.forEach(function(it) { if (flowCategoryOf(it[0]) === activeTab) items.push(it); }); });
          body = sizeTabs(s, availableSizes) + (activeTab === 'P' ? premiumNotice() : '') + menuCards(items, s, activeTab === 'P' ? 'P' : activeTab);
        } else {
          var mains = s.cat.groups.filter(function(g) { return g.main; });
          if (mains.length > prevMainsLen && prevMainsLen > 0) activeTab = mains.length - 1;
          prevMainsLen = mains.length;
          /* 조합형: 1그룹 선택을 바꾸면(다른 옵션 재선택) 마지막 그룹으로 자동 이동 (소유자 버그 리포트 2026-07-21) */
          if (mains.length >= 2) {
            var lv1Now = mains[0].items.map(function(it) { return it[0]; }).filter(function(n) {
              return selectedToggleNames().has(normalizeT(n));
            }).join('|');
            if (lv1Now && prevLv1Sel && lv1Now !== prevLv1Sel) { activeTab = mains.length - 1; }
            prevLv1Sel = lv1Now || prevLv1Sel;
          }
          var derived = mains.length === 1 ? deriveProductGroups(mains[0].items) : null;
          if (derived) {
            if (activeTab === null || activeTab >= derived.length) activeTab = 0;
            body = derivedTabs(s, derived) + menuCards(derived[activeTab].items, s, '');
          } else {
            if (activeTab === null || activeTab >= mains.length) activeTab = 0;
            var group = mains[activeTab];
            /* 조합형: 부팅 때 캐시한 셀렉트 라벨 중 아직 그룹으로 안 열린 것을 전부 대기 탭으로 (3단 이상 지원) */
            var pendingLabels = [];
            var known = s.cat.groups.map(function(g) { return normalizeT(g.label); });
            var cleanLabel = function(t) { return normalizeT(String(t || '').replace(/[\u25A0-\u25FF\u2600-\u27BF\uFE0F\uD800-\uDFFF]/g, ' ')); };
            for (var wi = mains.length; wi < wrapLabels.length && pendingLabels.length < 3; wi++) {
              var lbl = cleanLabel(wrapLabels[wi]);
              if (lbl && known.indexOf(lbl) === -1 && pendingLabels.indexOf(lbl) === -1) pendingLabels.push(lbl);
            }
            body = groupTabs(s, mains, pendingLabels) + (group ? menuCards(group.items, s, '') : '<div class="yd-bs-empty">옵션을 불러오는 중입니다…</div>');
          }
        }
        html = '<div class="yd-bs-step yd-bs-step-1"><div class="yd-bs-step-meta"><span class="yd-bs-badge">필수 선택</span><span class="yd-bs-step-count">STEP 1 / 3</span></div><h3>' + escT(cfg.headline) + '</h3><p class="yd-bs-lead">' + escT(cfg.lead) + '</p>' + body + minNotice(s) + pickedCard(s) + '</div>';
      }
      if (step === 2) html = '<div class="yd-bs-step yd-bs-step-2"><div class="yd-bs-step-meta"><span class="yd-bs-badge">선택 사항</span><span class="yd-bs-step-count">STEP 2 / 3</span></div><h3>이 상품도 추천해요</h3><p class="yd-bs-lead">필요한 상품은 + 버튼으로 수량을 늘릴 수 있으며 선택하지 않아도 다음으로 넘어갈 수 있습니다.</p>' + addonsHtml(s) + pickedCard(s) + '</div>';
      if (step === 3) html = '<div class="yd-bs-step yd-bs-step-3"><div class="yd-bs-step-meta"><span class="yd-bs-badge">최종 확인</span><span class="yd-bs-step-count">STEP 3 / 3</span></div><h3>선택한 상품을 확인해 주세요.</h3><p class="yd-bs-lead">장바구니에 담기기 전 메뉴와 수량, 추가상품을 마지막으로 확인하고 수정할 수 있습니다.</p>' + reviewHtml(s) + '</div>';
      return progress + html;
    }
    function shippingGauge(s) {
      if (isPureProteinNoShipGaugeProduct()) return '';
      var estimated = (cartSubtotalReady ? cartSubtotal : 0) + s.totalValue;
      var remaining = Math.max(0, CONFIG.FREE_SHIP_THRESHOLD - estimated);
      var percent = Math.max(0, Math.min(100, Math.round(estimated / CONFIG.FREE_SHIP_THRESHOLD * 100)));
      var marker = Math.max(7, Math.min(93, percent));
      var status = !cartSubtotalReady ? '장바구니 금액 확인 중…' : remaining ? money(remaining) + ' 더 담으면 무료배송' : '무료배송 조건을 충족했어요';
      var detail = cartSubtotalReady ? '장바구니 ' + money(cartSubtotal) + ' + 현재 선택 ' + money(s.totalValue) : '현재 선택 ' + money(s.totalValue);
      return '<aside class="yd-bs-shipping ' + (remaining === 0 && cartSubtotalReady ? 'is-complete' : '') + '" aria-label="무료배송 진행 상황"><div class="yd-bs-shipping-head"><span>9만원 이상 무료배송</span><strong aria-live="polite">' + status + '</strong></div><div class="yd-bs-shipping-track" role="progressbar" aria-valuemin="0" aria-valuemax="' + CONFIG.FREE_SHIP_THRESHOLD + '" aria-valuenow="' + Math.min(CONFIG.FREE_SHIP_THRESHOLD, estimated) + '"><div class="yd-bs-shipping-fill" style="width:' + percent + '%"></div><span class="yd-bs-shipping-percent" style="left:' + marker + '%">' + percent + '%</span></div><div class="yd-bs-shipping-meta"><span>장바구니 상품 기준</span><span>' + detail + '</span></div></aside>';
    }
    var canNext = function(s) { return (step === 1 || step === 3) ? s.reqQty >= cfg.min : true; };
    /* 비회원 판별: 시트가 iframe에서 떠도 부모 문서의 헤더 마커(.member-info.guest)로 확인.
       판별 실패 시 false(=기존 회원용 라벨/동작 유지)로 안전하게 떨어진다 */
    var payIsGuest = function() {
      try { if (document.querySelector('.member-info.guest')) return true; } catch (err) {}
      try {
        if (window.parent && window.parent !== window && window.parent.document.querySelector('.member-info.guest')) return true;
      } catch (err) {}
      return false;
    };
    /* 비회원 라벨(2026-08-26 소유자 지시 2차): 가입 시 쿠폰팩 자동발행과 연결된 카피 + 카카오 옐로 버튼 */
    var payButtonLabel = function(busy) {
      if (payIsGuest()) return busy ? '카카오 로그인으로 이동 중…' : '3초 회원가입쿠폰';
      return busy ? '결제로 이동 중…' : '바로 결제하기';
    };
    var primaryLabel = function() { return step === 3 ? payButtonLabel(false) : '다음으로'; };
    var cartChoice = function() {
      return cartPopup ? '<div class="yd-bs-cart-result" role="dialog" aria-modal="true" aria-label="장바구니 담기 완료"><div class="yd-bs-cart-result-card"><span class="yd-bs-cart-result-badge">장바구니 담기 완료</span><h3>선택한 상품을 장바구니에 담았습니다.</h3><p>장바구니에서 주문을 확인하거나 다른 상품을 계속 둘러보세요.</p><div class="yd-bs-cart-result-actions"><a class="yd-bs-cart-pay" href="/shop_cart">결제하기</a><a class="yd-bs-cart-continue" href="/best">계속 쇼핑하기</a></div></div></div>' : '';
    };

    function render() {
      var scrollEl = root.querySelector('.yd-bs-scroll');
      var previousScroll = scrollEl ? scrollEl.scrollTop : 0;
      var s = flowState();
      var sheetOpen = root.classList.contains('is-open');
      root.classList.toggle('is-top', cartPopup);
      var dockHtml = '<div class="yd-bs-dock"><button class="yd-bs-review-btn" type="button">리뷰보기</button><button class="yd-bs-open"><span>옵션 보기</span></button></div>';
      root.innerHTML = dockHtml + '<button class="yd-bs-backdrop" aria-label="옵션 창 닫기"></button><section class="yd-bs-sheet" role="dialog" aria-modal="true" aria-hidden="' + (sheetOpen ? 'false' : 'true') + '" aria-label="상품 옵션 선택"><div class="yd-bs-grab"></div><header class="yd-bs-head"><div class="yd-bs-head-text"><span class="yd-bs-mode">' + escT(cfg.title) + '</span><h2>상품 옵션 선택</h2></div><button class="yd-bs-close" aria-label="옵션 창 닫기">닫기</button></header><div class="yd-bs-scroll">' + (sheetOpen ? shippingGauge(s) : '') + stepContent(s) + '</div><footer class="yd-bs-foot">' + '<div class="yd-bs-total" aria-live="polite"><span>' + escT(cfg.unit) + ' ' + s.reqQty + '개 · 추가상품 ' + s.optQty + '개</span><strong>' + escT(s.total) + '</strong></div>' + (step === 3 ? '<div class="yd-bs-step3-backrow"><button class="yd-bs-back yd-bs-back-mini" ' + (addingCart ? 'disabled' : '') + '>뒤로가기</button></div>' + (payIsGuest() ? '<div class="yd-bs-actions"><button class="yd-bs-primary yd-bs-cart-add yd-bs-solo" ' + (canNext(s) && !addingCart ? '' : 'disabled') + '>' + (addingCart ? '담는 중…' : '장바구니 담기') + '</button></div>' : '<div class="yd-bs-actions"><button class="yd-bs-primary" ' + (canNext(s) && !addingCart ? '' : 'disabled') + '>' + payButtonLabel(addingCart && afterAddMode === 'pay') + '</button><button class="yd-bs-back yd-bs-cart-add" ' + (canNext(s) && !addingCart ? '' : 'disabled') + '>' + (addingCart && afterAddMode !== 'pay' ? '담는 중…' : '장바구니 담기') + '</button></div>') : '<div class="yd-bs-actions"><button class="yd-bs-back">이전으로 돌아가기</button><button class="yd-bs-primary" ' + (canNext(s) ? '' : 'disabled') + '>' + primaryLabel() + '</button></div>') + '</footer></section>' + cartChoice();
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
    /* 담기 완료 후 동작: 'close' = 팝업까지 닫기, 'cart' = 장바구니로 이동,
       'pay' = 결제 위치(장바구니 자동 주문)로 이동.
       ⚠️ iframe에서는 닫는 순간 진행 중 요청이 끊기므로, 반드시 담김이 확인된 뒤에만 닫는다 */
    var afterAddMode = 'close';
    /* 광고 대상 상품(PROMO.PRODUCTS)의 광고 유입 상세 페이지 전용 (2026-08-29 소유자 지시):
       [장바구니 담기] 클릭 시 선택 옵션의 담김을 API로 확증한 뒤 /shop_cart로 이동한다.
       일반 유입·광고 비대상 상품·상품 팝업(iframe)은 기존 동작을 유지한다. */
    var adProductDirectCart = !IS_IFRAME && PROMO.PRODUCTS.indexOf(promoIdx()) !== -1 && isAdEntry();
    var cartStateBefore = null;
    /* 항목 수 + 총액을 함께 본다 — 같은 상품 재담기는 수량 합산이라 항목 수가 안 늘어난다(실측) */
    var fetchCartState = function() {
      return fetch(CONFIG.CART_API, { credentials: 'same-origin', cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(j) {
          if (!j || !j.data) return null;
          var meta = j.data.meta || {};
          var sum = j.data.cart_price_summary || {};
          return { count: Number(meta.total_normal_cart_item_count) || 0, price: Number(sum.product_price) || 0 };
        })
        .catch(function() { return null; });
    };
    var finishCartAdd = function() {
      dismissNativeCartModal();
      [250, 600, 1200, 2000].forEach(function(ms) { setTimeout(dismissNativeCartModal, ms); });
      if (afterAddMode === 'cart') {
        ydMark('adCartDirect', true, '광고 상품 — 선택 옵션 담김 확증 후 장바구니 이동');
        try { (window.top || window).location.href = '/shop_cart'; }
        catch (err) { window.location.href = '/shop_cart'; }
        return;
      }
      if (afterAddMode === 'pay') {
        /* 비회원(2026-08-26 소유자 지시 3차): [3초 회원가입쿠폰]은 게스트 결제로 새지 않고
           카카오 가입을 경유해 쿠폰팩(가입 자동발행)을 받게 한다.
           로그인 페이지로 직행 → yd_kakao_direct가 카카오 버튼 자동 클릭 →
           가입/로그인 복귀 후 yd_pay_resume이 장바구니 자동결제(yd_autopay)로 재개.
           비회원 그대로 사고 싶은 고객은 [장바구니 담기] → 장바구니 주문하기(로그인 전 바로 주문 허용 ON)로 구매 가능. */
        if (payIsGuest()) {
          try { window.localStorage.setItem('yd_kakao_direct', String(Date.now())); } catch (err) {}
          /* 복귀 주소를 카카오 OAuth까지 관통시킨다(2026-08-28 소유자 지시):
             도매몰이면 가입 후 도매몰 원위치, 그 외엔 장바구니 랜딩(8/26 승인 동작). */
          var payDest = '/login';
          if (isWholesalePage()) {
            try {
              window.localStorage.setItem('yd_wholesale_return', JSON.stringify({ t: Date.now(), to: window.location.pathname + window.location.search }));
            } catch (err) {}
            try { payDest = '/login?back_url=' + encodeURIComponent(window.btoa(window.location.pathname + window.location.search)); } catch (err) {}
            ydTrace('옵션탭 3초가입(도매몰) — 마커+back_url 부착');
          } else {
            try { window.localStorage.setItem('yd_pay_resume', String(Date.now())); } catch (err) {}
            try { payDest = '/login?back_url=' + encodeURIComponent(window.btoa('/shop_cart')); } catch (err) {}
            ydTrace('옵션탭 3초가입 — 장바구니 back_url 부착');
          }
          try { (window.top || window).location.href = payDest; }
          catch (err) { window.location.href = payDest; }
          return;
        }
        /* yd_autopay=1: 장바구니 도착 즉시 네이티브 주문하기를 자동 클릭해 결제 단계로 직행 */
        try { (window.top || window).location.href = '/shop_cart?yd_autopay=1'; }
        catch (err) { window.location.href = '/shop_cart?yd_autopay=1'; }
        return;
      }
      cartPopup = false; step = 1; render();
      document.body.classList.remove('yd-bs-lock', 'yd-bs-cart-choice-active');
      try { if (IS_IFRAME && window.parent.__ydRemoveModal) { window.parent.__ydRemoveModal(); return; } } catch (err) {}
      try { if (IS_IFRAME && window.parent.__ydSetModalClose) window.parent.__ydSetModalClose(true); } catch (err) {}
    };
    /* 담김 확증 폴링: API 수량 증가(확실) 또는 1초 경과 후 .in 성공모달(같은 상품 합산 케이스).
       확증 전에는 절대 iframe/페이지를 닫거나 이동하지 않는다 — 진행 중 담기 요청이 끊긴다 */
    /* 확증은 장바구니 API 수량 증가만 신뢰한다 — 네이티브 성공팝업(.in)은 서버 확정 전에 뜨는 오탐이 실측됨.
       대기 중에는 시트를 유지하고 버튼을 '담는 중…'으로 바꿔 사용자에게 진행을 보여준다 */
    var addingCart = false;
    var pollCartAdded = function(round) {
      round = round || 0;
      dismissNativeCartModal();
      fetchCartState().then(function(now) {
        var confirmed = now && cartStateBefore && (now.count > cartStateBefore.count || now.price > cartStateBefore.price);
        if (confirmed) {
          addingCart = false;
          closeSheet(); finishCartAdd(); return;
        }
        if (round < 40) { setTimeout(function() { pollCartAdded(round + 1); }, 300); return; }
        /* 담김 미확인: 닫지 않고 버튼을 복구해 재시도 유도 */
        addingCart = false; render();
      });
    };
    var performCartAdd = function(mode) {
      if (addingCart) return;
      var s = flowState();
      if (!canNext(s)) return;
      var native = document.querySelector('#prod_detail a._btn_cart[onclick*="addCart"]') ||
                   document.querySelector('a.btn.cart.opt._btn_cart') ||
                   document.querySelector('#prod_detail a._btn_cart');
      if (!native) return;
      afterAddMode = mode; cartPopup = false; addingCart = true; render();
      /* 기준 상태(항목 수+총액)를 먼저 확보한 뒤 담기 실행 (레이스 방지) */
      fetchCartState().then(function(n) {
        cartStateBefore = n || { count: 0, price: 0 };
        native.click(); pollCartAdded(0);
      });
    };

    root.addEventListener('click', function(event) {
      var target = event.target.closest('button,a');
      if (!target || !root.contains(target)) return;
      var stepBtn = target.closest('.yd-bs-progress button');
      if (stepBtn && !stepBtn.disabled) {
        var toStep = parseInt(stepBtn.dataset.step, 10);
        if (toStep >= 1 && toStep <= 3 && toStep !== step) {
          step = toStep; cartPopup = false; render();
          var psc = root.querySelector('.yd-bs-scroll'); if (psc) psc.scrollTop = 0;
        }
        return;
      }
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
      if (target.matches('.yd-bs-open')) {
        openSheet(); return;
      }
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
      if (target.matches('.yd-bs-cart-add')) { performCartAdd(adProductDirectCart ? 'cart' : 'close'); return; }
      if (target.matches('.yd-bs-back')) { if (step === 1) { closeSheet(); return; } step = Math.max(1, step - 1); cartPopup = false; render(); var sc = root.querySelector('.yd-bs-scroll'); if (sc) sc.scrollTop = 0; return; }
      if (target.matches('.yd-bs-primary')) {
        var s = flowState();
        if (!canNext(s)) return;
        if (step < 3) { step += 1; cartPopup = false; render(); var sc2 = root.querySelector('.yd-bs-scroll'); if (sc2) sc2.scrollTop = 0; return; }
        performCartAdd('pay');
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
      /* 아임웹 2026-08-28 플랫폼 개편 대응: 옵션 컨테이너 노드가 통째로 교체되고
         행 생성이 비동기(지연)화됨 — 부팅 시점 노드에 건 관찰자는 교체와 함께 실명해
         시트 합계가 0개에 멈추고 [다음으로]가 영구 잠김(주문 전멸 사고의 원인).
         body 레벨 관찰(교체 생존) + 열림 중 하트비트 폴링으로 이중화한다. */
      var isOptionDomNode = function(t) {
        var el = t && (t.nodeType === 1 ? t : t.parentElement);
        return !!(el && el.closest && (el.closest('#prod_selected_options') || el.closest('#prod_options')));
      };
      var observer = new MutationObserver(function(muts) {
        for (var mi = 0; mi < muts.length; mi++) {
          if (isOptionDomNode(muts[mi].target)) { rehideNativeSource(); scheduleRender(false); return; }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['value'] });
      /* 컨테이너 교체 시 숨김 클래스도 함께 증발하므로 재적용 */
      var rehideNativeSource = function() {
        document.querySelectorAll(HIDE_SELECTORS).forEach(function(el) {
          if (!el.classList.contains('yd-bs-native-source')) el.classList.add('yd-bs-native-source');
        });
      };
      var lastNativeSig = '';
      window.setInterval(function() {
        if (!root.isConnected || !root.classList.contains('is-open')) return;
        var sel = document.getElementById('prod_selected_options');
        var sig = sel ? (sel.textContent || '').replace(/\s+/g, '') : '';
        if (sig !== lastNativeSig) { lastNativeSig = sig; rehideNativeSource(); scheduleRender(false); }
      }, 600);
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
      /* 주문하기 표면이 button 외에 a 태그로도 존재(2026-08-27 대표 실화면 실증) — 둘 다 잡는다 */
      qsa('button, a').forEach(function(btn) {
        if (!/^주문하기/.test((btn.textContent || '').trim())) {
          return;
        }
        if (btn.closest('#yd-guest-orderbar')) return;
        const isAnchor = btn.tagName === 'A';
        found = true;
        /* a 태그는 부모가 콘텐츠 컨테이너일 수 있어 자신만 숨긴다 */
        const wrap = isAnchor ? btn : (btn.parentElement || btn);

        if (!guest && isAnchor) return; /* 회원 화면의 a 주문하기는 원형 유지 */

        if (guest) {
          if (wrap.style.display !== 'none') {
            wrap.style.display = 'none';
          }
          /* 2026-08-27 복구: 게스트 주문 진입이 사라졌던 결함 — 숨기는 대신
             [3초 회원가입 후 구매하기 / 비회원 구매] 듀얼 바를 띄운다 (대표 지시) */
          if (!qs('#yd-guest-orderbar')) {
            const bar = document.createElement('div');
            bar.id = 'yd-guest-orderbar';
            bar.innerHTML =
              '<button type="button" class="yd-gob-guest">비회원 구매</button>' +
              '<button type="button" class="yd-gob-join">3초 회원가입 후 구매하기</button>';
            document.body.appendChild(bar);
            qs('.yd-gob-join', bar).addEventListener('click', function() {
              try {
                window.localStorage.setItem('yd_kakao_direct', String(Date.now()));
                window.localStorage.setItem('yd_pay_resume', String(Date.now()));
                /* 장바구니 여정이 우선 — 이전 도매몰 마커가 가입 후 장바구니 복귀를 가로채지 않게 정리 */
                window.localStorage.removeItem('yd_wholesale_return');
              } catch (err) {}
              ydTrace('장바구니 3초가입 — 장바구니 back_url 부착');
              var gobDest = '/login';
              try { gobDest = '/login?back_url=' + encodeURIComponent(window.btoa('/shop_cart')); } catch (err) {}
              /* 장바구니 페이지에서 게스트 세션이 확실할 때 먼저 스냅샷을 완료한다.
                 로그인 페이지에는 .member-info.guest가 없어 게스트 판별을 신뢰할 수 없다. */
              var leaveForLogin = function() {
                try { (window.top || window).location.href = gobDest; }
                catch (err) { window.location.href = gobDest; }
              };
              var carryReady = captureGuestCartCarry(true);
              window.__ydCarryReady = carryReady;
              var carrySettled = false;
              var carryFuse = window.setTimeout(function() {
                if (!carrySettled) { carrySettled = true; leaveForLogin(); }
              }, 2000);
              carryReady.then(function() {
                if (!carrySettled) { carrySettled = true; window.clearTimeout(carryFuse); leaveForLogin(); }
              }, function() {
                if (!carrySettled) { carrySettled = true; window.clearTimeout(carryFuse); leaveForLogin(); }
              });
            });
            qs('.yd-gob-guest', bar).addEventListener('click', function() {
              /* 네이티브 주문하기 트리거 — '로그인 전 바로 주문 허용' ON이라 비회원 주문서로 진행 */
              btn.click();
            });
            const aside = wrap.closest('aside');
            if (aside) aside.style.paddingBottom = '110px';
          }
          return;
        }
        const gob = qs('#yd-guest-orderbar');
        if (gob) gob.remove();

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
      ydMark('cartOrderButton', found, guest ? '비로그인: 듀얼 주문바' : '로그인: 하단 고정');
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

    /* 마이페이지 재주문 직행: 새로 담긴 항목만 선택된 것을 API로 재확인한 뒤 주문서로 이동 */
    var reorderCheckoutStarted = false;
    var reorderCheckoutDone = false;
    var REORDER_CHECKOUT_KEY = 'yd_reorder_checkout_v1';

    function showReorderCartError(message) {
      var notice = qs('#yd-reorder-cart-error');
      if (!notice) {
        notice = document.createElement('div');
        notice.id = 'yd-reorder-cart-error';
        notice.setAttribute('role', 'alert');
        document.body.appendChild(notice);
      }
      notice.textContent = message;
    }

    function clearReorderCheckoutQuery() {
      try {
        var url = new URL(window.location.href);
        url.searchParams.delete('yd_reorder_checkout');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch (err) {}
    }

    function clearReorderCheckoutMarker() {
      try { window.sessionStorage.removeItem(REORDER_CHECKOUT_KEY); } catch (err) {}
    }

    function cartPayload() {
      return fetch(CONFIG.CART_API, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      }).then(function(response) {
        if (!response.ok) throw new Error('cart_http_' + response.status);
        return response.json();
      });
    }

    function cartPayloadItems(payload) {
      var cart = payload && payload.data && payload.data.cart;
      return cart && Array.isArray(cart.items) ? cart.items : [];
    }

    function cartItemSelected(item) {
      var value = item && item.selected;
      return value === true || value === 1 || value === '1' || value === 'Y' || value === 'true';
    }

    function cartItemCheckboxes() {
      return qsa('input[type="checkbox"][data-clay-blind]').filter(function(input) {
        return !/^전체\s*선택/.test((input.getAttribute('aria-label') || '').trim());
      });
    }

    function verifyCartCheckboxMap(items, boxes) {
      if (!items.length || items.length !== boxes.length) return false;
      return items.every(function(item, index) {
        var name = String(item && item.product && item.product.name || '').replace(/\s+/g, ' ').trim();
        var label = String(boxes[index].getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        return !!name && label.indexOf(name) !== -1;
      });
    }

    function waitForExactReorderSelection(targetCodes, round) {
      round = round || 0;
      return cartPayload().then(function(payload) {
        var items = cartPayloadItems(payload);
        var exact = items.length > 0 && items.every(function(item) {
          return cartItemSelected(item) === targetCodes.has(String(item.item_code));
        });
        if (exact) return payload;
        if (round >= 20) throw new Error('선택 상태를 확인하지 못했습니다.');
        return new Promise(function(resolve) { window.setTimeout(resolve, 250); })
          .then(function() { return waitForExactReorderSelection(targetCodes, round + 1); });
      });
    }

    function tryReorderCheckout() {
      if (reorderCheckoutStarted || reorderCheckoutDone || !/[?&]yd_reorder_checkout=1/.test(window.location.search)) return;
      reorderCheckoutStarted = true;

      var marker = null;
      try { marker = JSON.parse(window.sessionStorage.getItem(REORDER_CHECKOUT_KEY) || 'null'); }
      catch (err) {}
      if (!marker || !Array.isArray(marker.itemCodes) || !marker.itemCodes.length ||
          !marker.createdAt || Date.now() - Number(marker.createdAt) > 10 * 60 * 1000) {
        reorderCheckoutDone = true;
        clearReorderCheckoutMarker();
        clearReorderCheckoutQuery();
        showReorderCartError('재주문 항목을 확인하지 못했습니다. 결제로 이동하지 않았으니 장바구니를 확인해 주세요.');
        return;
      }

      var targetCodes = new Set(marker.itemCodes.map(String));
      cartPayload().then(function(payload) {
        var items = cartPayloadItems(payload);
        var boxes = cartItemCheckboxes();
        var allTargetsExist = Array.from(targetCodes).every(function(code) {
          return items.some(function(item) { return String(item.item_code) === code; });
        });
        if (!allTargetsExist || !verifyCartCheckboxMap(items, boxes)) {
          throw new Error('새로 담긴 상품과 장바구니 화면을 정확히 연결하지 못했습니다.');
        }

        items.forEach(function(item, index) {
          var shouldSelect = targetCodes.has(String(item.item_code));
          if (boxes[index].checked !== shouldSelect) boxes[index].click();
        });
        return waitForExactReorderSelection(targetCodes, 0);
      }).then(function() {
        var orderButton = qsa('button').find(function(button) {
          return /^주문하기/.test((button.textContent || '').trim());
        });
        if (!orderButton) throw new Error('주문하기 버튼을 찾지 못했습니다.');
        reorderCheckoutDone = true;
        clearReorderCheckoutMarker();
        clearReorderCheckoutQuery();
        orderButton.click();
      }).catch(function() {
        reorderCheckoutDone = true;
        clearReorderCheckoutMarker();
        clearReorderCheckoutQuery();
        showReorderCartError('새로 담긴 상품만 안전하게 선택하지 못해 결제로 이동하지 않았습니다. 장바구니에서 직접 확인해 주세요.');
      });
    }

    /* 바로 결제하기 직행: ?yd_autopay=1로 도착하면 주문하기를 1회 자동 클릭 (게스트는 로그인→결제 복귀) */
    var autoPayDone = false;
    function tryAutoPay() {
      if (autoPayDone || !/[?&]yd_autopay=1/.test(window.location.search)) return;
      var btn = null;
      qsa('button').forEach(function(b) {
        if (!btn && /^주문하기/.test((b.textContent || '').trim())) btn = b;
      });
      if (!btn) return;
      autoPayDone = true;
      try { window.history.replaceState(null, '', window.location.pathname); } catch (err) {}
      btn.click();
    }

    function run() {
      hideItemDetailRows();
      applyOrderButton();
      polishCartControls();
      tryReorderCheckout();
      tryAutoPay();
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

  /* ═══ 멤버십 UI 기반 (기본 비활성) ═══
     경계 계약:
     - footer는 동일 출처 GET 응답을 표시만 하며 회원 자격·가격·상품 접근을 판정하지 않는다.
     - 서버는 HttpOnly 세션으로 사용자를 식별하고 구독/추천 장부를 합쳐 이 스키마를 반환한다.
     - 직접 URL·회원가·결제·해지·추천 보상은 아임웹 권한 또는 별도 서버가 반드시 재검증한다.
     - localStorage, 쿼리, DOM 클래스, 클라이언트가 보낸 회원 ID는 권한 근거로 쓰지 않는다.
     응답 스키마: yundiet-membership-ui/v1
     { schema, serverVerified, viewer:{authenticated}, membership, referral, actions } */
  function removeMembershipRoot() {
    const root = qs('#yd-membership-root');
    if (root) {
      root.remove();
    }
  }

  function membershipSafeSameOriginPath(value) {
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) {
        return null;
      }
      return url.pathname + url.search + url.hash;
    } catch (err) {
      return null;
    }
  }

  function membershipDateLabel(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }
    const parts = value.split('-').map(Number);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (
      date.getUTCFullYear() !== parts[0] ||
      date.getUTCMonth() !== parts[1] - 1 ||
      date.getUTCDate() !== parts[2]
    ) {
      return null;
    }
    return parts[0] + '년 ' + parts[1] + '월 ' + parts[2] + '일';
  }

  function membershipBoundedInteger(value) {
    return Number.isInteger(value) && value >= 0 && value <= 3660 ? value : null;
  }

  function membershipViewFromPayload(payload) {
    if (
      !payload ||
      payload.schema !== CONFIG.MEMBERSHIP_SCHEMA ||
      payload.serverVerified !== true ||
      !payload.viewer ||
      typeof payload.viewer.authenticated !== 'boolean'
    ) {
      return null;
    }

    if (!payload.viewer.authenticated) {
      return { authenticated: false };
    }

    const membership = payload.membership;
    const states = ['active', 'trial', 'benefit', 'cancel_scheduled', 'inactive'];
    const billingModes = ['subscription', 'none'];
    if (
      !membership ||
      states.indexOf(membership.state) === -1 ||
      billingModes.indexOf(membership.billingMode) === -1
    ) {
      return null;
    }

    const nextBillingLabel = membershipDateLabel(membership.nextBillingDate);
    if (membership.billingMode === 'subscription' && !nextBillingLabel) {
      return null;
    }

    const benefitDays = membershipBoundedInteger(membership.benefitDaysRemaining);
    if (benefitDays === null) {
      return null;
    }

    const stateLabels = {
      active: '이용 중',
      trial: '무료 이용 중',
      benefit: '추천 혜택 이용 중',
      cancel_scheduled: '해지 예정',
      inactive: '미이용'
    };
    const view = {
      authenticated: true,
      state: membership.state,
      stateLabel: stateLabels[membership.state],
      billingLabel: membership.billingMode === 'subscription' ? nextBillingLabel : '자동결제 없음',
      benefitLabel: benefitDays > 0 ? benefitDays + '일 남음' : '없음',
      referralLabel: null,
      manageUrl: null,
      referralUrl: null
    };

    const referral = payload.referral;
    if (referral) {
      const referralStates = ['ready', 'pending', 'rewarded', 'unavailable'];
      const pendingCount = membershipBoundedInteger(referral.pendingCount);
      const earnedDays = membershipBoundedInteger(referral.earnedDays);
      if (
        referralStates.indexOf(referral.state) === -1 ||
        pendingCount === null ||
        earnedDays === null
      ) {
        return null;
      }
      const referralLabels = {
        ready: '추천 가능',
        pending: pendingCount + '명 확인 중',
        rewarded: earnedDays + '일 지급 완료',
        unavailable: '준비 중'
      };
      view.referralLabel = referralLabels[referral.state];
      view.referralUrl = membershipSafeSameOriginPath(referral.shareUrl);
    }

    if (payload.actions) {
      view.manageUrl = membershipSafeSameOriginPath(payload.actions.manageUrl);
    }
    return view;
  }

  function membershipFact(label, value) {
    const wrap = document.createElement('div');
    wrap.className = 'yd-membership-fact';
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    wrap.appendChild(term);
    wrap.appendChild(detail);
    return wrap;
  }

  function membershipLink(label, href) {
    const link = document.createElement('a');
    link.className = 'yd-membership-link';
    link.href = href;
    link.textContent = label;
    return link;
  }

  function renderMembershipUi(view) {
    const footer = qs('#doz_footer_wrap');
    if (!footer || !footer.parentNode) {
      return false;
    }

    let root = qs('#yd-membership-root');
    if (!root) {
      root = document.createElement('section');
      root.id = 'yd-membership-root';
      root.setAttribute('aria-labelledby', 'yd-membership-title');
      footer.parentNode.insertBefore(root, footer);
    }
    root.dataset.membershipState = view.state;
    root.textContent = '';

    const card = document.createElement('div');
    card.className = 'yd-membership-card';
    const head = document.createElement('div');
    head.className = 'yd-membership-head';
    const title = document.createElement('h2');
    title.id = 'yd-membership-title';
    title.className = 'yd-membership-title';
    title.textContent = '윤식단 멤버십';
    const badge = document.createElement('span');
    badge.className = 'yd-membership-badge';
    badge.textContent = view.stateLabel;
    head.appendChild(title);
    head.appendChild(badge);

    const facts = document.createElement('dl');
    facts.className = 'yd-membership-facts';
    facts.appendChild(membershipFact('멤버십 상태', view.stateLabel));
    facts.appendChild(membershipFact('다음 결제', view.billingLabel));
    facts.appendChild(membershipFact('무료 이용', view.benefitLabel));
    if (view.referralLabel) {
      facts.appendChild(membershipFact('친구추천', view.referralLabel));
    }

    card.appendChild(head);
    card.appendChild(facts);
    if (view.manageUrl || view.referralUrl) {
      const actions = document.createElement('div');
      actions.className = 'yd-membership-actions';
      if (view.manageUrl) {
        actions.appendChild(membershipLink('멤버십 관리·해지', view.manageUrl));
      }
      if (view.referralUrl) {
        actions.appendChild(membershipLink('친구추천 링크', view.referralUrl));
      }
      card.appendChild(actions);
    }
    root.appendChild(card);
    return true;
  }

  function bindMembershipFoundation() {
    if (!CONFIG.MEMBERSHIP_UI_ENABLED) {
      removeMembershipRoot();
      ydMark('membershipFoundation', true, '비공개 기반 — 서버 연결 전');
      return;
    }
    if (IS_IFRAME) {
      removeMembershipRoot();
      ydMark('membershipFoundation', true, 'iframe에서는 표시하지 않음');
      return;
    }

    const endpoint = membershipSafeSameOriginPath(CONFIG.MEMBERSHIP_STATE_ENDPOINT);
    if (!endpoint) {
      removeMembershipRoot();
      ydMark('membershipFoundation', false, '동일 출처 상태 API 없음 — 표시 차단');
      return;
    }

    const requestOptions = {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    };
    let timer = 0;
    if (typeof AbortController === 'function') {
      const controller = new AbortController();
      requestOptions.signal = controller.signal;
      timer = window.setTimeout(function() {
        controller.abort();
      }, CONFIG.MEMBERSHIP_REQUEST_TIMEOUT);
    }

    fetch(endpoint, requestOptions)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('membership state ' + response.status);
        }
        return response.json();
      })
      .then(function(payload) {
        if (timer) {
          window.clearTimeout(timer);
        }
        const view = membershipViewFromPayload(payload);
        if (!view) {
          throw new Error('membership schema mismatch');
        }
        if (!view.authenticated) {
          removeMembershipRoot();
          ydMark('membershipFoundation', true, '비로그인 — 표시하지 않음');
          return;
        }
        const rendered = renderMembershipUi(view);
        ydMark(
          'membershipFoundation',
          rendered,
          rendered ? '서버 검증 상태 표시' : '안전한 마운트 지점 없음'
        );
      })
      .catch(function() {
        if (timer) {
          window.clearTimeout(timer);
        }
        removeMembershipRoot();
        ydMark('membershipFoundation', false, '서버 상태 확인 실패 — 표시 차단');
      });
  }

  /* ═══ 마이페이지 이전 주문 그대로 담기 / 재주문 ═══ */
  function bindMyPageReorder() {
    if (!pageIs('/shop_mypage') || IS_IFRAME) {
      return;
    }

    const CHECKOUT_STORAGE_KEY = 'yd_reorder_checkout_v1';
    let busy = false;

    function normalized(value) {
      return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function normalizedOptionLabel(value) {
      return normalized(String(value || '')
        .replace(/[\u25A0-\u27BF\uFE0F\u2B50]/g, ' ')
        .replace(/[:：]+$/g, ' '));
    }

    function asArray(value) {
      if (Array.isArray(value)) return value.map(String);
      if (value === undefined || value === null || value === '') return [];
      return String(value).split(',').map(function(v) { return v.trim(); }).filter(Boolean);
    }

    function boolSelected(value) {
      return value === true || value === 1 || value === '1' || value === 'Y' || value === 'true';
    }

    function productIdxFromLink(link) {
      if (!link) return '';
      try {
        return new URL(link.href, window.location.origin).searchParams.get('idx') || '';
      } catch (err) {
        const match = String(link.getAttribute('href') || '').match(/[?&]idx=(\d+)/);
        return match ? match[1] : '';
      }
    }

    function optionPairsFromRow(row) {
      const wrap = qsa('div', row).find(function(el) {
        return String(el.className || '').indexOf('tw-gap-[4px]') !== -1;
      });
      if (!wrap) return [];

      return Array.from(wrap.children).map(function(block) {
        const labelEl = qs('.tw-inline', block);
        if (!labelEl) return null;
        const clone = block.cloneNode(true);
        const clonedLabel = qs('.tw-inline', clone);
        if (clonedLabel) clonedLabel.remove();
        const label = normalizedOptionLabel(labelEl.textContent);
        const value = normalized(clone.textContent);
        return label && value ? { label: label, value: value } : null;
      }).filter(Boolean);
    }

    function quantityFromRow(row) {
      const quantityText = qsa('span', row).map(function(el) {
        return normalized(el.textContent);
      }).find(function(text) {
        return /^\d+\s*개$/.test(text);
      });
      const match = quantityText && quantityText.match(/^(\d+)/);
      return match ? Number(match[1]) : 0;
    }

    function extractOrder(table) {
      const contentRows = qsa('tbody tr.content', table);
      const groups = {};
      const errors = [];

      contentRows.forEach(function(row) {
        const productLink = qs('a[href*="shop_view"]', row);
        const prodIdx = productIdxFromLink(productLink);
        const quantity = quantityFromRow(row);
        if (!prodIdx || !quantity) {
          errors.push('이전 주문의 상품 또는 수량 정보를 읽을 수 없습니다.');
          return;
        }
        if (!groups[prodIdx]) {
          groups[prodIdx] = {
            prodIdx: prodIdx,
            name: normalized(productLink.textContent),
            rows: []
          };
        }
        groups[prodIdx].rows.push({
          quantity: quantity,
          pairs: optionPairsFromRow(row)
        });
      });

      if (!contentRows.length) errors.push('이전 주문 상품을 찾을 수 없습니다.');
      return { groups: Object.keys(groups).map(function(key) { return groups[key]; }), errors: errors };
    }

    function isEligibleOrder(table) {
      return qsa('tbody tr.content', table).some(function(row) {
        return !!productIdxFromLink(qs('a[href*="shop_view"]', row)) && quantityFromRow(row) > 0;
      });
    }

    function fetchProduct(prodIdx) {
      return fetch('/ajax/oms/OMS_get_product.cm?prod_idx=' + encodeURIComponent(prodIdx), {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      }).then(function(response) {
        if (!response.ok) throw new Error('product_http_' + response.status);
        return response.json();
      }).then(function(payload) {
        if (!payload || !payload.data) throw new Error('product_schema');
        return payload.data;
      });
    }

    function optionDefinitions(product) {
      return Array.isArray(product.options) ? product.options : [];
    }

    function findCurrentOption(product, pair) {
      const definition = optionDefinitions(product).find(function(option) {
        return normalizedOptionLabel(option.name) === normalizedOptionLabel(pair.label);
      });
      if (!definition || String(definition.type || '').toLowerCase() === 'input') return null;

      const values = Object.entries(definition.value_list || {});
      const value = values.find(function(entry) {
        return normalized(entry[1]) === normalized(pair.value);
      });
      if (!value) return null;

      return {
        value_type: 'SELECT',
        option_code: String(definition.code),
        value_code: String(value[0]),
        value_name: String(value[1]),
        require: definition.is_require === true || definition.is_require === 'Y' || definition.is_require === 1
      };
    }

    function findOptionDetail(product, selections, require) {
      const codes = selections.map(function(item) { return item.option_code; });
      const values = selections.map(function(item) { return item.value_code; });
      return (Array.isArray(product.options_detail) ? product.options_detail : []).find(function(detail) {
        const detailCodes = asArray(detail.option_code_list);
        const detailValues = asArray(detail.value_code_list);
        const detailRequire = detail.is_require === true || detail.is_require === 'Y' || detail.is_require === 1;
        return detailRequire === require &&
          detailCodes.length === codes.length &&
          detailCodes.every(function(code, index) {
            return code === codes[index] && detailValues[index] === values[index];
          });
      }) || null;
    }

    function productIsOrderable(product) {
      const soldoutStatus = String(product && product.prod_soldout_status || '').toLowerCase();
      return product && product.deleted !== true &&
        String(product.prod_status || '').toLowerCase() === 'sale' &&
        soldoutStatus !== 'soldout' && soldoutStatus !== 'true' && soldoutStatus !== 'y';
    }

    function buildProductPlan(group, product) {
      if (!productIsOrderable(product)) {
        throw new Error('현재 판매하지 않는 상품이 포함되어 있습니다.');
      }

      const requiredDefinitions = optionDefinitions(product).filter(function(option) {
        return option.is_require === true || option.is_require === 'Y' || option.is_require === 1;
      });
      const rows = [];
      let orderCount = 0;

      group.rows.forEach(function(oldRow) {
        if (!oldRow.pairs.length) {
          if (requiredDefinitions.length) {
            throw new Error('현재 옵션과 이전 주문 옵션이 달라진 상품이 있습니다.');
          }
          orderCount += oldRow.quantity;
          return;
        }

        const selections = oldRow.pairs.map(function(pair) {
          return findCurrentOption(product, pair);
        });
        if (selections.some(function(selection) { return !selection; })) {
          throw new Error('현재 옵션과 이전 주문 옵션이 달라진 상품이 있습니다.');
        }

        const require = selections.some(function(selection) { return selection.require; });
        const detail = findOptionDetail(product, selections, require);
        const hasStockValue = detail && detail.stock !== undefined && detail.stock !== null && detail.stock !== '';
        const stock = hasStockValue ? Number(detail.stock) : NaN;
        const stockManaged = product.stock_use === true || product.stock_use === 'Y' || product.stock_use === 1;
        if (!detail || String(detail.status || '').toUpperCase() !== 'SALE' ||
            (stockManaged && hasStockValue && Number.isFinite(stock) && stock <= 0)) {
          throw new Error('현재 품절되었거나 선택할 수 없는 옵션이 포함되어 있습니다.');
        }

        rows.push({
          options: selections.map(function(selection) {
            return {
              value_type: selection.value_type,
              option_code: selection.option_code,
              value_code: selection.value_code,
              value_name: selection.value_name
            };
          }),
          require: require,
          count: oldRow.quantity,
          price: Number(detail.price) || 0
        });
      });

      return {
        prodIdx: String(group.prodIdx),
        options: rows,
        orderCount: orderCount || 1,
        shippingTemplateCode: String(product.shipping_template_code || '')
      };
    }

    function preflight(table) {
      const extracted = extractOrder(table);
      if (extracted.errors.length || !extracted.groups.length) {
        return Promise.resolve({ ok: false, reason: extracted.errors[0] || '이전 주문을 읽을 수 없습니다.' });
      }

      return Promise.all(extracted.groups.map(function(group) {
        return fetchProduct(group.prodIdx).then(function(product) {
          return buildProductPlan(group, product);
        });
      })).then(function(plans) {
        return { ok: true, plans: plans, rowCount: extracted.groups.reduce(function(sum, group) { return sum + group.rows.length; }, 0) };
      }).catch(function(error) {
        const safeReason = /현재|이전 주문/.test(error.message || '')
          ? error.message
          : '상품 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
        return { ok: false, reason: safeReason };
      });
    }

    function cartItemsFromPayload(payload) {
      const cart = payload && payload.data && payload.data.cart;
      return cart && Array.isArray(cart.items) ? cart.items : [];
    }

    function fetchCart() {
      return fetch(CONFIG.CART_API, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      }).then(function(response) {
        if (!response.ok) throw new Error('cart_http_' + response.status);
        return response.json();
      });
    }

    function canonicalRows(rows) {
      return rows.map(function(row) {
        const codes = asArray(row.option_code_list);
        const values = asArray(row.value_code_list);
        if (Array.isArray(row.options)) {
          codes.splice(0, codes.length);
          values.splice(0, values.length);
          row.options.forEach(function(option) {
            codes.push(String(option.option_code));
            values.push(String(option.value_code));
          });
        }
        return codes.map(function(code, index) { return code + '=' + values[index]; }).sort().join('&');
      }).sort().join('|');
    }

    function planIdentity(plan) {
      return plan.prodIdx + '::' + canonicalRows(plan.options);
    }

    function itemIdentity(item) {
      const product = item && item.product || {};
      return String(product.prod_idx || item.prod_idx || '') + '::' + canonicalRows(item.options || []);
    }

    function cartSignature(payload) {
      return cartItemsFromPayload(payload).map(function(item) {
        return [item.item_code, item.count, (item.options || []).map(function(option) { return option.count; }).join(','), itemIdentity(item)].join(':');
      }).sort().join('|');
    }

    function addPlanToCart(plan) {
      return new Promise(function(resolve, reject) {
        const cart = window.SITE_SHOP_CART;
        if (!cart || typeof cart.addCart !== 'function') {
          reject(new Error('장바구니 기능을 불러오지 못했습니다.'));
          return;
        }
        let finished = false;
        const timer = window.setTimeout(function() {
          if (!finished) reject(new Error('장바구니 확인 시간이 초과되었습니다.'));
        }, 15000);
        cart.addCart(Number(plan.prodIdx), plan.options, plan.orderCount, function(ok, message) {
          if (finished) return;
          finished = true;
          window.clearTimeout(timer);
          if (ok) resolve();
          else reject(new Error(message || '상품을 장바구니에 담지 못했습니다.'));
        }, {
          cart_type: 'normal',
          shipping_template_code: plan.shippingTemplateCode
        });
      });
    }

    function waitForCartChange(beforeSignature, round) {
      round = round || 0;
      return fetchCart().then(function(payload) {
        if (cartSignature(payload) !== beforeSignature) return payload;
        if (round >= 20) throw new Error('장바구니 반영을 확인하지 못했습니다.');
        return new Promise(function(resolve) {
          window.setTimeout(resolve, 250);
        }).then(function() { return waitForCartChange(beforeSignature, round + 1); });
      });
    }

    function setBusy(actions, value, mode) {
      busy = value;
      qsa('button', actions).forEach(function(button) { button.disabled = value; });
      const primary = qs('.yd-reorder-primary', actions);
      if (primary) primary.textContent = value ? '담는 중…' : '재주문하기';
    }

    function setNotice(actions, kind, text, withCartLink) {
      const notice = qs('.yd-reorder-notice', actions);
      if (!notice) return;
      notice.className = 'yd-reorder-notice' + (kind ? ' is-' + kind : '');
      notice.textContent = text;
      if (withCartLink) {
        notice.appendChild(document.createTextNode(' '));
        const link = document.createElement('a');
        link.href = '/shop_cart';
        link.textContent = '장바구니 보기';
        notice.appendChild(link);
      }
    }

    function writeCheckoutMarker(itemCodes) {
      try {
        window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify({
          itemCodes: itemCodes,
          createdAt: Date.now()
        }));
        return true;
      } catch (err) {
        return false;
      }
    }

    function runReorder(actions, mode) {
      if (busy) return;
      const table = actions.__ydOrderTable;
      setBusy(actions, true, mode);
      setNotice(actions, '', '현재 판매 상태와 옵션을 확인하고 있습니다.', false);

      let beforePayload = null;
      let addedPlanCount = 0;
      preflight(table).then(function(result) {
        if (!result.ok) throw new Error(result.reason);
        return fetchCart().then(function(payload) {
          beforePayload = payload;
          if (mode === 'checkout') {
            const currentIdentities = cartItemsFromPayload(payload).map(itemIdentity);
            const duplicate = result.plans.some(function(plan) {
              return currentIdentities.indexOf(planIdentity(plan)) !== -1;
            });
            if (duplicate) {
              throw new Error('동일한 상품이 이미 장바구니에 있어 정확한 결제 구성을 만들 수 없습니다. 기존 장바구니를 먼저 확인해 주세요.');
            }
          }
          return result.plans.reduce(function(chain, plan) {
            return chain.then(function() {
              return addPlanToCart(plan).then(function() { addedPlanCount += 1; });
            });
          }, Promise.resolve()).then(function() {
            return { result: result, before: payload };
          });
        });
      }).then(function(context) {
        return waitForCartChange(cartSignature(context.before)).then(function(afterPayload) {
          return { result: context.result, before: context.before, after: afterPayload };
        });
      }).then(function(context) {
        if (mode === 'cart') {
          window.location.href = '/shop_cart';
          return;
        }

        const oldCodes = new Set(cartItemsFromPayload(context.before).map(function(item) { return String(item.item_code); }));
        const newItems = cartItemsFromPayload(context.after).filter(function(item) {
          return !oldCodes.has(String(item.item_code));
        });
        const newIdentities = newItems.map(itemIdentity);
        const expected = context.result.plans.map(planIdentity);
        const exact = expected.length === newItems.length && expected.every(function(identity) {
          return newIdentities.indexOf(identity) !== -1;
        });
        if (!exact) {
          throw new Error('새로 담긴 상품만 정확히 구분하지 못했습니다. 결제로 이동하지 않았으니 장바구니에서 확인해 주세요.');
        }
        const itemCodes = newItems.map(function(item) { return String(item.item_code); });
        if (!writeCheckoutMarker(itemCodes)) {
          throw new Error('안전한 결제 이동 정보를 저장하지 못했습니다. 장바구니에서 확인해 주세요.');
        }
        window.location.href = '/shop_cart?yd_reorder_checkout=1';
      }).catch(function(error) {
        const message = addedPlanCount > 0
          ? '일부 상품만 장바구니에 담겼습니다. 결제로 이동하지 않았으니 장바구니에서 구성을 확인해 주세요.'
          : (error.message || '재주문 준비 중 오류가 발생했습니다.');
        setNotice(actions, 'error', message, !!beforePayload);
      }).finally(function() {
        setBusy(actions, false, mode);
      });
    }

    function createActions(table) {
      const actions = document.createElement('div');
      actions.className = 'yd-reorder-actions';
      actions.__ydOrderTable = table;

      const primary = document.createElement('button');
      primary.type = 'button';
      primary.className = 'yd-reorder-primary';
      primary.textContent = '재주문하기';
      primary.addEventListener('click', function() { runReorder(actions, 'cart'); });

      const notice = document.createElement('p');
      notice.className = 'yd-reorder-notice';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');

      actions.appendChild(primary);
      actions.appendChild(notice);
      return actions;
    }

    function refresh() {
      const tables = qsa('#shop_mypage_orderlist table.shop-table');
      tables.forEach(function(table) {
        if (table.dataset.ydReorderChecked === '1') return;
        if (!isEligibleOrder(table)) return;
        table.dataset.ydReorderChecked = '1';
        const actions = createActions(table);
        if (table.parentNode) table.parentNode.insertBefore(actions, table.nextSibling);
      });
      const actionCount = qsa('.yd-reorder-actions').length;
      ydMark('myPageReorder', true, '대상 주문 ' + actionCount + '개');
    }

    window.YD_REORDER_CHECK = function() {
      return {
        eligibleOrders: qsa('#shop_mypage_orderlist table.shop-table').filter(isEligibleOrder).length,
        actionGroups: qsa('.yd-reorder-actions').length,
        busy: busy
      };
    };
    window.YD_REORDER_PREFLIGHT = function(table) {
      const target = table || qsa('#shop_mypage_orderlist table.shop-table').filter(isEligibleOrder)[0];
      if (!target) return Promise.resolve({ ok: false, reason: '검사할 완료 주문이 없습니다.' });
      return preflight(target).then(function(result) {
        return result.ok
          ? { ok: true, productCount: result.plans.length, rowCount: result.rowCount }
          : { ok: false, reason: result.reason };
      });
    };

    refresh();
    ensureObserver('myPageReorder', refresh);
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
      /* 모달 껍데기(.modal)에는 스타일을 주지 않는다. display를 인라인 !important로 고정하면
         아임웹이 팝업을 닫아도 화면에 남아 페이지 조작을 막는다(2026-07-26 고객 문의로 확인). */
      const shell =
        body.closest('.modal-content') ||
        body.closest('.modal-dialog') ||
        body.closest('.modal_wrap') ||
        body.closest('.modal_container') ||
        body.closest('.modal_article');

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

  /* ═══ 브랜드 스토리 피드 (/Brand_story 전용) ═══
     기존 아임웹 빌더 콘텐츠(div[doz_type="section"])를 "윤식단 이야기" 피드로 대체한다.
     - 콘텐츠는 CDN JSON(brand-story-posts.json)에서 로드 — 글 추가 = JSON 수정 + release.sh
     - JSON 로드 실패 시 아무것도 하지 않음(기존 페이지 유지)
     - draft:true 글은 ?story_preview=1 쿼리에서만 노출
     - #글id 해시 직링크 + 뒤로가기 지원 */
  function bindBrandStoryFeed() {
    if (IS_IFRAME) {
      return;
    }
    var path = location.pathname.replace(/\/+$/, '').toLowerCase();
    if (path !== '/brand_story') {
      return;
    }

    var FEED_URL = 'https://2019yundiet-cloud.github.io/yundiet-web-assets/brand-story-posts.json?v=' +
      encodeURIComponent(ydStatus.version);
    var PREVIEW = /[?&]story_preview=1/.test(location.search);
    var PAGE_SIZE = 6;

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    fetch(FEED_URL)
      .then(function(r) {
        if (!r.ok) { throw new Error('HTTP ' + r.status); }
        return r.json();
      })
      .then(boot)
      .catch(function(err) {
        ydMark('brandStoryFeed', false, '콘텐츠 로드 실패 — 기존 페이지 유지 (' + (err && err.message) + ')');
      });

    function boot(data) {
      var posts = (data && data.posts || []).filter(function(p) {
        return p && p.id && p.title && (PREVIEW || !p.draft);
      });
      if (!posts.length) {
        ydMark('brandStoryFeed', false, '공개 글 0건 — 기존 페이지 유지');
        return;
      }
      var firstSec = qs('div[doz_type="section"]');
      if (!firstSec || !firstSec.parentNode) {
        ydMark('brandStoryFeed', false, '콘텐츠 섹션 미발견 — 기존 페이지 유지');
        return;
      }
      if (qs('#ys-story-root')) {
        return;
      }

      var cats = ['전체'].concat((data.categories || []).filter(function(c) {
        return c && c !== '전체' && posts.some(function(p) { return p.cat === c; });
      }));
      var postById = {};
      posts.forEach(function(p) { postById[p.id] = p; });

      var state = { cat: '전체', shown: PAGE_SIZE, fromList: false };
      var baseTitle = document.title;

      var root = document.createElement('div');
      root.id = 'ys-story-root';
      root.innerHTML =
        '<div class="ys-story-list">' +
          '<div class="ys-story-wrap">' +
            '<div class="ys-story-head">' +
              '<h1>윤식단 이야기</h1>' +
              '<p>매일 먹는 한 끼를 조금 더 낫게 만드는 일.<br>제품을 개발하고, 만들고, 배송하는 우리의 이야기를 기록합니다.</p>' +
            '</div>' +
            '<div class="ys-story-filters"></div>' +
            '<div class="ys-story-grid"></div>' +
            '<div class="ys-story-empty" style="display:none">이 카테고리의 글이 아직 없습니다.</div>' +
            '<button type="button" class="ys-story-more">더 보기</button>' +
          '</div>' +
        '</div>' +
        '<div class="ys-story-article" style="display:none">' +
          '<div class="ys-story-article-inner">' +
            '<button type="button" class="ys-story-back">← 목록으로</button>' +
            '<div class="ys-story-article-content"></div>' +
          '</div>' +
        '</div>';

      /* 헤더가 fixed/absolute면 본문이 밑으로 파고들지 않게 패딩 확보 */
      var headerWrap = qs('#doz_header_wrap');
      if (headerWrap) {
        var hPos = getComputedStyle(headerWrap).position;
        if (hPos === 'fixed' || hPos === 'absolute') {
          root.style.paddingTop = headerWrap.offsetHeight + 'px';
        }
      }

      firstSec.parentNode.insertBefore(root, firstSec);

      /* 모바일 하단 탭(홈/쇼핑/브랜드/커뮤니티/마이페이지)은 섹션 숨김에서 제외 —
         ys-story-mode 부여 전에 data-yd-keep-section 표식을 단다.
         ⚠ 페이지마다 섹션 id가 다르고(홈 s2024..., 이 페이지 s2025...),
         position:fixed는 아임웹 JS가 로드 후/스크롤 시 인라인으로 부여해 부팅 시점엔
         relative일 수 있다(실측) → 내용 기반 판별: 탭 내비 링크(/main + /shop_all) 보유 섹션. */
      var keptTabHeight = 0;
      qsa('div[doz_type="section"]').forEach(function(sec) {
        var hrefs = qsa('a[href]', sec).map(function(a) { return a.getAttribute('href'); });
        var isTabNav = hrefs.indexOf('/main') !== -1 && hrefs.indexOf('/shop_all') !== -1;
        if (!isTabNav && getComputedStyle(sec).position !== 'fixed') { return; }
        if (/곡물볶음밥은 그런 부담|TASTING NOTE/.test(sec.textContent || '')) { return; }
        sec.setAttribute('data-yd-keep-section', '');
        keptTabHeight = Math.max(keptTabHeight, Math.ceil(sec.getBoundingClientRect().height) || 70);
      });
      if (keptTabHeight) {
        /* 고정 탭이 피드 하단을 가리지 않게 여백 확보 */
        root.style.paddingBottom = (keptTabHeight + 24) + 'px';
      }

      document.documentElement.classList.add('ys-story-mode');

      /* 과거 별도 경로로 심긴 codex-brand-* 커스텀 블록 숨김.
         블록 자체 CSS의 #id{display:block!important}(ID 특이도)를 확실히 이기도록
         인라인 style !important로 강제한다. 늦게 주입될 수 있어 재적용 2회. */
      function hideLegacyBlocks() {
        var legacy = document.querySelectorAll(
          '[id^="codex-brand"], body > [class^="codex-brand"], body > [class*=" codex-brand"]');
        for (var li = 0; li < legacy.length; li++) {
          if (!root.contains(legacy[li])) {
            legacy[li].style.setProperty('display', 'none', 'important');
          }
        }
      }
      hideLegacyBlocks();
      setTimeout(hideLegacyBlocks, 1000);
      setTimeout(hideLegacyBlocks, 3000);

      var listView = qs('.ys-story-list', root);
      var articleView = qs('.ys-story-article', root);
      var filtersEl = qs('.ys-story-filters', root);
      var gridEl = qs('.ys-story-grid', root);
      var emptyEl = qs('.ys-story-empty', root);
      var moreBtn = qs('.ys-story-more', root);
      var articleContent = qs('.ys-story-article-content', root);

      function filtered() {
        return state.cat === '전체' ? posts : posts.filter(function(p) { return p.cat === state.cat; });
      }

      function renderFilters() {
        filtersEl.innerHTML = cats.map(function(c) {
          return '<button type="button" class="ys-story-chip' + (c === state.cat ? ' is-on' : '') +
            '" data-ys-cat="' + esc(c) + '">' + esc(c) + '</button>';
        }).join('');
      }

      function renderGrid() {
        var list = filtered();
        var slice = list.slice(0, state.shown);
        gridEl.innerHTML = slice.map(function(p) {
          return '<a class="ys-story-card" href="#' + esc(p.id) + '" data-ys-post="' + esc(p.id) + '">' +
            '<div class="ys-story-thumb">' +
              '<span class="ys-story-badge' + (p.draft ? ' is-draft' : '') + '">' +
                esc(p.draft ? '초안 · ' + p.cat : p.cat) + '</span>' +
              '<img src="' + esc(p.img) + '" alt="" loading="lazy">' +
            '</div>' +
            '<div class="ys-story-card-body">' +
              '<h3>' + esc(p.title) + '</h3>' +
              '<div class="ys-story-card-meta">' + esc(p.date || '') + '</div>' +
            '</div>' +
          '</a>';
        }).join('');
        emptyEl.style.display = list.length ? 'none' : 'block';
        moreBtn.style.display = list.length > state.shown ? 'block' : 'none';
      }

      function showList() {
        articleView.style.display = 'none';
        listView.style.display = 'block';
        document.title = baseTitle;
        window.scrollTo(0, 0);
      }

      function renderArticle(id) {
        var p = postById[id];
        if (!p) {
          showList();
          return;
        }
        var body = p.body ||
          '<div class="ys-story-draft-note">✏️ 아직 본문이 등록되지 않은 초안입니다 — 발행 전 미리보기 화면입니다.</div>';
        articleContent.innerHTML =
          '<div class="ys-story-ahead">' +
            '<div class="ys-story-acat">' + esc(p.cat) + '</div>' +
            '<h1>' + esc(p.title) + '</h1>' +
            '<div class="ys-story-ameta">' + esc(p.date || '') + ' · ' + esc(p.author || '윤식단 팀') + '</div>' +
          '</div>' +
          '<div class="ys-story-hero"><img src="' + esc(p.img) + '" alt=""></div>' +
          '<div class="ys-story-abody">' + body + '</div>' +
          '<div class="ys-story-afoot">' +
            '<button type="button" class="ys-story-back" style="margin:0">← 목록으로</button>' +
            '<button type="button" class="ys-story-copy">🔗 링크 복사</button>' +
          '</div>';
        enhanceZoomables();
        listView.style.display = 'none';
        articleView.style.display = 'block';
        document.title = p.title + ' — 윤식단 이야기';
        window.scrollTo(0, 0);
      }

      function currentHashId() {
        var h = location.hash.replace(/^#/, '');
        return h && postById[h] ? h : '';
      }

      function route() {
        if (lbState.open) {
          closeLightbox(true);
        }
        var id = currentHashId();
        if (id) {
          renderArticle(id);
        } else {
          showList();
        }
      }

      /* ── 본문 이미지 라이트박스 ──
         탭/클릭 → 전체 화면 오버레이. 핀치줌·팬·더블탭(모바일), 휠줌·드래그·더블클릭(PC).
         닫기 3경로: X 버튼 · 배경 탭 · 브라우저 뒤로가기.
         히스토리: 열 때 같은 URL로 pushState({ysLb:1}) 1건 추가 → 뒤로가기 popstate가
         라이트박스만 닫고 해시(#글id)는 유지 = 글 상세가 목록으로 튕기지 않는다.
         X/배경 닫기는 history.back()으로 그 엔트리를 소비해 히스토리 오염 방지. */
      var ZOOM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20.5 20.5l-4.2-4.2M11 8.2v5.6M8.2 11h5.6"></path></svg>';
      var lb = null;
      var lbImg = null;
      var lbStage = null;
      var lbState = { open: false, armed: false, s: 1, tx: 0, ty: 0 };

      function enhanceZoomables() {
        qsa('img', articleContent).forEach(function(img) {
          if (img.closest && img.closest('.ys-story-zoomwrap')) { return; }
          var wrap = document.createElement('span');
          wrap.className = 'ys-story-zoomwrap';
          img.parentNode.insertBefore(wrap, img);
          wrap.appendChild(img);
          var hint = document.createElement('span');
          hint.className = 'ys-story-zoom-hint';
          hint.innerHTML = ZOOM_ICON;
          wrap.appendChild(hint);
        });
      }

      function lbApply() {
        lbImg.style.transform = 'translate(' + lbState.tx + 'px,' + lbState.ty + 'px) scale(' + lbState.s + ')';
      }

      function lbClampPan() {
        var stage = lbStage.getBoundingClientRect();
        var w = lbImg.offsetWidth * lbState.s;
        var h = lbImg.offsetHeight * lbState.s;
        var maxX = Math.max(0, (w - stage.width) / 2);
        var maxY = Math.max(0, (h - stage.height) / 2);
        lbState.tx = Math.min(maxX, Math.max(-maxX, lbState.tx));
        lbState.ty = Math.min(maxY, Math.max(-maxY, lbState.ty));
      }

      function lbReset() {
        lbState.s = 1;
        lbState.tx = 0;
        lbState.ty = 0;
        lbApply();
      }

      function stageCenterXY(clientX, clientY) {
        var r = lbStage.getBoundingClientRect();
        return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
      }

      function lbZoomAt(x, y, targetScale) {
        /* stage 중심 기준 좌표(x,y)를 고정점으로 스케일 변경 (translate→scale 순서 전제) */
        var ratio = targetScale / lbState.s;
        lbState.tx = x - (x - lbState.tx) * ratio;
        lbState.ty = y - (y - lbState.ty) * ratio;
        lbState.s = targetScale;
        lbClampPan();
        lbApply();
      }

      function ensureLightbox() {
        if (lb) { return; }
        lb = document.createElement('div');
        lb.className = 'ys-story-lb';
        lb.setAttribute('role', 'dialog');
        lb.setAttribute('aria-modal', 'true');
        lb.innerHTML =
          '<div class="ys-story-lb-stage"><img alt=""></div>' +
          '<button type="button" class="ys-story-lb-close" aria-label="닫기">✕</button>' +
          '<div class="ys-story-lb-tip">핀치 · 더블탭으로 확대할 수 있어요</div>';
        document.body.appendChild(lb);
        lbStage = qs('.ys-story-lb-stage', lb);
        lbImg = qs('img', lbStage);
        qs('.ys-story-lb-close', lb).addEventListener('click', function() { closeLightbox(false); });
        lbStage.addEventListener('click', function(e) {
          if (e.target === lbStage) { closeLightbox(false); }
        });
        bindLbGestures();
      }

      function openLightbox(src, alt) {
        ensureLightbox();
        lbImg.src = src;
        lbImg.alt = alt || '';
        lb.classList.remove('is-used');
        lbReset();
        lb.classList.add('is-open');
        lbState.open = true;
        lockBodyScroll();
        try {
          history.pushState({ ysLb: 1 }, '', location.href);
          lbState.armed = true;
        } catch (err) {
          lbState.armed = false;
        }
      }

      function closeLightbox(viaHistory) {
        if (!lbState.open) { return; }
        lbState.open = false;
        lb.classList.remove('is-open');
        unlockBodyScroll();
        if (!viaHistory && lbState.armed) {
          lbState.armed = false;
          try { history.back(); } catch (err) {}
          return;
        }
        lbState.armed = false;
      }

      window.addEventListener('popstate', function() {
        if (lbState.open) { closeLightbox(true); }
      });

      document.addEventListener('keydown', function(e) {
        if (lbState.open && (e.key === 'Escape' || e.key === 'Esc')) { closeLightbox(false); }
      });

      function bindLbGestures() {
        var MAX_S = 5;
        var g = { mode: '', dist: 1, s0: 1, tx0: 0, ty0: 0, mx0: 0, my0: 0, moved: false, lastTap: 0, tapX: 0, tapY: 0 };

        function touchMid(t) {
          if (t.length >= 2) {
            return stageCenterXY((t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2);
          }
          return stageCenterXY(t[0].clientX, t[0].clientY);
        }
        function touchDist(t) {
          var dx = t[0].clientX - t[1].clientX;
          var dy = t[0].clientY - t[1].clientY;
          return Math.sqrt(dx * dx + dy * dy) || 1;
        }
        function markUsed() {
          if (lb) { lb.classList.add('is-used'); }
        }
        function rebase(m) {
          g.s0 = lbState.s; g.tx0 = lbState.tx; g.ty0 = lbState.ty;
          g.mx0 = m.x; g.my0 = m.y;
        }

        lbStage.addEventListener('touchstart', function(e) {
          if (!lbState.open) { return; }
          var t = e.touches;
          g.moved = false;
          rebase(touchMid(t));
          if (t.length === 2) {
            g.mode = 'pinch';
            g.dist = touchDist(t);
            e.preventDefault();
          } else {
            g.mode = lbState.s > 1 ? 'pan' : 'tap';
          }
        }, { passive: false });

        lbStage.addEventListener('touchmove', function(e) {
          if (!lbState.open) { return; }
          var t = e.touches;
          var m = touchMid(t);
          if (Math.abs(m.x - g.mx0) > 6 || Math.abs(m.y - g.my0) > 6) { g.moved = true; }
          if (t.length >= 2 && g.mode !== 'pinch') {
            g.mode = 'pinch';
            g.dist = touchDist(t);
            rebase(m);
          }
          if (g.mode === 'pinch' && t.length >= 2) {
            e.preventDefault();
            markUsed();
            var s = Math.min(MAX_S, Math.max(1, g.s0 * touchDist(t) / g.dist));
            var ratio = s / g.s0;
            lbState.s = s;
            lbState.tx = m.x - (g.mx0 - g.tx0) * ratio;
            lbState.ty = m.y - (g.my0 - g.ty0) * ratio;
            lbClampPan();
            lbApply();
          } else if (g.mode === 'pan' && t.length === 1) {
            e.preventDefault();
            lbState.tx = g.tx0 + (m.x - g.mx0);
            lbState.ty = g.ty0 + (m.y - g.my0);
            lbClampPan();
            lbApply();
          }
        }, { passive: false });

        lbStage.addEventListener('touchend', function(e) {
          if (!lbState.open) { return; }
          if (e.touches.length) {
            /* 핀치 → 한 손가락만 남음: 팬으로 전환, 기준점 재설정 */
            g.mode = lbState.s > 1 ? 'pan' : 'tap';
            rebase(touchMid(e.touches));
            return;
          }
          if (lbState.s < 1.04) { lbReset(); }
          if (g.mode === 'pinch' || g.moved) { g.mode = ''; return; }
          var ct = e.changedTouches && e.changedTouches[0];
          if (!ct) { g.mode = ''; return; }
          var p = stageCenterXY(ct.clientX, ct.clientY);
          var now = Date.now();
          if (now - g.lastTap < 320 && Math.abs(p.x - g.tapX) < 44 && Math.abs(p.y - g.tapY) < 44) {
            /* 더블탭: 1배 ↔ 2.5배 토글 */
            e.preventDefault();
            markUsed();
            g.lastTap = 0;
            if (lbState.s > 1.04) { lbReset(); } else { lbZoomAt(p.x, p.y, 2.5); }
          } else {
            g.lastTap = now; g.tapX = p.x; g.tapY = p.y;
          }
          g.mode = '';
        }, { passive: false });

        /* 데스크톱: 더블클릭 줌 토글 + 휠 줌 + 드래그 팬 */
        lbStage.addEventListener('dblclick', function(e) {
          e.preventDefault();
          markUsed();
          var p = stageCenterXY(e.clientX, e.clientY);
          if (lbState.s > 1.04) { lbReset(); } else { lbZoomAt(p.x, p.y, 2.5); }
        });
        lbStage.addEventListener('wheel', function(e) {
          e.preventDefault();
          markUsed();
          var p = stageCenterXY(e.clientX, e.clientY);
          var s = Math.min(MAX_S, Math.max(1, lbState.s * (e.deltaY < 0 ? 1.18 : 1 / 1.18)));
          lbZoomAt(p.x, p.y, s);
        }, { passive: false });
        var drag = null;
        lbStage.addEventListener('mousedown', function(e) {
          if (lbState.s <= 1) { return; }
          e.preventDefault();
          drag = { x: e.clientX, y: e.clientY, tx: lbState.tx, ty: lbState.ty };
        });
        window.addEventListener('mousemove', function(e) {
          if (!drag || !lbState.open) { return; }
          lbState.tx = drag.tx + (e.clientX - drag.x);
          lbState.ty = drag.ty + (e.clientY - drag.y);
          lbClampPan();
          lbApply();
        });
        window.addEventListener('mouseup', function() { drag = null; });
      }

      function goBackToList() {
        if (state.fromList) {
          state.fromList = false;
          history.back();
          return;
        }
        try {
          history.replaceState(null, '', location.pathname + location.search);
        } catch (err) {}
        showList();
      }

      root.addEventListener('click', function(e) {
        var zoomwrap = e.target.closest ? e.target.closest('.ys-story-zoomwrap') : null;
        if (zoomwrap && root.contains(zoomwrap)) {
          e.preventDefault();
          var zi = qs('img', zoomwrap);
          if (zi && (zi.currentSrc || zi.src)) {
            openLightbox(zi.currentSrc || zi.src, zi.alt);
          }
          return;
        }
        var chip = e.target.closest ? e.target.closest('.ys-story-chip') : null;
        if (chip && root.contains(chip)) {
          state.cat = chip.getAttribute('data-ys-cat') || '전체';
          state.shown = PAGE_SIZE;
          renderFilters();
          renderGrid();
          return;
        }
        var card = e.target.closest ? e.target.closest('.ys-story-card') : null;
        if (card && root.contains(card)) {
          e.preventDefault();
          state.fromList = true;
          location.hash = card.getAttribute('data-ys-post');
          return;
        }
        if (e.target.closest && e.target.closest('.ys-story-back')) {
          goBackToList();
          return;
        }
        var copyBtn = e.target.closest ? e.target.closest('.ys-story-copy') : null;
        if (copyBtn) {
          var url = location.href;
          var done = function() {
            copyBtn.textContent = '✅ 복사됨!';
            window.setTimeout(function() { copyBtn.textContent = '🔗 링크 복사'; }, 1800);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done, function() { window.prompt('링크를 복사하세요', url); });
          } else {
            window.prompt('링크를 복사하세요', url);
          }
        }
      });

      moreBtn.addEventListener('click', function() {
        state.shown += PAGE_SIZE;
        renderGrid();
      });

      window.addEventListener('hashchange', route);

      renderFilters();
      renderGrid();
      route();

      ydMark('brandStoryFeed', true,
        '글 ' + posts.length + '건 렌더 + 이미지 라이트박스' + (PREVIEW ? ' (미리보기 모드: 초안 포함)' : ' (공개 글만)'));
    }
  }

  /* ═══ 비회원 장바구니 주문하기 버튼 (구 카카오 배너 자리) ═══ */
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
      /* 2026-08-27 폐기: 비회원 카트 주문 진입은 듀얼 주문바(#yd-guest-orderbar)가 전담.
         이 배너(7/21 제작)는 중복 표면이라 생성 중단 — 잔존분만 제거한다. */
      const existing = qs('#agp-persistent-banner');
      if (existing) existing.remove();
      ydMark('cartKakaoBanner', true, '듀얼 주문바로 대체 — 배너 비활성');
      if (true) return;

      if (existing) {
        return;
      }

      /* 소유자 지시(2026-07-21): 카카오 배너 → 주문하기 버튼.
         클릭 시 네이티브 주문 흐름을 태워 imweb이 회원가입/로그인 → 결제로 안내한다 */
      const banner = document.createElement('div');
      banner.id = 'agp-persistent-banner';
      banner.style.cssText = [
        'position:fixed',
        'bottom:95px',
        'left:5%',
        'width:90%',
        'height:47px',
        'z-index:10001',
        'background-color:#3b4024',
        'border-radius:15px',
        'box-shadow:0 2px 10px rgba(0,0,0,0.22)',
        'overflow:hidden',
        'display:flex',
        'align-items:center',
        'justify-content:center'
      ].join(';');

      const anchor = document.createElement('a');
      anchor.href = '/shop_payment';
      anchor.style.cssText = [
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'width:100%',
        'height:100%',
        'text-decoration:none',
        'color:#fff',
        'font-weight:800',
        'font-size:16px',
        'letter-spacing:-0.02em'
      ].join(';');
      anchor.textContent = '주문하기';
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        var native = Array.prototype.slice.call(document.querySelectorAll('button')).filter(function(b) {
          return /^주문하기/.test((b.textContent || '').trim());
        })[0];
        if (native) { native.click(); return; }
        window.location.href = '/shop_payment';
      });

      banner.appendChild(anchor);
      document.body.appendChild(banner);
    }

    renderBanner();
    ensureObserver('cartKakaoBanner', renderBanner);
  }

  /* ═══ 비회원 바로결제 → 카카오 간편로그인 직행 (2026-08-26 소유자 지시) ═══
     옵션시트에서 비회원이 [카카오 3초 로그인 후 바로 결제]를 누르면 sessionStorage에
     yd_kakao_direct 마커(10분 유효)가 남는다. imweb이 로그인/가입선택 페이지로 보내면
     여기서 마커를 소비해 네이티브 카카오 로그인 버튼(#custom-login-btn)을 1회 자동 클릭한다.
     - 버튼 href의 OAuth 파라미터(state·redirect_uri)는 서버 생성 원본을 그대로 사용(직접 조립 금지)
     - 마커 없으면 아무것도 하지 않음: 일반 로그인 UX 불변. 버튼을 못 찾으면 조용히 포기(기존 벽 유지) */
  function bindGuestKakaoDirectLogin() {
    var path = window.location.pathname || '';
    if (!/^\/login\/?$/.test(path) && !/^\/site_join_type_choice\/?$/.test(path)) return;
    var raw = null;
    try { raw = window.localStorage.getItem('yd_kakao_direct'); } catch (err) {}
    if (!raw) { ydMark('guestKakaoDirect', true, '마커 없음(일반 로그인 화면 유지)'); return; }
    var age = Date.now() - Number(raw);
    if (!(age >= 0 && age < 10 * 60 * 1000)) {
      try { window.localStorage.removeItem('yd_kakao_direct'); } catch (err) {}
      ydMark('guestKakaoDirect', true, '마커 만료 폐기');
      return;
    }
    var clicked = false;
    var started = Date.now();
    var tryClick = function() {
      if (clicked) return;
      var btn = qs('#custom-login-btn') || qs('a.btn-kakao');
      if (btn && btn.offsetParent !== null && /kauth\.kakao\.com/.test(btn.href || '')) {
        clicked = true;
        try { window.localStorage.removeItem('yd_kakao_direct'); } catch (err) {}
        ydMark('guestKakaoDirect', true, '카카오 간편로그인 자동 진입');
        /* 게스트 장바구니 스냅샷(이관용)이 진행 중이면 완료를 기다렸다 출발 (최대 1.5초) */
        var go = function() { btn.click(); };
        var ready = window.__ydCarryReady;
        if (ready && typeof ready.then === 'function') {
          var gone = false;
          var fuse = window.setTimeout(function() { if (!gone) { gone = true; go(); } }, 1500);
          ready.then(function() { if (!gone) { gone = true; window.clearTimeout(fuse); go(); } },
                     function() { if (!gone) { gone = true; window.clearTimeout(fuse); go(); } });
        } else { go(); }
        return;
      }
      if (Date.now() - started < 6000) { window.setTimeout(tryClick, 250); return; }
      try { window.localStorage.removeItem('yd_kakao_direct'); } catch (err) {}
      ydMark('guestKakaoDirect', false, '카카오 버튼 미발견 — 일반 로그인 화면 유지');
    };
    tryClick();
  }

  /* ═══ 친구추가-첫구매 다운로드 쿠폰 노출 숨김 ═══
     B안 문구의 실제 혜택은 회원가입 후 자동발행되는 가입쿠폰 5종이다.
     중복 혜택인 과거 친구추가 다운로드 쿠폰 5종은 쿠폰함·다운로드 모달에서 숨긴다.
     기발급 쿠폰 사용은 영향 없음(장바구니 적용 UI는 보유 쿠폰 기준). */
  function bindFriendPackCouponHide() {
    var HIDE_TEXT = '친구추가-첫구매';
    function sweep() {
      var hidden = 0;
      qsa('.mypage-coupon-wrap').forEach(function(card) {
        if ((card.textContent || '').indexOf(HIDE_TEXT) === -1) return;
        if (card.style.display !== 'none') { card.style.display = 'none'; }
        hidden++;
      });
      qsa('button._down_coupon_btn').forEach(function(btn) {
        var card = btn.closest('.mypage-coupon-wrap, li, [class*="coupon"]') || btn.parentElement;
        if (!card) return;
        if ((card.textContent || '').indexOf(HIDE_TEXT) === -1) return;
        if (card.style.display !== 'none') { card.style.display = 'none'; }
        hidden++;
      });
      ydMark('friendPackCouponHide', true, hidden ? ('숨김 ' + hidden + '개') : '노출 없음');
    }
    sweep();
    ensureObserver('friendPackCouponHide', sweep);
  }

  /* ═══ 가입쿠폰 결제 재개 (2026-08-26) ═══
     [3초 회원가입쿠폰] → 카카오 가입/로그인 → 복귀(홈 등) 시, 회원 상태가 확인되면
     yd_pay_resume 마커(10분 유효)를 소비하고 장바구니 자동결제(yd_autopay)로 이어간다.
     비회원 상태(로그인 미완)에서는 절대 발화하지 않고, 로그인/가입/OAuth 페이지에서는 대기한다. */
  function bindSignupPayResume() {
    var path = window.location.pathname || '';
    if (/^\/login|^\/site_join|^\/oauth/.test(path)) return;
    if (/yd_autopay=1/.test(window.location.search)) return;
    if (/^\/shop_cart/.test(path)) {
      /* back_url 관통으로 홈 경유 없이 장바구니에 직행하는 경로(2026-08-28) —
         마커가 살아있고 회원이면 가입 보상 토스트 마커를 여기서 심는다(기존 홈 경유 UX 보존) */
      try {
        var cartRaw = window.localStorage.getItem('yd_pay_resume');
        var cartAge = cartRaw ? Date.now() - Number(cartRaw) : -1;
        if (cartRaw && cartAge >= 0 && cartAge < 10 * 60 * 1000 && !isGuestUser()) {
          window.localStorage.setItem('yd_pop_signup_welcome', String(Date.now()));
          window.localStorage.setItem('yd_new_member_session', String(Date.now()));
          ydTrace('장바구니 직행 도착 — 가입 보상 토스트 마커 심기');
        }
        window.localStorage.removeItem('yd_pay_resume');
      } catch (err) {}
      return;
    }
    var raw = null;
    try { raw = window.localStorage.getItem('yd_pay_resume'); } catch (err) {}
    if (!raw) return;
    var age = Date.now() - Number(raw);
    if (!(age >= 0 && age < 10 * 60 * 1000)) {
      try { window.localStorage.removeItem('yd_pay_resume'); } catch (err) {}
      return;
    }
    /* 소유자 지시(2026-08-26 2차): 가입/로그인 완료 후에는 결제 자동 진행이 아니라
       장바구니에 랜딩시켜 담은 상품·지급된 쿠폰을 확인하고 직접 주문하게 한다 */
    var resumeToCart = function() {
      try { window.localStorage.removeItem('yd_pay_resume'); } catch (err) {}
      ydMark('signupPayResume', true, '가입/로그인 확인 — 장바구니 랜딩');
      ydTrace('가입쿠폰 재개 — 장바구니로 이동');
      /* 장바구니 도착 시 가입 보상 토스트(#7)를 띄우도록 마커를 남긴다 */
      try {
        window.localStorage.setItem('yd_pop_signup_welcome', String(Date.now()));
        window.localStorage.setItem('yd_new_member_session', String(Date.now()));
      } catch (err) {}
      try { (window.top || window).location.href = '/shop_cart'; }
      catch (err) { window.location.href = '/shop_cart'; }
    };
    if (!isGuestUser()) { resumeToCart(); return; }
    /* OAuth 직후 세션/헤더가 늦게 회원으로 바뀌는 경우 — 20초간 관찰 후 전환 시 재개 (2026-08-28) */
    ydMark('signupPayResume', true, '비회원 상태 — 재개 대기(20초 관찰)');
    ydTrace('가입쿠폰 재개 대기(비회원 판정) — 회원 전환 관찰 시작');
    var payBegan = Date.now();
    var payWatch = window.setInterval(function() {
      if (!isGuestUser()) { window.clearInterval(payWatch); resumeToCart(); return; }
      if (Date.now() - payBegan > 20000) { window.clearInterval(payWatch); ydTrace('가입쿠폰 재개 — 회원 전환 미발생, 관찰 종료'); }
    }, 500);
  }

  /* ═══ 도매몰 가입/로그인 후 원위치 복귀 (2026-08-28 소유자 지시) ═══
     증상: 도매몰에서 회원가입하면 홈으로 떨어져 도매몰로 못 돌아감(back_url 유실 경로).
     1차: 도매몰 페이지의 로그인/가입 링크 중 back_url이 없는 것에 imweb 표준
          back_url=<b64 현재주소>를 주입해 네이티브 자동 복귀를 살린다.
     2차 안전망: 도매몰 비회원이 로그인/가입 링크를 누르는 순간 복귀 마커(10분)를 남기고,
          카카오싱크 등으로 back_url이 유실돼 홈에 떨어지면 회원 확인 후 도매몰 원위치로 1회 복귀.
          (yd_pay_resume과 동일 패턴 — 로그인/가입/OAuth 페이지에서는 대기, 소비는 홈에서만) */
  /* 여정 추적: 도매몰 복귀 진단용 브레드크럼(최근 60건 유지).
     폰에서 아무 페이지나 주소 뒤에 ?yd_trace 를 붙이면 여정 오버레이가 뜬다. */
  function ydTrace(step) {
    try {
      var buf = [];
      try { buf = JSON.parse(window.localStorage.getItem('yd_trace') || '[]'); } catch (e2) { buf = []; }
      buf.push({
        t: Date.now(),
        p: (window.location.pathname + window.location.search).slice(0, 80),
        g: isGuestUser() ? 1 : 0,
        s: String(step).slice(0, 90)
      });
      if (buf.length > 60) { buf = buf.slice(buf.length - 60); }
      window.localStorage.setItem('yd_trace', JSON.stringify(buf));
    } catch (err) {}
  }
  function bindTraceOverlay() {
    if (!/[?&#]yd_trace/.test(window.location.search + window.location.hash)) { return; }
    var buf = [];
    try { buf = JSON.parse(window.localStorage.getItem('yd_trace') || '[]'); } catch (err) {}
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;max-height:70vh;overflow:auto;z-index:2147483000;background:rgba(12,16,12,.96);color:#d7f36e;font:11px/1.5 ui-monospace,monospace;padding:12px;border-radius:12px;white-space:pre-wrap;word-break:break-all;';
    var lines = buf.map(function(b) {
      var d = new Date(b.t);
      var hh = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
      return hh + (b.g ? ' [게스트] ' : ' [회원] ') + b.p + '\n  → ' + b.s;
    });
    box.textContent = 'YD 여정 추적 (v' + ydStatus.version + ') — 최근 ' + buf.length + '건\n\n' + (lines.join('\n') || '기록 없음');
    var x = document.createElement('button');
    x.textContent = '닫기';
    x.style.cssText = 'position:sticky;top:0;float:right;background:#d7f36e;color:#111;border:0;border-radius:8px;padding:4px 10px;font-weight:800;';
    x.onclick = function() { box.remove(); };
    box.insertBefore(x, box.firstChild);
    document.body.appendChild(box);
  }

  function bindWholesaleReturn() {
    var KEY = 'yd_wholesale_return';
    var TTL = 10 * 60 * 1000;
    var path = window.location.pathname || '';
    if (isWholesalePage()) {
      /* 도매몰 도착 = 복귀 여정 종료. 마커 정리 */
      try { window.localStorage.removeItem(KEY); } catch (err) {}
      /* 1차: back_url 없는 로그인/가입 링크에 현재 주소 주입 (지연 렌더 대비 스윕) */
      var here = window.location.pathname + window.location.search;
      var b64 = null;
      try { b64 = encodeURIComponent(window.btoa(here)); } catch (err) {}
      function sweepLinks() {
        if (!b64) { return; }
        var patched = 0;
        qsa('a[href^="/login"], a[href^="/site_join"]').forEach(function(a) {
          var href = a.getAttribute('href') || '';
          if (href.indexOf('back_url=') !== -1) { return; }
          a.setAttribute('href', href + (href.indexOf('?') === -1 ? '?' : '&') + 'back_url=' + b64);
          patched++;
        });
        if (patched) { ydMark('wholesaleReturn', true, 'back_url 주입 ' + patched + '건'); }
      }
      sweepLinks();
      ensureObserver('wholesaleReturnLinks', sweepLinks);
      /* 2차: 비회원이 로그인/가입 링크 클릭 시 복귀 마커 저장 (캡처 단계 — 이탈 전 기록) */
      document.addEventListener('click', function(e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href*="/login"], a[href*="/site_join"]') : null;
        if (!a || !isGuestUser()) { return; }
        try {
          window.localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), to: window.location.pathname + window.location.search }));
        } catch (err) {}
        ydTrace('도매몰에서 로그인/가입 클릭 — 마커 저장: ' + (a.getAttribute('href') || '').slice(0, 60));
      }, true);
      ydMark('wholesaleReturn', true, isGuestUser() ? '도매몰 비회원 — 복귀 마커 대기' : '도매몰 회원 도착');
      ydTrace(isGuestUser() ? '도매몰 도착(비회원)' : '도매몰 도착(회원) — 복귀 여정 종료');
      return;
    }
    /* 가입/로그인/OAuth 진행 중: back_url이 도매몰이면 이 자리에서 마커를 심는다.
       카카오 간편로그인 등 OAuth 왕복에서 back_url이 유실돼도, 로그인 페이지가 뜬
       바로 이 origin의 localStorage에 복귀 지점이 남아 홈 낙하 시 복귀된다.
       (도매몰→로그인 진입이 도메인을 넘어도 back_url은 서버 링크로 전달되므로 여기서 회수됨) */
    if (/^\/login|^\/site_join|^\/oauth/.test(path)) {
      try {
        var m = /[?&]back_url=([^&]+)/.exec(window.location.search || '');
        if (m) {
          var decoded = window.atob(decodeURIComponent(m[1]));
          if (decoded.indexOf('/wholesale') === 0) {
            window.localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), to: decoded }));
            ydMark('wholesaleReturn', true, '로그인/가입 페이지 — back_url 회수·마커 갱신');
            ydTrace('로그인/가입 페이지 — back_url 회수: ' + decoded.slice(0, 50));
          }
        } else {
          ydTrace('로그인/가입 페이지 — back_url 없음');
        }
      } catch (err) {}
      return;
    }
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (err) {}
    if (!raw) { return; }
    var data = null;
    try { data = JSON.parse(raw); } catch (err) {}
    var t = data && Number(data.t);
    if (!(t > 0 && Date.now() - t >= 0 && Date.now() - t < TTL)) {
      try { window.localStorage.removeItem(KEY); } catch (err) {}
      ydMark('wholesaleReturn', true, '마커 만료 폐기');
      ydTrace('복귀 마커 만료 폐기');
      return;
    }
    /* 소비는 홈에서만: 가입/로그인 완료 후 홈으로 떨어진 바로 그 증상만 교정.
       다른 페이지는 사용자가 의도한 이동일 수 있어 대기만 한다(TTL로 자연 소멸). */
    if (!isHomePage()) { ydMark('wholesaleReturn', true, '홈 아님 — 복귀 대기'); ydTrace('마커 있음·홈 아님 — 대기'); return; }
    var goWholesale = function() {
      /* 다른 복귀 장치(가입쿠폰 결제 재개·부스터 쿠폰 랜딩)가 뒤에서 행선지를 덮어쓰지 않도록 선제 정리 */
      try { window.localStorage.removeItem(KEY); } catch (err) {}
      try { window.localStorage.removeItem('yd_pay_resume'); } catch (err) {}
      try { window.localStorage.removeItem('yd_boost_pending'); } catch (err) {}
      var to = (data && typeof data.to === 'string' && data.to.indexOf('/wholesale') === 0) ? data.to : '/wholesale';
      ydMark('wholesaleReturn', true, '가입/로그인 확인 — 도매몰 복귀: ' + to);
      ydTrace('홈 낙하 — 도매몰 복귀 실행: ' + to);
      try { (window.top || window).location.href = to; }
      catch (err) { window.location.href = to; }
    };
    if (!isGuestUser()) { goWholesale(); return; }
    /* OAuth 직후 세션/헤더가 늦게 회원으로 바뀌는 경우 — 20초간 관찰 후 전환 시 복귀 */
    ydMark('wholesaleReturn', true, '비회원 — 로그인 완료 대기(20초 관찰)');
    ydTrace('홈 낙하(비회원 판정) — 회원 전환 관찰 시작');
    var began = Date.now();
    var watch = window.setInterval(function() {
      if (!isGuestUser()) { window.clearInterval(watch); goWholesale(); return; }
      if (Date.now() - began > 20000) { window.clearInterval(watch); ydTrace('회원 전환 미발생 — 관찰 종료'); }
    }, 500);
  }

  /* ═══ 게스트 장바구니 이관 (2026-08-28 소유자 지시) ═══
     증상: 비회원으로 담은 장바구니가 로그인/가입 후 회원 장바구니로 합쳐지지 않음(아임웹 세션 교체).
     장치: 장바구니의 3초가입 클릭 순간(게스트 세션이 확실함)에 먼저 스냅샷,
     로그인/가입/OAuth 페이지에서는 게스트 DOM 마커 없이 스냅샷 유무를 보강한다.
     장바구니를 스냅샷(yd_cart_carry, 15분) → 로그인 완료(명시적 회원 DOM 확인) 후 회원 장바구니와 대조해
     최초 회원 수량 + 게스트 수량을 고정 목표로 저장하고 부족 수량만 add_cart.cm으로 재담기한다.
     POST 후 장바구니 API 재조회에서 모든 상품·옵션의 목표 수량을 확증한 때만 스냅샷을 삭제한다. */
  var CART_CARRY_KEY = 'yd_cart_carry';
  var CART_CARRY_TTL = 15 * 60 * 1000;

  function cartCarryReadFresh() {
    var raw = null;
    try { raw = window.localStorage.getItem(CART_CARRY_KEY); } catch (err) {}
    if (!raw) { return null; }
    var data = null;
    try { data = JSON.parse(raw); } catch (err) {}
    var t = data && Number(data.t);
    if (!(t > 0 && Date.now() - t >= 0 && Date.now() - t < CART_CARRY_TTL && Array.isArray(data.items))) {
      try { window.localStorage.removeItem(CART_CARRY_KEY); } catch (err) {}
      return null;
    }
    return data;
  }

  function cartCarryItems(payload) {
    return (payload && payload.data && payload.data.cart && payload.data.cart.items) || [];
  }

  function cartCarryOptionKey(prodIdx, option) {
    return String(prodIdx || '') + ':' + String(option && option.option_detail_code || option && option.dc || '__base__');
  }

  function cartCarryCount(value) {
    var count = Math.floor(Number(value) || 0);
    return count > 0 ? count : 0;
  }

  function cartCarryBaseCount(item) {
    var direct = cartCarryCount(item && (item.count || item.order_count || item.orderCount || item.quantity || item.product_count));
    if (direct) { return direct; }
    var optionTotal = (item && item.options || []).reduce(function(sum, option) {
      return sum + cartCarryCount(option && (option.count || option.cnt));
    }, 0);
    return optionTotal || 1;
  }

  function cartCarrySnapshotCounts(data) {
    var counts = {};
    (data && data.items || []).forEach(function(item) {
      var options = (item.options || []).filter(function(option) { return !!option.dc; });
      if (options.length) {
        options.forEach(function(option) {
          var key = cartCarryOptionKey(item.prodIdx, option);
          counts[key] = (counts[key] || 0) + (cartCarryCount(option.cnt) || 1);
        });
        return;
      }
      var baseKey = cartCarryOptionKey(item.prodIdx, null);
      counts[baseKey] = (counts[baseKey] || 0) + (cartCarryCount(item.baseCnt) || 1);
    });
    return counts;
  }

  function cartCarryPayloadCounts(payload) {
    var counts = {};
    cartCarryItems(payload).forEach(function(item) {
      var prodIdx = item.product && item.product.prod_idx;
      var options = (item.options || []).filter(function(option) { return !!option.option_detail_code; });
      if (options.length) {
        options.forEach(function(option) {
          var key = cartCarryOptionKey(prodIdx, option);
          counts[key] = (counts[key] || 0) + (cartCarryCount(option.count) || 1);
        });
        return;
      }
      var baseKey = cartCarryOptionKey(prodIdx, null);
      counts[baseKey] = (counts[baseKey] || 0) + cartCarryBaseCount(item);
    });
    return counts;
  }

  function cartCarrySave(data) {
    try { window.localStorage.setItem(CART_CARRY_KEY, JSON.stringify(data)); }
    catch (err) { throw new Error('cart_snapshot_storage_failed'); }
  }

  function cartCarryTargets(data, currentCounts) {
    if (data.targets && typeof data.targets === 'object' && !Array.isArray(data.targets)) {
      return data.targets;
    }
    var guestCounts = cartCarrySnapshotCounts(data);
    var targets = {};
    Object.keys(guestCounts).forEach(function(key) {
      targets[key] = (cartCarryCount(currentCounts[key]) || 0) + guestCounts[key];
    });
    data.targets = targets;
    data.planT = Date.now();
    cartCarrySave(data); /* 목표를 쓰기 전에 고정해야 재시도·새로고침에서 중복 추가되지 않는다. */
    return targets;
  }

  function cartCarryMemberReady() {
    var memberInfo = document.querySelector('.member-info');
    return !!(memberInfo && !memberInfo.classList.contains('guest'));
  }

  function captureGuestCartCarry(forceRefresh) {
    var existing = cartCarryReadFresh();
    if (!forceRefresh && existing && existing.items.length) {
      ydMark('guestCartCarryCapture', true, '이미 저장된 게스트 장바구니 재사용');
      return Promise.resolve(true);
    }
    return fetch('/shop/cart/get_cart_content.cm?cart_type=normal', {
      credentials: 'include', cache: 'no-store'
    }).then(function(r) {
      if (!r.ok) { throw new Error('cart_snapshot_http_' + r.status); }
      return r.json();
    }).then(function(j) {
      var items = cartCarryItems(j);
      if (!items.length) {
        ydTrace('게스트 장바구니 스냅샷 — 담긴 상품 없음');
        ydMark('guestCartCarryCapture', true, '담긴 상품 없음');
        return false;
      }
      var slim = items.map(function(it) {
        var validOptions = (it.options || []).map(function(o) {
          return { dc: o.option_detail_code, req: !!o.required, cnt: cartCarryCount(o.count) || 1,
                   up: o.total_unit_price || o.original_unit_price || 0,
                   oc: o.option_code_list || [], vc: o.value_code_list || [],
                   on: o.option_name_list || [], vn: o.value_name_list || [] };
        }).filter(function(option) { return !!option.dc; });
        return {
          prodIdx: it.product && it.product.prod_idx,
          tpl: (it.shipping_service && it.shipping_service.template_code) || '',
          baseCnt: validOptions.length ? 0 : cartCarryBaseCount(it),
          options: validOptions
        };
      }).filter(function(x) { return x.prodIdx && (x.options.length || x.baseCnt > 0); });
      if (!slim.length) { throw new Error('cart_snapshot_schema_empty'); }
      cartCarrySave({ v: 2, t: Date.now(), items: slim });
      ydTrace('게스트 장바구니 스냅샷 ' + slim.length + '개 상품 — 이관 대기');
      ydMark('guestCartCarryCapture', true, '게스트 장바구니 ' + slim.length + '개 저장');
      return true;
    }).catch(function(err) {
      ydTrace('게스트 장바구니 스냅샷 실패: ' + String(err && err.message || err).slice(0, 60));
      ydMark('guestCartCarryCapture', false, '스냅샷 실패 — 로그인은 진행');
      return false;
    });
  }

  function cartCarryFetch() {
    return fetch('/shop/cart/get_cart_content.cm?cart_type=normal', {
      credentials: 'include', cache: 'no-store'
    }).then(function(r) {
      if (!r.ok) { throw new Error('cart_readback_http_' + r.status); }
      return r.json();
    });
  }

  function cartCarryAddItem(item, missing, baseCount) {
    var body = new URLSearchParams();
    body.set('prodIdx', String(item.prodIdx));
    missing.forEach(function(o, i) {
      var p = 'options[' + i + ']';
      body.set(p + '[idx]', String(i));
      body.set(p + '[option_detail_code]', o.dc);
      (o.oc || []).forEach(function(code, k) {
        var q = p + '[options][' + k + ']';
        body.set(q + '[value_type]', 'SELECT');
        body.set(q + '[option_code]', code);
        body.set(q + '[value_code]', (o.vc || [])[k] || '');
        body.set(q + '[value_name]', (o.vn || [])[k] || '');
        body.set(q + '[option_name]', (o.on || [])[k] || '');
      });
      body.set(p + '[price]', String(o.up || 0));
      body.set(p + '[count]', String(o.cnt || 1));
      body.set(p + '[require]', o.req ? 'true' : 'false');
      body.append(p + '[sku_no][]', '');
      body.set(p + '[use_stock]', 'false');
      body.set(p + '[stock]', '0');
      body.set(p + '[stock_un_limit]', 'false');
      body.set(p + '[option_mix_type]', 'SINGLE');
    });
    body.set('orderCount', String(cartCarryCount(baseCount) || 0));
    body.set('deliv_type', 'parcel');
    body.set('deliv_pay_type', 'price');
    body.set('deliv_country', 'KR');
    body.set('shipping_template_code', item.tpl || '');
    return fetch('/shop/add_cart.cm', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
      body: body.toString()
    }).then(function(r) {
      if (!r.ok) { throw new Error('cart_restore_http_' + r.status); }
      return true;
    });
  }

  function restoreGuestCartCarry(data, attempt) {
    attempt = attempt || 1;
    var guestCounts = cartCarrySnapshotCounts(data);
    if (!Object.keys(guestCounts).length) {
      ydMark('guestCartCarry', false, '이관 스냅샷 형식 오류 — 스냅샷 보존');
      return Promise.resolve(false);
    }
    return cartCarryFetch().then(function(current) {
      var have = cartCarryPayloadCounts(current);
      var targets = cartCarryTargets(data, have);
      var jobs = [];
      (data.items || []).forEach(function(item) {
        var missing = (item.options || []).filter(function(o) { return !!o.dc; }).map(function(o) {
          var key = cartCarryOptionKey(item.prodIdx, o);
          var deficit = Math.max(0, cartCarryCount(targets[key]) - (cartCarryCount(have[key]) || 0));
          if (!deficit) { return null; }
          var copy = Object.assign({}, o);
          copy.cnt = deficit;
          have[key] = (cartCarryCount(have[key]) || 0) + deficit; /* 중복 행이 있어도 한 번만 목표까지 배정 */
          return copy;
        }).filter(function(o) { return !!o; });
        var baseKey = cartCarryOptionKey(item.prodIdx, null);
        var baseMissing = (item.options || []).some(function(o) { return !!o.dc; }) ? 0 :
          Math.max(0, cartCarryCount(targets[baseKey]) - (cartCarryCount(have[baseKey]) || 0));
        if (baseMissing) { have[baseKey] = (cartCarryCount(have[baseKey]) || 0) + baseMissing; }
        if (missing.length || baseMissing) {
          jobs.push(cartCarryAddItem(item, missing, baseMissing));
        }
      });
      return Promise.all(jobs).then(cartCarryFetch).then(function(readback) {
        return { readback: readback, targets: targets };
      });
    }).then(function(result) {
      var verified = cartCarryPayloadCounts(result.readback);
      var missingAfterWrite = Object.keys(result.targets).filter(function(key) {
        return (cartCarryCount(verified[key]) || 0) < cartCarryCount(result.targets[key]);
      });
      if (missingAfterWrite.length) { throw new Error('cart_restore_readback_missing_' + missingAfterWrite.length); }
      try { window.localStorage.removeItem(CART_CARRY_KEY); } catch (err) {}
      ydMark('guestCartCarry', true, '게스트 장바구니 상품·옵션·수량 이관 후 재조회 확인');
      ydTrace('게스트 장바구니 이관 확증 완료 ' + Object.keys(result.targets).length + '개 항목');
      if (/^\/shop_cart/.test(window.location.pathname)) { window.location.reload(); }
      return true;
    }).catch(function(err) {
      if (attempt < 2) {
        return new Promise(function(resolve) { window.setTimeout(resolve, 500); })
          .then(function() { return restoreGuestCartCarry(data, attempt + 1); });
      }
      ydMark('guestCartCarry', false, '이관 재조회 실패 — 스냅샷 보존');
      ydTrace('게스트 장바구니 이관 실패: ' + String(err && err.message || err).slice(0, 60));
      return false;
    });
  }

  function bindGuestCartCarry() {
    if (IS_IFRAME) { return; }
    var path = window.location.pathname || '';
    var restoreStarted = false;
    var restoreWatch = null;
    var beginRestoreWatch = function() {
      var began = Date.now();
      var tryRestore = function() {
        var fresh = cartCarryReadFresh();
        if (!fresh) {
          if (restoreWatch) { window.clearInterval(restoreWatch); }
          return true;
        }
        if (!cartCarryMemberReady()) { return false; }
        if (restoreStarted) { return true; }
        restoreStarted = true;
        if (restoreWatch) { window.clearInterval(restoreWatch); }
        window.__ydCartCarryRestoreReady = restoreGuestCartCarry(fresh, 1);
        return true;
      };
      if (tryRestore()) { return; }
      restoreWatch = window.setInterval(function() {
        if (tryRestore()) { return; }
        if (Date.now() - began >= 60000) {
          window.clearInterval(restoreWatch);
          ydMark('guestCartCarry', false, '회원 전환 미확인 — 스냅샷 보존');
        }
      }, 500);
      window.__ydCartCarryRestoreWatch = restoreWatch;
    };
    if (/^\/login|^\/site_join|^\/oauth/.test(path)) {
      /* 로그인 페이지에는 .member-info.guest가 없을 수 있으므로 DOM 게스트 판정으로 조기 종료하지 않는다. */
      window.__ydCarryReady = captureGuestCartCarry();
      window.__ydCarryReady.then(beginRestoreWatch);
      return;
    }
    var data = cartCarryReadFresh();
    if (!data) { return; }
    beginRestoreWatch();
  }

  /* ═══ 온사이트 팝업 엔진 v1 (2026-08-26 · 검토용 시안 — 대표 승인 전 미배포) ═══
     발화 규칙: 카드 팝업은 세션당 1개 + 팝업별 24시간 재노출 금지(토스트는 캡 제외).
     계측: GA4 dataLayer 이벤트 yd_pop_view / yd_pop_click / yd_pop_close (popup_id 포함).
     검토 훅: 콘솔에서 YD_POPUP_TEST('signup_dwell'|'exit_cart'|'checkout_stall'|'signup_welcome') — 캡 무시 강제 렌더. */
  const POPUP_RULES = {
    sessionKey: 'yd_pop_session_shown',
    lastPrefix: 'yd_pop_last_',
    cooldownMs: 24 * 60 * 60 * 1000
  };
  /* 부스터 발화 대기: 상품 목록·상세 진입 후 30초 (2026-08-31 대표 지시).
     매거진·가이드 등 콘텐츠 문맥에서는 발화하지 않고 구매 탐색 문맥에서만 센다. */
  const BOOST_FIRE_AFTER_MS = 30 * 1000;
  const BOOST_PENDING_TTL_MS = 10 * 60 * 1000;
  /* 가입 팝업 체류 조건: 20초→40초 (2026-08-28 대표 지시) */
  const SIGNUP_DWELL_MS = 40 * 1000;
  /* 단일 팝업 체제(8/28 대표 승인): 가입 팝업 OFF — 부스터(합계 프레임)가 가입 유도까지 겸한다 */
  const SIGNUP_POPUP_ENABLED = false;

  function isMagazinePage() {
    return /^\/magazine(?:\/|$)/i.test(location.pathname || '');
  }

  function isProductListPage() {
    if (isMagazinePage() || isProductDetailPage()) return false;
    return !!qs('.shop-item._shop_item[data-product-properties], .shop-item[data-product-properties], a[href*="/shop_view"]');
  }

  function boostSurface() {
    if (isMagazinePage()) return '';
    if (isProductDetailPage()) return 'product_detail';
    if (isProductListPage()) return 'product_list';
    return '';
  }

  function popTrack(name, popupId, extra) {
    try {
      const params = Object.assign({ popup_id: popupId, page_path: location.pathname }, extra || {});
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, params);
      } else {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(Object.assign({ event: name }, params));
      }
    } catch (err) {}
  }

  function popCapOk(id) {
    try {
      if (window.sessionStorage.getItem(POPUP_RULES.sessionKey)) return false;
      const last = Number(window.localStorage.getItem(POPUP_RULES.lastPrefix + id) || 0);
      if (last && Date.now() - last < POPUP_RULES.cooldownMs) return false;
    } catch (err) {}
    return true;
  }

  function popMarkShown(id) {
    try {
      window.sessionStorage.setItem(POPUP_RULES.sessionKey, id);
      window.localStorage.setItem(POPUP_RULES.lastPrefix + id, String(Date.now()));
    } catch (err) {}
  }

  function popEscapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function(ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function popShowCard(def, opts) {
    opts = opts || {};
    if (qs('.yd-pop-wrap')) return null;
    if (!opts.force) {
      if (def.capExempt) {
        /* 세션당 1개 캡 예외(부스터·결제정체) — 수령 이력(claimedKey)·24h 캡·총 노출 캡(seenCapKey) */
        try {
          if (def.claimedKey && window.localStorage.getItem(def.claimedKey)) return null;
          if (def.seenCapKey && Number(window.localStorage.getItem(def.seenCapKey) || 0) >= (def.seenCapMax || 3)) return null;
          const last = Number(window.localStorage.getItem(POPUP_RULES.lastPrefix + def.id) || 0);
          if (last && Date.now() - last < POPUP_RULES.cooldownMs) return null;
          window.localStorage.setItem(POPUP_RULES.lastPrefix + def.id, String(Date.now()));
          if (def.seenCapKey) window.localStorage.setItem(def.seenCapKey, String(Number(window.localStorage.getItem(def.seenCapKey) || 0) + 1));
        } catch (err) {}
      } else {
        if (!popCapOk(def.id)) return null;
        popMarkShown(def.id);
      }
    }
    const dim = document.createElement('div');
    dim.className = 'yd-pop-dim';
    const wrap = document.createElement('div');
    wrap.className = 'yd-pop-wrap';
    const card = document.createElement('div');
    card.className = 'yd-pop-card';
    let html = '<button type="button" class="yd-pop-x" aria-label="닫기">✕</button>';
    if (def.mediaHtml) html += '<div class="yd-pop-media">' + def.mediaHtml + '</div>';
    html += def.bodyHtml ||
      ('<div class="yd-pop-body"><p class="yd-pop-title">' + def.titleHtml + '</p>' +
      '<p class="yd-pop-desc">' + def.descHtml + '</p></div>');
    html +=
      '<button type="button" class="yd-pop-cta' + (def.ctaKakao ? ' yd-pop-kakao' : '') + (def.ctaRed ? ' yd-pop-red' : '') + '">' + popEscapeHtml(def.ctaLabel) + '</button>' +
      '<button type="button" class="yd-pop-later">' + popEscapeHtml(def.laterLabel || '다음에 볼게요') + '</button>';
    card.innerHTML = html;
    wrap.appendChild(card);
    document.body.appendChild(dim);
    document.body.appendChild(wrap);
    requestAnimationFrame(function() {
      dim.classList.add('yd-pop-on');
      card.classList.add('yd-pop-on');
    });
    if (!opts.silent) {
      popTrack('yd_pop_view', def.id, def.trackParams);
      /* 팝업 간격 리셋 기준: 어떤 카드든 뜨면 부스터 카운트는 그 시점부터 다시 센다. */
      try { window.sessionStorage.setItem('yd_last_card_at', String(Date.now())); } catch (err) {}
    }

    function close(reason) {
      if (!opts.silent) popTrack(reason === 'cta' ? 'yd_pop_click' : 'yd_pop_close', def.id, def.trackParams);
      dim.classList.remove('yd-pop-on');
      card.classList.remove('yd-pop-on');
      window.setTimeout(function() {
        try { dim.remove(); wrap.remove(); } catch (err) {}
      }, 320);
    }
    qs('.yd-pop-x', card).addEventListener('click', function() { close('x'); });
    qs('.yd-pop-later', card).addEventListener('click', function() { close('later'); });
    dim.addEventListener('click', function() { close('dim'); });
    qs('.yd-pop-cta', card).addEventListener('click', function() {
      /* 전환 귀속: 클릭한 팝업 id를 30분 기록 — 가입/쿠폰발급/구매 완료 시 yd_pop_convert로 연결 */
      if (!opts.silent) {
        try { window.localStorage.setItem('yd_pop_attrib', JSON.stringify({ id: def.id, at: Date.now() })); } catch (err) {}
      }
      close('cta');
      if (typeof def.onCta === 'function') def.onCta();
    });
    return card;
  }

  function popShowToast(def) {
    if (qs('.yd-pop-toast')) return null;
    const toast = document.createElement('div');
    toast.className = 'yd-pop-toast';
    toast.innerHTML = def.bodyHtml;
    document.body.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('yd-pop-on'); });
    popTrack('yd_pop_view', def.id);
    window.setTimeout(function() {
      toast.classList.remove('yd-pop-on');
      window.setTimeout(function() { try { toast.remove(); } catch (err) {} }, 350);
    }, def.durationMs || 6000);
    return toast;
  }

  /* 팝업 정의 4종 — id는 계측 popup_id와 동일 */
  const POPUP_DEFS = {
    /* #1 비회원 상세페이지 40초 체류 → 가입 쿠폰팩 */
    signup_dwell: function() {
      return {
        id: 'signup_dwell',
        bodyHtml:
          '<div class="yd-pop-body">' +
          '<p class="yd-pop-kicker">신규회원 웰컴 혜택</p>' +
          '<p class="yd-pop-amount">가입하면 <strong>18,000원</strong><br>쿠폰팩을 바로 드려요</p>' +
          '<div class="yd-pop-chips"><span>1,000원</span><span>2,000원</span><span>3,000원</span><span>4,000원</span><span>8,000원</span></div>' +
          '<p class="yd-pop-desc">카카오로 3초 가입, 쿠폰은 즉시 지급돼요<br>첫 주문부터 바로 쓸 수 있어요</p>' +
          '</div>',
        ctaLabel: '3초 회원가입하고 쿠폰 받기',
        ctaKakao: true,
        laterLabel: '괜찮아요, 더 둘러볼게요',
        onCta: function() {
          /* 가입 복귀 시 장바구니 랜딩 + 웰컴 토스트까지 잇는다 (2026-08-26 결함 수리:
             yd_pay_resume 없이는 가입 후 랜딩·토스트 체인이 끊겼음) */
          try {
            window.localStorage.setItem('yd_kakao_direct', String(Date.now()));
            window.localStorage.setItem('yd_pay_resume', String(Date.now()));
          } catch (err) {}
          try { (window.top || window).location.href = '/login'; }
          catch (err) { window.location.href = '/login'; }
        }
      };
    },
    /* #2 첫구매 응원 부스터 (2026-08-26 대표 확정)
       대상: 미회원 + 신규가입 세션 회원(구매이력 없는 층 근사 — 클라이언트에서 구매이력 조회 불가).
       발동: 상품 목록·상세 진입 후 30초 미구매(매거진·콘텐츠 문맥 제외, 8/31 조정).
       쿠폰: [첫구매 응원] 2,000원 시크릿 다운로드(1인 1회·1일 만료·도매 9종 제외·중복사용 가능). */
    first_buy_boost: function(triggerSurface) {
      /* 노출 3회 캡(8/28 대표 확정): 1·2회차 = E안, 3회차(마지막) = D안 합계 프레임, 이후 미노출 */
      let seen = 0;
      try { seen = Number(window.localStorage.getItem('yd_boost_seen_count') || 0); } catch (err) {}
      const finalRound = seen >= 2;
      /* 본체 = U1 긴급성 디자인(8/28 대표 선택): "오늘 지나면 사라져요" 헤드 — 3회차는 마지막 안내 킥커 */
      const bodyU1 = function(kicker) {
        return '<div class="yd-pop-body" style="padding-top:30px;">' +
          '<p class="yd-sc-line" style="font-size:15px;color:#8A8378;">' + kicker + '</p>' +
          '<p class="yd-sc-num" style="font-size:44px;">2,000원</p>' +
          '<p class="yd-pop-title" style="font-size:21px;margin:2px 0 4px;"><span style="color:#E60000;">오늘 지나면 사라져요</span></p>' +
          '<p class="yd-sc-sub">지금 받으면 첫 주문에 바로 사용</p></div>';
      };
      const bodyE = bodyU1('첫 주문 응원 쿠폰');
      const bodyFinal = bodyU1('오늘이 마지막 안내예요');
      return {
        id: 'first_buy_boost',
        capExempt: true,
        seenCapKey: 'yd_boost_seen_count',
        seenCapMax: 3,
        trackParams: {
          trigger_surface: triggerSurface || 'preview',
          trigger_delay_seconds: Math.round(BOOST_FIRE_AFTER_MS / 1000)
        },
        bodyHtml: finalRound ? bodyFinal : bodyE,
        ctaLabel: '2,000원 바로 받기',
        ctaRed: true,
        laterLabel: '괜찮아요',
        onCta: function() {
          /* 클릭은 수령 완료가 아니다. 발급 대기만 남기고 쿠폰함 확인 성공 뒤에만 완료 처리한다. */
          try {
            window.localStorage.setItem('yd_boost_pending', JSON.stringify({
              at: Date.now(), popup_id: 'first_buy_boost'
            }));
            window.localStorage.removeItem('yd_boost_claimed');
          } catch (err) {}
          if (isGuestUser()) {
            /* 비회원: 쿠폰 링크 직행 — imweb이 /login?back_url=쿠폰링크로 보내고(실측),
               yd_kakao_direct가 카카오 버튼 자동 클릭 → 가입 후 back_url 복귀로 자동 발급.
               yd_boost_pending은 back_url이 유실되는 경로의 백업 체인. */
            try {
              window.localStorage.setItem('yd_kakao_direct', String(Date.now()));
              window.localStorage.removeItem('yd_pay_resume');
            } catch (err) {}
            try { (window.top || window).location.href = CONFIG.BOOST_COUPON_URL; }
            catch (err) { window.location.href = CONFIG.BOOST_COUPON_URL; }
            return;
          }
          try { (window.top || window).location.href = CONFIG.BOOST_COUPON_URL; }
          catch (err) { window.location.href = CONFIG.BOOST_COUPON_URL; }
        }
      };
    },
    /* ── 부스터 디자인 시안 4종(검토용 임시) ── */
    boost_a: function() { /* A. 쿠폰 티켓 실물감 */
      return { id: 'first_buy_boost', capExempt: true, ctaRed: true,
        bodyHtml: '<div class="yd-pop-body"><p class="yd-pop-kicker">잠깐! 첫 주문 응원 쿠폰이 나왔어요</p>' +
          '<div class="yd-bt-wrap"><div class="yd-bt-amt"><b>2,000원</b><span>COUPON</span></div>' +
          '<div class="yd-bt-body"><div class="t">지금 받으면<br>바로 쓸 수 있어요</div>' +
          '<div class="d">웰컴 쿠폰팩과 중복 사용 · 오늘 하루만</div></div></div></div>',
        ctaLabel: '2,000원 바로 받기', laterLabel: '괜찮아요', onCta: function() {} };
    },
    boost_b: function() { /* B. 브랜드 올리브 헤더 */
      return { id: 'first_buy_boost', capExempt: true, ctaRed: true,
        bodyHtml: '<div class="yd-pop-body"><div class="yd-ol-head">윤식단이 첫 끼니를 응원해요 <em>+2,000원</em></div>' +
          '<p class="yd-pop-amount">고민되는 지금,<br><strong>2,000원</strong> 더 아껴드릴게요</p>' +
          '<p class="yd-pop-desc">웰컴 쿠폰팩과 함께 쓸 수 있어요<br>이 쿠폰은 <strong>오늘 하루만</strong> 살아있어요</p></div>',
        ctaLabel: '2,000원 바로 받기', laterLabel: '괜찮아요', onCta: function() {} };
    },
    boost_c: function() { /* C. 미니멀 금액 초강조 */
      return { id: 'first_buy_boost', capExempt: true, ctaRed: true,
        bodyHtml: '<div class="yd-pop-body" style="padding-top:30px;">' +
          '<p style="font-size:44px;font-weight:900;color:#E60000;line-height:1;margin:0 0 10px;">2,000원</p>' +
          '<p class="yd-pop-title" style="font-size:16px;">첫 주문 응원 쿠폰, 지금 발급 되었습니다</p>' +
          '<p class="yd-pop-desc">오늘 하루만 · 웰컴 쿠폰팩과 중복 사용</p></div>',
        ctaLabel: '2,000원 바로 받기', laterLabel: '괜찮아요', onCta: function() {} };
    },
    boost_d: function() { /* D. 웰컴팩 스택(합계 강조) */
      return { id: 'first_buy_boost', capExempt: true, ctaRed: true,
        bodyHtml: '<div class="yd-pop-body"><p class="yd-pop-kicker">첫 주문 혜택 합계</p>' +
          '<div class="yd-stack"><span class="chip">웰컴팩 18,000원</span><span class="plus">+</span><span class="chip red">2,000원</span></div>' +
          '<p class="yd-pop-amount">오늘은 총 <strong>20,000원</strong><br>아끼고 시작할 수 있어요</p>' +
          '<p class="yd-pop-desc">추가 2,000원은 <strong>오늘 하루만</strong> 받을 수 있어요</p></div>',
        ctaLabel: '2,000원 바로 받기', laterLabel: '괜찮아요', onCta: function() {} };
    },

    /* ── 긴급성 시안 3종(8/28 "오늘만 1도 안 느껴짐" 피드백) — 미리보기 전용 ── */
    pop_u1: function() { /* U1. 사라져요 헤드라인 */
      return { id: 'first_buy_boost', capExempt: true, ctaRed: true,
        bodyHtml: '<div class="yd-pop-body" style="padding-top:30px;">' +
          '<p class="yd-sc-line" style="font-size:15px;color:#8A8378;">첫 주문 응원 쿠폰</p>' +
          '<p class="yd-sc-num" style="font-size:44px;">2,000원</p>' +
          '<p class="yd-pop-title" style="font-size:21px;margin:2px 0 4px;"><span style="color:#E60000;">오늘 지나면 사라져요</span></p>' +
          '<p class="yd-sc-sub">지금 받으면 첫 주문에 바로 사용</p></div>',
        ctaLabel: '2,000원 바로 받기', laterLabel: '괜찮아요', onCta: function() {} };
    },
    pop_u2: function() { /* U2. 마감 스트립 + 합계 */
      return { id: 'first_buy_boost', capExempt: true, ctaRed: true,
        bodyHtml: '<div class="yd-pop-body">' +
          '<div style="margin:-20px -20px 16px;background:#E60000;color:#fff;font-weight:900;font-size:16px;padding:12px;border-radius:20px 20px 0 0;letter-spacing:.02em;">⏰ 오늘 밤 12시 마감</div>' +
          '<p class="yd-sc-num" style="font-size:46px;">2,000원</p>' +
          '<p class="yd-sc-line">가입하면 웰컴팩 18,000원까지 함께</p>' +
          '<p class="yd-sc-sub">내일이면 받을 수 없어요</p></div>',
        ctaLabel: '2,000원 바로 받기', laterLabel: '괜찮아요', onCta: function() {} };
    },
    pop_u3: function() { /* U3. TODAY ONLY 스탬프 + 티켓 */
      return { id: 'first_buy_boost', capExempt: true, ctaRed: true,
        bodyHtml: '<div class="yd-pop-body" style="padding-top:34px;position:relative;">' +
          '<div style="position:absolute;top:8px;right:6px;transform:rotate(8deg);border:3px solid #E60000;color:#E60000;font-weight:900;font-size:14px;border-radius:9px;padding:4px 10px;letter-spacing:.05em;background:rgba(255,255,255,.75);">TODAY ONLY</div>' +
          '<div class="yd-sc-ticket"><div class="n">2,000원</div><div class="l">오늘 밤 12시에 사라져요</div></div>' +
          '<p class="yd-sc-sub" style="margin-top:12px;">첫 주문 응원 쿠폰 · 웰컴팩과 중복 사용</p></div>',
        ctaLabel: '2,000원 바로 받기', laterLabel: '괜찮아요', onCta: function() {} };
    },

    /* ── 스캔형 시안 4종(8/28 "읽지 않고 본다") — 미리보기 전용 ── */
    pop_a: function() { /* A. 초미니멀 — 숫자 하나 */
      return { id: 'first_buy_boost', capExempt: true, ctaRed: true,
        bodyHtml: '<div class="yd-pop-body" style="padding-top:34px;">' +
          '<p class="yd-sc-num">20,000<small>원</small></p>' +
          '<p class="yd-sc-line">가입하면 바로 드려요</p>' +
          '<p class="yd-sc-sub">첫 주문 쿠폰팩 · 오늘 하루</p></div>',
        ctaLabel: '2,000원 바로 받기', laterLabel: '괜찮아요', onCta: function() {} };
    },
    pop_b: function() { /* B. 쿠폰 티켓 원샷 — 그림이 전부 */
      return { id: 'first_buy_boost', capExempt: true, ctaRed: true,
        bodyHtml: '<div class="yd-pop-body" style="padding-top:30px;">' +
          '<div class="yd-sc-ticket"><div class="n">20,000원</div><div class="l">첫 주문 쿠폰팩 · 오늘 가입 시</div></div>' +
          '<p class="yd-sc-sub" style="margin-top:12px;">3초 카카오 가입으로 즉시 지급</p></div>',
        ctaLabel: '쿠폰 받고 시작하기', laterLabel: '괜찮아요', onCta: function() {} };
    },
    pop_c: function() { /* C. 옐로 임팩트 — 카카오 톤 */
      return { id: 'first_buy_boost', capExempt: true,
        bodyHtml: '<div class="yd-pop-body">' +
          '<div class="yd-sc-yellow"><div class="n">20,000원</div><div class="l">3초 가입하면 끝</div></div>' +
          '<p class="yd-sc-sub" style="margin-top:14px;">첫 주문 쿠폰팩 · 오늘 하루만</p></div>',
        ctaLabel: '2,000원 바로 받기', ctaKakao: true, laterLabel: '괜찮아요', onCta: function() {} };
    },
    pop_d: function() { /* D. 수식 한 줄 — 스택 미니 */
      return { id: 'first_buy_boost', capExempt: true, ctaRed: true,
        bodyHtml: '<div class="yd-pop-body" style="padding-top:30px;">' +
          '<p class="yd-sc-eq">18,000 + 2,000 =</p>' +
          '<p class="yd-sc-num">20,000<small>원</small></p>' +
          '<p class="yd-sc-line">오늘 가입하면 전부 드려요</p></div>',
        ctaLabel: '쿠폰 받고 시작하기', laterLabel: '괜찮아요', onCta: function() {} };
    },

    boost_e: function() { /* E. 현재본 카피 + A안 쿠폰 티켓 결합 (8/28 대표 지시) */
      return { id: 'first_buy_boost', capExempt: true, ctaRed: true,
        bodyHtml: '<div class="yd-pop-body"><p class="yd-pop-kicker">첫 구매 응원 쿠폰</p>' +
          '<p class="yd-pop-amount">첫 주문 응원 <strong>2,000원</strong><br>발급 되었습니다!</p>' +
          '<div class="yd-bt-wrap"><div class="yd-bt-amt"><b>2,000원</b><span>COUPON</span></div>' +
          '<div class="yd-bt-body"><div class="t">지금 받으면<br>바로 쓸 수 있어요</div>' +
          '<div class="d">웰컴 쿠폰팩과 중복 사용 · 오늘 하루만</div></div></div></div>',
        ctaLabel: '2,000원 바로 받기', laterLabel: '괜찮아요', onCta: function() {} };
    },

    /* #3 이탈 직전(exit intent) + 장바구니에 상품 있음 */
    exit_cart: function(cartInfo) {
      const count = cartInfo && cartInfo.count ? cartInfo.count : 0;
      const price = cartInfo && cartInfo.price ? Number(cartInfo.price).toLocaleString('ko-KR') + '원' : '';
      const ship = formatDate(getNextShipDate(new Date()));
      return {
        id: 'exit_cart',
        titleHtml: '장바구니에 담아둔 상품,<br>그냥 두고 가시게요?',
        descHtml: (count ? '담아둔 상품 <strong>' + count + '개</strong>' + (price ? ' · ' + price : '') + '<br>' : '') +
          '지금 주문하면 <strong>' + popEscapeHtml(ship) + '</strong> 바로 출발해요',
        ctaLabel: '장바구니 확인하기',
        laterLabel: '다음에 주문할게요',
        onCta: function() {
          try { (window.top || window).location.href = '/shop_cart'; }
          catch (err) { window.location.href = '/shop_cart'; }
        }
      };
    },
    /* #4 결제 페이지 60초 정체 → 배송 마감 안내 */
    checkout_stall: function() {
      const ship = formatDate(getNextShipDate(new Date()));
      return {
        id: 'checkout_stall',
        capExempt: true,
        titleHtml: '결제하다 막히는 부분이 있으세요?',
        descHtml: '지금 결제를 완료하면<br><strong>' + popEscapeHtml(ship) + ' 출발</strong>로 가장 빨리 받아보세요<br>궁금한 건 카카오톡으로 바로 물어보셔도 돼요',
        ctaLabel: '이어서 결제하기',
        laterLabel: '카카오톡으로 문의하기',
        onCta: function() {}
      };
    }
  };

  const EXIT_CART_POPUP_ENABLED = false; /* ③ 이탈 리마인드 — 대표 결정 대기(코드는 유지) */

  /* CTA 클릭 뒤의 목표 행동은 실제 확인된 지점에서만 전환으로 기록한다. */
  function popConvert(action) {
    try {
      const raw = window.localStorage.getItem('yd_pop_attrib');
      if (!raw) return;
      const a = JSON.parse(raw);
      if (!a || !a.id || Date.now() - Number(a.at) > 30 * 60 * 1000) {
        window.localStorage.removeItem('yd_pop_attrib');
        return;
      }
      const doneKey = 'done_' + action;
      if (a[doneKey]) return;
      a[doneKey] = 1;
      window.localStorage.setItem('yd_pop_attrib', JSON.stringify(a));
      ydGaEvent('yd_pop_convert', { popup_id: a.id, convert_action: action, page_path: location.pathname });
      if (action === 'purchase') window.localStorage.removeItem('yd_pop_attrib');
    } catch (err) {}
  }

  /* 매거진 방문 뒤 상품 탐색으로 이어진 첫 이동을 세션 단위로 집계한다.
     개인 식별값은 저장하지 않고 경로·이동 유형·경과 초만 GA4로 전송한다. */
  function bindMagazineJourney() {
    if (IS_IFRAME) return;
    const markerKey = 'yd_magazine_journey';
    const ttlMs = 30 * 60 * 1000;
    const readMarker = function() {
      try {
        const marker = JSON.parse(window.sessionStorage.getItem(markerKey) || 'null');
        if (!marker || !marker.at || Date.now() - Number(marker.at) >= ttlMs) {
          window.sessionStorage.removeItem(markerKey);
          return null;
        }
        return marker;
      } catch (err) { return null; }
    };
    const recordTransition = function(surface, destinationPath) {
      const marker = readMarker();
      if (!marker) return false;
      ydGaEvent(surface === 'product_detail' ? 'yd_magazine_to_product_detail' : 'yd_magazine_to_product_list', {
        source_path: marker.path || '/Magazine/',
        destination_path: destinationPath || location.pathname,
        destination_surface: surface,
        elapsed_seconds: Math.max(0, Math.round((Date.now() - Number(marker.at)) / 1000))
      });
      try { window.sessionStorage.removeItem(markerKey); } catch (err) {}
      return true;
    };

    if (isMagazinePage()) {
      try {
        window.sessionStorage.setItem(markerKey, JSON.stringify({
          at: Date.now(), path: location.pathname
        }));
      } catch (err) {}
      document.addEventListener('click', function(e) {
        const target = e.target && e.target.closest && e.target.closest(
          '[onclick*="openProdDetailFromShoppingList"], .shop-item._shop_item a, a[href*="/shop_view"]'
        );
        if (target) recordTransition('product_detail', '/shop_view/');
      }, true);
      ydMark('magazineJourney', true, '매거진 방문 — 상품 이동 대기');
      return;
    }

    let tries = 0;
    const detectDestination = function() {
      tries += 1;
      const surface = boostSurface();
      if (surface && recordTransition(surface, location.pathname)) {
        ydMark('magazineJourney', true, '매거진 → ' + surface + ' 이동 기록');
        return true;
      }
      return !readMarker() || tries >= 15;
    };
    if (detectDestination()) return;
    const timer = window.setInterval(function() {
      if (detectDestination()) window.clearInterval(timer);
    }, 1000);
  }

  function bindOnsitePopups() {
    if (IS_IFRAME) {
      /* 레이어(iframe) 상세: 팝업은 부모창이 그린다(z-index가 모달 위) — 여기선 조건 감지·릴레이만.
         2026-08-26 수리: 상세 대부분이 레이어로 열려 iframe 전체 제외 시 ①이 실사용에서 발화 안 하던 결함. */
      if (SIGNUP_POPUP_ENABLED && isProductDetailPage() && isGuestUser() && !isWholesalePage()) {
        let dwellMs = 0;
        let lastTick = Date.now();
        const relayTimer = window.setInterval(function() {
          const now = Date.now();
          if (document.visibilityState === 'visible') dwellMs += now - lastTick;
          lastTick = now;
          if (dwellMs >= SIGNUP_DWELL_MS) {
            window.clearInterval(relayTimer);
            try { window.parent.postMessage({ __yd_pop: true, id: 'signup_dwell' }, location.origin); } catch (err) {}
          }
        }, 1000);
        ydMark('onsitePopups', true, 'iframe: signup_dwell 릴레이 무장');
        return;
      }
      ydMark('onsitePopups', true, 'iframe 제외');
      return;
    }
    if (isWholesalePage()) { ydMark('onsitePopups', true, '도매몰 — 팝업 전체 제외'); return; }
    /* 구버전은 클릭만으로 영구 수령 표시를 남겼다. 신뢰할 수 없는 레거시 값을 폐기한다. */
    try {
      window.localStorage.removeItem('yd_boost_claimed');
      if (/\/shop_payment_complete/.test(location.pathname)) window.sessionStorage.setItem('yd_purchased', '1');
    } catch (err) {}

    /* 검토/QA 훅: 캡·조건 무시하고 강제 렌더 */
    window.YD_POPUP_TEST = function(id) {
      if (id === 'signup_welcome') {
        return popShowToast({
          id: 'signup_welcome',
          bodyHtml: '🎉 회원가입 완료!<br><span style="white-space:nowrap">쿠폰함에 <strong>18,000원 쿠폰팩</strong>이 들어왔어요</span>'
        });
      }
      if (id === 'exit_cart') return popShowCard(POPUP_DEFS.exit_cart({ count: 2, price: 41800 }), { force: true, silent: true });
      if (POPUP_DEFS[id]) return popShowCard(POPUP_DEFS[id](), { force: true, silent: true });
      console.warn('[YD] 알 수 없는 팝업 id: ' + id + ' (signup_dwell|exit_cart|checkout_stall|signup_welcome)');
      return null;
    };

    const armed = [];

    /* 지점 1: 구매 완료 */
    if (/\/shop_payment_complete/.test(location.pathname)) popConvert('purchase');

    /* 레이어(iframe) 상세에서 온 팝업 릴레이 수신 — 같은 오리진 + 화이트리스트만 */
    window.addEventListener('message', function(e) {
      try {
        if (e.origin !== location.origin) return;
        const d = e.data;
        if (!d || d.__yd_pop !== true) return;
        if (d.id !== 'signup_dwell') return;
        if (!SIGNUP_POPUP_ENABLED) return;
        if (!isGuestUser()) return;
        popShowCard(POPUP_DEFS.signup_dwell());
      } catch (err) {}
    });

    /* #7 가입 직후 장바구니 도착 토스트 — 세션 캡 제외(가입 보상 확인은 항상 보여준다) */
    if (pageIs('/shop_cart') && !isGuestUser()) {
      let welcomeRaw = null;
      try { welcomeRaw = window.localStorage.getItem('yd_pop_signup_welcome'); } catch (err) {}
      const welcomeAge = Date.now() - Number(welcomeRaw);
      if (welcomeRaw && welcomeAge >= 0 && welcomeAge < 10 * 60 * 1000) {
        try { window.localStorage.removeItem('yd_pop_signup_welcome'); } catch (err) {}
        /* 신규가입 확인: 쿠폰함에 [회원가입-첫구매](만료 3일)가 있으면 신규 — 기존 회원이
           팝업 경유 '로그인'만 한 경우의 "회원가입 완료" 오표기를 막는다. 조회 실패 시엔 표시(fail-open). */
        fetch('/mypage/coupon', { credentials: 'same-origin' })
          .then(function(res) { return res.ok ? res.text() : null; })
          .then(function(html) {
            const isNew = (html === null) || html.indexOf('회원가입-첫구매') !== -1;
            if (!isNew) { ydMark('signupWelcomeToast', true, '기존 회원 로그인 — 토스트 생략'); return; }
            popConvert('signup');
            window.setTimeout(function() {
              popShowToast({
                id: 'signup_welcome',
                bodyHtml: '🎉 회원가입 완료!<br><span style="white-space:nowrap">쿠폰함에 <strong>18,000원 쿠폰팩</strong>이 들어왔어요</span>'
              });
            }, 400);
            /* 부스터는 상품 목록·상세에서만 발화한다. 장바구니에서는 웰컴 토스트만 표시한다. */
          })
          .catch(function() {});
        armed.push('signup_welcome');
      }
    }

    /* #4 결제 페이지 60초 정체 (키 입력 시 타이머 리셋 — 입력 중엔 정체가 아니다) */
    if (pageIs('/shop_payment')) {
      let stallTimer = null;
      const armStall = function() {
        if (stallTimer) window.clearTimeout(stallTimer);
        stallTimer = window.setTimeout(function() {
          const card = popShowCard(POPUP_DEFS.checkout_stall());
          if (card) {
            qs('.yd-pop-later', card).addEventListener('click', function() {
              try { window.open(CONFIG.KAKAO_CHAT_URL, '_blank'); } catch (err) {}
            });
          }
        }, 60000);
      };
      document.addEventListener('keydown', armStall, true);
      armStall();
      armed.push('checkout_stall');
    } else if (SIGNUP_POPUP_ENABLED && isProductDetailPage() && isGuestUser()) {
      /* #1 비회원 상세 40초 체류 (탭이 보이는 시간만 카운트) */
      let dwellMs = 0;
      let lastTick = Date.now();
      const dwellTimer = window.setInterval(function() {
        const now = Date.now();
        if (document.visibilityState === 'visible') dwellMs += now - lastTick;
        lastTick = now;
        if (dwellMs >= SIGNUP_DWELL_MS) {
          window.clearInterval(dwellTimer);
          popShowCard(POPUP_DEFS.signup_dwell());
        }
      }, 1000);
      armed.push('signup_dwell');
    }

    /* #3 exit intent + 장바구니 있음 — 결제/장바구니 페이지 제외 전 페이지 */
    if (EXIT_CART_POPUP_ENABLED && !pageIs('/shop_payment') && !pageIs('/shop_cart')) {
      window.setTimeout(function() {
        fetch(CONFIG.CART_API, { credentials: 'same-origin' })
          .then(function(res) { return res.json(); })
          .then(function(data) {
            const count = Number((((data || {}).meta) || {}).total_normal_cart_item_count || 0);
            if (!count) return;
            const price = Number(((((data || {}).data) || {}).cart_price_summary || {}).product_price || 0);
            const fire = function() { popShowCard(POPUP_DEFS.exit_cart({ count: count, price: price })); };
            /* PC: 마우스가 화면 상단 밖으로 나갈 때(탭 닫기/주소창 이동 동작) */
            document.addEventListener('mouseout', function(e) {
              if (!e.relatedTarget && e.clientY <= 0) fire();
            });
            /* 모바일: 페이지 최상단 부근까지 빠르게 스크롤 업(뒤로가기 직전 패턴) */
            let lastY = window.scrollY;
            let lastT = Date.now();
            window.addEventListener('scroll', function() {
              const y = window.scrollY;
              const t = Date.now();
              if (lastY - y > 550 && t - lastT < 600 && y < 80) fire();
              lastY = y;
              lastT = t;
            }, { passive: true });
          })
          .catch(function() {});
      }, 5000);
      armed.push('exit_cart(armed-if-cart)');
    }

    /* #2 첫구매 응원 부스터 — 상품 목록·상세 진입 30초 + 미구매 + (비회원 || 신규가입 세션) */
    (function armBoost() {
      const surface = boostSurface();
      if (!surface) return;
      let verified = null, purchased = null, newMember = null;
      try {
        verified = window.sessionStorage.getItem('yd_boost_coupon_verified');
        purchased = window.sessionStorage.getItem('yd_purchased');
        newMember = window.localStorage.getItem('yd_new_member_session');
      } catch (err) {}
      if (newMember && Date.now() - Number(newMember) > 30 * 60 * 1000) newMember = null; /* 30분 TTL */
      if (verified || purchased) return;
      if (!isGuestUser() && !newMember) return; /* 기존 회원(구매이력 미상)에겐 노출 안 함 */
      const eligibleT0 = Date.now();
      const boostCheck = function() {
        let bought = null, couponVerified = null, lastCard = 0;
        try {
          bought = window.sessionStorage.getItem('yd_purchased');
          couponVerified = window.sessionStorage.getItem('yd_boost_coupon_verified');
          lastCard = Number(window.sessionStorage.getItem('yd_last_card_at') || 0);
        } catch (err) {}
        if (bought || couponVerified || !boostSurface()) { window.clearInterval(boostTimer); return; }
        /* 다른 팝업이 떴다면 그 시점부터 다시 30초를 센다. */
        const baseT = Math.max(eligibleT0, lastCard);
        if (Date.now() - baseT >= BOOST_FIRE_AFTER_MS) {
          if (qs('.yd-pop-wrap')) return; /* 다른 카드 표시 중 — 닫힌 뒤 다음 틱에 재시도 */
          const card = popShowCard(POPUP_DEFS.first_buy_boost(surface));
          if (card) window.clearInterval(boostTimer);
          else {
            /* 캡·이번 세션 수령 확인으로 거절된 경우만 종료(재시도 무의미) */
            let denied = false;
            try {
              denied = !!window.sessionStorage.getItem('yd_boost_coupon_verified') ||
                (Date.now() - Number(window.localStorage.getItem(POPUP_RULES.lastPrefix + 'first_buy_boost') || 0)) < POPUP_RULES.cooldownMs;
            } catch (err) {}
            if (denied) window.clearInterval(boostTimer);
          }
        }
      };
      const boostTimer = window.setInterval(boostCheck, 1000);
      window.setTimeout(boostCheck, 1000);
      armed.push('first_buy_boost(30s:' + surface + ')');
    })();

    /* 미리보기: ?yd_pop=<팝업id> — 캡·대상조건 무시 강제 렌더(계측 제외, 소유자 검수용) */
    const previewId = (location.search.match(/[?&]yd_pop=([a-z_]+)/) || [])[1];
    if (previewId) {
      window.setTimeout(function() { window.YD_POPUP_TEST(previewId); }, 1500);
      armed.push('preview:' + previewId);
    }

    ydMark('onsitePopups', true, '무장: ' + (armed.join(', ') || '없음'));
  }

  /* 부스터 경유 가입 복귀: 회원 확인 → 쿠폰 링크 → 쿠폰함 실재 확인 뒤에만 완료 처리 */
  function bindBoostCouponResume() {
    if (IS_IFRAME) return;
    let raw = null;
    try { raw = window.localStorage.getItem('yd_boost_pending'); } catch (err) {}
    if (!raw) return;
    let pending = null;
    try { pending = JSON.parse(raw); } catch (err) { pending = { at: Number(raw) }; }
    const age = Date.now() - Number((pending || {}).at);
    if (!(age >= 0 && age < BOOST_PENDING_TTL_MS)) {
      try { window.localStorage.removeItem('yd_boost_pending'); } catch (err) {}
      return;
    }
    if (isGuestUser()) { ydMark('boostCouponResume', true, '비회원 — 가입 복귀 대기'); return; }
    if (/[?&]coupon=/.test(location.search)) {
      let attempts = 0;
      const verifyCoupon = function() {
        attempts += 1;
        fetch('/mypage/coupon', { credentials: 'same-origin', cache: 'no-store' })
          .then(function(res) { return res.ok ? res.text() : null; })
          .then(function(html) {
            const normalized = String(html || '').replace(/\s+/g, ' ');
            const verified = normalized.indexOf('첫구매 응원') !== -1 && /2,?000\s*원/.test(normalized);
            if (verified) {
              try {
                window.sessionStorage.setItem('yd_boost_coupon_verified', String(Date.now()));
                window.localStorage.removeItem('yd_boost_pending');
                window.localStorage.removeItem('yd_boost_claimed');
              } catch (err) {}
              popConvert('coupon_issued');
              ydGaEvent('yd_pop_coupon_verified', {
                popup_id: 'first_buy_boost', page_path: location.pathname
              });
              ydMark('boostCouponResume', true, '쿠폰함 확인 성공 — 수령 완료');
              return;
            }
            if (attempts < 3) {
              window.setTimeout(verifyCoupon, 1500);
              return;
            }
            try { window.localStorage.removeItem('yd_boost_pending'); } catch (err) {}
            ydGaEvent('yd_pop_coupon_unverified', {
              popup_id: 'first_buy_boost', page_path: location.pathname
            });
            ydMark('boostCouponResume', false, '쿠폰함 미확인 — 수령 완료로 저장하지 않음');
          })
          .catch(function() {
            if (attempts < 3) {
              window.setTimeout(verifyCoupon, 1500);
              return;
            }
            try { window.localStorage.removeItem('yd_boost_pending'); } catch (err) {}
            ydGaEvent('yd_pop_coupon_unverified', {
              popup_id: 'first_buy_boost', page_path: location.pathname
            });
            ydMark('boostCouponResume', false, '쿠폰함 조회 실패 — 수령 완료로 저장하지 않음');
          });
      };
      verifyCoupon();
      return;
    }
    ydMark('boostCouponResume', true, '가입 복귀 — 쿠폰 발급 랜딩 이동');
    ydTrace('부스터 재개 — 쿠폰 랜딩으로 이동');
    try { (window.top || window).location.href = CONFIG.BOOST_COUPON_URL; }
    catch (err) { window.location.href = CONFIG.BOOST_COUPON_URL; }
  }

  /* ═══ 상세페이지(레이어 포함) 행동 계측 → GA4 (2026-08-26 대표 지시) ═══
     GA4 기본 계측은 레이어(iframe) 상세 내부의 스크롤·클릭을 잡지 못한다 — 여기서 직접 심는다.
     - yd_detail_scroll : 스크롤 깊이 25/50/75/90% 최초 도달 시 1회씩 (depth)
     - yd_detail_dwell  : 탭이 실제로 보인 시간 10/30/60초 도달 시 1회씩 (seconds)
     - yd_detail_click  : 주요 버튼 클릭 — 옵션 보기/리뷰/장바구니/결제·주문/쿠폰 (element_label)
     공통 파라미터: product_idx, surface('layer'=팝업형 상세 | 'page'=직접 진입) */
  function ydGaEvent(name, params) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, params);
        return;
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: name }, params));
    } catch (err) {}
  }

  /* 레이어(iframe)에 GA 태그가 없을 때 부모 창이 대신 발사해 주는 릴레이.
     같은 오리진 + yd_ 접두 이벤트만 통과시킨다. */
  function bindGaRelay() {
    if (IS_IFRAME) return;
    window.addEventListener('message', function(e) {
      try {
        if (e.origin !== location.origin) return;
        const d = e.data;
        if (!d || d.__yd_ga !== true) return;
        if (!/^yd_[a-z0-9_]{1,40}$/.test(String(d.name || ''))) return;
        ydGaEvent(d.name, (d.params && typeof d.params === 'object') ? d.params : {});
      } catch (err) {}
    });
  }

  function bindDetailEngagement() {
    if (!isProductDetailPage()) return;
    const surface = IS_IFRAME ? 'layer' : 'page';
    const idx = (location.search.match(/[?&]idx=(\d+)/) || [])[1] || '';
    const base = { product_idx: idx, surface: surface };

    const send = function(name, extra) {
      const params = Object.assign({}, base, extra || {});
      const hasGa = (typeof window.gtag === 'function') || !!window.google_tag_manager;
      if (!hasGa && IS_IFRAME) {
        try { window.parent.postMessage({ __yd_ga: true, name: name, params: params }, location.origin); return; } catch (err) {}
      }
      ydGaEvent(name, params);
    };

    /* 스크롤 깊이 — 문서 기준, 임계값별 최초 1회 */
    const depthFired = {};
    let scrollQueued = false;
    const checkDepth = function() {
      scrollQueued = false;
      const doc = document.scrollingElement || document.documentElement;
      const total = doc.scrollHeight;
      if (!total || total <= doc.clientHeight) return;
      const depth = Math.round(((doc.scrollTop + doc.clientHeight) / total) * 100);
      [25, 50, 75, 90].forEach(function(th) {
        if (depth >= th && !depthFired[th]) {
          depthFired[th] = true;
          send('yd_detail_scroll', { depth: th });
        }
      });
    };
    window.addEventListener('scroll', function() {
      if (scrollQueued) return;
      scrollQueued = true;
      window.requestAnimationFrame(checkDepth);
    }, { passive: true });

    /* 체류 시간 — 탭이 보이는 시간만 누적 */
    const dwellFired = {};
    let dwellMs = 0;
    let lastTick = Date.now();
    const dwellTimer = window.setInterval(function() {
      const now = Date.now();
      if (document.visibilityState === 'visible') dwellMs += now - lastTick;
      lastTick = now;
      [10, 30, 60].forEach(function(sec) {
        if (dwellMs >= sec * 1000 && !dwellFired[sec]) {
          dwellFired[sec] = true;
          send('yd_detail_dwell', { seconds: sec });
        }
      });
      if (dwellFired[60]) window.clearInterval(dwellTimer);
    }, 1000);

    /* 주요 버튼 클릭 — 의미 있는 라벨만 골라 보낸다 (노이즈 방지) */
    const CLICK_LABEL_RE = /옵션\s*보기|리뷰|장바구니|바로\s*결제|주문하기|쿠폰|구매|건강담기|회원가입/;
    document.addEventListener('click', function(e) {
      try {
        const el = e.target && e.target.closest ? e.target.closest('button, a') : null;
        if (!el) return;
        const label = String(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24);
        if (!label || !CLICK_LABEL_RE.test(label)) return;
        send('yd_detail_click', { element_label: label });
      } catch (err) {}
    }, true);

    ydMark('detailEngagement', true, surface + (idx ? ' idx=' + idx : ''));
  }

  /* 게스트 카트 조기 스위퍼(2026-08-27): 주문 표면이 렌더 직후 0.1~0.2초 보였다
     사라지던 잔상 제거 — 디바운스 없이 MutationObserver 동기 콜백(페인트 전)으로 즉시 숨긴다.
     숨김만 담당하고 듀얼 주문바 생성은 bindCartUx의 정식 로직이 맡는다. */
  try {
    if (/^\/shop_cart/.test(location.pathname) && !IS_IFRAME && isGuestUser()) {
      const ydEarlySweep = function() {
        try {
          const nodes = document.querySelectorAll('button, a');
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (!/^주문하기/.test((n.textContent || '').trim())) continue;
            if (n.closest('#yd-guest-orderbar')) continue;
            const tgt = n.tagName === 'A' ? n : (n.parentElement || n);
            if (tgt.style.display !== 'none') { tgt.style.display = 'none'; tgt.classList.add('yd-sweep-hidden'); }
          }
          const legacyBanner = document.getElementById('agp-persistent-banner');
          if (legacyBanner) legacyBanner.remove();
        } catch (err) {}
      };
      ydEarlySweep();
      const ydSweepObs = new MutationObserver(ydEarlySweep);
      ydSweepObs.observe(document.documentElement, { childList: true, subtree: true });
      /* 복원 안전망(2026-08-29 주문 전멸 사고 후속): 듀얼 주문바가 10초 내 서지 못하면
         숨긴 네이티브 주문 버튼을 복원한다 — 주문 경로가 0개가 되는 상황만은 막는다. */
      window.setTimeout(function() {
        try {
          if (document.getElementById('yd-guest-orderbar')) return;
          ydSweepObs.disconnect();
          document.querySelectorAll('.yd-sweep-hidden').forEach(function(el) {
            el.style.display = '';
            el.classList.remove('yd-sweep-hidden');
          });
        } catch (err) {}
      }, 10000);
    }
  } catch (err) {}

  /* 옵션 플로우는 본문 파싱 직후 즉시 부팅 (yd-bs-root 가드로 중복 방지) */
  try { bindOptionFlow(); } catch (err) {}


  onReady(function() {
    bindHeaderLogoResolution();
    bindTopBannerExperiment();
    bindBrokenSummaryGuard();
    bindDetailVideoFix();
    bindDetailImageWarm();
    if (!IS_IFRAME) {
      bindProductPrefetch();
      bindCustomProductModal();
      bindCartKakaoBanner();
      bindBrandStoryFeed();
    }

    bindOptionKeepOpen();
    bindCartAwareFreeShip();
    bindDanbaekbapCouponHide();
    bindDanbaekbapSetFreeShippingTag();
    bindPureProteinCouponButton();
    bindFreeShipOptionCouponNote();
    bindOptionFlow();
    patchLayerPopupButtons();
    ensureObserver('patchLayerPopupButtons', patchLayerPopupButtons);
    bindShippingSchedule();
    bindWholesaleReturn();
    bindGuestCartCarry();
    bindGuestKakaoDirectLogin();
    bindTraceOverlay();
    bindSignupPayResume();
    bindFriendPackCouponHide();
    bindMagazineJourney();
    bindOnsitePopups();
    bindBoostCouponResume();
    bindGaRelay();
    bindDetailEngagement();
    bindCartUx();
    bindPaymentCompletePatches();
    bindMembershipFoundation();
    bindMyPageReorder();
    bindCheckoutPatches();
    bindProfileModalHeight();
    bindReviewModalHeight();
    bindDiscountDisplay();
    if (isWholesalePage()) {
      applyWholesalePageFixes();
      ensureObserver('wholesalePageFixes', applyWholesalePageFixes);
    }

    window.setTimeout(function() {
      Object.keys(ydStatus.features).forEach(function(key) {
        if (!ydStatus.features[key].ok) {
          console.warn('[YD v3.135] 미적용 감지: ' + key + ' — ' + ydStatus.features[key].note + ' (YD_CHECK()로 상세 확인)');
        }
      });
    }, 6000);
  });
})();
