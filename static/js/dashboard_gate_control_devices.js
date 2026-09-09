import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// Lpr Display Setting
async function edit_display_content(item, api_endpoint) {
    const modal = Modal_Display_Lpr_Content;
    console.log(item);

    const display_content = item.display_content ? JSON.parse(item.display_content) : {};
    display_content["device_name"] = item.device_name;
    console.log(display_content);
    if (display_content) {
        unity.data2fields(display_content, modal);
    }
    const btn_submit = modal.querySelector('[data-field="btn_submit"]');
    const btn_remove = modal.querySelector('[data-field="btn_remove"]');
    btn_submit.onclick = async (e) => {
        const formData = new FormData();
        const heart_beat = modal.querySelector('[data-field="heart_beat"]').value;
        const allow_action = modal.querySelector('[data-field="allow_action"]').value;
        const denied_action = modal.querySelector('[data-field="denied_action"]').value;
        const display_content = { heart_beat: heart_beat, allow_action: allow_action, denied_action: denied_action };
        formData.append("id", item.id);
        formData.append("display_content", JSON.stringify(display_content));
        unity.debugForm(formData);
        const respond = await unity.fetchApi(api_endpoint, "post", formData, "json");

        if (respond.success == true) {
            unity.showDialogSuccess({ title: "Successful", msg: respond.msg });
            lpr_camera_item_model.init();
            reader_device_item_model.init();
            modal.close();
        } else {
            unity.logger.debug(respond);
            unity.showDialogError({ msg: JSON.stringify(respond) });
        }
    };
    modal.showModal();
}

async function edit_lpr_led_content(item) {
    const modal = Modal_Display_Lpr_Content;
    console.log(item);

    const display_content = item.display_content ? JSON.parse(item.display_content) : {};
    display_content["device_name"] = item.device_name;
    console.log(display_content);
    if (display_content) {
        unity.data2fields(display_content, modal);
    }
    const btn_submit = modal.querySelector('[data-field="btn_submit"]');
    const btn_remove = modal.querySelector('[data-field="btn_remove"]');
    btn_submit.onclick = async (e) => {
        const formData = new FormData();
        const heart_beat = modal.querySelector('[data-field="heart_beat"]').value;
        const allow_action = modal.querySelector('[data-field="allow_action"]').value;
        const denied_action = modal.querySelector('[data-field="denied_action"]').value;
        const display_content = { heart_beat: heart_beat, allow_action: allow_action, denied_action: denied_action };
        formData.append("id", item.id);
        formData.append("display_content", JSON.stringify(display_content));
        const respond = await unity.fetchApi("/api/devices/lpr_camera/display_content", "post", formData, "json");

        if (respond.success == true) {
            unity.showDialogSuccess({ title: "Successful", msg: respond.msg });
            lpr_camera_item_model.init();
            modal.close();
        } else {
            unity.logger.debug(respond);
            unity.showDialogError({ msg: JSON.stringify(respond) });
        }
    };
    modal.showModal();
}

// 📌 init lpr_camera_

const lpr_camera_item_model = new table_class.ItemModel(
    "box_of_lpr_camera",
    "template_content_lpr_camera_item",
    Modal_Lpr_Camera,
    "/api/devices/lpr_camera",
    {
        add_new_button: document.getElementById("add_new_lpr_camera"),
        add_new_item_template: document.getElementById("template_add_item"),

        action_buttons: [
            {
                field: "btn_edit_lpr_led_content",
                icon: "fas fa-display fa-2x",
                tooltip: "LED Display Message Settings",
                class: "btn btn-square btn-warning text-white",
                click: (item) => {
                    edit_display_content(item, "/api/devices/lpr_camera/display_content");
                },
            },
        ],
    },
);
// 📌 init Auto Module
const auto_module_item_model = new table_class.ItemModel(
    "box_of_auto_module",
    "template_content_auto_module_item",
    Modal_Auto_Module,
    "/api/devices/auto_module",
    {
        add_new_button: document.getElementById("btn_add_auto_module"),
        add_new_item_template: document.getElementById("template_add_item"),
        action_buttons: [
            {
                field: "btn_edit_lpr_led_content",
                icon: "fas fa-sliders fa-2x",
                tooltip: "link to device config/test",
                class: "btn btn-square btn-error text-white",
                click: (item) => {
                    window.open(`http://${item.device_ip}:8080`, "_blank");
                },
            },
            {
                field: "btn_edit_lpr_led_content",
                icon: "fas fa-display fa-2x",
                tooltip: "link to kiosk view",
                class: "btn btn-square btn-warning text-white",
                click: (item) => {
                    window.open(`/kiosk?name=${item.device_name}`, "_blank");
                },
            },
        ],
    },
);
// 📌 init Reader
const reader_device_item_model = new table_class.ItemModel(
    "box_of_reader_device",
    "template_content_reader_device_item",
    Modal_Reader_Device,
    "/api/devices/reader_device",
    {
        add_new_button: document.getElementById("btn_add_reader"),
        add_new_item_template: document.getElementById("template_add_item"),
        action_buttons: [
            {
                field: "btn_edit_lpr_led_content",
                icon: "fas fa-display fa-2x",
                tooltip: "LED Display Message Settings",
                class: "btn btn-square btn-warning text-white",
                click: (item) => {
                    edit_display_content(item, "/api/devices/reader_device/display_content");
                },
            },
        ],
    },
);

// ! ************************************** //
async function init_select_option() {
    unity.init_select_option(Modal_Lpr_Camera, "/api/gateway", "gateway_id");
    unity.init_select_option(Modal_Auto_Module, "/api/gateway", "gateway_id");
    unity.init_select_option(Modal_Reader_Device, "/api/gateway", "gateway_id");

    unity.init_select_option(Modal_Lpr_Camera, "/api/systems_user", "system_user_id");
    unity.init_select_option(Modal_Auto_Module, "/api/systems_user", "system_user_id");
    unity.init_select_option(Modal_Reader_Device, "/api/systems_user", "system_user_id");

    unity.init_select_option(Modal_Lpr_Camera, "/api/service_fees", "service_fees_id");
    unity.init_select_option(Modal_Auto_Module, "/api/service_fees", "service_fees_id");
    unity.init_select_option(Modal_Reader_Device, "/api/service_fees", "service_fees_id");
}
async function Init() {
    init_select_option();
    lpr_camera_item_model.init();
    auto_module_item_model.init();
    reader_device_item_model.init();
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
