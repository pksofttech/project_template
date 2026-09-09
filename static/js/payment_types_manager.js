import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// Make unity and changeLang globally available
window.unity = unity;
window.changeLang = unity.changeLang;

export function getPaymentIcon(code) {
    const c = (code || "").toUpperCase();
    if (c.includes("CASH")) return { icon: "fa-money-bill-wave", color: "text-success", bg: "bg-success/10" };
    if (c.includes("PROMPT") || c.includes("QR")) return { icon: "fa-qrcode", color: "text-info", bg: "bg-info/10" };
    if (c.includes("TRANSFER")) return { icon: "fa-building-columns", color: "text-primary", bg: "bg-primary/10" };
    if (
        c.includes("UNION") ||
        c.includes("VISA") ||
        c.includes("MASTER") ||
        c.includes("CARD") ||
        c.includes("CREDIT") ||
        c.includes("JCB") ||
        c.includes("AMEX")
    ) {
        return { icon: "fa-credit-card", color: "text-warning", bg: "bg-warning/10" };
    }
    if (c.includes("ALIPAY") || c.includes("WECHAT"))
        return { icon: "fa-mobile-screen-button", color: "text-secondary", bg: "bg-secondary/10" };
    return { icon: "fa-wallet", color: "text-base-content/70", bg: "bg-base-200" };
}

// -----------------------------------------------------------------------------
// TableModel Instance for Payment Types
// -----------------------------------------------------------------------------
export const payment_types_table = new table_class.TableModel(
    "#payment_types_table",
    "/api/v1/payment-types/datatable",
    {
        table: "Sys_Payment_Types",
        columns: [
            {
                data: "Sys_Payment_Types.id",
                title: `<span data-i18n="Action">Action</span>`,
                className: "text-center noExport w-24",
                orderable: false,
                render: function (data, type, row) {
                    const safeCode = (row.code || "").replace(/'/g, "\\'");
                    return `
                        <div class="inline-flex border border-base-content/10 rounded-box shadow-2xs overflow-hidden" role="group">
                            <button type="button" class="btn btn-ghost btn-xs text-primary btn-edit-payment" title="Edit" onclick="openEditModal(${row.id})">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button type="button" class="btn btn-ghost btn-xs text-error btn-delete-payment" title="Delete" onclick="deletePaymentType(${row.id}, '${safeCode}')">
                                <i class="far fa-trash-alt"></i>
                            </button>
                        </div>`;
                },
            },
            {
                data: "Sys_Payment_Types.is_active",
                title: `<span data-i18n="Status">Status</span>`,
                className: "text-center w-36",
                render: function (data, type, row) {
                    const is_active = row.is_active;
                    return `
                        <div class="flex items-center justify-center gap-2">
                            <input type="checkbox" class="toggle toggle-success toggle-sm"
                                ${is_active ? "checked" : ""}
                                onchange="toggleActive(${row.id}, this.checked)" />
                            <span class="badge badge-sm font-medium ${is_active ? "badge-success badge-soft" : "badge-ghost opacity-60"}" data-i18n="${is_active ? "Active" : "Inactive"}">
                                ${is_active ? "Active" : "Inactive"}
                            </span>
                        </div>`;
                },
            },
            {
                data: "Sys_Payment_Types.code",
                title: `<span data-i18n="Payment Code">Payment Code</span>`,
                className: "font-mono",
                render: function (data, type, row) {
                    const meta = getPaymentIcon(row.code);
                    return `
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-box ${meta.bg} ${meta.color} flex items-center justify-center shrink-0 shadow-2xs">
                                <i class="fa-solid ${meta.icon}"></i>
                            </div>
                            <span class="badge badge-outline font-mono font-bold text-xs ${row.is_active ? "badge-primary" : "badge-ghost opacity-60"}">
                                ${row.code || "-"}
                            </span>
                        </div>`;
                },
            },
            {
                data: "Sys_Payment_Types.name_en",
                title: `<span data-i18n="English Name">English Name</span>`,
                render: (data, type, row) =>
                    `<span class="font-semibold text-base-content/90">${row.name_en || "-"}</span>`,
            },
            {
                data: "Sys_Payment_Types.name_th",
                title: `<span data-i18n="Thai Name">Thai Name</span>`,
                render: (data, type, row) =>
                    `<span class="text-base-content/80">${row.name_th || '<span class="text-base-content/30 italic">-</span>'}</span>`,
            },
        ],
    },
    {
        addbtn: false,
        on_loaded: () => {
            updateStats();
            if (window.unity && typeof window.unity.updateContent === "function") {
                window.unity.updateContent();
            }
        },
    },
);

export async function updateStats() {
    try {
        const res = await fetch("/api/v1/payment-types/");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
            const list = data.data;
            const total = list.length;
            const active = list.filter((x) => x.is_active).length;
            const inactive = total - active;

            const totalEl = document.getElementById("stat_total");
            const activeEl = document.getElementById("stat_active");
            const inactiveEl = document.getElementById("stat_inactive");

            if (totalEl) totalEl.textContent = total;
            if (activeEl) activeEl.textContent = active;
            if (inactiveEl) inactiveEl.textContent = inactive;
        }
    } catch (err) {
        console.error("Failed to update stats:", err);
    }
}

export async function toggleActive(id, isActive) {
    try {
        const res = await fetch(`/api/v1/payment-types/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: isActive }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.detail || "Failed to update status");
        }

        payment_types_table.reload();
        updateStats();

        if (typeof Swal !== "undefined") {
            Swal.fire({
                icon: "success",
                title: isActive ? "เปิดใช้งานช่องทางแล้ว" : "ปิดใช้งานช่องทางแล้ว",
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 1500,
            });
        }
    } catch (err) {
        console.error(err);
        if (typeof Swal !== "undefined") {
            Swal.fire("ข้อผิดพลาด", "ไม่สามารถบันทึกสถานะได้ กรุณาลองใหม่อีกครั้ง", "error");
        }
        payment_types_table.reload();
    }
}

export function openAddModal() {
    const form = document.getElementById("form_add_payment");
    if (!form) return;
    form.reset();
    const activeCheckbox = form.querySelector('input[name="is_active"]');
    if (activeCheckbox) activeCheckbox.checked = true;

    const modal = document.getElementById("modal_add_payment");
    if (modal) {
        modal.showModal();
        if (window.unity && typeof window.unity.updateContent === "function") {
            window.unity.updateContent(modal);
        }
    }
}

export async function addPaymentType(e) {
    e.preventDefault();
    const form = e.target;
    const btn = document.getElementById("btn_save_add");

    const bodyData = {
        code: form.code.value.trim(),
        name_en: form.name_en.value.trim(),
        name_th: form.name_th.value.trim() || null,
        is_active: form.is_active.checked,
    };

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> กำลังบันทึก...';
        }

        const res = await fetch("/api/v1/payment-types/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData),
        });
        const data = await res.json();

        if (res.ok && data.success) {
            const modal = document.getElementById("modal_add_payment");
            if (modal) modal.close();
            form.reset();
            payment_types_table.reload();
            updateStats();
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    icon: "success",
                    title: "เพิ่มช่องทางชำระเงินสำเร็จ!",
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 1800,
                });
            }
        } else {
            if (typeof Swal !== "undefined") {
                Swal.fire("ไม่สามารถเพิ่มได้", data.detail || "รหัส Code นี้อาจมีอยู่แล้วในระบบ", "warning");
            }
        }
    } catch (err) {
        console.error(err);
        if (typeof Swal !== "undefined") {
            Swal.fire("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML =
                '<i class="fa-solid fa-floppy-disk text-xs"></i> <span data-i18n="Save Data">บันทึกข้อมูล</span>';
            if (window.unity && typeof window.unity.updateContent === "function") {
                window.unity.updateContent(btn);
            }
        }
    }
}

export async function openEditModal(id) {
    try {
        const res = await fetch("/api/v1/payment-types/");
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) return;

        const item = data.data.find((x) => x.id === id);
        if (!item) return;

        const editIdEl = document.getElementById("edit_id");
        const editCodeEl = document.getElementById("edit_code");
        const editNameEnEl = document.getElementById("edit_name_en");
        const editNameThEl = document.getElementById("edit_name_th");
        const editIsActiveEl = document.getElementById("edit_is_active");

        if (editIdEl) editIdEl.value = item.id;
        if (editCodeEl) editCodeEl.value = item.code;
        if (editNameEnEl) editNameEnEl.value = item.name_en || "";
        if (editNameThEl) editNameThEl.value = item.name_th || "";
        if (editIsActiveEl) editIsActiveEl.checked = Boolean(item.is_active);

        const modal = document.getElementById("modal_edit_payment");
        if (modal) {
            modal.showModal();
            if (window.unity && typeof window.unity.updateContent === "function") {
                window.unity.updateContent(modal);
            }
        }
    } catch (err) {
        console.error("Failed to open edit modal:", err);
    }
}

export async function saveEditPaymentType(e) {
    e.preventDefault();
    const form = e.target;
    const id = document.getElementById("edit_id")?.value;
    const btn = document.getElementById("btn_save_edit");

    const bodyData = {
        code: form.code.value.trim(),
        name_en: form.name_en.value.trim(),
        name_th: form.name_th.value.trim() || null,
        is_active: form.is_active.checked,
    };

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> กำลังบันทึก...';
        }

        const res = await fetch(`/api/v1/payment-types/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData),
        });
        const data = await res.json();

        if (res.ok && data.success) {
            const modal = document.getElementById("modal_edit_payment");
            if (modal) modal.close();
            payment_types_table.reload();
            updateStats();
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    icon: "success",
                    title: "บันทึกการแก้ไขสำเร็จ!",
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 1800,
                });
            }
        } else {
            if (typeof Swal !== "undefined") {
                Swal.fire("ไม่สามารถแก้ไขได้", data.detail || "เกิดข้อผิดพลาดในการบันทึก", "warning");
            }
        }
    } catch (err) {
        console.error(err);
        if (typeof Swal !== "undefined") {
            Swal.fire("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML =
                '<i class="fa-solid fa-floppy-disk text-xs"></i> <span data-i18n="Save Changes">บันทึกการแก้ไข</span>';
            if (window.unity && typeof window.unity.updateContent === "function") {
                window.unity.updateContent(btn);
            }
        }
    }
}

export async function deletePaymentType(id, code) {
    if (!id) return;

    const result = await unity.showDialogConfirm({
        title: "ยืนยันการลบข้อมูล",
        content: `คุณต้องการลบช่องทางการชำระเงิน <strong class="text-primary font-mono">${code || id}</strong> ใช่หรือไม่?<br><span class="text-error text-xs font-semibold">การกระทำนี้ไม่สามารถเรียกคืนได้</span>`,
    });

    if (!result || !result.confirm) return;

    try {
        const res = await fetch(`/api/v1/payment-types/${id}`, {
            method: "DELETE",
        });
        const data = await res.json();

        if (res.ok && data.success) {
            const editModal = document.getElementById("modal_edit_payment");
            if (editModal && typeof editModal.close === "function" && editModal.open) {
                editModal.close();
            }
            payment_types_table.reload();
            updateStats();
            unity.showDialogSuccess({
                title: "ลบข้อมูลสำเร็จ",
                msg: `ลบช่องทางการชำระเงิน ${code || id} เรียบร้อยแล้ว`,
            });
        } else {
            unity.showDialogWarning({
                title: "ไม่สามารถลบได้",
                msg: data.detail || data.message || "เกิดข้อผิดพลาดในการลบข้อมูล",
            });
        }
    } catch (err) {
        console.error("Failed to delete payment type:", err);
        unity.showDialogError({
            title: "ข้อผิดพลาด",
            msg: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
        });
    }
}

export function deleteFromEditModal() {
    const id = document.getElementById("edit_id")?.value;
    const code = document.getElementById("edit_code")?.value;
    if (id) {
        deletePaymentType(Number(id), code);
    }
}

// Expose functions to global window for HTML onclick/onchange handlers
window.toggleActive = toggleActive;
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.addPaymentType = addPaymentType;
window.saveEditPaymentType = saveEditPaymentType;
window.deletePaymentType = deletePaymentType;
window.deleteFromEditModal = deleteFromEditModal;

async function Init() {
    payment_types_table.init();
    updateStats();
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
