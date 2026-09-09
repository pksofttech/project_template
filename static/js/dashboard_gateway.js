import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";
const debug = console.debug;
async function get_gateway_by_parking_id(id) {
    const respond = await unity.fetchApi("/api/gateway?parking_id=" + id, "get", null, "json");
    return respond.data ? respond.data : [];
}

window.show_dialog_gateway = show_dialog_gateway;
async function show_dialog_gateway(id) {
    const modal = Modal_GateWay;
    const btn_submit = modal.querySelector('[data-field="btn_submit"]');
    const btn_remove = modal.querySelector('[data-field="btn_remove"]');
    let respond = await unity.fetchApi(`/api/gateway?id=${id}`, "get", null, "json");
    if (respond.success) {
        const data = respond.data;
        console.log(data);
        unity.data2fields(data, modal);
    } else {
        unity.showDialogWarning({
            msg: JSON.stringify(respond),
        });
    }

    btn_submit.onclick = async function () {
        update_gateway(id);
    };
    btn_remove.classList.remove("hidden");
    btn_remove.onclick = async function () {
        remove_gateway(id);
    };
    modal.showModal();
}

async function remove_gateway(id) {
    if (!(await unity.dialogConfirm())) return;
    const respond = await unity.fetchApi(`/api/gateway?id=${id}`, "delete", null, "json");
    unity.logger.debug(respond);
    if (respond.success == true) {
        unity.showDialogSuccess({ msg: "Successful" });
        unity.delay(500);
        init(0);
        Modal_GateWay.close();
    } else {
        unity.logger.debug(respond);
        unity.showDialogWarning({
            msg: JSON.stringify(respond),
        });
    }
}

async function update_gateway(id) {
    const modal = Modal_GateWay;
    const formData = unity.fields2formData(modal);
    if (!formData) return;
    formData.append("id", id);
    unity.debugForm(formData);

    const respond = await unity.fetchApi(`/api/gateway`, "post", formData, "json");
    unity.logger.debug(respond);

    if (respond.success) {
        unity.showDialogSuccess({ msg: "Successful" });
        Init();
        Modal_GateWay.close();
    } else {
        unity.logger.debug(respond);
        unity.showDialogInfo({
            msg: JSON.stringify(respond),
        });
    }
}

window.add_gateway = add_gateway;
async function add_gateway(parking_id) {
    const modal = Modal_GateWay;

    unity.clear_fields(modal);

    modal.querySelector('[data-field="parking_id"]').value = parking_id;

    const btn_submit = modal.querySelector('[data-field="btn_submit"]');
    btn_submit.onclick = async function () {
        update_gateway(0);
    };
    modal.querySelector('[data-field="btn_remove"]').classList.add("hidden");

    modal.showModal();
}

async function Init() {
    let respond = await unity.fetchApi("/api/parking", "get", null, "json");
    if (respond.success == true) {
        const parkings = respond.data;
        debug(parkings);
        const parking_content = document.getElementById("parking_content");
        parking_content.innerHTML = "";
        const template_parking_gateway = document.getElementById("template_parking_gateway");
        const template_gateway_item = document.getElementById("template_gateway_item");
        const parking_id_select = Modal_GateWay.querySelector('[data-field="parking_id"]');
        parking_id_select.innerHTML = "";
        for (const parking of parkings) {
            console.log(parking);
            const _c = template_parking_gateway.content.cloneNode(true);
            _c.querySelector('[data-field="title"]').textContent = parking.name + " (" + parking.detail + ")";
            const content_gate_in = _c.querySelector('[data-field="content_gate_in"]');
            const content_gate_out = _c.querySelector('[data-field="content_gate_out"]');
            _c.querySelector('[data-field="btn_add"]').onclick = (e) => {
                add_gateway(parking.id);
            };
            const gateways = await get_gateway_by_parking_id(parking.id);
            console.log(gateways);
            for (const gateway of gateways) {
                const _c_item = template_gateway_item.content.cloneNode(true);

                _c_item.querySelector('[data-field="images_path"]').src = gateway.images_path;
                _c_item.querySelector('[data-field="id"]').textContent = gateway.id;
                _c_item.querySelector('[data-field="name"]').textContent = gateway.name;
                _c_item.querySelector('[data-field="type"]').textContent = gateway.type;
                let gate_status = gateway.status.toLocaleUpperCase();
                switch (gate_status) {
                    case "ENABLE":
                        gate_status = `<div class="badge badge-success badge-soft badge-sm">Active</div><br><div class="badge badge-success badge-sm">AntiPassBack</div>`;
                        break;
                    case "ENABLE-OFF-PASS-BACK":
                        gate_status = `<div class="badge badge-success badge-soft badge-sm">Active</div><br><div class="text-warning">AntiPassBack Disabled (Member)</div>`;
                        break;
                    case "ENABLE-OFF-PASS-BACK-ALL":
                        gate_status = `<div class="badge badge-success badge-soft badge-sm">Active</div><br><div class="badge badge-error text-white text-ellipsis badge-sm">AntiPassBack Disabled (All)</div>`;
                        break;
                    case "DISABLE":
                        gate_status = `<div class="badge badge-error badge-soft badge-sm">Lane Inactive</div>`;
                        break;

                    default:
                        break;
                }
                _c_item.querySelector('[data-field="status"]').innerHTML = gate_status;
                _c_item.querySelector('[data-field="control_open_url"]').innerHTML = gateway.control_open_url
                    ? `<div class="tooltip" data-tip="${gateway.control_open_url}">✅ Online</div>`
                    : "⛔ Offline";

                _c_item.querySelector('[data-field="ip_cameras"]').innerHTML = gateway.ip_cameras
                    ? `<div class="tooltip" data-tip="${gateway.ip_cameras}">✅ Online</div>`
                    : "⛔ Offline";

                _c_item.querySelectorAll('[data-field="gateway_btn_edit"]').forEach((btn) => {
                    btn.onclick = (e) => {
                        show_dialog_gateway(gateway.id);
                    };
                });

                switch (gateway.type) {
                    case "IN":
                    case "IN-SUB":
                        content_gate_in.appendChild(_c_item);
                        break;
                    case "OUT":
                    case "OUT-SUB":
                        content_gate_out.appendChild(_c_item);
                        break;
                    default:
                        break;
                }
            }
            parking_content.appendChild(_c);

            const option = document.createElement("option");
            option.text = parking.name + " (" + parking.detail + ")";
            option.value = parking.id;
            parking_id_select.add(option);
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
