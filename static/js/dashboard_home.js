import * as unity from "./unity.js";

// Set active menu to dashboard or home

$(document).ready(function () {
    console.log("Dashboard Home Loaded");

    // Example: Bind refresh button for devices
    $("#btn_refresh_devices").click(function () {
        refreshDeviceData();
    });

    // Initial load
    fetchSystemStatus();
    refreshDeviceData();

    // Periodic refresh for system status (e.g., every 5 seconds)
    setInterval(fetchSystemStatus, 5000);
});

async function fetchSystemStatus() {
    try {
        const response = await fetch("/api/system/status");
        const res = await response.json();

        if (res.success && res.data) {
            $("#serial_number").text(`${res.data.serial_number}`);
            $("#current_hostname").text(`${res.data.current_hostname}`);
            $("#sys_cpu").text(`${res.data.cpu_percent}%`);
            $("#sys_ram").text(`${res.data.ram_percent}%`);
            $("#sys_ram_detail").text(`${res.data.ram_used_gb} GB / ${res.data.ram_total_gb} GB`);
            $("#sys_disk").text(`${res.data.disk_percent}%`);
            $("#sys_disk_detail").text(`${res.data.disk_used_gb} GB / ${res.data.disk_total_gb} GB`);
            $("#sys_uptime").text(res.data.uptime);
        }
    } catch (error) {
        console.error("Failed to fetch system status:", error);
    }
}

async function refreshDeviceData() {
    let tb_devices = $("#tb_devices");

    try {
        const response = await fetch("/api/system/devices");
        const res = await response.json();

        if (res.success && res.data) {
            if (res.data.length === 0) {
                tb_devices.html(
                    `<tr><td colspan="6" class="text-center py-8 text-base-content/50">No hardware devices registered in system</td></tr>`
                );
                return;
            }

            let htmlRows = "";
            res.data.forEach(dev => {
                const statusBadge = dev.status === "ONLINE"
                    ? `<span class="badge badge-success gap-1 text-[10px] font-bold text-white"><span class="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>ONLINE</span>`
                    : `<span class="badge badge-error gap-1 text-[10px] font-bold text-white">OFFLINE</span>`;

                htmlRows += `
                    <tr class="hover:bg-base-200/50 transition-colors border-b border-base-content/5">
                        <td class="py-4 font-bold">
                            <div class="flex flex-col">
                                <span class="text-base-content font-black text-sm">${dev.name}</span>
                                <span class="text-[10px] opacity-40 font-mono mt-0.5">ID: ${dev.id}</span>
                            </div>
                        </td>
                        <td class="py-4 text-center font-mono font-semibold opacity-70">${dev.ip}</td>
                        <td class="py-4">
                            <span class="badge badge-ghost text-[10px] font-black uppercase tracking-wider">${dev.classification}</span>
                        </td>
                        <td class="py-4 font-semibold text-base-content/60">${dev.location}</td>
                        <td class="py-4 text-center">${statusBadge}</td>
                        <td class="py-4 text-center font-mono opacity-60">${dev.last_heartbeat}</td>
                    </tr>
                `;
            });
            tb_devices.html(htmlRows);
        } else {
            tb_devices.html(
                `<tr><td colspan="6" class="text-center py-4 text-error">Error: ${res.error || 'Failed to load device metrics'}</td></tr>`
            );
        }
    } catch (error) {
        console.error("Failed to fetch devices:", error);
        tb_devices.html(
            `<tr><td colspan="6" class="text-center py-4 text-error">Error loading device metrics</td></tr>`
        );
    }
}
