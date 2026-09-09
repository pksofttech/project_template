import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// License Plate Mapping Table
const plate_map_model_table = new table_class.TableModel(
    "#license_plate_map_table",
    "/api/license_plate/map/datatable",
    {
        table: "Plate_Map",
        columns: [
            {
                data: "Plate_Map.id",
                title: `<h3>Management</h3>`,
                className: "noExport",
                orderable: false,
                render: function (data, type, row) {
                    return table_class.actionButtonsTemplate(row.id);
                },
            },
            {
                data: "Plate_Map.plate",
                title: "license plate LPR",
                render: function (data, type, row) {
                    data = row.plate;
                    return `<div class="badge badge-error badge-lg text-white">${data}</div>`;
                },
            },
            {
                data: "Plate_Map.plate_fix",
                title: "license plate in System",
                render: function (data, type, row) {
                    data = row.plate_fix;
                    return `<div class="badge badge-success badge-lg text-white">${data}</div>`;
                },
            },
            {
                data: "Plate_Map.remark",
                title: "Remarks",
                render: function (data, type, row) {
                    data = row.remark;
                    return data;
                },
            },
        ],
    },
    {
        addbtn: true,
    },
);

plate_map_model_table.create_item_control({
    modal_from: Modal_Plate_Map,
    api_endpoint: "/api/license_plate/map",
});

// Blacklist Table
const blacklist_model_table = new table_class.TableModel(
    "#license_plate_blacklist_table",
    "/api/license_plate/backlist/datatable",
    {
        table: "Black_List_Plate",
        columns: [
            {
                data: "Black_List_Plate.id",
                title: `<h3>Management</h3>`,
                className: "noExport",
                orderable: false,
                render: function (data, type, row) {
                    return table_class.actionButtonsTemplate(row.id);
                },
            },
            {
                data: "Black_List_Plate.plate",
                title: "license plate",
                render: function (data, type, row) {
                    data = row.plate;
                    return `<div class="badge badge-error badge-lg text-white">${data}</div>`;
                },
            },
            {
                data: "Black_List_Plate.level",
                title: "Severity Level",
                render: function (data, type, row) {
                    data = row.level;
                    return `<div class="badge badge-info badge-lg text-white">${data}</div>`;
                },
            },
            {
                data: "Black_List_Plate.status",
                title: "Status",
                render: function (data, type, row) {
                    data = row.status;
                    return data;
                },
            },
            {
                data: "Black_List_Plate.message",
                title: "Message",
                render: function (data, type, row) {
                    data = row.message;
                    return data;
                },
            },
            {
                data: "Black_List_Plate.remark",
                title: "Remarks",
                render: function (data, type, row) {
                    data = row.remark;
                    return data;
                },
            },
        ],
    },
    {
        addbtn: true,
    },
);

blacklist_model_table.create_item_control({
    modal_from: Modal_Plate_Blacklist,
    api_endpoint: "/api/license_plate/backlist",
});

function isStringInt(str) {
    let num = parseInt(str);
    return !isNaN(num) && num.toString() === str;
}

window.submit_apply_map_plate_dump_from_table = submit_apply_map_plate_dump_from_table;
async function submit_apply_map_plate_dump_from_table() {
    const table_dump_file_excel = document.getElementById("table_dump_file_excel");
    const row_data = table_dump_file_excel.rows.length - 1;
    if (row_data > 0) {
        const result = await unity.showDialogConfirm({
            title: "Edit Card Details",
            content: `Confirm action for ${row_data} records?`,
        });
        if (result.confirm) {
            let success_row = 0;
            for (let i = 1; i < table_dump_file_excel.rows.length; i++) {
                // if (i > 1) break;
                // unity.logger.info(i);
                const r = table_dump_file_excel.rows[i];
                const c = r.cells;
                if (isStringInt(c[0].innerText)) {
                    const formData = new FormData();
                    const original = c[1].textContent;
                    const corrected = c[2].textContent;

                    formData.append("cmd", "ADD");
                    formData.append("key", original);
                    formData.append("value", corrected);

                    const respond = await unity.fetchApi(
                        "/api/systems_config/lpr_map_plate/itme",
                        "post",
                        formData,
                        "json",
                    );

                    if (respond.status == 422) {
                        unity.logger.debug(respond);
                        c[0].innerHTML = `<div class="badge badge-error">Error</div>`;
                        //return;
                    } else {
                        unity.logger.debug(respond.msg);
                        if (respond.success) {
                            c[0].innerHTML = `<div class="badge badge-success">Success</div>`;
                            ++success_row;
                        } else {
                            c[0].innerHTML = `<div class="badge badge-warning">${respond.msg}</div>`;
                        }
                    }
                    r.scrollIntoView({
                        behavior: "auto", // or "auto" for instant scrolling
                        block: "center", // options are "start", "center", "end", or "nearest"
                        inline: "nearest",
                    });
                }
            }
            unity.showDialogSuccess({ msg: `Successfully processed ${success_row} records` });
            show_dialog_lpr_map_plate();
        }
    }
}

window.submit_apply_map_plate_dump_from_file = submit_apply_map_plate_dump_from_file;
async function submit_apply_map_plate_dump_from_file(f) {
    const dump_file_upload = f;

    if (dump_file_upload.files.length == 1) {
        unity.logger.info(dump_file_upload.files);
        const reader = new FileReader();
        reader.onload = function (event) {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            // Assuming the first sheet is the one you want to read
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            const table_dump_file_excel = document.getElementById("table_dump_file_excel");
            for (let i = table_dump_file_excel.rows.length - 1; i > 0; i--) {
                table_dump_file_excel.deleteRow(i);
            }
            let _index = 0;
            let _original;

            jsonData.forEach((row) => {
                unity.logger.debug(row);
                let original = row["plate"];
                let corrected = row["plate_corrected"];

                if ((original !== undefined) & (original != _original)) {
                    _original = original;
                    // _member_name = member_name !== undefined ? member_name : _member_name;
                    // _type = type !== undefined ? type : _type;
                    // unity.logger.info(card_id, member_name, type);
                    const newRow = table_dump_file_excel.insertRow();
                    const cell1 = newRow.insertCell(0);
                    const cell2 = newRow.insertCell(1);
                    const cell3 = newRow.insertCell(2);

                    cell1.textContent = ++_index;
                    cell2.textContent = original;
                    cell3.textContent = corrected;
                }
            });
            dump_file_upload.value = "";
        };
        const _file = dump_file_upload.files[0];
        reader.readAsArrayBuffer(_file);
    }
}

window.clear_map_plate_dump_from_table = clear_map_plate_dump_from_table;
function clear_map_plate_dump_from_table() {
    const table_dump_file_excel = document.getElementById("table_dump_file_excel");
    for (let i = table_dump_file_excel.rows.length - 1; i > 0; i--) {
        table_dump_file_excel.deleteRow(i);
    }
}

// ! ------------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("LICENSE_PLATE_MANAGER_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("LICENSE_PLATE_MANAGER_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

async function load_fuzzy_matching_settings() {
    const fuzzy_setting_fieldset = document.getElementById("fuzzy_setting_fieldset");
    const enable_member_license_plate_gate_in = fuzzy_setting_fieldset.querySelector(
        '[data-field="enable_member_license_plate_gate_in"]',
    );
    const enable_member_license_plate_gate_out = fuzzy_setting_fieldset.querySelector(
        '[data-field="enable_member_license_plate_gate_out"]',
    );
    const enable_visitor_transaction_map_gate_out = fuzzy_setting_fieldset.querySelector(
        '[data-field="enable_visitor_transaction_map_gate_out"]',
    );
    const fuzzy_matching_lavel = fuzzy_setting_fieldset.querySelector('[data-field="fuzzy_matching_lavel"]');

    const btn_save_fuzzy_matching_setting = fuzzy_setting_fieldset.querySelector(
        '[data-field="btn_save_fuzzy_matching_setting"]',
    );
    btn_save_fuzzy_matching_setting.addEventListener("click", async () => {
        const confirm = await unity.showDialogConfirm({
            title: "Confirm",
            content: "Are you sure you want to save the fuzzy matching settings?",
        });
        if (!confirm.confirm) {
            return;
        }
        const data = {
            enable_member_license_plate_gate_in: enable_member_license_plate_gate_in.checked,
            enable_member_license_plate_gate_out: enable_member_license_plate_gate_out.checked,
            enable_visitor_transaction_map_gate_out: enable_visitor_transaction_map_gate_out.checked,
            fuzzy_matching_level: parseInt(fuzzy_matching_lavel.value),
        };
        const respond = await unity.fetchApi("/api/license_plate/fuzzy_matching", "post", JSON.stringify(data), "json");
        // console.log("🚀 save_fuzzy_matching_settings", data, respond);
        if (respond.success) {
            unity.showToastNotification({ title: "Success", msg: respond.msg });
        } else {
            unity.showDialogError({ type: "error", msg: respond.msg });
        }
    });
    const respond = await unity.fetchApi("/api/license_plate/fuzzy_matching", "get", null, "json");
    if (respond.success) {
        const data = respond.data;
        console.log("🚀 load_fuzzy_matching_settings", data);
        enable_member_license_plate_gate_in.checked = data.enable_member_license_plate_gate_in;
        enable_member_license_plate_gate_out.checked = data.enable_member_license_plate_gate_out;
        enable_visitor_transaction_map_gate_out.checked = data.enable_visitor_transaction_map_gate_out;
        fuzzy_matching_lavel.value = data.fuzzy_matching_level;
    } else {
        unity.showToastNotification({ title: "Error", msg: "Failed to load load_fuzzy_matching_settings" });
    }
}
async function load_auto_mapping_settings() {
    const auto_mapping_toggle = document.getElementById("auto_mapping_toggle");
    const respond = await unity.fetchApi("/api/license_plate/auto_mapping", "get", null, "json");
    if (respond.success) {
        const data = respond.data;
        console.log("🚀 load_auto_mapping_settings", data);
        auto_mapping_toggle.checked = data.auto_mapping;
    } else {
        unity.showToastNotification({ type: "error", msg: "Failed to load load_auto_mapping_settings" });
        auto_mapping_toggle.checked = false;
    }
}

window.set_auto_mapping = set_auto_mapping;
async function set_auto_mapping(el) {
    const is_enable = el.checked;
    console.log("🚀 set_auto_mapping", is_enable);
    const confirm = await unity.showDialogConfirm({
        title: "Confirm",
        content: `Are you sure you want to ${is_enable ? "enable" : "disable"} auto mapping?`,
    });
    if (!confirm.confirm) {
        el.checked = !is_enable;
        return;
    }
    const data = {
        auto_mapping: is_enable,
    };
    const respond = await unity.fetchApi("/api/license_plate/auto_mapping", "post", JSON.stringify(data), "json");
    if (respond.success) {
        unity.showToastNotification({ title: "Success", msg: respond.msg });
    } else {
        unity.showDialogError({ title: "Error", msg: respond.msg || "Failed to update auto mapping setting" });
        el.checked = !is_enable;
    }
}

async function Init() {
    plate_map_model_table.init();
    blacklist_model_table.init();
    load_fuzzy_matching_settings();
    load_auto_mapping_settings();
    const default_tab = "LICENSE_PLATE_MANAGER_TAB01";

    if (localStorage.getItem("LICENSE_PLATE_MANAGER_TAB_ACTIVE")) {
        const v = localStorage.getItem("LICENSE_PLATE_MANAGER_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    } else {
        document.getElementById(default_tab).checked = true;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
