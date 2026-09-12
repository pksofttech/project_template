/**
 * cards_manager.js - Access Card Management Controller
 * Handles TableModel initialization, CRUD modals, and member assignment
 */

import { TableModel } from "./_table_class.js";

let tableModel = null;
let membersList = [];

$(document).ready(function () {
    loadMembers();

    tableModel = new TableModel(
        "#tableCards",
        "/api/access/card/datatable",
        {
            table: "Access_Card",
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
                                <button onclick="confirmDelete(${data}, '${row.card_number}')" class="btn btn-ghost btn-xs btn-circle text-error" title="Delete">
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
                    data: "card_number",
                    name: "card_number",
                    title: "Card Number (RFID)",
                    render: function (data) {
                        return `<span class="font-mono badge badge-sm badge-neutral font-bold">${data}</span>`;
                    }
                },
                {
                    data: "card_type",
                    name: "card_type",
                    title: "Card Type",
                    render: function (data) {
                        return `<span class="badge badge-xs badge-soft font-mono">${data}</span>`;
                    }
                },
                {
                    data: "member_id",
                    name: "member_id",
                    title: "Cardholder",
                    render: function (data) {
                        if (!data) return '<span class="text-base-content/30 text-xs">Unassigned</span>';
                        const mem = membersList.find(m => m.id === data);
                        return mem ? `<span class="font-bold text-primary">${mem.first_name} ${mem.last_name || ''}</span>` : `<span class="badge badge-xs badge-neutral">Member #${data}</span>`;
                    }
                },
                {
                    data: "status",
                    name: "status",
                    title: "Status",
                    render: function (data) {
                        let badgeClass = "badge-success";
                        if (data === "blocked") badgeClass = "badge-error";
                        if (data === "lost") badgeClass = "badge-warning";
                        if (data === "expired") badgeClass = "badge-neutral";
                        return `<span class="badge badge-sm ${badgeClass} font-bold">${data}</span>`;
                    }
                },
                {
                    data: "issue_date",
                    name: "issue_date",
                    title: "Issue Date",
                    render: function (data) {
                        return data ? `<span class="font-mono text-xs">${data.substring(0, 10)}</span>` : "-";
                    }
                },
                {
                    data: "remark",
                    name: "remark",
                    title: "Remarks",
                    render: function (data) {
                        return `<span class="text-xs text-base-content/60">${data || "-"}</span>`;
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

export async function loadMembers() {
    try {
        const res = await fetch('/api/access/member/list/all');
        const result = await res.json();
        if (result.success && result.data) {
            membersList = result.data;
            const select = document.getElementById('cardMember');
            if (select) {
                select.innerHTML = '<option value="">-- Unassigned (บัตรว่าง) --</option>' +
                    membersList.map(m => `<option value="${m.id}">${m.first_name} ${m.last_name || ''} (${m.member_code})</option>`).join('');
            }
        }
    } catch (err) {
        console.error("Failed to load members:", err);
    }
}
window.loadMembers = loadMembers;

export function openCreateModal() {
    document.getElementById('cardId').value = '';
    document.getElementById('cardNumber').value = '';
    document.getElementById('cardType').value = 'RFID_125K';
    document.getElementById('cardMember').value = '';
    document.getElementById('cardStatus').value = 'active';
    document.getElementById('cardExpire').value = '';
    document.getElementById('cardRemark').value = '';
    document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-credit-card"></i><span>Register Access Card</span>';
    const modal = document.getElementById('cardModal');
    if (modal) modal.showModal();
}
window.openCreateModal = openCreateModal;

export async function openEditModal(id) {
    try {
        const res = await fetch(`/api/access/card/${id}`);
        const result = await res.json();
        if (!result.success) {
            if (window.toast) toast.error("Failed to load card data");
            return;
        }
        const c = result.data;
        document.getElementById('cardId').value = c.id;
        document.getElementById('cardNumber').value = c.card_number;
        document.getElementById('cardType').value = c.card_type;
        document.getElementById('cardMember').value = c.member_id || '';
        document.getElementById('cardStatus').value = c.status || 'active';
        document.getElementById('cardExpire').value = c.expire_date ? c.expire_date.substring(0, 10) : '';
        document.getElementById('cardRemark').value = c.remark || '';
        document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i><span>Edit Access Card</span>';
        const modal = document.getElementById('cardModal');
        if (modal) modal.showModal();
    } catch (err) {
        console.error("Edit load error:", err);
    }
}
window.openEditModal = openEditModal;

export async function saveCard(event) {
    event.preventDefault();
    const id = document.getElementById('cardId').value;
    const memberIdVal = document.getElementById('cardMember').value;

    const payload = {
        card_number: document.getElementById('cardNumber').value.trim(),
        card_type: document.getElementById('cardType').value,
        member_id: memberIdVal ? parseInt(memberIdVal, 10) : null,
        status: document.getElementById('cardStatus').value,
        expire_date: document.getElementById('cardExpire').value || null,
        remark: document.getElementById('cardRemark').value.trim()
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/access/card/${id}` : '/api/access/card/';
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
            const modal = document.getElementById('cardModal');
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
window.saveCard = saveCard;

export function confirmDelete(id, cardNo) {
    if (confirm(`Are you sure you want to delete card '${cardNo}'?`)) {
        deleteCard(id);
    }
}
window.confirmDelete = confirmDelete;

export async function deleteCard(id) {
    try {
        const res = await fetch(`/api/access/card/${id}`, { method: 'DELETE' });
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
window.deleteCard = deleteCard;
