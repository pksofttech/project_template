import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// Transaction Records Table
const transaction_model_table = new table_class.TableModel(
    "#transaction_table",
    "/api/transaction_record/datatable",
    {
        table: "Transaction_Record",
        // select: {
        //     style: "single",
        // },

        columns: [
            {
                data: "Transaction_Record.id",
                title: `<h3>Management</h3>`,
                orderable: false,
                className: "noExport",
                render: function (data, type, row) {
                    // console.log(row);
                    data = row.id;
                    if (row.status == "CHECK_IN") {
                        return `<div class="inline-flex border border-primary rounded-box shadow-sm" >
                                        <a class="btn btn-ghost btn-sm text-primary " onclick="infoTransactionShow(${data})"> <i class="fa-solid fa-circle-question "></i></a>
                                        <a class=" btn btn-ghost btn-sm text-error" onclick="transaction_parked_table_selete_close(${data})"><i class="far fa-pen-to-square "></i></a>
                                    </div>`;
                    } else if (row.status == "CLOSE" && row.type == "EMERGENCY") {
                        return `<div class="badge badge-error badge-soft badge-sm">EMERGENCY</div>`;
                    } else {
                        return `<div class="inline-flex border border-primary rounded-box shadow-sm" >
                                        <a class="text-primary btn btn-ghost btn-sm" onclick="infoTransactionShow(${data})"> <i class="fa-solid fa-circle-question"></i></a>
                                    </div>`;
                    }
                },
            },

            {
                data: "in_log.images_path",
                className: "noExport",
                title: `<h3>Image Record</h3>`,
                orderable: false,
                searchable: false,
                render: function (data, type, row) {
                    // unity.logger.debug(row);
                    data = row.images_path;
                    if (data) {
                        const in_images_paths = data.split(",");
                        return `<img loading="lazy" class="duration-500 ease-in rounded-box max-h-10 hover:scale-150" src="${in_images_paths[0]}" onclick="showPreviewImageView('${in_images_paths[0]}');" onerror="this.onerror=null;this.src='/static/image/Image_not_available.png';">`;
                    } else {
                        return "";
                    }
                },
            },

            {
                data: "Transaction_Record.id",
                title: `<h3>Transaction ID</h3>`,
                render: function (data, type, row) {
                    data = row.id;
                    const d = String(data).padStart(6, "0");
                    return `<div class=" text-info" >${d}</div>`;
                },
            },
            {
                data: "Transaction_Record.status",
                title: `<h3>Status</h3>`,
                render: function (data, type, row) {
                    data = row.status;
                    if (data == "SUCCESS") {
                        return `<i class="text-green-500 nav-icon fa fa-circle-check"></i> <span class="badge-success">${data}</span>`;
                    } else if (data == "CLOSE") {
                        return `<i class="text-orange-500 nav-icon fa fa-circle-xmark"></i> <span class="badge-warning">${data}</span>`;
                    } else if (data == "CHECK_IN") {
                        return `<i class="text-primary nav-icon fa fa-square-parking"></i> <span class="badge-info">PARKED</span>`;
                    } else {
                        return data;
                    }
                },
            },
            {
                data: "Transaction_Record.type",
                title: `<h3>Type</h3>`,

                render: function (data, type, row) {
                    data = row.type;
                    if (data == "VISITOR") {
                        const more_info = `<a class="link link-info tooltip tooltip-right" data-tip="${row.Visitor ? row.Visitor.name : "No Data"}">VISITOR</a>`;
                        return `<i class="text-orange-500 nav-icon fa fa-user-tie"></i>${more_info}`;
                    }
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
                data: "in_log.license",
                title: `<h3>License</h3>`,
                filter: { type: "text" },
                render: function (data, type, row) {
                    data = row.license;
                    return data ? data : "";
                },
            },
            // {
            //     data: "Transaction_Record.member_user_id",
            //     title: `<h3>member_user_id</h3>`,
            //     render: function (data, type, row) {
            //         data = row.member_user_id;
            //         return data;
            //     },
            // },
            {
                data: "Member_User.name",
                title: `<h3>Member User</h3>`,
                render: function (data, type, row) {
                    data = row.name;
                    return data;
                },
            },
            {
                data: "Parking_Lot.name",
                title: `<h3>Parking lot</h3>`,
                name: "parking_lot_name",
                render: function (data, type, row) {
                    return row.parking_lot_name;
                },
            },
            {
                data: "in_log.date_time",
                title: `<h3>Entry Time</h3>`,
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
                title: `<h3>Entry Gate</h3>`,
                name: "in_gate_name",
                render: function (data, type, row) {
                    return row.in_gate_name;
                },
            },
            {
                data: "in_log_system_user.name",
                title: `<h3>Operator</h3>`,
                name: "in_log_system_user_name",
                render: function (data, type, row) {
                    return row.in_log_system_user_name;
                },
            },
            {
                data: "out_log.date_time",
                title: `<h3>Exit Time</h3>`,
                render: function (data, type, row) {
                    data = row.date_time_1;
                    const _d = unity.dateTimeToStr(data);
                    if (_d == "") {
                        if (row.status == "CHECK_IN") {
                            return `<span class="bg-red-100 text-red-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-box dark:bg-red-900 dark:text-red-300">Still Parked</span>`;
                        } else {
                            const _remarks = row.remark.split(",").join("<br>");
                            return `<span class="badge-warning">${_remarks}</span>`;
                        }
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
                data: "out_gate.name",
                title: `<h3>Exit Gate</h3>`,
                name: "out_gate_name",
                render: function (data, type, row) {
                    return row.out_gate_name;
                },
            },
            {
                data: "out_log_system_user.name",
                title: `<h3>Operator</h3>`,
                name: "out_log_system_user_name",
                render: function (data, type, row) {
                    return row.out_log_system_user_name;
                },
            },
            {
                data: "Transaction_Record.parked",
                title: `<h3>Parking Time</h3>`,
                render: function (data, type, row) {
                    data = row.parked;
                    if (data) {
                        const duration = unity.secondsToDuration(data);
                        return `<i class="nav-icon fa fa-clock text-info"></i> <span class="badge-success">${duration}</span>`;
                    } else {
                        if (row.status == "CHECK_IN") {
                            return `<i class="nav-icon fa fa-clock text-info"></i> <span class="badge-warning">${unity.timeRef(row.date_time, row.date_time_1)}</span>`;
                        } else {
                            return "-";
                        }
                    }
                },
            },
            {
                title: "visitor",
                render: function (data, type, row) {
                    return row.Visitor ? row.Visitor.name : "No Data";
                },
            },
            {
                data: "contact_member_user.name",
                title: `<h3>Contact</h3>`,
                name: "contact",
                render: function (data, type, row) {
                    data = row.contact;
                    return data;
                },
            },

            {
                data: "Service_Fees.name",
                title: `<h3>Service Fees</h3>`,
                name: "service_fee_name",
                render: function (data, type, row) {
                    return row.service_fee_name || "No Service Fee";
                },
            },
            {
                data: "amount",
                title: `<h3>Amount</h3>`,
                render: function (data, type) {
                    if (data > 0) {
                        return `<i class="text-green-500 fa fa-money-bill-1-wave"></i> <span class="badge-success">${data}</span>`;
                    }
                    return "";
                },
            },
            {
                data: "Transaction_Record.code",
                title: "CODE",
                render: function (data, type, row) {
                    data = row.code;
                    if (data) {
                        return `<div class="badge-success">${data}</div>`;
                    } else {
                        return "";
                    }
                },
            },
            {
                data: "Transaction_Record.allow_data",
                title: "Allow",
                render: function (data, type, row) {
                    data = row.allow_data;
                    if (data) {
                        return `<div class="badge-success">${data}</div>`;
                    } else {
                        return "";
                    }
                },
            },
            {
                data: "Vehicle_Type.name",
                title: "Vehicle_Type",
                name: "Vehicle_Type_name",
                render: function (data, type, row) {
                    return row.Vehicle_Type_name;
                },
            },
            {
                data: "Fuel_Type.name",
                title: "Fuel_Type",
                name: "Fuel_Type_name",
                render: function (data, type, row) {
                    return row.Fuel_Type_name;
                },
            },
            {
                data: "Objective.name",
                title: "Objective",
                name: "Objective_name",
                render: function (data, type, row) {
                    return row.Objective_name;
                },
            },
            {
                data: "Transaction_Record.remark",
                title: `<h3>Remark</h3>`,
                render: function (data, type, row) {
                    data = row.remark || "";
                    return data.replace(/(?:\r\n|\r|\n)/g, "<br>");
                    // return data;
                },
            },
        ],
    },
    {
        add_btn_report_summary: { title: "Summary Report", fn: showTransactionSummaryReport },
    },
);

async function showTransactionSummaryReport(allData) {
    if (!allData || allData.length === 0) {
        unity.showToastNotification({ type: "warning", msg: "No table data available for summary report" });
        return;
    }

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
    const dateRangeInput = document.getElementById("select_date_time_range_of_build_transaction_report_table");
    const dateRangeText = dateRangeInput ? dateRangeInput.value || "All" : "All";

    // Extract operator name from UI or default
    const operatorName = document.querySelector('[data-field="username"]')?.textContent?.trim() || "Operator";
    const printDateTime = unity.dateTimeToStr(new Date().toISOString());

    // 2. Aggregate data grouped by type and status
    const summaryData = {};
    const statusSummaryData = {};
    let grandTotalCount = 0;
    let grandTotalAmount = 0;
    let grandTotalParkedDuration = 0;
    let validParkedCount = 0;

    allData.forEach((row) => {
        const typeKey = row.type || "Unassigned";
        const statusKey = row.status || "Unassigned";
        const amount = parseFloat(row.amount) || 0;
        const parkedDuration = parseFloat(row.parked) || 0;

        // Group by type
        if (!summaryData[typeKey]) {
            summaryData[typeKey] = {
                type: typeKey,
                count: 0,
                amount: 0,
                totalParked: 0,
                parkedCount: 0,
            };
        }
        summaryData[typeKey].count += 1;
        summaryData[typeKey].amount += amount;

        if (parkedDuration > 0) {
            summaryData[typeKey].totalParked += parkedDuration;
            summaryData[typeKey].parkedCount += 1;
            grandTotalParkedDuration += parkedDuration;
            validParkedCount += 1;
        }

        // Group by status
        if (!statusSummaryData[statusKey]) {
            statusSummaryData[statusKey] = {
                status: statusKey,
                count: 0,
            };
        }
        statusSummaryData[statusKey].count += 1;

        grandTotalCount += 1;
        grandTotalAmount += amount;
    });

    const sortedSummaryList = Object.values(summaryData).sort((a, b) => b.count - a.count);
    const sortedStatusSummaryList = Object.values(statusSummaryData).sort((a, b) => b.count - a.count);

    // Mapping for transaction_model_table.data_filter to Thai description
    let filterText = "-";
    const currentFilter = transaction_model_table.data_filter;
    if (currentFilter === "in_time") {
        filterText = "Entry Time";
    } else if (currentFilter === "out_time") {
        filterText = "Exit Time";
    } else if (currentFilter === "in_park") {
        filterText = "Currently Parked (Parked)";
    } else if (currentFilter === "out_park") {
        filterText = "All Transactions (Entry-Exit)";
    }

    const logoUrl = owner_info.logo ? owner_info.logo : "/static/favicon.svg";
    const systemName = owner_info.name || "Smart Parking System";
    const address = owner_info.address || "-";
    const phone = owner_info.phone || "-";
    const taxNo = owner_info.vat_no || "-";

    let htmlContent = `
        <div style="font-family: ${fontFamily}; color: ${colorText}; font-size: ${fsBody} !important; line-height: 1.3; padding: 5px 10px; box-sizing: border-box;">
            <!-- Company Header Template -->
            ${unity.peper_header_owner()}

            <!-- Report Parameters Summary Box -->
            <div style="background-color: ${colorBgParam}; border: 1px solid ${colorBorder}; border-radius: 4px; padding: 6px 12px; margin-bottom: 10px; font-size: ${fsParam} !important; display: flex; flex-wrap: wrap; gap: 10px 25px;">
                <div><b>Search Time Window:</b> ${dateRangeText}</div>
                <div><b>Filter Criteria:</b> Filtered by ${filterText}</div>
            </div>

            <!-- Summary Table: Grouped by Type -->
            <div class="print-no-break" style="margin-bottom: ${tableGap}; page-break-inside: avoid; break-inside: avoid;">
                <div style="font-weight: bold; margin-bottom: 6px; font-size: ${fsSectionTitle} !important; color: ${colorPrimary}; border-left: 3px solid ${colorPrimary}; padding-left: 6px;">
                    Transaction Summary by Vehicle/Member Type (Vehicle Breakdown)
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: ${fsTableBody} !important; border: 1px solid ${colorBorder};">
                    <thead>
                        <tr style="background-color: ${colorBgHeader}; border-bottom: 2px solid ${colorBorder}; color: ${colorText}; font-size: ${fsTableHead} !important; height: 24px;">
                            <th style="padding: ${cellPadding}; text-align: center; font-weight: bold; width: 60px; border: 1px solid ${colorBorder};">No.</th>
                            <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">Vehicle / Member Type</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 130px; border: 1px solid ${colorBorder};">Transaction Count</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 110px; border: 1px solid ${colorBorder};">Share (%)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    let rowIndex = 1;
    sortedSummaryList.forEach((row) => {
        const percentage = grandTotalCount > 0 ? ((row.count / grandTotalCount) * 100).toFixed(2) : "0.00";

        htmlContent += `
            <tr style="border-bottom: 1px solid ${colorBorder}; height: 22px;">
                <td style="padding: ${cellPadding}; text-align: center; border: 1px solid ${colorBorder};">${rowIndex++}</td>
                <td style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">${row.type}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${row.count.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${percentage}%</td>
            </tr>
        `;
    });

    htmlContent += `
            <tr style="background-color: ${colorBgAlt}; font-weight: bold; border-top: 2px solid ${colorBorder}; height: 22px;">
                <td colspan="2" style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">Grand Total:</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">${grandTotalCount.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">100.00%</td>
            </tr>
        </tbody>
        </table>
        </div>

        <!-- Summary Table: Grouped by Status -->
        <div class="print-no-break" style="margin-top: 15px; margin-bottom: ${tableGap}; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-weight: bold; margin-bottom: 6px; font-size: ${fsSectionTitle} !important; color: ${colorPrimary}; border-left: 3px solid ${colorPrimary}; padding-left: 6px;">
                Transaction Summary by Status (Status Breakdown)
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: ${fsTableBody} !important; border: 1px solid ${colorBorder};">
                <thead>
                    <tr style="background-color: ${colorBgHeader}; border-bottom: 2px solid ${colorBorder}; color: ${colorText}; font-size: ${fsTableHead} !important; height: 24px;">
                        <th style="padding: ${cellPadding}; text-align: center; font-weight: bold; width: 60px; border: 1px solid ${colorBorder};">No.</th>
                        <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">Transaction Status</th>
                        <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 130px; border: 1px solid ${colorBorder};">Transaction Count</th>
                        <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 110px; border: 1px solid ${colorBorder};">Share (%)</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let statusRowIndex = 1;
    sortedStatusSummaryList.forEach((row) => {
        const percentage = grandTotalCount > 0 ? ((row.count / grandTotalCount) * 100).toFixed(2) : "0.00";
        let statusText = row.status;
        if (row.status === "SUCCESS") statusText = "Completed (SUCCESS)";
        else if (row.status === "CHECK_IN") statusText = "Parked (CHECK_IN)";
        else if (row.status === "CHECK_OUT") statusText = "Exit Completed (CHECK_OUT)";

        htmlContent += `
            <tr style="border-bottom: 1px solid ${colorBorder}; height: 22px;">
                <td style="padding: ${cellPadding}; text-align: center; border: 1px solid ${colorBorder};">${statusRowIndex++}</td>
                <td style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">${statusText}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${row.count.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${percentage}%</td>
            </tr>
        `;
    });

    htmlContent += `
            <tr style="background-color: ${colorBgAlt}; font-weight: bold; border-top: 2px solid ${colorBorder}; height: 22px;">
                <td colspan="2" style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">Grand Total:</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">${grandTotalCount.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">100.00%</td>
            </tr>
        </tbody>
        </table>
        </div>
    `;

    // Document signature block (3 sections: Prepared By, Audited By, Approved By) (3 sections: Prepared By, Audited By, Approved By)
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

transaction_model_table.data_filter = "in_time";
window.transaction_data_filter = transaction_data_filter;
function transaction_data_filter(v) {
    transaction_model_table.data_filter = v;
    transaction_model_table.reload();
}
// Parking Occupancy Table
const transaction_parking_model_table = new table_class.TableModel(
    "#transaction_parked_table",

    "/api/transaction_record/datatable",
    {
        table: "Transaction_Record",
        // select: {
        //     style: "single",
        // },
        select: true,
        columns: [
            {
                data: "Transaction_Record.id",
                title: `<h3>Management</h3>`,
                className: "noExport",
                orderable: false,

                render: function (data, type, row) {
                    // console.log(row);
                    data = row.id;
                    if (row.status == "CHECK_IN") {
                        return `<div class="inline-flex border border-primary rounded-box shadow-sm" >
                                    <a class="btn btn-ghost btn-sm text-primary " onclick="infoTransactionShow(${data})"> <i class="fa-solid fa-circle-question "></i></a>
                                    <a class=" btn btn-ghost btn-sm text-error" onclick="transaction_parked_table_selete_close(${data})"><i class="far fa-pen-to-square "></i></a>
                                </div>`;
                    } else {
                        return `<div class="inline-flex border border-primary rounded-box shadow-sm" >
                                    <a class="text-primary btn btn-ghost btn-sm" onclick="infoTransactionShow(${data})"> <i class="fa-solid fa-circle-question"></i></a>
                                </div>`;
                    }
                },
            },
            {
                data: "in_log.images_path",
                title: `<h3>Image Record</h3>`,
                orderable: false,
                searchable: false,
                className: "noExport",
                render: function (data, type, row) {
                    // unity.logger.debug(row);
                    data = row.images_path;
                    if (data) {
                        const in_images_paths = data.split(",");
                        return `<img loading="lazy" class="duration-500 ease-in rounded-box max-h-10 hover:scale-150" src="${in_images_paths[0]}" onclick="showPreviewImageView('${in_images_paths[0]}');" onerror="this.onerror=null;this.src='/static/image/Image_not_available.png';" >`;
                    } else {
                        return "";
                    }
                },
            },
            {
                data: "Transaction_Record.type",
                title: `<h3>Type</h3>`,

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
                title: `<h3>Card ID</h3>`,
                render: function (data, type, row) {
                    data = row.card_id;
                    return data;
                },
            },
            {
                data: "in_log.license",
                title: `<h3>License</h3>`,
                filter: { type: "text" },
                render: function (data, type, row) {
                    data = row.license;
                    return data;
                },
            },
            {
                data: "Member_User.name",
                title: `<h3>Member</h3>`,
                render: function (data, type, row) {
                    data = row.name;
                    return data;
                },
            },
            {
                data: "Parking_Lot.name",
                title: `<h3>Parking lot</h3>`,
                name: "parking_lot_name",
                render: function (data, type, row) {
                    return row.parking_lot_name;
                },
            },
            {
                data: "in_log.date_time",
                title: `<h3>Entry Time</h3>`,
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
                title: `<h3>Entry Gate</h3>`,
                name: "in_gate_name",
                render: function (data, type, row) {
                    return row.in_gate_name;
                },
            },
            {
                data: "in_log_system_user.name",
                title: `<h3>Operator</h3>`,
                name: "in_log_system_user_name",
                render: function (data, type, row) {
                    return row.in_log_system_user_name;
                },
            },

            {
                data: "Transaction_Record.parked",
                title: `<h3>Parking Time</h3>`,
                render: function (data, type, row) {
                    data = row.parked;
                    if (data) {
                        const duration = unity.secondsToDuration(data);
                        return `<i class="nav-icon fa fa-clock text-info"></i> <span class="badge-success">${duration}</span>`;
                    } else {
                        if (row.status == "CHECK_IN") {
                            return `<i class="nav-icon fa fa-clock text-info"></i> <span class="badge-warning">${unity.timeRef(row.date_time, row.date_time_1)}</span>`;
                        } else {
                            return "-";
                        }
                    }
                },
            },
            {
                data: "Transaction_Record.contact",
                title: `<h3>Contact</h3>`,
                render: function (data, type, row) {
                    data = row.contact;
                    return data;
                },
            },

            {
                data: "Service_Fees.name",
                title: `<h3>Service Fees</h3>`,
                name: "service_fee_name",
                render: function (data, type, row) {
                    return row.service_fee_name || "No Service Fee";
                },
            },
            {
                data: "Transaction_Record.code",
                title: "CODE",
                render: function (data, type, row) {
                    data = row.code;
                    if (data) {
                        return `<div class="badge-success">${data}</div>`;
                    } else {
                        return "";
                    }
                },
            },
            {
                data: "Transaction_Record.remark",
                title: `<h3>Remark</h3>`,
                render: function (data, type, row) {
                    data = row.remark || "";
                    return data.replace(/(?:\r\n|\r|\n)/g, "<br>");
                    // return data;
                },
            },
            {
                data: "Transaction_Record.status",
                title: `<h3>Status</h3>`,
                render: function (data, type, row) {
                    data = row.status;
                    if (data == "SUCCESS") {
                        return `<i class="text-green-500 nav-icon fa fa-circle-check"></i> <span class="badge-success">${data}</span>`;
                    } else if (data == "CLOSE") {
                        return `<i class="text-orange-500 nav-icon fa fa-circle-xmark"></i> <span class="badge-warning">${data}</span>`;
                    } else if (data == "CHECK_IN") {
                        return `<i class="text-primary nav-icon fa fa-square-parking"></i> <span class="badge-info">PARKED</span>`;
                    } else {
                        return data;
                    }
                },
            },
        ],
    },
    {
        add_btn_report_summary: { title: "A4 Summary Report", fn: previewParkedSummaryReportA4 },
    },
);

transaction_parking_model_table.data_filter = "parked";

window.previewParkedSummaryReportA4 = previewParkedSummaryReportA4;
async function previewParkedSummaryReportA4(customData = null) {
    let parkedData = customData;
    if (!parkedData) {
        if (transaction_parking_model_table && transaction_parking_model_table.table) {
            parkedData = transaction_parking_model_table.table.rows({ search: "applied" }).data().toArray();
        }
    }

    if (!parkedData || parkedData.length === 0) {
        unity.showToastNotification({ type: "warning", msg: "No parked vehicle data available for A4 summary report" });
        return;
    }

    // Styles & Settings from unity.ReportSettings or defaults
    const fontFamily = unity.ReportSettings?.fontFamily || "'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', sans-serif";
    const colorPrimary = unity.ReportSettings?.colorPrimary || "#1e3a8a";
    const colorText = unity.ReportSettings?.colorText || "#1f2937";
    const colorTextLight = unity.ReportSettings?.colorTextLight || "#4b5563";
    const colorBorder = unity.ReportSettings?.colorBorder || "#cbd5e1";
    const colorBgHeader = unity.ReportSettings?.colorBgHeader || "#f1f5f9";
    const colorBgAlt = unity.ReportSettings?.colorBgAlt || "#f8fafc";
    const colorBgParam = unity.ReportSettings?.colorBgParam || "#f8fafc";

    const fsTitle = unity.ReportSettings?.fsTitle || "18px";
    const fsSectionTitle = unity.ReportSettings?.fsSectionTitle || "13px";
    const fsTableHead = unity.ReportSettings?.fsTableHead || "12px";
    const fsTableBody = unity.ReportSettings?.fsTableBody || "12px";
    const fsTableFoot = unity.ReportSettings?.fsTableFoot || "12px";
    const fsParam = unity.ReportSettings?.fsParam || "11px";
    const fsBody = unity.ReportSettings?.fsBody || "12px";

    const cellPadding = unity.ReportSettings?.cellPadding || "3px 6px";
    const tableGap = unity.ReportSettings?.tableGap || "10px";

    // Current Filter Name Map
    const currentFilter = transaction_parking_model_table.data_filter || "parked";
    let filterText = "All Parked Vehicles (All Parked)";
    if (currentFilter === "parked_overnight") filterText = "Overnight Parked (Overnight)";
    else if (currentFilter === "parked_abnormal") filterText = "Parked >24h (>24h)";
    else if (currentFilter === "parked_3days") filterText = "Parked >3 Days (>3 Days)";
    else if (currentFilter === "parked_7days") filterText = "Parked >7 Days (>7 Days)";

    const printDateTime = unity.dateTimeToStr(new Date().toISOString());

    // 1. Group summary by Type
    const typeSummary = {};
    let totalCount = parkedData.length;

    parkedData.forEach((row) => {
        const typeKey = row.type || "VISITOR";
        if (!typeSummary[typeKey]) {
            typeSummary[typeKey] = { type: typeKey, count: 0 };
        }
        typeSummary[typeKey].count += 1;
    });

    const sortedTypeSummary = Object.values(typeSummary).sort((a, b) => b.count - a.count);

    let htmlContent = `
        <div style="font-family: ${fontFamily}; color: ${colorText}; font-size: ${fsBody} !important; line-height: 1.3; padding: 5px 10px; box-sizing: border-box;">
            <!-- Report Header -->
            ${unity.peper_header_owner({ title: "Parked Vehicles Filtered Summary Report" })}

            <!-- Report Parameters Summary Box -->
            <div style="background-color: ${colorBgParam}; border: 1px solid ${colorBorder}; border-radius: 4px; padding: 6px 12px; margin-bottom: 10px; font-size: ${fsParam} !important; display: flex; flex-wrap: wrap; gap: 10px 25px;">
                <div><b>Active Filter:</b> ${filterText}</div>
                <div><b>Total Vehicles Found:</b> ${totalCount.toLocaleString()} vehicles</div>
                <div><b>Report Issue Date:</b> ${printDateTime}</div>
            </div>

            <!-- Summary Table: Grouped by User Type -->
            <div class="print-no-break" style="margin-bottom: ${tableGap}; page-break-inside: avoid; break-inside: avoid;">
                <div style="font-weight: bold; margin-bottom: 6px; font-size: ${fsSectionTitle} !important; color: ${colorPrimary}; border-left: 3px solid ${colorPrimary}; padding-left: 6px;">
                    Parked Vehicles Summary by User Type (User Type Breakdown)
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: ${fsTableBody} !important; border: 1px solid ${colorBorder};">
                    <thead>
                        <tr style="background-color: ${colorBgHeader}; border-bottom: 2px solid ${colorBorder}; color: ${colorText}; font-size: ${fsTableHead} !important; height: 24px;">
                            <th style="padding: ${cellPadding}; text-align: center; font-weight: bold; width: 50px; border: 1px solid ${colorBorder};">No.</th>
                            <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">Member / Vehicle Type</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 140px; border: 1px solid ${colorBorder};">Count (Vehicles)</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 120px; border: 1px solid ${colorBorder};">Share (%)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    let tIndex = 1;
    sortedTypeSummary.forEach((row) => {
        const pct = totalCount > 0 ? ((row.count / totalCount) * 100).toFixed(2) : "0.00";
        htmlContent += `
            <tr style="border-bottom: 1px solid ${colorBorder}; height: 22px;">
                <td style="padding: ${cellPadding}; text-align: center; border: 1px solid ${colorBorder};">${tIndex++}</td>
                <td style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">${row.type}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${row.count.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${pct}%</td>
            </tr>
        `;
    });

    htmlContent += `
            <tr style="background-color: ${colorBgAlt}; font-weight: bold; border-top: 2px solid ${colorBorder}; height: 22px;">
                <td colspan="2" style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">Grand Total:</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${totalCount.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">100.00%</td>
            </tr>
        </tbody>
        </table>
        </div>

        <!-- Detailed Parked Vehicles Table -->
        <div style="margin-bottom: ${tableGap};">
            <div style="font-weight: bold; margin-bottom: 6px; font-size: ${fsSectionTitle} !important; color: ${colorPrimary}; border-left: 3px solid ${colorPrimary}; padding-left: 6px;">
                Parked Vehicle Details (Parked Vehicles Breakdown)
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: ${fsTableBody} !important; border: 1px solid ${colorBorder};">
                <thead>
                    <tr style="background-color: ${colorBgHeader}; border-bottom: 2px solid ${colorBorder}; color: ${colorText}; font-size: ${fsTableHead} !important; height: 24px;">
                        <th style="padding: ${cellPadding}; text-align: center; font-weight: bold; width: 40px; border: 1px solid ${colorBorder};">#</th>
                        <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; width: 100px; border: 1px solid ${colorBorder};">License Plate</th>
                        <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; width: 100px; border: 1px solid ${colorBorder};">Type</th>
                        <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">Parking Lot</th>
                        <th style="padding: ${cellPadding}; text-align: center; font-weight: bold; width: 130px; border: 1px solid ${colorBorder};">Entry Time</th>
                        <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 120px; border: 1px solid ${colorBorder};">Duration</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let rIndex = 1;
    parkedData.forEach((row) => {
        const license = row.license || "-";
        const vType = row.type || "VISITOR";
        const lotName = row.parking_lot_name || "General Parking Lot";
        const entryTime = row.date_time ? unity.dateTimeToStr(row.date_time) : "-";
        const parkedSecs = row.parked || 0;
        let parkedDurationStr = "-";
        if (parkedSecs) {
            parkedDurationStr = unity.secondsToDuration(parkedSecs);
        } else if (row.date_time) {
            parkedDurationStr = unity.timeRef(row.date_time, row.date_time_1);
        }

        htmlContent += `
            <tr style="border-bottom: 1px solid ${colorBorder}; height: 22px;">
                <td style="padding: ${cellPadding}; text-align: center; border: 1px solid ${colorBorder};">${rIndex++}</td>
                <td style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">${license}</td>
                <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder};">${vType}</td>
                <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder};">${lotName}</td>
                <td style="padding: ${cellPadding}; text-align: center; border: 1px solid ${colorBorder};">${entryTime}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-weight: bold; color: ${colorPrimary};">${parkedDurationStr}</td>
            </tr>
        `;
    });

    htmlContent += `
                </tbody>
            </table>
        </div>

        <!-- Document Signature Block -->
        ${unity.peper_footer_owner()}
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

window.transaction_parked_filter = transaction_parked_filter;
function transaction_parked_filter(filterType) {
    transaction_parking_model_table.data_filter = filterType;

    const btnAll = document.getElementById("btn_parked_filter_all");
    const btnOvernight = document.getElementById("btn_parked_filter_overnight");
    const btnAbnormal = document.getElementById("btn_parked_filter_abnormal");
    const btn3Days = document.getElementById("btn_parked_filter_3days");
    const btn7Days = document.getElementById("btn_parked_filter_7days");

    if (btnAll)
        btnAll.className =
            filterType === "parked"
                ? "join-item btn btn-sm btn-primary active"
                : "join-item btn btn-sm btn-outline btn-primary";
    if (btnOvernight)
        btnOvernight.className =
            filterType === "parked_overnight"
                ? "join-item btn btn-sm btn-warning active"
                : "join-item btn btn-sm btn-outline btn-warning";
    if (btnAbnormal)
        btnAbnormal.className =
            filterType === "parked_abnormal"
                ? "join-item btn btn-sm btn-error active"
                : "join-item btn btn-sm btn-outline btn-error";
    if (btn3Days)
        btn3Days.className =
            filterType === "parked_3days"
                ? "join-item btn btn-sm btn-error active"
                : "join-item btn btn-sm btn-outline btn-error";
    if (btn7Days)
        btn7Days.className =
            filterType === "parked_7days"
                ? "join-item btn btn-sm btn-error active"
                : "join-item btn btn-sm btn-outline btn-error";

    transaction_parking_model_table.reload();
}

window.transaction_parked_type_filter = transaction_parked_type_filter;
function transaction_parked_type_filter(typeValue) {
    transaction_parking_model_table.data_type = typeValue || null;
    transaction_parking_model_table.reload();
}

async function initParkedTypeFilter() {
    const selectEl = document.getElementById("select_parked_type_filter");
    if (!selectEl) return;

    try {
        const res = await unity.fetchApi("/api/member/type", "get", null, "json");
        if (res && res.data) {
            selectEl.innerHTML = `<option value="">All (All Types)</option><option value="VISITOR">VISITOR</option>`;
            res.data.forEach((item) => {
                const typeName = item.name || item;
                if (typeName && String(typeName).toUpperCase() !== "VISITOR") {
                    const opt = document.createElement("option");
                    opt.value = typeName;
                    opt.textContent = typeName;
                    selectEl.appendChild(opt);
                }
            });
        }
    } catch (err) {
        console.error("Error loading member types for filter:", err);
    }
}

window.transaction_parked_table_selete = transaction_parked_table_selete;
async function transaction_parked_table_selete(v) {
    if (v) {
        transaction_parking_model_table.table.rows().select();
    } else {
        transaction_parking_model_table.table.rows().deselect();
    }
}

window.transaction_parked_table_selete_close = transaction_parked_table_selete_close;
async function transaction_parked_table_selete_close(id = null) {
    const table = transaction_parking_model_table.table;
    const c = id ? id : table.rows({ selected: true }).count();
    const rows = id ? "ID: " + id : "Selected: " + table.rows({ selected: true }).count() + " records";

    if (c) {
        const result = await unity.showDialogConfirm({
            title: "Confirm Force Close? : " + rows,
            confirm: "This action will affect multiple records. Please proceed with caution.",
        });
        if (result.confirm) {
            const content_html = `<label class="input input-bordered flex items-center gap-2">
                                    Remarks
                                    <input type="text" class="grow" data-field="returnValue" placeholder="Audit remarks" />
                                    </label>`;
            const comment = await unity.showDialogConfirm({ title: "Force Close Record", content: content_html });
            const confirm_remark = comment.value;
            if (!comment.confirm) return;
            if (confirm_remark) {
                let ids = "";
                if (id) {
                    ids = id;
                } else {
                    for (let i = 0; i < c; i++) {
                        const items = await table.rows({ selected: true }).data()[i].id;
                        ids += `${items},`;
                    }
                }

                unity.logger.debug(ids);
                const formData = new FormData();
                formData.append("ids", ids);
                formData.append("value", `close=${confirm_remark}`);

                const respond = await unity.fetchApi("/api/transaction_record/set", "post", formData, "json");
                if (respond.success) {
                    unity.showDialogSuccess({
                        title: "Operation Completed",
                        msg: `Successfully updated ${respond.data} records`,
                    });
                    transaction_parking_model_table.reload();
                    transaction_model_table.reload();
                }
                unity.logger.debug(respond);
            } else {
                unity.showDialogWarning({ title: "Remarks Required", msg: "Please enter remarks before proceeding" });
            }
        }
    } else {
        unity.showDialogError({ title: "No Records Selected", msg: "Please select records before proceeding" });
    }
}

// System User Transaction Table
let transaction_system_user_data_filter = "";
const transaction_system_user_model_table = new table_class.TableModel(
    "#transaction_report_system_user_table",
    "/api/transaction_record/report_system_user/datatable",
    {
        table: "Transaction_Record",
        columns: [
            {
                data: "group_in",
                title: "Entry Operator (IN)",
                //orderable: true,
                render: function (data, type, row) {
                    if (transaction_system_user_data_filter == "by_system_user_out") {
                        return "All";
                    }
                    return data;
                },
            },
            {
                data: "group_out",
                title: "Exit Operator (OUT)",
                //orderable: true,
                render: function (data, type, row) {
                    if (transaction_system_user_data_filter == "by_system_user_in") {
                        return "All";
                    }
                    if (!data) {
                        return "Parked / Inside Lot";
                    } else {
                        return data;
                    }
                },
            },
            {
                data: "count_transaction",
                title: "Count IN",
                render: function (data, type, row) {
                    return data;
                },
            },
            {
                data: "count_out_log",
                title: "Count OUT",
            },

            {
                data: "count_acc_log",
                title: "Count of amount",
            },
            {
                data: "total_amount",
                title: "Total amount",
            },
        ],
    },
    {
        add_btn_report_summary: { title: "Summary Report", fn: showTransactionByOperatorSummaryReport },
    },
);

async function showTransactionByOperatorSummaryReport(allData) {
    if (!allData || allData.length === 0) {
        unity.showToastNotification({ type: "warning", msg: "No table data available for summary report" });
        return;
    }

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
    const dateRangeInput = document.getElementById(
        "select_date_time_range_of_build_transaction_report_system_user_table",
    );
    const dateRangeText = dateRangeInput ? dateRangeInput.value || "All" : "All";

    // Extract operator name from UI or default
    const operatorName = document.querySelector('[data-field="username"]')?.textContent?.trim() || "Operator";
    const printDateTime = unity.dateTimeToStr(new Date().toISOString());

    // Mapping for transaction_system_user_model_table.data_filter to Thai description
    let filterText = "-";
    const currentFilter = transaction_system_user_model_table.data_filter;
    if (currentFilter === "by_system_user") {
        filterText = "All Operators (IN-OUT)";
    } else if (currentFilter === "by_system_user_in") {
        filterText = "Entry Operators (IN)";
    } else if (currentFilter === "by_system_user_out") {
        filterText = "Exit Operators (OUT)";
    }

    // 2. Calculate summary totals
    let grandTotalIn = 0;
    let grandTotalOut = 0;
    let grandTotalAcc = 0;
    let grandTotalAmount = 0;

    allData.forEach((row) => {
        grandTotalIn += parseInt(row.count_transaction) || 0;
        grandTotalOut += parseInt(row.count_out_log) || 0;
        grandTotalAcc += parseInt(row.count_acc_log) || 0;
        grandTotalAmount += parseFloat(row.total_amount) || 0;
    });

    const logoUrl = owner_info.logo ? owner_info.logo : "/static/favicon.svg";
    const systemName = owner_info.name || "Smart Parking System";
    const address = owner_info.address || "-";
    const phone = owner_info.phone || "-";
    const taxNo = owner_info.vat_no || "-";

    let htmlContent = `
        <div style="font-family: ${fontFamily}; color: ${colorText}; font-size: ${fsBody} !important; line-height: 1.3; padding: 5px 10px; box-sizing: border-box;">
            <!-- Company Header Template -->
            ${unity.peper_header_owner()}

            <!-- Report Parameters Summary Box -->
            <div style="background-color: ${colorBgParam}; border: 1px solid ${colorBorder}; border-radius: 4px; padding: 6px 12px; margin-bottom: 10px; font-size: ${fsParam} !important; display: flex; flex-wrap: wrap; gap: 10px 25px;">
                <div><b>Search Time Window:</b> ${dateRangeText}</div>
                <div><b>Filter Criteria:</b> Filtered by ${filterText}</div>
            </div>

            <!-- Summary Table: Grouped by Operators -->
            <div class="print-no-break" style="margin-bottom: ${tableGap}; page-break-inside: avoid; break-inside: avoid;">
                <div style="font-weight: bold; margin-bottom: 6px; font-size: ${fsSectionTitle} !important; color: ${colorPrimary}; border-left: 3px solid ${colorPrimary}; padding-left: 6px;">
                    Daily Transaction Summary by Operator (Operator Traffic Breakdown)
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: ${fsTableBody} !important; border: 1px solid ${colorBorder};">
                    <thead>
                        <tr style="background-color: ${colorBgHeader}; border-bottom: 2px solid ${colorBorder}; color: ${colorText}; font-size: ${fsTableHead} !important; height: 24px;">
                            <th style="padding: ${cellPadding}; text-align: center; font-weight: bold; width: 50px; border: 1px solid ${colorBorder};">No.</th>
                            <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">Entry Operator (IN)</th>
                            <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">Exit Operator (OUT)</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 100px; border: 1px solid ${colorBorder};">Count IN</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 100px; border: 1px solid ${colorBorder};">Count OUT</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 110px; border: 1px solid ${colorBorder};">Count billing</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 140px; border: 1px solid ${colorBorder};">Total amount (THB)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    let rowIndex = 1;
    allData.forEach((row) => {
        const displayIn = currentFilter === "by_system_user_out" ? "All" : row.group_in || "-";
        const displayOut = currentFilter === "by_system_user_in" ? "All" : row.group_out || "Parked / Inside Lot";
        const countIn = parseInt(row.count_transaction) || 0;
        const countOut = parseInt(row.count_out_log) || 0;
        const countAcc = parseInt(row.count_acc_log) || 0;
        const totalAmt = parseFloat(row.total_amount) || 0;

        htmlContent += `
            <tr style="border-bottom: 1px solid ${colorBorder}; height: 22px;">
                <td style="padding: ${cellPadding}; text-align: center; border: 1px solid ${colorBorder};">${rowIndex++}</td>
                <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder};">${displayIn}</td>
                <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder};">${displayOut}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${countIn.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${countOut.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${countAcc.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; font-weight: bold; color: ${colorPrimary}; border: 1px solid ${colorBorder};">${unity.toCurrency(totalAmt)}</td>
            </tr>
        `;
    });

    htmlContent += `
            <tr style="background-color: ${colorBgAlt}; font-weight: bold; border-top: 2px solid ${colorBorder}; height: 22px;">
                <td colspan="3" style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">Grand Total:</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">${grandTotalIn.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">${grandTotalOut.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">${grandTotalAcc.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; color: ${colorPrimary}; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">${unity.toCurrency(grandTotalAmount)}</td>
            </tr>
        </tbody>
        </table>
        </div>
    `;

    // Document signature block (3 sections: Prepared By, Audited By, Approved By) (3 sections: Prepared By, Audited By, Approved By)
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
transaction_system_user_model_table.data_filter = "by_system_user";
window.transaction_system_user_model_table_data_filter = transaction_system_user_model_table_data_filter;
function transaction_system_user_model_table_data_filter(v) {
    transaction_system_user_model_table.data_filter = v;
    console.log("🚀 transaction_system_user_model_table_data_filter", v);
    transaction_system_user_data_filter = v;
    transaction_system_user_model_table.reload();
}

// Gate Lane Transaction Table
let transaction_gate_data_filter = "";

window.transaction_gate_model_table_data_filter = transaction_gate_model_table_data_filter;
function transaction_gate_model_table_data_filter(v) {
    transaction_gate_model_table.data_filter = v;
    console.log("🚀 transaction_gate_model_table_data_filter", v);
    transaction_gate_data_filter = v;
    transaction_gate_model_table.reload();
}
const transaction_gate_model_table = new table_class.TableModel(
    "#transaction_report_gate_table",
    "/api/transaction_record/report/datatable",
    {
        table: "Transaction_Record",
        columns: [
            {
                data: "group_in",
                title: `<h3>Entry Gate</h3>`,
                //orderable: true,
                render: function (data, type, row) {
                    if (transaction_gate_data_filter == "by_gate_out") {
                        return "All";
                    }
                    return data;
                },
            },
            {
                data: "group_out",
                title: `<h3>Exit Gate</h3>`,
                //orderable: true,
                render: function (data, type, row) {
                    if (transaction_gate_data_filter == "by_gate_in") {
                        return "All";
                    }
                    if (!data) {
                        return "parked";
                    } else {
                        return data;
                    }
                },
            },
            {
                data: "count_transaction",
                title: "Count IN",
                render: function (data, type, row) {
                    return data;
                },
            },
            {
                data: "count_out_log",
                title: "Count OUT",
            },

            {
                data: "count_acc_log",
                title: "Count of amount",
            },
            {
                data: "total_amount",
                title: "Total amount",
            },
        ],
    },
    {
        add_btn_report_summary: { title: "Summary Report", fn: showTransactionByGateSummaryReport },
    },
);

async function showTransactionByGateSummaryReport(allData) {
    if (!allData || allData.length === 0) {
        unity.showToastNotification({ type: "warning", msg: "No table data available for summary report" });
        return;
    }

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
    const dateRangeInput = document.getElementById("select_date_time_range_of_build_transaction_report_gate_table");
    const dateRangeText = dateRangeInput ? dateRangeInput.value || "All" : "All";

    // Extract operator name from UI or default
    const operatorName = document.querySelector('[data-field="username"]')?.textContent?.trim() || "Operator";
    const printDateTime = unity.dateTimeToStr(new Date().toISOString());

    // Mapping for transaction_gate_model_table.data_filter to Thai description
    let filterText = "-";
    const currentFilter = transaction_gate_model_table.data_filter || transaction_gate_data_filter || "by_gate";
    if (currentFilter === "by_gate") {
        filterText = "Gate IN-OUT (Both Directions)";
    } else if (currentFilter === "by_gate_in") {
        filterText = "Gate IN (Entry Only)";
    } else if (currentFilter === "by_gate_out") {
        filterText = "Gate OUT (Exit Only)";
    }

    // 2. Calculate summary totals
    let grandTotalIn = 0;
    let grandTotalOut = 0;
    let grandTotalAcc = 0;
    let grandTotalAmount = 0;

    allData.forEach((row) => {
        grandTotalIn += parseInt(row.count_transaction) || 0;
        grandTotalOut += parseInt(row.count_out_log) || 0;
        grandTotalAcc += parseInt(row.count_acc_log) || 0;
        grandTotalAmount += parseFloat(row.total_amount) || 0;
    });

    const logoUrl = owner_info.logo ? owner_info.logo : "/static/favicon.svg";
    const systemName = owner_info.name || "Smart Parking System";
    const address = owner_info.address || "-";
    const phone = owner_info.phone || "-";
    const taxNo = owner_info.vat_no || "-";

    let htmlContent = `
        <div style="font-family: ${fontFamily}; color: ${colorText}; font-size: ${fsBody} !important; line-height: 1.3; padding: 5px 10px; box-sizing: border-box;">
            <!-- Company Header Template -->
            ${unity.peper_header_owner()}

            <!-- Report Parameters Summary Box -->
            <div style="background-color: ${colorBgParam}; border: 1px solid ${colorBorder}; border-radius: 4px; padding: 6px 12px; margin-bottom: 10px; font-size: ${fsParam} !important; display: flex; flex-wrap: wrap; gap: 10px 25px;">
                <div><b>Search Time Window:</b> ${dateRangeText}</div>
                <div><b>Filter Criteria:</b> Filtered by ${filterText}</div>
            </div>

            <!-- Summary Table: Grouped by Gate Lanes -->
            <div class="print-no-break" style="margin-bottom: ${tableGap}; page-break-inside: avoid; break-inside: avoid;">
                <div style="font-weight: bold; margin-bottom: 6px; font-size: ${fsSectionTitle} !important; color: ${colorPrimary}; border-left: 3px solid ${colorPrimary}; padding-left: 6px;">
                    Daily Transaction Summary by Gate (Gate Traffic Breakdown)
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: ${fsTableBody} !important; border: 1px solid ${colorBorder};">
                    <thead>
                        <tr style="background-color: ${colorBgHeader}; border-bottom: 2px solid ${colorBorder}; color: ${colorText}; font-size: ${fsTableHead} !important; height: 24px;">
                            <th style="padding: ${cellPadding}; text-align: center; font-weight: bold; width: 50px; border: 1px solid ${colorBorder};">No.</th>
                            <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">Entry Gate (IN)</th>
                            <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">Exit Gate (OUT)</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 100px; border: 1px solid ${colorBorder};">Count IN</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 100px; border: 1px solid ${colorBorder};">Count OUT</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 110px; border: 1px solid ${colorBorder};">Count of amount</th>
                            <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; width: 140px; border: 1px solid ${colorBorder};">Total amount (THB)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    let rowIndex = 1;
    allData.forEach((row) => {
        let displayIn = row.group_in || "-";
        if (currentFilter === "by_gate_out") {
            displayIn = "All";
        }
        let displayOut = row.group_out;
        if (currentFilter === "by_gate_in") {
            displayOut = "All";
        } else if (!displayOut) {
            displayOut = "parked";
        }
        const countIn = parseInt(row.count_transaction) || 0;
        const countOut = parseInt(row.count_out_log) || 0;
        const countAcc = parseInt(row.count_acc_log) || 0;
        const totalAmt = parseFloat(row.total_amount) || 0;

        htmlContent += `
            <tr style="border-bottom: 1px solid ${colorBorder}; height: 22px;">
                <td style="padding: ${cellPadding}; text-align: center; border: 1px solid ${colorBorder};">${rowIndex++}</td>
                <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder};">${displayIn}</td>
                <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder};">${displayOut}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${countIn.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${countOut.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${countAcc.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; font-weight: bold; color: ${colorPrimary}; border: 1px solid ${colorBorder};">${unity.toCurrency(totalAmt)}</td>
            </tr>
        `;
    });

    htmlContent += `
            <tr style="background-color: ${colorBgAlt}; font-weight: bold; border-top: 2px solid ${colorBorder}; height: 22px;">
                <td colspan="3" style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">Grand Total:</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">${grandTotalIn.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">${grandTotalOut.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">${grandTotalAcc.toLocaleString()}</td>
                <td style="padding: ${cellPadding}; text-align: right; color: ${colorPrimary}; border: 1px solid ${colorBorder}; font-size: ${fsTableFoot} !important;">${unity.toCurrency(grandTotalAmount)}</td>
            </tr>
        </tbody>
        </table>
        </div>
    `;

    // Document signature block (3 sections: Prepared By, Audited By, Approved By) (3 sections: Prepared By, Audited By, Approved By)
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
window.showTransactionByGateSummaryReport = showTransactionByGateSummaryReport;

// ! ------------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("TRANSACTION_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("TRANSACTION_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

window.loadTransactionReportKPICards = loadTransactionReportKPICards;
async function loadTransactionReportKPICards() {
    try {
        const res = await unity.fetchApi("/api/transaction_record/stat", "get", null, "json");
        if (res && res.data) {
            let totalIn = 0;
            let totalOut = 0;
            let totalParked = 0;

            res.data.forEach((item) => {
                totalIn += item.in_today || 0;
                totalOut += item.out_today || 0;
                totalParked += item.parked || 0;
            });

            const totalAll = totalIn + totalOut + totalParked;

            const elTotal = document.getElementById("kpi_total_transactions");
            const elIn = document.getElementById("kpi_gate_in_count");
            const elOut = document.getElementById("kpi_gate_out_count");
            const elParked = document.getElementById("kpi_parked_count");

            if (elTotal) elTotal.textContent = totalAll.toLocaleString();
            if (elIn) elIn.textContent = totalIn.toLocaleString();
            if (elOut) elOut.textContent = totalOut.toLocaleString();
            if (elParked) elParked.textContent = totalParked.toLocaleString();
        }
    } catch (e) {
        console.error("Error loading KPI cards:", e);
    }
}

async function Init() {
    table_class.init_table_model_with_datatime_picker(
        transaction_system_user_model_table,
        "#select_date_time_range_of_build_transaction_report_system_user_table",
    );

    table_class.init_table_model_with_datatime_picker(
        transaction_gate_model_table,
        "#select_date_time_range_of_build_transaction_report_gate_table",
    );

    table_class.init_table_model_with_datatime_picker(
        transaction_model_table,
        "#select_date_time_range_of_build_transaction_report_table",
    );

    transaction_parking_model_table.init();
    await initParkedTypeFilter();
    loadTransactionReportKPICards();

    if (localStorage.getItem("TRANSACTION_TAB_ACTIVE")) {
        const v = localStorage.getItem("TRANSACTION_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    } else {
        document.getElementById("TRANSACTION_TAB01").checked = true;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
