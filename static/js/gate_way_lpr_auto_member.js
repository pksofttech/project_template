import * as unity from "./unity.js";
// import * as webrtc_stream from "./webrtc_stream.js";
// import * as datatable from "./datatable.js";
const time_out_hb = 30000;
class LPR_DEVICE {
    constructor(id, device_name, device_id) {
        this.id = id;
        this.device_name = device_name;
        this.device_id = device_id;
    }
    hearbeat_lpr = null;
    last_hearbeat_lpr = new Date().getTime();
}

let _temp = document.getElementById("gate_in_page");
const GATE_WAY_IN = {
    gate_in_header: _temp.querySelector('[data-field="gate_header"]'),
    gates: [],
    lpr_devices: [],
    gate_info: _temp.querySelector('[data-field="gate_info"]'),
    device_name: _temp.querySelector('[data-field="device_name"]'),
    plate_num: _temp.querySelector('[data-field="plate_num"]'),

    transaction_status: _temp.querySelector('[data-field="transaction_status"]'),
    date_time: _temp.querySelector('[data-field="date_time"]'),
    gate_control: _temp.querySelector('[data-field="gate_control"]'),

    lpr_msg_type: _temp.querySelector('[data-field="lpr_msg_type"]'),
    card_owner: _temp.querySelector('[data-field="card_owner"]'),
    card_type: _temp.querySelector('[data-field="card_type"]'),
    card_expire_day: _temp.querySelector('[data-field="card_expire_day"]'),
    service_fees: _temp.querySelector('[data-field="service_fees"]'),

    image_01: _temp.querySelector('[data-field="image_01"]'),
    image_02: _temp.querySelector('[data-field="image_02"]'),

    table_of_lpr_log_gate: _temp.querySelector('[data-field="table_of_lpr_log_gate"]'),
};

_temp = document.getElementById("gate_out_page");
const GATE_WAY_OUT = {
    gate_in_header: _temp.querySelector('[data-field="gate_header"]'),
    lpr_devices: [],
    gates: [],
    gate_info: _temp.querySelector('[data-field="gate_info"]'),
    device_name: _temp.querySelector('[data-field="device_name"]'),
    plate_num: _temp.querySelector('[data-field="plate_num"]'),
    transaction_status: _temp.querySelector('[data-field="transaction_status"]'),
    date_time: _temp.querySelector('[data-field="date_time"]'),
    gate_control: _temp.querySelector('[data-field="gate_control"]'),
    lpr_msg_type: _temp.querySelector('[data-field="lpr_msg_type"]'),
    card_owner: _temp.querySelector('[data-field="card_owner"]'),
    card_type: _temp.querySelector('[data-field="card_type"]'),
    in_date_time: _temp.querySelector('[data-field="in_date_time"]'),
    parked_time: _temp.querySelector('[data-field="parked_time"]'),

    image_in_01: _temp.querySelector('[data-field="image_in_01"]'),
    image_in_02: _temp.querySelector('[data-field="image_in_02"]'),
    image_01: _temp.querySelector('[data-field="image_01"]'),
    image_02: _temp.querySelector('[data-field="image_02"]'),

    table_of_lpr_log_gate: _temp.querySelector('[data-field="table_of_lpr_log_gate"]'),
};

async function Init() {
    // try {
    unity.logger.info("   setting_gate_way    ");

    let lpr_list = [];
    let respond = await unity.fetchApi(`/api/devices/lpr_camera`, "get", null, "json");
    if (respond.success) {
        lpr_list = respond.data;
        // unity.logger.info(lpr_list);
    } else {
        unity.showToastNotification({ msg: respond.msg });
    }

    let reader_list = [];
    respond = await unity.fetchApi(`/api/devices/reader_device`, "get", null, "json");
    if (respond.success) {
        reader_list = respond.data;
        // unity.logger.info(reader_list);
    } else {
        unity.showToastNotification({ msg: respond.msg });
    }

    respond = await unity.fetchApi("/api/gateway", "get", null, "json");
    if (respond.success) {
        const gateways = respond.data;
        // unity.logger.info(gateways);
        const temp = document.getElementById("template_gate_stat");
        const temp_lpr_content = document.getElementById("lpr_content");
        const temp_reader_content = document.getElementById("reader_content");
        gateways.forEach((gateway) => {
            if (["IN", "IN-SUB"].includes(gateway.type.toUpperCase())) {
                unity.logger.info(gateway);
                const _c = temp.content.cloneNode(true);
                const _g_name = _c.querySelector('[data-field="gate_name"]');
                const _g_emer_open_btn = _c.querySelector('[data-field="gate_emergency_open"]');
                _g_emer_open_btn.onclick = function () {
                    unity.openGateForce(gateway.id, true, gateway.control_open_url, gateway.name);
                };
                const gate_status = gateway.status.toUpperCase();
                _g_name.innerText = gateway.name;

                switch (gate_status) {
                    case "ENABLE":
                        _c.querySelector('[data-field="gate_pass_back"]').classList.remove("hidden");
                        break;
                    case "DISABLE":
                        _g_name.innerText += "\nLane Deactivated";
                        break;
                    default:
                        break;
                }

                const _g_toggle = _c.querySelector('[data-field="gate_toggle_set_event"]');
                _g_toggle.value = gateway.id;
                const lpr_content = _c.querySelector('[data-field="lpr_content"]');
                for (let i = 0; i < lpr_list.length; i++) {
                    const lpr = lpr_list[i];
                    if (lpr.gateway_id == gateway.id) {
                        // unity.logger.info(lpr);
                        const lpr_device = new LPR_DEVICE(lpr.id, lpr.device_name, lpr.device_id);
                        const _c_lpr_content = temp_lpr_content.content.cloneNode(true);
                        _c_lpr_content.querySelector('[data-field="lpr_name"]').innerText = lpr_device.device_name;
                        lpr_device.hearbeat_lpr = _c_lpr_content.querySelector('[data-field="hearbeat_lpr"]');
                        lpr_content.appendChild(_c_lpr_content);
                        GATE_WAY_IN.lpr_devices.push(lpr_device);
                    }
                }

                for (let i = 0; i < reader_list.length; i++) {
                    const reader = reader_list[i];
                    if (reader.gateway_id == gateway.id) {
                        // unity.logger.info(lpr);
                        const reader_device = new LPR_DEVICE(reader.id, reader.device_name, reader.device_name);
                        const _c_reader_content = temp_reader_content.content.cloneNode(true);
                        _c_reader_content.querySelector('[data-field="lpr_name"]').innerText =
                            reader_device.device_name;
                        // reader_device.hearbeat_lpr = _c_reader_content.querySelector('[data-field="hearbeat_lpr"]');
                        lpr_content.appendChild(_c_reader_content);
                        GATE_WAY_IN.lpr_devices.push(reader_device);
                    }
                }

                const _active = localStorage.getItem(`GATE_CHECKED_ID${gateway.id}`) == "false" ? false : true;
                _g_toggle.checked = _active;
                if (!_active) {
                    _g_name.classList.add("line-through");
                }
                // unity.logger.info(_active);
                const gate = {
                    id: gateway.id,
                    gate_element: _g_name,
                    gate_toggle_set_event: _g_toggle,
                    gate_toggle: _active,
                };
                GATE_WAY_IN.gates.push(gate);
                GATE_WAY_IN.gate_in_header.appendChild(_c);
            }
            if (["OUT", "OUT-SUB"].includes(gateway.type.toUpperCase())) {
                // unity.logger.info(gateway);
                const _c = temp.content.cloneNode(true);
                const _g_name = _c.querySelector('[data-field="gate_name"]');
                const _g_emer_open_btn = _c.querySelector('[data-field="gate_emergency_open"]');
                _g_emer_open_btn.onclick = function () {
                    unity.openGateForce(gateway.id, true, gateway.control_open_url, gateway.name);
                };
                const gate_status = gateway.status.toUpperCase();
                _g_name.innerText = gateway.name;
                switch (gate_status) {
                    case "ENABLE":
                        _c.querySelector('[data-field="gate_pass_back"]').classList.remove("hidden");
                        break;
                    case "DISABLE":
                        _g_name.innerText += "\nLane Deactivated";
                        break;
                    default:
                        break;
                }
                const _g_toggle = _c.querySelector('[data-field="gate_toggle_set_event"]');
                _g_toggle.value = gateway.id;
                const lpr_content = _c.querySelector('[data-field="lpr_content"]');
                for (let i = 0; i < lpr_list.length; i++) {
                    const lpr = lpr_list[i];
                    if (lpr.gateway_id == gateway.id) {
                        // unity.logger.info(lpr);
                        const lpr_device = new LPR_DEVICE(lpr.id, lpr.device_name, lpr.device_id);
                        const _c_lpr_content = temp_lpr_content.content.cloneNode(true);
                        _c_lpr_content.querySelector('[data-field="lpr_name"]').innerText = lpr_device.device_name;
                        lpr_device.hearbeat_lpr = _c_lpr_content.querySelector('[data-field="hearbeat_lpr"]');
                        lpr_content.appendChild(_c_lpr_content);
                        GATE_WAY_OUT.lpr_devices.push(lpr_device);
                    }
                }
                for (let i = 0; i < reader_list.length; i++) {
                    const reader = reader_list[i];
                    if (reader.gateway_id == gateway.id) {
                        // unity.logger.info(lpr);
                        const reader_device = new LPR_DEVICE(reader.id, reader.device_name, reader.device_name);
                        const _c_reader_content = temp_reader_content.content.cloneNode(true);
                        _c_reader_content.querySelector('[data-field="lpr_name"]').innerText =
                            reader_device.device_name;
                        // reader_device.hearbeat_lpr = _c_reader_content.querySelector('[data-field="hearbeat_lpr"]');
                        lpr_content.appendChild(_c_reader_content);
                        GATE_WAY_OUT.lpr_devices.push(reader_device);
                    }
                }

                const _active = localStorage.getItem(`GATE_CHECKED_ID${gateway.id}`) == "false" ? false : true;
                _g_toggle.checked = _active;
                if (!_active) {
                    _g_name.classList.add("line-through");
                }
                // unity.logger.info(_active);
                const gate = {
                    id: gateway.id,
                    gate_element: _g_name,
                    gate_toggle_set_event: _g_toggle,
                    gate_toggle: _active,
                };
                GATE_WAY_OUT.gates.push(gate);
                GATE_WAY_OUT.gate_in_header.appendChild(_c);
            }
        });
    } else {
        unity.showDialogError({ title: "Invalid parking_id", msg: respond.msg });
        // location.href = "/station_config";
        return;
    }
    unity.logger.info("*************  end ****************");
    setInterval(() => {
        lpr_heartbeat_info();
    }, time_out_hb);
}

function lpr_heartbeat_info() {
    const d = new Date().getTime();
    GATE_WAY_IN.lpr_devices.forEach((lpr) => {
        if (lpr.hearbeat_lpr) {
            const hb = d - lpr.last_hearbeat_lpr;
            lpr.hearbeat_lpr.classList.remove("badge-error");
            lpr.hearbeat_lpr.classList.remove("badge-success");
            if (hb > time_out_hb) {
                lpr.hearbeat_lpr.classList.add("badge-error");
            } else {
                lpr.hearbeat_lpr.classList.add("badge-success");
            }
        }
    });
    GATE_WAY_OUT.lpr_devices.forEach((lpr) => {
        if (lpr.hearbeat_lpr) {
            const hb = d - lpr.last_hearbeat_lpr;
            lpr.hearbeat_lpr.classList.remove("badge-error");
            lpr.hearbeat_lpr.classList.remove("badge-success");
            if (hb > time_out_hb) {
                lpr.hearbeat_lpr.classList.add("badge-error");
            } else {
                lpr.hearbeat_lpr.classList.add("badge-success");
            }
        }
    });
}

window.gate_toggle_set_event = gate_toggle_set_event;
function gate_toggle_set_event(t) {
    // unity.logger.info(t.checked);
    // unity.logger.info(t.value);
    GATE_WAY_IN.gates.forEach((g) => {
        if (g.id == t.value) {
            const p = g.gate_element.parentElement;
            g.gate_toggle = t.checked;
            if (g.gate_toggle) {
                g.gate_element.classList.remove("line-through");
            } else {
                g.gate_element.classList.add("line-through");
            }
            localStorage.setItem(`GATE_CHECKED_ID${g.id}`, String(g.gate_toggle));
            // unity.logger.info(g);
        }
    });
    GATE_WAY_OUT.gates.forEach((g) => {
        if (g.id == t.value) {
            g.gate_toggle = t.checked;
            if (g.gate_toggle) {
                g.gate_element.classList.remove("line-through");
            } else {
                g.gate_element.classList.add("line-through");
            }
            localStorage.setItem(`GATE_CHECKED_ID${g.id}`, String(g.gate_toggle));
            // unity.logger.info(g);
        }
    });
}

unity.initSse(async (e) => {
    const func = e.func;
    const params = e.params;
    if ((func == "lpr_event") | (func == "reader_event")) {
        let gate_type = "N/A";
        for (let i = 0; i < GATE_WAY_IN.lpr_devices.length; i++) {
            const device = GATE_WAY_IN.lpr_devices[i];
            if (device.device_id == params.device_id) {
                gate_type = "IN";
                break;
            }
        }
        for (let i = 0; i < GATE_WAY_OUT.lpr_devices.length; i++) {
            const device = GATE_WAY_OUT.lpr_devices[i];
            if (device.device_id == params.device_id) {
                gate_type = "OUT";
                break;
            }
        }
        if (func == "reader_event") {
            await unity.delay(1000);
        }
        if (gate_type == "IN") {
            GATE_WAY_IN.gates.forEach((g) => {
                // unity.logger.debug(g.gate_element.innerText);
                if (g.gate_element.innerText == params.gate_name) {
                    if (g.gate_toggle) {
                        // unity.logger.info(g.gate_element.innerText);
                        unity.showToastNotification({
                            type: params.toastr,
                            msg: `Processing entry transaction<br>${params.info}`,
                        });
                        GATE_WAY_IN.image_01.src = params.images_path_01;
                        GATE_WAY_IN.image_02.src = params.images_path_02;

                        GATE_WAY_IN.gate_info.textContent = params.gate_name;
                        GATE_WAY_IN.device_name.textContent = params.device_name;
                        GATE_WAY_IN.plate_num.textContent = params.plate_num;

                        GATE_WAY_IN.transaction_status.textContent = params.status;
                        GATE_WAY_IN.date_time.textContent = params.date_time;
                        GATE_WAY_IN.gate_control.textContent = params.gate_control;

                        GATE_WAY_IN.lpr_msg_type.textContent = params.lpr_msg_type;
                        GATE_WAY_IN.card_owner.textContent = params.card_owner;
                        GATE_WAY_IN.card_type.textContent = params.card_type;
                        GATE_WAY_IN.card_expire_day.textContent = params.card_expire_day ? params.card_expire_day : "-";
                        GATE_WAY_IN.service_fees.textContent = params.service_fees ? params.service_fees : "-";

                        if (params.transaction_result) {
                            const table = GATE_WAY_IN.table_of_lpr_log_gate.getElementsByTagName("tbody")[0];
                            const newRow = table.insertRow(0);

                            const cell1 = newRow.insertCell(0);
                            const cell2 = newRow.insertCell(1);
                            const cell3 = newRow.insertCell(2);
                            const cell4 = newRow.insertCell(3);
                            const cell5 = newRow.insertCell(4);
                            const cell6 = newRow.insertCell(5);

                            cell1.innerHTML = `<div class="w-24 rounded-box"><img src="${params.images_path_01}" onerror="this.onerror=null;this.src='/static/image/Image_not_available.jpg';"/></div>`;
                            cell2.textContent = params.gate_name;
                            cell3.textContent = params.plate_num;
                            cell4.textContent = params.date_time;
                            cell5.textContent = params.card_type;
                            cell6.textContent = params.card_owner;

                            if (table.rows.length > 10) {
                                table.deleteRow(-1); // Removes the last row
                            }
                        }
                    }
                    return;
                }
            });
        } else if (gate_type == "OUT") {
            GATE_WAY_OUT.gates.forEach((g) => {
                if (g.gate_element.innerText == params.gate_name) {
                    if (g.gate_toggle) {
                        unity.showToastNotification({
                            type: params.toastr,
                            msg: `Processing exit transaction<br>${params.info}`,
                        });
                        GATE_WAY_OUT.gate_info.textContent = params.gate_name;
                        GATE_WAY_OUT.device_name.textContent = params.device_name;
                        GATE_WAY_OUT.plate_num.textContent = params.plate_num;

                        const images_in_path = params.images_in_path.split(",");
                        GATE_WAY_OUT.image_in_01.src = images_in_path[0]
                            ? images_in_path[0]
                            : "/static/image/Image_not_available.png";
                        GATE_WAY_OUT.image_in_02.src = images_in_path[1]
                            ? images_in_path[1]
                            : "/static/image/Image_not_available.png";
                        GATE_WAY_OUT.image_01.src = params.images_path_01;
                        GATE_WAY_OUT.image_02.src = params.images_path_02;
                        GATE_WAY_OUT.transaction_status.textContent = params.status;
                        GATE_WAY_OUT.date_time.textContent = params.date_time;
                        GATE_WAY_OUT.gate_control.textContent = params.gate_control;
                        GATE_WAY_OUT.lpr_msg_type.textContent = params.lpr_msg_type;
                        GATE_WAY_OUT.card_owner.textContent = params.card_owner;
                        GATE_WAY_OUT.card_type.textContent = params.card_type;
                        GATE_WAY_OUT.in_date_time.innerHTML = params.in_date_time ? params.in_date_time : "";
                        GATE_WAY_OUT.parked_time.innerHTML = params.parked ? params.parked : "";
                        if (params.transaction_result) {
                            const table = GATE_WAY_OUT.table_of_lpr_log_gate.getElementsByTagName("tbody")[0];
                            const newRow = table.insertRow(0);
                            const cell1 = newRow.insertCell(0);
                            const cell2 = newRow.insertCell(1);
                            const cell3 = newRow.insertCell(2);
                            const cell4 = newRow.insertCell(3);
                            const cell5 = newRow.insertCell(4);
                            const cell6 = newRow.insertCell(5);
                            cell1.innerHTML = `<div class="w-24 rounded-box"><img src="${params.images_path_01}" onerror="this.onerror=null;this.src='/static/image/Image_not_available.jpg';"/></div>`;
                            cell2.textContent = params.gate_name;
                            cell3.textContent = params.plate_num;
                            cell4.textContent = params.date_time;
                            cell5.textContent = params.card_type;
                            cell6.textContent = params.card_owner;
                            if (table.rows.length > 10) {
                                table.deleteRow(-1); // Removes the last row
                            }
                        }
                    }
                    return;
                }
            });
        } else {
            unity.showToastNotification({ type: params.toastr, msg: `Device data mismatch<br>${params.device_id}` });
        }
    }

    if (func == "lpr_heartbeat") {
        const lpr_heartbeat = String(new Date()).split("GMT")[0];
        const d = new Date().getTime();
        GATE_WAY_IN.lpr_devices.forEach((lpr) => {
            if (lpr.device_id == params.device_id) {
                lpr.last_hearbeat_lpr = d;
            }
        });

        GATE_WAY_OUT.lpr_devices.forEach((lpr) => {
            if (lpr.device_id == params.device_id) {
                lpr.last_hearbeat_lpr = d;
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
