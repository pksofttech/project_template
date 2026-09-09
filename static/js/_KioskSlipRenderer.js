/**
 * 🖨️ Common Kiosk Slip & Receipt Renderer
 * Unified ES6 Module for Loading, Drawing and Printing Thermal Slips / QR Receipts
 */
import * as unity from "./unity.js";
import { deviceAppService } from "./_DeviceAppService.js";

/**
 * 🖼️ Load Slip Image into an HTMLImageElement with promise wrapper
 * Supports:
 * - loadSlipImage(url) -> auto-resolves KIOSK_APP image element
 * - loadSlipImage(imgElement, url)
 * - loadSlipImage(url, imgElement)
 */
export async function loadSlipImage(target, maybeUrl) {
    let imgElement = null;
    let url = "";

    if (typeof target === "string") {
        url = target;
        imgElement =
            maybeUrl ||
            window.KIOSK_APP?.slip_pay_image ||
            window.KIOSK_APP?.slip_in_image ||
            document.querySelector('[data-field="slip_pay_image"], [data-field="slip_in_image"]');
    } else {
        imgElement = target;
        url = maybeUrl;
    }

    if (!imgElement) return null;

    try {
        await new Promise((resolve, reject) => {
            imgElement.onload = resolve;
            imgElement.onerror = () => reject(new Error(`Failed to load slip image from ${url}`));
            imgElement.src = url;
        });
        return imgElement;
    } catch (error) {
        console.error("❌ [KioskSlipRenderer] Error loading slip image:", error);
        imgElement.src = "/static/image/Image_not_available.png";
        return imgElement;
    }
}

/**
 * 🖨️ Execute Slip / Receipt Print Job
 */
export async function executePrintSlip(source) {
    const src =
        source ||
        window.KIOSK_APP?.slip_pay_image ||
        window.KIOSK_APP?.slip_in_image ||
        document.querySelector('[data-field="slip_pay_image"], [data-field="slip_in_image"]');

    if (!src) {
        unity.showToastNotification({ type: "error", msg: "No slip data to print" });
        return { success: false, msg: "No image source" };
    }

    try {
        const respond = await deviceAppService.printImage(src);
        if (respond?.success) {
            return respond;
        } else {
            unity.showToastNotification({ type: "error", msg: "Print Slip Error" });
            return respond || { success: false };
        }
    } catch (err) {
        console.error("❌ [executePrintSlip] Error:", err);
        return { success: false, error: err };
    }
}

/**
 * 🖨️ Parse any printer status response format (Object / Array / Values)
 */
export function extractPrinterStatus(res, fallbackPaper = null) {
    if (!res && res !== false && res !== 0) {
        return { isConnected: false, paperStatus: 0 };
    }

    if (Array.isArray(res)) {
        const isConn = res[0] === true || res[0] === 1 || res[0] === "true" || res[0] === "1";
        const paper = Number(res[1]) || 0;
        return { isConnected: isConn, paperStatus: paper };
    }

    if (typeof res === "object") {
        const connectVal =
            res.connect ??
            res.data?.connect ??
            (Array.isArray(res.data) ? res.data[0] : undefined) ??
            res.success ??
            false;
        const paperVal =
            res.paper_status ?? res.data?.paper_status ?? (Array.isArray(res.data) ? res.data[1] : undefined) ?? 0;
        const isConn = connectVal === true || connectVal === 1 || connectVal === "true" || connectVal === "1";
        const paper = Number(paperVal) || 0;
        return { isConnected: isConn, paperStatus: paper };
    }

    const isConn = res === true || res === 1 || res === "true" || res === "1";
    const paper = Number(fallbackPaper) || 0;
    return { isConnected: isConn, paperStatus: paper };
}


