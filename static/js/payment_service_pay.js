import * as unity from "./unity.js";

let statusInterval = null;
let timer = null;

window.checkPaymentStatus = checkPaymentStatus;
async function checkPaymentStatus(ref) {
    const qrRef = ref || (typeof REF01 !== "undefined" ? REF01 : "");
    if (!qrRef) return;

    const formData = new FormData();
    formData.append("qr_ref", qrRef);
    const respond = await unity.fetchApi("/api/payment_qr_code_status", "post", formData, "json");
    if (respond && respond.success) {
        if (statusInterval) clearInterval(statusInterval);
        if (timer) clearInterval(timer);

        unity.showToastNotification({ icon: "info", msg: "Successful" });
        unity.logger.debug(respond.data);
        const pay_success_url = respond.pay_success_url;
        console.log(respond);
        console.log(pay_success_url);

        window.location.href = pay_success_url;
        return true;
    }
}

window.openBankApp = openBankApp;
function openBankApp(scheme, bankName, event) {
    if (event) event.preventDefault();

    // 1. Auto-save QR code snapshot to device
    if (typeof saveQRCode === "function") {
        saveQRCode();
    }

    // 2. Display helper toast message
    if (typeof unity !== "undefined" && unity.showToastNotification) {
        unity.showToastNotification({
            icon: "info",
            msg: `QR saved! Please open ${bankName} app and scan from photo library`,
        });
    }

    // 3. Attempt banking app URL scheme dispatch
    setTimeout(() => {
        window.location.href = scheme;
    }, 300);
}

window.saveQRCode = saveQRCode;
function saveQRCode() {
    const filename = `${(typeof REF01 !== "undefined" && REF01) || "QRCode"}.png`;
    const qrContainer = document.querySelector('[data-field="qrImage"]');
    if (!qrContainer) {
        unity.showToastNotification({ type: "warning", title: "Save QR Code", msg: "QR element not found" });
        return;
    }

    const canvas = qrContainer.querySelector("canvas");
    const img = qrContainer.querySelector("img");

    const downloadImage = (src) => {
        const link = document.createElement("a");
        link.href = src;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (canvas) {
        // Append border styling
        const borderSize = 8;
        const newCanvas = document.createElement("canvas");
        newCanvas.width = canvas.width + borderSize * 2;
        newCanvas.height = canvas.height + borderSize * 2;
        const ctx = newCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
        ctx.drawImage(canvas, borderSize, borderSize);
        downloadImage(newCanvas.toDataURL("image/png"));
        return;
    }

    if (img && img.src) {
        downloadImage(img.src);
        return;
    }

    unity.showToastNotification({ type: "warning", title: "Save QR Code", msg: "QR code not rendered yet" });
}

document.addEventListener("DOMContentLoaded", () => {
    const currentRef = typeof REF01 !== "undefined" ? REF01 : "";
    console.log(currentRef);

    if (typeof QR_CODE_DATA !== "undefined" && QR_CODE_DATA) {
        const logo_src = "/static/icons/icon-thaiqr.png";
        const container = document.querySelector('[data-field="qrImage"]');
        if (container) {
            container.innerHTML = "";

            // Generate QR Code
            const qrCode = new QRCode(container, {
                text: QR_CODE_DATA,
                width: 210,
                height: 210,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.L, // High error correction level for logo overlay
            });

            setTimeout(() => {
                const canvas = container.querySelector("canvas");
                if (!canvas) return;

                const ctx = canvas.getContext("2d");
                const logo = new Image();
                logo.src = logo_src;

                logo.onload = () => {
                    const logoSize = canvas.width * 0.1; // 10% of QR dimensions
                    const x = (canvas.width - logoSize) / 2;
                    const y = (canvas.height - logoSize) / 2;

                    // White background pad
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(x - 4, y - 4, logoSize + 8, logoSize + 8);

                    // Render center logo
                    ctx.drawImage(logo, x, y, logoSize, logoSize);
                };
            }, 500);
        }

        // Begin payment polling
        if (currentRef) {
            checkPaymentStatus(currentRef);
            statusInterval = setInterval(() => checkPaymentStatus(currentRef), 3000);
        }
        const promptpayPayload = QR_CODE_DATA;
        const encodedPayload = encodeURIComponent(promptpayPayload);
        // Deep link integration for mobile banking apps
        // const kplusLink = `kplus://qr?payload=${encodedPayload}`;
        const kplusLink = `kplus://qr?payload=${encodedPayload}`;
        const scbLink = `scbeasy://qr?payload=${encodedPayload}`;
    }

    // Extract current URL
    const url = new URL(window.location);

    // Append query parameters
    if (currentRef) {
        url.searchParams.set("ref01", currentRef);
        // Update URL without reload
        window.history.pushState({}, "", url);
    }
    console.log(url);

    let totalSeconds = typeof QR_CODE_LEFT_TIME !== "undefined" ? QR_CODE_LEFT_TIME : 300;

    const expireEl = document.querySelector("[data-field='expireAt']");

    function updateCountdown() {
        if (totalSeconds <= 0) {
            if (timer) clearInterval(timer);
            if (statusInterval) clearInterval(statusInterval);
            if (expireEl) expireEl.textContent = "00:00 (Expired)";
            return;
        }
        totalSeconds--;

        const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const s = String(totalSeconds % 60).padStart(2, "0");
        expireEl.textContent = `${m}:${s}`;
    }

    // Update interval (1 second)
    timer = setInterval(updateCountdown, 1000);
});
