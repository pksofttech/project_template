import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// Hourly Traffic Statistics
const static_by_hour_model_table = new table_class.TableModel(
    document.getElementById("static_by_hour_model_table"),
    "/api/static_record/datatable",
    {
        table: "Static_by_hour",
        columns: [
            {
                data: "range",
                title: "Time Period",
                render: function (data, type, row) {
                    // console.log(row);
                    // data = toMMSS(data * 60) + " - " + toMMSS((data + 1) * 60);
                    return data;
                },
            },
            {
                data: "total",
                title: "Total Count",
                render: function (data, type) {
                    return data.toLocaleString();
                },
            },
            {
                data: "in_count",
                title: "Entries",
                render: function (data, type) {
                    return data.toLocaleString();
                },
            },
            {
                data: "out_count",
                title: "Exits",
                render: function (data, type) {
                    return data.toLocaleString();
                },
            },
        ],
    },
);
static_by_hour_model_table.data_type = "hour";

// Daily Traffic Statistics
const static_by_day_model_table = new table_class.TableModel(
    document.getElementById("static_by_day_model_table"),
    "/api/static_record/datatable",
    {
        table: "Static_by_day",
        columns: [
            {
                data: "range",
                title: "Time Period",
                render: function (data, type) {
                    return data;
                },
            },
            {
                data: "total",
                title: "Total Count",
                render: function (data, type) {
                    return data.toLocaleString();
                },
            },
            {
                data: "in_count",
                title: "Entries",
                render: function (data, type) {
                    return data.toLocaleString();
                },
            },
            {
                data: "out_count",
                title: "Exits",
                render: function (data, type) {
                    return data.toLocaleString();
                },
            },
        ],
    },
);

static_by_day_model_table.data_type = "day";

// Monthly Traffic Statistics
const static_by_mount_model_table = new table_class.TableModel(
    document.getElementById("static_by_month_model_table"),
    "/api/static_record/datatable",
    {
        table: "Static_by_mount",
        columns: [
            {
                data: "range",
                title: "Time Period",
                render: function (data, type) {
                    return data;
                },
            },
            {
                data: "total",
                title: "Total Count",
                render: function (data, type) {
                    return data.toLocaleString();
                },
            },
            {
                data: "in_count",
                title: "Entries",
                render: function (data, type) {
                    return data.toLocaleString();
                },
            },
            {
                data: "out_count",
                title: "Exits",
                render: function (data, type) {
                    return data.toLocaleString();
                },
            },
        ],
    },
);

static_by_mount_model_table.data_type = "month";

// License Plate Traffic Statistics
const static_by_license_model_table = new table_class.TableModel(
    document.getElementById("static_by_license_model_table"),
    "/api/static_record/datatable_license",
    {
        table: "Static_by_license",
        columns: [
            {
                data: "license",
                title: "license",
                render: function (data, type, row) {
                    //const warp_datatime = `<div class="badge-info">${data}</div>`
                    // console.log(row);
                    if (data) {
                        return data;
                    } else {
                        return "Unassigned";
                    }
                },
            },
            {
                data: "total",
                title: "Total Count",
                render: function (data, type) {
                    return data;
                },
            },
            {
                data: "in_count",
                title: "Entries",
                render: function (data, type) {
                    return data;
                },
            },
            {
                data: "out_count",
                title: "Exits",
                render: function (data, type) {
                    return data;
                },
            },
        ],
    },
);
static_by_license_model_table.data_type = "license";

window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("STATIC_REPORT_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("STATIC_REPORT_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

window.reload_static_by_month_model_table = reload_static_by_month_model_table;
function reload_static_by_month_model_table() {
    console.log("reload_static_by_month_model_table");
    static_by_mount_model_table.date_range = document.getElementById("select_date_time_static_by_month_table").value;

    static_by_mount_model_table.reload();
}
async function Init() {
    const daterangepicker_config = unity.getFlatpickrConfigWithEmbeddedRanges();
    const daterangepicker_config_date = unity.getFlatpickrConfigWithEmbeddedDate();

    table_class.init_table_model_with_datatime_picker(
        static_by_hour_model_table,
        "#select_date_time_static_by_hour_table",
        daterangepicker_config_date,
    );

    table_class.init_table_model_with_datatime_picker(
        static_by_day_model_table,
        "#select_date_time_static_by_day_table",
        daterangepicker_config,
    );

    static_by_mount_model_table.init();

    table_class.init_table_model_with_datatime_picker(
        static_by_license_model_table,
        "#select_date_time_static_by_license_table",
        daterangepicker_config,
    );

    if (localStorage.getItem("STATIC_REPORT_TAB_ACTIVE")) {
        const v = localStorage.getItem("STATIC_REPORT_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    }
    const select_date_time_static_by_month_table = document.getElementById("select_date_time_static_by_month_table");
    if (select_date_time_static_by_month_table) {
        const d = new Date();
        let year = d.getFullYear();
        for (let i = 0; i < 5; i++) {
            const option = document.createElement("option");
            option.text = year - i;
            option.value = year - i;
            select_date_time_static_by_month_table.add(option);
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
