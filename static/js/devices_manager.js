/**
 * devices_manager.js - Access Devices (Readers & Terminals) Management
 * TableModel integration, modal CRUD, and device heartbeat testing
 */

import { TableModel } from "./_table_class.js";

let tableModel = null;
let doorsCache = [];

$(document).ready(function () {
    loadDoorsList();

    tableModel = new TableModel(
        "#tableDevices",
        "/api/access/device/datatable",
        {
            table: "Access_Device",
            order: [[1, "asc"]],
            columns: [
                {
                    data: "id",
                    title: '<h3 class="font-bold text-xs text-center" data-i18n="Actions">Actions</h3>',
                    orderable: false,
                    searchable: false,
                    className: "noExport text-center whitespace-nowrap",
                    render: function (data, type, row) {
                        return `
                            <div class="flex items-center justify-center gap-1">
                                <button onclick="pingDevice(${data})" class="btn btn-ghost btn-xs btn-circle text-info" title="Ping Heartbeat">
                                    <i class="fa-solid fa-signal"></i>
                                </button>
                                <button onclick="openEditModal(${data})" class="btn btn-ghost btn-xs btn-circle text-primary" title="Edit">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button onclick="confirmDelete(${data}, '${row.name}')" class="btn btn-ghost btn-xs btn-circle text-error" title="Delete">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        `;
                    }
                },
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
                    data: "code",
                    name: "code",
                    title: "Device Code",
                    render: function (data) {
                        return `<span class="font-mono badge badge-sm badge-neutral font-bold">${data}</span>`;
                    }
                },
                {
                    data: "name",
                    name: "name",
                    title: "Device Name",
                    render: function (data, type, row) {
                        const brandInfo = row.brand ? `<span class="text-[11px] text-base-content/50 block">${row.brand} ${row.model_name || ''}</span>` : '';
                        return `<div><span class="font-bold text-base-content">${data}</span>${brandInfo}</div>`;
                    }
                },
                {
                    data: "door_name",
                    name: "door_name",
                    title: "Door / Gate",
                    render: function (data, type, row) {
                        const codeBadge = row.door_code ? `<span class="badge badge-xs badge-ghost font-mono">${row.door_code}</span> ` : '';
                        return `<div class="flex items-center gap-1.5"><i class="fa-solid fa-door-closed text-primary/60 text-xs"></i><span>${codeBadge}${data || '-'}</span></div>`;
                    }
                },
                {
                    data: "device_category",
                    name: "device_category",
                    title: "Category",
                    render: function (data) {
                        let icon = "fa-microchip";
                        let badgeClass = "badge-outline";
                        if (data === "READER") icon = "fa-id-card-clip";
                        if (data === "TERMINAL") { icon = "fa-tablet-screen-button"; badgeClass = "badge-primary badge-soft"; }
                        if (data === "CAMERA_AI") { icon = "fa-camera"; badgeClass = "badge-secondary badge-soft"; }
                        if (data === "KIOSK") { icon = "fa-display"; badgeClass = "badge-accent badge-soft"; }
                        return `<span class="badge badge-sm ${badgeClass} gap-1 font-semibold text-[11px]"><i class="fa-solid ${icon} text-[10px]"></i> ${data}</span>`;
                    }
                },
                {
                    data: "direction",
                    name: "direction",
                    title: "Direction",
                    className: "text-center",
                    render: function (data) {
                        if (data === "IN") return `<span class="badge badge-xs badge-success text-success-content font-bold">IN</span>`;
                        if (data === "OUT") return `<span class="badge badge-xs badge-warning text-warning-content font-bold">OUT</span>`;
                        return `<span class="badge badge-xs badge-info text-info-content font-bold">BOTH</span>`;
                    }
                },
                {
                    data: "ip_address",
                    name: "ip_address",
                    title: "IP Address",
                    render: function (data) {
                        return data ? `<span class="font-mono text-[11px] text-base-content/80">${data}</span>` : '-';
                    }
                },
                {
                    data: "status",
                    name: "status",
                    title: "Status",
                    className: "text-center",
                    render: function (data) {
                        const isOnline = (data === "ONLINE");
                        const badgeColor = isOnline ? "badge-success" : (data === "MAINTENANCE" ? "badge-warning" : "badge-error");
                        return `<span class="badge badge-sm ${badgeColor} font-bold gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-white ${isOnline ? "animate-pulse" : ""}"></span> ${data}
                        </span>`;
                    }
                }
            ]
        }
    );

    tableModel.init();
    window.table = tableModel.table;
    window.tableModel = tableModel;
});

async function loadDoorsList() {
    try {
        const res = await fetch("/api/access/door/list/all");
        const json = await res.json();
        if (json.success && json.data) {
            doorsCache = json.data;
            populateDoorSelect();
        }
    } catch (err) {
        console.error("Failed to load doors list:", err);
    }
}

function populateDoorSelect(selectedId = null) {
    const selectEl = document.getElementById("deviceDoorId");
    if (!selectEl) return;
    selectEl.innerHTML = '<option value="" disabled selected>Select Target Door / Gate...</option>';
    doorsCache.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = `[${d.code}] ${d.name} (${d.door_type})`;
        if (selectedId && d.id == selectedId) {
            opt.selected = true;
        }
        selectEl.appendChild(opt);
    });
}

export function reloadTable() {
    tableModel?.reload();
}
window.reloadTable = reloadTable;

export function openCreateModal() {
    document.getElementById("deviceId").value = "";
    document.getElementById("deviceCode").value = "";
    document.getElementById("deviceName").value = "";
    populateDoorSelect();
    document.getElementById("deviceCategory").value = "READER";
    document.getElementById("deviceDirection").value = "IN";
    document.getElementById("ipAddress").value = "";
    document.getElementById("macAddress").value = "";
    document.getElementById("deviceToken").value = "";
    document.getElementById("deviceBrand").value = "";
    document.getElementById("modelName").value = "";
    document.getElementById("deviceStatus").value = "ONLINE";
    document.getElementById("deviceDesc").value = "";

    document.getElementById("modalTitle").innerHTML = '<i class="fa-solid fa-microchip"></i><span>Add New Access Device</span>';
    const modal = document.getElementById("deviceModal");
    if (modal) modal.showModal();
}
window.openCreateModal = openCreateModal;

export async function openEditModal(id) {
    try {
        const res = await fetch(`/api/access/device/${id}`);
        if (!res.ok) {
            if (window.toast) toast.error("Failed to load device details");
            return;
        }
        const d = await res.json();
        document.getElementById("deviceId").value = d.id;
        document.getElementById("deviceCode").value = d.code;
        document.getElementById("deviceName").value = d.name;
        populateDoorSelect(d.door_id);
        document.getElementById("deviceCategory").value = d.device_category || "READER";
        document.getElementById("deviceDirection").value = d.direction || "IN";
        document.getElementById("ipAddress").value = d.ip_address || "";
        document.getElementById("macAddress").value = d.mac_address || "";
        document.getElementById("deviceToken").value = d.device_token || "";
        document.getElementById("deviceBrand").value = d.brand || "";
        document.getElementById("modelName").value = d.model_name || "";
        document.getElementById("deviceStatus").value = d.status || "ONLINE";
        document.getElementById("deviceDesc").value = d.description || "";

        document.getElementById("modalTitle").innerHTML = '<i class="fa-solid fa-pen-to-square"></i><span>Edit Access Device</span>';
        const modal = document.getElementById("deviceModal");
        if (modal) modal.showModal();
    } catch (err) {
        console.error("Edit load error:", err);
    }
}
window.openEditModal = openEditModal;

export async function saveDevice(event) {
    event.preventDefault();
    const id = document.getElementById("deviceId").value;
    const doorIdVal = document.getElementById("deviceDoorId").value;
    if (!doorIdVal) {
        if (window.toast) toast.error("Please select a target door or gate");
        return;
    }

    const payload = {
        code: document.getElementById("deviceCode").value.trim(),
        name: document.getElementById("deviceName").value.trim(),
        door_id: parseInt(doorIdVal, 10),
        device_category: document.getElementById("deviceCategory").value,
        direction: document.getElementById("deviceDirection").value,
        ip_address: document.getElementById("ipAddress").value.trim() || null,
        mac_address: document.getElementById("macAddress").value.trim() || null,
        device_token: document.getElementById("deviceToken").value.trim() || null,
        brand: document.getElementById("deviceBrand").value.trim() || null,
        model_name: document.getElementById("modelName").value.trim() || null,
        status: document.getElementById("deviceStatus").value,
        description: document.getElementById("deviceDesc").value.trim() || null,
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/access/device/${id}` : "/api/access/device/";
    const method = isEdit ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (res.ok && result.success) {
            if (window.toast) toast.success(result.message || "Device saved successfully");
            const modal = document.getElementById("deviceModal");
            if (modal) modal.close();
            tableModel?.reload();
        } else {
            if (window.toast) toast.error(result.detail || result.message || "Failed to save device");
        }
    } catch (err) {
        console.error("Save device error:", err);
        if (window.toast) toast.error("Network error while saving device");
    }
}
window.saveDevice = saveDevice;

export async function pingDevice(id) {
    try {
        const res = await fetch(`/api/access/device/${id}/ping`, { method: "POST" });
        const result = await res.json();
        if (res.ok && result.success) {
            if (window.toast) toast.success(`Device #${id} Heartbeat Ping OK (Status: ONLINE)`);
            tableModel?.reload();
        } else {
            if (window.toast) toast.error("Device ping failed");
        }
    } catch (err) {
        console.error("Ping error:", err);
    }
}
window.pingDevice = pingDevice;

export async function confirmDelete(id, name) {
    if (!confirm(`Are you sure you want to delete device "${name}" (#${id})?`)) return;
    try {
        const res = await fetch(`/api/access/device/${id}`, { method: "DELETE" });
        const result = await res.json();
        if (res.ok && result.success) {
            if (window.toast) toast.success(`Device "${name}" deleted`);
            tableModel?.reload();
        } else {
            if (window.toast) toast.error(result.detail || "Failed to delete device");
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}
window.confirmDelete = confirmDelete;
