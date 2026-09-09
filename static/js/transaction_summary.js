import * as unity from "./unity.js";

let fp = null;
let lastSummaryData = null;

// Initialize Date Range Picker
function initDatePicker() {
    const config = unity.getFlatpickrConfigWithEmbeddedRanges();
    config.defaultDate = [dayjs().startOf("day").toDate(), dayjs().endOf("day").toDate()];

    const inputEl = document.querySelector("#select_date_time_range_of_build_transaction_summary_table");
    let reloadTimer = null;
    const scheduleReload = () => {
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
            load_summary_data();
        }, 200);
    };
    if (inputEl) {
        fp = flatpickr(inputEl, {
            ...config,
            onClose: (selectedDates, dateStr, instance) => {
                console.log("Date range updated:", dateStr);
                scheduleReload();
            },
        });

        // Formulate initial string
        const startStr = dayjs().startOf("day").format("YYYY/MM/DD HH:mm");
        const endStr = dayjs().endOf("day").format("YYYY/MM/DD HH:mm");
        inputEl.value = `${startStr} - ${endStr}`;
    }
}

// Load Summary Data from Endpoint
window.load_summary_data = async function () {
    const inputEl = document.querySelector("#select_date_time_range_of_build_transaction_summary_table");
    if (!inputEl) return;

    const dateRange = inputEl.value;
    if (!dateRange) {
        unity.showToastNotification({ type: "warning", msg: "Please select date range" });
        return;
    }

    unity.showDialogLoading("Loading data...");
    try {
        const response = await fetch(
            `/api/transaction_record/summary_report?date_range=${encodeURIComponent(dateRange)}`,
        );
        const result = await response.json();

        if (result.success) {
            lastSummaryData = result;
            updateTotals(result.totals);
            updateTypeTable(result.by_type);
            updateGateTable(result.by_gate);
            updateOperatorTable(result.by_operator);
            updateParkingLotTable(result.by_parking_lot);
        } else {
            unity.showToastNotification({ type: "error", msg: result.msg || "Error loading summary data" });
        }
    } catch (error) {
        console.error("Error loading summary:", error);
        unity.showToastNotification({ type: "error", msg: "Unable to connect to server" });
    } finally {
        unity.closeDialogLoading();
    }
};

// Update KPI Stats Cards
function updateTotals(totals) {
    document.getElementById("stat_total_entries").innerText = totals.entries.toLocaleString();
    document.getElementById("stat_total_exits").innerText = totals.exits.toLocaleString();
    document.getElementById("stat_parked_now").innerText = totals.parked.toLocaleString();
    document.getElementById("stat_total_revenue").innerText = totals.revenue.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Populate Vehicle / Member Type Table
function updateTypeTable(data) {
    const tbody = document.querySelector("#table_summary_by_vehicle_type tbody");
    tbody.innerHTML = "";

    let totalEntries = 0;
    let totalExits = 0;
    let totalParked = 0;
    let totalRevenue = 0.0;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-base-content/50">No transaction data available for this time range</td></tr>`;
    } else {
        data.forEach((item) => {
            const entries = parseInt(item.entries || 0);
            const exits = parseInt(item.exits || 0);
            const parked = parseInt(item.parked || 0);
            const revenue = parseFloat(item.revenue || 0);

            totalEntries += entries;
            totalExits += exits;
            totalParked += parked;
            totalRevenue += revenue;

            const row = document.createElement("tr");
            row.className = "hover:bg-base-50/50 transition-colors";
            row.innerHTML = `
                <td class="p-4 font-semibold text-base-content/95">${item.vehicle_type || "General (VISITOR)"}</td>
                <td class="p-4 text-right font-medium">${entries.toLocaleString()}</td>
                <td class="p-4 text-right font-medium">${exits.toLocaleString()}</td>
                <td class="p-4 text-right font-medium text-warning">${parked.toLocaleString()}</td>
                <td class="p-4 text-right font-bold text-success">${revenue.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Update grand totals
    document.getElementById("total_vehicle_entries").innerText = totalEntries.toLocaleString();
    document.getElementById("total_vehicle_exits").innerText = totalExits.toLocaleString();
    document.getElementById("total_vehicle_parked").innerText = totalParked.toLocaleString();
    document.getElementById("total_vehicle_revenue").innerText = totalRevenue.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Populate Gateway Traffic Table
function updateGateTable(data) {
    const tbody = document.querySelector("#table_summary_by_gateway tbody");
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-base-content/50">No transaction data available for this time range</td></tr>`;
    } else {
        data.forEach((item) => {
            const count = parseInt(item.count || 0);
            const isEntry = item.direction === "IN";
            const dirBadge = isEntry
                ? `<span class="badge badge-primary gap-1 font-bold"><i class="fa-solid fa-arrow-right-to-bracket text-xs"></i> Entry (IN) (IN)</span>`
                : `<span class="badge badge-success gap-1 font-bold text-white"><i class="fa-solid fa-arrow-right-from-bracket text-xs"></i> Exit (OUT) (OUT)</span>`;

            const row = document.createElement("tr");
            row.className = "hover:bg-base-50/50 transition-colors";
            row.innerHTML = `
                <td class="p-4 font-semibold text-base-content/95">${item.gateway_name || "General Gate"}</td>
                <td class="p-4">${dirBadge}</td>
                <td class="p-4 text-right font-bold text-primary">${count.toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Populate Operator processed table
function updateOperatorTable(data) {
    const tbody = document.querySelector("#table_summary_by_operator tbody");
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-base-content/50">No transaction data available for this time range</td></tr>`;
    } else {
        data.forEach((item) => {
            const entries = parseInt(item.entries || 0);
            const exits = parseInt(item.exits || 0);

            const row = document.createElement("tr");
            row.className = "hover:bg-base-50/50 transition-colors";
            row.innerHTML = `
                <td class="p-4 font-semibold text-base-content/95">${item.operator_name || "Automated System"}</td>
                <td class="p-4 text-right font-medium text-primary">${entries.toLocaleString()}</td>
                <td class="p-4 text-right font-medium text-success">${exits.toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Populate Parking Lot Summary Table
function updateParkingLotTable(data) {
    const tbody = document.querySelector("#table_summary_by_parking_lot tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-base-content/50">No transaction data available for this time range</td></tr>`;
    } else {
        data.forEach((item) => {
            const entries = parseInt(item.entries || 0);
            const exits = parseInt(item.exits || 0);
            const parked = parseInt(item.parked || 0);

            const row = document.createElement("tr");
            row.className = "hover:bg-base-50/50 transition-colors";
            row.innerHTML = `
                <td class="p-4 font-semibold text-base-content/95">${item.parking_lot_name || "General Parking Lot"}</td>
                <td class="p-4 text-right font-medium text-primary">${entries.toLocaleString()}</td>
                <td class="p-4 text-right font-medium text-success">${exits.toLocaleString()}</td>
                <td class="p-4 text-right font-medium text-warning">${parked.toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    initDatePicker();
    unity.initI18n();
    await load_summary_data();
});

// Preview A4 Summary Report transaction_summary
window.previewSummaryReportA4 = async function () {
    const inputEl = document.querySelector("#select_date_time_range_of_build_transaction_summary_table");
    if (!inputEl) return;

    if (!lastSummaryData) {
        await load_summary_data();
    }

    if (!lastSummaryData) {
        unity.showToastNotification({ type: "warning", msg: "No summary data available for report preview" });
        return;
    }

    const dateRange = inputEl.value;
    const totals = lastSummaryData.totals || { entries: 0, exits: 0, parked: 0, revenue: 0 };
    const byType = lastSummaryData.by_type || [];
    const byGate = lastSummaryData.by_gate || [];
    const byOperator = lastSummaryData.by_operator || [];
    const byParkingLot = lastSummaryData.by_parking_lot || [];

    // Calculate Grand Total for byType
    let sumTypeEntries = 0;
    let sumTypeExits = 0;
    let sumTypeParked = 0;
    let sumTypeRevenue = 0;

    const typeRows = byType.map((item) => {
        const entries = parseInt(item.entries || 0);
        const exits = parseInt(item.exits || 0);
        const parked = parseInt(item.parked || 0);
        const revenue = parseFloat(item.revenue || 0);

        sumTypeEntries += entries;
        sumTypeExits += exits;
        sumTypeParked += parked;
        sumTypeRevenue += revenue;

        return [
            { text: item.vehicle_type || "General (VISITOR)", bold: true, align: "left" },
            entries.toLocaleString(),
            exits.toLocaleString(),
            parked.toLocaleString(),
            { text: revenue.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), bold: true },
        ];
    });

    const typeFooters =
        byType.length > 0
            ? [
                  "Grand Total:",
                  sumTypeEntries.toLocaleString(),
                  sumTypeExits.toLocaleString(),
                  sumTypeParked.toLocaleString(),
                  sumTypeRevenue.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              ]
            : [];

    // Calculate Grand Total for byParkingLot
    let sumLotEntries = 0;
    let sumLotExits = 0;
    let sumLotParked = 0;

    const lotRows = byParkingLot.map((item) => {
        const entries = parseInt(item.entries || 0);
        const exits = parseInt(item.exits || 0);
        const parked = parseInt(item.parked || 0);

        sumLotEntries += entries;
        sumLotExits += exits;
        sumLotParked += parked;

        return [
            { text: item.parking_lot_name || "General Parking Lot", bold: true, align: "left" },
            entries.toLocaleString(),
            exits.toLocaleString(),
            parked.toLocaleString(),
        ];
    });

    const lotFooters =
        byParkingLot.length > 0
            ? [
                  "Grand Total:",
                  sumLotEntries.toLocaleString(),
                  sumLotExits.toLocaleString(),
                  sumLotParked.toLocaleString(),
              ]
            : [];

    // Render using universal summary report engine
    unity.renderSummaryReportA4({
        title: "Transaction Summary Report",
        dateRange: dateRange,
        sections: [
            // 1. Overall KPI Summary Table
            {
                title: "Overall Traffic & Revenue Summary",
                headers: [
                    { label: "Transaction Type", align: "left" },
                    { label: "Count (Vehicles/Transactions)", align: "right", width: "150px" },
                    { label: "Total Revenue (THB)", align: "right", width: "180px" },
                ],
                rows: [
                    [{ text: "Total Entries", bold: true, align: "left" }, totals.entries.toLocaleString(), "-"],
                    [{ text: "Total Exits", bold: true, align: "left" }, totals.exits.toLocaleString(), "-"],
                    [{ text: "Currently Parked", bold: true, align: "left" }, totals.parked.toLocaleString(), "-"],
                ],
                footers: [
                    "Total Net Revenue",
                    "-",
                    totals.revenue.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                ],
            },

            // 2. Summary by Vehicle / Member Type
            {
                title: "Summary by Vehicle/Member Type",
                headers: [
                    { label: "Vehicle / Member Type", align: "left" },
                    { label: "Entries (IN)", align: "right", width: "100px" },
                    { label: "Exits (OUT)", align: "right", width: "100px" },
                    { label: "Parked", align: "right", width: "100px" },
                    { label: "Revenue (THB)", align: "right", width: "130px" },
                ],
                rows: typeRows,
                footers: typeFooters,
                emptyText: "No transaction data available for this time range",
            },

            // 3. Two-Column Layout: Traffic by Gate Lane & Staff Operator
            {
                type: "grid-2",
                columns: [
                    {
                        title: "Traffic by Gate Lane",
                        headers: [
                            { label: "Gate Lane", align: "left" },
                            { label: "Direction", align: "center", width: "80px" },
                            { label: "Count", align: "right", width: "80px" },
                        ],
                        rows: byGate.map((item) => [
                            item.gateway_name || "General Gate",
                            { text: item.direction === "IN" ? "Entry (IN)" : "Exit (OUT)", align: "center" },
                            { text: parseInt(item.count || 0).toLocaleString(), bold: true, align: "right" },
                        ]),
                        emptyText: "No Data",
                    },
                    {
                        title: "Traffic by Staff Operator",
                        headers: [
                            { label: "Staff Operator", align: "left" },
                            { label: "Entries", align: "right", width: "80px" },
                            { label: "Exits", align: "right", width: "80px" },
                        ],
                        rows: byOperator.map((item) => [
                            { text: item.operator_name || "Automated System", bold: true, align: "left" },
                            parseInt(item.entries || 0).toLocaleString(),
                            parseInt(item.exits || 0).toLocaleString(),
                        ]),
                        emptyText: "No Data",
                    },
                ],
            },

            // 4. Occupancy by Parking Lot
            {
                title: "Occupancy by Parking Lot",
                headers: [
                    { label: "Parking Lot", align: "left" },
                    { label: "Entries", align: "right", width: "100px" },
                    { label: "Exits", align: "right", width: "100px" },
                    { label: "Parked", align: "right", width: "100px" },
                ],
                rows: lotRows,
                footers: lotFooters,
                emptyText: "No Data",
            },
        ],
    });
};
