(function () {
  "use strict";

  var W = 1920, H = 1080;
  var body = document.body;
  var frames = Array.prototype.slice.call(document.querySelectorAll(".frame"));
  var cur = 0;

  /* ---------- storage (always guarded) ---------- */
  function load(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, val) { try { window.localStorage.setItem(key, val); } catch (e) { /* ignore */ } }

  /* ---------- toast ---------- */
  var toast = document.getElementById("toast");
  var toastTimer;
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("on"); }, 1800);
  }

  /* ---------- copy buttons (slides and prompts page) ---------- */
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".copy");
    if (!btn) return;
    var pre = btn.closest(".prompt").querySelector("pre");
    copyText(pre.textContent.trim()).then(function (ok) {
      if (!ok) { say("복사에 실패했어요. 글을 직접 선택해서 복사해 주세요"); return; }
      btn.textContent = "복사됨";
      btn.classList.add("done");
      say("프롬프트를 복사했어요");
      setTimeout(function () { btn.textContent = "복사"; btn.classList.remove("done"); }, 1600);
    });
  });

  /* ---------- download buttons that are not set up yet ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a.dl.pending");
    if (!a) return;
    e.preventDefault();
    say("이 파일은 아직 준비 중이에요. 강사에게 알려 주세요");
  });

  /* ---------- OS tabs (all groups stay in sync) ---------- */
  var groups = Array.prototype.slice.call(document.querySelectorAll(".tabs"));
  function guessOS() {
    var p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    return /mac|iphone|ipad/i.test(p) ? "mac" : "win";
  }
  function setOS(os, persist) {
    groups.forEach(function (g) {
      g.querySelectorAll("[role=tab]").forEach(function (t) {
        var on = t.dataset.os === os;
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      g.querySelectorAll("[role=tabpanel]").forEach(function (p) { p.hidden = p.dataset.os !== os; });
    });
    if (persist) save("class-os", os);
  }
  groups.forEach(function (g) {
    g.addEventListener("click", function (e) {
      var t = e.target.closest("[role=tab]");
      if (t) setOS(t.dataset.os, true);
    });
  });
  setOS(load("class-os") || guessOS(), false);

  /* ---------- checklists ---------- */
  document.querySelectorAll(".checks").forEach(function (list) {
    var key = "chk-" + list.dataset.id;
    var saved = {};
    try { saved = JSON.parse(load(key) || "{}"); } catch (e) { saved = {}; }
    list.querySelectorAll("li").forEach(function (li, i) {
      if (saved[i]) li.classList.add("on");
      li.setAttribute("role", "checkbox");
      li.tabIndex = 0;
      li.setAttribute("aria-checked", saved[i] ? "true" : "false");
      function toggle() {
        li.classList.toggle("on");
        saved[i] = li.classList.contains("on");
        li.setAttribute("aria-checked", saved[i] ? "true" : "false");
        save(key, JSON.stringify(saved));
      }
      li.addEventListener("click", toggle);
      li.addEventListener("keydown", function (ev) {
        if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); toggle(); }
      });
    });
  });


  /* ---------- HTML/CSS/JS layer demo ---------- */
  document.querySelectorAll(".layers").forEach(function (box) {
    var names = { "1": "HTML", "2": "CSS", "3": "JavaScript" };
    var btn = box.querySelector(".demo-btn"), hint = box.querySelector(".demo-hint");
    function setLv(lv) {
      box.dataset.lv = lv;
      box.querySelectorAll(".layer-step").forEach(function (s) {
        s.classList.toggle("on", s.dataset.lv <= lv);
        s.classList.toggle("cur", s.dataset.lv === lv);
      });
      box.querySelectorAll(".browser-code pre").forEach(function (p) { p.hidden = p.dataset.lv !== lv; });
      box.querySelector(".browser-code .lbl").textContent = "이번에 더한 코드 · " + names[lv];
      btn.classList.remove("done"); btn.textContent = "체험 예약하기";
      hint.textContent = ""; hint.classList.remove("ok");
    }
    box.querySelectorAll(".layer-step").forEach(function (s) {
      s.addEventListener("click", function () { setLv(s.dataset.lv); });
    });
    btn.addEventListener("click", function () {
      if (box.dataset.lv !== "3") {
        hint.classList.remove("ok");
        hint.textContent = "눌러도 아무 일이 없어요. 움직임(JavaScript)이 아직 없거든요.";
        return;
      }
      var done = btn.classList.toggle("done");
      btn.textContent = done ? "예약 완료 ✓" : "체험 예약하기";
      hint.classList.add("ok");
      hint.textContent = done ? "JavaScript가 버튼의 글자와 색을 바꿨어요." : "";
    });
    setLv(box.dataset.lv || "1");
  });


  /* ---------- page navigation demo (plain vs Next.js) ---------- */
  document.querySelectorAll(".nav-demo").forEach(function (demo) {
    var pages = {
      home: { t: "퇴근 후 50분, 허리가 가벼워져요", d: "허리 아픈 직장인을 위한 1:1 필라테스", u: "" },
      "class": { t: "1:1 자세 교정 수업", d: "50분 동안 강사 한 명이 한 분만 봐요", u: "/class" },
      price: { t: "체험 수업 1회 2만 원", d: "첫 방문은 카카오톡으로 예약해요", u: "/price" }
    };
    var plain = demo.querySelector('[data-kind="plain"]'), next = demo.querySelector('[data-kind="next"]');
    var busy = false;
    function fill(b, pg) {
      b.querySelector(".nd-t").textContent = pages[pg].t;
      b.querySelector(".nd-d").textContent = pages[pg].d;
      b.querySelector(".nd-url").textContent = "seongsu-pilates.com" + pages[pg].u;
      b.querySelectorAll(".nd-link").forEach(function (l) { l.classList.toggle("on", l.dataset.pg === pg); });
    }
    function flash(el) { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
    function status(b, text, cls) {
      var s = b.parentNode.querySelector(".nd-status");
      s.textContent = text; s.className = "nd-status " + cls;
    }
    function goPage(pg) {
      if (busy) return;
      busy = true;
      fill(next, pg);
      flash(next.querySelector(".nd-main"));
      status(next, "다시 그린 곳: 본문만 (메뉴·하단은 그대로)", "good");
      status(plain, "불러오는 중…", "");
      plain.classList.add("reloading");
      setTimeout(function () {
        fill(plain, pg);
        plain.classList.remove("reloading");
        plain.querySelectorAll(".nd-part").forEach(flash);
        status(plain, "다시 그린 곳: 메뉴 · 본문 · 하단 전부", "bad");
        busy = false;
      }, 550);
    }
    demo.addEventListener("click", function (e) {
      var l = e.target.closest(".nd-link");
      if (l) goPage(l.dataset.pg);
    });
  });

  /* ---------- sizing ---------- */
  function layout() {
    var vw = window.innerWidth, vh = window.innerHeight, w, scale;
    if (body.classList.contains("mode-scroll")) {
      w = Math.min(vw - 24, 1280);
    } else {
      w = Math.min(vw, vh * W / H);
    }
    scale = w / W;
    frames.forEach(function (f) {
      f.style.width = w + "px";
      f.style.height = (w * H / W) + "px";
      f.firstElementChild.style.transform = "scale(" + scale + ")";
    });
  }

  /* ---------- navigation ---------- */
  var pos = document.getElementById("pos");
  var bar = document.getElementById("progress");
  var accents = { "": "var(--c-intro)", "1": "var(--c-1)", "2": "var(--c-2)", "3": "var(--c-3)", "4": "var(--c-4)", "5": "var(--c-5)" };

  function paint() {
    var s = frames[cur].firstElementChild;
    pos.textContent = (cur + 1) + " / " + frames.length;
    bar.style.width = ((cur + 1) / frames.length * 100) + "%";
    bar.style.background = accents[s.dataset.p || ""] || "var(--c-1)";
    document.title = (s.dataset.title ? s.dataset.title + " · " : "") + document.body.dataset.title;
    document.querySelectorAll("#toc a").forEach(function (a, i) { a.classList.toggle("cur", i === cur); });
  }
  function go(i, opts) {
    opts = opts || {};
    i = Math.max(0, Math.min(frames.length - 1, i));
    cur = i;
    if (!body.classList.contains("mode-scroll")) {
      frames.forEach(function (f, k) { f.classList.toggle("active", k === i); });
    } else if (!opts.fromScroll) {
      frames[i].scrollIntoView({ block: "start" });
    }
    if (!opts.noHash) history.replaceState(null, "", "#" + (i + 1));
    paint();
  }
  function fromHash() {
    var n = parseInt((location.hash || "").replace("#", ""), 10);
    return isNaN(n) ? 0 : n - 1;
  }
  window.addEventListener("hashchange", function () { go(fromHash(), { noHash: true }); });

  function setMode(mode) {
    body.classList.toggle("mode-scroll", mode === "scroll");
    frames.forEach(function (f) { f.classList.remove("active"); });
    if (mode !== "scroll") frames[cur].classList.add("active");
    save("class-mode", mode);
    layout();
    if (mode === "scroll") { frames[cur].scrollIntoView({ block: "start" }); observe(); }
    document.getElementById("btn-mode").textContent = mode === "scroll" ? "한 장씩" : "스크롤";
  }
  var io;
  function observe() {
    if (io || !("IntersectionObserver" in window)) return;
    io = new IntersectionObserver(function (entries) {
      if (!body.classList.contains("mode-scroll")) return;
      var best = null;
      entries.forEach(function (en) { if (en.isIntersecting && (!best || en.intersectionRatio > best.r)) best = { i: frames.indexOf(en.target), r: en.intersectionRatio }; });
      if (best && best.i !== cur) { cur = best.i; history.replaceState(null, "", "#" + (cur + 1)); paint(); }
    }, { threshold: [0.5, 0.8] });
    frames.forEach(function (f) { io.observe(f); });
  }

  /* ---------- table of contents ---------- */
  var toc = document.getElementById("toc");
  (function buildToc() {
    var panel = toc.querySelector(".panel"), last = null;
    frames.forEach(function (f, i) {
      var s = f.firstElementChild;
      if (s.dataset.section !== last) {
        last = s.dataset.section;
        var h = document.createElement("h4"); h.textContent = last; panel.appendChild(h);
      }
      var a = document.createElement("a");
      a.href = "#" + (i + 1);
      a.innerHTML = "<i>" + (i + 1) + "</i><span></span>";
      a.lastChild.textContent = s.dataset.title || "";
      a.addEventListener("click", function (ev) { ev.preventDefault(); toggleToc(false); go(i); });
      panel.appendChild(a);
    });
  })();
  function toggleToc(open) {
    var on = typeof open === "boolean" ? open : !toc.classList.contains("open");
    toc.classList.toggle("open", on);
    if (on) { var c = toc.querySelector("a.cur"); if (c) c.scrollIntoView({ block: "center" }); }
  }
  toc.addEventListener("click", function (e) { if (e.target === toc) toggleToc(false); });

  /* ---------- input ---------- */
  document.getElementById("btn-prev").addEventListener("click", function () { go(cur - 1); });
  document.getElementById("btn-next").addEventListener("click", function () { go(cur + 1); });
  document.getElementById("btn-toc").addEventListener("click", function () { toggleToc(); });
  document.getElementById("btn-mode").addEventListener("click", function () { setMode(body.classList.contains("mode-scroll") ? "slide" : "scroll"); });
  document.getElementById("edge-l").addEventListener("click", function () { go(cur - 1); });
  document.getElementById("edge-r").addEventListener("click", function () { go(cur + 1); });

  window.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "textarea" || tag === "input") return;
    var scroll = body.classList.contains("mode-scroll");
    switch (e.key) {
      case "ArrowRight": case "PageDown": case "Enter":
        if (e.target.closest && e.target.closest(".checks li, button, a")) { if (e.key === "Enter") return; }
        e.preventDefault(); go(cur + 1); break;
      case "ArrowLeft": case "PageUp":
        e.preventDefault(); go(cur - 1); break;
      case " ":
        if (e.target.closest && e.target.closest(".checks li, button, video")) return;
        e.preventDefault(); go(cur + (e.shiftKey ? -1 : 1)); break;
      case "ArrowDown": if (!scroll) { e.preventDefault(); go(cur + 1); } break;
      case "ArrowUp": if (!scroll) { e.preventDefault(); go(cur - 1); } break;
      case "Home": e.preventDefault(); go(0); break;
      case "End": e.preventDefault(); go(frames.length - 1); break;
      case "g": case "G": case "m": case "M": toggleToc(); break;
      case "s": case "S": setMode(scroll ? "slide" : "scroll"); break;
      case "Escape": toggleToc(false); break;
      case "f": case "F":
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
        break;
    }
  });

  var tx = null, ty = null;
  window.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchend", function (e) {
    if (tx === null || body.classList.contains("mode-scroll")) return;
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    tx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });

  window.addEventListener("resize", layout);

  /* ---------- start ---------- */
  setMode(load("class-mode") === "scroll" ? "scroll" : "slide");
  go(fromHash(), { noHash: !location.hash });
  if (!location.hash) history.replaceState(null, "", "#1");
})();
