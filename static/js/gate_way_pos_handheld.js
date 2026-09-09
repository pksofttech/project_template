import * as unity from "./unity.js";

// ***************** INIT ***************************//

async function requestNFCPermission() {
    if ("NDEFReader" in window) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: "nfc" });
            unity.logger.debug(`NFC permission state: ${permissionStatus.state}`);

            if (permissionStatus.state === "prompt") {
                unity.showToastNotification({ icon: "info", msg: "Please approve the NFC permission request." });
                const result = await unity.showDialogConfirm({
                    title: "NFC Compatible Device",
                    content: "Confirm connection to this NFC device?",
                });
                if (!result.confirm) return false;
            } else if (permissionStatus.state === "denied") {
                unity.showToastNotification({
                    icon: "error",
                    msg: "NFC permission denied. Please enable NFC in site settings.",
                });
                return false;
            } else if (permissionStatus.state === "granted") {
                unity.logger.debug("NFC permission already granted");
            }

            permissionStatus.onchange = () => {
                unity.logger.debug(`NFC permission state changed to: ${permissionStatus.state}`);
            };

            await startServiceNFC();
        } catch (error) {
            unity.logger.error(`Error requesting NFC permission: ${error.message}`);
            unity.showToastNotification({ icon: "error", msg: `Error: ${error.message}` });
            return false;
        }
    }
}

async function startServiceNFC() {
    try {
        if (!("NDEFReader" in window)) {
            unity.logger.error("Web NFC is not supported on this device");
            unity.showToastNotification({ icon: "warning", msg: "Web NFC is not supported on this device" });
            return;
        }

        const NDEF_READER = new NDEFReader();
        unity.logger.debug("Starting NFC scan...");
        await NDEF_READER.scan();
        unity.showToastNotification({ icon: "info", msg: "NFC scanning started..." });

        NDEF_READER.addEventListener("reading", (data) => {
            const reversedHex = data.serialNumber.split(":").reverse().join("");
            const serialNumberDecimal = parseInt(reversedHex, 16);

            switch (swiper.activeIndex) {
                case 0:
                    if (Dialog_Gate_In_Proseecss.getAttribute("open") === null) {
                        const gate_in_page = document
                            .getElementById("gate_in_page")
                            .querySelector('[data-field="id_card"]');
                        gate_in_page.value = serialNumberDecimal.toString();
                        submit_gate_in_data();
                    }
                    break;
                case 1:
                    if (Dialog_Gate_Out_Proseecss.getAttribute("open") === null) {
                        const gate_out_page = document
                            .getElementById("gate_out_page")
                            .querySelector('[data-field="id_card"]');
                        gate_out_page.value = serialNumberDecimal.toString();
                        submit_gate_out_data();
                    }
                    break;
                default:
                    break;
            }
        });

        NDEF_READER.addEventListener("readingerror", () => {
            unity.logger.error("Failed to read NFC tag");
            unity.showToastNotification({ icon: "error", msg: "Failed to read NFC tag" });
        });
    } catch (error) {
        unity.logger.error(`Error on scan: ${error.message}`);
        unity.showToastNotification({ icon: "error", msg: `Error on Nfc: ${error.message}` });
    }
}

function set_active_swiper(index) {
    switch (index) {
        case 0:
            unity.logger.debug("Gate_In");
            break;
        case 1:
            unity.logger.debug("Gate_Out");
            break;
        default:
            unity.logger.debug("Default");
            break;
    }
    localStorage.setItem("HANDHELD_TAB_ACTIVE", index);
    console.log("HANDHELD_TAB_ACTIVE", localStorage.getItem("HANDHELD_TAB_ACTIVE"));
}

// Instantiate after dynamic import
const swiper = new Swiper(".swiper", {
    speed: 500,
    spaceBetween: 500,
    loop: false,
});

document.addEventListener("DOMContentLoaded", async () => {
    console.log("HANDHELD_TAB_ACTIVE", localStorage.getItem("HANDHELD_TAB_ACTIVE"));
    await unity.delay(1000);
    swiper.slideTo(parseInt(localStorage.getItem("HANDHELD_TAB_ACTIVE")) || 0, 500);
    swiper.on("slideChange", function () {
        set_active_swiper(this.activeIndex);
    });

    unity.initI18n();
    await requestNFCPermission();
});
