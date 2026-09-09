import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// 📌 init estamp_device_item_model
const estamp_device_item_model = new table_class.ItemModel(
    "box_of_estamp_device",
    "template_content_estamp_device",
    Modal_Estamp_Device,
    "/api/estamp_device",
    {
        add_new_button: document.getElementById("add_new_estamp_device"),
        add_new_item_template: document.getElementById("template_add_item"),
    },
);

// ! ------------------------------------------------------
window.estamp_system_user_ids = estamp_system_user_ids;
function estamp_system_user_ids() {
    const system_user_ids_list = [];
    const system_user_ids = Modal_Estamp_Device.querySelector('[data-field="system_user_ids"]');
    const selected = [...system_user_ids.selectedOptions].map((o) => o.value);
    selected.forEach((val) => {
        // console.log(val);
        system_user_ids_list.push(val);
    });
    console.log(system_user_ids_list);
    const modal = Modal_Estamp_Device_Select_User;
    const system_users_selected = modal
        .querySelector('[data-field="estamp_system_user_container"]')
        .querySelectorAll('[name="id"]');
    system_users_selected.forEach((el) => {
        el.checked = system_user_ids_list.includes(el.value);
    });

    modal.showModal();
}

window.confirm_estamp_select_system_users = confirm_estamp_select_system_users;
function confirm_estamp_select_system_users() {
    const modal = Modal_Estamp_Device_Select_User;

    const system_users_selected = modal
        .querySelector('[data-field="estamp_system_user_container"]')
        .querySelectorAll('[name="id"]');
    const system_user_ids_list = [];
    system_users_selected.forEach((el) => {
        if (el.checked) {
            system_user_ids_list.push(el.value);
        }
    });
    // Assign settings iteratively
    const field = Modal_Estamp_Device.querySelector('[data-field="system_user_ids"]');
    const values = system_user_ids_list;
    [...field.options].forEach((opt) => {
        opt.selected = values.includes(opt.value);
    });

    $(field).val(values).trigger("change");

    modal.close();
}

window.estamp_service_fees_ids = estamp_service_fees_ids;
function estamp_service_fees_ids() {
    const service_fees_ids_list = [];
    const service_fees_ids = Modal_Estamp_Device.querySelector('[data-field="service_fees_ids"]');
    const selected = [...service_fees_ids.selectedOptions].map((o) => o.value);
    selected.forEach((val) => {
        // console.log(val);
        service_fees_ids_list.push(val);
    });
    console.log(service_fees_ids_list);
    const modal = Modal_Estamp_Device_Select_Service_Fees;
    const service_fees_selected = modal
        .querySelector('[data-field="service_fees_container"]')
        .querySelectorAll('[name="id"]');
    service_fees_selected.forEach((el) => {
        el.checked = service_fees_ids_list.includes(el.value);
    });

    modal.showModal();
}

window.confirm_estamp_select_service_fees = confirm_estamp_select_service_fees;
function confirm_estamp_select_service_fees() {
    const modal = Modal_Estamp_Device_Select_Service_Fees;

    const service_fees_selected = modal
        .querySelector('[data-field="service_fees_container"]')
        .querySelectorAll('[name="id"]');
    const service_fees_ids_list = [];
    service_fees_selected.forEach((el) => {
        if (el.checked) {
            service_fees_ids_list.push(el.value);
        }
    });
    // Assign settings iteratively
    const field = Modal_Estamp_Device.querySelector('[data-field="service_fees_ids"]');
    const values = service_fees_ids_list;
    [...field.options].forEach((opt) => {
        opt.selected = values.includes(opt.value);
    });

    $(field).val(values).trigger("change");

    modal.close();
}

async function init_select_option() {
    unity.init_selects_option(
        [Modal_Estamp_Device.querySelector('[data-field="customer_id"]')],
        "/api/customer",
        "customer_name",
    );

    unity.init_selects_option(
        [Modal_Estamp_Device.querySelector('[data-field="system_user_ids"]')],
        "/api/systems_user",
    );
    unity.init_selects_option(
        [Modal_Estamp_Device.querySelector('[data-field="service_fees_ids"]')],
        "/api/service_fees",
    );

    let respond = await unity.fetchApi("/api/systems_user", "get", null, "json");
    // console.log(respond);
    if (respond.success) {
        const modal = Modal_Estamp_Device_Select_User;
        const data = respond.data;
        const contener = modal.querySelector('[data-field="estamp_system_user_container"]');
        const temp = document.getElementById("template_content_estamp_system_user");
        for (const l of data) {
            // console.log(l);
            const _c = temp.content.cloneNode(true);
            _c.querySelector('[name="tooltip"]').dataset.tip = l.name;
            _c.querySelector('[name="id"]').value = l.id;
            _c.querySelector('[name="name"]').textContent = `[${l.id}]${l.name}`;
            _c.querySelector('[name="remark"]').textContent = l.remark;
            contener.appendChild(_c);
        }
    }

    respond = await unity.fetchApi("/api/service_fees", "get", null, "json");
    // console.log(respond);
    if (respond.success) {
        const modal = Modal_Estamp_Device_Select_Service_Fees;
        const data = respond.data;
        const contener = modal.querySelector('[data-field="service_fees_container"]');
        const temp = document.getElementById("template_content_service_fees");
        for (const l of data) {
            // console.log(l);
            const _c = temp.content.cloneNode(true);
            _c.querySelector('[name="tooltip"]').dataset.tip = l.name;
            _c.querySelector('[name="id"]').value = l.id;
            _c.querySelector('[name="name"]').textContent = `[${l.id}]${l.name}`;
            _c.querySelector('[name="remark"]').textContent = l.remark;
            contener.appendChild(_c);
        }
    }
}
async function Init() {
    await init_select_option();
    await estamp_device_item_model.init();
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
