import * as unity from "./unity.js";

let ocrCallback = null;

/**
 * Opens a standalone OCR capture window and registers a callback.
 * @param {Function} onSuccessCallback - Callback function receiving { name, image }
 */
export function open_ocr_capture_window(onSuccessCallback = null) {
    ocrCallback = onSuccessCallback;

    const width = 480;
    const height = 720;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    window.open(
        "/ocr_capture",
        "ocr_capture_window",
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`,
    );
}
window.open_ocr_capture_window = open_ocr_capture_window;

// Listen to messages from the OCR capture window
window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "OCR_RESULT") {
        const name = event.data.name;
        const image = event.data.image;

        if (ocrCallback) {
            ocrCallback({ name, image });
        } else {
            // Default fallback mapping for gate_in_page
            const visitorInput = document.querySelector('#gate_in_page [data-field="visitor_name"]');
            if (visitorInput) {
                visitorInput.value = name;
                unity.showToastNotification({ icon: "success", msg: "Card read successfully: " + name });
            }

            const idCardImg = document.querySelector('[data-field="gate_in_image_03"]');
            if (idCardImg && image) {
                idCardImg.src = image;
            }
        }
    }
});

/**
 * Scans a QR code and handles callback.
 * @param {string} gate_type - "GATE_IN" or "GATE_OUT"
 * @param {Function} onSuccessCallback - Optional custom callback
 */
export async function scan_qr_code(gate_type = "GATE_OUT", onSuccessCallback = null) {
    async function scan_qr_code_success(data) {
        console.log("QR Data:", data);
        if (onSuccessCallback) {
            onSuccessCallback(data);
        } else {
            // Default compatibility fallback
            if (gate_type === "GATE_IN") {
                const idCardInput = document.querySelector('#gate_in_page [data-field="id_card"]');
                if (idCardInput) {
                    idCardInput.value = data;
                    if (typeof window.submit_gate_in_data === "function") {
                        window.submit_gate_in_data();
                    }
                }
            } else if (gate_type === "GATE_OUT") {
                const idCardInput = document.querySelector('#gate_out_page [data-field="id_card"]');
                if (idCardInput) {
                    idCardInput.value = data;
                    if (typeof window.submit_gate_out_data === "function") {
                        window.submit_gate_out_data();
                    }
                }
            }
        }
    }
    unity.scanQR(true, scan_qr_code_success);
}
window.scan_qr_code = scan_qr_code;
