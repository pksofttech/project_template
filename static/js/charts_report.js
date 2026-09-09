import * as unity from "./unity.js";

window.on_chang_datetime_chart = on_chang_datetime_chart;
window.setQuickDateRange = setQuickDateRange;
window.refreshCurrentChart = refreshCurrentChart;
window.toggleAutoRefresh = toggleAutoRefresh;
window.exportChartDataToCSV = exportChartDataToCSV;
window.build_transaction_chart = build_transaction_chart;

let chart = null;
let chart2 = null;
let chart3 = null;
let chart4 = null;
let autoRefreshTimer = null;
let currentChartData = null;
const foreColor = "#888888";

async function on_chang_datetime_chart(date_range) {
    unity.showToastNotification({ type: "success", msg: date_range });
    build_transaction_chart(date_range);
}

function refreshCurrentChart() {
    const input = document.getElementById("select_date_time_range_of_build_transaction_chart");
    const date_range = input ? input.value : null;
    unity.showToastNotification({ type: "info", msg: "กำลังอัปเดตข้อมูลกราฟ..." });
    build_transaction_chart(date_range);
}

function setQuickDateRange(rangeKey) {
    if (typeof dayjs === "undefined") return;
    const now = dayjs();
    let start, end;

    if (rangeKey === "today") {
        start = now.startOf("day");
        end = now.endOf("day");
    } else if (rangeKey === "yesterday") {
        start = now.subtract(1, "day").startOf("day");
        end = now.subtract(1, "day").endOf("day");
    } else if (rangeKey === "last7days") {
        start = now.subtract(6, "day").startOf("day");
        end = now.endOf("day");
    } else if (rangeKey === "last30days") {
        start = now.subtract(29, "day").startOf("day");
        end = now.endOf("day");
    } else if (rangeKey === "thisMonth") {
        start = now.startOf("month");
        end = now.endOf("month");
    } else {
        return;
    }

    const fmt = "YYYY/MM/DD HH:mm";
    const dateRangeStr = `${start.format(fmt)} - ${end.format(fmt)}`;
    const input = document.getElementById("select_date_time_range_of_build_transaction_chart");
    if (input) {
        input.value = dateRangeStr;
        if (input._flatpickr) {
            input._flatpickr.setDate([start.toDate(), end.toDate()]);
        }
    }
    build_transaction_chart(dateRangeStr);
}

function toggleAutoRefresh(enable) {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
    }
    if (enable) {
        unity.showToastNotification({ type: "info", msg: "เปิด Auto-Refresh ทุก 60 วินาที" });
        autoRefreshTimer = setInterval(() => {
            refreshCurrentChart();
        }, 60000);
    } else {
        unity.showToastNotification({ type: "info", msg: "ปิด Auto-Refresh เรียบร้อย" });
    }
}

async function build_transaction_chart(date_range = null) {
    if (typeof build_transaction_chart.date_range == "undefined") {
        build_transaction_chart.date_range = date_range;
        unity.logger.debug("init build_transaction_record_report");
    }
    if (date_range) {
        build_transaction_chart.date_range = date_range;
    }
    const chartTypeEl = document.getElementById("chart_type_select");
    const chart_type_select = chartTypeEl ? chartTypeEl.value : "";

    const queryUrl = `/api/transaction_record/charts?date_range=${encodeURIComponent(build_transaction_chart.date_range || "")}&type=${encodeURIComponent(chart_type_select)}`;
    const _reply = await unity.fetchApi(queryUrl, "get", null, "json");

    if (_reply.success) {
        const datas = _reply.datas;
        currentChartData = datas;

        // 1. Update KPI Overview Cards
        updateKPICards(datas);

        // 2. Update Gate Breakdown Table
        updateGateBreakdownTable(datas);

        // 3. Render ApexCharts
        renderApexCharts(datas);
    } else {
        unity.showToastNotification({ icon: "error", msg: _reply.msg });
        return;
    }
}

function updateKPICards(datas) {
    const totalIn = (datas.datas_in || []).reduce((a, b) => a + b, 0);
    const totalOut = (datas.datas_out || []).reduce((a, b) => a + b, 0);
    const totalTraffic = totalIn + totalOut;

    const inPercent = totalTraffic > 0 ? ((totalIn / totalTraffic) * 100).toFixed(1) : 0;
    const outPercent = totalTraffic > 0 ? ((totalOut / totalTraffic) * 100).toFixed(1) : 0;

    const elTotalTraffic = document.getElementById("val_total_traffic");
    const elTotalIn = document.getElementById("val_total_in");
    const elTotalOut = document.getElementById("val_total_out");
    const elInPercent = document.getElementById("val_in_percentage");
    const elOutPercent = document.getElementById("val_out_percentage");
    const elPeakHour = document.getElementById("val_peak_hour");
    const elPeakCount = document.getElementById("val_peak_count");

    if (elTotalTraffic) elTotalTraffic.textContent = totalTraffic.toLocaleString();
    if (elTotalIn) elTotalIn.textContent = totalIn.toLocaleString();
    if (elTotalOut) elTotalOut.textContent = totalOut.toLocaleString();
    if (elInPercent) elInPercent.textContent = `${inPercent}% ของการจราจรทั้งหมด`;
    if (elOutPercent) elOutPercent.textContent = `${outPercent}% ของการจราจรทั้งหมด`;

    // Compute Peak Traffic Period
    if (datas.categories && datas.categories.length > 0 && datas.series) {
        let maxCount = 0;
        let maxCategory = "-";
        for (let i = 0; i < datas.categories.length; i++) {
            let catSum = 0;
            for (let s = 0; s < datas.series.length; s++) {
                catSum += datas.series[s].data[i] || 0;
            }
            if (catSum > maxCount) {
                maxCount = catSum;
                maxCategory = datas.categories[i];
            }
        }
        if (elPeakHour) elPeakHour.textContent = maxCategory !== "-" ? maxCategory : "--:--";
        if (elPeakCount) elPeakCount.textContent = `ปริมาณสูงสุด: ${maxCount.toLocaleString()} คัน`;
    }
}

function updateGateBreakdownTable(datas) {
    const tbody = document.getElementById("gate_breakdown_tbody");
    if (!tbody) return;

    if (!datas.series || datas.series.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-base-content/40">ไม่พบข้อมูลการจราจรในช่วงเวลานี้</td></tr>`;
        return;
    }

    const totalIn = (datas.datas_in || []).reduce((a, b) => a + b, 0);
    const totalOut = (datas.datas_out || []).reduce((a, b) => a + b, 0);
    const totalTraffic = totalIn + totalOut;

    const gateRows = datas.series.map((s) => {
        const isIn = (datas.labels_in || []).includes(s.name);
        const sum = (s.data || []).reduce((a, b) => a + b, 0);
        const share = totalTraffic > 0 ? ((sum / totalTraffic) * 100).toFixed(1) : 0;
        return {
            name: s.name,
            isIn,
            sum,
            share: parseFloat(share),
        };
    });

    // Sort by volume descending
    gateRows.sort((a, b) => b.sum - a.sum);

    let html = "";
    gateRows.forEach((g, idx) => {
        const badgeClass = g.isIn ? "badge-success text-white" : "badge-info text-white";
        const progressClass = g.isIn ? "progress-success" : "progress-info";
        const typeLabel = g.isIn ? "IN (เข้า)" : "OUT (ออก)";

        html += `
            <tr class="hover:bg-base-200/40 transition-colors">
                <td class="text-center font-bold text-base-content/50">${idx + 1}</td>
                <td class="font-bold text-base-content">${g.name}</td>
                <td class="text-center">
                    <span class="badge badge-xs font-bold ${badgeClass}">${typeLabel}</span>
                </td>
                <td class="text-right font-mono font-bold text-base-content">${g.sum.toLocaleString()}</td>
                <td>
                    <div class="flex items-center gap-2">
                        <progress class="progress ${progressClass} w-24 sm:w-36" value="${g.share}" max="100"></progress>
                        <span class="font-mono text-xs font-bold text-base-content/70">${g.share}%</span>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function renderApexCharts(datas) {
    // 1. Bar Chart
    const options = {
        series: datas.series,
        chart: {
            type: "bar",
            height: 350,
            foreColor: foreColor,
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true,
                },
            },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "55%",
                borderRadius: 4,
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            show: true,
            width: 2,
            colors: ["transparent"],
        },
        xaxis: {
            categories: datas.categories,
            labels: {
                rotate: -45,
                rotateAlways: datas.categories && datas.categories.length > 15,
            },
        },
        yaxis: {
            title: {
                text: "Count (Vehicles)",
            },
        },
        fill: {
            opacity: 1,
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val.toLocaleString() + " Vehicles";
                },
            },
        },
    };

    const chart_div = document.getElementById("chart_div");
    if (chart) {
        chart.destroy();
    }
    if (chart_div) {
        chart = new ApexCharts(chart_div, options);
        chart.render();
    }

    // 2. Line Chart
    const options2 = {
        series: datas.series,
        chart: {
            type: "line",
            height: 350,
            foreColor: foreColor,
            toolbar: {
                show: true,
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            curve: "smooth",
            show: true,
            width: 3,
        },
        xaxis: {
            categories: datas.categories,
            labels: {
                rotate: -45,
                rotateAlways: datas.categories && datas.categories.length > 15,
            },
        },
        yaxis: {
            title: {
                text: "Count (Vehicles)",
            },
        },
        fill: {
            opacity: 1,
        },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val.toLocaleString() + " Vehicles";
                },
            },
        },
    };

    const chart2_div = document.getElementById("chart2_div");
    if (chart2) {
        chart2.destroy();
    }
    if (chart2_div) {
        chart2 = new ApexCharts(chart2_div, options2);
        chart2.render();
    }

    // 3. Donut IN
    const options3 = {
        series: datas.datas_in || [],
        chart: {
            width: 380,
            type: "donut",
            foreColor: foreColor,
        },
        labels: datas.labels_in || [],
        plotOptions: {
            pie: {
                donut: {
                    labels: {
                        show: true,
                        total: { show: true, label: "IN TOTAL" },
                    },
                },
            },
        },
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: {
                        width: 280,
                    },
                    legend: {
                        position: "bottom",
                    },
                },
            },
        ],
    };
    if (chart3) {
        chart3.destroy();
    }
    const chart3_div = document.getElementById("chart3_div");
    if (chart3_div) {
        chart3 = new ApexCharts(chart3_div, options3);
        chart3.render();
    }

    // 4. Donut OUT
    const options4 = {
        series: datas.datas_out || [],
        chart: {
            width: 380,
            type: "donut",
            foreColor: foreColor,
        },
        labels: datas.labels_out || [],
        plotOptions: {
            pie: {
                donut: {
                    labels: {
                        show: true,
                        total: { show: true, label: "OUT TOTAL" },
                    },
                },
            },
        },
        responsive: [
            {
                breakpoint: 480,
                options: {
                    chart: {
                        width: 280,
                    },
                    legend: {
                        position: "bottom",
                    },
                },
            },
        ],
    };
    if (chart4) {
        chart4.destroy();
    }
    const chart4_div = document.getElementById("chart4_div");
    if (chart4_div) {
        chart4 = new ApexCharts(chart4_div, options4);
        chart4.render();
    }
}

function exportChartDataToCSV() {
    if (!currentChartData || !currentChartData.series || currentChartData.series.length === 0) {
        unity.showToastNotification({ type: "warning", msg: "ไม่พบข้อมูลสำหรับ Export" });
        return;
    }

    const categories = currentChartData.categories || [];
    const series = currentChartData.series || [];

    const headers = ["Timeline / Period", ...series.map((s) => `"${s.name.replace(/"/g, '""')}"`), "Total"];
    const rows = [];

    categories.forEach((cat, idx) => {
        let catTotal = 0;
        const row = [cat];
        series.forEach((s) => {
            const val = s.data[idx] || 0;
            catTotal += val;
            row.push(val);
        });
        row.push(catTotal);
        rows.push(row.join(","));
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = typeof dayjs !== "undefined" ? dayjs().format("YYYYMMDD_HHmmss") : Date.now();
    link.setAttribute("href", url);
    link.setAttribute("download", `traffic_analytics_report_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    unity.showToastNotification({ type: "success", msg: "Export CSV เรียบร้อยแล้ว" });
}

document.addEventListener("DOMContentLoaded", () => {
    flatpickr("#select_date_time_range_of_build_transaction_chart", unity.getFlatpickrConfigWithEmbeddedRanges());
    unity.initI18n();
    const input = document.getElementById("select_date_time_range_of_build_transaction_chart");
    if (input && input.value) {
        build_transaction_chart(input.value);
    } else {
        setQuickDateRange("today");
    }
});
