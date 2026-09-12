/**
 * access_logs.js - Access Activity Logs & Audit Controller
 * Handles TableModel initialization, multi-modality badge rendering, and real-time filtering
 */

import { TableModel } from "./_table_class.js";

let tableModel = null;

$(document).ready(function () {
    tableModel = new TableModel(
        "#tableAccessLogs",
        "/api/access/log/datatable",
        {
            table: "Access_Log",
            order: [[1, "desc"]], // Default sort by event_time desc
            columns: [
                {
                    data: "id",
                    name: "id",
                    title: "#",
                    className: "text-center font-mono font-bold text-xs",
                    render: function (data) {
                        return `<span class="font-mono text-base-content/40">#${data}</span>`;
                    }
                },
                {
                    data: "event_time",
                    name: "event_time",
                    title: "Date & Time",
                    render: function (data) {
                        if (!data) return "-";
                        const dateStr = data.substring(0, 10);
                        const timeStr = data.substring(11, 19);
                        return `<div class="font-mono"><span class="font-bold text-base-content">${timeStr}</span> <span class="text-[10px] text-base-content/50">${dateStr}</span></div>`;
                    }
                },
                {
                    data: "credential_type",
                    name: "credential_type",
                    title: "Modality",
                    className: "text-center",
                    render: function (data, type, row) {
                        const t = (data || "RFID_CARD").toUpperCase();
                        const isDuress = Boolean(row.credential_identifier && row.credential_identifier.includes('DURESS'));
                        if (isDuress) {
                            return '<span class="badge badge-xs badge-error font-bold font-mono gap-1 animate-pulse"><i class="fa-solid fa-triangle-exclamation"></i> DURESS PIN</span>';
                        }
                        if (t.includes("BLE")) {
                            return '<span class="badge badge-xs badge-secondary font-bold font-mono gap-1"><i class="fa-brands fa-bluetooth-b"></i> BLE</span>';
                        } else if (t.includes("NFC")) {
                            return '<span class="badge badge-xs badge-secondary font-bold font-mono gap-1"><i class="fa-solid fa-nfc-symbol"></i> NFC</span>';
                        } else if (t.includes("MOBILE")) {
                            return '<span class="badge badge-xs badge-secondary font-bold font-mono gap-1"><i class="fa-solid fa-mobile-screen"></i> Mobile</span>';
                        } else if (t.includes("FINGER")) {
                            return '<span class="badge badge-xs badge-accent font-bold font-mono gap-1"><i class="fa-solid fa-fingerprint"></i> Finger</span>';
                        } else if (t.includes("FACE")) {
                            return '<span class="badge badge-xs badge-info font-bold font-mono gap-1"><i class="fa-solid fa-camera"></i> Face</span>';
                        } else if (t.includes("PIN")) {
                            return '<span class="badge badge-xs badge-warning font-bold font-mono gap-1"><i class="fa-solid fa-hashtag"></i> PIN</span>';
                        } else {
                            return '<span class="badge badge-xs badge-primary font-bold font-mono gap-1"><i class="fa-solid fa-id-card"></i> RFID</span>';
                        }
                    }
                },
                {
                    data: "card_number",
                    name: "card_number",
                    title: "Identifier / Card",
                    render: function (data, type, row) {
                        const ident = row.credential_identifier ? `<div class="text-[10px] text-base-content/50 font-mono">${row.credential_identifier}</div>` : '';
                        return `<div><span class="font-mono badge badge-sm badge-neutral font-bold">${data || "-"}</span>${ident}</div>`;
                    }
                },
                {
                    data: "member_name",
                    name: "member_name",
                    title: "Cardholder",
                    render: function (data) {
                        return `<span class="font-bold text-base-content">${data || "Unknown"}</span>`;
                    }
                },
                {
                    data: "department",
                    name: "department",
                    title: "Department",
                    render: function (data) {
                        return data ? `<span class="badge badge-sm badge-soft">${data}</span>` : "-";
                    }
                },
                {
                    data: "door_name",
                    name: "door_name",
                    title: "Door / Gate",
                    render: function (data) {
                        return `<span class="font-semibold text-base-content">${data}</span>`;
                    }
                },
                {
                    data: "direction",
                    name: "direction",
                    title: "Direction",
                    render: function (data) {
                        const isIncoming = (data === "IN");
                        return `<span class="badge badge-xs ${isIncoming ? "badge-primary" : "badge-neutral"} font-mono font-bold">${data || "IN"}</span>`;
                    }
                },
                {
                    data: "result",
                    name: "result",
                    title: "Result",
                    render: function (data) {
                        const isGranted = (data === "GRANTED");
                        return `<span class="badge badge-sm ${isGranted ? "badge-success" : "badge-error"} font-bold gap-1">
                            <i class="${isGranted ? "fa-solid fa-check" : "fa-solid fa-xmark"}"></i> ${data}
                        </span>`;
                    }
                },
                {
                    data: "reason",
                    name: "reason",
                    title: "Verification Reason",
                    render: function (data, type, row) {
                        const isGranted = (row.result === "GRANTED");
                        return `<span class="${isGranted ? "text-success font-medium" : "text-error font-medium"}">${data || "-"}</span>`;
                    }
                },
                {
                    data: "event_type",
                    name: "event_type",
                    title: "Event Type",
                    render: function (data) {
                        return `<span class="badge badge-xs badge-outline font-mono text-[10px]">${data || "CARD_SWIPE"}</span>`;
                    }
                }
            ]
        }
    );

    // Set initial filters
    syncFilters();
    tableModel.init();
    window.table = tableModel.table;
    window.tableModel = tableModel;
});

export function syncFilters() {
    if (!tableModel) return;
    const res = $("#filterResult").val();
    const dir = $("#filterDirection").val();
    const cred = $("#filterCredType").val();

    tableModel.data_custom_filter = {
        result: res,
        direction: dir,
        credential_type: cred
    };

    // Update Excel export href
    let exportUrl = "/api/access/log/datatable?export=excel";
    if (res) exportUrl += `&result=${encodeURIComponent(res)}`;
    if (dir) exportUrl += `&direction=${encodeURIComponent(dir)}`;
    if (cred) exportUrl += `&credential_type=${encodeURIComponent(cred)}`;
    $("#btnExportExcel").attr("href", exportUrl);
}
window.syncFilters = syncFilters;

export function reloadTable() {
    if (tableModel) {
        syncFilters();
        tableModel.reload();
    }
}
window.reloadTable = reloadTable;
