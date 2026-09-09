/**
 * System Configuration & User Management Module
 * Standardized PKS V5 ES Module Architecture
 */

let userTable = null;

// =============================================================================
// 📑 TAB MANAGEMENT (Persistent State via localStorage)
// =============================================================================

export function event_tab_active(el) {
    if (!el) return;
    const tab_id = el.id;
    localStorage.setItem("SYSTEM_CONFIG_TAB_ACTIVE", tab_id);
    console.log("🚀 Tab changed to:", tab_id);
}
window.event_tab_active = event_tab_active;

export function switch_to_tab(tabId) {
    const tabInput = document.getElementById(tabId);
    if (tabInput) {
        tabInput.checked = true;
        event_tab_active(tabInput);
    }
}
window.switch_to_tab = switch_to_tab;

function restore_active_tab() {
    const activeTabId = localStorage.getItem("SYSTEM_CONFIG_TAB_ACTIVE");
    if (activeTabId) {
        const tabEl = document.getElementById(activeTabId);
        if (tabEl) {
            tabEl.checked = true;
        }
    }
}

// =============================================================================
// 🪟 MODAL CONTROLLERS
// =============================================================================

export function show_dialog_general_config() {
    const modal = document.getElementById("modal_general_config");
    if (modal) modal.showModal();
}
window.show_dialog_general_config = show_dialog_general_config;

export function show_dialog_change_password() {
    const modal = document.getElementById("modal_change_password");
    if (modal) modal.showModal();
}
window.show_dialog_change_password = show_dialog_change_password;

export function show_dialog_create_user() {
    const modal = document.getElementById("modal_create_user");
    if (modal) {
        document.getElementById("createUserForm")?.reset();
        modal.showModal();
    }
}
window.show_dialog_create_user = show_dialog_create_user;

export function show_dialog_sse_broadcast() {
    const modal = document.getElementById("modal_sse_broadcast");
    if (modal) modal.showModal();
}
window.show_dialog_sse_broadcast = show_dialog_sse_broadcast;

// =============================================================================
// ⚙️ APPLICATION CONFIGURATIONS
// =============================================================================

export async function loadConfigs() {
    try {
        const res = await fetch("/api/system_config/all");
        if (res.ok) {
            const configs = await res.json();
            if (configs.app_title && document.getElementById("cfgAppTitle")) {
                document.getElementById("cfgAppTitle").value = configs.app_title;
            }
            if (configs.app_description && document.getElementById("cfgAppDesc")) {
                document.getElementById("cfgAppDesc").value = configs.app_description;
            }
            if (configs.records_per_page && document.getElementById("cfgPerPage")) {
                document.getElementById("cfgPerPage").value = configs.records_per_page;
            }
        }
    } catch (err) {
        console.warn("Failed to load configs:", err);
    }
}
window.loadConfigs = loadConfigs;

export async function saveConfigs(e) {
    if (e) e.preventDefault();
    const titleVal = document.getElementById("cfgAppTitle")?.value.trim() || "";
    const descVal = document.getElementById("cfgAppDesc")?.value.trim() || "";
    const perPageVal = document.getElementById("cfgPerPage")?.value || "10";

    const payload = {
        configs: {
            app_title: titleVal,
            app_description: descVal,
            records_per_page: perPageVal,
        },
    };

    try {
        const res = await fetch("/api/system_config/batch-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to save settings");

        if (typeof toastr !== "undefined") {
            toastr.success("Settings saved successfully!");
        } else {
            alert("Settings saved successfully!");
        }
        document.getElementById("modal_general_config")?.close();
    } catch (err) {
        if (typeof toastr !== "undefined") {
            toastr.error(err.message);
        } else {
            alert("Error: " + err.message);
        }
    }
}
window.saveConfigs = saveConfigs;

// =============================================================================
// 🔒 PASSWORD MANAGEMENT
// =============================================================================

export async function changePasswordModal(e) {
    if (e) e.preventDefault();
    const oldPass = document.getElementById("modalOldPassword")?.value || "";
    const newPass = document.getElementById("modalNewPassword")?.value || "";
    const confirmPass = document.getElementById("modalConfirmPassword")?.value || "";

    if (newPass !== confirmPass) {
        if (typeof toastr !== "undefined") toastr.error("New passwords do not match!");
        return;
    }

    try {
        const res = await fetch("/api/system_user/change-password", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ old_password: oldPass, new_password: newPass }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to change password");

        if (typeof toastr !== "undefined") toastr.success("Password updated successfully!");
        document.getElementById("passwordFormModal")?.reset();
        document.getElementById("modal_change_password")?.close();
    } catch (err) {
        if (typeof toastr !== "undefined") toastr.error(err.message);
    }
}
window.changePasswordModal = changePasswordModal;

export async function changePassword(e) {
    if (e) e.preventDefault();
    const oldPass = document.getElementById("tabOldPassword")?.value || "";
    const newPass = document.getElementById("tabNewPassword")?.value || "";
    const confirmPass = document.getElementById("tabConfirmPassword")?.value || "";

    if (newPass !== confirmPass) {
        if (typeof toastr !== "undefined") toastr.error("New passwords do not match!");
        return;
    }

    try {
        const res = await fetch("/api/system_user/change-password", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ old_password: oldPass, new_password: newPass }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to change password");

        if (typeof toastr !== "undefined") toastr.success("Password updated successfully!");
        document.getElementById("passwordFormTab")?.reset();
    } catch (err) {
        if (typeof toastr !== "undefined") toastr.error(err.message);
    }
}
window.changePassword = changePassword;

// =============================================================================
// 👥 USER MANAGEMENT (DataTables)
// =============================================================================

function initUserTable() {
    if (typeof $ === "undefined" || !document.getElementById("tableSystemUsers")) return;

    userTable = $("#tableSystemUsers").DataTable({
        processing: true,
        serverSide: true,
        responsive: true,
        ajax: {
            url: "/api/system_user/datatable",
            type: "GET",
        },
        columns: [
            {
                data: "id",
                render: (d) => `<span class="badge badge-outline badge-primary font-mono text-[11px] font-bold">#${d}</span>`,
            },
            {
                data: "username",
                className: "font-bold text-base-content",
            },
            {
                data: "name",
                render: (d) => d || `<span class="text-base-content/40 italic">-</span>`,
            },
            {
                data: "email",
                render: (d) => d || `<span class="text-base-content/40 italic">-</span>`,
            },
            {
                data: "role",
                render: (d) => {
                    const color = d === "admin" ? "badge-primary" : d === "manager" ? "badge-secondary" : "badge-ghost";
                    return `<span class="badge ${color} badge-sm font-semibold capitalize">${d}</span>`;
                },
            },
            {
                data: "is_active",
                render: (d) =>
                    d
                        ? `<span class="badge badge-success badge-xs gap-1"><span class="w-1 h-1 rounded-full bg-white"></span> Active</span>`
                        : `<span class="badge badge-error badge-xs">Inactive</span>`,
            },
            {
                data: "created_at",
                className: "text-base-content/70",
            },
            {
                data: null,
                orderable: false,
                className: "text-center",
                render: (row) => {
                    return `
                        <button type="button" class="btn btn-ghost btn-xs text-error hover:bg-error/10" title="Delete User" onclick="deleteUser(${row.id}, '${row.username}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    `;
                },
            },
        ],
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search users...",
            lengthMenu: "Show _MENU_",
            info: "_START_ - _END_ of _TOTAL_",
            paginate: {
                next: "<i class='fa-solid fa-chevron-right'></i>",
                previous: "<i class='fa-solid fa-chevron-left'></i>",
            },
        },
    });
}

export function reloadUserTable() {
    if (userTable) userTable.ajax.reload(null, false);
}
window.reloadUserTable = reloadUserTable;

export async function createUser(e) {
    if (e) e.preventDefault();
    const payload = {
        username: document.getElementById("newUsername")?.value.trim() || "",
        password: document.getElementById("newUserPassword")?.value || "",
        name: document.getElementById("newFullName")?.value.trim() || "",
        email: document.getElementById("newUserEmail")?.value.trim() || null,
        role: document.getElementById("newUserRole")?.value || "operator",
        is_active: true,
    };

    try {
        const res = await fetch("/api/system_user/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to create user");

        if (typeof toastr !== "undefined") toastr.success(`User '${payload.username}' created!`);
        document.getElementById("createUserForm")?.reset();
        document.getElementById("modal_create_user")?.close();
        reloadUserTable();
    } catch (err) {
        if (typeof toastr !== "undefined") toastr.error(err.message);
    }
}
window.createUser = createUser;

export async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) return;

    try {
        const res = await fetch(`/api/system_user/${userId}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to delete user");

        if (typeof toastr !== "undefined") toastr.success(`User '${username}' deleted.`);
        reloadUserTable();
    } catch (err) {
        if (typeof toastr !== "undefined") toastr.error(err.message);
    }
}
window.deleteUser = deleteUser;

// =============================================================================
// 💾 DATABASE BACKUP CONTROLLER
// =============================================================================

export async function loadBackups() {
    const tbody = document.getElementById("tbodyBackups");
    if (!tbody) return;

    try {
        const res = await fetch("/api/system_config/backups");
        if (res.ok) {
            const data = await res.json();
            const backups = data.backups || [];
            if (backups.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-base-content/40">No backups found</td></tr>`;
                return;
            }

            tbody.innerHTML = backups
                .map(
                    (b) => `
                <tr class="hover:bg-base-200/50">
                    <td class="font-mono font-medium text-primary">${b.filename}</td>
                    <td><span class="badge badge-ghost badge-xs font-mono">${b.size_mb} MB</span></td>
                    <td class="text-base-content/70">${b.created_at.replace("T", " ").substring(0, 19)}</td>
                    <td><span class="badge ${b.is_compressed ? "badge-info" : "badge-ghost"} badge-xs">${b.is_compressed ? "GZIP (.db.gz)" : "RAW (.db)"}</span></td>
                </tr>
            `
                )
                .join("");
        }
    } catch (err) {
        console.warn("Failed to load backups:", err);
    }
}
window.loadBackups = loadBackups;

export async function createBackup() {
    const btn = document.getElementById("btnCreateBackup");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="loading loading-spinner loading-xs"></span> Creating Snapshot...`;
    }

    try {
        const res = await fetch("/api/system_config/backup/create", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Backup creation failed");

        if (typeof toastr !== "undefined") {
            toastr.success(`Backup created: ${data.filename} (${data.compressed_size_mb || data.raw_size_mb} MB)`);
        }
        await loadBackups();
    } catch (err) {
        if (typeof toastr !== "undefined") toastr.error(err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-shield-halved"></i> <span>Backup Database Now</span>`;
        }
    }
}
window.createBackup = createBackup;

// =============================================================================
// 📡 REAL-TIME SSE BROADCAST TESTER
// =============================================================================

export async function sendBroadcastSSE(e) {
    if (e) e.preventDefault();
    const topic = document.getElementById("sseTopic")?.value.trim() || "INFO";
    const msg = document.getElementById("sseMessage")?.value.trim() || "";

    try {
        const res = await fetch("/broadcast_sse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic: topic, message: msg, timestamp: new Date().toISOString() }),
        });
        if (res.ok) {
            if (typeof toastr !== "undefined") toastr.success("SSE Broadcast event sent!");
            document.getElementById("modal_sse_broadcast")?.close();
        } else {
            throw new Error("Failed to broadcast SSE");
        }
    } catch (err) {
        if (typeof toastr !== "undefined") toastr.error(err.message);
    }
}
window.sendBroadcastSSE = sendBroadcastSSE;

// =============================================================================
// 🚀 INITIALIZATION
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
    restore_active_tab();
    loadConfigs();
    initUserTable();
    loadBackups();
});
