import * as unity from "./unity.js";
import { deviceAppService, DeviceAppService } from "./_DeviceAppService.js";
// import * as datatable from "./datatable.js";
console.log("********************************************");
console.log("    load script payment_kiosk.js");
console.log(`   💡 SYSTEM_USER      : ${SYSTEM_USER}`);
console.log(`   💡 KIOSK_NAME       : ${KIOSK_NAME}`);
console.log(`   💡 SERVER_URL      : ${SERVER_URL}`);
// unity.logger.debug(`   💡 GATE_WAY_NAME    : ${GATE_WAY_NAME}`);
// unity.logger.debug(`   💡 DEVICE_TYPE      : ${DEVICE_TYPE}`);
// unity.logger.debug(`   💡 DEVICE_MODE      : ${DEVICE_MODE}`);
console.log("********************************************");

export { deviceAppService, DeviceAppService };


const page_kiosk = document.body;
const KIOSK_APP = {
    nane: KIOSK_NAME,
    system_user: SYSTEM_USER,
    input_licence: page_kiosk.querySelector('[data-field="input_licence"]'),
    input_card_id: page_kiosk.querySelector('[data-field="input_card_id"]'),
    qrcode: new QRCode(Dialog_QR_Payment.querySelector(['[data-field="qr_code"]']), {
        text: "https://home.pksofttech.org",
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
    }),
    slip_pay_image: Dialog_Slip_Pay.querySelector('[data-field="slip_pay_image"]'),

    printer_status: page_kiosk.querySelector('[data-field="printer_status"]'),
};
// unity.logger.debug(KIOSK_APP);
const SOUND_PATH = `/static/sound/`;
const SOUNDS = {};
const SOUND_LIST = [
    "beep_01",
    "pay_qr_code",
    "ticketNotFound",
    "pay_success",
    "system_process",
    "thank_no_slip",
    "thank_slip",
    "ready",
    "select_card",
    "press_keyboard",
];
const SOUND_DRIVER = "DEVICE";
if (SOUND_DRIVER !== "DEVICE") {
    for (const _s of SOUND_LIST) {
        unity.logger.debug(_s);
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
// play_sound("beep_01");

window.on_screen_kenboard_event_input = on_screen_kenboard_event_input;
function on_screen_kenboard_event_input(key) {
    switch (key) {
        case "BS":
            KIOSK_APP.input_card_id.value = KIOSK_APP.input_card_id.value.slice(0, -1);
            break;
        case "CLEAR":
            KIOSK_APP.input_card_id.value = "";
            break;
        case "ENTER":
            Dialog_Onscreen_Keyboard.close();
            const input_box = KIOSK_APP.input_card_id.value;
            KIOSK_APP.input_card_id.value = "";
            submit_input_licence(input_box);
            break;
        default:
            KIOSK_APP.input_card_id.value += key;
            break;
    }
}

window.onscreen_keyboard_open = onscreen_keyboard_open;
function onscreen_keyboard_open() {
    play_sound("press_keyboard");
    Dialog_Onscreen_Keyboard.showModal();
}
window.clear_input_licence = clear_input_licence;
function clear_input_licence() {
    Dialog_Onscreen_Keyboard.close();
    KIOSK_APP.input_card_id.value = "";
}

window.handleBidyClick = handleBidyClick;
function handleBidyClick() {
    // const html_data = `<div class="text-4xl text-center">handleBidyClick<br></div>`;
    // unity.showToastNotification({ msg: html_data });
    KIOSK_APP.input_card_id.focus();
}
window.submit_input_licence = submit_input_licence;
async function submit_input_licence(data = null, data_type = "card_id") {
    unity.showToastNotification({ icon: "info", msg: `${data_type} : ${data}` });
    clear_input_licence();
    if (data) {
        if (data_type == "card_id") {
            const card_ids = data.split(" ");
            if (card_ids.length > 1) {
                data = card_ids[1];
            }
        }

        const _reply = await unity.fetchApi(`/api/payment_transcation?${data_type}=${data}`, "get", null, "json");
        if (_reply.success) {
            const transaction_datas = _reply.data;
            if (transaction_datas.length == 0) {
                // unity.showDialogWarning({ msg: "No parking record found for searched plate" });
                const html_data = `<div class="text-4xl text-center">No parking record found for searched plate<br>${data}<br>The registration record you are looking for was not found</div>`;
                unity.showToastNotification({ msg: html_data });
                play_sound("ticketNotFound");

                return;
            }

            const content_select_transaction = Dialog_Select_Transaction.querySelector('[data-field="content"]');
            content_select_transaction.innerHTML = "";
            const temp = document.getElementById("template_content_select_transaction");
            unity.logger.info(transaction_datas);
            if (transaction_datas.length == 1) {
                const _t = transaction_datas[0].Transaction_Record;
                select_pay_transaction(_t.card_id);
            } else {
                play_sound("select_card");
                for (const transaction_data of transaction_datas) {
                    const _t = transaction_data.Transaction_Record;
                    const _l = transaction_data.Log_Transaction;
                    unity.logger.info(_t);
                    const _c = temp.content.cloneNode(true);

                    _c.querySelector('[name="licence"]').innerHTML = _t.card_id;
                    const date_time_in = _l.date_time.split(".")[0].split("T");
                    const date_time_in_html = `${date_time_in}<br>${date_time_in[1]}`;
                    _c.querySelector('[name="datetime_in"]').innerHTML =
                        `Entry DateTime:<br>` + date_time_in_html;

                    const image_path = _l.images_path.split(",");

                    _c.querySelector('[name="transaction_image01"]').src = image_path;
                    _c.querySelector('[name="transaction_image02"]').src = image_path[1];

                    _c.querySelector('[name="select_btn_transaction"]').setAttribute(
                        "onclick",
                        `select_pay_transaction("${_t.card_id}");`,
                    );
                    unity.logger.debug(_c.querySelector('[name="select_btn_transaction"]'));

                    content_select_transaction.appendChild(_c);
                }
                if (!transaction_datas) {
                }

                Dialog_Select_Transaction.showModal();
            }
        } else {
            unity.logger.info(_reply);
            unity.showDialogError({ msg: JSON.stringify(_reply) });
        }
    } else {
        unity.showToastNotification({
            msg: "Please enter license plate before proceeding.",
        });
    }
}

let payment_transacrion = null;
window.clear_transaction = clear_transaction;
async function clear_transaction() {
    Dialog_Pay_Transaction.close();
    payment_transacrion = null;
    KIOSK_APP.input_card_id.value = "";
    await unity.delay(500);
    KIOSK_APP.input_card_id.focus();
}

window.select_pay_transaction = select_pay_transaction;
async function select_pay_transaction(card_id) {
    unity.logger.debug("select_pay_transaction :" + card_id);
    payment_transacrion = null;
    document.activeElement.blur();
    const _api_path = `/api/function/check_out?card_id=${card_id}`;
    const _reply = await unity.fetchApi(_api_path, "get", null, "json");
    unity.logger.info(_reply);
    if (_reply.success) {
        Dialog_Select_Transaction.close();
        const data = _reply.data;
        if (!data) {
            unity.showToastNotification({ icon: "error", msg: "No parking record found for searched plate" });
            return;
        }
        payment_transacrion = data.transactions;
        const _acc = _reply.data.acc;
        const Account_Records = data.Account_Records;
        unity.logger.info(payment_transacrion);
        unity.logger.info(_acc);
        unity.logger.info(Account_Records);
        const _gateway = payment_transacrion.GateWay;
        const _system_user = payment_transacrion.SystemUser;
        const _tran = payment_transacrion.Transaction_Record;
        const _Log_Transaction = payment_transacrion.Log_Transaction;
        const _services = payment_transacrion.Service_Fees;
        payment_transacrion.acc = _acc;
        //

        const content_pay_transaction = Dialog_Pay_Transaction.querySelector('[data-field="content"]');
        content_pay_transaction.innerHTML = "";

        const temp = document.getElementById("template_content_pay_transaction");
        const _c = temp.content.cloneNode(true);

        const image_path = _Log_Transaction.images_path.split(",");

        _c.querySelector('[name="card_id"]').innerText = _tran.card_id;
        _c.querySelector('[name="gateway_name"]').innerHTML = _gateway.name;
        _c.querySelector('[name="transaction_licence"]').innerHTML = _tran.card_id;
        const date_time_in = _Log_Transaction.date_time.split(".")[0].split("T");
        const date_time_in_html = `${date_time_in}<br>${date_time_in[1]}`;
        _c.querySelector('[name="in_date_time"]').innerHTML = date_time_in_html;
        _c.querySelector('[name="parked_time"]').innerHTML = _acc.parked;
        _c.querySelector('[name="service_fees"]').innerHTML = _services.name;

        const amount = Intl.NumberFormat("th-TH", {
            style: "currency",
            currency: "THB",
        }).format(_acc.amount);

        _c.querySelector('[name="amount"]').innerHTML = amount;
        // _c.querySelector('[name="transaction_image02"]').src = image_path.length == 1 ? image_path : image_path[1];
        _c.querySelector('[name="transaction_image02"]').src = image_path[0];

        if (_acc.amount == 0) {
            _c.querySelector('[name="btn_submit_payment"]').setAttribute("disabled", true);
            _c.querySelector('[name="btn_submit_payment_link"]').setAttribute("disabled", true);
        }

        const _date = new Date();
        _c.querySelector('[name="amount_at_time"]').innerHTML =
            `${_date.toLocaleDateString()} ${_date.toLocaleTimeString()}`;

        const temp_1 = document.getElementById("template_content_payment_data");
        const paymeny_list_content = _c.querySelector('[name="paymeny_list_content"]');
        let total_pay = 0;
        for (const l of Account_Records) {
            unity.logger.info(l);
            const _account_record = l.Account_Record;
            total_pay += _account_record.amount;
            const _c_1 = temp_1.content.cloneNode(true);
            _c_1.querySelector('[name="acc_no"]').innerHTML = _account_record.no;
            _c_1.querySelector('[name="acc_amount"]').innerHTML = _account_record.amount;
            _c_1.querySelector('[name="acc_date"]').innerHTML = _account_record.date_time;
            _c_1.querySelector('[name="btn_acc_e_slip"]').onclick = function () {
                load_slip_pay_acc(_account_record.id);
            };
            paymeny_list_content.appendChild(_c_1);
        }
        if (total_pay >= _acc.amount) {
            _c.querySelector('[name="btn_submit_payment"]').setAttribute("disabled", true);
            _c.querySelector('[name="btn_submit_payment_link"]').setAttribute("disabled", true);
        } else {
            _c.querySelector('[name="paymeny_for_pay"]').innerHTML = Intl.NumberFormat("th-TH", {
                style: "currency",
                currency: "THB",
            }).format(_acc.amount - total_pay);
        }
        content_pay_transaction.appendChild(_c);
        Dialog_Pay_Transaction.showModal();
    } else {
        const html_data = `<div class="text-4xl text-center">${_reply.msg}</div>`;
        unity.showToastNotification({ icon: "error", msg: html_data });
    }
}

async function wait_success_pay(time_out = 120, ref = "") {
    const time_out_dis = Dialog_QR_Payment.querySelector(['[data-field="time_out"]']);
    time_out_dis.innerText = time_out;
    const formData = new FormData();
    formData.append("qr_ref", ref);
    await unity.delay(500);
    while (Dialog_QR_Payment.getAttribute("open") !== null) {
        await unity.delay(1000);
        time_out_dis.innerText = --time_out;
        const _reply = await unity.fetchApi("/api/payment_qr_code_status", "post", formData, "json");
        if (_reply.success) {
            unity.logger.debug(_reply);
            success_pay(_reply);
            break;
        } else {
            // unity.showDialogError({ msg: _reply.error });
            unity.logger.info(_reply.msg);
        }
        if (time_out <= 0) {
            break;
        }
        // if (time_out == 118) {
        //     success_pay("data");
        //     break;
        // }
    }

    Dialog_QR_Payment.close();
}

async function wait_success_card_id_pay(time_out = 120, card_id = "") {
    const time_out_dis = Dialog_QR_Payment.querySelector(['[data-field="time_out"]']);
    time_out_dis.innerText = time_out;
    await unity.delay(500);
    while (Dialog_QR_Payment.getAttribute("open") !== null) {
        await unity.delay(1000);
        time_out_dis.innerText = --time_out;
        const _api_path = `/api/function/check_out?card_id=${card_id}`;
        const _reply = await unity.fetchApi(_api_path, "get", null, "json");

        unity.logger.info(_reply);
        if (_reply.success) {
            const data = _reply.data;
            const _acc = data.acc;
            const Account_Records = data.Account_Records;
            // unity.logger.info(data.transactions);
            // unity.logger.info(_acc);
            // unity.logger.info(Account_Records);

            let total_pay = 0;
            let acc_id = 0;
            for (const l of Account_Records) {
                // unity.logger.info(l);
                const _account_record = l.Account_Record;
                total_pay += _account_record.amount;
                acc_id = _account_record.id;
            }
            unity.logger.info(total_pay, _acc.amount);
            if (total_pay >= _acc.amount) {
                Dialog_QR_Payment.close();
                play_sound("pay_success");
                await load_slip_pay_acc(acc_id);
                clear_transaction();
                break;
            }
        }

        if (time_out <= 0) {
            break;
        }
        // if (time_out == 118) {
        //     success_pay("data");
        //     break;
        // }
    }

    Dialog_QR_Payment.close();
}

async function load_slip_pay_acc(acc_id) {
    const slipPayUrl = `/api/function/slip_pay_acc?acc_id=${acc_id}`;
    await loadSlipImage(slipPayUrl);
    Dialog_Slip_Pay.showModal();
    while (Dialog_Slip_Pay.getAttribute("open") !== null) {
        await unity.delay(1000);
    }
    Dialog_Slip_Pay.close();
}

let thank_no_slip_select = false;
async function success_pay(data) {
    // unity.showDialogSuccess({ msg: _reply.data });
    const Transaction_Record = payment_transacrion.Transaction_Record;
    const acc = payment_transacrion.acc;
    const formData = new FormData();
    formData.append("transaction_records_id", Transaction_Record.id);
    formData.append("amount", acc.amount);
    formData.append("pay", acc.amount);
    formData.append("fine", 0);
    formData.append("turn_amount", 0);
    formData.append("pay_type", "QR CODE KIOSK");
    formData.append("gateway_id", 0);
    formData.append("card_id", Transaction_Record.card_id);
    // formData.append("license", GATE_OUT.license_id_input.value);
    formData.append("cashier", `${KIOSK_APP.nane}-${SYSTEM_USER}`);
    formData.append("check_out_transaction", false);
    unity.debugForm(formData);
    let acc_id = 0;
    const _reply = await unity.fetchApi("/api/function/check_out", "post", formData, "json");
    if (_reply.success) {
        const Transaction_Record = _reply.data;
        const In_Log = _reply.Log_Transaction;
        const Account_Record = _reply.Account_Record;
        acc_id = Account_Record.id;
        unity.logger.debug(_reply);
    } else {
        unity.showDialogError({ msg: _reply.msg });
        return;
    }

    play_sound("pay_success");

    await load_slip_pay_acc(acc_id);

    if (!thank_no_slip_select) {
        // play_sound("thank_slip");
    }
    thank_no_slip_select = false;
    clear_transaction();
}

window.thank_no_slip = thank_no_slip;
function thank_no_slip() {
    thank_no_slip_select = true;
    play_sound("thank_no_slip");
}

window.call_qr_payment = call_qr_payment;
async function call_qr_payment(payment_type = "promptpay") {
    Dialog_Pay_Transaction.close();
    Dialog_Loading.showModal();
    if (payment_transacrion) {
        if (payment_type == "promptpay") {
            const _acc = payment_transacrion.acc;
            unity.logger.info(_acc);
            const formData = new FormData();
            // formData.append("payment_type", "promptpay");
            formData.append("amount", _acc.amount);
            const _reply = await unity.fetchApi("/api/payment_qr_code", "post", formData, "json");
            unity.logger.info(_reply);
            Dialog_Loading.close();
            if (_reply.success) {
                KIOSK_APP.qrcode.clear();
                KIOSK_APP.qrcode.makeCode(_reply.data);
                Dialog_QR_Payment.showModal();
                // await unity.delay(200);
                wait_success_pay(120, _reply.qr_payment_ref);
            } else {
                unity.showDialogError({ msg: _reply.error });
            }
        } else if (payment_type == "ONLINE") {
            const Transaction_Record = payment_transacrion.Transaction_Record;
            unity.logger.info(Transaction_Record);

            Dialog_Loading.close();
            KIOSK_APP.qrcode.clear();
            const payment_url = `https://${SERVER_URL}/payment_service?qr_code=${encodeURIComponent(Transaction_Record.card_id)}`;

            unity.logger.info(payment_url);
            KIOSK_APP.qrcode.makeCode(payment_url);
            Dialog_QR_Payment.showModal();
            // await unity.delay(200);
            wait_success_card_id_pay(120, Transaction_Record.card_id);
        } else {
            unity.showDialogError({ msg: "Invalid payment method" });
        }
    }
}

window.cancel_pay = cancel_pay;
async function cancel_pay() {
    const result = await unity.showDialogConfirm({
        title: "Confirm Action",
        content: "Confirm transaction cancellation for QR Code payment",
    });
    if (result.confirm) {
        Dialog_QR_Payment.close();
        clear_transaction();
    }
}

//setTimeout(() => { send_to_arduino("RESET"); }, 3000)
//setTimeout(() => { print_slip(); }, 3000)

KIOSK_APP.input_card_id.focus();

window.input_card_id = input_card_id;
async function input_card_id(e) {
    let input_datas = unity.validateTransactionString(KIOSK_APP.input_card_id.value).split(" ");

    switch (input_datas.length) {
        case 1:
            submit_input_licence(input_datas[0], "licence");
            break;
        case 2:
            submit_input_licence(input_datas[1], "card_id");
            break;
        default:
            break;
    }
}

async function loadSlipImage(url) {
    try {
        await new Promise((resolve, reject) => {
            KIOSK_APP.slip_pay_image.src = url;
            KIOSK_APP.slip_pay_image.onload = resolve; // Image loaded successfully
            KIOSK_APP.slip_pay_image.onerror = () => reject(`Failed to load image for transaction ID: ${url}`);
        });

        unity.logger.debug("Image loaded successfully");
    } catch (error) {
        unity.logger.error(error); // Log the error if image fails to load
        KIOSK_APP.slip_pay_image.src = "/static/image/Image_not_available.png";
    }
}

window.printer_test = printer_test;
async function printer_test() {
    // const slipInUrl = `/api/function/slip_in?transaction_id=1`;
    const slipInUrl = `/static/image/logo.jpg`;
    await loadSlipImage(slipInUrl);
    print_slip_pay();
}

window.print_slip_pay = print_slip_pay;
async function print_slip_pay() {
    if (await deviceAppService.getStatus()) {
        unity.showToastNotification({ msg: "Printing receipt in progress..." });
        const _reply = await deviceAppService.printImage(KIOSK_APP.slip_pay_image);
        unity.logger.debug(_reply);
        if (_reply) {
            unity.showToastNotification({ icon: "info", msg: `${_reply.msg}` });
        } else {
            unity.showToastNotification({ icon: "error", msg: "printSlip Error" });
        }
    } else {
        unity.showToastNotification({ icon: "warning", msg: "Not Install Device Helpper?" });
    }
    await unity.delay(500);
    handleBidyClick();
}

function update_printer_status(s, p) {
    let status = s == true ? "Connected" : "Disconnected";
    status += "<br>";
    status += p > 0 ? "Ok" : "EMPTY/OPENED";
    KIOSK_APP.printer_status.innerHTML = status;
}
async function init_status() {
    const _response = await deviceAppService.getPrinterStatus();
    unity.logger.debug("init_status", _response);
    if (_response.success) {
        update_printer_status(_response.connect, _response.paper_status);
    }
}
init_status();

async function input_qr_reader(qr) {
    unity.showToastNotification({ msg: qr });
    const input_data = unity.validateTransactionString(qr);
    submit_input_licence(input_data, "card_id");
}

new unity.WebSocketClient((e) => {
    unity.logger.debug(e);
    if (e.type == "event") {
        if (e.hw == "printer") {
            const data = e.data;
            update_printer_status(data[0], data[1]);
        } else if (e.hw == "serial_port") {
            const data = e.data;
            // unity.logger.debug(data.msg);s
            input_qr_reader(data.msg);
        }
    } else if (e.type == "cmd") {
        if (e.data == "RELOAD") {
            location.reload();
        }
    }
    // const jsonString = JSON.stringify(e);
    // unity.showToastNotification({ icon: "info", title: "WebSocketClient", msg: jsonString });
}, "localhost:8080");

// Start the deviceAppService
deviceAppService.init();
