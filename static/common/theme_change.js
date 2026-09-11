/**
 * PKS Theme Change Utility (DaisyUI v5 / Tailwind v4 Compatible)
 * Seamlessly handles theme switching, active classes, localStorage, and cookie synchronization.
 */

function safeEscape(str) {
    if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(str);
    }
    return String(str).replace(/["'\\]/g, "\\$&");
}

function applyActClass(el, actClass, isAdd) {
    if (!el || !actClass) return;
    var classes = actClass.trim().split(/\s+/);
    classes.forEach(function (cls) {
        if (!cls) return;
        if (isAdd) {
            el.classList.add(cls);
        } else {
            el.classList.remove(cls);
        }
    });
}

function syncThemeStorage(theme) {
    if (!theme) return;
    try {
        localStorage.setItem("theme", theme);
    } catch (e) {}
    try {
        document.cookie = "theme=" + encodeURIComponent(theme) + ";path=/;max-age=31536000;SameSite=Lax";
    } catch (e) {}
    try {
        window.dispatchEvent(new CustomEvent("theme:change", { detail: { theme: theme } }));
    } catch (e) {}
}

function getStoredTheme() {
    try {
        var theme = localStorage.getItem("theme");
        if (theme) return theme;
    } catch (e) {}
    try {
        var match = document.cookie.match(/(?:^|;\s*)theme=([^;]*)/);
        if (match) return decodeURIComponent(match[1]);
    } catch (e) {}
    return null;
}

function themeToggle() {
    var toggleEl = document.querySelector("[data-toggle-theme]");
    var currentTheme = getStoredTheme();
    if (currentTheme) {
        document.documentElement.setAttribute("data-theme", currentTheme);
        if (toggleEl) {
            document.querySelectorAll("[data-toggle-theme]").forEach(function (el) {
                applyActClass(el, toggleEl.getAttribute("data-act-class"), true);
            });
        }
    }

    if (toggleEl) {
        document.querySelectorAll("[data-toggle-theme]").forEach(function (el) {
            el.addEventListener("click", function () {
                var themesList = el.getAttribute("data-toggle-theme");
                if (themesList) {
                    var themesArray = themesList.split(",");
                    var nextTheme = "";
                    if (document.documentElement.getAttribute("data-theme") === themesArray[0]) {
                        if (themesArray.length === 1) {
                            document.documentElement.removeAttribute("data-theme");
                            try { localStorage.removeItem("theme"); } catch (e) {}
                            document.cookie = "theme=;path=/;max-age=0;SameSite=Lax";
                        } else {
                            nextTheme = themesArray[1];
                            document.documentElement.setAttribute("data-theme", nextTheme);
                            syncThemeStorage(nextTheme);
                        }
                    } else {
                        nextTheme = themesArray[0];
                        document.documentElement.setAttribute("data-theme", nextTheme);
                        syncThemeStorage(nextTheme);
                    }
                }
                document.querySelectorAll("[data-toggle-theme]").forEach(function (tEl) {
                    var actClass = el.getAttribute("data-act-class");
                    if (actClass) {
                        actClass.trim().split(/\s+/).forEach(function (cls) {
                            if (cls) tEl.classList.toggle(cls);
                        });
                    }
                });
            });
        });
    }
}

function themeBtn() {
    var currentTheme = getStoredTheme();
    var allButtons = document.querySelectorAll("[data-set-theme]");

    if (currentTheme) {
        document.documentElement.setAttribute("data-theme", currentTheme);
        var activeBtn = document.querySelector("[data-set-theme='" + safeEscape(currentTheme) + "']");
        if (activeBtn) {
            allButtons.forEach(function (el) {
                applyActClass(el, el.getAttribute("data-act-class"), false);
            });
            applyActClass(activeBtn, activeBtn.getAttribute("data-act-class"), true);
        }
    } else {
        var defaultBtn = document.querySelector("[data-set-theme='']");
        if (defaultBtn) {
            applyActClass(defaultBtn, defaultBtn.getAttribute("data-act-class"), true);
        }
    }

    allButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var selectedTheme = this.getAttribute("data-set-theme");
            if (selectedTheme !== null && selectedTheme !== undefined) {
                document.documentElement.setAttribute("data-theme", selectedTheme);
                syncThemeStorage(selectedTheme);
                allButtons.forEach(function (el) {
                    applyActClass(el, el.getAttribute("data-act-class"), false);
                });
                applyActClass(this, this.getAttribute("data-act-class"), true);
            }
        });
    });
}

function themeSelect() {
    var currentTheme = getStoredTheme();
    if (currentTheme) {
        document.documentElement.setAttribute("data-theme", currentTheme);
        var option = document.querySelector("select[data-choose-theme] [value='" + safeEscape(currentTheme) + "']");
        if (option) {
            document.querySelectorAll("select[data-choose-theme] [value='" + safeEscape(currentTheme) + "']").forEach(function (el) {
                el.selected = true;
            });
        }
    }

    if (document.querySelector("select[data-choose-theme]")) {
        document.querySelectorAll("select[data-choose-theme]").forEach(function (sel) {
            sel.addEventListener("change", function () {
                var selectedTheme = this.value;
                document.documentElement.setAttribute("data-theme", selectedTheme);
                syncThemeStorage(selectedTheme);
                document.querySelectorAll("select[data-choose-theme] [value='" + safeEscape(selectedTheme) + "']").forEach(function (el) {
                    el.selected = true;
                });
            });
        });
    }
}

function themeChange(attach) {
    if (attach === undefined) attach = true;
    var init = function () {
        themeToggle();
        themeSelect();
        themeBtn();
    };

    if (attach === true && document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}

if (typeof exports !== "undefined") {
    module.exports = { themeChange: themeChange };
} else {
    themeChange();
}