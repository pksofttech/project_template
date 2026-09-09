/**
 * ============================================================================
 * 🚗 SMART GATE ENTRY KIOSK SLIP TERMINAL (kiosk_gate_in_slip.js)
 * High-Performance, Low-CPU, Hardware Integrated Parking Entry Controller
 * ============================================================================
 */

import * as unity from "./unity.js";
import { deviceAppService, DeviceAppService } from "./_DeviceAppService.js";
import { KioskScreensaverManager } from "./_KioskScreensaver.js";
import "./_KioskSecurity.js";
import { loadSlipImage, executePrintSlip, extractPrinterStatus } from "./_KioskSlipRenderer.js";

// 🌐 Multi-Language Delegation & Window Exports
export function getKioskText(key) {
    return unity.t(key);
}

export function updatePageContent(root = document.body) {
    unity.updateContent(root);
}

export function setKioskLanguage(lang) {
    unity.changeLang(lang);
}

window.changeLang = unity.changeLang;
window.setKioskLanguage = setKioskLanguage;
window.getKioskText = getKioskText;

// ⚙️ Hardware Service Host Config (Local Device HTTP/WS Service)
const HOST_HW_SERVICE = "localhost:8080"; // FIX To Local Device Service
const DEFAULT_LPR_IMAGE = "/static/data_base/image/app_configurations/app_configurations_image.jpg";
const SOUND_PATH = `/static/sound/`;
const SOUND_LIST = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09"];
const SOUND_DRIVER = "DEVICE"; // "DEVICE" via HW Daemon or "WEB" via Howler

let SERVICES_FEES_LIST = null;
let CONTACT_LIST = [];
let objective_select = "";
let serverStatusTimer = null;
let lastPrinterReadyState = null;
let intervalId_printer_status = null;
let vmsCardBlobUrl = null;
let switch_data = null;

// LPR Action Timers
let lprSoundTimer = null;
let lprClearTimer = null;
const LPR_REMINDER_DELAY_MS = 10000;
const LPR_AUTOCLEAR_DELAY_MS = 20000;

// Idle Security Auto-Reload (30 mins)
let idleMinutes = 0;
const IDLE_LIMIT_MINUTES = 30;

export { deviceAppService, DeviceAppService };

// 🖥️ Kiosk Main State Object
const page_kiosk = document.body;
export const KIOSK_APP = {
    device_name: typeof KIOSK_NAME !== "undefined" ? KIOSK_NAME : "KIOSK-IN-01",
    gate_name: typeof GATE_WAY_NAME !== "undefined" ? GATE_WAY_NAME : "MAIN ENTRY LANE",
    gateway_id: typeof GATE_WAY_ID !== "undefined" ? GATE_WAY_ID : "1",
    default_service_fee_id: typeof SERVICE_FEE_ID !== "undefined" ? SERVICE_FEE_ID : "1",
    device_mode: typeof DEVICE_MODE !== "undefined" ? DEVICE_MODE : "SLIP",
    device_type: typeof DEVICE_TYPE !== "undefined" ? DEVICE_TYPE : "GATE_IN",
    user_name: typeof SYSTEM_USER !== "undefined" ? SYSTEM_USER : "SYSTEM",
    access_token: typeof ACCESS_TOKEN !== "undefined" ? ACCESS_TOKEN : "",

    server_status: page_kiosk.querySelector('[data-field="server_status"]'),
    input_objective: page_kiosk.querySelector('[data-field="input_objective"]'),
    input_contact: page_kiosk.querySelector('[data-field="input_contact"]'),
    slip_in_image: page_kiosk.querySelector('[data-field="slip_in_image"]'),
    lpr_image_01: page_kiosk.querySelector('[data-field="lpr_image_01"]'),
    lpr_image_02: page_kiosk.querySelector('[data-field="lpr_image_02"]'),
    input_type_car: page_kiosk.querySelector('[data-field="input_type_car"]'),
    input_license_car: page_kiosk.querySelector('[data-field="input_license_car"]'),
    printer_status: page_kiosk.querySelector('[data-field="printer_status"]'),
    loop_status: page_kiosk.querySelector('[data-field="loop_status"]'),
    loop_status_1: page_kiosk.querySelector('[data-field="loop_status_1"]'),
    loop_status_2: page_kiosk.querySelector('[data-field="loop_status_2"]'),

    car_type: 0, // 0: No car, 1: Motorcycle, 2: Car
    printer_ready: false,
    is_processing: false,
    last_lpr_data: { license: "", image_path: "", timestamp: null },

    update_server_status: async function () {
        try {
            const response = await unity.fetchApi("/ping", "get", null, "json", true, 4000);
            if (response?.success) {
                if (this.server_status) {
                    this.server_status.textContent = "Online";
                    this.server_status.classList.remove("text-error");
                    this.server_status.classList.add("text-success");
                }
                return;
            }
        } catch (err) {
            console.warn("Server ping check offline:", err);
        }
        if (this.server_status) {
            this.server_status.textContent = "Offline";
            this.server_status.classList.remove("text-success");
            this.server_status.classList.add("text-error");
        }
    },

    init: async function () {
        console.log("============================================");
        console.log("🚗 SMART GATE ENTRY KIOSK SLIP INITIALIZED");
        console.log(`   💡 SYSTEM_USER      : ${this.user_name}`);
        console.log(`   💡 KIOSK_NAME       : ${this.device_name}`);
        console.log(`   💡 GATE_WAY_ID      : ${this.gateway_id}`);
        console.log(`   💡 GATE_WAY_NAME    : ${this.gate_name}`);
        console.log(`   💡 DEVICE_TYPE      : ${this.device_type}`);
        console.log(`   💡 DEVICE_MODE      : ${this.device_mode}`);
        console.log(`   💡 SERVICE_FEE_ID   : ${this.default_service_fee_id}`);
        console.log("============================================");

        play_sound("00");

        if (this.server_status) {
            this.update_server_status();
            if (serverStatusTimer) clearInterval(serverStatusTimer);
            serverStatusTimer = setInterval(() => {
                this.update_server_status();
            }, 10000);
        }
    },
};

window.KIOSK_APP = KIOSK_APP;

/**
 * 🔊 Audio Feedback Handler
 */
export function play_sound(sound) {
    if (!sound) return;
    if (SOUND_DRIVER === "DEVICE") {
        deviceAppService.playSound(sound);
    } else {
        try {
            const cleanKey = sound.replace(/\D/g, "").padStart(2, "0");
            const audio = new Audio(`${SOUND_PATH}${cleanKey}.mp3`);
            audio.play().catch(() => {});
        } catch (e) {
            console.warn("Audio playback error:", e);
        }
    }
}
window.play_sound = play_sound;

/**
 * 🖨️ Printer Readiness Check Guard
 */
export async function printer_ready() {
    if (!KIOSK_APP.printer_ready) {
        unity.showToastNotification({
            type: "warning",
            msg: `<div class="text-2xl font-bold">Printer Unavailable<br>Please check printer paper or connection</div>`,
        });
        play_sound("05");
        return false;
    }
    return true;
}

/**
 * 🔍 Dropdown text-to-value resolver
 */
function getValueByText(selectEl, text) {
    if (!selectEl || !text) return null;
    const cleanText = text.trim().toLowerCase();
    for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].text.trim().toLowerCase() === cleanText) {
            return selectEl.options[i].value;
        }
    }
    return null;
}

/**
 * 🧼 Clean LPR & Transaction Display State
 */
export function clear_lpr_data() {
    if (KIOSK_APP.lpr_image_01) KIOSK_APP.lpr_image_01.src = DEFAULT_LPR_IMAGE;
    if (KIOSK_APP.lpr_image_02) KIOSK_APP.lpr_image_02.src = DEFAULT_LPR_IMAGE;
    if (KIOSK_APP.input_type_car) {
        KIOSK_APP.input_type_car.innerText =
            KIOSK_APP.car_type === 2 ? "CAR (รถยนต์)" : KIOSK_APP.car_type === 1 ? "MOTORCYCLE" : "NO VEHICLE";
    }
    if (KIOSK_APP.input_license_car) KIOSK_APP.input_license_car.innerText = "";
    KIOSK_APP.last_lpr_data = { license: "", image_path: "", timestamp: null };
}
window.clear_lpr_data = clear_lpr_data;

export function clear_transaction() {
    console.log("🧼 clear_transaction state reset");
    clear_lpr_data();
}
window.clear_transaction = clear_transaction;

function clearLprTimers() {
    if (lprSoundTimer !== null) {
        clearTimeout(lprSoundTimer);
        lprSoundTimer = null;
    }
    if (lprClearTimer !== null) {
        clearTimeout(lprClearTimer);
        lprClearTimer = null;
    }
}

/**
 * 📝 Submit & Open Gate Entry Confirmation Modal
 */
export async function submit_gate_in(objective = "", contact = "") {
    console.log("📝 submit_gate_in trigger:", { objective, contact });
    play_sound("02");
    resetIdleTimer();

    const select_objective = Dialog_Confirm_Transaction?.querySelector('[data-field="objective"]');
    const select_contact = Dialog_Confirm_Transaction?.querySelector('[data-field="contact_name"]');
    const select_vehicle_type = Dialog_Confirm_Transaction?.querySelector('[data-field="vehicle_type"]');

    const objective_value = getValueByText(select_objective, objective);
    const contact_value = getValueByText(select_contact, contact);
    const vehicle_type_value = KIOSK_APP.car_type || 1;

    if (select_objective) select_objective.value = objective_value || select_objective.options[1]?.value || 1;
    if (select_contact) select_contact.value = contact_value || "";
    if (select_vehicle_type) select_vehicle_type.value = vehicle_type_value || 1;

    const imgVehicle = Dialog_Confirm_Transaction?.querySelector('[data-field="image_vehicle"]');
    const imgCloseup = Dialog_Confirm_Transaction?.querySelector('[data-field="image_closeup"]');
    const dateField = Dialog_Confirm_Transaction?.querySelector('[data-field="date"]');
    const licenceField = Dialog_Confirm_Transaction?.querySelector('[data-field="licence"]');
    const staffField = Dialog_Confirm_Transaction?.querySelector('[data-field="staff"]');
    const gateField = Dialog_Confirm_Transaction?.querySelector('[data-field="gate"]');

    if (imgVehicle) imgVehicle.src = KIOSK_APP.lpr_image_01?.src || DEFAULT_LPR_IMAGE;
    if (imgCloseup) imgCloseup.src = KIOSK_APP.lpr_image_02?.src || DEFAULT_LPR_IMAGE;
    if (dateField) dateField.innerText = unity.dateTimeToStr(new Date());
    if (licenceField) licenceField.innerText = KIOSK_APP.input_license_car?.innerText || "-";
    if (staffField) staffField.innerText = KIOSK_APP.device_name;
    if (gateField) gateField.innerText = KIOSK_APP.gate_name;

    Dialog_Confirm_Transaction?.showModal();
}
window.submit_gate_in = submit_gate_in;

/**
 * 👆 Touch Purpose Selection Action
 */
export async function call_slip(objectiveIndex = 0) {
    resetIdleTimer();
    if ((await printer_ready()) === false) return;

    // Auto-detect car type from label if not set by loop
    if (KIOSK_APP.car_type === 0 && KIOSK_APP.input_type_car?.innerText) {
        const text = KIOSK_APP.input_type_car.innerText.toUpperCase();
        if (text.includes("MOTORCYCLE")) KIOSK_APP.car_type = 1;
        else if (text.includes("CAR")) KIOSK_APP.car_type = 2;
    }

    switch (objectiveIndex) {
        case 0: {
            // Option 01: Building Management / Store / Office
            const select_objective = Dialog_Confirm_Transaction?.querySelector('[data-field="objective"]');
            const defaultObjectiveText = select_objective?.options?.[1]?.text || "Building Management";
            objective_select = defaultObjectiveText;
            await submit_gate_in(defaultObjectiveText, "");
            break;
        }
        case 1: {
            // Option 02: Delivery / Parcel / Food
            objective_select = "Delivery";
            if (Dialog_Select_Contact) {
                const inputContact = Dialog_Select_Contact.querySelector('[data-field="input_contact"]');
                const titleContact = Dialog_Select_Contact.querySelector('[data-field="title_contact"]');
                const btnSubmit = Dialog_Select_Contact.querySelector('[data-field="btn_submit_contact"]');
                if (inputContact) inputContact.value = "";
                if (titleContact)
                    titleContact.innerText = getKioskText("keypad_title_delivery") || "Delivery (Enter Unit No.)";
                if (btnSubmit) btnSubmit.disabled = true;
                Dialog_Select_Contact.showModal();
            }
            break;
        }
        case 2: {
            // Option 03: Resident / Unit Visit
            objective_select = "Visiting Unit No.";
            if (Dialog_Select_Contact) {
                const inputContact = Dialog_Select_Contact.querySelector('[data-field="input_contact"]');
                const titleContact = Dialog_Select_Contact.querySelector('[data-field="title_contact"]');
                const btnSubmit = Dialog_Select_Contact.querySelector('[data-field="btn_submit_contact"]');
                if (inputContact) inputContact.value = "";
                if (titleContact)
                    titleContact.innerText = getKioskText("keypad_title_visiting") || "Resident / Unit Visit";
                if (btnSubmit) btnSubmit.disabled = true;
                Dialog_Select_Contact.showModal();
            }
            break;
        }
        default: {
            const select_objective = Dialog_Confirm_Transaction?.querySelector('[data-field="objective"]');
            const targetText = select_objective?.options?.[objectiveIndex]?.text || `Option ${objectiveIndex + 1}`;
            objective_select = targetText;
            await submit_gate_in(targetText, "");
            break;
        }
    }
}
window.call_slip = call_slip;

/**
 * 🔢 On-Screen Touch Numpad Keyboard Event
 */
export async function on_screen_kenboard_event_input(key) {
    resetIdleTimer();
    if (!Dialog_Select_Contact) return;

    const input_contact = Dialog_Select_Contact.querySelector('[data-field="input_contact"]');
    const title_contact = Dialog_Select_Contact.querySelector('[data-field="title_contact"]');
    const btn_submit = Dialog_Select_Contact.querySelector('[data-field="btn_submit_contact"]');
    if (!input_contact) return;

    switch (key) {
        case "BS":
            input_contact.value = input_contact.value.slice(0, -1);
            break;
        case "CLEAR":
            input_contact.value = "";
            break;
        case "ENTER": {
            Dialog_Select_Contact.close();
            const contact_text =
                title_contact?.innerText && title_contact.innerText !== "No Data"
                    ? title_contact.innerText
                    : input_contact.value.trim();

            input_contact.value = "";

            if (typeof Dialog_KIOSK_VMS_Proseecss !== "undefined" && Dialog_KIOSK_VMS_Proseecss?.open) {
                const select = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="contact_name"]');
                if (select) {
                    const match = [...select.options].find(
                        (o) => o.text.trim().toLowerCase() === contact_text.trim().toLowerCase(),
                    );
                    if (match) select.value = match.value;
                }
            } else {
                await submit_gate_in(objective_select, contact_text);
            }
            return;
        }
        default:
            input_contact.value += key;
            break;
    }

    const currentVal = input_contact.value.trim();
    if (currentVal !== "") {
        const valLower = currentVal.toLowerCase();
        const matched = CONTACT_LIST.find((item) => item.value.toLowerCase().includes(valLower));

        if (matched && title_contact) {
            title_contact.innerText = matched.value;
        } else if (title_contact) {
            title_contact.innerText = `Unit ${currentVal}`;
        }

        if (btn_submit) btn_submit.disabled = false;
    } else {
        if (title_contact) {
            title_contact.innerText =
                objective_select || getKioskText("keypad_title_default") || "Enter Unit / Room No.";
        }
        if (btn_submit) btn_submit.disabled = true;
    }
}
window.on_screen_kenboard_event_input = on_screen_kenboard_event_input;

export function on_screen_select_contact_name() {
    resetIdleTimer();
    if (Dialog_Select_Contact) Dialog_Select_Contact.showModal();
}
window.on_screen_select_contact_name = on_screen_select_contact_name;

/**
 * 💾 Check-in Verification & Entry Transaction
 */
export async function confirm_transaction(transaction_data = null) {
    clearLprTimers();
    resetIdleTimer();

    if ((await printer_ready()) === false) return;
    if (KIOSK_APP.is_processing) {
        unity.showToastNotification({ type: "warning", msg: "Transaction currently processing..." });
        return;
    }

    const date_time = transaction_data
        ? transaction_data.date_time
        : Dialog_Confirm_Transaction?.querySelector('[data-field="date"]')?.textContent || new Date().toISOString();

    const license = transaction_data
        ? transaction_data.license
        : Dialog_Confirm_Transaction?.querySelector('[data-field="licence"]')?.textContent || "";

    const visitor_name = transaction_data
        ? transaction_data.visitor_name
        : Dialog_Confirm_Transaction?.querySelector('[data-field="visitor_name"]')?.textContent || "";

    const vehicle_type_id = transaction_data
        ? transaction_data.vehicle_type_id
        : Dialog_Confirm_Transaction?.querySelector('[data-field="vehicle_type"]')?.value || null;

    const member_user_id = transaction_data
        ? transaction_data.member_user_id
        : Dialog_Confirm_Transaction?.querySelector('[data-field="contact_name"]')?.value || null;

    const objective_id = transaction_data
        ? transaction_data.objective_id
        : Dialog_Confirm_Transaction?.querySelector('[data-field="objective"]')?.value || null;

    const service_fees_id = KIOSK_APP.default_service_fee_id;

    // 🛡️ Anti-Passback Validation Check
    if (license && license !== "undefined" && license !== "-" && license !== "xx-xxxx") {
        try {
            const check_in_data = await unity.fetchApi(
                `/api/function/check_in?card_id=${encodeURIComponent(license)}`,
                "get",
                null,
                "json",
            );
            if (check_in_data?.success) {
                if (check_in_data.transaction) {
                    unity.showToastNotification({
                        type: "warning",
                        title: "Warning",
                        msg: `License plate [${license}] already has an active entry record`,
                    });
                    play_sound("03");
                    return;
                }
                if (check_in_data.last_check_out_second && check_in_data.last_check_out_second < 60) {
                    const last_check_out = unity.secToDurationLocal(check_in_data.last_check_out_second);
                    unity.showToastNotification({
                        type: "warning",
                        title: "Warning",
                        msg: `Anti-Passback Alert: Duplicate card usage detected<br>Last Used: ${last_check_out}`,
                    });
                    play_sound("09");
                    return;
                }
            }
        } catch (err) {
            console.warn("Check-in anti-passback validation warning:", err);
        }
    }

    play_sound("02");
    KIOSK_APP.is_processing = true;

    try {
        const formData = new FormData();
        formData.append("license", license === "xx-xxxx" ? "" : license);
        formData.append("time", date_time);
        formData.append("service_fees_id", service_fees_id);
        formData.append("gateway_id", KIOSK_APP.gateway_id);

        if (vehicle_type_id) formData.append("vehicle_type_id", vehicle_type_id);
        if (member_user_id) formData.append("member_user_id", member_user_id);
        if (objective_id) formData.append("objective_id", objective_id);
        formData.append("visitor_name", visitor_name);
        formData.append("remark", "KIOSK Services");

        // 📷 Concurrent Direct Camera Snapshots & Fallbacks
        let snap1 = null;
        let snap2 = null;

        if (deviceAppService.snapshot_01 || deviceAppService.snapshot_02) {
            [snap1, snap2] = await Promise.all([
                deviceAppService.snapshot_01 ? deviceAppService.snapshot(1) : null,
                deviceAppService.snapshot_02 ? deviceAppService.snapshot(2) : null,
            ]);
        }

        // Cam 1 Image Upload
        if (snap1 instanceof File) {
            formData.append("image_upload_01", snap1);
        } else if (
            KIOSK_APP.lpr_image_01?.src &&
            !KIOSK_APP.lpr_image_01.src.includes("app_configurations_image.jpg")
        ) {
            if (KIOSK_APP.lpr_image_01.src.startsWith("data:")) {
                const f1 = await unity.dataURLtoFile(KIOSK_APP.lpr_image_01.src, "lpr_image_01.jpg");
                if (f1) formData.append("image_upload_01", f1);
            } else {
                try {
                    const res1 = await fetch(KIOSK_APP.lpr_image_01.src);
                    if (res1.ok) {
                        const b1 = await res1.blob();
                        formData.append(
                            "image_upload_01",
                            new File([b1], "lpr_image_01.jpg", { type: b1.type || "image/jpeg" }),
                        );
                    }
                } catch (e) {
                    console.warn("lpr_image_01 fetch error:", e);
                }
            }
        }

        // Cam 2 Image Upload
        if (snap2 instanceof File) {
            formData.append("image_upload_02", snap2);
        } else if (
            KIOSK_APP.lpr_image_02?.src &&
            !KIOSK_APP.lpr_image_02.src.includes("app_configurations_image.jpg")
        ) {
            if (KIOSK_APP.lpr_image_02.src.startsWith("data:")) {
                const f2 = await unity.dataURLtoFile(KIOSK_APP.lpr_image_02.src, "lpr_image_02.jpg");
                if (f2) formData.append("image_upload_02", f2);
            } else {
                try {
                    const res2 = await fetch(KIOSK_APP.lpr_image_02.src);
                    if (res2.ok) {
                        const b2 = await res2.blob();
                        formData.append(
                            "image_upload_02",
                            new File([b2], "lpr_image_02.jpg", { type: b2.type || "image/jpeg" }),
                        );
                    }
                } catch (e) {
                    console.warn("lpr_image_02 fetch error:", e);
                }
            }
        }

        unity.debugForm(formData);
        const respond = await unity.fetchApi("/api/function/check_in", "post", formData, "json");

        if (respond?.success) {
            const _tran = respond.data;
            if (typeof Dialog_KIOSK_VMS_Proseecss !== "undefined" && Dialog_KIOSK_VMS_Proseecss?.open) {
                Dialog_KIOSK_VMS_Proseecss.close();
            }
            if (typeof Dialog_Confirm_Transaction !== "undefined" && Dialog_Confirm_Transaction?.open) {
                Dialog_Confirm_Transaction.close();
            }

            const slipUrl = `/api/function/slip_in?transaction_id=${_tran.id}`;
            await Promise.all([loadSlipImage(slipUrl), print_slip_pay(slipUrl)]);
            play_sound("01");

            await unity.delay(800);
            await deviceAppService.openGate();
            clear_transaction();
        } else {
            unity.showToastNotification({ type: "error", msg: respond?.msg || "Check-in transaction failed" });
            play_sound("05");
        }
    } catch (err) {
        console.error("confirm_transaction error:", err);
        unity.showToastNotification({ type: "error", msg: "Transaction failed: " + (err.message || "") });
        play_sound("05");
    } finally {
        setTimeout(() => {
            KIOSK_APP.is_processing = false;
        }, 500);
    }
}
window.confirm_transaction = confirm_transaction;

/**
 * 🎫 Fast Slip Print Trigger (Hardware Switch 0)
 */
export async function call_slip_transaction() {
    const input_license_car = KIOSK_APP.input_license_car?.textContent || "";
    const transaction_data = {
        date_time: new Date().toISOString(),
        license: input_license_car === "xx-xxxx" ? "" : input_license_car,
        objective_id: null,
        member_user_id: null,
        vehicle_type_id: KIOSK_APP.car_type || null,
        visitor_name: "",
    };
    try {
        await confirm_transaction(transaction_data);
    } catch (e) {
        play_sound("05");
        console.error("call_slip_transaction error:", e);
        KIOSK_APP.is_processing = false;
    }
}
window.call_slip_transaction = call_slip_transaction;

export async function print_slip_pay(source = KIOSK_APP.slip_in_image) {
    unity.showToastNotification({ msg: "Printing entry slip..." });
    const respond = await deviceAppService.printImage(source);
    if (!respond?.success) {
        unity.showToastNotification({ type: "error", msg: "Print Slip Error" });
    }
}

export async function printer_test() {
    resetIdleTimer();
    const slipInUrl = `/static/image/Testprint.jpg`;
    await Promise.all([loadSlipImage(slipInUrl), print_slip_pay(slipInUrl)]);
}
window.printer_test = printer_test;

export async function open_test_relay() {
    resetIdleTimer();
    unity.showToastNotification({
        type: "info",
        msg: `<div class="text-lg font-bold">🚧 กำลังส่งสัญญาณเปิดไม้กั้น... (Triggering Barrier Gate...)</div>`,
    });

    try {
        const result = await deviceAppService.openGate();
        if (result?.success || result) {
            unity.showToastNotification({
                type: "success",
                title: "Barrier Gate Open",
                msg: `<div class="text-xl sm:text-2xl font-bold">✅ สั่งเปิดไม้กั้นเรียบร้อยแล้ว<br><span class="text-xs sm:text-sm font-semibold opacity-80">Barrier Gate Relay 1 Triggered Successfully</span></div>`,
            });
        } else {
            unity.showToastNotification({
                type: "error",
                title: "Relay Error",
                msg: `<div class="text-xl sm:text-2xl font-bold">❌ สั่งเปิดไม้กั้นไม่สำเร็จ<br><span class="text-xs sm:text-sm font-semibold opacity-80">Please check Hardware Service / Relay 1 Connection</span></div>`,
            });
        }
    } catch (err) {
        console.error("open_test_relay error:", err);
        unity.showToastNotification({
            type: "error",
            title: "Relay Error",
            msg: `<div class="text-xl font-bold">❌ เกิดข้อผิดพลาด: ${err.message || "Connection Error"}</div>`,
        });
    }
}
window.open_test_relay = open_test_relay;

/**
 * 🪪 Smart Card / VMS Visitor Submit
 */
export async function vms_submit() {
    resetIdleTimer();
    if (typeof Dialog_KIOSK_VMS_Proseecss === "undefined" || !Dialog_KIOSK_VMS_Proseecss) return;

    const card_id = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="id_card"]')?.innerText;
    const visitor_name = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="visitor_name"]')?.value;
    const vehicle_type_id = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="vehicle_type"]')?.value;
    const member_user_id = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="contact_name"]')?.value;
    const objective_id = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="objective"]')?.value;
    const licence_plate = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="licence_plate"]')?.innerText;

    if (card_id && vehicle_type_id && member_user_id && visitor_name && objective_id) {
        const transaction_data = {
            date_time: new Date().toISOString(),
            license: licence_plate || card_id,
            visitor_name: visitor_name,
            vehicle_type_id: vehicle_type_id,
            objective_id: objective_id,
            member_user_id: member_user_id,
        };

        Dialog_KIOSK_VMS_Proseecss.close();

        // Show prompt to remove smart card with 30s safety timeout
        if (typeof Dialog_KIOSK_Smart_Card_Wait_Remove !== "undefined" && Dialog_KIOSK_Smart_Card_Wait_Remove) {
            Dialog_KIOSK_Smart_Card_Wait_Remove.showModal();
            let waitSeconds = 0;
            while (Dialog_KIOSK_Smart_Card_Wait_Remove.open && waitSeconds < 30) {
                await unity.delay(500);
                waitSeconds += 0.5;
            }
            if (Dialog_KIOSK_Smart_Card_Wait_Remove.open) {
                Dialog_KIOSK_Smart_Card_Wait_Remove.close();
            }
        }

        // Clean up ObjectURL memory
        if (vmsCardBlobUrl) {
            URL.revokeObjectURL(vmsCardBlobUrl);
            vmsCardBlobUrl = null;
        }

        await confirm_transaction(transaction_data);
    } else {
        unity.showDialogWarning({ type: "warning", msg: "Please fill in all required fields" });
    }
}
window.vms_submit = vms_submit;

/**
 * ⚙️ Master Data & Gateway Setup
 */
export async function setting_gate_way() {
    unity.logger.info("⚙️ Initializing Kiosk gateway master data...");
    try {
        const [resFees, resUsers, resObjectives, resVehicles] = await Promise.allSettled([
            unity.fetchApi("/api/service_fees", "get", null, "json"),
            unity.fetchApi("/api/member/user", "get", null, "json"),
            unity.fetchApi("/api/objective", "get", null, "json"),
            unity.fetchApi("/api/vehicle_type", "get", null, "json"),
        ]);

        if (resFees.status === "fulfilled" && resFees.value?.success) {
            SERVICES_FEES_LIST = resFees.value.data;
        }

        if (resUsers.status === "fulfilled" && resUsers.value?.success && Array.isArray(resUsers.value.data)) {
            const sortedData = resUsers.value.data.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            CONTACT_LIST = sortedData.map((d) => ({
                id: d.id,
                value: d.name,
            }));

            const memberUsers = sortedData;
            const selectors = [
                typeof Dialog_KIOSK_VMS_Proseecss !== "undefined"
                    ? Dialog_KIOSK_VMS_Proseecss?.querySelector('[data-field="contact_name"]')
                    : null,
                typeof Dialog_Confirm_Transaction !== "undefined"
                    ? Dialog_Confirm_Transaction?.querySelector('[data-field="contact_name"]')
                    : null,
            ].filter(Boolean);

            let optionsHtml = `<option value="" disabled selected>-- Select Destination / Room --</option>`;
            optionsHtml += memberUsers.map((u) => `<option value="${u.id}">${u.name}</option>`).join("");
            selectors.forEach((select) => {
                select.innerHTML = optionsHtml;
            });
        }

        if (
            resObjectives.status === "fulfilled" &&
            resObjectives.value?.success &&
            Array.isArray(resObjectives.value.data)
        ) {
            const objectiveTypes = resObjectives.value.data;
            const selectors = [
                typeof Dialog_KIOSK_VMS_Proseecss !== "undefined"
                    ? Dialog_KIOSK_VMS_Proseecss?.querySelector('[data-field="objective"]')
                    : null,
                typeof Dialog_Confirm_Transaction !== "undefined"
                    ? Dialog_Confirm_Transaction?.querySelector('[data-field="objective"]')
                    : null,
            ].filter(Boolean);

            let optionsHtml = `<option value="" disabled selected>-- Select Purpose --</option>`;
            optionsHtml += objectiveTypes.map((obj) => `<option value="${obj.id}">${obj.name}</option>`).join("");
            selectors.forEach((select) => {
                select.innerHTML = optionsHtml;
            });
        }

        if (resVehicles.status === "fulfilled" && resVehicles.value?.success && Array.isArray(resVehicles.value.data)) {
            const vehicleTypes = resVehicles.value.data;
            const selectors = [
                typeof Dialog_KIOSK_VMS_Proseecss !== "undefined"
                    ? Dialog_KIOSK_VMS_Proseecss?.querySelector('[data-field="vehicle_type"]')
                    : null,
                typeof Dialog_Confirm_Transaction !== "undefined"
                    ? Dialog_Confirm_Transaction?.querySelector('[data-field="vehicle_type"]')
                    : null,
            ].filter(Boolean);

            let optionsHtml = `<option value="" disabled selected>-- Select Vehicle Type --</option>`;
            optionsHtml += vehicleTypes.map((type) => `<option value="${type.id}">${type.name}</option>`).join("");
            selectors.forEach((select) => {
                select.innerHTML = optionsHtml;
            });
        }
    } catch (err) {
        console.error("setting_gate_way initialization error:", err);
    }
}

/**
 * 🖨️ Printer Status Handler with State-Transition Detection
 */
export function update_printer_status(resOrConnected, optionalPaper = null) {
    const { isConnected, paperStatus } = extractPrinterStatus(resOrConnected, optionalPaper);
    const isPaperOk = paperStatus > 0;
    const isReady = isConnected && isPaperOk;

    let statusLabel = "Printer Ready";
    let dotColorClass = "bg-success";

    if (!isConnected) {
        statusLabel = "Disconnected";
        dotColorClass = "bg-error animate-pulse";
    } else if (paperStatus === 0) {
        statusLabel = "Paper Out / Open";
        dotColorClass = "bg-error animate-pulse";
    } else if (paperStatus === 1) {
        statusLabel = "Paper Low";
        dotColorClass = "bg-warning";
    } else {
        statusLabel = "Printer Ready";
        dotColorClass = "bg-success";
    }

    console.log(
        `🖨️ [update_printer_status] ${statusLabel} | Connected: ${isConnected}, Paper: ${paperStatus}, Ready: ${isReady}`,
    );

    const printerEl = KIOSK_APP.printer_status || document.querySelector('[data-field="printer_status"]');
    if (printerEl) {
        printerEl.textContent = statusLabel;
    }

    const dot =
        document.getElementById("printer_indicator_dot") || printerEl?.parentElement?.querySelector(".rounded-full");
    if (dot) {
        dot.className = `w-3 h-3 rounded-full ${dotColorClass} inline-block`;
    }

    KIOSK_APP.printer_ready = isReady;

    // Only react when readiness state changes to prevent spamming
    if (lastPrinterReadyState === isReady) return;
    lastPrinterReadyState = isReady;

    if (isReady) {
        console.log("✅ [update_printer_status] Printer is READY");
        if (intervalId_printer_status) {
            clearInterval(intervalId_printer_status);
            intervalId_printer_status = null;
        }
        if (typeof Dialog_Error !== "undefined" && Dialog_Error?.open) {
            Dialog_Error.close();
        }
    } else {
        console.warn("⚠️ [update_printer_status] Printer NOT READY:", statusLabel);
        if (intervalId_printer_status) {
            clearInterval(intervalId_printer_status);
            intervalId_printer_status = null;
        }

        unity.showToastNotification({ type: "warning", msg: `Printer Alert: ${statusLabel}` });

        unity.showDialogError({
            title: "Printer Alert",
            msg: `<div class="text-2xl font-bold">Printer Status: ${statusLabel}<br>กรุณาตรวจสอบม้วนกระดาษพิมพ์หรือการเชื่อมต่อ</div>`,
        });

        intervalId_printer_status = setInterval(() => {
            if (!KIOSK_APP.printer_ready) {
                play_sound("05");
            } else {
                clearInterval(intervalId_printer_status);
                intervalId_printer_status = null;
            }
        }, 30000);
    }
}

export async function pollPrinterStatus() {
    try {
        // console.log("🔄 [pollPrinterStatus] Polling printer status...");
        const result = await deviceAppService.getPrinterStatus();
        update_printer_status(result);
    } catch (error) {
        console.error("❌ [pollPrinterStatus] Error:", error);
        update_printer_status(false, 0);
    } finally {
        setTimeout(pollPrinterStatus, 15000);
    }
}

/**
 * 🎛️ Hardware Switch & Loop Sensor Events
 */
export async function sw_event(sw) {
    if (!sw) return;
    resetIdleTimer();

    switch_data = sw;

    const isLoop1 = Boolean(sw[1]);
    const isLoop2 = Boolean(sw[2]);

    if (isLoop1 && isLoop2) {
        KIOSK_APP.car_type = 2;
    } else if (isLoop1 || isLoop2) {
        KIOSK_APP.car_type = 1;
    } else {
        KIOSK_APP.car_type = 0;
    }

    if (KIOSK_APP.input_type_car) {
        switch (KIOSK_APP.car_type) {
            case 0:
                KIOSK_APP.input_type_car.innerText = "NO VEHICLE";
                break;
            case 1:
                KIOSK_APP.input_type_car.innerText = "MOTORCYCLE";
                break;
            case 2:
                KIOSK_APP.input_type_car.innerText = "CAR (รถยนต์)";
                break;
        }
    }

    if (KIOSK_APP.loop_status) {
        if (sw[1] && sw[2]) {
            KIOSK_APP.loop_status.textContent = "Car-2 Loop";
        } else if (sw[1] || sw[2]) {
            KIOSK_APP.loop_status.textContent = "Car Detected";
        } else {
            KIOSK_APP.loop_status.textContent = "NO VEHICLE";
        }
    }

    if (sw[0]) {
        await call_slip_transaction();
    }
}

async function init_status() {
    const swRes = await deviceAppService.getSwitchStatus();
    if (swRes?.success && swRes.data) {
        sw_event(swRes.data);
    }
}

/**
 * 🔌 Hardware WebSocket Client Connection
 */
new unity.WebSocketClient(async (e) => {
    if (!e) return;

    if (e.type === "event") {
        if (e.hw === "printer") {
            const data = e.data;
            console.log("🖨️ [WebSocket] Printer Event Data:", data);
            update_printer_status(data);
        } else if (e.hw === "switch") {
            sw_event(e.data);
        } else if (e.hw === "smart_card_reader") {
            const data = e.data;
            if (data && typeof data === "object" && Object.keys(data).length > 0) {
                resetIdleTimer();
                window.kioskScreensaver?.wakeUp();

                if (KIOSK_APP.car_type === 0) {
                    unity.showToastNotification({ type: "warning", msg: "Vehicle not detected on loop sensor" });
                    return;
                }

                const visitor_name = data.TH_Fullname || `${data.th_first || ""} ${data.th_last || ""}`.trim();

                if (deviceAppService.snapshot_01) {
                    const snap = await deviceAppService.snapshot(1);
                    if (snap && typeof Dialog_KIOSK_VMS_Proseecss !== "undefined") {
                        const img = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="gate_in_image_01"]');
                        if (img) {
                            if (vmsCardBlobUrl) URL.revokeObjectURL(vmsCardBlobUrl);
                            vmsCardBlobUrl = URL.createObjectURL(snap);
                            img.src = vmsCardBlobUrl;
                        }
                    }
                }

                if (typeof Dialog_KIOSK_VMS_Proseecss !== "undefined" && Dialog_KIOSK_VMS_Proseecss) {
                    const idCard = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="id_card"]');
                    const vName = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="visitor_name"]');
                    const plate = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="licence_plate"]');

                    if (idCard) idCard.innerText = data.CID || data.cid || "";
                    if (vName) vName.value = visitor_name;
                    if (plate) plate.innerText = KIOSK_APP.input_license_car?.innerText || "";

                    Dialog_KIOSK_VMS_Proseecss.showModal();
                }
            } else {
                unity.showToastNotification({ type: "info", msg: "Smart Card removed" });
                if (
                    typeof Dialog_KIOSK_Smart_Card_Wait_Remove !== "undefined" &&
                    Dialog_KIOSK_Smart_Card_Wait_Remove?.open
                ) {
                    Dialog_KIOSK_Smart_Card_Wait_Remove.close();
                } else if (typeof Dialog_KIOSK_VMS_Proseecss !== "undefined" && Dialog_KIOSK_VMS_Proseecss?.open) {
                    Dialog_KIOSK_VMS_Proseecss.close();
                }
            }
        }
    } else if (e.type === "cmd") {
        if (e.data === "RELOAD") {
            window.location.reload();
        }
    }

    if (e.func === "event_data") {
        try {
            const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
            resetIdleTimer();
            window.kioskScreensaver?.wakeUp();

            if (!unity.isScreenReady()) {
                console.log("🟡 Dialog is open, holding LPR screen update");
                return;
            }

            if (data?.license) {
                if (KIOSK_APP.input_license_car) KIOSK_APP.input_license_car.innerText = data.license;

                if (data.image_path) {
                    const paths = data.image_path.split(",");
                    if (paths.length >= 2) {
                        if (paths[1] && KIOSK_APP.lpr_image_01) KIOSK_APP.lpr_image_01.src = paths[1];
                        if (paths[0] && KIOSK_APP.lpr_image_02) KIOSK_APP.lpr_image_02.src = paths[0];
                    } else if (paths.length === 1 && paths[0]) {
                        if (KIOSK_APP.lpr_image_01) KIOSK_APP.lpr_image_01.src = paths[0];
                        if (KIOSK_APP.lpr_image_02) KIOSK_APP.lpr_image_02.src = paths[0];
                    }
                }

                KIOSK_APP.last_lpr_data.license = data.license;
                KIOSK_APP.last_lpr_data.image_path = data.image_path;
                KIOSK_APP.last_lpr_data.timestamp = Math.floor(Date.now() / 1000);

                clearLprTimers();

                // Reminder Voice Prompt after 10s
                lprSoundTimer = setTimeout(() => {
                    if (!unity.isScreenReady()) return;
                    play_sound("06");

                    // Auto-Clear LPR Display after 20s if no interaction
                    lprClearTimer = setTimeout(() => {
                        if (!unity.isScreenReady()) return;
                        clear_lpr_data();
                    }, LPR_AUTOCLEAR_DELAY_MS);
                }, LPR_REMINDER_DELAY_MS);
            }
        } catch (err) {
            console.error("event_data parse error:", err);
        }
    }
}, HOST_HW_SERVICE);

window.kioskScreensaver = null;

/**
 * 🔒 Screen Idle Security Auto-Reload (30 mins)
 */
function checkIdleReload() {
    idleMinutes++;
    const hasOpenDialog = !!document.querySelector("dialog[open]");
    const isCarPresent = KIOSK_APP.car_type > 0;
    const isBusy = KIOSK_APP.is_processing;

    if (idleMinutes >= IDLE_LIMIT_MINUTES && !hasOpenDialog && !isCarPresent && !isBusy) {
        console.log("🔄 Kiosk reached 30 mins idle threshold. Auto-reloading for clean memory...");
        window.location.reload();
    }
}

export function resetIdleTimer() {
    idleMinutes = 0;
}
window.resetIdleTimer = resetIdleTimer;

// DOM Content Loaded Initializer
document.addEventListener("DOMContentLoaded", async () => {
    await unity.initI18n();
    await deviceAppService.init();
    await init_status();
    await KIOSK_APP.init();
    await setting_gate_way();
    pollPrinterStatus();

    // 🌙 Initialize Screensaver Manager (60s idle timeout)
    window.kioskScreensaver = new KioskScreensaverManager(60);

    // Track user interaction for 30m idle reload
    setInterval(checkIdleReload, 60000);
    ["pointerdown", "touchstart", "click", "keypress"].forEach((evt) => {
        window.addEventListener(evt, resetIdleTimer, { passive: true });
    });
});
