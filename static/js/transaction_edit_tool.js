import * as unity from "./unity.js";

let transactions = null;

window.update_time_in = update_time_in;
async function update_time_in(value) {
    console.log("update_time_in", value);
    if (transactions) {
        const Log_Transaction = transactions.Log_Transaction;
        if (Log_Transaction) {
            console.log(Log_Transaction);
            const payload = { date_time: value };
            const response = await unity.fetchApi(
                `/api/transaction_record/log_transaction/${Log_Transaction.id}`,
                "post",
                JSON.stringify(payload),
                "json",
            );
            console.log(response);
            if (response.success) {
                unity.showToastNotification({
                    title: "Time in updated successfully.",
                    type: "success",
                });
            } else {
                unity.showToastNotification({
                    title: "Time in update failed.",
                    type: "error",
                    msg: response.msg,
                });
            }
        }
    }
}

window.transaction_search_input_key_event = transaction_search_input_key_event;
async function transaction_search_input_key_event(e) {
    if (e.key === "Enter") {
        e.preventDefault(); // Prevent default form submission
        console.log("ENTER!");
        const card_id = e.target.value;
        const response = await unity.fetchApi(`/api/function/check_out?card_id=${card_id}`, "get", null, "json");
        console.log(response);
        if (response.success) {
            e.target.value = "";

            const data = response.data;
            console.log(data);
            if (data) {
                transactions = data.transactions;
                const Transaction_Record = transactions.Transaction_Record;
                const GateWay = transactions.GateWay;
                const Log_Transaction = transactions.Log_Transaction;
                console.log(Log_Transaction);
                document.getElementById("transaction_id").textContent = Transaction_Record.id;
                const table_transaction_data = document.getElementById("table_transaction_data");
                table_transaction_data.querySelector('[data-field="gate_in"]').textContent = GateWay.name;
                table_transaction_data.querySelector('[data-field="time_in"]').value = unity.dateTimeToStr(
                    Log_Transaction.date_time,
                    "YYYY-MM-DDTHH:mm",
                );
            }
        }
        return;
    }

    // Debug log
    // console.log(e.key, e.code);
}
