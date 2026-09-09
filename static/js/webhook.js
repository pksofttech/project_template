import * as unity from "./unity.js";

window.save_web_hook = save_web_hook;
async function save_web_hook(web_hook_id) {
    const element_content = document.getElementById(web_hook_id);
    const url = element_content.querySelector('[data-field="url"]').value;
    const method = element_content.querySelector('[data-field="method"]').value;
    const body_field = element_content.querySelector('[data-field="body_field"]').value;
    const extra_header = element_content.querySelector('[data-field="extra_header"]').value;
    console.log("save_web_hook", url, method, body_field, extra_header);
    const _url = `/api/external_webhook`;
    const respond = await unity.fetchApi(
        _url,
        "post",
        JSON.stringify({
            web_hook: web_hook_id,
            url: url.trim(),
            method: method,
            body_field: body_field.trim(),
            extra_header: extra_header.trim(),
        }),
        "json",
    );
    if (respond.success) {
        unity.showToastNotification({ type: "success", msg: "save_web_hook success" });
    } else {
        unity.showDialogError({ title: "Save Webhook Error", msg: respond.msg });
    }
}

window.test_web_hook = test_web_hook;
async function test_web_hook(web_hook_id) {
    const element_content = document.getElementById(web_hook_id);
    const url = element_content.querySelector('[data-field="url"]').value;
    const method = element_content.querySelector('[data-field="method"]').value;
    const body_field = element_content.querySelector('[data-field="body_field"]').value;
    const extra_header = element_content.querySelector('[data-field="extra_header"]').value;
    console.log("save_web_hook", url, method, body_field, extra_header);
    if (url && method && body_field) {
        const _url = `/api/external_webhook/test`;
        const respond = await unity.fetchApi(
            _url,
            "post",
            JSON.stringify({
                web_hook: web_hook_id,
                url: url.trim(),
                method: method.trim().toUpperCase(),
                body_field: body_field.trim(),
                extra_header: extra_header.trim(),
            }),
            "json",
        );
        console.log(respond);
        if (respond.success) {
            unity.showDialogSuccess({
                title: "Test Webhook",
                msg: `${respond.msg}<hr><div class="overflow-auto h-96">${JSON.stringify(respond.response)}</div>`,
            });
        } else {
            unity.showDialogError({ title: "Test Webhook Error", msg: respond.msg });
        }
    } else {
        unity.showToastNotification({ type: "warning", msg: "invalid data or missing data required" });
    }
}

async function load_config_web_hook_init() {
    const respond = await unity.fetchApi("/api/external_webhook/get_config", "get", null, "json");
    console.log(respond);
    if (respond.success) {
        const data = respond.data;
        for (const key in data) {
            if (data[key]) {
                const element_content = document.getElementById(key);
                if (element_content) {
                    const url = element_content.querySelector('[data-field="url"]');
                    const method = element_content.querySelector('[data-field="method"]');
                    const body_field = element_content.querySelector('[data-field="body_field"]');
                    const extra_header = element_content.querySelector('[data-field="extra_header"]');
                    if (url) url.value = data[key].url || "";
                    if (method) method.value = data[key].method || "post";
                    if (body_field) body_field.value = data[key].body_field || "";
                    if (extra_header) extra_header.value = data[key].extra_header || "";
                }
            }
        }
    } else {
        unity.showToastNotification({ type: "error", msg: respond.msg });
    }
}
async function Init() {
    if (localStorage.getItem("WEBHOOK_TAB_ACTIVE")) {
        const v = localStorage.getItem("WEBHOOK_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    } else {
        document.getElementById("WEBHOOK_TAB01").checked = true;
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
    await load_config_web_hook_init();
});
