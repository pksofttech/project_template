import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

let transaction_current = null;
let transactions_id = null;

// Account Transactions Table
const account_transaction_model_table = new table_class.TableModel(
    "#customer_account_auto_credit_table",
    "/api/account_record/datatable",
    {
        table: "Account_Record",
        dom: '<"top"Bf>rt<"bottom"pl><"clear">',
        // select: {
        //     style: "single",
        // },
        columns: [
            {
                data: "Account_Record.no",
                title: "Receipt.No",
                render: function (data, type, row) {
                    data = row.no;
                    return `<badge class="badge badge-primary badge-sm badge-soft">${String(data).padStart(8, "0")}</badge>`;
                    // return `<a role=button onclick="previewAccSlipImage(${row.id})" class="inline-flex items-center font-medium text-blue-600 dark:text-blue-500 hover:underline">
                    //             ${String(data).padStart(8, "0")}
                    //             </a>`;
                },
            },
            // {
            //     title: `<h3>Record ID</h3>`,
            //     render: function (data, type, row) {
            //         data = row.id;
            //         return data;
            //     },
            // },
            {
                data: "Transaction_Record.card_id",
                title: `<h3>Card ID</h3>`,
                render: function (data, type, row) {
                    data = row.card_id;
                    return data;
                },
            },
            {
                data: "Log_Transaction.license",
                title: `<h3>License</h3>`,
                render: function (data, type, row) {
                    data = row.license;
                    return data;
                },
            },
            {
                data: "Account_Record.date_time",
                title: `<h3>Date Time</h3>`,
                render: function (data, type, row) {
                    data = row.date_time;
                    const _d = unity.dateTimeToStr(data);
                    const datetime = _d.split(" ");
                    const warp_datatime = `<div class="flex flex-col gap-1">
                                <div class="badge-date">${datetime[0]}</div>
                                <div class="badge-time">${datetime[1]}</div>
                                </div>`;
                    return warp_datatime;
                },
            },

            {
                data: "Transaction_Record.id",
                title: `<h3>Transaction No.</h3>`,

                render: function (data, type, row) {
                    data = row.id_1;
                    return `<a role=button onclick="infoTransactionShow(${data})"  class="inline-flex items-center font-medium text-blue-600 dark:text-blue-500 hover:underline">
                                ${String(data).padStart(8, "0")}
                                <svg aria-hidden="true" class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                                </a>`;
                },
            },
            {
                data: "Service_Fees.name",
                title: `<h3>Service Fees</h3>`,
                render: function (data, type, row) {
                    data = row.name;
                    return data;
                },
            },
            {
                data: "Service_Fees_Code.name",
                title: 'CODE <i class="fa-solid fa-tag"></i>',
                name: "service_fee_code_name",
                render: function (data, type, row) {
                    data = row.service_fee_code_name;
                    if (data) {
                        return `<span class="badge badge-success text-white font-bold">${data}</span>`;
                    }
                    return ``;
                },
            },
            {
                data: "Account_Record.amount",
                title: `<h3>Amount</h3>`,
                render: function (data, type, row) {
                    data = row.amount;
                    return unity.toCurrency(data);
                },
            },

            {
                data: "Account_Record.cashier",
                title: `<h3>Cashier</h3>`,
                render: function (data, type, row) {
                    data = row.cashier;
                    return data;
                },
            },
            {
                data: "System_Users.username",
                title: `<h3>Operator</h3>`,
                render: function (data, type, row) {
                    data = row.username;
                    return data;
                },
            },
            {
                data: "Service_Fees_Code.tag",
                title: 'TAG <i class="fa-solid fa-tag"></i>',
                render: function (data, type, row) {
                    data = row.tag;
                    if (data) {
                        return `<i class="fa-solid fa-user-tag"></i><span class=""> ${data}</span>`;
                    }
                    return `<i class="fa-solid fa-user-tag"></i><span class=""> Not-Tag</span>`;
                },
            },
        ],
        footerCallback: function (row, data, start, end, display) {
            const api = this.api();

            const settings = api.settings()[0];
            if (!settings._cols) {
                console.warn("⚠️ columns config missing (_cols)");
                return; // Guard
            }

            const getCol = (footerTitle) => {
                const cols = settings._cols;
                return cols.findIndex((c) => c.footer === footerTitle);
            };

            let sum_amount = 0;
            let sum_fine = 0;

            api.data().each((r) => {
                // console.log(r);
                sum_amount += r.amount || 0;
                sum_fine += r.fine || 0;
            });

            const total = sum_amount + sum_fine;

            $(api.column(getCol("total")).footer()).html(unity.toCurrency(total / 1.07));
            $(api.column(getCol("vat")).footer()).html(unity.toCurrency(total - total / 1.07));
        },
    },
    {
        callback: async function (type, row) {
            console.log("🚀 ", type);
            if (type == "reload") {
                account_auto_credit_summary_inv(
                    document.getElementById("customer_select_main").value,
                    document.getElementById("select_date_time_range_of_build_customer_account_auto_credit_table").value,
                );
            }
        },
    },
);

// Parked Vehicles Table
const transaction_parked_table = new table_class.TableModel(
    "#transaction_parked_table",
    "/api/transaction_record/datatable",
    {
        table: "Transaction_Record",
        dom: '<"top"if>rt<"bottom"lp><"clear">',
        destroy: true,
        autoWidth: true,
        lengthMenu: [25, 50, 75, 100],
        scrollY: "50vh",
        scrollCollapse: true,
        sScrollX: "100%",
        //paging: false,
        order: [[5, "desc"]],
        processing: true,
        serverSide: true,
        search: {
            return: true,
        },
        //searching: false,
        select: false,
        columns: [
            {
                data: "Transaction_Record.card_id",
                title: "Actions",
                orderable: false,
                render: function (data, type, row) {
                    // console.log(_gate_mode);
                    data = row.card_id;
                    return `<div class="text-center"><a class="text-primary" onclick="submit_transaction_data('${data}');"> <i class="fa-solid fa-circle-check fa-2x"></i></a></div>`;
                },
            },
            {
                data: "in_log.images_path",
                title: "Snapshot",
                orderable: false,
                render: function (data, type, row) {
                    data = row.images_path;
                    if (data) {
                        const in_images_paths = data.split(",");
                        return `<a href="${in_images_paths[0]}" target = "_blank" ><img loading="lazy" class="duration-500 ease-in rounded-box max-h-10 hover:scale-150" src="${in_images_paths[0]}"> </a>`;
                    } else {
                        return "";
                    }
                },
            },
            {
                data: "Transaction_Record.type",
                title: "Type",
                orderable: false,
                render: function (data, type, row) {
                    data = row.type;
                    if (data == "VISITOR") {
                        return `<i class="text-orange-500 nav-icon fa fa-user-tie"></i> <span class="badge-warning">${data}</span>`;
                    }
                    return data;
                },
            },
            {
                data: "Transaction_Record.card_id",
                title: "Card ID",
                render: function (data, type, row) {
                    data = row.card_id;
                    return `<div class="text-nowrap">${data}</div>`;
                },
            },
            {
                data: "in_log.license",
                title: "License Plate",
                render: function (data, type, row) {
                    data = row.license;
                    return data;
                },
            },
            {
                data: "in_log.date_time",
                title: "Entry DateTime",
                render: function (data, type, row) {
                    data = row.date_time;
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
                data: "in_gate.name",
                title: "Entry Gate",
                render: function (data, type, row) {
                    data = row.name;
                    return data;
                },
            },
            {
                data: "Transaction_Record.parked",
                title: "Stay Duration",
                render: function (data, type, row) {
                    data = row.parked;
                    if (data) {
                        const duration = unity.secondsToDuration(data);
                        return `<i class="nav-icon fa fa-clock text-info"></i> <span class="badge-success">${duration}</span>`;
                    } else {
                        if (row.status == "CHECK_IN") {
                            const parked = unity.timeRef(row.date_time);
                            console.log("parked", parked);
                            return `<i class="nav-icon fa fa-clock text-info"></i> <span class="badge-warning">${parked}</span>`;
                        } else {
                            return "-";
                        }
                    }
                },
            },
            {
                data: "Transaction_Record.status",
                title: "Status",
                render: function (data, type, row) {
                    data = row.status;
                    if (data == "SUCCESS") {
                        return `<i class="text-green-500 nav-icon fa fa-circle-check"></i> <span class="badge-success">${data}</span>`;
                    } else if (data == "CLOSE") {
                        return `<i class="text-orange-500 nav-icon fa fa-circle-xmark"></i> <span class="badge-warning">${data}</span>`;
                    } else if (data == "CHECK_IN") {
                        return `<i class="text-blue-500 nav-icon fa fa-square-parking"></i> <span class="badge-info">PARKED</span>`;
                    } else {
                        return data;
                    }
                },
            },

            {
                data: "Service_Fees.name",
                title: "Tariff Profile",
                name: "service_fees",
                render: function (data, type, row) {
                    return row.service_fees || "No Tariff Configured";
                },
            },
        ],
    },
);
transaction_parked_table.data_filter = "parked_visitor";

// Customer E-Stamp Parked Table
const customer_estamp_parked_table = new table_class.TableModel(
    "#customer_estamp_parked_table",
    "/api/transaction_record/datatable",
    {
        table: "Transaction_Record",
        // dom: '<"top"if>rt<"bottom"lp><"clear">',
        destroy: true,
        autoWidth: true,
        lengthMenu: [25, 50, 75, 100],
        scrollY: "50vh",
        scrollCollapse: true,
        sScrollX: "100%",
        //paging: false,
        order: [[5, "desc"]],
        processing: true,
        serverSide: true,
        search: {
            return: true,
        },
        //searching: false,
        select: false,
        columns: [
            {
                data: "in_log.images_path",
                title: "Snapshot",
                orderable: false,
                render: function (data, type, row) {
                    data = row.images_path;
                    if (data) {
                        const in_images_paths = data.split(",");
                        return `<a href="${in_images_paths[0]}" target = "_blank" ><img loading="lazy" class="duration-500 ease-in rounded-box max-h-10 hover:scale-150" src="${in_images_paths[0]}"> </a>`;
                    } else {
                        return "";
                    }
                },
            },
            {
                data: "Transaction_Record.type",
                title: "Type",
                orderable: false,
                render: function (data, type, row) {
                    data = row.type;
                    if (data == "VISITOR") {
                        return `<i class="text-orange-500 nav-icon fa fa-user-tie"></i> <span class="badge-warning">${data}</span>`;
                    }
                    return data;
                },
            },
            {
                data: "Transaction_Record.card_id",
                title: "Card ID",
                render: function (data, type, row) {
                    data = row.card_id;
                    return `<div class="text-nowrap">${data}</div>`;
                },
            },
            {
                data: "in_log.license",
                title: "License Plate",
                render: function (data, type, row) {
                    data = row.license;
                    return data;
                },
            },
            {
                data: "in_log.date_time",
                title: "Entry DateTime",
                render: function (data, type, row) {
                    data = row.date_time;
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
                data: "in_gate.name",
                title: "Entry Gate",
                render: function (data, type, row) {
                    data = row.name;
                    return data;
                },
            },
            {
                data: "Transaction_Record.parked",
                title: "Stay Duration",
                render: function (data, type, row) {
                    const parked = unity.timeRef(row.date_time);
                    console.log("parked", parked);
                    return `<i class="nav-icon fa fa-clock text-info"></i> <span class="badge-warning">${parked}</span>`;
                },
            },
            {
                data: "Service_Fees.name",
                title: "Tariff Profile",
                name: "service_fees",
                render: function (data, type, row) {
                    return row.service_fees || "No Tariff Configured";
                },
            },
        ],
    },
);
customer_estamp_parked_table.data_filter = "parked_visitor";
customer_estamp_parked_table.data_custom_filter = { data_estamp_customer_id: 0 };

window.load_estamp_data = load_estamp_data;
async function load_estamp_data(estamp_device_id) {
    console.log("🚀 ~ load_estamp_data ~ estamp_device_id:", estamp_device_id);
    const box_of_estamp_device_service_fee = document.getElementById("box_of_estamp_device_service_fee");
    const customer_select_main = document.getElementById("customer_select_main");
    const searchInput = document.getElementById("input_search_service_fee");
    if (searchInput) {
        searchInput.value = "";
        const clearBtn = document.getElementById("btn_clear_search_service_fee");
        if (clearBtn) clearBtn.classList.add("hidden");
    }
    box_of_estamp_device_service_fee.innerHTML = "";
    if (estamp_device_id == null) {
        estamp_device_id = document.getElementById("estamp_device_name").value;
    } else {
        document.getElementById("estamp_device_name").value = estamp_device_id;
    }

    if (estamp_device_id == "") {
        unity.showDialogError({ msg: "User account lacks E-Stamp privilege. Please contact administrator." });
        return;
    }
    document.getElementById("lable_of_estamp_device_name").innerText = estamp_device_id;
    const respond = await unity.fetchApi(
        "/api/estamp_device/service_fees?estamp_device_id=" + estamp_device_id,
        "get",
        null,
        "json",
    );

    if (respond.success) {
        const temp = document.getElementById("template_content_estamp_device_service_fee");
        const estamp_type = document.getElementById("estamp_type");
        const estamp_customer_name = document.getElementById("estamp_customer_name");
        const list_service_fee = respond.data;
        const estamp_device_info = respond.estamp_device_info;
        console.log(respond);
        const customer = estamp_device_info ? estamp_device_info.Customer : null;
        const estamp_device = estamp_device_info ? estamp_device_info.Estamp_Device : null;
        estamp_type.textContent = estamp_device ? estamp_device.type : "";
        estamp_customer_name.textContent = customer ? customer.customer_name : "";
        if (customer && customer.estamp_limit > 0) {
            estamp_customer_name.textContent += ` [*Limit Estamp: ${customer.estamp_limit}]`;
        }

        // Monthly Quota Indicator
        const monthly_quota_limit = customer && customer.estamp_limit ? customer.estamp_limit : 0;
        const monthly_stamped_count = respond.monthly_stamped_count || 0;
        const estamp_monthly_quota_display = document.getElementById("estamp_monthly_quota_display");
        if (estamp_monthly_quota_display) {
            if (monthly_quota_limit > 0) {
                const isOver = monthly_stamped_count >= monthly_quota_limit;
                const countClass = isOver ? "text-error font-bold" : "text-success font-bold";
                const badgeFull = isOver ? ` <span class="badge badge-error badge-xs font-semibold ml-1">FULL</span>` : "";
                estamp_monthly_quota_display.innerHTML = `<span class="${countClass}">${monthly_stamped_count.toLocaleString()}</span> <span class="text-xs opacity-70">/ ${monthly_quota_limit.toLocaleString()} quota</span>${badgeFull}`;
            } else {
                estamp_monthly_quota_display.innerHTML = `<span class="text-success font-bold">${monthly_stamped_count.toLocaleString()}</span> <span class="text-xs opacity-70">/ Unlimited</span>`;
            }
        }
        const customer_is_actrive = customer ? customer.active : true;
        const estamp_is_actrive = estamp_device.status == "ENABLE";

        if (customer_is_actrive && estamp_is_actrive) {
            if (customer) {
                customer_select_main.value = customer.id;
            } else {
                customer_select_main.value = "";
            }
            for (const service_fee of list_service_fee) {
                const s = service_fee.Service_Fees;
                const sc = service_fee.Service_Fees_Code;
                const _c = temp.content.cloneNode(true);
                const code = sc ? sc.name : "";
                _c.querySelector('[data-field="code_stamp_name"]').textContent = code;
                _c.querySelector('[data-field="name"]').textContent = s.name;
                _c.querySelector('[data-field="remark"]').textContent = s.remark;
                _c.querySelector('[data-field="btn_stamp"]').onclick = () => {
                    show_dialog_stamp(s.id, s.name, code);
                };
                box_of_estamp_device_service_fee.appendChild(_c);
            }
        } else {
            box_of_estamp_device_service_fee.innerHTML =
                "Customer account is deactivated<br>E-Stamp device is inactive";
        }
    } else {
        customer_select_main.value = 0;
        console.log(respond);
        unity.showToastNotification({ type: "error", title: "load_estamp_data", msg: respond.msg });
    }
    localStorage.setItem("ESTAMP_DEVICE_NAME", estamp_device_id);

    clear_transaction_data();
    document.getElementById("input_transaction_card_id").focus();
    setTimeout(() => {
        customer_select_change(customer_select_main.value);
    }, 1000);
}

window.estamp_input_id_card_onkeypress = estamp_input_id_card_onkeypress;
function estamp_input_id_card_onkeypress(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        submit_transaction_data();
    }
}

window.select_card_id_by_btn = select_card_id_by_btn;
function select_card_id_by_btn(v) {
    const input_transaction_card_id = document.getElementById("input_transaction_card_id");
    input_transaction_card_id.value = v;
    Modal_Select_Card_id.close();
    submit_transaction_data();
}

window.submit_transaction_data = submit_transaction_data;
async function submit_transaction_data(transaction_card_id = null) {
    const input_transaction_card_id = document.getElementById("input_transaction_card_id");
    let _card_id = transaction_card_id ? transaction_card_id : input_transaction_card_id.value.trim();
    if (!_card_id) {
        unity.showToastNotification({ type: "warning", title: "Please tap card or enter Card ID" });
        input_transaction_card_id.focus();
        return;
    }
    console.log(_card_id);
    _card_id = unity.validateTransactionString(_card_id);
    clear_transaction_data();
    const _api_path = `/api/function/check_out?card_id=${_card_id}&options=estamp`;
    const respond = await unity.fetchApi(_api_path, "get", null, "json");
    input_transaction_card_id.value = "";
    if (respond.success) {
        const _data = respond.data.transactions;
        transaction_current = _data;
        const _acc = respond.data.acc;
        console.log(_data);
        console.log(_acc);
        const _gateway = _data.GateWay;
        const _system_user = _data.SystemUser;
        const _tran = _data.Transaction_Record;
        const _Log_Transaction = _data.Log_Transaction;
        const _Vehicle_Type = _data.Vehicle_Type;
        const _services = _data.Service_Fees;
        const _Customer = _acc.customer;

        let service_fee_name = "No Tariff Configured";
        if (_services) {
            service_fee_name = _services.name;
        }
        transactions_id = _tran.id;

        const log_in_date_time = dayjs(_Log_Transaction.date_time);
        console.log(log_in_date_time);
        document.getElementById("transaction_type").textContent = _tran.type;
        document.getElementById("transaction_card_id").textContent = _tran.card_id;
        document.getElementById("transaction_license_id").textContent = _Log_Transaction.license;
        document.getElementById("transaction_vehicle_type").textContent = _Vehicle_Type ? _Vehicle_Type.name : "";
        document.getElementById("transaction_in_date").textContent = log_in_date_time.format("DD/MM/YYYY");
        document.getElementById("transaction_in_time").textContent = log_in_date_time.format("HH:mm");

        document.getElementById("transaction_parked_time").textContent = _acc.parked;
        document.getElementById("transaction_service_fee_name").textContent = service_fee_name;
        document.getElementById("transaction_service_fee_name_current").textContent = service_fee_name;
        document.getElementById("transaction_service_fee_nestamp_customer_name_current").textContent =
            `${_Customer ? _Customer.customer_name : ""}`;

        document.getElementById("transaction_trans_gate_in_info").textContent = _gateway.name;
        const images_path = _Log_Transaction.images_path.split(",");
        document.getElementById("transaction_ip_camera_01").src = images_path[0];
        document.getElementById("transaction_ip_camera_02").src = images_path[1];

        const _log_estamp = await unity.fetchApi(
            "/api/estamp_device/stamp_transaction?id=" + _tran.id,
            "get",
            null,
            "json",
        );
        if (_log_estamp.success) {
            const transaction_stamp_log = document.getElementById("transaction_stamp_log");
            transaction_stamp_log.innerHTML = "";
            const temp = document.getElementById("template_content_transaction_log");
            const _logs = _log_estamp.data;
            unity.logger.info(_logs);

            for (let i = 0; i < _logs.length; i++) {
                const _log = _logs[i].Estamp_Record_Log;
                const s = _logs[i].System_Users;
                const e = _logs[i].Estamp_Device;
                const before_service_fees = _logs[i].before_service_fees;
                const after_service_fees = _logs[i].after_service_fees;
                unity.logger.info(_log);
                const _c = temp.content.cloneNode(true);
                const _date_time = dayjs(_log.date_time);
                _c.querySelectorAll('[name="content_date_time_stamp"]')[0].innerHTML =
                    _date_time.format("DD/MM/YYYY<br>HH:mm");
                _c.querySelectorAll('[name="content_log_stamp_device"]')[0].innerText = e.device_name;
                _c.querySelectorAll('[name="content_log_stamp"]')[0].innerText = s.name;
                _c.querySelectorAll('[name="content_log_stamp1"]')[0].innerText = before_service_fees;
                _c.querySelectorAll('[name="content_log_stamp2"]')[0].innerText = after_service_fees;
                // transaction_stamp_log.appendChild(_c);
                transaction_stamp_log.insertBefore(_c, transaction_stamp_log.firstChild);
            }
        }
    } else {
        if (respond.card_ids) {
            console.log(respond.card_ids);
            const list_card_ids = document.getElementById("list_card_ids");
            list_card_ids.innerHTML = "";
            const temp = document.getElementById("template_list_card_ids");
            for (let i = 0; i < respond.card_ids.length; i++) {
                if (i >= 8) {
                    break;
                }
                const card_id = respond.card_ids[i];
                const _c = temp.content.cloneNode(true);
                const card_data = card_id.split(":");
                _c.querySelector('[name="info"]').innerText = card_data[1];
                _c.querySelector('[name="license"]').innerText = card_data[0];
                _c.querySelector('[name="btn_select"]').value = card_data[0];
                list_card_ids.appendChild(_c);
            }
            Modal_Select_Card_id.showModal();
            const firstElement = list_card_ids.querySelector("button");
            if (firstElement) {
                firstElement.focus();
            }
        } else {
            input_transaction_card_id.focus();
            //input_transaction_card_id.value = "";
            unity.showDialogWarning({ msg: `No active parking record\n${_card_id}` });
        }
        return false;
    }
}

// window.show_dialog_stamp = show_dialog_stamp;
async function show_dialog_stamp(id, name, code) {
    console.log(transaction_current, id, name, code);
    if (transaction_current) {
        if (transaction_current.Service_Fees) {
            const transaction_current_service_fee_name = transaction_current.Service_Fees.name;
            const estamp_customer_name = document.getElementById("estamp_customer_name").textContent;
            const transaction_service_fee_nestamp_customer_name_current = document.getElementById(
                "transaction_service_fee_nestamp_customer_name_current",
            ).textContent;
            console.log(estamp_customer_name, transaction_service_fee_nestamp_customer_name_current);
            if (
                id == transaction_current.Service_Fees.id &&
                estamp_customer_name == transaction_service_fee_nestamp_customer_name_current
            ) {
                unity.showToastNotification({
                    type: "warning",
                    title: "Tariff Profile",
                    msg: "Current Tariff Profile: " + transaction_current_service_fee_name,
                });
                document.getElementById("input_transaction_card_id").focus();
                return true;
            }

            //!   for vehicle stamp before and after
            const before_service_fees_for_vehicle = "M" ? transaction_current_service_fee_name.endsWith("M") : "C";
            const after_service_fees_for_vehicle = "M" ? name.endsWith("M") : "C";

            if (before_service_fees_for_vehicle != after_service_fees_for_vehicle) {
                unity.showDialogWarning({
                    title: "Invalid Tariff Profile",
                    msg: `Selected E-Stamp rate is incompatible with vehicle type<br>
                        Current Tariff: ${transaction_current_service_fee_name}<br>
                        Selected E-Stamp Tariff: ${name}`,
                });
                return true;
            }
        }
        let log_stamp = "";
        if (document.getElementById("confirm_stamp_toggle_btn")?.checked) {
            const result = await unity.showDialogConfirm({
                title: "Confirm Action?",
                // msg: "Change Service Fee Profile ->" + name,error
                content: `<div class="">
                        <div class="">
                            Change Service Fee Profile
                        </div>
                        <div class="">
                            ${name} ${code ? " (" + code + ")" : ""}
                        </div>
                        <input type="text" data-field="returnValue" placeholder="Enter remarks for E-Stamp" class="input input-bordered w-full" />
                    </div>`,
            });

            if (result.confirm) {
                log_stamp = result.value;
            } else {
                unity.showToastNotification({ type: "warning", msg: "Operation cancelled" });
                return;
            }
        } else {
        }

        confirm_stamp_transaction(id, log_stamp, code);
    } else {
        unity.showToastNotification({
            icon: "warning",
            title: "Incomplete Data",
            msg: "Please tap card or enter Card ID",
        });
    }
    document.getElementById("input_transaction_card_id")?.focus();
}

async function confirm_stamp_transaction(id, log_msg = null, code_stamp_name) {
    if (!transaction_current || !transaction_current.Transaction_Record || !transaction_current.Transaction_Record.id) {
        unity.showToastNotification({
            icon: "warning",
            title: "Incomplete Data",
            msg: "Please tap card or enter Card ID / License Plate first",
        });
        return;
    }
    const estamp_device_id = document.getElementById("estamp_device_name")?.value || "";
    const formData = new FormData();
    formData.append("transaction_record", transaction_current.Transaction_Record.id);
    formData.append("transaction_record_id", transaction_current.Transaction_Record.id);
    formData.append("service_fees_id", id);
    formData.append("estamp_device_id", estamp_device_id);
    formData.append("log_msg", log_msg);
    // code_stamp_name stamp
    if (code_stamp_name) formData.append("code_stamp_name", code_stamp_name);

    unity.debugForm(formData);
    const respond = await unity.fetchApi("/api/estamp_device/stamp_transaction", "post", formData, "json");
    unity.logger.info(respond);
    if (respond.success == true) {
        unity.showToastNotification({
            icon: "success",
            title: "Operation Completed",
            msg: "E-Stamp applied successfully",
        });
        const estamp_log = respond.data;
        unity.logger.debug(estamp_log);
        const transaction_stamp_log = document.getElementById("transaction_stamp_log");
        const temp = document.getElementById("template_content_transaction_log");

        const e = estamp_log.Estamp_Device;
        const s = estamp_log.System_Users;
        const c = estamp_log.Customer;
        const before_service_fees = estamp_log.before_service_fees;
        const after_service_fees = estamp_log.after_service_fees;
        const _c = temp.content.cloneNode(true);
        const _date_time = dayjs(e.date_time);

        _c.querySelector('[name="content_date_time_stamp"]').innerHTML = _date_time.format("DD/MM/YYYY<br>HH:mm");
        _c.querySelector('[name="content_log_stamp_device"]').innerText = e.device_name;
        _c.querySelector('[name="content_log_stamp"]').innerText = s.name;
        _c.querySelector('[name="content_log_stamp1"]').innerText = before_service_fees;
        _c.querySelector('[name="content_log_stamp2"]').innerText = after_service_fees;
        // transaction_stamp_log.appendChild(_c);
        transaction_stamp_log.insertBefore(_c, transaction_stamp_log.firstChild);
        transaction_current.Service_Fees.id = id;

        document.getElementById("transaction_service_fee_name_current").innerHTML = after_service_fees;
        document.getElementById("transaction_service_fee_nestamp_customer_name_current").textContent = c
            ? c.customer_name
            : "";
        // Refresh monthly quota counter display
        load_estamp_data();
        // submit_transaction_data();
    } else {
        // unity.showToastNotification({
        //     icon: "error",
        //     title: "Unable to Process",
        //     msg: respond.msg,
        // });
        unity.showDialogWarning({ msg: respond.msg });
    }
}

window.scan_qr_code = scan_qr_code;
async function scan_qr_code() {
    async function scan_qr_code_success(data) {
        unity.logger.debug(data);
        document.getElementById("input_transaction_card_id").value = data;
        submit_transaction_data();
    }
    unity.scanQR(true, scan_qr_code_success);
}

window.confirm_stamp_toggle_onchange = confirm_stamp_toggle_onchange;
function confirm_stamp_toggle_onchange(v) {
    localStorage.setItem("CONFIRM_STAMP_TOGGLE", v);
    const CONFIRM_STAMP_TOGGLE = localStorage.getItem("CONFIRM_STAMP_TOGGLE");
    unity.logger.debug(CONFIRM_STAMP_TOGGLE);
}

window.clear_transaction_data = clear_transaction_data;
function clear_transaction_data() {
    modal_search_transaction_in.close();
    console.log("clear_transaction_data");
    transactions_id = null;
    transaction_current = null;
    document.getElementById("transaction_in_date").innerHTML = "";
    document.getElementById("transaction_card_id").innerHTML = "";
    document.getElementById("transaction_license_id").innerHTML = "";
    document.getElementById("transaction_in_time").innerHTML = "";
    document.getElementById("transaction_parked_time").innerHTML = "";
    document.getElementById("transaction_service_fee_name").innerHTML = "";
    document.getElementById("transaction_service_fee_name_current").innerHTML = "-";
    document.getElementById("transaction_service_fee_nestamp_customer_name_current").textContent = "";
    document.getElementById("transaction_trans_gate_in_info").innerHTML = "";
    document.getElementById("transaction_ip_camera_01").src = "/static/image/logo.jpg";
    document.getElementById("transaction_ip_camera_02").src = "/static/image/logo.jpg";
    document.getElementById("input_transaction_card_id").focus();
    // console.log(transaction_current);
}

async function requestNFCPermission() {
    if ("NDEFReader" in window) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: "nfc" });
            unity.logger.debug(`NFC permission state: ${permissionStatus.state}`);
            if (permissionStatus.state === "prompt") {
                unity.showToastNotification({ type: "info", msg: "Please approve the NFC permission request." });
                const result = await unity.showDialogConfirm({
                    title: "NFC Supported Device",
                    content: "Confirm connection to this device?",
                });
                if (!result.confirm) return false;
            } else if (permissionStatus.state === "denied") {
                unity.showToastNotification({
                    icon: "error",
                    msg: "NFC permission denied. Please enable NFC in site settings.",
                });
                return false;
            } else if (permissionStatus.state === "granted") {
                unity.logger.debug("NFC permission already granted");
            }
            permissionStatus.onchange = () => {
                unity.logger.debug(`NFC permission state changed to: ${permissionStatus.state}`);
            };

            startServiceNFC();
        } catch (error) {
            unity.logger.error(`Error requesting NFC permission: ${error.message}`);
            unity.showToastNotification({ type: "error", msg: `Error: ${error.message}` });
            return false;
        }
    }
}

async function startServiceNFC() {
    try {
        if (!("NDEFReader" in window)) {
            unity.logger.error("Web NFC is not supported on this device");
            unity.showToastNotification({ type: "warning", msg: "Web NFC is not supported on this device" });
            return;
        }

        const NDEF_READER = new NDEFReader();
        unity.logger.debug("Starting NFC scan...");

        NDEF_READER.addEventListener("reading", (event) => {
            const reversedHex = event.serialNumber.split(":").reverse().join("");
            const serialNumberDecimal = parseInt(reversedHex, 16);

            document.getElementById("input_transaction_card_id").value = serialNumberDecimal.toString();
            submit_transaction_data();
        });

        NDEF_READER.addEventListener("readingerror", () => {
            unity.logger.error("Failed to read NFC tag");
            unity.showToastNotification({ type: "error", msg: "Failed to read NFC tag" });
        });

        await NDEF_READER.scan();

        unity.showToastNotification({ type: "success", msg: "NFC scanning started..." });
    } catch (error) {
        unity.logger.error(`Error on scan: ${error.message}`);
        unity.showToastNotification({ type: "error", msg: `Error on NFC: ${error.message}` });
    }
}

window.check_service_fee = check_service_fee;
async function check_service_fee() {
    const card_id = document.getElementById("transaction_card_id").textContent.trim();
    console.log("check_service_fee", card_id);
    const _api_path = `/api/function/check_out?card_id=${card_id}`;
    const _reply = await unity.fetchApi(_api_path, "get", null, "json");
    if (_reply.success) {
        const _data = _reply.data;
        console.log(_data);
        const transactions = _data.transactions;
        const acc = _data.acc;
        const modal = Modal_Service_Fee_Detail;
        const customer = acc.customer;
        const sum_amount = parseFloat(acc.sum_amount);
        const visitor_amount = parseFloat(acc.amount);
        const customer_amount = parseFloat(acc.customer_amount);
        modal.querySelector('[data-field="card_id"]').textContent = transactions.Transaction_Record.card_id;
        modal.querySelector('[data-field="license"]').textContent = transactions.Log_Transaction.license;
        modal.querySelector('[data-field="service_fees_name"]').textContent = transactions.Service_Fees.name;
        modal.querySelector('[data-field="parked_time"]').textContent = acc.parked + "  (HH:MM)";

        modal.querySelector('[data-field="customer_name"]').textContent = customer
            ? customer.customer_name
            : "No records";
        modal.querySelector('[data-field="customer_amount"]').textContent = customer_amount;
        modal.querySelector('[data-field="visitor_amount"]').textContent = visitor_amount;
        modal.querySelector('[data-field="total_amount"]').textContent = sum_amount;

        modal.showModal();
    }
}

// ! ------------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("ESTAMP_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("ESTAMP_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

async function account_auto_credit_summary_inv(customer_id, date_range) {
    const res = await unity.fetchApi(
        `/api/account_record/get_customer_auto_credit_summary?customer_id=${customer_id}&date_range=${date_range}`,
        "get",
        null,
        "json",
    );

    const data = res.data;
    console.log(data);
    try {
        const tbody = document.querySelector('[data-field="table_of_customer_account_auto_credit_inv"] tbody');
        tbody.innerHTML = "";

        let index = 1;
        let grandTotal = 0;
        let grandQuantity = 0;

        for (const row of data) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td class="text-center">${index++}</td>
            <td>[${row.transaction_code}]:${row.service_name}</td>
            <td class="text-right">${row.quantity}</td>
            <td class="text-right">${unity.toCurrency(row.total_amount)}</td>
        `;
            tbody.appendChild(tr);
            grandTotal += row.total_amount;
            grandQuantity += row.quantity;
        }

        // Grand Total Row
        const totalRow = document.createElement("tr");
        totalRow.classList.add("bg-base-200", "font-semibold");
        totalRow.innerHTML = `
        <td colspan="2" class="text-right">Grand Total</td>
        <td class="text-right">${grandQuantity}</td>
        <td class="text-right">${unity.toCurrency(grandTotal)}</td>
    `;
        tbody.appendChild(totalRow);
    } catch (error) {
        console.log(error);
    }
}
async function customer_select_change(id) {
    if (!id) {
        return;
    }
    console.log("📛 customer_select_change", id);
    const customer_container = document.getElementById("customer_info_container");
    const customer_parked_container = document.getElementById("customer_info_parked_container");
    let data = {};
    if (id > 0) {
        const respond = await unity.fetchApi(`/api/customer?id=${id}`, "get", null, "json");
        if (respond.success) {
            data = respond.data;
        }
    }
    unity.data2fields(data, customer_container);
    unity.data2fields(data, customer_parked_container);
    const filter = { "Account_Record.type": "CUSTOMER_AUTO_CREDIT", "Account_Record.customer_id": id != 0 ? id : null };
    account_transaction_model_table.filter = JSON.stringify(filter);
    account_transaction_model_table.table.page("first").draw("page");
    account_transaction_model_table.reload();
    console.log("📛 account_transaction_model_table", filter);
    customer_estamp_parked_table.data_custom_filter = { data_estamp_customer_id: data.id };
    customer_estamp_parked_table.reload();
}

async function init_select_option() {
    unity.init_selects_option([document.getElementById("customer_select_main")], "/api/customer", "customer_name");
}

async function Init() {
    if (ACCESS_TOKEN) {
        console.log("access_token", ACCESS_TOKEN);
        unity.setCookie("Authorization", `Bearer ${ACCESS_TOKEN}`, 2147483647);
    }
    if (localStorage.getItem("ESTAMP_TAB_ACTIVE")) {
        const v = localStorage.getItem("ESTAMP_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    }
    await init_select_option();
    requestNFCPermission();

    const daterangepicker_config = unity.getFlatpickrConfigWithEmbeddedRanges();
    table_class.init_table_model_with_datatime_picker(
        account_transaction_model_table,
        "#select_date_time_range_of_build_customer_account_auto_credit_table",
        daterangepicker_config,
    );
    const params = new URLSearchParams(window.location.search);
    const device = params.get("device");
    let ESTAMP_DEVICE_NAME = localStorage.getItem("ESTAMP_DEVICE_NAME");

    if (device) {
        ESTAMP_DEVICE_NAME = device.split("@")[0];
    }
    const select = document.getElementById("estamp_device_name");
    console.log(select?.options?.length, ESTAMP_DEVICE_NAME);

    if (select && select.options && select.options.length > 0) {
        const estamp_id = params.get("id") || ESTAMP_DEVICE_NAME;
        load_estamp_data(estamp_id);
    } else {
        unity.showDialogWarning({ msg: "User account lacks E-Stamp privilege. Please contact administrator." });
    }

    const CONFIRM_STAMP_TOGGLE = localStorage.getItem("CONFIRM_STAMP_TOGGLE");
    unity.logger.debug(CONFIRM_STAMP_TOGGLE);
    const confirmToggleBtn = document.getElementById("confirm_stamp_toggle_btn");
    if (confirmToggleBtn) {
        confirmToggleBtn.checked = CONFIRM_STAMP_TOGGLE === "true";
    }

    if (document.getElementById("transaction_parked_table")) {
        transaction_parked_table.init();
    }

    if (document.getElementById("customer_estamp_parked_table")) {
        customer_estamp_parked_table.init();
    }

    initWebSocketDevice();
}

window.search_service_fee = search_service_fee;
function search_service_fee(serach_str) {
    const query = (serach_str || "").trim().toLowerCase();
    const divElement = document.getElementById("box_of_estamp_device_service_fee");
    const clearBtn = document.getElementById("btn_clear_search_service_fee");

    if (clearBtn) {
        if (query.length > 0) {
            clearBtn.classList.remove("hidden");
        } else {
            clearBtn.classList.add("hidden");
        }
    }

    if (!divElement) return;

    const cards = divElement.children;
    if (!cards || cards.length === 0) return;

    if (query.length === 0) {
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            if (card.nodeType === Node.ELEMENT_NODE) {
                card.classList.remove(
                    "opacity-30",
                    "scale-[0.98]",
                    "ring-2",
                    "ring-primary",
                    "bg-primary/5",
                    "border-primary",
                    "shadow-md",
                );
            }
        }
        divElement.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }

    let firstMatch = null;

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (card.nodeType !== Node.ELEMENT_NODE) continue;

        const nameEl = card.querySelector('[data-field="name"]');
        const codeEl = card.querySelector('[data-field="code_stamp_name"]');
        const remarkEl = card.querySelector('[data-field="remark"]');

        const nameText = nameEl ? nameEl.textContent.toLowerCase() : "";
        const codeText = codeEl ? codeEl.textContent.toLowerCase() : "";
        const remarkText = remarkEl ? remarkEl.textContent.toLowerCase() : "";
        const fullCardText = card.textContent.toLowerCase();

        const isMatch =
            nameText.includes(query) ||
            codeText.includes(query) ||
            remarkText.includes(query) ||
            fullCardText.includes(query);

        if (isMatch) {
            card.classList.remove("opacity-30", "scale-[0.98]");
            card.classList.add("ring-2", "ring-primary", "bg-primary/5", "border-primary", "shadow-md");
            if (!firstMatch) {
                firstMatch = card;
            }
        } else {
            card.classList.add("opacity-30", "scale-[0.98]");
            card.classList.remove("ring-2", "ring-primary", "bg-primary/5", "border-primary", "shadow-md");
        }
    }

    if (firstMatch) {
        firstMatch.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

window.clear_service_fee_search = clear_service_fee_search;
function clear_service_fee_search() {
    const searchInput = document.getElementById("input_search_service_fee");
    if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
    }
    search_service_fee("");
}

window.estamp_search_service_fee_onkeypress = estamp_search_service_fee_onkeypress;
function estamp_search_service_fee_onkeypress(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        const divElement = document.getElementById("box_of_estamp_device_service_fee");
        if (divElement) {
            const firstMatchBtn = divElement.querySelector('.ring-primary [data-field="btn_stamp"]');
            if (firstMatchBtn) {
                firstMatchBtn.focus();
            }
        }
    }
}

window.search_transaction_in = search_transaction_in;
async function search_transaction_in() {
    transaction_parked_table.reload();
    modal_search_transaction_in.showModal();
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});

function initWebSocketDevice() {
    console.log("🔗 initWebSocketDevice");
    const path = window.location.pathname;
    console.log(path);
    if (path == "/estamp_box") {
        new unity.WebSocketClient((e) => {
            console.log(e);
            if (e.type == "event") {
                if (e.hw == "serial_qr_reader") {
                    const data = e.data;
                    if (data) {
                        let card_ids = unity.validateTransactionString(data);
                        card_ids = card_ids.split(" ")[0];
                        console.log("card_ids", card_ids);
                        submit_transaction_data(card_ids);
                    }
                }
            } else if (e.type == "cmd") {
                if (e.data == "RELOAD") {
                    location.reload();
                }
            }
        }, "localhost:8080");
    }
}

window.previewOperatorSummaryReportA4 = previewOperatorSummaryReportA4;
async function previewOperatorSummaryReportA4() {
    const customer_name =
        document.querySelector("#customer_info_container [data-field='customer_name']")?.textContent || "All Customers";
    const customer_code =
        document.querySelector("#customer_info_container [data-field='customer_code']")?.textContent || "-";
    const dateRange =
        document.getElementById("select_date_time_range_of_build_customer_account_auto_credit_table")?.value ||
        "All Time";

    const rows = document.querySelectorAll('[data-field="table_of_customer_account_auto_credit_inv"] tbody tr');
    if (!rows || rows.length === 0) {
        unity.showToastNotification({ type: "warning", msg: "No data available for A4 summary report" });
        return;
    }

    let summaryItems = [];
    rows.forEach((tr) => {
        const tds = tr.querySelectorAll("td");
        if (tds.length >= 4 && !tr.classList.contains("bg-base-200")) {
            summaryItems.push({
                no: tds[0].textContent.trim(),
                name: tds[1].textContent.trim(),
                quantity: tds[2].textContent.trim(),
                amount: tds[3].textContent.trim(),
            });
        }
    });

    const totalQty =
        Array.from(rows).pop()?.querySelectorAll("td")[1]?.textContent.trim() ||
        summaryItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0);
    const totalAmount = Array.from(rows).pop()?.querySelectorAll("td")[2]?.textContent.trim() || "-";

    const fontFamily = unity.ReportSettings?.fontFamily || "'Sarabun', 'Prompt', 'Kanit', sans-serif";
    const colorPrimary = unity.ReportSettings?.colorPrimary || "#1e293b";
    const nowStr = dayjs().format("DD/MM/YYYY HH:mm:ss");

    let tableRowsHtml = summaryItems
        .map(
            (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? "background-color: #f8fafc;" : ""}">
            <td style="padding: 8px 10px; text-align: center;">${item.no}</td>
            <td style="padding: 8px 10px; text-align: left; font-weight: 500;">${item.name}</td>
            <td style="padding: 8px 10px; text-align: right;">${item.quantity}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600;">${item.amount}</td>
        </tr>
    `,
        )
        .join("");

    const htmlContent = `
        <div style="font-family: ${fontFamily}; color: #1e293b; padding: 20px; max-width: 800px; margin: 0 auto; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${colorPrimary}; padding-bottom: 15px; margin-bottom: 20px;">
                <div>
                    <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: ${colorPrimary};">E-Stamp Privilege Usage Summary Report (Customer Auto Credit)</h2>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Customer: <strong>${customer_name} (${customer_code})</strong> | Period: <strong>${dateRange}</strong></p>
                </div>
                <div style="text-align: right; font-size: 11px; color: #64748b;">
                    <div>Print Date: ${nowStr}</div>
                    <div>Issued By: ${unity.sys_user?.name || "System"}</div>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 25px;">
                <thead>
                    <tr style="background-color: ${colorPrimary}; color: #ffffff;">
                        <th style="padding: 10px; text-align: center; width: 8%;">No.</th>
                        <th style="padding: 10px; text-align: left;">Discount / Tariff Item</th>
                        <th style="padding: 10px; text-align: right; width: 20%;">Count (Events)</th>
                        <th style="padding: 10px; text-align: right; width: 25%;">Total Value (THB)</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
                        <td colspan="2" style="padding: 10px; text-align: right;">Grand Total:</td>
                        <td style="padding: 10px; text-align: right; color: #0284c7; font-size: 14px;">${totalQty}</td>
                        <td style="padding: 10px; text-align: right; color: #16a34a; font-size: 14px;">${totalAmount}</td>
                    </tr>
                </tfoot>
            </table>

            <div style="display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; font-size: 12px; color: #475569;">
                <div style="text-align: center; width: 30%;">
                    <div style="border-bottom: 1px dotted #94a3b8; height: 40px; margin-bottom: 8px;"></div>
                    <div>Reported By</div>
                </div>
                <div style="text-align: center; width: 30%;">
                    <div style="border-bottom: 1px dotted #94a3b8; height: 40px; margin-bottom: 8px;"></div>
                    <div>Audited By</div>
                </div>
                <div style="text-align: center; width: 30%;">
                    <div style="border-bottom: 1px dotted #94a3b8; height: 40px; margin-bottom: 8px;"></div>
                    <div>Approved By</div>
                </div>
            </div>
        </div>
    `;

    const printArea = document.getElementById("Summary_Report_Print_Area");
    if (printArea) {
        printArea.innerHTML = htmlContent;
    }

    const modal = document.getElementById("Modal_Summary_Report_A4");
    if (modal) {
        modal.showModal();
    }
}
