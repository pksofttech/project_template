import * as unity from "./unity.js";
import { scan_qr_code } from "./service_helper.js";

let receipt_slip_docs = null;

window.openReceipt_info = openReceipt_info;
function openReceipt_info() {
    // Define the desired width and height of the new window
    const receipt_no = Dialog_Receipt_Slip.querySelector('[data-field="receipt_no"]');
    const width = 800;
    const height = 800;
    // Get the current screen dimensions
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    // Calculate the position to open the window (for example, on the right side of the main monitor)
    const left = 0;
    const top = 0;

    const params = `scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no,width=${width},height=${height},left=${left},top=${top}`;
    // const params = `scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no,width=${width},height=${height}`;
    receipt_slip_docs = window.open(`/receipt_info?receipt_no=${receipt_no.innerText}`, "sub", "sub", params);
}

window.save_customer_receipt = save_customer_receipt;
async function save_customer_receipt() {
    const receipt_no = Dialog_Receipt_Slip.querySelector('[data-field="receipt_no"]');
    const customer_name = Dialog_Receipt_Slip.querySelector('[data-field="customer_name"]');
    const customer_tax_id = Dialog_Receipt_Slip.querySelector('[data-field="customer_tax_id"]');
    const customer_address = Dialog_Receipt_Slip.querySelector('[data-field="customer_address"]');
    if (!customer_name.value || !customer_tax_id.value || !customer_address.value) {
        unity.showDialogInfo({ msg: "Please enter customer details" });
        return;
    }
    const formData = new FormData();
    formData.append("receipt_no", receipt_no.innerText);
    formData.append("customer_name", customer_name.value);
    formData.append("customer_tax_id", customer_tax_id.value);
    formData.append("customer_address", customer_address.value);

    const _reply = await unity.fetchApi("/api/account_record/no", "post", formData, "json");
    unity.logger.debug(_reply);
    if (_reply.success) {
        unity.showDialogSuccess({ msg: "Customer information saved successfully" });

        // Lock the inputs and show the lock message
        customer_name.readOnly = true;
        customer_tax_id.readOnly = true;
        customer_address.readOnly = true;

        const btn_save_customer = Dialog_Receipt_Slip.querySelector('[data-field="btn_save_customer"]');
        if (btn_save_customer) {
            btn_save_customer.style.display = "none";
            btn_save_customer.disabled = true;
        }

        const customer_info_locked_msg = document.getElementById("customer_info_locked_msg");
        if (customer_info_locked_msg) {
            customer_info_locked_msg.classList.remove("hidden");
        }
    }
}

window.check_receipt = check_receipt;
async function check_receipt() {
    const txt_no = document.getElementById("receipt_no_input").value;
    if (!txt_no) {
        unity.showDialogInfo({ msg: "Please enter receipt number" });
        return;
    }
    const receipt_no = Dialog_Receipt_Slip.querySelector('[data-field="receipt_no"]');
    const receipt_date = Dialog_Receipt_Slip.querySelector('[data-field="receipt_date"]');
    const receipt_type = Dialog_Receipt_Slip.querySelector('[data-field="receipt_type"]');
    const receipt_cashier = Dialog_Receipt_Slip.querySelector('[data-field="receipt_cashier"]');
    const receipt_sum_amount = Dialog_Receipt_Slip.querySelector('[data-field="receipt_sum_amount"]');

    const customer_name = Dialog_Receipt_Slip.querySelector('[data-field="customer_name"]');
    const customer_tax_id = Dialog_Receipt_Slip.querySelector('[data-field="customer_tax_id"]');
    const customer_address = Dialog_Receipt_Slip.querySelector('[data-field="customer_address"]');

    const btn_save_customer = Dialog_Receipt_Slip.querySelector('[data-field="btn_save_customer"]');

    const btn_openReceipt_info = Dialog_Receipt_Slip.querySelector('[data-field="btn_openReceipt_info"]');
    receipt_no.innerText = "-";
    receipt_date.innerHTML = "-";
    receipt_type.innerHTML = "-";
    receipt_cashier.innerHTML = "-";
    receipt_sum_amount.innerHTML = "-";

    customer_name.value = "";
    customer_tax_id.value = "";
    customer_address.value = "";

    btn_save_customer.disabled = true;
    customer_name.readOnly = true;
    customer_tax_id.readOnly = true;
    customer_address.readOnly = true;

    btn_save_customer.style.display = "block";
    const customer_info_locked_msg = document.getElementById("customer_info_locked_msg");
    if (customer_info_locked_msg) {
        customer_info_locked_msg.classList.add("hidden");
    }
    btn_openReceipt_info.disabled = true;
    const _reply = await unity.fetchApi("/api/account_record/no?receipt_no=" + txt_no, "get", null, "json");
    // unity.logger.debug(_reply);
    if (_reply.success) {
        const Account_Record = _reply.data.Account_Record;
        console.log(Account_Record);
        receipt_no.innerText = Account_Record.no;
        receipt_date.innerHTML = Account_Record.date_time.split(".")[0].replace("T", "<br>");
        receipt_type.innerHTML = Account_Record.type;
        receipt_cashier.innerHTML = Account_Record.cashier;
        const sum_amount = parseInt(Account_Record.amount) || 0 + parseInt(Account_Record.fine) || 0;
        receipt_sum_amount.innerHTML = sum_amount;
        if (Account_Record.customer_details) {
            try {
                const customer_details =
                    typeof Account_Record.customer_details === "object"
                        ? Account_Record.customer_details
                        : JSON.parse(Account_Record.customer_details);
                unity.logger.debug(customer_details);

                customer_name.value = customer_details.name || "";
                customer_tax_id.value = customer_details.tax_id || "";
                customer_address.value = customer_details.address || "";

                if (customer_info_locked_msg) {
                    customer_info_locked_msg.classList.remove("hidden");
                }
                btn_save_customer.style.display = "none";
            } catch (e) {
                console.warn("customer_details parse fallback:", e);
                customer_name.value = Account_Record.customer_details || "";
                customer_tax_id.value = "";
                customer_address.value = "";
                btn_save_customer.style.display = "none";
            }
        } else {
            btn_save_customer.disabled = false;
            customer_name.readOnly = false;
            customer_tax_id.readOnly = false;
            customer_address.readOnly = false;
            btn_save_customer.style.display = "block";
        }
        btn_openReceipt_info.disabled = false;
        Dialog_Receipt_Slip.showModal();
    } else {
        unity.showDialogInfo({ msg: "Receipt not found" });
    }
}

window.scan_receipt_qr = scan_receipt_qr;
export async function scan_receipt_qr() {
    scan_qr_code("RECEIPT", (data) => {
        const receiptInput = document.getElementById("receipt_no_input");
        if (receiptInput) {
            receiptInput.value = data;
            if (typeof check_receipt === "function") {
                check_receipt();
            }
        }
    });
}
