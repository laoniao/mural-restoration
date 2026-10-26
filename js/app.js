/* ============================================================
   德格都苏莫殿 · 交互层
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------------- 01 导航 & 滚动进度 ---------------- */
  const nav = $("#nav"), line = $("#scrollLine");
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle("is-stuck", y > 40);
    const h = document.documentElement.scrollHeight - window.innerHeight;
    line.style.width = h > 0 ? (y / h) * 100 + "%" : "0%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* 移动端菜单 */
  const burger = $("#navBurger");
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  });
  $$(".nav-links a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    })
  );

  /* ---------------- 02 揭示动画 ---------------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------------- 03 数字滚动 ---------------- */
  const countIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseFloat(el.dataset.count);
        const dec = parseInt(el.dataset.dec || "0", 10);
        const dur = 1500;
        const t0 = performance.now();
        function tick(t) {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(dec);
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target.toFixed(dec);
        }
        if (reduced) el.textContent = target.toFixed(dec);
        else requestAnimationFrame(tick);
        countIO.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------------- 04 采集工序 ---------------- */
  const pipeImg = $("#pipeImg");
  const pipeOverlay = $("#pipeOverlay");
  const pipeCaption = $("#pipeCaption");
  const pipeSteps = $("#pipeSteps");
  const pipeFrame = $(".pipe-frame");

  PIPELINE.forEach((step, i) => {
    const li = document.createElement("li");
    li.className = "pipe-step" + (i === 0 ? " is-active" : "");
    li.innerHTML = `
      <span class="ps-idx">${step.n}</span>
      <div class="ps-body">
        <h3>${step.title}</h3>
        <p>${step.text}</p>
      </div>`;
    li.addEventListener("mouseenter", () => activateStep(i));
    li.addEventListener("click", () => activateStep(i));
    pipeSteps.appendChild(li);
  });

  function activateStep(i) {
    $$(".pipe-step", pipeSteps).forEach((el, k) => el.classList.toggle("is-active", k === i));
    const step = PIPELINE[i];
    pipeFrame.className = "pipe-frame reveal in " + step.fx;
    pipeCaption.textContent = step.cap;
    pipeOverlay.style.opacity = "1";
  }

  /* ---------------- 05 全壁浏览 ---------------- */
  const stage = $("#wallStage");
  const canvas = $("#wallCanvas");
  const hotLayer = $("#wallHotspots");
  const legend = $("#wallLegend");
  const tip = $("#wallTip");

  const view = { x: 0, y: 0, s: 1, bw: 0, bh: 0, min: 1, max: 2.6 };
  const RATIO = 1536 / 957;

  function layoutWall() {
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const bw = Math.max(sw, sh * RATIO) * 1.02;
    view.bw = bw;
    view.bh = bw / RATIO;
    canvas.style.width = bw + "px";
    canvas.style.height = view.bh + "px";
    canvas.style.marginLeft = -bw / 2 + "px";
    canvas.style.marginTop = -view.bh / 2 + "px";
    view.min = Math.min(sw / bw, sh / view.bh) * 0.985;
    if (view.s < view.min) view.s = view.min;
    apply();
  }

  function apply() {
    view.s = clamp(view.s, view.min, view.max);
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const mx = Math.max(0, (view.bw * view.s - sw) / 2);
    const my = Math.max(0, (view.bh * view.s - sh) / 2);
    view.x = clamp(view.x, -mx, mx);
    view.y = clamp(view.y, -my, my);
    canvas.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
    canvas.style.setProperty("--inv", 1 / view.s);
  }

  let dragging = false, last = null, moved = 0;
  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".wall-ui")) return;
    dragging = true; moved = 0; last = { x: e.clientX, y: e.clientY };
    stage.classList.add("is-drag");
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    moved += Math.abs(dx) + Math.abs(dy);
    view.x += dx; view.y += dy;
    last = { x: e.clientX, y: e.clientY };
    apply();
    if (moved > 24 && tip) tip.style.opacity = "0";
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
    stage.addEventListener(ev, () => {
      dragging = false;
      stage.classList.remove("is-drag");
    })
  );
  stage.addEventListener("dblclick", () => {
    view.s = view.s > 1.4 ? view.min : view.min * 1.9;
    view.x = view.y = 0;
    apply();
  });
  $("#zoomIn").addEventListener("click", () => { view.s *= 1.3; apply(); });
  $("#zoomOut").addEventListener("click", () => { view.s /= 1.3; apply(); });
  $("#zoomReset").addEventListener("click", () => { view.s = view.min; view.x = view.y = 0; apply(); });

  FIGURES.forEach((f) => {
    const b = document.createElement("button");
    b.className = "hotspot";
    b.style.left = f.hot.x + "%";
    b.style.top = f.hot.y + "%";
    b.setAttribute("aria-label", "取像：" + f.name);
    b.innerHTML = `<i></i><b>${f.code}　${f.name}</b>`;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (moved < 8) openFigure(f);
    });
    hotLayer.appendChild(b);

    const li = document.createElement("li");
    li.innerHTML = `<button type="button"><em></em>${f.name}</button>`;
    li.querySelector("button").addEventListener("click", () => openFigure(f));
    legend.appendChild(li);
  });

  window.addEventListener("resize", layoutWall);
  window.addEventListener("load", layoutWall);
  layoutWall();

  /* ---------------- 05.5 修复推演 ---------------- */
  const rsStage = $("#restStage");
  const rsPins = $("#rsPins");
  const rsHeals = $("#rsHeals");
  const rpList = $("#rpList");
  const lens = $("#lens");
  const lensImg = $("#lensImg");
  const rsHint = $("#rsHint");
  const rsMode = $("#rsMode");
  const rpDoneEl = $("#rpDone");
  const rpBar = $("#rpBar");
  const rpDoneCard = $("#rpDoneCard");

  const pinEls = [];
  const healEls = [];
  const rowEls = [];
  let fixed = 0;
  let lensPos = null;

  DAMAGES.forEach((d, i) => {
    const li = document.createElement("li");
    li.className = "rp-item";
    li.innerHTML = `
      <button class="rp-row" type="button">
        <span class="rp-no">${d.no}</span>
        <span class="rp-name"><i></i>${d.type}</span>
        <span class="rp-st">待处理</span>
        <span class="rp-loc">${d.loc} · ${d.area}</span>
      </button>
      <div class="rp-detail">
        <p class="rp-plan"><b>处置</b>${d.plan}</p>
        <p class="rp-area">${d.note}</p>
        <button class="rp-act" type="button">执行施术 →</button>
      </div>`;
    const row = li.querySelector(".rp-row");
    const act = li.querySelector(".rp-act");
    row.addEventListener("click", () => {
      if (li.classList.toggle("is-open") && !d.done) focusPin(i);
    });
    act.addEventListener("click", (e) => {
      e.stopPropagation();
      treat(i);
    });
    rpList.appendChild(li);
    rowEls.push(li);

    const pin = document.createElement("button");
    pin.className = "pin";
    pin.type = "button";
    pin.style.left = d.x + "%";
    pin.style.top = d.y + "%";
    pin.setAttribute("aria-label", d.type + " · " + d.loc);
    pin.innerHTML = `<i></i><b>${d.type}</b>`;
    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      treat(i);
    });
    rsPins.appendChild(pin);
    pinEls.push(pin);

    const heal = document.createElement("div");
    heal.className = "heal";
    rsHeals.appendChild(heal);
    healEls.push(heal);
  });

  function layoutHeals() {
    const w = rsStage.clientWidth;
    const h = rsStage.clientHeight;
    if (!w) return;
    healEls.forEach((el, i) => {
      const d = DAMAGES[i];
      const r = (d.r / 100) * w;
      const left = (d.x / 100) * w - r;
      const top = (d.y / 100) * h - r;
      el.style.width = r * 2 + "px";
      el.style.height = r * 2 + "px";
      el.style.left = left + "px";
      el.style.top = top + "px";
      el.style.backgroundImage = 'url("assets/img/mural-panorama.jpg")';
      el.style.backgroundSize = w + "px " + h + "px";
      el.style.backgroundPosition = -left + "px " + -top + "px";
    });
  }

  function positionLens(px, py) {
    const L = lens.offsetWidth || 280;
    const w = rsStage.clientWidth;
    const h = rsStage.clientHeight;
    lensPos = { px, py };
    lens.style.transform = `translate(${px - L / 2}px, ${py - L / 2}px)`;
    lensImg.style.width = w + "px";
    lensImg.style.height = h + "px";
    lensImg.style.left = -(px - L / 2) + "px";
    lensImg.style.top = -(py - L / 2) + "px";
  }

  function moveLens(e) {
    if (rsStage.classList.contains("is-compare")) return;
    const r = rsStage.getBoundingClientRect();
    lens.classList.add("is-on");
    positionLens(e.clientX - r.left, e.clientY - r.top);
    if (rsHint) rsHint.style.opacity = "0";
  }

  rsStage.addEventListener("pointermove", moveLens);
  rsStage.addEventListener("pointerdown", moveLens);
  rsStage.addEventListener("pointerleave", () => lens.classList.remove("is-on"));

  function focusPin(i) {
    pinEls.forEach((p, k) => p.classList.toggle("is-focus", k === i));
    setTimeout(() => pinEls[i].classList.remove("is-focus"), 1900);
  }

  function treat(i) {
    const d = DAMAGES[i];
    if (d.done) return;
    d.done = true;
    const pin = pinEls[i];
    pin.classList.add("is-treating");

    const tag = document.createElement("span");
    tag.className = "treat-tag";
    tag.textContent = d.verb;
    tag.style.left = d.x + "%";
    tag.style.top = d.y + "%";
    rsPins.appendChild(tag);
    setTimeout(() => tag.remove(), 1900);

    focusPin(i);
    setTimeout(() => {
      pin.classList.remove("is-treating");
      pin.classList.add("is-done");
      healEls[i].classList.add("is-on");
      rowEls[i].classList.remove("is-open");
      rowEls[i].classList.add("is-done");
      rowEls[i].querySelector(".rp-st").textContent = "已处理";
      fixed++;
      updateProgress();
    }, 620);
  }

  function updateProgress() {
    rpDoneEl.textContent = fixed;
    rpBar.style.width = (fixed / DAMAGES.length) * 100 + "%";
    if (fixed === DAMAGES.length) {
      rpDoneCard.hidden = false;
      setTimeout(() => setCompare(true), 1100);
    }
  }

  function setCompare(on) {
    rsStage.classList.toggle("is-compare", on);
    rsMode.classList.toggle("is-on", on);
    rsMode.setAttribute("aria-pressed", on ? "true" : "false");
    rsMode.textContent = on ? "返回现状" : "全壁对照";
    const label = $("#rsLabel");
    if (label) label.textContent = on ? "修复推演 · 六处归位" : "现状 · 2026 采集";
    if (on) {
      lens.classList.remove("is-on");
      if (rsHint) rsHint.style.opacity = "0";
    }
  }

  rsMode.addEventListener("click", () =>
    setCompare(!rsStage.classList.contains("is-compare"))
  );

  $("#rpReset").addEventListener("click", () => {
    fixed = 0;
    DAMAGES.forEach((d) => (d.done = false));
    pinEls.forEach((p) => p.classList.remove("is-done", "is-focus"));
    healEls.forEach((h) => h.classList.remove("is-on"));
    rowEls.forEach((r) => {
      r.classList.remove("is-done", "is-open");
      r.querySelector(".rp-st").textContent = "待处理";
    });
    rpDoneCard.hidden = true;
    setCompare(false);
    updateProgress();
  });

  function layoutRestore() {
    layoutHeals();
    if (lensPos) positionLens(lensPos.px, lensPos.py);
    else if (rsStage.clientWidth) positionLens(rsStage.clientWidth * 0.56, rsStage.clientHeight * 0.42);
  }
  window.addEventListener("resize", layoutRestore);
  window.addEventListener("load", layoutRestore);
  layoutRestore();
  if ("IntersectionObserver" in window) {
    const rsIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            layoutRestore();
            rsIO.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );
    rsIO.observe(rsStage);
  }
  setTimeout(() => {
    if (!lensPos || !lens.classList.contains("is-on")) {
      if (rsStage.clientWidth) {
        positionLens(rsStage.clientWidth * 0.56, rsStage.clientHeight * 0.42);
        lens.classList.add("is-on");
      }
    }
  }, 700);

  /* ---------------- 06 取像档案 ---------------- */
  const grid = $("#figGrid");
  FIGURES.forEach((f, i) => {
    const card = document.createElement("button");
    card.className = "fig-card";
    card.type = "button";
    card.setAttribute("aria-label", "查看 " + f.name + " 的取像档案");
    card.style.transitionDelay = (i % 3) * 60 + "ms";
    card.innerHTML = `
      <div class="fig-thumb">
        <img src="${f.img}" alt="${f.name}取像" loading="lazy">
        <span class="fig-scan"></span>
        <span class="fig-code">${f.code}</span>
        <span class="fig-pick">取像 →</span>
      </div>
      <div class="fig-meta">
        <span class="fig-name">${f.name}</span>
        <span class="fig-rank">${f.rank}</span>
      </div>`;
    card.addEventListener("click", () => openFigure(f));
    grid.appendChild(card);
  });

  const modal = $("#figModal");
  const mStage = $("#mStage");
  const mImg = $("#mImg");
  const mDamage = $("#mDamage");
  let current = FIGURES[0];
  let lastFocus = null;

  function openFigure(f) {
    current = f;
    lastFocus = document.activeElement;
    $("#mCode").textContent = f.code;
    $("#mName").textContent = f.name;
    $("#mRank").textContent = f.rank;

    mImg.src = f.img;
    mImg.alt = f.name + " 取像图层";
    mImg.style.clipPath = `url(#${f.torn})`;

    $("#mCoord").textContent =
      "X " + String(Math.round(f.hot.x * 12.6)).padStart(3, "0") +
      " · Y " + String(Math.round(f.hot.y * 9.4)).padStart(3, "0");

    const facts = $("#mFacts");
    facts.innerHTML = f.facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
    $("#mIcon").textContent = f.icon;

    mDamage.innerHTML = f.damage
      .map(
        (d) =>
          `<span class="dmg" style="left:${d.x}%;top:${d.y}%;width:${d.w}%;aspect-ratio:1;border-radius:50%"><b>${d.label}</b></span>`
      )
      .join("");

    const rel = $("#mRel");
    rel.innerHTML = "";
    FIGURES.filter((x) => x.code !== f.code)
      .slice(0, 3)
      .forEach((x) => {
        const b = document.createElement("button");
        b.className = "m-rel-item";
        b.type = "button";
        b.innerHTML = `<img src="${x.img}" alt=""><span>${x.name}</span>`;
        b.addEventListener("click", () => openFigure(x));
        rel.appendChild(b);
      });

    setMView("extract");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    replaySweep();
    $(".modal-x").focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  function setMView(v) {
    mStage.classList.toggle("is-wall", v === "wall");
    mStage.classList.toggle("is-damage", v === "damage");
    $$("[data-mview]").forEach((b) => b.classList.toggle("is-on", b.dataset.mview === v));
  }

  function replaySweep() {
    mStage.classList.remove("is-sweeping");
    void mStage.offsetWidth;
    mStage.classList.add("is-sweeping");
    setTimeout(() => mStage.classList.remove("is-sweeping"), 1700);
  }

  $$("[data-mview]").forEach((b) =>
    b.addEventListener("click", () => setMView(b.dataset.mview))
  );
  $("#mReplay").addEventListener("click", replaySweep);
  $$("[data-close]").forEach((el) => el.addEventListener("click", closeModal));

  $("#mStory").addEventListener("click", () => {
    closeModal();
    selectFigure(FIGURES.indexOf(current), false);
    const sec = $("#stories");
    sec.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    setTimeout(() => generate(), 620);
  });

  /* ---------------- 07 叙事生成 ---------------- */
  const spFigures = $("#spFigures");
  const spViews = $("#spViews");
  const scTitle = $("#scTitle");
  const scText = $("#scText");
  const scHud = $("#scHud");
  const scSign = $("#scSign");
  const scViewEl = $("#scView");
  const scIdx = $("#scIdx");
  const scAgain = $("#storyAgain");
  const scKicker = $("#scKicker");

  let figIndex = 0;
  let viewIndex = 0;
  let typing = null;

  FIGURES.forEach((f, i) => {
    const b = document.createElement("button");
    b.className = "sp-fig" + (i === 0 ? " is-on" : "");
    b.type = "button";
    b.innerHTML = `<img src="${f.img}" alt=""><span>${f.name}</span><em>${f.code.replace("D—", "")}</em>`;
    b.addEventListener("click", () => selectFigure(i));
    spFigures.appendChild(b);
  });

  VIEWS.forEach((v, i) => {
    const b = document.createElement("button");
    b.className = "sp-view" + (i === 0 ? " is-on" : "");
    b.type = "button";
    b.textContent = v.name;
    b.addEventListener("click", () => {
      viewIndex = i;
      $$(".sp-view", spViews).forEach((el, k) => el.classList.toggle("is-on", k === i));
    });
    spViews.appendChild(b);
  });

  function selectFigure(i, clear = true) {
    figIndex = i;
    $$(".sp-fig", spFigures).forEach((el, k) => el.classList.toggle("is-on", k === i));
    if (clear) {
      scTitle.textContent = FIGURES[i].name;
      scKicker.textContent = "德格都苏莫殿 · 叙事库 · " + FIGURES[i].code;
      scText.innerHTML = `<p class="sc-empty">${FIGURES[i].name}已经取像。<br>选一个视角，替他说几句话。</p>`;
      scSign.hidden = true;
      scAgain.hidden = true;
      scHud.textContent = "待生成";
      scIdx.textContent = String(i + 1).padStart(2, "0") + " / " + String(FIGURES.length).padStart(2, "0");
    }
  }
  selectFigure(0, true);

  const HUD_STEPS = ["检索图像志条目", "比对壁画题记与残损记录", "匹配色彩与方位", "生成叙事"];

  function generate() {
    if (typing) clearInterval(typing);
    const f = FIGURES[figIndex];
    const v = VIEWS[viewIndex];
    const paras = [v.open, f.story, v.close];

    scKicker.textContent = "德格都苏莫殿 · 叙事库 · " + f.code;
    scTitle.textContent = f.storyTitle;
    scText.innerHTML = "";
    scSign.hidden = true;
    scAgain.hidden = true;
    scIdx.textContent = String(figIndex + 1).padStart(2, "0") + " / " + String(FIGURES.length).padStart(2, "0");

    const ps = paras.map((t) => {
      const p = document.createElement("p");
      p.style.visibility = "hidden";
      scText.appendChild(p);
      return { el: p, text: t };
    });
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    scText.appendChild(cursor);

    let hud = 0;
    scHud.textContent = "取像完成 · 正在生成";
    const hudTimer = setInterval(() => {
      if (hud < HUD_STEPS.length) {
        scHud.textContent = "正在" + HUD_STEPS[hud] + "…";
        hud++;
      } else {
        clearInterval(hudTimer);
        typeOut(ps, cursor, f, v);
      }
    }, 380);

    if (reduced) {
      clearInterval(hudTimer);
      ps.forEach((p) => {
        p.el.textContent = p.text;
        p.el.style.visibility = "visible";
      });
      finish(f, v, cursor);
    }
  }

  function typeOut(ps, cursor, f, v) {
    let pi = 0, ci = 0;
    ps[0].el.style.visibility = "visible";
    scHud.textContent = "生成中 · " + VIEWS[viewIndex].name + "视角";

    typing = setInterval(() => {
      if (pi >= ps.length) {
        clearInterval(typing);
        typing = null;
        finish(f, v, cursor);
        return;
      }
      const cur = ps[pi];
      ci += 2;
      cur.el.textContent = cur.text.slice(0, ci);
      if (ci >= cur.text.length) {
        cur.el.textContent = cur.text;
        pi++;
        ci = 0;
        if (pi < ps.length) ps[pi].el.style.visibility = "visible";
      }
    }, 26);
  }

  function finish(f, v, cursor) {
    if (typing) { clearInterval(typing); typing = null; }
    if (cursor && cursor.parentNode) cursor.remove();
    scHud.textContent = "取像完成 · 已生成 · 文学演绎";
    scViewEl.textContent = v.name + "视角";
    scSign.hidden = false;
    scAgain.hidden = false;
  }

  $("#storyGo").addEventListener("click", generate);

  scAgain.addEventListener("click", () => {
    viewIndex = (viewIndex + 1) % VIEWS.length;
    $$(".sp-view", spViews).forEach((el, k) => el.classList.toggle("is-on", k === viewIndex));
    generate();
  });

  scText.addEventListener("click", () => {
    if (!typing) return;
    clearInterval(typing);
    typing = null;
    const f = FIGURES[figIndex], v = VIEWS[viewIndex];
    $$("p", scText).forEach((p, i) => {
      p.textContent = [v.open, f.story, v.close][i] || p.textContent;
      p.style.visibility = "visible";
    });
    finish(f, v, $(".cursor", scText));
  });

  /* ---------------- 08 彩塑 ---------------- */
  const sculptFrame = $("#sculptFrame");
  const sculptHot = $("#sculptHot");
  const sculptList = $("#sculptList");

  SCULPT.forEach((s, i) => {
    const d = document.createElement("div");
    d.className = "s-hot";
    d.style.left = s.x + "%";
    d.style.top = s.y + "%";
    d.innerHTML = `<i></i><b>${s.name}</b>`;
    sculptHot.appendChild(d);

    const li = document.createElement("li");
    li.innerHTML = `<em>0${i + 1}</em>${s.name}　${s.h}`;
    sculptList.appendChild(li);
  });

  $$(".sculpt-toggle .tg").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".sculpt-toggle .tg").forEach((x) => x.classList.toggle("is-on", x === b));
      sculptFrame.classList.toggle("is-cloud", b.dataset.mode === "cloud");
    })
  );

  /* ---------------- 09 VR 片花 ---------------- */
  const vrChapters = $("#vrChapters");
  CHAPTERS.forEach((c, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<em>第 ${i + 1} 章</em><b>${c.t}</b><span>${c.d}</span>`;
    vrChapters.appendChild(li);
  });

  const cinema = $("#cinema");
  const cinScenes = $("#cinScenes");
  const cinCap = $("#cinCap");
  const cinBar = $("#cinBar");
  const cinCount = $("#cinCount");
  const DUR = 7000;
  let cinTimer = null, cinProgress = null, cinIdx = 0;

  CHAPTERS.forEach((c) => {
    const d = document.createElement("div");
    d.className = "cin-scene";
    d.innerHTML = `<img src="${c.img}" alt="">`;
    cinScenes.appendChild(d);
  });

  function playCinema() {
    cinema.hidden = false;
    document.body.style.overflow = "hidden";
    cinIdx = 0;
    showScene(0);
    startProgress();
  }

  function showScene(i) {
    cinIdx = i;
    const scenes = $$(".cin-scene", cinScenes);
    scenes.forEach((s, k) => s.classList.toggle("is-on", k === i));
    const c = CHAPTERS[i];
    cinCap.innerHTML = `<b>${c.t}</b><p>${c.cap}</p>`;
    cinCount.textContent = String(i + 1).padStart(2, "0") + " / " + String(CHAPTERS.length).padStart(2, "0");
    clearTimeout(cinTimer);
    cinTimer = setTimeout(() => {
      if (i + 1 < CHAPTERS.length) showScene(i + 1);
      else closeCinema();
    }, DUR);
  }

  function startProgress() {
    clearInterval(cinProgress);
    const t0 = performance.now();
    const total = DUR * CHAPTERS.length;
    cinProgress = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / total);
      cinBar.style.width = p * 100 + "%";
      if (p >= 1) clearInterval(cinProgress);
    }, 60);
  }

  function closeCinema() {
    cinema.hidden = true;
    document.body.style.overflow = "";
    clearTimeout(cinTimer);
    clearInterval(cinProgress);
    cinBar.style.width = "0";
  }

  $("#vrPlay").addEventListener("click", playCinema);
  $("#cinClose").addEventListener("click", closeCinema);
  cinema.addEventListener("click", (e) => {
    if (e.target === cinema || e.target.classList.contains("cin-veil")) closeCinema();
  });

  /* ---------------- 10 交付清单 ---------------- */
  const dl = $("#deliverList");
  DELIVER.forEach(([n, d, q]) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${n}</b><span>${d}</span><em>${q}</em>`;
    dl.appendChild(li);
  });

  /* ---------------- 11 键盘 ---------------- */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!cinema.hidden) closeCinema();
    else if (!modal.hidden) closeModal();
  });

  /* ---------------- 12 首屏锚点偏移 ---------------- */
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - (id === "#top" ? 0 : 10);
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    })
  );
})();
