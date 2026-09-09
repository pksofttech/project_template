import * as unity from "./unity.js";

let fp = null;
let lastAccountSummaryData = null;

// Initialize Date Range Picker
function initDatePicker() {
    const config = unity.getFlatpickrConfigWithEmbeddedRanges();
    config.defaultDate = [dayjs().startOf("day").toDate(), dayjs().endOf("day").toDate()];

    const inputEl = document.querySelector("#select_date_time_range_of_build_account_summary_table");
    let reloadTimer = null;
    const scheduleReload = () => {
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
            load_account_summary_data();
        }, 200);
    };
    if (inputEl) {
        fp = flatpickr(inputEl, {
            ...config,
            onClose: (selectedDates, dateStr, instance) => {
                console.log("Account date range updated:", dateStr);
                scheduleReload();
            },
        });

        // Formulate initial string
        const startStr = dayjs().startOf("day").format("YYYY/MM/DD HH:mm");
        const endStr = dayjs().endOf("day").format("YYYY/MM/DD HH:mm");
        inputEl.value = `${startStr} - ${endStr}`;
    }
}

// Load Account Summary Data from Endpoint
window.load_account_summary_data = load_account_summary_data;
async function load_account_summary_data() {
    const inputEl = document.querySelector("#select_date_time_range_of_build_account_summary_table");
    if (!inputEl) return;

    const dateRange = inputEl.value;
    if (!dateRange) {
        unity.showToastNotification({ type: "warning", msg: "Please select date range" });
        return;
    }

    unity.showDialogLoading("Loading revenue summary...");
    try {
        const response = await fetch(`/api/account_record/summary_report?date_range=${encodeURIComponent(dateRange)}`);
        const result = await response.json();

        if (result.success) {
            lastAccountSummaryData = result;
            updateTotals(result.totals);
            updatePaymentTypeTable(result.by_type);
            updateCashierTable(result.by_cashier);
            updateCustomerTable(result.by_customer);
            updateStatusTable(result.by_status);
            updateParkingLotTable(result.by_parking_lot);
            updateRecordTableTable(result.by_record_table);
        } else {
            unity.showToastNotification({ type: "error", msg: result.msg || "Failed to load revenue summary" });
        }
    } catch (error) {
        console.error("Error loading account summary:", error);
        unity.showToastNotification({ type: "error", msg: "Unable to connect to server" });
    } finally {
        unity.closeDialogLoading();
    }
}

// Update KPI Stats Cards
function updateTotals(totals) {
    const formatter = {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };
    document.getElementById("stat_total_amount").innerText = totals.amount.toLocaleString("th-TH", formatter);
    document.getElementById("stat_total_fine").innerText = totals.fine.toLocaleString("th-TH", formatter);
    document.getElementById("stat_total_discount").innerText = totals.discount.toLocaleString("th-TH", formatter);
    const elPaymentFee = document.getElementById("stat_total_payment_fee");
    if (elPaymentFee) elPaymentFee.innerText = (totals.payment_fee || 0).toLocaleString("th-TH", formatter);
    document.getElementById("stat_total_pay").innerText = totals.pay.toLocaleString("th-TH", formatter);
}

// Populate Payment Type Table
function updatePaymentTypeTable(data) {
    const tbody = document.querySelector("#table_summary_by_payment_type tbody");
    tbody.innerHTML = "";

    let totalCount = 0;
    let totalFine = 0.0;
    let totalDiscount = 0.0;
    let totalPaymentFee = 0.0;
    let totalAmount = 0.0;
    let totalPay = 0.0;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-base-content/50">No transactions found for selected period</td></tr>`;
    } else {
        data.forEach((item) => {
            const count = parseInt(item.count || 0);
            const fine = parseFloat(item.fine || 0);
            const discount = parseFloat(item.discount || 0);
            const payment_fee = parseFloat(item.payment_fee || 0);
            const amount = parseFloat(item.amount || 0);
            const pay = parseFloat(item.pay || 0);

            totalCount += count;
            totalFine += fine;
            totalDiscount += discount;
            totalPaymentFee += payment_fee;
            totalAmount += amount;
            totalPay += pay;

            const row = document.createElement("tr");
            row.className = "hover:bg-base-50/50 transition-colors";
            row.innerHTML = `
                <td class="p-4 font-semibold text-base-content/95">${item.payment_type || "CASH"}</td>
                <td class="p-4 text-right font-medium">${count.toLocaleString()}</td>
                <td class="p-4 text-right text-error font-medium">${fine.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-warning font-medium">${discount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-info font-medium">${payment_fee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-primary font-bold">${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-success font-bold">${pay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Update grand totals
    document.getElementById("total_type_count").innerText = totalCount.toLocaleString();
    document.getElementById("total_type_fine").innerText = totalFine.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    document.getElementById("total_type_discount").innerText = totalDiscount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const elTypeFee = document.getElementById("total_type_payment_fee");
    if (elTypeFee)
        elTypeFee.innerText = totalPaymentFee.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    document.getElementById("total_type_amount").innerText = totalAmount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    document.getElementById("total_type_pay").innerText = totalPay.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Populate Cashier Table
function updateCashierTable(data) {
    const tbody = document.querySelector("#table_summary_by_cashier tbody");
    tbody.innerHTML = "";

    let totalCount = 0;
    let totalFine = 0.0;
    let totalDiscount = 0.0;
    let totalPaymentFee = 0.0;
    let totalAmount = 0.0;
    let totalPay = 0.0;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-base-content/50">No transactions found for selected period</td></tr>`;
    } else {
        data.forEach((item) => {
            const count = parseInt(item.count || 0);
            const fine = parseFloat(item.fine || 0);
            const discount = parseFloat(item.discount || 0);
            const payment_fee = parseFloat(item.payment_fee || 0);
            const amount = parseFloat(item.amount || 0);
            const pay = parseFloat(item.pay || 0);

            totalCount += count;
            totalFine += fine;
            totalDiscount += discount;
            totalPaymentFee += payment_fee;
            totalAmount += amount;
            totalPay += pay;

            const row = document.createElement("tr");
            row.className = "hover:bg-base-50/50 transition-colors";
            row.innerHTML = `
                <td class="p-4 font-semibold text-base-content/95">${item.cashier || "Automated System"}</td>
                <td class="p-4 text-right font-medium">${count.toLocaleString()}</td>
                <td class="p-4 text-right text-error font-medium">${fine.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-warning font-medium">${discount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-info font-medium">${payment_fee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-primary font-bold">${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-success font-bold">${pay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Update grand totals
    document.getElementById("total_cashier_count").innerText = totalCount.toLocaleString();
    document.getElementById("total_cashier_fine").innerText = totalFine.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    document.getElementById("total_cashier_discount").innerText = totalDiscount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const elCashierFee = document.getElementById("total_cashier_payment_fee");
    if (elCashierFee)
        elCashierFee.innerText = totalPaymentFee.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    document.getElementById("total_cashier_amount").innerText = totalAmount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    document.getElementById("total_cashier_pay").innerText = totalPay.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Populate Customer Table
function updateCustomerTable(data) {
    const tbody = document.querySelector("#table_summary_by_customer tbody");
    tbody.innerHTML = "";

    let totalCount = 0;
    let totalFine = 0.0;
    let totalDiscount = 0.0;
    let totalPaymentFee = 0.0;
    let totalAmount = 0.0;
    let totalPay = 0.0;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-base-content/50">No transactions found for selected period</td></tr>`;
    } else {
        data.forEach((item) => {
            const count = parseInt(item.count || 0);
            const fine = parseFloat(item.fine || 0);
            const discount = parseFloat(item.discount || 0);
            const payment_fee = parseFloat(item.payment_fee || 0);
            const amount = parseFloat(item.amount || 0);
            const pay = parseFloat(item.pay || 0);

            totalCount += count;
            totalFine += fine;
            totalDiscount += discount;
            totalPaymentFee += payment_fee;
            totalAmount += amount;
            totalPay += pay;

            const row = document.createElement("tr");
            row.className = "hover:bg-base-50/50 transition-colors";
            row.innerHTML = `
                <td class="p-4 font-semibold text-base-content/95">${item.customer_name || "General Visitor (VISITOR)"}</td>
                <td class="p-4 text-right font-medium">${count.toLocaleString()}</td>
                <td class="p-4 text-right text-error font-medium">${fine.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-warning font-medium">${discount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-info font-medium">${payment_fee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-primary font-bold">${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-success font-bold">${pay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Update grand totals
    document.getElementById("total_customer_count").innerText = totalCount.toLocaleString();
    document.getElementById("total_customer_fine").innerText = totalFine.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    document.getElementById("total_customer_discount").innerText = totalDiscount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const elCustFee = document.getElementById("total_customer_payment_fee");
    if (elCustFee)
        elCustFee.innerText = totalPaymentFee.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    document.getElementById("total_customer_amount").innerText = totalAmount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    document.getElementById("total_customer_pay").innerText = totalPay.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Populate Status Table
function updateStatusTable(data) {
    const tbody = document.querySelector("#table_summary_by_status tbody");
    tbody.innerHTML = "";

    let totalCount = 0;
    let totalFine = 0.0;
    let totalDiscount = 0.0;
    let totalPaymentFee = 0.0;
    let totalAmount = 0.0;
    let totalPay = 0.0;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-base-content/50">No transactions found for selected period</td></tr>`;
    } else {
        data.forEach((item) => {
            const count = parseInt(item.count || 0);
            const fine = parseFloat(item.fine || 0);
            const discount = parseFloat(item.discount || 0);
            const payment_fee = parseFloat(item.payment_fee || 0);
            const amount = parseFloat(item.amount || 0);
            const pay = parseFloat(item.pay || 0);

            totalCount += count;
            totalFine += fine;
            totalDiscount += discount;
            totalPaymentFee += payment_fee;
            totalAmount += amount;
            totalPay += pay;

            const row = document.createElement("tr");
            row.className = "hover:bg-base-50/50 transition-colors";
            row.innerHTML = `
                <td class="p-4 font-semibold text-base-content/95">${item.status || "PAID"}</td>
                <td class="p-4 text-right font-medium">${count.toLocaleString()}</td>
                <td class="p-4 text-right text-error font-medium">${fine.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-warning font-medium">${discount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-info font-medium">${payment_fee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-primary font-bold">${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-success font-bold">${pay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Update grand totals
    document.getElementById("total_status_count").innerText = totalCount.toLocaleString();
    document.getElementById("total_status_fine").innerText = totalFine.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    document.getElementById("total_status_discount").innerText = totalDiscount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const elStatusFee = document.getElementById("total_status_payment_fee");
    if (elStatusFee)
        elStatusFee.innerText = totalPaymentFee.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    document.getElementById("total_status_amount").innerText = totalAmount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    document.getElementById("total_status_pay").innerText = totalPay.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Populate Parking Lot Table
function updateParkingLotTable(data) {
    const tbody = document.querySelector("#table_summary_by_parking_lot tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let totalCount = 0;
    let totalFine = 0.0;
    let totalDiscount = 0.0;
    let totalPaymentFee = 0.0;
    let totalAmount = 0.0;
    let totalPay = 0.0;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-base-content/50">No transactions found for selected period</td></tr>`;
    } else {
        data.forEach((item) => {
            const count = parseInt(item.count || 0);
            const fine = parseFloat(item.fine || 0);
            const discount = parseFloat(item.discount || 0);
            const payment_fee = parseFloat(item.payment_fee || 0);
            const amount = parseFloat(item.amount || 0);
            const pay = parseFloat(item.pay || 0);

            totalCount += count;
            totalFine += fine;
            totalDiscount += discount;
            totalPaymentFee += payment_fee;
            totalAmount += amount;
            totalPay += pay;

            const row = document.createElement("tr");
            row.className = "hover:bg-base-50/50 transition-colors";
            row.innerHTML = `
                <td class="p-4 font-semibold text-base-content/95">${item.parking_lot_name || "General Parking Lot"}</td>
                <td class="p-4 text-right font-medium">${count.toLocaleString()}</td>
                <td class="p-4 text-right text-error font-medium">${fine.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-warning font-medium">${discount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-info font-medium">${payment_fee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-primary font-bold">${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-success font-bold">${pay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Update grand totals
    const elCount = document.getElementById("total_parking_lot_count");
    if (elCount) elCount.innerText = totalCount.toLocaleString();

    const elFine = document.getElementById("total_parking_lot_fine");
    if (elFine)
        elFine.innerText = totalFine.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const elDiscount = document.getElementById("total_parking_lot_discount");
    if (elDiscount)
        elDiscount.innerText = totalDiscount.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const elFee = document.getElementById("total_parking_lot_payment_fee");
    if (elFee)
        elFee.innerText = totalPaymentFee.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const elAmount = document.getElementById("total_parking_lot_amount");
    if (elAmount)
        elAmount.innerText = totalAmount.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const elPay = document.getElementById("total_parking_lot_pay");
    if (elPay)
        elPay.innerText = totalPay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Populate Record Table Summary
function updateRecordTableTable(data) {
    const tbody = document.querySelector("#table_summary_by_record_table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let totalCount = 0;
    let totalFine = 0.0;
    let totalDiscount = 0.0;
    let totalPaymentFee = 0.0;
    let totalAmount = 0.0;
    let totalPay = 0.0;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-base-content/50">No transactions found for selected period</td></tr>`;
    } else {
        data.forEach((item) => {
            const count = parseInt(item.count || 0);
            const fine = parseFloat(item.fine || 0);
            const discount = parseFloat(item.discount || 0);
            const payment_fee = parseFloat(item.payment_fee || 0);
            const amount = parseFloat(item.amount || 0);
            const pay = parseFloat(item.pay || 0);

            totalCount += count;
            totalFine += fine;
            totalDiscount += discount;
            totalPaymentFee += payment_fee;
            totalAmount += amount;
            totalPay += pay;

            const row = document.createElement("tr");
            row.className = "hover:bg-base-50/50 transition-colors";
            row.innerHTML = `
                <td class="p-4 font-semibold text-base-content/95">${item.table_name || "-"}</td>
                <td class="p-4 text-right font-medium">${count.toLocaleString()}</td>
                <td class="p-4 text-right text-error font-medium">${fine.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-warning font-medium">${discount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-info font-medium">${payment_fee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-primary font-bold">${amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="p-4 text-right text-success font-bold">${pay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Update grand totals
    const elCount = document.getElementById("total_record_table_count");
    if (elCount) elCount.innerText = totalCount.toLocaleString();

    const elFine = document.getElementById("total_record_table_fine");
    if (elFine)
        elFine.innerText = totalFine.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const elDiscount = document.getElementById("total_record_table_discount");
    if (elDiscount)
        elDiscount.innerText = totalDiscount.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const elFee = document.getElementById("total_record_table_payment_fee");
    if (elFee)
        elFee.innerText = totalPaymentFee.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const elAmount = document.getElementById("total_record_table_amount");
    if (elAmount)
        elAmount.innerText = totalAmount.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const elPay = document.getElementById("total_record_table_pay");
    if (elPay)
        elPay.innerText = totalPay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Preview A4 Income Summary Report
window.previewAccountSummaryReportA4 = async function () {
    const inputEl = document.querySelector("#select_date_time_range_of_build_account_summary_table");
    if (!inputEl) return;

    if (!lastAccountSummaryData) {
        await load_account_summary_data();
    }

    if (!lastAccountSummaryData) {
        unity.showToastNotification({ type: "warning", msg: "No summary data available for report" });
        return;
    }

    const dateRange = inputEl.value;
    const totals = lastAccountSummaryData.totals || {
        amount: 0,
        fine: 0,
        discount: 0,
        payment_fee: 0,
        pay: 0,
        count: 0,
    };
    const byType = lastAccountSummaryData.by_type || [];
    const byCashier = lastAccountSummaryData.by_cashier || [];
    const byCustomer = lastAccountSummaryData.by_customer || [];
    const byStatus = lastAccountSummaryData.by_status || [];
    const byParkingLot = lastAccountSummaryData.by_parking_lot || [];
    const byRecordTable = lastAccountSummaryData.by_record_table || [];

    const colorPrimary = unity.ReportSettings?.colorPrimary || "#1e3a8a";
    const colorAccent = unity.ReportSettings?.colorAccent || "#dc2626";

    // Standard 7-column header configuration for financial breakdowns
    const financialHeaders = (firstColLabel) => [
        { label: firstColLabel, align: "left" },
        { label: "Transaction Count", align: "right", width: "70px" },
        { label: "Total Fines", align: "right", width: "90px" },
        { label: "Total Discounts", align: "right", width: "90px" },
        { label: "Total Fees", align: "right", width: "90px" },
        { label: "Net Revenue", align: "right", width: "100px" },
        { label: "Actual Amount Paid", align: "right", width: "110px" },
    ];

    // Helper to map 7-column rows & calculate grand totals
    const buildFinancialRows = (items, nameKey, defaultName) => {
        let sumCount = 0;
        let sumFine = 0;
        let sumDiscount = 0;
        let sumPaymentFee = 0;
        let sumAmount = 0;
        let sumPay = 0;

        const rows = (items || []).map((item) => {
            const count = parseInt(item.count || 0);
            const fine = parseFloat(item.fine || 0);
            const discount = parseFloat(item.discount || 0);
            const payment_fee = parseFloat(item.payment_fee || 0);
            const amount = parseFloat(item.amount || 0);
            const pay = parseFloat(item.pay || 0);

            sumCount += count;
            sumFine += fine;
            sumDiscount += discount;
            sumPaymentFee += payment_fee;
            sumAmount += amount;
            sumPay += pay;

            return [
                { text: item[nameKey] || defaultName, bold: true, align: "left" },
                count.toLocaleString(),
                fine.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                discount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                payment_fee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                { text: amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), bold: true },
                { text: pay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), bold: true, color: colorPrimary },
            ];
        });

        const footers =
            items && items.length > 0
                ? [
                      "Grand Total:",
                      sumCount.toLocaleString(),
                      sumFine.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                      sumDiscount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                      sumPaymentFee.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                      sumAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                      sumPay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                  ]
                : [];

        return { rows, footers };
    };

    const typeData = buildFinancialRows(byType, "payment_type", "CASH");
    const cashierData = buildFinancialRows(byCashier, "cashier", "Automated System");
    const customerData = buildFinancialRows(byCustomer, "customer_name", "General Visitor (VISITOR)");
    const statusData = buildFinancialRows(byStatus, "status", "PAID");
    const parkingLotData = buildFinancialRows(byParkingLot, "parking_lot_name", "General Parking Lot");
    const recordTableData = buildFinancialRows(byRecordTable, "table_name", "-");

    unity.renderSummaryReportA4({
        title: "Parking Revenue & Income Summary Report",
        dateRange: dateRange,
        sections: [
            // 1. Overall Financial Revenue & Income KPI Summary
            {
                title: "Overall Financial Revenue & Income KPI Summary",
                headers: [
                    { label: "Financial Account Type", align: "left" },
                    { label: "Total Accumulated Amount (THB)", align: "right", width: "250px" },
                ],
                rows: [
                    [{ text: "Total Financial Transactions", bold: true, align: "left" }, `${totals.count.toLocaleString()} records`],
                    [{ text: "Net Amount", align: "left" }, { text: totals.amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), bold: true, color: colorPrimary }],
                    [{ text: "Fines Collected", align: "left" }, { text: totals.fine.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), bold: true, color: colorAccent }],
                    [{ text: "Discounts Provided", align: "left" }, { text: totals.discount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), bold: true, color: "#d97706" }],
                    [{ text: "Payment Gateway Fees", align: "left" }, { text: (totals.payment_fee || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), bold: true, color: "#0284c7" }],
                ],
                footers: [
                    "Total Net Cash/E-Payment Received",
                    totals.pay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                ],
            },

            // 2. Revenue by Payment Method
            {
                title: "Revenue by Payment Method",
                headers: financialHeaders("Payment Type"),
                rows: typeData.rows,
                footers: typeData.footers,
                emptyText: "No transactions found for selected period",
            },

            // 3. Revenue by Cashier / Operator
            {
                title: "Revenue by Cashier / Operator",
                headers: financialHeaders("Cashier / Operator"),
                rows: cashierData.rows,
                footers: cashierData.footers,
                emptyText: "No Data",
            },

            // 4. Revenue by Customer Accounts
            {
                title: "Revenue by Customer Accounts",
                headers: financialHeaders("Customer / Company"),
                rows: customerData.rows,
                footers: customerData.footers,
                emptyText: "No Data",
            },

            // 5. Revenue by Payment Status
            {
                title: "Revenue by Payment Status",
                headers: financialHeaders("Payment Status"),
                rows: statusData.rows,
                footers: statusData.footers,
                emptyText: "No Data",
            },

            // 6. Revenue by Parking Lot
            {
                title: "Revenue by Parking Lot",
                headers: financialHeaders("Parking Lot"),
                rows: parkingLotData.rows,
                footers: parkingLotData.footers,
                emptyText: "No Data",
            },

            // 7. Revenue Summary by Record Table
            {
                title: "Revenue Summary by Record Table",
                headers: financialHeaders("Record Table Type"),
                rows: recordTableData.rows,
                footers: recordTableData.footers,
                emptyText: "No Data",
            },
        ],
    });
};

document.addEventListener("DOMContentLoaded", async () => {
    initDatePicker();
    unity.initI18n();
    await load_account_summary_data();
});
