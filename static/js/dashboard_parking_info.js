import * as unity from "./unity.js";

const PARKING_CONFIG = {
    totalSlots: 500,
    refreshMs: 5000,
    apiUrl: "/api/gateway_car_count",
};

function sumCounts(rows = []) {
    return rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
}

function getStatusMeta(available, totalSlots) {
    const percentAvailable = totalSlots > 0 ? (available / totalSlots) * 100 : 0;

    if (available <= 0) {
        return {
            label: "FULL",
            badgeClass: "bg-rose-500/20 text-rose-300 border border-rose-400/30",
            barStyle: "linear-gradient(90deg, #fb7185, #e11d48)",
        };
    }

    if (percentAvailable <= 10) {
        return {
            label: "ALMOST FULL",
            badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-400/30",
            barStyle: "linear-gradient(90deg, #fbbf24, #f59e0b)",
        };
    }

    return {
        label: "AVAILABLE",
        badgeClass: "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30",
        barStyle: "linear-gradient(90deg, #34d399, #10b981)",
    };
}

function formatDateTimeNow() {
    return new Date().toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "medium",
    });
}

function updateSignColor(available) {
    const el = document.getElementById("available_slots");
    if (!el) return;
    if (available < 10) el.style.color = "#ff1744";
    else if (available < 25) el.style.color = "#ffea00";
    else el.style.color = "#34d399";
}

function set(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function renderParkingDetail(totalByParking = [], todayByParking = [], totalSlots = 500) {
    const container = document.getElementById("parking_detail_list");
    if (!container) return;

    const todayMap = Object.fromEntries(todayByParking.map((row) => [row.parking_id, row.count]));

    if (!totalByParking.length) {
        container.innerHTML = `
        <div class="rounded-box border border-white/10 bg-slate-800/60 p-4 text-slate-400">
          No parking zone data
        </div>
      `;
        return;
    }

    container.innerHTML = totalByParking
        .map((row) => {
            const parkingId = row.parking_id;
            const parked = Number(row.count || 0);
            const today = Number(todayMap[parkingId] || 0);
            const available = Math.max(totalSlots - parked, 0);

            return `
        <div class="rounded-box border border-white/10 bg-slate-800/60 p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-slate-400">Parking ID</div>
              <div class="text-lg font-bold text-white">${parkingId}</div>
            </div>
            <div class="text-right">
              <div class="text-sm text-slate-400">Available</div>
              <div class="text-2xl font-black text-emerald-300">${available}</div>
            </div>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-box bg-cyan-500/10 px-3 py-2">
              <div class="text-cyan-200/70">Occupied</div>
              <div class="text-xl font-bold text-cyan-300">${parked}</div>
            </div>
            <div class="rounded-box bg-amber-500/10 px-3 py-2">
              <div class="text-amber-200/70">Today</div>
              <div class="text-xl font-bold text-amber-300">${today}</div>
            </div>
          </div>
        </div>
      `;
        })
        .join("");
}

function renderDashboard(data) {
    const totalSlots = Number(PARKING_CONFIG.totalSlots || 0);

    const todayIn = sumCounts(data.day_parking_in || []);
    const todayOut = sumCounts(data.day_parking_out || []);
    const parkedTotal = Number(data.parked?.total || 0);
    const todayParked = Number(data.parked?.today || 0);

    const available = Math.max(totalSlots - parkedTotal, 0);
    const occupiedPercent = totalSlots > 0 ? Math.min((parkedTotal / totalSlots) * 100, 100) : 0;
    const status = getStatusMeta(available, totalSlots);

    set("today_in", todayIn.toLocaleString());
    set("today_out", todayOut.toLocaleString());
    set("today_parked", todayParked.toLocaleString());
    set("parked_total", parkedTotal.toLocaleString());
    set("total_slots_label", totalSlots.toLocaleString());
    set("occupancy_percent", `${occupiedPercent.toFixed(1)}%`);
    set("dashboard_last_update", formatDateTimeNow());

    set("available_slots", available.toLocaleString());
    updateSignColor(available);

    const badge = document.getElementById("capacity_badge");
    if (badge) {
        badge.textContent = status.label;
        badge.className = `rounded-full px-4 py-2 text-sm font-bold ${status.badgeClass}`;
    }

    const bar = document.getElementById("occupancy_bar");
    if (bar) {
        bar.style.width = `${occupiedPercent}%`;
        bar.style.background = status.barStyle;
    }

    renderParkingDetail(data.parked?.total_by_parking || [], data.parked?.today_by_parking || [], totalSlots);
}

async function loadParkingDashboard() {
    try {
        const respond = await unity.fetchApi(PARKING_CONFIG.apiUrl, "get", null, "json");
        if (!respond || respond.success === false) {
            throw new Error(respond?.msg || respond?.detail || "Load data failed");
        }
        renderDashboard(respond);
    } catch (error) {
        console.error("loadParkingDashboard error:", error);
        set("dashboard_last_update", "Failed to load");
        const badge = document.getElementById("capacity_badge");
        if (badge) {
            badge.textContent = "ERROR";
            badge.className =
                "rounded-full px-4 py-2 text-sm font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30";
        }
    }
}

unity.initSse(async (e) => {
    unity.logger.debug(e);
    if (e.func == "lpr_event") {
        unity.logger.debug(e.params);
        loadParkingDashboard();
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    loadParkingDashboard();
    unity.initI18n();
});
