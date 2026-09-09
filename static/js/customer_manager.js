import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// Customer Accounts Table
const customer_model_table = new table_class.TableModel(
    "#customer_table",
    "/api/customer/datatable",
    {
        table: "Transaction_Record",
        // select: {
        //     style: "single",
        // },
        columns: [
            {
                data: "Customer.id",
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
                data: "Customer.active",
                title: "Status",
                className: "text-center",
                render: (data, type, row) =>
                    row.active
                        ? '<span class="badge badge-success gap-2">Active</span>'
                        : '<span class="badge badge-error gap-2">Inactive</span>',
            },
            {
                data: "Customer.customer_code",
                title: "Customer Code",
                className: "font-mono text-sm",
                render: (data, type, row) => row.customer_code || "-",
            },
            {
                data: "Customer.tax_id",
                title: "Tax ID",
                render: (data, type, row) => row.tax_id || "-",
            },
            {
                data: "Customer.customer_name",
                title: "Customer Name",
                render: (data, type, row) => `<span class="font-semibold">${row.customer_name || "-"}</span>`,
            },
            {
                data: "Customer.contact_name",
                title: "Contact",
                render: (data, type, row) => row.contact_name || "-",
            },
            {
                data: "Customer.phone",
                title: "Phone",
                render: (data, type, row) => `<span class="text-info">${row.phone || "-"}</span>`,
            },
            {
                data: "Customer.email",
                title: "E-mail",
                render: (data, type, row) => `<span class="text-sm">${row.email || "-"}</span>`,
            },
            {
                data: "Customer.credit_limit",
                title: "Credit Limit (THB)",
                className: "text-right",
                render: (data, type, row) => (row.credit_limit ? row.credit_limit.toLocaleString() : "0"),
            },
            {
                data: "Customer.estamp_limit",
                title: "E-Stamp Limit(*parked)",
                className: "text-right",
                render: (data, type, row) => (row.estamp_limit ? row.estamp_limit : "Unlimited"),
            },
            {
                data: "Customer.payment_term",
                title: "Term (Days)",
                className: "text-center",
                render: (data, type, row) => row.payment_term || "-",
            },

            {
                data: "Customer.address",
                title: "Address",
                render: (data, type, row) => row.address || "-",
            },
        ],
    },
    {
        addbtn: true,
    },
);
customer_model_table.create_item_control({ modal_from: Modal_Customer, api_endpoint: "/api/customer" });

// ! ------------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("CUSTOMER_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("CUSTOMER_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

async function Init() {
    customer_model_table.init();
    if (localStorage.getItem("CUSTOMER_TAB_ACTIVE")) {
        const v = localStorage.getItem("CUSTOMER_TAB_ACTIVE");
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
