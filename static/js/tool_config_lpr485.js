import * as unity from "./unity.js";

async function init() {
    console.log("🛠️ tool_config_lpr485.js");
    const respond = await unity.fetchApi("/api/devices/lpr_camera/lpr_list", "get", null, "json");
    if (respond.success) {
        const lpr_wf1_select = document.getElementById("lpr_wf1_select");
        const lpr_list = respond.data;
        for (let index = 0; index < lpr_list.length; index++) {
            const element = lpr_list[index];
            const lpr_cam = element.Lpr_Camera;
            console.log(lpr_cam);
            const option = document.createElement("option");
            option.value = lpr_cam.device_id;
            option.text = `${lpr_cam.device_name} : (${lpr_cam.device_id})`;
            lpr_wf1_select.add(option);
        }
    }
}

window.lpr_wf1_config = lpr_wf1_config;
async function lpr_wf1_config() {
    const lpr_wf1_select = document.getElementById("lpr_wf1_select");
    const lpr_cam_id = lpr_wf1_select.value;
    // console.log(lpr_cam_id);
    const wf1_config_data = document.getElementById("wf1_config_data").value.trim();

    if (wf1_config_data == "") {
        unity.showDialogWarning({ msg: "Unable to load WF1 data: Config not found" });
        return;
    }
    unity.showDialogLoading("⏳ Waiting... Loading WF1 parameters...");

    const payload = { lpr_cam_id, wf1_config_data };
    const respond = await unity.fetchApi(
        "/api/devices/lpr_camera/wf1_config",
        "post",
        JSON.stringify(payload),
        "json",
        true,
        40000,
    );
    unity.closeDialogLoading();

    if (respond.success) {
        unity.showDialogSuccess({ msg: "✅ WF1 parameters loaded successfully" });
    } else {
        unity.showDialogError({ msg: respond.msg || "Failed to load WF1 parameters" });
    }
}

document.addEventListener("DOMContentLoaded", init);
