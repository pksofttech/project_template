/**
 * access_groups.js - Access Permission Groups Controller
 * Handles TableModel initialization, door permissions matrix, schedules, and group CRUD
 */

import { TableModel } from "./_table_class.js";

let tableModel = null;
let registeredDoors = [];

$(document).ready(function () {
    loadRegisteredDoors();

    tableModel = new TableModel(
        "#tableGroups",
        "/api/access/group/datatable",
        {
            table: "Access_Group",
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
                    title: "Code",
                    render: function (data) {
                        return `<span class="font-mono badge badge-sm badge-neutral font-bold">${data}</span>`;
                    }
                },
                {
                    data: "name",
                    name: "name",
                    title: "Group Name",
                    render: function (data) {
                        return `<span class="font-bold text-base-content">${data}</span>`;
                    }
                },
                {
                    data: "time_start",
                    name: "time_start",
                    title: "Time Schedule",
                    render: function (data, type, row) {
                        return `<span class="font-mono text-xs badge badge-soft badge-primary">${data} - ${row.time_end}</span>`;
                    }
                },
                {
                    data: "allowed_days",
                    name: "allowed_days",
                    title: "Allowed Days",
                    render: function (data) {
                        return `<span class="text-[11px] font-mono text-base-content/70">${data || 'ALL'}</span>`;
                    }
                },
                {
                    data: "doors_allowed",
                    name: "doors_allowed",
                    title: "Authorized Doors",
                    render: function (data) {
                        if (!data || data === '*') {
                            return '<span class="badge badge-xs badge-success font-bold">ALL DOORS (*)</span>';
                        }
                        return `<span class="font-mono text-xs text-base-content/70">${data}</span>`;
                    }
                },
                {
                    data: "status",
                    name: "status",
                    title: "Status",
                    render: function (data) {
                        const isActive = (data === 'active');
                        return `<span class="badge badge-sm ${isActive ? 'badge-success' : 'badge-neutral'} font-bold">${data}</span>`;
                    }
                },
                {
                    data: "description",
                    name: "description",
                    title: "Description",
                    render: function (data) {
                        return `<span class="text-xs text-base-content/60">${data || '-'}</span>`;
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

export async function loadRegisteredDoors() {
    try {
        const res = await fetch('/api/access/door/list/all');
        const result = await res.json();
        if (result.success && result.data) {
            registeredDoors = result.data;
            const container = document.getElementById('doorCheckboxes');
            if (container) {
                container.innerHTML = registeredDoors.map(d => `
                    <label class="label cursor-pointer justify-start gap-2 p-1 rounded hover:bg-base-200">
                        <input type="checkbox" name="specificDoor" value="${d.id}" class="checkbox checkbox-xs" />
                        <span class="text-xs text-base-content">${d.name} (${d.code})</span>
                    </label>
                `).join('');
            }
        }
    } catch (err) {
        console.error("Failed to load doors:", err);
    }
}
window.loadRegisteredDoors = loadRegisteredDoors;

export function toggleAllDoors(elem) {
    const container = document.getElementById('doorCheckboxes');
    if (!container) return;
    if (elem.checked) {
        container.classList.add('opacity-50', 'pointer-events-none');
    } else {
        container.classList.remove('opacity-50', 'pointer-events-none');
    }
}
window.toggleAllDoors = toggleAllDoors;

export function openCreateModal() {
    document.getElementById('groupId').value = '';
    document.getElementById('grpCode').value = '';
    document.getElementById('grpName').value = '';
    document.getElementById('grpStatus').value = 'active';
    document.getElementById('timeStart').value = '00:00';
    document.getElementById('timeEnd').value = '23:59';
    document.getElementById('grpDesc').value = '';

    // Reset days checkboxes to checked
    document.querySelectorAll('input[name="dayCheck"]').forEach(cb => cb.checked = true);

    // Reset doors to All
    const checkAll = document.getElementById('checkAllDoors');
    if (checkAll) {
        checkAll.checked = true;
        toggleAllDoors(checkAll);
    }
    document.querySelectorAll('input[name="specificDoor"]').forEach(cb => cb.checked = false);

    document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-user-shield"></i><span>Add Access Permission Group</span>';
    const modal = document.getElementById('groupModal');
    if (modal) modal.showModal();
}
window.openCreateModal = openCreateModal;

export async function openEditModal(id) {
    try {
        const res = await fetch(`/api/access/group/${id}`);
        const result = await res.json();
        if (!result.success) {
            if (window.toast) toast.error("Failed to load group data");
            return;
        }
        const g = result.data;
        document.getElementById('groupId').value = g.id;
        document.getElementById('grpCode').value = g.code;
        document.getElementById('grpName').value = g.name;
        document.getElementById('grpStatus').value = g.status || 'active';
        document.getElementById('timeStart').value = g.time_start || '00:00';
        document.getElementById('timeEnd').value = g.time_end || '23:59';
        document.getElementById('grpDesc').value = g.description || '';

        // Days
        const activeDays = (g.allowed_days || '').split(',').map(s => s.trim().toUpperCase());
        document.querySelectorAll('input[name="dayCheck"]').forEach(cb => {
            cb.checked = activeDays.includes(cb.value);
        });

        // Doors
        const checkAll = document.getElementById('checkAllDoors');
        if (!g.doors_allowed || g.doors_allowed === '*') {
            if (checkAll) {
                checkAll.checked = true;
                toggleAllDoors(checkAll);
            }
            document.querySelectorAll('input[name="specificDoor"]').forEach(cb => cb.checked = false);
        } else {
            if (checkAll) {
                checkAll.checked = false;
                toggleAllDoors(checkAll);
            }
            try {
                const doorIds = JSON.parse(g.doors_allowed);
                document.querySelectorAll('input[name="specificDoor"]').forEach(cb => {
                    cb.checked = doorIds.includes(parseInt(cb.value, 10)) || doorIds.includes(cb.value);
                });
            } catch (e) {}
        }

        document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i><span>Edit Access Group</span>';
        const modal = document.getElementById('groupModal');
        if (modal) modal.showModal();
    } catch (err) {
        console.error("Edit load error:", err);
    }
}
window.openEditModal = openEditModal;

export async function saveGroup(event) {
    event.preventDefault();
    const id = document.getElementById('groupId').value;

    // Gather Days
    const days = Array.from(document.querySelectorAll('input[name="dayCheck"]:checked')).map(cb => cb.value);
    const daysStr = days.join(',') || 'MON,TUE,WED,THU,FRI,SAT,SUN';

    // Gather Doors
    let doorsAllowed = '*';
    const checkAll = document.getElementById('checkAllDoors');
    if (checkAll && !checkAll.checked) {
        const specificDoors = Array.from(document.querySelectorAll('input[name="specificDoor"]:checked'))
            .map(cb => parseInt(cb.value, 10));
        doorsAllowed = JSON.stringify(specificDoors);
    }

    const payload = {
        code: document.getElementById('grpCode').value.trim(),
        name: document.getElementById('grpName').value.trim(),
        time_start: document.getElementById('timeStart').value,
        time_end: document.getElementById('timeEnd').value,
        allowed_days: daysStr,
        doors_allowed: doorsAllowed,
        status: document.getElementById('grpStatus').value,
        description: document.getElementById('grpDesc').value.trim()
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/access/group/${id}` : '/api/access/group/';
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
            const modal = document.getElementById('groupModal');
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
window.saveGroup = saveGroup;

export function confirmDelete(id, name) {
    if (confirm(`Are you sure you want to delete access group '${name}'?`)) {
        deleteGroup(id);
    }
}
window.confirmDelete = confirmDelete;

export async function deleteGroup(id) {
    try {
        const res = await fetch(`/api/access/group/${id}`, { method: 'DELETE' });
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
window.deleteGroup = deleteGroup;
