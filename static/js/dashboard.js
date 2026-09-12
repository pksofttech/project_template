/**
 * dashboard.js - Access Control Dashboard & Real-Time Traffic Analytics
 */

let trafficChart = null;

        $(document).ready(function () {
            loadSummaryStats();
            loadHourlyChart();
            loadRecentSwipes();

            // Connect to SSE for auto-refreshing stats on new swipes!
            const evtSource = new EventSource('/sse');
            evtSource.addEventListener('access_swipe', function () {
                loadSummaryStats();
                loadHourlyChart();
                loadRecentSwipes();
            });
        });

        async function loadSummaryStats() {
            try {
                const res = await fetch('/api/access/log/summary_stats');
                const d = await res.json();
                if (d.success) {
                    document.getElementById('statTodaySwipes').textContent = d.today_total;
                    document.getElementById('statTodayGranted').textContent = d.today_granted;
                    document.getElementById('statTodayDenied').textContent = d.today_denied;
                    document.getElementById('statOnlineDoors').textContent = `${d.online_doors}/${d.total_doors}`;
                    document.getElementById('statDoorsRatio').textContent = `${d.online_doors} of ${d.total_doors} Online`;
                    document.getElementById('statActiveMembers').textContent = d.active_members;
                    document.getElementById('statActiveCards').textContent = d.active_cards;

                    const rate = d.today_total > 0 ? Math.round((d.today_granted / d.today_total) * 100) : 100;
                    document.getElementById('statGrantedRate').textContent = `${rate}% Authorized`;
                }
            } catch (err) {
                console.error("Failed to load summary stats:", err);
            }
        }

        async function loadRecentSwipes() {
            try {
                const res = await fetch('/api/access/log/recent');
                const d = await res.json();
                if (d.success && d.data) {
                    const tbody = document.getElementById('recentSwipesTbody');
                    if (d.data.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-base-content/40">No swipes recorded today</td></tr>';
                        return;
                    }

                    tbody.innerHTML = d.data.map(l => {
                        const isGranted = (l.result === 'GRANTED');
                        const timeStr = l.event_time ? l.event_time.substring(11, 19) : '-';
                        return `
                            <tr class="hover:bg-base-200/50">
                                <td class="font-mono text-base-content/70">${timeStr}</td>
                                <td class="font-bold text-base-content">${l.member_name || 'Unknown'}</td>
                                <td><span class="badge badge-xs badge-neutral font-mono font-bold">${l.card_number}</span></td>
                                <td>${l.door_name}</td>
                                <td><span class="badge badge-xs ${l.direction === 'IN' ? 'badge-primary' : 'badge-neutral'} font-mono">${l.direction || 'IN'}</span></td>
                                <td>
                                    <span class="badge badge-xs ${isGranted ? 'badge-success' : 'badge-error'} font-bold">
                                        ${l.result}
                                    </span>
                                </td>
                                <td class="text-[11px] ${isGranted ? 'text-success' : 'text-error'}">${l.reason || '-'}</td>
                            </tr>
                        `;
                    }).join('');
                }
            } catch (err) {
                console.error("Failed to load recent swipes:", err);
            }
        }

        async function loadHourlyChart() {
            try {
                const res = await fetch('/api/access/log/chart_stats');
                const d = await res.json();
                if (!d.success) return;

                const ctx = document.getElementById('hourlyTrafficChart').getContext('2d');
                if (trafficChart) trafficChart.destroy();

                trafficChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: d.labels,
                        datasets: [
                            {
                                label: 'Granted (ผ่าน)',
                                data: d.granted,
                                backgroundColor: 'rgba(34, 197, 94, 0.75)',
                                borderColor: 'rgb(34, 197, 94)',
                                borderWidth: 1,
                                borderRadius: 4,
                            },
                            {
                                label: 'Denied (ปฏิเสธ)',
                                data: d.denied,
                                backgroundColor: 'rgba(239, 68, 68, 0.75)',
                                borderColor: 'rgb(239, 68, 68)',
                                borderWidth: 1,
                                borderRadius: 4,
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                grid: { display: false }
                            },
                            y: {
                                beginAtZero: true,
                                ticks: { stepSize: 1 }
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: { boxWidth: 12, font: { size: 11 } }
                            }
                        }
                    }
                });
            } catch (err) {
                console.error("Failed to load hourly chart:", err);
            }
        }

// Global Window Event Handlers
window.loadSummaryStats = loadSummaryStats;
window.loadRecentSwipes = loadRecentSwipes;
window.loadHourlyChart = loadHourlyChart;

