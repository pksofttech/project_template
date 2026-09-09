import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

const filter_access_log_columns = {
    member_type_name: "",
    zone_name: "",
    device_name: "",
    access_status: "",
};

function get_column_filter(name) {
    return filter_access_log_columns[name];
}

// Access Report DataTables
const access_logs_model_table = new table_class.TableModel("#access_logs_table", "/api/access_control/log/datatable", {
    table: "Access_Logs",
    // select: {
    //     style: "single",
    // },
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
            data: "Access_Logs.access_timestamp",
            title: "DateTime",
            name: "access_timestamp",
            orderable: true,
            render: function (data, type, row) {
                const _d = unity.dateTimeToStr(row.access_timestamp);
                const datetime = _d.split(" ");
                const warp_datatime = `<div class="flex flex-col gap-1">
                                            <div class="badge-date">${datetime[0]}</div>
                                            <div class="badge-time">${datetime[1]}</div>
                                        </div>`;
                return warp_datatime;
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
            data: "Member_Type.name",
            title: `
                    <div class="flex flex-col items-center gap-1">
                    <div class="text-error">Member Card Type</div>
                    ${get_column_filter("member_type_name")}
                    </div>`,
            name: "member_type_name",
            orderable: false,
            render: function (data, type, row) {
                return row.member_type_name;
            },
        },
        {
            data: "Access_Devices.name",
            title: `
                    <div class="flex flex-col items-center gap-1">
                    <div class="text-error">Access_Devices</div>
                    ${get_column_filter("device_name")}
                    </div>`,

            render: function (data, type, row) {
                data = row.name;
                return data;
            },
        },
        {
            data: "Access_Devices.access_mode",
            title: `<div class="flex flex-col items-center gap-1">
                            <div class="text-error">Access Mode</div>
                            <select class="table-select-column min-w-24" >
                                    <option value="">All Access</option>    
                                    <option >entry</option>
                                    <option >exit</option>
                            </select>
                        </div>`,
            // name: "access_mode",
            orderable: false,
            render: function (data, type, row) {
                data = row.access_mode;
                return data;
            },
        },
        {
            data: "Access_Zones.name",
            orderable: false,
            name: "access_zone_name",
            title: `
                    <div class="flex flex-col items-center gap-1">
                    <div class="text-error">Access_Zones</div>
                    ${get_column_filter("zone_name")}
                    </div>`,

            render: function (data, type, row) {
                return row.access_zone_name;
            },
        },
        {
            data: "Access_Logs.access_status",
            title: `
                    <div class="flex flex-col items-center gap-1">
                    <div class="text-error">Access Status</div>
                    ${get_column_filter("access_status")}
                    </div>`,
            filter: { type: "select", exact: true, options: ["GRANTED", "DENIED"] },

            render: function (data, type, row) {
                data = row.access_status;
                return data;
            },
        },
        {
            data: "Member_User.name",
            title: "Member Name",
            name: "member_name",
            orderable: true,
            render: function (data, type, row) {
                return row.member_name;
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
});

// ! ------------------------------------------------------

async function Init() {
    let temp = "";
    let response = await unity.fetchApi("/api/access_control/zone", "get", null, "json");
    if (response.success) {
        const data = response.data;
        temp = `<select class="table-select-column min-w-24" >
                        <option value="">all</option>
                    `;
        data.forEach((d) => {
            temp += `<option >${d.name}</option>`;
        });

        temp += `</select>`;
    }
    filter_access_log_columns.zone_name = temp;

    response = await unity.fetchApi("/api/access_control/device", "get", null, "json");
    if (response.success) {
        const data = response.data;
        console.log(data);
        temp = `<select class="table-select-column min-w-24">
                        <option value="">all</option>`;
        data.forEach((d) => {
            temp += `<option >${d.name}</option>`;
        });
        temp += `</select>`;
    }

    filter_access_log_columns.device_name = temp;

    temp = `<select class="table-select-column min-w-24" >
                        <option value="">all</option>    
                        <option >GRANTED</option>
                        <option >DENIED</option>
                    </select>`;

    filter_access_log_columns.access_status = temp;

    response = await unity.fetchApi("/api/member/type?id=0", "get", null, "json");
    if (response.success) {
        const data = response.data;
        temp = `<select class="table-select-column min-w-32">
                        <option value="">all</option>`;
        data.forEach((d) => {
            temp += `<option >${d.name}</option>`;
        });
        temp += `</select>`;
    }

    filter_access_log_columns.member_type_name = temp;

    table_class.init_table_model_with_datatime_picker(access_logs_model_table, "#reservationtime_reader_access_log");
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
