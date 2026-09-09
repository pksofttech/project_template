import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// 📌 site info
async function get_ownrer_info() {
    const _reply = await unity.fetchApi("/api/function/app_config_owner", "get", null, "json");
    if (_reply.success == true) {
        const data = new Object();
        for (let i = 0; i < _reply.data.length; i++) {
            const e = _reply.data[i].App_Configurations;
            data[e.key] = e.value;
        }
        console.log(data);
        const container = document.getElementById("owner_info_manager_content");
        unity.data2fields(data, container);
    } else {
        unity.showToastNotification({
            title: JSON.stringify(_reply),
            type: "error",
        });
    }
}

window.save_owner_info_config = save_owner_info_config;
async function save_owner_info_config() {
    const container = document.getElementById("owner_info_manager_content");
    const formData = unity.fields2formData(container);
    if (formData) {
        unity.debugForm(formData);
        const _reply = await unity.fetchApi("/api/function/app_config_owner", "post", formData, "json");
        if (_reply.success == true) {
            unity.showToastNotification({
                title: "Owner information saved successfully.",
                type: "success",
            });
        } else {
            unity.showToastNotification({
                title: JSON.stringify(_reply),
                type: "error",
            });
        }
    }
}
function call_test(v) {
    console.log(v);
}

// Visitor Information Table
const visitor_model_table = new table_class.TableModel(
    "#visitor_table",
    "/api/visitor/datatable",
    {
        table: "Visitor",
        columns: [
            {
                data: "Visitor.id",
                title: `<h3>Management</h3>`,
                orderable: false,
                render: function (data, type, row) {
                    const id = row.id;
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
            // Visitor Name
            {
                data: "Visitor.name",
                name: "visitor_name",
                title: "Visitor Name",
                orderable: true,
                render: function (data, type, row) {
                    return row.visitor_name ?? "-";
                },
            },

            // Organization / Company
            {
                data: "Visitor.organization",
                name: "visitor_organization",
                title: "Organization / Company",
                orderable: true,
                render: function (data, type, row) {
                    return row.visitor_organization ?? "-";
                },
            },

            // Additional Notes
            {
                data: "Visitor.note",
                name: "visitor_note",
                title: "Details",
                orderable: false,
                render: function (data, type, row) {
                    return row.visitor_note ?? "-";
                },
            },

            // National ID / Passport
            {
                data: "Visitor.citizen_id",
                name: "visitor_citizen_id",
                title: "Card ID / Code",
                orderable: false,
                render: function (data, type, row) {
                    return row.visitor_citizen_id || "-";
                },
            },

            // Address (Optional)
            {
                data: "Visitor.address",
                name: "visitor_address",
                title: "Address",
                orderable: false,
                render: function (data, type, row) {
                    return row.visitor_address || "-";
                },
            },

            // Blacklist
            {
                data: "Visitor.is_blacklist",
                name: "visitor_is_blacklist",
                title: "Blacklist",
                orderable: true,
                render: function (data, type, row) {
                    if (row.visitor_is_blacklist) {
                        return `<span class="badge badge-error">Blacklisted</span>`;
                    }
                    return `<span class="badge badge-success">Normal</span>`;
                },
            },
        ],
    },
    {
        addbtn: true,
    },
);

visitor_model_table.create_item_control({ modal_from: Modal_Visitor, api_endpoint: "/api/visitor" });

// Purpose / Objective Info Table
const objective_model_table = new table_class.TableModel(
    "#objective_table",
    "/api/objective/datatable",
    {
        table: "Object",
        columns: [
            // Action Buttons
            {
                data: "objective_id",
                title: `<h3>Management</h3>`,
                orderable: false,
                render: function (data, type, row) {
                    return `
                            <div class="inline-flex border border-blue-600 rounded-box shadow-sm" role="group">
                                <button class="btn btn-ghost btn-sm control-edit-btn" title="Edit" data-id="${data}">
                                    <i class="fas fa-pen text-primary"></i>
                                </button>
                                <button class="btn btn-ghost btn-sm control-remove-btn" title="Delete" data-id="${data}">
                                    <i class="far fa-trash-alt text-error"></i>
                                </button>
                            </div>`;
                },
            },

            // Objective Name
            {
                data: "objective_name",
                title: "Purpose",
                orderable: true,
                render: (data) => data || "-",
            },

            // Description
            {
                data: "objective_description",
                title: "Details",
                orderable: false,
                render: (data) => data || "-",
            },

            // Active Status
            {
                data: "objective_active",
                title: "Status",
                orderable: true,
                render: (data) => {
                    return data
                        ? `<span class="badge badge-success">Active</span>`
                        : `<span class="badge badge-error">Inactive</span>`;
                },
            },
        ],
    },
    {
        addbtn: true,
    },
);

objective_model_table.create_item_control({ modal_from: Modal_Objective, api_endpoint: "/api/objective" });

// Vehicle Type Info Table
const vehicle_type_model_table = new table_class.TableModel(
    "#vehicle_type_table",
    "/api/vehicle_type/datatable",
    {
        table: "Vehicle_Type",
        columns: [
            // Action Buttons
            {
                data: "vehicle_type_id",
                title: `<h3>Management</h3>`,
                orderable: false,
                render: function (data, type, row) {
                    return `
                            <div class="inline-flex border border-blue-600 rounded-box shadow-sm" role="group">
                                <button class="btn btn-ghost btn-sm control-edit-btn" title="Edit" data-id="${data}">
                                    <i class="fas fa-pen text-primary"></i>
                                </button>
                                <button class="btn btn-ghost btn-sm control-remove-btn" title="Delete" data-id="${data}">
                                    <i class="far fa-trash-alt text-error"></i>
                                </button>
                            </div>`;
                },
            },

            // Vehicle Type Name
            {
                data: "vehicle_type_name",
                title: "Vehicle Type",
                orderable: true,
                render: (data) => data || "-",
            },

            // Description
            {
                data: "vehicle_type_description",
                title: "Details",
                orderable: false,
                render: (data) => data || "-",
            },

            // Status
            {
                data: "vehicle_type_active",
                title: "Status",
                orderable: true,
                render: (data) => {
                    return data
                        ? `<span class="badge badge-success">Active</span>`
                        : `<span class="badge badge-error">Inactive</span>`;
                },
            },
        ],
    },
    {
        addbtn: true,
    },
);

vehicle_type_model_table.create_item_control({ modal_from: Modal_Vehicle_Type, api_endpoint: "/api/vehicle_type" });

// Fuel Type Info Table
const fuel_type_model_table = new table_class.TableModel(
    "#fuel_type_table",
    "/api/fuel_type/datatable",
    {
        table: "Fuel_Type",
        columns: [
            // Action Buttons
            {
                data: "fuel_type_id",
                title: `<h3>Management</h3>`,
                orderable: false,
                render: function (data, type, row) {
                    return `
                            <div class="inline-flex border border-blue-600 rounded-box shadow-sm" role="group">
                                <button class="btn btn-ghost btn-sm control-edit-btn" title="Edit" data-id="${data}">
                                    <i class="fas fa-pen text-primary"></i>
                                </button>
                                <button class="btn btn-ghost btn-sm control-remove-btn" title="Delete" data-id="${data}">
                                    <i class="far fa-trash-alt text-error"></i>
                                </button>
                            </div>`;
                },
            },

            // Fuel Type Name
            {
                data: "fuel_type_name",
                title: "Fuel Type",
                orderable: true,
                render: (data) => data || "-",
            },

            // Description
            {
                data: "fuel_type_description",
                title: "Details",
                orderable: false,
                render: (data) => data || "-",
            },

            // Status
            {
                data: "fuel_type_active",
                title: "Status",
                orderable: true,
                render: (data) => {
                    return data
                        ? `<span class="badge badge-success">Active</span>`
                        : `<span class="badge badge-error">Inactive</span>`;
                },
            },
        ],
    },
    {
        addbtn: true,
    },
);

fuel_type_model_table.create_item_control({ modal_from: Modal_Fuel_Type, api_endpoint: "/api/fuel_type" });

// ! ------------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("SITE_INFO_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("SITE_INFO_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

async function Init() {
    await get_ownrer_info();
    if (localStorage.getItem("SITE_INFO_TAB_ACTIVE")) {
        const v = localStorage.getItem("SITE_INFO_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    }

    visitor_model_table.init();
    objective_model_table.init();
    vehicle_type_model_table.init();
    fuel_type_model_table.init();
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
