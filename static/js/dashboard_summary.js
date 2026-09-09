import * as unity from "./unity.js";

let hourlyChart = null;
let donutChart = null;

// Currency formatter for THB
function formatTHB(value) {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(value);
}

async function fetchSummaryData() {
    try {
        const response = await unity.fetchApi("/api/dashboard_summary_data", "get", null, "json");
        if (!response.success) {
            console.error("Failed to load dashboard summary data:", response.error);
            return;
        }

        // 1. Update metric cards
        document.getElementById("val_parked_now").textContent = unity.toNumber(response.traffic.parked_now, true);
        document.getElementById("val_today_entries").textContent = unity.toNumber(response.traffic.today_entries, true);
        document.getElementById("val_today_exits").textContent = unity.toNumber(response.traffic.today_exits, true);
        document.getElementById("val_today_revenue").textContent = formatTHB(response.revenue.today);

        // 2. Update infrastructure grid
        document.getElementById("val_infra_parking_lots").textContent = response.infrastructure.parking_lots;
        document.getElementById("val_infra_gateways").textContent = response.infrastructure.gateways;
        document.getElementById("val_infra_cameras").textContent = response.infrastructure.cameras;
        document.getElementById("val_infra_estamp_devices").textContent = response.infrastructure.estamp_devices;

        // 3. Render Hourly Traffic Chart
        renderHourlyChart(response.hourly.entries, response.hourly.exits);

        // 4. Render Vehicle Donut Chart
        renderDonutChart(response.vehicle_types);

        // 5. Populate recent LPR table
        populateRecentLpr(response.recent_lpr);

    } catch (err) {
        console.error("Error fetching summary data:", err);
    }
}

function renderHourlyChart(entries, exits) {
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const foreColor = isDark ? "#A6ADBB" : "#1F2937";

    const options = {
        series: [
            { name: "Entries", data: entries },
            { name: "Exits", data: exits }
        ],
        chart: {
            type: "area",
            height: 320,
            toolbar: { show: false },
            foreColor: foreColor,
            background: 'transparent'
        },
        colors: ["#10B981", "#EF4444"], // Emerald and Rose colors
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 2.5 },
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.35,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            categories: hours,
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            title: { text: "Vehicles" },
            min: 0,
            labels: {
                formatter: function (val) {
                    return Math.floor(val);
                }
            }
        },
        grid: {
            borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
            strokeDashArray: 4
        },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: function (val) {
                    return val + " vehicles";
                }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right'
        }
    };

    const chartDiv = document.getElementById("hourly_traffic_chart");
    if (hourlyChart) {
        hourlyChart.destroy();
    }
    hourlyChart = new ApexCharts(chartDiv, options);
    hourlyChart.render();
}

function renderDonutChart(vehicleTypes) {
    const chartDiv = document.getElementById("vehicle_type_donut_chart");
    const noDataDiv = document.getElementById("no_vehicle_type_data");

    if (!vehicleTypes || vehicleTypes.length === 0) {
        chartDiv.classList.add("hidden");
        noDataDiv.classList.remove("hidden");
        return;
    }

    chartDiv.classList.remove("hidden");
    noDataDiv.classList.add("hidden");

    const labels = vehicleTypes.map(item => item.name);
    const series = vehicleTypes.map(item => item.count);
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const foreColor = isDark ? "#A6ADBB" : "#1F2937";

    const options = {
        series: series,
        labels: labels,
        chart: {
            type: "donut",
            width: "100%",
            height: 220,
            foreColor: foreColor,
            background: 'transparent'
        },
        stroke: { show: false },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: "Total",
                            formatter: function (w) {
                                return w.globals.seriesTotals.reduce((a, b) => a + b, 0) + " vehicles";
                            }
                        }
                    }
                }
            }
        },
        legend: {
            position: 'bottom',
            fontSize: '11px'
        },
        dataLabels: { enabled: false }
    };

    if (donutChart) {
        donutChart.destroy();
    }
    donutChart = new ApexCharts(chartDiv, options);
    donutChart.render();
}

function populateRecentLpr(recentLpr) {
    const tbody = document.getElementById("recent_lpr_table_body");
    tbody.innerHTML = "";

    if (!recentLpr || recentLpr.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-base-content/40">No recent detection logs</td></tr>`;
        return;
    }

    recentLpr.forEach(log => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-base-200/30 transition-colors border-b border-base-content/5";
        
        // Image display logic
        let imageHtml = `<span class="text-xs opacity-40">No Snapshot</span>`;
        if (log.images_path) {
            imageHtml = `
                <div class="avatar">
                    <div class="mask mask-squircle w-12 h-12 hover:scale-250 hover:z-50 hover:relative transition-all duration-300 cursor-zoom-in">
                        <img src="${log.images_path}" alt="License Plate detection" onerror="this.src='/static/image/Image_not_available.png'" />
                    </div>
                </div>
            `;
        }

        tr.innerHTML = `
            <td class="py-4 pl-4 font-black text-primary text-md">
                <span class="px-3 py-1.5 rounded-box border border-primary/20 bg-primary/5 font-mono">${log.plate_num || "-"}</span>
            </td>
            <td class="py-4 text-xs font-semibold opacity-80">${log.camera_name}</td>
            <td class="py-4 font-mono text-xs opacity-70">${log.date_time}</td>
            <td class="py-4 pr-4">${imageHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

// SSE live updates connection
unity.initSse(async (e) => {
    const func = e.func;
    const params = e.params;
    unity.logger.debug("SSE Message received in dashboard summary:", e);
    
    if (func === "lpr_event" || func === "lpr_message") {
        fetchSummaryData();
    }
});

// Initial load on page load
document.addEventListener("DOMContentLoaded", () => {
    fetchSummaryData();
    unity.initI18n();
});
