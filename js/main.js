(function () {
  "use strict";

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById("nav-toggle");
  var mainNav = document.getElementById("main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      navToggle.innerHTML = isOpen
        ? '<svg class="icon" aria-hidden="true"><use href="#icon-close"/></svg>'
        : '<svg class="icon" aria-hidden="true"><use href="#icon-menu"/></svg>';
    });
    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mainNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-menu"/></svg>';
      });
    });
  }

  /* ---------- Before / After slider ---------- */
  var baData = {
    "house-wash": {
      before: "assets/images/before-after/house-wash-before.jpg",
      after: "assets/images/before-after/house-wash-after.jpg",
      beforeAlt: "Algae-stained siding before soft washing",
      afterAlt: "Bright, clean siding after soft washing"
    },
    "cedar-shake": {
      before: "assets/images/before-after/cedar-shake-before.jpg",
      after: "assets/images/before-after/cedar-shake-after.jpg",
      beforeAlt: "Weathered grey cedar shake siding before restoration",
      afterAlt: "Golden restored cedar shake siding after cleaning"
    },
    "gutter": {
      before: "assets/images/before-after/gutter-before.jpg",
      after: "assets/images/before-after/gutter-after.jpg",
      beforeAlt: "Gutter clogged with leaves and debris before cleaning",
      afterAlt: "Clear, clean gutter after debris removal"
    },
    "fence": {
      before: "assets/images/before-after/fence-before.jpg",
      after: "assets/images/before-after/fence-after.jpg",
      beforeAlt: "Weathered dark wood fence before cleaning",
      afterAlt: "Brightened wood fence after cleaning"
    },
    "dock": {
      before: "assets/images/before-after/dock-before.jpg",
      after: "assets/images/before-after/dock-after.jpg",
      beforeAlt: "Grey weathered dock boards before restoration",
      afterAlt: "Warm restored wood dock boards after cleaning"
    },
    "siding": {
      before: "assets/images/before-after/siding-before.jpg",
      after: "assets/images/before-after/siding-after.jpg",
      beforeAlt: "Faded vinyl siding before pressure washing",
      afterAlt: "Bright vinyl siding after pressure washing"
    },
    "graffiti": {
      before: "assets/images/before-after/graffiti-before.jpg",
      after: "assets/images/before-after/graffiti-after.jpg",
      beforeAlt: "Exterior wall with graffiti before removal",
      afterAlt: "Clean exterior wall after graffiti removal",
      position: "50% 74%"
    }
  };

  var frame = document.querySelector(".ba-slider-frame");
  var beforeWrap = document.getElementById("ba-before-wrap");
  var beforeImg = document.getElementById("ba-img-before");
  var afterImg = document.getElementById("ba-img-after");
  var divider = document.getElementById("ba-divider");
  var range = document.getElementById("ba-range");
  var tabs = document.querySelectorAll(".ba-tab");

  function setFrameWidthVar() {
    if (frame) frame.style.setProperty("--frame-w", frame.offsetWidth + "px");
  }

  function setSliderPosition(pct) {
    pct = Math.max(0, Math.min(100, pct));
    if (beforeWrap) beforeWrap.style.width = pct + "%";
    if (divider) divider.style.left = pct + "%";
    if (range) range.value = pct;
  }

  function loadPair(slug) {
    var data = baData[slug];
    if (!data || !beforeImg || !afterImg) return;
    beforeImg.src = data.before;
    beforeImg.alt = data.beforeAlt;
    beforeImg.style.objectPosition = data.position || "";
    afterImg.src = data.after;
    afterImg.alt = data.afterAlt;
    afterImg.style.objectPosition = data.position || "";
    setSliderPosition(50);
  }

  if (frame && range) {
    setFrameWidthVar();
    window.addEventListener("resize", setFrameWidthVar);

    var dragging = false;

    function pctFromClientX(clientX) {
      var rect = frame.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    }

    frame.addEventListener("pointerdown", function (e) {
      dragging = true;
      frame.setPointerCapture(e.pointerId);
      setSliderPosition(pctFromClientX(e.clientX));
    });
    frame.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      setSliderPosition(pctFromClientX(e.clientX));
    });
    frame.addEventListener("pointerup", function () { dragging = false; });
    frame.addEventListener("pointercancel", function () { dragging = false; });

    range.addEventListener("input", function () {
      setSliderPosition(parseFloat(range.value));
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      loadPair(tab.dataset.slug);
    });
  });

  /* ---------- Hero video: scroll-scrubbed playback (desktop only, respects reduced motion) ---------- */
  var heroVideoBg = document.getElementById("hero-video-bg");
  if (heroVideoBg) {
    var isDesktopViewport = window.matchMedia("(min-width: 769px)").matches;
    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isDesktopViewport && !prefersReducedMotion) {
      var heroSection = document.querySelector(".hero-video");
      var posterEl = document.getElementById("hero-video-poster");
      var heroVideo = document.createElement("video");
      heroVideo.className = "hero-video-el";
      heroVideo.muted = true;
      heroVideo.playsInline = true;
      heroVideo.preload = "auto";
      heroVideo.setAttribute("aria-hidden", "true");
      if (posterEl) heroVideo.poster = posterEl.getAttribute("src");
      heroVideo.innerHTML = '<source src="assets/videos/home-hero.mp4" type="video/mp4">';
      heroVideoBg.appendChild(heroVideo);

      var heroHeight = heroSection.offsetHeight;
      var scrubTicking = false;

      var updateScrubFrame = function () {
        scrubTicking = false;
        if (!heroVideo.duration) return;
        var progress = heroHeight > 0 ? window.scrollY / heroHeight : 0;
        progress = Math.min(Math.max(progress, 0), 1);
        heroVideo.currentTime = progress * heroVideo.duration;
      };

      heroVideo.addEventListener("loadedmetadata", function () {
        heroVideo.pause();
        heroHeight = heroSection.offsetHeight;
        updateScrubFrame();
        /* Scroll position can still be settling (restoration, layout shift from
           late-loading fonts/images) right after loadedmetadata fires, so re-sync
           once more after things have had a moment to settle. */
        window.setTimeout(updateScrubFrame, 300);
      });

      window.addEventListener("load", function () {
        heroHeight = heroSection.offsetHeight;
        updateScrubFrame();
      });

      window.addEventListener("scroll", function () {
        if (!scrubTicking) {
          window.requestAnimationFrame(updateScrubFrame);
          scrubTicking = true;
        }
      }, { passive: true });

      window.addEventListener("resize", function () {
        heroHeight = heroSection.offsetHeight;
      });
    }
  }

  /* ---------- Sticky header shadow on scroll ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var applyShadow = function () {
      header.style.boxShadow = window.scrollY > 8 ? "0 4px 20px rgba(1,58,39,0.08)" : "none";
    };
    applyShadow();
    window.addEventListener("scroll", applyShadow, { passive: true });
  }

  /* ---------- Quote modal ---------- */
  var quoteModal = document.getElementById("quote-modal");
  if (quoteModal) {
    var modalPanel = quoteModal.querySelector(".quote-modal-panel");
    var loadingEl = document.getElementById("quote-modal-loading");
    var jobberFormEl = document.getElementById("b128a33f-4dfd-41b5-bc7f-ec72c5cb6091-1709809");
    var jobberLoaded = false;
    var lastFocusedEl = null;

    window.dataLayer = window.dataLayer || [];

    function loadJobberForm() {
      if (jobberLoaded) return;
      jobberLoaded = true;

      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://d3ey4dbjkt2f6s.cloudfront.net/assets/external/work_request_embed.css";
      document.head.appendChild(link);

      var script = document.createElement("script");
      script.src = "https://d3ey4dbjkt2f6s.cloudfront.net/assets/static_link/work_request_embed_snippet.js";
      script.setAttribute("clienthub_id", "b128a33f-4dfd-41b5-bc7f-ec72c5cb6091-1709809");
      script.setAttribute("form_url", "https://clienthub.getjobber.com/client_hubs/b128a33f-4dfd-41b5-bc7f-ec72c5cb6091/public/work_request/embedded_work_request_form?form_id=1709809");
      document.body.appendChild(script);

      var attempts = 0;
      var poll = setInterval(function () {
        attempts++;
        var ready = jobberFormEl && jobberFormEl.children.length > 0;
        if (ready || attempts > 40) {
          if (loadingEl) loadingEl.style.display = "none";
          clearInterval(poll);
          if (ready) {
            window.dataLayer.push({ event: "quote_form_loaded" });
          }
        }
      }, 200);
    }

    function openQuoteModal(source) {
      lastFocusedEl = document.activeElement;
      quoteModal.classList.add("is-open");
      quoteModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      loadJobberForm();
      if (modalPanel) modalPanel.focus();
      window.dataLayer.push({
        event: "quote_modal_open",
        quote_source: source || "unknown",
        page_path: window.location.pathname
      });
    }

    function closeQuoteModal() {
      quoteModal.classList.remove("is-open");
      quoteModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      if (lastFocusedEl && typeof lastFocusedEl.focus === "function") lastFocusedEl.focus();
    }

    document.querySelectorAll("[data-quote-trigger]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openQuoteModal(btn.getAttribute("data-quote-source"));
      });
    });

    quoteModal.querySelectorAll("[data-modal-close]").forEach(function (el) {
      el.addEventListener("click", closeQuoteModal);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && quoteModal.classList.contains("is-open")) closeQuoteModal();
    });

    /* Basic focus trap while modal is open */
    quoteModal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !quoteModal.classList.contains("is-open")) return;
      var focusable = quoteModal.querySelectorAll('button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ---------- Inline quote form (contact section) ---------- */
  var inlineQuoteContainer = document.getElementById("inline-quote-form");
  if (inlineQuoteContainer) {
    var inlineJobberEl = document.getElementById("jobber-inline-contact");
    var inlineLoadingEl = document.getElementById("inline-quote-loading");
    var inlineLoaded = false;

    window.dataLayer = window.dataLayer || [];

    var loadInlineJobberForm = function () {
      if (inlineLoaded) return;
      inlineLoaded = true;

      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://d3ey4dbjkt2f6s.cloudfront.net/assets/external/work_request_embed.css";
      document.head.appendChild(link);

      var script = document.createElement("script");
      script.src = "https://d3ey4dbjkt2f6s.cloudfront.net/assets/static_link/work_request_embed_snippet.js";
      script.setAttribute("clienthub_id", "jobber-inline-contact");
      script.setAttribute("form_url", "https://clienthub.getjobber.com/client_hubs/b128a33f-4dfd-41b5-bc7f-ec72c5cb6091/public/work_request/embedded_work_request_form?form_id=1709809");
      document.body.appendChild(script);

      var attempts = 0;
      var poll = setInterval(function () {
        attempts++;
        var ready = inlineJobberEl && inlineJobberEl.children.length > 0;
        if (ready || attempts > 40) {
          if (inlineLoadingEl) inlineLoadingEl.style.display = "none";
          clearInterval(poll);
          if (ready) {
            window.dataLayer.push({ event: "quote_form_loaded", quote_source: "contact-section-inline" });
          }
        }
      }, 200);
    };

    if ("IntersectionObserver" in window) {
      var inlineObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadInlineJobberForm();
            inlineObserver.disconnect();
          }
        });
      }, { rootMargin: "200px 0px" });
      inlineObserver.observe(inlineQuoteContainer);
    } else {
      loadInlineJobberForm();
    }
  }

  /* ---------- Media lightbox (gallery videos) ---------- */
  var mediaLightbox = document.getElementById("media-lightbox");
  if (mediaLightbox) {
    var lightboxPanel = mediaLightbox.querySelector(".media-lightbox-panel");
    var lightboxVideoWrap = document.getElementById("media-lightbox-video-wrap");
    var lastFocusedLightboxEl = null;

    function openMediaLightbox(videoSrc) {
      lastFocusedLightboxEl = document.activeElement;
      var video = document.createElement("video");
      video.src = videoSrc;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      lightboxVideoWrap.appendChild(video);

      mediaLightbox.classList.add("is-open");
      mediaLightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      if (lightboxPanel) lightboxPanel.focus();
    }

    function closeMediaLightbox() {
      mediaLightbox.classList.remove("is-open");
      mediaLightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      var video = lightboxVideoWrap.querySelector("video");
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.remove();
      }
      if (lastFocusedLightboxEl && typeof lastFocusedLightboxEl.focus === "function") lastFocusedLightboxEl.focus();
    }

    document.querySelectorAll("[data-lightbox-trigger]").forEach(function (item) {
      item.addEventListener("click", function () {
        openMediaLightbox(item.getAttribute("data-video-src"));
      });
      item.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openMediaLightbox(item.getAttribute("data-video-src"));
        }
      });
    });

    mediaLightbox.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", closeMediaLightbox);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mediaLightbox.classList.contains("is-open")) closeMediaLightbox();
    });

    mediaLightbox.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !mediaLightbox.classList.contains("is-open")) return;
      var focusable = mediaLightbox.querySelectorAll('button, [href], video, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }
})();
