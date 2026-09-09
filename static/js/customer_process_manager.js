import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

let lockTimer = null;
let lockTimer_member = null;
// Member Users Table
const member_user_model_table = new table_class.TableModel(
    "#customer_member_user_table",
    "/api/member/member_user/datatable",
    {
        table: "Transaction_Record",
        dom: '<"top"Bf>rt<"bottom"pl><"clear">',
        scrollY: "30vh",
        select: {
            style: "single",
        },
        columns: [
            {
                data: "Member_User.id",
                title: "ID",
                render: function (data, type, row) {
                    // console.log(row);
                    // return table_class.actionButtonsTemplate(row.id);
                    return `<div class="badge badge-sm badge-primary badge-soft">${row.id}</div>`;
                },
            },
            {
                data: "Member_User.name",
                title: "Name",
                render: function (data, type, row) {
                    return row.name;
                },
            },
            {
                data: "count",
                title: "Card Count",
                orderable: false,
                render: function (data, type, row) {
                    if (data > 0) {
                        return `<div class="badge badge-primary badge-soft">${data}</div> `;
                    }
                    return "<div class='badge badge-warning badge-soft'>No Card</div>";
                },
            },
            {
                data: "Member_User.status",
                title: "Status",
                orderable: false,
                render: function (data, type, row) {
                    if (row.member_user_is_expire) {
                        return `<span class="badge badge-error badge-soft badge-sm">Suspended *Expired</span>`;
                    }
                    return row.status;
                },
            },
            {
                data: "Member_User.expire_date_time",
                title: "Expiry Date",
                orderable: true,
                render: function (data, type, row) {
                    data = row.expire_date_time;
                    if (data) {
                        const _d = unity.dateTimeToStr(data, "DD/MM/YYYY");
                        if (row.member_user_is_expire) {
                            return `<span class="badge badge-error badge-soft">${_d}</span>`;
                        }
                        return _d;
                    } else {
                        return "Unassigned";
                    }
                },
            },
            {
                data: "Member_User.json_data",
                title: "Tariff / Renewal Rate",
                orderable: false,
                render: function (data, type, row) {
                    data = row.json_data;
                    try {
                        const _data = JSON.parse(data);
                        return _data.member_user_fee ? _data.member_user_fee : "Unassigned";
                    } catch (error) {
                        return "";
                    }
                },
            },
        ],
        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            console.log(aData);
            if (aData.member_user_is_expire) {
                nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-warning/50"));
            }
            if (aData.status == "DISABLE") {
                nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-error/50"));
            }
        },
    },
    {
        addbtn: false,
        callback: async function (type, row) {
            console.log("🚀 ", type);
            if (type == "reload") {
                clearTimeout(lockTimer);
                lockTimer = setTimeout(() => {
                    member_user_select(-1);
                }, 500);
            }
            if (type == "select") {
                // console.log(row);
                if (row.id) {
                    clearTimeout(lockTimer);
                    lockTimer = setTimeout(() => {
                        member_user_select(row.id);
                    }, 500);
                }
            }
            if (type == "deselect") {
                clearTimeout(lockTimer);
                lockTimer = setTimeout(() => {
                    member_user_select(-1);
                }, 500);
            }
        },
    },
);

member_user_model_table.create_item_control({
    modal_from: Modal_Member_User,
    api_endpoint: "/api/member/user",
    success_callback: (id) => {
        console.log("success_callback", id);
        if (id == 0) {
            unity.init_select_option(Modal_Customer_Member, "/api/member/user", "member_user_id");
        }
    },
});

// Member Cards Table
const member_model_table = new table_class.TableModel(
    "#customer_member_user_member_table",
    "/api/member/datatable",
    {
        table: "Member",
        dom: '<"top"Bif>rt<"bottom"pl><"clear">',
        scrollY: "50vh",
        // select: {
        //     style: "single",
        // },
        columns: [
            {
                data: "Member.id",
                title: "ID",
                render: function (data, type, row) {
                    return table_class.actionButtonsTemplate(row.id);
                },
            },
            {
                data: "Member.card_id",
                title: "Card ID / Plate",
                render: function (data, type, row) {
                    data = row.card_id;
                    return `<div class="text-lg font-bold">${data}</div>`;
                },
            },
            // {
            //     data: "Member_User.name",
            //     name: "member_user_name",
            //     title: "Username",
            //     render: function (data, type, row) {
            //         data = row.member_user_name;
            //         return data;
            //     },
            // },
            {
                data: "Member_Type.name",
                name: "member_type_name",
                title: "Card Type",
                render: function (data, type, row) {
                    data = row.member_type_name;
                    return data;
                },
            },
            {
                data: "Member.create_date_time",
                title: "Issue Date",
                render: function (data, type, row) {
                    data = row.create_date_time;
                    const _d = unity.dateTimeToStr(data);
                    return _d;
                },
            },
            {
                data: "Member.status",
                title: "Status",
                render: function (data, type, row) {
                    data = row.status;
                    if (data) {
                        return data;
                    }
                    return "";
                },
            },
            {
                data: "Member.remark",
                title: "Remarks",
                render: function (data, type, row) {
                    data = row.remark;
                    if (data) {
                        return data;
                    }
                    return "";
                },
            },
        ],
        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            if (aData.status == "DISABLE") {
                nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-error/50"));
            }
        },
    },
    {
        addbtn: false,
        callback: async function (type, row) {
            console.log("🚀 member_model_table : ", type);
            if (type == "reload") {
                clearTimeout(lockTimer_member);
                lockTimer_member = setTimeout(() => {
                    member_select(-1);
                }, 500);
            }
            if (type == "select") {
                // console.log(row);
                // member_select(row.id);
            }
        },
    },
);
member_model_table.create_item_control({
    modal_from: Modal_Customer_Member,
    api_endpoint: "/api/customer/member",
    add_callback: () => {
        console.log("member_model_table add_callback");
    },
    success_callback: (id) => {
        console.log("success_callback", id);
        console.log("member_model_table success_callback");
    },
});

// DataTables Table service_fee_code
const service_fee_code_model_table = new table_class.TableModel(
    "#service_fees_code_table",
    "/api/service_fees/code/datatable",
    {
        table: "Service_Fees_Code",
        columns: [
            {
                data: "Service_Fees_Code.id",
                title: "Actions",
                orderable: false,
                render: function (data, type, row) {
                    return table_class.actionButtonsTemplate(row.id);
                },
            },
            {
                data: "Service_Fees_Code.status",
                title: "Status",
                render: function (data, type, row) {
                    data = row.status.toUpperCase();
                    if (data == "ENABLE") {
                        return `<div class="badge badge-success badge-sm" >${data}</div>`;
                    }
                    return `<div class="badge badge-error badge-sm" >${data}</div>`;
                },
            },
            {
                data: "Service_Fees_Code.name",
                title: "CODE-STAMP",

                render: function (data, type, row) {
                    return `<div class=" text-primary font-bold text-xl" >${row.name}</div>`;
                },
            },

            {
                data: "Service_Fees.name",
                title: "Tariff Profile",
                name: "service_fees_name",
                render: function (data, type, row) {
                    data = row.service_fees_name;
                    if (data) {
                        return `<div class=" text-info" >${data}</div>`;
                    }
                    return "Unassigned";
                },
            },
            {
                data: "Customer.customer_name",
                title: "Account Name",
                render: function (data, type, row) {
                    data = row.customer_name;
                    if (data) {
                        return `<div class=" font-bold" >${data}</div>`;
                    }
                    return "Unassigned";
                },
            },
            {
                data: "Service_Fees_Code.tag",
                title: '<i class="fa-solid fa-tag fa-2x"></i> Tags',
                render: function (data, type, row) {
                    data = row.tag;
                    return `<div class=" text-info" >${data}</div>`;
                },
            },
            {
                data: "Service_Fees_Code.remark",
                title: "Remarks",
                render: function (data, type, row) {
                    data = row.remark;
                    return data;
                },
            },
        ],
    },
    { addbtn: false },
);
service_fee_code_model_table.create_item_control({
    modal_from: Modal_Service_Fee_Code,
    api_endpoint: "/api/service_fees/code",
    add_callback: () => {
        const field = Modal_Service_Fee_Code.querySelector('[data-field="customer_id"]');
        field.value = page_var.customer_id;
        $(field).val(page_var.customer_id).trigger("change");
        console.log("add_callback", page_var.customer_id);
    },
});

// ! ------------------------------------------------------
const page_var = { tab_active: null, customer_id: 0 };
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("PROCESS_MANAGER_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("PROCESS_MANAGER_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
    page_var.tab_active = v;
}

async function customer_select_member_user(id) {
    member_user_model_table.filter = "";
    id = parseInt(id);
    console.log("update_tab_member", id);
    const customer_container = document.getElementById("customer_container");
    let data = {};
    if (id > 0) {
        const respond = await unity.fetchApi(`/api/customer?id=${id}`, "get", null, "json");
        if (respond.success) {
            data = respond.data;
        }
    }
    console.log(data);
    unity.data2fields(data, customer_container);
    if (id > -1) {
        member_user_model_table.filter = JSON.stringify({ "Member_User.customer_id": id != 0 ? id : null });
    }
    const btn_change_member_user_expire = customer_container.querySelector(
        '[data-field="btn_change_member_user_expire"]',
    );
    const btn_print_report = customer_container.querySelector('[data-field="btn_print_report"]');
    const btn_add_member_user = customer_container.querySelector('[data-field="btn_add_member_user"]');

    btn_change_member_user_expire.disabled = id > 0 ? false : true;
    // btn_print_report.disabled = id > 0 ? false : true;
    // btn_add_member_user.disabled = id > 0 ? false : true;
    member_user_model_table.table.page("first").draw("page");
    member_user_model_table.reload();
}

async function customer_select_stammp_code(id) {
    console.log("customer_select_stammp_code", id);
    const customer_container = document.getElementById("customer_container_stamp");
    let data = {};
    if (id > 0) {
        const respond = await unity.fetchApi(`/api/customer?id=${id}`, "get", null, "json");
        if (respond.success) {
            data = respond.data;
        }
    }
    unity.data2fields(data, customer_container);
    service_fee_code_model_table.filter =
        id > -1 ? JSON.stringify({ "Service_Fees_Code.customer_id": id != 0 ? id : null }) : "";
    console.log(service_fee_code_model_table.filter);

    const btn_add_customer_stamp = customer_container.querySelector('[data-field="btn_add_customer_stamp"]');

    btn_add_customer_stamp.disabled = id > 0 ? false : true;

    service_fee_code_model_table.table.page("first").draw("page");
    service_fee_code_model_table.reload();
}

window.customer_select_change = customer_select_change;
async function customer_select_change(id) {
    // if (page_var.tab_active == "PROCESS_MANAGER_TAB01") {
    //     customer_select_member_user(id);
    // } else if (page_var.tab_active == "PROCESS_MANAGER_TAB02") {
    //     customer_select_stammp_code(id);
    // }
    page_var.customer_id = id;
    customer_select_stammp_code(id);
    customer_select_member_user(id);
}

async function member_user_select(id) {
    console.log("📛 member_user_select", id);
    const member_user_container = document.getElementById("member_user_container");

    const btn_add_member = member_user_container.querySelector('[data-field="btn_add_member"]');
    const btn_update_user = member_user_container.querySelector('[data-field="btn_update_user"]');
    const btn_renewal_history = member_user_container.querySelector('[data-field="btn_renewal_history"]');
    btn_add_member.disabled = true;
    btn_update_user.disabled = true;
    btn_renewal_history.disabled = true;

    const respond = await unity.fetchApi(`/api/member/user?id=${id}`, "get", null, "json");
    let data = {};
    if (respond.success) {
        data = respond.data;
        btn_add_member.disabled = false;
        btn_update_user.disabled = false;
        btn_renewal_history.disabled = false;
    }

    btn_renewal_history.onclick = () => {
        call_member_user_renew_history(id);
    };
    unity.data2fields(data, member_user_container);
    const data_filter = { member_user_id: id, customer_id: page_var.customer_id };
    member_model_table.data_filter = JSON.stringify(data_filter);
    member_model_table.table.page("first").draw("page");
    member_model_table.reload();

    const info = member_user_model_table.table.page.info();
    console.log(info);

    document
        .getElementById("table_member_user_container")
        .querySelector('[data-field="total_member_user_count"]').textContent = info.recordsTotal;

    try {
        if (data.json_data) {
            const json_data = JSON.parse(data.json_data);
            console.log(json_data);

            member_user_container.querySelector('[data-field="json_member_user_fee"]').value =
                json_data.member_user_fee || "";
        }
    } catch (error) {
        console.warn(error);
    }
}

async function member_select(id) {
    console.log("📌 member_select", id);
    const info = member_model_table.table.page.info();
    console.log(info);

    document
        .getElementById("table_member_user_container")
        .querySelector('[data-field="total_member_count"]').textContent = info.recordsTotal;
}

async function init_select_option() {
    unity.init_selects_option(
        [
            Modal_Member_User.querySelector('[data-field="customer_id"]'),
            document.getElementById("customer_select_main"),
        ],
        "/api/customer",
        "customer_name",
    );

    unity.init_selects_option(
        [
            document.getElementById("member_user_container").querySelector('[data-field="member_user_permission_id"]'),
            Modal_Member_User.querySelector('[data-field="member_user_permission_id"]'),
        ],
        "/api/member/user_permission",
        "name",
    );

    await unity.init_selects_option(
        [Modal_Service_Fee_Code.querySelector('[data-field="service_fees_id"]')],
        "/api/service_fees",
    );

    await unity.init_selects_option(
        [Modal_Service_Fee_Code.querySelector('[data-field="customer_id"]')],
        "/api/customer",
        "customer_name",
    );

    unity.init_select_option(Modal_Customer_Member, "/api/member/type", "member_type_id");
    unity.init_select_option(Modal_Customer_Member, "/api/member/user", "member_user_id");

    // member_user_permission_id
}

async function renderCustomerMemberA4Preview(data, filter) {
    console.log(data);
    const modal = Modal_Document_Print;
    const printArea = modal.querySelector("#Document_Print_Area");
    let filter_str = "";
    if (filter) {
        if (filter.member_user_search) {
            filter_str += ` *Member Name [${filter.member_user_search}]`;
        }
        if (filter.member_search) {
            filter_str += ` *Member Type [${filter.member_search}]`;
        }
    }
    printArea.innerHTML = "";
    const header_html = `<div class="text-sm p-4">
                            <p class="font-bold" text-xl>${OWNER_NAME}</p>
                            <p>Member Summary Report Grouped by Customer / Member Name / Type ${filter_str}</p>
                            <p>Total Corporate Customers: ${data.length} accounts</p>
                            <p>Total Members: [member_user_count] users  :  Total Vehicles: [member_count] vehicles</p>
                            [member_type_data]
                        </div>`;
    let html_content = "";
    html_content += `<div>`;
    html_content += header_html;
    let member_user_count = 0;
    let member_count = 0;
    let member_type_data = {};
    for (let index = 0; index < data.length; index++) {
        let html_c = `<div class="text-xs p-4">`;
        const c = data[index];
        html_c += `<div class="font-bold">${c.customer_name}</div>`;
        const mus = c.member_user;
        for (let index = 0; index < mus.length; index++) {
            member_user_count++;
            const mu = mus[index];
            let html_mu = `<div class="mx-4 mt-2">`;
            const json_data = JSON.parse(mu.json_data);
            html_mu += `<div class="grid grid-cols-5 gap-2">
                            <div class="col-span-3">${mu.member_user_name}</div>
                            <div class="col-span-1 ">daysExpired:${unity.dateTimeToStr(mu.expire_date_time, "DD/MM/YYYY")}</div>
                            <div class="col-span-1">Renewal Fee: ${json_data.member_user_fee || "-"}</div>
                        </div>`;
            const mts = mu.member_type;
            for (let index = 0; index < mts.length; index++) {
                let html_mt = `<div class="mx-4 ">`;
                const mt = mts[index];
                const ms = mt.member;
                html_mt += `<div class="grid grid-cols-3">
                    <div>${mt.member_type_name}</div>
                    <div>Total: ${ms.length} records</div>
                </div>`;

                if (member_type_data[mt.member_type_name] == undefined) {
                    member_type_data[mt.member_type_name] = ms.length;
                } else {
                    member_type_data[mt.member_type_name] += ms.length;
                }

                for (let index = 0; index < ms.length; index++) {
                    member_count++;
                    const m = ms[index];
                    let html_m = `<div class="mx-8 ">`;
                    html_m += `<div class="grid grid-cols-3 gap-2">
                                    <div>${m.card_id}</div>
                                    <div>${m.remark}</div>
                                </div>`;
                    html_m += `</div>`;
                    html_mt += html_m;
                }
                html_mt += `</div>`;
                html_mu += html_mt;
            }
            html_mu += `</div>`;
            html_c += html_mu;
        }

        html_c += `</div>`;
        html_content += html_c;
    }
    html_content += `</div>`;
    html_content = html_content.replace("[member_user_count]", member_user_count.toString());
    html_content = html_content.replace("[member_count]", member_count.toString());

    // Member Type
    let html_type = `<div class="text-xs p-2">`;
    for (const key in member_type_data) {
        html_type += `<div class="grid grid-cols-3">
            <div>${key}</div>
            <div>${member_type_data[key]} records</div>
        </div>`;
    }
    html_type += `</div><hr>`;
    html_content = html_content.replace("[member_type_data]", html_type);

    printArea.innerHTML = html_content;
    modal.showModal();

    // 🔘 Print Button handler
    modal.querySelector('[data-field="btn_print"]').onclick = async () => {
        unity.showDialogLoading("Preparing report data...");
        await unity.delay(250);
        console.log("📌 btn_print");
        const printableEl = document.getElementById("Document_Print_Area");
        if (!printableEl) {
            unity.showToastNotification({
                type: "warning",
                title: "Print Document",
                msg: "Print area not found (#Document_Print_Area)",
            });
            return;
        }

        printJS({
            printable: "Document_Print_Area",
            type: "html",
            targetStyles: ["*"],
            style: `
      @page {
        size: A4;
        margin: 15mm; /* Page print margin */
      }
      #Document_Print_Area {
        width: 100%;
      }
      .page-break {
        display: block;
        page-break-before: always;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      th, td {
        border: 1px solid #ccc;
        padding: 8px;
        text-align: left;
      }
      /* Repeat table headers across pages */
      thead { display: table-header-group; }

      /* Prevent page break inside table row */
      tr { page-break-inside: avoid; }
    `,
        });

        unity.closeDialogLoading();
        console.log("📌 close btn_print");
    };
}

window.print_report_customer = print_report_customer;
async function print_report_customer() {
    const customer_id = document.getElementById("customer_select_main").value;
    console.log("print_report_customer : " + customer_id);

    // if (customer_id < 1) return;
    const member_user_search = member_user_model_table.table.search().trim();
    const member_search = member_model_table.table.search().trim();
    const filter = { member_user_search: member_user_search, member_search: member_search };

    const search_json = JSON.stringify(filter);
    console.log("filter_json", search_json);

    const respond = await unity.fetchApi(
        `/api/customer/report_member_user?customer_id=${customer_id}&search_json=${search_json}`,
        "get",
        null,
        "json",
    );
    console.log(respond);
    if (respond.success) {
        renderCustomerMemberA4Preview(respond.data, filter);
    } else {
        unity.showToastNotification({ msg: "Requested record not found" });
    }
}

window.add_customer_stamp = add_customer_stamp;
async function add_customer_stamp() {
    service_fee_code_model_table.model_control.add({
        init_data: { customer_id: document.getElementById("customer_select_main").value },
    });
}

window.add_member_user = add_member_user;
async function add_member_user() {
    member_user_model_table.model_control.add({
        init_data: { customer_id: document.getElementById("customer_select_main").value },
    });
}

window.change_member_user_expire_customer = change_member_user_expire_customer;
async function change_member_user_expire_customer() {
    if (typeof change_member_user_expire_customer.change_member_user_expire_customer_datetime === "undefined") {
        const now = new Date();
        change_member_user_expire_customer.change_member_user_expire_customer_datetime = unity.isoToDatetimeLocal(
            new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 0),
        );
    }
    const customer_id = document.getElementById("customer_select_main").value;
    console.log("change_member_user_expire_customer : " + customer_id);
    if (customer_id < 1) return;
    const total_member_user_count = parseInt(
        document.getElementById("table_member_user_container").querySelector('[data-field="total_member_user_count"]')
            .textContent,
    );
    if (total_member_user_count > 0) {
        const last = change_member_user_expire_customer.change_member_user_expire_customer_datetime;

        const html = `<fieldset class="fieldset  bg-base-200 border-base-300 rounded-box border p-4 mx-auto">
                        <legend class="fieldset-legend">Set Expiration Date</legend>
                        <input type="datetime-local" class="input input-lg text-xl w-full" value="${last}" data-field="returnValue" />
                        <p class="label">daysExpired</p>
                    </fieldset>`;

        const result = await unity.showDialogConfirm({
            title: "Update Member Expiration Date",
            content: html,
        });
        if (!result.confirm) return;
        const newExpire = result.value;

        const result_confirm = await unity.showDialogConfirm({
            title: "Confirm Action",
            content: `Update member expiration date -> ${unity.dateTimeToStr(newExpire)}`,
        });
        if (!result_confirm.confirm) return;

        change_member_user_expire_customer.change_member_user_expire_customer_datetime = newExpire;

        const respond = await unity.fetchApi(
            `/api/customer/change_member_user_expire_customer?customer_id=${customer_id}`,
            "put",
            JSON.stringify({ expire_date_time: newExpire }),
            "json",
        );
        console.log(respond);
        if (respond.success) {
            member_user_model_table.reload();
            unity.showDialogSuccess({ msg: respond.msg });
        }
    } else {
        unity.showToastNotification({ type: "warning", msg: "No member records found" });
    }
}

window.update_member_user = update_member_user;
async function update_member_user() {
    const member_user_container = document.getElementById("member_user_container");
    const member_user_id = member_user_container.querySelector('[data-field="id"]').textContent;
    console.log("update_member_user", member_user_id);
    if (member_user_id < 1) return;
    const formData = unity.fields2formData(member_user_container);
    const json_data = {
        member_user_fee: member_user_container.querySelector('[data-field="json_member_user_fee"]').value,
    };
    formData.append("json_data", JSON.stringify(json_data));
    unity.debugForm(formData);
    const respond = await unity.fetchApi(
        `/api/customer/update_member_user?member_user_id=${member_user_id}`,
        "post",
        formData,
        "json",
    );
    console.log(respond);
    if (respond.success) {
        member_user_model_table.reload();
    }
    unity.showDialogSuccess({ msg: respond.msg });
}

window.add_member = add_member;
async function add_member() {
    const member_user_container = document.getElementById("member_user_container");
    const member_user_id = member_user_container.querySelector('[data-field="id"]').textContent;
    member_model_table.model_control.add({ init_data: { member_user_id: member_user_id } });
}

async function call_member_user_renew_history(user_id) {
    console.log("call_member_user_renew_history", user_id);
    const model = Dialog_Member_User_Service_Card_Renew_History;
    const renew_history_list = model.querySelector('[data-field="renew_history_list"]');

    if (renew_history_list) {
        renew_history_list.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8 text-base-content/60">
                    <span class="loading loading-spinner loading-md text-primary"></span>
                    <div class="mt-2 text-xs">Loading renewal history...</div>
                </td>
            </tr>
        `;
    }

    model.showModal();

    try {
        const respond = await unity.fetchApi(
            "/api/account_record/member_user_service_card_renew_history?user_id=" + user_id,
            "get",
            null,
            "json",
        );
        console.log(respond);
        if (respond && respond.success && respond.data && respond.data.length > 0) {
            let html = "";
            respond.data.forEach((item) => {
                const date_str = item.date_time ? unity.dateTimeToStr(item.date_time, "DD/MM/YYYY HH:mm") : "-";
                const amount =
                    item.amount !== undefined && item.amount !== null
                        ? `${Number(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} THB`
                        : "0.00 THB";
                const ref_no = item.no || item.ref01 || `RN-${item.id}`;
                const remark = item.remark || "Member Renewal";
                const payment_type = item.type || "CASH";
                const cashier = item.cashier ? ` (${item.cashier})` : "";
                const status = item.status || "NORMAL";

                html += `
                    <tr class="hover">
                        <td>
                            <div class="font-medium text-base-content">${date_str}</div>
                            <div class="text-xs text-base-content/60">Ref: ${ref_no}</div>
                        </td>
                        <td>
                            <div class="font-bold text-primary">${remark}</div>
                            <span class="badge badge-info badge-xs">Member User</span>
                        </td>

                        <td class="text-right font-bold text-success text-base">
                            ${amount}
                        </td>
                        <td class="text-center">
                            <span class="badge badge-success badge-soft badge-sm">${status === "NORMAL" ? "SUCCESS" : status}</span>
                            <div class="text-[11px] text-base-content/60 mt-0.5">${payment_type}${cashier}</div>
                        </td>
                    </tr>
                `;
            });
            if (renew_history_list) renew_history_list.innerHTML = html;
        } else {
            if (renew_history_list) {
                renew_history_list.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-8 text-base-content/50">
                            <i class="fa-solid fa-receipt fa-2xl mb-2 block text-base-content/30"></i>
                            No member renewal history found
                        </td>
                    </tr>
                `;
            }
        }
    } catch (err) {
        console.error("Error call_member_user_renew_history:", err);
        if (renew_history_list) {
            renew_history_list.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8 text-error">
                        <i class="fa-solid fa-triangle-exclamation fa-2xl mb-2 block"></i>
                        Error loading data
                    </td>
                </tr>
            `;
        }
    }
}

// ? --------------------------------------------------
async function Init() {
    const default_tab = "PROCESS_MANAGER_TAB01";
    if (localStorage.getItem("PROCESS_MANAGER_TAB_ACTIVE")) {
        const v = localStorage.getItem("PROCESS_MANAGER_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
                page_var.tab_active = v;
            }
        }
    } else {
        document.getElementById(default_tab).checked = true;
        page_var.tab_active = default_tab;
    }
    init_select_option();
    member_user_model_table.filter = "";
    member_user_model_table.init();

    member_model_table.data_status = 0;
    member_model_table.data_type = 0;
    const data_filter = { member_user_id: 0, customer_id: 0 };
    member_model_table.data_filter = JSON.stringify(data_filter);
    member_model_table.init();

    // Tab-02
    service_fee_code_model_table.init();
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
