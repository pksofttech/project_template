/**
 * home.js - Portal Home Screen & Clock/Notification Utilities
 */

// Real-time clock display (GMT+7)
        function updateClock() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('th-TH', { hour12: false });
            const clockEl = document.getElementById("serverClock");
            if (clockEl) clockEl.innerText = timeStr;
        }
        setInterval(updateClock, 1000);
        updateClock();

        // Trigger test SSE broadcast
        async function triggerTestBroadcast() {
            try {
                const res = await fetch('/broadcast_sse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: "Test Notification",
                        message: "Real-time broadcast from Home page",
                        timestamp: new Date().toISOString()
                    })
                });
                if (res.ok) {
                    toastr.success("Broadcast message sent via SSE!");
                }
            } catch (err) {
                toastr.error("Failed to broadcast SSE");
            }
        }

// Global Window Event Handlers
window.updateClock = updateClock;
window.triggerTestBroadcast = triggerTestBroadcast;

