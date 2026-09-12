/**
 * members_manager.js - Cardholder & Multi-Modal Credentials Hub Controller
 */

import { TableModel, actionButtonsTemplate } from "/static/js/_table_class.js";

let tableModel = null;
let accessGroups = [];

$(document).ready(function () {
    loadAccessGroups();

    tableModel = new TableModel("#tableMembers", "/api/access/member/datatable", {
        table: "Access_Member",
        order: [[1, "asc"]],
        columns: [
            {
                data: "id",
                title: '<h3 class="font-bold text-xs text-center">Actions</h3>',
                orderable: false,
                searchable: false,
                className: "noExport text-center",
                render: function (data, type, row) {
                    const fullName = (row.first_name + " " + (row.last_name || "")).trim();
                    return `
                                    <div class="flex items-center justify-center gap-1">
                                        <button onclick="openEditModal(${data})" class="btn btn-ghost btn-xs btn-circle text-info hover:bg-info/15" title="Edit">
                                            <i class="fa-solid fa-pen-to-square"></i>
                                        </button>
                                        <button onclick="confirmDelete(${data}, '${row.first_name}')" class="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/15" title="Delete">
                                            <i class="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                `;
                },
            },
            {
                data: "id",
                name: "id",
                title: "#",
                className: "text-center font-mono font-bold text-xs",
                render: function (data) {
                    return `<span class="font-mono text-base-content/40">#${data}</span>`;
                },
            },
            {
                data: "first_name",
                name: "first_name",
                title: "Cardholder",
                render: function (data, type, row) {
                    const last = row.last_name || "";
                    const pic = row.picture_url;
                    const initial = data ? data.charAt(0).toUpperCase() : "?";
                    const avatarHtml = pic
                        ? `<img src="${pic}" class="w-8 h-8 rounded-full object-cover shrink-0 border border-base-content/10 shadow-xs" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0\\'>${initial}</div>';" />`
                        : `<div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">${initial}</div>`;
                    return `
                                    <div class="flex items-center gap-2.5">
                                        ${avatarHtml}
                                        <div>
                                            <div class="font-bold text-base-content">${data} ${last}</div>
                                            <div class="text-[10px] text-base-content/50 font-mono">${row.member_code}</div>
                                        </div>
                                    </div>
                                `;
                },
            },
            {
                data: "id",
                name: "credentials",
                title: "Credentials",
                className: "text-center",
                orderable: false,
                searchable: false,
                render: function (data, type, row) {
                    const fullName = (row.first_name + " " + (row.last_name || "")).trim();
                    const hasFace = Boolean(row.face_embedding && row.face_embedding.length > 20);
                    return `
                                    <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                        <button type="button" onclick="openCredentialsHub(${data}, '${fullName}', '${row.member_code}', '${row.picture_url || ""}', '${row.department || ""}', '${row.status || ""}')" class="btn btn-xs btn-outline btn-primary gap-1 font-semibold hover:scale-105 transition-transform" title="Manage RFID, Mobile, Fingerprint, Face, PIN">
                                            <i class="fa-solid fa-key text-[10px]"></i> Credentials Hub
                                        </button>
                                        ${
                                            hasFace
                                                ? `<button type="button" onclick="openFaceEnrollModal(${row.id}, '${fullName}', '${row.member_code}', '${row.picture_url || ""}', true)" class="badge badge-xs badge-success gap-0.5 font-mono cursor-pointer hover:scale-105 transition-transform" title="Face Enrolled"><i class="fa-solid fa-camera text-[9px]"></i> Face</button>`
                                                : `<button type="button" onclick="openFaceEnrollModal(${row.id}, '${fullName}', '${row.member_code}', '${row.picture_url || ""}', false)" class="badge badge-xs badge-ghost text-base-content/50 gap-0.5 font-mono cursor-pointer hover:scale-105 transition-transform" title="Add Face"><i class="fa-solid fa-plus text-[9px]"></i> Face</button>`
                                        }
                                    </div>
                                `;
                },
            },
            {
                data: "department",
                name: "department",
                title: "Department",
                render: function (data) {
                    return data ? `<span class="badge badge-sm badge-soft">${data}</span>` : "-";
                },
            },
            {
                data: "phone",
                name: "phone",
                title: "Phone",
                render: function (data) {
                    return `<span class="font-mono text-xs">${data || "-"}</span>`;
                },
            },
            {
                data: "email",
                name: "email",
                title: "Email",
                render: function (data) {
                    return `<span class="text-xs text-base-content/70">${data || "-"}</span>`;
                },
            },
            {
                data: "access_group_id",
                name: "access_group_id",
                title: "Access Group",
                render: function (data) {
                    if (!data) return '<span class="text-base-content/30 text-xs">No Group</span>';
                    const grp = accessGroups.find((g) => g.id === data);
                    return grp
                        ? `<span class="badge badge-xs badge-info font-bold">${grp.name}</span>`
                        : `<span class="badge badge-xs badge-neutral">Group #${data}</span>`;
                },
            },
            {
                data: "status",
                name: "status",
                title: "Status",
                render: function (data) {
                    const isActive = data === "active";
                    return `<span class="badge badge-sm ${isActive ? "badge-success" : "badge-error"} font-bold">
                                    ${data}
                                </span>`;
                },
            },
        ],
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search cardholders...",
            lengthMenu: "Show _MENU_",
            paginate: {
                previous: '<i class="fa-solid fa-chevron-left text-xs"></i>',
                next: '<i class="fa-solid fa-chevron-right text-xs"></i>',
            },
        },
    });

    tableModel.init();
    window.table = tableModel.table;
    window.tableModel = tableModel;
});

window.reloadTable = function () {
    tableModel?.reload();
};
window.openCreateModal = openCreateModal;
window.openEditModal = openEditModal;
window.confirmDelete = confirmDelete;
window.saveMember = saveMember;

async function loadAccessGroups() {
    try {
        const res = await fetch("/api/access/group/list/all");
        const result = await res.json();
        if (result.success && result.data) {
            accessGroups = result.data;
            const select = document.getElementById("memberAccessGroup");
            select.innerHTML =
                '<option value="">-- No Group Assigned --</option>' +
                accessGroups.map((g) => `<option value="${g.id}">${g.name} (${g.code})</option>`).join("");
        }
    } catch (err) {
        console.error("Failed to load access groups:", err);
    }
}

function openCreateModal() {
    document.getElementById("memberId").value = "";
    document.getElementById("memberCode").value = "";
    document.getElementById("firstName").value = "";
    document.getElementById("lastName").value = "";
    document.getElementById("memberDept").value = "General";
    document.getElementById("memberPhone").value = "";
    document.getElementById("memberEmail").value = "";
    document.getElementById("memberAccessGroup").value = "";
    document.getElementById("memberStatus").value = "active";
    document.getElementById("memberExpire").value = "";
    document.getElementById("modalTitle").innerHTML = '<i class="fa-solid fa-id-card"></i><span>Add Cardholder</span>';
    memberModal.showModal();
}

async function openEditModal(id) {
    try {
        const res = await fetch(`/api/access/member/${id}`);
        const result = await res.json();
        if (!result.success) {
            if (window.toast) toast.error("Failed to load member data");
            return;
        }
        const m = result.data;
        document.getElementById("memberId").value = m.id;
        document.getElementById("memberCode").value = m.member_code;
        document.getElementById("firstName").value = m.first_name;
        document.getElementById("lastName").value = m.last_name || "";
        document.getElementById("memberDept").value = m.department || "";
        document.getElementById("memberPhone").value = m.phone || "";
        document.getElementById("memberEmail").value = m.email || "";
        document.getElementById("memberAccessGroup").value = m.access_group_id || "";
        document.getElementById("memberStatus").value = m.status || "active";
        document.getElementById("memberExpire").value = m.expire_date ? m.expire_date.substring(0, 10) : "";
        document.getElementById("modalTitle").innerHTML =
            '<i class="fa-solid fa-pen-to-square"></i><span>Edit Cardholder</span>';
        memberModal.showModal();
    } catch (err) {
        console.error("Edit load error:", err);
    }
}

async function saveMember(event) {
    event.preventDefault();
    const id = document.getElementById("memberId").value;
    const groupIdVal = document.getElementById("memberAccessGroup").value;

    const payload = {
        member_code: document.getElementById("memberCode").value.trim(),
        first_name: document.getElementById("firstName").value.trim(),
        last_name: document.getElementById("lastName").value.trim(),
        department: document.getElementById("memberDept").value.trim(),
        phone: document.getElementById("memberPhone").value.trim(),
        email: document.getElementById("memberEmail").value.trim(),
        access_group_id: groupIdVal ? parseInt(groupIdVal, 10) : null,
        status: document.getElementById("memberStatus").value,
        expire_date: document.getElementById("memberExpire").value || null,
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/access/member/${id}` : "/api/access/member/";
    const method = isEdit ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message);
            memberModal.close();
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Operation failed");
        }
    } catch (err) {
        console.error("Save error:", err);
        if (window.toast) toast.error("Communication error");
    }
}

function confirmDelete(id, name) {
    if (confirm(`Are you sure you want to delete cardholder '${name}'?`)) {
        deleteMember(id);
    }
}

async function deleteMember(id) {
    try {
        const res = await fetch(`/api/access/member/${id}`, { method: "DELETE" });
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

// =========================================================================
// 📸 FACE BIOMETRICS ENROLLMENT CONTROLLER
// =========================================================================
let currentMemberForFace = null;
let webcamStream = null;
let activeFaceMethod = "camera"; // 'camera', 'upload', 'mockup'
let capturedBase64 = null;

function openFaceEnrollModal(id, name, code, pictureUrl, hasFace) {
    currentMemberForFace = { id, name, code, pictureUrl, hasFace };
    capturedBase64 = null;

    document.getElementById("faceModalMemberName").textContent = name || "Cardholder";
    document.getElementById("faceModalMemberCode").textContent = code || "MEM-000";
    document.getElementById("faceEnrollSubtitle").textContent = `Manage face access for ${name} (${code})`;

    const avatarBox = document.getElementById("faceModalAvatar");
    if (pictureUrl) {
        avatarBox.innerHTML = `<img src="${pictureUrl}" class="w-10 h-10 rounded-xl object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-sm text-primary\\'>?</div>';" />`;
    } else {
        const initial = name ? name.charAt(0).toUpperCase() : "?";
        avatarBox.innerHTML = `<div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">${initial}</div>`;
    }

    const badge = document.getElementById("faceModalStatusBadge");
    const deleteBtn = document.getElementById("btnDeleteFace");
    if (hasFace) {
        badge.className = "badge badge-sm badge-success font-bold font-mono gap-1";
        badge.innerHTML = '<i class="fa-solid fa-check"></i> Enrolled';
        deleteBtn.classList.remove("hidden");
    } else {
        badge.className = "badge badge-sm badge-ghost text-base-content/50 font-bold font-mono gap-1";
        badge.innerHTML = '<i class="fa-solid fa-minus"></i> Not Enrolled';
        deleteBtn.classList.add("hidden");
    }

    // Reset view to camera tab
    switchFaceMethod("camera");
    retakeWebcam();
    const fileInput = document.getElementById("faceFileInput");
    if (fileInput) fileInput.value = "";
    document.getElementById("uploadPlaceholder")?.classList.remove("hidden");
    document.getElementById("uploadPreviewContainer")?.classList.add("hidden");

    faceEnrollModal.showModal();
}

function closeFaceEnrollModal() {
    stopWebcam();
    faceEnrollModal.close();
}

function switchFaceMethod(method) {
    activeFaceMethod = method;
    document.getElementById("faceTabCameraBtn").className =
        method === "camera" ? "tab tab-active gap-1 font-bold" : "tab gap-1 font-bold";
    document.getElementById("faceTabUploadBtn").className =
        method === "upload" ? "tab tab-active gap-1 font-bold" : "tab gap-1 font-bold";
    document.getElementById("faceTabMockupBtn").className =
        method === "mockup" ? "tab tab-active gap-1 font-bold" : "tab gap-1 font-bold";

    document.getElementById("faceSectionCamera").className = method === "camera" ? "space-y-3" : "hidden";
    document.getElementById("faceSectionUpload").className = method === "upload" ? "space-y-3" : "hidden";
    document.getElementById("faceSectionMockup").className = method === "mockup" ? "space-y-3" : "hidden";

    if (method !== "camera") {
        stopWebcam();
    }
}

async function startWebcam() {
    try {
        const video = document.getElementById("webcamVideo");
        const prompt = document.getElementById("cameraStandbyPrompt");
        const btnSnap = document.getElementById("btnSnapCam");
        const btnStart = document.getElementById("btnStartCam");

        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
            audio: false,
        });
        video.srcObject = webcamStream;
        await video.play();

        prompt.classList.add("hidden");
        btnSnap.disabled = false;
        btnStart.classList.add("hidden");
        document.getElementById("faceGuideBox").classList.remove("hidden");
        document.getElementById("capturedFaceImg").classList.add("hidden");
        video.classList.remove("hidden");
    } catch (err) {
        console.error("Webcam error:", err);
        if (window.toast) toast.error("Camera access failed: " + err.message);
    }
}

function stopWebcam() {
    if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
        webcamStream = null;
    }
    const prompt = document.getElementById("cameraStandbyPrompt");
    if (prompt) prompt.classList.remove("hidden");
    const btnStart = document.getElementById("btnStartCam");
    if (btnStart) btnStart.classList.remove("hidden");
    const btnSnap = document.getElementById("btnSnapCam");
    if (btnSnap) btnSnap.disabled = true;
    const btnRetake = document.getElementById("btnRetakeCam");
    if (btnRetake) btnRetake.classList.add("hidden");
}

function captureSnapshot() {
    const video = document.getElementById("webcamVideo");
    const canvas = document.getElementById("webcamCanvas");
    const capturedImg = document.getElementById("capturedFaceImg");
    const btnRetake = document.getElementById("btnRetakeCam");
    const btnSnap = document.getElementById("btnSnapCam");

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    capturedBase64 = canvas.toDataURL("image/jpeg", 0.9);
    capturedImg.src = capturedBase64;
    capturedImg.classList.remove("hidden");
    video.classList.add("hidden");

    btnSnap.classList.add("hidden");
    btnRetake.classList.remove("hidden");
    document.getElementById("faceGuideBox").classList.add("hidden");
    if (window.toast) toast.info("Snapshot captured! Click 'Enroll & Activate Access' to save.");
}

function retakeWebcam() {
    const video = document.getElementById("webcamVideo");
    const capturedImg = document.getElementById("capturedFaceImg");
    const btnRetake = document.getElementById("btnRetakeCam");
    const btnSnap = document.getElementById("btnSnapCam");

    capturedBase64 = null;
    if (capturedImg) capturedImg.classList.add("hidden");
    if (video) video.classList.remove("hidden");
    if (btnSnap) {
        btnSnap.classList.remove("hidden");
        btnSnap.disabled = !webcamStream;
    }
    if (btnRetake) btnRetake.classList.add("hidden");
    const guide = document.getElementById("faceGuideBox");
    if (guide && webcamStream) guide.classList.remove("hidden");
}

function previewUploadedFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        capturedBase64 = evt.target.result;
        document.getElementById("filePreviewImg").src = capturedBase64;
        document.getElementById("uploadPlaceholder").classList.add("hidden");
        document.getElementById("uploadPreviewContainer").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}

async function submitFaceEnrollment() {
    if (!currentMemberForFace) return;
    const btn = document.getElementById("btnSaveFace");
    btn.disabled = true;
    btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Enrolling...';

    try {
        const payload = {
            image_base64: activeFaceMethod !== "mockup" ? capturedBase64 : null,
            simulate_code: currentMemberForFace.code,
        };

        const res = await fetch(`/api/access/member/${currentMemberForFace.id}/enroll-face`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message || "Face biometrics enrolled successfully!");
            closeFaceEnrollModal();
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Enrollment failed");
        }
    } catch (err) {
        console.error("Enroll error:", err);
        if (window.toast) toast.error("Error submitting face enrollment");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Enroll & Activate Access</span>';
    }
}

async function deleteFaceBiometrics() {
    if (!currentMemberForFace) return;
    if (!confirm(`Are you sure you want to remove face biometric access for ${currentMemberForFace.name}?`)) return;

    try {
        const res = await fetch(`/api/access/member/${currentMemberForFace.id}/remove-face`, {
            method: "DELETE",
        });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message || "Face credential removed");
            closeFaceEnrollModal();
            reloadTable();
        }
    } catch (err) {
        console.error("Remove face error:", err);
        if (window.toast) toast.error("Failed to remove face credential");
    }
}

// =========================================================================
// 🔑 ALL-IN-ONE MULTI-CREDENTIALS HUB CONTROLLER
// =========================================================================
let currentMemberForCreds = null;
let activeCredTab = "rfid";

async function openCredentialsHub(id, name, code, pictureUrl, department, status) {
    currentMemberForCreds = { id, name, code, pictureUrl, department, status };

    document.getElementById("credHubMemberName").textContent = name || "Cardholder";
    document.getElementById("credHubMemberCode").textContent = code || "MEM-000";
    document.getElementById("credHubDepartment").textContent = department || "General Department";
    document.getElementById("credHubSubtitle").textContent =
        `Manage RFID Cards, Mobile BLE/NFC, Fingerprints, Face, and PINs for ${name}`;

    const badge = document.getElementById("credHubStatusBadge");
    if (status === "active") {
        badge.className = "badge badge-sm badge-success font-bold font-mono";
        badge.textContent = "Active";
    } else {
        badge.className = "badge badge-sm badge-warning font-bold font-mono";
        badge.textContent = status || "Inactive";
    }

    const avatarBox = document.getElementById("credHubAvatar");
    if (pictureUrl) {
        avatarBox.innerHTML = `<img src="${pictureUrl}" class="w-12 h-12 rounded-xl object-cover border border-base-content/10 shadow-xs" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg\\'>?</div>';" />`;
    } else {
        const initial = name ? name.charAt(0).toUpperCase() : "?";
        avatarBox.innerHTML = `<div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">${initial}</div>`;
    }

    switchCredTab("rfid");
    credentialsModal.showModal();
    await loadMemberCredentials(id);
}

function switchCredTab(tab) {
    activeCredTab = tab;
    const tabs = ["rfid", "mobile", "fingerprint", "face", "pin"];
    const tabBtnMap = {
        rfid: "tabCredRfid",
        mobile: "tabCredMobile",
        fingerprint: "tabCredFp",
        face: "tabCredFace",
        pin: "tabCredPin",
    };
    const tabPanMap = {
        rfid: "credPanelRfid",
        mobile: "credPanelMobile",
        fingerprint: "credPanelFp",
        face: "credPanelFace",
        pin: "credPanelPin",
    };
    const tabCardMap = {
        rfid: "kpiCardRfid",
        mobile: "kpiCardMobile",
        fingerprint: "kpiCardFp",
        face: "kpiCardFace",
        pin: "kpiCardPin",
    };

    tabs.forEach((t) => {
        const btn = document.getElementById(tabBtnMap[t]);
        const pan = document.getElementById(tabPanMap[t]);
        const card = document.getElementById(tabCardMap[t]);
        if (btn) {
            if (t === tab) {
                btn.classList.add("tab-active");
                btn.setAttribute("aria-selected", "true");
            } else {
                btn.classList.remove("tab-active");
                btn.setAttribute("aria-selected", "false");
            }
        }
        if (card) {
            if (t === tab) {
                card.classList.add("kpi-card-active");
            } else {
                card.classList.remove("kpi-card-active");
            }
        }
        if (pan) {
            if (t === tab) {
                pan.classList.remove("hidden");
            } else {
                pan.classList.add("hidden");
            }
        }
    });
}

async function loadMemberCredentials(memberId) {
    try {
        const res = await fetch(`/api/access/credentials/member/${memberId}`);
        const result = await res.json();
        if (!result.success) {
            if (window.toast) toast.error("Failed to load member credentials");
            return;
        }

        // 1. Quick Counters
        document.getElementById("cntRfid").textContent = result.counts.rfid;
        document.getElementById("cntMobile").textContent = result.counts.mobile;
        document.getElementById("cntFp").textContent = result.counts.fingerprint;
        document.getElementById("cntFace").textContent = result.counts.face;
        document.getElementById("cntPin").textContent = result.counts.pin;

        // 2. Tab 1: RFID Cards
        const rfidBody = document.getElementById("credRfidTableBody");
        const cards = result.credentials.rfid_cards || [];
        if (cards.length === 0) {
            rfidBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center py-6">
                                <div class="flex flex-col items-center justify-center gap-1.5 text-base-content/40">
                                    <div class="w-9 h-9 rounded-xl bg-base-200 flex items-center justify-center text-primary/60">
                                        <i class="fa-solid fa-credit-card text-base"></i>
                                    </div>
                                    <div class="text-xs font-semibold text-base-content/70">No RFID cards assigned yet</div>
                                    <div class="text-[10px] text-base-content/40">Register a 125KHz, Mifare 13.56MHz, or UHF card below</div>
                                </div>
                            </td>
                        </tr>`;
        } else {
            rfidBody.innerHTML = cards
                .map(
                    (c) => `
                        <tr class="hover:bg-base-200/40 transition-colors">
                            <td>
                                <div class="font-mono font-bold text-xs flex items-center gap-2">
                                    <div class="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] shrink-0">
                                        <i class="fa-solid fa-credit-card"></i>
                                    </div>
                                    <span class="tracking-wide">${c.card_number}</span>
                                </div>
                            </td>
                            <td><span class="badge badge-xs badge-neutral font-mono font-bold">${c.card_type || "RFID"}</span></td>
                            <td><span class="font-mono text-xs text-base-content/70">${c.facility_code || "-"}</span></td>
                            <td><span class="badge badge-xs ${c.status === "active" ? "badge-success" : "badge-error"} font-bold">${c.status}</span></td>
                            <td class="text-center">
                                <button type="button" onclick="deleteMemberCard(${c.id})" class="btn btn-ghost btn-xs text-error btn-circle hover:bg-error/15" title="Revoke Card">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </td>
                        </tr>
                    `,
                )
                .join("");
        }

        // 3. Tab 2: Mobile Credentials
        const mobBody = document.getElementById("credMobileTableBody");
        const mobiles = result.credentials.mobile_credentials || [];
        if (mobiles.length === 0) {
            mobBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center py-6">
                                <div class="flex flex-col items-center justify-center gap-1.5 text-base-content/40">
                                    <div class="w-9 h-9 rounded-xl bg-base-200 flex items-center justify-center text-secondary/60">
                                        <i class="fa-solid fa-mobile-screen text-base"></i>
                                    </div>
                                    <div class="text-xs font-semibold text-base-content/70">No mobile credentials paired yet</div>
                                    <div class="text-[10px] text-base-content/40">Pair an Apple iOS or Android smartphone via BLE/NFC below</div>
                                </div>
                            </td>
                        </tr>`;
        } else {
            mobBody.innerHTML = mobiles
                .map(
                    (m) => `
                        <tr class="hover:bg-base-200/40 transition-colors">
                            <td>
                                <div class="font-mono font-bold text-xs flex items-center gap-2">
                                    <div class="w-6 h-6 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center text-[10px] shrink-0">
                                        <i class="fa-solid fa-mobile-screen"></i>
                                    </div>
                                    <span class="tracking-wide">${m.virtual_card_number}</span>
                                </div>
                            </td>
                            <td><span class="font-mono text-[11px] text-base-content/70" title="${m.device_uuid}">${m.device_uuid.substring(0, 14)}...</span></td>
                            <td><span class="badge badge-xs badge-secondary font-mono font-bold">${m.comm_tech}</span></td>
                            <td>
                                <span class="badge badge-xs badge-ghost font-medium">
                                    <i class="fa-brands ${m.os_platform === "iOS" ? "fa-apple" : "fa-android"} mr-1"></i>
                                    ${m.os_platform}
                                </span>
                            </td>
                            <td><span class="badge badge-xs ${m.status === "active" ? "badge-success" : "badge-error"} font-bold">${m.status}</span></td>
                            <td class="text-center">
                                <button type="button" onclick="deleteMobileCred(${m.id})" class="btn btn-ghost btn-xs text-error btn-circle hover:bg-error/15" title="Revoke Device">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </td>
                        </tr>
                    `,
                )
                .join("");
        }

        // 4. Tab 3: Fingerprints
        const fpBody = document.getElementById("credFpTableBody");
        const fps = result.credentials.fingerprints || [];
        if (fps.length === 0) {
            fpBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center py-6">
                                <div class="flex flex-col items-center justify-center gap-1.5 text-base-content/40">
                                    <div class="w-9 h-9 rounded-xl bg-base-200 flex items-center justify-center text-accent/60">
                                        <i class="fa-solid fa-fingerprint text-base"></i>
                                    </div>
                                    <div class="text-xs font-semibold text-base-content/70">No fingerprint templates enrolled yet</div>
                                    <div class="text-[10px] text-base-content/40">Enroll ISO 19794-2 standard minutiae biometric templates below</div>
                                </div>
                            </td>
                        </tr>`;
        } else {
            fpBody.innerHTML = fps
                .map(
                    (f) => `
                        <tr class="hover:bg-base-200/40 transition-colors">
                            <td>
                                <div class="font-bold text-xs flex items-center gap-2">
                                    <div class="w-6 h-6 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-xs shrink-0">
                                        <i class="fa-solid fa-fingerprint"></i>
                                    </div>
                                    <span>${f.finger_name || "Finger #" + f.finger_index}</span>
                                </div>
                            </td>
                            <td>
                                <div class="flex items-center gap-2">
                                    <progress class="progress progress-accent w-16 h-2" value="${f.quality_score || 80}" max="100"></progress>
                                    <span class="font-mono text-xs font-bold">${f.quality_score || 80}%</span>
                                </div>
                            </td>
                            <td><span class="font-mono text-[11px] text-base-content/60">${f.algorithm_version}</span></td>
                            <td><span class="badge badge-xs ${f.status === "active" ? "badge-success" : "badge-error"} font-bold">${f.status}</span></td>
                            <td class="text-center">
                                <button type="button" onclick="deleteFingerprint(${f.id})" class="btn btn-ghost btn-xs text-error btn-circle hover:bg-error/15" title="Delete Fingerprint">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </td>
                        </tr>
                    `,
                )
                .join("");
        }

        // 5. Tab 4: Face Biometrics Panel
        const faces = result.credentials.face_credentials || [];
        const faceBadge = document.getElementById("credFaceEnrolledBadge");
        const btnRemoveFace = document.getElementById("btnHubRemoveFace");
        const regDateText = document.getElementById("credFaceRegDate");
        const facePreview = document.getElementById("credFacePreviewContainer");

        if (faces.length > 0) {
            faceBadge.className = "badge badge-sm badge-success font-bold font-mono gap-1";
            faceBadge.innerHTML = `<i class="fa-solid fa-check"></i> Enrolled (${faces.length} Template${faces.length > 1 ? "s" : ""})`;
            btnRemoveFace.classList.remove("hidden");
            const firstFace = faces[0];
            regDateText.textContent = `Registered: ${firstFace.created_at ? firstFace.created_at.substring(0, 19).replace("T", " ") : "-"}`;
            if (currentMemberForCreds && currentMemberForCreds.pictureUrl) {
                facePreview.innerHTML = `<img src="${currentMemberForCreds.pictureUrl}" class="w-full h-full object-cover" />`;
            }
        } else {
            faceBadge.className = "badge badge-sm badge-ghost text-base-content/50 font-bold font-mono gap-1";
            faceBadge.innerHTML = `<i class="fa-solid fa-minus"></i> Not Enrolled`;
            btnRemoveFace.classList.add("hidden");
            regDateText.textContent = `Registered: -`;
            facePreview.innerHTML = `<i class="fa-solid fa-camera text-3xl text-base-content/30"></i>`;
        }

        // 6. Tab 5: PIN Codes
        const pinBody = document.getElementById("credPinTableBody");
        const pins = result.credentials.pin_credentials || [];
        if (pins.length === 0) {
            pinBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center py-6">
                                <div class="flex flex-col items-center justify-center gap-1.5 text-base-content/40">
                                    <div class="w-9 h-9 rounded-xl bg-base-200 flex items-center justify-center text-warning/60">
                                        <i class="fa-solid fa-key text-base"></i>
                                    </div>
                                    <div class="text-xs font-semibold text-base-content/70">No keypad PIN code configured</div>
                                    <div class="text-[10px] text-base-content/40">Set a Standard entry code or Duress silent distress alarm PIN below</div>
                                </div>
                            </td>
                        </tr>`;
        } else {
            pinBody.innerHTML = pins
                .map(
                    (p) => `
                        <tr class="hover:bg-base-200/40 transition-colors">
                            <td>
                                ${
                                    p.pin_type === "DURESS"
                                        ? '<span class="badge badge-xs badge-error font-bold gap-1 font-mono animate-pulse"><i class="fa-solid fa-triangle-exclamation"></i> DURESS (แจ้งภัยเงียบ)</span>'
                                        : '<span class="badge badge-xs badge-warning font-bold font-mono text-warning-content">STANDARD (ปกติ)</span>'
                                }
                            </td>
                            <td><span class="badge badge-xs ${p.status === "active" ? "badge-success" : "badge-error"} font-bold">${p.status}</span></td>
                            <td><span class="font-mono text-xs">${p.failed_attempts || 0} / 5</span></td>
                            <td><span class="text-[11px] text-base-content/60 font-mono"><i class="fa-solid fa-shield-halved text-success mr-1"></i>Bcrypt Salted Hash</span></td>
                            <td class="text-center">
                                <button type="button" onclick="deletePinCred(${p.id})" class="btn btn-ghost btn-xs text-error btn-circle hover:bg-error/15" title="Revoke PIN">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </td>
                        </tr>
                    `,
                )
                .join("");
        }
    } catch (err) {
        console.error("Credentials load error:", err);
    }
}

async function submitNewRfidCard(event) {
    event.preventDefault();
    if (!currentMemberForCreds) return;
    const cardNum = document.getElementById("newRfidNumber").value.trim();
    const facCode = document.getElementById("newRfidFacility").value.trim();
    const cardType = document.getElementById("newRfidType").value;

    try {
        const res = await fetch("/api/access/card/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                member_id: currentMemberForCreds.id,
                card_number: cardNum,
                facility_code: facCode || null,
                card_type: cardType,
                status: "active",
            }),
        });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message || "RFID card assigned successfully");
            document.getElementById("newRfidNumber").value = "";
            document.getElementById("newRfidFacility").value = "";
            await loadMemberCredentials(currentMemberForCreds.id);
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Failed to assign RFID card");
        }
    } catch (err) {
        console.error("RFID assign error:", err);
        if (window.toast) toast.error("Error assigning RFID card");
    }
}

async function deleteMemberCard(cardId) {
    if (!confirm("Revoke and remove this RFID card?")) return;
    try {
        const res = await fetch(`/api/access/card/${cardId}`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message || "Card revoked");
            if (currentMemberForCreds) await loadMemberCredentials(currentMemberForCreds.id);
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Delete failed");
        }
    } catch (err) {
        console.error("Card delete error:", err);
    }
}

async function submitNewMobileCred(event) {
    event.preventDefault();
    if (!currentMemberForCreds) return;
    const vcard = document.getElementById("newMobileVCard").value.trim();
    const uuid = document.getElementById("newMobileUuid").value.trim();
    const tech = document.getElementById("newMobileTech").value;
    const platform = document.getElementById("newMobilePlatform").value;

    try {
        const res = await fetch("/api/access/credentials/mobile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                member_id: currentMemberForCreds.id,
                virtual_card_number: vcard,
                device_uuid: uuid,
                comm_tech: tech,
                os_platform: platform,
                status: "active",
            }),
        });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message || "Mobile credential paired!");
            document.getElementById("newMobileVCard").value = "";
            document.getElementById("newMobileUuid").value = "";
            await loadMemberCredentials(currentMemberForCreds.id);
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Pairing failed");
        }
    } catch (err) {
        console.error("Mobile cred error:", err);
    }
}

async function deleteMobileCred(credId) {
    if (!confirm("Revoke and disconnect this mobile credential?")) return;
    try {
        const res = await fetch(`/api/access/credentials/mobile/${credId}`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message || "Mobile credential revoked");
            if (currentMemberForCreds) await loadMemberCredentials(currentMemberForCreds.id);
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Delete failed");
        }
    } catch (err) {
        console.error("Mobile delete error:", err);
    }
}

async function submitNewFingerprint(event) {
    event.preventDefault();
    if (!currentMemberForCreds) return;
    const fingerIndex = parseInt(document.getElementById("newFpFingerIndex").value, 10);
    const qualityScore = parseInt(document.getElementById("newFpQuality").value, 10);
    const algo = document.getElementById("newFpAlgo").value;

    const fingerNames = {
        1: "Right Thumb",
        2: "Right Index",
        3: "Right Middle",
        6: "Left Thumb",
        7: "Left Index",
    };
    const fingerName = fingerNames[fingerIndex] || `Finger #${fingerIndex}`;
    const dummyTemplate = "ISO_MINUTIAE_" + Math.random().toString(36).substring(2).toUpperCase();

    try {
        const res = await fetch("/api/access/credentials/fingerprint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                member_id: currentMemberForCreds.id,
                finger_index: fingerIndex,
                finger_name: fingerName,
                template_data: dummyTemplate,
                algorithm_version: algo,
                quality_score: qualityScore,
                status: "active",
            }),
        });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message || "Fingerprint enrolled!");
            await loadMemberCredentials(currentMemberForCreds.id);
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Fingerprint enrollment failed");
        }
    } catch (err) {
        console.error("Fingerprint enroll error:", err);
    }
}

async function deleteFingerprint(fpId) {
    if (!confirm("Remove this fingerprint biometric template?")) return;
    try {
        const res = await fetch(`/api/access/credentials/fingerprint/${fpId}`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message || "Fingerprint deleted");
            if (currentMemberForCreds) await loadMemberCredentials(currentMemberForCreds.id);
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Delete failed");
        }
    } catch (err) {
        console.error("Fingerprint delete error:", err);
    }
}

async function submitNewPin(event) {
    event.preventDefault();
    if (!currentMemberForCreds) return;
    const pinCode = document.getElementById("newPinCode").value.trim();
    const pinType = document.getElementById("newPinType").value;

    try {
        const res = await fetch("/api/access/credentials/pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                member_id: currentMemberForCreds.id,
                pin_code: pinCode,
                pin_type: pinType,
                status: "active",
            }),
        });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message || "PIN credential set successfully!");
            document.getElementById("newPinCode").value = "";
            await loadMemberCredentials(currentMemberForCreds.id);
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Failed to set PIN");
        }
    } catch (err) {
        console.error("PIN save error:", err);
    }
}

async function deletePinCred(pinId) {
    if (!confirm("Revoke this PIN code credential?")) return;
    try {
        const res = await fetch(`/api/access/credentials/pin/${pinId}`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message || "PIN revoked");
            if (currentMemberForCreds) await loadMemberCredentials(currentMemberForCreds.id);
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Delete failed");
        }
    } catch (err) {
        console.error("PIN delete error:", err);
    }
}

function launchFaceEnrollFromHub() {
    if (!currentMemberForCreds) return;
    openFaceEnrollModal(
        currentMemberForCreds.id,
        currentMemberForCreds.name,
        currentMemberForCreds.code,
        currentMemberForCreds.pictureUrl,
        false,
    );
}

async function removeFaceFromHub() {
    if (!currentMemberForCreds) return;
    if (!confirm(`Are you sure you want to remove face biometric access for ${currentMemberForCreds.name}?`)) return;

    try {
        const res = await fetch(`/api/access/member/${currentMemberForCreds.id}/remove-face`, {
            method: "DELETE",
        });
        const result = await res.json();
        if (result.success) {
            if (window.toast) toast.success(result.message || "Face credential removed");
            await loadMemberCredentials(currentMemberForCreds.id);
            reloadTable();
        } else {
            if (window.toast) toast.error(result.detail || "Failed to remove face credential");
        }
    } catch (err) {
        console.error("Remove face error:", err);
    }
}

window.openFaceEnrollModal = openFaceEnrollModal;
window.closeFaceEnrollModal = closeFaceEnrollModal;
window.switchFaceMethod = switchFaceMethod;
window.startWebcam = startWebcam;
window.stopWebcam = stopWebcam;
window.captureSnapshot = captureSnapshot;
window.retakeWebcam = retakeWebcam;
window.previewUploadedFile = previewUploadedFile;
window.submitFaceEnrollment = submitFaceEnrollment;
window.deleteFaceBiometrics = deleteFaceBiometrics;

window.openCredentialsHub = openCredentialsHub;
window.switchCredTab = switchCredTab;
window.loadMemberCredentials = loadMemberCredentials;
window.submitNewRfidCard = submitNewRfidCard;
window.deleteMemberCard = deleteMemberCard;
window.submitNewMobileCred = submitNewMobileCred;
window.deleteMobileCred = deleteMobileCred;
window.submitNewFingerprint = submitNewFingerprint;
window.deleteFingerprint = deleteFingerprint;
window.submitNewPin = submitNewPin;
window.deletePinCred = deletePinCred;
window.launchFaceEnrollFromHub = launchFaceEnrollFromHub;
window.removeFaceFromHub = removeFaceFromHub;
