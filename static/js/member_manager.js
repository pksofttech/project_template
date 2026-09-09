import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

const manager_info_member_box = {
    filter_status_element: null,
    member_type_boxs: [],
    reload: function () {
        console.log(this.filter_status.value);
    },
    init: function () {},
};

function init_manager_info_member_box() {
    const element_box = document.getElementById("manager_info_member_box");
    manager_info_member_box.filter_status_element = element_box.querySelector('[data-field="filter_status"]');
    manager_info_member_box.filter_status_element.onchange = function () {
        member_model_table_set_filter();
        member_model_table.reload();
    };

    manager_info_member_box.filter_member_user_element = element_box.querySelector('[data-field="filter_member_user"]');
    manager_info_member_box.filter_member_user_element.onchange = function () {
        member_model_table_set_filter();
        member_model_table.reload();
    };

    manager_info_member_box.filter_member_type_element = element_box.querySelector('[data-field="filter_member_type"]');
    manager_info_member_box.filter_member_type_element.onchange = function () {
        member_model_table_set_filter();
        member_model_table.reload();
    };

    manager_info_member_box.member_type_boxs = element_box.querySelectorAll('[data-field="count_member"]');
}

window.member_table_control = member_table_control;
async function member_table_control(cmd, data) {
    const table_data = member_model_table.table;
    function row_select(v) {
        if (v) {
            table_data.rows().select();
        } else {
            table_data.rows().deselect();
        }
    }
    async function member_table_selete_enable(v) {
        const c = table_data.rows({ selected: true }).count();
        if (c) {
            const result = await unity.showDialogConfirm({
                title: "Confirm Action?",
                content: "This action affects multiple records. Please proceed with caution.",
            });
            if (result.confirm) {
                let ids = "";
                for (let i = 0; i < c; i++) {
                    const items = await table_data.rows({ selected: true }).data()[i].id;
                    ids += `${items},`;
                }
                //unity.logger.debug(ids)
                const formData = new FormData();
                formData.append("ids", ids);
                if (v) {
                    formData.append("value", "status=NORMAL");
                } else {
                    formData.append("value", "status=DISABLE");
                }
                const respond = await unity.fetchApi("/api/member/set", "post", formData, "json");
                if (respond.success) {
                    unity.showDialogSuccess({
                        title: "Operation Completed",
                        msg: `Successfully updated ${respond.data} records`,
                    });
                    member_model_table.reload();
                }
                unity.logger.debug(respond);
            }
        } else {
            unity.showDialogWarning({
                title: "Selection Required",
                msg: "Please select records before proceeding",
            });
        }
    }

    async function member_table_set_member_user() {
        const c = table_data.rows({ selected: true }).count();
        if (c) {
            const result = await unity.showDialogConfirm({
                title: "Confirm Action?",
                content: "This action affects multiple records. Please proceed with caution.",
            });
            if (result.confirm) {
                let ids = "";
                for (let i = 0; i < c; i++) {
                    const items = await table_data.rows({ selected: true }).data()[i].id;
                    ids += `${items},`;
                }
                let member_owner = "";
                let respond = await unity.fetchApi("/api/member/user", "get", null, "json");
                if (respond.status) {
                    const _m_u_l = respond.data;
                    let content = `<select class="select select-primary w-full" data-field="returnValue">
                                        <option disabled selected>Select Cardholder?</option>
                                        <option value="None">Unassigned</option>`;
                    for (const l of _m_u_l) {
                        content += `<option>${l.name}</option>`;
                    }
                    content += `</select>`;

                    const result = await unity.showDialogConfirm({
                        title: "Select Cardholder",
                        content: content,
                    });

                    if (result.confirm) {
                        member_owner = result.value;
                        const confirm = await unity.showDialogConfirm({
                            title: "Confirm Action?",
                            content: `Change cardholder assignment to ${member_owner == "None" ? "Unassigned" : member_owner}`,
                        });
                        if (!confirm.confirm) {
                            return;
                        }
                    }
                }

                //unity.logger.debug(ids)

                const formData = new FormData();
                formData.append("ids", ids);
                formData.append("value", `member_owner=${member_owner}`);
                unity.logger.debug(member_owner);

                respond = await unity.fetchApi("/api/member/set", "post", formData, "json");
                if (respond.success) {
                    unity.showDialogSuccess({
                        title: "Operation Completed",
                        msg: `Successfully updated ${respond.data} records`,
                    });
                    member_model_table.reload();
                } else {
                    unity.showDialogWarning({
                        title: "Operation Failed",
                        msg: respond.msg,
                    });
                }
                unity.logger.debug(respond);
            }
        } else {
            unity.showDialogWarning({ title: "Selection Required", msg: "Please select records before proceeding" });
        }
    }

    async function member_table_set_expire() {
        const c = table_data.rows({ selected: true }).count();
        if (c) {
            const result = await unity.showDialogConfirm({
                title: "Confirm Action?",
                content: "This action affects multiple records. Please proceed with caution.",
            });
            if (result.confirm) {
                let ids = "";
                for (let i = 0; i < c; i++) {
                    const items = await table_data.rows({ selected: true }).data()[i].id;
                    ids += `${items},`;
                }
                const content = `<input 
                    type="datetime-local" 
                    data-field="returnValue" 
                    class="input input-warning w-full" 
                    min="${new Date().toISOString().slice(0, 16)}"
                />`;

                const result = await unity.showDialogConfirm({
                    title: "Select Expiration Date",
                    content: content,
                });

                if (result.confirm && result.value) {
                    const confirm = await unity.showDialogConfirm({
                        title: "Confirm Action?",
                        content: `Proceed with changing expiry date to ${unity.dateTimeToStr(result.value)}`,
                    });
                    if (!confirm.confirm) {
                        return;
                    }
                } else {
                    return;
                }

                //unity.logger.debug(ids)

                const formData = new FormData();
                formData.append("ids", ids);
                formData.append("value", `expire_date_time=${result.value}`);

                const _reply = await unity.fetchApi("/api/member/set", "post", formData, "json");
                if (_reply.success) {
                    unity.showDialogSuccess({
                        title: "Operation Completed",
                        msg: `Successfully updated ${_reply.data} records`,
                    });
                    member_model_table.reload();
                } else {
                    unity.showDialogWarning({
                        title: "Operation Failed",
                        msg: _reply.msg,
                    });
                }
                unity.logger.debug(_reply);
            }
        } else {
            unity.showDialogWarning({ title: "Selection Required", msg: "Please select records before proceeding" });
        }
    }

    async function member_table_remove() {
        const c = table_data.rows({ selected: true }).count();
        if (c) {
            if (!(await unity.dialogConfirm())) return;

            const result = await unity.showDialogConfirm({
                title: "Confirm Action?",
                content: "Deletion cannot be undone. Please confirm to proceed.",
            });
            if (result.confirm) {
                let ids = "";
                for (let i = 0; i < c; i++) {
                    const items = await table_data.rows({ selected: true }).data()[i].id;
                    ids += `${items},`;
                }
                //unity.logger.debug(ids)
                const formData = new FormData();
                formData.append("ids", ids);
                const _reply = await unity.fetchApi("/api/member/del", "delete", formData, "json");
                if (_reply.success) {
                    unity.showDialogSuccess({
                        title: "Operation Completed",
                        msg: `Successfully deleted ${_reply.data} records`,
                    });
                    member_model_table.reload();
                }
                unity.logger.debug(_reply);
            }
        } else {
            unity.showDialogWarning({
                title: "Selection Required",
                msg: "Please select records before proceeding",
            });
        }
    }

    function link_tab_build_member_table_by_member_user(data) {
        // console.log("link_tab_build_member_table_by_member_user", data);
        manager_info_member_box.filter_status_element.value = 0;
        manager_info_member_box.filter_member_type_element.value = 0;
        manager_info_member_box.filter_member_user_element.value = data;

        manager_info_member_box.filter_member_user_element.dispatchEvent(new Event("change"));

        member_model_table_set_filter();
        member_model_table.reload();
        document.getElementById("MEMBER_MANAGER_TAB04").checked = true;
    }

    function link_tab_build_member_table_by_member_type(data) {
        manager_info_member_box.filter_status_element.value = 0;
        manager_info_member_box.filter_member_type_element.value = data;
        manager_info_member_box.filter_member_user_element.value = 0;
        manager_info_member_box.filter_member_user_element.dispatchEvent(new Event("change"));

        member_model_table_set_filter();
        member_model_table.reload();
        document.getElementById("MEMBER_MANAGER_TAB04").checked = true;
    }

    async function add_new_item_by_member_type(type_id) {
        function addDays(date, days) {
            const d = new Date(date);
            d.setDate(d.getDate() + days);
            return d;
        }
        function addMonths(date, months) {
            const d = new Date(date);
            d.setMonth(d.getMonth() + months);
            return d;
        }
        function addYears(date, years) {
            const d = new Date(date);
            d.setFullYear(d.getFullYear() + years);
            return d;
        }

        function toDatetimeLocalString(date) {
            const pad = (n) => String(n).padStart(2, "0");
            return (
                date.getFullYear() +
                "-" +
                pad(date.getMonth() + 1) +
                "-" +
                pad(date.getDate()) +
                "T" +
                pad(date.getHours()) +
                ":" +
                pad(date.getMinutes())
            );
        }

        const respond = await unity.fetchApi(`/api/member/type?id=${type_id}`, "get", null, "json");
        if (respond.success) {
            const member_type = respond.data;
            // console.log(member_type);
            const expire_day = member_type.expire_day || 0;
            const renewal_type = member_type.renewal_type;
            const modal = Modal_Member_Add;
            unity.clear_fields(modal);

            const textarea = modal.querySelector('[data-field="card_ids"]');
            const countLabel = modal.querySelector('[data-field="ids_count_for_add_member"]');

            modal.querySelector('[data-field="status"]').value = "NORMAL";
            const start_date_time_field = modal.querySelector('[data-field="start_date_time"]');
            start_date_time_field.value = toDatetimeLocalString(new Date());
            // console.log("add_new_item_by_member_type", type_id, renewal_type, expire_day);

            start_date_time_field.onchange = (e) => {
                const _renewal_type = renewal_type || "DAY";
                const _expire_day = expire_day;
                const t = e.target;
                const expire_date_time_field = modal.querySelector('[data-field="expire_date_time"]');
                console.log(_renewal_type, _expire_day);
                switch (_renewal_type) {
                    case "DAY":
                        expire_date_time_field.value = toDatetimeLocalString(addDays(new Date(t.value), _expire_day));
                        break;

                    case "1_MONTH":
                        expire_date_time_field.value = toDatetimeLocalString(addMonths(new Date(t.value), 1));
                        break;
                    case "3_MONTH":
                        expire_date_time_field.value = toDatetimeLocalString(addMonths(new Date(t.value), 3));
                        break;
                    case "6_MONTH":
                        expire_date_time_field.value = toDatetimeLocalString(addMonths(new Date(t.value), 6));
                        break;
                    case "1_YEAR":
                        expire_date_time_field.value = toDatetimeLocalString(addYears(new Date(t.value), 1));
                        break;

                    default:
                        break;
                }
            };
            start_date_time_field.dispatchEvent(new Event("change"));

            const sel = modal.querySelector('[data-field="member_type_id"]');
            // Assign value to DOM SELECT element
            sel.value = type_id;

            // Assign value to Select2 UI element
            $(sel).val(type_id).trigger("change");

            modal.querySelector('[data-field="renewal_type"]').textContent = renewal_type;

            modal.querySelector('[data-field="btn_submit"]').onclick = async () => {
                console.log('[data-field="btn_submit"');
                const FormData = unity.fields2formData(modal);
                unity.debugForm(FormData);
                if (!FormData) return;
                const respond = await unity.fetchApi("/api/member", "post", FormData, "json");
                if (respond.success) {
                    unity.showDialogSuccess({
                        title: "Operation Completed",
                        msg: respond.msg,
                    });
                    member_model_table.reload();
                    modal.close();
                } else {
                    unity.showDialogWarning({
                        title: "Operation Failed?",
                        msg: respond.msg,
                    });
                }
            };

            modal.showModal();
        } else {
            unity.showDialogWarning({
                title: "Operation Failed?",
                msg: respond.msg,
            });
        }
    }

    switch (cmd) {
        case "select":
            row_select(true);
            break;
        case "deselect":
            row_select(false);
            break;
        case "enable":
            member_table_selete_enable(true);
            break;
        case "disable":
            member_table_selete_enable(false);
            break;
        case "set_member_user":
            member_table_set_member_user();
            break;
        case "set_expire":
            member_table_set_expire();
            break;
        case "remove":
            member_table_remove();
            break;
        case "import_file_excel":
            Modal_Member_Dump_From_File.showModal();
            break;
        case "link_tab_build_member_table_by_member_user":
            link_tab_build_member_table_by_member_user(data);
            break;
        case "link_tab_build_member_table_by_member_type":
            link_tab_build_member_table_by_member_type(data);
            break;
        case "add_new_item_by_member_type":
            add_new_item_by_member_type(data);
            break;
        default:
            console.log("member_table_control undefined : ", cmd);
            break;
    }
}

window.member_import_control = member_import_control;

async function member_import_control(cmd, data) {
    const table_dump_file_excel = Modal_Member_Dump_From_File.querySelector('[data-field="table_dump_file_excel"]');
    function clear_member_dump_from_table() {
        while (table_dump_file_excel.rows.length > 0) {
            table_dump_file_excel.deleteRow(0);
        }
    }

    async function submit_apply_member_dump_from_file(f) {
        const dump_file_upload = f;
        if (dump_file_upload.files.length == 1) {
            clear_member_dump_from_table();
            // unity.logger.info(dump_file_upload.files);
            const reader = new FileReader();
            let card_id_dupicateds = [];
            let _index = 0;

            reader.onload = function (event) {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                _index = 0;
                let _member_name;
                let _type;
                const card_ids = [];
                jsonData.forEach((row) => {
                    // console.log(row);
                    const card_id =
                        row["Card ID / Plate"] || row["Card ID"] || row["License Plate"] || row["Card No"] || "" || "";
                    const member_name = row["Cardholder Name"] || row["Name"] || "";
                    const type = row["Type"] || "";
                    const address = row["Company / Affiliation / Address"] || row["Address"] || "";
                    const user_id = row["UID"];

                    console.log(card_id, member_name, type, address, user_id);

                    if (!card_ids.includes(card_id)) {
                        if (card_id) {
                            card_ids.push(card_id);
                        }
                        _member_name = member_name !== undefined ? member_name : _member_name;
                        _type = type !== "" ? type : _type;
                        // unity.logger.info(card_id, member_name, type);
                        const newRow = table_dump_file_excel.insertRow();
                        const cell1 = newRow.insertCell(0);
                        const cell2 = newRow.insertCell(1);
                        const cell3 = newRow.insertCell(2);
                        const cell4 = newRow.insertCell(3);
                        const cell5 = newRow.insertCell(4);
                        const cell6 = newRow.insertCell(5);

                        cell1.textContent = ++_index;
                        cell2.textContent = card_id;
                        cell3.textContent = _member_name;
                        cell4.textContent = _type;
                        cell5.textContent = address;
                        cell6.textContent = user_id;
                    } else {
                        card_id_dupicateds.push(`Row ${_index}: Duplicate Card ID ${card_id}`);
                    }
                });
                dump_file_upload.value = "";
                let heml_info = "";
                if (card_id_dupicateds.length > 0) {
                    heml_info = `Found ${card_id_dupicateds.length} duplicate Card IDs`;
                }
                for (let i = 0; i < card_id_dupicateds.length; i++) {
                    heml_info += `<br>${card_id_dupicateds[i]}`;
                }
                unity.showDialogInfo({
                    title: `Card Import Summary`,
                    msg: `Total ${jsonData.length} records<br>${heml_info}`,
                });
            };
            const _file = dump_file_upload.files[0];
            reader.readAsArrayBuffer(_file);
        }
    }

    function isStringInt(str) {
        let num = parseInt(str);
        return !isNaN(num) && num.toString() === str;
    }
    async function dump_from_table() {
        const table_dump_file_excel = Modal_Member_Dump_From_File.querySelector('[data-field="table_dump_file_excel"]');
        const row_data = table_dump_file_excel.rows.length;
        if (row_data > 0) {
            const result = await unity.showDialogConfirm({
                title: "Edit Card Data",
                content: `Confirm action for ${row_data} records?`,
            });
            if (result.confirm) {
                let success_row = 0;
                for (let i = 0; i < table_dump_file_excel.rows.length; i++) {
                    // if (i > 10) break;
                    // unity.logger.info(i);
                    const r = table_dump_file_excel.rows[i];
                    const c = r.cells;
                    if (isStringInt(c[0].innerText)) {
                        const d = {
                            card_id: c[1].textContent,
                            name: c[2].textContent,
                            type: c[3].textContent,
                            address: c[4].textContent,
                            user_id: c[5].textContent,
                        };
                        const formData = new FormData();
                        formData.append("card_id", d.card_id);
                        formData.append("name", d.name);
                        formData.append("type", d.type);
                        formData.append("address", d.address);
                        formData.append("user_id", d.user_id);

                        const respond = await unity.fetchApi("/api/member/exec_member", "post", formData, "json");
                        // console.log(respond);

                        if (respond.status == 422) {
                            // unity.logger.debug(respond);
                            c[0].innerHTML = `<div class="badge badge-error">Invalid Data</div>`;
                            //return;
                        } else {
                            unity.logger.debug(respond.msg);
                            if (respond.success) {
                                c[0].innerHTML = `<div class="badge badge-success">Success</div>`;
                                ++success_row;
                            } else {
                                c[0].innerHTML = `<div class="badge badge-warning">${respond.msg}</div>`;
                            }
                        }
                        r.scrollIntoView({
                            behavior: "auto", // or "auto" for instant scrolling
                            block: "center", // options are "start", "center", "end", or "nearest"
                            inline: "nearest",
                        });
                    }
                }
                unity.showDialogSuccess({ msg: `Successfully processed ${success_row} records` });
                member_model_table.reload();
            }
        }
    }

    switch (cmd) {
        case "import_file_excel":
            Modal_Member_Dump_From_File.showModal();
            break;
        case "close":
            clear_member_dump_from_table();
            break;
        case "event_select_file":
            submit_apply_member_dump_from_file(data);
            break;

        case "dump_from_table":
            dump_from_table();
            break;
        default:
            console.log("member_import_control undefined : ", cmd);
            break;
    }
}

window.member_user_import_control = member_user_import_control;

async function member_user_import_control(cmd, data) {
    const table_dump_file_excel = Modal_Member_User_Dump_From_File.querySelector(
        '[data-field="table_dump_file_excel"]',
    );
    function clear_dump_from_table() {
        table_dump_file_excel.innerHTML = "";
    }

    async function submit_apply_dump_from_file(f) {
        const dump_file_upload = f;
        if (dump_file_upload.files.length == 1) {
            clear_dump_from_table();
            const reader = new FileReader();
            let card_id_dupicateds = [];
            let _index = 0;

            reader.onload = function (event) {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                // Convert the worksheet to an array of JSON objects
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });

                // console.log(jsonData);

                if (!jsonData || jsonData.length === 0) return;

                table_dump_file_excel.innerHTML = "";

                // Build header (thead)
                let headerRow = jsonData[0];
                let startIndex = 0;

                const isHeader =
                    Array.isArray(headerRow) &&
                    headerRow.some(
                        (val) => typeof val === "string" && /card|plate|name|type|address|uid|no/i.test(val),
                    );

                const thead = document.createElement("thead");
                thead.className = "bg-base-300 sticky top-0 z-10";
                const theadTr = document.createElement("tr");

                const thNo = document.createElement("th");
                thNo.innerHTML = "<span>No.</span>";
                theadTr.appendChild(thNo);

                if (isHeader) {
                    headerRow.forEach((colName) => {
                        const th = document.createElement("th");
                        const name = colName !== undefined && colName !== null ? String(colName).trim() : "";
                        th.dataset.key = name;
                        th.innerHTML = `<span>${name}</span>`;
                        theadTr.appendChild(th);
                    });
                    startIndex = 1;
                } else {
                    const maxCols = Math.max(...jsonData.map((r) => (Array.isArray(r) ? r.length : 0)));
                    for (let cIdx = 0; cIdx < maxCols; cIdx++) {
                        const th = document.createElement("th");
                        th.dataset.key = `col_${cIdx + 1}`;
                        th.innerHTML = `<span>Col ${cIdx + 1}</span>`;
                        theadTr.appendChild(th);
                    }
                    startIndex = 0;
                }
                thead.appendChild(theadTr);
                table_dump_file_excel.appendChild(thead);

                // Build body (tbody)
                const tbody = document.createElement("tbody");
                const card_ids = [];
                _index = 0;

                for (let i = startIndex; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || row.length === 0) continue;

                    const card_id = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : "";
                    if (card_id && card_ids.includes(card_id)) {
                        card_id_dupicateds.push(`Row ${_index + 1}: Duplicate Card ID ${card_id}`);
                    } else if (card_id) {
                        card_ids.push(card_id);
                    }

                    const tr = document.createElement("tr");
                    const tdNo = document.createElement("td");
                    tdNo.textContent = ++_index;
                    tr.appendChild(tdNo);

                    if (Array.isArray(row)) {
                        row.forEach((colVal) => {
                            const td = document.createElement("td");
                            td.textContent = colVal !== undefined && colVal !== null ? colVal : "";
                            tr.appendChild(td);
                        });
                    }
                    tbody.appendChild(tr);
                }
                table_dump_file_excel.appendChild(tbody);

                dump_file_upload.value = "";
                let heml_info = "";
                if (card_id_dupicateds.length > 0) {
                    heml_info = `Found ${card_id_dupicateds.length} duplicate Card IDs`;
                    for (let i = 0; i < card_id_dupicateds.length; i++) {
                        heml_info += `<br>${card_id_dupicateds[i]}`;
                    }
                }
                if (typeof unity !== "undefined" && unity.showDialogInfo) {
                    unity.showDialogInfo({
                        title: `Card Import Summary`,
                        msg: `Total ${_index} records<br>${heml_info}`,
                    });
                }
            };
            const _file = dump_file_upload.files[0];
            reader.readAsArrayBuffer(_file);
        }
    }

    function isStringInt(str) {
        let num = parseInt(str);
        return !isNaN(num) && num.toString() === str;
    }
    async function dump_from_table() {
        const table_dump_file_excel = Modal_Member_User_Dump_From_File.querySelector(
            '[data-field="table_dump_file_excel"]',
        );
        const row_data = table_dump_file_excel.rows.length;
        if (row_data > 0) {
            const result = await unity.showDialogConfirm({
                title: "Edit Card Data",
                content: `Confirm action for ${row_data} records?`,
            });
            if (result.confirm) {
                let success_row = 0;
                const thead = table_dump_file_excel.querySelector("thead");
                const headerCells = thead ? thead.rows[0].cells : [];

                unity.logger.debug("Debug Excel Upload - thead:", thead);
                unity.logger.debug(
                    "Debug Excel Upload - headerCells details:",
                    Array.from(headerCells).map((cell, index) => ({
                        index,
                        datasetKey: cell.dataset ? cell.dataset.key : undefined,
                        dataset: cell.dataset ? { ...cell.dataset } : {},
                        textContent: cell.textContent ? cell.textContent.trim() : "",
                    })),
                );

                for (let i = 0; i < table_dump_file_excel.rows.length; i++) {
                    // break; for test
                    if (i > 5) break;
                    const r = table_dump_file_excel.rows[i];
                    const c = r.cells;
                    if (isStringInt(c[0].innerText)) {
                        const payload = {};
                        for (let j = 1; j < c.length; j++) {
                            const th = headerCells[j];
                            const key =
                                (th &&
                                    (th.dataset?.key?.trim() ||
                                        th.getAttribute("data-key")?.trim() ||
                                        th.textContent?.trim())) ||
                                `col_${j}`;
                            payload[key] = c[j] ? c[j].textContent.trim() : "";
                        }
                        unity.logger.debug(`Row ${i} payload:`, payload);
                        console.log("Payload:", payload);
                        const respond = await unity.fetchApi(
                            "/api/member/exec_member_user",
                            "post",
                            JSON.stringify(payload),
                            "json",
                        );
                        // console.log(respond);

                        if (respond.status == 422) {
                            // unity.logger.debug(respond);
                            c[0].innerHTML = `<div class="badge badge-error">Invalid Data</div>`;
                            //return;
                        } else {
                            unity.logger.debug(respond.msg);
                            if (respond.success) {
                                c[0].innerHTML = `<div class="badge badge-success">Success</div>`;
                                ++success_row;
                            } else {
                                c[0].innerHTML = `<div class="badge badge-warning">${respond.msg}</div>`;
                            }
                        }
                        r.scrollIntoView({
                            behavior: "auto", // or "auto" for instant scrolling
                            block: "center", // options are "start", "center", "end", or "nearest"
                            inline: "nearest",
                        });
                    }
                }
                unity.showDialogSuccess({ msg: `Successfully processed ${success_row} records` });
                member_model_table.reload();
            }
        }
    }

    switch (cmd) {
        case "import_file_excel":
            Modal_Member_User_Dump_From_File.showModal();
            break;
        case "close":
            clear_dump_from_table();
            break;
        case "event_select_file":
            submit_apply_dump_from_file(data);
            break;

        case "dump_from_table":
            dump_from_table();
            break;
        default:
            console.log("import_control undefined : ", cmd);
            break;
    }
}

// Member Groups Table
const group_member_model_table = new table_class.TableModel(
    "#group_member_table",
    "/api/member/group/datatable",
    {
        table: "Group_Members",
        columns: [
            {
                data: "Group_Members.id",
                title: `<h3>Management</h3>`,
                className: "noExport",
                orderable: false,
                render: function (data, type, row) {
                    return table_class.actionButtonsTemplate(row.id);
                },
            },
            {
                data: "Group_Members.id",
                title: "ID:Group/Division",
                render: function (data, type, row) {
                    data = row.id;
                    if (data) {
                        return data;
                    }
                },
            },
            {
                data: "Group_Members.name",
                title: "Group/Division",
                render: function (data, type, row) {
                    data = row.name;
                    if (data) {
                        return data;
                    }
                    return `<span class="badge badge-warning">No Cardholder Name</span>`;
                },
            },

            {
                data: "Group_Members.status",
                title: "Status",
                render: function (data, type, row) {
                    data = row.status;
                    if (data == "NORMAL") {
                        return `<span class="badge badge-success badge-soft">${data}</span>`;
                    } else if (data == "DISABLE") {
                        return `<span class="badge badge-error badge-soft">Suspended</span>`;
                    } else {
                        return `<span class="badge badge-warning badge-soft">${data}</span>`;
                    }
                },
            },

            {
                data: "Group_Members.detail",
                title: "Details",
                render: function (data, type, row) {
                    return row.detail;
                },
            },
            {
                data: "Group_Members.remark",
                title: "Remarks",
                render: function (data, type, row) {
                    return row.remark;
                },
            },
        ],
    },
    {
        addbtn: true,
    },
);

group_member_model_table.create_item_control({
    modal_from: Modal_Group_Member,
    api_endpoint: "/api/member/group",
});

// Member Types Table
const member_type_model_table = new table_class.TableModel(
    "#member_type_table",
    "/api/member/type/datatable",
    {
        table: "Member_Type",
        columns: [
            {
                data: "Member_Type.id",
                title: `<h3>Management</h3>`,
                className: "noExport",
                orderable: false,
                render: function (data, type, row) {
                    return table_class.actionButtonsTemplate(row.id);
                },
            },
            {
                data: "Member_Type.id",
                title: `ID`,
                className: "noExport",
                orderable: false,
                render: function (data, type, row) {
                    return row.id;
                },
            },
            {
                data: "count",
                title: "Card Count",
                orderable: true,
                render: function (data, type, row) {
                    data = row.count;
                    if (data > 0) {
                        return `
                            <div class="tooltip tooltip-right" data-tip="View Cards: ${row.name}">
                                <button class="btn btn-square" onclick="member_table_control('link_tab_build_member_table_by_member_type','${row.id}')" >
                                    <kbd class="kbd text-primary" >${data}</kbd> 
                                </button>
                             </div>`;
                    }
                    return "<div class='badge_warning'>No Card</div>";
                },
            },
            {
                data: "Member_Type.name",
                title: "Name",
                render: function (data, type, row) {
                    data = row.name;
                    return data;
                },
            },

            {
                data: "Member_Type.expire_day",
                title: "Validity (Days)",
                render: function (data, type, row) {
                    data = row.expire_day;
                    if (data == 0) {
                        return '<div class="badge badge-error badge-soft">*Unlimited</div>';
                    }
                    return data;
                },
            },
            {
                data: "Member_Type.amount",
                title: "Card Issuance Fee",
                render: function (data, type, row) {
                    data = row.amount;
                    return data;
                },
            },
            {
                data: "Member_Type.registration_fee",
                title: "💳 Initial Entry Fee",
                render: function (data, type, row) {
                    return row.registration_fee || 0;
                },
            },
            {
                data: "Member_Type.renewal_type",
                title: "🔁 Renewal Type",
                orderable: false,
                render: function (data, type, row) {
                    data = row.renewal_type;
                    if (data) {
                        if (data == "DAY") {
                            return "Days (Based on Validity)";
                        }
                        return data;
                    }
                    return '<div class="badge badge-error">*Invalid Data</div>';
                },
            },
            {
                data: "Member_Type.remark",
                title: "Details",
                orderable: false,
                render: function (data, type, row) {
                    data = row.remark;
                    return data;
                },
            },
            {
                data: "Service_Fees.name",
                title: "Default Tariff Rate",
                name: "service_fees_name",
                orderable: false,
                render: function (data, type, row) {
                    return (
                        row.service_fees_name ||
                        '<div class="badge badge-warning badge-soft">*No Default Tariff Configured</div>'
                    );
                },
            },
            {
                data: "Permission_Role.name",
                title: "Access Permissions",
                name: "permission_role_name",
                orderable: false,
                render: function (data, type, row) {
                    return (
                        row.permission_role_name ||
                        '<div class="badge badge-warning badge-soft">*No Access Restriction Configured</div>'
                    );
                },
            },
        ],
    },
    {
        addbtn: true,
    },
);

member_type_model_table.create_item_control({
    modal_from: Modal_Member_Type,
    api_endpoint: "/api/member/type",
});

// Member Users Table
const member_user_model_table = new table_class.TableModel(
    "#member_user_table",
    "/api/member/user/datatable",
    {
        table: "Member_User",
        select: true,
        columns: [
            {
                data: "Member_User.id",
                title: `<h3>Management</h3>`,
                className: "noExport",
                orderable: false,
                render: function (data, type, row) {
                    return table_class.actionButtonsTemplate(data);
                },
            },
            {
                data: "Member_User.pictureUrl",
                title: "Photo",
                orderable: false,
                className: "noExport",

                render: function (data, type) {
                    if (data) {
                        return `<img loading="lazy" class="duration-500 ease-in rounded-box max-w-12 hover:scale-150" src="${data}" onclick="showPreviewImageView('${data}');" >`;
                    } else {
                        return "";
                    }
                },
            },
            {
                data: "count",
                title: "Card Count",
                orderable: true,
                render: function (data, type, row) {
                    if (data > 0) {
                        return `
                            <div class="tooltip tooltip-right" data-tip="View Cards: ${row.Member_User.name}">
                                <button class="btn btn-square" onclick="member_table_control('link_tab_build_member_table_by_member_user','${row.Member_User.id}')">
                                    <kbd class="kbd text-primary">${data}</kbd> 
                                </button>
                             </div>`;
                    }
                    return "<div class='badge_warning'>No Card</div>";
                },
            },
            {
                data: "Member_User.id",
                title: "ID",
                render: function (data, type) {
                    return data;
                },
            },
            {
                data: "Member_User.name",
                title: "Name",
                render: function (data, type) {
                    return data;
                },
            },
            // {
            //     data: "Group_Members.name",
            //     title: "Group/Division",
            //     render: function (data, type) {
            //         if (data == null) {
            //             return `<span class="badge badge-warning badge-soft badge-sm">Unassigned</span>`;
            //         }
            //         return `<span class="badge badge-info badge-soft">${data}</span>`;
            //     },
            // },
            // {
            //     data: "Member_User.user_id",
            //     title: "UID/Employee ID",
            //     render: function (data, type) {
            //         return data;
            //     },
            // },
            {
                data: "Member_User.user_type",
                title: "Type",
                render: function (data, type) {
                    if (data == null) {
                        return `<span class="badge badge-warning badge-soft badge-sm">Unassigned</span>`;
                    }
                    return `<span class="badge badge-info badge-soft">${data}</span>`;
                },
            },

            {
                data: "Member_User_Permission.name",
                title: `<div class="badge badge-info badge-outline">Privilege</div>`,
                render: function (data, type) {
                    if (data == null) {
                        return `<span class="badge badge-warning badge-sm badge-soft">Unassigned</span>`;
                    }
                    return data;
                },
            },
            // {
            //     data: "Member_User_Permission.limit",
            //     title: "Access Privileges",
            //     render: function (data, type) {
            //         if (data == null) {
            //             return `<span class="badge_danger">Unlimited</span>`;
            //         }
            //         return data;
            //     },
            // },

            {
                data: "Member_User.status",
                title: "Status",
                render: function (data, type) {
                    if (data == null) {
                        return "";
                    }
                    return data;
                },
            },
            {
                data: "Member_User.expire_date_time",
                title: "Expiry Date",
                render: function (data, type) {
                    if (data == null) {
                        return `<span class="badge badge-warning badge-sm badge-soft">Unassigned</span>`;
                    }
                    console.log(data);
                    // return data;
                    return dayjs(data).format("DD/MM/YYYY HH:mm");
                },
            },
            {
                data: "Member_User.booking_limit",
                title: "Booking visitor",
                render: function (data, type) {
                    if (data == null || data == 0) {
                        return `<span class="badge badge-sm badge-warning">Denied</span>`;
                    }
                    return `<span class="badge badge-sm badge-success badge-soft">${data} rules</span>`;
                },
            },
            {
                data: "Access_Roles.name",
                title: `<div class="badge badge-success badge-outline">Access Role</div>`,
                render: function (data, type) {
                    if (data == null) {
                        return `<span class="badge badge-warning badge-soft badge-sm">Unassigned</span>`;
                    }
                    return `<span class="badge badge-success badge-soft">${data}</span>`;
                },
            },

            {
                data: "Member_User.address",
                title: "Company / Affiliation / Address",
                render: function (data, type) {
                    if (data == null) {
                        return "";
                    }
                    return data.replace(/\n/g, "<br>");
                },
            },
            {
                data: "Member_User.email",
                title: "email",
                orderable: false,
                render: function (data, type) {
                    return data;
                },
            },
            {
                data: "Customer.customer_name",
                title: "Customer Name",
                orderable: false,
                render: (data, type, row) => `<span class="font-semibold">${data || "-"}</span>`,
            },
            {
                data: "Member_User.remark",
                title: "Details",
                orderable: false,
                render: function (data, type) {
                    return data;
                },
            },
        ],
        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            // console.log(aData);
            if (aData.Member_User.status == "DISABLE") {
                nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-error/50"));
            }
        },
    },
    {
        addbtn: true,
    },
);

member_user_model_table.create_item_control({
    modal_from: Modal_Member_User,
    api_endpoint: "/api/member/user",
});

window.member_user_table_control = member_user_table_control;
async function member_user_table_control(cmd, data) {
    const table_data = member_user_model_table.table;
    function row_select(v) {
        if (v) {
            table_data.rows().select();
        } else {
            table_data.rows().deselect();
        }
    }
    async function member_user_table_selete_enable(v) {
        const c = table_data.rows({ selected: true }).count();
        if (c) {
            const result = await unity.showDialogConfirm({
                title: "Confirm Action?",
                content: "This action affects multiple records. Please proceed with caution.",
            });
            if (result.confirm) {
                let ids = "";
                for (let i = 0; i < c; i++) {
                    // console.log(table_data.rows({ selected: true }).data()[i]);
                    const items = table_data.rows({ selected: true }).data()[i].Member_User.id;
                    ids += `${items},`;
                }
                const formData = new FormData();
                formData.append("ids", ids);
                if (v) {
                    formData.append("value", "status=NORMAL");
                } else {
                    formData.append("value", "status=DISABLE");
                }
                const respond = await unity.fetchApi("/api/member/user/set", "post", formData, "json");
                if (respond.success) {
                    unity.showDialogSuccess({
                        title: "Operation Completed",
                        msg: `Successfully updated ${respond.data} records`,
                    });
                    member_user_model_table.reload();
                }
                unity.logger.debug(respond);
            }
        } else {
            unity.showDialogWarning({
                title: "Selection Required",
                msg: "Please select records before proceeding",
            });
        }
    }

    async function member_user_table_set_expire() {
        const c = table_data.rows({ selected: true }).count();
        if (c) {
            const result = await unity.showDialogConfirm({
                title: "Confirm Action?",
                content: "This action affects multiple records. Please proceed with caution.",
            });
            if (result.confirm) {
                let ids = "";
                for (let i = 0; i < c; i++) {
                    const items = table_data.rows({ selected: true }).data()[i].Member_User.id;
                    ids += `${items},`;
                }
                const content = `<input 
                    type="datetime-local" 
                    data-field="returnValue" 
                    class="input input-warning w-full" 
                    min="${new Date().toISOString().slice(0, 16)}"
                />`;

                const result = await unity.showDialogConfirm({
                    title: "Select Expiration Date",
                    content: content,
                });

                if (result.confirm && result.value) {
                    const confirm = await unity.showDialogConfirm({
                        title: "Confirm Action?",
                        content: `Proceed with changing expiry date to ${unity.dateTimeToStr(result.value)}`,
                    });
                    if (!confirm.confirm) {
                        return;
                    }
                } else {
                    return;
                }

                //unity.logger.debug(ids)

                const formData = new FormData();
                formData.append("ids", ids);
                formData.append("value", `expire_date_time=${result.value}`);

                const _reply = await unity.fetchApi("/api/member/user/set", "post", formData, "json");
                if (_reply.success) {
                    unity.showDialogSuccess({
                        title: "Operation Completed",
                        msg: `Successfully updated ${_reply.data} records`,
                    });
                    member_user_model_table.reload();
                } else {
                    unity.showDialogWarning({
                        title: "Operation Failed",
                        msg: _reply.msg,
                    });
                }
                unity.logger.debug(_reply);
            }
        } else {
            unity.showDialogWarning({ title: "Selection Required", msg: "Please select records before proceeding" });
        }
    }

    async function member_user_table_remove() {
        const c = table_data.rows({ selected: true }).count();
        if (c) {
            if (!(await unity.dialogConfirm())) return;

            const result = await unity.showDialogConfirm({
                title: "Confirm Action?",
                content:
                    "Deletion cannot be undone. Associated cards for this user will also be permanently deleted. Confirm deletion?",
            });
            if (result.confirm) {
                let ids = "";
                for (let i = 0; i < c; i++) {
                    const items = table_data.rows({ selected: true }).data()[i].Member_User.id;
                    ids += `${items},`;
                }
                const formData = new FormData();
                formData.append("ids", ids);
                const respond = await unity.fetchApi("/api/member/user", "delete", formData, "json");
                if (respond.success) {
                    unity.showDialogSuccess({
                        title: "Operation Completed",
                        msg: respond.msg,
                    });
                    member_user_model_table.reload();
                }
                console.log(respond);
            }
        } else {
            unity.showDialogWarning({
                title: "Selection Required",
                msg: "Please select records before proceeding",
            });
        }
    }

    switch (cmd) {
        case "select":
            row_select(true);
            break;
        case "deselect":
            row_select(false);
            break;
        case "enable":
            member_user_table_selete_enable(true);
            break;
        case "disable":
            member_user_table_selete_enable(false);
            break;
        case "set_member_user":
            member_user_table_set_member_user();
            break;
        case "set_expire":
            member_user_table_set_expire();
            break;
        case "remove":
            member_user_table_remove();
            break;

        default:
            console.log("member_user_table_control undefined : ", cmd);
            break;
    }
}

// member user permission
// 📌 init member user permission
const member_user_permission_item_model = new table_class.ItemModel(
    "box_of_member_user_permission",
    "template_content_member_user_permission",
    Modal_Member_User_Permission,
    "/api/member/user_permission",
    {
        // add_new_button: document.getElementById("btn_add_auto_module"),
        add_new_item_template: document.getElementById("template_add_item"),
        on_item_init: async (item, fragment) => {
            const statusEl = fragment.querySelector('[data-field="status"]');
            if (statusEl) {
                const statusVal = String(item.status || "")
                    .trim()
                    .toUpperCase();
                statusEl.classList.remove(
                    "badge-success",
                    "badge-error",
                    "badge-warning",
                    "badge-outline",
                    "badge-soft",
                );
                if (statusVal === "NORMAL" || statusVal === "ENABLE") {
                    statusEl.classList.add("badge-success", "badge-outline");
                } else if (statusVal === "DISABLE") {
                    statusEl.classList.add("badge-error", "badge-outline");
                } else {
                    statusEl.classList.add("badge-warning", "badge-outline");
                }
            }
        },
    },
);

// permission role
// 📌 init permission_role
const permission_role_item_model = new table_class.ItemModel(
    "box_of_permission_role",
    "template_content_permission_role",
    Modal_Permission_Role,
    "/api/member/permission_role",
    {
        // add_new_button: document.getElementById("btn_add_auto_module"),
        add_new_item_template: document.getElementById("template_add_item"),
    },
);

// Member Cards Table
const member_model_table = new table_class.TableModel(
    "#member_table",
    "/api/member/datatable",
    {
        table: "Member",
        select: true,
        columns: [
            {
                data: "Member.id",
                title: `<h3>Management</h3>`,
                className: "noExport",
                orderable: false,
                render: function (data, type, row) {
                    return table_class.actionButtonsTemplate(row.id);
                },
            },
            {
                data: "Member.card_id",
                title: "Card ID / Plate",
                render: function (data, type, row) {
                    data = row.card_id;
                    //return String(data).padStart(6, "0");
                    return String(data);
                },
            },
            {
                data: "Member_User.name",
                title: "Cardholder Name",
                render: function (data, type, row) {
                    data = row.name;
                    if (data) {
                        return data;
                    }
                    return `<span class="badge badge-warning badge-sm">No Cardholder Name</span>`;
                },
            },
            {
                data: "Member_Type.name",
                title: "Type",
                name: "member_type_name",
                render: function (data, type, row) {
                    return row.member_type_name;
                },
            },
            {
                data: "Member.create_date_time",
                title: "Issue Date",
                render: function (data, type, row) {
                    data = row.create_date_time;
                    const _d = unity.dateTimeToStr(data);
                    return _d;
                },
            },
            {
                data: "Member.start_date_time",
                title: "📅 Start Date",
                render: function (data, type, row) {
                    data = row.start_date_time;
                    const _d = unity.dateTimeToStr(data);
                    return _d;
                },
            },
            {
                data: "Member.expire_date_time",
                title: "📅 Expiry Date",
                render: function (data, type, row) {
                    data = row.expire_date_time;
                    if (data) {
                        return unity.dateTimeToStr(data);
                    }
                    return `<span class="badge badge-error badge-soft">No Expiry Date</span>`;
                },
            },
            {
                title: "Remaining Days",
                orderable: false,
                render: function (data, type, row) {
                    if (!row.expire_date_time) {
                        return `<span class="badge badge-info badge-soft">Unlimited</span>`;
                    }
                    const _now = dayjs();
                    const _d_start = dayjs(row.start_date_time);
                    const _d_end = dayjs(row.expire_date_time);

                    if (_d_start.isValid() && _d_start.isAfter(_now)) {
                        return `<span class="badge badge-warning badge-soft">Not Started</span>`;
                    }
                    if (_d_end.isValid() && _d_end.isAfter(_now)) {
                        const _days = _d_end.diff(_now, "day");
                        let _expire_date_time = `${_days} days`;
                        if (_days < 1) {
                            const _hours = _d_end.diff(_now, "hour");
                            if (_hours >= 1) {
                                _expire_date_time = `${_hours} hours`;
                            } else {
                                const _mins = _d_end.diff(_now, "minute");
                                _expire_date_time = _mins > 0 ? `${_mins} mins` : `< 1 min`;
                            }
                        }
                        return `<span class="badge badge-success badge-soft badge-lg">${_expire_date_time}</span>`;
                    }
                    return `<span class="badge badge-error badge-soft badge-lg">Expired</span>`;
                },
            },
            {
                data: "Member.status",
                title: "Status",
                render: function (data, type, row) {
                    data = row.status;
                    if (data == "NORMAL") {
                        return `<span class="badge badge-success badge-soft">${data}</span>`;
                    } else if (data == "DISABLE") {
                        return `<span class="badge badge-error badge-soft">Suspended</span>`;
                    } else {
                        return `<span class="badge badge-warning badge-soft">${data}</span>`;
                    }
                },
            },
            {
                data: "Member_User.status",
                title: "Cardholder Status",
                render: function (data, type, row) {
                    data = row.status;
                    if (data) {
                        return data;
                    }
                    return "";
                },
            },
            {
                data: "Vehicle_Type.name",
                title: "Vehicle Type",
                name: "vehicle_type_name",
                render: function (data, type, row) {
                    data = row.vehicle_type_name;
                    if (data) {
                        return data;
                    }
                    return "";
                },
            },
            {
                data: "Fuel_Type.name",
                title: "Fuel Type",
                name: "fuel_type_name",
                render: function (data, type, row) {
                    data = row.fuel_type_name;
                    if (data) {
                        return data;
                    }
                    return "";
                },
            },
            {
                data: "Member.vehicle_model",
                title: "Make / Model",
                render: function (data, type, row) {
                    data = row.vehicle_model;
                    if (data) {
                        return data;
                    }
                    return "";
                },
            },
            {
                data: "Member.vehicle_color",
                title: "Color",
                render: function (data, type, row) {
                    data = row.vehicle_color;
                    if (data) {
                        return data;
                    }
                    return "";
                },
            },
            {
                data: "Member.remark",
                title: "Remarks",
                render: function (data, type, row) {
                    const remark = row.remark;
                    return remark;
                    if (!remark) return '<span class="text-base-content/30 italic">-</span>';
                    const safe = unity.escapeHtml(remark);
                    return `
                        <div class="tooltip tooltip-bottom max-w-55 text-left" data-tip="${safe}">
                            <span class="block truncate max-w-50 text-base-content/80">
                                ${safe}
                            </span>
                        </div>`;
                },
            },
        ],
        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            // console.log(aData);
            if (aData.status == "DISABLE") {
                nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-error/50"));
            }
        },
    },
    {
        addbtn: false,
        callback: async function (type, row) {
            // console.log("🚀 ", type);
            if (type == "reload") {
                const respond = await unity.fetchApi("/api/member/type/summary", "get", null, "json");
                if (respond.success) {
                    const data = respond.data;
                    // console.log(data);
                    let total = 0;
                    let el_total = null;
                    manager_info_member_box.member_type_boxs.forEach((el) => {
                        const id = Number(el.dataset.id);
                        if (id == 0) {
                            el_total = el;
                            return;
                        }
                        const found = data.find((item) => item.id === id);
                        if (found) {
                            el.textContent = found.count_member;
                            total += found.count_member;
                        } else {
                            el.textContent = 0;
                        }
                    });
                    el_total.textContent = total;
                }
            }
        },
    },
);

member_model_table.create_item_control({
    modal_from: Modal_Member,
    api_endpoint: "/api/member",
});

// LINE Member Table
const line_member_model_table = new table_class.TableModel(
    "#line_member_table",
    "/api/member/line_user/datatable",
    {
        table: "Line_Member",
        // select: true,
        columns: [
            {
                data: "Line_Member.id",
                title: `<h3>Management</h3>`,
                orderable: false,
                render: function (data, type, row) {
                    return table_class.actionButtonsTemplate(row.id);
                },
            },
            {
                data: "Line_Member.type",
                title: "Member Type",
                render: function (data, type, row) {
                    return row.type;
                },
            },

            {
                data: "Line_Member.picture_url",
                title: "Line-Profile",
                orderable: false,
                className: "noExport",

                render: function (data, type, row) {
                    // console.log(row);
                    data = row.picture_url;
                    if (data) {
                        return `<a href="${data}" target = "_blank" ><img loading="lazy" class=" rounded-box max-w-12 ring-2 ring-primary" src="${data}"> </a>`;
                    } else {
                        return "";
                    }
                },
            },
            {
                data: "Line_Member.display_name",
                title: "Line Name",
                render: function (data, type, row) {
                    return row.display_name;
                },
            },

            {
                data: "Line_Member.status",
                title: "Status",
                render: function (data, type, row) {
                    return row.status;
                },
            },

            {
                data: "member_users_name",
                title: "Member / Unit / Cardholder",

                render: function (data, type, row) {
                    data = row.member_users_name;
                    let member_names = "Unassigned";
                    if (data) {
                        const datas = data.split(",").sort();
                        member_names = "";
                        for (let i = 0; i < datas.length; i++) {
                            member_names += `<div class="badge badge-primary badge-soft">${datas[i]}</div>`;
                        }
                    }
                    return `<div class="flex flex-col gap-1">${member_names}</div>`;
                },
            },
            {
                data: "Line_Member.last_msg",
                title: "Message",
                render: function (data, type, row) {
                    return row.last_msg;
                },
            },
        ],
        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            // unity.logger.info(aData);

            switch (aData.status) {
                case "info":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-success/50"));
                    break;
                case "warning":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-warning/50"));
                    break;
                case "BLOCK":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-error/50"));
                    break;
                default:
                    break;
            }
            switch (aData.type) {
                case "MEMBER-NOTIFY":
                    nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-blue-500/50"));
                    break;
                // case "MEMBER-NOTIFY":
                //     nRow.querySelectorAll("td").forEach((td) => td.classList.add("bg-success/50"));
                //     break;
                default:
                    break;
            }
        },
    },
    {},
);

line_member_model_table.create_item_control({
    modal_from: Modal_Line_Member,
    api_endpoint: "/api/member/line_user",
});

// ! ------------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("MEMBER_MANAGER_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("MEMBER_MANAGER_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
}

async function init_select_option() {
    unity.init_select_option(Modal_Member_Type, "/api/service_fees", "service_fees_id");
    unity.init_select_option(Modal_Member_Type, "/api/member/permission_role", "permission_role_id");
    unity.init_select_option(Modal_Member_User, "/api/member/user_permission", "member_user_permission_id");

    unity.init_select_option(Modal_Member, "/api/vehicle_type", "vehicle_type_id");
    unity.init_select_option(Modal_Member, "/api/fuel_type", "fuel_type_id");

    unity.init_selects_option(
        [
            manager_info_member_box.filter_member_user_element,
            Modal_Member.querySelector('[data-field="member_user_id"]'),
            Modal_Member_Add.querySelector('[data-field="member_user_id"]'),
            Modal_Line_Member.querySelector('[data-field="member_user_ids"]'),
        ],
        "/api/member/user",
    );
    unity.init_selects_option(
        [
            manager_info_member_box.filter_member_type_element,
            Modal_Member.querySelector('[data-field="member_type_id"]'),
            Modal_Member_Add.querySelector('[data-field="member_type_id"]'),
        ],
        "/api/member/type",
    );

    unity.init_selects_option(
        [Modal_Member_User.querySelector('[data-field="customer_id"]')],
        "/api/customer",
        "customer_name",
    );

    unity.init_selects_option([Modal_Member_User.querySelector('[data-field="group_id"]')], "/api/member/group");
    unity.init_selects_option(
        [Modal_Member_User.querySelector('[data-field="access_role_id"]')],
        "/api/access_control/role",
    );
}

async function member_model_table_set_filter() {
    member_model_table.data_status = manager_info_member_box.filter_status_element.value;
    member_model_table.data_type = manager_info_member_box.filter_member_type_element.value;
    const data_filter = { member_user_id: manager_info_member_box.filter_member_user_element.value };
    member_model_table.data_filter = JSON.stringify(data_filter);
    console.log(
        "📌 member_filter : ",
        member_model_table.data_status,
        member_model_table.data_type,
        member_model_table.data_filter,
    );
}

async function Init() {
    init_manager_info_member_box();
    await init_select_option();

    group_member_model_table.init();
    member_type_model_table.init();
    line_member_model_table.init();

    member_user_model_table.init();
    member_model_table_set_filter();

    member_model_table.init();

    member_user_permission_item_model.init();
    permission_role_item_model.init();

    // await init_info_member_user_permission();
    // await init_info_permission_role();
    const default_tab = "MEMBER_MANAGER_TAB01";

    if (localStorage.getItem("MEMBER_MANAGER_TAB_ACTIVE")) {
        const v = localStorage.getItem("MEMBER_MANAGER_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    } else {
        document.getElementById(default_tab).checked = true;
    }
    // unity.initSelect2();
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
