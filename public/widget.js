/*!
 * StrandLab store widget — adds a "Find my hair match" button to any product page.
 *
 *   <script src="https://strandlab-youcam.vercel.app/widget.js" async></script>
 *   <div data-strandlab
 *        data-product="Curl Defining Gel"
 *        data-product-id="sku-123"
 *        data-ingredients="Aqua, Glycerin, Polyquaternium-11, …"></div>
 *
 * Results: listen for the "strandlab:result" DOM event (bubbles from the element, also fired on document),
 * or call StrandLab.onResult(fn). Once a shopper has a profile, every [data-strandlab] element on the page
 * gets a match badge automatically ("strandlab:score" events).
 * No dependencies. Styles are isolated in Shadow DOM. Messages are origin-checked both ways.
 */
(function () {
  "use strict";
  if (window.StrandLab && window.StrandLab.version) return;

  var script = document.currentScript;
  var SRC = (script && script.src) || "https://strandlab-youcam.vercel.app/widget.js";
  var ORIGIN = new URL(SRC, location.href).origin;
  var ds = (script && script.dataset) || {};
  var CFG = {
    label: ds.label || "Find my hair match",
    color: ds.color || "#2F6B66",
    autoScore: ds.autoScore !== "false",
  };

  var frame = null,
    overlay = null,
    dialog = null,
    ready = false,
    queue = [],
    hasProfile = false,
    current = null,
    lastFocus = null,
    listeners = [],
    seq = 0;

  // ---------- styles for the overlay (light DOM, prefixed) ----------
  var style = document.createElement("style");
  style.textContent =
    ".sl-w-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(20,28,28,.45);display:none;align-items:center;justify-content:center;padding:16px}" +
    ".sl-w-overlay[data-open]{display:flex}" +
    ".sl-w-dialog{width:440px;max-width:100%;height:min(720px,100%);border-radius:20px;overflow:hidden;background:#F6F3EE;box-shadow:0 24px 80px rgba(0,0,0,.35)}" +
    ".sl-w-dialog iframe{width:100%;height:100%;border:0;display:block}" +
    "@media (max-width:520px){.sl-w-overlay{padding:0}.sl-w-dialog{width:100%;height:100%;border-radius:0}}" +
    ".sl-w-hidden{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;left:-9999px!important}";
  document.head.appendChild(style);

  function ensureFrame() {
    if (frame) return;
    overlay = document.createElement("div");
    overlay.className = "sl-w-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "StrandLab hair match");
    dialog = document.createElement("div");
    dialog.className = "sl-w-dialog";
    frame = document.createElement("iframe");
    frame.src = ORIGIN + "/widget";
    frame.title = "StrandLab hair match";
    frame.setAttribute("allow", "clipboard-write");
    dialog.appendChild(frame);
    overlay.appendChild(dialog);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.body.appendChild(overlay);
  }

  function send(msg) {
    if (ready && frame && frame.contentWindow) frame.contentWindow.postMessage(msg, ORIGIN);
    else queue.push(msg);
  }

  function open(product, el) {
    ensureFrame();
    current = el || null;
    lastFocus = document.activeElement;
    overlay.setAttribute("data-open", "");
    document.documentElement.style.overflow = "hidden";
    send({ type: "strandlab:open", product: product || null });
    setTimeout(function () {
      frame && frame.focus();
    }, 50);
  }

  function close() {
    if (!overlay) return;
    overlay.removeAttribute("data-open");
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay && overlay.hasAttribute("data-open")) close();
  });

  // ---------- product buttons ----------
  function productOf(el) {
    var ing = el.getAttribute("data-ingredients");
    var sel = el.getAttribute("data-ingredients-selector");
    if (!ing && sel) {
      var n = document.querySelector(sel);
      ing = n ? n.textContent : "";
    }
    if (!el.getAttribute("data-product-id")) el.setAttribute("data-product-id", "sl-" + ++seq);
    return {
      id: el.getAttribute("data-product-id"),
      name: el.getAttribute("data-product") || document.title,
      ingredients: (ing || "").trim().slice(0, 4000),
    };
  }

  var COLORS = { great: ["#DCEAE7", "#214E4A"], ok: ["#F6E7CF", "#6B4410"], skip: ["#F4DCD3", "#8A2E18"] };

  function render(el, state) {
    var root = el.__slRoot;
    var c = CFG.color;
    var label = el.getAttribute("data-label") || CFG.label;
    var badge = "";
    if (state && state.match != null) {
      var col = COLORS[state.verdict] || COLORS.ok;
      badge =
        '<span class="b" style="background:' + col[0] + ";color:" + col[1] + '">' + state.match + "% match</span>" +
        '<span class="t">' + (state.verdict === "great" ? "Suits your hair" : state.verdict === "ok" ? "Okay for your hair" : "Not ideal for your hair") + " · details</span>";
    } else if (state && state.loading) {
      badge = '<span class="t">Checking your match…</span>';
    }
    root.innerHTML =
      "<style>" +
      ":host{display:inline-block}" +
      "button{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;border:1.5px solid " + c + ";background:#fff;color:" + c + ";font:600 14px/1.25 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer;transition:background .15s,color .15s}" +
      "button:hover{background:" + c + ";color:#fff}" +
      "button:focus-visible{outline:3px solid " + c + ";outline-offset:2px}" +
      ".b{border-radius:999px;padding:2px 8px;font-size:12px;font-weight:700}" +
      ".t{font-weight:500}" +
      "svg{width:18px;height:18px;flex:none}" +
      "</style>" +
      '<button type="button" aria-haspopup="dialog">' +
      '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="' + c + '"/><path d="M9 23c3-4 1-8 4-11s6-1 7-4M13 25c3-4 1-8 4-11s6-1 7-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' +
      (badge || "<span>" + label + "</span>") +
      "</button>";
    root.querySelector("button").addEventListener("click", function () {
      open(productOf(el), el);
    });
  }

  function mount(el) {
    if (el.__slRoot) return;
    el.__slRoot = el.attachShadow ? el.attachShadow({ mode: "open" }) : el;
    render(el, null);
  }

  function elements() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-strandlab]"));
  }

  function scan() {
    elements().forEach(mount);
  }

  /** After the shopper has a profile: badge every product button on the page. */
  function scoreAll(except) {
    if (!CFG.autoScore || !hasProfile) return;
    var items = elements()
      .filter(function (el) {
        return el !== except && !el.__slScored;
      })
      .map(function (el) {
        el.__slScored = true;
        render(el, { loading: true });
        return productOf(el);
      })
      .filter(function (p) {
        return p.ingredients;
      });
    if (items.length) send({ type: "strandlab:score", items: items });
  }

  function byId(id) {
    return elements().filter(function (el) {
      return el.getAttribute("data-product-id") === id;
    })[0];
  }

  function emit(target, name, detail) {
    var ev;
    try {
      ev = new CustomEvent(name, { detail: detail, bubbles: true });
    } catch (e) {
      ev = document.createEvent("CustomEvent");
      ev.initCustomEvent(name, true, false, detail);
    }
    (target || document).dispatchEvent(ev); // bubbles, so document-level listeners hear it too
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== ORIGIN || !frame || e.source !== frame.contentWindow) return;
    var d = e.data || {};
    if (d.type === "strandlab:ready") {
      ready = true;
      hasProfile = !!d.hasProfile;
      var q = queue;
      queue = [];
      q.forEach(send);
      scoreAll();
    } else if (d.type === "strandlab:result" && d.result) {
      var r = d.result;
      if (current && r.product) {
        current.__slScored = true;
        render(current, r.product);
      }
      emit(current || document, "strandlab:result", r);
      listeners.forEach(function (fn) {
        try {
          fn(r, current);
        } catch (err) {
          console.error(err);
        }
      });
      var wasNew = !hasProfile;
      hasProfile = true;
      if (wasNew) scoreAll(current);
    } else if (d.type === "strandlab:scores" && d.items) {
      d.items.forEach(function (it) {
        var el = byId(it.id);
        if (!el) return;
        render(el, it);
        emit(el, "strandlab:score", it);
      });
    } else if (d.type === "strandlab:close") {
      close();
    }
  });

  // Load the (hidden) frame early so returning shoppers get badges without clicking.
  function boot() {
    scan();
    ensureFrame();
    if ("MutationObserver" in window) {
      new MutationObserver(function () {
        scan();
        scoreAll();
      }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.StrandLab = {
    version: "1.0.0",
    /** Open the match dialog for a product ({name, ingredients, id}) or with no product (profile + ingredient guide). */
    open: function (product) {
      open(product || null, null);
    },
    close: close,
    /** fn(result, element) — called with every result (see README "For stores"). */
    onResult: function (fn) {
      listeners.push(fn);
    },
    /** Re-scan the page for new [data-strandlab] elements (also automatic via MutationObserver). */
    scan: scan,
  };
})();
