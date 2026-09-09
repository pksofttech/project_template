import * as unity from "./unity.js";

function uploadWithProgress(url, formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", url);

        // ⏳ Timeout (60 seconds)
        xhr.timeout = 180000;

        // 📊 Upload Progress
        xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                // const progressBar = document.getElementById("upload_progress");
                const progressBar = Dialog_Loading.querySelector("[data-field='upload_progress']");
                if (progressBar) {
                    progressBar.value = percent;
                }
                console.log(`⬆ Upload progress: ${percent}%`);
            }
        });

        // ✔ Success
        xhr.onload = () => {
            try {
                const json = JSON.parse(xhr.responseText);
                resolve(json);
            } catch (e) {
                reject("Invalid JSON response");
            }
        };

        // ❌ Error
        xhr.onerror = () => reject("Network error");
        xhr.ontimeout = () => reject("Timeout uploading file");

        xhr.send(formData);
    });
}

window.database_file_upload = database_file_upload;

async function database_file_upload() {
    const input = document.getElementById("database_file_upload");
    const file = input.files?.[0];

    if (!file) {
        unity.showDialogError({ msg: "No database backup file selected" });
        return;
    }

    // Log overview
    const f_name = `📁 Preparing upload: ${file.name}`;
    const msg = `📦 File size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    unity.logger.info(f_name);
    unity.logger.info(msg);

    const formData = new FormData();
    formData.append("database_file_upload", file, file.name);

    unity.showDialogLoading(`<div class="flex flex-col gap-1">
                                <progress class="progress progress-info w-full" data-field="upload_progress" value="0" max="100"></progress>
                                <div>${f_name}</div>
                                <div>${msg}</div>
                            </div>`);

    try {
        const reply = await uploadWithProgress("/database_file_upload", formData);

        unity.logger.debug("Server reply:", reply);

        if (reply.success) {
            unity.showDialogSuccess({ msg: "Uploaded successfully" });
            input.value = "";
        } else {
            unity.showDialogError({ msg: reply.msg || "Error occurred" });
        }
    } catch (err) {
        unity.logger.error("Upload error:", err);
        unity.showDialogError({ msg: "Unable to upload file" });
    }

    unity.closeDialogLoading();
}

window.database_restore_list = database_restore_list;
async function database_restore_list() {
    const respond = await unity.fetchApi("/database_restore_list", "get", null, "json");
    if (respond.success) {
        const modal = Dialog_data_base_restore;
        const data = respond.data;
        if (data) {
            const content_item = modal.querySelector("[data-field='content_item']");
            content_item.innerHTML = "";
            const temp = document.getElementById("template_database_restore_item");
            for (const d of data) {
                const clone = temp.content.cloneNode(true);
                clone.querySelector('[data-field="database_name"]').innerText = d;
                clone.querySelector('[data-field="btn_delete"]').addEventListener("click", () => {
                    database_restore_delete(d);
                });
                clone.querySelector('[data-field="btn_restore"]').addEventListener("click", () => {
                    database_restore_db(d);
                });
                content_item.appendChild(clone);
            }
        }
        modal.showModal();
    } else {
        unity.showDialogError({ msg: respond.msg });
    }
}

window.database_restore_delete = database_restore_delete;
async function database_restore_delete(db) {
    const result = await unity.showDialogConfirm({ title: "Confirm Backup File Deletion" });
    if (result.confirm) {
        const formData = new FormData();
        formData.append("database_file_name", db);
        const trspond = await unity.fetchApi("/database_restore_delete", "post", formData, "json");
        if (trspond.success) {
            unity.showDialogSuccess({ msg: trspond.msg });
            database_restore_list();
        } else {
            unity.showDialogWarning({ msg: trspond.msg });
        }
    }
}

window.database_restore_db = database_restore_db;
async function database_restore_db(db) {
    const confirm = await unity.showDialogConfirm({
        title: "⚠️ Confirm Database Restore",
        content: "Confirm database restore? (Current data will be completely overwritten!)",
    });
    if (confirm.confirm) {
        const content = `<label class="input input-bordered flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        class="h-4 w-4 opacity-70">
                        <path
                        fill-rule="evenodd"
                        d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                        clip-rule="evenodd" />
                    </svg>
                    <input type="password" class="grow" value="" data-field="returnValue"/>
                    </label>`;
        const res = await unity.showDialogConfirm({ title: "⚠️ Password Required for Restore", content: content });
        unity.logger.debug(res);

        if (res.confirm) {
            if (res.value === "") {
                unity.showDialogError({ msg: "Please enter administrator password" });
                return;
            }
            const formData = new FormData();
            formData.append("database_file_name", db);
            formData.append("password", res.value);
            const respond = await unity.fetchApi("/database_restore_db", "post", formData, "json");
            if (respond.success) {
                unity.showDialogSuccess({ title: "Operation Successful", msg: respond.msg });
            } else {
                unity.showDialogError({ msg: respond.msg });
            }
        }
    }
}

window.date_delete_transaction_sumbit = date_delete_transaction_sumbit;
async function date_delete_transaction_sumbit() {
    const date_delete_transaction_select = document.getElementById("date_delete_transaction_select");
    if (date_delete_transaction_select) {
        const delete_select = date_delete_transaction_select.value;
        if (delete_select !== "") {
            const respond = await unity.dialogConfirm({
                content: "Confirm database purge? (Deleted data cannot be recovered!)",
            });
            if (respond) {
                const content = `<label class="input input-bordered flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        class="h-4 w-4 opacity-70">
                        <path
                        fill-rule="evenodd"
                        d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                        clip-rule="evenodd" />
                    </svg>
                    <input type="password" class="grow" value="password" data-field="returnValue"/>
                    </label>`;
                const res = await unity.showDialogConfirm({ content: content });
                unity.logger.debug(res);
                if (res) {
                    const formData = new FormData();
                    formData.append("delete_select", delete_select);
                    formData.append("password", res.value);
                    unity.showDialogLoading("Processing...");
                    const _reply = await unity.fetchApi(
                        "/database_transaction_delete",
                        "post",
                        formData,
                        "json",
                        true,
                        60000,
                    );
                    unity.closeDialogLoading();

                    if (_reply.success) {
                        const res = await unity.showDialogConfirm({ content: _reply.msg, cancelBtn: false });
                        // await unity.delay(3000);
                        window.location.reload();
                    } else {
                        unity.showDialogError({ msg: _reply.msg });
                    }
                }
            }
        } else {
            unity.showDialogWarning({ msg: "Please select target time window" });
        }
    } else {
    }
}

let database_system_tools_password = "";
window.database_system_tools = database_system_tools;
async function database_system_tools() {
    const cmd = document.getElementById("database_system_tools_cmd").value;
    if (cmd === "") {
        unity.showDialogWarning({ msg: "Please enter SQL/Shell command" });
        return;
    }

    const content = `<label class="input input-bordered flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        class="h-4 w-4 opacity-70">
                        <path
                        fill-rule="evenodd"
                        d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
                        clip-rule="evenodd" />
                    </svg>
                    <input type="password" class="grow" value="${database_system_tools_password}" data-field="returnValue"/>
                    </label>`;
    const res = await unity.showDialogConfirm({ title: "⚠️ Password Required for Operation", content: content });
    unity.logger.debug(res);

    if (res.confirm) {
        const formData = new FormData();
        formData.append("cmd", cmd);
        formData.append("password", res.value);
        unity.debugForm(formData);
        const respond = await unity.fetchApi("/database_system_tools", "post", formData, "json");
        if (respond.success) {
            unity.showDialogSuccess({ msg: respond.msg });
            database_system_tools_password = res.value;
        } else {
            unity.showDialogError({ msg: respond.msg });
        }
    }
}

async function Init() {
    const database_info_stat = document.getElementById("database_info_stat");
    let _reply = await unity.fetchApi("/database_manager/info", "get", null, "json");
    console.log(_reply);
    if (_reply.success) {
        const data = _reply.data;
        const Transaction_Record_Count = data.Transaction_Record_Count;
        const Log_Transaction_Count = data.Log_Transaction_Count;
        const Lpr_Log_Count = data.Lpr_Log_Count;
        database_info_stat.querySelector("[data-field='transaction_record']").textContent = Transaction_Record_Count;
        database_info_stat.querySelector("[data-field='log_transaction']").textContent = Log_Transaction_Count;
        database_info_stat.querySelector("[data-field='log_lpr']").textContent = Lpr_Log_Count;

        // transaction_record_progress
        database_info_stat.querySelector("[data-field='transaction_record_progress']").value =
            (Transaction_Record_Count / 500_000) * 100;
        database_info_stat.querySelector("[data-field='log_transaction_progress']").value =
            (Log_Transaction_Count / 1_000_000) * 100;
        database_info_stat.querySelector("[data-field='log_lpr_progress']").value = (Lpr_Log_Count / 1_000_000) * 100;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
