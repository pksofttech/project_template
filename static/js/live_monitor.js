/**
 * live_monitor.js - Real-Time Access Monitor & Multi-Modality Simulator
 */

let eventCount = 0;

        // 1. Initial Load: Fetch Doors for Remote Unlock & Initial Recent Logs
        $(document).ready(function () {
            loadDoors();
            loadRecentLogs();
            initSSE();
            loadFaceEngineStatus();
            initEmergencyStatus();
        });

        // Load Face Engine Status
        async function loadFaceEngineStatus() {
            try {
                const res = await fetch('/api/access/event/face-status');
                const data = await res.json();
                const badge = document.getElementById('faceEngineStatusBadge');
                if (badge) {
                    if (data.engine_mode === 'insightface') {
                        badge.className = 'badge badge-success badge-xs gap-1 font-mono';
                        badge.innerHTML = `<i class="fa-solid fa-camera"></i> InsightFace (ONNX)`;
                    } else {
                        badge.className = 'badge badge-warning badge-xs gap-1 font-mono';
                        badge.innerHTML = `<i class="fa-solid fa-microchip"></i> InsightFace (Mockup: ${data.enrolled_members_count} faces)`;
                    }
                }
            } catch (err) {
                console.warn("Face status check error:", err);
            }
        }

        // Switch Simulator Tab
        function switchSimTab(tab) {
            const tabs = ['card', 'mobile', 'fingerprint', 'face', 'pin'];
            const panels = {
                card: document.getElementById('simCardPanel'),
                mobile: document.getElementById('simMobilePanel'),
                fingerprint: document.getElementById('simFpPanel'),
                face: document.getElementById('simFacePanel'),
                pin: document.getElementById('simPinPanel')
            };
            const btns = {
                card: { el: document.getElementById('tabCardBtn'), activeClass: 'btn-primary' },
                mobile: { el: document.getElementById('tabMobileBtn'), activeClass: 'btn-secondary' },
                fingerprint: { el: document.getElementById('tabFpBtn'), activeClass: 'btn-accent' },
                face: { el: document.getElementById('tabFaceBtn'), activeClass: 'btn-secondary' },
                pin: { el: document.getElementById('tabPinBtn'), activeClass: 'btn-warning' }
            };

            tabs.forEach(t => {
                if (panels[t]) {
                    if (t === tab) {
                        panels[t].classList.remove('hidden');
                    } else {
                        panels[t].classList.add('hidden');
                    }
                }
                if (btns[t] && btns[t].el) {
                    if (t === tab) {
                        btns[t].el.className = `btn btn-xs ${btns[t].activeClass} gap-1 font-bold shadow-xs`;
                    } else {
                        btns[t].el.className = 'btn btn-xs btn-outline gap-1';
                    }
                }
            });
        }

        // 1. Mobile Simulation Helper & Trigger
        function setSimMobile(id, tech, door, dir) {
            document.getElementById('simMobileId').value = id;
            document.getElementById('simMobileTech').value = tech;
            document.getElementById('simMobileDoor').value = door;
            document.getElementById('simMobileDirection').value = dir;
        }

        async function triggerMobileTap() {
            const btn = document.getElementById('btnSimulateMobile');
            const mobileId = document.getElementById('simMobileId').value.trim();
            const tech = document.getElementById('simMobileTech').value;
            const door = document.getElementById('simMobileDoor').value;
            const direction = document.getElementById('simMobileDirection').value;

            if (!mobileId) {
                if (window.toast) toast.warning("Please enter device UUID or virtual card number");
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Transmitting...';

            try {
                const res = await fetch('/api/access/event/mobile-credential', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        device_uuid: mobileId,
                        comm_tech: tech,
                        door_code: door,
                        direction: direction,
                        reader_id: `SIM-${tech}-01`
                    })
                });
                const result = await res.json();
                if (result.success && window.toast) {
                    if (result.granted) {
                        toast.success(`Mobile Tap Granted: ${result.member_name} (${tech})`);
                    } else {
                        toast.info(`Mobile Denied: ${result.reason}`);
                    }
                }
            } catch (err) {
                console.error("Mobile simulation error:", err);
                if (window.toast) toast.error("Mobile simulation failed");
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-mobile-screen"></i> <span>Tap Phone</span>';
            }
        }

        // 2. Fingerprint Simulation Helper & Trigger
        function setSimFp(memberCode, fingerIdx, door, dir) {
            document.getElementById('simFpMemberCode').value = memberCode;
            document.getElementById('simFpFingerIndex').value = fingerIdx;
            document.getElementById('simFpDoor').value = door;
            document.getElementById('simFpDirection').value = dir;
        }

        async function triggerFingerprintScan() {
            const btn = document.getElementById('btnSimulateFp');
            const memberCode = document.getElementById('simFpMemberCode').value.trim();
            const fingerIndex = parseInt(document.getElementById('simFpFingerIndex').value, 10);
            const door = document.getElementById('simFpDoor').value;
            const direction = document.getElementById('simFpDirection').value;

            if (!memberCode) {
                if (window.toast) toast.warning("Please enter cardholder member code");
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Verifying...';

            try {
                const res = await fetch('/api/access/event/fingerprint', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        member_code: memberCode,
                        finger_index: fingerIndex,
                        door_code: door,
                        direction: direction,
                        reader_id: 'SIM-FP-01'
                    })
                });
                const result = await res.json();
                if (result.success && window.toast) {
                    if (result.granted) {
                        toast.success(`Fingerprint Match: ${result.member_name}`);
                    } else {
                        toast.info(`Fingerprint Denied: ${result.reason}`);
                    }
                }
            } catch (err) {
                console.error("Fingerprint simulation error:", err);
                if (window.toast) toast.error("Fingerprint simulation failed");
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-fingerprint"></i> <span>Scan Finger</span>';
            }
        }

        // 3. Face Simulation Helper & Trigger
        function setSimFace(memberCode, doorCode, direction) {
            document.getElementById('simFaceCode').value = memberCode;
            document.getElementById('simFaceDoor').value = doorCode;
            document.getElementById('simFaceDirection').value = direction;
        }

        async function triggerFaceScan() {
            const btn = document.getElementById('btnSimulateFace');
            const memberCode = document.getElementById('simFaceCode').value.trim();
            const door = document.getElementById('simFaceDoor').value;
            const direction = document.getElementById('simFaceDirection').value;

            if (!door) {
                if (window.toast) toast.warning("Please select a door");
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Scanning...';

            try {
                const res = await fetch('/api/access/event/camera-face', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        door_code: door,
                        direction: direction,
                        simulate_member_code: memberCode,
                        reader_id: 'SIM-CAM-FACE-01'
                    })
                });
                const result = await res.json();
                if (result.success) {
                    if (window.toast) {
                        if (result.granted) {
                            toast.success(`Face Recognized: ${result.member_name} (${result.confidence_percent})`);
                        } else {
                            toast.info(`Face Event: ${result.result} - ${result.reason}`);
                        }
                    }
                }
            } catch (err) {
                console.error("Face simulation error:", err);
                if (window.toast) toast.error("Face simulation failed");
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-camera"></i> <span>Scan Face</span>';
            }
        }

        // 4. Keypad PIN Simulation Helper & Trigger
        function setSimPin(pin, memberCode, door, dir) {
            document.getElementById('simPinCode').value = pin;
            document.getElementById('simPinMemberCode').value = memberCode;
            document.getElementById('simPinDoor').value = door;
            document.getElementById('simPinDirection').value = dir;
        }

        async function triggerPinEntry() {
            const btn = document.getElementById('btnSimulatePin');
            const pinCode = document.getElementById('simPinCode').value.trim();
            const memberCode = document.getElementById('simPinMemberCode').value.trim();
            const door = document.getElementById('simPinDoor').value;
            const direction = document.getElementById('simPinDirection').value;

            if (!pinCode) {
                if (window.toast) toast.warning("Please enter PIN code");
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Verifying...';

            try {
                const res = await fetch('/api/access/event/pin-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pin_code: pinCode,
                        member_code: memberCode || null,
                        door_code: door,
                        direction: direction,
                        reader_id: 'SIM-KEYPAD-01'
                    })
                });
                const result = await res.json();
                if (result.success && window.toast) {
                    if (result.is_duress) {
                        toast.error(`🚨 SILENT DURESS ALARM: Silent distress code entered by ${result.member_name}! Security notified.`);
                    } else if (result.granted) {
                        toast.success(`PIN Verified: ${result.member_name}`);
                    } else {
                        toast.info(`PIN Denied: ${result.reason}`);
                    }
                }
            } catch (err) {
                console.error("PIN simulation error:", err);
                if (window.toast) toast.error("PIN entry simulation failed");
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-hashtag"></i> <span>Enter PIN</span>';
            }
        }

        // Load Doors for Remote Controls
        async function loadDoors() {
            try {
                const res = await fetch('/api/access/door/list/all');
                const result = await res.json();
                if (result.success && result.data) {
                    renderDoors(result.data);
                }
            } catch (err) {
                console.error("Failed to load doors:", err);
            }
        }

        function renderDoors(doors) {
            const container = document.getElementById('remoteDoorsContainer');
            if (!doors || doors.length === 0) {
                container.innerHTML = '<div class="text-center py-4 text-xs text-base-content/40">No doors registered</div>';
                return;
            }

            container.innerHTML = doors.map(d => `
                <div class="flex items-center justify-between p-2.5 rounded-box bg-base-200/50 hover:bg-base-200 transition-colors border border-base-content/5">
                    <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-box bg-primary/10 text-primary flex items-center justify-center text-xs">
                            <i class="${d.door_type === 'BARRIER_GATE' ? 'fa-solid fa-road-barrier' : 'fa-solid fa-door-closed'}"></i>
                        </div>
                        <div>
                            <div class="font-bold text-xs text-base-content">${d.name}</div>
                            <div class="text-[10px] text-base-content/50">${d.code} • ${d.zone}</div>
                        </div>
                    </div>
                    <button onclick="remoteUnlock(${d.id}, '${d.name}')" class="btn btn-xs btn-outline btn-success font-bold gap-1 shadow-xs hover:scale-105 transition-transform">
                        <i class="fa-solid fa-unlock"></i> Open (${d.relay_time_sec}s)
                    </button>
                </div>
            `).join('');
        }

        // Remote Unlock Trigger
        async function remoteUnlock(doorId, doorName) {
            try {
                const res = await fetch('/api/access/event/remote_unlock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ door_id: doorId, operator_name: 'Admin Console' })
                });
                const result = await res.json();
                if (result.success) {
                    if (window.toast) {
                        toast.success(result.message);
                    }
                } else {
                    if (window.toast) toast.error(result.detail || "Unlock failed");
                }
            } catch (err) {
                console.error("Remote unlock error:", err);
                if (window.toast) toast.error("Communication error");
            }
        }

        // Load Initial Recent Logs
        async function loadRecentLogs() {
            try {
                const res = await fetch('/api/access/log/recent');
                const result = await res.json();
                if (result.success && result.data) {
                    const feed = document.getElementById('liveFeedList');
                    feed.innerHTML = '';
                    result.data.forEach(log => {
                        appendLogCard(log, false);
                    });
                }
            } catch (err) {
                console.error("Failed to load recent logs:", err);
            }
        }

        // Simulator Quick Badge Helper
        function setSimBadge(cardNo, doorCode, direction) {
            document.getElementById('simCard').value = cardNo;
            document.getElementById('simDoor').value = doorCode;
            document.getElementById('simDirection').value = direction;
        }

        // Trigger Simulated Card Swipe
        async function triggerSwipe() {
            const btn = document.getElementById('btnSimulate');
            const card = document.getElementById('simCard').value.trim();
            const door = document.getElementById('simDoor').value;
            const direction = document.getElementById('simDirection').value;

            if (!card) {
                if (window.toast) toast.warning("Please enter a card number");
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="loading loading-spinner loading-xs"></span> Tapping...';

            try {
                const res = await fetch('/api/access/event/swipe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        card_number: card,
                        door_code: door,
                        direction: direction,
                        reader_id: 'SIM-READER-1'
                    })
                });
                const result = await res.json();
            } catch (err) {
                console.error("Simulation error:", err);
                if (window.toast) toast.error("Simulation request failed");
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-id-card"></i> <span>Tap Card</span>';
            }
        }

        // Connect to Real-time SSE
        function initSSE() {
            const evtSource = new EventSource('/sse');

            evtSource.addEventListener('access_swipe', function (e) {
                try {
                    const payload = JSON.parse(e.data);
                    handleIncomingSwipe(payload);
                } catch (err) {
                    console.error("SSE parse error:", err);
                }
            });

            evtSource.addEventListener('door_unlocked', function (e) {
                try {
                    const payload = JSON.parse(e.data);
                    if (window.toast) {
                        toast.info(`Door '${payload.door_name}' unlocked remotely by ${payload.operator}`);
                    }
                } catch (err) {
                    console.error("SSE parse error:", err);
                }
            });

            evtSource.addEventListener('emergency_event', function (e) {
                try {
                    const payload = JSON.parse(e.data);
                    applyEmergencyState(payload);
                } catch (err) {
                    console.error("Emergency SSE parse error:", err);
                }
            });

            evtSource.onerror = function () {
                console.warn("SSE connection lost. Reconnecting...");
            };
        }

        // Handle incoming real-time swipe event
        function handleIncomingSwipe(data) {
            updateSpotlight(data);
            appendLogCard(data, true);
        }

        // Credential Modality Badge Generator
        function getCredentialBadgeHtml(credType, isDuress) {
            if (isDuress) {
                return '<span class="badge badge-xs badge-error gap-1 font-bold font-mono animate-pulse"><i class="fa-solid fa-triangle-exclamation"></i> DURESS PIN (SILENT ALARM)</span>';
            }
            const t = (credType || '').toUpperCase();
            if (t.includes('BLE')) {
                return '<span class="badge badge-xs badge-secondary gap-1 font-bold font-mono"><i class="fa-brands fa-bluetooth-b"></i> BLE Mobile</span>';
            } else if (t.includes('NFC')) {
                return '<span class="badge badge-xs badge-secondary gap-1 font-bold font-mono"><i class="fa-solid fa-nfc-symbol"></i> NFC Mobile</span>';
            } else if (t.includes('MOBILE')) {
                return '<span class="badge badge-xs badge-secondary gap-1 font-bold font-mono"><i class="fa-solid fa-mobile-screen"></i> Mobile</span>';
            } else if (t.includes('FINGER')) {
                return '<span class="badge badge-xs badge-accent gap-1 font-bold font-mono"><i class="fa-solid fa-fingerprint"></i> Fingerprint</span>';
            } else if (t.includes('FACE')) {
                return '<span class="badge badge-xs badge-info gap-1 font-bold font-mono"><i class="fa-solid fa-camera"></i> Face Bio</span>';
            } else if (t.includes('PIN')) {
                return '<span class="badge badge-xs badge-warning gap-1 font-bold font-mono"><i class="fa-solid fa-hashtag"></i> Keypad PIN</span>';
            } else {
                return '<span class="badge badge-xs badge-primary gap-1 font-bold font-mono"><i class="fa-solid fa-id-card"></i> RFID</span>';
            }
        }

        // Update Big Spotlight Card
        function updateSpotlight(d) {
            const card = document.getElementById('liveSpotlightCard');
            const badge = document.getElementById('spotlightBadge');
            const isGranted = (d.result === 'GRANTED');
            const isDuress = Boolean(d.is_duress || (d.credential_identifier && d.credential_identifier.includes('DURESS')));

            // Sound feedback if available
            try {
                const audio = new Audio(isGranted ? '/static/sound/granted.mp3' : '/static/sound/denied.mp3');
                audio.play().catch(() => {});
            } catch (e) {}

            // Border & Glow Animation
            card.classList.remove('border-primary/30', 'border-success', 'border-error', 'shadow-success/20', 'shadow-error/20');
            card.classList.add(isGranted ? 'border-success' : 'border-error', isGranted ? 'shadow-success/20' : 'shadow-error/20');

            // Badge
            if (isDuress) {
                badge.className = 'inline-flex items-center gap-2 px-6 py-2 rounded-full font-black text-base shadow-lg bg-error text-error-content animate-bounce';
                badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>DURESS ALARM (SILENT ALERT)</span>';
            } else if (isGranted) {
                badge.className = 'inline-flex items-center gap-2 px-6 py-2 rounded-full font-black text-base shadow-sm bg-success text-success-content animate-pulse';
                badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>ACCESS GRANTED</span>';
            } else {
                badge.className = 'inline-flex items-center gap-2 px-6 py-2 rounded-full font-black text-base shadow-sm bg-error text-error-content animate-pulse';
                badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> <span>ACCESS DENIED</span>';
            }

            // Cardholder Info
            document.getElementById('spotlightName').textContent = d.member_name || 'Unknown Person';
            document.getElementById('spotlightDept').textContent = d.department || 'No department assigned';
            document.getElementById('spotlightCardNo').textContent = d.card_number || '-';
            document.getElementById('spotlightDoor').textContent = d.door_name || d.door_code;
            document.getElementById('spotlightDirection').textContent = d.direction || 'IN';
            document.getElementById('spotlightReason').textContent = d.reason || '-';
            document.getElementById('spotlightTime').textContent = d.time || new Date().toLocaleTimeString();

            // Credential Modality Badge
            const credBadgeEl = document.getElementById('spotlightCredBadge');
            if (credBadgeEl) {
                credBadgeEl.innerHTML = getCredentialBadgeHtml(d.credential_type, isDuress);
            }

            // Face Match Confidence Indicator
            const confEl = document.getElementById('spotlightMatchConfidence');
            if (confEl) {
                if (d.event_type === 'FACE_RECOGNITION' && d.confidence_percent) {
                    confEl.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-box text-[11px] font-bold bg-secondary/15 text-secondary border border-secondary/25 mt-1';
                    confEl.innerHTML = `<i class="fa-solid fa-camera"></i> Face Match: ${d.confidence_percent} (${d.engine_mode || 'Mockup'})`;
                } else {
                    confEl.className = 'hidden';
                    confEl.innerHTML = '';
                }
            }

            // Avatar / Snapshot Picture
            const avatarContainer = document.getElementById('spotlightAvatar');
            const imgUrl = d.snapshot_url || d.picture_url;
            if (imgUrl) {
                avatarContainer.innerHTML = `<img src="${imgUrl}" class="rounded-box w-20 h-20 object-cover shadow-inner border border-base-content/10" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'bg-primary/10 text-primary rounded-box w-20 h-20 flex items-center justify-center text-3xl font-black\\'><i class=\\'fa-solid fa-user\\'></i></div>';" />`;
            } else {
                const initial = (d.member_name && d.member_name !== 'Unknown') ? d.member_name.charAt(0).toUpperCase() : '?';
                avatarContainer.innerHTML = `
                    <div class="${isGranted ? 'bg-success/15 text-success' : 'bg-error/15 text-error'} rounded-box w-20 h-20 shadow-inner flex items-center justify-center text-3xl font-black">
                        ${initial}
                    </div>
                `;
            }
        }

        // Prepend Log Card to Live Feed
        function appendLogCard(log, animate = true) {
            const feed = document.getElementById('liveFeedList');
            const isGranted = (log.result === 'GRANTED');
            const isDuress = Boolean(log.is_duress || (log.credential_identifier && log.credential_identifier.includes('DURESS')));
            const timeStr = log.time || (log.event_time ? log.event_time.substring(11, 19) : '');
            const credBadge = getCredentialBadgeHtml(log.credential_type, isDuress);

            const cardHtml = document.createElement('div');
            cardHtml.className = `p-3 rounded-box border ${isDuress ? 'bg-error/15 border-error' : (isGranted ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20')} flex items-center justify-between gap-3 ${animate ? 'animate-fade-in-down' : ''}`;
            
            cardHtml.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full ${isDuress ? 'bg-error text-error-content animate-ping' : (isGranted ? 'bg-success text-success-content' : 'bg-error text-error-content')} flex items-center justify-center text-xs font-bold shrink-0">
                        <i class="${isDuress ? 'fa-solid fa-triangle-exclamation' : (isGranted ? 'fa-solid fa-check' : 'fa-solid fa-xmark')}"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-xs text-base-content">${log.member_name || 'Unknown'}</span>
                            <span class="badge badge-xs ${isGranted ? 'badge-success' : 'badge-error'} font-mono">${log.result}</span>
                            <span class="badge badge-xs badge-neutral font-mono">${log.direction || 'IN'}</span>
                            ${credBadge}
                        </div>
                        <div class="text-[11px] text-base-content/60 mt-0.5">
                            <span>${log.door_name}</span> • <span class="font-mono">${log.card_number}</span>
                        </div>
                        <div class="text-[10px] ${isDuress ? 'text-error font-black' : (isGranted ? 'text-success' : 'text-error')} font-semibold mt-0.5">
                            ${log.reason || ''}
                        </div>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <span class="font-mono text-xs text-base-content/50">${timeStr}</span>
                </div>
            `;

            feed.insertBefore(cardHtml, feed.firstChild);

            eventCount++;
            document.getElementById('streamCounter').textContent = `${eventCount} events`;

            // Limit feed to 40 items to prevent DOM bloat
            if (feed.children.length > 40) {
                feed.removeChild(feed.lastChild);
            }
        }

        function clearStream() {
            document.getElementById('liveFeedList').innerHTML = '';
            eventCount = 0;
            document.getElementById('streamCounter').textContent = '0 events';
        }

        let emergencyTimerInterval = null;
        let emergencyTriggerTime = null;

        async function initEmergencyStatus() {
            try {
                const res = await fetch('/api/access/emergency/status');
                const data = await res.json();
                applyEmergencyState(data);
            } catch (err) {
                console.error("Failed to fetch emergency status:", err);
            }
        }

        function applyEmergencyState(state) {
            const banner = document.getElementById('emergencyAlertBanner');
            const title = document.getElementById('emergencyBannerTitle');
            const desc = document.getElementById('emergencyBannerDesc');
            const timeEl = document.getElementById('emergencyBannerTime');
            const opEl = document.getElementById('emergencyBannerOperator');
            const iconBox = document.getElementById('emergencyBannerIconBox');
            const icon = document.getElementById('emergencyBannerIcon');
            const badge = document.getElementById('emergencyBannerBadge');
            const statusPill = document.getElementById('emergencyStatusPill');
            const statusPillText = document.getElementById('emergencyStatusPillText');
            const toolbarResetBtn = document.getElementById('emergencyToolbarResetBtn');

            // Navbar elements
            const navPill = document.getElementById('globalEmergencyNavbarPill');
            const navText = document.getElementById('globalEmergencyNavbarText');
            const navIcon = document.getElementById('globalEmergencyNavbarIcon');
            const navLink = document.getElementById('globalEmergencyNavbarLink');

            if (!banner) return;

            if (state.mode === 'FIRE_ALARM') {
                banner.className = "card border-2 border-error bg-error/15 text-error shadow-xl p-4 rounded-box";
                title.textContent = "🚨 FIRE ALARM EVACUATION IN PROGRESS";
                title.className = "text-base sm:text-lg font-black tracking-wide uppercase text-error";
                desc.textContent = state.reason || "All doors and barrier gates are currently UNLOCKED for immediate life safety evacuation.";
                timeEl.textContent = state.triggered_at ? dayjs(state.triggered_at).format("HH:mm:ss") : "";
                opEl.textContent = state.triggered_by || "FACP / System Operator";
                iconBox.className = "w-12 h-12 rounded-box bg-error text-white flex items-center justify-center text-2xl shadow-md animate-bounce";
                icon.className = "fa-solid fa-fire-flame-curved";
                badge.className = "badge badge-sm badge-error text-white font-bold animate-pulse";
                badge.textContent = "FIRE ALARM";
                banner.classList.remove('hidden');

                if (statusPill) {
                    statusPill.className = "badge badge-xs badge-error text-white gap-1 font-bold text-[10px] py-0 h-4 animate-pulse";
                }
                if (statusPillText) {
                    statusPillText.textContent = "FIRE ALARM ACTIVE";
                }
                if (toolbarResetBtn) toolbarResetBtn.classList.remove('hidden');

                if (navPill) {
                    navPill.classList.remove('hidden');
                    if (navLink) navLink.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold border border-error bg-error text-white animate-pulse shadow-sm";
                    if (navIcon) navIcon.className = "fa-solid fa-fire-flame-curved";
                    if (navText) navText.textContent = "FIRE ALARM";
                }

                emergencyTriggerTime = state.triggered_at ? new Date(state.triggered_at) : new Date();
                startEmergencyTimer();

                if (window.toastr) {
                    toastr.error(state.reason || "Fire alarm activated! All doors unlocked.", "FIRE ALARM EVACUATION", { timeOut: 8000 });
                }
            } else if (state.mode === 'GLOBAL_LOCKDOWN') {
                banner.className = "card border-2 border-warning bg-warning/15 text-warning-content shadow-xl p-4 rounded-box";
                title.textContent = "🔒 FACILITY LOCKDOWN ACTIVE";
                title.className = "text-base sm:text-lg font-black tracking-wide uppercase text-warning";
                desc.textContent = state.reason || "All perimeter and interior doors are SECURED. Entry and exit strictly prohibited.";
                timeEl.textContent = state.triggered_at ? dayjs(state.triggered_at).format("HH:mm:ss") : "";
                opEl.textContent = state.triggered_by || "Security Command";
                iconBox.className = "w-12 h-12 rounded-box bg-warning text-warning-content flex items-center justify-center text-2xl shadow-md animate-pulse";
                icon.className = "fa-solid fa-lock";
                badge.className = "badge badge-sm badge-warning text-warning-content font-bold animate-pulse";
                badge.textContent = "LOCKDOWN";
                banner.classList.remove('hidden');

                if (statusPill) {
                    statusPill.className = "badge badge-xs badge-warning text-warning-content gap-1 font-bold text-[10px] py-0 h-4 animate-pulse";
                }
                if (statusPillText) {
                    statusPillText.textContent = "LOCKDOWN ACTIVE";
                }
                if (toolbarResetBtn) toolbarResetBtn.classList.remove('hidden');

                if (navPill) {
                    navPill.classList.remove('hidden');
                    if (navLink) navLink.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold border border-warning bg-warning text-warning-content animate-pulse shadow-sm";
                    if (navIcon) navIcon.className = "fa-solid fa-lock";
                    if (navText) navText.textContent = "LOCKDOWN";
                }

                emergencyTriggerTime = state.triggered_at ? new Date(state.triggered_at) : new Date();
                startEmergencyTimer();

                if (window.toastr) {
                    toastr.warning(state.reason || "Facility lockdown active! All doors secured.", "GLOBAL LOCKDOWN", { timeOut: 8000 });
                }
            } else {
                // NORMAL
                banner.classList.add('hidden');
                if (statusPill) {
                    statusPill.className = "badge badge-xs badge-success gap-1 font-semibold text-[10px] py-0 h-4";
                }
                if (statusPillText) {
                    statusPillText.textContent = "Normal Operation";
                }
                if (toolbarResetBtn) toolbarResetBtn.classList.add('hidden');
                if (navPill) navPill.classList.add('hidden');
                stopEmergencyTimer();

                if (state.previous_mode && window.toastr) {
                    toastr.success("Emergency cleared. Normal access schedules restored.", "NORMAL RESTORED");
                }
            }
        }

        function startEmergencyTimer() {
            stopEmergencyTimer();
            updateTimerDisplay();
            emergencyTimerInterval = setInterval(updateTimerDisplay, 1000);
        }

        function stopEmergencyTimer() {
            if (emergencyTimerInterval) {
                clearInterval(emergencyTimerInterval);
                emergencyTimerInterval = null;
            }
        }

        function updateTimerDisplay() {
            const timerEl = document.getElementById('emergencyElapsedTimer');
            if (!timerEl || !emergencyTriggerTime) return;
            const now = new Date();
            const elapsedMs = Math.max(0, now - emergencyTriggerTime);
            const totalSec = Math.floor(elapsedMs / 1000);
            const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
            const secs = String(totalSec % 60).padStart(2, '0');
            timerEl.textContent = `${mins}:${secs}`;
        }

        function openFireAlarmModal() {
            const modal = document.getElementById('fireAlarmModal');
            if (modal) modal.showModal();
        }

        async function submitFireAlarm() {
            const reason = (document.getElementById('fireAlarmReasonInput')?.value || '').trim();
            const modal = document.getElementById('fireAlarmModal');
            try {
                const res = await fetch('/api/access/emergency/fire-alarm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: reason, source: 'MANUAL_WEB' })
                });
                const data = await res.json();
                if (modal) modal.close();
                applyEmergencyState(data);
            } catch (err) {
                console.error("Fire Alarm trigger failed:", err);
                alert("Failed to trigger Fire Alarm: " + err.message);
            }
        }

        function openLockdownModal() {
            const modal = document.getElementById('lockdownModal');
            if (modal) modal.showModal();
        }

        async function submitLockdown() {
            const reason = (document.getElementById('lockdownReasonInput')?.value || '').trim();
            const modal = document.getElementById('lockdownModal');
            try {
                const res = await fetch('/api/access/emergency/lockdown', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: reason, source: 'MANUAL_WEB' })
                });
                const data = await res.json();
                if (modal) modal.close();
                applyEmergencyState(data);
            } catch (err) {
                console.error("Lockdown trigger failed:", err);
                alert("Failed to trigger Lockdown: " + err.message);
            }
        }

        function confirmResetEmergency() {
            const modal = document.getElementById('resetEmergencyModal');
            if (modal) modal.showModal();
        }

        async function submitResetEmergency() {
            const modal = document.getElementById('resetEmergencyModal');
            try {
                const res = await fetch('/api/access/emergency/reset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (modal) modal.close();
                applyEmergencyState(data);
            } catch (err) {
                console.error("Reset emergency failed:", err);
                alert("Failed to reset emergency: " + err.message);
            }
        }

// Global Window Event Handlers
window.loadDoors = loadDoors;
window.loadRecentLogs = loadRecentLogs;
window.loadFaceEngineStatus = loadFaceEngineStatus;
window.switchSimTab = switchSimTab;
window.setSimBadge = setSimBadge;
window.triggerSwipe = triggerSwipe;
window.setSimMobile = setSimMobile;
window.triggerMobileTap = triggerMobileTap;
window.setSimFp = setSimFp;
window.triggerFingerprintScan = triggerFingerprintScan;
window.setSimFace = setSimFace;
window.triggerFaceScan = triggerFaceScan;
window.setSimPin = setSimPin;
window.triggerPinEntry = triggerPinEntry;
window.clearStream = clearStream;
window.remoteUnlock = remoteUnlock;
window.initEmergencyStatus = initEmergencyStatus;
window.applyEmergencyState = applyEmergencyState;
window.openFireAlarmModal = openFireAlarmModal;
window.submitFireAlarm = submitFireAlarm;
window.openLockdownModal = openLockdownModal;
window.submitLockdown = submitLockdown;
window.confirmResetEmergency = confirmResetEmergency;
window.submitResetEmergency = submitResetEmergency;


