import * as unity from "./unity.js";
import { deviceAppService, DeviceAppService } from "./_DeviceAppService.js";
import { KioskScreensaverManager } from "./_KioskScreensaver.js";
import "./_KioskSecurity.js";
import { loadSlipImage, executePrintSlip, extractPrinterStatus } from "./_KioskSlipRenderer.js";

// 🌐 Centralized Multi-Language Delegation via Unity
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

const HOST_HW_SERVICE = "localhost:8080";
const HOST_HW_URL = `http://${HOST_HW_SERVICE}`;

const page_kiosk = document.body;
let isProcessingTransaction = false;
let currentPaymentSessionId = 0;
let serverStatusInterval = null;

const KIOSK_APP = {
    device_name: KIOSK_NAME,
    gate_name: GATE_WAY_NAME,
    gateway_id: GATE_WAY_ID,
    device_mode: DEVICE_MODE,
    device_type: DEVICE_TYPE,
    user_name: SYSTEM_USER,
    default_service_fee_id: "None",

    access_token: ACCESS_TOKEN,
    qrcode: new QRCode(Dialog_QR_Payment.querySelector('[data-field="qr_code"]'), {
        text: "https://home.pksofttech.org",
        width: 512,
        height: 512,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L,
    }),
    server_status: page_kiosk.querySelector('[data-field="server_status"]'),
    slip_pay_image: Dialog_Slip_Pay.querySelector('[data-field="slip_pay_image"]'),
    printer_status: page_kiosk.querySelector('[data-field="printer_status"]'),
    input_card_reader: page_kiosk.querySelector('[data-field="input_card_reader"]'),
    acc: null,
    loop_status: page_kiosk.querySelector('[data-field="loop_status"]'),
    loop_status_1: page_kiosk.querySelector('[data-field="loop_status_1"]'),
    loop_status_2: page_kiosk.querySelector('[data-field="loop_status_2"]'),
    loop_icon_box: page_kiosk.querySelector('[data-field="loop_icon_box"]'),
    qr_time_out: Dialog_QR_Payment.querySelector('[data-field="time_out"]'),
    qr_amount: Dialog_QR_Payment.querySelector('[data-field="qr_amount"]'),
    select_transaction_content: Dialog_Select_Transaction.querySelector('[data-field="content"]'),
    pay_transaction_content: Dialog_Pay_Transaction.querySelector('[data-field="content"]'),
    keyboard_preview: document.getElementById("onscreen_keyboard_preview"),
    temp_select: document.getElementById("template_content_select_transaction"),
    temp_pay: document.getElementById("template_content_pay_transaction"),
    temp_acc: document.getElementById("template_content_payment_data"),

    update_server_status: async function () {
        try {
            const _response = await unity.fetchApi("/ping", "get", null, "json");
            if (_response?.success && this.server_status) {
                this.server_status.innerHTML = `Online ${_response.date_time || ""}<br><p class="text-sm">Server:${location.hostname}</p>`;
                return;
            }
        } catch (e) {
            console.warn("Server ping error:", e);
        }
        if (this.server_status) {
            this.server_status.innerHTML = "Unable to connect to server";
        }
    },

    init: async function () {
        console.log("********************************************");
        console.log("    load script station_auto_gate_out.js");
        console.log(`   💡 SYSTEM_USER      : ${this.user_name}`);
        console.log(`   💡 KIOSK_NAME       : ${this.device_name}`);
        console.log(`   💡 GATE_WAY_ID      : ${this.gateway_id}`);
        console.log(`   💡 GATE_WAY_NAME    : ${this.gate_name}`);
        console.log(`   💡 DEVICE_TYPE      : ${this.device_type}`);
        console.log(`   💡 DEVICE_MODE      : ${this.device_mode}`);
        console.log(`   💡 SERVICE_FEE_ID   : ${this.default_service_fee_id}`);
        console.log("********************************************");
        deviceAppService.playSound("sound_00");
        if (this.server_status) {
            this.update_server_status();
            if (serverStatusInterval) {
                clearInterval(serverStatusInterval);
            }
            serverStatusInterval = setInterval(() => {
                this.update_server_status();
            }, 10000);
        }
    },
};

window.KIOSK_APP = KIOSK_APP;

const SOUND_DRIVER = "DEVICE";
const SOUND_PATH = `/static/sound/`;
const SOUNDS = {};
const SOUND_LIST = [
    "system_start",
    "beep_01",
    "system_process",
    "ticketNotFound",
    "success",
    "pay_cash",
    "pay_qr_code",
    "thank_no_slip",
    "thank_slip",
    "thank_vip",
    "good_bye",
];

if (SOUND_DRIVER !== "DEVICE") {
    for (const _s of SOUND_LIST) {
        unity.logger.debug(_s);
        SOUNDS[_s] = new Howl({
            src: [`${SOUND_PATH}${_s}.mp3`],
        });
    }
}

async function play_sound(sound) {
    console.log("Play Sound :" + sound);
    if (SOUND_DRIVER === "DEVICE") {
        const index_SOUND_LIST = SOUND_LIST.indexOf(sound);
        if (index_SOUND_LIST === -1) {
            console.warn("No Sound :" + sound);
            return;
        }
        const soundName = `sound_${String(index_SOUND_LIST).padStart(2, "0")}`;
        deviceAppService.playSound(soundName);
        return;
    }
    if (SOUND_LIST.includes(sound)) {
        SOUNDS[sound]?.play();
    } else {
        unity.logger.warn("No Sound :" + sound);
    }
}

window.handleBidyClick = handleBidyClick;
function handleBidyClick(e) {
    if (e && e.target) {
        if (e.target.closest("details, .dropdown, button, a, input, select, textarea, dialog, .btn, [role='button']")) {
            return;
        }
    }
    if (KIOSK_APP.input_card_reader && !document.querySelector("dialog[open]")) {
        KIOSK_APP.input_card_reader.focus();
    }
}

window.clear_input_licence = clear_input_licence;
function clear_input_licence() {
    if (typeof Dialog_Onscreen_Keyboard !== "undefined" && Dialog_Onscreen_Keyboard?.open) {
        Dialog_Onscreen_Keyboard.close();
    }
    if (KIOSK_APP.input_card_reader) {
        KIOSK_APP.input_card_reader.value = "";
        KIOSK_APP.input_card_reader.focus();
    }
}

window.submit_input_licence = submit_input_transaction;
async function submit_input_transaction(data = null, data_type = "card_id") {
    if (isProcessingTransaction) {
        console.warn("⚠️ Transaction already in progress, dropping duplicate request");
        return;
    }

    if (!unity.isScreenReady()) {
        if (typeof Dialog_Onscreen_Keyboard !== "undefined" && Dialog_Onscreen_Keyboard?.open) {
            Dialog_Onscreen_Keyboard.close();
        } else {
            console.warn("⚠️ Screen not ready (dialog open), dropping duplicate scan request");
            unity.showToastNotification({
                type: "warning",
                msg: getKioskText("transaction_in_progress") || "Please complete the current transaction first",
            });
            return;
        }
    }

    if (!data && KIOSK_APP.input_card_reader) {
        data = KIOSK_APP.input_card_reader.value;
    }
    data = (data || "").trim();
    if (!data) {
        unity.showToastNotification({
            msg: getKioskText("please_enter_plate"),
        });
        return;
    }

    isProcessingTransaction = true;
    console.log("🟢 Starting transaction", data, data_type);
    clear_input_licence();

    try {
        if (data_type === "card_id") {
            const card_ids = data.split(" ");
            if (card_ids.length > 1) {
                data = card_ids[1];
            }
        }
        const url_request = `/api/payment_transcation?${data_type}=${encodeURIComponent(data)}`;
        const respond = await unity.fetchApi(url_request, "get", null, "json");

        if (respond?.success) {
            let transaction_datas = respond.data || [];

            // 🔄 Smart Fallback: If searched by card_id and 0 records found, attempt search by licence
            if (transaction_datas.length === 0 && data_type === "card_id") {
                const fallback_url = `/api/payment_transcation?licence=${encodeURIComponent(data)}`;
                const fallback_reply = await unity.fetchApi(fallback_url, "get", null, "json");
                if (fallback_reply?.success && (fallback_reply.data || []).length > 0) {
                    transaction_datas = fallback_reply.data;
                }
            }

            if (transaction_datas.length === 0) {
                const html_data = `<div class="text-4xl text-center">No parking record found for searched plate<br>${data}<br>The registration record you are looking for was not found</div>`;
                unity.showToastNotification({ msg: html_data });
                play_sound("ticketNotFound");
                return;
            }

            if (transaction_datas.length === 1) {
                const _t = transaction_datas[0].Transaction_Record;
                await select_pay_card_id(_t.card_id);
            } else {
                const content_select = KIOSK_APP.select_transaction_content;
                if (!content_select) return;
                content_select.innerHTML = "";
                const temp = KIOSK_APP.temp_select;

                play_sound("select_card");
                for (const transaction_data of transaction_datas) {
                    const _t = transaction_data.Transaction_Record;
                    const _l = transaction_data.Log_Transaction || {};
                    const _c = temp.content.cloneNode(true);

                    _c.querySelector('[name="licence"]').textContent = _t.card_id;

                    const rawDate = _l.date_time || "";
                    const date_parts = rawDate.split(".")[0].split("T");
                    const date_time_in_html =
                        date_parts.length > 1 ? `${date_parts[0]}<br>${date_parts[1]}` : date_parts[0] || "-";
                    _c.querySelector('[name="datetime_in"]').innerHTML = `Entry DateTime:<br>${date_time_in_html}`;

                    const image_paths = (_l.images_path || "").split(",").filter(Boolean);
                    const img1 = _c.querySelector('[name="transaction_image01"]');
                    const img2 = _c.querySelector('[name="transaction_image02"]');
                    if (img1) img1.src = image_paths[0] || "/static/image/Image_not_available.png";
                    if (img2) img2.src = image_paths[1] || image_paths[0] || "/static/image/Image_not_available.png";

                    _c.querySelector('[name="select_btn_transaction"]')?.setAttribute(
                        "onclick",
                        `select_pay_transaction("${_t.card_id}");`,
                    );

                    content_select.appendChild(_c);
                }

                Dialog_Select_Transaction.showModal();
                updatePageContent(content_select);
            }
        } else {
            unity.showToastNotification({ type: "warning", msg: respond?.msg || "Transaction search failed" });
        }
    } catch (err) {
        console.error("submit_input_transaction error:", err);
        unity.showToastNotification({ type: "error", msg: "Transaction error: " + (err.message || "") });
    } finally {
        isProcessingTransaction = false;
    }
}

let payment_transacrion = null;
let currentSlipPayUrl = null;
let slipAutoCloseTimer = null;

function clearSlipAutoCloseTimer() {
    if (slipAutoCloseTimer) {
        clearTimeout(slipAutoCloseTimer);
        slipAutoCloseTimer = null;
    }
}

function startSlipAutoCloseTimer(seconds = 10) {
    clearSlipAutoCloseTimer();
    slipAutoCloseTimer = setTimeout(() => {
        if (typeof Dialog_Slip_Pay !== "undefined" && Dialog_Slip_Pay?.open) {
            Dialog_Slip_Pay.close();
        }
        currentSlipPayUrl = null;
    }, seconds * 1000);
}

window.clear_transaction = clear_transaction;
async function clear_transaction(get_card = false) {
    currentPaymentSessionId++;
    clearSlipAutoCloseTimer();
    if (typeof Dialog_Pay_Transaction !== "undefined" && Dialog_Pay_Transaction?.open) {
        Dialog_Pay_Transaction.close();
    }
    payment_transacrion = null;
    if (get_card) {
        deviceAppService.getCard();
    } else {
        cancel_card();
    }
}

window.select_pay_transaction = select_pay_card_id;
async function select_pay_card_id(card_id) {
    console.log("Processing Card ID: " + card_id);
    payment_transacrion = null;
    document.activeElement?.blur();

    const _api_path = `/api/function/check_out?card_id=${encodeURIComponent(card_id)}`;
    const respond = await unity.fetchApi(_api_path, "get", null, "json");

    if (respond?.success) {
        if (typeof Dialog_Select_Transaction !== "undefined" && Dialog_Select_Transaction?.open) {
            Dialog_Select_Transaction.close();
        }
        payment_transacrion = respond.data.transactions || {};
        payment_transacrion.acc = respond.data.acc || {};
        const _acc = payment_transacrion.acc;
        const Account_Records = respond.data.Account_Records || [];

        const _gateway = payment_transacrion.GateWay || {};
        const _tran = payment_transacrion.Transaction_Record || {};
        const _Log_Transaction = payment_transacrion.Log_Transaction || {};
        const _services = payment_transacrion.Service_Fees || {};

        const visitor_amount = parseFloat(_acc.amount || 0);

        const content_pay = KIOSK_APP.pay_transaction_content;
        if (!content_pay) return;
        content_pay.innerHTML = "";

        const temp = KIOSK_APP.temp_pay;
        const _c = temp.content.cloneNode(true);

        const image_paths = (_Log_Transaction.images_path || "").split(",").filter(Boolean);

        const elGw = _c.querySelector('[name="gateway_name"]');
        if (elGw) elGw.textContent = _gateway.name || "-";
        const elCard = _c.querySelector('[name="transaction_card_id"]');
        if (elCard) elCard.textContent = _tran.card_id || "-";
        const elLic = _c.querySelector('[name="transaction_licence"]');
        if (elLic) elLic.textContent = _Log_Transaction.license || "-";

        const rawDate = _Log_Transaction.date_time || "";
        const date_parts = rawDate.split(".")[0].split("T");
        const date_time_in_html = date_parts.length > 1 ? `${date_parts[0]}<br>${date_parts[1]}` : date_parts[0] || "-";
        const elInDate = _c.querySelector('[name="in_date_time"]');
        if (elInDate) elInDate.innerHTML = date_time_in_html;

        const elParked = _c.querySelector('[name="parked_time"]');
        if (elParked) elParked.textContent = _acc.parked || "-";
        const elFee = _c.querySelector('[name="service_fees"]');
        if (elFee) elFee.textContent = _services.name || "-";

        const elAmt = _c.querySelector('[name="amount"]');
        if (elAmt) {
            elAmt.textContent = Intl.NumberFormat("th-TH", {
                style: "currency",
                currency: "THB",
            }).format(visitor_amount);
        }

        const elImg2 = _c.querySelector('[name="transaction_image02"]');
        if (elImg2) elImg2.src = image_paths[0] || "/static/image/Image_not_available.png";

        if (visitor_amount === 0) {
            _c.querySelector('[name="btn_submit_payment"]')?.setAttribute("disabled", "true");
            _c.querySelector('[name="btn_submit_payment_link"]')?.setAttribute("disabled", "true");
        }

        const _date = new Date();
        const elAmtTime = _c.querySelector('[name="amount_at_time"]');
        if (elAmtTime) {
            elAmtTime.textContent = `${_date.toLocaleDateString()} ${_date.toLocaleTimeString()}`;
        }

        const temp_1 = KIOSK_APP.temp_acc;
        const paymeny_list_content = _c.querySelector('[name="paymeny_list_content"]');
        let total_pay = 0;

        for (const l of Account_Records) {
            const _account_record = l.Account_Record || {};
            total_pay += _account_record.amount || 0;
            const _c_1 = temp_1.content.cloneNode(true);
            _c_1.querySelector('[name="acc_no"]').textContent = _account_record.no || "";
            _c_1.querySelector('[name="acc_amount"]').textContent = _account_record.amount || "0.00";
            _c_1.querySelector('[name="acc_date"]').textContent = _account_record.date_time || "";
            _c_1.querySelector('[name="btn_acc_e_slip"]')?.setAttribute("href", _account_record.remark || "#");
            paymeny_list_content.appendChild(_c_1);
        }

        if (total_pay >= visitor_amount) {
            _c.querySelector('[name="btn_submit_payment"]')?.setAttribute("disabled", "true");
            _c.querySelector('[name="btn_submit_payment_link"]')?.setAttribute("disabled", "true");
        } else {
            const elPayForPay = _c.querySelector('[name="paymeny_for_pay"]');
            if (elPayForPay) {
                elPayForPay.textContent = Intl.NumberFormat("th-TH", {
                    style: "currency",
                    currency: "THB",
                }).format(visitor_amount - total_pay);
            }
        }

        content_pay.appendChild(_c);
        updatePageContent(content_pay);
        Dialog_Pay_Transaction.showModal();
        console.log("payment_transacrion", payment_transacrion);

        if (total_pay >= visitor_amount) {
            unity.showToastNotification({ icon: "info", msg: "Exit processed with zero fee" });
            Dialog_Pay_Transaction.close();
            process_transition_gate_out(0, 0, 0);
        } else if (KIOSK_APP.device_type === "MODULE") {
            Dialog_Pay_Transaction.close();
            unity.showToastNotification({
                icon: "warning",
                msg: '<div class="text-4xl">DEVICE_TYPE MODULE<br>Payment disabled</div>',
            });
            play_sound("not_check_out_if_no_pay");
            clear_transaction(true);
        } else if (KIOSK_APP.device_mode === "AUTO") {
            console.log("KIOSK_APP.device_mode", KIOSK_APP.device_mode);
            await unity.delay(1000);
            Dialog_Pay_Transaction.close();
            call_qr_payment();
        }
    } else {
        const html_data = `<div class="text-4xl text-center">${respond?.msg || "Unable to check out"}</div>`;
        unity.showToastNotification({ icon: "error", msg: html_data });
    }
}

async function process_transition_gate_out(
    amount,
    pay,
    turn_amount,
    pay_type = "QR-CODE(GATE-OUT)",
    fine = 0,
    payment_fee = 0.0,
) {
    if (!payment_transacrion) return;
    const Transaction_Record = payment_transacrion.Transaction_Record;
    const Log_Transaction = payment_transacrion.Log_Transaction;

    // 🔒 Close QR Payment dialog immediately if still open
    if (typeof Dialog_QR_Payment !== "undefined" && Dialog_QR_Payment?.open) {
        Dialog_QR_Payment.close();
    }

    unity.showDialogInfo({
        title: "Processing",
        msg: `<div class="text-center"><span class="loading loading-spinner text-info loading-lg"></span></div>`,
    });

    try {
        const formData = new FormData();
        formData.append("transaction_records_id", Transaction_Record.id);
        formData.append("amount", amount);
        formData.append("pay", pay);
        formData.append("fine", fine);
        formData.append("turn_amount", turn_amount);
        formData.append("pay_type", pay_type);
        formData.append("gateway_id", GATE_WAY_ID);
        formData.append("card_id", Transaction_Record.card_id);
        formData.append("license", Log_Transaction.license);
        formData.append("cashier", `${KIOSK_NAME}-${SYSTEM_USER}`);
        formData.append("device_name", KIOSK_NAME);
        formData.append("payment_fee", payment_transacrion.payment_fee || 0.0);
        if (payment_transacrion.acc) {
            const customer = payment_transacrion.acc.customer;
            const customer_amount = payment_transacrion.acc.customer_amount;
            const customer_id = customer ? customer.id : 0;
            if (customer_id > 0 && customer_amount > 0) {
                formData.append("customer_id", customer_id);
                formData.append("customer_amount", customer_amount);
            }
        }

        // 📷 Concurrent Direct Fetch Camera Snapshots (Zero Canvas Decode)
        let snap1 = null;
        let snap2 = null;

        if (deviceAppService.snapshot_01 || deviceAppService.snapshot_02) {
            [snap1, snap2] = await Promise.all([deviceAppService.snapshot(1), deviceAppService.snapshot(2)]);
        }

        if (snap1 instanceof File) {
            formData.append("image_upload_01", snap1);
        }
        if (snap2 instanceof File) {
            formData.append("image_upload_02", snap2);
        }

        const respond = await unity.fetchApi("/api/function/check_out", "post", formData, "json");

        if (respond?.success) {
            if (typeof Dialog_Info !== "undefined" && Dialog_Info?.close) {
                Dialog_Info.close();
            }

            // 🚪 1. Open barrier gate & process card immediately
            clear_transaction(true);
            play_sound("success");
            deviceAppService.openGate();

            // 🧾 2. Show Receipt Modal with User Print Confirmation Option
            if (pay > 0) {
                const Account_Record = respond.Account_Record;
                currentSlipPayUrl = `/api/function/slip_pay?acc_id=${Account_Record.id}`;
                if (typeof Dialog_Slip_Pay !== "undefined") {
                    await loadSlipImage(currentSlipPayUrl);
                    Dialog_Slip_Pay.showModal();
                    startSlipAutoCloseTimer(10);
                }
            } else {
                unity.logger.debug("Zero fee transaction, receipt print omitted");
            }
        } else {
            unity.showDialogError({ msg: respond?.msg || "Check-out failed" });
        }
    } catch (err) {
        console.error("process_transition_gate_out error:", err);
        unity.showToastNotification({ type: "error", msg: "Checkout failed: " + (err.message || "") });
    } finally {
        if (typeof Dialog_Info !== "undefined" && Dialog_Info?.close) {
            Dialog_Info.close();
        }
    }
}

async function wait_success_card_id_pay(time_out = 120, card_id = "") {
    const sessionId = ++currentPaymentSessionId;
    const time_out_dis = KIOSK_APP.qr_time_out;
    if (time_out_dis) time_out_dis.innerText = time_out;
    await unity.delay(500);
    while (Dialog_QR_Payment?.open && sessionId === currentPaymentSessionId) {
        await unity.delay(1000);
        if (sessionId !== currentPaymentSessionId) break;
        time_out--;
        if (time_out_dis) time_out_dis.innerText = time_out;
        const _api_path = `/api/function/check_out?card_id=${encodeURIComponent(card_id)}`;
        const _reply = await unity.fetchApi(_api_path, "get", null, "json");

        if (sessionId !== currentPaymentSessionId) break;

        if (_reply?.success) {
            const data = _reply.data || {};
            const _acc = data.acc || {};
            const Account_Records = data.Account_Records || [];

            let total_pay = 0;
            let acc_id = 0;
            for (const l of Account_Records) {
                const _account_record = l.Account_Record || {};
                total_pay += _account_record.amount || 0;
                acc_id = _account_record.id || acc_id;
            }
            if (total_pay >= (_acc.amount || 0)) {
                if (typeof Dialog_QR_Payment !== "undefined" && Dialog_QR_Payment?.open) {
                    Dialog_QR_Payment.close();
                }
                play_sound("pay_success");
                const slipPayUrl = `/api/function/slip_pay?acc_id=${acc_id}`;
                await loadSlipImage(slipPayUrl);
                process_transition_gate_out(0, 0, 0);
                break;
            }
        }

        if (time_out <= 0) {
            break;
        }
    }

    if (sessionId === currentPaymentSessionId && Dialog_QR_Payment?.open) {
        Dialog_QR_Payment.close();
    }
}

async function wait_success_pay(time_out = 120, ref = "") {
    const sessionId = ++currentPaymentSessionId;
    const time_out_dis = KIOSK_APP.qr_time_out;
    if (time_out_dis) {
        time_out_dis.innerText = time_out;
    }

    const formData = new FormData();
    formData.append("qr_ref", ref);

    await unity.delay(500);
    let step = 0;

    while (Dialog_QR_Payment?.open && time_out > 0 && sessionId === currentPaymentSessionId) {
        await unity.delay(1000);
        if (sessionId !== currentPaymentSessionId) break;
        time_out--;
        step++;

        if (time_out_dis) {
            time_out_dis.innerText = time_out;
        }

        if (step % 3 === 0) {
            try {
                const respond = await unity.fetchApi("/api/payment_qr_code_status", "post", formData, "json");
                if (sessionId !== currentPaymentSessionId) break;
                if (respond?.success) {
                    if (typeof Dialog_QR_Payment !== "undefined" && Dialog_QR_Payment?.open) {
                        Dialog_QR_Payment.close();
                    }
                    success_pay(respond);
                    break;
                }
            } catch (error) {
                console.error("Payment status check failed:", error);
            }
        }
    }

    if (sessionId === currentPaymentSessionId && Dialog_QR_Payment?.open) {
        Dialog_QR_Payment.close();
    }
}

async function success_pay(params) {
    if (typeof Dialog_QR_Payment !== "undefined" && Dialog_QR_Payment?.open) {
        Dialog_QR_Payment.close();
    }
    if (typeof Dialog_Slip_Pay !== "undefined" && Dialog_Slip_Pay?.open) {
        Dialog_Slip_Pay.close();
    }
    play_sound("pay_success");
    const acc = payment_transacrion?.acc || {};
    process_transition_gate_out(acc.amount || 0, acc.amount || 0, 0);
}

window.confirm_print_slip = confirm_print_slip;
async function confirm_print_slip() {
    clearSlipAutoCloseTimer();
    const slipUrl = currentSlipPayUrl;
    currentSlipPayUrl = null;
    if (typeof Dialog_Slip_Pay !== "undefined" && Dialog_Slip_Pay?.open) {
        Dialog_Slip_Pay.close();
    }
    if (slipUrl) {
        play_sound("thank_slip");
        await print_slip_pay(slipUrl);
    }
}

window.thank_no_slip = thank_no_slip;
function thank_no_slip() {
    clearSlipAutoCloseTimer();
    currentSlipPayUrl = null;
    play_sound("thank_no_slip");
    if (typeof Dialog_Slip_Pay !== "undefined" && Dialog_Slip_Pay?.open) {
        Dialog_Slip_Pay.close();
    }
}

window.call_qr_payment = call_qr_payment;
async function call_qr_payment(payment_type = "promptpay") {
    if (typeof Dialog_Pay_Transaction !== "undefined" && Dialog_Pay_Transaction?.open) {
        Dialog_Pay_Transaction.close();
    }
    if (typeof Dialog_Loading !== "undefined") {
        Dialog_Loading.showModal();
    }
    if (payment_transacrion) {
        if (payment_type === "promptpay") {
            const _acc = payment_transacrion.acc || {};
            const visitor_amount = parseFloat(_acc.amount || 0);
            const formData = new FormData();
            formData.append("amount", visitor_amount);
            const respond = await unity.fetchApi("/api/payment_qr_code", "post", formData, "json");
            if (typeof Dialog_Loading !== "undefined" && Dialog_Loading?.open) {
                Dialog_Loading.close();
            }
            if (respond?.success) {
                if (KIOSK_APP.qr_amount) {
                    KIOSK_APP.qr_amount.textContent = Intl.NumberFormat("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    }).format(visitor_amount);
                }
                KIOSK_APP.qrcode.clear();
                KIOSK_APP.qrcode.makeCode(respond.data);
                Dialog_QR_Payment.showModal();
                payment_transacrion.payment_fee = respond.payment_fee;
                wait_success_pay(120, respond.qr_payment_ref);
            } else {
                unity.showDialogError({ msg: respond?.error || "QR generation failed" });
            }
        } else if (payment_type === "ONLINE") {
            const Transaction_Record = payment_transacrion.Transaction_Record || {};
            const _acc = payment_transacrion.acc || {};
            const visitor_amount = parseFloat(_acc.amount || 0);
            if (typeof Dialog_Loading !== "undefined" && Dialog_Loading?.open) {
                Dialog_Loading.close();
            }
            if (KIOSK_APP.qr_amount) {
                KIOSK_APP.qr_amount.textContent = Intl.NumberFormat("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(visitor_amount);
            }
            KIOSK_APP.qrcode.clear();
            const payment_url = `https://${SERVER_URL}/payment_service?qr_code=${encodeURIComponent(Transaction_Record.card_id)}`;
            KIOSK_APP.qrcode.makeCode(payment_url);
            Dialog_QR_Payment.showModal();
            wait_success_card_id_pay(120, Transaction_Record.card_id);
        } else {
            unity.showDialogError({ msg: "Invalid payment method" });
        }
    }
}

window.cancel_card = cancel_card;
function cancel_card() {
    const btn = document.getElementById("btn_cancel_card");
    if (btn) btn.blur();
    deviceAppService.returnCard();
}

window.cancel_pay = cancel_pay;
async function cancel_pay() {
    const result = await unity.showDialogConfirm({
        title: "Confirm Action",
        content: "Are you sure you want to cancel QR payment?",
    });
    if (result.confirm) {
        if (typeof Dialog_QR_Payment !== "undefined" && Dialog_QR_Payment?.open) {
            Dialog_QR_Payment.close();
        }
        clear_transaction();
    }
}

window.printer_test = printer_test;
async function printer_test() {
    const slipInUrl = `/static/image/Testprint.jpg`;
    await Promise.all([loadSlipImage(slipInUrl), print_slip_pay(slipInUrl)]);
}

window.print_slip_pay = print_slip_pay;
async function print_slip_pay(source = KIOSK_APP.slip_pay_image) {
    unity.showToastNotification({ msg: "Printing receipt in progress..." });
    const respond = await deviceAppService.printImage(source);
    if (!respond?.success) {
        unity.showToastNotification({ type: "error", msg: "Print Receipt Error" });
    }
}

window.open_test_relay = open_test_relay;
async function open_test_relay() {
    deviceAppService.openGate();
}

function sw_event(sw) {
    if (!sw) return;
    const isLoop1 = !!sw[1];
    const isLoop2 = !!sw[2];

    if (isLoop1 || isLoop2) {
        window.kioskScreensaver?.wakeUp();
    }

    if (KIOSK_APP.loop_status_1) {
        if (isLoop1) {
            KIOSK_APP.loop_status_1.classList.remove("text-base-content/30");
            KIOSK_APP.loop_status_1.classList.add("text-error");
        } else {
            KIOSK_APP.loop_status_1.classList.remove("text-error");
            KIOSK_APP.loop_status_1.classList.add("text-base-content/30");
        }
    }

    if (KIOSK_APP.loop_status_2) {
        if (isLoop2) {
            KIOSK_APP.loop_status_2.classList.remove("text-base-content/30");
            KIOSK_APP.loop_status_2.classList.add("text-error");
        } else {
            KIOSK_APP.loop_status_2.classList.remove("text-error");
            KIOSK_APP.loop_status_2.classList.add("text-base-content/30");
        }
    }

    const loopIconBox = KIOSK_APP.loop_icon_box;
    if (loopIconBox) {
        if (isLoop1 || isLoop2) {
            loopIconBox.classList.remove("bg-base-300", "text-base-content/50");
            loopIconBox.classList.add("bg-error", "text-white");
        } else {
            loopIconBox.classList.remove("bg-error", "text-white");
            loopIconBox.classList.add("bg-base-300", "text-base-content/50");
        }
    }

    if (KIOSK_APP.loop_status) {
        if (isLoop1 || isLoop2) {
            KIOSK_APP.loop_status.textContent = getKioskText("loop_car_detected") || "Car Detected";
        } else {
            KIOSK_APP.loop_status.textContent = getKioskText("loop_no_car") || "No Car";
        }
    }
}

function update_printer_status(resOrConnected, optionalPaper = null) {
    const { isConnected, paperStatus } = extractPrinterStatus(resOrConnected, optionalPaper);
    const isOk = paperStatus > 0;
    const status = `${isConnected ? "Connected" : "Disconnected"}<br>${isOk ? "Ready" : "EMPTY/OPENED"}`;

    if (KIOSK_APP.printer_status) {
        KIOSK_APP.printer_status.innerHTML = status;
    }

    const dot = document.getElementById("printer_indicator_dot");
    if (dot) {
        dot.className = `w-3 h-3 rounded-full ${isConnected && isOk ? "bg-success" : "bg-error animate-pulse"} inline-block`;
    }

    KIOSK_APP.printer_ready = isConnected && isOk;
}

async function pollPrinterStatus() {
    try {
        const result = await deviceAppService.getPrinterStatus();
        update_printer_status(result);
    } catch (error) {
        console.error("Printer Status Error:", error);
        update_printer_status(false, 0);
    } finally {
        setTimeout(pollPrinterStatus, 15000);
    }
}

new unity.WebSocketClient((e) => {
    if (!e) return;
    if (e.type === "event") {
        if (e.hw === "printer") {
            const data = e.data;
            if (Array.isArray(data)) update_printer_status(data[0], data[1]);
        } else if (e.hw === "switch") {
            sw_event(e.data);
        } else if (e.hw === "serial_qr_reader") {
            const data = e.data;
            if (data) {
                window.kioskScreensaver?.wakeUp();
                let card_ids = unity.validateTransactionString(data);
                card_ids = card_ids.split(" ")[0];
                submit_input_transaction(card_ids);
            }
        }
    } else if (e.type === "cmd") {
        if (e.data === "RELOAD") {
            location.reload();
        }
    }

    if (e.func === "event_data") {
        try {
            const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
            window.kioskScreensaver?.wakeUp();
            const licence = data.licence || data.license;
            if (!unity.isScreenReady()) {
                console.log("🟡 Dialog is open, holding transaction");
                return;
            }
            if (licence) {
                submit_input_transaction(licence, "licence");
            }
        } catch (err) {
            console.error("event_data parse error:", err);
        }
    }
}, HOST_HW_SERVICE);

window.input_card_reader_onkeypress = input_card_reader_onkeypress;
async function input_card_reader_onkeypress(e) {
    if (e.key === "Enter") {
        const inputEl = KIOSK_APP.input_card_reader;
        if (!inputEl) return;
        const rawValue = inputEl.value.trim();

        if (!rawValue) {
            unity.showToastNotification({
                type: "warning",
                title: "Warning",
                msg: "Please tap card or enter license plate",
            });
            return;
        }

        try {
            let card_ids = unity.validateTransactionString(rawValue);
            card_ids = card_ids.split(" ")[0];

            inputEl.disabled = true;
            inputEl.classList.add("opacity-50");

            await submit_input_transaction(card_ids);
            inputEl.value = "";
        } catch (error) {
            unity.showToastNotification({
                type: "error",
                title: "Error occurred",
                msg: "Failed to transmit data, please retry",
            });
            console.error("Submission error:", error);
        } finally {
            inputEl.disabled = false;
            inputEl.classList.remove("opacity-50");
            inputEl.focus();
        }
    }
}

function update_keyboard_preview() {
    const previewEl = KIOSK_APP.keyboard_preview;
    if (previewEl && KIOSK_APP.input_card_reader) {
        previewEl.textContent = KIOSK_APP.input_card_reader.value || "-";
    }
}

window.onscreen_keyboard_open = onscreen_keyboard_open;
function onscreen_keyboard_open() {
    play_sound("press_keyboard");
    update_keyboard_preview();
    if (typeof Dialog_Onscreen_Keyboard !== "undefined") {
        Dialog_Onscreen_Keyboard.showModal();
    }
}

window.on_screen_kenboard_event_input = on_screen_kenboard_event_input;
function on_screen_kenboard_event_input(key) {
    const input_card_reader = KIOSK_APP.input_card_reader;
    if (!input_card_reader) return;
    switch (key) {
        case "BS":
            input_card_reader.value = input_card_reader.value.slice(0, -1);
            break;
        case "CLEAR":
            input_card_reader.value = "";
            break;
        case "ENTER":
            if (typeof Dialog_Onscreen_Keyboard !== "undefined") {
                Dialog_Onscreen_Keyboard.close();
            }
            const input_box = input_card_reader.value;
            input_card_reader.value = "";
            submit_input_transaction(input_box, "licence");
            break;
        default:
            input_card_reader.value += key;
            break;
    }
    update_keyboard_preview();
}

window.kioskScreensaver = null;

// Screen idle auto-reload for security & memory clearance (30 mins)
let idleTime = 0;
const IDLE_LIMIT = 30; // Idle limit in minutes

function timerIncrement() {
    idleTime++;
    if (idleTime >= IDLE_LIMIT) {
        window.location.reload();
    }
}

function resetTimer() {
    idleTime = 0;
}

document.addEventListener("DOMContentLoaded", async () => {
    await unity.initI18n();
    clear_transaction();
    await deviceAppService.init();
    await KIOSK_APP.init();
    if (KIOSK_APP.input_card_reader) {
        KIOSK_APP.input_card_reader.focus();
    }
    pollPrinterStatus();

    // 🌙 Initialize Screensaver Manager (60s idle timeout)
    window.kioskScreensaver = new KioskScreensaverManager(60);

    // Track user interaction events for 30m auto-reload
    setInterval(timerIncrement, 60000);
    ["pointerdown", "touchstart", "click", "keypress"].forEach((evt) => {
        window.addEventListener(evt, resetTimer, { passive: true });
    });
});
