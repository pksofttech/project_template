/**
 * 🔐 Common Kiosk Security & Technician Diagnostics Controller
 * Unified ES6 Module for Dynamic Time PIN (HH:MM) and Diagnostics Modal
 */
import * as unity from "./unity.js";
import { deviceAppService } from "./_DeviceAppService.js";

export const PIN_MAX_LENGTH = 4;
export const MASTER_EMERGENCY_PIN = "9999";
export const BACKUP_EMERGENCY_PIN = "1122";

let entered_kiosk_pin = "";

export function getDynamicTimePin(date = new Date()) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}${minutes}`;
}

export function getValidSecurityPins() {
    const now = new Date();
    const currentPin = getDynamicTimePin(now);
    const prevMinute = new Date(now.getTime() - 60 * 1000);
    const prevPin = getDynamicTimePin(prevMinute);
    const nextMinute = new Date(now.getTime() + 60 * 1000);
    const nextPin = getDynamicTimePin(nextMinute);
    return [currentPin, prevPin, nextPin, MASTER_EMERGENCY_PIN, BACKUP_EMERGENCY_PIN];
}

export function updateKioskPinDisplay() {
    const dialogEl = document.getElementById("Dialog_Kiosk_Setting_PIN");
    if (!dialogEl) return;

    const slots = dialogEl.querySelectorAll("[data-pin-slot]");
    const errorEl = document.getElementById("kiosk_pin_error");

    slots.forEach((slot, idx) => {
        if (idx < entered_kiosk_pin.length) {
            slot.textContent = "●";
            slot.className =
                "w-14 h-16 sm:w-16 sm:h-18 rounded-box border-2 border-warning bg-warning/20 flex items-center justify-center text-4xl font-mono font-black text-warning shadow-md scale-105 transition-all duration-150";
        } else {
            slot.textContent = "-";
            slot.className =
                "w-14 h-16 sm:w-16 sm:h-18 rounded-box border-2 border-base-content/20 bg-base-100 flex items-center justify-center text-4xl font-mono font-black text-base-content/40 shadow-xs transition-all duration-150";
        }
    });

    if (errorEl) {
        errorEl.classList.add("hidden");
    }
}

export function on_kiosk_pin_input(key) {
    window.kioskScreensaver?.resetTimer();
    const errorEl = document.getElementById("kiosk_pin_error");
    const dialogEl = document.getElementById("Dialog_Kiosk_Setting_PIN");

    switch (key) {
        case "BS":
            entered_kiosk_pin = entered_kiosk_pin.slice(0, -1);
            updateKioskPinDisplay();
            break;
        case "CLEAR":
            entered_kiosk_pin = "";
            updateKioskPinDisplay();
            break;
        case "ENTER": {
            if (entered_kiosk_pin.length !== PIN_MAX_LENGTH) {
                if (errorEl) {
                    errorEl.textContent = "กรุณาระบุรหัส PIN ให้ครบ 4 หลัก (HH:MM)";
                    errorEl.classList.remove("hidden");
                }
                return;
            }

            const validPins = getValidSecurityPins();
            const isValid = validPins.includes(entered_kiosk_pin);

            if (isValid) {
                if (dialogEl && dialogEl.open) {
                    dialogEl.close();
                }
                entered_kiosk_pin = "";
                updateKioskPinDisplay();
                showKioskDiagnosticsModal();
            } else {
                if (errorEl) {
                    errorEl.textContent = "❌ รหัส PIN ไม่ถูกต้อง (ใช้เวลาปัจจุบัน HH:MM)";
                    errorEl.classList.remove("hidden");
                }
                unity.showToastNotification({ type: "error", msg: "Invalid Dynamic PIN (Use current time HH:MM)" });
                entered_kiosk_pin = "";
                updateKioskPinDisplay();
            }
            break;
        }
        default:
            if (/^\d$/.test(key) && entered_kiosk_pin.length < PIN_MAX_LENGTH) {
                entered_kiosk_pin += key;
                updateKioskPinDisplay();

                // Auto-validate immediately when reaching 4 digits
                if (entered_kiosk_pin.length === PIN_MAX_LENGTH) {
                    setTimeout(() => {
                        on_kiosk_pin_input("ENTER");
                    }, 120);
                }
            }
            break;
    }
}

export function kiosk_setting() {
    window.kioskScreensaver?.resetTimer();
    entered_kiosk_pin = "";
    updateKioskPinDisplay();
    const dialogEl = document.getElementById("Dialog_Kiosk_Setting_PIN");
    if (dialogEl && typeof dialogEl.showModal === "function") {
        dialogEl.showModal();
    } else {
        showKioskDiagnosticsModal();
    }
}

export function showKioskDiagnosticsModal() {
    const diagModal = document.getElementById("Dialog_Kiosk_Diagnostics");
    if (!diagModal || typeof diagModal.showModal !== "function") return;

    const kioskApp = window.KIOSK_APP || {};
    const isOnline = kioskApp.server_status?.textContent === "Online";
    const printerReady = kioskApp.printer_ready || false;
    const hwHost = deviceAppService?.host || "http://localhost:8080";

    const kName = diagModal.querySelector('[data-diag="kiosk_name"]');
    const gName = diagModal.querySelector('[data-diag="gate_name"]');
    const hHost = diagModal.querySelector('[data-diag="hw_host"]');
    const sStatus = diagModal.querySelector('[data-diag="server_status"]');
    const pStatus = diagModal.querySelector('[data-diag="printer_status"]');
    const lStatus = diagModal.querySelector('[data-diag="loop_status"]');
    const cStatus = diagModal.querySelector('[data-diag="cam_status"]');

    if (kName) kName.textContent = typeof KIOSK_NAME !== "undefined" ? KIOSK_NAME : (kioskApp.device_name || "-");
    if (gName) gName.textContent = typeof GATE_WAY_NAME !== "undefined" ? GATE_WAY_NAME : (kioskApp.gate_name || "-");
    if (hHost) hHost.textContent = hwHost.replace(/^https?:\/\//, "");

    if (sStatus) {
        sStatus.textContent = isOnline ? "Online" : "Offline";
        sStatus.className = `badge ${isOnline ? "badge-success" : "badge-error"} badge-lg font-mono font-black text-white px-3 py-1 text-sm`;
    }

    if (pStatus) {
        pStatus.textContent = printerReady ? "Ready" : "Not Ready";
        pStatus.className = `badge ${printerReady ? "badge-success" : "badge-warning"} badge-lg font-mono font-black text-white px-3 py-1 text-sm`;
    }

    if (lStatus) {
        const hasLoop = !!(kioskApp.loop_status_1?.classList.contains("text-error") || kioskApp.loop_status_2?.classList.contains("text-error"));
        lStatus.textContent = hasLoop ? "VEHICLE ON LOOP" : "NO VEHICLE";
    }

    if (cStatus) {
        const cam1 = deviceAppService?.snapshot_01 ? "Cam1: OK" : "Cam1: OFF";
        const cam2 = deviceAppService?.snapshot_02 ? "Cam2: OK" : "Cam2: OFF";
        cStatus.textContent = `${cam1} | ${cam2}`;
    }

    diagModal.showModal();
}

// Bind to window for HTML onclick attributes
if (typeof window !== "undefined") {
    window.on_kiosk_pin_input = on_kiosk_pin_input;
    window.kiosk_setting = kiosk_setting;
    window.showKioskDiagnosticsModal = showKioskDiagnosticsModal;
}
