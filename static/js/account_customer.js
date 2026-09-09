import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

let lockTimer = null;
// Customer Account Transactions Table
const account_transaction_model_table = new table_class.TableModel(
    "#customer_account_auto_credit_table",
    "/api/account_record/datatable",
    {
        table: "Account_Record",
        dom: '<"top"Bif>rt<"bottom"pl><"clear">',
        // select: {
        //     style: "single",
        // },
        columns: [
            {
                data: "Account_Record.no",
                title: `<span data-i18n="Receipt.No">Receipt.No</span>`,
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
                    return `<a role="button" onclick="${slip_type}(${row.id})" class="inline-flex items-center font-bold text-primary hover:underline">
                                ${String(data).padStart(8, "0")}
                            </a>`;
                },
            },
            {
                data: "Customer.customer_name",
                title: `<span data-i18n="Customer">Customer</span>`,
                render: function (data, type, row) {
                    return row.customer_name || "-";
                },
            },
            {
                data: "Transaction_Record.card_id",
                title: `<span data-i18n="Card ID">Card ID</span>`,
                render: function (data, type, row) {
                    return row.card_id || "-";
                },
            },
            {
                data: "Log_Transaction.license",
                title: `<span data-i18n="License">License</span>`,
                render: function (data, type, row) {
                    return row.license || "-";
                },
            },
            {
                data: "Account_Record.date_time",
                title: `<span data-i18n="Date Time">Date Time</span>`,
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
                title: `<span data-i18n="Transaction No.">Transaction No.</span>`,
                render: function (data, type, row) {
                    data = row.id_1;
                    return `<a role="button" onclick="infoTransactionShow(${data})" class="inline-flex items-center font-bold text-primary hover:underline">
                                ${String(data).padStart(8, "0")}
                                <svg aria-hidden="true" class="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                            </a>`;
                },
            },
            {
                data: "Service_Fees.name",
                title: `<span data-i18n="Service Fees">Service Fees</span>`,
                render: function (data, type, row) {
                    return row.name || "-";
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
                title: `<span data-i18n="Amount">Amount</span>`,
                className: "text-right",
                render: function (data, type, row) {
                    return unity.toCurrency(row.amount);
                },
            },

            {
                data: "Account_Record.cashier",
                title: `<span data-i18n="Cashier">Cashier</span>`,
                render: function (data, type, row) {
                    return row.cashier || "-";
                },
            },
            {
                data: "System_Users.username",
                title: `<span data-i18n="Operator">Operator</span>`,
                render: function (data, type, row) {
                    return row.username || "-";
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
                    return `<i class="fa-solid fa-user-tag text-base-content/40"></i><span class="text-base-content/40"> Not-Tag</span>`;
                },
            },
        ],
    },
    {
        callback: async function (type, row) {
            console.log("🚀 ", type);
            if (type == "reload") {
                clearTimeout(lockTimer);
                lockTimer = setTimeout(() => {
                    const custVal = document.getElementById("customer_select_main")?.value;
                    const custId = parseInt(custVal, 10);
                    if (custId >= 0) {
                        account_auto_credit_summary_inv(
                            custId,
                            document.getElementById("select_date_time_range_of_build_customer_account_auto_credit_table")?.value,
                        );
                    } else {
                        if (table_of_customer_account_auto_credit_inv) {
                            table_of_customer_account_auto_credit_inv.clear().draw();
                        }
                    }
                }, 250);
            }
        },
    },
);

// Customer Invoices Table
const invoice_customer_model_table = new table_class.TableModel(
    "#invoice_customer_table",
    "/api/account_record/invoice_customer_record/datatable",
    {
        table: "Account_Record",
        dom: '<"top"Bf>rt<"bottom"pl><"clear">',
        // select: {
        //     style: "single",
        // },
        order: [[0, "desc"]],
        columns: [
            {
                data: "Account_Receivable.id",
                title: `<span data-i18n="No.">No.</span>`,
                render: (data, type, row) => row.id,
            },
            {
                data: "Account_Receivable.invoice_no",
                title: `<span data-i18n="Invoice No.">Invoice No.</span>`,
                render: (data, type, row) => {
                    const btn_edit =
                        row.status == "PAID"
                            ? ""
                            : `<button class="btn btn-ghost btn-xs text-primary" onclick="edit_invoice_customer_record(${row.id})" title="Edit"><i class="fa-regular fa-pen-to-square"></i></button>`;
                    return `
                        <div class="inline-flex items-center gap-1.5">
                            <a role="button" onclick="previewInvoice(${row.id})" class="font-bold text-primary hover:underline">
                                ${row.invoice_no}
                            </a>
                            ${btn_edit}
                        </div>`;
                },
            },
            {
                data: "Account_Receivable.status",
                title: `<span data-i18n="Status">Status</span>`,
                className: "text-center",
                render: (data, type, row) => {
                    const status = row.status;
                    const badge =
                        {
                            UNPAID: "badge-error",
                            PARTIAL: "badge-warning",
                            PAID: "badge-success",
                            OVERDUE: "badge-neutral",
                            CANCEL: "badge-secondary",
                        }[status] || "badge-ghost";
                    return `<span class="badge ${badge} badge-sm font-semibold">${status}</span>`;
                },
            },
            {
                data: "Account_Receivable.invoice_type",
                title: `<div class="flex flex-col items-center gap-1">
                                <div class="text-error font-semibold text-xs" data-i18n="Invoice Type">Invoice Type</div>
                                <select class="table-select-column min-w-24" >
                                        <option value="">All</option>    
                                        <option>GENERAL</option>
                                        <option>RENEW</option>
                                        <option>DEBT</option>
                                </select>
                            </div>`,
                render: (data, type, row) => {
                    if (!row.invoice_type) row.invoice_type = "GENERAL";
                    let tag_type = "secondary";
                    switch (row.invoice_type) {
                        case "GENERAL":
                            tag_type = "primary";
                            break;
                        default:
                            break;
                    }
                    return `<div class="badge badge-${tag_type} badge-sm badge-soft">${row.invoice_type}</div>`;
                },
            },
            {
                data: "Account_Receivable.invoice_date",
                title: `<span data-i18n="Invoice Date">Invoice Date</span>`,
                name: "invoice_date",
                render: (data, type, row) => {
                    return unity.dateTimeToStr(row.invoice_date, "DD/MM/YYYY<br>HH:mm");
                },
            },
            {
                data: "Account_Receivable.due_date",
                title: `<span data-i18n="Due Date">Due Date</span>`,
                render: (data, type, row) => (row.due_date ? unity.dateTimeToStr(row.due_date, "DD/MM/YYYY") : "-"),
            },
            {
                data: "Customer.customer_name",
                title: `<span data-i18n="Customer">Customer</span>`,
                render: (data, type, row) => row.customer_name || "-",
            },
            {
                data: "Account_Receivable.amount",
                title: `<span data-i18n="Total Amount">Total Amount (THB)</span>`,
                className: "text-right",
                footer: "total_amount",
                render: (data, type, row) => unity.toCurrency(row.amount),
            },
            {
                data: "Account_Receivable.amount_paid",
                title: `<span data-i18n="Paid Amount">Paid Amount</span>`,
                className: "text-right",
                footer: "total_paid",
                render: (data, type, row) => unity.toCurrency(row.amount_paid),
            },
            {
                title: `<span data-i18n="Remaining Balance">Remaining Balance</span>`,
                className: "text-right",
                footer: "total_balance",
                render: (data, type, row) => unity.toCurrency(row.amount - row.amount_paid),
            },

            {
                title: `<span data-i18n="Days Remaining">Days Remaining</span>`,
                className: "text-center",
                orderable: false,
                render: (data, type, row) => {
                    if (row.days_remaining >= 0) {
                        return `<span class="badge badge-info badge-soft badge-sm">${row.days_remaining} d</span>`;
                    }
                    return `<span class="badge badge-error badge-soft badge-sm">Overdue</span>`;
                },
            },
            {
                data: "Account_Receivable.invoice_data",
                title: `<span data-i18n="Items">Items</span>`,
                render: (data, type, row) => {
                    try {
                        const invoice_data = JSON.parse(row.invoice_data || "{}");
                        if (!invoice_data) return '<span class="text-base-content/30 italic">-</span>';
                        const text = invoice_data.header || "No records";
                        const safe = unity.escapeHtml(text);
                        return `
                            <div class="tooltip tooltip-bottom max-w-55 text-left" data-tip="${safe}">
                                <span class="block truncate max-w-50 text-base-content/80">
                                    ${safe}
                                </span>
                            </div>`;
                    } catch (error) {
                        return '<span class="text-error italic">data format error</span>';
                    }
                },
            },

            {
                data: "Account_Receivable.remark",
                title: `<span data-i18n="Remarks">Remarks</span>`,
                render: (data, type, row) => {
                    const remark = row.remark;
                    if (!remark) return '<span class="text-base-content/30 italic">-</span>';
                    const safe = unity.escapeHtml(remark);
                    return `
                        <div class="tooltip tooltip-bottom max-w-55 text-left" data-tip="${safe}">
                            <span class="block truncate max-w-50 text-base-content/80">
                                ${safe}
                            </span>
                        </div>`;
                },
            },
        ],
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

            let total_amount = 0;
            let total_paid = 0;
            let total_balance = 0;

            api.data().each((r) => {
                console.log(r);
                total_amount += r.amount || 0;
                total_paid += r.amount_paid || 0;
            });

            $(api.column(getCol("total_amount")).footer()).html(unity.toCurrency(total_amount));
            $(api.column(getCol("total_paid")).footer()).html(unity.toCurrency(total_paid));
            $(api.column(getCol("total_balance")).footer()).html(unity.toCurrency(total_amount - total_paid));
        },
    },
);

// Expose table instances to window
window.account_transaction_model_table = account_transaction_model_table;
window.invoice_customer_model_table = invoice_customer_model_table;

// ! ------------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("ACCOUNT_CUSTOMER_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("ACCOUNT_CUSTOMER_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

window.reload_account_transactions = reload_account_transactions;
export function reload_account_transactions() {
    account_transaction_model_table.reload();
}

window.reload_customer_invoices = reload_customer_invoices;
export function reload_customer_invoices() {
    invoice_customer_model_table.reload();
}

window.build_invoice_customer_table = build_invoice_customer_table;
export function build_invoice_customer_table() {
    const status = document.getElementById("invoice_debt_status")?.value;
    const filter = {};
    if (status) {
        filter["Account_Receivable.status"] = status;
    }
    invoice_customer_model_table.filter = JSON.stringify(filter);
    invoice_customer_model_table.reload();
}

window.update_invoice_customer_record = update_invoice_customer_record;
async function update_invoice_customer_record(id) {
    // Extract main elements
    const modal = document.getElementById("Modal_invoice_customer_record");
    if (!modal) return;

    const total = parseFloat((modal.querySelector('[data-field="total"]')?.textContent || "0").replace(/,/g, ""));
    const amount_paid = parseFloat(modal.querySelector('[data-field="amount_paid"]')?.value || "0");
    const status = modal.querySelector('[data-field="status"]')?.value || "UNPAID";

    console.log("🧾 total:", total, "amount_paid:", amount_paid, "status:", status);

    // Validate numeric inputs
    if (isNaN(total) || isNaN(amount_paid)) {
        unity.showDialogError({ msg: "Invalid amount value (NaN)" });
        return;
    }

    // Check customer debtor status
    switch (status) {
        case "PAID":
            if (amount_paid !== total) {
                unity.showDialogError({
                    msg: `Invalid payment amount: Must pay full amount (${total.toLocaleString()} THB)`,
                });
                return;
            }
            const res = await unity.showDialogConfirm({
                msg: `Full payment received (${total.toLocaleString()} THB)`,
                content: `Once marked as PAID, payment amount cannot be edited. Are you sure?`,
            });
            if (!res.confirm) {
                return;
            }
            break;

        case "PARTIAL":
            if (amount_paid <= 0 || amount_paid >= total) {
                unity.showDialogError({
                    msg: `Invalid payment amount: Must be greater than 0 and less than ${total.toLocaleString()} THB`,
                });
                return;
            }
            break;

        case "UNPAID":
            if (amount_paid > 0) {
                unity.showDialogError({
                    msg: "Invalid payment amount: UNPAID status amount must be 0",
                });
                return;
            }
            break;
    }

    // Dispatch payload to backend API upon validation
    const payload = {
        status: status,
        amount_paid: amount_paid,
    };

    console.log("Submitting payload:", payload);

    const respond = await unity.fetchApi(
        `/api/account_record/invoice_customer_record?id=${id}`,
        "put",
        JSON.stringify(payload),
        "json",
    );

    if (respond.success) {
        unity.showDialogSuccess({ msg: respond.msg || "Data updated successfully" });
        modal.close();
        invoice_customer_model_table.reload();
    } else {
        unity.showDialogError({ msg: respond.msg || "Failed to update record" });
    }
}

window.edit_invoice_customer_record = edit_invoice_customer_record;
async function edit_invoice_customer_record(id) {
    const modal = document.getElementById("Modal_invoice_customer_record");
    if (!modal) return;

    const respond = await unity.fetchApi(`/api/account_record/invoice_customer_record?id=${id}`, "get", null, "json");

    if (respond.success) {
        const result = respond.data;
        console.log(result);
        const inv = result.Account_Receivable;
        const cust = result.Customer;
        inv.subtotal = inv.amount / 1.07;
        inv.vat = inv.amount - inv.subtotal;

        const data_json = JSON.parse(inv.invoice_data);
        console.log(data_json);

        modal.querySelector('[data-field="invoice_no"]').textContent = inv.invoice_no;
        modal.querySelector('[data-field="invoice_date"]').textContent = inv.invoice_date;

        let invoice_items = `<tr class="hover:bg-base-100">
                                <td colspan="4" class="text-center">${data_json.header || "No records"}</td>
                            </tr>`;

        if (data_json.body) {
            for (const [index, row] of data_json.body.entries()) {
                console.log(index, row);
                invoice_items += `<tr class="hover:bg-base-100">
                                <td class="text-center">${row[0]}</td>
                                <td>${row[1]}</td>
                                <td>${row[2]}</td>
                                <td>${row[3]}</td>
                            </tr>`;
            }
        }

        modal.querySelector('[data-field="invoice_items"]').innerHTML = invoice_items;

        modal.querySelector('[data-field="subtotal"]').textContent = inv.subtotal?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
        });
        modal.querySelector('[data-field="vat"]').textContent = inv.vat?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
        });
        modal.querySelector('[data-field="total"]').textContent = inv.amount?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
        });

        modal.querySelector('[data-field="amount_paid"]').value = inv.amount_paid;

        modal.querySelector('[data-field="customer_name"]').textContent = cust.customer_name;

        modal.querySelector('[data-field="brn_save"]').onclick = () => {
            update_invoice_customer_record(id);
        };
    }
    modal.showModal();
}

async function renderParkingInvoiceA4Preview(inv, cust, title, itemLines, total, payment_term, due_date) {
    const modal = document.getElementById("Modal_Document_Print");
    if (!modal) return;
    const printArea = modal.querySelector("#Document_Print_Area");

    // Rows per page
    const ROWS_PER_PAGE = 20;
    const totalRows = itemLines.length;

    // Calculate total pages
    const totalPages = Math.ceil(totalRows / ROWS_PER_PAGE) || 1;

    // Clear print area
    printArea.innerHTML = "";

    // Fetch template
    const template_invoice = document.getElementById("invoice_page");

    for (let i = 1; i <= totalPages; i++) {
        const clone = template_invoice.content.cloneNode(true);

        // Populate metadata
        const invoice_date = unity.dateTimeToStr(inv.invoice_date, "DD/MM/YYYY");
        clone.querySelector("[data-field='page_number']").textContent = `${i} / ${totalPages}`;
        clone.querySelector("[data-field='payment_term']").textContent = payment_term;

        clone.querySelector("[data-field='invoice_date']").textContent = invoice_date;
        clone.querySelector("[data-field='invoice_no']").textContent = inv.invoice_no || "-";
        clone.querySelector("[data-field='customer_name']").textContent = cust.customer_name || "-";
        clone.querySelector("[data-field='customer_address']").textContent = cust.address || "-";
        clone.querySelector("[data-field='customer_tax']").textContent = cust.tax_id || "-";
        clone.querySelector("[data-field='customer_contact']").textContent = cust.contact_name || "-";
        clone.querySelector("[data-field='customer_phone']").textContent = cust.phone || "-";
        clone.querySelector("[data-field='due_date']").textContent = unity.dateTimeToStr(inv.due_date, "DD/MM/YYYY");

        // Populate page records
        const start = (i - 1) * ROWS_PER_PAGE;
        const end = start + ROWS_PER_PAGE;
        const rowsForPage = itemLines.slice(start, end);

        // 🔹 Build table with inline styling for printJS
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.fontSize = "13px";

        // 🔹 Table Header
        table.innerHTML = `
            <thead>
                <tr style="background:#f3f4f6;border-top:2px solid #2563eb;">
                    <th style="width:36px;text-align:center;padding:6px;">#</th>
                    <th style="text-align:left;padding:6px;">Quantity</th>
                    <th style="text-align:left;padding:6px;">Amount</th>
                    <th style="width:120px;text-align:right;padding:6px;">CODE</th>
                </tr>
            </thead>
            `;

        // 🔹 Table Body for page records
        const tbody = document.createElement("tbody");
        rowsForPage.forEach((item, idx) => {
            console.log(item);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="text-align:center;padding:4px;border-bottom:1px solid #ddd;">${item[0]}</td>
                <td style="padding:4px;border-bottom:1px solid #ddd;">${item[1]}</td>
                <td style="padding:4px;border-bottom:1px solid #ddd;">${item[2]}.00</td>
                <td style="text-align:right;padding:4px;border-bottom:1px solid #ddd;">${item[3]}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        // 🔹 Insert table into page container
        const pageContent = clone.querySelector("[data-field='page_content']");

        if (i === 1) {
            const titleBox = document.createElement("div");
            titleBox.classList.add("text-center", "font-bold", "text-xs");
            titleBox.textContent = title;
            pageContent.appendChild(titleBox);
        }
        if (pageContent) pageContent.appendChild(table);

        // 🔹 Append totals summary on last page
        if (i === totalPages) {
            const totalBox = document.createElement("div");
            totalBox.style.textAlign = "right";
            totalBox.style.marginTop = "12px";
            totalBox.style.paddingTop = "6px";
            totalBox.style.borderTop = "2px solid #2563eb";
            totalBox.style.fontSize = "13px";

            inv.subtotal = inv.amount / 1.07;
            inv.vat = inv.amount - inv.subtotal;
            inv.total = inv.amount;

            totalBox.innerHTML = `
                <div><b>Subtotal (VAT Excl.):</b> ${inv.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"} THB</div>
                <div><b>VAT (7%):</b> ${inv.vat?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"} THB</div>
                <div style="color:#2563eb;font-weight:700;font-size:15px;margin-top:4px;">
                <b>Total (VAT Incl.):</b> ${inv.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"} THB
                </div>
            `;
            pageContent.appendChild(totalBox);
        }

        // 🔹 Append completed page to print area
        printArea.appendChild(clone);
    }

    modal.showModal();
}

window.print_Document = print_Document;
async function print_Document() {
    const printableEl = document.getElementById("Document_Print_Area");
    if (!printableEl) {
        unity.showToastNotification({ type: "warning", title: "Print Document", msg: "Print area content not found (#Document_Print_Area)" });
        return;
    }

    printJS({
        printable: "Document_Print_Area", // Target element ID for print
        type: "html",
        targetStyles: ["*"], // Pull all styles from Tailwind/DaisyUI
        documentTitle: "Preview",
        style: `
      /* Fix dimensions to A4 */
      @page {
        size: A4;
        margin: 0;
      }
      #Document_Print_Area {
        width: 210mm !important;
        height: 297mm !important;
        padding: 20mm;
        box-sizing: border-box;
      }

      /* Print styling */
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        font-family: 'Kanit', sans-serif;
      }

      /* Remove modal scrollbar/borders on print */
      .modal, .modal-box {
        box-shadow: none !important;
        border: none !important;
        background: none !important;
      }
    `,
    });
}

window.previewInvoice = previewInvoice;
async function previewInvoice(id) {
    try {
        const respond = await unity.fetchApi(
            `/api/account_record/invoice_customer_record?id=${id}`,
            "get",
            null,
            "json",
        );
        console.log(respond);

        const result = respond.data;

        if (!result || !result.Account_Receivable) {
            unity.showToastNotification({
                icon: "error",
                msg: "Invoice data not found",
            });
            return;
        }

        const inv = result.Account_Receivable;
        const cust = result.Customer;
        // console.log(cust);
        const invoice_data_obj = JSON.parse(inv.invoice_data || "{}");
        console.log(invoice_data_obj);
        const title = invoice_data_obj.header;
        const itemLines = invoice_data_obj.body || [];
        const total = inv.amount || 0;
        const payment_term = cust.payment_term || "-";
        const due_date = inv.due_date || "-";

        renderParkingInvoiceA4Preview(inv, cust, title, itemLines, total, payment_term, due_date);
    } catch (err) {
        unity.showToastNotification({
            type: "error",
            msg: `Error: ${err.message}`,
        });
    }
}
let table_of_customer_account_auto_credit_inv = null;
async function account_auto_credit_summary_inv(customer_id, date_range) {
    if (customer_id === undefined || customer_id === null || customer_id === "" || customer_id == -1) return;
    if (!date_range) return;
    if (!date_range.includes(" - ")) {
        unity.showToastNotification({
            type: "error",
            msg: "Invalid date_range format",
        });
        return;
    }
    console.log("account_auto_credit_summary_inv", customer_id, date_range);

    const res = await unity.fetchApi(
        `/api/account_record/get_customer_auto_credit_summary?customer_id=${customer_id}&date_range=${date_range}`,
        "get",
        null,
        "json",
    );
    const jsonData = (res && res.success) ? res.data : [];
    if (table_of_customer_account_auto_credit_inv) {
        table_of_customer_account_auto_credit_inv.clear();
        if (jsonData && jsonData.length > 0) {
            table_of_customer_account_auto_credit_inv.rows.add(jsonData);
        }
        table_of_customer_account_auto_credit_inv.draw();
    }
}

window.invoice_customer_auto_credit = invoice_customer_auto_credit;
async function invoice_customer_auto_credit() {
    const customer_select_main = document.getElementById("customer_select_main");
    if (customer_select_main.value < 1) {
        unity.showToastNotification({
            type: "warning",
            msg: "Please select customer",
        });
        return;
    }
    const customer_info_container = document.getElementById("customer_info_container");
    const customer_name = customer_info_container.querySelector('[data-field="customer_name"]').innerText;
    const credit_range = document.getElementById(
        "select_date_time_range_of_build_customer_account_auto_credit_table",
    ).value;
    const customer_id = customer_info_container.querySelector('[data-field="id"]').innerText;

    const dt = table_of_customer_account_auto_credit_inv;
    const allData = dt.rows().data().toArray();

    // 2. Extract total from footer sum
    // Total in column index 2
    const total_quantity = dt.column(1).footer().innerText;
    const total_text = dt.column(2).footer().innerText;
    const amount_total = parseFloat(total_text.replace(/,/g, ""));

    if (!amount_total || amount_total <= 0) {
        unity.showDialogWarning({ title: "No records", msg: "Unable to create invoice" });
        return;
    }

    const invoice_summary = `<div class="stats shadow">
                                <div class="stat place-items-center">
                                    <div class="stat-title">Total Quantity</div>
                                    <div class="stat-value">${total_quantity}</div>
                                    <div class="stat-desc">${credit_range}</div>
                                </div>

                                <div class="stat place-items-center">
                                    <div class="stat-title">Total Amount</div>
                                    <div class="stat-value text-secondary">${total_text}</div>
                                </div>
                            </div>`;

    const result = await unity.showDialogConfirm({
        title: `Confirm Invoice Generation<br><span class="text-sm opacity-70">${customer_name}</span>`,
        content: `
            <div class="max-h-72 overflow-y-auto rounded-box border border-base-200 shadow-sm invoice-preview">
                ${invoice_summary}
            </div>
        `,
    });

    if (!result.confirm) return;

    // 3. Prepare payload from data source

    const invoice_data_obj = {
        header: "Visitor Service Fee Invoice (Customer Auto Credit)@" + credit_range,
        body: allData.map((item) => [
            item.service_name,
            item.quantity,
            item.total_amount.toLocaleString(),
            item.transaction_code,
        ]),
        footer: `Total Amount: ${total_text}`,
    };

    const payload = {
        customer_id: customer_id,
        invoice_data: JSON.stringify(invoice_data_obj),
        amount_total: amount_total,
        credit_range: credit_range,
    };

    console.log(payload);
    const respond = await unity.fetchApi(
        "/api/customer/invoice/customer_auto_credit",
        "post",
        JSON.stringify(payload),
        "json",
    );

    console.log(respond);

    if (respond.success) {
        unity.showDialogSuccess({ msg: respond.msg });
        invoice_customer_model_table.reload();
    } else {
        unity.showDialogWarning({ msg: respond.msg });
    }
}

window.cover_summary_customer_auto_credit_document = cover_summary_customer_auto_credit_document;
async function cover_summary_customer_auto_credit_document() {
    console.log("cover_summary_customer_auto_credit");
    const modal = document.getElementById("Modal_Document_Print");
    if (!modal) return;
    const printArea = modal.querySelector("#Document_Print_Area");
    if (!printArea) return;
    printArea.innerHTML = "";

    const clonedTable = table_el.cloneNode(true);

    // 3. Prevent duplicate IDs
    clonedTable.id = "myTable_cloned";

    // 4. Place in container

    printArea.appendChild(clonedTable);
    modal.showModal();
}
window.customer_select_change = customer_select_change;
async function customer_select_change(id) {
    console.log("customer_select_change", id);
    const customer_container = document.getElementById("customer_info_container");
    const filter = { "Account_Record.type": "CUSTOMER_AUTO_CREDIT" };

    let data = {};
    const parsedId = parseInt(id, 10);
    if (parsedId > 0) {
        const respond = await unity.fetchApi(`/api/customer?id=${parsedId}`, "get", null, "json");
        if (respond && respond.success) {
            data = respond.data;
        }
        filter["Account_Record.customer_id"] = parsedId;
    } else if (parsedId === 0) {
        // เมื่อเลือก ALL (ทั้งหมด) ให้แสดงข้อความรวม และดึงธุรกรรมของทุกลูกค้า
        data = {
            customer_name: "All Customers (ลูกค้าทั้งหมด)",
            customer_code: "ALL",
            id: "-",
            tax_id: "-",
            address: "แสดงรายการธุรกรรมของทุกลูกค้า",
        };
    } else {
        // เมื่อยังไม่ได้เลือกลูกค้า (Select Customer / -1)
        data = {
            customer_name: "Select Customer",
            customer_code: "-",
            id: "-",
            tax_id: "-",
            address: "-",
        };
        filter["Account_Record.customer_id"] = -1;
        if (table_of_customer_account_auto_credit_inv) {
            table_of_customer_account_auto_credit_inv.clear().draw();
        }
    }
    filter["Account_Record.status"] = "ALL";

    unity.data2fields(data, customer_container);
    const filter_json = JSON.stringify(filter);
    console.log("filter_json", filter_json);
    account_transaction_model_table.filter = filter_json;
    account_transaction_model_table.table.page("first").draw("page");
    account_transaction_model_table.reload();
}

async function init_select_option() {
    unity.init_selects_option([document.getElementById("customer_select_main")], "/api/customer", "customer_name");
}
async function Init() {
    init_select_option();
    const default_tab = "ACCOUNT_CUSTOMER_TAB01";

    if (localStorage.getItem("ACCOUNT_CUSTOMER_TAB_ACTIVE")) {
        const v = localStorage.getItem("ACCOUNT_CUSTOMER_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    } else {
        document.getElementById(default_tab).checked = true;
    }

    const daterangepicker_config = unity.getFlatpickrConfigWithEmbeddedRanges();
    daterangepicker_config.startDate = dayjs().startOf("month");
    daterangepicker_config.endDate = dayjs().endOf("month");

    const filter = { "Account_Record.type": "CUSTOMER_AUTO_CREDIT", "Account_Record.customer_id": -1 };
    account_transaction_model_table.filter = JSON.stringify(filter);

    table_class.init_table_model_with_datatime_picker(
        account_transaction_model_table,
        "#select_date_time_range_of_build_customer_account_auto_credit_table",
        daterangepicker_config,
    );

    table_class.init_table_model_with_datatime_picker(
        invoice_customer_model_table,
        "#select_date_time_range_of_build_invoice_customer_table",
        daterangepicker_config,
    );

    const table = document.querySelector('[data-field="table_of_customer_account_auto_credit_inv"]');

    if (table) {
        table_of_customer_account_auto_credit_inv = new DataTable(table, {
            buttons: [
                {
                    text: '<i class="fa-solid fa-print fa-2x text-info"></i>',
                    titleAttr: 'Print Preview',
                    action: function (e, dt, node, config) {
                        // 1. Extract report header data from UI
                        const dateRangeInput = document.getElementById("select_date_time_range_of_build_customer_account_auto_credit_table");
                        const dateRangeText = dateRangeInput ? dateRangeInput.value || "All" : "All";

                        const custName = document.querySelector('#customer_info_container [data-field="customer_name"]')?.textContent?.trim() || "All";
                        const custCode = document.querySelector('#customer_info_container [data-field="customer_code"]')?.textContent?.trim() || "-";
                        const custTax = document.querySelector('#customer_info_container [data-field="tax_id"]')?.textContent?.trim() || "-";
                        const custAddress = document.querySelector('#customer_info_container [data-field="address"]')?.textContent?.trim() || "-";

                        // 2. Clone table and reset classes
                        var tableNode = $(dt.table().node()).clone();
                        tableNode.removeClass().addClass("report-table");
                        tableNode.removeAttr("style").css("width", "100%");
                        tableNode.find("th, td, tr").removeAttr("style");

                        // 3. Configure themes and typography
                        const fontFamily = unity.ReportSettings?.fontFamily || "Sarabun, sans-serif";
                        const colorPrimary = unity.ReportSettings?.colorPrimary || "#0f172a";
                        const colorText = unity.ReportSettings?.colorText || "#1e293b";
                        const colorTextLight = unity.ReportSettings?.colorTextLight || "#64748b";
                        const colorBorder = unity.ReportSettings?.colorBorder || "#cbd5e1";
                        const colorBgHeader = unity.ReportSettings?.colorBgHeader || "#f8fafc";
                        const colorBgAlt = unity.ReportSettings?.colorBgAlt || "#f1f5f9";
                        const colorBgParam = unity.ReportSettings?.colorBgParam || "#f8fafc";
                        const colorAccent = unity.ReportSettings?.colorAccent || "#dc2626";

                        const fsTableHead = unity.ReportSettings?.fsTableHead || "9px";
                        const fsTableBody = unity.ReportSettings?.fsTableBody || "9px";
                        const fsTableFoot = unity.ReportSettings?.fsTableFoot || "9px";
                        const fsParam = unity.ReportSettings?.fsParam || "9px";
                        const fsBody = unity.ReportSettings?.fsBody || "12px";

                        const cellPadding = unity.ReportSettings?.cellPadding || "4px 8px";
                        const tableGap = unity.ReportSettings?.tableGap || "8px";

                        // A4 Report Structure
                        var htmlContent = `
                            <style id="Preview_Report_Styles">
                                #Summary_Report_Print_Area table { 
                                    width: 100% !important; 
                                    table-layout: fixed !important;
                                    border-collapse: collapse !important;
                                    margin-bottom: ${tableGap} !important;
                                }
                                #Summary_Report_Print_Area th, 
                                #Summary_Report_Print_Area td { 
                                    word-wrap: break-word !important;
                                    overflow-wrap: break-word !important;
                                }
                                /* Column widths for A4 sheet */
                                #Summary_Report_Print_Area th:nth-child(1),
                                #Summary_Report_Print_Area td:nth-child(1) {
                                    width: 35% !important;
                                }
                                #Summary_Report_Print_Area th:nth-child(2),
                                #Summary_Report_Print_Area td:nth-child(2) {
                                    width: 15% !important;
                                }
                                #Summary_Report_Print_Area th:nth-child(3),
                                #Summary_Report_Print_Area td:nth-child(3) {
                                    width: 20% !important;
                                }
                                #Summary_Report_Print_Area th:nth-child(4),
                                #Summary_Report_Print_Area td:nth-child(4) {
                                    width: 30% !important;
                                }
                                #Summary_Report_Print_Area th { 
                                    background-color: ${colorBgHeader} !important;
                                    color: ${colorPrimary} !important;
                                    font-weight: bold !important;
                                    border: 1px solid ${colorBorder} !important;
                                    border-bottom: 2px solid ${colorPrimary} !important;
                                    padding: ${cellPadding} !important;
                                    font-size: ${fsTableHead} !important;
                                    text-align: left;
                                }
                                #Summary_Report_Print_Area td { 
                                    border: 1px solid ${colorBorder} !important;
                                    padding: ${cellPadding} !important;
                                    font-size: ${fsTableBody} !important;
                                    text-align: left;
                                }
                                #Summary_Report_Print_Area .dt-right { 
                                    text-align: right !important; 
                                }
                                #Summary_Report_Print_Area th.dt-right {
                                    text-align: right !important;
                                }

                                /* Hide column 5 (Paying company) duplicate with RowGroup */
                                #Summary_Report_Print_Area table th:nth-child(5), 
                                #Summary_Report_Print_Area table td:nth-child(5) {
                                    display: none !important;
                                }

                                /* RowGroup styles */
                                #Summary_Report_Print_Area .dtrg-group td { 
                                    background-color: ${colorBgAlt} !important; 
                                    color: ${colorPrimary} !important;
                                    font-weight: bold !important; 
                                    font-size: ${fsTableBody} !important;
                                    border-top: 1px solid ${colorBorder} !important;
                                    border-bottom: 1px solid ${colorBorder} !important;
                                    padding: 6px 8px !important;
                                }
                                #Summary_Report_Print_Area .dtrg-end td { 
                                    background-color: #ffffff !important; 
                                    font-weight: bold !important;
                                    border-top: 1px solid ${colorBorder} !important;
                                    border-bottom: 2px solid ${colorPrimary} !important;
                                    padding: 6px 8px !important;
                                }

                                /* Footer Grand Total */
                                #Summary_Report_Print_Area tfoot th, 
                                #Summary_Report_Print_Area tfoot td { 
                                    background-color: ${colorBgHeader} !important;
                                    color: ${colorPrimary} !important;
                                    border: 1px solid ${colorBorder} !important;
                                    border-top: 2px solid ${colorPrimary} !important;
                                    border-bottom: 2px solid ${colorPrimary} !important;
                                    font-weight: bold !important;
                                    font-size: ${fsTableFoot} !important;
                                    padding: 8px 6px !important;
                                }
                            </style>

                            <div class="report-container" style="font-family: '${fontFamily}', sans-serif; color: ${colorText}; font-size: ${fsBody} !important; line-height: 1.3; box-sizing: border-box;">
                                <!-- Company Header -->
                                ${unity.peper_header_owner({ title: "Corporate Customer Revenue Summary Report" })}

                                <!-- Report Parameters & Customer Info -->
                                <div style="background-color: ${colorBgParam}; border: 1px solid ${colorBorder}; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; font-size: ${fsParam} !important; display: flex; flex-direction: column; gap: 4px;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <div><b>Report Period:</b> ${dateRangeText}</div>
                                        <div><b>Customer ID:</b> ${custCode}</div>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <div><b>Customer / Company:</b> ${custName}</div>
                                        <div><b>Tax ID:</b> ${custTax}</div>
                                    </div>
                                    <div><b>Address:</b> ${custAddress}</div>
                                </div>

                                <!-- Table Section -->
                                <div class="table-container" style="margin-bottom: ${tableGap};">
                                    ${tableNode[0].outerHTML}
                                </div>

                                <!-- Document Signature Footer -->
                                ${unity.peper_footer_owner()}
                            </div>
                        `;

                        // 4. Update preview box
                        const printArea = document.getElementById("Summary_Report_Print_Area");
                        if (printArea) {
                            printArea.innerHTML = htmlContent;
                        }

                        // 5. Open modal dialog
                        const modal = document.getElementById("Modal_Summary_Report_A4");
                        if (modal) {
                            modal.showModal();
                        }
                    },
                },
            ],
            colReorder: false,
            deferRender: true,
            destroy: true,
            autoWidth: false,
            serverSide: false,
            scrollY: "50vh",
            scrollCollapse: true,
            scrollX: true,
            fixedColumns: true,
            stateSave: false,
            order: [[4, "asc"]], // Sort by company name
            pageLength: 5000,

            columnDefs: [
                { orderable: false, targets: "_all" },
                { searchable: false, targets: "_all" },
                { className: "dt-right", targets: [1, 2] },
                { visible: false, targets: [4] }, // Hide company (already in RowGroup)
            ],

            columns: [
                { title: "Customer Name", data: "transaction_code" },
                { title: "Quantity", data: "quantity" },
                {
                    title: "Total Amount",
                    data: "total_amount",
                    render: function (data) {
                        return data ? Number(data).toLocaleString() : 0;
                    },
                },
                { title: "Stamp / E-Stamp", data: "service_name" },
                { title: "Paying Company", data: "customer_name" },
            ],

            rowGroup: {
                dataSrc: "customer_name",
                startRender: function (rows, group) {
                    // Adjust colspan to 4
                    return $('<tr class="dtrg-group dtrg-start"/>').append(
                        '<td colspan="4" style="background-color: #f2f2f2; font-weight: bold;">Company: ' +
                            group +
                            "</td>",
                    )[0];
                },
                endRender: function (rows, group) {
                    let subTotalQty = rows
                        .data()
                        .pluck("quantity")
                        .reduce((a, b) => a + (Number(b) || 0), 0);
                    let subTotalAmt = rows
                        .data()
                        .pluck("total_amount")
                        .reduce((a, b) => a + (Number(b) || 0), 0);

                    return (
                        $('<tr class="dtrg-group dtrg-end"/>')
                            // .append('<td style="text-align:right; font-weight:bold;">Group Total (' + group + "):</td>")
                            .append('<td style="text-align:right; font-weight:bold;">Sub Total:</td>')
                            .append(
                                '<td style="font-weight:bold; text-align:right;">' +
                                    subTotalQty.toLocaleString() +
                                    "</td>",
                            )
                            .append(
                                '<td style="font-weight:bold; text-align:right;">' +
                                    subTotalAmt.toLocaleString() +
                                    "</td>",
                            )
                            .append("<td></td>")[0]
                    );
                },
            },

            footerCallback: function (row, data, start, end, display) {
                let api = this.api();
                let intVal = function (i) {
                    return typeof i === "string" ? i.replace(/[\$,]/g, "") * 1 : typeof i === "number" ? i : 0;
                };

                let totalQty = api
                    .column(1)
                    .data()
                    .reduce((a, b) => intVal(a) + intVal(b), 0);
                let totalAmount = api
                    .column(2)
                    .data()
                    .reduce((a, b) => intVal(a) + intVal(b), 0);

                // Render in tfoot
                $(api.column(1).footer()).html(totalQty.toLocaleString());
                $(api.column(2).footer()).html(totalAmount.toLocaleString());
            },
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();

    // ? For Start Tour
    if (document.getElementById("btn_start_tour")) {
        document.getElementById("btn_start_tour").classList.remove("hidden");
        const driverObj = window.driver({
            animate: true,
            showProgress: true,
            showButtons: ["next", "previous", "close"],
            steps: [
                {
                    element: "#customer_select_main",
                    popover: {
                        title: "Select Customer",
                        description: "Select customer account to review or manage",
                        side: "bottom",
                        align: "start",
                    },
                },
                {
                    element: "#select_date_time_range_of_build_customer_account_auto_credit_table",
                    popover: {
                        title: "Select Date Range",
                        description: "Select date range of transactions to display",
                        side: "bottom",
                        align: "start",
                    },
                },
                {
                    element: "#customer_info_container",
                    popover: {
                        title: "Customer Profile",
                        description: "Displays customer profile, tax ID, and billing address",
                        side: "top",
                        align: "center",
                    },
                },
                {
                    element: '[data-field="table_of_customer_account_auto_credit_inv"]',
                    popover: {
                        title: "Service Fee Summary",
                        description: "Summary table of parking service transactions for selected period",
                        side: "top",
                        align: "center",
                    },
                },
                {
                    element: '[data-field="btn_invoice_customer_auto_credit"]',
                    popover: {
                        title: "Generate Invoice",
                        description: "Click here to generate official invoice from summarized transactions",
                        side: "top",
                        align: "center",
                    },
                },
                {
                    element: "#ACCOUNT_CUSTOMER_TAB02",
                    popover: {
                        title: "Invoice Management",
                        description: "Switch to this tab to manage and review all invoice history",
                        side: "bottom",
                        align: "start",
                    },
                },
            ],
        });
        document.getElementById("btn_start_tour").addEventListener("click", () => {
            driverObj.drive();
        });
    }
});
