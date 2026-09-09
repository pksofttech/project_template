import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// Transaction E-Stamp Table
const transaction_estamp_model_table = new table_class.TableModel(
    "#transaction_estamp_table",
    "/api/estamp_device/datatable",
    {
        table: "Estamp_Record_Log",
        // select: {
        //     style: "single",
        // },
        select: true,
        columns: [
            {
                data: "Estamp_Record_Log.id",
                title: `<h3>Record ID</h3>`,
                render: function (data, type, row) {
                    data = row.id;
                    return String(data).padStart(10, "0");
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
                data: "Log_Transaction.license",
                title: `<h3>License</h3>`,
                render: function (data, type, row) {
                    data = row.license;
                    return data;
                },
            },

            {
                data: "Estamp_Record_Log.date_time",
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
                data: "Estamp_Device.device_name",
                title: `<h3>E-Stamp Device</h3>`,
                render: function (data, type, row) {
                    data = row.device_name;
                    if (data == null) {
                        return "TERMINAL-POS<br>CASHIER-POS";
                    }
                    return data;
                },
            },

            {
                data: "Transaction_Record.id",
                title: `<h3>Transaction ID</h3>`,
                orderable: false,
                render: function (data, type, row) {
                    data = row.id_1;
                    return `<a role=button onclick="infoTransactionShow(${data})"  class="inline-flex items-center font-medium text-blue-600 dark:text-primary hover:underline">
                            ${String(data).padStart(6, "0")}
                            <svg aria-hidden="true" class="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                            </a>`;
                },
            },
            {
                data: "before_service_fees.name",
                title: "Before " + `<h3>Service Fees</h3>`,
                name: "before_service_fees",
                render: function (data, type, row) {
                    return row.before_service_fees;
                },
            },
            {
                data: "Service_Fees.name",
                title: `<h3>Service Fees</h3>`,
                name: "after_service_fees",
                render: function (data, type, row) {
                    return row.after_service_fees;
                },
            },

            {
                data: "System_Users.name",
                title: `<h3>Operator</h3>`,
                name: "system_users_name",
                render: function (data, type, row) {
                    return row.system_users_name;
                },
            },

            {
                data: "Estamp_Record_Log.log",
                title: `<h3>Remark</h3>`,
                render: function (data, type, row) {
                    data = row.log;
                    return data;
                },
            },
        ],
    },
    {
        add_btn_report_summary: { title: "Summary Report", fn: showEstampRecordSummaryReport },
    },
);

async function showEstampRecordSummaryReport(allData) {
    if (!allData || allData.length === 0) {
        unity.showToastNotification({ type: "warning", msg: "No table data found for summary report" });
        return;
    }
    console.log(allData);

    // 0. Configuration variables for fonts, colors, and layout (easily customizable)
    const fontFamily = unity.ReportSettings?.fontFamily;
    const colorPrimary = unity.ReportSettings?.colorPrimary;
    const colorText = unity.ReportSettings?.colorText;
    const colorTextLight = unity.ReportSettings?.colorTextLight;
    const colorBorder = unity.ReportSettings?.colorBorder;
    const colorBgHeader = unity.ReportSettings?.colorBgHeader;
    const colorBgAlt = unity.ReportSettings?.colorBgAlt;
    const colorBgParam = unity.ReportSettings?.colorBgParam;
    const colorAccent = unity.ReportSettings?.colorAccent;

    const fsTitle = unity.ReportSettings?.fsTitle;
    const fsSubtitle = unity.ReportSettings?.fsSubtitle;
    const fsSectionTitle = unity.ReportSettings?.fsSectionTitle;
    const fsTableHead = unity.ReportSettings?.fsTableHead;
    const fsTableBody = unity.ReportSettings?.fsTableBody;
    const fsTableFoot = unity.ReportSettings?.fsTableFoot;
    const fsParam = unity.ReportSettings?.fsParam;
    const fsSignature = unity.ReportSettings?.fsSignature;
    const fsBody = unity.ReportSettings?.fsBody;
    const fsSmall = unity.ReportSettings?.fsSmall;

    const cellPadding = unity.ReportSettings?.cellPadding;
    const tableGap = unity.ReportSettings?.tableGap;

    // 1. Extract filter parameters from UI
    const dateRangeInput = document.getElementById("select_date_time_range_of_build_transaction_report_estamp_table");
    const dateRangeText = dateRangeInput ? dateRangeInput.value || "All" : "All";

    // Extract operator name from UI or default
    const operatorName = document.querySelector('[data-field="username"]')?.textContent?.trim() || "Operator";
    const printDateTime = unity.dateTimeToStr(new Date().toISOString());

    // 2. Process summary totals
    const deviceSummary = {};
    const feeSummary = {};

    allData.forEach((row) => {
        const device = row.device_name || "TERMINAL-POS / CASHIER-POS";
        const fee = row.after_service_fees || "Unassigned";

        deviceSummary[device] = (deviceSummary[device] || 0) + 1;
        feeSummary[fee] = (feeSummary[fee] || 0) + 1;
    });

    let htmlContent = `
        <div style="font-family: ${fontFamily}; color: ${colorText}; font-size: ${fsBody} !important; line-height: 1.3; padding: 5px 10px; box-sizing: border-box;">
            <!-- Company Header Template -->
            ${unity.peper_header_owner()}

            <!-- Report Parameters Summary Box -->
            <div style="background-color: ${colorBgParam}; border: 1px solid ${colorBorder}; border-radius: 4px; padding: 6px 12px; margin-bottom: 10px; font-size: ${fsParam} !important; display: flex; flex-wrap: wrap; gap: 10px 25px;">
                <div><b>Search Time Window:</b> ${dateRangeText}</div>
                <div><b>Total Transactions:</b> ${allData.length.toLocaleString()} records</div>
            </div>
    `;

    // Summary Statistics Sub-Tables
    htmlContent += `
        <!-- Summary by E-Stamp Device -->
        <div class="print-no-break" style="margin-top: 15px; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-weight: bold; margin-bottom: 6px; font-size: ${fsSectionTitle} !important; color: ${colorPrimary}; border-left: 3px solid ${colorPrimary}; padding-left: 6px;">
                Summary by E-Stamp Device (Device Breakdown)
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: ${fsTableBody} !important; border: 1px solid ${colorBorder};">
                <thead>
                    <tr style="background-color: ${colorBgHeader}; border-bottom: 2px solid ${colorBorder}; color: ${colorText}; font-size: ${fsTableHead} !important; height: 22px;">
                        <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">E-Stamp Device</th>
                        <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 120px; border: 1px solid ${colorBorder};">Transactions</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(deviceSummary)
                        .map(
                            ([device, count]) => `
                        <tr style="border-bottom: 1px solid ${colorBorder}; height: 20px;">
                            <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder};">${device}</td>
                            <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${count.toLocaleString()}</td>
                        </tr>
                    `,
                        )
                        .join("")}
                </tbody>
            </table>
        </div>

        <!-- Summary by E-Stamp Privilege -->
        <div class="print-no-break" style="margin-top: 20px; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-weight: bold; margin-bottom: 6px; font-size: ${fsSectionTitle} !important; color: ${colorPrimary}; border-left: 3px solid ${colorPrimary}; padding-left: 6px;">
                Summary by E-Stamp Privilege (Privilege Breakdown)
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: ${fsTableBody} !important; border: 1px solid ${colorBorder};">
                <thead>
                    <tr style="background-color: ${colorBgHeader}; border-bottom: 2px solid ${colorBorder}; color: ${colorText}; font-size: ${fsTableHead} !important; height: 22px;">
                        <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">Granted E-Stamp Privilege</th>
                        <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 120px; border: 1px solid ${colorBorder};">Transactions</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(feeSummary)
                        .map(
                            ([fee, count]) => `
                        <tr style="border-bottom: 1px solid ${colorBorder}; height: 20px;">
                            <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder};">${fee}</td>
                            <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${count.toLocaleString()}</td>
                        </tr>
                    `,
                        )
                        .join("")}
                </tbody>
            </table>
        </div>
    `;

    // Document signature block (3 sections: Prepared By, Audited By, Approved By)
    htmlContent += unity.peper_footer_owner();
    // 5. Close block
    htmlContent += "</div>";

    // 4. Render output in preview container
    const printArea = document.getElementById("Summary_Report_Print_Area");
    if (printArea) {
        printArea.innerHTML = htmlContent;
    }

    const modal = document.getElementById("Modal_Summary_Report_A4");
    if (modal) {
        modal.showModal();
    }
}
// ! ------------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("TRANSACTION_ESTAMP_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("TRANSACTION_ESTAMP_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

async function Init() {
    table_class.init_table_model_with_datatime_picker(
        transaction_estamp_model_table,
        "#select_date_time_range_of_build_transaction_report_estamp_table",
    );

    if (localStorage.getItem("TRANSACTION_ESTAMP_TAB_ACTIVE")) {
        const v = localStorage.getItem("TRANSACTION_ESTAMP_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    } else {
        document.getElementById("TRANSACTION_ESTAMP_TAB01").checked = true;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
