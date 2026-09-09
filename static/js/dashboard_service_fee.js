import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

window.test_service_fee = test_service_fee;
function test_service_fee(servece_fee_name) {
    console.log("🚀 btn_test_service_fee", servece_fee_name);
    const modal = Modal_Service_Fee_calculate_test;
    modal.querySelector('[data-field="name"]').textContent = servece_fee_name;
    modal.querySelector('[data-field="btn_submit"]').onclick = async function () {
        // const servece_fee_name = item.name;
        const fmt = "YYYY/MM/DD HH:mm";
        const dateTime_start = modal.querySelector('[data-field="dateTime_start"]').value.trim();
        const dateTime_pay = modal.querySelector('[data-field="dateTime_pay"]').value.trim();
        const dateTime_end = modal.querySelector('[data-field="dateTime_end"]').value.trim();

        if (!dateTime_start || !dateTime_end) {
            unity.showDialogWarning({ msg: "Please specify start time and end time" });
            return;
        }

        const start = dayjs(dateTime_start, fmt, true);
        const pay = dayjs(dateTime_pay, fmt, true);
        const end = dayjs(dateTime_end, fmt, true);
        console.log("start", start);
        console.log("pay", pay);
        console.log("end", end);

        if (pay.isBefore(start) || pay.isAfter(end)) {
            unity.showDialogWarning({ msg: "Invalid payment duration" });
            return;
        }

        if (end.isBefore(start)) {
            unity.showDialogWarning({ msg: "Invalid configuration parameters" });
            return;
        }
        let query = `&dateTime_start=${dateTime_start}&dateTime_end=${dateTime_end}`;
        if (pay.isValid()) {
            query += `&dateTime_pay=${dateTime_pay}`;
        }
        const respond = await unity.fetchApi(
            `/api/service_fees/calculate_test?servece_fee_name=${servece_fee_name}${query}`,
            "get",
            null,
            "json",
        );
        unity.logger.debug(respond);
        if (respond.success) {
            Modal_Service_Fee_Format_calculate_list_test.querySelector('[data-field="time"]').textContent =
                respond.parked_time;
            const content_msg = respond.msg.replace(/\n/g, "<br>");
            Modal_Service_Fee_Format_calculate_list_test.querySelector('[data-field="content_box"]').innerHTML =
                `<div class="px-8" style="text-align: left;">${content_msg}</div>`;
            Modal_Service_Fee_Format_calculate_list_test.showModal();
        } else {
            unity.showToastNotification({ type: "error", msg: respond.msg });
        }
    };
    modal.showModal();
}
// 📌 init service fees item modal
const service_fees_item_model = new table_class.ItemModel(
    "box_of_services_fee",
    "template_content_service_fee",
    Modal_Service_Fee,
    "/api/service_fees",
    {
        add_new_button: document.getElementById("add_new_service_fee"),
        add_new_item_template: document.getElementById("template_add_item"),
        action_buttons: [
            {
                field: "btn_test_service_fee",
                icon: "fas fa-check-double fa-2x",
                tooltip: "Test Tariff Calculator",
                class: "btn btn-square btn-success text-white",
                click: (item) => {
                    test_service_fee(item.name);
                },
            },
        ],
        on_item_init: async (item, clone) => {
            // console.log("on_item_init", item);
            let service_fees_format_datas = [];
            try {
                service_fees_format_datas = JSON.parse(item.service_fees_format_data || "[]");
            } catch (e) {
                console.error("JSON parse error:", e);
            }
            clone.querySelector('[data-field="btn_add_new_service_fee_format"]').onclick = () => {
                service_fee_format_manager.add_new_service_fee_format(item.id);
            };

            if (service_fees_format_datas) {
                const service_fee_format_list = clone.querySelector('[data-field="service_fee_format_list"]');
                let service_fee_format_html = `<div class="stats shadow overflow-auto">`;
                for (const d of service_fees_format_datas) {
                    const btn_edit_service_fees_format =
                        d.condition_type != "default"
                            ? `<button class="btn btn-circle btn-outline btn-warning btn-sm" onclick="service_fee_format_manager.edit_service_fees_format('${d.id}')"><i class="fa-solid fa-edit "></i></button>`
                            : "";
                    const btn_remove_service_fees_format =
                        d.condition_type != "default"
                            ? `<button class="btn btn-circle btn-outline btn-error btn-sm" onclick="service_fee_format_manager.remove_service_fees_format('${d.id}')"><i class="fa-solid fa-trash "></i></button>`
                            : "";
                    service_fee_format_html += `
                    <div class="stat">
                        <div class="stat-title">${d.name}</div>
                        <div class="stat-title">${d.condition_type}</div>
                        <div class="stat-title">${d.condition}</div>
                        <div class="flex flex-row justify-end gap-2">
                        ${btn_edit_service_fees_format}
                        <button class="btn btn-circle btn-outline btn-primary btn-sm "onclick="service_fee_format_manager.load_service_fees_format('${d.id}', '${d.name}')"><i class="fa-solid fa-list-check "></i></button>
                        ${btn_remove_service_fees_format}
                        </div>
                    </div>`;
                }
                service_fee_format_html += `</div>`;
                service_fee_format_list.innerHTML = service_fee_format_html;
            }
        },
    },
);

// Service Fee Table
const service_fee_model_table = new table_class.TableModel(
    "#service_fees_table",
    "/api/service_fees/datatable",
    {
        table: "Service_Fees",
        columns: [
            {
                data: "Service_Fees.id",
                title: "Actions",
                orderable: false,
                render: function (data, type, row) {
                    // console.log("render action", row);
                    return table_class.actionButtonsTemplate(row.id);
                },
            },
            {
                data: "Service_Fees.id",
                title: "ID",
                orderable: true,
                render: function (data, type, row) {
                    data = row.id;
                    return data;
                },
            },
            {
                data: "Service_Fees.type",
                title: "Vehicle Type",
                orderable: true,
                render: function (data, type, row) {
                    data = row.type;
                    return data;
                },
            },
            {
                data: "Service_Fees.name",
                title: "Tariff Profile",
                orderable: true,
                render: function (data, type, row) {
                    data = row.name;
                    const btn_test_service_fee = `<button class="btn btn-square btn-success btn-sm text-white" onclick="test_service_fee('${data}')"><i class="fas fa-check-double"></i></button>`;
                    return `<div class="flex flex-row items-center justify-between gap-4">
                    <div class="font-bold">${data}</div>
                    ${btn_test_service_fee}
                    </div>`;
                },
            },
            {
                data: "service_fees_format_data",
                title: "Tariff Calculation Model",
                orderable: true,
                render: function (data, type, row) {
                    let datas = [];

                    try {
                        datas = JSON.parse(row.service_fees_format_data || "[]");
                    } catch (e) {
                        console.error("JSON parse error:", e);
                        return "-";
                    }

                    const html = datas.map((_d) => {
                        const btn = `
                            <button
                                class="btn btn-circle btn-outline btn-primary btn-xs"
                                onclick="service_fee_format_manager.load_service_fees_format('${_d.id}', '${(_d.name || "").replace(/'/g, "\\'")}')"
                            >
                                <i class="fa-solid fa-list-check"></i>
                            </button>
                        `;

                        return `
                            <div class="flex items-center gap-1">
                                ${btn}
                                <span>${_d.name || "-"}</span>
                            </div>
                        `;
                    });

                    return `
                        <div class="flex flex-col gap-1">
                            ${html.join("")}
                        </div>
                    `;
                },
            },
            {
                data: "Service_Fees.free_time",
                title: "Free Parking Period",
                orderable: true,
                render: function (data, type, row) {
                    data = row.free_time;
                    return data;
                },
            },
            {
                data: "Service_Fees.status",
                title: "Status",
                orderable: true,
                render: function (data, type, row) {
                    data = row.status;
                    return data;
                },
            },

            {
                data: "Service_Fees.round",
                title: "Rounding Rule",
                orderable: true,
                render: function (data, type, row) {
                    data = row.round;
                    return data;
                },
            },
            {
                data: "Service_Fees.fine",
                title: "Fine",
                orderable: true,
                render: function (data, type, row) {
                    data = row.fine;
                    return data;
                },
            },
            {
                data: "Service_Fees.entrance_fee",
                title: "Entry Fee",
                orderable: true,
                render: function (data, type, row) {
                    data = row.entrance_fee;
                    return data;
                },
            },
            {
                data: "Service_Fees.remark",
                title: "Remarks",
                orderable: true,
                render: function (data, type, row) {
                    data = row.remark;
                    return data;
                },
            },
        ],
        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            switch (aData.type) {
                case "STAMP ONLY":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-warning/50"));
                    break;
                case "DYNAMIC-MODE":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-info/50"));
                    break;
                case "CUSTOM-MODE":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-primary/50"));
                    break;
                default:
                    break;
            }
        },
    },
    {
        addbtn: true,
    },
);

service_fee_model_table.create_item_control({
    modal_from: Modal_Service_Fee,
    api_endpoint: "/api/service_fees",
    add_callback: async function (modal) {
        const btn_remove = modal.querySelector('[data-field="btn_remove"]');
        btn_remove.classList.add("hidden");
    },
});

const service_fee_format_manager = {
    service_fees_format_id: null,
    service_fees_format_name: null,
    calculate_list_str: "",
    modal_service_fee_format: Modal_Service_Fee_Format,
    modal_calcutate_list: Modal_Service_Fee_Format_calculate_list,
    data: null,
    add_mode: false,

    update_service_fee_format: async (service_fees_id, service_fees_format_id = 0) => {
        console.log("📌 update_service_fee_format", service_fees_id);
        const modal = Modal_Service_Fee_Format;
        const formData = unity.fields2formData(modal);
        if (!formData) return;
        formData.append("id", service_fees_format_id);
        formData.append("service_fees_id", service_fees_id);
        unity.debugForm(formData);
        const respord = await unity.fetchApi("/api/service_fees_format", "post", formData, "json");
        unity.logger.debug(respord);
        if (respord.success == true) {
            unity.showDialogSuccess({ msg: "Successful" });
            service_fees_item_model.init().then((c) => {
                document.getElementById("service_fee_total").textContent = c;
            });
            modal.close();
        } else {
            unity.logger.debug(respord);
            unity.showDialogInfo({
                msg: JSON.stringify(respord),
            });
        }
    },

    add_new_service_fee_format(service_fees_id) {
        // service_fees_format_id = 0;
        const modal = this.modal_service_fee_format;
        const btn_submit = modal.querySelector('[data-field="btn_submit"]');
        const btn_remove = modal.querySelector('[data-field="btn_remove"]');
        unity.clear_fields(modal);
        btn_remove.classList.add("hidden");
        btn_submit.onclick = async () => {
            this.update_service_fee_format(service_fees_id);
        };
        modal.showModal();
    },
    async edit_service_fees_format(service_fees_format_id) {
        console.log("📌 edit_service_fees_format", service_fees_format_id);
        const modal = Modal_Service_Fee_Format;
        const btn_submit = modal.querySelector('[data-field="btn_submit"]');

        const respond = await unity.fetchApi(
            "/api/service_fees_format?id=" + service_fees_format_id,
            "get",
            null,
            "json",
        );
        if (respond.success) {
            const data = respond.data;
            console.log(data);
            if (data.condition_type == "default") {
                unity.showDialogWarning({ msg: "Cannot modify default tariff profile" });
                return;
            }
            unity.data2fields(data, modal);
            btn_submit.onclick = async () => {
                this.update_service_fee_format(0, service_fees_format_id);
            };
            modal.showModal();
        }
    },

    async remove_service_fees_format(service_fees_format_id) {
        const is_confirm = await unity.showDialogConfirm({ content: "Confirm record deletion?" });
        if (!is_confirm.confirm) return;
        const respond = await unity.fetchApi(
            `/api/service_fees_format?id=${service_fees_format_id}`,
            "delete",
            null,
            "json",
        );
        if (respond.success) {
            unity.showDialogSuccess({ title: "Successful", msg: respond.msg });
            service_fees_item_model.init().then((c) => {
                document.getElementById("service_fee_total").textContent = c;
            });
        }
    },
    build_tbody_calculate_list() {
        this.calculate_list_add_mode = false;
        const calculate_list = this.calculate_list_str.split(",");
        console.log(calculate_list);
        const tbody = this.modal_calcutate_list.querySelector('[data-field="tbody_calculate_list"]');
        tbody.innerHTML = "";
        const temp = this.modal_calcutate_list.querySelector('[data-field="template_calculate_list"]');

        for (const _d of calculate_list) {
            if (_d) {
                const calculate_list_condition = _d.split("=");
                const _c = temp.content.cloneNode(true);
                _c.querySelectorAll('[name="calculate_list_condition_key"]')[0].innerText = calculate_list_condition[0];
                _c.querySelectorAll('[name="calculate_list_condition_value"]')[0].innerText =
                    calculate_list_condition[1];

                const temp_btn_control = this.modal_calcutate_list.querySelector(
                    '[data-field="template_calculate_list_control_btn"]',
                );
                const _c_btn_control = temp_btn_control.content.cloneNode(true);

                _c.querySelector('[name="calculate_list_control_btn"]').appendChild(_c_btn_control);

                tbody.appendChild(_c);
            }
        }
    },
    async load_service_fees_format(service_fees_format_id, name) {
        // Scope bound
        this.service_fees_format_id = service_fees_format_id;
        this.service_fees_format_name = name;
        this.calculate_list_add_mode = false;
        this.modal_calcutate_list.querySelector('[data-field="name"]').textContent = name;

        const respond = await unity.fetchApi(
            "/api/service_fees_format?id=" + service_fees_format_id,
            "get",
            null,
            "json",
        );

        if (respond.success) {
            this.calculate_list_str = respond.data.calculate_list;
            this.build_tbody_calculate_list();
        }

        this.modal_calcutate_list.showModal();
    },

    async test_calculate_list() {
        const result_modal = Modal_Service_Fee_Format_calculate_list_test;
        const parked_time = this.modal_calcutate_list.querySelector('[data-field="parked_service_fee_for_test"]').value;
        const parked_re = /^[0-9]{1,4}:[0-5][0-9]$/;

        if (!parked_re.test(parked_time)) {
            unity.showDialogError({ msg: `Invalid data format: ${parked_time}` });
        } else {
            result_modal.querySelector('[data-field="time"]').textContent = parked_time;
            const respond = await unity.fetchApi(
                `/api/service_fees_format/calculate_list_test?id=${this.service_fees_format_id}&parked=${parked_time}`,
                "get",
                null,
                "json",
            );
            console.log(respond);
            if (respond.success) {
                result_modal.querySelector('[data-field="content_box"]').innerHTML =
                    `<div class="px-8" style="text-align: left;">${respond.msg}</div>`;
                result_modal.showModal();
            } else {
                unity.showDialogError({ msg: respond.msg });
            }
        }
    },

    async add_calculate_list() {
        if (!this.calculate_list_add_mode) {
            const tbody = this.modal_calcutate_list.querySelector('[data-field="tbody_calculate_list"]');
            const temp = this.modal_calcutate_list.querySelector('[data-field="template_calculate_list"]');
            const _c = temp.content.cloneNode(true);

            _c.querySelectorAll('[name="calculate_list_condition_key"]')[0].innerText = "00:00";
            _c.querySelectorAll('[name="calculate_list_condition_value"]')[0].innerText = "+10";

            const temp_btn_control = this.modal_calcutate_list.querySelector(
                '[data-field="template_calculate_list_submit_btn"]',
            );
            const _c_btn_control = temp_btn_control.content.cloneNode(true);

            _c.querySelectorAll('[name="calculate_list_control_btn"]')[0].appendChild(_c_btn_control);

            tbody.appendChild(_c);
            this.calculate_list_add_mode = true;
        } else {
            unity.showToastNotification({ icon: "warning", msg: "Action already in progress" });
        }
    },

    async apply_calculate_list(row) {
        const Time_RE = /^[0-9]{2,3}:[0-5][0-9]$/;
        const _k = row.querySelector('[name="calculate_list_condition_key"]').innerText;
        const _v = row.querySelector('[name="calculate_list_condition_value"]').innerText;
        if (!Time_RE.test(_k)) {
            unity.showDialogWarning({
                title: "Notice",
                msg: "Invalid data format: " + _k,
            });
            calculate_list_add_mode = false;
            this.build_tbody_calculate_list();
            return;
        }

        if (`${_v}`.startsWith("#")) {
            const _v_time = `${_v}`.substring(1);

            if (!Time_RE.test(_v_time)) {
                unity.showToastNotification({ type: "warning", msg: "Invalid data format: " + _v_time });
                this.calculate_list_add_mode = false;
                build_tbody_calculate_list();
                return;
            }
        } else {
            if (!parseInt(_v)) {
                unity.showToastNotification({
                    type: "warning",
                    msg: "Invalid data format in tariff definition: " + _v,
                });
                this.calculate_list_add_mode = false;
                build_tbody_calculate_list();
                return;
            }
        }

        const formData = new FormData();
        formData.append("id", this.service_fees_format_id);
        formData.append("key", _k);
        formData.append("value", _v);

        const respond = await unity.fetchApi("/api/service_fees_format/calculate_list", "post", formData, "json");
        console.log(respond);
        if (respond.success) {
            this.calculate_list_add_mode = false;
            unity.showToastNotification({ type: "success", msg: "Successful" });
            this.calculate_list_str = respond.data.calculate_list;
            this.build_tbody_calculate_list();
        } else {
            unity.showToastNotification({ type: "error", msg: respond.msg });
        }
    },

    async remove_calculate_list(row) {
        const _k = row.querySelector('[name="calculate_list_condition_key"]').innerText;
        const _v = row.querySelector('[name="calculate_list_condition_value"]').innerText;

        const formData = new FormData();
        formData.append("id", this.service_fees_format_id);
        formData.append("key", _k);
        formData.append("value", _v);

        const respond = await unity.fetchApi("/api/service_fees_format/calculate_list", "delete", formData, "json");
        if (respond.success == true) {
            this.calculate_list_add_mode = false;
            this.calculate_list_add_mode = false;
            unity.showToastNotification({ type: "success", msg: "Successful" });
            this.calculate_list_str = respond.data.calculate_list;
            this.build_tbody_calculate_list();
        } else {
            unity.showToastNotification({ type: "error", msg: respond.msg });
        }
    },
    async cancel_calculate_list(row) {
        this.build_tbody_calculate_list();
    },
};

// Tariff Code Table
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
                title: "CODE-NAME",

                render: function (data, type, row) {
                    return `<div class=" text-info" >${row.name}</div>`;
                },
            },
            {
                data: "Customer.customer_name",
                title: "Account Name",
                render: function (data, type, row) {
                    data = row.customer_name;
                    if (data) {
                        return `<div class="text-info" >${data}</div>`;
                    }
                    return "Unassigned";
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
    {
        addbtn: true,
    },
);

service_fee_code_model_table.create_item_control({
    modal_from: Modal_Service_Fee_Code,
    api_endpoint: "/api/service_fees/code",
});

// Event Calendars Table
const event_calandars_model_table = new table_class.TableModel(
    "#event_calandars_table",
    "/api/service_fees/event_calandars/datatable",
    {
        table: "Event_Calandars",
        columns: [
            {
                data: "Event_Calandars.id",
                title: "Actions",
                orderable: false,
                render: function (data, type, row) {
                    return table_class.actionButtonsTemplate(row.id);
                },
            },
            {
                data: "Event_Calandars.is_active",
                title: "Status",
                render: function (data, type, row) {
                    console.log(row);
                    if (row.is_expired == true) {
                        return `<div class="badge badge-error badge-sm" >Expired</div>`;
                    }
                    if (row.is_active == true) {
                        return `<div class="badge badge-success badge-sm" >Active</div>`;
                    }
                    return `<div class="badge badge-secondary badge-sm" >Pending</div>`;
                },
            },
            // {
            //     data: "Event_Calandars.status",
            //     title: "Status",
            //     render: function (data, type, row) {
            //         data = row.status.toUpperCase();
            //         if (data == "ENABLE") {
            //             return `<div class="badge badge-success badge-sm" >${data}</div>`;
            //         }
            //         return `<div class="badge badge-error badge-sm" >${data}</div>`;
            //     },
            // },
            {
                data: "Event_Calandars.name",
                title: "name",

                render: function (data, type, row) {
                    return row.name;
                },
            },
            {
                data: "Event_Calandars.start_date",
                title: `<h3>Start Time</h3>`,
                render: function (data, type, row) {
                    data = row.start_date;
                    const _d = unity.dateTimeToStr(data);
                    if (_d == "") {
                        return "";
                    }
                    const datetime = _d.split(" ");
                    const warp_datatime = `<div class="flex flex-col gap-1">
                                            <div class="badge-date">${datetime[0]}</div>
                                            <div class="badge-time">${datetime[1]}</div>
                                            </div>`;
                    return warp_datatime;
                },
            },
            {
                data: "Event_Calandars.end_date",
                title: `<h3>End Time</h3>`,
                render: function (data, type, row) {
                    data = row.end_date;
                    const _d = unity.dateTimeToStr(data);
                    if (_d == "") {
                        return "";
                    }
                    const datetime = _d.split(" ");
                    const warp_datatime = `<div class="flex flex-col gap-1">
                                            <div class="badge-date">${datetime[0]}</div>
                                            <div class="badge-time">${datetime[1]}</div>
                                            </div>`;
                    return warp_datatime;
                },
            },
            {
                data: "Event_Calandars.period",
                title: "period",
                render: function (data, type, row) {
                    // Extract period in days
                    let totalDays = parseFloat(row.period);

                    // Validate numeric duration
                    if (isNaN(totalDays) || totalDays < 0) {
                        return "0 day 0 hour 0 minutes";
                    }

                    // 1. Extract whole days
                    let days = Math.floor(totalDays);

                    // 2. Compute remaining hours (remainder * 24)
                    let hoursTotal = (totalDays - days) * 24;
                    let hours = Math.floor(hoursTotal);

                    // 3. Compute remaining minutes (remainder * 60)
                    // Round minutes to integer
                    let minutes = Math.round((hoursTotal - hours) * 60);

                    // Handle 60-minute rollover
                    if (minutes === 60) {
                        minutes = 0;
                        hours += 1;
                    }
                    if (hours === 24) {
                        hours = 0;
                        days += 1;
                    }

                    // Return formatted string for table cell
                    return days + " day " + hours + " hour " + minutes + " minutes";
                },
            },
            {
                data: "Event_Calandars.create_by",
                title: "create_by",

                render: function (data, type, row) {
                    return `<div class="badge badge-info badge-sm badge-soft" >${row.create_by}</div>`;
                },
            },
            {
                data: "Event_Calandars.description",
                title: "description",
                render: function (data, type, row) {
                    data = row.description;
                    return data;
                },
            },
            {
                data: "Event_Calandars.remark",
                title: "remark",
                render: function (data, type, row) {
                    let remarkData = row.remark || "";
                    const remark = String(remarkData)
                        .replace(/\\n/g, "<br>") // Fixes literal "\n" strings
                        .replace(/\n/g, "<br>"); // Fixes actual line breaks
                    return `<div class=" text-info text-xs" >${remark}</div>`;
                },
            },
        ],
        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            if (aData.is_active == true) {
                nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-success/50"));
                return;
            }
            if (aData.is_expired == true) {
                nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-error/50"));
            }
        },
    },
    {
        addbtn: true,
    },
);

event_calandars_model_table.create_item_control({
    modal_from: Modal_Event_Calandars,
    api_endpoint: "/api/service_fees/event_calandars",
});

event_calandars_model_table.filter = JSON.stringify({ event_calandars_use_status_filter: "ALL" });
window.event_calandars_filter = event_calandars_filter;
function event_calandars_filter(v) {
    console.log("🚀 event_calandars_use_status_filter", v);
    event_calandars_model_table.filter = JSON.stringify({ event_calandars_use_status_filter: v });
    event_calandars_model_table.reload();
}

window.service_fee_format_manager = service_fee_format_manager;

// ! ------------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("SERVICE_FEES_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("SERVICE_FEES_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
    switch (tab_id) {
        case "SERVICE_FEES_TAB01":
            break;
        case "SERVICE_FEES_TAB02":
            if (!service_fee_code_model_table.table) {
                service_fee_code_model_table.init();
            }
            break;
        case "SERVICE_FEES_TAB03":
            // unity.showDialogInfo({ title: "Not Use in App", msg: "Module Not Install In App" });
            if (!event_calandars_model_table.table) {
                event_calandars_model_table.init();
            }
            break;
        default:
            break;
    }
}

async function init_select_option() {
    await unity.init_selects_option(
        [Modal_Service_Fee_Code.querySelector('[data-field="service_fees_id"]')],
        "/api/service_fees",
    );

    await unity.init_selects_option(
        [Modal_Service_Fee_Code.querySelector('[data-field="customer_id"]')],
        "/api/customer",
        "customer_name",
    );
}

async function Init() {
    await init_select_option();
    service_fees_item_model.init().then((c) => {
        document.getElementById("service_fee_total").textContent = c;
    });

    // service_fee_code_model_table.init();
    service_fee_model_table.init();

    const default_tab = "SERVICE_FEES_TAB01";

    if (localStorage.getItem("SERVICE_FEES_TAB_ACTIVE")) {
        const v = localStorage.getItem("SERVICE_FEES_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
                event_tab_active(document.getElementById(v));
            }
        }
    } else {
        document.getElementById(default_tab).checked = true;
    }
    // unity.initSelect2();
    const dateFormat = "Y/m/d H:i";

    const modal = Modal_Service_Fee_calculate_test;
    const dateTime_start = modal.querySelector('[data-field="dateTime_start"]');
    flatpickr(dateTime_start, {
        // appendTo: modal,
        static: true,
        // position: "above",
        enableTime: true,
        dateFormat: dateFormat,
        time_24hr: true,
        defaultHour: 0,
        defaultMinute: 0,
        defaultDate: new Date(new Date().setHours(0, 0, 0, 0)),
    });

    const dateTime_pay = modal.querySelector('[data-field="dateTime_pay"]');
    flatpickr(dateTime_pay, {
        // appendTo: box,
        static: true,
        // position: "above",
        enableTime: true,
        dateFormat: dateFormat,
        time_24hr: true,
        defaultHour: 0,
        defaultMinute: 0,
        // defaultDate: new Date(new Date().setHours(0, 0, 0, 0)),
    });

    const dateTime_end = modal.querySelector('[data-field="dateTime_end"]');
    flatpickr(dateTime_end, {
        // appendTo: modal,
        static: true,
        // position: "auto",
        enableTime: true,
        dateFormat: dateFormat,
        time_24hr: true,
        defaultHour: 0,
        defaultMinute: 0,
        defaultDate: new Date(new Date().setHours(1, 0, 0, 0)),
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});

window.service_fee_onchange = service_fee_onchange;
function service_fee_onchange() {
    console.log("🚀 service_fee_onchange");
}
