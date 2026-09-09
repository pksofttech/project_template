import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";
let filtter_access_zones_html = "";

// Access Devices Table
const access_control_devices_model_table = new table_class.TableModel(
    "#access_devices_table",
    "/api/access_control/devices/datatable",
    {
        table: "Access_Devices",
        columns: [
            {
                data: "Access_Devices.id",
                title: `<h3>Management</h3>`,
                orderable: false,
                render: function (data, type, row) {
                    data = row.id;
                    return `<div class="inline-flex border border-blue-600 rounded-box shadow-sm" role="group">
                                        <a class="btn btn-ghost btn-sm tooltip tooltip-right" data-tip="Ping" onclick="ping_access_device(${data})"> <i class="fas fa-share-nodes"></i></a>
                                        <a class="btn btn-ghost btn-sm tooltip tooltip-right" data-tip="Open Door" onclick="open_access_device(${data})"> <i class="fas fa-door-open"></i></a>
                                        <button class="btn btn-ghost btn-sm control-edit-btn" title="Edit" data-id="${row.id}">
                                            <i class="fas fa-pen text-primary"></i>
                                        </button>
                                        <button class="btn btn-ghost btn-sm control-remove-btn" title="Delete" data-id="${row.id}">
                                            <i class="far fa-trash-alt text-error"></i>
                                        </button>
                                    </div>`;
                },
            },

            {
                data: "Access_Devices.name",
                title: "Access Devices",
                name: "access_devices_name",
                render: function (data, type, row) {
                    return row.access_devices_name;
                },
            },
            {
                data: "Access_Zones.name",
                title: `<div class="flex flex-col items-center gap-1">
                                <div class="text-error">Access Zone</div>
                                ${filtter_access_zones_html}
                            </div>`,
                name: "access_zones_name",
                render: function (data, type, row) {
                    return row.access_zones_name;
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
                                        <option value="entry-exit">Entry or Exit</option>
                                </select>
                            </div>`,
                orderable: false,
                render: function (data, type, row) {
                    data = row.access_mode;
                    return data;
                },
            },
            {
                data: "Access_Devices.is_active",
                title: `<div class="flex flex-col items-center gap-1">
                                <div class="text-error">Access Active</div>
                                <select class="table-select-column min-w-24" >
                                        <option value="">All</option>    
                                        <option value= 1 >Enable</option>
                                        <option value= 0 >DISABLE</option>
                                </select>
                            </div>`,
                orderable: false,
                render: function (data, type, row) {
                    return row.is_active
                        ? `<div class="badge badge-sm badge-soft badge-success">ACTIVE</div>`
                        : `<div class="badge badge-sm badge-soft badge-error">INACTIVE</div>`;
                },
            },
            {
                data: "Access_Devices.status",
                title: `<div class="flex flex-col items-center gap-1">
                                <div class="text-error">Access Devices</div>
                                <select class="table-select-column min-w-24" >
                                        <option value="">All Devices</option>    
                                        <option >Online</option>
                                        <option >Offline</option>
                                </select>
                            </div>`,
                name: "access_devices_status",
                render: function (data, type, row) {
                    return row.access_devices_status;
                },
            },

            {
                data: "Access_Devices.last_heartbeat",
                title: "Last Heartbeat",
                render: function (data, type, row) {
                    return row.last_heartbeat;
                },
            },
            {
                data: "Access_Devices.ip_address",
                title: "IP Address",
                name: "access_devices_ip_address",
                render: function (data, type, row) {
                    if (!row.access_devices_ip_address) {
                        return "-";
                    }
                    return row.access_devices_ip_address;
                },
            },
            {
                data: "Access_Devices.remark",
                title: "Remark",
                render: function (data, type, row) {
                    return row.remark;
                },
            },
        ],
    },
    {
        addbtn: true,
    },
);
access_control_devices_model_table.create_item_control({
    modal_from: Modal_Access_Device,
    api_endpoint: "/api/access_control/device",
});

// Access Zones Table
const access_zone_model_table = new table_class.TableModel(
    "#access_zone_table",
    "/api/access_control/zone/datatable",
    {
        table: "Access_Zones",
        columns: [
            {
                data: "Access_Zones.id",
                title: `<h3>Management</h3>`,
                orderable: false,
                render: function (data, type, row) {
                    return `
                            <div class="inline-flex border border-blue-600 rounded-box shadow-sm" role="group">
                                <button class="btn btn-ghost btn-sm control-edit-btn" title="Edit" data-id="${row.id}">
                                    <i class="fas fa-pen text-primary"></i>
                                </button>
                                <button class="btn btn-ghost btn-sm control-remove-btn" title="Delete" data-id="${row.id}">
                                    <i class="far fa-trash-alt text-error"></i>
                                </button>
                            </div>`;
                },
            },

            {
                data: "Access_Zones.name",
                title: "access_zone",
                render: function (data, type, row) {
                    return row.name;
                },
            },
            {
                data: "Access_Zones.status",
                title: `<h3>Status</h3>`,
                render: function (data, type, row) {
                    return row.status;
                },
            },
            {
                data: "Access_Zones_Devices",
                title: "Control Devices",
                render: function (data, type, row) {
                    // console.log(row);
                    let _access_zone_devices = "No Device";
                    if (row.Access_Zones_Devices) {
                        const datas = row.Access_Zones_Devices.split(",").sort();
                        _access_zone_devices = "";
                        for (let i = 0; i < datas.length; i++) {
                            _access_zone_devices += `<div class="badge badge-primary badge-soft badge-sm">${datas[i]}</div>`;
                        }
                    }
                    return `<div class="flex flex-col gap-1">${_access_zone_devices}</div>`;
                },
            },
            {
                data: "Access_Zones.description",
                title: `<h3>Remark</h3>`,
                render: function (data, type, row) {
                    return row.description;
                },
            },
        ],
    },
    {
        addbtn: true,
    },
);

access_zone_model_table.create_item_control({
    modal_from: Modal_Access_Zone,
    api_endpoint: "/api/access_control/zone",
});

// Access Roles Table
const access_role_model_table = new table_class.TableModel(
    "#access_role_table",
    "/api/access_control/role/datatable",
    {
        table: "Access_Roles",
        columns: [
            {
                data: "Access_Roles.id",
                title: `<h3>Management</h3>`,
                orderable: false,
                render: function (data, type, row) {
                    data = row.id;
                    return `
                            <div class="inline-flex border border-blue-600 rounded-box shadow-sm" role="group">
                                <button class="btn btn-ghost btn-sm control-edit-btn" title="Edit" data-id="${row.id}">
                                    <i class="fas fa-pen text-primary"></i>
                                </button>
                                <button class="btn btn-ghost btn-sm control-remove-btn" title="Delete" data-id="${row.id}">
                                    <i class="far fa-trash-alt text-error"></i>
                                </button>
                            </div>`;
                },
            },

            {
                data: "Access_Roles.name",
                title: `<h3>Access Role</h3>`,
                render: function (data, type, row) {
                    return row.name;
                },
            },
            {
                data: "Access_Roles.status",
                title: `<h3>Status</h3>`,
                render: function (data, type, row) {
                    return row.status;
                },
            },
            {
                data: "zones_allowed",
                title: "Zone Allowed",
                render: function (data, type, row) {
                    // console.log(row);
                    let _zones_allowed = "Unassigned";
                    if (row.zones_allowed) {
                        const datas = row.zones_allowed.split(",").sort();
                        // console.log(datas);
                        _zones_allowed = "";
                        for (let i = 0; i < datas.length; i++) {
                            _zones_allowed += `<div class="badge badge-primary badge-soft badge-sm">${datas[i]}</div>`;
                        }
                    }
                    return `<div class="flex flex-col gap-1">${_zones_allowed}</div>`;
                },
            },
            {
                data: "Access_Roles.description",
                title: `<h3>Remark</h3>`,
                render: function (data, type, row) {
                    return row.description;
                },
            },
        ],
    },
    {
        addbtn: true,
    },
);
access_role_model_table.create_item_control({
    modal_from: Modal_Access_Role,
    api_endpoint: "/api/access_control/role",
});

// ! ------------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("ACCESS_CONTROL_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("ACCESS_CONTROL_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

async function init_select_option() {
    unity.init_selects_option(
        [
            Modal_Access_Device.querySelector('[data-field="zone_id"]'),
            Modal_Access_Role.querySelector('[data-field="zone_ids"]'),
        ],
        "/api/access_control/zone",
    );
}

async function Init() {
    await init_select_option();
    access_control_devices_model_table.init();
    access_zone_model_table.init();
    access_role_model_table.init();

    if (localStorage.getItem("ACCESS_CONTROL_TAB_ACTIVE")) {
        const v = localStorage.getItem("ACCESS_CONTROL_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
