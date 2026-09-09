/**
 * 🌙 Common Kiosk Screensaver & PR Media Manager
 * Unified ES6 Module for Image/Video Carousel, Dynamic Server Sync & Inactivity Waking
 */
import * as unity from "./unity.js";

export class KioskScreensaverManager {
    constructor(options = 45) {
        const defaultIdleSeconds = typeof options === "number" ? options : options.idleSeconds || 45;
        this.kioskId = typeof options === "object" ? options.kioskId || "" : "";

        this.config = {
            enabled: true,
            idle_timeout_seconds: defaultIdleSeconds,
            slide_interval_seconds: 8,
            transition_effect: "fade",
            marquee_text: "",
            items: [],
        };

        this.idleTimeoutMs = defaultIdleSeconds * 1000;
        this.timer = null;
        this.clockInterval = null;
        this.slideInterval = null;
        this.isActive = false;
        this.currentSlide = 0;
        this.totalSlides = 3;

        this.overlay = document.getElementById("Kiosk_Screensaver");
        this.slidesContainer = document.getElementById("screensaver_slides_container");
        this.dotsContainer = document.getElementById("screensaver_dots_container");
        this.marqueeContainer = document.getElementById("screensaver_marquee_container");
        this.marqueeTextEl = document.getElementById("screensaver_marquee_text");
        this.clockEl = document.getElementById("screensaver_clock");
        this.dateEl = document.getElementById("screensaver_date");
        this.slides = document.querySelectorAll(".screensaver-slide");
        this.dots = document.querySelectorAll(".screensaver-dot");

        this.init();
    }

    async init() {
        if (!this.overlay) return;

        // 1. Fetch dynamic config from backend server
        await this.fetchServerConfig();

        // 2. User interaction reset listeners
        const resetEvents = ["pointerdown", "touchstart", "click", "keydown"];
        resetEvents.forEach((evt) => {
            window.addEventListener(evt, () => this.resetTimer(), { passive: true });
        });

        // 3. Connect to SSE for real-time screensaver updates
        try {
            if (typeof unity?.initSse === "function") {
                unity.initSse((payload) => {
                    if (payload?.event === "screensaver_update") {
                        const targetId = this.getResolvedKioskId();
                        if (
                            !payload.kiosk_id ||
                            payload.kiosk_id == targetId ||
                            (typeof KIOSK_NAME !== "undefined" && payload.kiosk_id == KIOSK_NAME)
                        ) {
                            console.log("📡 [KioskScreensaver] Received real-time screensaver update SSE");
                            this.fetchServerConfig();
                        }
                    }
                });
            }
        } catch (e) {
            console.warn("⚠️ [KioskScreensaver] SSE init skipped:", e);
        }

        this.resetTimer();
    }

    getResolvedKioskId() {
        if (this.kioskId) return this.kioskId;
        if (typeof GATE_WAY_ID !== "undefined" && GATE_WAY_ID) return GATE_WAY_ID;
        if (typeof KIOSK_NAME !== "undefined" && KIOSK_NAME) return KIOSK_NAME;
        if (window.KIOSK_APP?.gateway_id) return window.KIOSK_APP.gateway_id;
        if (window.KIOSK_APP?.device_name) return window.KIOSK_APP.device_name;
        return "";
    }

    async fetchServerConfig() {
        try {
            const kioskId = this.getResolvedKioskId();
            const url = `/api/kiosk/screensaver/config${kioskId ? `?kiosk_id=${encodeURIComponent(kioskId)}` : ""}`;
            const res = await unity.fetchApi(url, "get", null, "json", false, 6000);

            if (res?.success && res.data) {
                this.config = res.data;
                console.log("🌙 [KioskScreensaver] Loaded config from server:", this.config);

                if (this.config.idle_timeout_seconds) {
                    this.idleTimeoutMs = this.config.idle_timeout_seconds * 1000;
                }

                if (this.config.marquee_text && this.marqueeTextEl) {
                    this.marqueeTextEl.textContent = this.config.marquee_text;
                    if (this.marqueeContainer) this.marqueeContainer.classList.remove("hidden");
                }

                if (Array.isArray(this.config.items) && this.config.items.length > 0) {
                    this.renderDynamicSlides(this.config.items);
                }
            }
        } catch (err) {
            console.warn("⚠️ [KioskScreensaver] Failed to fetch server config, using fallback slides:", err);
        }
    }

    renderDynamicSlides(items) {
        if (!this.slidesContainer) return;

        const activeItems = items.filter((item) => item.is_active !== false);
        if (activeItems.length === 0) return;

        const lang = localStorage.getItem("app_lang") || "th";
        this.slidesContainer.innerHTML = "";

        activeItems.forEach((item, index) => {
            const slideEl = document.createElement("div");
            slideEl.className = `screensaver-slide ${index === 0 ? "flex" : "hidden"} flex-col justify-between gap-3.5 transition-all duration-500 w-full h-full`;
            slideEl.dataset.slide = index;

            const title = (lang === "en" ? item.title_en : item.title_th) || item.title_th || item.title_en || "";
            const subtitle = (lang === "en" ? item.subtitle_en : item.subtitle_th) || item.subtitle_th || item.subtitle_en || "";
            const badge = (lang === "en" ? item.badge_en : item.badge_th) || item.badge_th || item.badge_en || "SMART ACCESS";

            let mediaMarkup = "";
            if (item.type === "video") {
                mediaMarkup = `<video src="${item.url}" autoplay loop muted playsinline class="w-full h-full object-cover select-none pointer-events-none"></video>`;
            } else {
                mediaMarkup = `<img src="${item.url}" alt="${title}" class="w-full h-full object-cover select-none" decoding="async">`;
            }

            slideEl.innerHTML = `
                <div class="grow relative rounded-box overflow-hidden border-2 border-base-300 shadow-md bg-base-200 min-h-[240px]">
                    ${mediaMarkup}
                    <div class="absolute top-4 left-4 flex items-center gap-2">
                        <div class="bg-neutral/85 text-neutral-content font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-box backdrop-blur-xs flex items-center gap-2 shadow-sm border border-neutral-content/10">
                            <span class="w-2.5 h-2.5 rounded-full bg-success"></span>
                            <span>${badge}</span>
                        </div>
                    </div>
                    <div class="absolute top-4 right-4 bg-neutral/85 text-neutral-content font-black text-xs px-3.5 py-1.5 rounded-box backdrop-blur-xs shadow-xs border border-neutral-content/10">
                        <i class="fa-solid fa-camera text-info mr-1.5"></i> <span>AI INSPECTION ACTIVE</span>
                    </div>
                    <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral/95 via-neutral/60 to-transparent p-5 sm:p-7 flex flex-col justify-end text-left">
                        <h2 class="text-2xl sm:text-4xl lg:text-5xl font-black text-neutral-content tracking-tight leading-tight drop-shadow-sm">${title}</h2>
                        ${subtitle ? `<p class="text-sm sm:text-lg font-bold text-neutral-content/85 mt-1 drop-shadow-xs">${subtitle}</p>` : ""}
                    </div>
                </div>
            `;

            this.slidesContainer.appendChild(slideEl);
        });

        // Update Dots Container
        if (this.dotsContainer) {
            this.dotsContainer.innerHTML = "";
            activeItems.forEach((_, idx) => {
                const dot = document.createElement("span");
                dot.className = `screensaver-dot w-3 h-3 rounded-full ${idx === 0 ? "bg-success" : "bg-base-300"} transition-all duration-300 cursor-pointer`;
                dot.onclick = (e) => {
                    e.stopPropagation();
                    this.goToSlide(idx);
                };
                this.dotsContainer.appendChild(dot);
            });
        }

        // Cache elements
        this.slides = this.slidesContainer.querySelectorAll(".screensaver-slide");
        this.dots = this.dotsContainer ? this.dotsContainer.querySelectorAll(".screensaver-dot") : [];
        this.totalSlides = activeItems.length;
    }

    resetTimer() {
        if (this.isActive) {
            this.wakeUp();
        }
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => this.showScreensaver(), this.idleTimeoutMs);
    }

    canActivate() {
        if (!this.config.enabled) return false;

        const hasOpenDialog = !!document.querySelector("dialog[open]");
        const kioskApp = window.KIOSK_APP;
        const isCarPresent =
            kioskApp?.car_type > 0 ||
            !!(
                kioskApp?.loop_status_1?.classList.contains("text-error") ||
                kioskApp?.loop_status_2?.classList.contains("text-error")
            );
        const isBusy = kioskApp?.is_processing || false;

        return !hasOpenDialog && !isCarPresent && !isBusy;
    }

    showScreensaver() {
        if (!this.canActivate() || this.isActive || !this.overlay) return;

        this.isActive = true;
        this.overlay.classList.remove("opacity-0", "pointer-events-none");
        this.overlay.classList.add("opacity-100", "pointer-events-auto");

        this.currentSlide = 0;
        this.showSlide(0);

        this.updateClock();
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.clockInterval = setInterval(() => this.updateClock(), 1000);

        const slideDurationMs = (this.config.slide_interval_seconds || 8) * 1000;
        if (this.slideInterval) clearInterval(this.slideInterval);
        this.slideInterval = setInterval(() => {
            this.nextSlide();
        }, slideDurationMs);
    }

    wakeUp() {
        if (!this.isActive || !this.overlay) return;

        this.isActive = false;
        this.overlay.classList.remove("opacity-100", "pointer-events-auto");
        this.overlay.classList.add("opacity-0", "pointer-events-none");

        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }

        if (this.slideInterval) {
            clearInterval(this.slideInterval);
            this.slideInterval = null;
        }
    }

    nextSlide() {
        if (this.totalSlides <= 1) return;
        this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
        this.showSlide(this.currentSlide);
    }

    goToSlide(index) {
        this.currentSlide = index % this.totalSlides;
        this.showSlide(this.currentSlide);
    }

    showSlide(index) {
        this.slides.forEach((slide, idx) => {
            if (idx === index) {
                slide.classList.remove("hidden");
                slide.classList.add("flex");
            } else {
                slide.classList.remove("flex");
                slide.classList.add("hidden");
            }
        });

        this.dots.forEach((dot, idx) => {
            if (idx === index) {
                dot.classList.remove("bg-base-300");
                dot.classList.add("bg-success");
            } else {
                dot.classList.remove("bg-success");
                dot.classList.add("bg-base-300");
            }
        });
    }

    updateClock() {
        const now = new Date();
        if (this.clockEl) {
            this.clockEl.textContent = now.toLocaleTimeString("th-TH");
        }
        if (this.dateEl) {
            this.dateEl.textContent = now.toLocaleDateString("th-TH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        }
    }
}
