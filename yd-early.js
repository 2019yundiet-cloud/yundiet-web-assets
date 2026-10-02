/* 윤식단 상세 본문 선행 렌더 — v9 2026-10-02 (아임웹 Header Code 칸의 로더가 CDN yd-early.js로 불러온다)
   문제: 아임웹은 상세 본문을 <template id="prodDetailMobile">에 담아 두고, 동기 스크립트 90여 개를 모두 받은 뒤
         HTML 맨 끝의 SITE_SHOP_DETAIL.initDetail()에서야 본문 칸에 끼워 넣는다(이미지 치수 HEAD 조회까지 끝낸 뒤).
         휴대폰 4G 실측으로 본문 첫 이미지가 8~9초에야 뜨고, 그동안 광고로 들어와 스크롤한 사람은 빈 칸을 본다.
   처리: template가 파싱되는 즉시(약 1초) 아임웹 setImageWidthHeightBeforeLoad와 같은 변환으로 먼저 그린다.
         아임웹이 나중에 붙이는 같은 본문 한 벌은 들어오는 순간 걷어낸다(이중 노출 방지).
         본문 영상은 화면 가까이 올 때만 받는다(첫 진입 대역폭을 동기 스크립트·구매 시트에 양보).
   안전: 휴대폰 폭(<768)·/shop_view/만, 아임웹이 먼저 그렸으면 손대지 않음, 우리 노드가 치워지면(탭 전환 재렌더) 즉시 손 뗌.
   끄기: URL에 ?yd_early=0 (검증용) / Header Code 칸의 로더 블록 삭제로 완전 원복. 상태: window.__ydEarlyDetail
   정본: 이 파일(yundiet-footer/early-detail.js) → build.sh가 에셋 저장소 yd-early.js로 복사 → release.sh로 배포 */
(function () {
  try {
    if (window.__ydEarlyDetail) return;
    if (!/^\/shop_view\/?$/.test(location.pathname)) return;
    if (/[?&]yd_early=0/.test(location.search)) return;
    if (!window.fetch || !window.MutationObserver || !window.Promise || !window.URL || !('content' in document.createElement('template'))) return;

    var st = window.__ydEarlyDetail = { v: 9, t0: Math.round(performance.now()) };
    var UP_HOST = 'cdn.imweb.me', OPT_HOST = 'cdn-optimized.imweb.me', UP_PATH = '/upload/';
    var SRCSET_W = [1536, 1280, 1080, 828, 768, 640, 576, 368];
    var PROBE_TIMEOUT = 4000;
    /* 본문 이미지 화면 밀도 상한(0=끔·아임웹과 동일 sizes=100vw). 2면 3배 밀도 폰에서도 2배 밀도 해상도(390폭→828px)를 고른다.
       푸터 bindDetailImageWarm도 2배 상한으로 아래쪽 이미지를 미리 받으므로 주소가 일치한다. 실측(1260): 본문 첫 이미지 4.3→3.6초, 용량 약 절반, 화면상 차이 거의 없음 */
    var DPR_CAP = 2;
    var iOS = /(iPad|iPhone|iPod)/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent));

    var watch = new MutationObserver(check);
    watch.observe(document, { childList: true, subtree: true });
    check();  // 헤드 로더(async)가 늦게 도착해 template가 이미 파싱된 경우
    document.addEventListener('DOMContentLoaded', check);
    setTimeout(function () { if (!st.started) { watch.disconnect(); st.skip = 'no-template-15s'; } }, 15000);

    function check() {
      if (st.started) return;
      var tpl = document.getElementById('prodDetailMobile');
      var box = document.querySelector('._prod_detail_detail_lazy_load_mobile');
      if (!tpl || !box || !tpl.content) return;
      if (!tpl.nextSibling && document.readyState === 'loading') return;  // 파서가 </template>를 지나야 본문이 다 채워진 것
      st.started = Math.round(performance.now());
      watch.disconnect();
      var vw = Math.min(window.innerWidth || 0, document.documentElement.clientWidth || 0);
      st.vw = vw;
      if (!vw || vw >= 768) { st.skip = 'not-mobile-width'; return; }  // 아임웹 is_mobile_width 기준(768)과 동일
      render(tpl, box);
    }

    /* 앞쪽 본문 이미지 N장은 template를 읽는 즉시 '높은 우선순위'로 요청 — 같은 CDN 연결에서 먼저 요청된(안 보이는) 갤러리 사진 뒤에 줄 서지 않게.
       실측(1264): 본문 3번째 이미지 8.6초(갤러리 2.6MB 뒤에 밀림) */
    var FIRST_N = 3;
    var preloads = [];
    function sizesValue() {
      var dpr = window.devicePixelRatio || 1;
      return DPR_CAP && dpr > DPR_CAP ? Math.round(100 * DPR_CAP / dpr) + 'vw' : '100vw';
    }
    function srcsetOf(href) { return SRCSET_W.map(function (w) { return optUrl(href, w).href + ' ' + w + 'w'; }).join(', '); }
    function preloadFirst(imgs) {
      var n = 0;
      for (var i = 0; i < imgs.length && n < FIRST_N; i++) {
        var src;
        try { src = new URL(imgs[i].getAttribute('src') || '', location.href); } catch (e) { continue; }
        if (src.host !== UP_HOST || src.pathname.indexOf(UP_PATH) !== 0) continue;
        imgs[i].setAttribute('data-yd-first', '1');
        var pre = new Image();
        try { pre.fetchPriority = 'high'; } catch (e) {}
        pre.sizes = sizesValue();
        pre.srcset = srcsetOf(src.href);
        pre.src = optUrl(src.href, 1920).href;
        preloads.push(pre);  // 요청이 끝날 때까지 참조 유지
        n++;
      }
      st.first = n;
    }

    /* 본문 이미지 화질 q=80(치수 조회 w=100 제외). 아임웹 CDN 기본 WebP 화질이 매우 높아 같은 828px가 54~65% 가벼워지고
       휴대폰 화면에서 글자·음식 사진 차이가 보이지 않음(2026-10-01 실측). 새 주소라 landing-registry/perf/warm_cdn.py로 미리 데운 뒤 반영 */
    var QUALITY = /[?&]yd_q=0/.test(location.search) ? 0 : 80;  // 끄기: URL ?yd_q=0 (푸터 bindImageQuality와 같은 이름) 또는 상수 0
    function optUrl(src, w) {
      var u = new URL(src);
      u.host = OPT_HOST;
      u.searchParams.set('w', w);
      if (QUALITY && w > 100) u.searchParams.set('q', QUALITY);
      if (/\.gif$/i.test(u.pathname)) u.searchParams.set('f', iOS ? 'gif' : 'webp');
      return u;
    }

    /* 아임웹 site_shop.js setImageWidthHeightBeforeLoad 와 같은 결과를 만든다(속성·스타일·srcset 동일 → 나중 요청도 캐시 적중) */
    function convertImg(img) {
      return new Promise(function (resolve) {
        var raw = img.getAttribute('src') || '';
        var src;
        try { src = new URL(raw, location.href); } catch (e) { return resolve('bad-url'); }
        if (src.host !== UP_HOST || src.pathname.indexOf(UP_PATH) !== 0) {
          img.classList.add('loaded'); img.removeAttribute('height');
          return resolve('not-cdn');
        }
        var probe = optUrl(src.href, 100);
        var settled = false;
        var timer = setTimeout(function () { finish(null); }, PROBE_TIMEOUT);
        fetch(probe.href, { method: 'HEAD' }).then(function (res) {
          var w = res.headers.get('x-amz-meta-original-width'), h = res.headers.get('x-amz-meta-original-height');
          finish(res.ok && w && h ? { w: w, h: h } : null);
        }).catch(function () { finish(null); });

        function finish(meta) {
          if (settled) return; settled = true; clearTimeout(timer);
          var key = probe.pathname.replace(/[^a-z\d]/g, '_');
          var big = optUrl(src.href, 1920);
          if (meta) {
            img.setAttribute('data-' + key, '');
            var sel = 'img[data-' + key + ']';
            var css = document.createElement('style');
            css.innerHTML = sel + ' {opacity:0;transition:opacity 60ms ease-out;} ' + sel + '.loaded {opacity:1;}';
            if (img.parentNode) img.parentNode.insertBefore(css, img.parentNode.firstChild);
            img.style.objectFit = 'cover';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.setAttribute('width', img.getAttribute('width') || meta.w);
            img.setAttribute('height', img.getAttribute('height') || meta.h);
          } else {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.classList.add('loaded');
          }
          img.src = big.href;
          if (img.getAttribute('data-yd-first')) { try { img.fetchPriority = 'high'; } catch (e) {} img.setAttribute('fetchpriority', 'high'); }
          img.sizes = sizesValue();
          img.srcset = srcsetOf(src.href);
          img.loading = 'lazy';
          img.addEventListener('error', function () {
            img.src = img.getAttribute('data-original') || src.href;
            img.classList.add('loaded');
            img.style.removeProperty('object-fit'); img.style.removeProperty('max-width'); img.style.removeProperty('height');
            img.removeAttribute('width'); img.removeAttribute('height'); img.removeAttribute('sizes'); img.removeAttribute('srcset'); img.removeAttribute('loading');
          }, { once: true });
          img.addEventListener('load', function () { img.classList.add('loaded'); }, { once: true });
          resolve(meta ? 'ok' : 'no-meta');
        }
      });
    }

    function deferVideos(root) {
      var vids = root.querySelectorAll('video');
      for (var i = 0; i < vids.length; i++) {
        var v = vids[i];
        if (v.hasAttribute('autoplay')) { v.removeAttribute('autoplay'); v.setAttribute('data-yd-autoplay', '1'); }
        v.setAttribute('data-yd-preload', v.getAttribute('preload') || '');
        v.setAttribute('preload', 'none');
      }
      return vids.length;
    }

    function wakeVideos(box) {
      var vids = box.querySelectorAll('video[data-yd-preload]');
      if (!vids.length) return;
      function wake(v) {
        if (v.getAttribute('data-yd-woken')) return;
        v.setAttribute('data-yd-woken', '1');
        v.setAttribute('preload', v.getAttribute('data-yd-preload') || 'metadata');
        if (v.getAttribute('data-yd-autoplay')) {
          v.autoplay = true; v.setAttribute('autoplay', '');
          v.muted = true;
          try { v.load(); } catch (e) {}
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else {
          try { v.load(); } catch (e) {}
        }
      }
      if (!window.IntersectionObserver) { for (var i = 0; i < vids.length; i++) wake(vids[i]); return; }
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) { wake(e.target); io.unobserve(e.target); } });
      }, { rootMargin: '900px 0px' });
      for (var j = 0; j < vids.length; j++) io.observe(vids[j]);
    }

    function fileOf(u) { return String(u || '').split('?')[0].split('/').pop(); }

    function hasContent(box) {
      for (var n = box.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 1 || (n.nodeType === 3 && /\S/.test(n.nodeValue))) return true;
      }
      return false;
    }

    /* v7~v8: 본문 사진 미리 받기·미리 그리기(사파리·인스타 앱 브라우저 체감 "사진이 늦게 뜬다", 2026-10-01 1265)
       ① WebKit은 지연 로딩(loading=lazy) 사진을 거의 화면에 닿을 때가 돼서야 받는다(크롬은 1,250~2,500px 앞).
          → 화면 아래 AHEAD px 안에 들어오면 loading=eager로 바꿔 즉시 받는다. 페이지 로딩 전 AHEAD_EARLY, 로딩 뒤 AHEAD_LATE.
          v9(2026-10-02 대표 "한 번에 다 받지 말고 스크롤하면서"): 4,000/9,000px → 2,500/4,000px. 9,000px면 휴대폰에서
          본문 대부분(1260 높이 36,000px 중 앞 1/4, 사진 수로는 절반 이상)을 스크롤 전에 받았다. 읽는 속도(초당 약 800px)면 4,000px는 약 5초 앞.
       ② 본문 사진은 한 장이 화면 2~3개 높이(1620×6000 원본)라 받은 뒤에도 화면에 들어올 때 그리기(디코딩)가 걸린다.
          → 화면 아래 1,600px 안에 들어오면 img.decode()로 미리 그려 둔다(메모리 때문에 가까운 것만).
       아임웹이 직접 그린 경우(imweb-first·rollback)도 load 때 한 번 더 걸어 둔다. 끄기 ?yd_ahead=0 */
    var AHEAD_ON = !/[?&]yd_ahead=0(?:&|$)/.test(location.search);
    var AHEAD_EARLY = 2500, AHEAD_LATE = 4000;
    var aheadIO = null, decodeIO = null, aheadPx = 0;
    function promote(im) {
      if (im.getAttribute('loading') === 'lazy') { im.setAttribute('loading', 'eager'); st.promoted = (st.promoted || 0) + 1; }
    }
    function preDecode(im) {
      if (!im.decode) return;
      var go = function () { im.decode().then(function () { st.decoded = (st.decoded || 0) + 1; }).catch(function () {}); };
      if (im.complete && im.naturalWidth) go(); else im.addEventListener('load', go, { once: true });
    }
    function makeAhead(px) {
      if (aheadIO) aheadIO.disconnect();
      aheadPx = px;
      aheadIO = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) { aheadIO.unobserve(e.target); e.target.setAttribute('data-yd-ahead', 'done'); promote(e.target); } });
      }, { rootMargin: '0px 0px ' + px + 'px 0px' });
    }
    function promoteNear(root, px) {
      if (!AHEAD_ON || !window.IntersectionObserver || !root) return;
      if (!aheadIO || (px && px !== aheadPx)) {
        makeAhead(px || aheadPx || AHEAD_EARLY);
        var again = root.querySelectorAll('img[data-yd-ahead="1"]');  // 거리 넓힐 때 아직 안 받은 것 다시 등록
        for (var k = 0; k < again.length; k++) aheadIO.observe(again[k]);
      }
      if (!decodeIO) {
        decodeIO = new IntersectionObserver(function (ents) {
          ents.forEach(function (e) { if (e.isIntersecting) { decodeIO.unobserve(e.target); preDecode(e.target); } });
        }, { rootMargin: '0px 0px 1600px 0px' });
      }
      var imgs = root.querySelectorAll('img:not([data-yd-ahead])');
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].setAttribute('data-yd-ahead', '1');
        aheadIO.observe(imgs[i]);
        decodeIO.observe(imgs[i]);
      }
      st.aheadPx = aheadPx;
    }
    window.addEventListener('load', function () {
      if (st.skip === 'not-mobile-width') return;
      var box = function () { return document.querySelector('._prod_detail_detail_lazy_load_mobile'); };
      promoteNear(box(), AHEAD_LATE);
      setTimeout(function () { promoteNear(box(), AHEAD_LATE); }, 3000);
    });

    function render(tpl, box) {
      var frag = tpl.content.cloneNode(true);
      var kf = document.createElement('style');
      kf.innerHTML = '@keyframes lazyload {0% {opacity: 0;} 50% {opacity: 0.1;} 100% {opacity: 0;}}';
      frag.insertBefore(kf, frag.firstChild);
      st.videos = deferVideos(frag);
      var imgs = frag.querySelectorAll('img');
      st.imgs = imgs.length;
      preloadFirst(imgs);
      st.files = {};
      for (var k = 0; k < imgs.length; k++) st.files[fileOf(imgs[k].getAttribute('src'))] = 1;
      var jobs = [];
      for (var i = 0; i < imgs.length; i++) jobs.push(convertImg(imgs[i]));
      Promise.all(jobs).then(function (res) {
        st.probed = Math.round(performance.now());
        st.probeFail = res.filter(function (r) { return r !== 'ok'; }).length;
        if (hasContent(box)) { st.skip = 'imweb-first'; return; }
        mount(frag, box);
      });
    }

    /* 최상위 노드 구성 서명 — 치수 조회 성공 여부에 따라 달라지는 <style>은 빼고 비교 */
    function signature(nodes) {
      var s = [];
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.nodeName === 'STYLE') continue;
        if (n.nodeType === 3 && !/\S/.test(n.nodeValue)) continue;
        s.push(n.nodeName + (n.nodeType === 1 ? ':' + n.getElementsByTagName('img').length + '/' + n.getElementsByTagName('video').length : ''));
      }
      return s.join(',');
    }

    function mount(frag, box) {
      var ours = Array.prototype.slice.call(frag.childNodes);
      var sig = signature(ours);
      box.appendChild(frag);
      box.setAttribute('data-yd-early', '1');
      st.mounted = Math.round(performance.now());
      st.nodes = ours.length;
      wakeVideos(box);
      promoteNear(box, AHEAD_EARLY);
      /* 아임웹이 initDetail에서 같은 본문 한 벌(스타일 제외 최상위 노드 구성이 같음)을 붙이면 들어오는 즉시 걷어낸다 */
      var guard = new MutationObserver(function (recs) {
        var alive = false;
        for (var i = 0; i < ours.length; i++) if (ours[i].parentNode === box) { alive = true; break; }
        if (!alive) { guard.disconnect(); st.released = 'ours-removed'; return; }
        recs.forEach(function (rec) {
          if (rec.target !== box || !rec.addedNodes.length) return;
          var added = Array.prototype.filter.call(rec.addedNodes, function (n) { return ours.indexOf(n) < 0; });
          var isDup = added.length > 1 && signature(added) === sig;
          if (isDup) {
            added.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
            st.dedup = (st.dedup || 0) + 1;
            st.dedupAt = Math.round(performance.now());
            guard.disconnect();
          }
        });
      });
      guard.observe(box, { childList: true });
      setTimeout(function () { guard.disconnect(); if (!st.dedup) st.guardTimeout = true; }, 90000);

      /* 안전장치: 아임웹 구현이 바뀌어 중복 걷어내기가 빗나가면(본문 이미지가 원본의 2배 가까이) 우리 쪽을 치우고 아임웹 방식으로 복귀 */
      function selfCheck(tag) {
        var all = box.querySelectorAll('img'), n = 0;  // 원본 틀에 있던 파일명만 센다(푸터가 끼워 넣는 이미지는 제외)
        for (var j = 0; j < all.length; j++) if (st.files[fileOf(all[j].getAttribute('src'))]) n++;
        if (st.imgs && n > st.imgs) {
          var removed = 0;
          for (var i = 0; i < ours.length; i++) if (ours[i].parentNode === box) { box.removeChild(ours[i]); removed++; }
          guard.disconnect();
          st.rollback = tag + ':imgs=' + n + '/' + st.imgs + ',removed=' + removed;
        }
      }
      var arm = function () { setTimeout(function () { selfCheck('load+3s'); }, 3000); setTimeout(function () { selfCheck('load+12s'); }, 12000); };
      if (document.readyState === 'complete') arm(); else window.addEventListener('load', arm);
    }
  } catch (err) {
    try { (window.__ydEarlyDetail = window.__ydEarlyDetail || {}).error = String(err && err.message || err); } catch (e) {}
  }
})();

/* ── 먼저 보이는 구매 버튼 줄(v6, 2026-10-01) ──
   문제: 푸터의 '리뷰보기·옵션 보기' 줄은 아임웹 동기 스크립트(약 3MB)가 다 받아지고 옵션 목록을 그린 뒤(DOMContentLoaded)에야 생긴다.
         실측(1265·1264): LTE 약 5.5초, 느린 4G 약 9.5초 동안 화면 아래에 살 수 있는 버튼이 없다(본문은 2~3초에 이미 보임).
   처리: 광고 랜딩·주력 상품(v9부터 675·1198·1232·1125·1214·1233·650 추가)에서는 같은 모양·같은 자리의 버튼 줄을 화면이 처음 그려질 때부터 보여 준다.
         진짜 버튼 줄이 생기면 그 순간 치운다(같은 자리라 바뀌는 것이 안 보임).
         그 전에 누르면 '메뉴를 불러오고 있어요' 창을 띄우고, 준비되는 즉시 진짜 버튼을 대신 눌러 준다(리뷰보기도 같은 방식).
   안전: 휴대폰 폭·/shop_view/·아래 상품만·팝업(iframe) 제외. 옵션 플로우가 안 뜨는 경우(네이티브 복원·30초 초과)엔 흔적 없이 치운다.
   끄기: URL ?yd_dock=0 (또는 ?yd_early=0) / 상태 window.__ydEarlyDock */
(function () {
  try {
    if (window.__ydEarlyDock) return;
    if (window.top !== window) return;
    if (!/^\/shop_view\/?$/.test(location.pathname)) return;
    if (/[?&](yd_dock|yd_early)=0(?:&|$)/.test(location.search)) return;
    var m = location.search.match(/[?&]idx=(\d+)/);
    var IDS = { '672': 1, '1218': 1, '1260': 1, '1262': 1, '1263': 1, '1264': 1, '1265': 1, '1266': 1,  // 광고 랜딩(옵션 플로우 확인된 상품만)
      '675': 1, '1198': 1, '1232': 1, '1125': 1, '1214': 1, '1233': 1, '650': 1 };  // v9(2026-10-02) 주력 상품 — 라이브에서 '리뷰보기·옵션 보기' 줄 확인
    if (!m || !IDS[m[1]]) return;
    var ds = window.__ydEarlyDock = { v: 1, t0: Math.round(performance.now()) };
    var dock = null, wait = null, pending = null, timer = 0, built = false;
    function now() { return Math.round(performance.now()); }

    /* 뷰포트 메타가 읽힌 뒤(body 생성 후)에 폭을 판단한다 — head 단계의 innerWidth는 980일 수 있다 */
    function tryBuild() {
      if (built || !document.body) return false;
      built = true;
      var vw = Math.min(window.innerWidth || 0, document.documentElement.clientWidth || 0);
      ds.vw = vw;
      if (!vw || vw >= 768) { ds.skip = 'not-mobile-width'; return true; }
      if (realOpen()) { ds.skip = 'real-first'; return true; }
      var css = document.createElement('style');
      css.id = 'yd-early-dock-css';
      css.textContent =
        '#yd-early-dock{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translateX(-50%);width:calc(100% - 18px);z-index:16000;display:flex;gap:8px;align-items:stretch;padding:9px;margin:0;box-sizing:border-box;border-radius:12.6px;font-family:"Pretendard Variable",Pretendard,"Noto Sans KR","Apple SD Gothic Neo",-apple-system,system-ui,sans-serif;}' +
        '#yd-early-dock button{-webkit-appearance:none;appearance:none;margin:0;box-sizing:border-box;min-height:52px;font-family:inherit;font-size:16px;line-height:normal;letter-spacing:-0.02em;cursor:pointer;-webkit-tap-highlight-color:transparent;}' +
        '#yd-early-dock .yd-ed-review{flex:4 1 0;padding:1px 6px;border:1px solid #dde0d8;border-radius:14px;background:#fff;color:#525a31;font-weight:850;}' +
        '#yd-early-dock .yd-ed-open{flex:6 1 0;display:flex;align-items:center;justify-content:center;padding:0 17px;border:0;border-radius:12.6px;background:#3b4024;color:#fff;font-weight:700;}' +
        '#yd-early-wait{position:fixed;left:0;right:0;top:0;bottom:0;z-index:16001;display:flex;align-items:flex-end;background:rgba(20,22,15,.42);font-family:"Pretendard Variable",Pretendard,"Noto Sans KR","Apple SD Gothic Neo",-apple-system,system-ui,sans-serif;}' +
        '#yd-early-wait .yd-ed-panel{width:100%;box-sizing:border-box;padding:30px 20px calc(22px + env(safe-area-inset-bottom));border-radius:24px 24px 0 0;background:#fff;text-align:center;color:#151b16;}' +
        '#yd-early-wait .yd-ed-spin{width:34px;height:34px;margin:0 auto 16px;border:3px solid #e3e6dc;border-top-color:#3b4024;border-radius:50%;animation:yd-ed-spin .8s linear infinite;}' +
        '#yd-early-wait strong{display:block;font-size:18px;font-weight:700;letter-spacing:-0.02em;}' +
        '#yd-early-wait p{margin:8px 0 18px;font-size:14px;color:#6b7065;}' +
        '#yd-early-wait button{-webkit-appearance:none;appearance:none;width:100%;min-height:50px;border:1px solid #dde0d8;border-radius:14px;background:#fff;color:#525a31;font-family:inherit;font-size:16px;font-weight:700;}' +
        '@keyframes yd-ed-spin{to{transform:rotate(360deg);}}';
      document.head.appendChild(css);
      dock = document.createElement('div');
      dock.id = 'yd-early-dock';
      dock.innerHTML = '<button type="button" class="yd-ed-review">리뷰보기</button><button type="button" class="yd-ed-open"><span>옵션 보기</span></button>';
      dock.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('button') : null;
        if (!b) return;
        e.preventDefault();
        pending = b.className.indexOf('yd-ed-review') >= 0 ? 'review' : 'open';
        ds.tap = pending; ds.tapAt = now();
        showWait();
        poll();
      });
      document.documentElement.appendChild(dock);
      ds.shown = now();
      timer = setInterval(poll, 120);
      setTimeout(function () { finish('timeout-30s'); }, 30000);
      return true;
    }

    function realRoot() { return document.getElementById('yd-bs-root'); }
    function realOpen() { var r = realRoot(); return r && r.querySelector('.yd-bs-open'); }

    function showWait() {
      if (wait) return;
      wait = document.createElement('div');
      wait.id = 'yd-early-wait';
      wait.setAttribute('role', 'dialog');
      wait.setAttribute('aria-modal', 'true');
      wait.innerHTML = '<div class="yd-ed-panel"><div class="yd-ed-spin"></div><strong>' + (pending === 'review' ? '리뷰를 불러오고 있어요' : '메뉴를 불러오고 있어요') +
        '</strong><p>잠시만 기다려 주세요. 준비되면 바로 열립니다.</p><button type="button">닫기</button></div>';
      wait.addEventListener('click', function (e) {
        if (e.target === wait || (e.target.tagName === 'BUTTON')) { pending = null; ds.cancel = now(); hideWait(); }
      });
      document.documentElement.appendChild(wait);
    }
    function hideWait() { if (wait && wait.parentNode) wait.parentNode.removeChild(wait); wait = null; }

    function poll() {
      if (!dock) return;
      var real = realOpen();
      if (real) {
        var todo = pending;
        removeDock();
        ds.handoff = now();
        if (todo) {
          var target = todo === 'review' ? realRoot().querySelector('.yd-bs-review-btn') : real;
          ds.forwarded = todo;
          try { (target || real).click(); } catch (e) { ds.forwardError = String(e && e.message || e); }
        }
        setTimeout(hideWait, 60);
        return;
      }
      /* 옵션 플로우가 안 뜨는 상품으로 판정됐거나(네이티브 UI 복원) 플로우 상자가 사라진 경우 */
      if (document.documentElement.classList.contains('yd-bs-native-visible')) finish('native-visible');
      else if (document.readyState === 'complete' && !realRoot() && ds.loadSeen && now() - ds.loadSeen > 4000) finish('no-flow-after-load');
      else if (document.readyState === 'complete' && !ds.loadSeen) ds.loadSeen = now();
    }
    function removeDock() {
      if (timer) { clearInterval(timer); timer = 0; }
      if (dock && dock.parentNode) dock.parentNode.removeChild(dock);
      dock = null;
    }
    function finish(why) {
      if (!dock) return;
      ds.gaveUp = why; ds.gaveUpAt = now();
      pending = null;
      removeDock();
      hideWait();
    }

    if (!tryBuild()) {
      var mo = new MutationObserver(function () { if (tryBuild()) mo.disconnect(); });
      mo.observe(document.documentElement, { childList: true });
      document.addEventListener('DOMContentLoaded', function () { if (tryBuild()) mo.disconnect(); });
    }
  } catch (err) {
    try { (window.__ydEarlyDock = window.__ydEarlyDock || {}).error = String(err && err.message || err); } catch (e) {}
  }
})();
