import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

const gate_in_config = document.getElementById("gate_in_config");
const gate_out_config = document.getElementById("gate_out_config");
window.gate_select_id = gate_select_id;
async function gate_select_id(gate_id, mode = "IN") {
    const respond = await unity.fetchApi(`/api/gateway?id=${gate_id}`, "get", null, "json");
    const data = respond.data;
    console.log(data);
    if (!data) {
        return;
    }

    const gate_select = mode == "IN" ? gate_in_config : gate_out_config;

    if (data.type != "IN" && mode == "IN") {
        gate_select.querySelector('[data-field="gate_select_id"]').value = 0;
        unity.showDialogWarning({
            msg: "Invalid configuration parameters",
        });
        return;
    }

    if (data.type != "OUT" && mode == "OUT") {
        gate_select.querySelector('[data-field="gate_select_id"]').value = 0;
        unity.showDialogWarning({
            msg: "Invalid configuration parameters",
        });
        return;
    }

    gate_select.querySelector('[data-field="gate_id"]').textContent = data.id;
    gate_select.querySelector('[data-field="type"]').value = data.type;
    gate_select.querySelector('[data-field="status"]').value = data.status;
    gate_select.querySelector('[data-field="remark"]').textContent = data.remark;
}

window.submit_config_gate_in = submit_config_gate_in;
function submit_config_gate_in() {
    if (!!gate_in_config.querySelector('[data-field="gate_id"]').textContent) {
        localStorage.setItem("GATE_IN_ID", gate_in_config.querySelector('[data-field="gate_id"]').textContent);
        localStorage.setItem(
            "SELECT_GATE_IN_ENABLE",
            gate_in_config.querySelector('[data-field="auto_mode_lpr"]').checked,
        );
        localStorage.setItem("P3000_LED_IP_GATE_IN", gate_in_config.querySelector('[data-field="display_ip"]').value);
        localStorage.setItem("CAMERA_LIVE_GATE_IN", gate_in_config.querySelector('[data-field="camera_live"]').value);

        unity.showDialogSuccess({
            title: `Configured successfully. GATE-IN ID: ${localStorage.getItem("GATE_IN_ID")}`,
            msg: `GATE ID : ${localStorage.getItem("GATE_IN_ID")}
            <br>SELECT_GATE_IN_ENABLE : ${localStorage.getItem("SELECT_GATE_IN_ENABLE")}
            <br>P3000_LED_IP : ${localStorage.getItem("P3000_LED_IP_GATE_IN")}
            <br>CAMERA_LIVE_GATE_IN : ${localStorage.getItem("CAMERA_LIVE_GATE_IN")}`,
        });
    }
}
window.submit_config_gate_out = submit_config_gate_out;
function submit_config_gate_out() {
    if (!!gate_out_config.querySelector('[data-field="gate_id"]').textContent) {
        localStorage.setItem("GATE_OUT_ID", gate_out_config.querySelector('[data-field="gate_id"]').textContent);
        localStorage.setItem(
            "SELECT_GATE_OUT_ENABLE",
            gate_out_config.querySelector('[data-field="auto_mode_lpr"]').checked,
        );
        localStorage.setItem("P3000_LED_IP_GATE_OUT", gate_out_config.querySelector('[data-field="display_ip"]').value);
        localStorage.setItem("CAMERA_LIVE_GATE_OUT", gate_out_config.querySelector('[data-field="camera_live"]').value);

        unity.showDialogSuccess({
            title: `Configured successfully. GATE-OUT ID: ${localStorage.getItem("GATE_OUT_ID")}`,
            msg: `GATE ID : ${localStorage.getItem("GATE_OUT_ID")}
            <br>SELECT_GATE_OUT_ENABLE : ${localStorage.getItem("SELECT_GATE_OUT_ENABLE")}
            <br>P3000_LED_IP : ${localStorage.getItem("P3000_LED_IP_GATE_OUT")}
            <br>CAMERA_LIVE_GATE_OUT : ${localStorage.getItem("CAMERA_LIVE_GATE_OUT")}`,
        });
    }
}

window.submit_config_gate_in_service_fee = submit_config_gate_in_service_fee;
function submit_config_gate_in_service_fee() {
    localStorage.setItem("GATE_IN_SERVICES_FEE", gate_in_config.querySelector('[data-field="service_fees_id"]').value);

    unity.showDialogSuccess({
        msg: `Configured successfully. GATE IN SERVICES_FEE: ${localStorage.getItem("GATE_IN_SERVICES_FEE")}`,
    });
}
async function init_select_option() {
    await unity.init_selects_option(
        [
            gate_in_config.querySelector('[data-field="gate_select_id"]'),
            gate_out_config.querySelector('[data-field="gate_select_id"]'),
        ],
        "/api/gateway",
    );

    await unity.init_selects_option(
        [gate_in_config.querySelector('[data-field="service_fees_id"]')],
        "/api/service_fees",
    );
}
async function Init() {
    await init_select_option();
    gate_in_config.querySelector('[data-field="gate_id"]').textContent = localStorage.getItem("GATE_IN_ID") || "-";
    gate_in_config.querySelector('[data-field="display_ip"]').value = localStorage.getItem("P3000_LED_IP_GATE_IN") || "";
    gate_in_config.querySelector('[data-field="camera_live"]').value = localStorage.getItem("CAMERA_LIVE_GATE_IN") || "";
    gate_in_config.querySelector('[data-field="auto_mode_lpr"]').checked =
        localStorage.getItem("SELECT_GATE_IN_ENABLE") === "true";

    gate_in_config.querySelector('[data-field="service_fees_id"]').value = localStorage.getItem("GATE_IN_SERVICES_FEE") || "";

    gate_out_config.querySelector('[data-field="gate_id"]').textContent = localStorage.getItem("GATE_OUT_ID") || "-";
    gate_out_config.querySelector('[data-field="display_ip"]').value = localStorage.getItem("P3000_LED_IP_GATE_OUT") || "";
    gate_out_config.querySelector('[data-field="camera_live"]').value = localStorage.getItem("CAMERA_LIVE_GATE_OUT") || "";

    gate_out_config.querySelector('[data-field="auto_mode_lpr"]').checked =
        localStorage.getItem("SELECT_GATE_OUT_ENABLE") === "true";

    if (localStorage.getItem("GATE_IN_ID")) {
        gate_select_id(localStorage.getItem("GATE_IN_ID"), "IN");
    }
    if (localStorage.getItem("GATE_OUT_ID")) {
        gate_select_id(localStorage.getItem("GATE_OUT_ID"), "OUT");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
