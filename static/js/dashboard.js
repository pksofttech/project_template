import * as unity from "./unity.js";

async function gateway_car_count() {
    const respond = await unity.fetchApi("/api/gateway_car_count", "get", null, "json");
    console.log(respond);
    if (respond.success) {
        const parked = respond.parked;
        document.getElementById(`total_parking_parked`).textContent = parked.total;
        document.getElementById(`day_parking_parked`).textContent = parked.today;

        const total_data_in = respond.total_data_in;
        for (const d of total_data_in) {
            //unity.logger.debug(d)
            const element_d = document.getElementById(`total_gateway_id${d.gateway_id}`);
            if (element_d) {
                element_d.textContent = unity.toNumber(d.count, true);
            }
        }

        const total_data_out = respond.total_data_out;
        for (const d of total_data_out) {
            //unity.logger.debug(d)
            const element_d = document.getElementById(`total_gateway_id${d.gateway_id}`);
            if (element_d) {
                element_d.textContent = unity.toNumber(d.count, true);
            }
        }

        const day_data = respond.day_data;
        for (const d of day_data) {
            //unity.logger.debug(d)
            const element_d = document.getElementById(`day_gateway_id${d.gateway_id}`);
            // unity.logger.debug(element_d)
            if (element_d) {
                element_d.textContent = unity.toNumber(d.count, true);
            }
        }

        // ? Parking In & Out
        const total_by_parking = respond.parked.total_by_parking;
        for (const d of total_by_parking) {
            const element_d = document.getElementById(`total_parking_available_id${d.parking_id}`);
            if (element_d) {
                element_d.textContent = unity.toNumber(d.count, true);
            }
        }

        const total_parking_in = respond.total_parking_in;
        for (const d of total_parking_in) {
            //unity.logger.debug(d)
            const element_d = document.getElementById(`total_parking_in_id${d.parking_id}`);
            if (element_d) {
                element_d.textContent = unity.toNumber(d.count, true);
            }
        }

        const day_parking_in = respond.day_parking_in;
        for (const d of day_parking_in) {
            const element_d = document.getElementById(`day_parking_in_id${d.parking_id}`);
            //unity.logger.debug(element_d)
            if (element_d) {
                element_d.textContent = unity.toNumber(d.count, true);
            }
        }

        const total_parking_out = respond.total_parking_out;
        for (const d of total_parking_out) {
            //unity.logger.debug(d)
            const element_d = document.getElementById(`total_parking_out_id${d.parking_id}`);
            if (element_d) {
                element_d.textContent = unity.toNumber(d.count, true);
            }
        }
        const day_parking_out = respond.day_parking_out;
        for (const d of day_parking_out) {
            //unity.logger.debug(d)
            const element_d = document.getElementById(`day_parking_out_id${d.parking_id}`);
            //unity.logger.debug(element_d)
            if (element_d) {
                element_d.textContent = unity.toNumber(d.count, true);
            }
        }
    }
}

unity.initSse(async (e) => {
    const func = e.func;
    const params = e.params;
    unity.logger.debug(e);
    if (func == "lpr_message") {
        unity.logger.debug(params);
        unity.showToastNotification({ type: params.type, msg: params.msg });
    }

    if (func == "lpr_event") {
        unity.logger.debug(params);
        unity.showToastNotification({ type: params.toastr, msg: params.info });
        gateway_car_count();
    }
    if (func == "lpr_heartbeat") {
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    gateway_car_count();
    unity.initI18n();
});
