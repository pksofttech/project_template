import * as unity from "./unity.js";

let _temp = document.getElementById("info_data_content");
const INFO_DATA = {
    image_info_01: _temp.querySelector('[data-field="image_info_01"]'),
    image_info_02: _temp.querySelector('[data-field="image_info_02"]'),
    license: _temp.querySelector('[data-field="license"]'),
    date_in: _temp.querySelector('[data-field="date_in"]'),
    time_in: _temp.querySelector('[data-field="time_in"]'),
    parked_time: _temp.querySelector('[data-field="parked_time"]'),
    parked_fine: _temp.querySelector('[data-field="parked_fine"]'),
    sum_amount: _temp.querySelector('[data-field="sum_amount"]'),
    amount: _temp.querySelector('[data-field="amount"]'),

    qrcode: new QRCode(Dialog_QR_Payment.querySelector(['[data-field="qr_code"]']), {
        text: "https://home.pksofttech.org",
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
    }),
    qr_code_amount: Dialog_QR_Payment.querySelector('[data-field="qr_code_amount"]'),
};

const customerDisplayChannel = new BroadcastChannel("pks_customer_display_channel");
console.log("📡 [Customer Display] Connected to BroadcastChannel: 'pks_customer_display_channel'");

// Unified message dispatcher for both BroadcastChannel and window.postMessage
function handleDisplayMessage(data) {
    if (!data) return;
    const data_cmd = data.cmd;

    // Log incoming commands (except periodic heartbeat to avoid log spam)
    if (data_cmd !== "MAIN_HEARTBEAT") {
        console.log(`📥 [Customer Display] Received command: '${data_cmd}' ->`, data);
    }

    switch (data_cmd) {
        case "info":
            console.log(`🚗 [Customer Display] Updating Transaction Info -> License: ${data.license_info || '-'}, Amount: ${data.amount_info || 0} THB`);
            INFO_DATA.license.innerText = data.license_info || "-";
            INFO_DATA.date_in.innerText = data.date_in || "-";
            INFO_DATA.time_in.innerText = data.time_in || "-";
            INFO_DATA.parked_time.innerText = data.parked_time || "-";
            INFO_DATA.amount.innerText = data.amount_info || "0";
            INFO_DATA.parked_fine.innerText = data.parked_fine || "0";
            INFO_DATA.sum_amount.innerText = (parseInt(data.amount_info || 0, 10) + parseInt(data.parked_fine || 0, 10)).toString();

            if (data.image_info_01) INFO_DATA.image_info_01.src = data.image_info_01;
            if (data.image_info_02) INFO_DATA.image_info_02.src = data.image_info_02;
            break;

        case "cmd_qr_pay_show":
            console.log("💳 [Customer Display] Displaying PromptPay QR Modal with amount:", data.amount_info);
            unity.logger.debug(data);
            const qr_data = data.qr_data;
            if (qr_data) {
                INFO_DATA.qrcode.clear();
                INFO_DATA.qrcode.makeCode(qr_data);
                INFO_DATA.qr_code_amount.innerText = data.amount_info;
            }
            Dialog_QR_Payment.showModal();
            break;

        case "cmd_qr_pay_close":
            console.log("💳 [Customer Display] Closing PromptPay QR Modal");
            Dialog_QR_Payment.close();
            break;

        case "cmd_clear_info":
            console.log("🧹 [Customer Display] Clearing display screen to default ready state");
            INFO_DATA.license.innerText = "-";
            INFO_DATA.date_in.innerText = "-";
            INFO_DATA.time_in.innerText = "-";
            INFO_DATA.amount.innerText = "-";
            INFO_DATA.image_info_01.src = "/static/image/logo.jpg";
            INFO_DATA.image_info_02.src = "/static/image/logo.jpg";
            break;

        case "cmd_fullscreen":
            console.log("🖥️ [Customer Display] Received 'cmd_fullscreen' request");
            toggleFullScreen();
            break;

        case "CLOSE_SECONDARY":
            console.log("🚪 [Customer Display] Received 'CLOSE_SECONDARY' signal from Main POS. Closing window now...");
            window.close();
            break;

        case "MAIN_HEARTBEAT":
            lastHeartbeatReceived = Date.now();
            break;

        default:
            break;
    }
}

// 1. Listen via BroadcastChannel (Continuous & persistent across reloads)
customerDisplayChannel.onmessage = (event) => {
    handleDisplayMessage(event.data);
};

// 2. Listen via window.postMessage (Fallback)
window.addEventListener("message", (event) => {
    handleDisplayMessage(event.data);
});

// Notify main window that secondary display is ready and request latest state
console.log("🚀 [Customer Display] Sending 'SECONDARY_READY' ping to Main POS...");
customerDisplayChannel.postMessage({ cmd: "SECONDARY_READY", timestamp: Date.now() });

// Heartbeat watchdog: Close self if main POS cashier window terminates/crashes
let lastHeartbeatReceived = Date.now();
setInterval(() => {
    const elapsed = Date.now() - lastHeartbeatReceived;
    // If no heartbeat for > 8 seconds, close secondary window automatically
    if (elapsed > 8000) {
        console.warn(`⚠️ [Customer Display] Lost heartbeat from Main POS (${Math.round(elapsed / 1000)}s elapsed). Closing customer display window...`);
        window.close();
    }
}, 3000);

const closeWindow = (message) => {
    console.log("🚪 [Customer Display] closeWindow() called:", message);
    customerDisplayChannel.postMessage({ msg: message });
    window.close();
};

const toggleFullScreen = async () => {
    console.log("🖥️ [Customer Display] toggleFullScreen() invoked...");
    try {
        if (!document.fullscreenElement) {
            let targetScreen = null;
            if ("getScreenDetails" in window) {
                try {
                    const screenDetails = await window.getScreenDetails();
                    targetScreen = screenDetails.screens.find((s) => !s.isPrimary) || screenDetails.screens[1];
                    console.log("🖥️ [Customer Display] Target screen for fullscreen:", targetScreen);
                } catch (e) {}
            }
            if (targetScreen && typeof document.documentElement.requestFullscreen === "function") {
                console.log(`🖥️ [Customer Display] Requesting fullscreen on screen: ${targetScreen.label || 'Secondary'}`);
                await document.documentElement.requestFullscreen({ screen: targetScreen });
            } else {
                console.log("🖥️ [Customer Display] Requesting standard fullscreen");
                await document.documentElement.requestFullscreen();
            }
        } else {
            console.log("🖥️ [Customer Display] Exiting fullscreen mode");
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }
    } catch (err) {
        console.warn(`⚠️ [Customer Display] Fullscreen error: ${err.message}`);
    }
};

const btnFullscreen = document.getElementById("btn_toggle_fullscreen");
if (btnFullscreen) {
    btnFullscreen.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFullScreen();
    });
}

// Double click background to toggle fullscreen
document.addEventListener("dblclick", (e) => {
    if (e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT" && !e.target.closest("button")) {
        toggleFullScreen();
    }
});

// Single click anywhere on window to auto-jump to fullscreen on secondary screen if not yet fullscreen
let initialFullscreenAttempted = false;
document.addEventListener("click", async (e) => {
    if (initialFullscreenAttempted || document.fullscreenElement) return;
    if (e.target.closest("#Dialog_QR_Payment") || e.target.closest("button") || e.target.closest("input")) return;
    initialFullscreenAttempted = true;
    await toggleFullScreen();
});
