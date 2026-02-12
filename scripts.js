// Helper to handle relative paths for both root and subpages
function getAssetPath(path) {
  // Check if we are on GitHub Pages (e.g., username.github.io/repo-name/)
  const isGitHubPages = window.location.hostname.includes("github.io") &&
    window.location.pathname.split("/").length > 2;

  if (isGitHubPages && path.startsWith("/")) {
    const repoName = window.location.pathname.split("/")[1];
    return `/${repoName}${path}`;
  }
  return path;
}

const SECTION_TARGETS = [
  { id: "hero-container", path: "/sections/hero.html" },
  { id: "hero-container2", path: "/sections/hero sec.html" },
  { id: "hero-container3", path: "/sections/hero3.html" },
  { id: "hero-container4", path: "/sections/hero4.html" },
  { id: "results-container", path: "/sections/results.html" },
  { id: "services-container", path: "/sections/services.html" },
  { id: "study-container", path: "/sections/study.html" },
  { id: "visas-container", path: "/sections/visas.html" },
  { id: "tech-container", path: "/sections/tech.html" },
  { id: "scholarship-banner-container", path: "/sections/scholarship-banner.html" },
  { id: "testimonials-container", path: "/sections/testimonials.html" },
  { id: "academy-tech-container", path: "/sections/academy-tech.html" },
  { id: "scholarship-container", path: "/sections/scholarship.html" },
  { id: "faq-container", path: "/sections/faq.html" },
  { id: "footer-container", path: "/sections/footer.html" },
  { id: "mobile-menu-container", path: "/sections/mobile-menu.html" },
];

document.addEventListener("DOMContentLoaded", () => {
  console.log("Versiyon: 1.8.0 - With Barba.js");

  // Initial load
  initApp(document);

  // Initialize Barba
  initBarba();
});

function initApp(scope = document) {
  loadSections(scope)
    .then(() => loadNavbar(scope))
    .then(() => initPage(scope))
    .catch((error) => console.error("Section load failed", error));
}

function initBarba() {
  barba.init({
    sync: true,
    transitions: [{
      async enter(data) {
        initApp(data.next.container);
      },
      async once(data) {
        initApp(data.next.container);
      }
    }]
  });
}

async function loadSections(scope = document) {
  const promises = SECTION_TARGETS.map(async ({ id, path }) => {
    const container = scope.querySelector(`#${id}`);
    if (!container) return;
    try {
      const response = await fetch(getAssetPath(`${path}?v=${Date.now()}`));
      if (!response.ok) return;
      container.innerHTML = await response.text();
    } catch (e) {
      console.error(`Failed to load section ${id} from ${path}`, e);
    }
  });
  await Promise.all(promises);
}

async function loadNavbar(scope = document) {
  const container = scope.querySelector("#navbar-container");
  if (!container) return;
  try {
    // Load static HTML instead of JSON
    const response = await fetch(getAssetPath(`/sections/navbar.html?v=${Date.now()}`));
    if (!response.ok) throw new Error("Failed to load navbar.html");
    const navHtml = await response.text();
    container.innerHTML = navHtml;

    // Set active link based on current path
    const currentPath = window.location.pathname;
    const navLinks = container.querySelectorAll(".nav-link");

    // Normalize path for root
    const normalizedPath = currentPath === '/index.html' ? '/' : currentPath;

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      // Simple exact match or root match
      const isActive = (href === '/' && (normalizedPath === '/' || normalizedPath === '/index.html')) ||
        (href !== '/' && normalizedPath.startsWith(href));

      if (isActive) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.setAttribute('aria-current', 'false');
      }
    });

  } catch (e) {
    console.error("Navbar load failed", e);
  }
}

function initPage(scope = document) {
  const dropdown = scope.querySelector(".dropdown");
  const navLinks = scope.querySelectorAll(".nav-link");
  const toggle = dropdown?.querySelector('[data-bs-toggle="dropdown"]');
  const menu = dropdown?.querySelector(".dropdown-menu");
  const arrowIcon = toggle?.querySelector(".dropdown-arrow-icon");
  const languageLabel = dropdown?.querySelector(".language-label");
  const languageFlag = dropdown?.querySelector(".language-flag");
  const languageButtons = dropdown?.querySelectorAll(".dropdown-item") || [];
  const hero = scope.querySelector("#hero");
  const globe = scope.querySelector(".globe-wrap");
  const ellipse = scope.querySelector(".ellipse");
  const heroElementWrap = scope.querySelector(".hero-element-wrap");
  let heroElement = heroElementWrap?.querySelector(".hero-element");
  let heroElementAnimating = false;
  const studyTabs = scope.querySelectorAll(".study-tab");
  const studyCards = scope.querySelectorAll(".study-card");
  const techTabs = scope.querySelectorAll(".tech-tab");
  const techGrids = scope.querySelectorAll(".tech-grid");
  const techProgramsGrid = scope.querySelector('.tech-grid[data-tab="tech"]');
  const faqItems = scope.querySelectorAll(".faq-item");

  const LANGUAGE_MAP = {
    AZE: "az",
    USA: "en",
  };
  const DEFAULT_LANGUAGE = "AZE";
  const getI18nNodes = () => scope.querySelectorAll("[data-i18n-key]");
  const translationCache = {};

  // -- Universal AI Management Blueprint: Content Binding --
  const bindDynamicContent = async () => {
    try {
      const res = await fetch(getAssetPath(`/data/content4.json?v=${Date.now()}`));
      if (!res.ok) return;
      const content = await res.json();

      // 1. Dynamic Section Rendering (Full CMS control)
      renderDynamicServices(content);
      renderDynamicStudy(content);
      // You can add more like renderDynamicFaq(content), etc.

      // 2. Universal Binding (Text & Images)
      // Supports data-i18n-key AND data-content-key
      const reactiveElements = scope.querySelectorAll("[data-i18n-key], [data-content-key]");

      reactiveElements.forEach(el => {
        const key = el.getAttribute('data-content-key') || el.getAttribute('data-i18n-key');
        if (!content[key]) return;

        const value = content[key].trim();
        if (!value) return;

        // Handle Images
        if (el.tagName === 'IMG') {
          el.src = value;
          el.onerror = () => { el.src = 'https://placehold.co/600x400?text=Image+Not+Found'; };
        }
        // Handle Background Images (SafeImage principle)
        else if (el.hasAttribute('data-bg')) {
          el.style.backgroundImage = `url('${value}')`;
        }
        // Handle Text
        else {
          el.innerHTML = value;
        }
      });

      console.log(`Universal Management: ${Object.keys(content).length} keys synced.`);
      setupStudyTabs(); // Re-initialize tabs after dynamic content is loaded
    } catch (e) {
      console.warn('Universal Management: Failed to sync content', e);
    }
  };

  function renderDynamicServices(content) {
    const container = scope.querySelector('.services-grid-inner');
    if (!container) return;

    const services = {};
    Object.keys(content).forEach(key => {
      if (key.startsWith('services.card')) {
        const match = key.match(/services\.card(\d+)\.(.+)/);
        if (match) {
          const idx = match[1];
          const field = match[2];
          if (!services[idx]) services[idx] = {};
          services[idx][field] = content[key];
        }
      }
    });

    const keys = Object.keys(services).sort((a, b) => a - b);
    if (keys.length === 0) return;

    container.innerHTML = keys.map(idx => `
      <article class="service-card" data-service-id="card${idx}">
          <h3>
              <span class="service-num">${idx.padStart(2, '0')}.</span>
              <span>${services[idx].title || ''}</span>
          </h3>
          <p>${services[idx].desc || ''}</p>
          <div class="service-card-icon">
            <img src="${services[idx].icon || '/services/Arrow up-right.png'}" alt="">
          </div>
      </article>
    `).join('');
  }

  function renderDynamicStudy(content) {
    const container = scope.querySelector('.study-cards');
    if (!container) return;

    const cards = {};
    Object.keys(content).forEach(key => {
      if (key.startsWith('study.card')) {
        const match = key.match(/study\.card(\d+)\.(.+)/);
        if (match) {
          const idx = match[1];
          const field = match[2];
          if (!cards[idx]) cards[idx] = {};
          cards[idx][field] = content[key];
        }
      }
    });

    const keys = Object.keys(cards).sort((a, b) => a - b);
    if (keys.length === 0) return;

    container.innerHTML = keys.map(idx => `
      <article class="study-card" data-degree="${cards[idx].degree || 'bachelor'}">
        <div class="study-card-figure" style="--study-card-image: url('${cards[idx].image || 'https://placehold.co/379x177'}');"></div>
        <div class="study-card-body">
          <div class="study-card-title">${cards[idx].title || ''}</div>
          <p class="study-card-desc">${cards[idx].desc || ''}</p>
          <div class="study-card-meta">
            <span>${cards[idx].location || ''}</span>
            <span>${cards[idx].due || ''}</span>
          </div>
        </div>
        <div class="study-card-footer">
          <div class="study-card-price">${cards[idx].price || '2200€'}/ <span class="sub">yearly</span></div>
          <div class="study-card-apply">Apply</div>
        </div>
      </article>
    `).join('');
  }

  // Hotkey to open Admin: Ctrl + Shift + A
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      window.open('/admin/index.html', '_blank');
    }
  });

  bindDynamicContent();
  // -------------------------------------------------------

  const formatStudyDescriptions = () => {
    scope.querySelectorAll(".study-card-desc").forEach((desc) => {
      const text = desc.textContent?.trim() || "";
      const match = text.match(/\s[-–—]\s/);
      if (!match || typeof match.index !== "number") return;
      const separator = match[0];
      const index = match.index;
      const prefix = text.slice(0, index);
      const suffix = text.slice(index + separator.length);
      desc.innerHTML = "";
      const strong = document.createElement("span");
      strong.className = "study-card-desc-strong";
      strong.textContent = prefix;
      const sep = document.createElement("span");
      sep.className = "study-card-desc-sep";
      sep.textContent = separator;
      const detail = document.createElement("span");
      detail.className = "study-card-desc-detail";
      detail.textContent = suffix;
      desc.append(strong, sep, detail);
    });
  };




  const addProgram = (
    badgetext,
    title,
    img,
    desc,
    lessoncoynt,
    { badgeKey, titleKey, descKey, lessonsKey = "tech.lessonCount", applyKey = "tech.apply" } = {}
  ) => {
    const card = document.createElement("div");
    card.className = "tech-card";

    const chip = document.createElement("div");
    chip.className = "tech-chip";
    chip.textContent = badgetext;
    if (badgeKey) chip.dataset.i18nKey = badgeKey;


    const heading = document.createElement("h3");
    heading.textContent = title;
    if (titleKey) heading.dataset.i18nKey = titleKey;


    const media = document.createElement("div");
    media.className = "tech-media";
    const image = document.createElement("img");
    image.src = img;
    image.alt = badgetext;
    media.appendChild(image);

    const description = document.createElement("p");
    description.className = "tech-desc";
    description.textContent = desc;
    if (descKey) description.dataset.i18nKey = descKey;


    const footer = document.createElement("div");
    footer.className = "tech-footer";

    const lessons = document.createElement("div");
    lessons.className = "tech-lessons";
    const icon = document.createElement("img");
    icon.src = getAssetPath("/elements/book.svg");
    icon.alt = "Book icon";
    icon.width = 20;
    icon.height = 20;
    const lessonSpan = document.createElement("span");
    lessonSpan.textContent = lessoncoynt;
    if (lessonsKey) lessonSpan.dataset.i18nKey = lessonsKey;

    lessons.append(icon, lessonSpan);

    const button = document.createElement("button");
    button.className = "tech-apply";
    button.type = "button";
    button.textContent = "Müraciət et";
    if (applyKey) button.dataset.i18nKey = applyKey;


    footer.append(lessons, button);
    card.append(chip, heading, media, description, footer);
    return card;
  };



  const originalTexts = {};

  const saveOriginalTexts = () => {
    getI18nNodes().forEach((element) => {
      const key = element.dataset.i18nKey;
      if (!originalTexts[key]) {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          originalTexts[key] = element.placeholder;
        } else {
          originalTexts[key] = element.innerHTML;
        }
      }
    });
  };

  const restoreOriginalTexts = () => {
    getI18nNodes().forEach((element) => {
      const key = element.dataset.i18nKey;
      const originalText = originalTexts[key];
      if (originalText) {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          element.placeholder = originalText;
        } else {
          element.innerHTML = originalText;
        }
      }
    });
    formatStudyDescriptions();
  };

  const applyTranslations = (dictionary) => {
    getI18nNodes().forEach((element) => {
      const key = element.dataset.i18nKey;
      const translation = dictionary[key];
      if (typeof translation === "string") {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          element.placeholder = translation;
        } else {
          element.innerHTML = translation;
        }
      }
    });
    formatStudyDescriptions();
  };

  const loadTranslationFile = async (code) => {
    if (translationCache[code]) {
      return translationCache[code];
    }
    try {
      const response = await fetch(getAssetPath(`/${code}.json`));
      if (!response.ok) {
        throw new Error(`Unable to fetch ${code}.json`);
      }
      const data = await response.json();
      translationCache[code] = data;
      return data;
    } catch (error) {
      console.error(error);
      return {};
    }
  };

  const setLanguage = (code) => {
    if (code === "az") {
      restoreOriginalTexts();
    } else {
      loadTranslationFile(code).then((dictionary) => {
        applyTranslations(dictionary);
      });
    }
  };

  const updateLanguageByAttr = (langAttr) => {
    const normalizedLang = LANGUAGE_MAP[langAttr] || LANGUAGE_MAP[DEFAULT_LANGUAGE];
    setLanguage(normalizedLang);
  };

  const handleSelection = (button) => {
    const lang = button.dataset.lang;
    const flag = button.dataset.flag;
    if (lang && languageLabel) {
      languageLabel.textContent = lang;
    }
    if (flag && languageFlag) {
      languageFlag.src = flag;
    }
    languageButtons.forEach((btn) => {
      if (btn === button) {
        btn.setAttribute("aria-current", "true");
      } else {
        btn.removeAttribute("aria-current");
      }
    });
    closeMenu();
    // updateLanguageByAttr(lang); // Disabled for now as per user request
  };

  const fadeFlagImage = (img, targetSrc) => {
    if (!img || !targetSrc) return;
    if (img.dataset.fadeTimeout) {
      clearTimeout(Number(img.dataset.fadeTimeout));
    }
    const currentSrc = img.dataset.currentSrc || img.src;
    if (currentSrc === targetSrc) return;
    img.style.transition = "opacity 0.1s ease";
    img.style.opacity = "0";
    const timeoutId = window.setTimeout(() => {
      img.src = targetSrc;
      img.style.opacity = "1";
      img.dataset.currentSrc = targetSrc;
      delete img.dataset.fadeTimeout;
    }, 100);
    img.dataset.fadeTimeout = timeoutId.toString();
  };


  const alignEllipses = () => {
    if (window.innerWidth < 992) return;
    if (!hero || !globe || !ellipse) return;
    const heroRect = hero.getBoundingClientRect();
    const globeRect = globe.getBoundingClientRect();
    const centerX = globeRect.left + globeRect.width / 2 - heroRect.left;
    const centerY =
      globeRect.top + globeRect.height / 2 - heroRect.top - 120; // position ring further upward
    const ellipseSize = globeRect.width + 348;

    ellipse.style.width = `${ellipseSize}px`;
    ellipse.style.height = `${ellipseSize}px`;
    ellipse.style.left = `${centerX}px`;
    ellipse.style.top = `${centerY}px`;
    ellipse.style.transform = "translate(-50%, -50%)";
    ellipse.style.opacity = "1";
  };

  const closeMenu = () => {
    dropdown?.classList.remove("show");
    menu?.classList.remove("show");
    toggle?.setAttribute("aria-expanded", "false");
    if (arrowIcon) {
      arrowIcon.src = getAssetPath("/elements/arrow-down.svg");
    }
  };

  const toggleMenu = (event) => {
    event.stopPropagation();
    const isOpen = dropdown?.classList.toggle("show") || false;
    if (menu) {
      menu.classList.toggle("show", isOpen);
    }
    toggle?.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (arrowIcon) {
      arrowIcon.src = isOpen ? getAssetPath("/Navbar/arrow-down.png") : getAssetPath("/elements/arrow-down.svg");
    }
  };



  let activeIncoming = null;
  let activeOutgoing = null;
  const enableHeroElementSwap = () => {
    if (!heroElementWrap || !heroElement) return;

    const handleLeave = () => {
      heroElementAnimating = false;
      activeOutgoing?.remove();
      activeIncoming?.remove();
      activeOutgoing = null;
      activeIncoming = null;
      heroElement.classList.remove(
        "hero-element--outgoing",
        "hero-element--outgoing-active",
        "hero-element--incoming",
        "hero-element--incoming-active"
      );
      heroElement.classList.add("hero-element--return");
      requestAnimationFrame(() => {
        heroElement.classList.remove("hero-element--return");
      });
    };

    const handleHover = () => {
      if (heroElementAnimating) return;
      heroElementAnimating = true;

      const current = heroElement;
      const incoming = current.cloneNode(true);
      incoming.classList.add("hero-element--incoming");
      heroElementWrap.appendChild(incoming);
      activeOutgoing = current;
      activeIncoming = incoming;

      requestAnimationFrame(() => {
        current.classList.add("hero-element--outgoing", "hero-element--outgoing-active");
        incoming.classList.add("hero-element--incoming-active");
      });

      const cleanup = (event) => {
        if (event.target !== current) return;
        current.removeEventListener("transitionend", cleanup);
        current.removeEventListener("mouseleave", handleLeave);
        current.remove();
        incoming.classList.remove("hero-element--incoming", "hero-element--incoming-active");
        heroElement = incoming;
        heroElementAnimating = false;
        heroElement.addEventListener("mouseenter", handleHover);
        heroElement.addEventListener("mouseleave", handleLeave);
        activeOutgoing = null;
        activeIncoming = null;
      };

      current.addEventListener("transitionend", cleanup);
      current.removeEventListener("mouseenter", handleHover);
      current.removeEventListener("mouseleave", handleLeave);
    };

    heroElement.addEventListener("mouseenter", handleHover);
    heroElement.addEventListener("mouseleave", handleLeave);
  };

  const setupServiceIcons = () => {
    const cards = document.querySelectorAll(".service-card");
    cards.forEach((card) => {
      const icon = card.querySelector(".service-card-icon img");
      if (!icon) return;
      const base = icon.dataset.base || icon.src;
      const hover = icon.dataset.hover || base;
      if (base === hover) return;
      card.addEventListener("mouseenter", () => {
        icon.src = hover;
      });
      card.addEventListener("mouseleave", () => {
        icon.src = base;
      });
    });
  };

  const setupStudyTabs = () => {
    const tabs = scope.querySelectorAll(".study-tab");

    if (!tabs.length) return;

    const activateDegree = (degree) => {
      // Re-query current cards to ensure we're targeting the right DOM elements
      const currentCards = scope.querySelectorAll(".study-card");

      tabs.forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.degree === degree);
      });
      currentCards.forEach((card) => {
        const cardDegree = card.dataset.degree || "";
        // Support partial matches (e.g., 'bachelor' matching 'bachelor degree') or exact
        const isMatch = cardDegree.toLowerCase().includes(degree.toLowerCase());
        card.style.display = isMatch ? "flex" : "none";
        card.classList.toggle("hidden", !isMatch);
      });
    };

    tabs.forEach((tab) => {
      if (tab.dataset.initialized) return;
      tab.dataset.initialized = "true";

      tab.addEventListener("click", () => {
        activateDegree(tab.dataset.degree || "");
      });
    });

    // Find first active tab or default to first tab
    const activeTab = scope.querySelector(".study-tab.active") || tabs[0];
    if (activeTab) activateDegree(activeTab.dataset.degree || "");
  };

  const setupTechTabs = () => {
    const tabs = scope.querySelectorAll(".tech-tab");
    const grids = scope.querySelectorAll(".tech-grid");

    if (!tabs.length || !grids.length) return;

    const activateTab = (tabName) => {
      tabs.forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.tab === tabName);
      });
      grids.forEach((grid) => {
        grid.classList.toggle("active", grid.dataset.tab === tabName);
      });
    };

    tabs.forEach((tab) => {
      if (tab.dataset.initialized) return;
      tab.dataset.initialized = "true";

      tab.addEventListener("click", () => activateTab(tab.dataset.tab || ""));
    });

    const activeTab = scope.querySelector(".tech-tab.active");
    if (activeTab) activateTab(activeTab.dataset.tab || "");
    else if (tabs[0]) activateTab(tabs[0].dataset.tab || "");
  };

  const setupFaq = () => {
    const items = scope.querySelectorAll(".faq-item");
    if (!items.length) return;

    items.forEach((item) => {
      const question = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");
      const icon = question?.querySelector(".faq-icon");
      if (!question || !answer) return;

      // Ensure fresh state
      item.classList.remove("open");
      question.setAttribute("aria-expanded", "false");
      if (icon) icon.textContent = "+";

      // Remove existing listener to avoid duplicates if any
      const newQuestion = question.cloneNode(true);
      question.parentNode.replaceChild(newQuestion, question);

      newQuestion.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Close all other items
        items.forEach((otherItem) => {
          if (otherItem !== item && otherItem.classList.contains("open")) {
            otherItem.classList.remove("open");
            const otherQuestion = otherItem.querySelector(".faq-question");
            const otherIcon = otherQuestion?.querySelector(".faq-icon");
            if (otherQuestion) otherQuestion.setAttribute("aria-expanded", "false");
            if (otherIcon) otherIcon.textContent = "+";
          }
        });

        const isOpen = item.classList.toggle("open");
        newQuestion.setAttribute("aria-expanded", isOpen ? "true" : "false");
        if (icon) {
          // Re-query icon in newQuestion
          const newIcon = newQuestion.querySelector(".faq-icon");
          if (newIcon) newIcon.textContent = isOpen ? "−" : "+";
        }
      });
    });
  };

  const setupTestimonials = () => {
    const container = scope.querySelector("[data-testimonials]");
    if (!container) return;
    const track = container.querySelector("[data-track]");
    const viewport = container.querySelector("[data-viewport]");
    const cards = Array.from(container.querySelectorAll(".testimonials__card"));
    const prev = container.querySelector("[data-prev]");
    const next = container.querySelector("[data-next]");
    if (!track || !viewport || !cards.length || !prev || !next) return;

    let index = Math.min(1, cards.length - 1);

    const update = () => {
      const computedStyle = getComputedStyle(track);
      const gap = parseFloat(computedStyle.columnGap || computedStyle.gap || "24") || 24;
      const cardWidth = cards[0].getBoundingClientRect().width || 0;
      const containerWidth = viewport.clientWidth || cardWidth;

      cards.forEach((card, cardIndex) => {
        card.classList.toggle("is-inactive", cardIndex !== index);
      });

      prev.disabled = index === 0;
      next.disabled = index === cards.length - 1;

      const offset = -(index * (cardWidth + gap)) + (containerWidth - cardWidth) / 2;
      track.style.transform = `translateX(${offset}px)`;
    };

    const goTo = (delta) => {
      const nextIndex = index + delta;
      if (nextIndex < 0 || nextIndex > cards.length - 1) return;
      index = nextIndex;
      update();
    };

    prev.addEventListener("click", () => goTo(-1));
    next.addEventListener("click", () => goTo(1));
    window.addEventListener("resize", update);

    update();
  };

  const setupApplicationRedirects = async () => {
    let links = {};
    try {
      const res = await fetch(getAssetPath(`/data/links.json?v=${Date.now()}`));
      if (res.ok) links = await res.json();
    } catch (e) {
      console.warn("Failed to load links.json", e);
    }

    const redirectToContact = () => {
      window.location.href = links.contact || "/pages/Eleqa.html";
    };

    // Hero CTA
    scope.querySelector(".hero-cta")?.addEventListener("click", redirectToContact);
    scope.querySelector(".cta-button")?.addEventListener("click", redirectToContact);

    // Tech / Academy Cards
    scope.addEventListener("click", (e) => {
      if (e.target.closest(".tech-apply")) {
        redirectToContact();
      }
    });

    // Study Cards
    scope.addEventListener("click", (e) => {
      if (e.target.closest(".study-card-apply")) {
        redirectToContact();
      }
    });

    // Visa Cards
    scope.addEventListener("click", (e) => {
      if (e.target.closest(".visa-support-card")) {
        redirectToContact();
      }
    });

    // Service Cards (Centralized handling from links.json) - Triggered ONLY on the icon
    scope.addEventListener("click", (e) => {
      const icon = e.target.closest(".service-card-icon");
      if (icon) {
        const card = icon.closest(".service-card");
        const serviceId = card?.dataset.serviceId;
        if (serviceId && links.services && links.services[serviceId]) {
          window.location.href = links.services[serviceId];
        } else {
          redirectToContact();
        }
      }
    });

    // Cursor Styling: Pointer only on the icon
    scope.querySelectorAll(".service-card").forEach(card => {
      card.style.cursor = "default";
      const icon = card.querySelector(".service-card-icon");
      if (icon) icon.style.cursor = "pointer";
    });

    // Scholarship Banner CTA
    scope.addEventListener("click", (e) => {
      if (e.target.closest(".scholarship-banner-cta")) {
        redirectToContact();
      }
    });

    // Scholarship Buttons
    scope.addEventListener("click", (e) => {
      if (e.target.closest(".scholarship-button")) {
        e.preventDefault();
        redirectToContact();
      }
    });
  };


  saveOriginalTexts();

  languageButtons.forEach((btn) => {
    const flagImg = btn.querySelector(".dropdown-flag-icon");
    const baseFlag = btn.dataset.flag;
    const rectFlag = btn.dataset.rectFlag;
    if (flagImg) {
      flagImg.dataset.currentSrc = flagImg.src;
      btn.addEventListener("mouseenter", () => fadeFlagImage(flagImg, rectFlag || baseFlag));
      btn.addEventListener("mouseleave", () => fadeFlagImage(flagImg, baseFlag));
    }
    btn.addEventListener("click", () => handleSelection(btn));
  });
  alignEllipses();
  window.addEventListener("resize", alignEllipses);
  enableHeroElementSwap();
  setupServiceIcons();
  setupStudyTabs();
  setupTechTabs();
  setupFaq();
  setupTestimonials();
  setupApplicationRedirects();

  const setupPhoneDropdown = () => {
    const toggle = scope.querySelector('#phoneDropdownToggle');
    const menu = scope.querySelector('#phoneDropdownMenu');
    const selected = scope.querySelector('#selectedPhonePrefix');
    if (!toggle || !menu || !selected) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
    });

    scope.querySelectorAll('.hero-phone-item').forEach(item => {
      item.addEventListener('click', () => {
        const prefix = item.dataset.prefix;
        const flag = item.dataset.flag;
        selected.innerHTML = `<img src="${flag}" alt="" width="24" height="24"> <div>${prefix}</div>`;
        menu.classList.remove('show');
      });
    });

    scope.addEventListener('click', () => {
      menu.classList.remove('show');
    });
  };

  toggle?.addEventListener("click", toggleMenu);
  menu?.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
  setupPhoneDropdown();
  setActiveNavByPath(navLinks, scope);
  setupMobileMenu(scope);
}

function setActiveNavByPath(navLinks, scope = document) {
  if (!navLinks || !navLinks.length) return;
  const path = decodeURIComponent(window.location.pathname);

  // Update Desktop Nav
  navLinks.forEach((link) => link.classList.remove("active"));

  // Update Mobile Nav
  const mobileOverlay = scope.querySelector('.mobile-menu-overlay');
  const mobileLinks = mobileOverlay ? mobileOverlay.querySelectorAll('.mobile-nav-link') : [];
  mobileLinks.forEach(link => link.classList.remove('active'));

  let targetIndex = 0;
  if (path.includes("/pages/Təhsil")) {
    targetIndex = 1;
  } else if (path.includes("/pages/Akademiya")) {
    targetIndex = 2;
  } else if (path.includes("/pages/Eleqa")) {
    targetIndex = 3;
  }

  navLinks[targetIndex]?.classList.add("active");
  mobileLinks[targetIndex]?.classList.add("active");
}

/* --- Mobile Menu Logic --- */
function setupMobileMenu(scope = document) {
  const mobileMenuOverlay = scope.querySelector('.mobile-menu-overlay');
  const customToggler = scope.querySelector('.custom-toggler');
  const closeBtn = scope.querySelector('.mobile-menu-close');

  if (mobileMenuOverlay && customToggler && closeBtn) {
    customToggler.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenuOverlay.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    });

    closeBtn.addEventListener('click', () => {
      mobileMenuOverlay.classList.remove('active');
      document.body.style.overflow = '';
    });

    // Close on link click
    mobileMenuOverlay.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuOverlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }
}
