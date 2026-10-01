/* 윤식단 상세 본문 선행 렌더 — v3 2026-10-01 (아임웹 Header Code 칸의 로더가 CDN yd-early.js로 불러온다)
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

    var st = window.__ydEarlyDetail = { v: 3, t0: Math.round(performance.now()) };
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

    function optUrl(src, w) {
      var u = new URL(src);
      u.host = OPT_HOST;
      u.searchParams.set('w', w);
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
          var dpr = window.devicePixelRatio || 1;
          img.sizes = DPR_CAP && dpr > DPR_CAP ? Math.round(100 * DPR_CAP / dpr) + 'vw' : '100vw';
          img.srcset = SRCSET_W.map(function (w) { return optUrl(src.href, w).href + ' ' + w + 'w'; }).join(', ');
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

    function render(tpl, box) {
      var frag = tpl.content.cloneNode(true);
      var kf = document.createElement('style');
      kf.innerHTML = '@keyframes lazyload {0% {opacity: 0;} 50% {opacity: 0.1;} 100% {opacity: 0;}}';
      frag.insertBefore(kf, frag.firstChild);
      st.videos = deferVideos(frag);
      var imgs = frag.querySelectorAll('img');
      st.imgs = imgs.length;
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
