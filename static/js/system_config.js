import { TableModel, actionButtonsTemplate } from "./_table_class.js";
import * as unity from "./unity.js";

export let userTable = null;

// =============================================================================
// 📑 TAB MANAGEMENT (Persistent State via localStorage)
// =============================================================================

export function event_tab_active(el) {
    if (!el) return;
    const tab_id = el.id;
    localStorage.setItem("SYSTEM_CONFIG_TAB_ACTIVE", tab_id);
    console.log("🚀 Tab changed to:", tab_id);

    if (tab_id === "SYSTEM_CONFIG_TAB02" && userTable?.table) {
        setTimeout(() => {
            userTable.table.columns.adjust().responsive?.recalc();
        }, 150);
    }
    if ((tab_id === "SYSTEM_CONFIG_TAB03" || tab_id === "SYSTEM_CONFIG_TAB_USER_TYPE") && userTypeTable?.table) {
        setTimeout(() => {
            userTypeTable.table.columns.adjust().responsive?.recalc();
        }, 150);
    }
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

export function handleUrlTab() {
    const searchParams = new URLSearchParams(window.location.search);
    let tabTarget = searchParams.get("tab");
    if (!tabTarget && window.location.hash) {
        tabTarget = window.location.hash.replace(/^#tab=/, "").replace(/^#/, "");
    }
    if (!tabTarget) return false;

    const t = tabTarget.toLowerCase();
    if (t === "general" || t === "config") {
        switch_to_tab("SYSTEM_CONFIG_TAB01");
        setTimeout(() => show_dialog_general_config(), 120);
        return true;
    } else if (t === "users" || t === "user" || t === "tab02" || t === "system_config_tab02") {
        switch_to_tab("SYSTEM_CONFIG_TAB02");
        return true;
    } else if (t === "roles" || t === "user_types" || t === "role" || t === "tab03" || t === "system_config_tab03") {
        switch_to_tab("SYSTEM_CONFIG_TAB03");
        return true;
    } else if (t === "database" || t === "backup" || t === "maintenance" || t === "tab04" || t === "system_config_tab04") {
        switch_to_tab("SYSTEM_CONFIG_TAB04");
        return true;
    } else if (t === "sse" || t === "broadcast") {
        switch_to_tab("SYSTEM_CONFIG_TAB01");
        setTimeout(() => show_dialog_sse_broadcast(), 120);
        return true;
    } else if (t === "password" || t === "security") {
        switch_to_tab("SYSTEM_CONFIG_TAB01");
        setTimeout(() => show_dialog_change_password(), 120);
        return true;
    } else if (t === "overview" || t === "all" || t === "tab01" || t === "system_config_tab01") {
        switch_to_tab("SYSTEM_CONFIG_TAB01");
        return true;
    }
    return false;
}
window.handleUrlTab = handleUrlTab;

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



// =============================================================================
// 👥 USER MANAGEMENT (_table_class.js Base)
// =============================================================================

export function initUserTable() {
    const tableContainer = document.getElementById("system_user_table");
    if (!tableContainer) return;

    userTable = new TableModel(
        "#system_user_table",
        "/api/system_user/datatable",
        {
            table: "System_Users",
            order: [[1, "desc"]],
            columns: [
                {
                    data: "id",
                    title: `<h3 class="font-bold text-xs">Action</h3>`,
                    className: "noExport text-center",
                    orderable: false,
                    render: function (data, type, row) {
                        return actionButtonsTemplate(row.id);
                    },
                },
                {
                    data: "id",
                    title: "ID",
                    className: "text-center font-mono font-bold text-xs",
                    render: (data, type, row) =>
                        `<span class="badge badge-outline badge-primary font-mono text-[11px] font-bold">#${row.id}</span>`,
                },
                {
                    data: "username",
                    title: "Username",
                    className: "font-bold text-base-content",
                    render: (data, type, row) => `
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                <i class="fa-solid fa-user"></i>
                            </div>
                            <span class="font-bold text-sm text-base-content">${row.username}</span>
                        </div>`,
                },
                {
                    data: "name",
                    title: "Full Name",
                    render: (data, type, row) => row.name || `<span class="text-base-content/40 italic">-</span>`,
                },
                {
                    data: "email",
                    title: "Email",
                    render: (data, type, row) =>
                        row.email && row.email !== "-"
                            ? `<a href="mailto:${row.email}" class="link link-hover text-primary">${row.email}</a>`
                            : `<span class="text-base-content/40 italic">-</span>`,
                },
                {
                    data: "role",
                    title: "Role",
                    className: "text-center",
                    render: (data, type, row) => {
                        const r = row.role;
                        const color = r === "admin" ? "badge-primary" : r === "manager" ? "badge-secondary" : "badge-ghost";
                        return `<span class="badge ${color} badge-sm font-semibold capitalize">${r}</span>`;
                    },
                },
                {
                    data: "is_active",
                    title: "Status",
                    className: "text-center",
                    render: (data, type, row) =>
                        row.is_active
                            ? `<span class="badge badge-success badge-xs gap-1"><span class="w-1.5 h-1.5 rounded-full bg-white"></span> Active</span>`
                            : `<span class="badge badge-error badge-xs">Inactive</span>`,
                },
                {
                    data: "created_at",
                    title: "Created Date",
                    className: "text-center text-base-content/70 text-xs",
                },
            ],
        },
        {
            addbtn: true,
            addbtn_extra_id: "btnAddUser",
        }
    );

    const modal = document.getElementById("modal_create_user");
    if (modal) {
        userTable.create_item_control({
            modal_from: modal,
            api_endpoint: "/api/system_user",
            add_callback: (m) => {
                const titleEl = m.querySelector('[data-field="title"]');
                if (titleEl) titleEl.textContent = "Add New System User";
                const passLabel = m.querySelector("#labelUserPassword");
                if (passLabel) passLabel.textContent = "Password *";
                const passInput = m.querySelector('[data-field="password"]');
                if (passInput) {
                    passInput.required = true;
                    passInput.value = "";
                    passInput.placeholder = "Min 6 chars";
                }
                const userInput = m.querySelector('[data-field="username"]');
                if (userInput) userInput.disabled = false;
                const activeInput = m.querySelector('[data-field="is_active"]');
                if (activeInput) activeInput.checked = true;
                const submitText = m.querySelector("#btnSubmitUserText");
                if (submitText) submitText.textContent = "Create Account";
            },
            manager_callback: (data, m) => {
                const titleEl = m.querySelector('[data-field="title"]');
                if (titleEl) titleEl.textContent = `Edit System User: ${data.username}`;
                const passLabel = m.querySelector("#labelUserPassword");
                if (passLabel) passLabel.textContent = "New Password (optional)";
                const passInput = m.querySelector('[data-field="password"]');
                if (passInput) {
                    passInput.required = false;
                    passInput.value = "";
                    passInput.placeholder = "Leave blank to keep current";
                }
                const userInput = m.querySelector('[data-field="username"]');
                if (userInput) userInput.disabled = true;
                const activeInput = m.querySelector('[data-field="is_active"]');
                if (activeInput) activeInput.checked = Boolean(data.is_active);
                const submitText = m.querySelector("#btnSubmitUserText");
                if (submitText) submitText.textContent = "Save Changes";
            },
        });

        const form = modal.querySelector("#createUserForm");
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const btnSubmit = modal.querySelector('[data-field="btn_submit"]');
                if (btnSubmit) btnSubmit.click();
            };
        }
    }

    userTable.init();
}

export function reloadUserTable() {
    if (userTable) userTable.reload();
}
window.reloadUserTable = reloadUserTable;

export function show_dialog_create_user() {
    if (userTable?.model_control) {
        userTable.model_control.add();
    } else {
        const modal = document.getElementById("modal_create_user");
        if (modal) modal.showModal();
    }
}
window.show_dialog_create_user = show_dialog_create_user;

export async function deleteUser(userId, username) {
    if (userTable?.model_control) {
        userTable.model_control.remove(userId);
    }
}
window.deleteUser = deleteUser;

// =============================================================================
// 👥 SYSTEM USER TYPES CONTROLLER (_table_class.js base)
// =============================================================================

export let userTypeTable = null;

const HOME_ITEM = [
    "General Settings",
    "User Management",
    "User Types",
    "Database & Backup",
    "Real-time SSE",
    "API Documentation",
    "Sample Manager",
];

function init_drag_drop() {
    let draggingEl = null;

    function getAfterElement(container, y) {
        const items = [...container.querySelectorAll(".drag-item:not(.dragging)")];
        return items.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - (box.top + box.height / 2);
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: child };
                }
                return closest;
            },
            { offset: Number.NEGATIVE_INFINITY, element: null },
        ).element;
    }

    function bindDragItems(root = document) {
        root.querySelectorAll(".drag-item").forEach((item) => {
            item.setAttribute("draggable", "true");
            item.ondragstart = (e) => {
                draggingEl = item;
                item.classList.add("dragging", "opacity-60");
                e.dataTransfer.effectAllowed = "move";
            };
            item.ondragend = () => {
                item.classList.remove("dragging", "opacity-60");
                draggingEl = null;
                document.querySelectorAll(".dropzone").forEach((z) => z.classList.remove("ring-2", "ring-primary/40"));
            };
        });
    }

    bindDragItems();

    document.querySelectorAll(".dropzone").forEach((zone) => {
        zone.ondragover = (e) => {
            e.preventDefault();
            if (!draggingEl) return;
            zone.classList.add("ring-2", "ring-primary/40");
            const afterEl = getAfterElement(zone, e.clientY);
            if (afterEl == null) zone.appendChild(draggingEl);
            else zone.insertBefore(draggingEl, afterEl);
        };

        zone.ondragleave = () => {
            zone.classList.remove("ring-2", "ring-primary/40");
        };

        zone.ondrop = (e) => {
            e.preventDefault();
            zone.classList.remove("ring-2", "ring-primary/40");
        };
    });
}

export function initUserTypeTable() {
    const tableEl = document.querySelector("#system_user_type_table");
    if (!tableEl) return;

    userTypeTable = new TableModel(
        "#system_user_type_table",
        "/api/system_user/type/datatable",
        {
            table: "System_User_Type",
            order: [[1, "asc"]],
            columns: [
                {
                    data: "System_User_Type.id",
                    title: `<h3 class="font-bold text-xs">Action</h3>`,
                    className: "noExport text-center",
                    orderable: false,
                    render: function (data, type, row) {
                        const id = row?.["System_User_Type.id"] ?? row?.id ?? data;
                        return actionButtonsTemplate(id);
                    },
                },
                {
                    data: "System_User_Type.id",
                    title: "ID",
                    className: "text-center font-mono font-bold text-xs",
                    render: (data, type, row) => {
                        const id = row?.["System_User_Type.id"] ?? row?.id ?? data;
                        return `<span class="badge badge-outline badge-info font-mono text-[11px] font-bold">#${id}</span>`;
                    },
                },
                {
                    data: "System_User_Type.user_type",
                    title: "Role Type",
                    className: "font-bold text-base-content",
                    render: (data, type, row) => {
                        const val = row?.["System_User_Type.user_type"] ?? row?.user_type ?? data ?? "";
                        const badgeColor =
                            val === "ROOT"
                                ? "badge-error"
                                : val === "ADMIN"
                                ? "badge-primary"
                                : val === "ACCOUNT"
                                ? "badge-warning"
                                : val === "OPERATOR"
                                ? "badge-info"
                                : val === "DEVICES"
                                ? "badge-accent"
                                : "badge-ghost";
                        return `<span class="badge ${badgeColor} badge-sm font-bold tracking-wide">${val}</span>`;
                    },
                },
                {
                    data: "System_User_Type.description",
                    title: "Description",
                    render: (data, type, row) => {
                        const desc = row?.["System_User_Type.description"] ?? row?.description ?? data ?? "";
                        return desc || `<span class="text-base-content/40 italic">-</span>`;
                    },
                },
            ],
        },
        {
            addbtn: true,
            addbtn_extra_id: "btnAddUserType",
        }
    );

    const modal = document.getElementById("Modal_System_User_Type");
    if (modal) {
        userTypeTable.create_item_control({
            modal_from: modal,
            api_endpoint: "/api/system_user/type",
            add_callback: async (m) => {
                const titleEl = m.querySelector('[data-field="title"]');
                if (titleEl) titleEl.textContent = "Add New System User Type";
                const userTypeInput = m.querySelector('[data-field="user_type"]');
                if (userTypeInput) {
                    userTypeInput.disabled = false;
                    userTypeInput.value = "";
                }
                const descInput = m.querySelector('[data-field="description"]');
                if (descInput) descInput.value = "";

                const menuList = m.querySelector('[data-field="menu_list"]');
                if (menuList) {
                    menuList.querySelectorAll(".menu-toggle").forEach((el) => {
                        el.checked = false;
                    });
                }
                const sysConfigList = m.querySelector('[data-field="system_config_list"]');
                if (sysConfigList) {
                    sysConfigList.querySelectorAll(".menu-toggle").forEach((el) => {
                        el.checked = false;
                    });
                }

                const useBox = m.querySelector('[data-field="use_item_box"]');
                const notUseBox = m.querySelector('[data-field="not_use_item_box"]');
                const temp = document.getElementById("template_home_item");
                if (useBox && notUseBox && temp) {
                    useBox.innerHTML = "";
                    notUseBox.innerHTML = "";
                    for (let i = 0; i < HOME_ITEM.length; i++) {
                        const clone = temp.content.cloneNode(true);
                        clone.querySelector('[name="item_name"]').textContent = HOME_ITEM[i];
                        notUseBox.appendChild(clone);
                    }
                    init_drag_drop();
                }
            },
            manager_callback: async (data, m) => {
                const titleEl = m.querySelector('[data-field="title"]');
                if (titleEl) titleEl.textContent = `Edit User Type: ${data.user_type}`;
                const userTypeInput = m.querySelector('[data-field="user_type"]');
                if (userTypeInput) {
                    userTypeInput.value = data.user_type || "";
                    userTypeInput.disabled = Number(data.id) <= 6; // Protect default role names
                }
                const descInput = m.querySelector('[data-field="description"]');
                if (descInput) descInput.value = data.description || "";

                function parseJsonSafe(str) {
                    try {
                        const arr = JSON.parse(str);
                        return Array.isArray(arr) ? arr : [];
                    } catch {
                        return [];
                    }
                }

                const menuSetting = parseJsonSafe(data.menu_config);
                const isRoot = Number(data.id) === 1;
                const menuList = m.querySelector('[data-field="menu_list"]');
                if (menuList) {
                    const set = new Set(menuSetting);
                    menuList.querySelectorAll(".menu-toggle").forEach((el) => {
                        el.checked = isRoot || set.has(el.value);
                    });
                }

                const sysConfigSetting = parseJsonSafe(data.system_config);
                const sysConfigList = m.querySelector('[data-field="system_config_list"]');
                if (sysConfigList) {
                    const setSys = new Set(sysConfigSetting);
                    sysConfigList.querySelectorAll(".menu-toggle").forEach((el) => {
                        el.checked = isRoot || setSys.has(el.value);
                    });
                }

                const homeItemSetting = parseJsonSafe(data.home_item_config);
                const useBox = m.querySelector('[data-field="use_item_box"]');
                const notUseBox = m.querySelector('[data-field="not_use_item_box"]');
                const temp = document.getElementById("template_home_item");
                if (useBox && notUseBox && temp) {
                    useBox.innerHTML = "";
                    notUseBox.innerHTML = "";
                    for (let i = 0; i < homeItemSetting.length; i++) {
                        if (HOME_ITEM.includes(homeItemSetting[i])) {
                            const clone = temp.content.cloneNode(true);
                            clone.querySelector('[name="item_name"]').textContent = homeItemSetting[i];
                            useBox.appendChild(clone);
                        }
                    }
                    for (let i = 0; i < HOME_ITEM.length; i++) {
                        if (!homeItemSetting.includes(HOME_ITEM[i])) {
                            const clone = temp.content.cloneNode(true);
                            clone.querySelector('[name="item_name"]').textContent = HOME_ITEM[i];
                            notUseBox.appendChild(clone);
                        }
                    }
                    init_drag_drop();
                }
            },
            update_callback: async (formData, m) => {
                const menuList = m.querySelector('[data-field="menu_list"]');
                if (menuList) {
                    const menus = [...menuList.querySelectorAll(".menu-toggle:checked")].map((el) => el.value);
                    formData.set("menu_config", JSON.stringify(menus));
                }

                const sysConfigList = m.querySelector('[data-field="system_config_list"]');
                if (sysConfigList) {
                    const sysConfigs = [...sysConfigList.querySelectorAll(".menu-toggle:checked")].map((el) => el.value);
                    formData.set("system_config", JSON.stringify(sysConfigs));
                }

                const useBox = m.querySelector('[data-field="use_item_box"]');
                if (useBox) {
                    const homeItems = [...useBox.querySelectorAll('[name="item_name"]')].map((el) => el.textContent.trim());
                    formData.set("home_item_config", JSON.stringify(homeItems));
                }
            },
        });
    }

    userTypeTable.init();
}

export function reloadUserTypeTable() {
    if (userTypeTable) userTypeTable.reload();
}
window.reloadUserTypeTable = reloadUserTypeTable;

export function show_dialog_create_user_type() {
    if (userTypeTable?.model_control) {
        userTypeTable.model_control.add();
    } else {
        const modal = document.getElementById("Modal_System_User_Type");
        if (modal) modal.showModal();
    }
}
window.show_dialog_create_user_type = show_dialog_create_user_type;

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
    const urlHandled = handleUrlTab();
    if (!urlHandled) {
        restore_active_tab();
    }
    loadConfigs();
    initUserTable();
    initUserTypeTable();
    loadBackups();
    const activeTab = localStorage.getItem("SYSTEM_CONFIG_TAB_ACTIVE");
    if (activeTab === "SYSTEM_CONFIG_TAB02") {
        setTimeout(() => {
            userTable?.table?.columns?.adjust()?.responsive?.recalc?.();
        }, 200);
    } else if (activeTab === "SYSTEM_CONFIG_TAB03") {
        setTimeout(() => {
            userTypeTable?.table?.columns?.adjust()?.responsive?.recalc?.();
        }, 200);
    }
});

window.addEventListener("hashchange", () => {
    handleUrlTab();
});
