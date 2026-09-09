import * as unity from "./unity.js";

let plate_num_test = "M-1234";
window.test_lpr = test_lpr;
async function test_lpr(id) {
    unity.logger.debug("test_lpr");
    const input_plate_num_html = `<label class="input input-bordered flex items-center gap-2">
                                <i class="fa-solid fa-car"></i>
                                <input type="text" class="grow" placeholder="plate_num" value='${plate_num_test}' data-field="returnValue" />
                                </label>`;
    const result = await unity.showDialogConfirm({
        title: "Enter License Plate for Camera Test",
        content: input_plate_num_html,
    });

    if (result.confirm) {
        document.querySelector('[data-field="test_result"]').value = "Processing...";
        plate_num_test = result.value;
        const formData = new FormData();
        formData.append("cam_id", id);
        if (result.value != "") {
            formData.append("plate_num", plate_num_test);
            formData.append("type", "online");
        } else {
            formData.append("type", "heartbeat");
            unity.showToastNotification({ type: "info", msg: "heartbeat test" });
        }
        const lpr_time_out_disconnect = document.getElementById("lpr_time_out_disconnect")
            ? document.getElementById("lpr_time_out_disconnect").value
            : 3000;
        if (lpr_time_out_disconnect != "") {
            formData.append("lpr_time_out_disconnect", lpr_time_out_disconnect);
        }
        const start = performance.now();
        const _result = await unity.fetchApi(
            "/lpr?test_mode=true",
            "post",
            formData,
            "json",
            true,
            lpr_time_out_disconnect,
        );
        const end = performance.now();
        const req_time = `⏱️ Response Duration: ${(end - start).toFixed(2)} ms`;
        const jstr = JSON.stringify(_result, null, 2) + `\n${req_time}`;
        unity.showToastNotification({ icon: "info", msg: req_time });
        document.querySelector('[data-field="test_result"]').value = jstr;
    }
}
async function gen_test() {
    const test_lpr_system_test_debug = document.getElementById("test_lpr_system_test_debug");
    if (test_lpr_system_test_debug) {
        const _reply = await unity.fetchApi("/api/devices/lpr_camera/lpr_list", "get", null, "json");

        let script_for_test = "";
        if (_reply && _reply.success && _reply.data && _reply.data.length > 0) {
            const datas = _reply.data;
            for (const l of datas) {
                unity.logger.debug(l);
                const lpr_cam = l.Lpr_Camera;
                const gate_way = l.GateWay;

                let badgeClass = "badge-info";
                let iconClass = "fa-right-to-bracket text-info";
                let borderHover = "hover:border-info/40 hover:shadow-info/10";

                if (gate_way.type === "IN") {
                    badgeClass = "badge-info";
                    iconClass = "fa-right-to-bracket text-info";
                    borderHover = "hover:border-info/40 hover:shadow-info/10";
                } else if (gate_way.type === "OUT") {
                    badgeClass = "badge-success";
                    iconClass = "fa-right-from-bracket text-success";
                    borderHover = "hover:border-success/40 hover:shadow-success/10";
                } else {
                    badgeClass = "badge-secondary";
                    iconClass = "fa-shield text-secondary";
                    borderHover = "hover:border-secondary/40 hover:shadow-secondary/10";
                }

                script_for_test += `
                <button type="button" 
                        onclick="test_lpr('${lpr_cam.device_id}');" 
                        title="${lpr_cam.device_name} - ${gate_way.name} (ID: ${lpr_cam.device_id})"
                        class="group relative flex flex-col justify-between p-2.5 rounded-box bg-base-100/90 backdrop-blur-md border border-base-content/10 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left w-full cursor-pointer ${borderHover}">
                    <div class="flex items-center justify-between gap-1 mb-1">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <i class="fa-solid ${iconClass} text-xs shrink-0"></i>
                            <span class="font-bold text-xs text-base-content group-hover:text-primary transition-colors truncate">${lpr_cam.device_name}</span>
                        </div>
                        <span class="badge ${badgeClass} badge-sm badge-soft font-extrabold uppercase shrink-0 text-[9px] px-1">${gate_way.type || "GATE"} ${lpr_cam.mode}</span>
                    </div>
                    
                    <div class="flex items-center justify-between text-[10px] text-base-content/60 gap-1 pt-1 border-t border-base-content/5">
                        <span class="truncate font-medium">${gate_way.name}</span>
                        <span class="font-mono bg-base-200/90 px-1 py-0.2 rounded-box text-[9px] font-semibold shrink-0">#${lpr_cam.device_id}</span>
                    </div>
                </button>`;
            }
        } else {
            script_for_test = `
            <div class="col-span-full p-8 rounded-box bg-base-100/50 backdrop-blur-md border border-base-content/10 text-center flex flex-col items-center justify-center gap-2 text-base-content/50">
                <i class="fa-solid fa-video-slash text-3xl opacity-40 mb-1"></i>
                <p class="text-sm font-bold">No LPR Camera configured in system</p>
                <p class="text-xs text-base-content/40">Please review camera device configurations</p>
            </div>`;
        }
        test_lpr_system_test_debug.innerHTML = script_for_test;
    }
}
gen_test();
