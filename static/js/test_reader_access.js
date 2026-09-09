import * as unity from "./unity.js";

let card_no = "M-1234";
window.test_reader_access = test_reader_access;
async function test_reader_access(device_name) {
    unity.logger.debug("test_reader");
    const input_card_no_html = `<label class="input input-bordered flex items-center gap-2 w-full">
                                <i class="fa-solid fa-card"></i>
                                <input type="text" class="grow text-xl" placeholder="card id" value='${card_no}' data-field="returnValue" />
                                </label>`;
    const result = await unity.showDialogConfirm({
        title: "Enter Card ID for Access Reader Test",
        content: input_card_no_html,
    });

    if (result.confirm) {
        if (result.value != "") {
            document.querySelector('[data-field="test_result"]').value = "Processing...";
            card_no = result.value;
            const start = performance.now();
            const _result = await unity.fetchApi(
                `/api/access_control/reader_event?reader_access_name=${device_name}&card_id=${card_no}&card_type=VISITOR&test_mode=true`,
                "post",
                null,
                "json",
            );
            const end = performance.now();
            const req_time = `⏱️ Response Duration: ${(end - start).toFixed(2)} ms`;
            const jstr = JSON.stringify(_result, null, 2) + `\n${req_time}`;
            unity.showToastNotification({ icon: "info", msg: req_time });
            document.querySelector('[data-field="test_result"]').value = jstr;
        }
    }
}
async function Init() {
    const test_reader_access_content = document.getElementById("test_reader_access_content");
    if (test_reader_access_content) {
        const _reply = await unity.fetchApi("/api/access_control/device", "get", null, "json");

        let script_for_test = "";
        if (_reply && _reply.success && _reply.data && _reply.data.length > 0) {
            const datas = _reply.data;
            for (const access_device of datas) {
                console.log(access_device);

                let badgeClass = "badge-info";
                let iconClass = "fa-right-to-bracket text-info";
                let borderHover = "hover:border-info/40 hover:shadow-info/10";

                if (access_device.access_mode === "entry") {
                    badgeClass = "badge-info";
                    iconClass = "fa-right-to-bracket text-info";
                    borderHover = "hover:border-info/40 hover:shadow-info/10";
                } else if (access_device.access_mode === "exit") {
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
                        onclick="test_reader_access('${access_device.name}');" 
                        title="${access_device.name} - ${access_device.zone_name || ''} (ID: ${access_device.id})"
                        class="group relative flex flex-col justify-between p-2.5 rounded-box bg-base-100/90 backdrop-blur-md border border-base-content/10 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left w-full cursor-pointer ${borderHover}">
                    <div class="flex items-center justify-between gap-1 mb-1">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <i class="fa-solid ${iconClass} text-xs shrink-0"></i>
                            <span class="font-bold text-xs text-base-content group-hover:text-primary transition-colors truncate">${access_device.name}</span>
                        </div>
                        <span class="badge ${badgeClass} badge-xs font-extrabold uppercase shrink-0 text-[9px] px-1">${access_device.access_mode || 'READER'}</span>
                    </div>
                    
                    <div class="flex items-center justify-between text-[10px] text-base-content/60 gap-1 pt-1 border-t border-base-content/5">
                        <span class="truncate font-medium">${access_device.zone_name || ''}</span>
                        <span class="font-mono bg-base-200/90 px-1 py-0.2 rounded-box text-[9px] font-semibold shrink-0">#${access_device.id}</span>
                    </div>
                </button>`;
            }
        } else {
            script_for_test = `
            <div class="col-span-full p-4 rounded-box bg-base-100/50 border border-base-content/10 text-center flex flex-col items-center justify-center gap-1 text-base-content/50 text-xs">
                <i class="fa-solid fa-id-card-clip text-2xl opacity-40 mb-0.5"></i>
                <p class="font-bold">No Access Reader configured in system</p>
            </div>`;
        }
        test_reader_access_content.innerHTML = script_for_test;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
