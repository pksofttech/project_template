import * as unity from "./unity.js";

let chart = null;
async function updateData() {
    const foreColor = "#888888";
    const _reply = await unity.fetchApi(
        `/api/charts?date_range=2024/04/24%2000:00%20-%202024/04/24%2023:59&type=none`,
        "get",
        null,
        "json",
    );
    if (_reply.success) {
        const datas = _reply.datas;
        const options_chart01 = {
            series: datas.series,
            chart: {
                type: "bar",
                height: 350,
                foreColor: foreColor,
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: "55%",
                    endingShape: "rounded",
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
                        return val + " vehicles";
                    },
                },
            },
        };
        const chart_div = document.getElementById("chart_div");
        if (chart) {
            chart.destroy();
        }
        chart = new ApexCharts(chart_div, options_chart01);
        chart.render();
    }
}

function showTimeMonitor() {
    const date = new Date();
    let h = date.getHours(); // 0 - 23
    let m = date.getMinutes(); // 0 - 59
    let s = date.getSeconds(); // 0 - 59

    h = h < 10 ? "0" + h : h;
    m = m < 10 ? "0" + m : m;
    s = s < 10 ? "0" + s : s;

    const time = h + ":" + m + ":" + s;
    const _clock = document.getElementById("AppClockDisplayMonitor");
    //unity.logger.debug(_clock);
    if (_clock) {
        {
            _clock.innerText = time;
            _clock.textContent = time;
            setTimeout(showTimeMonitor, 1000);
        }
    }
}
showTimeMonitor();

async function stat_data() {
    const _result = await unity.fetchApi("/api/transaction_record/stat", "get", null, "json");
    //unity.logger.debug(_result);
    if (_result.success) {
        const parked_total = _result.parked_total;
        const in_total = _result.in_total;
        const out_total = _result.out_total;
        document.getElementById("parked_total_all").innerHTML = parked_total.MEMBER + parked_total.VISITOR;
        document.getElementById("parked_total_member").innerHTML = parked_total.MEMBER;
        document.getElementById("parked_total_visitor").innerHTML = parked_total.VISITOR;
        document.getElementById("in_total_all").innerHTML = in_total.MEMBER + in_total.VISITOR;
        document.getElementById("in_total_member").innerHTML = in_total.MEMBER;
        document.getElementById("in_total_visitor").innerHTML = in_total.VISITOR;
        document.getElementById("out_total_all").innerHTML = out_total.MEMBER + out_total.VISITOR;
        document.getElementById("out_total_member").innerHTML = out_total.MEMBER;
        document.getElementById("out_total_visitor").innerHTML = out_total.VISITOR;
        updateData();
        setTimeout(() => {
            stat_data();
        }, 60000);
    }
}

stat_data();

const GATEWAYS = [];
async function Init() {
    try {
        unity.logger.info("---------------------------- Setting ----------------------------)");
        const respond = await unity.fetchApi("/api/gateway", "get", null, "json");
        unity.logger.debug(respond);
        if (respond.success) {
            const gateways = respond.data;
            const box_of_gateways = document.getElementById("box_of_gateways");
            const temp = document.getElementById("template_content_gateway_info");
            for (const gateway of gateways) {
                const _c = temp.content.cloneNode(true);
                GATEWAYS.push(gateway.name);
                _c.querySelector('[name="gateway_id"]').id = gateway.name;
                _c.querySelector('[name="gateway_name"]').innerText = gateway.name;
                const _r = await unity.fetchApi(
                    "/api/devices/lpr_camera/log_lpr?gateway_id=" + gateway.id,
                    "get",
                    null,
                    "json",
                );
                if (_r.success) {
                    const _d = _r.data;
                    unity.logger.debug(_r);
                    if (_d) {
                        _c.querySelector('[name="plate_num"]').innerText = _d.plate_num;
                        _c.querySelector('[name="date_time"]').innerText = _d.date_time;
                        _c.querySelector('[name="tag"]').innerText = _d.tag;
                        _c.querySelector('[name="status"]').innerText = _d.status;
                        const images_paths = _d.images_path.split(",");
                        _c.querySelector('[name="image_01"]').src = images_paths[0];
                        _c.querySelector('[name="image_02"]').src = images_paths[1];
                    }
                }
                box_of_gateways.appendChild(_c);
            }
        } else {
            unity.showDialogError({ title: "Invalid GATE_IN_ID", msg: respond.msg });
        }
    } catch (error) {
        unity.showDialogError({ title: "System Configuration Error", msg: error.message });
    }
}

const GATE_IDS = {};

unity.initSse(async (e) => {
    const func = e.func;
    const params = e.params;
    if (func == "lpr_event") {
        unity.showToastNotification({ type: params.toastr, msg: params.info });
        if (GATEWAYS.includes(params.gate_name)) {
            unity.logger.debug(params);
            const _c = document.getElementById(params.gate_name);
            if (_c) {
                _c.querySelectorAll('[name="plate_num"]')[0].innerText = params.plate_num;
                _c.querySelectorAll('[name="date_time"]')[0].innerText = params.date_time;
                _c.querySelectorAll('[name="tag"]')[0].innerText = params.card_type;
                _c.querySelectorAll('[name="status"]')[0].innerText = params.status;
                _c.querySelectorAll('[name="image_01"]')[0].src = params.images_path_01;
                _c.querySelectorAll('[name="image_02"]')[0].src = params.images_path_02;
            }
        }
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
