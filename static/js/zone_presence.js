/**
 * zone_presence.js - Real-Time Zone Occupancy, Anti-Passback & Muster Roll Call Controller
 */

let presenceData = null;
        let musterRecords = [];

        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('printTime').innerText = new Date().toLocaleString();
            loadZonePresence();
            initSseListener();
            checkZoneEmergency();
        });

        async function loadZonePresence() {
            try {
                const res = await fetch('/api/access/zone/presence/summary');
                const data = await res.json();
                if (data.success) {
                    presenceData = data;
                    renderKPIs(data.kpi);
                    renderZonesGrid(data.zones);
                    populateZoneFilter(data.zones);
                    loadMusterRollCall();
                }
            } catch (err) {
                console.error('Error loading zone presence:', err);
            }
        }

        function renderKPIs(kpi) {
            document.getElementById('kpiInside').innerText = kpi.total_inside ?? 0;
            document.getElementById('kpiOutside').innerText = kpi.total_outside ?? 0;
            document.getElementById('kpiZones').innerText = kpi.total_zones ?? 0;
            document.getElementById('kpiRegistered').innerText = kpi.total_registered ?? 0;
        }

        function renderZonesGrid(zones) {
            const grid = document.getElementById('zonesGrid');
            if (!zones || zones.length === 0) {
                grid.innerHTML = '<div class="col-span-full text-center py-6 text-base-content/60">No access zones defined.</div>';
                return;
            }

            let html = '';
            zones.forEach(z => {
                let typeBadge = '';
                let borderClass = 'border-base-content/10';

                if (z.zone_type === 'HIGH_SECURITY') {
                    typeBadge = '<span class="badge badge-error badge-xs gap-1"><i class="fa-solid fa-shield-cat"></i> High Security</span>';
                    borderClass = 'border-error/30';
                } else if (z.zone_type === 'OUTSIDE') {
                    typeBadge = '<span class="badge badge-warning badge-xs gap-1"><i class="fa-solid fa-tree"></i> Outside</span>';
                } else if (z.zone_type === 'MUSTER_POINT') {
                    typeBadge = '<span class="badge badge-info badge-xs gap-1"><i class="fa-solid fa-person-shelter"></i> Muster Point</span>';
                    borderClass = 'border-info/30';
                } else {
                    typeBadge = '<span class="badge badge-outline badge-xs gap-1"><i class="fa-solid fa-building"></i> Internal</span>';
                }

                const maxText = z.max_occupancy > 0 ? `${z.max_occupancy} max` : 'Unlimited';
                let progressColor = 'progress-primary';
                if (z.occupancy_pct >= 90) progressColor = 'progress-error';
                else if (z.occupancy_pct >= 70) progressColor = 'progress-warning';

                html += `
                    <div class="card bg-base-100 shadow-sm border ${borderClass} p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <span class="badge badge-neutral badge-xs font-mono">${z.code}</span>
                                <div class="flex items-center gap-1">
                                    ${z.antipassback_enabled ? '<span class="badge badge-success badge-xs" title="Anti-Passback Active">APB</span>' : ''}
                                    ${typeBadge}
                                </div>
                            </div>
                            <h4 class="font-bold text-sm text-base-content truncate" title="${z.name}">${z.name}</h4>
                            
                            <!-- Occupancy Numbers -->
                            <div class="flex items-baseline justify-between mt-3 mb-1">
                                <span class="text-xs text-base-content/60">Occupancy</span>
                                <div>
                                    <span class="text-xl font-black ${z.is_full ? 'text-error animate-pulse' : 'text-primary'}">${z.current_occupancy}</span>
                                    <span class="text-xs text-base-content/60">/ ${maxText}</span>
                                </div>
                            </div>

                            ${z.max_occupancy > 0 ? `
                                <progress class="progress ${progressColor} w-full h-2" value="${z.occupancy_pct}" max="100"></progress>
                                <div class="flex justify-end mt-0.5">
                                    <span class="text-[10px] font-mono text-base-content/60">${z.occupancy_pct}% capacity</span>
                                </div>
                            ` : '<div class="h-2.5"></div>'}
                        </div>

                        <div class="mt-4 pt-3 border-t border-base-content/10 flex items-center justify-between">
                            <span class="text-[11px] text-base-content/60">
                                <i class="fa-solid fa-user-group text-primary mr-1"></i> ${z.members.length} inside
                            </span>
                            <button onclick="viewZoneMembers(${z.id})" class="btn btn-xs btn-outline btn-primary gap-1">
                                <i class="fa-solid fa-eye text-[10px]"></i>
                                <span>View List</span>
                            </button>
                        </div>
                    </div>
                `;
            });
            grid.innerHTML = html;
        }

        function populateZoneFilter(zones) {
            const filter = document.getElementById('musterZoneFilter');
            filter.innerHTML = '<option value="">All Zones</option>';
            zones.forEach(z => {
                const opt = document.createElement('option');
                opt.value = z.name;
                opt.innerText = z.name;
                filter.appendChild(opt);
            });
        }

        async function loadMusterRollCall() {
            try {
                const res = await fetch('/api/access/zone/presence/muster_roll_call');
                const data = await res.json();
                if (data.success) {
                    musterRecords = data.data || [];
                    filterMusterTable();
                }
            } catch (err) {
                console.error('Error loading muster records:', err);
            }
        }

        function filterMusterTable() {
            const search = document.getElementById('musterSearch').value.toLowerCase().trim();
            const zoneFilter = document.getElementById('musterZoneFilter').value;
            const tbody = document.getElementById('musterTableBody');

            const filtered = musterRecords.filter(r => {
                const matchSearch = !search ||
                    r.full_name.toLowerCase().includes(search) ||
                    r.member_code.toLowerCase().includes(search) ||
                    r.department.toLowerCase().includes(search);
                const matchZone = !zoneFilter || r.zone_location === zoneFilter;
                return matchSearch && matchZone;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-base-content/60">No personnel matching search criteria.</td></tr>';
                return;
            }

            let html = '';
            filtered.forEach((r, idx) => {
                html += `
                    <tr>
                        <td class="font-mono text-base-content/60">${idx + 1}</td>
                        <td class="font-mono font-bold">${r.member_code}</td>
                        <td class="font-semibold text-base-content">${r.full_name}</td>
                        <td>${r.department || '-'}</td>
                        <td class="font-mono">${r.phone || '-'}</td>
                        <td><span class="badge badge-neutral badge-sm">${r.zone_location}</span></td>
                        <td class="font-mono text-base-content/70">${r.last_access_time}</td>
                        <td class="text-center">
                            <span class="badge badge-warning badge-sm gap-1">
                                <i class="fa-solid fa-clock"></i> Inside Area
                            </span>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        function viewZoneMembers(zoneId) {
            if (!presenceData) return;
            const zone = presenceData.zones.find(z => z.id === zoneId);
            if (!zone) return;

            document.getElementById('zoneModalName').innerText = zone.name;
            document.getElementById('zoneModalSubtitle').innerText = `${zone.current_occupancy} personnel currently located in this area (${zone.code})`;

            const list = document.getElementById('zoneMembersList');
            if (zone.members.length === 0) {
                list.innerHTML = '<div class="py-8 text-center text-xs text-base-content/60">No personnel currently located in this zone.</div>';
            } else {
                let html = '';
                zone.members.forEach(m => {
                    html += `
                        <div class="py-2.5 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="avatar placeholder">
                                    <div class="bg-primary/10 text-primary rounded-full w-8 h-8 text-xs font-bold">
                                        ${m.picture_url ? `<img src="${m.picture_url}" alt="pic" />` : m.name.substring(0, 2).toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <p class="text-xs font-bold text-base-content">${m.name}</p>
                                    <p class="text-[11px] text-base-content/60 font-mono">${m.member_code} • ${m.department || 'General'}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="badge badge-success badge-xs gap-1"><i class="fa-solid fa-arrow-right-to-bracket"></i> Inside</span>
                                <p class="text-[10px] text-base-content/60 font-mono mt-0.5">${m.last_access_time || 'Just now'}</p>
                            </div>
                        </div>
                    `;
                });
                list.innerHTML = html;
            }

            document.getElementById('zoneMembersModal').showModal();
        }

        function openMusterModal() {
            Swal.fire({
                title: 'Emergency Evacuation Alert',
                html: `
                    <div class="text-left text-xs space-y-3">
                        <p class="text-sm font-semibold text-error flex items-center gap-2">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            Muster Roll Call in Progress
                        </p>
                        <p>Total personnel currently inside facility: <strong>${presenceData?.kpi?.total_inside || 0}</strong> persons.</p>
                        <p>Safety marshals should print or export the roll call list immediately to verify headcount at Muster Points.</p>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '<i class="fa-solid fa-file-excel mr-1"></i> Download Excel Roll Call',
                cancelButtonText: 'Dismiss',
                confirmButtonColor: '#16a34a'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/api/access/zone/presence/muster_roll_call?export=excel';
                }
            });
        }

        async function promptResetApb() {
            const confirm = await Swal.fire({
                title: 'Reset Anti-Passback (APB)?',
                text: 'This will reset the inside/outside state for all cardholders, allowing them to re-enter without passback violations.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Reset All',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#eab308'
            });

            if (confirm.isConfirmed) {
                try {
                    const res = await fetch('/api/access/zone/presence/reset_apb', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                    });
                    const result = await res.json();
                    if (result.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'APB Reset',
                            text: result.message || 'All member APB states reset.',
                            timer: 1500,
                            showConfirmButton: false
                        });
                        loadZonePresence();
                    }
                } catch (err) {
                    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
                }
            }
        }

        function initSseListener() {
            try {
                const es = new EventSource('/events');
                es.onopen = () => {
                    document.getElementById('sseStatusText').innerText = 'Live Sync Active';
                    document.getElementById('sseStatusText').className = 'text-xs font-semibold text-success';
                    document.getElementById('ssePingDot').className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75';
                };
                es.onerror = () => {
                    document.getElementById('sseStatusText').innerText = 'Reconnecting...';
                    document.getElementById('sseStatusText').className = 'text-xs font-semibold text-warning';
                    document.getElementById('ssePingDot').className = 'hidden';
                };
                es.addEventListener('access_swipe', (e) => {
                    // Fast reload presence when swipe event occurs
                    loadZonePresence();
                });
            } catch (err) {
                console.warn('SSE connection failed:', err);
            }
        }

        async function checkZoneEmergency() {
            try {
                const res = await fetch('/api/access/emergency/status');
                const data = await res.json();
                updateZoneEmergencyBanner(data);
            } catch (err) {}
        }

        function updateZoneEmergencyBanner(state) {
            const banner = document.getElementById('zoneEmergencyBanner');
            const title = document.getElementById('zoneEmergencyTitle');
            const desc = document.getElementById('zoneEmergencyDesc');
            const iconBox = document.getElementById('zoneEmergencyIconBox');
            const icon = document.getElementById('zoneEmergencyIcon');
            const badge = document.getElementById('zoneEmergencyBadge');
            if (!banner) return;

            if (state && state.mode === 'FIRE_ALARM') {
                banner.className = "card border-2 border-error bg-error/15 text-error shadow-xl p-4 rounded-box";
                title.textContent = "🚨 FIRE ALARM EVACUATION IN PROGRESS";
                desc.textContent = state.reason || "All doors are unlocked for immediate egress. Verify muster points below.";
                iconBox.className = "w-10 h-10 rounded-box bg-error text-white flex items-center justify-center text-xl shadow-md animate-bounce";
                icon.className = "fa-solid fa-fire-flame-curved";
                badge.className = "badge badge-sm badge-error text-white font-bold animate-pulse";
                badge.textContent = "FIRE ALARM";
                banner.classList.remove('hidden');
            } else if (state && state.mode === 'GLOBAL_LOCKDOWN') {
                banner.className = "card border-2 border-warning bg-warning/15 text-warning-content shadow-xl p-4 rounded-box";
                title.textContent = "🔒 FACILITY LOCKDOWN ACTIVE";
                desc.textContent = state.reason || "Facility secured against active threats. Non-emergency movement prohibited.";
                iconBox.className = "w-10 h-10 rounded-box bg-warning text-warning-content flex items-center justify-center text-xl shadow-md animate-pulse";
                icon.className = "fa-solid fa-lock";
                badge.className = "badge badge-sm badge-warning text-warning-content font-bold animate-pulse";
                badge.textContent = "LOCKDOWN";
                banner.classList.remove('hidden');
            } else {
                banner.classList.add('hidden');
            }
        }

        window.addEventListener('sse:emergency', (e) => {
            updateZoneEmergencyBanner(e.detail);
        });

// Global Window Event Handlers
window.loadZonePresence = loadZonePresence;
window.renderKPIs = renderKPIs;
window.renderZonesGrid = renderZonesGrid;
window.populateZoneFilter = populateZoneFilter;
window.viewZoneMembers = viewZoneMembers;
window.loadMusterRollCall = loadMusterRollCall;
window.renderMusterTable = renderMusterTable;
window.filterMusterTable = filterMusterTable;
window.openMusterModal = openMusterModal;
window.promptResetApb = promptResetApb;
window.initSseListener = initSseListener;
window.checkZoneEmergency = checkZoneEmergency;
window.updateZoneEmergencyBanner = updateZoneEmergencyBanner;

