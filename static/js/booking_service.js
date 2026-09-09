import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// Initialize Table Model for Booking Visitor
const booking_visitor_model_table = new table_class.TableModel(
    "#booking_visitor_table",
    "/api/visitor/booking/datatable",
    {
        table: "Booking_Visitor",
        columns: [
            {
                data: "id",
                title: "Actions",
                orderable: false,
                render: function (data, type, row) {
                    // Generates Edit/Delete buttons dynamically using the core actionButtonsTemplate helper
                    return table_class.actionButtonsTemplate(data);
                },
            },
            {
                data: "card_id",
                title: "License Plate / Card ID",
                render: function (data) {
                    return `<strong>${data}</strong>`;
                },
            },
            {
                data: "visitor_name",
                title: "Visitor Name",
            },
            {
                data: "status",
                title: "Status",
                render: function (data) {
                    switch (data) {
                        case "REGISTER":
                            return `<span class="badge badge-info font-bold">${data}</span>`;
                        case "CHECK_IN":
                            return `<span class="badge badge-warning font-bold text-white">${data}</span>`;
                        case "CHECK_OUT":
                            return `<span class="badge badge-success font-bold">${data}</span>`;
                        case "EXPIRED":
                            return `<span class="badge badge-error font-bold">${data}</span>`;
                        default:
                            return `<span class="badge badge-secondary">${data}</span>`;
                    }
                },
            },
            {
                data: "booking_type",
                title: "Booking Privilege Type",
                render: function (data) {
                    if (data === "ONE-TIME-BOOKING") {
                        return `<span class="badge badge-outline badge-info font-medium">🚗 ONE-TIME</span>`;
                    }
                    return `<span class="badge badge-outline badge-primary font-medium">🚘 ALL-TIME</span>`;
                },
            },
            {
                data: "member_name",
                title: "Resident Reference",
                render: function (data) {
                    return data || `<span class="text-error font-semibold">Unassigned</span>`;
                },
            },
            {
                data: "objective_name",
                title: "Purpose",
            },
            {
                data: "service_fees_name",
                title: "Service Fee",
                render: function (data) {
                    return data || "No Service Fee";
                },
            },
            {
                data: "start_date_time",
                title: "📅 Start Date",
                render: function (data) {
                    return unity.dateTimeToStr(data);
                },
            },
            {
                data: "expire_date_time",
                title: "📅 Expiry Date",
                render: function (data) {
                    return unity.dateTimeToStr(data);
                },
            },
            {
                data: "remark",
                title: "Remarks",
            },
        ],
    },
    {
        addbtn: true,
    }
);

// Bind dialog and API endpoints
booking_visitor_model_table.create_item_control({
    modal_from: Modal_Booking_Visitor,
    api_endpoint: "/api/visitor/booking",
});

// Expose table globally
window.booking_visitor_model_table = booking_visitor_model_table;

// Populates selects options inside modal from DB models endpoints
async function init_select_option() {
    unity.init_select_option(Modal_Booking_Visitor, "/api/service_fees", "service_fees_id");
    
    // Member users list for reference select option
    unity.init_selects_option(
        [Modal_Booking_Visitor.querySelector('[data-field="member_user_id"]')],
        "/api/member/user"
    );
    
    unity.init_selects_option(
        [Modal_Booking_Visitor.querySelector('[data-field="objective_id"]')], 
        "/api/objective"
    );
    
    unity.init_select_option(Modal_Booking_Visitor, "/api/vehicle_type", "vehicle_type_id");
    unity.init_select_option(Modal_Booking_Visitor, "/api/fuel_type", "fuel_type_id");
}

// Preview Booking Visitor Report A4
window.previewBookingVisitorReportA4 = async function () {
    unity.showDialogLoading("Preparing summary report...");
    try {
        const result = await unity.fetchApi("/api/visitor/booking/datatable?start=0&length=100000", "get", null, "json");
        if (!result || !result.data) {
            unity.showToastNotification({ type: "warning", msg: "No booking data available for report preview" });
            return;
        }

        const data = result.data;
        
        // Calculate status counts
        const statusCounts = {};
        data.forEach(item => {
            const status = item.status || "REGISTER";
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        // Report styling variables
        const fontFamily = unity.ReportSettings?.fontFamily || "'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', sans-serif";
        const colorPrimary = unity.ReportSettings?.colorPrimary || "#1e3a8a";
        const colorText = unity.ReportSettings?.colorText || "#1f2937";
        const colorTextLight = unity.ReportSettings?.colorTextLight || "#4b5563";
        const colorBorder = unity.ReportSettings?.colorBorder || "#cbd5e1";
        const colorBgHeader = unity.ReportSettings?.colorBgHeader || "#f1f5f9";
        const colorBgAlt = unity.ReportSettings?.colorBgAlt || "#f8fafc";
        const cellPadding = "4px 6px";
        const fsTitle = "18px";
        const fsSectionTitle = "13px";
        const fsTableHead = "11px";
        const fsTableBody = "11px";
        const tableGap = "14px";

        // Build HTML output
        let htmlContent = `
            <div style="font-family: ${fontFamily}; color: ${colorText}; line-height: 1.3; font-size: 13px;">
                <!-- System Owner Header Template -->
                ${unity.peper_header_owner()}

                <!-- Report Title -->
                <div style="text-align: center; margin-top: 15px; margin-bottom: 15px;">
                    <h3 style="margin: 0; font-size: ${fsTitle} !important; font-weight: bold; color: ${colorPrimary};">
                        Advance Visitor Booking Summary Report (Booking Visitor Summary Report)
                    </h3>
                    <div style="font-size: 12px; color: ${colorTextLight}; margin-top: 4px;">
                        Report Print Date: ${dayjs().format("YYYY-MM-DD HH:mm:ss")}
                    </div>
                </div>

                <!-- Report Parameters -->
                <div style="background-color: ${colorBgAlt}; border: 1px solid ${colorBorder}; padding: 10px; border-radius: 6px; margin-bottom: ${tableGap}; font-size: 12px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="width: 50%;"><b>Total Bookings:</b> ${data.length} records</td>
                            <td style="width: 50%; text-align: right;"><b>Operator:</b> System Operator (SYSTEM OPERATOR)</td>
                        </tr>
                    </table>
                </div>

                <!-- Summary Table by Status -->
                <div class="print-no-break" style="margin-bottom: ${tableGap}; page-break-inside: avoid; break-inside: avoid;">
                    <div style="font-weight: bold; margin-bottom: 6px; font-size: ${fsSectionTitle} !important; color: ${colorPrimary}; border-left: 3px solid ${colorPrimary}; padding-left: 6px;">
                        Summary by Booking Status (Booking Status Breakdown)
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: ${fsTableBody} !important; border: 1px solid ${colorBorder};">
                        <thead>
                            <tr style="background-color: ${colorBgHeader}; border-bottom: 2px solid ${colorBorder}; color: ${colorText}; font-size: ${fsTableHead} !important; height: 26px;">
                                <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">Status</th>
                                <th style="padding: ${cellPadding}; text-align: right; font-weight: bold; border: 1px solid ${colorBorder}; width: 150px;">Transaction Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(statusCounts).map(status => `
                                <tr style="border-bottom: 1px solid ${colorBorder}; height: 24px;">
                                    <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder}; font-weight: bold;">${status}</td>
                                    <td style="padding: ${cellPadding}; text-align: right; border: 1px solid ${colorBorder};">${statusCounts[status].toLocaleString()} records</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

                <!-- Booking Privileges Detail Table -->
                <div class="print-no-break" style="margin-bottom: ${tableGap}; page-break-inside: avoid; break-inside: avoid;">
                    <div style="font-weight: bold; margin-bottom: 6px; font-size: ${fsSectionTitle} !important; color: ${colorPrimary}; border-left: 3px solid ${colorPrimary}; padding-left: 6px;">
                        Advance Booking Details (Booking Details Breakdown)
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: ${fsTableBody} !important; border: 1px solid ${colorBorder};">
                        <thead>
                            <tr style="background-color: ${colorBgHeader}; border-bottom: 2px solid ${colorBorder}; color: ${colorText}; font-size: ${fsTableHead} !important; height: 26px;">
                                <th style="padding: ${cellPadding}; text-align: center; font-weight: bold; border: 1px solid ${colorBorder}; width: 30px;">#</th>
                                <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder}; width: 90px;">License Plate / Card ID</th>
                                <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder}; width: 110px;">Visitor Name</th>
                                <th style="padding: ${cellPadding}; text-align: center; font-weight: bold; border: 1px solid ${colorBorder}; width: 70px;">Status</th>
                                <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder}; width: 100px;">Member Privilege Reference</th>
                                <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder}; width: 90px;">Purpose</th>
                                <th style="padding: ${cellPadding}; text-align: left; font-weight: bold; border: 1px solid ${colorBorder};">Start - Expiration Date</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (data.length === 0) {
            htmlContent += `
                <tr style="height: 24px;">
                    <td colspan="7" style="padding: ${cellPadding}; text-align: center; border: 1px solid ${colorBorder}; color: ${colorTextLight};">No advance booking reservations found in system</td>
                </tr>
            `;
        } else {
            data.forEach((item, idx) => {
                const s_dt = unity.dateTimeToStr(item.start_date_time);
                const e_dt = unity.dateTimeToStr(item.expire_date_time);
                const bg = idx % 2 === 1 ? colorBgAlt : "#ffffff";
                
                htmlContent += `
                    <tr style="background-color: ${bg}; border-bottom: 1px solid ${colorBorder}; height: 24px;">
                        <td style="padding: ${cellPadding}; text-align: center; border: 1px solid ${colorBorder};">${idx + 1}</td>
                        <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder}; font-weight: bold;">${item.card_id}</td>
                        <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder};">${item.visitor_name || "Unassigned"}</td>
                        <td style="padding: ${cellPadding}; text-align: center; border: 1px solid ${colorBorder}; font-weight: bold;">${item.status}</td>
                        <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder};">${item.member_name || "-"}</td>
                        <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder};">${item.objective_name || "-"}</td>
                        <td style="padding: ${cellPadding}; text-align: left; border: 1px solid ${colorBorder}; font-size: 10px;">
                            Start: ${s_dt}<br>Expires: ${e_dt}
                        </td>
                    </tr>
                `;
            });
        }

        htmlContent += `
                        </tbody>
                    </table>
                </div>

                <!-- Document Signatures and Footer -->
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
    } catch (error) {
        console.error("Error building report:", error);
        unity.showToastNotification({ type: "error", msg: "Unable to generate summary report" });
    } finally {
        unity.closeDialogLoading();
    }
};


async function Init() {
    await init_select_option();
    booking_visitor_model_table.init();
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
