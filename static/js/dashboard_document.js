import * as unity from "./unity.js";

// upload_image_document

window.upload_image_document = upload_image_document;
async function upload_image_document(document_name) {
    unity.logger.debug(document_name);
    const img = document.getElementById(document_name);
    if (img) {
        const formData = new FormData();
        formData.append("document", document_name);
        formData.append(
            "image_upload",
            await unity.dataURLtoFile(document.getElementById(document_name).src, document_name),
        );
        unity.debugForm(formData);
        let respond = await unity.fetchApi("/api/document/image", "post", formData, "json");
        //unity.logger.debug(_reply);
        if (respond.success) {
            unity.showToastNotification({ type: "success", msg: respond.msg });
            const document_name_preview = `${document_name}_preview`;
            document.getElementById(document_name_preview).src =
                document.getElementById(document_name_preview).src + "&t2=" + new Date().getTime();
        } else {
            unity.showToastNotification({ type: "error", msg: respond.msg });
        }
    }
}

window.upload_slip_data = upload_slip_data;
async function upload_slip_data(document_name) {
    unity.logger.debug(document_name);
    const text_box = document.getElementById(document_name);
    if (text_box) {
        const formData = new FormData();
        formData.append("document", document_name);
        formData.append("data_document", text_box.value);
        unity.debugForm(formData);
        let respond = await unity.fetchApi("/api/document", "post", formData, "json");
        //unity.logger.debug(_reply);
        if (respond.success) {
            unity.logger.debug(respond.data);
            unity.showToastNotification({ type: "success", msg: respond.msg });
        } else {
            unity.showToastNotification({ type: "error", msg: respond.msg });
        }
    }
}

window.preview_slip_data = preview_slip_data;
function preview_slip_data(imgId, text_id, slip_type) {
    unity.logger.debug("preview_slip_data", imgId, text_id, slip_type);
    const img = document.getElementById(imgId);
    const text = document.getElementById(text_id);
    if (img) {
        //     const currentSrc = img.src.split("?")[0]; // Get the base URL without query parameters
        //     img.src = `${currentSrc}?t=${new Date().getTime()}`; // Add a unique timestamp
        const encodedParam = encodeURIComponent(text.value);
        switch (slip_type) {
            case "slip_in":
                img.src =
                    "/api/function/slip_in?transaction_id=demo" +
                    `&t=${new Date().getTime()}&preview_data=${encodedParam}`;
                break;
            case "slip_in_pay":
                img.src =
                    "/api/function/slip_in_pay?transaction_id=demo&slip_type=acc" +
                    `&t=${new Date().getTime()}&preview_data=${encodedParam}`;
                break;
            case "slip_pay":
                img.src =
                    "/api/function/slip_pay?acc_id=demo" + `&t=${new Date().getTime()}&preview_data=${encodedParam}`;
                break;
            case "slip_pay_acc":
                img.src =
                    "/api/function/slip_pay_acc?acc_id=demo" +
                    `&t=${new Date().getTime()}&preview_data=${encodedParam}`;
                break;
            case "slip_pay_member_renew_acc":
                img.src =
                    "/api/function/slip_pay_member_renew_acc?acc_id=demo" +
                    `&t=${new Date().getTime()}&preview_data=${encodedParam}`;
                break;
            case "slip_pay_member_user_renew_acc":
                img.src =
                    "/api/function/slip_pay_member_user_renew_acc?acc_id=demo" +
                    `&t=${new Date().getTime()}&preview_data=${encodedParam}`;
                break;
            default:
                img.src = "/static/image/Image_not_available.png";
                break;
        }
        unity.logger.debug("preview_slip_data", slip_type);
    } else {
        unity.showToastNotification({ type: "warning", msg: "No image preview available" });
    }
}

if (localStorage.getItem("DOCUMENT_TAB")) {
    const tab_select = document.getElementById(localStorage.getItem("DOCUMENT_TAB"));
    if (tab_select) {
        document.getElementById(localStorage.getItem("DOCUMENT_TAB")).checked = true;
    }
}

async function Init() {
    let response = await unity.fetchApi("/api/document?document=slip_in_data", "get", null, "json");
    if (response.success) {
        console.log(response);
        document.getElementById("app_configurations_slip_in_data").value = response.data;
    }

    response = await unity.fetchApi("/api/document?document=slip_in_acc_data", "get", null, "json");
    if (response.success) {
        document.getElementById("app_configurations_slip_in_acc_data").value = response.data;
    }

    response = await unity.fetchApi("/api/document?document=slip_pay_data", "get", null, "json");
    if (response.success) {
        document.getElementById("app_configurations_slip_pay_data").value = response.data;
    }

    response = await unity.fetchApi("/api/document?document=slip_pay_acc_data", "get", null, "json");
    if (response.success) {
        document.getElementById("app_configurations_slip_pay_acc_data").value = response.data;
    }

    response = await unity.fetchApi("/api/document?document=slip_pay_member_renew_acc_data", "get", null, "json");
    if (response.success) {
        document.getElementById("app_configurations_slip_pay_member_renew_acc_data").value = response.data;
    }

    response = await unity.fetchApi("/api/document?document=slip_pay_member_user_renew_acc_data", "get", null, "json");
    if (response.success) {
        document.getElementById("app_configurations_slip_pay_member_user_renew_acc_data").value = response.data;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
