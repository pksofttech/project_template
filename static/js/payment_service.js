import * as unity from "./unity.js";

// 🌐 Centralized Multi-Language Delegation via Unity
export function getPaymentText(key) {
    return unity.t(key);
}

export function updatePageContent(root = document.body) {
    unity.updateContent(root);
}

export function setPageLanguage(lang) {
    unity.changeLang(lang);
}

window.changeLang = unity.changeLang;
window.setPageLanguage = setPageLanguage;
window.getPaymentText = getPaymentText;


const input_licence_1 = document.getElementById("input_licence_1");

if (input_licence_1) {
    input_licence_1.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            submit_input_licence();
        }
    });
}

window.submit_input_licence = submit_input_licence;
async function submit_input_licence() {
    const licence_1 = document.getElementById("input_licence_1").value;
    const licence = licence_1;
    if (licence) {
        const _reply = await unity.fetchApi(`/api/payment_transcation?licence=${licence}`, "get", null, "json");
        if (_reply.success) {
            const transaction_datas = _reply.data;
            if (transaction_datas.length == 0) {
                unity.showDialogWarning({ msg: getPaymentText("not_found_plate") });
                return;
            }
            const content_select_transaction = Dialog_Select_Transaction.querySelector('[data-field="content"]');
            content_select_transaction.innerHTML = "";
            const temp = document.getElementById("template_content_select_transaction");
            unity.logger.info(transaction_datas);
            for (const transaction_data of transaction_datas) {
                const _t = transaction_data.Transaction_Record;
                const _l = transaction_data.Log_Transaction;
                unity.logger.info(_t);
                const _c = temp.content.cloneNode(true);
                let licence_html = _t.card_id;
                if (_l.license !== "") {
                    licence_html += `<br><div class="badge badge-primary badge-soft">${_l.license}</div>`;
                }
                _c.querySelector('[name="licence"]').innerHTML = licence_html;

                const date_time_in = _l.date_time.split(".")[0].split("T");
                const date_time_in_html = `${date_time_in[0]}<br>${date_time_in[1]}`;
                _c.querySelector('[name="datetime_in"]').innerHTML = date_time_in_html;
                const image_path = _l.images_path.split(",");
                _c.querySelector('[name="transaction_image01"]').src = image_path[0];
                _c.querySelector('[name="transaction_image02"]').src = image_path[1];

                _c.querySelector('[name="select_btn_transaction"]').setAttribute(
                    "onclick",
                    `select_pay_transaction("${_t.card_id}")`,
                );

                content_select_transaction.appendChild(_c);
            }

            // Translate newly created elements inside dialog
            updatePageContent(content_select_transaction);

            Dialog_Select_Transaction.showModal();
        } else {
            unity.logger.info(_reply);
            unity.showDialogError({ msg: JSON.stringify(_reply) });
        }
    } else {
        unity.showToastNotification({ msg: getPaymentText("enter_plate_warning") });
    }
}

let payment_transacrion = null;
window.select_pay_transaction = select_pay_transaction;
async function select_pay_transaction(card_id) {
    payment_transacrion = null;
    document.activeElement.blur();
    const _api_path = `/api/function/check_out?card_id=${card_id}`;
    const _reply = await unity.fetchApi(_api_path, "get", null, "json");
    unity.logger.debug(_reply);
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

        const content_pay_transaction = Dialog_Pay_Transaction.querySelector('[data-field="content"]');
        content_pay_transaction.innerHTML = "";

        const temp = document.getElementById("template_content_pay_transaction");
        const _c = temp.content.cloneNode(true);

        const image_path = _Log_Transaction.images_path.split(",");

        _c.querySelector('[name="gateway_name"]').innerHTML = _gateway.name;
        _c.querySelector('[name="transaction_card_id"]').innerHTML = _tran.card_id;
        _c.querySelector('[name="transaction_licence"]').innerHTML = _Log_Transaction.license;
        const date_time_in = _Log_Transaction.date_time.split(".")[0].split("T");
        const date_time_in_html = `${date_time_in[0]}<br>${date_time_in[1]}`;
        _c.querySelector('[name="in_date_time"]').innerHTML = date_time_in_html;
        _c.querySelector('[name="parked_time"]').innerHTML = _acc.parked;
        _c.querySelector('[name="service_fees"]').innerHTML = _services ? _services.name : getPaymentText("no_fee_applied");

        const amount = Intl.NumberFormat("th-TH", {
            style: "currency",
            currency: "THB",
        }).format(_acc.amount);

        _c.querySelector('[name="amount"]').innerHTML = amount;
        _c.querySelector('[name="transaction_image02"]').src = image_path[0];

        if (_acc.amount == 0) {
            _c.querySelector('[name="btn_submit_payment"]').setAttribute("disabled", true);
        }

        const _date = new Date();
        _c.querySelector('[name="amount_at_time"]').innerHTML =
            `${_date.toLocaleDateString()} ${_date.toLocaleTimeString()}`;

        if (AUTO_MODULE_DEVICE_ID) {
            _c.querySelector('[name="amount_at_time"]').innerHTML +=
                `<div class="text-error text-lg">${GATE_OUT_DEVICE_NAME}<br>! Exit Kiosk Processing<br>Vehicle must be at the exit lane.<br>Session will finalize upon payment.</div>`;
        }
        const temp_1 = document.getElementById("template_content_payment_data");
        const paymeny_list_content = _c.querySelector('[name="paymeny_list_content"]');
        let total_pay = 0;
        for (const l of Account_Records) {
            unity.logger.info(l);
            const _account_record = l.Account_Record;
            total_pay += _account_record.amount;
            const _c_1 = temp_1.content.cloneNode(true);
            _c_1.querySelector('[name="acc_no"]').textContent = _account_record.no;
            _c_1.querySelector('[name="cashier"]').textContent = _account_record.cashier;
            _c_1.querySelector('[name="acc_amount"]').textContent = unity.toCurrency(_account_record.amount);
            const date_time_pay = _account_record.date_time.split(".")[0].replace("T", " ");
            _c_1.querySelector('[name="acc_date"]').textContent = date_time_pay;
            _c_1.querySelector('[name="btn_acc_e_slip"]').setAttribute(
                "href",
                `/payment_service_success_eslip/TRANSACTION_PAY=${_account_record.id}`,
            );
            _c_1.querySelector('[name="btn_acc_receipt"]').setAttribute(
                "href",
                `/api/function/slip_pay_acc?acc_id=${_account_record.id}`,
            );
            _c_1.querySelector('[name="btn_acc_tax_invoice"]').setAttribute(
                "href",
                `/receipt_docs?inv_no=${_account_record.no}`,
            );
            paymeny_list_content.appendChild(_c_1);
        }
        if (total_pay >= _acc.amount) {
            _c.querySelector('[name="btn_submit_payment"]').setAttribute("disabled", true);
            _c.querySelector('[name="btn_submit_payment"]').classList.add("hidden");
        } else {
            const pay_amount = _acc.amount - total_pay;
            _c.querySelector('[name="paymeny_for_pay"]').textContent = unity.toCurrency(pay_amount);
            _c.querySelector('[name="btn_submit_payment"]').setAttribute(
                "href",
                `/payment_call?transaction_id=${_tran.id}&amount=${pay_amount}&card_id=${_tran.card_id}&auto_module_device_id=${AUTO_MODULE_DEVICE_ID}`,
            );
        }

        // Translate newly created elements inside pay dialog
        updatePageContent(_c);

        content_pay_transaction.appendChild(_c);
        Dialog_Pay_Transaction.showModal();
    } else {
        unity.showToastNotification({ msg: _reply.msg });
    }
}

if (CARD_ID) {
    unity.logger.debug("🌐⚡  CARD_ID :" + CARD_ID);
    select_pay_transaction(CARD_ID);
}

window.btn_submit_payment_click = btn_submit_payment_click;
function btn_submit_payment_click() {
    unity.showDialogLoading(getPaymentText("processing_wait"));
}

document.addEventListener("DOMContentLoaded", async () => {
    await unity.initI18n();
});
