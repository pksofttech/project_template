/**
 * doors_manager.js - Access Door & Turnstile Controller
 * Handles TableModel initialization, CRUD modals, and remote unlock relay
 */

import { TableModel } from "./_table_class.js";

let tableModel = null;

$(document).ready(function () {
    tableModel = new TableModel(
        "#tableDoors",
        "/api/access/door/datatable",
        {
            table: "Access_Door",
            order: [[1, "asc"]],
            columns: [
                {
                    data: "id",
                    title: '<h3 class="font-bold text-xs text-center">Actions</h3>',
                    orderable: false,
                    searchable: false,
                    className: "noExport text-center",
                    render: function (data, type, row) {
                        return `
                            <div class="flex items-center justify-center gap-1">
                                <button onclick="remoteUnlock(${data}, '${row.name}')" class="btn btn-xs btn-outline btn-success gap-1" title="Remote Unlock">
                                    <i class="fa-solid fa-unlock"></i> Open
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
                    title: "Door Code",
                    render: function (data) {
                        return `<span class="font-mono badge badge-sm badge-neutral font-bold">${data}</span>`;
                    }
                },
                {
                    data: "name",
                    name: "name",
                    title: "Name",
                    render: function (data) {
                        return `<span class="font-bold text-base-content">${data}</span>`;
                    }
                },
                {
                    data: "zone",
                    name: "zone",
                    title: "Zone",
                    render: function (data) {
                        return `<span class="text-xs text-base-content/70">${data || "-"}</span>`;
                    }
                },
                {
                    data: "door_type",
                    name: "door_type",
                    title: "Type",
                    render: function (data) {
                        let icon = "fa-door-closed";
                        if (data === "BARRIER_GATE") icon = "fa-road-barrier";
                        if (data === "TURNSTILE") icon = "fa-arrows-turn-to-dots";
                        return `<span class="badge badge-sm badge-soft gap-1.5"><i class="fa-solid ${icon} text-[10px]"></i> ${data}</span>`;
                    }
                },
                {
                    data: "direction",
                    name: "direction",
                    title: "Direction",
                    render: function (data) {
                        return `<span class="badge badge-xs badge-neutral font-mono font-bold">${data}</span>`;
                    }
                },
                {
                    data: "ip_address",
                    name: "ip_address",
                    title: "IP Controller",
                    render: function (data) {
                        return `<span class="font-mono text-[11px] text-base-content/60">${data || "-"}</span>`;
                    }
                },
                {
                    data: "relay_time_sec",
                    name: "relay_time_sec",
                    title: "Relay (sec)",
                    render: function (data) {
                        return `<span class="font-bold">${data}s</span>`;
                    }
                },
                {
                    data: "status",
                    name: "status",
                    title: "Status",
                    render: function (data) {
                        const isOnline = (data === "ONLINE");
                        return `<span class="badge badge-sm ${isOnline ? "badge-success" : "badge-error"} font-bold gap-1">
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

export function reloadTable() {
    tableModel?.reload();
}
window.reloadTable = reloadTable;

export function openCreateModal() {
    document.getElementById('doorId').value = '';
    document.getElementById('doorCode').value = '';
    document.getElementById('doorName').value = '';
    document.getElementById('doorZone').value = 'Main Building';
    document.getElementById('doorType').value = 'DOOR';
    document.getElementById('doorDirection').value = 'IN';
    document.getElementById('doorIp').value = '127.0.0.1';
    document.getElementById('doorRelay').value = 5;
    document.getElementById('doorStatus').value = 'ONLINE';
    document.getElementById('doorDesc').value = '';
    document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-door-open"></i><span>Add New Door / Gate</span>';
    const modal = document.getElementById('doorModal');
    if (modal) modal.showModal();
}
window.openCreateModal = openCreateModal;

export async function openEditModal(id) {
    try {
        const res = await fetch(`/api/access/door/${id}`);
        const result = await res.json();
        if (!result.success) {
            if (window.toast) toast.error("Failed to load door data");
            return;
        }
        const d = result.data;
        document.getElementById('doorId').value = d.id;
        document.getElementById('doorCode').value = d.code;
        document.getElementById('doorName').value = d.name;
        document.getElementById('doorZone').value = d.zone || '';
        document.getElementById('doorType').value = d.door_type;
        document.getElementById('doorDirection').value = d.direction;
        document.getElementById('doorIp').value = d.ip_address || '127.0.0.1';
        document.getElementById('doorRelay').value = d.relay_time_sec || 5;
        document.getElementById('doorStatus').value = d.status;
        document.getElementById('doorDesc').value = d.description || '';
        document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i><span>Edit Door / Gate</span>';
        const modal = document.getElementById('doorModal');
        if (modal) modal.showModal();
    } catch (err) {
        console.error("Edit load error:", err);
    }
}
window.openEditModal = openEditModal;

export async function saveDoor(event) {
    event.preventDefault();
    const id = document.getElementById('doorId').value;
    const payload = {
        code: document.getElementById('doorCode').value.trim(),
        name: document.getElementById('doorName').value.trim(),
        zone: document.getElementById('doorZone').value.trim(),
        door_type: document.getElementById('doorType').value,
        direction: document.getElementById('doorDirection').value,
        ip_address: document.getElementById('doorIp').value.trim(),
        relay_time_sec: parseInt(document.getElementById('doorRelay').value, 10),
        status: document.getElementById('doorStatus').value,
        description: document.getElementById('doorDesc').value.trim()
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/access/door/${id}` : '/api/access/door/';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message);
            const modal = document.getElementById('doorModal');
            if (modal) modal.close();
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Operation failed");
        }
    } catch (err) {
        console.error("Save error:", err);
        if (window.toast) toast.error("Communication error");
    }
}
window.saveDoor = saveDoor;

export function confirmDelete(id, name) {
    if (confirm(`Are you sure you want to delete door '${name}'?`)) {
        deleteDoor(id);
    }
}
window.confirmDelete = confirmDelete;

export async function deleteDoor(id) {
    try {
        const res = await fetch(`/api/access/door/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message);
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Delete failed");
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}
window.deleteDoor = deleteDoor;

export async function remoteUnlock(doorId, doorName) {
    try {
        const res = await fetch('/api/access/event/remote_unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ door_id: doorId, operator_name: 'Admin Console' })
        });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message);
        } else {
            if (window.toast) toast.error(result.detail || "Unlock failed");
        }
    } catch (err) {
        console.error("Remote unlock error:", err);
    }
}
window.remoteUnlock = remoteUnlock;
