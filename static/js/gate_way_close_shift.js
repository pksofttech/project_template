import * as unity from "./unity.js";

async function set_init() {
    const date = new Date();
    const today = date.toISOString().split("T")[0];
    unity.logger.info(today);
    const last_close_time = localStorage.getItem("CLOSE_SHIFT_TIME");
    let last_close_time_start = "08:00";
    let last_close_time_end = "20:00";
    if (last_close_time) {
        try {
            const last_close_times = last_close_time.split(",");
            last_close_time_start = last_close_times[0];
            last_close_time_end = last_close_times[1];
        } catch (error) {
            unity.logger.error(error);
        }
    }
    document.getElementById("close_shift_start").value = today + "T" + last_close_time_start;
    document.getElementById("close_shift_end").value = today + "T" + last_close_time_end;
    await unity.delay(1000);
    // unity.logger.debug(unity.LOGIN_USER);
    document.getElementById("select_staff_name").value = unity.LOGIN_USER.id;
}
set_init();
//submit_close_shift();
window.submit_close_shift = submit_close_shift;
async function submit_close_shift() {
    const user_id = document.getElementById("select_staff_name").value;
    const close_shift_start = unity.isoToDatetimeLocal(document.getElementById("close_shift_start").value);
    const close_shift_end = unity.isoToDatetimeLocal(document.getElementById("close_shift_end").value);
    unity.logger.info(close_shift_start);
    if (user_id == "0") {
        unity.showToastNotification({ icon: "warning", title: "Please Select Shift Operator" });
        return;
    }
    if (!close_shift_start) {
        unity.showToastNotification({ icon: "warning", title: "Shift Start Time Missing" });
        return;
    }
    if (!close_shift_end) {
        unity.showToastNotification({ icon: "warning", title: "Shift End Time Missing" });
        return;
    }
    const start_time = String(close_shift_start).split("T")[1];
    const end_time = String(close_shift_end).split("T")[1];
    localStorage.setItem("CLOSE_SHIFT_TIME", `${start_time},${end_time}`);
    unity.logger.debug(localStorage.getItem("CLOSE_SHIFT_TIME"));
    const formData = new FormData();

    formData.append("select_staff_id", user_id);
    formData.append("close_shift_start", close_shift_start);
    formData.append("close_shift_end", close_shift_end);
    unity.debugForm(formData);
    const respond = await unity.fetchApi(`/api/transaction_record/close_shift`, "post", formData, "json");
    if (respond.success) {
        unity.logger.info(respond);
        generateShiftOrder(respond);

        const transaction_acc = respond.data;
        const table_acc_transaction = document.getElementById("table_acc_transaction");
        const temp = document.getElementById("template_content_transaction_data");

        table_acc_transaction.innerHTML = "";
        for (let trans of transaction_acc) {
            const tran = trans.Transaction_Record;
            const acc = trans.Account_Record;
            if (acc) {
                unity.logger.debug(acc);
                const _c = temp.content.cloneNode(true);
                _c.querySelector('[name="acc_no"]').textContent = acc.no;
                _c.querySelector('[name="acc_date"]').textContent = unity.dateTimeToStr(acc.date_time);
                _c.querySelector('[name="transaction_card_id"]').textContent = tran.card_id;
                _c.querySelector('[name="acc_amount"]').textContent = acc.amount;
                _c.querySelector('[name="fine_amount"]').textContent = acc.fine;
                _c.querySelector('[name="sum_amount"]').textContent = acc.amount + acc.fine;
                _c.querySelector('[name="status"]').textContent = tran.status;
                table_acc_transaction.appendChild(_c);
            }
        }
    } else {
        unity.showDialogError({ msg: respond.msg });
    }
}

function generateShiftOrder(shiftData) {
    function formatDateTime(str) {
        if (!str || str === "*") return "*";
        const d = new Date(str);
        return (
            d.toLocaleDateString("th-TH") + " " + d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
        );
    }
    const default_text = "*";
    const shift_no = shiftData.shift_no ? shiftData.shift_no : default_text;
    const shift_date = shiftData.shift_date ? formatDateTime(shiftData.shift_date) : default_text;
    const shift_staff = shiftData.shift_staff ? shiftData.shift_staff : default_text;
    const shift_start = shiftData.shift_start ? formatDateTime(shiftData.shift_start) : default_text;
    const shift_end = shiftData.shift_end ? formatDateTime(shiftData.shift_end) : default_text;
    const shift_record = shiftData.shift_record != undefined ? shiftData.shift_record : default_text;
    const shift_amount = shiftData.shift_amount != undefined ? shiftData.shift_amount : default_text;
    const fine_amount = shiftData.fine_amount != undefined ? shiftData.fine_amount : default_text;
    const sum_amount = shiftData.sum_amount != undefined ? shiftData.sum_amount : default_text;

    const shiftTitle = [
        shiftData.shift_title ? shiftData.shift_title : "***************************",
        `${shiftData.shift_title_01 ? formatDateTime(shiftData.shift_title_01) : default_text} - ${shiftData.shift_title_02 ? formatDateTime(shiftData.shift_title_02) : default_text}`,
    ];

    const lines = [
        ["Shift No.", shift_no],
        ["Date / Time", shift_date],
        ["Cashier / Operator", shift_staff],
        ["Shift Start", shift_start],
        ["Shift End", shift_end],
        ["Total Transactions", `${shift_record} records`],
        ["Total Service Fees", `${shift_amount} THB`],
        ["Total Fines", `${fine_amount} THB`],
        ["Grand Total", `${sum_amount} THB`],
    ];

    const baseHeight = 120;
    const lineHeight = 28;
    const totalLines = lines.length + 2;
    const totalHeight = baseHeight + totalLines * lineHeight + 60;

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = totalHeight;
    const ctx = canvas.getContext("2d");

    let y = 30;
    const center = canvas.width / 2;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#000";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Shift Order", center, y);
    y += 40;
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("** Shift Handover Summary **", center, y);
    y += 30;

    ctx.font = "22px monospace";
    ctx.textAlign = "center";
    const centerX = canvas.width / 2;

    shiftTitle.forEach((time) => {
        ctx.fillText(time, centerX, y);
        y += lineHeight;
    });

    y += 10;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(600, y);
    ctx.stroke();
    y += 20;

    lines.forEach(([label, value]) => {
        ctx.textAlign = "left";
        ctx.fillText(label, 40, y);
        ctx.textAlign = "right";
        ctx.fillText(value, canvas.width - 40, y);
        y += lineHeight;
    });

    y += 10;
    ctx.font = "italic 18px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("*** copy ***", canvas.width - 40, y);

    const dataURL = canvas.toDataURL("image/png");
    document.getElementById("print_shift_close_img").src = dataURL;
}

window.print_slip_shift = print_slip_shift;
function print_slip_shift() {
    printJS(document.getElementById("print_shift_close_img").src, "image");
}

document.addEventListener("DOMContentLoaded", async () => {
    generateShiftOrder({ shift_title: "Shift Handover Report" });
    unity.initI18n();
});
