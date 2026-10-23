/* E² Studios concept. Always-motion build: this file never reads the OS motion setting.
   Motion is on by default; the only control is the on-page Pause Animations button (never persisted). */
(function () {
  "use strict";
  var RM = false; // forced: motion never depends on the OS setting
  var doc = document, root = doc.documentElement;
  var PAUSED = false;
  var vids = [];
  var clips = window.HERO_CLIPS || [];

  /* ---------- ply(): every video starts here ---------- */
  function tryPlay(v) {
    if (PAUSED) return;
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
    var p;
    try { p = v.play(); } catch (e) {}
    if (p && p.catch) p.catch(function () {});
  }
  function ply(v) {
    if (v.__ply) { tryPlay(v); return; }
    v.__ply = true; vids.push(v);
    tryPlay(v);
    [250, 750, 1500, 3000].forEach(function (ms) { setTimeout(function () { if (v.paused) tryPlay(v); }, ms); });
    ["loadeddata", "canplay", "stalled", "suspend", "pause"].forEach(function (ev) {
      v.addEventListener(ev, function () { if (v.paused && !PAUSED) tryPlay(v); });
    });
  }
  /* retry on first user input, and a 1 s watchdog */
  ["pointerdown", "keydown", "wheel", "scroll", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { if (!PAUSED) vids.forEach(tryPlay); }, { passive: true, once: true, capture: true });
  });
  setInterval(function () {
    if (PAUSED) return;
    vids.forEach(function (v) { if (v.paused || v.ended) tryPlay(v); });
  }, 1000);


  /* ---------- hero: data-driven. "wide" = one composite film of three panels (>=1001 px), "tall" = one 9:16 film (phone, tablet).
     The film fills ~93% of the first screen. Words sit in the thin caption band under it, split into letters, revealed on the film's clock. ---------- */
  var stage = doc.getElementById("heroStage");
  var h1 = doc.getElementById("heroH1");
  var clip = clips[0];
  var topbar = doc.getElementById("topbar");
  var heroMode = null, heroVideo = null;
  var BAR = function () { return topbar ? topbar.offsetHeight : 0; };

  function wantMode() { return window.innerWidth >= 1001 ? "wide" : "tall"; }
  function splitLetters(el, wi) {
    if (el.__split) return; el.__split = true;
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
    heroMode = mode; stage.setAttribute("data-mode", mode);
    var def = clip[mode];
    if (heroVideo) { var i = vids.indexOf(heroVideo); if (i > -1) vids.splice(i, 1); try { heroVideo.pause(); } catch (e) {} heroVideo.removeAttribute("src"); heroVideo.load(); if (heroVideo.parentNode) heroVideo.parentNode.removeChild(heroVideo); }
    /* the <picture> poster (the film's real first frame) stays underneath, so frame 0 is already the full film; the video sits on top and is transparent until it has a frame */
    var v = doc.createElement("video");
    v.id = "heroVideo"; v.className = "film-el"; v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto";
    v.src = def.src;
    stage.appendChild(v); heroVideo = v; ply(v);
  }
  /* headline: the words are already on screen in the first frame; the letters settle into place (no hiding, no waiting on the film) */
  Array.prototype.forEach.call(h1.querySelectorAll(".w"), function (w, n) { splitLetters(w, n); });
  buildHero();
  requestAnimationFrame(function () { requestAnimationFrame(function () { h1.classList.add("go"); }); });
  var lastW = window.innerWidth;
  window.addEventListener("resize", function () { if (window.innerWidth !== lastW) { lastW = window.innerWidth; buildHero(); } });
  function showAllWords() { h1.classList.add("go"); }

  /* ---------- lazy secondary films: start near the viewport, never paused by scroll ---------- */
  var lazies = Array.prototype.slice.call(doc.querySelectorAll("video[data-src]"));
  lazies.forEach(function (v) {
    v.style.setProperty("--fx", Math.round(parseFloat(v.getAttribute("data-focus") || "0.5") * 100) + "%");
  });
  function startLazy(v) {
    if (!v.getAttribute("src")) { v.setAttribute("src", v.getAttribute("data-src")); v.preload = "auto"; }
    ply(v);
  }
  if ("IntersectionObserver" in window) {
    var lio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { startLazy(e.target); lio.unobserve(e.target); } });
    }, { rootMargin: "120% 0px" });
    lazies.forEach(function (v) { lio.observe(v); });
  } else lazies.forEach(startLazy);
  setTimeout(function () { lazies.forEach(function (v) { if (!v.getAttribute("src")) startLazy(v); }); }, 4000);
  /* scroll-scrubbed films never autoplay: the scroll position is their clock. The second one loads when its section is near. */
  var leafVid = doc.getElementById("leafVideo");
  function loadScrubVid(v) { if (v && !v.getAttribute("src")) { v.setAttribute("src", v.getAttribute("data-lazy")); v.preload = "auto"; v.load(); } }
  if (leafVid) {
    if ("IntersectionObserver" in window) {
      var sio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { loadScrubVid(leafVid); sio.disconnect(); } }); }, { rootMargin: "250% 0px" });
      sio.observe(doc.getElementById("leaf"));
    }
    setTimeout(function () { loadScrubVid(leafVid); }, 6000);
  }

  /* ---------- the leaf: drawn by scroll, filled at the payoff ---------- */
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
    if (PAUSED) p = 1;
    parts.forEach(function (q) {
      var k = Math.min(1, Math.max(0, (p - q.a) / (q.b - q.a)));
      q.el.style.strokeDashoffset = String(1 - k);
    });
    var f = Math.min(1, Math.max(0, (p - parts.fillA) / (parts.fillB - parts.fillA)));
    parts.fill.style.transform = "translateY(" + ((1 - f) * 100) + "%)";
    var panels = leafSec.querySelectorAll(".panel");
    var idx = p < 0.34 ? 0 : p < 0.7 ? 1 : 2;
    panels.forEach(function (el, i) { el.classList.toggle("on", i === idx); });
  }
  function clamp01(x) { return Math.min(1, Math.max(0, x)); }
  /* progress of a pinned section: 0 when its top reaches the bar, 1 when its end does */
  function secProgress(sec) {
    var r = sec.getBoundingClientRect(), bar = BAR(), span = r.height - (window.innerHeight - bar);
    return span > 0 ? clamp01((bar - r.top) / span) : 0;
  }
  var leafP = 0;
  function leafProgress() { return secProgress(leafSec); }

  /* the signatures: scroll position IS the film's clock (eased). One engine, two sections. */
  var scrubs = [];
  function makeScrub(sec, vid, fallback, onP) {
    var vl = Array.isArray(vid) ? vid : [vid], v0 = vl[0];
    var o = { sec: sec, vid: v0, cur: 0, run: false };
    o.tick = function () {
      o.run = false;
      if (!v0 || !sec || PAUSED) return;
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
  var sc1 = makeScrub(scSec, [sv, svB], 4.67, function (p) { if (scBar) scBar.style.width = (p * 100).toFixed(1) + "%"; });
  var sc2 = makeScrub(leafSec, leafVid, 9.3, function (p) { paintLeaf(p); });

  /* the big type moment: the line travels sideways with the scroll */
  var stmtSec = doc.getElementById("stmt"), stmtLine = stmtSec && stmtSec.querySelector(".stmt__line");
  var stmtCs = [];
  if (stmtLine) { splitLetters(stmtLine, 0); stmtCs = Array.prototype.slice.call(stmtLine.querySelectorAll(".c")); }
  function paintStmt() {
    if (!stmtLine) return;
    var p = PAUSED ? 1 : clamp01(secProgress(stmtSec) / 0.8), n = stmtCs.length;
    stmtCs.forEach(function (c, i) { c.style.setProperty("--o", (0.16 + 0.84 * clamp01(p * (n + 3) - i)).toFixed(2)); });
  }

  /* header: floats on the film, becomes a solid bar once the film is behind you; leaf motif fills with page progress */
  function pageProgress() { var h = doc.documentElement.scrollHeight - window.innerHeight; return h > 0 ? clamp01(window.scrollY / h) : 0; }
  function paintHL() { if (hlFill) hlFill.style.transform = "translateY(" + ((1 - (PAUSED ? 1 : pageProgress())) * 32).toFixed(1) + "px)"; }
  var heroSec = doc.getElementById("top");
  function paintBar() { if (topbar && heroSec) topbar.classList.toggle("solid", window.scrollY > heroSec.offsetHeight - BAR() - 24); }

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; paintBar(); paintHL(); paintStmt(); scrubs.forEach(function (o) { o.kick(); }); checkBottom(); });
  }
  if (svg && leafSec) { buildLeaf(); paintLeaf(leafProgress()); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  paintBar(); paintHL(); paintStmt(); scrubs.forEach(function (o) { o.kick(); });

  /* ---------- work strip: drag, buttons, progress, lightbox ---------- */
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
    var by = function (dir) { strip.scrollBy({ left: dir * Math.max(300, strip.clientWidth * 0.7), behavior: "smooth" }); };
    var pv = doc.getElementById("wPrev"), nx = doc.getElementById("wNext");
    if (pv) pv.addEventListener("click", function () { by(-1); });
    if (nx) nx.addEventListener("click", function () { by(1); });
    strip.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { by(1); e.preventDefault(); } if (e.key === "ArrowLeft") { by(-1); e.preventDefault(); } });
    var lb = doc.getElementById("lb"), lbImg = doc.getElementById("lbImg");
    strip.addEventListener("click", function (e) {
      var b = e.target.closest(".strip__it"); if (!b || moved > 5) return;
      var im = b.querySelector("img"); lbImg.src = b.getAttribute("data-full"); lbImg.alt = im ? im.alt : "";
      if (lb.showModal) lb.showModal(); else lb.setAttribute("open", "");
    });
    lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
  }

  /* ---------- reveals, with fail-safes ---------- */
  var rvs = Array.prototype.slice.call(doc.querySelectorAll(".rv"));
  function revealAll() { rvs.forEach(function (e) { e.classList.add("in"); }); }
  if ("IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    rvs.forEach(function (e) { rio.observe(e); });
  } else revealAll();
  setTimeout(revealAll, 8000);
  function checkBottom() { if (window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 4) revealAll(); }

  /* ---------- Pause Animations: one control, in the header, so it never covers content ---------- */
  var btn = doc.getElementById("pauseBtn"), lbl = doc.getElementById("pauseLbl");
  btn.addEventListener("click", function () {
    PAUSED = !PAUSED;
    btn.setAttribute("data-state", PAUSED ? "paused" : "playing");
    if (lbl) lbl.textContent = PAUSED ? "Play Animations" : "Pause Animations";
    root.classList.toggle("is-paused", PAUSED);
    if (PAUSED) {
      vids.forEach(function (v) { try { v.pause(); } catch (e) {} });
      if (heroVideo && heroVideo.__wipe) { try { heroVideo.__wipe.finish(); } catch (e) {} }
      revealAll(); showAllWords(); paintLeaf(1); paintHL(); paintStmt();
    } else {
      vids.forEach(tryPlay);
      paintLeaf(leafProgress()); paintHL(); paintStmt(); scrubs.forEach(function (o) { o.kick(); });
    }
  });

  /* ---------- phone menu: a sheet of next-step actions only (book, email, call, directions) ---------- */
  var menuBtn = doc.getElementById("menuBtn"), sheet = doc.getElementById("sheet"), sheetX = doc.getElementById("sheetX");
  function setSheet(open) {
    sheet.classList.toggle("open", open); sheet.setAttribute("aria-hidden", open ? "false" : "true");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) sheetX.focus(); else menuBtn.focus();
  }
  if (menuBtn && sheet) {
    menuBtn.addEventListener("click", function () { setSheet(true); });
    sheetX.addEventListener("click", function () { setSheet(false); });
    Array.prototype.forEach.call(sheet.querySelectorAll("[data-close]"), function (a) { a.addEventListener("click", function () { sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); menuBtn.setAttribute("aria-expanded", "false"); }); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet.classList.contains("open")) setSheet(false); });
  }

  window.__e2 = { vids: vids, state: function () { return { paused: PAUSED, RM: RM, leaf: leafP, scrub: sv ? sv.currentTime : null }; } };
})();
