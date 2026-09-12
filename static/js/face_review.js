/**
 * face_review.js - Biometric Face Audit, Gallery & Visual Verification Controller
 */

import { TableModel } from "./_table_class.js";

        // Global State
        let currentView = "gallery";
        let galleryPage = 1;
        let galleryTotalPages = 1;
        let galleryItemsCache = [];
        let auditTableModel = null;

        // On Ready
        $(document).ready(function () {
            loadStats();
            loadGallery(1);
        });

        // ==========================================
        // 📊 1. Load Statistics & Metrics
        // ==========================================
        async function loadStats() {
            try {
                const res = await fetch("/api/access/event/face-review/stats");
                if (!res.ok) return;
                const d = await res.json();
                if (d.success) {
                    $("#statTotalScans").text(d.total_face_scans || 0);
                    $("#statGranted").text(d.granted_scans || 0);
                    $("#statDenied").text(d.denied_scans || 0);
                    $("#statPassRate").text(`${d.pass_rate}% Pass`);
                    $("#statAvgConfidence").text(d.avg_confidence_percent || "0%");
                    $("#statThreshold").text(`Thresh: ${Math.round(d.threshold * 100)}%`);
                    $("#statEnrolled").text(d.enrolled_members || 0);
                    $("#statEngineBadge").text(`${d.engine_mode.toUpperCase()} (512-dim)`);
                }
            } catch (err) {
                console.error("Error loading stats:", err);
            }
        }

        // ==========================================
        // 🎴 2. Load Photo Gallery Cards
        // ==========================================
        window.loadGallery = async function (page = 1) {
            galleryPage = page;
            const result = $("#galleryFilterResult").val() || "ALL";
            const direction = $("#galleryFilterDirection").val() || "ALL";
            const search = ($("#gallerySearch").val() || "").trim();

            const params = new URLSearchParams({
                page: page,
                limit: 12,
                result: result,
                direction: direction,
            });
            if (search) params.set("search", search);

            const grid = $("#galleryGrid");
            grid.html(`
                <div class="col-span-full py-16 flex flex-col items-center justify-center text-base-content/40 space-y-3">
                    <span class="loading loading-spinner loading-lg text-primary"></span>
                    <span class="text-xs">Loading face audit gallery...</span>
                </div>
            `);

            try {
                const res = await fetch(`/api/access/event/face-review/gallery?${params.toString()}`);
                if (!res.ok) throw new Error("Failed to fetch gallery");
                const data = await res.json();

                galleryItemsCache = data.items || [];
                galleryTotalPages = data.total_pages || 1;

                // Update pagination controls
                $("#btnCurrentPage").text(data.page);
                $("#paginationInfo").text(`Showing page ${data.page} of ${galleryTotalPages} (${data.total} records total)`);
                $("#galleryCountLabel").text(`Found ${data.total} face recognition events`);
                $("#btnPrevPage").prop("disabled", data.page <= 1);
                $("#btnNextPage").prop("disabled", data.page >= galleryTotalPages);

                if (galleryItemsCache.length === 0) {
                    grid.html(`
                        <div class="col-span-full py-16 text-center card bg-base-100 border border-base-content/10 p-8">
                            <div class="w-16 h-16 rounded-full bg-base-200 text-base-content/30 flex items-center justify-center mx-auto mb-3 text-2xl">
                                <i class="fa-solid fa-camera"></i>
                            </div>
                            <h4 class="font-bold text-base text-base-content">No Face Scan Events Found</h4>
                            <p class="text-xs text-base-content/50 mt-1">Try changing filters or simulate a face scan from the Live Monitor simulator.</p>
                            <div class="mt-4">
                                <a href="/page?page=live_monitor" class="btn btn-primary btn-sm gap-2">
                                    <i class="fa-solid fa-play"></i>
                                    <span>Simulate Face Scan</span>
                                </a>
                            </div>
                        </div>
                    `);
                    return;
                }

                let html = "";
                galleryItemsCache.forEach((item, index) => {
                    const isGranted = (item.result === "GRANTED");
                    const statusBadgeClass = isGranted ? "badge-success" : "badge-error";
                    const statusIcon = isGranted ? "fa-solid fa-check" : "fa-solid fa-xmark";
                    const confColor = item.confidence_score >= 0.85 ? "text-success" : (item.confidence_score >= 0.65 ? "text-primary" : "text-error");

                    // Master image fallback
                    const masterImg = item.master_photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80";
                    const snapImg = item.snapshot_url || masterImg;

                    html += `
                        <div class="card bg-base-100 shadow-sm border border-base-content/10 overflow-hidden hover:shadow-md hover:border-primary/40 transition-all duration-200 group">
                            
                            <!-- Card Header -->
                            <div class="p-3 bg-base-200/40 border-b border-base-content/5 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="badge ${statusBadgeClass} badge-xs font-mono font-bold gap-1">
                                        <i class="${statusIcon}"></i> ${item.result}
                                    </span>
                                    <span class="badge badge-xs badge-neutral font-mono font-semibold">${item.direction || 'IN'}</span>
                                </div>
                                <span class="text-[11px] font-mono text-base-content/50">${item.time_str}</span>
                            </div>

                            <!-- Side-by-side Dual Image Preview -->
                            <div class="p-3 grid grid-cols-2 gap-2 bg-base-200/20">
                                <!-- Camera Snapshot -->
                                <div class="relative rounded-box overflow-hidden aspect-square bg-base-300 border border-base-content/10 group-hover:border-primary/30 transition-colors">
                                    <img src="${snapImg}" alt="Snapshot" class="w-full h-full object-cover" 
                                        onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';" />
                                    <div class="absolute bottom-1 left-1 badge badge-neutral badge-xs text-[9px] font-mono opacity-80">
                                        📷 Camera
                                    </div>
                                </div>

                                <!-- Registered Master -->
                                <div class="relative rounded-box overflow-hidden aspect-square bg-base-300 border border-base-content/10 group-hover:border-primary/30 transition-colors">
                                    <img src="${masterImg}" alt="Master" class="w-full h-full object-cover"
                                        onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';" />
                                    <div class="absolute bottom-1 left-1 badge badge-primary badge-xs text-[9px] font-mono opacity-90">
                                        👤 Enrolled
                                    </div>
                                </div>
                            </div>

                            <!-- Card Body -->
                            <div class="p-3 space-y-2 flex-1 flex flex-col justify-between">
                                <div>
                                    <div class="font-bold text-sm text-base-content truncate" title="${item.member_name}">
                                        ${item.member_name}
                                    </div>
                                    <div class="text-[11px] text-base-content/50 flex items-center justify-between mt-0.5">
                                        <span class="font-mono">${item.member_code || '-'}</span>
                                        <span class="truncate max-w-[120px]">${item.department || '-'}</span>
                                    </div>
                                </div>

                                <!-- Door and Confidence -->
                                <div class="pt-2 border-t border-base-content/10 flex items-center justify-between text-xs">
                                    <div class="flex items-center gap-1 text-base-content/70 truncate max-w-[140px]" title="${item.door_name}">
                                        <i class="fa-solid fa-door-open text-[10px]"></i>
                                        <span class="truncate">${item.door_name}</span>
                                    </div>
                                    <div class="font-mono font-black ${confColor} flex items-center gap-1">
                                        <i class="fa-solid fa-bullseye text-[10px]"></i>
                                        <span>${item.confidence_percent}</span>
                                    </div>
                                </div>

                                <!-- Action Button -->
                                <button onclick="openInspectModal(${index})" class="btn btn-sm btn-outline btn-neutral w-full gap-2 mt-1">
                                    <i class="fa-solid fa-magnifying-glass text-xs"></i>
                                    <span>Inspect Biometric Details</span>
                                </button>
                            </div>
                        </div>
                    `;
                });

                grid.html(html);

            } catch (err) {
                console.error("Error loading gallery:", err);
                grid.html(`
                    <div class="col-span-full py-12 text-center text-error">
                        <i class="fa-solid fa-circle-exclamation text-2xl mb-2"></i>
                        <div class="font-bold text-sm">Failed to load face audit gallery</div>
                        <div class="text-xs text-base-content/50 mt-1">${err.message}</div>
                    </div>
                `);
            }
        };

        window.prevGalleryPage = function () {
            if (galleryPage > 1) {
                loadGallery(galleryPage - 1);
            }
        };

        window.nextGalleryPage = function () {
            if (galleryPage < galleryTotalPages) {
                loadGallery(galleryPage + 1);
            }
        };

        // ==========================================
        // 🔍 3. Inspect Modal Trigger
        // ==========================================
        window.openInspectModal = function (indexOrId) {
            let item = null;
            if (typeof indexOrId === "number" && galleryItemsCache[indexOrId]) {
                item = galleryItemsCache[indexOrId];
            } else {
                item = galleryItemsCache.find(x => x.id === indexOrId);
            }

            if (!item) return;

            const isGranted = (item.result === "GRANTED");
            const snapImg = item.snapshot_url || item.master_photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80";
            const masterImg = item.master_photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80";

            $("#inspectSubtitle").text(`Event Log #${item.id} • ${item.date_str} ${item.time_str}`);
            $("#inspectSnapshotImg").attr("src", snapImg);
            $("#inspectMasterImg").attr("src", masterImg);
            $("#inspectDoor").text(item.door_name || "Unknown Door");
            $("#inspectTimestamp").text(item.event_time);
            $("#inspectMemberName").text(item.member_name);
            $("#inspectMemberCode").text(`${item.member_code || '-'} • ${item.department || '-'}`);

            // Result Badge
            const resultHtml = isGranted
                ? `<span class="badge badge-success badge-sm font-bold gap-1"><i class="fa-solid fa-check"></i> GRANTED (อนุญาต)</span>`
                : `<span class="badge badge-error badge-sm font-bold gap-1"><i class="fa-solid fa-xmark"></i> DENIED (ปฏิเสธ)</span>`;
            $("#inspectResultBadge").html(resultHtml);

            // Confidence Score & Progress
            const confPctNum = Math.round((item.confidence_score || 0) * 100);
            $("#inspectConfidenceScore").text(`${(item.confidence_score * 100).toFixed(1)}%`);
            $("#inspectConfidenceProgress").val(confPctNum);
            if (confPctNum >= 85) {
                $("#inspectConfidenceProgress").attr("class", "progress progress-success w-full h-2.5");
            } else if (confPctNum >= 65) {
                $("#inspectConfidenceProgress").attr("class", "progress progress-primary w-full h-2.5");
            } else {
                $("#inspectConfidenceProgress").attr("class", "progress progress-error w-full h-2.5");
            }

            $("#inspectDirection").text(item.direction || "IN");
            $("#inspectEngine").text(item.face_tag || "ArcFace-512");
            $("#inspectLogId").text(`#${item.id}`);
            $("#inspectReason").text(item.reason || "-");

            const modal = document.getElementById("faceInspectModal");
            if (modal) modal.showModal();
        };

        // ==========================================
        // 📋 4. DataTables Audit Table View
        // ==========================================
        function initAuditTable() {
            if (auditTableModel) return;

            auditTableModel = new TableModel(
                "#tableFaceLogs",
                "/api/access/log/datatable",
                {
                    table: "Access_Log",
                    order: [[1, "desc"]],
                    columns: [
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
                            data: "event_time",
                            name: "event_time",
                            title: "Time & Date",
                            render: function (data) {
                                if (!data) return "-";
                                const dateStr = data.substring(0, 10);
                                const timeStr = data.substring(11, 19);
                                return `<div class="font-mono"><span class="font-bold text-base-content">${timeStr}</span> <span class="text-[10px] text-base-content/50">${dateStr}</span></div>`;
                            }
                        },
                        {
                            data: "snapshot_url",
                            name: "snapshot_url",
                            title: "Camera Snapshot",
                            className: "text-center",
                            render: function (data, type, row) {
                                const img = data || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80";
                                return `
                                    <div class="avatar flex justify-center">
                                        <div class="w-10 h-10 rounded-box ring-1 ring-base-content/10 shadow-xs">
                                            <img src="${img}" alt="Snap" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';" />
                                        </div>
                                    </div>
                                `;
                            }
                        },
                        {
                            data: "member_name",
                            name: "member_name",
                            title: "Cardholder",
                            render: function (data, type, row) {
                                const code = row.card_number ? row.card_number.replace('FACE:', '') : '-';
                                return `
                                    <div>
                                        <div class="font-bold text-base-content">${data || "Unknown"}</div>
                                        <div class="text-[10px] text-base-content/50 font-mono">${code} • ${row.department || '-'}</div>
                                    </div>
                                `;
                            }
                        },
                        {
                            data: "door_name",
                            name: "door_name",
                            title: "Access Point",
                            render: function (data) {
                                return `<span class="font-semibold text-base-content">${data}</span>`;
                            }
                        },
                        {
                            data: "direction",
                            name: "direction",
                            title: "Direction",
                            className: "text-center",
                            render: function (data) {
                                const isIncoming = (data === "IN");
                                return `<span class="badge badge-xs ${isIncoming ? "badge-primary" : "badge-neutral"} font-mono font-bold">${data || "IN"}</span>`;
                            }
                        },
                        {
                            data: "confidence_score",
                            name: "confidence_score",
                            title: "Match Confidence",
                            className: "text-center",
                            render: function (data) {
                                if (data === null || data === undefined) return "-";
                                const pct = (data * 100).toFixed(1);
                                const color = data >= 0.85 ? "badge-success" : (data >= 0.65 ? "badge-primary" : "badge-error");
                                return `<span class="badge badge-sm ${color} font-mono font-bold">${pct}%</span>`;
                            }
                        },
                        {
                            data: "result",
                            name: "result",
                            title: "Result",
                            render: function (data) {
                                const isGranted = (data === "GRANTED");
                                return `<span class="badge badge-sm ${isGranted ? "badge-success" : "badge-error"} font-bold gap-1">
                                    <i class="${isGranted ? "fa-solid fa-check" : "fa-solid fa-xmark"}"></i> ${data}
                                </span>`;
                            }
                        },
                        {
                            data: "reason",
                            name: "reason",
                            title: "Verification Reason",
                            render: function (data, type, row) {
                                const isGranted = (row.result === "GRANTED");
                                return `<span class="${isGranted ? "text-success font-medium" : "text-error font-medium"} text-xs">${data || "-"}</span>`;
                            }
                        },
                        {
                            data: "id",
                            name: "action",
                            title: "Action",
                            className: "text-center",
                            orderable: false,
                            render: function (data, type, row) {
                                return `
                                    <button onclick="inspectTableRow(${JSON.stringify(row).replace(/"/g, '&quot;')})" class="btn btn-ghost btn-xs btn-circle text-primary hover:bg-primary/15" title="Inspect Face Biometrics">
                                        <i class="fa-solid fa-magnifying-glass text-xs"></i>
                                    </button>
                                `;
                            }
                        }
                    ]
                }
            );

            auditTableModel.data_custom_filter = {
                event_type: "FACE_RECOGNITION",
                result: $("#tableFilterResult").val(),
                direction: $("#tableFilterDirection").val()
            };

            auditTableModel.init();
        }

        window.reloadAuditTable = function () {
            if (auditTableModel) {
                auditTableModel.data_custom_filter = {
                    event_type: "FACE_RECOGNITION",
                    result: $("#tableFilterResult").val(),
                    direction: $("#tableFilterDirection").val()
                };
                auditTableModel.reload();
            }
        };

        window.inspectTableRow = function (row) {
            const mockItem = {
                id: row.id,
                event_time: row.event_time,
                date_str: row.event_time ? row.event_time.substring(0, 10) : "-",
                time_str: row.event_time ? row.event_time.substring(11, 19) : "-",
                member_name: row.member_name || "Unknown",
                member_code: row.card_number ? row.card_number.replace('FACE:', '') : "-",
                department: row.department || "-",
                door_name: row.door_name || "-",
                direction: row.direction || "IN",
                result: row.result || "DENIED",
                reason: row.reason || "-",
                confidence_score: row.confidence_score !== undefined ? row.confidence_score : 0.0,
                snapshot_url: row.snapshot_url || "",
                master_photo_url: row.picture_url || "",
                face_tag: "ArcFace-512",
            };
            galleryItemsCache.push(mockItem);
            openInspectModal(galleryItemsCache.length - 1);
        };

        // ==========================================
        // 👤 5. Load Enrolled Face Profiles
        // ==========================================
        async function loadEnrolledGrid() {
            const grid = $("#enrolledGrid");
            grid.html(`
                <div class="col-span-full py-16 flex flex-col items-center justify-center text-base-content/40 space-y-3">
                    <span class="loading loading-spinner loading-lg text-secondary"></span>
                    <span class="text-xs">Loading registered biometric faces...</span>
                </div>
            `);

            try {
                const res = await fetch("/api/access/event/face-review/enrolled");
                if (!res.ok) throw new Error("Failed to load enrolled faces");
                const d = await res.json();
                const members = d.data || [];

                if (members.length === 0) {
                    grid.html(`
                        <div class="col-span-full py-12 text-center text-base-content/40">
                            No cardholders registered yet.
                        </div>
                    `);
                    return;
                }

                let html = "";
                members.forEach(m => {
                    const hasFace = m.has_face;
                    const avatar = m.picture_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80";

                    html += `
                        <div class="card bg-base-100 shadow-sm border border-base-content/10 p-4 hover:border-secondary/40 transition-all flex flex-col items-center text-center">
                            <div class="relative mb-3">
                                <div class="w-20 h-20 rounded-box overflow-hidden ring-2 ${hasFace ? 'ring-success' : 'ring-base-content/20'} bg-base-300 shadow-sm">
                                    <img src="${avatar}" alt="${m.name}" class="w-full h-full object-cover" 
                                        onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';" />
                                </div>
                                <div class="absolute -bottom-1 -right-1 badge ${hasFace ? 'badge-success' : 'badge-ghost text-base-content/40'} badge-xs font-mono font-bold">
                                    ${hasFace ? '✓ Active' : 'No Face'}
                                </div>
                            </div>

                            <h4 class="font-bold text-sm text-base-content">${m.name}</h4>
                            <div class="text-[11px] font-mono text-base-content/50 mt-0.5">${m.member_code} • ${m.department}</div>

                            <div class="mt-3 w-full pt-3 border-t border-base-content/10 space-y-1.5 text-xs text-left">
                                <div class="flex justify-between">
                                    <span class="text-base-content/50 text-[10px]">Biometric Model:</span>
                                    <span class="font-mono text-[11px] font-semibold">${m.face_tag || '-'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-base-content/50 text-[10px]">Enrolled Date:</span>
                                    <span class="font-mono text-[10px] text-base-content/60">${m.face_registered_at || '-'}</span>
                                </div>
                            </div>

                            <div class="mt-4 w-full">
                                <a href="/page?page=members" class="btn btn-outline btn-xs btn-block gap-1">
                                    <i class="fa-solid fa-camera"></i>
                                    <span>${hasFace ? 'Manage Face' : 'Enroll Face'}</span>
                                </a>
                            </div>
                        </div>
                    `;
                });

                grid.html(html);

            } catch (err) {
                console.error("Error loading enrolled faces:", err);
                grid.html(`<div class="col-span-full py-12 text-center text-error">Failed to load enrolled profiles: ${err.message}</div>`);
            }
        }

        // ==========================================
        // 🔄 6. View Switching & Refresh
        // ==========================================
        window.switchView = function (viewName) {
            currentView = viewName;

            // Reset tab buttons
            $("#tabGalleryBtn, #tabTableBtn, #tabEnrolledBtn").removeClass("tab-active");
            $("#viewGallery, #viewTable, #viewEnrolled").addClass("hidden");
            $("#galleryFilterBar").addClass("hidden");

            if (viewName === "gallery") {
                $("#tabGalleryBtn").addClass("tab-active");
                $("#viewGallery").removeClass("hidden");
                $("#galleryFilterBar").removeClass("hidden");
                loadGallery(galleryPage);
            } else if (viewName === "table") {
                $("#tabTableBtn").addClass("tab-active");
                $("#viewTable").removeClass("hidden");
                initAuditTable();
                reloadAuditTable();
            } else if (viewName === "enrolled") {
                $("#tabEnrolledBtn").addClass("tab-active");
                $("#viewEnrolled").removeClass("hidden");
                loadEnrolledGrid();
            }
        };

        window.refreshCurrentView = function () {
            loadStats();
            if (currentView === "gallery") {
                loadGallery(galleryPage);
            } else if (currentView === "table") {
                reloadAuditTable();
            } else if (currentView === "enrolled") {
                loadEnrolledGrid();
            }
        };
