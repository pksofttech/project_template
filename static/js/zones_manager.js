/**
 * zones_manager.js - Access Zones Management Controller
 * Handles TableModel initialization, anti-passback config, and zone CRUD
 */

import { TableModel } from "./_table_class.js";

let tableModel = null;

$(document).ready(function () {
    initZoneTable();
});

export function toggleApbFields() {
    const isChecked = document.getElementById('antipassbackEnabled')?.checked;
    const box = document.getElementById('apbTimeoutBox');
    if (box) {
        if (isChecked) {
            box.classList.remove('hidden');
        } else {
            box.classList.add('hidden');
        }
    }
}
window.toggleApbFields = toggleApbFields;

export function initZoneTable() {
    tableModel = new TableModel(
        "#tableZones",
        "/api/access/zone/datatable",
        {
            table: "Access_Zone",
            order: [[1, "asc"]],
            columns: [
                {
                    data: 'id',
                    title: 'Actions',
                    orderable: false,
                    searchable: false,
                    className: 'noExport text-center w-24',
                    render: function (data, type, row) {
                        return `
                            <div class="flex items-center justify-center gap-1">
                                <button onclick="openEditModal(${row.id})" class="btn btn-xs btn-ghost text-info" title="Edit">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button onclick="deleteZone(${row.id}, '${row.name}')" class="btn btn-xs btn-ghost text-error" title="Delete">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        `;
                    }
                },
                {
                    data: 'code',
                    title: 'Zone Code',
                    className: 'font-mono font-bold text-xs',
                    render: function (data) {
                        return `<span class="badge badge-neutral badge-sm font-mono">${data || '-'}</span>`;
                    }
                },
                {
                    data: 'name',
                    title: 'Zone Name',
                    className: 'font-semibold text-xs',
                    render: function (data, type, row) {
                        return `<div>
                            <span class="text-base-content font-bold">${data}</span>
                            ${row.description ? `<p class="text-[11px] text-base-content/60 truncate max-w-xs">${row.description}</p>` : ''}
                        </div>`;
                    }
                },
                {
                    data: 'zone_type',
                    title: 'Zone Type',
                    className: 'text-xs',
                    render: function (data) {
                        if (data === 'HIGH_SECURITY') {
                            return `<span class="badge badge-error badge-sm gap-1"><i class="fa-solid fa-shield-cat"></i> High Security</span>`;
                        } else if (data === 'OUTSIDE') {
                            return `<span class="badge badge-warning badge-sm gap-1"><i class="fa-solid fa-tree"></i> Outside</span>`;
                        } else if (data === 'MUSTER_POINT') {
                            return `<span class="badge badge-info badge-sm gap-1"><i class="fa-solid fa-person-shelter"></i> Muster Point</span>`;
                        }
                        return `<span class="badge badge-outline badge-sm gap-1"><i class="fa-solid fa-building"></i> Internal</span>`;
                    }
                },
                {
                    data: 'max_occupancy',
                    title: 'Capacity (Max)',
                    className: 'text-xs font-mono',
                    render: function (data) {
                        if (!data || data === 0) {
                            return `<span class="text-base-content/60">Unlimited</span>`;
                        }
                        return `<span class="badge badge-neutral badge-sm">${data} persons</span>`;
                    }
                },
                {
                    data: 'antipassback_enabled',
                    title: 'Anti-Passback',
                    className: 'text-center text-xs',
                    render: function (data, type, row) {
                        if (data) {
                            return `<span class="badge badge-success badge-sm gap-1"><i class="fa-solid fa-check"></i> Enabled (${row.antipassback_timeout_min}m)</span>`;
                        }
                        return `<span class="badge badge-ghost badge-sm text-base-content/40">Disabled</span>`;
                    }
                },
                {
                    data: 'status',
                    title: 'Status',
                    className: 'text-center text-xs',
                    render: function (data) {
                        if (data && data.toLowerCase() === 'active') {
                            return `<span class="badge badge-success badge-sm">Active</span>`;
                        }
                        return `<span class="badge badge-ghost badge-sm">Inactive</span>`;
                    }
                },
                {
                    data: 'created_at',
                    title: 'Created At',
                    className: 'text-xs text-base-content/60',
                    render: function (data) {
                        return data ? data.replace('T', ' ').substring(0, 19) : '-';
                    }
                }
            ]
        }
    );
    tableModel.init();
    window.table = tableModel.table;
    window.tableModel = tableModel;
}
window.initZoneTable = initZoneTable;

export function reloadTable() {
    if (tableModel && tableModel.dt) {
        tableModel.dt.ajax.reload(null, false);
    } else if (tableModel) {
        tableModel.reload();
    }
}
window.reloadTable = reloadTable;

export function openCreateModal() {
    document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-layer-group"></i> <span>Add New Zone</span>';
    document.getElementById('zoneId').value = '';
    document.getElementById('zoneForm').reset();
    document.getElementById('zoneStatus').value = 'active';
    document.getElementById('zoneType').value = 'INTERNAL';
    document.getElementById('maxOccupancy').value = '0';
    document.getElementById('antipassbackEnabled').checked = false;
    document.getElementById('antipassbackTimeout').value = '30';
    toggleApbFields();
    document.getElementById('zoneModal').showModal();
}
window.openCreateModal = openCreateModal;

export async function openEditModal(id) {
    try {
        const res = await fetch(`/api/access/zone/list/all`);
        const zones = await res.json();
        const zone = zones.find(z => z.id === id);

        if (!zone) {
            if (window.Swal) Swal.fire({ icon: 'error', title: 'Error', text: 'Zone not found' });
            return;
        }

        document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> <span>Edit Zone</span>';
        document.getElementById('zoneId').value = zone.id;
        document.getElementById('zoneCode').value = zone.code;
        document.getElementById('zoneName').value = zone.name;
        document.getElementById('zoneType').value = zone.zone_type || 'INTERNAL';
        document.getElementById('maxOccupancy').value = zone.max_occupancy || 0;
        document.getElementById('antipassbackEnabled').checked = Boolean(zone.antipassback_enabled);
        document.getElementById('antipassbackTimeout').value = zone.antipassback_timeout_min || 30;
        toggleApbFields();
        document.getElementById('zoneModal').showModal();
    } catch (err) {
        if (window.Swal) Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
}
window.openEditModal = openEditModal;

export async function saveZone(e) {
    e.preventDefault();
    const id = document.getElementById('zoneId').value;
    const isEdit = Boolean(id);

    const payload = {
        code: document.getElementById('zoneCode').value.trim().toUpperCase(),
        name: document.getElementById('zoneName').value.trim(),
        zone_type: document.getElementById('zoneType').value,
        max_occupancy: parseInt(document.getElementById('maxOccupancy').value) || 0,
        antipassback_enabled: document.getElementById('antipassbackEnabled').checked,
        antipassback_timeout_min: parseInt(document.getElementById('antipassbackTimeout').value) || 30,
        status: document.getElementById('zoneStatus').value,
        description: document.getElementById('zoneDesc').value.trim() || null
    };

    const url = isEdit ? `/api/access/zone/${id}` : '/api/access/zone';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.detail || 'Failed to save zone');
        }

        document.getElementById('zoneModal').close();
        if (window.Swal) {
            Swal.fire({
                icon: 'success',
                title: 'Saved',
                text: result.message || 'Zone saved successfully',
                timer: 1500,
                showConfirmButton: false
            });
        }
        reloadTable();
    } catch (err) {
        if (window.Swal) Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
}
window.saveZone = saveZone;

export async function deleteZone(id, name) {
    let isConfirmed = false;
    if (window.Swal) {
        const confirm = await Swal.fire({
            title: 'Delete Zone?',
            text: `Are you sure you want to delete zone '${name}'?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it!'
        });
        isConfirmed = confirm.isConfirmed;
    } else {
        isConfirmed = confirm(`Are you sure you want to delete zone '${name}'?`);
    }

    if (isConfirmed) {
        try {
            const res = await fetch(`/api/access/zone/${id}`, { method: 'DELETE' });
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.detail || 'Failed to delete zone');
            }

            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted',
                    text: result.message || 'Zone deleted successfully',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            reloadTable();
        } catch (err) {
            if (window.Swal) Swal.fire({ icon: 'error', title: 'Cannot Delete', text: err.message });
        }
    }
}
window.deleteZone = deleteZone;
