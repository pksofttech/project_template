import * as unity from "./unity.js";

// ⚙️ Hardware Service Host Config (Local Device HTTP Service on Port 8080)
const DEFAULT_HW_HOST = "localhost:8080"; //Fix Device

export class DeviceAppService {
    isConnect = false;
    host = `http://${DEFAULT_HW_HOST}`;
    snapshot_01 = false;
    snapshot_02 = false;
    snapshot_03 = false;

    constructor(customHost = null) {
        if (customHost) {
            this.setHost(customHost);
        }
    }

    /**
     * 🌐 Update Hardware Daemon Host dynamically
     */
    setHost(newHost) {
        let clean = String(newHost).trim();
        if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
            clean = `http://${clean}`;
        }
        this.host = clean;
        console.log("🛠️ [DeviceAppService] Host updated to:", this.host);
    }

    /**
     * ⚙️ Get Hardware Device Configuration
     */
    async getConfig(config_name) {
        try {
            const result = await unity.fetchApi(
                `${this.host}/config_device?config_name=${encodeURIComponent(config_name)}`,
                "get",
                null,
                "json",
                true,
                5000,
            );
            return result?.data || null;
        } catch (err) {
            console.warn(`[DeviceAppService] getConfig(${config_name}) warning:`, err);
            return null;
        }
    }

    /**
     * 🚀 Initialize Device Service and Probe Camera / Audio Configurations
     */
    async init() {
        console.log("🛠️ [DeviceAppService] Initializing on host:", this.host);
        try {
            const [c1, c2, c3] = await Promise.allSettled([
                this.getConfig("cam_01"),
                this.getConfig("cam_02"),
                this.getConfig("cam_03"),
            ]);

            if (c1.status === "fulfilled" && c1.value) {
                this.snapshot_01 = true;
                console.log(`📝 Cam 01 snapshot enabled: ${c1.value}`);
            }
            if (c2.status === "fulfilled" && c2.value) {
                this.snapshot_02 = true;
                console.log(`📝 Cam 02 snapshot enabled: ${c2.value}`);
            }
            if (c3.status === "fulfilled" && c3.value) {
                this.snapshot_03 = true;
                console.log(`📝 Cam 03 snapshot enabled: ${c3.value}`);
            }
            this.isConnect = true;
        } catch (err) {
            console.warn("⚠️ [DeviceAppService] Init probe warning:", err);
        }
    }

    /**
     * 📊 Get Overall Hardware Status
     */
    async getStatus() {
        try {
            return (await unity.fetchApi(`${this.host}/api/getstatus`, "get", null, "json", true, 4000)) || null;
        } catch (err) {
            console.warn("[DeviceAppService] getStatus error:", err);
            return null;
        }
    }

    /**
     * 🖨️ Print Image (Slip / Receipt / Card Bitmap)
     * Supports: HTMLImageElement, File, Blob, DataURL, or URL string
     */
    async printImage(source) {
        if (!source) return null;

        unity.showDialogInfo({
            title: "Printing Slip...",
            msg: `<div class="text-center py-4"><div class="loading loading-spinner text-success loading-lg"></div><p class="mt-3 font-bold text-lg">Processing print job...</p></div>`,
        });

        try {
            const formData = new FormData();
            formData.append("cmd", "PRINT_IMAGE");

            let fileToUpload = null;
            if (source instanceof File) {
                fileToUpload = source;
            } else if (source instanceof Blob) {
                fileToUpload = new File([source], "slip_print.png", { type: source.type || "image/png" });
            } else if (typeof source === "string") {
                if (source.startsWith("data:")) {
                    fileToUpload = await unity.dataURLtoFile(source, "slip_print.png");
                } else {
                    const res = await fetch(source);
                    if (res.ok) {
                        const blob = await res.blob();
                        fileToUpload = new File([blob], "slip_print.png", { type: blob.type || "image/png" });
                    }
                }
            } else if (source instanceof HTMLImageElement && source.src) {
                if (source.src.startsWith("data:")) {
                    fileToUpload = await unity.dataURLtoFile(source.src, "slip_print.png");
                } else {
                    const res = await fetch(source.src);
                    if (res.ok) {
                        const blob = await res.blob();
                        fileToUpload = new File([blob], "slip_print.png", { type: blob.type || "image/png" });
                    }
                }
            } else if (source instanceof HTMLCanvasElement) {
                const dataUrl = source.toDataURL("image/png");
                fileToUpload = await unity.dataURLtoFile(dataUrl, "slip_print.png");
            }

            if (!fileToUpload) {
                throw new Error("Unable to obtain printable image file");
            }

            formData.append("image", fileToUpload);
            unity.debugForm(formData);

            const reply = await unity.fetchApi(`${this.host}/api/printImage`, "post", formData, "json", true, 15000);
            return reply || null;
        } catch (err) {
            console.error("❌ [DeviceAppService] printImage error:", err);
            return null;
        } finally {
            if (typeof Dialog_Info !== "undefined" && Dialog_Info?.open) {
                Dialog_Info.close();
            }
        }
    }

    /**
     * 🚧 Open Barrier Gate (Relay 1)
     */
    async openGate() {
        try {
            return (await unity.fetchApi(`${this.host}/active_relay?relay=1`, "get", null, "json", true, 5000)) || null;
        } catch (err) {
            console.warn("[DeviceAppService] openGate error:", err);
            return null;
        }
    }

    /**
     * ⚡ Trigger Specific Relay Output
     */
    async activeRelay(relay = 1) {
        try {
            return (
                (await unity.fetchApi(`${this.host}/active_relay?relay=${relay}`, "get", null, "json", true, 5000)) ||
                null
            );
        } catch (err) {
            console.warn(`[DeviceAppService] activeRelay(${relay}) error:`, err);
            return null;
        }
    }

    /**
     * 💳 Dispense / Hold Card (Relay 3)
     */
    async getCard() {
        try {
            return (await unity.fetchApi(`${this.host}/active_relay?relay=3`, "get", null, "json", true, 5000)) || null;
        } catch (err) {
            console.warn("[DeviceAppService] getCard error:", err);
            return null;
        }
    }

    /**
     * 🔄 Retract / Return Card (Relay 4)
     */
    async returnCard() {
        try {
            return (await unity.fetchApi(`${this.host}/active_relay?relay=4`, "get", null, "json", true, 5000)) || null;
        } catch (err) {
            console.warn("[DeviceAppService] returnCard error:", err);
            return null;
        }
    }

    /**
     * 🖨️ Query Printer Status
     */
    async getPrinterStatus() {
        try {
            // console.log(`🖨️ [DeviceAppService] Fetching printer status from: ${this.host}/printer/getstatus`);
            const result = await unity.fetchApi(`${this.host}/printer/getstatus`, "get", null, "json", true, 5000);
            // console.log("🖨️ [DeviceAppService] Printer Status Response:", result);
            return result || null;
        } catch (err) {
            console.error("❌ [DeviceAppService] getPrinterStatus Error:", err);
            return null;
        }
    }

    /**
     * 🔌 Query Switch Sensor Inputs
     */
    async getSwitchStatus() {
        try {
            return (await unity.fetchApi(`${this.host}/sw_status?sw=all`, "get", null, "json", true, 4000)) || null;
        } catch (err) {
            return null;
        }
    }

    /**
     * 🔊 Play Pre-recorded Audio File on Kiosk Hardware Speaker
     */
    async playSound(sound) {
        if (!sound) return null;
        try {
            let soundName = sound;
            if (!soundName.startsWith("sound_")) {
                const num = sound.replace(/\D/g, "");
                soundName = num ? `sound_${num.padStart(2, "0")}` : sound;
            }
            if (!soundName.endsWith(".mp3")) {
                soundName = `${soundName}.mp3`;
            }
            return (
                (await unity.fetchApi(
                    `${this.host}/play_sound?sound=${soundName}`,
                    "post",
                    null,
                    "json",
                    true,
                    5000,
                )) || null
            );
        } catch (err) {
            console.warn("[DeviceAppService] playSound error:", err);
            return null;
        }
    }

    /**
     * 🗣️ Play TTS Speech Synthesis
     */
    async playSoundTTS(text) {
        if (!text) return null;
        try {
            const param = new URLSearchParams({
                sound: text,
                sound_type: "piper",
                model: "en_US-lessac-medium.onnx",
            }).toString();
            return (await unity.fetchApi(`${this.host}/play_sound?${param}`, "post", null, "json", true, 6000)) || null;
        } catch (err) {
            console.warn("[DeviceAppService] playSoundTTS error:", err);
            return null;
        }
    }

    /**
     * 📷 Capture Camera Snapshot (Returns File/Blob)
     */
    async snapshot(cam = 1) {
        if (cam === 1 && !this.snapshot_01) return null;
        if (cam === 2 && !this.snapshot_02) return null;
        if (cam === 3 && !this.snapshot_03) return null;

        const timestamp = Date.now();
        const imageUrl = `${this.host}/snapshot?cam=${cam}&t=${timestamp}`;

        try {
            const response = await fetch(imageUrl);
            if (response.ok) {
                const blob = await response.blob();
                return new File([blob], `snapshot_0${cam}.jpg`, { type: blob.type || "image/jpeg" });
            }
            return null;
        } catch (err) {
            console.error(`❌ [DeviceAppService] Error capturing snapshot for cam ${cam}:`, err);
            return null;
        }
    }

    /**
     * 📷 Capture Camera Snapshot as Base64 Data URL (CORS Safe)
     */
    async snapshotBase64(cam, { mime = "image/jpeg", quality = 0.9, pureBase64 = false } = {}) {
        const timestamp = Date.now();
        const imageUrl = `${this.host}/snapshot?cam=${encodeURIComponent(cam)}&t=${timestamp}`;

        try {
            const img = await new Promise((resolve, reject) => {
                const im = new Image();
                im.crossOrigin = "anonymous";
                im.onload = () => resolve(im);
                im.onerror = () => reject(new Error("Image load failed (CORS/Network)"));
                im.src = imageUrl;
            });

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { willReadFrequently: false });

            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;

            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL(mime, quality);

            if (!pureBase64) return dataUrl;
            return dataUrl.split(",")[1];
        } catch (err) {
            console.error("❌ [DeviceAppService] snapshotBase64 error:", err);
            return null;
        }
    }

    /**
     * 🎴 Card Dispenser Status
     */
    async getDispenserStatus() {
        try {
            const result = await unity.fetchApi(`${this.host}/dispenser/getstatus`, "get", null, "json", true, 6000);
            if (result?.success) {
                return result;
            } else if (result?.msg) {
                unity.showToastNotification({
                    icon: "warning",
                    msg: `Card dispenser: ${result.msg}`,
                });
            }
            return result || null;
        } catch (err) {
            console.warn("[DeviceAppService] getDispenserStatus error:", err);
            return null;
        }
    }

    /**
     * 🎴 Card Dispenser Send Control
     */
    async sendDispenserControl(cmd, option = null) {
        try {
            const queryString = option ? `&option=${encodeURIComponent(option)}` : "";
            const respond = await unity.fetchApi(
                `${this.host}/dispenser/control?cmd=${encodeURIComponent(cmd)}${queryString}`,
                "get",
                null,
                "json",
                true,
                10000,
            );
            return respond || null;
        } catch (err) {
            console.warn("[DeviceAppService] sendDispenserControl error:", err);
            return null;
        }
    }

    /**
     * 🎴 Card Dispenser Send Raw Command
     */
    async sendDispenserCmd(cmd) {
        try {
            const respond = await unity.fetchApi(
                `${this.host}/dispenser/cmd?cmd=${encodeURIComponent(cmd)}`,
                "get",
                null,
                "json",
                true,
                10000,
            );
            return respond || null;
        } catch (err) {
            console.warn("[DeviceAppService] sendDispenserCmd error:", err);
            return null;
        }
    }
}

// Global Singleton Instance for easy import
export const deviceAppService = new DeviceAppService();
if (typeof window !== "undefined") {
    window.deviceAppService = deviceAppService;
    window.DeviceAppService = DeviceAppService;
}
