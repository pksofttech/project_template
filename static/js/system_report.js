import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// LPR Camera Recognition Logs
const system_report_lpr_log_model_table = new table_class.TableModel(
    document.getElementById("log_lpr_table"),
    "/lpr/datatable",
    {
        table: "Lpr_Log",
        order: [[5, "desc"]],
        columns: [
            {
                data: "Lpr_Log.images_path",
                // title: "Capture Snapshot",
                title: `<h3>Image Record</h3>`,
                orderable: false,
                render: function (data, type, row) {
                    data = row.images_path;
                    if (data) {
                        const in_images_paths = data.split(",");
                        // console.log(in_images_paths);
                        return `
                                <div class="inline-block">
                                    <img loading="lazy" class="duration-500 ease-in rounded-box max-h-10 hover:scale-150" src="${in_images_paths[0]}" onclick="showPreviewImageView('${in_images_paths[0]}');" onerror="this.onerror=null; this.src='/static/image/Image_not_available.png';">
                                    <img loading="lazy" class="duration-500 ease-in rounded-box max-h-10 hover:scale-150 mt-1" src="${in_images_paths[1]}" onclick="showPreviewImageView('${in_images_paths[1]}');" onerror="this.onerror=null; this.src='/static/image/Image_not_available.png';">
                                </div>
                                `;
                    } else {
                        return "";
                    }
                },
            },
            {
                data: "Lpr_Log.id",
                title: "Log id",
                render: function (data, type, row) {
                    data = row.id;
                    return String(data).padStart(10, "0");
                },
            },
            {
                data: "Lpr_Log.info",
                title: "Car Infomation",
                orderable: false,
                render: function (data, type, row) {
                    data = row.info;
                    if (data != null) {
                        let _d = null;
                        try {
                            _d = JSON.parse(data);
                        } catch (error) {
                            return _d;
                        }

                        let info_html = `<div class="text-xs flex flex-col gap-1">`;
                        if (_d.plate_color && _d.plate_color != "unknown")
                            info_html += `<div><span class="text-primary">Plate Color:</span> ${_d.plate_color}</div>`;
                        if (_d.car_color)
                            info_html += `<div><span class="text-primary">Car Color:</span> ${_d.car_color}</div>`;
                        if (_d.vehicle_type)
                            info_html += `<div><span class="text-primary">Vehicle Type:</span> ${_d.vehicle_type}</div>`;
                        // if (_d.car_logo)
                        //     info_html += `<div><span class="text-info">Brand/Model:</span> ${_d.car_logo}</div>`;
                        if (_d.province)
                            info_html += `<div><span class="text-primary">Province:</span> ${_d.province}</div>`;
                        info_html += `</div>`;
                        return info_html;
                    }
                    return "";
                },
            },
            {
                data: "Lpr_Camera.device_name",
                title: "Device Nane",
                orderable: false,
                render: function (data, type, row) {
                    data = row.device_name;
                    return data ? data : "Not Data";
                },
            },
            {
                data: "Lpr_Log.plate_num",
                title: "License Plate",
                orderable: false,
                render: function (data, type, row) {
                    data = row.plate_num;
                    return data;
                },
            },
            {
                data: "Lpr_Log.date_time",
                title: "DateTime",
                // orderable: false,
                render: function (data, type, row) {
                    data = row.date_time;
                    const _d = unity.dateTimeToStr(data);
                    const datetime = _d.split(" ");
                    const warp_datatime = `<div class="flex flex-col gap-1"><div class="badge ">${datetime[0]}</div>
                                                    <div class="badge badge-info">${datetime[1]}</div>
                            </div>`;
                    return warp_datatime;
                },
            },

            {
                data: "Lpr_Log.transaction_record_id",
                title: "Transaction ID",
                orderable: false,
                render: function (data, type, row) {
                    data = row.transaction_record_id;
                    if (!data) {
                        return `<div class="font-bold">No Action</div>`;
                    }
                    return `<a role=button onclick="infoTransactionShow(${data})"  class="inline-flex items-center font-medium text-primary hover:underline">
                                ${String(data).padStart(6, "0")}
                                <svg aria-hidden="true" class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                                </a>`;
                },
            },
            {
                data: "Lpr_Log.status",
                title: "Status",
                orderable: false,
                render: function (data, type, row) {
                    data = row.status;
                    return data.replace(/(?:\r\n|\r|\n)/g, "<br>");
                },
            },
            {
                data: "Lpr_Log.tag",
                title: "Tag",
                orderable: false,
                render: function (data, type, row) {
                    // console.log(row);
                    data = row.tag;
                    return data;
                },
            },
        ],
        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            // unity.logger.info(aData);
            // const tags = aData.Lpr_Log.tag.split("::");
            let tag = aData.tag;
            if (tag.includes("::")) {
                tag = tag.split("::")[1];
            }
            switch (tag) {
                case "success":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-success/50"));
                    break;
                case "warning":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-warning/50"));
                    break;
                case "error":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-error/50"));
                    break;
                default:
                    break;
            }
        },
    },
);

// Gate Reader Logs
const system_report_reader_log_model_table = new table_class.TableModel(
    document.getElementById("log_reader_table"),
    "/api/devices/reader_device/datatable",
    {
        table: "Reader_Log",
        columns: [
            {
                data: "Reader_Log.images_path",
                // title: "Capture Snapshot",
                title: `<h3>Image Record</h3>`,
                orderable: false,
                render: function (data, type, row) {
                    data = row.images_path;
                    if (data) {
                        const in_images_paths = data.split(",");
                        return `
                                <div class="inline-block">
                                    <img loading="lazy" class="duration-500 ease-in rounded-box max-h-10 hover:scale-150" src="${in_images_paths[0]}" onclick="showPreviewImageView('${in_images_paths[0]}');">
                                </div>
                                `;
                    } else {
                        return "No Image";
                    }
                },
            },
            {
                data: "Reader_Log.id",
                title: "Log id",
                render: function (data, type, row) {
                    return String(row.id).padStart(10, "0");
                },
            },
            {
                data: "Reader_Device.device_name",
                title: "Device Nane",
                orderable: false,
                render: function (data, type, row) {
                    return row.device_name ? row.device_name : "";
                },
            },
            {
                data: "Reader_Log.card_id",
                title: "Card ID",
                orderable: false,
                render: function (data, type, row) {
                    return row.card_id;
                },
            },
            {
                data: "Reader_Log.date_time",
                title: "DateTime",
                orderable: false,
                render: function (data, type, row) {
                    data = row.date_time;
                    const _d = unity.dateTimeToStr(data);
                    const datetime = _d.split(" ");
                    const warp_datatime = `<div class="flex flex-col gap-1"><div class="badge-date">${datetime[0]}</div>
                                                    <div class="badge-time">${datetime[1]}</div>
                            </div>`;
                    return warp_datatime;
                },
            },

            {
                data: "Reader_Log.transaction_record_id",
                title: "tran ID",
                orderable: false,
                render: function (data, type, row) {
                    data = row.transaction_record_id;
                    if (!data) {
                        return `<div class="font-bold">No Action</div>`;
                    }
                    return `<a role=button onclick="infoTransactionShow(${data})"  class="inline-flex items-center font-medium text-primary hover:underline">
                                ${String(data).padStart(6, "0")}
                                <svg aria-hidden="true" class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                                </a>`;
                },
            },
            {
                data: "Reader_Log.tag",
                title: "Tag",
                orderable: false,
                render: function (data, type, row) {
                    data = row.tag;
                    if (data) {
                        const tags = data.split("::");
                        const tag = tags[1] ? tags[1] : "info";
                        return `<div class="mb-1">${tags[0]}</div><div class="border rounded-btn border-primary font-bold text-center p-1">${tag.toUpperCase()}</div>`;
                    } else {
                        return "Not Tag";
                    }
                },
            },
            {
                data: "Reader_Log.status",
                title: "Status",
                orderable: false,
                render: function (data, type, row) {
                    return row.status;
                },
            },
        ],
        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            // unity.logger.info(aData);
            const tags = aData.tag.split("::");
            const tag = tags[1] ? tags[1] : "info";
            switch (tag) {
                case "success":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-success/50"));
                    break;
                case "warning":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-warning/50"));
                    break;
                case "error":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-error/50"));
                    break;
                default:
                    break;
            }
        },
    },
);

// Access Reader Logs
const system_report_reader_access_log_model_table = new table_class.TableModel(
    document.getElementById("log_reader_access_table"),
    "/api/access_control/log/datatable",
    {
        table: "Access_Logs",
        columns: [
            {
                data: "Access_Logs.id",
                title: "Log id",
                render: function (data, type, row) {
                    // console.log(row);
                    data = row.id;
                    return String(data).padStart(8, "0");
                },
            },
            {
                data: "Access_Logs.card_id",
                title: "Card ID",
                orderable: false,
                render: function (data, type, row) {
                    data = row.card_id;
                    return data;
                },
            },
            {
                data: "Access_Devices.name",
                title: "Access_Devices",
                render: function (data, type, row) {
                    data = row.name;
                    return data;
                },
            },
            {
                data: "Access_Zones.name",
                title: "Access_Zones",
                name: "access_zone_name",
                render: function (data, type, row) {
                    return row.access_zone_name;
                },
            },
            {
                data: "Access_Logs.direction",
                title: "Direction",
                name: "access_direction",
                render: function (data, type, row) {
                    return row.access_direction;
                },
            },
            {
                data: "Access_Logs.access_status",
                title: "access status",
                render: function (data, type, row) {
                    data = row.access_status;
                    return data;
                },
            },
            {
                data: "Access_Logs.reason",
                title: "reason",
                orderable: false,
                render: function (data, type, row) {
                    data = row.reason;
                    return data;
                },
            },
        ],
    },
);

window.show_dialog_warning_info = show_dialog_warning_info;
function show_dialog_warning_info(msg) {
    unity.showDialogWarning({ msg: msg });
}

window.show_dialog_info = show_dialog_info;
function show_dialog_info(msg) {
    unity.showDialogInfo({ msg: msg });
}

// System Report Logs
const system_report_log_model_table = new table_class.TableModel(
    document.getElementById("log_system_table"),
    "/api/function/log/datatable",
    {
        table: "Log",
        columns: [
            {
                data: "Log.id",
                title: "Log id",
                render: function (data, type, row) {
                    return String(row.id).padStart(10, "0");
                },
            },
            {
                data: "Log.time",
                title: "DateTime",
                orderable: false,
                render: function (data, type, row) {
                    const _d = unity.dateTimeToStr(row.time);
                    const datetime = _d.split(" ");
                    const warp_datatime = `<div class="flex flex-col gap-1"><div class="badge-date">${datetime[0]}</div>
                                                <div class="badge-time">${datetime[1]}</div>
                                            </div>`;
                    return warp_datatime;
                },
            },
            {
                data: "Log.log_type",
                title: "Tag",
                orderable: false,
                render: function (data, type, row) {
                    let badge = "info";
                    data = row.log_type.toLowerCase();
                    switch (data) {
                        case "ValidationError":
                        case "warning":
                            badge = "warning";
                            break;
                        case "error":
                            badge = "error";
                            break;
                        default:
                            break;
                    }
                    return `<div class="badge badge-${badge}">${data}</div>`;
                },
            },
            {
                data: "Log.msg",
                title: "log message",
                orderable: false,
                render: function (data, type, row) {
                    const msg = row.msg;
                    if (msg && msg.length > 100) {
                        const escapedMsg = JSON.stringify(msg).replace(/'/g, "\\'").replace(/"/g, "&quot;");
                        const sub_msg = msg.substring(0, 100);

                        return `
            <div class="flex flex-row gap-2 items-center">
                <button class="btn btn-primary btn-outline btn-xs" 
                        onclick="show_dialog_warning_info(${escapedMsg})">
                    ⚠️
                </button>
                <div class="truncate">${sub_msg}...</div>
            </div>`;
                    }
                    return msg;
                },
            },
        ],
        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            // unity.logger.info(aData);
            const tag = aData.log_type.toLowerCase();
            switch (tag) {
                case "info":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-success/50"));
                    break;
                case "ValidationError":
                case "warning":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-warning/50"));
                    break;
                case "error":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-error/50"));
                    break;
                default:
                    break;
            }
        },
    },
);

// System Notification Logs
const notification_report_log_model_table = new table_class.TableModel(
    document.getElementById("log_notification_table"),
    "/api/function/log_notification/datatable",
    {
        table: "Log_Notification",
        columns: [
            {
                data: "Log_Notification.id",
                title: "Log_Notification id",
                render: function (data, type, row) {
                    return String(row.id).padStart(10, "0");
                },
            },
            {
                data: "Log_Notification.time",
                title: "DateTime",
                orderable: false,
                render: function (data, type, row) {
                    const _d = unity.dateTimeToStr(row.time);
                    const datetime = _d.split(" ");
                    const warp_datatime = `<div class="flex flex-col gap-1"><div class="badge-date">${datetime[0]}</div>
                                                <div class="badge-time">${datetime[1]}</div>
                                            </div>`;
                    return warp_datatime;
                },
            },
            {
                data: "Log_Notification.notification_type",
                title: "Tag",
                orderable: false,
                render: function (data, type, row) {
                    let badge = "info";
                    data = row.notification_type.toLowerCase();
                    switch (data) {
                        case "ValidationError":
                        case "warning":
                            badge = "warning";
                            break;
                        case "error":
                            badge = "error";
                            break;
                        default:
                            break;
                    }
                    return `<div class="badge badge-${badge}">${data}</div>`;
                },
            },
            {
                data: "Log_Notification.msg",
                title: "log message",
                orderable: false,
                render: function (data, type, row) {
                    const msg = row.msg;
                    if (msg && msg.length > 100) {
                        const escapedMsg = JSON.stringify(msg).replace(/'/g, "\\'").replace(/"/g, "&quot;");
                        const sub_msg = msg.substring(0, 100);

                        return `
            <div class="flex flex-row gap-2 items-center">
                <button class="btn btn-primary btn-outline btn-xs" 
                        onclick="show_dialog_info(${escapedMsg})">
                    📢
                </button>
                <div class="truncate">${sub_msg}...</div>
            </div>`;
                    }
                    return msg;
                },
            },
        ],
    },
);

// Payment Record Logs
const payment_record_log_model_table = new table_class.TableModel(
    document.getElementById("log_payment_record_table"),
    "/api/payment_record/datatable",
    {
        table: "Payment_Record",
        columns: [
            {
                data: "Payment_Record.id",
                title: "Payment_Record id",
                render: function (data, type, row) {
                    const id = row.id;
                    return `<div class="inline-flex border border-primary rounded-box shadow-sm" role="group">
                                <button class="btn btn-ghost btn-sm" title="Verify Payment Status" onclick="payment_chack_paid(${id})">
                                    <i class="fa-solid fa-check-to-slot text-error"></i>
                                </button>
                            </div>`;
                },
            },
            {
                data: "Payment_Record.id",
                title: "Payment_Record id",
                render: function (data, type, row) {
                    return String(row.id).padStart(10, "0");
                },
            },
            {
                data: "Payment_Record.status",
                title: "Status",
                render: function (data, type, row) {
                    data = row.status;
                    switch (data) {
                        case "PAID":
                        case "SUCCESS":
                        case "COMPLETED":
                            data = `<div class="badge badge-success text-white">${data}</div>`;
                            break;
                        case "REGISTER":
                            data = `<div class="badge badge-secondary badge-soft">${data}</div>`;
                        default:
                            break;
                    }
                    return data;
                },
            },
            {
                data: "Payment_Record.create_date_time",
                title: "date_time",
                render: function (data, type, row) {
                    const _d = unity.dateTimeToStr(row.create_date_time);
                    const datetime = _d.split(" ");
                    const warp_datatime = `<div class="flex flex-col gap-1"><div class="badge ">${datetime[0] || ""}</div>
                                                    <div class="badge badge-info">${datetime[1] || ""}</div>
                            </div>`;
                    return warp_datatime;
                },
            },
            {
                data: "Payment_Record.time_stamp",
                title: "time_stamp",
                render: function (data, type, row) {
                    if (!row.time_stamp) return "-";

                    let timestamp = row.time_stamp;
                    return timestamp;
                },
            },
            {
                data: "Payment_Record.ref01",
                title: "refarence01",
                render: function (data, type, row) {
                    data = row.ref01;
                    return data;
                },
            },
            {
                data: "Payment_Record.ref02",
                title: "refarence02",
                render: function (data, type, row) {
                    data = row.ref02;
                    return data;
                },
            },

            {
                data: "Payment_Record.data",
                title: "Data",
                render: function (data, type, row) {
                    data = row.data;
                    const data_json = JSON.parse(data);
                    // console.log(data_json);

                    let data_rander = "";
                    for (const [key, value] of Object.entries(data_json)) {
                        data_rander += `${key} : ${value}<br>`;
                    }

                    return data_rander;
                },
            },
            {
                data: "Payment_Record.qrcode",
                title: "qrcode",
                render: function (data, type, row) {
                    data = row.qrcode;
                    return data;
                },
            },
            {
                data: "Payment_Record.remark",
                title: "remark",
                render: function (data, type, row) {
                    data = row.remark;
                    return data;
                },
            },
        ],
    },
);

// ! ************************************************************

window.payment_chack_paid = payment_chack_paid;
async function payment_chack_paid(id) {
    console.log("🚀 payment_chack_paid", id);
    unity.showDialogLoading("⏳ Verifying payment status...");
    const response = await unity.fetchApi(`/api/payment_chack_paid/${id}`, "get", null, "json");
    unity.closeDialogLoading();
    if (response.success) {
        unity.showDialogSuccess({ title: "payment_chack_paid", msg: response.msg });
    }
}

window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("SYSTEM_REPORT_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("SYSTEM_REPORT_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

async function Init() {
    const daterangepicker_config = unity.getFlatpickrConfigWithEmbeddedRanges();

    table_class.init_table_model_with_datatime_picker(
        system_report_lpr_log_model_table,
        "#select_date_time_range_system_report_lpr_log_table",
        daterangepicker_config,
    );

    table_class.init_table_model_with_datatime_picker(
        system_report_reader_log_model_table,
        "#select_date_time_range_system_report_reader_log_table",
        daterangepicker_config,
    );

    table_class.init_table_model_with_datatime_picker(
        system_report_reader_access_log_model_table,
        "#select_date_time_range_system_report_reader_access_log_table",
        daterangepicker_config,
    );

    table_class.init_table_model_with_datatime_picker(
        system_report_log_model_table,
        "#select_date_time_range_system_report_system_log_table",
        daterangepicker_config,
    );

    table_class.init_table_model_with_datatime_picker(
        notification_report_log_model_table,
        "#select_date_time_range_system_report_notification_log_table",
        daterangepicker_config,
    );

    table_class.init_table_model_with_datatime_picker(
        payment_record_log_model_table,
        "#select_date_time_range_system_report_payment_record_log_table",
        daterangepicker_config,
    );

    if (localStorage.getItem("SYSTEM_REPORT_TAB_ACTIVE")) {
        const v = localStorage.getItem("SYSTEM_REPORT_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    }
}

unity.initSse(async (e) => {
    console.log("sse:", e);
    const func = e.func;
    const params = e.params;
    const tab_active = localStorage.getItem("SYSTEM_REPORT_TAB_ACTIVE");

    switch (tab_active) {
        case "SYSTEM_REPORT_TAB01":
            if (func == "lpr_event" && document.getElementById("auto_update_check").checked) {
                system_report_lpr_log_model_table.reload();
            }
            break;
        case "SYSTEM_REPORT_TAB02":
            if (func == "reader_event" && document.getElementById("auto_update_reader_check").checked) {
                await unity.delay(1000);
                system_report_reader_log_model_table.reload();
            }
            break;
        case "SYSTEM_REPORT_TAB03":
            if (func == "reader_access_event" && document.getElementById("auto_update_reader_access_check").checked) {
                await unity.delay(1000);
                system_report_reader_access_log_model_table.reload();
            }
            break;

        default:
            break;
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
