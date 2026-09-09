import { en } from "./locales.js";
import { th } from "./locales_th.js";
import { lo } from "./locales_lo.js";
import { jp } from "./locales_jp.js";
import { zh } from "./locales_zh.js";
import { my } from "./locales_my.js";
import i18next from "/static/common/i18next.js";

// flatpickr.localize(flatpickr.l10ns.th);

const isDev = true; // Set to false in production
const debug = console.log;

// Configure active log level based on isDev flag
const levels = {
    debug: isDev,
    info: isDev,
    warn: true,
    error: true,
};

function formatTime() {
    return new Date().toISOString();
}

function logWithStyle(label, color, ...args) {
    const level = label.toLowerCase();
    if (!levels[level]) return;
    let callerLineInfo = "";
    console.log(
        `%c[${label}]%c${callerLineInfo}%c`,
        `color: ${color}; font-weight: bold;`,
        "color: gray; font-size: 10px;",
        "color: dimgray; font-style: italic;",
        ...args,
    );
}

export const logger = {
    debug: (...args) => logWithStyle("DEBUG", "DodgerBlue", ...args),
    info: (...args) => logWithStyle("INFO", "SeaGreen", ...args),
    warn: (...args) => logWithStyle("WARN", "orange", ...args),
    error: (...args) => logWithStyle("ERROR", "red", ...args),
};

/**
 * Logs debug messages to the console.
 */
// export const debug = console.log;

export const LOGIN_USER = { system_type: 0 };
export let HEADERS = null;

if (typeof dayjs !== "undefined") {
    if (window.dayjs_plugin_customParseFormat) {
        dayjs.extend(window.dayjs_plugin_customParseFormat);
    }
    if (window.dayjs_plugin_relativeTime) {
        dayjs.extend(window.dayjs_plugin_relativeTime);
    }
    dayjs.locale("en");
    // dayjs.locale("th");
    logger.info("📌 dayjs:", dayjs.locale());
}

if (typeof flatpickr !== "undefined") {
    const thLocale = flatpickr.l10ns?.th || {};
    flatpickr.setDefaults({
        locale: { ...thLocale, rangeSeparator: " - " },
    });
}

// ? ********************   WebSocketClient    ********************
export class WebSocketClient {
    constructor(event_handler = null, url_socket = null) {
        this.reconnectDelay = 1000; // Start with 1s delay
        this.maxReconnectAttempts = 10; // Prevent infinite reconnect loops
        this.reconnectAttempts = 0;
        this.event_handler = event_handler;
        this.ws = null;

        // Build WebSocket URL
        if (url_socket) {
            this.ws_str = `ws://${url_socket}/ws`;
        } else {
            this.ws_str = location.protocol === "https:" ? `wss://${location.host}/ws` : `ws://${location.host}/ws`;
        }

        if (event_handler) {
            logger.info("WebSocketClient init:", this.ws_str, "@", event_handler.name);
            this.connect();
        } else {
            logger.warn("event_handler is null");
        }
    }

    ws_event_handler(json_msg) {
        if (this.event_handler) {
            this.event_handler(json_msg);
        } else {
            logger.warn("No event handler provided");
        }
    }

    connect() {
        this.ws = new WebSocket(this.ws_str);

        this.ws.onopen = () => {
            logger.info("Connected to WebSocket:", this.ws_str);
            this.reconnectDelay = 1000; // Reset delay
            this.reconnectAttempts = 0; // Reset attempts

            showToastNotification({
                icon: "success",
                title: "Socket Connected",
                msg: this.ws_str,
            });
        };

        this.ws.onmessage = (event) => {
            const json_msg = JSON.parse(event.data);
            this.ws_event_handler(json_msg);
        };

        this.ws.onclose = () => {
            logger.warn("WebSocket closed. Reconnecting in", this.reconnectDelay, "ms");

            showToastNotification({
                icon: "warning",
                title: "WebSocket Service",
                msg: `Unable to connect to<br>${this.ws_str}`,
            });

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => {
                    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30s delay
                    this.connect();
                }, this.reconnectDelay);
            } else {
                logger.error("Max reconnect attempts reached. Stopping reconnection.");
            }
        };

        this.ws.onerror = (err) => {
            logger.error("WebSocket error:", err.message);
        };
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        } else {
            logger.warn("WebSocket is not open. Message not sent:", message);
        }
    }
}
// ? ********************   SseClient    ********************
export function initSse(callBack, url = "/sse") {
    const evtSource = new EventSource(url);

    evtSource.onmessage = (event) => {
        let payload = event.data;
        if (typeof payload === "string") {
            try {
                payload = JSON.parse(payload);
            } catch {}
        }
        callBack(payload);
    };

    evtSource.addEventListener("heartbeat", (e) => {
        console.debug("Heartbeat:", e.data);
    });

    evtSource.onopen = () => {
        logger.info("SSE connection opened");
        showToastNotification({
            type: "success",
            title: "Connected to server",
            msg: "client connection successful",
        });
    };

    evtSource.onerror = (err) => {
        logger.error("SSE error:", err);
        showToastNotification({
            type: "warning",
            title: "SSE Error",
            msg: "Server closed connection",
        });
    };

    return evtSource;
}

window.showPreviewImageView = showPreviewImageView;
/**
 * Shows a modal dialog containing a preview of the given image.
 *
 * @param {string} src - The URL of the image to display.
 */
function showPreviewImageView(src) {
    const dialog = document.getElementById("Dialog_Preview_Image");
    if (!dialog) return;
    const img = dialog.querySelector('[data-field="preview_image"]');
    if (img) img.src = src;
    dialog.showModal();
}

export function showDialogLoading(content = "Loading...") {
    const dialog = document.getElementById("Dialog_Loading") || document.getElementById("global_loading_modal");
    if (!dialog) return;
    const msg = dialog.querySelector("[data-field='msg']") || dialog.querySelector("#global_loading_text");
    if (msg) msg.innerHTML = content;
    if (typeof dialog.showModal === "function") dialog.showModal();
}

export function closeDialogLoading() {
    const dialog = document.getElementById("Dialog_Loading") || document.getElementById("global_loading_modal");
    if (dialog && dialog.open && typeof dialog.close === "function") {
        dialog.close();
    }
}
/**
 * Show an info dialog with a title and message.
 *
 * @param {Object} [opts] - Dialog options.
 * @param {string} [opts.title=Info] - Dialog title.
 * @param {string} [opts.msg=info] - Dialog message.
 */
export function showDialogInfo({ title = "Info", msg = "info" } = {}) {
    const dialog = document.getElementById("Dialog_Info");
    if (!dialog) {
        if (typeof toastr !== "undefined") toastr.info(msg, title);
        return;
    }
    if (dialog.querySelector("[data-field='title']")) dialog.querySelector("[data-field='title']").innerHTML = title;
    if (dialog.querySelector("[data-field='msg']")) dialog.querySelector("[data-field='msg']").innerHTML = msg;
    dialog.showModal();
}

/**
 * Show a success dialog with a title and message.
 *
 * @param {Object} [opts] - Dialog options.
 * @param {string} [opts.title=Success] - Dialog title.
 * @param {string} [opts.msg=Operation Successful] - Dialog message.
 */
export function showDialogSuccess({ title = "Success", msg = "Operation successful" } = {}) {
    const dialog = document.getElementById("Dialog_Success");
    if (!dialog) {
        if (typeof toastr !== "undefined") toastr.success(msg, title);
        return;
    }
    if (dialog.querySelector("[data-field='title']")) dialog.querySelector("[data-field='title']").innerHTML = title;
    if (dialog.querySelector("[data-field='msg']")) dialog.querySelector("[data-field='msg']").innerHTML = msg;
    dialog.showModal();
}

/**
 * Show a warning dialog with a title and message.
 *
 * @param {Object} [opts] - Dialog options.
 * @param {string} [opts.title=Warning!] - Dialog title.
 * @param {string} [opts.msg=info] - Dialog message.
 */
export function showDialogWarning({ title = "Warning!", msg = "info" } = {}) {
    const dialog = document.getElementById("Dialog_Warning");
    if (!dialog) {
        if (typeof toastr !== "undefined") toastr.warning(msg, title);
        return;
    }
    if (dialog.querySelector("[data-field='title']")) dialog.querySelector("[data-field='title']").innerHTML = title;
    if (dialog.querySelector("[data-field='msg']")) dialog.querySelector("[data-field='msg']").innerHTML = msg;
    dialog.showModal();
}

/**
 * Show an error dialog with a title and message.
 *
 * @param {Object} opts - Dialog options.
 * @param {string} [opts.title=Error] - Dialog title.
 * @param {string} [opts.msg=info] - Dialog message.
 */
export function showDialogError({ title = "Error", msg = "info" } = {}) {
    const dialog = document.getElementById("Dialog_Error");
    if (!dialog) {
        if (typeof toastr !== "undefined") toastr.error(msg, title);
        return;
    }
    if (dialog.querySelector("[data-field='title']")) dialog.querySelector("[data-field='title']").innerHTML = title;
    if (dialog.querySelector("[data-field='msg']")) dialog.querySelector("[data-field='msg']").innerHTML = msg;
    dialog.showModal();
}

export function escapeHtml(value = "") {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
export const escapeHTML = escapeHtml;

export function showToastNotification({
    type = "info",
    title = null,
    msg = "message",
    duration = 5000,
    position = "top-right",
} = {}) {
    const TOAST_EXIT_DURATION = 400;
    const TOAST_ANIMATION_STYLE_ID = "toast_animation_style";

    const removeToast = (toastEl, container) => {
        if (!toastEl || toastEl.dataset.removing === "true") return;

        toastEl.dataset.removing = "true";
        toastEl.classList.add("toast-exit");

        window.setTimeout(() => {
            toastEl.remove();
            if (container && container.childElementCount === 0) {
                container.remove();
            }
        }, TOAST_EXIT_DURATION);
    };

    const config = {
        success: { icon: "fa-circle-check", className: "toast-success", "text-color": "text-success" },
        error: { icon: "fa-circle-exclamation", className: "toast-error", "text-color": "text-error" },
        warning: { icon: "fa-triangle-exclamation", className: "toast-warning", "text-color": "text-warning" },
        info: { icon: "fa-circle-info", className: "toast-info", "text-color": "text-info" },
    };

    let container = document.getElementById(`custom_toast_container_${position.replaceAll("-", "_")}`);

    if (!container) {
        container = document.createElement("div");
        container.id = `custom_toast_container_${position.replaceAll("-", "_")}`;
        container.className = `custom-toast-container ${position}`;
        document.body.appendChild(container);
    }

    if (!document.getElementById(TOAST_ANIMATION_STYLE_ID)) {
        const styleSheet = document.createElement("style");
        styleSheet.id = TOAST_ANIMATION_STYLE_ID;
        styleSheet.textContent = `
            @keyframes toast-progress-shrink {
                from { width: 100%; }
                to { width: 0%; }
            }
        `;
        document.head.appendChild(styleSheet);
    }

    const style = config[type] || config.info;
    const textColor = style["text-color"];

    let enterClass = "toast-enter-right";
    if (position.includes("left")) {
        enterClass = "toast-enter-left";
    } else if (position.includes("center")) {
        enterClass = position.includes("top") ? "toast-enter-top" : "toast-enter-bottom";
    }

    const toastId = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const safeTitle = escapeHTML(title ?? "");
    const safeMsg = escapeHTML(msg);

    const toastEl = document.createElement("div");
    toastEl.id = toastId;
    toastEl.className = `custom-toast-item ${style.className} ${enterClass}`;
    toastEl.innerHTML = `
        <div class="toast-icon">
            <i class="fa-solid ${style.icon} ${textColor} fa-2x"></i>
        </div>
        <div class="toast-content">
            ${safeTitle ? `<div class="toast-title">${safeTitle}</div>` : ""}
            <div class="toast-message">${msg}</div>
        </div>
        <button class="toast-close" type="button" aria-label="Close notification">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="toast-progress">
            <div class="toast-progress-bar"></div>
        </div>
    `;

    const closeBtn = toastEl.querySelector(".toast-close");
    const progressBar = toastEl.querySelector(".toast-progress-bar");

    let autoRemoveTimer = null;
    let remainingTime = duration;
    let startedAt = Date.now();

    const startAutoRemove = () => {
        if (duration <= 0 || remainingTime <= 0) return;

        startedAt = Date.now();
        autoRemoveTimer = window.setTimeout(() => {
            removeToast(toastEl, container);
        }, remainingTime);

        if (progressBar) {
            progressBar.style.animation = `toast-progress-shrink ${remainingTime}ms linear forwards`;
            progressBar.style.animationPlayState = "running";
        }
    };

    const pauseAutoRemove = () => {
        if (!autoRemoveTimer) return;

        window.clearTimeout(autoRemoveTimer);
        autoRemoveTimer = null;

        const elapsed = Date.now() - startedAt;
        remainingTime = Math.max(0, remainingTime - elapsed);

        if (progressBar) {
            progressBar.style.animationPlayState = "paused";
        }
    };

    closeBtn?.addEventListener("click", () => {
        if (autoRemoveTimer) {
            window.clearTimeout(autoRemoveTimer);
        }

        toastEl.remove();

        if (container && container.childElementCount === 0) {
            container.remove();
        }
    });

    if (duration > 0) {
        toastEl.addEventListener("mouseenter", pauseAutoRemove);
        toastEl.addEventListener("mouseleave", startAutoRemove);
    }

    container.prepend(toastEl);

    if (progressBar && duration > 0) {
        progressBar.style.animation = `toast-progress-shrink ${duration}ms linear forwards`;
    }

    startAutoRemove();

    return {
        id: toastId,
        element: toastEl,
        remove: () => {
            if (autoRemoveTimer) {
                window.clearTimeout(autoRemoveTimer);
            }
            removeToast(toastEl, container);
        },
    };
}

export function isScreenReady() {
    return !document.querySelector("dialog.modal[open]");
}

export function clear_dialog() {
    ["Dialog_Info", "Dialog_Success", "Dialog_Warning", "Dialog_Error", "Dialog_Loading"].forEach((id) => {
        const d = document.getElementById(id);
        if (d && d.open && typeof d.close === "function") d.close();
    });
}

/**
 * Displays a confirmation dialog with a given title and content.
 *
 * @param {Object} options - The options for the dialog.
 * @param {string} [options.title="Confirm Action"] - The title of the dialog.
 * @param {string} [options.content=""] - The content message of the dialog.
 * @param {boolean} [options.cancelBtn=true] - Whether to display the cancel button.
 *
 * @returns {Promise<Object>} A promise that resolves to an object containing:
 *  - `confirm` (boolean): Whether the confirm button was clicked.
 *  - `value` (any): The value from the dialog's returnValue element, if present.
 */

export async function showDialogConfirm({
    title = i18next_translate("dialog_confirm_title"),
    content = "",
    cancelBtn = true,
} = {}) {
    return new Promise((resolve) => {
        const dialogElement = document.getElementById("Dialog_Confirm") || document.getElementById("global_confirm_modal");
        if (!dialogElement) {
            const confirmed = window.confirm(`${title}\n${content}`);
            resolve({ confirm: confirmed, value: null });
            return;
        }

        // reset result
        const result = { confirm: false, value: null };

        // set UI
        const titleEl = dialogElement.querySelector("[data-field='title']");
        if (titleEl) titleEl.innerHTML = title;
        const contentEl = dialogElement.querySelector("[data-field='content']");
        if (contentEl) contentEl.innerHTML = content;
        const cancelBtnEl = dialogElement.querySelector("[data-field='cancel_btn']");
        if (cancelBtnEl) cancelBtnEl.classList.toggle("hidden", !cancelBtn);

        const returnValueElement = dialogElement.querySelector("[data-field='returnValue']");

        // --- handler ---
        const confirmHandler = () => {
            result.confirm = true;
            dialogElement.close();
        };
        const cancelHandler = () => {
            result.confirm = false;
            dialogElement.close();
        };

        // attach events (once)
        dialogElement
            .querySelector("[data-field='confirm_btn']")
            .addEventListener("click", confirmHandler, { once: true });
        dialogElement
            .querySelector("[data-field='cancel_btn']")
            .addEventListener("click", cancelHandler, { once: true });

        // wait for close
        dialogElement.addEventListener(
            "close",
            () => {
                if (returnValueElement) {
                    result.value = returnValueElement.value;
                }
                resolve(result);
            },
            { once: true },
        );

        // show dialog
        dialogElement.showModal();
        setTimeout(() => {
            dialogElement.querySelector("[data-field='confirm_btn']").focus();
        }, 100);
    });
}

/**
 * Validate the transaction string.
 *
/**
 * Checks if string matches Thai license plate syntax
 * Examples: "1AB1234", "AB 1234", "A 1234"
 *
 * @param {string} str - String to validate
 * @returns {boolean} true if string matches license plate syntax
 */
export function isThaiLicensePlate(str) {
    if (!str || typeof str !== "string") return false;
    const s = str.trim();
    return /^\d?[ก-ฮ]{1,3}\s?-?\s?\d{1,4}$/.test(s);
}

/**
 * แปลงตัวอักษรภาษาไทยเฉพาะแถวตัวเลข (Number Row: Unshifted & Shifted) กลับเป็นตัวเลข/สัญลักษณ์ภาษาอังกฤษ
 * เหมาะสำหรับ USB Keyboard Emulator (RFID Reader, Barcode/QR Scanner, Card Reader)
 * โดยไม่กระทบตัวอักษรภาษาไทยในหมวดทะเบียนรถ (เช่น "ตถ1234", "ภถ5678", "1กข 1234")
 *
 * @param {string} str - ข้อความที่รับมาจาก Reader หรือ Input
 * @returns {string} ข้อความที่แปลงเฉพาะแถวตัวเลขแล้ว
 */
export function convertThaiKeyToEnglish(str) {
    if (!str || typeof str !== "string") return str;
    const s = str.trim();

    // 1. ถ้าไม่มีตัวอักษรภาษาไทยเลย ให้คืนค่าเดิมทันที (เช่น "260821092721-1", "M-1234")
    if (!/[ก-๙]/.test(s)) {
        return str;
    }

    // 2. ถ้าเป็นรูปแบบทะเบียนรถไทยที่ถูกต้องอยู่แล้ว ไม่ต้องแปลงตัวอักษร
    if (isThaiLicensePlate(s)) {
        return str;
    }

    const thaiNumberRowMap = {
        // แถวตัวเลข 1-0 (Unshifted)
        ๅ: "1",
        "/": "2",
        "-": "3",
        ภ: "4",
        ถ: "5",
        "ุ": "6",
        "ึ": "7",
        ค: "8",
        ต: "9",
        จ: "0",
        ข: "-",
        ช: "=",

        // แถวตัวเลข (Shifted)
        "+": "!",
        "๑": "@",
        "๒": "#",
        "๓": "$",
        "๔": "%",
        "ู": "^",
        "฿": "&",
        "๕": "*",
        "๖": "(",
        "๗": ")",
        "๘": "_",
        "๙": "+",

        // ตัวเลขไทย ๐-๙
        "๐": "0",
    };

    return str
        .split("")
        .map((char) => thaiNumberRowMap[char] ?? char)
        .join("");
}

/**
 * ตรวจสอบว่าเป็นข้อความภาษาไทยที่เกิดจากการกดตัวเลขแถวบน (Kedmanee Number Row) จาก Reader หรือไม่
 * และไม่ตรงกับรูปแบบทะเบียนรถไทย
 *
 * @param {string} str - String to validate
 * @returns {boolean} true ถ้าเป็นข้อความตัวเลขที่ติดภาษาไทย
 */
export function isThaiCardPattern(str) {
    if (!str || typeof str !== "string") return false;
    const s = str.trim();
    if (isThaiLicensePlate(s)) return false;
    return /^[ๅ/\-ภถุึคตจข0-9_]{4,32}$/.test(s) && /[ๅ/\-ภถุึคตจข]/.test(s);
}

/**
 * Checks if string matches Card ID syntax (RFID / Barcode / QR / Card UID / Card Prefix)
 *
 * @param {string} str - String to validate
 * @returns {boolean} true if string matches Card ID pattern
 */
export function isCardIdPattern(str) {
    if (!str || typeof str !== "string") return false;
    const s = str.trim();
    if (!s) return false;

    // If matches Thai license plate syntax, not a card ID
    if (isThaiLicensePlate(s)) return false;

    // 1. QR Code URL parameter
    if (/qr[-_]code=/i.test(s)) return true;

    // 2. Numeric digits (4-32 chars, e.g. RFID Dec UID, Barcode 13)
    if (/^\d{4,32}$/.test(s)) return true;

    // 3. Barcode timestamp ticket format (e.g. "260821092721-1")
    if (/^\d{6,14}[-_]\d{1,6}$/.test(s)) return true;

    // 4. Kedmanee number row character keystrokes from USB scanner
    if (isThaiCardPattern(s)) return true;

    // 5. Hexadecimal Card UID (e.g. Mifare UID)
    if (/^[0-9A-Fa-f]{8,32}$/.test(s)) return true;

    // 6. Card ID with alphanumeric prefix (e.g. CARD-001, MEM-123, VIP-01)
    if (/^(CARD|MEM|VIP|TAG|ID|M|V|T|VISITOR)[-_]?[0-9A-Za-z]+$/i.test(s)) return true;

    return false;
}

/**
 * If the transaction string includes the QR code parameter, we remove it.
 * Also automatically converts Thai Kedmanee keyboard layout characters if present.
 *
 * @param {string} data - The transaction string.
 * @param {boolean} convertThai - Whether to convert Thai characters.
 * @returns {string} The validated transaction string.
 */
export function validateTransactionString(data, convertThai = true) {
    if (!data || typeof data !== "string") return data;
    let cleanData = data.trim();
    if (convertThai) {
        cleanData = convertThaiKeyToEnglish(cleanData);
    }
    if (cleanData.indexOf("qr_code=") !== -1) {
        debug("🆔 QR_CODE INCLUDE WEB-PAYMENT", cleanData);
        cleanData = cleanData.split("qr_code=")[1];
    } else if (cleanData.indexOf("qr-code=") !== -1) {
        debug("🆔 QR_CODE INCLUDE WEB-PAYMENT", cleanData);
        cleanData = cleanData.split("qr-code=")[1];
    }
    if (cleanData.indexOf("&") !== -1) {
        cleanData = cleanData.split("&")[0];
    }
    return cleanData;
}

export function checkIpAddress(ip) {
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Pattern.test(ip)) return false;

    // Check each octet is between 0 and 255
    const octets = ip.split(".");
    return octets.every((octet) => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
    });
}

export function isValidTimeRange(timeRange) {
    const timeRangeRegex = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

    return timeRangeRegex.test(timeRange);
}

export function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}

export async function dataURLtoFile(data_url, filename = "img", maxWidth = 720, quality = 0.7) {
    if (!data_url || data_url === "") {
        printError("data_url is null or empty");
        return null;
    }
    try {
        console.log("🚀 dataURLtoFile start ", data_url.length > 100 ? data_url.substring(0, 100) : data_url);
        if (data_url.startsWith("data:image/")) {
            const blob = await (await fetch(data_url)).blob();
            return new File([blob], filename);
        }
        const startTime = performance.now();
        // 1. Auto-aspect ratio resize process
        const resizedDataUrl = await new Promise((resolve, reject) => {
            const img = new Image();
            img.src = data_url;
            img.onload = () => {
                const canvas = document.createElement("canvas");

                // Compute proportional height based on maxWidth (720)
                const scaleFactor = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scaleFactor;

                const ctx = canvas.getContext("2d");
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Optimize image with image/jpeg quality 0.7
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                canvas.width = 0;
                canvas.height = 0;
                img.src = "";
                resolve(dataUrl);
            };
            img.onerror = (err) => {
                img.src = "";
                reject(new Error("Image Load Error: " + err));
            };
        });

        // 2. Convert to File Object
        const blob = await (await fetch(resizedDataUrl)).blob();
        const file = new File([blob], `${filename}.jpg`, { type: "image/jpeg" });

        const duration = (performance.now() - startTime).toFixed(0);
        console.log(
            `📉 [${filename}] Resized to 720px | Time: ${duration}ms | Size: ${(file.size / 1024).toFixed(1)} KB`,
        );

        return file;
    } catch (error) {
        console.warn("dataURLtoFile Error: " + error);
        return null;
    }
}

async function resizeImage(base64Image, maxWidth, maxHeight) {
    debug("resizeImage", maxWidth, maxHeight);

    return new Promise((resolve, reject) => {
        if (!base64Image || typeof base64Image !== "string") {
            reject(new Error("Invalid base64 image."));
            return;
        }

        const img = new Image();

        img.onload = () => {
            try {
                let width = img.naturalWidth || img.width;
                let height = img.naturalHeight || img.height;

                if (!width || !height) {
                    reject(new Error("Invalid image dimensions."));
                    return;
                }

                if (width > height) {
                    if (width > maxWidth) {
                        height = height * (maxWidth / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = width * (maxHeight / height);
                        height = maxHeight;
                    }
                }

                width = Math.round(width);
                height = Math.round(height);

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Canvas context not available."));
                    return;
                }

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, 0, 0, width, height);

                const result = canvas.toDataURL("image/jpeg", 0.75);

                img.onload = null;
                img.onerror = null;
                img.src = "";

                resolve(result);
            } catch (err) {
                console.error("Error resizing image:", err);
                reject(err);
            }
        };

        img.onerror = () => {
            console.error("Failed to load base64 image length:", base64Image ? base64Image.length : 0);
            reject(new Error("Failed to load the base64 image."));
        };

        img.src = base64Image;
    });
}

window.showPreview = showPreview;
export async function showPreview(event, obj_id, size_image) {
    if (event.target.files.length > 0) {
        const preview = typeof obj_id === "string" ? document.getElementById(obj_id) : obj_id;
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onloadend = async function () {
            const img = new Image();

            // 1. Attach onload/onerror listeners in advance
            img.onload = async () => {
                const e_size_image = [img.naturalWidth, img.naturalHeight];

                if (isNaN(size_image)) {
                    if (size_image === "ORG") {
                        debug("showPreview ORG");
                        preview.src = reader.result;
                    } else {
                        // Pass result when image loads successfully
                        preview.src = await resizeImage(reader.result, 128, 128);
                    }
                } else {
                    const int_size_w = parseInt(size_image);
                    if (e_size_image && e_size_image[0] > 0) {
                        // Guard against division by zero
                        const int_size_h = (e_size_image[1] / e_size_image[0]) * int_size_w;
                        preview.src = await resizeImage(reader.result, int_size_w, int_size_h);
                    } else {
                        preview.src = reader.result;
                    }
                }
            };

            img.onerror = (err) => {
                console.error("Failed to load the image inside FileReader.", err);
            };

            // 2. Set image src after attaching event listeners
            img.src = reader.result;
        };

        reader.readAsDataURL(file);
    }
}

export function debugForm(formData) {
    console.log("%c🧪 DEBUG FORM DATA", "color:#0af; font-weight:bold;");
    if (!formData) {
        console.error("formData is null");
        return;
    }
    formData.forEach((value, key) => {
        if (value instanceof File) {
            console.log(`${key}: FILE ->`, {
                name: value.name,
                size: value.size,
                type: value.type,
            });
        } else {
            console.log(`${key}:`, value);
        }
    });
}

let controlSound = false;

const dummyHowl = { play: () => {} };

const soundBtn = typeof Howl !== "undefined" ? new Howl({
    src: ["/static/sound/click-button-140881.mp3"],
}) : dummyHowl;

const soundError = typeof Howl !== "undefined" ? new Howl({
    src: ["/static/sound/computer-error-meme-jam-fx-1-00-02.mp3"],
}) : dummyHowl;

const soundSuccess = typeof Howl !== "undefined" ? new Howl({
    src: ["/static/sound/success-1-6297.mp3"],
}) : dummyHowl;

function btnClickSound() {
    if (controlSound) {
        soundBtn.play();
    }
}

function playClickSound() {
    soundBtn.play();
}
function playErrorSound() {
    if (controlSound) {
        soundError.play();
    }
}

function playSuccessSound() {
    if (controlSound) {
        soundSuccess.play();
    }
}
export function setControlSound(v) {
    controlSound = v;
}

/**
 * Displays a confirmation dialog with a specified title and content.
 *
 * @param {Object} options - The options for the dialog.
 * @param {string} [options.title="Are you sure?"] - The title of the dialog.
 * @param {string} [options.content="Confirm deletion of record"] - The content message of the dialog.
 *
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating
 * whether the confirm button was clicked.
 */

export async function dialogConfirm({
    content = "Are you sure you want to delete this record?",
    title = "Are you sure?",
} = {}) {
    const result = await showDialogConfirm({ title: title, content: content });
    return result.confirm;
}

/**
 * ***************************************************************
 */

/**
 * Introduces a delay in execution.
 *
 * @param {number} ms - The number of milliseconds to delay execution.
 * @returns {Promise<void>} - A promise that resolves after the specified delay.
 */
export async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function dateTimeToStr(dateTime, format = "DD/MM/YYYY HH:mm:ss", daysToAdd = 0, is_utc = false) {
    if (!dateTime) return "";

    let d;
    let isDayjs = false;
    if (dayjs.isDayjs(dateTime)) {
        d = dateTime;
    } else if (typeof dateTime === "number") {
        d = dateTime < 1e11 ? dayjs.unix(dateTime) : dayjs(dateTime);
    } else if (typeof dateTime === "string" && /^\d+(\.\d+)?$/.test(dateTime.trim())) {
        // Support unix timestamps in integer and float strings
        const num = Number(dateTime.trim());
        d = num < 1e11 ? dayjs.unix(num) : dayjs(num);
    } else {
        d = dayjs(dateTime);
    }

    if (!d || !d.isValid()) return "";

    if (daysToAdd !== 0) {
        d = d.add(daysToAdd, "day");
    }

    return !is_utc ? d.format(format) : d.subtract(7, "hour").format(format);
}
// secondsToDuration

/**
 * Converts seconds to a human-readable duration format.
 *
 * @param {number} seconds - The number of seconds.
 * @returns {string} - The formatted duration string in the format "HH:mm:ss" or "X day HH:mm:ss".
 */
export function secondsToDuration(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = String(Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))).padStart(2, "0");
    const minutes = String(Math.floor((seconds % (60 * 60)) / 60)).padStart(2, "0");
    let duration = `${hours}:${minutes}`;
    if (days) {
        duration = `${days} day ${duration}`;
    }
    return duration;
}

export function isoToDatetimeLocal(str) {
    const d = new Date(str);
    if (isNaN(d)) return "";

    const pad = (n) => String(n).padStart(2, "0");

    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());

    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

function diffHHMMSS(startStr, endStr) {
    const start = dayjs(startStr);
    const end = dayjs(endStr);

    if (!start.isValid() || !end.isValid()) return "";

    const sec = end.diff(start, "second");
    if (sec < 0) return "00:00:00";

    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");

    // return `${h}:${m}:${s}`;
    return h !== "00" ? `${h} hrs ${m} mins` : `${m} mins`;
}

export function dateTimeDiff(dateTimeStart, dateTimeEnd, format = "YYYY/MM/DD HH:mm:ss") {
    if (!dateTimeStart) return "";

    const start = dayjs(dateTimeStart, format, true);
    if (!start.isValid()) return "";

    const end = dateTimeEnd ? dayjs(dateTimeEnd, format, true) : dayjs();

    if (!end.isValid()) return "";

    const ms = end.diff(start);

    // Validate end >= start timestamps
    if (ms < 0) return "00:00:00";

    const totalSeconds = Math.floor(ms / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [String(hours).padStart(2, "0"), String(minutes).padStart(2, "0"), String(seconds).padStart(2, "0")].join(
        ":",
    );
}

export function timeRef(dateTimeStart, dateTimeEnd, format = "YYYY/MM/DD HH:mm:ss") {
    let start;

    if (!dateTimeStart) {
        start = dayjs();
    } else {
        start =
            typeof dateTimeStart === "string" && dateTimeStart.includes("T")
                ? dayjs(dateTimeStart)
                : dayjs(dateTimeStart, format, true);
    }

    if (!start.isValid()) return "";

    // Remaining processing logic
    if (!dateTimeEnd) {
        return start.fromNow();
    }

    const end =
        typeof dateTimeEnd === "string" && dateTimeEnd.includes("T")
            ? dayjs(dateTimeEnd)
            : typeof dateTimeEnd === "string"
              ? dayjs(dateTimeEnd, format, true)
              : dayjs(dateTimeEnd);

    if (!end.isValid()) return "";

    return start.to(end, true);
}

export function timeToNowSecondsNative(dateTime, { allowFuture = false } = {}) {
    const t = dateTime instanceof Date ? dateTime.getTime() : Date.parse(dateTime);
    if (Number.isNaN(t)) return null;

    let sec = Math.floor((Date.now() - t) / 1000); // Time delta in seconds
    if (!allowFuture) sec = Math.max(0, sec);
    return sec;
}

/**
 * Converts seconds to a human-readable duration format in Thai.
 *
 * @param {number} seconds - The total number of seconds.
 * @returns {string} - The formatted duration string in Thai.
 */
export function secToDurationLocal(seconds) {
    if (typeof seconds !== "number" || seconds < 0) {
        throw new Error("Input should be a non-negative number.");
    }

    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    let duration = `${minutes} mins`;
    if (hours > 0) {
        duration = `${hours} hrs ${duration}`;
    }
    if (days > 0) {
        duration = `${days} days ${duration}`;
    }

    return duration;
}

function isASCII(str) {
    return /^[\x00-\x7F]*$/.test(str);
}

export function clearAllCookies() {
    // Get all cookies as a single string
    const cookies = document.cookie.split(";");
    // Loop through each cookie and clear it
    cookies.forEach((cookie) => {
        const cookieName = cookie.split("=")[0].trim();
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    });
}

export function setCookie(cname, value, expire = 0) {
    if (isASCII(value)) {
        if (expire != 0) {
            const d = new Date();
            d.setTime(d.getTime() + expire * 1000);
            document.cookie = `${cname}=${value};expires=${d.toGMTString()};path=/`;
        } else {
            document.cookie = `${cname}=${value};path=/`;
        }
    } else {
        debug("Not set Cookie " + value);
    }
}

export function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == " ") {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

// getHeaders

/**
 * @function getHeaders
 * @description Returns an object with headers for a JSON API request.
 * @returns {Promise<Object>}
 *   A promise that resolves to an object with the following properties:
 *
 *   - `Accept`: The value of this header is set to `"application/json"`.
 *   - `Authorization`: The value of this header is set to the value of the
 *     `"Authorization"` cookie.
 *   - `Content-Type`: The value of this header is set to `"application/json"`.
 */
export async function getHeaders() {
    const token = getCookie("Authorization");
    const headers = {
        Accept: "application/json",
        Authorization: token,
        "Content-Type": "application/json",
    };
    return headers;
}

/**
 * @function fetchWithTimeout
 * @description Fetches a resource with a specified timeout period.
 * @param {string} resource The URL of the resource to fetch.
 * @param {{ timeout: number, [key: string]: any }} [options]
 *   An object with the following properties:
 *   - `timeout`: The amount of time to wait for the fetch to complete before
 *     aborting. Defaults to 5000 (5 seconds).
 *   - `[key: string]`: Any additional options to be passed to the fetch function.
 * @returns {Promise<Response>} A promise that resolves to the response object.
 */
async function fetchWithTimeout(resource, { timeout = 5000, ...options } = {}) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timerId);
        return response;
    } catch (error) {
        clearTimeout(timerId);
        throw error;
    }
}

/**
 * @function fetchApi
 * @description Sends a fetch request to the given path with the specified method, body, and headers.
 * @param {string} [path=""] - The URL of the resource to fetch.
 * @param {string} [method="get"] - The HTTP method to use for the request.
 * @param {string|object|FormData} [body=null] - The body of the request.
 * @param {string} [returnType="text"] - The type of data to return from the response.
 *   Valid values are "text" and "json".
 * @param {boolean} [header=true] - Whether to include the Authorization header in the request.
 * @param {number} [timeout=10000] - The amount of time to wait for the fetch to complete before
 *   aborting. Defaults to 10000 (10 seconds).
 * @returns {Promise<Response>} A promise that resolves to the response object.
 */
export async function fetchApi(
    path = "",
    method = "get",
    body = null,
    returnType = "text",
    header = true,
    timeout = 10000,
) {
    // --- FIX RELATIVE PATH ---
    // if (path.startsWith("/")) {
    //     path = `${location.origin}${path}`;
    //     console.log("FIX RELATIVE PATH :", path);
    // }

    const headersJson = {
        accept: "application/json",
        Authorization: getCookie("Authorization"),
        "Content-Type": "application/json",
    };
    const headersForm = {
        accept: "application/json",
        Authorization: getCookie("Authorization"),
        // 'Content-Type': 'multipart/form-data',
    };

    let headers = headersJson;
    if (typeof body == "object") {
        headers = headersForm;
    }

    let response = null;
    try {
        response = await fetchWithTimeout(path, {
            method: method,
            headers: headers,
            body: body,
            timeout: timeout,
            mode: header ? undefined : "no-cors",
        });
    } catch (err) {
        logger.warn(`fetchApi not response or error: ${err}`);
        return {
            status: 499,
            msg: "Client Disconnected",
        };
    }

    switch (response.status) {
        case 401:
            document.cookie = "Authorization=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            break;
        case 200:
            if (returnType === "text") {
                return await response.text();
            }
            if (returnType === "json") {
                let data = await response.json();
                if (data) {
                    data.status = response.status ? response.status : true;
                } else {
                    data = { status: response.status };
                }
                return data;
            }
            break;
        case 422:
            const data = await response.json();
            let invalid_fields_str = "";

            // Verify data and data.invalid_fields exist
            if (data && data.invalid_fields) {
                for (const [key, value] of Object.entries(data.invalid_fields)) {
                    invalid_fields_str += `- ${key}: ${value}<br>`;
                }

                response.msg = `CODE: 422 (Invalid Data Format)<br>${invalid_fields_str}`;
            } else {
                // Fallback error message extract
                const errorMsg = data?.message || data?.error || "Invalid request payload submitted";
                response.msg = `CODE: 422 (Invalid Format)<br>- ${errorMsg}`;
            }

            showToastNotification({ type: "warning", msg: `${response.msg}` });
            break;

            return response;
            break;
        case 500:
            const errData = await response.json();
            console.error(errData);
            showDialogError({
                title: `<div class="badge badge-error badge-soft badge-lg">Error</div>`,
                msg: `🆘 Error <br>🚨 : ${errData.error || ""} <br>${errData.detail || errData.msg}`,
            });
            break;

        default:
            showToastNotification({ icon: "error", msg: `${response.statusText}\n${await response.text()}` });
            break;
    }
    return response;
}

window.logout = logout;
async function logout() {
    const result = await showDialogConfirm({ title: "Sign Out", content: "Are you sure you want to sign out?" });
    debug(result);
    if (result.confirm) {
        // document.cookie = "Authorization=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        clearAllCookies();
        location.reload();
    }
}

window.showMessageDropdownContent = showMessageDropdownContent;
async function showMessageDropdownContent() {
    const messageDropdownContent = document.getElementById("message_dropdown_content");
    if (messageDropdownContent) {
        messageDropdownContent.innerHTML = `<div class="text-center"> <span class="loading loading-dots loading-lg mx-auto"></span> </div>`;
        await delay(1000);
        messageDropdownContent.innerHTML = "";
        const template = document.getElementById("message_dropdown_content_li");
        const clone = template.content.cloneNode(true);
        messageDropdownContent.appendChild(clone);
    }
}

export function toCurrency(value) {
    return new Intl.NumberFormat("th-TH", {
        style: "decimal", // Decimal currency format
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value || 0);
}

export function toNumber(num, compact = false) {
    // Ensure num is a number; if it's null/undefined/invalid, default to 0
    const value = Number(num) || 0;

    return new Intl.NumberFormat("en-US", {
        notation: compact ? "compact" : "standard",
        maximumFractionDigits: 1,
    }).format(value);
}

window.onSoundControlSwitchChange = onSoundControlSwitchChange;

/**
 * When sound control switch is changed, this function is called.
 *
 * @param {Event} event Event object from sound control switch.
 * @return {Promise<void>} Promise that resolves when function is finished.
 *
 * @async
 */
async function onSoundControlSwitchChange(checked) {
    localStorage.setItem("SOUND_ENABLE", checked);
    playClickSound();
}

window.infoTransactionShow = infoTransactionShow;
/**
 * Displays transaction information in a modal dialog.
 *
 * Fetches transaction data from the API using the given transaction ID,
 * and populates the transaction info modal with the retrieved data.
 * The modal includes details about the transaction record, member information,
 * transaction logs, account logs, and e-stamp logs.
 *
 * @param {number} id - Transaction ID to fetch and display information for.
 * @param {string} [title=""] - Optional title to display in the modal.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 *
 * The modal displays various information such as transaction type, member details,
 * transaction logs with associated images, service fees, and account and e-stamp logs.
 * If any data is missing or not available, appropriate placeholders or default messages
 * are used to indicate the absence of data.
 */

async function infoTransactionShow(id, title = "", edit_mode = false) {
    const response = await fetchApi(`/api/transaction_record?id=${id}`, "get", null, "json");
    if (response.success) {
        console.log(response);
        const dialog = Dialog_Info_transaction;
        dialog.showModal();
        const transactionRecord = response.data.Transaction_Record;
        const visitor = response.data.Visitor;
        const member_user = response.data.Member_User;
        const objective = response.data.Objective;
        const vehicle_type = response.data.Vehicle_Type;
        const fuel_type = response.data.Fuel_Type;
        if (!transactionRecord) {
            showDialogError({ msg: "No transaction found" });
            return;
        }
        const serviceFees = response.data.Service_Fees;
        const memberData = response.member;
        const transactionLog = response.trans_log;
        const accountLog = response.accs_log;
        const estampLog = response.estamp_log;

        dialog.querySelector('[data-field="title"]').innerHTML =
            `${title} Transaction ID: ${String(transactionRecord.id).padStart(10, "0")}`;

        if (memberData) {
            const memberUser = memberData.Member_User;
            const memberType = memberData.Member_Type;
            dialog.querySelector('[data-field="transaction_type"]').innerHTML = memberType
                ? memberType.name
                : "Unassigned / Member Sync";
            dialog.querySelector('[data-field="card_image"]').src = memberUser
                ? memberUser.pictureUrl
                : "/static/image/logo.jpg";
            dialog.querySelector('[data-field="card_name"]').innerHTML = memberUser
                ? memberUser.name
                : "No Cardholder Name";
            dialog.querySelector('[data-field="link_slip_preview"]').classList.add("hidden");
        } else {
            dialog.querySelector('[data-field="transaction_type"]').innerHTML = transactionRecord.type;
            dialog.querySelector('[data-field="card_image"]').src =
                "/static/data_base/image/app_configurations/app_configurations_image.jpg";
            dialog.querySelector('[data-field="card_name"]').innerHTML = "visitor";

            const btnPreview = dialog.querySelector('[data-field="link_slip_preview"]');
            btnPreview.classList.remove("hidden");

            // 2. Dispatch appropriate handler
            btnPreview.onclick = function () {
                const firstLog = accountLog && accountLog.length > 0 ? accountLog[0] : null;
                console.log(firstLog);
                const logType = firstLog?.Account_Record.type || "";

                if (logType.includes("(GATE-IN)")) {
                    // Case: GATE-IN
                    previewSlipInAccImage(0, transactionRecord.id);
                } else {
                    // Case: GATE-OUT / General / No Log
                    previewSlipInImage(transactionRecord.id);
                }
            };
        }

        // TODO: transaction log

        // console.log(transactionRecord);
        let time_line_html = "";

        const btn_edit_transaction_detail = edit_mode
            ? `<button class="btn btn-warning btn-lg" onclick="editTransaction(${transactionRecord.id}); dialog.close();", 'Edit Transaction Details', true);">Edit Transaction Details</button>`
            : "";

        const transaction_detail = `<div class="flex flex-col gap-2 mb-4 p-4 border border-base-300 rounded-box">
                                        <div class="font-bold text-sm">Additional Details</div>
                                        <div class="overflow-x-auto">
                                            <table class="table table-zebra table-xs">
                                                <tbody>
                                                <tr>
                                                    <td>Name</td>
                                                    <td>${visitor ? visitor.name : "-"}</td>
                                                </tr>
                                                <tr>
                                                    <td>Vehicle Type</td>
                                                    <td>${vehicle_type ? vehicle_type.name : "-"}</td>
                                                </tr>
                                                <tr>
                                                    <td>Fuel Type</td>
                                                    <td>${fuel_type ? fuel_type.name : "-"}</td>
                                                </tr>
                                                <tr>
                                                    <td>Purpose</td>
                                                    <td>${objective ? objective.name : "-"}</td>
                                                </tr>
                                                <tr>
                                                    <td>Contact Unit</td>
                                                    <td>${member_user ? member_user.name : "-"}</td>
                                                </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        ${btn_edit_transaction_detail}
                                    </div>`;

        time_line_html += transaction_detail;
        let time_line_last = null;
        await transactionLog.forEach((transaction, index) => {
            // console.log(transaction);
            const systemUser = transaction.System_Users;
            const gateWay = transaction.GateWay;
            const parkingLot = transaction.Parking_Lot;
            const Log_Transaction = transaction.Log_Transaction;
            const _d = dateTimeToStr(Log_Transaction.date_time);
            const datetime = _d.split(" ");
            const images = Log_Transaction.images_path.split(",");
            let img_url = images[0];

            if (index == 0) {
                dialog.querySelector('[data-field="card_id"]').textContent =
                    `${transactionRecord.card_id}/${Log_Transaction.license}`;
            } else {
                console.log("time_line_last", time_line_last, Log_Transaction.date_time);
                const parking_time = diffHHMMSS(time_line_last, Log_Transaction.date_time);
                console.log("parking_time", parking_time);
                time_line_html += `<div class="flex text-center items-center px-1"><div class="badge badge-soft badge-warning badge-sm">${parking_time}</div></div>`;
            }

            time_line_last = Log_Transaction.date_time;

            const warp_datatime = `
            <div class="flex flex-col gap-1">
                <div class="tooltip tooltip-right">
                <div class="tooltip-content">
                    <div>click for preview</div>
                </div>
                <div class="avatar">
                    <div class="mask mask-squircle w-20 ">
                        <img src="${img_url}" loading="lazy" class=""  onclick="showPreviewImageView('${img_url}');" onerror="this.onerror=null;this.src='/static/image/Image_not_available.png';">
                    </div>
                </div>
                </div>

                <div class="badge-date">${datetime[0]}</div>
                <div class="badge-time">${datetime[1]}</div>
            </div>`;
            let gate_type_icon = "***";

            switch (gateWay.type) {
                case "IN":
                    gate_type_icon = `<i class="fa-solid fa-right-to-bracket fa-2x text-primary"></i>`;
                    break;
                case "IN-SUB":
                    gate_type_icon = `<i class="fa-solid fa-right-to-bracket fa-2x text-info"></i>`;
                    break;
                case "OUT":
                    gate_type_icon = `<i class="fa-solid fa-right-from-bracket fa-2x text-success"></i>`;
                    break;
                case "OUT-SUB":
                    gate_type_icon = `<i class="fa-solid fa-right-from-bracket fa-2x text-warning"></i>`;
                    break;
                default:
                    break;
            }

            const time_line_content = `<div>
                                            <div class="font-semibold text-center">${gateWay.name}</div>
                                            <div class="text-sm text-center">${gateWay.type}</div>
                                            <div class="text-xs text-center">${parkingLot.name}</div>
                                            <button class="btn btn-soft btn-primary btn-sm" onclick="show_log_transaction(${Log_Transaction.id});">Moer...</button>
                                        </div>`;

            time_line_html += `<li>
                                ${index > 0 ? "<hr />" : ""}
                                <div class="timeline-start">${warp_datatime}</div>
                                <div class="timeline-middle">${gate_type_icon}</div>
                                <div class="timeline-end timeline-box">${time_line_content}</div>
                                <hr />
                            </li>`;
        });
        dialog.querySelector('[data-field="transaction_time_line"]').innerHTML = time_line_html;
        // TODO: transaction log

        dialog.querySelector('[data-field="service_fee"]').innerHTML = serviceFees
            ? serviceFees.name
            : "No service fee applied";

        let parked_content = "N/A";
        if (transactionRecord.parked) {
            parked_content = secondsToDuration(transactionRecord.parked);
        } else {
            if (transactionRecord.status === "CHECK_IN") {
                if (transactionLog[0]) {
                    const parked_seconds = timeToNowSecondsNative(transactionLog[0].Log_Transaction.date_time);
                    parked_content = secondsToDuration(parked_seconds);
                } else {
                    parked_content = "No data available";
                }
            }
        }

        dialog.querySelector('[data-field="parked"]').textContent = parked_content;

        let transactionRecordStatus = transactionRecord.status;
        switch (transactionRecordStatus) {
            case "CHECK_IN":
                transactionRecordStatus = "🇵 PARKED";
                break;

            default:
                break;
        }
        dialog.querySelector('[data-field="status"]').innerHTML = transactionRecordStatus;
        dialog.querySelector('[data-field="remark"]').innerHTML = transactionRecord.remark
            ? transactionRecord.remark.replace(/\n/g, "<br>")
            : `<div class="badge badge-soft badge-info">No Remarks</div>`;

        // Acc data
        const transactionAccsInfo = dialog.querySelector('[data-field="transaction_accs_info"]');
        transactionAccsInfo.innerHTML = "";
        if (accountLog) {
            const tempAcc = document.getElementById("template_Info_transaction_Content_Acc");
            accountLog.forEach((account) => {
                const acc = account.Account_Record;
                const cAcc = tempAcc.content.cloneNode(true);
                cAcc.querySelector('[name="btn_show_acc_slip_info"]').setAttribute(
                    "onclick",
                    ["E-PAYMENT"].includes(acc.type) || acc.type.includes("(GATE-IN)")
                        ? `previewSlipAccImage(${acc.id})`
                        : `previewSlipOutImage(${acc.id})`,
                );
                cAcc.querySelector('[name="acc_no"]').innerHTML = acc.no;
                cAcc.querySelector('[name="acc_amount"]').innerHTML = acc.amount + acc.fine;
                cAcc.querySelector('[name="acc_cashier"]').innerHTML = acc.cashier;
                cAcc.querySelector('[name="acc_type"]').innerHTML = acc.type;
                transactionAccsInfo.appendChild(cAcc);
            });
        } else {
            transactionAccsInfo.innerText = "No payment records";
        }

        const transactionEstampInfo = dialog.querySelector('[data-field="transaction_estamp_info"]');
        transactionEstampInfo.innerHTML = "";
        if (estampLog) {
            const tempEstamp = document.getElementById("template_Info_transaction_Content_Estamp");
            estampLog.forEach((estamp) => {
                // console.log(estamp);
                const cEstamp = tempEstamp.content.cloneNode(true);
                cEstamp.querySelector('[name="estamp_system_user_image"]').src = estamp.pictureUrl;
                cEstamp.querySelector('[name="estamp_system_user_name"]').innerText = estamp.username;
                cEstamp.querySelector('[name="estamp_date"]').innerText = dateTimeToStr(estamp.date_time);
                cEstamp.querySelector('[name="before_service_fees"]').innerText = estamp.before_service_fees;
                cEstamp.querySelector('[name="service_fees"]').textContent = estamp.service_fees;
                cEstamp.querySelector('[name="device_name"]').innerHTML = estamp.device_name
                    ? `<span class='badge badge-success badge-soft badge-xs text-nowrap'>${estamp.device_name}</span>`
                    : "<span class='badge badge-warning badge-soft badge-xs text-nowrap'>Terminal/Cashier</span>";

                cEstamp.querySelector('[name="log"]').textContent = estamp.log;

                transactionEstampInfo.appendChild(cEstamp);
            });
        } else {
            transactionEstampInfo.innerText = "No E-Stamp records";
        }
        // *****************************
    }
}

window.show_log_transaction = show_log_transaction;
async function show_log_transaction(id) {
    // showToastNotification({ msg: id });
    const modal = Modal_Info_LogTransaction;
    const respond = await fetchApi(`/api/transaction_record/log_transaction?id=${id}`, "get", null, "json");
    console.log(respond);
    if (respond.success) {
        const data = respond.data;
        const Log_Transaction = data.Log_Transaction;
        const System_Users = data.System_Users;
        const GateWay = data.GateWay;
        const Parking_Lot = data.Parking_Lot;
        data2fields(data, modal);
        const log_images = Log_Transaction.images_path.split(",");
        const log_images_content = modal.querySelector('[data-field="log_images"]');
        log_images_content.innerHTML = "";
        const defaultUrl = "/static/image/Image_not_available.png";
        log_images.forEach((image_path) => {
            const img = document.createElement("img");
            img.classList.add("rounded-box");
            img.classList.add("max-w-72");
            img.onerror = () => {
                img.src = defaultUrl;
                // Clear onerror handler to prevent infinite loop
                img.onerror = null;
            };
            img.alt = "Vehicle Snapshot";
            img.src = image_path;
            log_images_content.appendChild(img);
        });
    }

    modal.showModal();
}

window.previewSlipInImage = previewSlipInImage;

async function previewSlipInImage(transaction_id) {
    console.log("previewSlipInImage", transaction_id);
    const ts = new Date().getTime();
    const slipPath = `/api/function/slip_in?transaction_id=${transaction_id}&t=${ts}`;
    const htmlContent = `
        <div class="card bg-base-100 w-96 shadow-xl">
            <figure>
                <img src="${slipPath}" alt="Slip-In" />
            </figure>
        </div>
    `;
    showDialogInfo({ title: "Gate-In Ticket Slip", msg: htmlContent });
}

window.previewSlipOutImage = previewSlipOutImage;
async function previewSlipOutImage(accId) {
    console.log("previewSlipOutImage", accId);
    const ts = new Date().getTime();
    const slipPath = `/api/function/slip_pay?acc_id=${accId}&t=${ts}`;
    const htmlContent = `
        <div class="card bg-base-100 w-96 shadow-xl">
            <figure>
                <img src="${slipPath}" alt="Slip" />
            </figure>
        </div>
    `;
    showDialogInfo({ title: "Receipt (POS Terminal Out)", msg: htmlContent });
}

window.previewSlipInAccImage = previewSlipInAccImage;
async function previewSlipInAccImage(accId = "0", transaction_id = "0") {
    console.log("previewSlipInAccImage", accId, transaction_id);
    const ts = new Date().getTime();

    const slipPath = `/api/function/slip_in_pay?acc_id=${accId}&transaction_id=${transaction_id}&t=${ts}`;
    const htmlContent = `
        <div class="card bg-base-100 w-96 shadow-xl">
            <figure>
                <img src="${slipPath}" alt="Slip" />
            </figure>
        </div>
    `;
    showDialogInfo({ title: "Receipt (POS Terminal In)", msg: htmlContent });
}

window.previewSlipAccImage = previewSlipAccImage;
async function previewSlipAccImage(accId) {
    console.log("previewSlipAccImage", accId);
    const ts = new Date().getTime();
    const slipPath = `/api/function/slip_pay_acc?acc_id=${accId}&t=${ts}`;
    const htmlContent = `
        <div class="card bg-base-100 w-96 shadow-xl">
            <figure>
                <img src="${slipPath}" alt="Slip" />
            </figure>
        </div>
    `;
    showDialogInfo({ title: "Receipt (Payment)", msg: htmlContent });
}

window.previewSlipRenewImage = previewSlipRenewImage;
async function previewSlipRenewImage(accId) {
    const ts = new Date().getTime();
    const slipPath = `/api/function/slip_pay_member_renew_acc?acc_id=${accId}&t=${ts}`;
    const htmlContent = `
        <div class="card bg-base-100 w-96 shadow-xl">
            <figure>
                <img src="${slipPath}" alt="Slip" />
            </figure>
        </div>
    `;
    showDialogInfo({ title: "Receipt (Member Card Renewal)", msg: htmlContent });
}

window.printSummaryReport = printSummaryReport;

function printSummaryReport(option = { title: "Summary Report" }) {
    const reportTitle = document.querySelector("#Summary_Report_Print_Area h3")?.innerText || option.title;
    printJS({
        printable: "Summary_Report_Print_Area",
        type: "html",
        scanStyles: false,
        targetStyles: [],
        documentTitle: reportTitle,
        style: `
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
            @page {
                size: A4;
                margin: 10mm;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box;
            }
            body {
                margin: 0;
                padding: 0;
                font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', sans-serif !important;
            }
            #Summary_Report_Print_Area {
                width: 100% !important;
                max-width: 100% !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                background: none !important;
            }
            .print-no-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
        `,
    });
}

window.previewSlipRenewMemberUserImage = previewSlipRenewMemberUserImage;
async function previewSlipRenewMemberUserImage(accId) {
    const ts = new Date().getTime();
    const slipPath = `/api/function/slip_pay_member_user_renew_acc?acc_id=${accId}&t=${ts}`;
    const htmlContent = `
        <div class="card bg-base-100 w-96 shadow-xl">
            <figure>
                <img src="${slipPath}" alt="Slip" />
            </figure>
        </div>
    `;
    showDialogInfo({ title: "Receipt (Member User Renewal)", msg: htmlContent });
}

// openGateForce

/**
 * Opens a gate forcefully with an option for confirmation and logging.
 *
 * @param {number} id - The ID of the gate to be opened.
 * @param {boolean} [confirm=false] - Whether to prompt for confirmation before opening.
 * @param {string} [controlOpenUrl=""] - The URL to control the gate opening if not using the default API.
 * @param {string} [gateName=""] - The name of the gate for display and logging purposes.
 *
 * @returns {Promise<void>} - A promise that resolves when the gate operation is complete.
 *
 * The function checks the user's system type to ensure permission for emergency opening.
 * If confirmation is required, a dialog is shown to the user to provide a reason for the action.
 * The gate is opened using either a provided URL or a default API endpoint, based on the protocol.
 * Notifications are displayed to the user indicating the success or failure of the operation.
 * If successful and confirmed, an emergency log is created with the specified message.
 */

export async function openGateForce(id, confirm = false, controlOpenUrl = "", gateName = "") {
    if (!controlOpenUrl) {
        showToastNotification({ icon: "warning", msg: "Barrier control URL not configured" });
        return;
    }
    console.log("openGateForce", id, confirm, controlOpenUrl, gateName, LOGIN_USER.system_type);
    if (![1, 2, 3, 4].includes(LOGIN_USER.system_type)) {
        showDialogWarning({ msg: "Emergency open denied: Insufficient permissions" });
        return;
    }

    let openMessage = "";
    if (confirm) {
        const contentHtml = `<label class="form-control w-full max-w-xs">
                                <div class="p-2">
                                    <div class="label-text text-error">${LOGIN_USER.name}</div>
                                    <div class="label-text text-error">Emergency Gate Open: ${gateName}</div>
                                </div>
                                <input type="text" data-field="returnValue" placeholder="Enter reason for emergency gate open" class="input input-bordered w-full max-w-xs" />
                             </label>`;
        const result = await showDialogConfirm({ title: "Confirm Emergency Gate Open", content: contentHtml });
        if (!result.confirm) {
            return;
        }
        openMessage = `${LOGIN_USER.name} : Emergency gate open ${gateName}: ${result.value}`;
    }

    let apiResult = {};
    if (window.location.protocol === "https:" || controlOpenUrl.length <= 12 || !controlOpenUrl.startsWith("http://")) {
        apiResult = await fetchApi(`/api/gateway/active?id=${id}&open_msg=${openMessage}`, "get", null, "json");
    } else {
        if (controlOpenUrl.includes("relay_bat.cgi?")) {
            // For relay controllers
            fetch(controlOpenUrl, { mode: "no-cors" });
            apiResult = { success: true, msg: "OPEN GATE SUCCESS" };
        } else {
            apiResult = await fetchApi(controlOpenUrl, "get", null, "json");
        }
    }

    console.log("openGateForce", apiResult);
    if (apiResult) {
        const messageType = apiResult.success ? "success" : "error";
        const message = apiResult.success ? (apiResult.msg ? apiResult.msg : "OPEN GATE SUCCESS") : apiResult.msg;
        showToastNotification({
            icon: messageType,
            title: "GATE CONTROL",
            msg: message,
        });
        if (apiResult.success && confirm) {
            await fetchApi(
                `/api/function/check_emergency`,
                "post",
                JSON.stringify({ gate_id: id, log_type: "Emergency", msg: openMessage }),
                "json",
            );
        }
    } else {
        showToastNotification({
            icon: "error",
            title: "GATE CONTROL",
            msg: `${controlOpenUrl || ""}<br>Device Not Responding`,
        });
    }

    // if (apiResult.success && confirm) {
    //     await fetchApi(
    //         `/api/function/log`,
    //         "post",
    //         JSON.stringify({ log_type: "Emergency", msg: openMessage }),
    //         "json"
    //     );
    // }
}

export async function _openGateForce(gateway_id = 0, confirm = false, gateName = "") {
    console.log("openGateForce", gateway_id, confirm, gateName, LOGIN_USER.system_type);
    if (![1, 2, 3, 4].includes(LOGIN_USER.system_type)) {
        showDialogWarning({ msg: "Emergency open denied: Insufficient permissions" });
        return;
    }

    let openMessage = "";
    if (confirm) {
        const contentHtml = `<label class="form-control w-full max-w-xs">
                                <div class="p-2">
                                    <div class="label-text text-error">${LOGIN_USER.name}</div>
                                    <div class="label-text text-error">Emergency Gate Open: ${gateName}</div>
                                </div>
                                <input type="text" data-field="returnValue" placeholder="Enter reason for emergency gate open" class="input input-bordered w-full max-w-xs" />
                             </label>`;
        const result = await showDialogConfirm({ title: "Confirm Emergency Gate Open", content: contentHtml });
        if (!result.confirm) {
            return;
        }
        openMessage = `${LOGIN_USER.name} : Emergency gate open ${gateName}: ${result.value}`;
    }

    const apiResult = await fetchApi(
        `/api/gateway/active?id=${gateway_id}&open_msg=${openMessage}`,
        "get",
        null,
        "json",
    );

    console.log("openGateForce API Result:", apiResult);
    if (apiResult) {
        const messageType = apiResult.success ? "success" : "error";
        const message = apiResult.success ? (apiResult.msg ? apiResult.msg : "OPEN GATE SUCCESS") : apiResult.msg;
        showToastNotification({
            icon: messageType,
            title: "GATE CONTROL",
            msg: message,
        });
        if (apiResult.success && confirm) {
            await fetchApi(
                `/api/function/check_emergency`,
                "post",
                JSON.stringify({ gate_id: gateway_id, log_type: "Emergency", msg: openMessage }),
                "json",
            );
        }
    } else {
        showToastNotification({
            icon: "error",
            title: "GATE CONTROL",
            msg: `${controlOpenUrl || ""}<br>Device Not Responding`,
        });
    }

    // if (apiResult.success && confirm) {
    //     await fetchApi(
    //         `/api/function/log`,
    //         "post",
    //         JSON.stringify({ log_type: "Emergency", msg: openMessage }),
    //         "json"
    //     );
    // }
}

// ***************************************************************************************** //
let video = null;
let canvas = null;
let stream = null;
let videoConfig = null;
let current_image_element = null;

export async function startWebCam(selectCamera = false, element = null) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        logger.error("navigator.mediaDevices is not supported");
        showDialogWarning({ msg: "navigator.mediaDevices is not supported on this browser" });
        return;
    }

    if (element) {
        current_image_element = element;
    }
    if (selectCamera) {
        if (stream) {
            stream.getTracks().forEach(async function (track) {
                await track.stop();
            });
        }
        localStorage.setItem("localStorageCamera", null);
    }
    ModalWebCamSnap.showModal();
    const medias = await navigator.mediaDevices.enumerateDevices();
    const cam = { video: null, audio: false };
    const cams = [];
    let inputOptions = `<select class="select select-primary w-full max-w-xs" data-field="returnValue">`;
    for (let index = 0; index < medias.length; index++) {
        const media = medias[index];
        if (media.kind === "videoinput") {
            cams.push(media);
        }
    }
    let defaultCamera = null;
    let localStorageCamera = localStorage.getItem("localStorageCamera");
    for (let index = 0; index < cams.length; index++) {
        const c = cams[index];
        inputOptions += `<option value="${index}" >${c.label}</option>`;
        if (localStorageCamera == c.label) {
            defaultCamera = index;
            // showToastNotification({ icon: "info", msg: "select defaultCamera :" + index });
        }
    }
    inputOptions += `</select>`;
    // debug(inputOptions);
    if (cams.length == 1) {
        cam.video = cams[0];
    } else {
        if (defaultCamera != null) {
            cam.video = cams[parseInt(defaultCamera)];
        } else {
            const result = await showDialogConfirm({ title: "Select Camera Device", content: inputOptions });
            if (result.value && result.confirm) {
                cam.video = cams[parseInt(result.value)];
                localStorage.setItem("localStorageCamera", cams[parseInt(result.value)].label);
                showToastNotification({ icon: "info", msg: cams[parseInt(result.value)].label });
            }
        }
    }
    if (cam.video) {
        video = document.getElementById("video_web_cam");
        stream = await navigator.mediaDevices.getUserMedia(cam);
        video.srcObject = stream;
        videoConfig = stream.getVideoTracks()[0].getSettings();
    } else {
        ModalWebCamSnap.close();
    }
}

window.stopWebCam = stopWebCam;
export function stopWebCam() {
    if (stream) {
        stream.getTracks().forEach(function (track) {
            track.stop();
        });
    }
    if (video) {
        video.srcObject = null;
    }
    ModalWebCamSnap.close();
    stream = null;
}

window.selectWebCam = selectWebCam;
export function selectWebCam() {
    startWebCam(true);
}

function watermarkedDataURL(canvas) {
    const WATER_MARK_TEXT = "Confidential - For Parking System Use Only";
    const tempCanvas = document.querySelector("#canvas_web_cam_water_mark");
    const tempCtx = tempCanvas.getContext("2d");
    let cw, ch;
    cw = tempCanvas.width = canvas.width;
    ch = tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0);
    tempCtx.font = "16px sans-serif";
    if (cw > 400) {
        tempCtx.font = "24px sans-serif";
    }
    debug(tempCtx.font);

    tempCtx.globalAlpha = 0.9;
    tempCtx.fillStyle = "red";
    // tempCtx.rotate(-Math.PI / 4);
    tempCtx.textAlign = "center";
    tempCtx.fillText(WATER_MARK_TEXT, cw / 2, ch / 2);
    tempCtx.fillText("For LPRM Parking System Only", cw / 2, ch / 2 + 50);
    const resultUrl = tempCanvas.toDataURL();
    tempCanvas.width = 0;
    tempCanvas.height = 0;
    return resultUrl;
}

window.takePicture = takePicture;
export async function takePicture() {
    // debug(videoConfig);
    canvas = document.querySelector("#canvas_web_cam");
    // debug(canvas);
    canvas.width = videoConfig.width;
    canvas.height = videoConfig.height;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    // debug(canvas.width, canvas.height);
    const dataURL = watermarkedDataURL(canvas);
    canvas.width = 0;
    canvas.height = 0;
    // const image_data_url = canvas.toDataURL("image/png");
    if (current_image_element) {
        safeSetImageSrc(current_image_element, dataURL);
        showToastNotification({ icon: "success", msg: "Photo captured successfully" });
        stopWebCam();
    } else {
        showToastNotification({ icon: "warning", msg: "not current_image_element" });
    }
}

let html5QrcodeScanner = null;

export async function scanQR(mode = true, callBack = null) {
    if (mode) {
        debug("Start QR Reader");
        try {
            ModalQrCodeScan.showModal();
            const QR_CODE_CONFIG = {
                fps: 10,
                qrbox: { width: 200, height: 200 },
                rememberLastUsedCamera: true,
                // supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                showTorchButtonIfSupported: true,
                // formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            };

            const onScanSuccess = (decodedText, decodedResult) => {
                logger.debug(`Scan result: ${decodedText}`, decodedResult);
                html5QrcodeScanner.clear();
                ModalQrCodeScan.close();
                showToastNotification({ icon: "success", msg: "QR Code success: " + decodedText });
                if (callBack) callBack(decodedText);
            };

            html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", QR_CODE_CONFIG);
            html5QrcodeScanner.render(onScanSuccess);
        } catch (error) {
            logger.error("QR Scanner Error:", error);
            showToastNotification({ icon: "error", msg: "QR scanner failed to start. Please try again." });
        }
    } else {
        debug("Stop QR Reader", html5QrcodeScanner);

        if (html5QrcodeScanner) {
            html5QrcodeScanner
                .clear()
                .then(() => {
                    ModalQrCodeScan.close();
                })
                .catch((error) => {
                    logger.error("Error clearing QR scanner:", error);
                });
        } else {
            ModalQrCodeScan.close();
        }
    }
}

window.closeScanQr = closeScanQr;
function closeScanQr() {
    scanQR(false);
}

/**
 * Safely revoke Blob Object URL from image element if present
 * @param {HTMLImageElement|HTMLElement} imageElement
 */
window.revokeImageBlob = revokeImageBlob;
export function revokeImageBlob(imageElement) {
    if (!imageElement) return;
    const src = imageElement.src || imageElement.getAttribute?.("src");
    if (src && src.startsWith("blob:")) {
        try {
            URL.revokeObjectURL(src);
        } catch (e) {
            console.warn("URL.revokeObjectURL error:", e);
        }
    }
}

/**
 * Safely assign a new src to an image element while revoking any previous blob URL
 * @param {HTMLImageElement|HTMLElement} imageElement
 * @param {string} newSrc
 */
window.safeSetImageSrc = safeSetImageSrc;
export function safeSetImageSrc(imageElement, newSrc) {
    if (!imageElement) return;
    revokeImageBlob(imageElement);
    imageElement.src = newSrc || "";
}

/**
 * Fetch image from IP Camera and assign to imageElement with automatic Blob memory management
 * @param {string} cameraUrl - IP Camera URL
 * @param {HTMLElement} imageElement - Image element to assign the image to
 */
window.snapIpCameraToImageElement = snapIpCameraToImageElement;
export async function snapIpCameraToImageElement(cameraUrl, imageElement) {
    if (!imageElement) return;
    revokeImageBlob(imageElement);
    const response = await fetch(`/proxy?url=${encodeURI(cameraUrl)}&t=${Date.now()}`);
    const blob = await response.blob();
    const file = new File([blob], "camera.jpg", { type: blob.type });
    const objectUrl = URL.createObjectURL(file);
    imageElement.src = objectUrl;
}

// ? Print Helper
// Company Header Template

export const ReportSettings = {
    fontFamily: "'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', sans-serif",
    colorPrimary: "#1e3a8a",
    colorText: "#1f2937",
    colorTextLight: "#4b5563",
    colorBorder: "#cbd5e1",
    colorBgHeader: "#f1f5f9",
    colorBgAlt: "#f8fafc",
    colorBgParam: "#f8fafc",
    colorAccent: "#dc2626",

    fsTitle: "18px",
    fsSubtitle: "14px",
    fsSectionTitle: "13px",
    fsTableHead: "12px",
    fsTableBody: "12px",
    fsTableFoot: "12px",
    fsParam: "11px",
    fsSignature: "11px",
    fsBody: "12px",
    fsSmall: "11px",

    cellPadding: "2px 5px",
    tableGap: "8px",
};
export function peper_header_owner({ title = "Summary Report", titleI18n = null, title_i18n = null } = {}) {
    // === 1. Facility & Juristic Info ===
    const logoUrl = typeof owner_info !== "undefined" && owner_info.logo ? owner_info.logo : "/static/favicon.svg";
    const ownerName = (typeof owner_info !== "undefined" && owner_info.name) || "Smart Parking System";
    const address = (typeof owner_info !== "undefined" && owner_info.address) || "-";
    const phone = (typeof owner_info !== "undefined" && owner_info.phone) || "-";
    const taxNo = (typeof owner_info !== "undefined" && owner_info.vat_no) || "-";

    // === 2. Report Details ===
    const currentPrintDateTime =
        typeof printDateTime !== "undefined" ? printDateTime : new Date().toLocaleString("th-TH");
    const currentOperatorName =
        (typeof LOGIN_USER !== "undefined" && LOGIN_USER?.name) ||
        document.querySelector('[data-field="username"]')?.textContent?.trim() ||
        "Operator";

    // === 3. Theme Colors Configuration ===
    const colorPrimary = ReportSettings?.colorPrimary || "#1e3a8a";
    const colorTextLight = ReportSettings?.colorTextLight || "#4b5563";

    // === 4. Font Typography Setup ===
    const fsTitle = ReportSettings?.fsTitle || "18px";
    const fsSubtitle = ReportSettings?.fsSubtitle || "14px";
    const fsBody = ReportSettings?.fsBody || "12px";
    const fsSmall = ReportSettings?.fsSmall || "11px";

    // === 5. Title & i18n Translation ===
    const titleKey =
        title_i18n ||
        titleI18n ||
        (typeof title === "object" && title !== null ? title.i18n || title.key : null) ||
        (typeof title === "string" ? title : null);

    let translatedTitle = titleKey ? i18next_translate(titleKey) : "";
    let activeI18nKey = titleKey;

    // Fallback: If not translated and key contains parentheses (e.g., "Title (Sub)"), try main key
    if (!translatedTitle || translatedTitle === titleKey) {
        if (typeof titleKey === "string" && titleKey.includes(" (")) {
            const cleanKey = titleKey.split(" (")[0].trim();
            const cleanTranslated = i18next_translate(cleanKey);
            if (cleanTranslated && cleanTranslated !== cleanKey) {
                translatedTitle = cleanTranslated;
                activeI18nKey = cleanKey;
            }
        }
    }
    if (!translatedTitle || (translatedTitle === titleKey && typeof title === "object" && title !== null && title.text)) {
        translatedTitle = typeof title === "object" && title !== null ? (title.text || title.label || titleKey) : (title || "Summary Report");
    }

    // Check if HTML <template id="template_report_header_owner"> exists
    const templateEl = typeof document !== "undefined" ? document.getElementById("template_report_header_owner") : null;
    if (templateEl && templateEl.content) {
        const headerDom = templateEl.content.cloneNode(true).firstElementChild;

        const logoEl = headerDom.querySelector("[data-field='logo']");
        if (logoEl) logoEl.src = logoUrl;

        const ownerNameEl = headerDom.querySelector("[data-field='owner_name']");
        if (ownerNameEl) {
            ownerNameEl.textContent = ownerName;
            ownerNameEl.style.fontSize = `${fsTitle} !important`;
            ownerNameEl.style.color = colorPrimary;
        }

        const addressEl = headerDom.querySelector("[data-field='address']");
        if (addressEl) addressEl.textContent = address;

        const phoneWrapEl = headerDom.querySelector("[data-field='phone_wrap']");
        const phoneEl = headerDom.querySelector("[data-field='phone']");
        if (phone !== "-") {
            if (phoneEl) phoneEl.textContent = phone;
        } else if (phoneWrapEl) {
            phoneWrapEl.style.display = "none";
        }

        const vatWrapEl = headerDom.querySelector("[data-field='vat_wrap']");
        const vatNoEl = headerDom.querySelector("[data-field='vat_no']");
        if (taxNo !== "-") {
            if (vatNoEl) vatNoEl.textContent = taxNo;
        } else if (vatWrapEl) {
            vatWrapEl.style.display = "none";
        }

        const reportTitleEl = headerDom.querySelector("[data-field='report_title']");
        if (reportTitleEl) {
            reportTitleEl.textContent = translatedTitle;
            if (activeI18nKey && typeof activeI18nKey === "string") {
                reportTitleEl.setAttribute("data-i18n", activeI18nKey);
            }
            reportTitleEl.style.fontSize = `${fsSubtitle} !important`;
            reportTitleEl.style.color = colorPrimary;
        }

        const printTimeEl = headerDom.querySelector("[data-field='print_date_time']");
        if (printTimeEl) printTimeEl.textContent = currentPrintDateTime;

        const operatorEl = headerDom.querySelector("[data-field='operator_name']");
        if (operatorEl) operatorEl.textContent = currentOperatorName;

        const wrapper = document.createElement("div");
        wrapper.appendChild(headerDom);
        return wrapper.innerHTML;
    }

    // Fallback if template is not loaded in DOM
    const i18nAttr = activeI18nKey && typeof activeI18nKey === "string" ? ` data-i18n="${activeI18nKey}"` : "";
    return `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${colorPrimary}; padding-bottom: 12px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <img src="${logoUrl}" alt="Company Logo" style="height: 64px; width: auto; object-fit: contain; border-radius: 8px;" onerror="this.style.display='none'">
                    <div>
                        <h2 style="margin: 0 0 4px 0; font-size: ${fsTitle} !important; font-weight: bold; color: ${colorPrimary}; line-height: 1.2;">${ownerName}</h2>
                        <div style="font-size: ${fsSmall} !important; color: ${colorTextLight}; line-height: 1.4; max-width: 500px;">
                            ${address} ${phone !== "-" ? "<br>Tel: " + phone : ""}
                            ${taxNo !== "-" ? "<br>Tax ID: " + taxNo : ""}
                        </div>
                    </div>
                </div>
                
                <div style="text-align: right; line-height: 1.5;">
                    <h3 data-field="report_title"${i18nAttr} style="margin: 0 0 6px 0; font-size: ${fsSubtitle} !important; font-weight: bold; color: ${colorPrimary};">${translatedTitle}</h3>
                    <div style="font-size: ${fsBody} !important; color: ${colorTextLight};">
                        <b><span data-i18n="Date Created">Date Created</span>:</b> ${currentPrintDateTime}<br>
                        <b><span data-i18n="Prepared By">Prepared By</span>:</b> ${currentOperatorName}
                    </div>
                </div>
            </div>`;
}

export function peper_footer_owner({ title = "Summary Report" } = {}) {
    const fsSignature = ReportSettings?.fsSignature || "12px";
    const fsSmall = ReportSettings?.fsSmall || "11px";
    const colorBorder = ReportSettings?.colorBorder || "#cbd5e1";
    const colorTextLight = ReportSettings?.colorTextLight || "#4b5563";
    const operatorName =
        (typeof LOGIN_USER !== "undefined" && LOGIN_USER?.name) ||
        document.querySelector('[data-field="username"]')?.textContent?.trim() ||
        "-";

    // Check if HTML <template id="template_report_footer_owner"> exists
    const templateEl = typeof document !== "undefined" ? document.getElementById("template_report_footer_owner") : null;
    if (templateEl && templateEl.content) {
        const footerDom = templateEl.content.cloneNode(true).firstElementChild;

        const preparedByEl = footerDom.querySelector("[data-field='prepared_by']");
        if (preparedByEl) {
            preparedByEl.textContent = `( ${operatorName} )`;
        }

        const wrapper = document.createElement("div");
        wrapper.appendChild(footerDom);
        return wrapper.innerHTML;
    }

    // Fallback if template is not loaded in DOM
    return `
            <div class="print-no-break" style="margin-top: 20px; font-size: ${fsSignature} !important; border-top: 1px dashed ${colorBorder}; padding-top: 12px; page-break-inside: avoid; break-inside: avoid;">
                <div style="display: flex; justify-content: space-between; padding: 0; gap: 10px;">
                    
                    <div style="text-align: center; flex: 1; min-width: 0; line-height: 1.1;">
                        <div style="margin-bottom: 20px; color: ${colorTextLight}; font-size: ${fsSignature} !important; white-space: nowrap;">
                            Signature ___________________________ Prepared By
                        </div>
                        <div style="font-weight: bold; font-size: ${fsSignature} !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ( ${operatorName} )
                        </div>
                        <div style="margin-top: 8px; color: ${colorTextLight}; font-size: ${fsSmall} !important;">
                            System Operator / Reporter
                        </div>
                    </div>
                    
                    <div style="text-align: center; flex: 1; min-width: 0; line-height: 1.1;">
                        <div style="margin-bottom: 20px; color: ${colorTextLight}; font-size: ${fsSignature} !important; white-space: nowrap;">
                            Signature ___________________________ Verified By
                        </div>
                        <div style="font-weight: bold; font-size: ${fsSignature} !important; white-space: nowrap;">
                            (______________________________)
                        </div>
                        <div style="margin-top: 8px; color: ${colorTextLight}; font-size: ${fsSmall} !important;">
                            Supervisor / Auditor
                        </div>
                    </div>
                    
                    <div style="text-align: center; flex: 1; min-width: 0; line-height: 1.1;">
                        <div style="margin-bottom: 20px; color: ${colorTextLight}; font-size: ${fsSignature} !important; white-space: nowrap;">
                            Signature ___________________________ Authorized By
                        </div>
                        <div style="font-weight: bold; font-size: ${fsSignature} !important; white-space: nowrap;">
                            (______________________________)
                        </div>
                        <div style="margin-top: 8px; color: ${colorTextLight}; font-size: ${fsSmall} !important;">
                            General Manager / Director
                        </div>
                    </div>

                </div>
            </div>
    `;
}

window.peper_header_owner = peper_header_owner;
window.peper_footer_owner = peper_footer_owner;

window.renderSummaryReportA4 = renderSummaryReportA4;
/**
 * Universal A4 Summary Report Generator using HTML Template
 * @param {Object} options
 * @param {string|{text: string, i18n?: string}} [options.title="Summary Report"] - Title displayed in header (supports i18n translation key)
 * @param {string} [options.titleI18n] - Explicit i18n translation key for title
 * @param {string} [options.title_i18n] - Explicit i18n translation key for title (snake_case alias)
 * @param {string} [options.dateRange="-"] - Date range string
 * @param {Array<{label: string, value: string, i18n?: string}>} [options.filterParams=[]] - Extra parameter pills/badges
 * @param {Array<Object>} [options.sections=[]] - Array of report sections/tables
 * @param {string} [options.printAreaId="Summary_Report_Print_Area"] - Target print container ID
 * @param {string} [options.modalId="Modal_Summary_Report_A4"] - Modal ID to show (pass null to skip)
 * @param {string|null} [options.customHeaderHtml=null] - Custom header override
 * @param {string|null} [options.customFooterHtml=null] - Custom footer override
 */
export function renderSummaryReportA4({
    title = "Summary Report",
    titleI18n = null,
    title_i18n = null,
    dateRange = "-",
    filterParams = [],
    sections = [],
    printAreaId = "Summary_Report_Print_Area",
    modalId = "Modal_Summary_Report_A4",
    customHeaderHtml = null,
    customFooterHtml = null,
} = {}) {
    const templateMaster = document.getElementById("template_summary_report_a4");
    const printArea = document.getElementById(printAreaId);
    if (!printArea) {
        console.error(`Print area element '#${printAreaId}' not found.`);
        return;
    }

    const settings = ReportSettings || {};
    const fontFamily = settings.fontFamily || "'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', sans-serif";
    const colorPrimary = settings.colorPrimary || "#1e3a8a";
    const colorText = settings.colorText || "#1f2937";
    const colorTextLight = settings.colorTextLight || "#4b5563";
    const colorBorder = settings.colorBorder || "#cbd5e1";
    const colorBgHeader = settings.colorBgHeader || "#f1f5f9";
    const colorBgAlt = settings.colorBgAlt || "#f8fafc";
    const colorBgParam = settings.colorBgParam || "#f8fafc";

    const fsTitle = settings.fsTitle || "18px";
    const fsSectionTitle = settings.fsSectionTitle || "13px";
    const fsTableHead = settings.fsTableHead || "12px";
    const fsTableBody = settings.fsTableBody || "12px";
    const fsTableFoot = settings.fsTableFoot || "12px";
    const fsParam = settings.fsParam || "11px";
    const fsBody = settings.fsBody || "12px";

    const cellPadding = settings.cellPadding || "2px 5px";
    const tableGap = settings.tableGap || "8px";

    // Title & i18n Resolution
    const titleKey =
        title_i18n ||
        titleI18n ||
        (typeof title === "object" && title !== null ? title.i18n || title.key : null) ||
        (typeof title === "string" ? title : null);

    let translatedTitle = titleKey ? i18next_translate(titleKey) : "";
    let activeI18nKey = titleKey;

    // Fallback: If not translated and key contains parentheses (e.g. "Title (Sub)"), try main key
    if (!translatedTitle || translatedTitle === titleKey) {
        if (typeof titleKey === "string" && titleKey.includes(" (")) {
            const cleanKey = titleKey.split(" (")[0].trim();
            const cleanTranslated = i18next_translate(cleanKey);
            if (cleanTranslated && cleanTranslated !== cleanKey) {
                translatedTitle = cleanTranslated;
                activeI18nKey = cleanKey;
            }
        }
    }
    if (!translatedTitle || (translatedTitle === titleKey && typeof title === "object" && title !== null && title.text)) {
        translatedTitle = typeof title === "object" && title !== null ? (title.text || title.label || titleKey) : (title || "Summary Report");
    }

    let reportDom;
    if (templateMaster) {
        reportDom = templateMaster.content.cloneNode(true);
    } else {
        // Fallback DOM if template is missing
        const wrapper = document.createElement("div");
        wrapper.innerHTML = `
            <div class="report-a4-container" style="font-family: ${fontFamily}; color: ${colorText}; font-size: ${fsBody} !important; line-height: 1.3; padding: 5px 10px; box-sizing: border-box;">
                <div data-section="header"></div>
                <div data-section="params" style="background-color: ${colorBgParam}; border: 1px solid ${colorBorder}; border-radius: 4px; padding: 6px 12px; margin-bottom: 12px; font-size: ${fsParam} !important; display: flex; flex-wrap: wrap; gap: 10px 25px;">
                    <div data-field="date_range_wrap"><b><span data-i18n="Report Date Range">${i18next_translate("Report Date Range")}</span>:</b> <span data-field="date_range">-</span></div>
                    <div data-field="extra_params" style="display: flex; flex-wrap: wrap; gap: 10px 25px;"></div>
                </div>
                <div data-section="content"></div>
                <div data-section="footer"></div>
            </div>
        `;
        reportDom = wrapper.firstElementChild;
    }

    // Apply main styles
    const containerEl = reportDom.querySelector(".report-a4-container") || reportDom;
    if (containerEl && containerEl.style) {
        containerEl.style.fontFamily = fontFamily;
        containerEl.style.color = colorText;
    }

    // 1. Header
    const headerSection = reportDom.querySelector("[data-section='header']");
    if (headerSection) {
        headerSection.innerHTML =
            customHeaderHtml !== null
                ? customHeaderHtml
                : peper_header_owner({
                      title: translatedTitle,
                      titleI18n: activeI18nKey,
                      title_i18n: activeI18nKey,
                  });
    }

    // Ensure title element inside reportDom has proper text and data-i18n
    const reportTitleEl = reportDom.querySelector("[data-field='report_title']");
    if (reportTitleEl) {
        reportTitleEl.textContent = translatedTitle;
        if (activeI18nKey && typeof activeI18nKey === "string") {
            reportTitleEl.setAttribute("data-i18n", activeI18nKey);
        }
    }

    // 2. Parameters
    const dateRangeEl = reportDom.querySelector("[data-field='date_range']");
    if (dateRangeEl) dateRangeEl.textContent = dateRange;

    const extraParamsEl = reportDom.querySelector("[data-field='extra_params']");
    if (extraParamsEl) {
        if (Array.isArray(filterParams) && filterParams.length > 0) {
            extraParamsEl.innerHTML = filterParams
                .map((p) => {
                    const label = p.label || "";
                    const labelKey = p.i18n || p.labelI18n || p.label_i18n || label;
                    const translatedLabel = labelKey ? i18next_translate(labelKey) : label;
                    const i18nAttr = labelKey && typeof labelKey === "string" ? ` data-i18n="${labelKey}"` : "";
                    return `<div><b><span${i18nAttr}>${translatedLabel}</span>:</b> ${p.value}</div>`;
                })
                .join("");
        } else {
            extraParamsEl.innerHTML = "";
        }
    }

    // 3. Content Sections
    const contentSection = reportDom.querySelector("[data-section='content']");
    if (contentSection) {
        contentSection.innerHTML = ""; // Clear existing

        const buildTableEl = (sec) => {
            const tableSectionTpl = document.getElementById("template_report_table_section");
            let sectionDom;
            if (tableSectionTpl) {
                sectionDom = tableSectionTpl.content.cloneNode(true).firstElementChild;
            } else {
                sectionDom = document.createElement("div");
                sectionDom.className = "print-no-break report-table-section";
                sectionDom.style.marginBottom = tableGap;
                sectionDom.style.pageBreakInside = "avoid";
                sectionDom.style.breakInside = "avoid";
                sectionDom.innerHTML = `
                    <div data-field="section_title"></div>
                    <table style="width: 100%; border-collapse: collapse; font-size: ${fsTableBody} !important; border: 1px solid ${colorBorder};">
                        <thead data-field="table_head"></thead>
                        <tbody data-field="table_body"></tbody>
                        <tfoot data-field="table_foot"></tfoot>
                    </table>
                `;
            }

            sectionDom.style.marginBottom = sec.marginBottom || tableGap;

            const titleEl = sectionDom.querySelector("[data-field='section_title']");
            if (titleEl) {
                if (sec.title) {
                    const secTitleKey =
                        sec.titleI18n ||
                        sec.title_i18n ||
                        sec.i18n ||
                        (typeof sec.title === "object" && sec.title !== null ? sec.title.i18n || sec.title.key : null) ||
                        sec.title;
                    let secTranslated = secTitleKey ? i18next_translate(secTitleKey) : "";
                    let secActiveKey = secTitleKey;
                    if (!secTranslated || secTranslated === secTitleKey) {
                        if (typeof secTitleKey === "string" && secTitleKey.includes(" (")) {
                            const cleanSecKey = secTitleKey.split(" (")[0].trim();
                            const cleanSecTranslated = i18next_translate(cleanSecKey);
                            if (cleanSecTranslated && cleanSecTranslated !== cleanSecKey) {
                                secTranslated = cleanSecTranslated;
                                secActiveKey = cleanSecKey;
                            }
                        }
                    }
                    if (!secTranslated) {
                        secTranslated = typeof sec.title === "object" && sec.title !== null ? (sec.title.text || sec.title.label || secTitleKey) : sec.title;
                    }
                    titleEl.textContent = secTranslated;
                    if (secActiveKey && typeof secActiveKey === "string") {
                        titleEl.setAttribute("data-i18n", secActiveKey);
                    }
                    titleEl.style.fontWeight = "bold";
                    titleEl.style.marginBottom = "6px";
                    titleEl.style.fontSize = `${fsSectionTitle} !important`;
                    titleEl.style.color = colorPrimary;
                    titleEl.style.borderLeft = `3px solid ${colorPrimary}`;
                    titleEl.style.paddingLeft = "6px";
                } else {
                    titleEl.style.display = "none";
                }
            }

            const tableEl = sectionDom.querySelector("table");
            if (tableEl) {
                tableEl.style.border = `1px solid ${colorBorder}`;
                tableEl.style.fontSize = `${fsTableBody} !important`;
            }

            // Thead
            const thead = sectionDom.querySelector("[data-field='table_head']");
            if (thead && Array.isArray(sec.headers) && sec.headers.length > 0) {
                let thHtml = `<tr style="background-color: ${colorBgHeader}; border-bottom: 2px solid ${colorBorder}; color: ${colorText}; font-size: ${fsTableHead} !important; height: 24px;">`;
                sec.headers.forEach((h) => {
                    const align = h.align || "left";
                    const widthStyle = h.width ? `width: ${h.width};` : "";
                    const label = h.label || "";
                    const translated = h.i18n ? i18next_translate(h.i18n) : i18next_translate(label);
                    const i18nAttr = h.i18n ? `data-i18n="${h.i18n}"` : (label ? `data-i18n="${label}"` : "");
                    thHtml += `<th ${i18nAttr} style="padding: ${cellPadding}; text-align: ${align}; font-weight: bold; border: 1px solid ${colorBorder}; ${widthStyle}">${translated}</th>`;
                });
                thHtml += `</tr>`;
                thead.innerHTML = thHtml;
            }

            // Tbody
            const tbody = sectionDom.querySelector("[data-field='table_body']");
            if (tbody) {
                if (!Array.isArray(sec.rows) || sec.rows.length === 0) {
                    const colSpan = sec.headers?.length || 1;
                    const emptyMsg = i18next_translate(sec.emptyText || "No transaction data available for this time range");
                    tbody.innerHTML = `
                        <tr style="height: 22px;">
                            <td colspan="${colSpan}" style="padding: ${cellPadding}; text-align: center; border: 1px solid ${colorBorder}; color: ${colorTextLight};">${emptyMsg}</td>
                        </tr>
                    `;
                } else {
                    let rowsHtml = "";
                    sec.rows.forEach((row) => {
                        const rowBg = row.bg ? `background-color: ${row.bg};` : "";
                        const rowFontWeight = row.bold ? "font-weight: bold;" : "";
                        const rowBorderTop = row.borderTop ? `border-top: ${row.borderTop};` : "";
                        const rowColor = row.color ? `color: ${row.color};` : "";
                        const cells = Array.isArray(row) ? row : row.cells || [];

                        rowsHtml += `<tr style="border-bottom: 1px solid ${colorBorder}; height: 22px; ${rowBg} ${rowFontWeight} ${rowBorderTop} ${rowColor}">`;
                        cells.forEach((cell, idx) => {
                            const header = sec.headers?.[idx] || {};
                            const align = (typeof cell === "object" && cell !== null && cell.align) || header.align || "left";
                            const cellVal = typeof cell === "object" && cell !== null && "text" in cell ? cell.text : cell;
                            const cellBold = typeof cell === "object" && cell !== null && cell.bold ? "font-weight: bold;" : "";
                            const cellColor = typeof cell === "object" && cell !== null && cell.color ? `color: ${cell.color};` : "";
                            const cellColspan = typeof cell === "object" && cell !== null && cell.colspan ? `colspan="${cell.colspan}"` : "";

                            rowsHtml += `<td ${cellColspan} style="padding: ${cellPadding}; text-align: ${align}; border: 1px solid ${colorBorder}; ${cellBold} ${cellColor}">${cellVal}</td>`;
                        });
                        rowsHtml += `</tr>`;
                    });
                    tbody.innerHTML = rowsHtml;
                }
            }

            // Tfoot
            const tfoot = sectionDom.querySelector("[data-field='table_foot']");
            if (tfoot) {
                if (Array.isArray(sec.footers) && sec.footers.length > 0) {
                    let ftHtml = `<tr style="background-color: ${colorBgAlt}; font-weight: bold; border-top: 2px solid ${colorBorder}; height: 22px;">`;
                    sec.footers.forEach((footCell, idx) => {
                        const header = sec.headers?.[idx] || {};
                        const align = (typeof footCell === "object" && footCell !== null && footCell.align) || header.align || "left";
                        let cellVal = typeof footCell === "object" && footCell !== null && "text" in footCell ? footCell.text : footCell;
                        if (typeof cellVal === "string" && (cellVal.endsWith(":") || isNaN(cellVal))) {
                            cellVal = i18next_translate(cellVal);
                        }
                        const cellColor = typeof footCell === "object" && footCell !== null && footCell.color ? `color: ${footCell.color};` : `color: ${colorPrimary};`;
                        const cellColspan = typeof footCell === "object" && footCell !== null && footCell.colspan ? `colspan="${footCell.colspan}"` : "";

                        ftHtml += `<td ${cellColspan} style="padding: ${cellPadding}; text-align: ${align}; border: 1px solid ${colorBorder}; ${cellColor}">${cellVal}</td>`;
                    });
                    ftHtml += `</tr>`;
                    tfoot.innerHTML = ftHtml;
                } else {
                    tfoot.innerHTML = "";
                }
            }

            return sectionDom;
        };

        sections.forEach((sec) => {
            if (sec.type === "grid-2" || sec.type === "columns") {
                const gridWrapper = document.createElement("div");
                gridWrapper.className = "print-no-break flex";
                gridWrapper.style.display = "flex";
                gridWrapper.style.gap = sec.gap || "15px";
                gridWrapper.style.marginBottom = sec.marginBottom || tableGap;
                gridWrapper.style.pageBreakInside = "avoid";
                gridWrapper.style.breakInside = "avoid";

                (sec.columns || []).forEach((colSec) => {
                    const colDom = buildTableEl(colSec);
                    colDom.style.flex = colSec.flex || "1";
                    colDom.style.marginBottom = "0";
                    gridWrapper.appendChild(colDom);
                });
                contentSection.appendChild(gridWrapper);
            } else if (sec.type === "custom" && sec.html) {
                const customDiv = document.createElement("div");
                customDiv.innerHTML = sec.html;
                contentSection.appendChild(customDiv);
            } else {
                contentSection.appendChild(buildTableEl(sec));
            }
        });
    }

    // 4. Footer
    const footerSection = reportDom.querySelector("[data-section='footer']");
    if (footerSection) {
        footerSection.innerHTML = customFooterHtml !== null ? customFooterHtml : peper_footer_owner();
    }

    // 5. Automatic i18n Translation on generated Report DOM
    if (typeof updateContent === "function") {
        updateContent(reportDom);
    }

    // 6. Render to Print Area
    printArea.innerHTML = "";
    printArea.appendChild(reportDom);

    // 7. Show Modal if specified
    if (modalId) {
        const modal = document.getElementById(modalId);
        if (modal && typeof modal.showModal === "function") {
            modal.showModal();
        }
    }
}

export async function printSlip() {
    if (await deviceAppService.getStatus()) {
        const _reply = await deviceAppService.printImage(vmsSlipRegistor);
        if (_reply) {
            showToastNotification({ icon: "info", msg: "Successful" + `${_reply.ststus}` });
        } else {
            showToastNotification({ icon: "error", msg: "printSlip Error" });
        }
    } else {
        // showToastNotification({ icon: "warning", msg: "deviceAppService not Connect" });
        printJS({
            printable: document.getElementById(vmsSlipRegistor).src,
            type: "image",
            header: "", // Optional
            showModal: true, // Optional
            modalMessage: "Printing...", // Optional
            style: "img { max-width: 800px;}", // Optional
        });
    }
}

window.setInputLicenseIdRequired = setInputLicenseIdRequired;
/**
 * Set Input License ID Required
 * @param {boolean} required - Set to true if the License ID input is required
 */
function setInputLicenseIdRequired(required) {
    localStorage.setItem("INPUT_LICENSE_REQUIRED", required);
}

window.setPrintSlipInRequired = setPrintSlipInRequired;
/**
 * Set Print Slip In Required
 * @param {boolean} required - Set to true if the slip in print is required
 */
function setPrintSlipInRequired(required) {
    localStorage.setItem("PRINT_SLIP_IN_REQUIRED", required);
}

window.setPrintSlipOutRequired = setPrintSlipOutRequired;
/**
 * Set whether printing the slip out is required.
 * @param {boolean} printRequired - Set to true if the slip out printing is required, false otherwise.
 */

function setPrintSlipOutRequired(printRequired) {
    localStorage.setItem("PRINT_SLIP_OUT_REQUIRED", printRequired);
}

export function isBase64Image(src) {
    // Regular expression to check if the src matches a base64 image pattern
    const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;

    return base64Regex.test(src);
}

window.saveToLocalStorage = saveToLocalStorage;
/**
 * Saves a key-value pair to local storage.
 * @param {string} key - The key under which the value will be stored.
 * @param {string} value - The value to be stored.
 */

function saveToLocalStorage(key, value) {
    localStorage.setItem(key, value);
    debug(`✅ Saved ${key} to local storage: ${value}`);
}

// LOGIN_USER Setting

export async function login(_user, _password, _remember_check, _app_mode) {
    const TOKEN_EXP = 86400 * 30;
    debug("Login :" + _user + "@" + _password + ":" + String(_remember_check));

    const params_oauth = new URLSearchParams();
    params_oauth.append("username", _user);
    params_oauth.append("password", _password);

    const response = await fetch("oauth", {
        method: "POST",
        body: params_oauth,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });
    const responseData = await response.json();
    debug(responseData);
    if (responseData.access_token != null) {
        const token = `${responseData.token_type} ${responseData.access_token}`;
        logger.debug(_remember_check);
        if (!_remember_check) {
            setCookie("Authorization", token, TOKEN_EXP);
            debug("Remember user :" + TOKEN_EXP);
        } else {
            setCookie("Authorization", token, 2147483647);
            debug("Remember user : Not expire");
            showToastNotification({ icon: "success", msg: "Login Success Authorization Not Expire." });
            await delay(1000);
        }
        setCookie("app_mode", _app_mode, TOKEN_EXP);
        debug(getCookie("Authorization"));
        // await get_user_session();
        window.location.reload();
        // window.location.href = HOME_ROUTE
    } else {
        debug(responseData);
        showDialogError({ title: "Error", msg: String(responseData.detail) });
    }
}

async function loginUserSetting() {
    if (typeof ACCESS_TOKEN !== "undefined" && ACCESS_TOKEN) {
        debug("Login user setting : " + ACCESS_TOKEN);
        setCookie("Authorization", `bearer ${ACCESS_TOKEN}`, 0);
    }
    const result = await fetchApi("/api/systems_user/me", "get", null, "json");
    if (result.status === 401) {
        logger.warn("⛔ Unauthorized");
        // showDialogError({ title: "Login Failed", msg: "Unauthorized" });
        return;
    }
    if (result.success) {
        const { system_user_type_id, name, id } = result.data;
        LOGIN_USER.system_type = system_user_type_id;
        LOGIN_USER.name = name;
        LOGIN_USER.id = id;
    }
}

async function update_me_profile() {
    console.log("update_me_profile");
    const name = profile_edit_modal.querySelector('[data-field="name"]').value;
    const old_password = profile_edit_modal.querySelector('[data-field="old_password"]').value;
    const new_password = profile_edit_modal.querySelector('[data-field="new_password"]').value;
    const new_password_confirm = profile_edit_modal.querySelector('[data-field="new_password_confirm"]').value;

    const image_upload = profile_edit_modal.querySelector('[data-field="image_upload"]').files[0];
    const formData = new FormData();
    formData.append("name", name);
    let is_update_password = false;
    if (old_password || new_password || new_password_confirm) {
        if (old_password && new_password && new_password_confirm) {
            if (new_password !== new_password_confirm) {
                showDialogWarning({ title: "Error", msg: "Password Change: Passwords do not match" });
                return;
            }
            if (new_password.length < 8) {
                showDialogWarning({ title: "Error", msg: "Password Change: Password must be at least 8 characters" });
                return;
            }
            formData.append("old_password", old_password);
            formData.append("new_password", new_password);
            formData.append("new_password_confirm", new_password_confirm);
            is_update_password = true;
        } else {
            showDialogWarning({ title: "Error", msg: "Password Change: Please enter all required fields" });
            return;
        }
    }

    if (image_upload) {
        formData.append("image_upload", image_upload);
    }
    debugForm(formData);
    const result = await fetchApi("/api/systems_user/me", "put", formData, "json");
    if (result.success) {
        profile_edit_modal.close();
        showDialogSuccess({ title: "Operation Completed", msg: result.msg });
        if (is_update_password) {
            await delay(1000);
            await logout();
        }
    } else {
        showDialogError({ title: "Error", msg: result.msg });
        console.log(result);
    }
}

window.open_dialog_me_edit = open_dialog_me_edit;
async function open_dialog_me_edit() {
    profile_modal.close();
    profile_edit_modal.querySelector('[data-field="name"]').value = "";
    profile_edit_modal.querySelector('[data-field="username"]').value = "";
    profile_edit_modal.querySelector('[data-field="pictureUrl"]').src = "";
    const result = await fetchApi("/api/systems_user/me", "get", null, "json");
    if (result.success) {
        console.log(result.data);
        profile_edit_modal.querySelector('[data-field="name"]').value = result.data.name;
        profile_edit_modal.querySelector('[data-field="username"]').value = result.data.username;
        profile_edit_modal.querySelector('[data-field="pictureUrl"]').src = result.data.pictureUrl;

        profile_edit_modal.querySelector('[data-field="btn_submit"]').onclick = async function () {
            await update_me_profile();
        };
        profile_edit_modal.showModal();
    }
}

async function registerPush(registration) {
    const { success, data } = await fetchApi(
        "/api/service_worker/subscribe/applicationServerKey",
        "post",
        null,
        "json",
    );
    if (!success) {
        logger.error(data);
        return;
    }
    const APPLICATION_SERVER_KEY = data;
    logger.info("📌 applicationServerKey: " + APPLICATION_SERVER_KEY);

    function urlBase64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = atob(base64);
        return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
    }

    // if (localStorage.getItem("pushSubscribed") === "true") {
    //     logger.info("📌 Already subscribed.");
    //     return;
    // }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        console.warn("❌ Notification permission not granted.");
        return;
    }

    // const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
        logger.info("📌 Already subscribed.");
        logger.debug("Subscription:", subscription);
        // await existingSub.unsubscribe();
        // localStorage.removeItem("pushSubscribed");
    } else {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(APPLICATION_SERVER_KEY),
        });
        logger.debug("Subscription:", subscription);
    }

    const response = await fetchApi("/api/service_worker/subscribe", "POST", JSON.stringify(subscription), "json");

    logger.debug("✅ Push subscription status :", response.msg);
    localStorage.setItem("pushSubscribed", "true");
}

export async function regisServiceWorker() {
    // sessionStorage.clear();
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker
            .register(`/static/js/service_worker.js?v=${new Date().getTime()}`)
            .then(async (reg) => {
                await registerPush(reg); // Register push notifications
                sessionStorage.setItem("sw_registered", "true"); // Track registration state
                logger.info("✅ Service Worker registered successfully");
            })
            .catch(async (err) => {
                logger.error("❌ Service Worker registration failed", err);
                // Reset registered service workers
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                    console.warn("🧹 Service Worker was reset");
                }
            });
    }
}

async function initializeUnity() {
    logger.warn("Develop Mode : " + isDev);
    logger.info("Initializing ..");
    await loginUserSetting();
    logger.info("loginUserSetting", LOGIN_USER);
    const ul_menu = document.getElementById("ul_menu");
    if (ul_menu) {
        let _a_menus = ul_menu.getElementsByTagName("a");
        const _herf = window.location.href;
        for (let _a of _a_menus) {
            if (_herf == _a.href) {
                _a.classList.add("text-primary");
                // _a.classList.add("bg-base-100");
                _a.classList.add("ml-4");
                _a.href = "#";
                const parentElement = _a.parentElement.parentElement.parentElement;
                if (parentElement.nodeName === "DETAILS") {
                    // debug(parentElement.nodeName);
                    parentElement.open = true;
                }
            }
        }
    }
    if (document.getElementById("sound_control_switch")) {
        if (controlSound) {
            document.getElementById("sound_control_switch").checked = true;
        }
    }
    const message_dropdown_content = document.getElementById("message_dropdown_content");
    if (message_dropdown_content) {
        message_dropdown_content.addEventListener("transitionend", (event) => {
            if (window.getComputedStyle(message_dropdown_content).visibility === "hidden") {
                message_dropdown_content.innerHTML = "";
            }
        });
    }
}

// ? For System Test
let test_lpr_system_test_debug_dialog;
window.open_test_lpr_camera_dialog = open_test_lpr_camera_dialog;
function open_test_lpr_camera_dialog() {
    const params = `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=500,height=800`;
    test_lpr_system_test_debug_dialog = window.open("/test_lpr_camera", "open_test_lpr_camera_dialog", params);
}

let test_payment_service_dialog;
window.open_payment_service = open_payment_service;
function open_payment_service() {
    const params = `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=480,height=800`;
    test_payment_service_dialog = window.open("/payment_service", "test_payment_service_dialog", params);
}

let member_info_dialog;
window.open_member_info_dialog = open_member_info_dialog;
function open_member_info_dialog() {
    const params = `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=480,height=800`;
    member_info_dialog = window.open("/member_info", "member_info_dialog", params);
}

let test_reader_debug;
window.open_test_reader_dialog = open_test_reader_dialog;

function open_test_reader_dialog() {
    const params = `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=480,height=800`;
    test_reader_debug = window.open("/test_reader_debug_dialog", "test_reader_debug", params);
}

let test_reader_access_debug;
window.open_test_reader_access_dialog = open_test_reader_access_dialog;

function open_test_reader_access_dialog() {
    const params = `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=480,height=800`;
    test_reader_access_debug = window.open("/test_reader_access_debug_dialog", "test_reader_access_debug", params);
}

let transaction_edit_dialog;
window.open_transaction_edit_dialog = open_transaction_edit_dialog;
function open_transaction_edit_dialog() {
    const params = `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=480,height=800`;
    transaction_edit_dialog = window.open("/transaction_edit_tool", "transaction_edit_dialog", params);
}

// ? *** Map To content Helper

export function jsonToQuery(obj, prefix) {
    const str = [];

    for (const p in obj) {
        if (!obj.hasOwnProperty(p)) continue;

        const key = prefix ? `${prefix}[${p}]` : p;
        const value = obj[p];

        if (value !== null && typeof value === "object") {
            str.push(jsonToQuery(value, key));
        } else {
            str.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
        }
    }

    return str.join("&");
}

function getNestedValue(obj, path) {
    return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}
export function data2select_ids(ids, checkboxs) {
    // console.log("data2select_ids:", ids, checkboxs);
    if (ids === null) ids = [];
    checkboxs.forEach((cb) => {
        if (ids.includes(cb.value)) {
            cb.checked = true;
        } else {
            cb.checked = false;
        }
    });
}

export function select_ids2string(checkboxs) {
    const ids = Array.from(checkboxs)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value)
        .filter((v) => v !== "" && v !== null)
        .filter((v, i, arr) => arr.indexOf(v) === i); // unique

    return ids.join(",");
}

export function isISODateTime(str) {
    return /^\d{4}-\d{2}-\d{2}T/.test(str) && !isNaN(Date.parse(str));
}
export function data2fields(data, container) {
    try {
        // console.log("data2fields:", data);
        const fields = container.querySelectorAll("[data-field]");
        fields.forEach((field) => {
            if (field.dataset.ignore) {
                console.debug("DEBUG : ", "Skip", field.field_name);
                return;
            }
            const field_name = field.dataset.field;
            if (["action_container"].includes(field_name)) {
                console.debug("DEBUG : ", "Skip", field_name);
                return;
            }
            // console.log("data2fields field_name:", field_name);

            clearValidationError(field);
            // console.log("field.tagName", field.tagName);
            // 📌 BUTTON //
            // if (["DIV"].includes(field.tagName)) return;
            if (["button", "submit", "reset"].includes(field.type)) return;

            // File
            if (field.type === "file") {
                field.value = null;
                return;
            }

            let value = getNestedValue(data, field_name);
            if (value === undefined || value === null) {
                if (field.dataset.default) {
                    value = field.dataset.default;
                } else {
                    console.warn("data2fields value is undefined:", field.tagName, field_name);
                    value = "";
                }
            }
            if (value !== "") {
                if (isISODateTime(value)) {
                    // console.log("⏱ Parsed datetime:", value);
                    if (field.tagName === "INPUT") {
                        value = isoToDatetimeLocal(value);
                    } else {
                        value = dateTimeToStr(value, "DD/MM/YYYY HH:mm");
                    }
                }
            }
            // console.log("data2fields:", field.tagName, field_name, value);

            if (field.matches("div, p, span, td, h1, h2, h3, h4, h5, h6")) {
                field.textContent = value;
                return;
            }

            // Image element — set src
            if (field.tagName === "IMG") {
                field.src = value || "/static/image/no_image.png";
                return;
            }

            // ☑ CHECKBOX
            if (field.type === "checkbox") {
                field.checked = value == "1" || value === true;
                return;
            }

            // 🔘 RADIO
            if (field.type === "radio") {
                field.checked = field.value == value;
                return;
            }

            // 📌 SELECT
            if (field.tagName === "SELECT") {
                // console.log("📌 SELECT", field_name, value);

                // Check if select allows multiple values
                const isMultiple = field.multiple;

                if (isMultiple) {
                    // Multiple select value handler
                    const values = Array.isArray(value) ? value.map(String) : String(value).split(","); // Handle array or comma-separated string
                    console.log("📌 SELECT multiple", field_name, values);
                    // Assign values iteratively
                    [...field.options].forEach((opt) => {
                        opt.selected = values.includes(opt.value);
                    });

                    $(field).val(values).trigger("change");
                } else {
                    // ==== Single SELECT ====
                    // console.log("📌 SELECT single", field_name, value);
                    if (value === true) value = "true";
                    if (value === false) value = "false";
                    field.value = value || 0;

                    $(field).val(value).trigger("change");
                }
                return;
            }

            // 📝 INPUT
            if (field.tagName === "INPUT") {
                if (field.type === "password") {
                    // Do not prefill password field
                    field.value = "";

                    // Show placeholder if existing value present
                    if (value) {
                        field.placeholder = "••••••••";
                    }

                    return;
                }

                if (field.classList.contains("flatpickr-input")) {
                    // console.log("📝 INPUT flatpickr", field_name, value);
                    if (value.includes(",")) {
                        value = value.split(",");
                    }
                    field._flatpickr.setDate(value, true);
                } else {
                    field.value = value;
                }
                return;
            }

            // Textarea default handler
            field.value = value;
        });
    } catch (error) {
        console.error(error);
        console.error("data2fields,data : container:", data, container);
    }
}

export function update_data2fields(data, container) {
    console.log("update_data2fields:", data);
    for (const [key, value] of Object.entries(data)) {
        const field = container.querySelector(`[data-field="${key}"]`);
        if (field) {
            console.log("update_data2fields field:", key, value);
            // Update data2fields attributes
            if (
                field.tagName === "DIV" ||
                field.tagName === "P" ||
                field.tagName === "SPAN" ||
                field.tagName === "TD"
            ) {
                field.textContent = value;
                continue;
            }

            // Image element — set src
            if (field.tagName === "IMG") {
                field.src = value || "/static/image/no_image.png";
                continue;
            }

            // ☑ CHECKBOX
            if (field.type === "checkbox") {
                field.checked = value == "1" || value === true;
                continue;
            }

            // 🔘 RADIO
            if (field.type === "radio") {
                field.checked = field.value == value;
                continue;
            }

            // 📌 SELECT
            if (field.tagName === "SELECT") {
                field.value = value || 0;
                $(field).val(value).trigger("change");
                continue;
            }

            // 📝 INPUT
            if (field.tagName === "INPUT") {
                field.value = value;
                continue;
            }

            // Textarea default handler
            field.value = value;
        } else {
            console.warn("update_data2fields: field not found:", key);
        }
    }
}

export function fields2data(container) {
    const fields = container.querySelectorAll("[data-field]");
    const data = {};
    fields.forEach((field) => {
        const field_name = field.dataset.field;
        if (["action_container"].includes(field_name)) {
            console.debug("DEBUG : ", "Skip", field_name);
            return;
        }
        let value = "";
        switch (field.tagName) {
            case "INPUT":
                value = field.value;
                break;
            case "SELECT":
                value = field.value;
                break;
            case "TEXTAREA":
                value = field.value;
                break;
            case "DIV":
                value = field.textContent;
                break;
            case "P":
                value = field.textContent;
                break;
            case "SPAN":
                value = field.textContent;
                break;
            case "TD":
                value = field.textContent;
                break;
            default:
                break;
        }
        if (value) data[field_name] = value;
    });
    return data;
}

export function enableAutoValidation(container) {
    const fields = container.querySelectorAll("[data-validate]");

    fields.forEach((field) => {
        field.addEventListener("input", () => validateField(field));
        field.addEventListener("blur", () => validateField(field));
    });
}

const PATTERN_TYPES = {
    name: /^[A-Za-z\u0E00-\u0E7F0-9\s\-()._\/]{3,100}$/,
    thai_name: /^[ก-๙\s]{2,100}$/, // Thai name regex
    eng_name: /^[A-Za-z\s]{2,100}$/, // English name regex
    code: /^[A-Za-z0-9\-_]{2,50}$/, // Code / ID regex
    phone: /^[0-9]{9,10}$/, // Phone number regex
    taxid: /^[0-9]{13}$/, // 13-Digit Tax ID regex
    domain: /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, // domain.com
};
function getFieldValue(field) {
    // Handle Select2 jQuery value binding
    if ($(field).hasClass("select2-hidden-accessible")) {
        const v = $(field).val();
        console.log("select2", v, field.value);
        return Array.isArray(v) ? v.join(",") : (v ?? "").toString();
    }
    return field.value ?? "";
}
function validateField(field) {
    // Execute new handler
    const rawValue = getFieldValue(field);
    const value = rawValue.trim();

    const rules = field.dataset.validate.split("|");
    let errorMsg = "";

    for (const rule of rules) {
        if (rule === "required" && value === "") {
            errorMsg = "This field is required";
            break;
        }

        if (rule.startsWith("min:")) {
            const min = parseInt(rule.split(":")[1]);
            if (value.length < min) {
                errorMsg = `Must be at least ${min} characters`;
                break;
            }
        }

        if (rule.startsWith("max:")) {
            const max = parseInt(rule.split(":")[1]);
            if (value.length > max) {
                errorMsg = `Must not exceed ${max} characters`;
                break;
            }
        }

        if (rule.startsWith("pattern:type=")) {
            const typeName = rule.split("=")[1];
            const regex = PATTERN_TYPES[typeName];
            if (regex && !regex.test(value)) {
                errorMsg = `Invalid format (Expected: ${typeName})`;
                break;
            }
        }

        if (rule === "email") {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!re.test(value)) {
                errorMsg = "Invalid email format";
                break;
            }
        }

        if (rule === "number") {
            if (isNaN(value)) {
                errorMsg = "Must be a valid numeric value";
                break;
            }
        }
    }

    if (errorMsg) {
        showValidationError(field, errorMsg);
        return false;
    }

    return true;
}

function showValidationError(field, msg) {
    let hint = field.parentElement.querySelector(".validation-msg");

    if (!hint) {
        hint = document.createElement("p");
        hint.className = "validation-msg text-error text-xs mt-1";
        field.parentElement.appendChild(hint);
    }

    if (msg) {
        hint.textContent = msg;
    } else {
        hint.textContent = "";
    }
}

function clearValidationError(field) {
    // console.log("clearValidationError", field);
    const hint = field.parentElement.querySelector(".validation-msg");
    if (hint) hint.textContent = "";
}

function validateBeforeSubmit(container) {
    // console.log("validateBeforeSubmit");
    const fields = container.querySelectorAll("[data-validate]");
    let valid = true;

    fields.forEach((field) => {
        clearValidationError(field);
        const _valid = validateField(field);
        if (!_valid) valid = false;
        // console.log("validateField", field.dataset.field, _valid);
    });

    return valid;
}

export function fields2formData(container) {
    if (!validateBeforeSubmit(container)) {
        showDialogWarning({ title: "Validation Error", msg: "Please fill in all required fields accurately" });
        return;
    }
    const fields = container.querySelectorAll("[data-field]");
    const formData = new FormData();

    fields.forEach((field) => {
        let field_name = field.dataset.field;
        if (!field_name) return;

        if (field_name.split(".").length > 1) {
            field_name = field_name.split(".")[1]; // Support nested field e.g. user.name -> name
        }
        const tag = field.tagName.toUpperCase();
        const type = (field.type || "").toLowerCase();

        // Exclude button elements from FormData
        if (["button", "submit", "reset"].includes(type)) {
            return;
        }

        // Skip image elements
        if (tag === "IMG") return;

        // 📦 FILE
        if (type === "file") {
            const file = field.files?.[0];
            if (file) {
                formData.append(field_name, file);
            }
            return;
        }

        // ☑ CHECKBOX
        if (type === "checkbox") {
            formData.append(field_name, field.checked ? "1" : "0");
            return;
        }

        // 🔘 RADIO
        if (type === "radio") {
            if (field.checked) {
                formData.append(field_name, field.value);
            }
            return;
        }

        // Handle SELECT (including multiple)
        if (tag === "SELECT") {
            if (field.multiple) {
                // MULTI SELECT
                const selected = [...field.selectedOptions].map((o) => o.value);
                selected.forEach((val) => formData.append(field_name, val));
                return;
            }

            // SINGLE SELECT
            let value = field.value;

            // Set default 0 for foreign key *_id fields
            if (field_name.endsWith("_id")) {
                value = parseInt(value) || 0;
            } else {
                // Fallback empty string for other fields
                value = value ?? "";
            }

            formData.append(field_name, value);
            return;
        }

        if (tag === "INPUT") {
            if (field.classList.contains("flatpickr-input")) {
                // console.log("📌 INPUT flatpickr datetime", field_name, field.value);
                const value = field.value.includes(",") ? field.value : isoToDatetimeLocal(field.value);
                formData.append(field_name, value ?? "");
            } else {
                formData.append(field_name, field.value ?? "");
            }
            return;
        }
        // 📝 INPUT / TEXTAREA
        formData.append(field_name, field.value ?? "");
    });

    return formData;
}

export function clear_fields(container) {
    const fields = container.querySelectorAll("[data-field]");

    fields.forEach((el) => {
        clearValidationError(el);
        const default_value = el.dataset.default || "";

        // console.log("clear_fields", el.dataset.field, default_value);

        const tag = el.tagName;

        // Skip button elements
        if (
            el.type === "button" ||
            el.type === "submit" ||
            el.type === "reset" ||
            el.type === "file" ||
            el.type === "fieldset"
        ) {
            return;
        }

        // Checkbox → uncheck
        if (el.type === "checkbox") {
            el.checked = false;
            return;
        }

        // Reset image preview
        if (tag === "IMG") {
            el.src = "";
            return;
        }

        // Reset SELECT and Select2 elements
        if (tag === "SELECT") {
            // 1) Reset DOM value
            el.value = default_value;

            // 2) Reset Select2 UI value
            if ($(el).hasClass("select2-hidden-accessible")) {
                $(el).val(null).trigger("change"); // Reset Select2 selection
            }

            // 3) Multiple select (DOM)
            if (el.multiple) {
                [...el.options].forEach((opt) => (opt.selected = false));
            }

            return;
        }

        // INPUT / TEXTAREA → reset value
        if (tag === "INPUT" || tag === "TEXTAREA") {
            el.value = default_value;
            return;
        }

        // Reset remaining element textContent
        el.textContent = default_value;
    });
}

export async function init_select_option(container, server_endpoint, data_field, field_text = "name") {
    const select_field = container.querySelector(`[data-field="${data_field}"]`);
    const respond = await fetchApi(server_endpoint, "get", null, "json");
    if (respond.success) {
        const data = respond.data;
        for (const l of data) {
            const createOption = () => {
                const opt = document.createElement("option");
                opt.value = l.id;
                opt.text = l[field_text];
                return opt;
            };
            select_field.add(createOption());
        }
    }
}

export async function init_selects_option(selects, server_endpoint, data_column = "name") {
    const respond = await fetchApi(server_endpoint, "get", null, "json");

    if (!respond) {
        console.log(respond);
        console.warn("⚠ Data not found or invalid structure:", server_endpoint);
        return;
    }
    if (!Array.isArray(respond.data)) {
        return;
    }

    const data = respond.data;
    // console.log(data);

    // Clear existing options
    selects.forEach((select) => {
        // select.innerHTML = "";
        // Append default empty option
        // select.add(new Option("-- Select --", ""));
    });

    // Populate select options
    for (const row of data) {
        const opt = new Option(row[data_column], row.id);
        selects.forEach((select) => select.add(opt.cloneNode(true)));
    }
    if (data.length == 0) {
        console.warn("⚠ Option data not found:", server_endpoint);
    }
}

export async function init_datalist(id, server_endpoint, col = "name") {
    const dl = document.querySelector(`datalist[id="${id}"]`);
    const list = [];
    if (dl) {
        dl.innerHTML = "";
    } else {
        console.warn("⚠ Datalist not found:", id);
    }
    const respond = await fetchApi(server_endpoint, "get", null, "json");
    if (respond.success) {
        const data = respond.data;
        data.forEach((l) => {
            if (dl) dl.insertAdjacentHTML("beforeend", `<option value="${l[col]}"></option>`);
            list.push({ id: l.id, value: l[col] });
        });
    }
    return list;
}

// ***? DataTable *******************

// Unified button layout configuration
export const exportLayout = {
    get org() {
        return (typeof owner_info !== "undefined" && owner_info?.name) || "Smart Parking System";
    },
    get logo() {
        return (typeof owner_info !== "undefined" && owner_info?.logo) || "/static/favicon.svg";
    },
    get address() {
        const addr = (typeof owner_info !== "undefined" && owner_info?.address) || "";
        return addr ? addr.split("\n").join("<br>") : "-";
    },
    title: "Summary Report",
    footerSign: true,
    get printDate() {
        return dayjs().format("DD/MM/YYYY");
    },

    get htmlHeader() {
        return `
        <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: Kanit;
        margin-bottom: 10px;
        ">
        <!-- Logo -->
        <div style="flex: 0 0 auto;">
            <img src="${this.logo}"
                style="height:60px; width:60px; object-fit:cover; border-radius:50%; border:2px solid #ddd; box-shadow:0 0 3px rgba(0,0,0,0.2);" />
        </div>

        <!-- Report Header -->
        <div style="flex: 1 1 auto; text-align: right;">
            <strong style="font-size: 1.2rem;">${this.org}</strong><br>
            <span style="font-size: 1rem;">${this.address}</span><br>
            <small>Print Date: ${this.printDate}</small>
        </div>
        </div>
    `;
    },
    get htmlFooter() {
        return this.footerSign
            ? `
        <div style="font-family:Kanit; margin-top:30px;">
          <hr style="border:0;border-top:1px dashed #999;">
          <p>Prepared By: ________________________________</p>
          <p>Verified By: ________________________________</p>
          <p>Date Created: ${this.printDate}</p>
        </div>
      `
            : "";
    },
};

export const lengthMenu = [
    [10, 25, 50, 100, 500, 1000, 2500, 5000],
    [10, 25, 50, 100, 500, "1K", "2.5K", "5K"],
];
function set_table_i18n_language() {
    const language = {
        infoEmpty: `<div class="badge badge-error gap-2 badge-soft">No records found</div>`,
        info: `<div class="text-sm flex flex-col items-center"><div><span>Showing</span> _START_ - _END_ </div> <div> <span>Total</span> _TOTAL_ <span>Record</span></div></div>`,
        infoFiltered: "<br>(data _MAX_ row)",
        search: `<div class="badge badge-info badge-soft gap-2"><i class="fa-solid fa-magnifying-glass"></i><span>Search</span>:</div>`,
        processing:
            '<div class="badge badge-primary badge-soft badge-lg text-nowrap">Loading data, please wait...</div>',
    };
    // logger.debug("language", language);
    return language;
}

function DataTableSetDefaultsScroller() {
    logger.debug("DataTableSetDefaults");
    if (typeof DataTable === "undefined") {
        logger.warn("DataTable is not defined. Skipping DataTableSetDefaults.");
        return;
    }
    const language = set_table_i18n_language();

    Object.assign(DataTable.defaults, {
        dom: '<"top"Bif>rt<"bottom"pl><"clear">',
        // dom: '<"top"Bif>rt<"bottom"><"clear">',
        colReorder: true,
        deferRender: true,
        destroy: true,
        autoWidth: false,
        processing: true,
        serverSide: true,

        // 2. Configure scrolling behavior
        scrollY: "30vh",
        scrollX: true,
        scrollCollapse: true,
        scroller: true,
        scroller: {
            rowHeight: 60,
            // displayBuffer: 20,
        },

        // 3. Optimize repaint during sorting for smooth rendering
        orderClasses: false,

        // State Saving
        stateSave: true,
        stateDuration: -1, // Retain state until browser/tab is closed

        fixedColumns: false,
        language: language,
        lengthMenu: lengthMenu,
        // pageLength: savedPageLength,

        // 4. Disable column search appropriately
        columnDefs: [
            {
                targets: "_all",
                searchable: false,
            },
        ],

        drawCallback: function (settings) {
            setTimeout(() => {
                updateContent();
            }, 100);
        },
        initComplete: function () {
            const api = this.api();
            const table = $(api.table().node());
            const thead = api.table().header();

            const strip = (v) => {
                const d = document.createElement("div");
                d.innerHTML = String(v ?? "");
                return d.textContent.trim();
            };

            // Populate options from column data when data-auto="1" is specified
            function fillFromColumn(column, sel) {
                const vals = column.cache("search").toArray().map(strip).filter(Boolean);
                const uniq = [...new Set(vals)].sort();
                const prev = sel.value || "";
                sel.length = 0;
                sel.add(new Option("all", ""));
                uniq.forEach((v) => sel.add(new Option(v, v)));
                if (uniq.includes(prev)) sel.value = prev;
            }

            if (thead) {
                thead.querySelectorAll("select.table-select-column").forEach((sel) => {
                    // Prevent column sorting when clicking filter select dropdown
                    sel.addEventListener("click", (e) => e.stopPropagation());

                    // Identify target column from parent th element
                    const th = sel.closest("th");
                    const column = api.column(th); // DataTables directly accepts th node

                    // Auto fill from table data if requested
                    if (sel.dataset.auto === "1" && sel.options.length <= 1) {
                        fillFromColumn(column, sel);
                        // Refresh options on table redraw
                        table.on("draw.dt", () => fillFromColumn(column, sel));
                    }

                    sel.addEventListener("change", () => {
                        const v = sel.value;
                        column.search(v || "", { regex: false, smart: true }).draw();
                    });
                });
            }
        },
    });
}

function DataTableSetDefaults() {
    logger.debug("DataTableSetDefaults");
    const language = set_table_i18n_language();
    // console.log(language);
    let savedPageLength = parseInt(localStorage.getItem("PAGE_LENGTH"), 10);
    if (isNaN(savedPageLength)) {
        savedPageLength = 10;
    }
    Object.assign(DataTable.defaults, {
        dom: '<"top"Bif>rt<"bottom"pl><"clear">',
        colReorder: true,
        deferRender: true,
        lengthMenu: lengthMenu,
        language: language,
        destroy: true,
        autoWidth: false,
        processing: true,
        serverSide: true,
        scrollY: "50vh",
        scrollCollapse: true,
        scrollX: true,
        orderable: false,
        searchable: false,
        fixedColumns: false,
        stateSave: true,
        scroller: false,
        stateDuration: -1,
        pageLength: savedPageLength,

        drawCallback: function (settings) {
            try {
                const api = this.api();
                const currentLength = api.page.len();
                if (currentLength && currentLength > 0) {
                    localStorage.setItem("PAGE_LENGTH", currentLength);
                }
            } catch (err) {}
            setTimeout(() => {
                updateContent();
            }, 100);
        },
        initComplete: function () {
            const api = this.api();
            const table = $(api.table().node());
            const thead = api.table().header();

            const strip = (v) => {
                const d = document.createElement("div");
                d.innerHTML = String(v ?? "");
                return d.textContent.trim();
            };

            // Populate options from column data when data-auto="1" is specified
            function fillFromColumn(column, sel) {
                const vals = column.cache("search").toArray().map(strip).filter(Boolean);
                const uniq = [...new Set(vals)].sort();
                const prev = sel.value || "";
                sel.length = 0;
                sel.add(new Option("all", ""));
                uniq.forEach((v) => sel.add(new Option(v, v)));
                if (uniq.includes(prev)) sel.value = prev;
            }

            if (thead) {
                thead.querySelectorAll("select.table-select-column").forEach((sel) => {
                    // Prevent column sorting when clicking filter select dropdown
                    sel.addEventListener("click", (e) => e.stopPropagation());

                    // Identify target column from parent th element
                    const th = sel.closest("th");
                    const column = api.column(th); // DataTables directly accepts th node

                    // Auto fill from table data if requested
                    if (sel.dataset.auto === "1" && sel.options.length <= 1) {
                        fillFromColumn(column, sel);
                        // Refresh options on table redraw
                        table.on("draw.dt", () => fillFromColumn(column, sel));
                    }

                    sel.addEventListener("change", () => {
                        const v = sel.value;
                        column.search(v || "", { regex: false, smart: true }).draw();
                    });
                });
            }
        },
    });
}

// ***?  i18next translation init

/**
 * Generates data-i18n attributes and collects translation keys from DOM
 * @param {HTMLElement|Document} root - Target DOM scope to scan (defaults to document.body)
 */
export async function generate_attr_i18n(root = document.body) {
    if (!root) return [];

    const uniqueKeysSet = new Set();
    const taggedElements = [];

    const textSelectors = "div, span, h1, h2, h3, h4, h5, h6, label, legend, th, a, .card-title, .collapse-title";
    const elements = Array.from(root.querySelectorAll(textSelectors));

    // Check if text is dynamic or technical data that should not be translated
    const isDynamicOrTechnical = (txt) => {
        return (
            /^\d+(\.\d+)*$/.test(txt) || // Numeric values, e.g. "100", "3.14"
            /^\d+(\.\d+)?%$/.test(txt) || // Percentage values, e.g. "100%"
            /^\d{1,3}(\.\d{1,3}){3}$/.test(txt) || // IP address, e.g. "192.168.1.1"
            /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(txt) || // MAC Address
            /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(txt) || // Date format, e.g. "2026-08-22"
            /^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(txt) || // Date format, e.g. "22/08/2026"
            /^\d{1,2}:\d{2}(:\d{2})?$/.test(txt) || // Time format, e.g. "08:30:00"
            /^[a-f0-9]{7,32}$/i.test(txt) || // Git commit hash or short token/UUID
            /^https?:\/\//i.test(txt) // URL
        );
    };

    // 1. Scan text nodes within DOM elements
    elements.forEach((el) => {
        // Exclude elements marked with data-field (Dynamic), no-i18n, or container descendants
        if (
            el.classList?.contains("no-i18n") ||
            el.dataset.field ||
            el.hasAttribute("data-field") ||
            el.closest("[data-field]") ||
            el.dataset.setTheme ||
            el.dataset.i18n
        ) {
            return;
        }

        const textNodes = Array.from(el.childNodes).filter(
            (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim(),
        );

        if (textNodes.length === 0) return;

        textNodes.forEach((node) => {
            // Prevent translation if parent or ancestor has data-field
            if (node.parentElement?.closest("[data-field]")) return;

            const rawText = node.textContent.trim();

            const isValid =
                rawText.length >= 2 &&
                rawText.length <= 80 &&
                /^[A-Z]/.test(rawText) && // Must start with uppercase English character (A-Z)
                !/[\u0E00-\u0E7F]/.test(rawText) && // Contains no non-Latin characters
                !isDynamicOrTechnical(rawText) && // Not technical or dynamic data
                /^[\x20-\x7E\s]*$/.test(rawText); // Is printable ASCII text

            if (!isValid) return;

            // If element contains child icons or SVG elements
            // Wrap text node in <span> to preserve adjacent icon elements
            if (el.children.length > 0) {
                const span = document.createElement("span");
                span.dataset.i18n = rawText;
                span.textContent = rawText;
                el.replaceChild(span, node);
                taggedElements.push(span);
            } else {
                el.dataset.i18n = rawText;
                taggedElements.push(el);
            }

            uniqueKeysSet.add(rawText);
        });
    });

    const keysToTranslate = Array.from(uniqueKeysSet);
    console.log("🌎 Unique Keys found:", keysToTranslate.length);
    console.log("✅ Total Elements tagged:", taggedElements.length);


    return keysToTranslate;
}

export const LANG_LABEL_MAP = {
    th: "ไทย",
    en: "English",
    lo: "ລາວ",
    jp: "日本語",
    ja: "日本語",
    zh: "中文",
    cn: "中文",
    "zh-CN": "中文",
    my: "မြန်မာ",
};

export const LANG_CODE_MAP = {
    th: "TH",
    en: "US",
    lo: "LA",
    jp: "JP",
    ja: "JP",
    zh: "ZH",
    cn: "ZH",
    "zh-CN": "ZH",
    my: "MY",
};

export function normalizeLang(lang) {
    if (!lang) return "th";
    lang = String(lang).toLowerCase().trim();
    if (lang === "ja") return "jp";
    if (lang === "cn" || lang === "zh-cn") return "zh";
    return lang;
}

export let initI18nDone = false;

export function getLang() {
    return (
        (i18next && i18next.language) || localStorage.getItem("lang") || localStorage.getItem("kiosk_language") || "th"
    );
}

export async function initI18n() {
    await generate_attr_i18n();
    const rawSavedLang = localStorage.getItem("lang") || localStorage.getItem("kiosk_language") || "th";
    const savedLang = normalizeLang(rawSavedLang);
    const fallbackLang = "en";
    logger.debug("🌐 i18n init:", savedLang);
    const resources = {
        en: { translation: en },
        th: { translation: th },
        jp: { translation: jp },
        lo: { translation: lo },
        zh: { translation: zh },
        my: { translation: my },
    };

    try {
        await i18next.init({
            lng: savedLang,
            fallbackLng: fallbackLang,
            keySeparator: false,
            nsSeparator: false,
            resources,
        });
        initI18nDone = true;

        const currentLangUpper = LANG_CODE_MAP[savedLang] || savedLang.toUpperCase();
        const currentLangLabel = LANG_LABEL_MAP[savedLang] || "ไทย";

        document.querySelectorAll("#current_lang, [data-field='current_lang'], .current-lang").forEach((el) => {
            el.textContent = currentLangUpper;
        });
        document
            .querySelectorAll("#current_lang_label, [data-field='current_lang_label'], .current-lang-label")
            .forEach((el) => {
                el.textContent = currentLangLabel;
            });
        if (document.getElementById("select_lang")) {
            document.getElementById("select_lang").value = savedLang;
        }
        if (typeof dayjs !== "undefined" && typeof dayjs.locale === "function") {
            dayjs.locale(savedLang);
        }
        await delay(200);
        updateContent();
        updateTooltip?.();
    } catch (err) {
        console.error("🌐 i18n init error:", err);
    }
}

export function updateTooltip(root = document.body) {
    if (!root || !initI18nDone) return;
    root.querySelectorAll("[data-i18n-tooltip]").forEach((el) => {
        const key = el.getAttribute("data-i18n-tooltip");
        const label = i18next.t(key);
        el.setAttribute("aria-label", label);
        el.setAttribute("data-tip", label);
    });
}

export function updateContent(root = document.body) {
    if (!root || !initI18nDone) return;
    // 1. Translate general text content
    root.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const translated = i18next.t(key);
        if (translated) {
            el.textContent = translated;
        }
    });

    // 2. Translate placeholders
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        const translated = i18next.t(key);
        if (translated) {
            el.setAttribute("placeholder", translated);
        }
    });

    // 3. Translate title attributes
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        const translated = i18next.t(key);
        if (translated) {
            el.setAttribute("title", translated);
        }
    });

    // 4. Translate bilingual options (e.g. Payment Types with data-name-th and data-name-en)
    const currentLang = localStorage.getItem("lang") || "th";
    root.querySelectorAll("option[data-name-th], option[data-name-en]").forEach((opt) => {
        const nameTh = opt.getAttribute("data-name-th");
        const nameEn = opt.getAttribute("data-name-en");
        if (currentLang === "th") {
            opt.textContent = nameTh || nameEn || opt.value;
        } else {
            opt.textContent = nameEn || nameTh || opt.value;
        }
    });

    // 5. Translate tooltip attributes
    updateTooltip(root);
}

export function i18next_translate(key, options = {}) {
    if (!initI18nDone || !i18next) return key;
    const result = i18next.t(key, options);

    if (!result || result === key) {
        return key;
    }

    return result;
}

export const t = i18next_translate;

window.changeLang = changeLang;
window.initI18n = initI18n;
window.updateContent = updateContent;
window.updateTooltip = updateTooltip;
window.t = t;
window.i18next_translate = i18next_translate;
export async function changeLang(lang) {
    const normLang = normalizeLang(lang);
    const langMap = {
        en: en,
        th: th,
        jp: jp,
        lo: lo,
        zh: zh,
        my: my,
    };

    const selected = langMap[normLang];
    if (!selected) {
        console.warn(`🌐 Language "${normLang}" not found.`);
        showToastNotification({
            type: "warning",
            msg: `🌐 ${normLang} Language pack not found.`,
        });
        return;
    }

    try {
        // Add resource bundle to i18next instance if needed
        if (i18next && typeof i18next.addResourceBundle === "function") {
            i18next.addResourceBundle(normLang, "translation", selected, true, true);
            await i18next.changeLanguage(normLang);
        }

        if (typeof dayjs !== "undefined" && typeof dayjs.locale === "function") {
            dayjs.locale(normLang);
        }
        localStorage.setItem("lang", normLang);
        localStorage.setItem("kiosk_language", normLang);

        const currentLangUpper = LANG_CODE_MAP[normLang] || normLang.toUpperCase();
        const currentLangLabel = LANG_LABEL_MAP[normLang] || "ไทย";

        document.querySelectorAll("#current_lang, [data-field='current_lang'], .current-lang").forEach((el) => {
            el.textContent = currentLangUpper;
        });
        document
            .querySelectorAll("#current_lang_label, [data-field='current_lang_label'], .current-lang-label")
            .forEach((el) => {
                el.textContent = currentLangLabel;
            });
        if (document.getElementById("select_lang")) {
            document.getElementById("select_lang").value = normLang;
        }

        updateContent();
        updateTooltip?.();

        // Close dropdown
        if (document.activeElement && typeof document.activeElement.blur === "function") {
            document.activeElement.blur();
        }

        // Close details dropdowns
        document.querySelectorAll("details.dropdown[open]").forEach((d) => {
            d.removeAttribute("open");
        });

        // Notify other listeners
        window.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang: normLang } }));
    } catch (err) {
        console.error("🌐 changeLang error:", err);
    }
}

// Close details dropdowns when clicking outside
if (typeof document !== "undefined") {
    document.addEventListener("click", (e) => {
        document.querySelectorAll("details.dropdown[open]").forEach((d) => {
            if (!d.contains(e.target)) {
                d.removeAttribute("open");
            }
        });
    });
}

export function getQuickRanges() {
    const t = i18next_translate;

    return {
        [t("today")]: [dayjs().startOf("day"), dayjs().endOf("day")],
        [t("yesterday")]: [dayjs().subtract(1, "day").startOf("day"), dayjs().subtract(1, "day").endOf("day")],
        [t("last 7 days")]: [dayjs().subtract(6, "days").startOf("day"), dayjs().endOf("day")],
        [t("last 30 days")]: [dayjs().subtract(29, "days").startOf("day"), dayjs().endOf("day")],
        [t("this month")]: [dayjs().startOf("month"), dayjs().endOf("month")],
        [t("last month")]: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")],
        [t("this year")]: [dayjs().startOf("year"), dayjs().endOf("year")],
        [t("last year")]: [dayjs().subtract(1, "year").startOf("year"), dayjs().subtract(1, "year").endOf("year")],
    };
}

export function getFlatpickrConfigWithEmbeddedDate() {
    const start = dayjs().startOf("day").toDate();
    return {
        wrap: false,
        mode: "single",
        enableTime: false,
        dateFormat: "Y/m/d",
        allowInput: true,
        defaultDate: start,
    };
}

export function getFlatpickrConfigWithEmbeddedRanges() {
    const start = dayjs().startOf("day").toDate();
    const end = dayjs().endOf("day").toDate();
    return {
        wrap: false,
        mode: "range",
        enableTime: true,
        time_24hr: true,
        minuteIncrement: 1,
        dateFormat: "Y/m/d H:i",
        allowInput: true,
        defaultHour: 0,
        defaultMinute: 0,
        defaultSeconds: 0,
        defaultDate: [start, end],

        // Format range separator as " - "
        locale: { rangeSeparator: " - " },

        onReady: [
            function (selectedDates, dateStr, instance) {
                // Prevent duplicate creation during Flatpickr re-init
                if (instance.__hasQuickRanges) return;
                const el = instance.input;
                el.setAttribute("autocomplete", "off");

                el.value = dateStr;

                instance.__hasQuickRanges = true;

                const ranges = getQuickRanges();

                // Build DaisyUI quick date preset bar
                const bar = document.createElement("div");
                bar.className = "fp-quick-ranges";

                // Apply backdrop styling to calendar preset bar
                // bar.classList.add("backdrop-blur"); // If glassy theme

                Object.entries(ranges).forEach(([label, [start, end]]) => {
                    const btn = document.createElement("button");
                    btn.type = "button";

                    // DaisyUI button
                    btn.className = "fp-quick-btn";

                    btn.textContent = label;

                    btn.addEventListener("click", () => {
                        instance.setDate([start.toDate(), end.toDate()], true);
                        instance.close();
                    });

                    bar.appendChild(btn);
                });

                // Insert preset bar at the top of flatpickr popup
                // Structure: months / innerContainer / timeContainer
                // Insert bar as first child element
                instance.calendarContainer.insertBefore(bar, instance.calendarContainer.firstChild);
            },
        ],
    };
}

function select2Init(selector = ".js-basic-single") {
    console.log("select2Init:", selector);

    document.querySelectorAll(selector).forEach((el) => {
        // Prevent duplicate initialization
        if (el.dataset.select2Init === "1") return;

        // Locate parent modal or fallback to body
        const parent = el.closest(".modal") || document.body;

        // console.log("→ Init Select2:", el, "parent:", parent);

        $(el).select2({
            dropdownParent: $(parent),
            width: "100%", // Ensure 100% width consistency
            // allowClear: true,
        });

        el.dataset.select2Init = "1";
        // Resolve Select2 aria-hidden accessibility warning
        const hiddenSelect = el;
        hiddenSelect.addEventListener("focus", () => {
            hiddenSelect.blur(); // Prevent browser focus from targeting hidden select
        });
    });
}

export function initSelect2() {
    // select2Init();
    select2Init("select.select2");
    document.querySelectorAll("div.my-select2").forEach((els) => {
        const el = els.querySelector("select");
        // Prevent duplicate initialization
        if (el.dataset.select2Init === "1") return;

        const parent = el.closest(".modal") || document.body;

        $(el).select2({
            dropdownParent: $(parent),
            width: "100%", // Ensure 100% width consistency
            // allowClear: true,
        });

        el.dataset.select2Init = "1";
        const hiddenSelect = el;
        hiddenSelect.addEventListener("focus", () => {
            hiddenSelect.blur(); // Prevent browser focus from targeting hidden select
        });
    });
}

function init_searchBox(params = {}) {
    const {
        searchBoxId = "searchBox",
        scope = document.body, // Search scope
    } = params;

    const searchBox = document.getElementById(searchBoxId);
    if (!searchBox) return;

    // Enforce strict autocomplete suppression
    searchBox.setAttribute("autocomplete", "new-password");

    // Use readonly trick to prevent browser autofill until user focuses
    searchBox.setAttribute("readonly", "readonly");
    searchBox.addEventListener("focus", () => {
        searchBox.removeAttribute("readonly");
    });
    searchBox.addEventListener("blur", () => {
        searchBox.setAttribute("readonly", "readonly");
    });

    let marks = [];

    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    function clearMarks() {
        for (const m of marks) {
            const p = m.parentNode;
            if (!p) continue;
            p.replaceChild(document.createTextNode(m.textContent), m);
            p.normalize();
        }
        marks = [];
    }

    function highlight(query) {
        clearMarks();
        if (!query) return;

        const re = new RegExp(escapeRegExp(query), "gi");

        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const p = node.parentElement;
                if (!p) return NodeFilter.FILTER_REJECT;

                const tag = p.tagName?.toLowerCase();
                if (["script", "style", "noscript", "textarea", "input"].includes(tag)) return NodeFilter.FILTER_REJECT;

                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;

                return NodeFilter.FILTER_ACCEPT;
            },
        });

        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);

        for (const node of nodes) {
            const text = node.nodeValue;
            if (!re.test(text)) continue;
            re.lastIndex = 0;

            const frag = document.createDocumentFragment();
            let last = 0;

            for (const m of text.matchAll(re)) {
                const s = m.index;
                const e = s + m[0].length;

                frag.appendChild(document.createTextNode(text.slice(last, s)));

                const mark = document.createElement("mark");
                mark.textContent = text.slice(s, e);
                frag.appendChild(mark);
                marks.push(mark);

                last = e;
            }

            frag.appendChild(document.createTextNode(text.slice(last)));
            node.parentNode.replaceChild(frag, node);
        }

        // Scroll to first matched result
        if (marks.length) {
            marks[0].scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }

    searchBox.onsearch = (e) => {
        highlight(searchBox.value.trim());
    };

    searchBox.oninput = (e) => {
        // Execute only on direct user input (prevents auto-trigger on initial page load)
        if (document.activeElement === searchBox) {
            highlight(searchBox.value.trim());
        }
    };

    // Support Ctrl+K / Cmd+K shortcut to focus and highlight search input
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            searchBox.focus();
            searchBox.select();
        }
    });
}

function init_date_time_picker() {
    const dateFormat = "Y-m-d H:i";
    const config = {
        static: true,
        dateFormat: dateFormat,
        time_24hr: true,
        enableTime: true,
        defaultHour: 0,
    };
    flatpickr(".datetimepicker", config);
}

async function initUnityApp() {
    if (document.body) {
        document.body.setAttribute("translate", "no");
    }
    controlSound = localStorage.getItem("SOUND_ENABLE") == "true" ? true : false;
    await initI18n();
    await initializeUnity();
    logger.info("controlSound Enable : ", controlSound);
    if (controlSound) {
        logger.info("addEventListener btnClickSound => click");
        document.addEventListener("click", (evnt) => {
            const trigger = evnt.target.closest("button, a, [role='tab'], label.tab");
            if (trigger) {
                if (trigger.tagName === "BUTTON" && trigger.disabled) return;
                btnClickSound();
            }
        });
    }
    initSelect2();
    HEADERS = await getHeaders();
    console.log(
        `%c ⚡ DOM %c ${performance.now().toFixed(2)} ms %c Fully loaded and parsed`,
        "background: #2563eb; color: #ffffff; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
        "background: #1e293b; color: #38bdf8; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0; font-family: monospace;",
        "color: #64748b; font-size: 11px; margin-left: 6px;",
    );
    init_searchBox();
    init_date_time_picker();

    // DataTable Default Setting
    const table_page_mode = localStorage.getItem("table_page_mode");
    if (table_page_mode) {
        if (table_page_mode == "false") {
            DataTableSetDefaultsScroller();
        } else {
            DataTableSetDefaults();
        }
    } else {
        localStorage.setItem("table_page_mode", "true");
        DataTableSetDefaults();
    }

    // software_packet_feature info
    if (typeof software_packet_feature !== "undefined" && software_packet_feature) {
        if (software_packet_feature == "Demo Mode/Test Mode") {
            showDialogInfo({
                title: "⚠️ Software For Demo/Test",
                msg: "Feature is limited in Evaluation / Demo Mode",
            });
        }
    }
    if (typeof software_demo_date !== "undefined" && software_demo_date) {
        try {
            const _software_demo_date = new Date(software_demo_date);
            console.log("⚠️ Software For Demo/Test", _software_demo_date);
        } catch (error) {
            console.log("⚠️ Software For Demo/Test", error);
        }
    }
    if (typeof software_is_demo_expired !== "undefined" && software_is_demo_expired == "true") {
        const demo_option = typeof software_demo_expired_option !== "undefined" ? software_demo_expired_option : "warning";
        switch (demo_option) {
            case "warning":
                showDialogWarning({
                    title: "⚠️ Software is expired for Demo/Test",
                    msg: "Please contact system administrator to verify subscription status",
                });
                break;
            case "lock":
                break;
            default:
                break;
        }
    }

    // Prevent default anchor navigation refresh
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;

        const target = new URL(link.href, window.location.origin);

        if (target.pathname === window.location.pathname && target.search === window.location.search) {
            e.preventDefault();
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUnityApp);
} else {
    initUnityApp();
}

/**
 * Initializes WebRTC/HLS live camera stream
 * @param {Array} cameras - Camera list [{name: 'hall', containerId: 'c1'}, ...]
 * @param {string} serverAddr - Video stream server address
 */
export function initMultiCameraStream(cameras, serverAddr = "localhost:1984") {
    const temp = document.getElementById("template_camera_view");
    if (!temp) {
        console.log("⚠️ Template template_camera_view not found");
        return;
    }

    cameras.forEach((cam) => {
        const container = cam.container;
        if (!container) {
            console.log(`⚠️ Container not found`);
            return;
        }
        console.log(`Initializing stream for camera: ${cam.name} in container:`, container);

        const clone = temp.content.cloneNode(true);
        clone.querySelector(`[data-field="camera_name"]`).textContent = cam.name;
        const video_element = clone.querySelector(`[data-field="video_element"]`);
        if (!video_element) {
            console.log(`⚠️ Container video_elementnot found`);
            return;
        }
        const video = document.createElement("video-stream");
        video.mode = "webrtc";
        video.autoplay = true;
        video.muted = true;
        video.controls = false;

        // Suppress double-click fullscreen trigger
        video.addEventListener(
            "dblclick",
            (e) => {
                e.stopPropagation();
                e.preventDefault();
            },
            true,
        );

        // Apply modern soft styling
        video.className =
            "w-full h-full object-cover rounded-box border-2 border-[#F7768E]/10 hover:border-[#F7768E]/50 transition-all duration-500 shadow-md";

        video.src = `ws://${serverAddr}/api/ws?src=${encodeURIComponent(cam.name)}`;

        video_element.appendChild(video);
        container.appendChild(clone);
    });
}

window.trigger_schedule = trigger_schedule;
export async function trigger_schedule() {
    showToastNotification({
        type: "info",
        title: "Trigger Schedule",
        msg: "Triggering scheduled background tasks and worker jobs...",
        duration: 3000,
    });

    try {
        const respond = await fetchApi("/trigger_schedule", "get", null, "json");
        const isSuccess = Boolean(
            respond && (respond.success === true || respond.code === 200 || respond.status === 200),
        );
        const code = respond?.code || respond?.status || (isSuccess ? 200 : 500);
        const msg = respond?.msg || (isSuccess ? "trigger_schedule completed successfully" : "trigger_schedule failed");
        const jsonFormatted = JSON.stringify(respond ?? {}, null, 2);

        const escapeHtml = (val = "") =>
            String(val)
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#39;");

        // Format execution time
        const timeMatch = typeof msg === "string" ? msg.match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/) : null;
        const executedAt = timeMatch ? timeMatch[0] : new Date().toLocaleString("th-TH");

        const html_content = `
            <div class="flex flex-col gap-3 text-left w-full mt-2 font-sans">
                <!-- Status Header -->
                <div class="flex items-center justify-between p-3.5 rounded-box ${
                    isSuccess
                        ? "bg-success/10 border border-success/30 text-success"
                        : "bg-error/10 border border-error/30 text-error"
                }">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-box flex items-center justify-center ${
                            isSuccess
                                ? "bg-success text-success-content shadow-md shadow-success/20"
                                : "bg-error text-error-content shadow-md shadow-error/20"
                        }">
                            <i class="fa-solid ${isSuccess ? "fa-circle-check" : "fa-triangle-exclamation"} text-xl"></i>
                        </div>
                        <div>
                            <div class="font-black text-sm text-base-content">
                                ${isSuccess ? "Schedule Processed Successfully" : "Schedule Execution Failed"}
                            </div>
                            <div class="text-xs text-base-content/70 font-mono mt-0.5">
                                ${escapeHtml(msg)}
                            </div>
                        </div>
                    </div>
                    <span class="badge ${isSuccess ? "badge-success badge-soft" : "badge-error badge-soft"} font-mono font-bold text-xs px-2.5 py-1">
                        HTTP ${code}
                    </span>
                </div>

                <!-- Executed Tasks Breakdown -->
                <div class="bg-base-200/60 border border-base-300 rounded-box p-3.5 space-y-2.5">
                    <div class="text-xs font-bold text-base-content/80 flex items-center justify-between pb-1.5 border-b border-base-300/60">
                        <span class="flex items-center gap-2">
                            <i class="fa-solid fa-list-check text-primary"></i>
                            <span>Triggered Background Tasks</span>
                        </span>
                        <span class="badge badge-xs badge-neutral badge-outline font-mono">2 Tasks</span>
                    </div>

                    <div class="grid grid-cols-1 gap-2 text-xs">
                        <div class="flex items-center justify-between p-2.5 rounded-box bg-base-100/80 border border-base-300/50 shadow-xs">
                            <div class="flex items-center gap-2.5">
                                <div class="w-7 h-7 rounded-box bg-info/10 text-info flex items-center justify-center">
                                    <i class="fa-solid fa-file-invoice"></i>
                                </div>
                                <div>
                                    <div class="font-semibold text-base-content">Schedule Send Report</div>
                                    <div class="text-[11px] text-base-content/60">Daily revenue and traffic summary report dispatch</div>
                                </div>
                            </div>
                            <span class="badge badge-sm ${isSuccess ? "badge-success badge-soft" : "badge-neutral badge-ghost"} font-semibold">
                                <i class="fa-solid fa-check text-[10px] mr-1"></i> Triggered
                            </span>
                        </div>

                        <div class="flex items-center justify-between p-2.5 rounded-box bg-base-100/80 border border-base-300/50 shadow-xs">
                            <div class="flex items-center gap-2.5">
                                <div class="w-7 h-7 rounded-box bg-warning/10 text-warning flex items-center justify-center">
                                    <i class="fa-solid fa-gears"></i>
                                </div>
                                <div>
                                    <div class="font-semibold text-base-content">Schedule Worker Daemon</div>
                                    <div class="text-[11px] text-base-content/60">Member expiration scan and daily rollover maintenance</div>
                                </div>
                            </div>
                            <span class="badge badge-sm ${isSuccess ? "badge-success badge-soft" : "badge-neutral badge-ghost"} font-semibold">
                                <i class="fa-solid fa-check text-[10px] mr-1"></i> Triggered
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Execution Timestamp -->
                <div class="flex items-center justify-between text-xs px-2 py-1 bg-base-200/40 rounded-box border border-base-300/40">
                    <span class="flex items-center gap-1.5 text-base-content/70">
                        <i class="fa-regular fa-clock text-primary"></i> Execution Timestamp:
                    </span>
                    <span class="font-mono font-bold text-base-content">${executedAt}</span>
                </div>

                <!-- Collapsible Raw JSON Response -->
                <details class="collapse collapse-arrow bg-base-200/60 border border-base-300 rounded-box text-left">
                    <summary class="collapse-title font-bold text-xs py-2 px-3 min-h-0 flex items-center gap-2 cursor-pointer text-base-content/70 hover:text-base-content select-none">
                        <i class="fa-solid fa-code text-primary"></i>
                        <span>Raw JSON Response</span>
                    </summary>
                    <div class="collapse-content px-3 pb-3 pt-0">
                        <div class="bg-base-300/80 border border-base-300 rounded-box p-3 max-h-40 overflow-y-auto">
                            <pre class="text-[11px] leading-relaxed font-mono text-base-content whitespace-pre-wrap"><code>${escapeHtml(jsonFormatted)}</code></pre>
                        </div>
                    </div>
                </details>
            </div>
        `;

        if (isSuccess) {
            showDialogSuccess({
                title: "Trigger Schedule",
                msg: html_content,
            });
            showToastNotification({
                type: "success",
                title: "Trigger Schedule",
                msg: "Scheduled tasks triggered successfully",
                duration: 4000,
            });
        } else {
            showDialogError({
                title: "Schedule Execution Failed",
                msg: html_content,
            });
            showToastNotification({
                type: "error",
                title: "Trigger Schedule Error",
                msg: msg || "An error occurred while executing schedule",
                duration: 5000,
            });
        }
    } catch (err) {
        console.error("trigger_schedule error:", err);
        const errMessage = err?.message || String(err);
        const errorHtml = `
            <div class="flex flex-col gap-3 text-left w-full mt-2 font-sans">
                <div class="p-3.5 rounded-box bg-error/10 border border-error/30 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-box flex items-center justify-center bg-error text-error-content shadow-md shadow-error/20">
                        <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                    </div>
                    <div>
                        <div class="font-black text-sm text-error">Connection Failed</div>
                        <div class="text-xs text-base-content/70 font-mono mt-0.5">${errMessage}</div>
                    </div>
                </div>
            </div>
        `;
        showDialogError({
            title: "Trigger Schedule Failed",
            msg: errorHtml,
        });
        showToastNotification({
            type: "error",
            title: "Network / Server Error",
            msg: errMessage,
            duration: 5000,
        });
    }
}
