import * as unity from "./unity.js";
// import * as datatable from "./datatable.js";

class DeviceAppService {
    isConnect = false;
    host = "http://localhost:8080";
    async getStatus() {
        const result = await unity.fetchApi(this.host + "/api/getstatus", "get", null, "json");
        if (!!result) {
            // debug(result);
            return result;
        }
        return null;
    }
    async printImage(element) {
        unity.showDialogInfo({
            title: "Processing...",
            msg: `<div class=text-center><div class="loading loading-spinner text-info loading-lg text-center"></div></div>`,
        });
        const formData = new FormData();
        formData.append("cmd", "PRINT_IMAGE");
        const canvas = document.getElementById("canvas_for_temp");
        canvas.width = element.width;
        canvas.height = element.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL("image/png");
        formData.append("image", await unity.dataURLtoFile(base64Image, "image"));
        // unity.showDialogInfo({ msg: formData });
        unity.debugForm(formData);
        const _reply = await unity.fetchApi(this.host + "/api/printImage", "post", formData, "json");
        // unity.showDialogSuccess({ msg: _reply.msg });
        Dialog_Info.close();
        if (!!_reply) {
            // debug(result);
            return _reply;
        }

        return null;
    }
}

export const deviceAppService = new DeviceAppService();


const page_kiosk = document.getElementById("page_kiosk");
const KIOSK_APP = {
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
};
const SOUND_PATH = `/static/sound/`;
const SOUNDS = {};
const SOUND_LIST = [
    "beep_01",
    "pay_success",
    "pay_cash",
    "pay_qr_code",
    "system_process",
    "thank_no_slip",
    "thank_slip",
    "ticketNotFound",
    "ready",
];

for (const _s of SOUND_LIST) {
    //unity.logger.debug(_s);
    SOUNDS[_s] = new Howl({
        src: [`${SOUND_PATH}${_s}.mp3`],
    });
}

function play_sound(sound) {
    //return;
    if (SOUND_LIST.includes(sound)) {
        SOUNDS[sound].play();
    } else {
        unity.logger.warn("No Sound :" + sound);
    }
}
play_sound("beep_01");

window.kenboard_event_input = kenboard_event_input;
function kenboard_event_input(t) {
    if (t.innerText.length == 1) {
        KIOSK_APP.input_licence.value += t.innerText;
    } else {
        switch (t.innerText.toLowerCase()) {
            case "del":
                KIOSK_APP.input_licence.value = KIOSK_APP.input_licence.value.slice(0, -1);
                break;
            case "clear":
                KIOSK_APP.input_licence.value = "";
                break;
            default:
                break;
        }
    }
}

window.onscreen_keyboard = onscreen_keyboard;
function onscreen_keyboard() {
    // t.blur();
    Dialog_Onscreen_Keyboard.showModal();
    // KIOSK_APP.input_licence.value = "4";
}
window.clear_input_licence = clear_input_licence;
function clear_input_licence() {
    Dialog_Onscreen_Keyboard.close();
    KIOSK_APP.input_licence.value = "";
}

window.handleBidyClick = handleBidyClick;
function handleBidyClick() {
    // const html_data = `<div class="text-4xl text-center">handleBidyClick<br></div>`;
    // unity.showToastNotification({ msg: html_data });
    // KIOSK_APP.input_card_id.focus();
}
window.submit_input_licence = submit_input_licence;
async function submit_input_licence(card_id = null) {
    Dialog_Onscreen_Keyboard.close();
    // let licence = String(KIOSK_APP.input_licence.value);
    if (card_id == null) {
        card_id = KIOSK_APP.input_card_id.value;
    }
    unity.logger.info(card_id);
    if (card_id) {
        const _reply = await unity.fetchApi(`/api/payment_transcation?licence=${card_id}`, "get", null, "json");
        if (_reply.success) {
            const transaction_datas = _reply.data;
            if (transaction_datas.length == 0) {
                // unity.showDialogWarning({ msg: "No parking record found for searched plate" });
                const html_data = `<div class="text-4xl text-center">No parking record found for searched plate<br>${card_id}</div>`;
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
                select_pay_transaction(_t.id);
            } else {
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
                        `select_pay_transaction(${_t.id});`,
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
        unity.showToastNotification({ msg: "Please enter license plate before proceeding" });
    }
}

let payment_transacrion = null;
window.clear_transaction = clear_transaction;
async function clear_transaction() {
    Dialog_Pay_Transaction.close();
    payment_transacrion = null;
    KIOSK_APP.input_card_id.value = "";
    await unity.delay(1000);
    KIOSK_APP.input_card_id.focus();
}

window.select_pay_transaction = select_pay_transaction;
async function select_pay_transaction(transaction_id) {
    unity.logger.debug("select_pay_transaction :" + transaction_id);
    payment_transacrion = null;
    document.activeElement.blur();
    const _api_path = `/api/function/check_out?card_id=${transaction_id} transaction_id`;
    const _reply = await unity.fetchApi(_api_path, "get", null, "json");

    if (_reply.success) {
        Dialog_Select_Transaction.close();
        payment_transacrion = _reply.data.transactions;
        const _acc = _reply.data.acc;
        const Account_Records = _reply.data.Account_Records;
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
        _c.querySelector('[name="transaction_image02"]').src = image_path.length == 1 ? image_path : image_path[1];

        if (_acc.amount == 0) {
            _c.querySelector('[name="btn_submit_payment"]').setAttribute("disabled", true);
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
            _c_1.querySelector('[name="btn_acc_e_slip"]').setAttribute("href", `${_account_record.remark}`);
            paymeny_list_content.appendChild(_c_1);
        }
        if (total_pay >= _acc.amount) {
            _c.querySelector('[name="btn_submit_payment"]').setAttribute("disabled", true);
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
    const payload = JSON.stringify({
        data: {
            id: ref,
        },
    });
    await unity.delay(500);
    while (Dialog_QR_Payment.getAttribute("open") !== null) {
        await unity.delay(1000);
        time_out_dis.innerText = --time_out;
        const _reply = await unity.fetchApi("/api/stripe/payment_promptpay_status", "post", payload, "json");
        if (_reply.success) {
            unity.logger.debug(_reply);
            success_pay(_reply);
            break;
        } else {
            // unity.showDialogError({ msg: _reply.error });
            unity.logger.info(_reply.data);
        }
        if (time_out <= 0) {
            break;
        }

        // if (time_out == 119) {
        //     success_pay(_reply);
        //     break;
        // }
    }

    Dialog_QR_Payment.close();
}

async function success_pay(params) {
    // unity.showDialogSuccess({ msg: _reply.data });
    play_sound("pay_success");
    const slipPayUrl = `/api/function/slip_pay_acc?acc_id=1`;
    await loadSlipImage(slipPayUrl);
    Dialog_Slip_Pay.showModal();
    while (Dialog_Slip_Pay.getAttribute("open") !== null) {
        await unity.delay(1000);
    }
    Dialog_Slip_Pay.close();
    clear_transaction();
}

window.thank_no_slip = thank_no_slip;
function thank_no_slip() {
    play_sound("thank_no_slip");
}

window.call_qr_payment = call_qr_payment;
async function call_qr_payment() {
    Dialog_Pay_Transaction.close();
    Dialog_Loading.showModal();
    if (payment_transacrion) {
        const _acc = payment_transacrion.acc;
        unity.logger.info(_acc);
        const payload = JSON.stringify({
            data: {
                amount: _acc.amount,
                type: "promptpay",
                "billing_details[email]": "pksofttecg@gmail.com",
            },
        });
        const _reply = await unity.fetchApi("/api/stripe/payment_promptpay", "post", payload, "json");
        unity.logger.info(_reply);
        Dialog_Loading.close();
        if (_reply.success) {
            KIOSK_APP.qrcode.clear();
            KIOSK_APP.qrcode.makeCode(_reply.data);
            Dialog_QR_Payment.showModal();
            // await unity.delay(200);
            wait_success_pay(120, _reply.ref);
        } else {
            unity.showDialogError({ msg: _reply.error });
        }
    }
}

window.cancel_pay = cancel_pay;
async function cancel_pay() {
    const result = await unity.showDialogConfirm({
        title: "Confirm Action",
        content: "Are you sure you want to cancel QR payment?",
    });
    if (result.confirm) {
        Dialog_QR_Payment.close();
        clear_transaction();
    }
}

KIOSK_APP.input_card_id.focus();

window.input_card_id = input_card_id;
async function input_card_id(e) {
    if (e.key === "Enter") {
        unity.logger.debug("Enter key pressed");
        // unity.showDialogError({ msg: KIOSK_APP.input_card_id.value });
        // unity.delay(1000);
        submit_input_licence(KIOSK_APP.input_card_id.value);
        KIOSK_APP.input_card_id.value = "";
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
        unity.showToastNotification({ msg: "Printing in progress..." });
        const _reply = await deviceAppService.printImage(KIOSK_APP.slip_pay_image);
        if (_reply) {
            unity.showToastNotification({ icon: "info", msg: "Successful" + `${_reply.ststus}` });
        } else {
            unity.showToastNotification({ icon: "error", msg: "printSlip Error" });
        }
    } else {
        unity.showToastNotification({ icon: "warning", msg: "Not Install Device Helpper?" });
    }
}

// KIOSK_APP.input_card_id.value = "3545564458";
// submit_input_licence();
