import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// Account Transactions Table
const account_transaction_model_table = new table_class.TableModel(
    "#transaction_acc_table",
    "/api/account_record/datatable",
    {
        table: "Account_Record",
        // select: {
        //     style: "single",
        // },
        columns: [
            {
                data: "Account_Record.id",
                // title: `<h3>Management</h3>`,
                title: `<div><button class="btn btn-ghost btn-sm" title="Print All Receipts" onclick="over_all_print_receipt()">
                                <i class="fa-regular fa-file-powerpoint fa-2x text-error"></i>
                            </button>
                            <span>Management</span>
                        </div>`,
                name: "account_id",
                orderable: false,
                render: function (data, type, row) {
                    const acc_id = row.account_id;
                    return `<div class="inline-flex border border-primary rounded-box shadow-sm" role="group">
                                <button class="btn btn-ghost btn-sm" title="Edit Status" onclick="edit_status(${acc_id})" data-id="${acc_id}">
                                    <i class="far fa-edit text-error"></i>
                                </button>
                            </div>`;
                    // return `<div class="inline-flex border border-primary rounded-box shadow-sm" role="group">
                    //             <button class="btn btn-ghost btn-sm" title="Edit Status" onclick="edit_status(${acc_id})" data-id="${acc_id}">
                    //                 <i class="far fa-edit text-error"></i>
                    //             </button>
                    //             <button class="btn btn-ghost btn-sm control-remove-btn" title="Delete" data-id="${acc_id}">
                    //                 <i class="far fa-trash-alt text-error"></i>
                    //             </button>
                    //         </div>`;
                },
            },
            {
                data: "Account_Record.status",
                title: `<h3>Status</h3>`,
                render: function (data, type, row) {
                    data = row.status;
                    return `<div class="badge badge-sm badge-soft badge-${data === "CANCEL" ? "error" : data === "UNPAID" ? "warning" : "success"}">${data}</div>`;
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
                data: "Account_Record.no",
                title: "<span>Receipt.No</span>",
                render: function (data, type, row) {
                    data = row.no;

                    let slip_type = "previewSlipOutImage";
                    switch (row.type) {
                        case "E-PAYMENT":
                            slip_type = "previewSlipAccImage";
                            break;
                        case "CASH(GATE-IN)":
                        case "QR-CODE(GATE-IN)":
                            slip_type = "previewSlipInAccImage";
                            break;
                        default:
                            break;
                    }
                    return `<a role=button onclick="${slip_type}(${row.id})"  class="inline-flex items-center font-medium text-blue-600 dark:text-blue-500 hover:underline">
                                ${data}
                                </a>`;
                },
            },

            {
                data: "Log_Transaction.license",
                title: "license",
                render: function (data, type, row) {
                    data = row.license;
                    return data;
                },
            },
            {
                data: "Transaction_Record.card_id",
                title: `<h3>Card ID</h3>`,
                render: function (data, type, row) {
                    data = row.card_id;
                    return data;
                },
            },
            {
                title: `<h3>Parking Lot</h3>`,
                render: function (data, type, row) {
                    const parking_lot_name = row.parking_lot_name;
                    return parking_lot_name;
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
                data: "Account_Record.type",
                title: `<h3>Pay Type</h3>`,
                render: function (data, type, row) {
                    data = row.type;
                    // return data === "MAE MANEE" ? "Mae Manee" : data;
                    if (data === "E-PAYMENT") {
                        return `<a role="button" target="_blank" class="inline-flex items-center font-medium text-primary hover:underline" href="/payment_service_success_eslip/TRANSACTION_PAY=${row.id}">
                                🅴 PAYMENT
                                <svg aria-hidden="true" class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                                </a>`;
                    }
                    return data;
                },
            },

            {
                data: "Transaction_Record.id",
                title: `<h3>Transaction No.</h3>`,
                name: "transaction_id",

                render: function (data, type, row) {
                    const transaction_id = row.transaction_id;
                    return `<a role="button" onclick="infoTransactionShow(${transaction_id})"  class="inline-flex items-center font-medium text-primary hover:underline">
                                ${String(transaction_id).padStart(8, "0")}
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
                data: "Account_Record.amount",
                title: `<h3>Amount</h3>`,
                render: function (data, type, row) {
                    data = row.amount;
                    const line_through = row.status == "CANCEL" || row.status == "UNPAID" ? "line-through" : "";
                    return `<div class="font-bold ${line_through}">${unity.toCurrency(data)}</div>`;
                },
            },

            {
                data: "Account_Record.fine",
                title: `<h3>Fine</h3>`,
                render: function (data, type, row) {
                    data = row.fine ? row.fine : 0;
                    const line_through = row.status == "CANCEL" || row.status == "UNPAID" ? "line-through" : "";
                    return `<div class="text-error font-bold ${line_through}">${unity.toCurrency(data)}</div>`;
                },
            },
            {
                title: `<h3>Total</h3>`,
                data: null,
                footer: "total",
                render: function (data, type, row) {
                    const amount = row.amount || 0;
                    const fine = row.fine || 0;
                    const discount = row.discount || 0;
                    const total = (amount + fine - discount) / 1.07;
                    const line_through = row.status == "CANCEL" || row.status == "UNPAID" ? "line-through" : "";
                    return `<div class="text-primary font-bold ${line_through}">${unity.toCurrency(total)}</div>`;
                },
            },
            {
                data: null,
                title: `<h3>Value Added Tax</h3>`,
                footer: "vat",
                render: function (data, type, row) {
                    const amount = row.amount;
                    const fine = row.fine || 0;
                    const discount = row.discount || 0;
                    const total = (amount + fine - discount) / 1.07;
                    const vat = unity.toCurrency(amount + fine - discount - total);
                    const line_through = row.status == "CANCEL" || row.status == "UNPAID" ? "line-through" : "";
                    return `<div class="font-bold text-warning  ${line_through}">${unity.toCurrency(vat)}</div>`;
                },
            },

            {
                // data: "Account_Record.amount",
                title: `<h3>Total VAT Include</h3>`,
                footer: "total_vat_include",

                render: function (data, type, row) {
                    const amount = row.amount;
                    const fine = row.fine || 0;
                    const discount = row.discount || 0;
                    const total = unity.toCurrency(amount + fine);
                    const line_through = row.status == "CANCEL" || row.status == "UNPAID" ? "line-through" : "";
                    return `<div class="font-bold text-success ${line_through}">${total}</div>`;
                },
            },
            {
                data: "Account_Record.payment_fee",
                title: `<h3>Payment Fee</h3>`,
                render: function (data, type, row) {
                    data = row.payment_fee;
                    return unity.toCurrency(data);
                },
            },
            {
                data: "Account_Record.pay",
                title: `<h3>Pay</h3>`,
                render: function (data, type, row) {
                    data = row.pay;
                    if (data > 0) {
                        return `<i class="text-green-500 fa fa-money-bill-1-wave"></i> <span class="bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-box dark:bg-green-900 dark:text-green-300">${data}</span>`;
                    }
                    return 0;
                },
            },
            {
                // data: "Account_Record.pay",
                title: `<h3>Change</h3>`,
                render: function (data, type, row) {
                    data = row.pay;
                    if (data > 0) {
                        const chang = data - row.amount - row.fine;
                        return `<i class="text-red-500 fa fa-money-bill-1-wave"></i> <span class="bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-box dark:bg-green-900 dark:text-green-300">${chang}</span>`;
                    }
                    return 0;
                },
            },
            {
                data: "Service_Fees_Code.name",
                title: 'CODE <i class="fa-solid fa-tag"></i>',
                render: function (data, type, row) {
                    data = row.name;
                    if (data) {
                        return `<span class="badge badge-success">#${data}</span>`;
                    }
                    return ``;
                },
            },
            {
                data: "Customer.customer_name",
                title: "Customer / Payer",
                render: function (data, type, row) {
                    data = row.customer_name;
                    if (row.type == "CUSTOMER_AUTO_CREDIT") {
                        return data;
                    } else if (row.type == "MEMBER-CARD AUTO-CREDIT") {
                        return row.member_user_name ? `${row.member_user_name} (Member Card)` : "Cardholder";
                    }
                    return "visitor";
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
            {
                data: "Account_Record.customer_details",
                title: `<h3>Customer Details</h3>`,
                render: function (data, type, row) {
                    data = row.customer_details;
                    if (data != null && data !== "") {
                        try {
                            const _d = typeof data === "object" ? data : JSON.parse(data);
                            if (_d && typeof _d === "object") {
                                let info_html = `<div class="text-xs flex flex-col gap-1">`;
                                if (_d.name) info_html += `<div><span class="text-info">Name:</span> ${_d.name}</div>`;
                                if (_d.tax_id)
                                    info_html += `<div><span class="text-info">Tax ID:</span> ${_d.tax_id}</div>`;
                                if (_d.address)
                                    info_html += `<div><span class="text-info">Address:</span> ${_d.address}</div>`;
                                if (_d.tax_id)
                                    info_html += `<a class="link link-error" role="button" onclick="delete_receipt(${row.id})">Delete Receipt</a>`;
                                info_html += `</div>`;
                                return info_html;
                            }
                        } catch (e) {
                            return `<div class="text-xs text-base-content/80">${data}</div>`;
                        }
                    }
                    return "";
                },
            },
            {
                data: "Account_Record.remark",
                title: "<h3>Remark</h3>",
                render: function (data, type, row) {
                    data = row.remark;

                    return data;
                },
            },
        ],
        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            // unity.logger.info(aData);
            const status = aData.status;
            switch (status) {
                // case "SUCCESS":
                //     nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-success/50"));
                //     break;
                case "UNPAID":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-warning/50"));
                    break;
                case "CANCEL":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-error/50"));
                    break;
                default:
                    break;
            }
        },
        footerCallback: function (row, data, start, end, display) {
            const api = this.api();

            const settings = api.settings()[0];
            if (!settings._cols) {
                console.warn("⚠️ columns config missing (_cols)");
                return; // Prevent error
            }

            const getCol = (footerTitle) => {
                const cols = settings._cols;
                return cols.findIndex((c) => c.footer === footerTitle);
            };

            let sum_amount = 0;
            let sum_fine = 0;

            api.data().each((r) => {
                // console.log(r);
                if (r.status != "CANCEL" && r.status != "UNPAID") {
                    sum_amount += r.amount || 0;
                    sum_fine += r.fine || 0;
                }
            });

            const total = sum_amount + sum_fine;

            $(api.column(getCol("total")).footer()).html(unity.toCurrency(total / 1.07));
            $(api.column(getCol("vat")).footer()).html(unity.toCurrency(total - total / 1.07));
            $(api.column(getCol("total_vat_include")).footer()).html(unity.toCurrency(total));
        },
    },
    {
        add_btn_report_summary: { title: "Summary Report", fn: showAccountSummaryReport },
    },
);
account_transaction_model_table.create_item_control({ modal_from: null, api_endpoint: "/api/account_record" });

// account_transaction_model_table.data_type = "ALL";
window.account_transaction_model_table_set_data_filter = account_transaction_model_table_set_data_filter;
function account_transaction_model_table_set_data_filter(f, v) {
    function safeJsonParse(str) {
        try {
            return JSON.parse(str || "{}");
        } catch {
            return {};
        }
    }

    const table_filter = safeJsonParse(account_transaction_model_table.filter);

    table_filter[f] = v; // Update object value
    account_transaction_model_table.filter = JSON.stringify(table_filter); // Serialize to JSON string

    console.log("🚀 filter", account_transaction_model_table.filter);
    account_transaction_model_table.reload();
}

// Daily Revenue Table
const account_transaction_model_table_by_day = new table_class.TableModel(
    "#account_tab01_table",
    "/api/account_record/datatable",
    {
        table: "Account_Record",
        // select: {
        //     style: "single",
        // },
        columns: [
            //{
            //	data: "Account_Record.id",
            //	title: "Actions",
            //	orderable: false,
            //	render: function (data, type, row) {
            //		return `<div class="inline-flex border border-blue-600 rounded-box shadow-sm" role="group">
            //					<a class="btn btn-ghost btn-sm" onclick="remove_item(${data})"><i class="far fa-trash-alt"></i></a>
            //					<a class="btn btn-ghost btn-sm" onclick="manager_system_user(${data})"> <i class="fas fa-user-edit"></i></a>
            //				</div>`;
            //	},
            //},
            {
                data: "Account_Record.id",
                title: `<h3>Record ID</h3>`,
                name: "Account_Record_id",
                render: function (data, type, row) {
                    data = row.Account_Record_id;
                    return String(data).padStart(6, "0");
                },
            },
            {
                data: "Transaction_Record.id",
                title: `<h3>Transaction ID</h3>`,
                name: "Transaction_Record_id",
                render: function (data, type, row) {
                    data = row.Transaction_Record_id;
                    return `<a role=button onclick="infoTransactionShow(${data})"  class="inline-flex items-center font-medium text-blue-600 dark:text-blue-500 hover:underline">
                                ${String(data).padStart(6, "0")}
                                <svg aria-hidden="true" class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                                </a>`;
                },
            },
            {
                data: "Account_Record.cashier",
                title: `<h3>Cashier</h3>`,
                render: function (data, type, row) {
                    data = row.cashier;
                    if (!data) {
                        return "Cashier#01";
                    } else {
                        return data;
                    }
                },
            },
            {
                data: "Transaction_Record.card_id",
                title: `<h3>Card ID</h3>`,
                render: function (data, type, row) {
                    data = row.card_id;
                    return data;
                },
            },
            {
                data: "Account_Record.no",
                title: `<h3>Receipt No.</h3>`,
                render: function (data, type, row) {
                    data = row.no;
                    return String(data).padStart(6, "0");
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
                data: "Account_Record.date_time",
                title: `<h3>Date Time</h3>`,
                render: function (data, type, row) {
                    data = row.date_time;
                    const _d = unity.dateTimeToStr(data, "YYYY/MM/DD HH:mm:ss");
                    return _d;
                },
            },

            {
                data: "Account_Record.type",
                title: `<h3>Pay Type</h3>`,
                render: function (data, type, row) {
                    data = row.type;
                    return data;
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
                data: "Account_Record.amount",
                title: `<h3>Amount</h3>`,

                render: function (data, type, row) {
                    // console.log(row);
                    data = row.amount;
                    if (data > 0) {
                        return (data / 1.07).toFixed(2);
                    }
                    return 0;
                },
            },

            {
                // data: "Account_Record.amount",
                title: `<h3>Value Added Tax</h3>`,
                render: function (data, type, row) {
                    data = row.amount;
                    if (data > 0) {
                        return (data - data / 1.07).toFixed(2);
                    }
                    return 0;
                },
            },
            {
                // data: "Account_Record.amount",
                title: `<h3>Total VAT Include</h3>`,
                render: function (data, type, row) {
                    data = row.amount;
                    if (data > 0) {
                        return data.toFixed(2);
                    }
                    return 0;
                },
            },
            {
                data: "Account_Record.status",
                title: "Status",
                visible: false,
                render: function (data, type, row) {
                    return row.status;
                },
            },
            {
                data: "Account_Record.fine",
                title: "Fine",
                visible: false,
                render: function (data, type, row) {
                    return row.fine;
                },
            },
        ],
    },
    {
        add_btn_report_summary: { title: "Summary Report", fn: showAccountByDateSummaryReport },
    },
);

account_transaction_model_table_by_day.data_type = "ALL";

// Monthly Revenue Table
const account_transaction_model_table_by_month = new table_class.TableModel(
    "#account_tab02_table",
    "/api/account_record/datatable_by_month",
    {
        table: "Account_Record",
        // select: {
        //     style: "single",
        // },
        columns: [
            {
                data: "acc_date",
                title: `<h3>Date</h3>`,
                orderable: false,
                render: function (data, type) {
                    return data;
                    // return date_range + "-" + String(data).padStart(2, "0");
                },
            },
            {
                data: "acc_quantity",
                title: `<h3>Record Count</h3>`,
                orderable: false,
                render: function (data, type) {
                    return String(data);
                },
            },
            {
                data: "acc_sum_amount",
                title: `<h3>Total</h3>`,
                orderable: false,
                render: function (data, type) {
                    if (data > 0) {
                        data = (data / 1.07).toFixed(2);
                    }
                    return unity.toCurrency(data);
                },
            },

            {
                data: "acc_sum_amount",
                title: `<h3>Value Added Tax</h3>`,
                orderable: false,
                render: function (data, type) {
                    if (data > 0) {
                        data = data - data / 1.07;
                    }
                    return unity.toCurrency(data);
                },
            },
            {
                data: "acc_sum_amount",
                title: `<h3>Total VAT Include</h3>`,
                orderable: false,
                render: function (data, type) {
                    return unity.toCurrency(data);
                },
            },
        ],
    },
    {
        add_btn_report_summary: { title: "Summary Report", fn: showAccountByMonthSummaryReport },
    },
);

window.acc_select_tab02 = acc_select_tab02;
function acc_select_tab02() {
    const select_year_tab02 = document.getElementById("select_year_tab02").value;
    const select_month_tab02 = document.getElementById("select_month_tab02").value;

    if (select_month_tab02 && select_year_tab02) {
        const date_range = `${select_year_tab02}-${select_month_tab02}`;
        unity.logger.debug(date_range);
        account_transaction_model_table_by_month.date_range = date_range;
        account_transaction_model_table_by_month.reload();
    }
}

// Annual Revenue Table
const account_transaction_model_table_by_year = new table_class.TableModel(
    "#account_tab03_table",
    "/api/account_record/datatable_by_year",
    {
        table: "Account_Record",
        // select: {
        //     style: "single",
        // },
        columns: [
            {
                data: "acc_month",
                title: `<h3>Month</h3>`,
                orderable: false,
                render: function (data, type) {
                    if (!data) return "";
                    const monthNum = data.split("-")[1];

                    // Map 01–12 → Jan–Dec
                    const monthMap = {
                        "01": "January",
                        "02": "February",
                        "03": "March",
                        "04": "April",
                        "05": "May",
                        "06": "June",
                        "07": "July",
                        "08": "August",
                        "09": "September",
                        10: "October",
                        11: "November",
                        12: "December",
                    };

                    return monthMap[monthNum] || monthNum;
                },
            },
            {
                data: "acc_quantity",
                title: `<h3>Record Count</h3>`,
                orderable: false,
                render: function (data, type) {
                    return String(data);
                },
            },
            {
                data: "acc_sum_amount",
                title: `<h3>Total</h3>`,
                orderable: false,
                render: function (data, type) {
                    if (data > 0) {
                        data = (data / 1.07).toFixed(2);
                    }

                    return unity.toCurrency(data);
                },
            },

            {
                data: "acc_sum_amount",
                title: `<h3>Value Added Tax</h3>`,
                orderable: false,
                render: function (data, type) {
                    if (data > 0) {
                        data = data - data / 1.07;
                    }
                    return unity.toCurrency(data);
                },
            },
            {
                data: "acc_sum_amount",
                title: `<h3>Total VAT Include</h3>`,
                orderable: false,
                render: function (data, type) {
                    return unity.toCurrency(data);
                },
            },
        ],
    },
    {
        add_btn_report_summary: { title: "Summary Report", fn: showAccountByYearSummaryReport },
    },
);
window.acc_select_tab03 = acc_select_tab03;
function acc_select_tab03() {
    const select_year_tab03 = document.getElementById("select_year_tab03").value;

    if (select_year_tab03) {
        const date_range = `${select_year_tab03}`;
        unity.logger.debug(date_range);
        account_transaction_model_table_by_year.date_range = date_range;
        account_transaction_model_table_by_year.reload();
    }
}

// Member Plate Renewal Accounts Table
// TODO *****************
const transaction_member_acc_model_table = new table_class.TableModel(
    "#transaction_member_acc_table",
    "/api/account_record/member/datatable",
    {
        table: "Account_Member_Record",
        // select: {
        //     style: "single",
        // },
        columns: [
            {
                data: "Account_Member_Record.no",
                title: "Receipt.No",
                render: function (data, type, row) {
                    if (type == "display") console.log(row);
                    data = row.no;
                    return `<a role=button onclick="previewSlipRenewImage(${row.id})"  class="inline-flex items-center font-medium text-blue-600 dark:text-blue-500 hover:underline">
                                ${data}
                                </a>`;
                },
            },
            {
                data: "Account_Member_Record.card_id",
                title: "license",
                render: function (data, type, row) {
                    return row.card_id;
                },
            },
            {
                data: "Account_Member_Record.date_time",
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
                data: "Account_Member_Record.type",
                title: "type",
                render: function (data, type, row) {
                    data = row.type;
                    if (data === "E-PAYMENT" || data === "PAYMENT_SERVICE") {
                        return `<a role="button" target="_blank" class="inline-flex items-center font-medium text-primary hover:underline" href="/payment_service_success_eslip/MEMBER_SERVICE_RENEW=${row.id}">
                                🅴 PAYMENT
                                <svg aria-hidden="true" class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                                </a>`;
                    }
                    return data;
                },
            },
            {
                data: "Account_Member_Record.cashier",
                title: "cashier",
                render: function (data, type, row) {
                    data = row.cashier;
                    return data;
                },
            },
            {
                data: "Account_Member_Record.amount",
                title: "amount",
                render: function (data, type, row) {
                    data = row.amount;
                    return unity.toCurrency(data);
                },
            },
            {
                data: "Account_Member_Record.pos_id",
                title: "pos_id",
                render: function (data, type, row) {
                    data = row.pos_id;
                    return data;
                },
            },
            {
                data: "Account_Member_Record.remark",
                title: "remark",
                render: function (data, type, row) {
                    data = row.remark;
                    return data;
                },
            },
        ],
    },
    {
        add_btn_report_summary: { title: "Summary Report", fn: previewRenewalMemberSummaryReportA4 },
    },
);

window.previewRenewalMemberSummaryReportA4 = previewRenewalMemberSummaryReportA4;
async function previewRenewalMemberSummaryReportA4(customData = null) {
    let renewalData = customData;
    if (!renewalData) {
        if (transaction_member_acc_model_table && transaction_member_acc_model_table.table) {
            renewalData = transaction_member_acc_model_table.table.rows({ search: "applied" }).data().toArray();
        }
    }

    if (!renewalData || renewalData.length === 0) {
        unity.showToastNotification({
            type: "warning",
            msg: "No member renewal transactions found for A4 summary report",
        });
        return;
    }

    const dateRangeInput = document.getElementById("select_date_time_range_transaction_member_acc_table");
    const dateRangeText = dateRangeInput ? dateRangeInput.value || "All" : "All";
    const printDateTime = unity.dateTimeToStr(new Date().toISOString());

    // Calculate Summary Statistics
    let totalTransactions = renewalData.length;
    let totalAmount = 0.0;
    const typeSummary = {};

    renewalData.forEach((row) => {
        const amount = parseFloat(row.amount) || 0;
        const typeKey = row.type || "CASH";

        totalAmount += amount;

        if (!typeSummary[typeKey]) {
            typeSummary[typeKey] = { type: typeKey, count: 0, amount: 0.0 };
        }
        typeSummary[typeKey].count += 1;
        typeSummary[typeKey].amount += amount;
    });

    const sortedTypeSummary = Object.values(typeSummary).sort((a, b) => b.amount - a.amount);

    let tIndex = 1;
    const typeRows = sortedTypeSummary.map((row) => {
        const pct = totalAmount > 0 ? ((row.amount / totalAmount) * 100).toFixed(2) : "0.00";
        return [
            { text: tIndex++, align: "center" },
            { text: row.type, bold: true, align: "left" },
            row.count.toLocaleString(),
            { text: unity.toCurrency(row.amount), bold: true },
            `${pct}%`,
        ];
    });

    let rIndex = 1;
    const detailRows = renewalData.map((row) => {
        const no = row.no || "-";
        const cardId = row.card_id || "-";
        const dateTimeStr = row.date_time ? unity.dateTimeToStr(row.date_time) : "-";
        const typeStr = row.type || "CASH";
        const cashierStr = row.cashier || "System";
        const amt = parseFloat(row.amount) || 0;

        return [
            { text: rIndex++, align: "center" },
            { text: no, bold: true, align: "left" },
            { text: cardId, bold: true, align: "left" },
            { text: dateTimeStr, align: "center" },
            { text: typeStr, align: "center" },
            { text: cashierStr, align: "left" },
            { text: unity.toCurrency(amt), bold: true, align: "right" },
        ];
    });

    unity.renderSummaryReportA4({
        title: "Member Card Renewal Revenue Summary Report",
        dateRange: dateRangeText,
        filterParams: [
            { label: "Total Renewals", value: `${totalTransactions.toLocaleString()} records` },
            { label: "Total Amount Collected", value: `${unity.toCurrency(totalAmount)} THB` },
            { label: "Report Issue Date", value: printDateTime },
        ],
        sections: [
            // 1. Payment Summary by Channel
            {
                title: "Payment Summary by Channel",
                headers: [
                    { label: "No.", align: "center", width: "50px" },
                    { label: "Payment Channel", align: "left" },
                    { label: "Count", align: "right", width: "120px" },
                    { label: "Total Amount (THB)", align: "right", width: "150px" },
                    { label: "Ratio (%)", align: "right", width: "100px" },
                ],
                rows: typeRows,
                footers: [
                    { text: "Grand Total:", colspan: 2, align: "right", bold: true },
                    totalTransactions.toLocaleString(),
                    unity.toCurrency(totalAmount),
                    "100.00%",
                ],
            },
            // 2. Member Card Renewal Transactions Breakdown
            {
                title: "Member Card Renewal Transactions Breakdown (Renewal Card Breakdown)",
                headers: [
                    { label: "#", align: "center", width: "40px" },
                    { label: "Receipt No.", align: "left", width: "110px" },
                    { label: "License Plate / Card ID", align: "left" },
                    { label: "Payment Timestamp", align: "center", width: "130px" },
                    { label: "Type", align: "center", width: "90px" },
                    { label: "Cashier", align: "left", width: "100px" },
                    { label: "Amount (THB)", align: "right", width: "110px" },
                ],
                rows: detailRows,
                footers: [
                    { text: "Total Amount Paid:", colspan: 6, align: "right", bold: true },
                    unity.toCurrency(totalAmount),
                ],
            },
        ],
    });
}

// Member User Renewal Accounts Table
// TODO *****************
const transaction_member_user_acc_model_table = new table_class.TableModel(
    "#transaction_member_user_acc_table",
    "/api/account_record/member_user/datatable",
    {
        table: "Account_Member_User_Record",
        columns: [
            {
                data: "Account_Member_User_Record.no",
                title: "Receipt.No",
                render: function (data, type, row) {
                    if (type == "display") console.log(row);
                    data = row.no;
                    return `<a role=button onclick="previewSlipRenewMemberUserImage(${row.id})"  class="inline-flex items-center font-medium text-blue-600 dark:text-blue-500 hover:underline">
                                ${data}
                                </a>`;
                },
            },
            {
                data: "Account_Member_User_Record.member_user_name",
                title: "Member User Name",
                render: function (data, type, row) {
                    return row.member_user_name;
                },
            },
            {
                data: "Account_Member_User_Record.date_time",
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
                data: "Account_Member_User_Record.type",
                title: "type",
                render: function (data, type, row) {
                    data = row.type;
                    if (data === "E-PAYMENT" || data === "PAYMENT_SERVICE") {
                        return `<a role="button" target="_blank" class="inline-flex items-center font-medium text-primary hover:underline" href="/payment_service_success_eslip/MEMBER_SERVICE_RENEW=${row.id}">
                                🅴 PAYMENT
                                <svg aria-hidden="true" class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                                </a>`;
                    }
                    return data;
                },
            },
            {
                data: "Account_Member_User_Record.cashier",
                title: "cashier",
                render: function (data, type, row) {
                    data = row.cashier;
                    return data;
                },
            },
            {
                data: "Account_Member_User_Record.amount",
                title: "amount",
                render: function (data, type, row) {
                    data = row.amount;
                    return unity.toCurrency(data);
                },
            },
            {
                data: "Account_Member_User_Record.pos_id",
                title: "pos_id",
                render: function (data, type, row) {
                    data = row.pos_id;
                    return data;
                },
            },
            {
                data: "Account_Member_User_Record.remark",
                title: "remark",
                render: function (data, type, row) {
                    data = row.remark;
                    return data;
                },
            },
        ],
        add_btn_report_summary: { title: "Summary Report", fn: previewRenewalMemberUserSummaryReportA4 },
    },
);

window.previewRenewalMemberUserSummaryReportA4 = previewRenewalMemberUserSummaryReportA4;
async function previewRenewalMemberUserSummaryReportA4(customData = null) {
    let renewalData = customData;
    if (!renewalData) {
        if (transaction_member_user_acc_model_table && transaction_member_user_acc_model_table.table) {
            renewalData = transaction_member_user_acc_model_table.table.rows({ search: "applied" }).data().toArray();
        }
    }

    if (!renewalData || renewalData.length === 0) {
        unity.showToastNotification({
            type: "warning",
            msg: "No member renewal transactions found for A4 summary report",
        });
        return;
    }

    const dateRangeInput = document.getElementById("select_date_time_range_transaction_member_user_acc_table");
    const dateRangeText = dateRangeInput ? dateRangeInput.value || "All" : "All";
    const printDateTime = unity.dateTimeToStr(new Date().toISOString());

    // Calculate Summary Statistics
    let totalTransactions = renewalData.length;
    let totalAmount = 0.0;
    const typeSummary = {};

    renewalData.forEach((row) => {
        const amount = parseFloat(row.amount) || 0;
        const typeKey = row.type || "CASH";

        totalAmount += amount;

        if (!typeSummary[typeKey]) {
            typeSummary[typeKey] = { type: typeKey, count: 0, amount: 0.0 };
        }
        typeSummary[typeKey].count += 1;
        typeSummary[typeKey].amount += amount;
    });

    const sortedTypeSummary = Object.values(typeSummary).sort((a, b) => b.amount - a.amount);

    let tIndex = 1;
    const typeRows = sortedTypeSummary.map((row) => {
        const pct = totalAmount > 0 ? ((row.amount / totalAmount) * 100).toFixed(2) : "0.00";
        return [
            { text: tIndex++, align: "center" },
            { text: row.type, bold: true, align: "left" },
            row.count.toLocaleString(),
            { text: unity.toCurrency(row.amount), bold: true },
            `${pct}%`,
        ];
    });

    let rIndex = 1;
    const detailRows = renewalData.map((row) => {
        const no = row.no || "-";
        const memberName = row.member_user_name || "Unassigned";
        const dateTimeStr = row.date_time ? unity.dateTimeToStr(row.date_time) : "-";
        const typeStr = row.type || "CASH";
        const cashierStr = row.cashier || "System";
        const amt = parseFloat(row.amount) || 0;

        return [
            { text: rIndex++, align: "center" },
            { text: no, bold: true, align: "left" },
            { text: memberName, bold: true, align: "left" },
            { text: dateTimeStr, align: "center" },
            { text: typeStr, align: "center" },
            { text: cashierStr, align: "left" },
            { text: unity.toCurrency(amt), bold: true, align: "right" },
        ];
    });

    unity.renderSummaryReportA4({
        title: "Member Renewal Revenue Summary Report",
        dateRange: dateRangeText,
        filterParams: [
            { label: "Total Renewals", value: `${totalTransactions.toLocaleString()} records` },
            { label: "Total Amount Collected", value: `${unity.toCurrency(totalAmount)} THB` },
            { label: "Report Issue Date", value: printDateTime },
        ],
        sections: [
            // 1. Payment Summary by Channel
            {
                title: "Payment Summary by Channel",
                headers: [
                    { label: "No.", align: "center", width: "50px" },
                    { label: "Payment Channel", align: "left" },
                    { label: "Count", align: "right", width: "120px" },
                    { label: "Total Amount (THB)", align: "right", width: "150px" },
                    { label: "Ratio (%)", align: "right", width: "100px" },
                ],
                rows: typeRows,
                footers: [
                    { text: "Grand Total:", colspan: 2, align: "right", bold: true },
                    totalTransactions.toLocaleString(),
                    unity.toCurrency(totalAmount),
                    "100.00%",
                ],
            },
            // 2. Member Renewal Transactions Breakdown
            {
                title: "Member Renewal Transactions Breakdown (Renewal Breakdown)",
                headers: [
                    { label: "#", align: "center", width: "40px" },
                    { label: "Receipt No.", align: "left", width: "110px" },
                    { label: "Member Name", align: "left" },
                    { label: "Payment Timestamp", align: "center", width: "130px" },
                    { label: "Type", align: "center", width: "90px" },
                    { label: "Cashier", align: "left", width: "100px" },
                    { label: "Amount (THB)", align: "right", width: "110px" },
                ],
                rows: detailRows,
                footers: [
                    { text: "Total Amount Paid:", colspan: 6, align: "right", bold: true },
                    unity.toCurrency(totalAmount),
                ],
            },
        ],
    });
}

// ! ------------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("ACCOUNT_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("ACCOUNT_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

function build_select_year_tab() {
    const select_year_tab02 = document.getElementById("select_year_tab02");
    const select_year_tab03 = document.getElementById("select_year_tab03");
    const d = new Date();
    let year = d.getFullYear();
    let mouth = d.getMonth();
    for (let i = 0; i < 10; i++) {
        //const _op = `<option>${i}/option>`;
        //select_year_tab02_option += _op;
        const option = document.createElement("option");
        option.text = year - i;
        option.value = year - i;
        select_year_tab02.add(option);

        const option_1 = document.createElement("option");
        option_1.text = year - i;
        option_1.value = year - i;
        select_year_tab03.add(option_1);
    }
    select_year_tab02.value = year;
    select_year_tab03.value = year;
    document.getElementById("select_month_tab02").value = String(mouth + 1).padStart(2, "0");
}

window.edit_status = edit_status;
async function edit_status(acc_id) {
    const modal = document.getElementById("Modal_Account_Items"); // Fetch element by ID
    const _url = `/api/account_record?acc_id=${acc_id}`;

    try {
        const respond = await unity.fetchApi(_url, "get", null, "json");
        console.log("Invoice Data:", respond);

        if (respond.success) {
            const data = respond.data;
            const infoContainer = modal.querySelector('[data-field="invoice_info"]');

            // Format short date: 23/01/2026 21:08
            const date = new Date(data.date_time).toLocaleString("th-TH", {
                dateStyle: "short",
                timeStyle: "short",
            });

            modal.querySelector('[data-field="status"]').value = data.status;

            // Format status with DaisyUI badge
            let statusClass = "bg-secondary";
            switch (data.status) {
                case "UNPAID":
                    statusClass = "bg-error text-error-content";
                    break;

                case "SUCCESS":
                    statusClass = "bg-success text-success-content";
                    break;
                case "PAID":
                    statusClass = "bg-success text-success-content";
                    break;
                case "CANCEL":
                    statusClass = "bg-warning text-warning-content";
                    break;

                default:
                    break;
            }
            infoContainer.innerHTML = `
                <div class="flex flex-col w-full gap-2 py-2">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-[10px] uppercase font-bold opacity-50 ml-1">Invoice Number/ID:<span class="badge badge-sm badge-primary badge-soft">${data.id}</span></p>
                            <h2 class="text-3xl font-black tracking-tighter text-base-content -mt-1">
                                ${data.no}
                            </h2>
                        </div>
                        <div class="px-4 py-1 rounded-full font-black text-sm shadow-sm ${statusClass}">
                            ${data.status}
                        </div>
                    </div>

                    <div class="bg-base-200 rounded-box p-4 border-2 border-base-300 flex justify-between items-center">
                        <span class="text-lg font-bold">Payment Amount</span>
                        <div class="text-right">
                            <span class="text-5xl font-black text-primary italic">
                                ${(data.amount || 0).toLocaleString()}
                            </span>
                            <span class="text-xl font-bold ml-1">THB</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-[12px] font-medium opacity-70 px-1">
                        <div class="flex flex-col">
                            <span class="text-[10px] opacity-50 uppercase">Payment Type</span>
                            <span class="truncate">${data.type}</span>
                        </div>
                        <div class="flex flex-col text-right">
                            <span class="text-[10px] opacity-50 uppercase">Date / Time</span>
                            <span>${date}</span>
                        </div>
                    </div>
                </div>
            `;

            modal.querySelector('[data-field="brn_save"]').onclick = async () => {
                const status = modal.querySelector('[data-field="status"]').value;
                const _url = `/api/account_record?acc_id=${acc_id}`;
                const respond = await unity.fetchApi(_url, "put", JSON.stringify({ status: status }), "json");
                if (respond.success) {
                    modal.close();
                    unity.delay(500);
                    unity.showToastNotification({ type: "success", msg: "Status updated successfully" });
                    account_transaction_model_table.reload();
                } else {
                    unity.showDialogWarning({ msg: respond.msg });
                }
            };
            modal.showModal();
        } else {
            unity.showToastNotification({ type: "error", msg: "Transaction record not found" });
        }
    } catch (error) {
        console.error("Edit Status Error:", error);
        unity.showToastNotification({ type: "error", msg: "Error fetching transaction data" });
    }
}

window.over_all_print_receipt = over_all_print_receipt;
async function over_all_print_receipt() {
    unity.showDialogLoading();
    await unity.delay(250);
    const allData = account_transaction_model_table.table.rows().data().toArray();
    const allInfo = allData.map((row) => ({
        id: row.id,
        type: row.type,
    }));
    if (allInfo.length > 100) {
        unity.closeDialogLoading();
        unity.showDialogWarning({
            title: "Warning",
            msg: "Cannot batch print more than 100 receipts at a time. Please print per page.",
        });
        return;
    }
    if (allInfo.length > 0) {
        const slip_img_url = [];
        for (const item of allInfo) {
            switch (item.type) {
                case "E-PAYMENT":
                case "CASH(GATE-IN)":
                case "QR-CODE(GATE-IN)":
                    slip_img_url.push(`/api/function/slip_pay_acc?acc_id=${item.id}`);
                    break;
                default:
                    slip_img_url.push(`/api/function/slip_pay?acc_id=${item.id}`);
                    break;
            }
        }
        // console.log("🚀 ~ over_all_print_receipt ~ slip_img_url:", slip_img_url);
        await unity.delay(250);
        printJS({
            printable: slip_img_url,
            type: "image",
            imageStyle: `
            width: 100%; 
            max-height: 98vh;    
            object-fit: contain; 
            margin: 0; 
            display: block; 
            page-break-after: always;
        `,
            style: `
            @media print {
                img { 
                    page-break-after: always; 
                    page-break-inside: avoid; 
                }
                body { margin: 0; }
            }
        `,
        });
    }

    unity.closeDialogLoading();
}

window.transaction_member_acc_model_table_set_data_pay_type = transaction_member_acc_model_table_set_data_pay_type;
async function transaction_member_acc_model_table_set_data_pay_type(pay_type) {
    console.log("🚀 ~ transaction_member_acc_model_table_set_data_pay_type ~ pay_type:", pay_type);
}

window.transaction_member_user_acc_model_table_set_data_pay_type =
    transaction_member_user_acc_model_table_set_data_pay_type;
async function transaction_member_user_acc_model_table_set_data_pay_type(pay_type) {
    console.log("🚀 ~ transaction_member_user_acc_model_table_set_data_pay_type ~ pay_type:", pay_type);
}

window.delete_receipt = delete_receipt;
async function delete_receipt(acc_id) {
    console.log("🚀 ~ delete_receipt ~ acc_id:", acc_id);
    const confirm = await unity.showDialogConfirm({
        title: "Confirm Delete",
        msg: "Are you sure you want to delete this record?",
    });
    console.log("🚀 ~ delete_receipt ~ conform:", confirm);
    if (confirm.confirm) {
        const formData = new FormData();
        formData.append("customer_details", "");

        const respond = await unity.fetchApi(`/api/account_record/no?id=${acc_id}`, "put", formData, "json");
        if (respond.success) {
            unity.showDialogSuccess({ msg: "Customer information updated successfully" });
            unity.delay(250);
            account_transaction_model_table.reload();
        }
    }
}

window.previewAccountByDayReportA4 = async function (customData = null) {
    let data = customData;
    if (!data && account_tab01_model_table?.table) {
        data = account_tab01_model_table.table.rows({ search: "applied" }).data().toArray();
    }
    return showAccountByDateSummaryReport(data);
};

window.previewAccountByMonthReportA4 = async function (customData = null) {
    let data = customData;
    if (!data && account_tab02_model_table?.table) {
        data = account_tab02_model_table.table.rows({ search: "applied" }).data().toArray();
    }
    return showAccountByMonthSummaryReport(data);
};

window.previewAccountByYearReportA4 = async function (customData = null) {
    let data = customData;
    if (!data && account_tab03_model_table?.table) {
        data = account_tab03_model_table.table.rows({ search: "applied" }).data().toArray();
    }
    return showAccountByYearSummaryReport(data);
};

window.showAccountSummaryReport = showAccountSummaryReport;
async function showAccountSummaryReport(allData) {
    if (!allData || allData.length === 0) {
        unity.showToastNotification({ type: "warning", msg: "No table data available for summary report" });
        return;
    }

    const dateRangeInput = document.getElementById("select_date_time_range_account_model_table");
    const dateRangeText = dateRangeInput ? dateRangeInput.value || "All" : "All";

    const filterPayTypeSelect = document.querySelector(
        "select[onchange*=\"account_transaction_model_table_set_data_filter('Account_Record.type'\"]",
    );
    const filterPayTypeText = filterPayTypeSelect
        ? filterPayTypeSelect.options[filterPayTypeSelect.selectedIndex].text
        : "All";

    const filterStatusSelect = document.querySelector(
        "select[onchange*=\"account_transaction_model_table_set_data_filter('Account_Record.status'\"]",
    );
    const filterStatusText = filterStatusSelect
        ? filterStatusSelect.options[filterStatusSelect.selectedIndex].text
        : "All";

    const payTypeSummary = {};
    const serviceFeeSummary = {};
    const statusSummary = {};

    let grandTotalAmount = 0;
    let grandTotalFine = 0;
    let grandTotalPaymentFee = 0;
    let grandTotalSum = 0;
    let grandTotalCount = 0;

    allData.forEach((row) => {
        const payType = row.type || "Unassigned";
        const serviceName = row.name || "General (Visitor)";
        let status = row.status || "Unassigned";

        const amount = parseFloat(row.amount) || 0;
        const fine = parseFloat(row.fine) || 0;
        const paymentFee = parseFloat(row.payment_fee) || 0;

        const isValidPayment = status !== "CANCEL" && status !== "UNPAID";
        const total = isValidPayment ? amount + fine + paymentFee : 0;

        if (!payTypeSummary[payType]) {
            payTypeSummary[payType] = { count: 0, amount: 0, fine: 0, payment_fee: 0, total: 0 };
        }
        payTypeSummary[payType].count += 1;
        if (isValidPayment) {
            payTypeSummary[payType].amount += amount;
            payTypeSummary[payType].fine += fine;
            payTypeSummary[payType].payment_fee += paymentFee;
            payTypeSummary[payType].total += total;
        }

        if (!serviceFeeSummary[serviceName]) {
            serviceFeeSummary[serviceName] = { count: 0, amount: 0, fine: 0, payment_fee: 0, total: 0 };
        }
        serviceFeeSummary[serviceName].count += 1;
        if (isValidPayment) {
            serviceFeeSummary[serviceName].amount += amount;
            serviceFeeSummary[serviceName].fine += fine;
            serviceFeeSummary[serviceName].payment_fee += paymentFee;
            serviceFeeSummary[serviceName].total += total;
        }

        if (!statusSummary[status]) {
            statusSummary[status] = { count: 0, amount: 0, fine: 0, payment_fee: 0, total: 0 };
        }
        statusSummary[status].count += 1;
        statusSummary[status].amount += amount;
        statusSummary[status].fine += fine;
        statusSummary[status].payment_fee += paymentFee;
        statusSummary[status].total += amount + fine + paymentFee;

        if (isValidPayment) {
            grandTotalAmount += amount;
            grandTotalFine += fine;
            grandTotalPaymentFee += paymentFee;
            grandTotalSum += total;
        }
        grandTotalCount += 1;
    });

    const accountBreakdownHeaders = (firstColLabel) => [
        { label: "No.", align: "center", width: "40px" },
        { label: firstColLabel, align: "left" },
        { label: "Count", align: "right", width: "85px" },
        { label: "Tariff (THB)", align: "right", width: "100px" },
        { label: "Fines (THB)", align: "right", width: "95px" },
        { label: "Fee (THB)", align: "right", width: "110px" },
        { label: "Net Total (THB)", align: "right", width: "110px" },
    ];

    let payIndex = 1;
    let totalPayCount = 0;
    const payRows = Object.entries(payTypeSummary).map(([payType, stats]) => {
        totalPayCount += stats.count;
        return [
            { text: payIndex++, align: "center" },
            { text: payType, bold: true, align: "left" },
            stats.count.toLocaleString(),
            unity.toCurrency(stats.amount),
            unity.toCurrency(stats.fine),
            unity.toCurrency(stats.payment_fee),
            { text: unity.toCurrency(stats.total), bold: true },
        ];
    });

    let serviceIndex = 1;
    let totalServiceCount = 0;
    const serviceRows = Object.entries(serviceFeeSummary).map(([serviceName, stats]) => {
        totalServiceCount += stats.count;
        return [
            { text: serviceIndex++, align: "center" },
            { text: serviceName, bold: true, align: "left" },
            stats.count.toLocaleString(),
            unity.toCurrency(stats.amount),
            unity.toCurrency(stats.fine),
            unity.toCurrency(stats.payment_fee),
            { text: unity.toCurrency(stats.total), bold: true },
        ];
    });

    let statusIndex = 1;
    let totalStatusCount = 0;
    let totalStatusSum = 0;
    const statusRows = Object.entries(statusSummary).map(([status, stats]) => {
        totalStatusCount += stats.count;
        totalStatusSum += stats.total;
        return [
            { text: statusIndex++, align: "center" },
            { text: status, bold: true, align: "left" },
            stats.count.toLocaleString(),
            unity.toCurrency(stats.amount),
            unity.toCurrency(stats.fine),
            unity.toCurrency(stats.payment_fee),
            { text: unity.toCurrency(stats.total), bold: true },
        ];
    });

    const vatExcluded = grandTotalSum / 1.07;
    const vatAmount = grandTotalSum - vatExcluded;
    const unpaidCount = statusSummary["UNPAID"]?.count || 0;
    const unpaidTotal = statusSummary["UNPAID"]?.total || 0;
    const cancelCount = statusSummary["CANCEL"]?.count || 0;
    const cancelTotal = statusSummary["CANCEL"]?.total || 0;

    const summaryTotalsBoxHtml = `
        <div class="print-no-break" style="display: flex; justify-content: flex-end; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid;">
            <table style="width: 320px; border-collapse: collapse; font-size: 12px !important; border: 1px solid #cbd5e1;">
                <tbody>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td data-i18n="Total Tariff:" style="padding: 2px 5px; color: #4b5563;">Total Tariff:</td>
                        <td style="padding: 2px 5px; text-align: right; font-weight: bold;">${unity.toCurrency(grandTotalAmount)} THB</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td data-i18n="Total Fines:" style="padding: 2px 5px; color: #4b5563;">Total Fines:</td>
                        <td style="padding: 2px 5px; text-align: right; font-weight: bold; color: #dc2626;">${unity.toCurrency(grandTotalFine)} THB</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td data-i18n="Total Fee:" style="padding: 2px 5px; color: #4b5563;">Total Fee:</td>
                        <td style="padding: 2px 5px; text-align: right; font-weight: bold;">${unity.toCurrency(grandTotalPaymentFee)} THB</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td style="padding: 2px 5px; color: #4b5563;"><span data-i18n="Unpaid Total">Unpaid Total</span> (UNPAID):</td>
                        <td style="padding: 2px 5px; text-align: right; font-weight: bold; color: gray;">${unity.toCurrency(unpaidTotal)} THB (${unpaidCount.toLocaleString()} records)</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td style="padding: 2px 5px; color: #4b5563;"><span data-i18n="Cancelled Total">Cancelled Total</span> (CANCELLED):</td>
                        <td style="padding: 2px 5px; text-align: right; font-weight: bold; color: gray;">${unity.toCurrency(cancelTotal)} THB (${cancelCount.toLocaleString()} records)</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td data-i18n="Subtotal (VAT Excl.):" style="padding: 2px 5px; color: #4b5563;">Subtotal (VAT Excl.):</td>
                        <td style="padding: 2px 5px; text-align: right;">${unity.toCurrency(vatExcluded)} THB</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td data-i18n="VAT 7%:" style="padding: 2px 5px; color: #4b5563;">VAT 7%:</td>
                        <td style="padding: 2px 5px; text-align: right;">${unity.toCurrency(vatAmount)} THB</td>
                    </tr>
                    <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 1px solid #cbd5e1; height: 22px;">
                        <td data-i18n="Total Net (VAT Incl.):" style="padding: 2px 5px; font-size: 13px !important; color: #1e3a8a;">Total Net (VAT Incl.):</td>
                        <td style="padding: 2px 5px; text-align: right; font-size: 13px !important; color: #1e3a8a;">${unity.toCurrency(grandTotalSum)} THB</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    unity.renderSummaryReportA4({
        title: "Parking Revenue & Income Summary Report",
        dateRange: dateRangeText,
        filterParams: [
            { label: "Selected Payment Method", value: filterPayTypeText },
            { label: "Selected Status", value: filterStatusText },
        ],
        sections: [
            {
                title: "Revenue Summary by Payment Method",
                headers: accountBreakdownHeaders("Payment Channel"),
                rows: payRows,
                footers: [
                    { text: "Grand Total:", colspan: 2, align: "right", bold: true },
                    totalPayCount.toLocaleString(),
                    unity.toCurrency(grandTotalAmount),
                    unity.toCurrency(grandTotalFine),
                    unity.toCurrency(grandTotalPaymentFee),
                    unity.toCurrency(grandTotalSum),
                ],
            },
            {
                title: "Revenue Summary by Service Profile",
                headers: accountBreakdownHeaders("Service Profile"),
                rows: serviceRows,
                footers: [
                    { text: "Grand Total:", colspan: 2, align: "right", bold: true },
                    totalServiceCount.toLocaleString(),
                    unity.toCurrency(grandTotalAmount),
                    unity.toCurrency(grandTotalFine),
                    unity.toCurrency(grandTotalPaymentFee),
                    unity.toCurrency(grandTotalSum),
                ],
            },
            {
                title: "Revenue Summary by Transaction Status",
                headers: [
                    { label: "No.", align: "center", width: "40px" },
                    { label: "Transaction Status", align: "left" },
                    { label: "Count", align: "right", width: "85px" },
                    { label: "Tariff (THB)", align: "right", width: "100px" },
                    { label: "Fines (THB)", align: "right", width: "95px" },
                    { label: "Fee (THB)", align: "right", width: "110px" },
                    { label: "Total Amount (THB)", align: "right", width: "110px" },
                ],
                rows: statusRows,
                footers: [
                    { text: "Total All Transactions:", colspan: 2, align: "right", bold: true },
                    grandTotalCount.toLocaleString(),
                    unity.toCurrency(totalStatusSum),
                ],
            },
            {
                type: "custom",
                html: summaryTotalsBoxHtml,
            },
        ],
    });
}

window.showAccountByDateSummaryReport = showAccountByDateSummaryReport;
async function showAccountByDateSummaryReport(allData) {
    if (!allData || allData.length === 0) {
        unity.showToastNotification({ type: "warning", msg: "No table data available for summary report" });
        return;
    }

    const dateRangeInput = document.getElementById("select_date_time_range_account_by_day_model_table");
    const dateRangeText = dateRangeInput ? dateRangeInput.value || "All" : "All";

    const payTypeSummary = {};
    let grandTotalAmount = 0;
    let grandTotalFine = 0;
    let grandTotalSum = 0;
    let grandTotalCount = 0;

    allData.forEach((row) => {
        let status = row.status || "SUCCESS";
        const amount = parseFloat(row.amount) || 0;
        const fine = parseFloat(row.fine) || 0;
        const isValidPayment = status !== "CANCEL" && status !== "UNPAID";
        const total = isValidPayment ? amount + fine : 0;

        if (isValidPayment) {
            const payType = row.type || "Unassigned";

            if (!payTypeSummary[payType]) {
                payTypeSummary[payType] = { count: 0, amount: 0, fine: 0, total: 0 };
            }
            payTypeSummary[payType].count += 1;
            payTypeSummary[payType].amount += amount;
            payTypeSummary[payType].fine += fine;
            payTypeSummary[payType].total += total;

            grandTotalAmount += amount;
            grandTotalFine += fine;
            grandTotalSum += total;
            grandTotalCount += 1;
        }
    });

    const payEntries = Object.entries(payTypeSummary).sort((a, b) => b[1].total - a[1].total);

    let payIndex = 1;
    const payRows = payEntries.map(([payType, stats]) => [
        { text: payIndex++, align: "center" },
        { text: payType, bold: true, align: "left" },
        stats.count.toLocaleString(),
        unity.toCurrency(stats.amount),
        unity.toCurrency(stats.fine),
        { text: unity.toCurrency(stats.total), bold: true },
    ]);

    let rowIndex = 1;
    const detailRows = allData.map((row) => {
        const no = row.no || "-";
        const customer = row.name || "-";
        const cardId = row.license_id || row.card_id || "-";
        const dateTimeStr = row.date_time ? unity.dateTimeToStr(row.date_time) : "-";
        const typeStr = row.type || "-";
        const amount = parseFloat(row.amount) || 0;
        const fine = parseFloat(row.fine) || 0;
        const total = amount + fine;

        return [
            { text: rowIndex++, align: "center" },
            { text: no, bold: true, align: "left" },
            { text: customer, align: "left" },
            { text: cardId, align: "left" },
            { text: dateTimeStr, align: "center" },
            { text: typeStr, align: "center" },
            unity.toCurrency(amount),
            unity.toCurrency(fine),
            { text: unity.toCurrency(total), bold: true },
        ];
    });

    const vatExcluded = grandTotalSum / 1.07;
    const vatAmount = grandTotalSum - vatExcluded;

    const summaryBoxHtml = `
        <div class="print-no-break" style="display: flex; justify-content: flex-end; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid;">
            <table style="width: 280px; border-collapse: collapse; font-size: 12px !important; border: 1px solid #cbd5e1;">
                <tbody>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td data-i18n="Total Tariff:" style="padding: 2px 5px; color: #4b5563;">Total Tariff:</td>
                        <td style="padding: 2px 5px; text-align: right; font-weight: bold;">${unity.toCurrency(grandTotalAmount)} THB</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td data-i18n="Total Fines:" style="padding: 2px 5px; color: #4b5563;">Total Fines:</td>
                        <td style="padding: 2px 5px; text-align: right; font-weight: bold; color: #dc2626;">${unity.toCurrency(grandTotalFine)} THB</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td data-i18n="Subtotal (VAT Excl.):" style="padding: 2px 5px; color: #4b5563;">Subtotal (VAT Excl.):</td>
                        <td style="padding: 2px 5px; text-align: right;">${unity.toCurrency(vatExcluded)} THB</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td data-i18n="VAT 7%:" style="padding: 2px 5px; color: #4b5563;">VAT 7%:</td>
                        <td style="padding: 2px 5px; text-align: right;">${unity.toCurrency(vatAmount)} THB</td>
                    </tr>
                    <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 1px solid #cbd5e1; height: 22px;">
                        <td data-i18n="Total Net (VAT Incl.):" style="padding: 2px 5px; font-size: 13px !important; color: #1e3a8a;">Total Net (VAT Incl.):</td>
                        <td style="padding: 2px 5px; text-align: right; font-size: 13px !important; color: #1e3a8a;">${unity.toCurrency(grandTotalSum)} THB</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    unity.renderSummaryReportA4({
        title: "Daily Revenue Summary Report",
        dateRange: dateRangeText,
        sections: [
            {
                title: "Revenue Summary by Payment Method",
                headers: [
                    { label: "No.", align: "center", width: "50px" },
                    { label: "Payment Channel", align: "left" },
                    { label: "Count", align: "right", width: "100px" },
                    { label: "Tariff (THB)", align: "right", width: "120px" },
                    { label: "Fines (THB)", align: "right", width: "120px" },
                    { label: "Net Total (THB)", align: "right", width: "130px" },
                ],
                rows: payRows,
                footers: [
                    { text: "Grand Total:", colspan: 2, align: "right", bold: true },
                    grandTotalCount.toLocaleString(),
                    unity.toCurrency(grandTotalAmount),
                    unity.toCurrency(grandTotalFine),
                    unity.toCurrency(grandTotalSum),
                ],
            },
            {
                title: "Detailed Daily Revenue Transactions Breakdown",
                headers: [
                    { label: "No.", align: "center", width: "40px" },
                    { label: "Receipt No.", align: "left", width: "100px" },
                    { label: "Customer / License", align: "left" },
                    { label: "Card ID", align: "left", width: "90px" },
                    { label: "Date Time", align: "center", width: "130px" },
                    { label: "Type", align: "center", width: "70px" },
                    { label: "Tariff", align: "right", width: "85px" },
                    { label: "Fine", align: "right", width: "85px" },
                    { label: "Total (THB)", align: "right", width: "95px" },
                ],
                rows: detailRows,
                footers: [
                    { text: "Total Amount Paid:", colspan: 8, align: "right", bold: true },
                    unity.toCurrency(grandTotalSum),
                ],
            },
            {
                type: "custom",
                html: summaryBoxHtml,
            },
        ],
    });
}

window.showAccountByMonthSummaryReport = showAccountByMonthSummaryReport;
async function showAccountByMonthSummaryReport(allData) {
    if (!allData || allData.length === 0) {
        unity.showToastNotification({ type: "warning", msg: "No table data available for summary report" });
        return;
    }

    let dateRangeText = "";
    const yearSelect = document.getElementById("select_year_tab02");
    const monthSelect = document.getElementById("select_month_tab02");
    if (yearSelect && monthSelect && yearSelect.value && monthSelect.value) {
        dateRangeText = `${yearSelect.value}-${monthSelect.value}`;
    } else {
        dateRangeText = account_transaction_model_table_by_month.date_range || "";
    }

    if (!dateRangeText && allData && allData.length > 0 && allData[0].acc_date) {
        const parts = allData[0].acc_date.split("-");
        if (parts.length >= 2) {
            dateRangeText = `${parts[0]}-${parts[1]}`;
        }
    }

    let monthYearDisplay = dateRangeText || "All";
    try {
        const parts = dateRangeText.split("-");
        if (parts.length === 2) {
            const yearNum = parts[0];
            const monthNum = parts[1];
            const monthMap = {
                "01": "January",
                "02": "February",
                "03": "March",
                "04": "April",
                "05": "May",
                "06": "June",
                "07": "July",
                "08": "August",
                "09": "September",
                10: "October",
                11: "November",
                12: "December",
            };
            monthYearDisplay = `${unity.i18next_translate(monthMap[monthNum] || monthNum)} ${parseInt(yearNum) + 543}`;
        }
    } catch (e) {
        console.error(e);
    }

    const sortedData = [...allData].sort((a, b) => a.acc_date.localeCompare(b.acc_date));

    let grandTotalCount = 0;
    let grandTotalSum = 0;
    let grandTotalAmount = 0;

    let rowIndex = 1;
    const rows = sortedData.map((row) => {
        const count = parseInt(row.acc_quantity) || 0;
        const total = parseFloat(row.acc_sum_amount) || 0;
        const serviceFee = total;
        const fine = 0;

        grandTotalCount += count;
        grandTotalSum += total;
        grandTotalAmount += total;

        return [
            { text: rowIndex++, align: "center" },
            { text: row.acc_date, align: "center", bold: true },
            count.toLocaleString(),
            unity.toCurrency(serviceFee),
            unity.toCurrency(fine),
            { text: unity.toCurrency(total), bold: true },
        ];
    });

    const vatExcluded = grandTotalSum / 1.07;
    const vatAmount = grandTotalSum - vatExcluded;

    const summaryBoxHtml = `
        <div class="print-no-break" style="display: flex; justify-content: flex-end; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid;">
            <table style="width: 100%; max-width: 600px; border-collapse: collapse; font-size: 12px !important; border: 1px solid #cbd5e1;">
                <tbody>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td style="padding: 2px 5px; color: #4b5563; width: 25%;">Total Tariff:</td>
                        <td style="padding: 2px 5px; text-align: right; font-weight: bold; width: 25%; border-right: 1px solid #cbd5e1;">${unity.toCurrency(grandTotalAmount)} THB</td>
                        <td style="padding: 2px 5px; color: #4b5563; width: 25%;">Total Fines:</td>
                        <td style="padding: 2px 5px; text-align: right; font-weight: bold; color: #dc2626; width: 25%;">${unity.toCurrency(0)} THB</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td style="padding: 2px 5px; color: #4b5563;">Subtotal (VAT Excl.):</td>
                        <td style="padding: 2px 5px; text-align: right; border-right: 1px solid #cbd5e1;">${unity.toCurrency(vatExcluded)} THB</td>
                        <td style="padding: 2px 5px; color: #4b5563;">VAT 7%:</td>
                        <td style="padding: 2px 5px; text-align: right;">${unity.toCurrency(vatAmount)} THB</td>
                    </tr>
                    <tr style="background-color: #f1f5f9; font-weight: bold; height: 22px;">
                        <td colspan="2" style="padding: 2px 5px; font-size: 13px !important; color: #1e3a8a; text-align: right; border-right: 1px solid #cbd5e1;">Total Net (VAT Incl.):</td>
                        <td colspan="2" style="padding: 2px 5px; text-align: right; font-size: 13px !important; color: #1e3a8a;">${unity.toCurrency(grandTotalSum)} THB</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    unity.renderSummaryReportA4({
        title: "Monthly Revenue Summary Report",
        dateRange: monthYearDisplay,
        sections: [
            {
                title: "Daily Revenue Summary of the Month",
                headers: [
                    { label: "No.", align: "center", width: "50px" },
                    { label: "Date", align: "center", width: "100px" },
                    { label: "Count", align: "right", width: "100px" },
                    { label: "Tariff (THB)", align: "right", width: "120px" },
                    { label: "Fines (THB)", align: "right", width: "120px" },
                    { label: "Net Total (THB)", align: "right", width: "130px" },
                ],
                rows: rows,
                footers: [
                    { text: "Grand Total:", colspan: 2, align: "right", bold: true },
                    grandTotalCount.toLocaleString(),
                    unity.toCurrency(grandTotalAmount),
                    unity.toCurrency(0),
                    unity.toCurrency(grandTotalSum),
                ],
            },
            {
                type: "custom",
                html: summaryBoxHtml,
            },
        ],
    });
}

window.showAccountByYearSummaryReport = showAccountByYearSummaryReport;
async function showAccountByYearSummaryReport(allData) {
    if (!allData || allData.length === 0) {
        unity.showToastNotification({ type: "warning", msg: "No table data available for summary report" });
        return;
    }

    let yearText = "";
    const yearSelect = document.getElementById("select_year_tab03");
    if (yearSelect && yearSelect.value) {
        yearText = yearSelect.value;
    } else {
        yearText = account_transaction_model_table_by_year.date_range || "";
    }

    if (!yearText && allData && allData.length > 0 && allData[0].acc_month) {
        const parts = allData[0].acc_month.split("-");
        if (parts.length >= 1) {
            yearText = parts[0];
        }
    }

    let yearDisplay = yearText || "All";

    const sortedData = [...allData].sort((a, b) => a.acc_month.localeCompare(b.acc_month));

    let grandTotalCount = 0;
    let grandTotalSum = 0;
    let grandTotalAmount = 0;

    function getThaiMonthName(dateStr) {
        try {
            const parts = dateStr.split("-");
            if (parts.length >= 2) {
                const monthNum = parts[1];
                const monthMap = {
                    "01": "January",
                    "02": "February",
                    "03": "March",
                    "04": "April",
                    "05": "May",
                    "06": "June",
                    "07": "July",
                    "08": "August",
                    "09": "September",
                    10: "October",
                    11: "November",
                    12: "December",
                };
                return monthMap[monthNum] || dateStr;
            }
        } catch (e) {
            console.error(e);
        }
        return dateStr;
    }

    let rowIndex = 1;
    const rows = sortedData.map((row) => {
        const count = parseInt(row.acc_quantity) || 0;
        const total = parseFloat(row.acc_sum_amount) || 0;
        const monthName = getThaiMonthName(row.acc_month);

        grandTotalCount += count;
        grandTotalSum += total;
        grandTotalAmount += total;

        return [
            { text: rowIndex++, align: "center" },
            { text: monthName, align: "center", bold: true },
            count.toLocaleString(),
            unity.toCurrency(total),
            unity.toCurrency(0),
            { text: unity.toCurrency(total), bold: true },
        ];
    });

    const vatExcluded = grandTotalSum / 1.07;
    const vatAmount = grandTotalSum - vatExcluded;

    const summaryBoxHtml = `
        <div class="print-no-break" style="display: flex; justify-content: flex-end; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid;">
            <table style="width: 280px; border-collapse: collapse; font-size: 12px !important; border: 1px solid #cbd5e1;">
                <tbody>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td style="padding: 2px 5px; color: #4b5563;">Total Tariff:</td>
                        <td style="padding: 2px 5px; text-align: right; font-weight: bold;">${unity.toCurrency(grandTotalAmount)} THB</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td style="padding: 2px 5px; color: #4b5563;">Total Fines:</td>
                        <td style="padding: 2px 5px; text-align: right; font-weight: bold; color: #dc2626;">${unity.toCurrency(0)} THB</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td style="padding: 2px 5px; color: #4b5563;">Subtotal (VAT Excl.):</td>
                        <td style="padding: 2px 5px; text-align: right;">${unity.toCurrency(vatExcluded)} THB</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #cbd5e1; height: 20px;">
                        <td style="padding: 2px 5px; color: #4b5563;">VAT 7%:</td>
                        <td style="padding: 2px 5px; text-align: right;">${unity.toCurrency(vatAmount)} THB</td>
                    </tr>
                    <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 1px solid #cbd5e1; height: 22px;">
                        <td style="padding: 2px 5px; font-size: 13px !important; color: #1e3a8a;">Total Net (VAT Incl.):</td>
                        <td style="padding: 2px 5px; text-align: right; font-size: 13px !important; color: #1e3a8a;">${unity.toCurrency(grandTotalSum)} THB</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    unity.renderSummaryReportA4({
        title: "Annual Revenue Summary Report",
        dateRange: yearDisplay,
        sections: [
            {
                title: "Monthly Revenue Summary of the Year",
                headers: [
                    { label: "No.", align: "center", width: "50px" },
                    { label: "Month", align: "center", width: "120px" },
                    { label: "Count", align: "right", width: "100px" },
                    { label: "Tariff (THB)", align: "right", width: "120px" },
                    { label: "Fines (THB)", align: "right", width: "120px" },
                    { label: "Net Total (THB)", align: "right", width: "130px" },
                ],
                rows: rows,
                footers: [
                    { text: "Grand Total:", colspan: 2, align: "right", bold: true },
                    grandTotalCount.toLocaleString(),
                    unity.toCurrency(grandTotalAmount),
                    unity.toCurrency(0),
                    unity.toCurrency(grandTotalSum),
                ],
            },
            {
                type: "custom",
                html: summaryBoxHtml,
            },
        ],
    });
}

async function Init() {
    account_transaction_model_table.filter = JSON.stringify({
        "Account_Record.type": "ALL_NOT_CUSTOMER_AUTO_CREDIT",
        "Account_Record.status": "ALL",
    });
    build_select_year_tab();

    table_class.init_table_model_with_datatime_picker(
        account_transaction_model_table,
        "#select_date_time_range_account_model_table",
    );

    table_class.init_table_model_with_datatime_picker(
        account_transaction_model_table_by_day,
        "#select_date_time_range_account_by_day_model_table",
        {
            // format: "YYYY/MM/DD",
            dateFormat: "Y/m/d",
            defaultDate: new Date(),
        },
    );

    acc_select_tab02();
    account_transaction_model_table_by_month.init();

    acc_select_tab03();
    account_transaction_model_table_by_year.init();

    table_class.init_table_model_with_datatime_picker(
        transaction_member_acc_model_table,
        "#select_date_time_range_transaction_member_acc_table",
    );

    table_class.init_table_model_with_datatime_picker(
        transaction_member_user_acc_model_table,
        "#select_date_time_range_transaction_member_user_acc_table",
    );

    if (localStorage.getItem("ACCOUNT_TAB_ACTIVE")) {
        const v = localStorage.getItem("ACCOUNT_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    } else {
        document.getElementById("ACCOUNT_TAB00").checked = true;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
