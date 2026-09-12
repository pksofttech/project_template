/**
 * sample_manager.js - Sample Items Controller
 * Handles TableModel initialization, modal CRUD, and dayjs formatting
 */

import { TableModel, actionButtonsTemplate } from "./_table_class.js";

let tableModel = null;

$(document).ready(function () {
    tableModel = new TableModel(
        "#tableSample",
        "/api/sample/datatable",
        {
            table: "Sample_Item",
            order: [[1, 'desc']],
            columns: [
                {
                    data: null,
                    title: '<h3 class="font-bold text-xs text-center">Actions</h3>',
                    orderable: false,
                    searchable: false,
                    className: "noExport text-center",
                    render: function (data, type, row) {
                        const id = row.id || (row.Sample_Item && row.Sample_Item.id);
                        return `
                            <div class="inline-flex gap-1">
                                <button class="btn btn-ghost btn-xs text-info hover:bg-info/10" onclick="editItem(${id})" title="Edit">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="btn btn-ghost btn-xs text-error hover:bg-error/10" onclick="deleteItem(${id})" title="Delete">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        `;
                    }
                },
                {
                    data: "id",
                    name: "id",
                    title: "ID",
                    className: "text-center font-mono font-bold text-xs",
                    render: data => `<span class="badge badge-outline badge-primary font-mono text-[11px] font-bold">#${data}</span>`
                },
                {
                    data: "code",
                    name: "code",
                    title: "Code",
                    render: data => `<span class="badge badge-outline badge-primary font-mono text-[11px] font-bold">${data || ''}</span>`
                },
                { data: "name", name: "name", title: "Item Name", className: "font-semibold" },
                { data: "category", name: "category", title: "Category" },
                {
                    data: "price",
                    name: "price",
                    title: "Price",
                    render: data => Number(data || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) + " ฿"
                },
                { data: "quantity", name: "quantity", title: "Quantity" },
                {
                    data: "status",
                    name: "status",
                    title: "Status",
                    render: function (data) {
                        if (data === "active") return '<span class="badge badge-success badge-xs gap-1">active</span>';
                        return '<span class="badge badge-ghost badge-xs gap-1">inactive</span>';
                    }
                },
                {
                    data: "updated_at",
                    name: "updated_at",
                    title: "Updated At",
                    render: data => (data && window.dayjs) ? dayjs(data).format('DD/MM/YYYY HH:mm') : (data || '-')
                }
            ],
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search code, name..."
            }
        }
    );

    tableModel.init();
    window.table = tableModel.table;
    window.tableModel = tableModel;
});

export function reloadTable() {
    if (!tableModel) return;
    const statusVal = $('#filterStatus').val();
    tableModel.filter = statusVal ? JSON.stringify({ "sample_item.status": statusVal }) : "";
    tableModel.reload();
}
window.reloadTable = reloadTable;

export function openCreateModal() {
    const form = document.getElementById("itemForm");
    if (form) form.reset();
    document.getElementById("itemId").value = "";
    document.getElementById("itemCode").disabled = false;
    document.getElementById("modalTitle").innerHTML = '<i class="fa-solid fa-plus"></i><span>Add New Item</span>';
    const modal = document.getElementById("itemModal");
    if (modal) modal.showModal();
}
window.openCreateModal = openCreateModal;

export async function editItem(id) {
    try {
        const res = await fetch(`/api/sample/${id}`);
        if (!res.ok) throw new Error("Failed to load item");
        const item = await res.json();

        document.getElementById("itemId").value = item.id;
        document.getElementById("itemCode").value = item.code;
        document.getElementById("itemCode").disabled = true; // Code should be immutable
        document.getElementById("itemName").value = item.name;
        document.getElementById("itemCategory").value = item.category || "General";
        document.getElementById("itemPrice").value = item.price || 0;
        document.getElementById("itemQuantity").value = item.quantity || 0;
        document.getElementById("itemStatus").value = item.status || "active";
        document.getElementById("itemDescription").value = item.description || "";

        document.getElementById("modalTitle").innerHTML = '<i class="fa-solid fa-pen-to-square"></i><span>Edit Item</span>';
        const modal = document.getElementById("itemModal");
        if (modal) modal.showModal();
    } catch (err) {
        if (window.toastr) toastr.error(err.message);
    }
}
window.editItem = editItem;

export async function saveItem(e) {
    e.preventDefault();
    const id = document.getElementById("itemId").value;
    const isEdit = !!id;

    const payload = {
        code: document.getElementById("itemCode").value.trim(),
        name: document.getElementById("itemName").value.trim(),
        category: document.getElementById("itemCategory").value.trim(),
        price: parseFloat(document.getElementById("itemPrice").value) || 0,
        quantity: parseInt(document.getElementById("itemQuantity").value) || 0,
        status: document.getElementById("itemStatus").value,
        description: document.getElementById("itemDescription").value.trim()
    };

    const url = isEdit ? `/api/sample/${id}` : `/api/sample`;
    const method = isEdit ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to save item");

        if (window.toastr) toastr.success(isEdit ? "Item updated successfully" : "Item created successfully");
        const modal = document.getElementById("itemModal");
        if (modal) modal.close();
        reloadTable();
    } catch (err) {
        if (window.toastr) toastr.error(err.message);
    }
}
window.saveItem = saveItem;

export function deleteItem(id) {
    if (typeof showConfirm === "function") {
        showConfirm("Confirm Delete", `Are you sure you want to delete item #${id}?`, async () => {
            await executeDeleteItem(id);
        });
    } else if (confirm(`Are you sure you want to delete item #${id}?`)) {
        executeDeleteItem(id);
    }
}
window.deleteItem = deleteItem;

async function executeDeleteItem(id) {
    try {
        const res = await fetch(`/api/sample/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to delete item");

        if (window.toastr) toastr.success("Item deleted successfully");
        reloadTable();
    } catch (err) {
        if (window.toastr) toastr.error(err.message);
    }
}
