import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

const HEADERS = await unity.getHeaders();

// =========================================================================
// 📌 1. Initialize DataTable for Parking Lots
// =========================================================================
const parking_model_table = new table_class.TableModel(
    "#parking_lot_table",
    "/api/parking/datatable",
    {
        table: "Parking_Lot",
        columns: [
            {
                data: "Parking_Lot.id",
                title: `<h3 class="font-bold text-xs uppercase">Management</h3>`,
                orderable: false,
                className: "text-center whitespace-nowrap",
                render: function (data, type, row) {
                    return `
                        <div class="inline-flex border border-base-300 bg-base-100 rounded-box shadow-xs" role="group">
                            <button class="btn btn-ghost btn-xs sm:btn-sm control-edit-btn" title="Edit Parking Lot" data-id="${row.id}">
                                <i class="fas fa-pen text-primary"></i>
                            </button>
                            <button class="btn btn-ghost btn-xs sm:btn-sm control-remove-btn" title="Delete Parking Lot" data-id="${row.id}">
                                <i class="far fa-trash-alt text-error"></i>
                            </button>
                        </div>`;
                },
            },
            {
                data: "Parking_Lot.id",
                title: "ID",
                className: "font-mono text-center font-bold text-xs",
                render: (data, type, row) =>
                    `<span class="badge badge-ghost badge-sm font-mono font-bold">#${row.id}</span>`,
            },
            {
                data: "Parking_Lot.name",
                title: "Parking Lot / Zone",
                render: (data, type, row) => `
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-box bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            <i class="fa-solid fa-square-parking"></i>
                        </div>
                        <div>
                            <span class="font-bold text-sm text-base-content block">${row.name || "-"}</span>
                            <span class="text-[11px] text-base-content/50">${row.detail || "No description"}</span>
                        </div>
                    </div>`,
            },
            {
                data: "Parking_Lot.limit",
                title: "Max Capacity",
                className: "text-center",
                render: (data, type, row) => `
                    <span class="badge badge-info badge-soft font-mono font-bold text-xs px-2.5 py-1">
                        ${(row.limit || 0).toLocaleString()} Slots
                    </span>`,
            },
            {
                data: "Parking_Lot.value",
                title: "Current Parked",
                className: "text-center",
                render: (data, type, row) => `
                    <span class="badge badge-warning badge-soft font-mono font-bold text-xs px-2.5 py-1">
                        ${(row.value || 0).toLocaleString()} Vehicles
                    </span>`,
            },
            {
                data: "Parking_Lot.id",
                title: "Available",
                className: "text-center",
                orderable: false,
                render: (data, type, row) => {
                    const limit = row.limit || 0;
                    const value = row.value || 0;
                    const available = Math.max(0, limit - value);
                    const colorClass =
                        available <= 0 ? "badge-error" : available < limit * 0.2 ? "badge-warning" : "badge-success";
                    return `
                        <span class="badge ${colorClass} badge-soft font-mono font-bold text-xs px-2.5 py-1">
                            ${available.toLocaleString()} Free
                        </span>`;
                },
            },
            {
                data: "Parking_Lot.id",
                title: "Occupancy Rate",
                className: "text-center min-w-[140px]",
                orderable: false,
                render: (data, type, row) => {
                    const limit = row.limit || 0;
                    const value = row.value || 0;
                    const rate = limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : 0;
                    let progressClass = "progress-success";
                    let badgeClass = "badge-success";
                    let label = "Available";

                    if (rate >= 100) {
                        progressClass = "progress-error";
                        badgeClass = "badge-error";
                        label = "Full";
                    } else if (rate >= 80) {
                        progressClass = "progress-warning";
                        badgeClass = "badge-warning";
                        label = "Busy";
                    } else if (rate >= 50) {
                        progressClass = "progress-info";
                        badgeClass = "badge-info";
                        label = "Moderate";
                    }

                    return `
                        <div class="flex flex-col gap-1 items-center">
                            <div class="flex items-center justify-between w-full text-[11px] font-bold">
                                <span class="badge ${badgeClass} badge-xs font-bold">${label}</span>
                                <span class="font-mono">${rate}%</span>
                            </div>
                            <progress class="progress ${progressClass} w-full h-2 rounded-full" value="${rate}" max="100"></progress>
                        </div>`;
                },
            },
        ],
    },
    {
        addbtn: true,
        addbtn_extra_id: "btn_add_parking_lot_top",
    },
);

const modalElement = document.getElementById("Modal_Parking_Lot");
parking_model_table.create_item_control({
    modal_from: modalElement,
    api_endpoint: "/api/parking",
});

// =========================================================================
// 🚫 2. Initialize DataTable for Restriction Rules
// =========================================================================
const restriction_model_table = new table_class.TableModel(
    "#parking_restriction_table",
    "/api/parking/restriction/datatable",
    {
        table: "Parking_Lot_Restriction",
        columns: [
            {
                data: "Parking_Lot_Restriction.id",
                title: `<h3 class="font-bold text-xs uppercase">Management</h3>`,
                orderable: false,
                className: "text-center whitespace-nowrap",
                render: function (data, type, row) {
                    return `
                        <div class="inline-flex border border-base-300 bg-base-100 rounded-box shadow-xs" role="group">
                            <button class="btn btn-ghost btn-xs sm:btn-sm control-edit-btn" title="Edit Restriction Rule" data-id="${row.id}">
                                <i class="fas fa-pen text-primary"></i>
                            </button>
                            <button class="btn btn-ghost btn-xs sm:btn-sm control-remove-btn" title="Delete Restriction Rule" data-id="${row.id}">
                                <i class="far fa-trash-alt text-error"></i>
                            </button>
                        </div>`;
                },
            },
            {
                data: "Parking_Lot_Restriction.rule_name",
                title: "Rule Name & Description",
                render: (data, type, row) => `
                    <div class="space-y-0.5">
                        <div class="flex items-center gap-1.5">
                            <span class="font-bold text-sm text-base-content">${row.rule_name || "-"}</span>
                            ${row.priority > 1 ? `<span class="badge badge-neutral badge-xs font-mono">P${row.priority}</span>` : ""}
                        </div>
                        <span class="text-[11px] text-base-content/60 block max-w-xs truncate">${row.description || "No description"}</span>
                    </div>`,
            },
            {
                data: "Parking_Lot_Restriction.parking_id",
                title: "Scope",
                render: (data, type, row) => `
                    <div class="space-y-1 text-xs">
                        <div class="flex items-center gap-1">
                            <i class="fa-solid fa-square-parking text-primary text-[10px]"></i>
                            <span class="font-bold">${row.parking_name || "All Lots"}</span>
                        </div>
                        <div class="flex items-center gap-1 text-[11px] text-base-content/60">
                            <i class="fa-solid fa-door-open text-info text-[10px]"></i>
                            <span>${row.gateway_name || "All Gateways"}</span>
                        </div>
                    </div>`,
            },
            {
                data: "Parking_Lot_Restriction.id",
                title: "Restricted Criteria",
                orderable: false,
                render: (data, type, row) => {
                    const badges = [];
                    if (row.objective_id && row.objective_name && row.objective_name !== "-") {
                        badges.push(
                            `<span class="badge badge-warning badge-soft badge-xs font-bold gap-1"><i class="fa-solid fa-bullseye text-[9px]"></i> Obj: ${row.objective_name}</span>`,
                        );
                    }
                    if (row.member_type_id && row.member_type_name && row.member_type_name !== "-") {
                        badges.push(
                            `<span class="badge badge-secondary badge-soft badge-xs font-bold gap-1"><i class="fa-solid fa-id-card text-[9px]"></i> Member: ${row.member_type_name}</span>`,
                        );
                    }
                    if (row.vehicle_type_id && row.vehicle_type_name && row.vehicle_type_name !== "-") {
                        badges.push(
                            `<span class="badge badge-accent badge-soft badge-xs font-bold gap-1"><i class="fa-solid fa-truck text-[9px]"></i> Veh: ${row.vehicle_type_name}</span>`,
                        );
                    }
                    if (row.fuel_type_id && row.fuel_type_name && row.fuel_type_name !== "-") {
                        badges.push(
                            `<span class="badge badge-error badge-soft badge-xs font-bold gap-1"><i class="fa-solid fa-gas-pump text-[9px]"></i> Fuel: ${row.fuel_type_name}</span>`,
                        );
                    }
                    if (row.target_group && row.target_group !== "ALL") {
                        badges.push(
                            `<span class="badge badge-primary badge-soft badge-xs font-bold">${row.target_group}</span>`,
                        );
                    }
                    if (badges.length === 0) {
                        return `<span class="text-[11px] text-base-content/40 italic">All Matching Group</span>`;
                    }
                    return `<div class="flex flex-wrap gap-1 max-w-xs">${badges.join("")}</div>`;
                },
            },
            {
                data: "Parking_Lot_Restriction.start_time",
                title: "Schedule",
                render: (data, type, row) => `
                    <div class="text-xs font-mono space-y-0.5">
                        <div class="font-bold text-info">${row.start_time || "00:00"} - ${row.end_time || "23:59"}</div>
                        <div class="text-[10px] text-base-content/50">${row.days_of_week === "mon,tue,wed,thu,fri,sat,sun" ? "Everyday" : row.days_of_week}</div>
                    </div>`,
            },
            {
                data: "Parking_Lot_Restriction.action_type",
                title: "Action & Message",
                render: (data, type, row) => {
                    const isDeny = row.action_type === "DENY_BARRIER";
                    const badgeClass = isDeny ? "badge-error" : "badge-warning";
                    const label = isDeny ? "Reject Entry" : "Alert Guard";
                    return `
                        <div class="space-y-1 max-w-xs">
                            <span class="badge ${badgeClass} badge-soft badge-xs font-bold">${label}</span>
                            <span class="text-[11px] text-base-content/60 block truncate" title="${row.deny_message}">${row.deny_message || "-"}</span>
                        </div>`;
                },
            },
            {
                data: "Parking_Lot_Restriction.is_active",
                title: "Status",
                className: "text-center",
                render: (data, type, row) => {
                    const checked = row.is_active ? "checked" : "";
                    return `
                        <input type="checkbox" class="toggle toggle-error toggle-sm" ${checked} onchange="window.toggle_rule_active(${row.id}, this.checked)" />`;
                },
            },
        ],
    },
    {
        addbtn: true,
        addbtn_extra_id: "btn_add_restriction_rule_top",
    },
);

const restrictionModalElement = document.getElementById("Modal_Parking_Lot_Restriction");
restriction_model_table.create_item_control({
    modal_from: restrictionModalElement,
    api_endpoint: "/api/parking/restriction",
});

// =========================================================================
// 📜 3. Initialize DataTable for Denied Logs
// =========================================================================
const denied_model_table = new table_class.TableModel("#parking_denied_table", "/api/parking/denied/datatable", {
    table: "Parking_Denied",
    columns: [
        {
            data: "Parking_Denied.id",
            title: `<h3 class="font-bold text-xs uppercase">Action</h3>`,
            orderable: false,
            className: "text-center whitespace-nowrap",
            render: function (data, type, row) {
                if (row.status === "DENIED") {
                    return `
                            <button class="btn btn-warning btn-xs font-bold gap-1 rounded-btn" onclick="window.open_denied_override_modal(${row.id})">
                                <i class="fa-solid fa-unlock-keyhole text-[10px]"></i>
                                <span>Override</span>
                            </button>`;
                }
                return `<span class="badge badge-success badge-soft badge-xs font-bold">Resolved</span>`;
            },
        },
        {
            data: "Parking_Denied.denied_date_time",
            title: "Time",
            className: "font-mono text-xs font-bold",
            render: (data, type, row) => {
                const dt = row.denied_date_time || "";
                return `<span class="text-base-content/80">${dt.replace("T", " ").substring(0, 19)}</span>`;
            },
        },
        {
            data: "Parking_Denied.license_plate",
            title: "Plate / Card ID",
            render: (data, type, row) => `
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-box bg-error/10 text-error flex items-center justify-center font-bold text-sm shrink-0">
                            <i class="fa-solid fa-ban"></i>
                        </div>
                        <div>
                            <span class="font-mono font-black text-sm text-base-content block">${row.license_plate || row.card_id || "-"}</span>
                            <span class="text-[10px] text-base-content/50">${row.vehicle_type || "Vehicle"}</span>
                        </div>
                    </div>`,
        },
        {
            data: "Parking_Denied.reason_code",
            title: "Reason & Detail",
            render: (data, type, row) => `
                    <div class="space-y-0.5 max-w-sm">
                        <span class="badge badge-error badge-outline badge-xs font-bold uppercase tracking-wider">${row.reason_code || "DENIED"}</span>
                        <p class="text-xs text-base-content/70 leading-tight">${row.reason_detail || "-"}</p>
                    </div>`,
        },
        {
            data: "Parking_Denied.gateway_id",
            title: "Gate & Zone",
            render: (data, type, row) => `
                    <div class="text-xs space-y-0.5">
                        <div class="font-bold flex items-center gap-1">
                            <i class="fa-solid fa-door-open text-info text-[10px]"></i>
                            <span>${row.gateway_name || "-"}</span>
                        </div>
                        <div class="text-[11px] text-base-content/50 flex items-center gap-1">
                            <i class="fa-solid fa-square-parking text-primary text-[10px]"></i>
                            <span>${row.parking_name || "-"}</span>
                        </div>
                    </div>`,
        },
        {
            data: "Parking_Denied.status",
            title: "Status & Audit",
            render: (data, type, row) => {
                if (row.status === "OVERRIDDEN") {
                    return `
                            <div class="space-y-0.5 text-xs">
                                <span class="badge badge-warning badge-sm font-bold">OVERRIDDEN</span>
                                <span class="text-[10px] text-base-content/60 block">By: ${row.override_user_name || "Guard"}</span>
                                <span class="text-[10px] text-base-content/50 block truncate max-w-xs italic">"${row.override_reason || ""}"</span>
                            </div>`;
                }
                return `<span class="badge badge-error badge-sm font-bold">DENIED</span>`;
            },
        },
    ],
});

// =========================================================================
// 🔄 4. Load Dropdown Options for Restriction Form
// =========================================================================
async function load_restriction_form_options() {
    try {
        const response = await fetch("/api/parking/restriction/options", { headers: HEADERS });
        const res = await response.json();
        if (res.success && res.data) {
            const d = res.data;

            // 1. Parking Lots
            const elLots = document.querySelector("#Modal_Parking_Lot_Restriction select[data-field='parking_id']");
            if (elLots) {
                elLots.innerHTML =
                    `<option value="">All Parking Lots (Global Rule)</option>` +
                    (d.parking_lots || []).map((l) => `<option value="${l.id}">${l.name}</option>`).join("");
            }

            // 2. Gateways
            const elGates = document.querySelector("#Modal_Parking_Lot_Restriction select[data-field='gateway_id']");
            if (elGates) {
                elGates.innerHTML =
                    `<option value="">All Gateways</option>` +
                    (d.gateways || []).map((g) => `<option value="${g.id}">${g.name} (${g.type})</option>`).join("");
            }

            // 3. Objectives
            const elObjs = document.querySelector("#Modal_Parking_Lot_Restriction select[data-field='objective_id']");
            if (elObjs) {
                elObjs.innerHTML =
                    `<option value="">Any Objective</option>` +
                    (d.objectives || []).map((o) => `<option value="${o.id}">${o.name}</option>`).join("");
            }

            // 4. Member Types
            const elMtypes = document.querySelector(
                "#Modal_Parking_Lot_Restriction select[data-field='member_type_id']",
            );
            if (elMtypes) {
                elMtypes.innerHTML =
                    `<option value="">Any Member Type</option>` +
                    (d.member_types || []).map((m) => `<option value="${m.id}">${m.name}</option>`).join("");
            }

            // 5. Vehicle Types
            const elVtypes = document.querySelector(
                "#Modal_Parking_Lot_Restriction select[data-field='vehicle_type_id']",
            );
            if (elVtypes) {
                elVtypes.innerHTML =
                    `<option value="">Any Vehicle Type</option>` +
                    (d.vehicle_types || []).map((v) => `<option value="${v.id}">${v.name}</option>`).join("");
            }

            // 6. Fuel Types
            const elFtypes = document.querySelector("#Modal_Parking_Lot_Restriction select[data-field='fuel_type_id']");
            if (elFtypes) {
                elFtypes.innerHTML =
                    `<option value="">Any Fuel Type</option>` +
                    (d.fuel_types || []).map((f) => `<option value="${f.id}">${f.name}</option>`).join("");
            }
        }
    } catch (err) {
        console.error("❌ Error loading restriction options:", err);
    }
}

// =========================================================================
// 📊 5. Summary KPIs & Zone Cards
// =========================================================================
window.load_parking_summary = load_parking_summary;
export async function load_parking_summary() {
    try {
        const response = await fetch("/api/parking/summary", { headers: HEADERS });
        const res = await response.json();
        if (res.success && res.data) {
            const data = res.data;

            const elLots = document.getElementById("kpi_total_lots");
            const elCapacity = document.getElementById("kpi_total_capacity");
            const elParked = document.getElementById("kpi_total_parked");
            const elAvailable = document.getElementById("kpi_total_available");
            const elRate = document.getElementById("kpi_occupancy_rate");
            const elBadge = document.getElementById("kpi_occupancy_badge");

            if (elLots) elLots.innerText = (data.total_lots || 0).toLocaleString();
            if (elCapacity) elCapacity.innerText = (data.total_capacity || 0).toLocaleString();
            if (elParked) elParked.innerText = (data.total_parked || 0).toLocaleString();
            if (elAvailable) elAvailable.innerText = (data.total_available || 0).toLocaleString();
            if (elRate) elRate.innerText = `${data.occupancy_rate || 0}%`;

            if (elBadge) {
                const rate = data.occupancy_rate || 0;
                if (rate >= 95) {
                    elBadge.className = "badge badge-error badge-sm font-bold ml-auto";
                    elBadge.innerText = "Full";
                } else if (rate >= 75) {
                    elBadge.className = "badge badge-warning badge-sm font-bold ml-auto";
                    elBadge.innerText = "Busy";
                } else {
                    elBadge.className = "badge badge-success badge-sm font-bold ml-auto";
                    elBadge.innerText = "Normal";
                }
            }

            renderZoneCards(data.lots || []);
        }
    } catch (err) {
        console.error("❌ Error loading parking summary:", err);
    }
}

function renderZoneCards(lots) {
    const container = document.getElementById("parking_zone_cards");
    if (!container) return;

    if (!lots || lots.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-12 text-center text-base-content/50 space-y-2">
                <i class="fa-solid fa-square-parking text-4xl opacity-30"></i>
                <p class="text-sm font-bold">No parking lots configured</p>
                <p class="text-xs">Click "+ Add Parking Lot" to create your first parking zone.</p>
            </div>`;
        return;
    }

    container.innerHTML = lots
        .map((lot) => {
            const limit = lot.limit || 0;
            const value = lot.value || 0;
            const available = lot.available !== undefined ? lot.available : Math.max(0, limit - value);
            const rate =
                lot.occupancy_rate !== undefined
                    ? lot.occupancy_rate
                    : limit > 0
                      ? Math.round((value / limit) * 100)
                      : 0;

            let badgeClass = "badge-success";
            let statusLabel = "🟢 Available";
            let progressClass = "progress-success";
            let glowBorder = "border-base-300";

            if (rate >= 100) {
                badgeClass = "badge-error";
                statusLabel = "🔴 Full Capacity";
                progressClass = "progress-error";
                glowBorder = "border-error/40 shadow-error/10";
            } else if (rate >= 80) {
                badgeClass = "badge-warning";
                statusLabel = "🟡 Busy";
                progressClass = "progress-warning";
                glowBorder = "border-warning/40 shadow-warning/10";
            } else if (rate >= 50) {
                badgeClass = "badge-info";
                statusLabel = "🔵 Moderate";
                progressClass = "progress-info";
            }

            let gwHtml = `<span class="text-[11px] text-base-content/40 italic">No Gateways Connected</span>`;
            if (lot.gateways && lot.gateways.length > 0) {
                gwHtml = lot.gateways
                    .map((g) => {
                        const isOut = (g.type || "").toUpperCase() === "OUT";
                        const badgeColor = isOut ? "badge-error" : "badge-success";
                        const icon = isOut ? "fa-arrow-right-from-bracket" : "fa-arrow-right-to-bracket";
                        return `<span class="badge ${badgeColor} badge-soft badge-xs font-mono font-bold gap-1">
                                    <i class="fa-solid ${icon} text-[9px]"></i> ${g.name} (${g.type})
                                </span>`;
                    })
                    .join(" ");
            }

            return `
                <div class="card bg-base-100 border ${glowBorder} shadow-sm hover:shadow-xl transition-all duration-300 rounded-box overflow-hidden flex flex-col justify-between">
                    <div class="p-4 bg-linear-to-r from-primary/10 via-base-100 to-base-100 border-b border-base-200/80 flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-10 h-10 rounded-box bg-primary/15 text-primary flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                                <i class="fa-solid fa-square-parking"></i>
                            </div>
                            <div class="min-w-0">
                                <h4 class="font-bold text-sm text-base-content truncate">${lot.name}</h4>
                                <span class="text-[11px] text-base-content/50 block truncate">${lot.detail || "Main Zone"}</span>
                            </div>
                        </div>
                        <span class="badge ${badgeClass} badge-sm font-bold shrink-0">${rate}%</span>
                    </div>

                    <div class="p-4 space-y-3">
                        <div class="grid grid-cols-3 gap-2 py-2 px-3 bg-base-200/50 rounded-box text-center">
                            <div>
                                <span class="text-[10px] text-base-content/60 font-bold uppercase block">Capacity</span>
                                <span class="text-base font-black font-mono text-info">${limit.toLocaleString()}</span>
                            </div>
                            <div>
                                <span class="text-[10px] text-base-content/60 font-bold uppercase block">Parked</span>
                                <span class="text-base font-black font-mono text-warning">${value.toLocaleString()}</span>
                            </div>
                            <div>
                                <span class="text-[10px] text-base-content/60 font-bold uppercase block">Available</span>
                                <span class="text-base font-black font-mono text-success">${available.toLocaleString()}</span>
                            </div>
                        </div>

                        <div class="space-y-1">
                            <div class="flex items-center justify-between text-[11px]">
                                <span class="font-bold text-base-content/70">${statusLabel}</span>
                                <span class="font-mono text-xs font-bold">${rate}%</span>
                            </div>
                            <progress class="progress ${progressClass} w-full h-2.5 rounded-full" value="${rate}" max="100"></progress>
                        </div>

                        <div class="space-y-1 pt-1 border-t border-base-200">
                            <div class="text-[10px] font-bold uppercase tracking-wider text-base-content/50 flex items-center gap-1">
                                <i class="fa-solid fa-door-open text-xs"></i>
                                <span>Mapped Entrance &amp; Exit Gateways:</span>
                            </div>
                            <div class="flex flex-wrap gap-1.5 pt-0.5">
                                ${gwHtml}
                            </div>
                        </div>
                    </div>

                    <div class="px-4 py-3 bg-base-200/40 border-t border-base-200 flex items-center justify-between gap-2">
                        <span class="text-[11px] font-bold text-base-content/60">Gateway Actions:</span>
                        <div class="flex items-center gap-1.5">
                           <a class="link" href="/page?page=dashboard_gateway"><span class="text-[11px] font-bold text-primary">Gatteway Config</span></a>
                        </div>
                    </div>
                </div>`;
        })
        .join("");
}

// =========================================================================
// ⚡ 6. Restriction Rule & Denied Actions
// =========================================================================
window.open_create_restriction_modal = () => {
    restriction_model_table.model_control?.add();
};

window.reload_restriction_table = () => {
    restriction_model_table.reload();
    unity.showToastNotification({ type: "info", msg: "🔄 Restriction rules refreshed" });
};

window.reload_denied_table = () => {
    denied_model_table.reload();
    unity.showToastNotification({ type: "info", msg: "🔄 Denied logs refreshed" });
};

window.toggle_rule_active = async (ruleId, isActive) => {
    try {
        const formData = new FormData();
        formData.append("id", ruleId);
        formData.append("is_active", isActive ? "true" : "false");

        const response = await fetch("/api/parking/restriction/toggle_active", {
            method: "POST",
            headers: HEADERS,
            body: formData,
        });
        const res = await response.json();
        if (res.success) {
            unity.showToastNotification({ type: "success", msg: res.msg });
        } else {
            unity.showToastNotification({ type: "error", msg: res.msg || "Failed to update rule status" });
            restriction_model_table.reload();
        }
    } catch (err) {
        console.error("❌ Error toggling rule:", err);
    }
};

window.open_denied_override_modal = (deniedId) => {
    document.getElementById("override_denied_id").value = deniedId;
    document.getElementById("override_reason_text").value = "";
    document.getElementById("Modal_Denied_Override").showModal();
};

window.submit_denied_override = async () => {
    const deniedId = document.getElementById("override_denied_id").value;
    const reason = document.getElementById("override_reason_text").value.trim();

    if (!reason) {
        unity.showToastNotification({ type: "warning", msg: "Please enter an override reason" });
        return;
    }

    try {
        const formData = new FormData();
        formData.append("id", deniedId);
        formData.append("override_reason", reason);

        const response = await fetch("/api/parking/denied/override", {
            method: "POST",
            headers: HEADERS,
            body: formData,
        });
        const res = await response.json();
        if (res.success) {
            unity.showToastNotification({ type: "success", msg: res.msg });
            document.getElementById("Modal_Denied_Override").close();
            denied_model_table.reload();
        } else {
            unity.showToastNotification({ type: "error", msg: res.msg || "Failed to override" });
        }
    } catch (err) {
        console.error("❌ Error submitting override:", err);
    }
};

// =========================================================================
// 🔀 7. Tab Active & Helper
// =========================================================================
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("PARKING_LOT_TAB_ACTIVE", tab_id);
    if (tab_id === "PARKING_LOT_TAB02") {
        load_parking_summary();
    } else if (tab_id === "PARKING_LOT_TAB03") {
        restriction_model_table.reload();
    } else if (tab_id === "PARKING_LOT_TAB04") {
        denied_model_table.reload();
    }
}

window.reload_parking_data = async function () {
    parking_model_table.reload();
    await load_parking_summary();
    unity.showToastNotification({
        type: "info",
        msg: "🔄 Data refreshed successfully",
    });
};

// =========================================================================
// 🚀 8. Initialization
// =========================================================================
async function Init() {
    parking_model_table.init();
    restriction_model_table.init();
    denied_model_table.init();

    await load_restriction_form_options();

    if (localStorage.getItem("PARKING_LOT_TAB_ACTIVE")) {
        const v = localStorage.getItem("PARKING_LOT_TAB_ACTIVE");
        if (v && document.getElementById(v)) {
            document.getElementById(v).checked = true;
        }
    }

    await load_parking_summary();
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
