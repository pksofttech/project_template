import * as unity from "./unity.js";

async function init_access_device() {
    const response = await unity.fetchApi("/api/access_control/device?id=all", "get", null, "json");
    if (response.success) {
        unity.logger.debug(response);
        if (response.success) {
            const box_of_access_devices = document.getElementById("box_of_access_devices");
            box_of_access_devices.innerHTML = "";
            const template = document.getElementById("template_content_access_device_item");

            response.data.forEach((d) => {
                const _access_device = d.Access_Devices;
                const _access_zone = d.Access_Zones;
                unity.logger.debug(_access_device);
                const clone = template.content.cloneNode(true);

                clone.querySelector('[name="id"]').textContent = _access_device.id;
                clone.querySelector('[name="device_name"]').textContent = _access_device.name;
                clone.querySelector('[name="device_type"]').textContent = _access_device.device_type;
                clone.querySelector('[name="status"]').textContent = _access_device.status;

                clone.querySelector('[name="zone_name"]').textContent = _access_zone.name;
                clone.querySelector('[name="access_mode"]').textContent = _access_device.access_mode;
                clone.querySelector('[name="ip_address"]').textContent = _access_device.ip_address;
                clone.querySelector('[name="model"]').textContent = _access_device.model;

                // clone.querySelector('[name="is_active"]').checked = _access_device.is_active;
                // clone.querySelector('[name="device_id"]').textContent = _access_device.id;

                clone
                    .querySelector('[name="access_device_edit"]')
                    .setAttribute("onclick", `manage_access_device(${_access_device.id})`);

                // clone
                //     .querySelector('[name="lpr_camera_edit"]')
                //     .setAttribute("onclick", `showLprCameraEditDialog(${camera.id})`);
                // clone
                //     .querySelector('[name="lpr_display_edit"]')
                //     .setAttribute("onclick", `showDisplayContentEditDialog(${camera.id})`);
                // clone.querySelector('[name="ping_device_btn"]').setAttribute("href", `http://${camera.device_ip}`);

                box_of_access_devices.appendChild(clone);
            });
        } else {
            unity.showToastNotification({ icon: "warning", msg: response.msg });
        }
    }
}

async function Init() {
    unity.logger.debug("🚀 Init");
    let response = await unity.fetchApi("/api/access_control/zone?id=all", "get", null, "json");
    if (response.success) {
        const zone = Modal_Access_Device.querySelector('[data-field="zone_id"]');
        zone.innerHTML = "";
        response.data.forEach((d) => {
            const opt = document.createElement("option");
            const Access_Zones = d.Access_Zones;
            opt.value = Access_Zones.id;
            opt.innerHTML = Access_Zones.name;
            zone.appendChild(opt);
        });
    }
    await init_access_device();
    unity.logger.debug("🚀 Init done");
}

let current_access_device_id = 0;
window.manage_access_device = manage_access_device;
async function manage_access_device(id = 0) {
    current_access_device_id = id;
    if (id) {
        const _reply = await unity.fetchApi("/api/access_control/device?id=" + id, "get", null, "json");
        if (_reply.success) {
            const Access_Devices = _reply.data;
            unity.logger.debug(Access_Devices);

            Modal_Access_Device.querySelector('[data-field="name"]').value = Access_Devices.name;
            Modal_Access_Device.querySelector('[data-field="device_type"]').value = Access_Devices.device_type;
            Modal_Access_Device.querySelector('[data-field="zone_id"]').value = Access_Devices.zone_id;
            Modal_Access_Device.querySelector('[data-field="ip_address"]').value = Access_Devices.ip_address;
            Modal_Access_Device.querySelector('[data-field="mac_address"]').value = Access_Devices.mac_address;
            Modal_Access_Device.querySelector('[data-field="model"]').value = Access_Devices.model;
            Modal_Access_Device.querySelector('[data-field="is_active"]').checked = Access_Devices.is_active;
            Modal_Access_Device.querySelector('[data-field="remark"]').value = Access_Devices.remark;

            Modal_Access_Device.querySelector('[data-field="btn_remove_item"]').classList.remove("hidden");
        }
    } else {
        Modal_Access_Device.querySelector('[data-field="name"]').value = "";
        Modal_Access_Device.querySelector('[data-field="device_type"]').value = "";
        Modal_Access_Device.querySelector('[data-field="zone_id"]').value = "";
        Modal_Access_Device.querySelector('[data-field="ip_address"]').value = "";
        Modal_Access_Device.querySelector('[data-field="mac_address"]').value = "";
        Modal_Access_Device.querySelector('[data-field="model"]').value = "";
        Modal_Access_Device.querySelector('[data-field="is_active"]').checked = false;
        Modal_Access_Device.querySelector('[data-field="remark"]').value = "";
        Modal_Access_Device.querySelector('[data-field="btn_remove_item"]').classList.add("hidden");
    }
    Modal_Access_Device.showModal();
}

window.submit_apply_access_device = submit_apply_access_device;
async function submit_apply_access_device() {
    const name = Modal_Access_Device.querySelector('[data-field="name"]').value;
    const device_type = Modal_Access_Device.querySelector('[data-field="device_type"]').value;
    const zone_id = Modal_Access_Device.querySelector('[data-field="zone_id"]').value;
    const access_mode = Modal_Access_Device.querySelector('[data-field="access_mode"]').value;
    const ip_address = Modal_Access_Device.querySelector('[data-field="ip_address"]').value;
    const mac_address = Modal_Access_Device.querySelector('[data-field="mac_address"]').value;
    const model = Modal_Access_Device.querySelector('[data-field="model"]').value;
    const is_active = Modal_Access_Device.querySelector('[data-field="is_active"]').checked;
    const remark = Modal_Access_Device.querySelector('[data-field="remark"]').value;

    if (name == "" || device_type == "" || zone_id == "" || access_mode == "") {
        unity.showDialogWarning({ msg: "Incorrect information" });
        return;
    }
    if (ip_address) {
        if (!unity.checkIpAddress(ip_address)) {
            unity.showDialogWarning({ title: "ip address is not valid", msg: `${ip_address} is format error` });
            return;
        }
    }
    const formData = new FormData();
    formData.append("id", current_access_device_id);
    formData.append("name", name);
    formData.append("device_type", device_type);
    formData.append("zone_id", zone_id);
    formData.append("access_mode", access_mode);
    formData.append("ip_address", ip_address);
    formData.append("mac_address", mac_address);
    formData.append("model", model);
    formData.append("is_active", is_active);
    formData.append("remark", remark);

    let _reply = await unity.fetchApi("/api/access_control/device", "post", formData, "json");
    unity.logger.debug(_reply);
    if (_reply.success == true) {
        unity.showDialogSuccess({ msg: "Successful" });
        await init_access_device();
        Modal_Access_Device.close();
    } else {
        unity.logger.debug(_reply);
        unity.showDialogError({ msg: JSON.stringify(_reply) });
    }
}

window.remove_access_device = remove_access_device;
async function remove_access_device() {
    const result = await unity.dialogConfirm();
    if (!result) return;
    const respond = await unity.fetchApi(
        `/api/access_control/device?id=${current_access_device_id}`,
        "delete",
        null,
        "json",
    );
    unity.logger.debug(respond);
    if (respond.success) {
        unity.showDialogSuccess({ msg: respond.msg });
        await init_access_device();
        Modal_Access_Device.close();
    } else {
        unity.showDialogWarning({ msg: respond.msg });
    }
}

// Access Device * Dahua
window.manage_dahua_control_device = manage_dahua_control_device;
async function manage_dahua_control_device() {
    unity.showDialogInfo({ title: "Not Use in App", msg: "Module Not Install In App" });
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
