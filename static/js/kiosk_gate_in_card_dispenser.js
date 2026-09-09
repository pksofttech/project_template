import * as unity from "./unity.js";
import { DeviceAppService } from "./_DeviceAppService.js";
console.log("********************************************");
console.log("    load script station_kiosk_auto_gate_in.js");
console.log(`   💡 SYSTEM_USER      : ${SYSTEM_USER}`);
console.log(`   💡 KIOSK_NAME       : ${KIOSK_NAME}`);
console.log(`   💡 GATE_WAY_ID      : ${GATE_WAY_ID}`);
console.log(`   💡 GATE_WAY_NAME    : ${GATE_WAY_NAME}`);
console.log(`   💡 DEVICE_TYPE      : ${DEVICE_TYPE}`);
console.log(`   💡 DEVICE_MODE      : ${DEVICE_MODE}`);
console.log("********************************************");

const DEFAULT_LPR_IMAGE = "/static/data_base/image/app_configurations/app_configurations_image.jpg";
const TEST_MODE = false;
const TEST_CARD = false;
let SERVICES_FEES_LIST = null;
let CARD_READY = false;
const CONTACT_LIST = [];

const deviceAppService = new DeviceAppService();

function showToastNotification(data) {
    console.log(data);
    unity.showToastNotification({ type: data.type, msg: `<div class="text-5xl ">${data.msg}</div>` });
}

function parse_card_id(value, fallback = 0) {
    if (value === null || value === undefined) return fallback;

    // Extract numeric digits only
    const digits = String(value).replace(/[^\d]/g, "");
    if (!digits) return fallback;

    // Parse base-10 integer
    const n = Number.parseInt(digits, 10);

    // Prevent NaN or negative values
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const page_kiosk = document.body;
const KIOSK_APP = {
    device_name: KIOSK_NAME,
    gate_name: GATE_WAY_NAME,
    gateway_id: GATE_WAY_ID,
    server_status: page_kiosk.querySelector('[data-field="server_status"]'),
    input_objective: page_kiosk.querySelector('[data-field="input_objective"]'),
    input_contact: page_kiosk.querySelector('[data-field="input_contact"]'),
    slip_in_image: page_kiosk.querySelector('[data-field="slip_in_image"]'),
    lpr_image_01: page_kiosk.querySelector('[data-field="lpr_image_01"]'),
    lpr_image_02: page_kiosk.querySelector('[data-field="lpr_image_02"]'),
    input_type_car: page_kiosk.querySelector('[data-field="input_type_car"]'),
    input_license_car: page_kiosk.querySelector('[data-field="input_license_car"]'),
    car_type: 0,
    dispenser_active: page_kiosk.querySelector('[data-field="dispenser_active"]'),
    dispenser_state: page_kiosk.querySelector('[data-field="dispenser_state"]'),
    dispenser_card_id: page_kiosk.querySelector('[data-field="dispenser_card_id"]'),
    last_lpr_data: { license: "", image_path: "", timestamp: null },
    is_processing: false,
    is_cancel: false,
    tray_active: 1,

    _sendDispenserControl: async function (cmd, option = null) {
        const result = await deviceAppService.sendDispenserControl(cmd, option);
        if (result) {
            if (result.data) {
                console.log("🟡 sendDispenserControl", cmd, result.data.state);
                this.dispenser_state.textContent = result.data.state;
            }
            return result;
        }
        console.log("🔴 sendDispenserControl", cmd);
        return null;
    },
    _sendDispenserCmd: async function (cmd) {
        return await deviceAppService.sendDispenserCmd(cmd);
    },
    refresh_state: async function () {
        this._sendDispenserControl("STATUS");
    },

    // For card dispenser to ready to read card
    dispenser_to_ready: async function () {
        CARD_READY = false;
        console.log("✅ start dispenser_to_ready : Tray Active " + this.tray_active);
        this.dispenser_card_id.textContent = "wait card...";

        // ! For test
        // setTimeout(() => {
        //     console.log("⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ test_card ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️");
        //     test_card();
        // }, 1000);

        // let read_count = 0;
        let is_ready = false;
        // ? Loop process card
        await this._sendDispenserControl("STATUS");
        let loop_count = 0;
        while (true) {
            let result = null;
            result = await this._sendDispenserControl("AT_READER");
            console.log("🟢 dispenser_to_ready", result.success, result.data.state);
            if (result.success && result.data.state == "AT_READER") {
                await unity.delay(500);
                if (parse_card_id(this.dispenser_card_id.textContent) > 0) {
                    const check_in_data = await unity.fetchApi(
                        `/api/function/check_in?card_id=${this.dispenser_card_id.textContent}`,
                        "get",
                        null,
                        "json",
                    );
                    if (check_in_data.transaction) {
                        unity.showToastNotification({
                            type: "warning",
                            title: "Warning",
                            msg: `Card already has an active entry transaction`,
                        });
                        console.log("🔴 dispenser_to_ready: Card already has an active entry transaction");
                        this.dispenser_card_id.textContent = "wait card...";
                        await this._sendDispenserCmd("CAPTURE");
                    } else {
                        console.log("🟢 dispenser_to_ready", this.dispenser_card_id.textContent);
                        is_ready = true;
                        break;
                    }
                } else {
                    console.log("🔴 dispenser_to_ready : Not Read Card ISSUING");
                    await this._sendDispenserCmd("CAPTURE");
                    await unity.delay(3000);
                }
            }
            if (result.data.state == "EMPTY") {
                console.log("🚨 dispenser_to_ready : EMPTY Tray : " + this.tray_active);
                this.tray_active = this.tray_active == 1 ? 2 : 1;
                await this._sendDispenserControl("TRAY_ACTIVE", this.tray_active);
                console.log("⚡ dispenser_to_ready : EMPTY Tray : " + this.tray_active);
                this.dispenser_active.textContent = this.tray_active;
                play_sound("05");
                await unity.delay(5000);
                // break;
            }

            loop_count++;
            if (loop_count > 10) {
                console.log("🔴 dispenser_to_ready");
                this.dispenser_card_id.textContent = "dispenser error";
                // Fix test
                window.location.reload();
                return false;
            }
            await unity.delay(250);
        }
        console.log("✅ end dispenser_to_ready", is_ready);

        // ! For Test
        // if (TEST_MODE) {
        //     if (is_ready) {
        //         setTimeout(() => {
        //             console.log("⚠️⚠️⚠️⚠️⚠️⚠️  auto dispenser_card   ⚠️⚠️⚠️⚠️⚠️⚠️⚠️");
        //             dispenser_card(0);
        //         }, 3000);
        //     }
        // }

        this.is_cancel = false;
        this.is_processing = false;
        CARD_READY = true;
        return is_ready;
    },

    // Issue card via dispenser
    dispenser_card: async function () {
        const model = Dialog_Confirm_Transaction;
        async function snap_img() {
            if (deviceAppService.snapshot_01) {
                const dataUrl = await deviceAppService.snapshot(1);
                if (dataUrl) {
                    // showToastNotification({ icon: "info", msg: "Successful :snapshot" });
                    model.querySelector('[data-field="image01"]').src = dataUrl;
                }
            }
        }
        if (!this.is_processing) {
            // snap_img();
            let success = false;
            let result = await this._sendDispenserControl("STATUS");
            console.log("result", result);
            if (result.success) {
                if (result.data.state == "AT_READER") {
                    // success = await this.dispenser_to_ready();
                    success = true;
                } else {
                    await unity.delay(500);
                    success = await this.dispenser_to_ready();
                }
            }
            if (!success) {
                showToastNotification({ type: "error", msg: "Card dispenser error" });
                return;
            }
            this.is_processing = true;
            console.log("start dispenser_card", this.is_processing);
            model.querySelector('[data-field="date"]').textContent = unity.dateTimeToStr(new Date());
            model.querySelector('[data-field="licence"]').textContent = KIOSK_APP.input_license_car.innerText;
            const time_out = 10;
            let wait_time = 0;
            let state = "AT_MOUTH";
            model.querySelector('[data-field="progress_bar"]').value = 100;
            this.is_cancel = false;
            play_sound("01");
            // Card dispenser issuance logic (Bypass)
            result = await this._sendDispenserControl("AT_MOUTH");
            console.log("result", result.data.state);
            // await unity.delay(250);

            if (state == "AT_MOUTH") {
                console.log("✅ AT_MOUTH Show Modal");
                model.showModal();
                while (time_out + 3 > wait_time) {
                    if (this.is_cancel) {
                        console.log("cancel dispenser_card");
                        break;
                    }
                    wait_time++;
                    await unity.delay(1000);
                    result = await this._sendDispenserControl("STATUS");
                    if (result.success) {
                        state = result.data.state;
                        if (result.data.state != "AT_MOUTH") {
                            break;
                        }
                    }
                    model.querySelector('[data-field="progress_bar"]').value =
                        ((time_out - wait_time) / time_out) * 100;
                }
                if (state == "AT_MOUTH") {
                    result = await this._sendDispenserControl("RESET");
                    play_sound("09");
                    console.log("🔴 dispenser_card: Card not retrieved in time");
                    this.is_processing = false;
                    model.close();
                    return;
                }
            }
            model.close();

            console.log("🟢 dispenser_card: Card retrieved, processing transaction");
            play_sound("success_card");
            const success_transaction = await confirm_transaction();
            showToastNotification({
                icon: "success",
                msg: `Get Card Success :${this.dispenser_card_id.textContent}`,
            });
            this.dispenser_to_ready();

            unity.delay(500);
            this.is_processing = false;
        } else {
            console.log("is_processing");
        }
    },

    dispanser_cancel: async function () {
        this.is_cancel = true;
    },
};

const SOUND_PATH = `/static/sound/`;
const SOUNDS = {};
const SOUND_LIST = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09"];

const SOUND_DRIVER = "DEVICE";
if (SOUND_DRIVER !== "DEVICE") {
    for (const _s of SOUND_LIST) {
        console.log(_s);
        SOUNDS[_s] = new Howl({
            src: [`${SOUND_PATH}${_s}.mp3`],
        });
    }
}
function play_sound(sound) {
    if (SOUND_DRIVER == "DEVICE") {
        const index_SOUND_LIST = SOUND_LIST.indexOf(sound);
        deviceAppService.playSound(`sound_0${index_SOUND_LIST}`);
        return;
    }
    if (SOUND_LIST.includes(sound)) {
        SOUNDS[sound].play();
    } else {
        unity.logger.warn("No Sound :" + sound);
    }
}

async function dispenser_ready() {
    const respond = await deviceAppService.sendDispenserControl("STATUS");
    if (respond.data.state == "AT_READER") {
        return true;
    }
    await dispenser_to_ready();
    showToastNotification({
        type: "warning",
        msg: `<div class="text-3xl">Card Dispenser Unavailable<br>Sorry, card dispenser system error. Unable to proceed.</div>`,
    });
    play_sound("05");
    return false;
}

window.submit_gate_in = submit_gate_in;
async function submit_gate_in(objective, contact) {
    play_sound("02");

    Dialog_Confirm_Transaction.querySelector('[data-field="image"]').src = KIOSK_APP.input_image_car.src;
    Dialog_Confirm_Transaction.querySelector('[data-field="vehicle_type"]').innerText =
        KIOSK_APP.input_type_car.innerText;
    Dialog_Confirm_Transaction.querySelector('[data-field="date"]').innerText = unity.dateTimeToStr(new Date());
    Dialog_Confirm_Transaction.querySelector('[data-field="licence"]').innerText =
        KIOSK_APP.input_license_car.innerText;

    Dialog_Confirm_Transaction.querySelector('[data-field="objective"]').innerText = objective;
    Dialog_Confirm_Transaction.querySelector('[data-field="contact"]').innerText = contact;
    Dialog_Confirm_Transaction.querySelector('[data-field="staff"]').innerText = KIOSK_APP.device_name;
    Dialog_Confirm_Transaction.querySelector('[data-field="gate"]').innerText = KIOSK_APP.gate_name;
    Dialog_Confirm_Transaction.showModal();
    // deviceAppService.active_relay1();
}

window.clear_transaction = clear_transaction;
function clear_transaction() {
    console.log("clear_transaction");
    KIOSK_APP.input_type_car.innerText = "";
    KIOSK_APP.input_license_car.innerText = "";
}

let is_processing = false;
window.confirm_transaction = confirm_transaction;
async function confirm_transaction(v) {
    const card_id = KIOSK_APP.dispenser_card_id.textContent;
    const license = KIOSK_APP.input_license_car.textContent || "";

    if (!card_id) {
        showToastNotification({ icon: "error", msg: "not Card ID" });
        return;
    }

    let service_fees_id = 1;
    switch (KIOSK_APP.car_type) {
        case 1:
            service_fees_id = 3;
            break;
        case 2:
            service_fees_id = 2;
            break;
        default:
            break;
    }

    is_processing = true;

    const formData = new FormData();

    formData.append("card_id", card_id);
    formData.append("license", license);
    formData.append("service_fees_id", service_fees_id);
    formData.append("gateway_id", KIOSK_APP.gateway_id);
    formData.append("remark", `Kiosk : ${KIOSK_APP.device_name}`);

    // license from lpr
    if (license) {
        const image_upload_01 = await unity.dataURLtoFile(KIOSK_APP.lpr_image_01.src, "image_upload_01");
        if (image_upload_01) {
            formData.append("image_upload_01", image_upload_01);
        }
        const image_upload_02 = await unity.dataURLtoFile(KIOSK_APP.lpr_image_02.src, "image_upload_02");
        if (image_upload_02) {
            formData.append("image_upload_02", image_upload_02);
        }
    }

    if (deviceAppService.snapshot_02) {
        const snapshot_02 = await deviceAppService.snapshot(2);
        if (snapshot_02) {
            const image_upload_03 = await unity.dataURLtoFile(snapshot_02, "image_upload_03");
            formData.append("image_upload_03", image_upload_03);
        }
    }

    unity.debugForm(formData);
    let totalSize = 0;
    for (let pair of formData.entries()) {
        if (pair[1] instanceof File) {
            totalSize += pair[1].size;
        }
    }
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`📦 FormData Size: ${sizeInMB} MB`);

    const respond = await unity.fetchApi("/api/function/check_in", "post", formData, "json");
    if (respond.success) {
        play_sound("04");
        const _tran = respond.data;
        console.log(respond);
        deviceAppService.openGate();
        Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="gate_in_image_01"]').src = "";
        Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="id_card"]').innerText = "";
        Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="contact_name"]').value = "";
        Dialog_KIOSK_VMS_Proseecss.close();
    } else {
        console.log(respond);
    }
    clear_transaction();
    return respond.success;
}

window.open_test_relay = open_test_relay;
async function open_test_relay(v) {
    deviceAppService.active_relay1();
}

async function loadSlipImage(url) {
    try {
        await new Promise((resolve, reject) => {
            KIOSK_APP.slip_in_image.src = url;
            KIOSK_APP.slip_in_image.onload = resolve; // Image loaded successfully
            KIOSK_APP.slip_in_image.onerror = () => reject(`Failed to load image for transaction ID: ${url}`);
        });

        console.log("Image loaded successfully");
    } catch (error) {
        unity.logger.error(error); // Log the error if image fails to load
        KIOSK_APP.slip_in_image.src = "/static/image/Image_not_available.png";
    }
}

async function print_slip_pay() {
    showToastNotification({ msg: "Printing slip in progress..." });
    const respond = await deviceAppService.printImage(KIOSK_APP.slip_in_image);
    console.log(respond);
    if (respond.success) {
        showToastNotification({ icon: "info", msg: "Successful :" + `${respond.msg}` });
    } else {
        showToastNotification({ icon: "error", msg: "printSlip Error" });
    }
}

window.printer_test = printer_test;
async function printer_test() {
    // const slipInUrl = `/api/function/slip_in?transaction_id=1`;
    const slipInUrl = `/static/image/Testprint.jpg`;
    await loadSlipImage(slipInUrl);
    print_slip_pay();
}

async function setting_gate_way() {
    // try {
    unity.logger.info("   setting_gate_way    ");
    let _result = await unity.fetchApi("/api/service_fees", "get", null, "json");
    if (_result.success) {
        SERVICES_FEES_LIST = _result.data;
        console.log("SERVICES_FEES_LIST", SERVICES_FEES_LIST);
    } else {
        unity.showDialogError({ title: "Invalid Service_Fees", msg: _result.msg });
    }
    _result = await unity.fetchApi("/api/member/user", "get", null, "json");
    if (_result.success) {
        const Member_Users = _result.data;
        Member_Users.forEach((d) => {
            const m = d.Member_User;
            // CONTACT_LIST.push(m.name);
        });
    }
    // console.log(CONTACT_LIST);

    const select = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="contact_name"]');

    if (select) {
        // console.log("select", select);
        // Build initial placeholder option
        let html = `<option value="" disabled selected>-- Select Visitor Type --</option>`;

        // Populate options from CONTACT_LIST
        html += CONTACT_LIST.map((d) => `<option value="${d}">${d}</option>`).join("");

        select.innerHTML = html;
    }
}

let intervalId_printer_status = null;
function update_printer_status(s, p) {
    let status = s == true ? "Connected" : "Disconnected";
    status += "<br>";
    status += p > 0 ? "Ok" : "EMPTY/OPENED";
    KIOSK_APP.printer_status.innerHTML = status;
    if (p == 0) {
        // KIOSK_APP.printer_ready = true;
        KIOSK_APP.printer_ready = false;

        clearInterval(intervalId_printer_status);
        showToastNotification({ icon: "warning", msg: "Printer Not Connect" });
        play_sound("05");

        unity.showDialogError({
            title: "Printer Not Ready",
            msg: `<div class="text-5xl">Printer is ${status}<br>Plese check printer/Paper<br>Sorry, printer system error. Unable to proceed.</div>`,
        });
        intervalId_printer_status = setInterval(() => {
            play_sound("05");
            unity.showDialogError({
                title: "Printer Not Ready",
                msg: `<div class="text-5xl">Printer is ${status}<br>Plese check printer/Paper<br>Sorry, printer system error. Unable to proceed.</div>`,
            });
        }, 30000);
    } else {
        clearInterval(intervalId_printer_status);
        KIOSK_APP.printer_ready = true;
        unity.clear_dialog();
    }
}

window.vms_submit = vms_submit;
async function vms_submit() {
    const card_id = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="id_card"]').innerText;
    const vehicle_type = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="vehicle_type"]').value;
    const visitor_name = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="visitor_name"]').value;
    const contact_name = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="contact_name"]').value;
    const objective = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="objective"]').value;

    const licence_plate = Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="licence_plate"]').innerText;

    if (card_id && vehicle_type && contact_name && visitor_name && objective) {
        const transaction_data = {
            date_time: new Date().toISOString(),
            license: licence_plate ? licence_plate : card_id,
            visitor_name: visitor_name,
            vehicle_type: vehicle_type,
            objective: objective,
            contact: contact_name,
            snap_img: Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="gate_in_image_01"]'),
            // card_photo: Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="gate_in_image_01"]'),
        };
        Dialog_KIOSK_VMS_Proseecss.close();
        Dialog_KIOSK_Smart_Card_Wait_Remove.showModal();

        while (Dialog_KIOSK_Smart_Card_Wait_Remove.open) {
            await unity.delay(500);
        }
        await confirm_transaction(transaction_data);
    } else {
        unity.showDialogWarning({ icon: "warning", msg: "Please fill in all required fields" });
    }
}

function clear_lpr_data() {
    KIOSK_APP.lpr_image_01.src = DEFAULT_LPR_IMAGE;
    KIOSK_APP.lpr_image_02.src = DEFAULT_LPR_IMAGE;
    KIOSK_APP.input_type_car.innerText = "";
    KIOSK_APP.input_license_car.innerText = "";
}

let timer_event_lpr_send_card_Id = null;
let timer_event_clear_lpr_data = null;
const timer_event_lpr_send_card_time = 5000;
const timer_event_clear_lpr_data_time = 10000;
async function sw_event(sw) {
    console.log("sw_event", sw);
    const _car_type = KIOSK_APP.car_type;
    if (sw[1] & sw[2]) {
        // showToastNotification({ icon: "success", msg: "Car" });
        KIOSK_APP.car_type = 2;
    }
    if (sw[1] != sw[2]) {
        // showToastNotification({ icon: "success", msg: "Motorcycle" });
        KIOSK_APP.car_type = 1;
    }
    if (!sw[1] & !sw[2]) {
        // showToastNotification({ icon: "warning", msg: "Loop Not Detec" });
        KIOSK_APP.car_type = 0;
    }
    if (KIOSK_APP.car_type != _car_type) {
        switch (KIOSK_APP.car_type) {
            case 0:
                KIOSK_APP.input_type_car.innerHTML = "";
                KIOSK_APP.input_image_car.src =
                    "/static/data_base/image/app_configurations/app_configurations_image.jpg";
                KIOSK_APP.input_license_car.innerText = "";
                break;
            case 1:
                KIOSK_APP.input_type_car.innerHTML = "Motorcycle";
                break;
            case 2:
                KIOSK_APP.input_type_car.innerHTML = "Car";
                break;
            default:
                break;
        }
    }
    if (sw[0]) {
        if (CARD_READY) {
            await dispenser_card(0);
        }
    }
}

new unity.WebSocketClient(async (e) => {
    console.log(e);
    if (e.type == "event") {
        if (e.hw == "printer") {
            const data = e.data;
            update_printer_status(data[0], data[1]);
        } else if (e.hw == "switch") {
            const data = e.data;
            console.log(data);
            sw_event(data);
        } else if (e.hw == "smart_card_reader") {
            const data = e.data;
            console.log(data);
            if (data) {
                if (deviceAppService.snapshot_02) {
                    const snapshot_02 = await deviceAppService.snapshot(2);
                    if (snapshot_02) {
                        Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="gate_in_image_01"]').src = snapshot_02;
                        showToastNotification({ icon: "info", msg: "Successful :snapshot_02 " });
                    }
                }

                Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="id_card"]').innerText = data.CDI;
                Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="visitor_name"]').value = data.TH_Fullname;

                Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="licence_plate"]').innerText =
                    KIOSK_APP.input_license_car.innerText;

                Dialog_KIOSK_VMS_Proseecss.showModal();
            } else {
                showToastNotification({ icon: "info", msg: "smart_card_reader ready" });

                // unity.clear_dialog();
                if (Dialog_KIOSK_Smart_Card_Wait_Remove.open) {
                    Dialog_KIOSK_Smart_Card_Wait_Remove.close();
                } else {
                    Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="gate_in_image_01"]').src = "";
                    Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="id_card"]').innerText = "";
                    Dialog_KIOSK_VMS_Proseecss.querySelector('[data-field="contact_name"]').value = "";
                    Dialog_KIOSK_VMS_Proseecss.close();
                }
            }
        } else if (e.hw == "dispenser") {
            const data = e.data;
            console.log(data);
            const state = data.state;
            KIOSK_APP.dispenser_state.textContent = state;
        } else if (e.hw == "wg_reader") {
            const data = e.data;
            console.log(data);
            const card_id = data.id;
            KIOSK_APP.dispenser_card_id.textContent = card_id;
        }
    } else if (e.type == "cmd") {
        if (e.data == "RELOAD") {
            location.reload();
        }
    }
    if (e.func == "event_data") {
        const data = JSON.parse(e.data);
        console.log(data);
        console.log(data.license);
        if (!unity.isScreenReady()) {
            console.log("🟡 Dialog is open, processing transaction");
            return;
        }

        if (data.license) {
            KIOSK_APP.input_license_car.innerText = data.license;
            if (data.image_path) {
                const image_path = data.image_path.split(",");
                KIOSK_APP.lpr_image_01.src = image_path[1];
                KIOSK_APP.lpr_image_02.src = image_path[0];
            }
            if (timer_event_lpr_send_card_Id !== null) {
                clearTimeout(timer_event_lpr_send_card_Id);
            }
            timer_event_lpr_send_card_Id = setTimeout(() => {
                console.log("Executed");
                play_sound("06");
                if (timer_event_clear_lpr_data !== null) {
                    clearTimeout(timer_event_clear_lpr_data);
                }
                timer_event_clear_lpr_data = setTimeout(() => {
                    clear_lpr_data();
                }, timer_event_clear_lpr_data_time);
            }, timer_event_lpr_send_card_time);
        }
    }
}, "localhost:8080");

async function server_status() {
    const _response = await unity.fetchApi("/ping", "get", null, "json");
    if (!!_response) {
        if (_response.success) {
            console.log("pong");
            KIOSK_APP.server_status.innerHTML = `Online ${_response.date_time}<br><p class="text-sm">Server:${location.hostname}</p>`;
            return;
        }
    }
    console.log("disconnect");
    KIOSK_APP.server_status.innerHTML = "Unable to connect to server";
}

async function init_status() {
    const respond = await deviceAppService.getSwitchStatus();
    if (respond.success) {
        console.log(respond);
        // sw_event(respond.data);
    }
}

window.dispenser_card = dispenser_card;
async function dispenser_card(p) {
    console.log("dispenser_card", p);
    if (p == -1) {
        test_card();
        console.log("test dispenser_card");
        confirm_transaction();
        return;
    }
    await KIOSK_APP.dispenser_card(p);
}

window.dispanser_cancel = dispanser_cancel;
async function dispanser_cancel() {
    await KIOSK_APP.dispanser_cancel();
}

document.addEventListener("DOMContentLoaded", () => {
    deviceAppService.init();
    init_status();
    clear_lpr_data();

    if (KIOSK_APP.server_status) {
        server_status();
        setInterval(async () => {
            server_status();
        }, 60000);
    }

    KIOSK_APP.refresh_state();
    setTimeout(() => {
        KIOSK_APP.dispenser_to_ready();
    }, 1000);

    // setInterval(() => {
    //     KIOSK_APP.refresh_state();
    // }, 1000);
});

// Keyboard Wedge RFID/Barcode Scanner Listener
let CARD_ID_INPUT = "";
let clearTimer = null;

const AUTO_CLEAR_MS = 250; // Auto-clear timeout (ms)
const MIN_LEN = 4; // Minimum character threshold

function scheduleAutoClear() {
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
        CARD_ID_INPUT = "";
        // console.log("auto-clear");
    }, AUTO_CLEAR_MS);
}

document.addEventListener("keydown", (e) => {
    // Ignore keystrokes when typing in active inputs
    const tag = (e.target?.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;

    // Digits
    if (e.key >= "0" && e.key <= "9") {
        CARD_ID_INPUT += e.key;
        scheduleAutoClear();
        return;
    }

    // Backspace / delete one char
    if (e.key === "Backspace") {
        CARD_ID_INPUT = CARD_ID_INPUT.slice(0, -1);
        scheduleAutoClear();
        return;
    }

    // Enter = submit value
    if (e.key === "Enter") {
        e.preventDefault();

        const cardId = CARD_ID_INPUT.trim();
        if (cardId.length < MIN_LEN) {
            CARD_ID_INPUT = "";
            if (clearTimer) clearTimeout(clearTimer);
            return;
        }

        console.log("CARD_ID =", cardId);
        KIOSK_APP.dispenser_card_id.textContent = cardId;

        CARD_ID_INPUT = "";
        if (clearTimer) clearTimeout(clearTimer);
        return;
    }

    // Esc = Clear buffer immediately
    if (e.key === "Escape") {
        CARD_ID_INPUT = "";
        if (clearTimer) clearTimeout(clearTimer);
    }
});

window.test_card = test_card;
function test_card() {
    const randomNumber = Math.floor(Math.random() * 9000000000) + 1000000000;
    KIOSK_APP.dispenser_card_id.textContent = randomNumber;
}
