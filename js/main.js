(function () {
  "use strict";
  var RM = false;
  var doc = document, root = doc.documentElement;
  var PAUSED = false;
  var vids = [];
  var clips = window.HERO_CLIPS || [];

  var onScreen = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target; v.__vis = e.isIntersecting;
      if (v.__vis) tryPlay(v); else { try { v.pause(); } catch (err) {} }
    });
  }, { rootMargin: "15% 0px" }) : null;
  function tryPlay(v) {
    if (PAUSED || v.__vis === false) return;
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
    var p;
    try { p = v.play(); } catch (e) {}
    if (p && p.catch) p.catch(function () {});
  }
  function ply(v) {
    if (v.__ply) { tryPlay(v); return; }
    v.__ply = true; vids.push(v);
    if (onScreen) onScreen.observe(v);
    tryPlay(v);
    [250, 750, 1500, 3000].forEach(function (ms) { setTimeout(function () { if (v.paused) tryPlay(v); }, ms); });
    ["loadeddata", "canplay", "stalled", "suspend", "pause"].forEach(function (ev) {
      v.addEventListener(ev, function () { if (v.paused && !PAUSED) tryPlay(v); });
    });
  }
  ["pointerdown", "keydown", "wheel", "scroll", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { if (!PAUSED) vids.forEach(tryPlay); }, { passive: true, once: true, capture: true });
  });
  setInterval(function () {
    if (PAUSED) return;
    vids.forEach(function (v) { if (v.paused || v.ended) tryPlay(v); });
  }, 1000);


  var stage = doc.getElementById("heroStage");
  var h1 = doc.getElementById("heroH1");
  var clip = clips[0];
  var topbar = doc.getElementById("topbar");
  var heroMode = null, heroVideo = null;
  var BAR = function () { return topbar ? topbar.offsetHeight : 0; };

  function wantMode() { return (window.innerWidth / window.innerHeight >= 0.9) ? "wide" : "tall"; }
  function splitLetters(el, wi) {
    if (el.__split) return; el.__split = true;
    if (el.querySelector("svg")) { el.style.setProperty("--wi", wi); return; }
    var t = el.textContent; el.textContent = ""; var i = 0;
    t.split("").forEach(function (ch) {
      var c = doc.createElement("span"); c.className = "c"; c.style.setProperty("--i", i++);
      c.textContent = ch === " " ? "\u00a0" : ch; el.appendChild(c);
    });
    el.style.setProperty("--wi", wi);
  }
  function buildHero() {
    var mode = wantMode();
    if (mode === heroMode || !clip) return;
    heroMode = mode; stage.setAttribute("data-mode", mode); if (stage.parentNode) stage.parentNode.setAttribute("data-mode", mode);
    var def = clip[mode];
    if (heroVideo) { var i = vids.indexOf(heroVideo); if (i > -1) vids.splice(i, 1); if (onScreen) onScreen.unobserve(heroVideo); try { heroVideo.pause(); } catch (e) {} heroVideo.removeAttribute("src"); heroVideo.load(); if (heroVideo.parentNode) heroVideo.parentNode.removeChild(heroVideo); }
    var v = doc.createElement("video");
    v.id = "heroVideo"; v.className = "film-el"; v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto";
    v.src = def.src;
    stage.appendChild(v); heroVideo = v; ply(v);
  }
  var PANELS = [[0, 638], [641, 1279], [1282, 1920]];
  var heroSub = doc.getElementById("heroSub");
  function placeSub() {
    if (!heroSub) return;
    var W = stage.clientWidth, sw = heroSub.offsetWidth, x;
    if (heroMode === "tall") {
      var w3 = h1.querySelector(".w3"), hr = stage.parentNode.getBoundingClientRect();
      if (w3) heroSub.style.top = Math.round(w3.getBoundingClientRect().bottom - hr.top + Math.max(16, parseFloat(getComputedStyle(h1).fontSize) * 0.26)) + "px";
      x = (W - sw) / 2;
    } else {
      heroSub.style.top = "";
      var w1 = h1.querySelector(".w1"), pl = parseFloat(w1.style.getPropertyValue("--pl")), pw = parseFloat(w1.style.getPropertyValue("--pw")), pad = Math.min(28, Math.max(14, W * 0.015));
      x = isNaN(pl) ? pad : Math.max(pad, Math.min(W - pad - sw, pl + pw / 2 - sw / 2));
    }
    heroSub.style.left = Math.round(x) + "px";
  }
  function placeWords() {
    var ws = h1.querySelectorAll(".w");
    if (heroMode !== "wide") { h1.style.fontSize = ""; ws.forEach(function (w) { w.style.removeProperty("--pl"); w.style.removeProperty("--pw"); }); placeSub(); return; }
    var W = stage.clientWidth, H = stage.clientHeight, dw = Math.max(W, H * 16 / 9), sc = dw / 1920, off = (dw - W) / 2;
    ws.forEach(function (w, i) {
      var a = Math.max(0, PANELS[i][0] * sc - off), b = Math.min(W, PANELS[i][1] * sc - off);
      w.style.setProperty("--pl", a.toFixed(1) + "px"); w.style.setProperty("--pw", Math.max(0, b - a).toFixed(1) + "px");
    });
    h1.style.fontSize = "";
    var fs = parseFloat(getComputedStyle(h1).fontSize), worst = 1;
    ws.forEach(function (w) { var r = doc.createRange(); r.selectNodeContents(w); var tw = r.getBoundingClientRect().width, room = parseFloat(w.style.getPropertyValue("--pw")) - 2 * Math.min(28, Math.max(14, W * 0.015)); if (tw > room) worst = Math.min(worst, room / tw); });
    if (worst < 1) h1.style.fontSize = (fs * worst * 0.97).toFixed(1) + "px";
    placeSub();
  }
  Array.prototype.forEach.call(h1.querySelectorAll(".w"), function (w, n) { splitLetters(w, n); });
  buildHero(); placeWords();
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(placeWords);
  requestAnimationFrame(function () { requestAnimationFrame(function () { h1.classList.add("go"); }); });
  window.addEventListener("resize", function () { buildHero(); placeWords(); });
  function showAllWords() { h1.classList.add("go"); finishHero(); }

  var heroWords = [], heroWrote = false;
  Array.prototype.forEach.call(h1.querySelectorAll(".hw"), function (s) {
    var ps = Array.prototype.slice.call(s.querySelectorAll(".hw__s path"));
    var f = doc.createElementNS("http://www.w3.org/2000/svg", "path"); f.setAttribute("class", "hw__f");
    f.setAttribute("d", ps.map(function (p) { return p.getAttribute("d"); }).join("")); s.insertBefore(f, s.firstChild);
    heroWords.push({ s: s, w: s.parentNode, ps: ps, tip: s.querySelector(".hw__tip"), done: false });
  });
  function inkWord(o) {
    if (o.done) return; o.done = true;
    o.ps.forEach(function (p) { p.style.strokeDasharray = "none"; p.style.visibility = "visible"; });
    o.tip.style.opacity = 0; o.s.classList.add("done"); o.w.classList.add("inked");
  }
  function finishHero() { heroWrote = true; heroWords.forEach(inkWord); }
  function writeHero() {
    if (heroWrote || !heroWords.length) return; heroWrote = true;
    if (PAUSED) { heroWords.forEach(inkWord); return; }
    var all = 0, at = 0, t0 = 0;
    heroWords.forEach(function (o) {
      o.L = o.ps.map(function (p) { return p.getTotalLength(); });
      o.T = o.L.reduce(function (a, b) { return a + b; }, 0); all += o.T;
      o.ps.forEach(function (p, i) { p.style.strokeDasharray = "0 " + (o.L[i] + 1); });
    });
    heroWords.forEach(function (o) { o.dur = 450 + 2600 * o.T / all; o.at = at; at += o.dur * 0.82; });
    function ease(p) { return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
    function step(n) {
      if (PAUSED) { heroWords.forEach(inkWord); return; }
      if (!t0) t0 = n;
      var live = false;
      heroWords.forEach(function (o) {
        if (o.done) return;
        var p = Math.max(0, Math.min(1, (n - t0 - o.at) / o.dur));
        if (p >= 1) { inkWord(o); return; }
        live = true;
        var x = o.T * (.15 * p + .85 * ease(p)), acc = 0, tp = null;
        for (var i = 0; i < o.ps.length; i++) {
          var v = Math.max(0, Math.min(o.L[i], x - acc));
          o.ps[i].style.strokeDasharray = v + " " + (o.L[i] + 1); o.ps[i].style.visibility = v > 0 ? "visible" : "hidden";
          if (!tp && v > 0 && v < o.L[i]) tp = o.ps[i].getPointAtLength(v);
          acc += o.L[i];
        }
        if (tp) { o.tip.setAttribute("cx", tp.x); o.tip.setAttribute("cy", tp.y); }
        o.tip.style.opacity = tp ? 1 : 0;
      });
      if (live) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  setTimeout(writeHero, 300);

  var lazies = Array.prototype.slice.call(doc.querySelectorAll("video[data-src]"));
  lazies.forEach(function (v) {
    v.style.setProperty("--fx", Math.round(parseFloat(v.getAttribute("data-focus") || "0.5") * 100) + "%");
  });
  var phone = window.matchMedia ? window.matchMedia("(max-width: 700px)").matches : false;
  function startLazy(v) {
    if (!v.getAttribute("src")) { v.setAttribute("src", (phone && v.getAttribute("data-src-phone")) || v.getAttribute("data-src")); v.preload = "auto"; }
    ply(v);
  }
  if ("IntersectionObserver" in window) {
    var lio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { startLazy(e.target); lio.unobserve(e.target); } });
    }, { rootMargin: "120% 0px" });
    lazies.forEach(function (v) { lio.observe(v); });
  } else lazies.forEach(startLazy);
  setTimeout(function () { lazies.forEach(function (v) { if (!v.getAttribute("src")) startLazy(v); }); }, 4000);
  var svg = doc.getElementById("leafSvg"), leafSec = doc.getElementById("leaf");
  var NS = "http://www.w3.org/2000/svg";
  var parts = [];
  function mk(tag, attrs, parent) { var e = doc.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; }
  function buildLeaf() {
    var cx = 150, tipY = 14, baseY = 420, L = baseY - tipY, W = 122;
    function half(t) { return W * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.88); }
    var N = 34, left = [], right = [];
    for (var i = 0; i <= N; i++) {
      var t = i / N, y = tipY + L * t, tooth = (i % 2 === 0) ? 1 : 0.9, wr = half(t) * tooth, wl = half(t) * (i % 2 === 0 ? 1 : 0.9) * 0.95;
      right.push([cx + wr, y]); left.push([cx - wl, y + (i % 2 ? 3 : 0)]);
    }
    var d = "M" + cx + "," + tipY;
    right.forEach(function (p, i) { if (i) d += " L" + p[0].toFixed(1) + "," + p[1].toFixed(1); });
    d += " L" + cx + "," + baseY;
    for (var j = left.length - 2; j >= 0; j--) d += " L" + left[j][0].toFixed(1) + "," + left[j][1].toFixed(1);
    d += " Z";
    var defs = mk("defs", {}), cp = mk("clipPath", { id: "leafClip" }, defs); mk("path", { d: d }, cp);
    var g = mk("g", { "clip-path": "url(#leafClip)" });
    var fill = mk("rect", { x: 0, y: 0, width: 300, height: 440, "class": "fillr" }, g);
    fill.style.transformBox = "fill-box";
    var o = mk("path", { d: d, "class": "ln", pathLength: 1 });
    var stem = mk("path", { d: "M" + cx + "," + (baseY - 6) + " C" + (cx - 4) + "," + (baseY + 24) + " " + (cx + 12) + "," + (baseY + 50) + " " + (cx + 6) + "," + (baseY + 78), "class": "ln", pathLength: 1 });
    var rib = mk("path", { d: "M" + cx + "," + (tipY + 4) + " L" + cx + "," + (baseY - 4), "class": "ln", pathLength: 1 });
    var veins = [];
    for (var k = 0; k < 8; k++) {
      var t0 = 0.16 + k * 0.095, y0 = tipY + L * t0, t1 = Math.max(0.04, t0 - 0.12), y1 = tipY + L * t1, w1 = half(t1) * 0.9;
      [-1, 1].forEach(function (s) {
        var v = mk("path", { d: "M" + cx + "," + y0.toFixed(1) + " Q" + (cx + s * w1 * 0.55).toFixed(1) + "," + (y0 - 6).toFixed(1) + " " + (cx + s * w1).toFixed(1) + "," + y1.toFixed(1), "class": "ln", pathLength: 1 });
        veins.push({ el: v, a: 0.42 + k * 0.045, b: 0.42 + k * 0.045 + 0.2 });
      });
    }
    parts = [{ el: o, a: 0, b: 0.4 }, { el: rib, a: 0.28, b: 0.5 }, { el: stem, a: 0.4, b: 0.55 }].concat(veins);
    parts.forEach(function (p) { p.el.style.strokeDasharray = "1 1"; p.el.style.strokeDashoffset = "0"; });
    parts.fill = fill;
    parts.fillA = 0.84; parts.fillB = 1;
  }
  function paintLeaf(p) {
    parts.forEach(function (q) {
      var k = Math.min(1, Math.max(0, (p - q.a) / (q.b - q.a)));
      q.el.style.strokeDashoffset = String(1 - k);
    });
    var f = Math.min(1, Math.max(0, (p - parts.fillA) / (parts.fillB - parts.fillA)));
    parts.fill.style.transform = "translateY(" + ((1 - f) * 100) + "%)";
  }
  function clamp01(x) { return Math.min(1, Math.max(0, x)); }
  function secProgress(sec) {
    var r = sec.getBoundingClientRect(), bar = BAR(), span = r.height - (window.innerHeight - bar);
    return span > 0 ? clamp01((bar - r.top) / span) : 0;
  }
  var leafP = 0, leafRun = false;
  function leafProgress() { return leafP; }
  function drawLeaf() {
    if (leafRun || !parts.length) return; leafRun = true;
    var t0 = performance.now(), D = 2400;
    (function step(now) {
      if (PAUSED) { leafP = 1; paintLeaf(1); return; }
      var k = Math.min(1, (now - t0) / D); leafP = 1 - Math.pow(1 - k, 2.2); paintLeaf(leafP);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  var scrubs = [];
  function makeScrub(sec, vid, fallback, onP) {
    var vl = Array.isArray(vid) ? vid : [vid], v0 = vl[0];
    var o = { sec: sec, vid: v0, cur: 0, run: false };
    o.tick = function () {
      o.run = false;
      if (!v0 || !sec) return;
      var p = secProgress(sec), d = (v0.duration || fallback) - 0.05, target = p * d;
      o.cur += (target - o.cur) * 0.22; if (Math.abs(target - o.cur) < 0.004) o.cur = target;
      vl.forEach(function (vv) { if (vv && vv.readyState >= 1 && !vv.seeking && Math.abs(vv.currentTime - o.cur) > 0.012) { try { vv.currentTime = o.cur; } catch (e) {} } });
      if (onP) onP(p);
      if (Math.abs(target - o.cur) > 0.004) { o.run = true; requestAnimationFrame(o.tick); }
    };
    o.kick = function () { if (!o.run) { o.run = true; requestAnimationFrame(o.tick); } };
    vl.forEach(function (vv) { if (vv) { vv.pause(); vv.addEventListener("loadedmetadata", o.kick); vv.addEventListener("seeked", o.kick); vv.addEventListener("loadeddata", o.kick); } });
    scrubs.push(o); return o;
  }
  var scSec = doc.getElementById("scrub"), sv = doc.getElementById("scrubVideo"), svB = doc.getElementById("scrubVideoB");
  var scBar = doc.getElementById("scBar"), hlFill = doc.getElementById("hlFill");
  [sv, svB].forEach(function (v) { if (v) ply(v); });
  if (leafSec) {
    if ("IntersectionObserver" in window) {
      var lfIO = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { drawLeaf(); lfIO.disconnect(); } }); }, { threshold: 0.5 });
      lfIO.observe(doc.getElementById("leafSvg") || leafSec);
    } else drawLeaf();
  }

  var stmtSec = doc.getElementById("stmt"), stmtLine = stmtSec && stmtSec.querySelector(".stmt__line");
  if (stmtLine && !stmtLine.__split) {
    stmtLine.__split = true; var words = stmtLine.textContent.split(" "), n = 0; stmtLine.textContent = "";
    words.forEach(function (wd, wi) {
      var sw = doc.createElement("span"); sw.className = "sw"; sw.setAttribute("aria-hidden", "true");
      wd.split("").forEach(function (ch) { var c = doc.createElement("span"); c.className = "c"; c.style.setProperty("--i", n++); c.textContent = ch; sw.appendChild(c); });
      stmtLine.appendChild(sw); if (wi < words.length - 1) stmtLine.appendChild(doc.createTextNode(" "));
    });
  }
  var sig = stmtSec && stmtSec.querySelector(".sig"), sigRun = false;
  if (sig) Array.prototype.forEach.call(sig.querySelectorAll(".sig__w"), function (s) {
    var d = Array.prototype.map.call(s.querySelectorAll(".sig__s path"), function (p) { return p.getAttribute("d"); }).join("");
    var f = doc.createElementNS("http://www.w3.org/2000/svg", "path"); f.setAttribute("class", "sig__f"); f.setAttribute("d", d); s.insertBefore(f, s.firstChild);
  });
  function drawSig() {
    if (!sig || sigRun) return; sigRun = true;
    var ps = [].slice.call(sig.querySelectorAll(".sig__s path")), tips = [].slice.call(sig.querySelectorAll(".sig__tip")), L = [], T = 0, t0 = 0, DUR = 4200;
    ps.forEach(function (p) { var l = p.getTotalLength(); L.push(l); T += l; p.style.strokeDasharray = "0 " + (l + 1); });
    function set(x) {
      var acc = 0, tp = null, ts = null;
      for (var i = 0; i < ps.length; i++) {
        var v = Math.max(0, Math.min(L[i], x - acc));
        ps[i].style.strokeDasharray = v + " " + (L[i] + 1); ps[i].style.visibility = v > 0 ? "visible" : "hidden";
        if (!tp && v > 0 && v < L[i]) { tp = ps[i].getPointAtLength(v); ts = ps[i].ownerSVGElement; }
        acc += L[i];
      }
      tips.forEach(function (c) { var on = !!tp && c.ownerSVGElement === ts; if (on) { c.setAttribute("cx", tp.x); c.setAttribute("cy", tp.y); } c.style.opacity = on ? 1 : 0; });
    }
    function done() { set(T); tips.forEach(function (c) { c.style.opacity = 0; }); sig.classList.add("done"); }
    function ease(p) { return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
    function step(n) { if (PAUSED) { done(); return; } if (!t0) t0 = n; var p = Math.min(1, (n - t0) / DUR); set(T * (.15 * p + .85 * ease(p))); if (p < 1) requestAnimationFrame(step); else done(); }
    if (PAUSED) done(); else requestAnimationFrame(step);
  }
  function inkStmt() { if (!stmtSec) return; stmtSec.classList.add("ink"); setTimeout(drawSig, 900); }
  if (stmtSec) {
    if ("IntersectionObserver" in window) {
      var inkIO = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { inkStmt(); inkIO.disconnect(); } }); }, { threshold: 0.45 });
      inkIO.observe(stmtLine || stmtSec);
    } else inkStmt();
  }

  function pageProgress() { var h = doc.documentElement.scrollHeight - window.innerHeight; return h > 0 ? clamp01(window.scrollY / h) : 0; }
  function paintHL() { if (hlFill) hlFill.style.transform = "translateY(" + ((1 - (PAUSED ? 1 : pageProgress())) * 32).toFixed(1) + "px)"; }
  var heroSec = doc.getElementById("top");
  function paintBar() { if (topbar && heroSec) topbar.classList.toggle("solid", window.scrollY > heroSec.offsetHeight - BAR() - 24); }

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; paintBar(); paintHL(); paintNav(); scrubs.forEach(function (o) { o.kick(); }); checkBottom(); });
  }
  if (svg && leafSec) { buildLeaf(); paintLeaf(leafProgress()); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  var navLinks = Array.prototype.slice.call(doc.querySelectorAll("#dnav a"));
  var navSecs = navLinks.map(function (a) { return doc.getElementById(a.getAttribute("href").slice(1)); });
  function paintNav() {
    if (!navLinks.length) return;
    var line = BAR() + window.innerHeight * 0.35, k = -1;
    navSecs.forEach(function (s, i) { if (s) { var r = s.getBoundingClientRect(); if (r.top <= line && r.bottom > line) k = i; } });
    navLinks.forEach(function (a, i) { a.classList.toggle("on", i === k); if (i === k) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    if (bookBtn && sendSec) { var sr = sendSec.getBoundingClientRect(); bookBtn.classList.toggle("here", sr.top <= line); }
  }
  var bookBtn = doc.querySelector(".top .btn--leaf"), sendSec = doc.getElementById("send");
  paintBar(); paintHL(); paintNav(); scrubs.forEach(function (o) { o.kick(); });

  var strip = doc.getElementById("strip"), wBar = doc.getElementById("wBar");
  if (strip) {
    var drag = null, moved = 0;
    var stripBar = function () {
      var m = strip.scrollWidth - strip.clientWidth, vis = strip.clientWidth / strip.scrollWidth;
      if (wBar) { wBar.style.width = (vis * 100).toFixed(1) + "%"; wBar.style.left = ((m > 0 ? strip.scrollLeft / m : 0) * (1 - vis) * 100).toFixed(1) + "%"; }
    };
    strip.addEventListener("scroll", stripBar, { passive: true }); window.addEventListener("resize", stripBar); stripBar();
    strip.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; drag = { x: e.clientX, l: strip.scrollLeft }; moved = 0; });
    window.addEventListener("pointermove", function (e) {
      if (!drag) return; var dx = e.clientX - drag.x; moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) { strip.classList.add("drag"); strip.scrollLeft = drag.l - dx; }
    });
    window.addEventListener("pointerup", function () { if (drag) { drag = null; setTimeout(function () { strip.classList.remove("drag"); }, 0); } });
    var stops = function () { var its = strip.querySelectorAll(".strip__it"), o = its.length ? its[0].offsetLeft : 0, m = strip.scrollWidth - strip.clientWidth; return Array.prototype.map.call(its, function (it) { return Math.min(m, it.offsetLeft - o); }); };
    var nearest = function (st) { var k = 0; st.forEach(function (v, i) { if (Math.abs(v - strip.scrollLeft) < Math.abs(st[k] - strip.scrollLeft)) k = i; }); return k; };
    var by = function (dir) {
      swipe0 = null;
      var st = stops(), x = strip.scrollLeft, t;
      var k = nearest(st); t = st[Math.max(0, Math.min(st.length - 1, k + dir))];
      strip.scrollTo({ left: t, behavior: "smooth" });
    };
    var swipe0 = null;
    strip.addEventListener("touchstart", function () { if (strip.clientWidth < 700) swipe0 = nearest(stops()); }, { passive: true });
    strip.addEventListener("scroll", function () {
      if (swipe0 === null || strip.clientWidth >= 700) return;
      var st = stops(), lo = st[Math.max(0, swipe0 - 1)], hi = st[Math.min(st.length - 1, swipe0 + 1)];
      if (strip.scrollLeft > hi + 1) strip.scrollLeft = hi; else if (strip.scrollLeft < lo - 1) strip.scrollLeft = lo;
      clearTimeout(swipeT); swipeT = setTimeout(settle, 160);
    }, { passive: true });
    var swipeT = 0, touching = false;
    strip.addEventListener("touchstart", function () { touching = true; }, { passive: true });
    strip.addEventListener("touchend", function () { touching = false; clearTimeout(swipeT); swipeT = setTimeout(settle, 160); }, { passive: true });
    var settle = function () {
      if (touching || swipe0 === null) return;
      var st = stops(), k = nearest(st), lo = Math.max(0, swipe0 - 1), hi = Math.min(st.length - 1, swipe0 + 1);
      k = Math.max(lo, Math.min(hi, k));
      if (Math.abs(strip.scrollLeft - st[k]) > 1) strip.scrollTo({ left: st[k], behavior: "smooth" });
      else swipe0 = null;
    };
    var pv = doc.getElementById("wPrev"), nx = doc.getElementById("wNext");
    if (pv) pv.addEventListener("click", function () { by(-1); });
    if (nx) nx.addEventListener("click", function () { by(1); });
    strip.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { by(1); e.preventDefault(); } if (e.key === "ArrowLeft") { by(-1); e.preventDefault(); } });
    strip.addEventListener("click", function (e) {
      var b = e.target.closest(".strip__it"); if (!b || moved > 5) return;
      openViewer(b);
    });
  }

  var lb = doc.getElementById("lb"), lbImg = doc.getElementById("lbImg"), lbCap = doc.getElementById("lbCap"), lbN = doc.getElementById("lbN"), lbStage = doc.getElementById("lbStage");
  var lbPrev = doc.getElementById("lbPrev"), lbNext = doc.getElementById("lbNext"), lbZoom = doc.getElementById("lbZoom"), lbSet = [], lbAt = 0, lbPan = null, lbPanned = false, lbTouch = null;
  function lbItem(el) {
    var im = el.querySelector("img"), cap = el.querySelector(".strip__cap") || el.parentNode.querySelector("span");
    return { src: el.getAttribute("data-full"), alt: im ? im.alt : "", cap: cap ? cap.textContent.trim() : "" };
  }
  function lbZoomOff() { lb.classList.remove("zoomed"); lbImg.style.width = ""; lbZoom.textContent = "Zoom In"; lbZoom.setAttribute("aria-pressed", "false"); }
  function lbShow(i) {
    lbAt = Math.max(0, Math.min(lbSet.length - 1, i)); var it = lbSet[lbAt];
    lbZoomOff(); lbImg.src = it.src; lbImg.alt = it.alt; lbCap.textContent = it.cap;
    lbN.textContent = (lbAt + 1) + " / " + lbSet.length;
    lbPrev.disabled = lbAt === 0; lbNext.disabled = lbAt === lbSet.length - 1;
  }
  function openViewer(el) {
    var els = Array.prototype.slice.call(el.closest("[data-gallery]").querySelectorAll("[data-full]"));
    lbSet = els.map(lbItem); lbShow(els.indexOf(el));
    root.classList.add("lb-open");
    if (lb.showModal) lb.showModal(); else lb.setAttribute("open", "");
  }
  function lbToggleZoom(e) {
    if (lb.classList.contains("zoomed")) { lbZoomOff(); return; }
    var r = lbImg.getBoundingClientRect(); if (!r.width) return;
    var k = Math.max(1.6, Math.min(2.5, (lbImg.naturalWidth || r.width) / r.width));
    var fx = e ? (e.clientX - r.left) / r.width : .5, fy = e ? (e.clientY - r.top) / r.height : .5;
    lb.classList.add("zoomed"); lbImg.style.width = Math.round(r.width * k) + "px";
    lbZoom.textContent = "Zoom Out"; lbZoom.setAttribute("aria-pressed", "true");
    lbStage.scrollLeft = lbImg.offsetLeft + lbImg.offsetWidth * fx - lbStage.clientWidth / 2;
    lbStage.scrollTop = lbImg.offsetTop + lbImg.offsetHeight * fy - lbStage.clientHeight / 2;
  }
  Array.prototype.forEach.call(doc.querySelectorAll(".heal__zoom"), function (b) { b.addEventListener("click", function () { openViewer(b); }); });
  doc.getElementById("lbX").addEventListener("click", function () { lb.close(); });
  lbPrev.addEventListener("click", function () { lbShow(lbAt - 1); });
  lbNext.addEventListener("click", function () { lbShow(lbAt + 1); });
  lbZoom.addEventListener("click", function () { lbToggleZoom(); });
  lbImg.addEventListener("click", function (e) { if (!lbPanned) lbToggleZoom(e); });
  lb.addEventListener("click", function (e) { if ((e.target === lb || e.target === lbStage) && !lb.classList.contains("zoomed")) lb.close(); });
  lb.addEventListener("close", function () { root.classList.remove("lb-open"); lbZoomOff(); });
  lb.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { lbShow(lbAt + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft") { lbShow(lbAt - 1); e.preventDefault(); }
  });
  lbStage.addEventListener("pointerdown", function (e) {
    lbPanned = false;
    if (e.pointerType !== "mouse" || !lb.classList.contains("zoomed")) return;
    lbPan = { x: e.clientX, y: e.clientY, l: lbStage.scrollLeft, t: lbStage.scrollTop }; e.preventDefault();
  });
  window.addEventListener("pointermove", function (e) {
    if (!lbPan) return; var dx = e.clientX - lbPan.x, dy = e.clientY - lbPan.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) lbPanned = true;
    lbStage.scrollLeft = lbPan.l - dx; lbStage.scrollTop = lbPan.t - dy;
  });
  window.addEventListener("pointerup", function () { lbPan = null; });
  lbStage.addEventListener("touchstart", function (e) {
    lbTouch = lb.classList.contains("zoomed") || e.touches.length > 1 ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  lbStage.addEventListener("touchend", function (e) {
    if (!lbTouch) return; var t = e.changedTouches[0], dx = t.clientX - lbTouch.x, dy = t.clientY - lbTouch.y; lbTouch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) { lbPanned = true; lbShow(lbAt + (dx < 0 ? 1 : -1)); setTimeout(function () { lbPanned = false; }, 350); }
  });

  var rvs = Array.prototype.slice.call(doc.querySelectorAll(".rv"));
  function revealAll() { rvs.forEach(function (e) { e.classList.add("in"); }); }
  var footEl = doc.getElementById("foot");
  if (footEl && "IntersectionObserver" in window) {
    var fIO = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { footEl.classList.add("ink"); fIO.disconnect(); } }); }, { threshold: 0.25 });
    fIO.observe(footEl);
  } else if (footEl) footEl.classList.add("ink");
  if ("IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    rvs.forEach(function (e) { rio.observe(e); });
  } else revealAll();
  setTimeout(revealAll, 8000);
  function checkBottom() { if (window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 4) revealAll(); }

  var btn = doc.getElementById("pauseBtn"), lbl = doc.getElementById("pauseLbl");
  btn.addEventListener("click", function () {
    PAUSED = !PAUSED;
    btn.setAttribute("data-state", PAUSED ? "paused" : "playing");
    btn.setAttribute("aria-pressed", PAUSED ? "true" : "false");
    root.classList.toggle("is-paused", PAUSED);
    if (PAUSED) {
      vids.forEach(function (v) { try { v.pause(); } catch (e) {} });
      if (heroVideo && heroVideo.__wipe) { try { heroVideo.__wipe.finish(); } catch (e) {} }
      revealAll(); showAllWords(); paintHL(); inkStmt(); if (footEl) footEl.classList.add("ink"); leafP = 1; if (parts.length) paintLeaf(1);
    } else {
      vids.forEach(tryPlay);
      paintLeaf(leafProgress()); paintHL(); scrubs.forEach(function (o) { o.kick(); });
    }
  });

  var menuBtn = doc.getElementById("menuBtn"), sheet = doc.getElementById("sheet"), sheetX = doc.getElementById("sheetX");
  function focusQuiet(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  function setSheet(open) {
    if (!sheet || !menuBtn) return;
    if (open) {
      sheet.inert = false; sheet.removeAttribute("inert"); sheet.setAttribute("aria-hidden", "false");
      sheet.classList.add("open"); menuBtn.setAttribute("aria-expanded", "true"); focusQuiet(sheetX);
    } else {
      if (sheet.contains(doc.activeElement)) focusQuiet(menuBtn);
      if (sheet.contains(doc.activeElement) && doc.activeElement.blur) doc.activeElement.blur();
      sheet.classList.remove("open"); sheet.inert = true; sheet.setAttribute("inert", ""); sheet.setAttribute("aria-hidden", "true");
      menuBtn.setAttribute("aria-expanded", "false");
    }
  }
  if (menuBtn && sheet) {
    menuBtn.addEventListener("click", function () { setSheet(true); });
    sheetX.addEventListener("click", function () { setSheet(false); });
    Array.prototype.forEach.call(sheet.querySelectorAll("[data-close]"), function (a) { a.addEventListener("click", function () { setSheet(false); }); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet.classList.contains("open")) setSheet(false); });
  }

  function arrive(el) {
    var cap = el.id === "send" ? el : null;
    if (!cap) return;
    Array.prototype.forEach.call(cap.querySelectorAll(".rv"), function (r) { r.classList.add("in"); });
    cap.classList.remove("arrive"); void cap.offsetWidth; cap.classList.add("arrive");
    var h = doc.getElementById("h-close"); if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
  }
  var TAU = 0.41;
  var glide = (function () {
    var desk = window.matchMedia ? window.matchMedia("(min-width: 761px)") : null;
    var off = /[?&]smooth=off\b/.test(location.search);
    var g = { active: false, cur: 0, target: 0, raf: 0, last: 0 };
    function maxY() { return Math.max(0, root.scrollHeight - window.innerHeight); }
    function clampY(y) { return Math.min(maxY(), Math.max(0, y)); }
    function stop() { if (g.raf) cancelAnimationFrame(g.raf); g.raf = 0; g.last = 0; }
    function tick(t) {
      var dt = g.last ? Math.min(0.1, Math.max(0, (t - g.last) / 1000)) : 1 / 60;
      g.last = t; g.target = clampY(g.target);
      g.cur += (g.target - g.cur) * (1 - Math.exp(-dt / TAU));
      if (Math.abs(g.target - g.cur) <= 0.5) g.cur = g.target;
      window.scrollTo(0, g.cur);
      if (g.cur === g.target) { stop(); return; }
      g.raf = requestAnimationFrame(tick);
    }
    g.to = function (y) {
      if (!g.raf) g.cur = window.scrollY;
      g.target = clampY(y);
      if (!g.raf) g.raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", function () {
      if (!g.active || (g.raf && Math.abs(window.scrollY - g.cur) <= 2)) return;
      stop(); g.cur = g.target = window.scrollY;
    }, { passive: true });
    window.addEventListener("wheel", function (e) {
      if (!g.active || e.defaultPrevented || e.ctrlKey || e.shiftKey || e.metaKey) return;
      var dy = e.deltaY;
      if (!dy || Math.abs(e.deltaX) > Math.abs(dy)) return;
      if (e.target && e.target.closest && e.target.closest(".sheet, dialog, textarea")) return;
      if (e.deltaMode === 1) dy *= 40; else if (e.deltaMode === 2) dy *= window.innerHeight;
      e.preventDefault();
      g.to((g.raf ? g.target : window.scrollY) + dy);
    }, { passive: false });
    function setOn() {
      g.active = !off && !!(desk && desk.matches);
      if (!g.active) stop();
      if (g.active) { root.setAttribute("data-scroll-tau", String(TAU)); root.classList.add("smooth-scroll-active"); }
      else { root.removeAttribute("data-scroll-tau"); root.classList.remove("smooth-scroll-active"); }
    }
    if (desk) { if (desk.addEventListener) desk.addEventListener("change", setOn); else if (desk.addListener) desk.addListener(setOn); }
    setOn();
    window.__smoothScroll = "native"; window.__smoothScrollTau = TAU;
    return g;
  })();
  function goTo(id) {
    var el = doc.getElementById(id); if (!el) return false;
    var maxY = doc.documentElement.scrollHeight - window.innerHeight;
    var y = id === "top" ? 0 : Math.round(el.getBoundingClientRect().top + window.scrollY - BAR());
    y = Math.max(0, Math.min(maxY, y));
    if (history.pushState) { try { history.pushState(null, "", "#" + id); } catch (e) {} }
    if (Math.abs(window.scrollY - y) < 4) { arrive(el); return true; }
    if (glide.active) glide.to(y); else window.scrollTo({ top: y, behavior: "smooth" });
    var last = -1, still = 0, t0 = Date.now();
    (function wait() {
      var s = window.scrollY;
      if (Math.abs(s - y) < 3 || (s === last && ++still > 4) || Date.now() - t0 > 4000) { arrive(el); return; }
      if (s !== last) still = 0; last = s; setTimeout(wait, 60);
    })();
    return true;
  }
  doc.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (!id || id === "main" || !doc.getElementById(id)) return;
    e.preventDefault();
    if (sheet && sheet.classList.contains("open")) setSheet(false);
    goTo(id);
  });
  if (location.hash === "#send") setTimeout(function () { arrive(doc.getElementById("send")); }, 400);

  var idea = doc.getElementById("idea");
  if (idea) {
    var ideaSt = doc.getElementById("ideaSt"), okMsg = (doc.getElementById("ideaOk") || {}).textContent || "";
    var compose = function (a) {
      var f = idea.elements, name = f.name.value.trim(), it = f.idea.value.trim(), ph = f.phone.value.trim(), em = f.email.value.trim();
      if (!name && !it && !ph && !em) return null;
      var href = a.getAttribute("href") || "", to = href.split("?")[0];
      var body = "Hi Angie,\n\n" + (name ? "Name: " + name + "\n" : "") + (ph ? "Phone: " + ph + "\n" : "") + (em ? "Email: " + em + "\n" : "") + "\nMy idea: " + (it || "") + "\n";
      if (/^mailto:/i.test(to)) return to + "?subject=" + encodeURIComponent("My Tattoo Idea") + "&body=" + encodeURIComponent(body);
      if (/^sms:/i.test(to)) return to + "?&body=" + encodeURIComponent(body);
      return null;
    };
    ["ideaMail", "ideaText"].forEach(function (k) {
      var a = doc.getElementById(k); if (!a) return;
      a.addEventListener("click", function (e) {
        var u = compose(a); ideaSt.textContent = okMsg;
        if (u) { e.preventDefault(); window.location.href = u; }
      });
    });
    idea.addEventListener("submit", function (e) { e.preventDefault(); var a = doc.getElementById("ideaMail"); if (a) a.click(); });
  }

  var heroWs = Array.prototype.slice.call(h1.querySelectorAll(".w"));
  if (heroSec) {
    heroSec.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || PAUSED) return;
      var r = heroSec.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      heroWs.forEach(function (w, i) { var d = [8, 11, 14][i] || 10; w.style.setProperty("--mx", (nx * d).toFixed(1) + "px"); w.style.setProperty("--my", (ny * d * 0.6).toFixed(1) + "px"); });
    });
    heroSec.addEventListener("pointerleave", function () { heroWs.forEach(function (w) { w.style.setProperty("--mx", "0px"); w.style.setProperty("--my", "0px"); }); });
  }

  window.__e2 = { vids: vids, state: function () { return { paused: PAUSED, RM: RM, leaf: leafP, scrub: sv ? sv.currentTime : null }; } };
})();
