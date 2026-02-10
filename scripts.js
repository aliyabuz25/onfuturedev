// Helper to handle relative paths for both root and subpages
function getAssetPath(path) {
  if (!path.startsWith('/')) return path;

  // Check if we are in /pages/ or another subdirectory
  const isSubPage = window.location.pathname.includes('/pages/');
  const cleanPath = path.substring(1);

  return isSubPage ? `../${cleanPath}` : cleanPath;
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
  { id: "tech-container", path: "/sections/academy-tech.html" },
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
      async leave(data) {
        const done = this.async();
        await gsap.to(data.current.container, {
          opacity: 0,
          x: -100, // Slide left
          duration: 0.4,
          ease: "power2.inOut"
        });
        done();
      },
      async enter(data) {
        gsap.from(data.next.container, {
          opacity: 0,
          x: 100, // Enter from right
          duration: 0.4,
          ease: "power2.out",
          clearProps: "all"
        });
        initApp(data.next.container); // Re-initialize app scoped to new container
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
      const response = await fetch(getAssetPath(path));
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
    const response = await fetch(getAssetPath("/data/navbar.json"));
    if (!response.ok) throw new Error("Failed to load navbar.json");
    const data = await response.json();

    const currentPath = window.location.pathname;

    const navHtml = `
    <nav class="navbar navbar-expand-lg navbar-dark hero-nav">
        <div class="container-fluid">
            <!-- Brand -->
            <a class="navbar-brand" href="${data.brand.link}">
                <img src="${data.brand.logo}" alt="${data.brand.alt}" class="logo-img">
            </a>

            <!-- Mobile Toggler -->
            <button class="navbar-toggler custom-toggler" type="button" aria-controls="mainNav" aria-expanded="false"
                aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>

            <!-- Desktop Menu (Hidden on Mobile) -->
            <div class="collapse navbar-collapse" id="mainNav">
                <ul class="navbar-nav">
                    ${data.links.map(link => `
                    <li class="nav-item">
                        <a class="nav-link ${currentPath === link.link ? 'active' : ''}" 
                           aria-current="${currentPath === link.link ? 'page' : 'false'}" 
                           href="${link.link}" 
                           data-i18n-key="${link.i18nKey}">
                           ${link.text}
                        </a>
                    </li>
                    `).join('')}
                </ul>

                <!-- Actions -->
                <div class="hero-nav-actions">
                    <button class="search-button btn btn-link" type="button" aria-label="${data.actions.search.alt}">
                        <img src="${data.actions.search.icon}" alt="${data.actions.search.alt}" width="20" height="20">
                    </button>

                    <div class="dropdown">
                        <button class="btn dropdown-toggle" type="button" data-bs-toggle="dropdown"
                            aria-expanded="false">
                            <img src="${data.actions.language.flag}" alt="Language flag" class="language-flag">
                            <span class="language-label">${data.actions.language.current}</span>
                            <img src="${getAssetPath('/elements/arrow-down.svg')}" alt="Arrow down" class="dropdown-arrow-icon">
                        </button>
                        <ul class="dropdown-menu">
                            ${data.actions.language.options.map(opt => `
                            <li>
                                <button type="button" class="dropdown-item" 
                                    aria-current="${opt.current}" 
                                    data-lang="${opt.code}"
                                    data-flag="${opt.flag}" 
                                    data-rect-flag="${opt.rectFlag}">
                                    <img src="${opt.flag}" alt="${opt.code} flag" class="dropdown-flag-icon">
                                    <span>${opt.code}</span>
                                    <img src="${getAssetPath('/selected-ar/Frame.svg')}" alt="" class="dropdown-selected-indicator">
                                </button>
                            </li>
                            `).join('')}
                        </ul>
                    </div>

                    <button class="cta-button" type="button" onclick="window.location.href='${data.actions.cta.link}'">
                        <span data-i18n-key="${data.actions.cta.i18nKey}">${data.actions.cta.text}</span>
                    </button>
                </div>
            </div>
        </div>
    </nav>`;

    container.innerHTML = navHtml;

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
      const res = await fetch(getAssetPath('/api/content'));
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
      <article class="service-card">
          <h3>
              <span class="service-num">${idx.padStart(2, '0')}.</span>
              <span>${services[idx].title || ''}</span>
          </h3>
          <p>${services[idx].desc || ''}</p>
          <div class="service-card-icon"><img src="${services[idx].icon || '/services/Arrow up-right.png'}" alt=""></div>
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
      <article class="study-card">
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

  if (techProgramsGrid && techProgramsGrid.querySelectorAll(".tech-card").length === 0) {
    const programs = [
      {
        badge: "DevOps",
        badgeKey: "tech.card1.chip",
        title: "DevOps Mühəndisliyi Kursu – CI/CD və Cloud əsasları",
        titleKey: "tech.card1.title",
        img: "/tedris/devops.png",
        desc: "Layihələrdə etibarlı yerləşdirmə üçün pipeline-lar, avtomatlaşdırma və bulud əsaslarını öyrənin.",
        descKey: "tech.card1.desc",
        lessons: "12 dərs",
      },
      {
        badge: "UI/UX Design",
        badgeKey: "tech.card2.chip",
        title: "UX/UI Dizayn Kursu – İstifadəçi təcrübəsi və interfeys dizaynı",
        titleKey: "tech.card2.title",
        img: "/tedris/uxui.png",
        desc: "Araşdırma, wireframe, prototipləmə və təhvil prosesini öyrənin.",
        descKey: "tech.card2.desc",
        lessons: "12 dərs",
      },
      {
        badge: "Q/A Assurance",
        badgeKey: "tech.card3.chip",
        title: "QA Təlimi – Manual və avtomatlaşdırılmış testlər",
        titleKey: "tech.card3.title",
        img: "/tedris/qa.png",
        desc: "Manual, avtomatlaşdırılmış və CI inteqrasiyalı test intizamı qurun.",
        descKey: "tech.card3.desc",
        lessons: "12 dərs",
      },
    ];
    const fragment = document.createDocumentFragment();
    programs.forEach((program) => {
      fragment.append(
        addProgram(
          program.badge,
          program.title,
          program.img,
          program.desc,
          program.lessons,
          {
            badgeKey: program.badgeKey,
            titleKey: program.titleKey,
            descKey: program.descKey,
          }

        )
      );
    });
    techProgramsGrid.insertBefore(fragment, techProgramsGrid.firstChild);
  }

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
    updateLanguageByAttr(lang);
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
    if (!studyTabs.length || !studyCards.length) return;

    const activateDegree = (degree) => {
      studyTabs.forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.degree === degree);
      });
      studyCards.forEach((card) => {
        const match = card.dataset.degree === degree;
        card.classList.toggle("hidden", !match);
      });
    };

    studyTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        activateDegree(tab.dataset.degree || "");
      });
    });

    const initial = document.querySelector(".study-tab.active")?.dataset.degree || studyTabs[0]?.dataset.degree;
    if (initial) activateDegree(initial);
  };

  const setupTechTabs = () => {
    if (!techTabs.length || !techGrids.length) return;

    const activateTab = (tabName) => {
      techTabs.forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.tab === tabName);
      });
      techGrids.forEach((grid) => {
        grid.classList.toggle("active", grid.dataset.tab === tabName);
      });
    };

    techTabs.forEach((tab) => {
      tab.addEventListener("click", () => activateTab(tab.dataset.tab || ""));
    });

    const initial = document.querySelector(".tech-tab.active")?.dataset.tab || techTabs[0]?.dataset.tab;
    if (initial) activateTab(initial);
  };

  const setupFaq = () => {
    if (!faqItems.length) return;

    faqItems.forEach((item) => {
      const question = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");
      const icon = question?.querySelector(".faq-icon");
      if (!question || !answer) return;
      // Reset to closed state on load
      item.classList.remove("open");
      question.setAttribute("aria-expanded", "false");
      if (icon) icon.textContent = "+";
      question.addEventListener("click", () => {
        // Close all other items
        faqItems.forEach((otherItem) => {
          if (otherItem !== item && otherItem.classList.contains("open")) {
            otherItem.classList.remove("open");
            const otherQuestion = otherItem.querySelector(".faq-question");
            const otherIcon = otherQuestion?.querySelector(".faq-icon");
            if (otherQuestion) otherQuestion.setAttribute("aria-expanded", "false");
            if (otherIcon) otherIcon.textContent = "+";
          }
        });

        const isOpen = item.classList.toggle("open");
        question.setAttribute("aria-expanded", isOpen ? "true" : "false");
        if (icon) icon.textContent = isOpen ? "-" : "+";
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

  const setupApplicationRedirects = () => {
    const redirectToContact = () => {
      window.location.href = "/pages/Eleqa.html";
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
    scope.querySelectorAll(".visa-support-card").forEach(card => {
      card.addEventListener("click", redirectToContact);
      card.style.cursor = "pointer";
    });

    // Service Cards
    scope.querySelectorAll(".service-card").forEach(card => {
      card.addEventListener("click", redirectToContact);
      card.style.cursor = "pointer";
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
  if (path.includes("/pages/Təhsil.html")) {
    targetIndex = 1;
  } else if (path.includes("/pages/Akademiya.html")) {
    targetIndex = 2;
  } else if (path.includes("/pages/Eleqa.html")) {
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

