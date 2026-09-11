import * as unity from "./unity.js";

const HEADERS = await unity.getHeaders();
// console.log("_table_class.js", HEADERS);

export class TableModel {
    /**
     * Creates a new TableModel instance
     *
     * @constructor
     * @param {string} selector - Table CSS selector, e.g. "#member_table"
     * @param {string} dataServer - API URL for loading DataTables data
     * @param {Object} [options={}] - DataTables configuration options, e.g. columns, paging, select
     * @param {Object} [model_options={}] - Model options e.g. callback handlers
     *
     * @example
     * const t = new TableModel(
     *     "#table_member",
     *     "/api/member/datatable",
     *     { select: true },
     *     (type, row) => { console.log(type, row); }
     * );
     */
    constructor(selector, dataServer, options = {}, model_options = {}) {
        this.selector = selector;
        this.dataServer = dataServer;
        this.options = options;
        this.model_options = model_options;
        this._on_loaded = model_options.on_loaded || null;
        this._callback = model_options.callback || null;
        this.model_control = null;

        // DataTable instance
        this.table = null;

        // Initialize filter as empty object
        this._filter = "";
        this.data_filter = null;
        this.date_range = null;
        this.data_type = null;
        this.data_status = null;
        this.data_custom_filter = null;

        // Generate default columns if not provided
        if (!options.columns) {
            console.log("Generating default columns");
            const colKey = `${options.table}.id`;
            this.options.columns = [
                {
                    data: colKey,
                    title: colKey,
                    render: (data, type, row) => row.id || `${colKey} not found`,
                },
            ];
        }
        // console.log("TableModel created:", this.options.columns);
    }

    /* ----------------------------------------------------
     * GET / SET filter
     * -------------------------------------------------- */
    get filter() {
        return this._filter;
    }

    set filter(val) {
        this._filter = val || {};
        // console.log("🧾 TableModel filter changed:", this._filter);

        // Automatically reload table when filter changes
        // if (this.table) this.reload();
    }

    addDefaultButtons() {
        if (!this.table) return;

        const self = this;

        this.table
            .buttons()
            .container()
            .appendTo(
                $(this.selector + "_wrapper .col-md-6:eq(0)"), // Button container location
            );

        if (this.model_options.addbtn === true) {
            this.table.button().add(null, {
                text: '<div class="tooltip tooltip-top" data-tip="Add New"><i class="fa-solid fa-file-circle-plus fa-2x text-secondary"></i></div>',
                className: "!btn btn-sm btn-ghost",
                titleAttr: "Add New",
                action: () => {
                    this.model_control?.add();
                },
            });
        }

        if (this.model_options.addbtn_extra_id) {
            const addbtn_extra_el = document.getElementById(this.model_options.addbtn_extra_id);
            if (addbtn_extra_el) {
                addbtn_extra_el.addEventListener("click", () => this.model_control?.add());
            }
        }

        // Add standard action buttons
        this.table.button().add(null, {
            text: '<div class="tooltip tooltip-top" data-tip="Reload"><i class="fa-solid fa-rotate fa-2x text-primary "></i></div>',
            className: "!btn btn-sm btn-ghost !overflow-visible",
            action: (e, dt, node, config) => {
                this.reload();
            },
        });

        this.table.button().add(null, {
            extend: "excelHtml5",
            text: '<div class="tooltip tooltip-top" data-tip="Export Excel"><i class="fa-regular fa-file-excel fa-2x text-success"></i></div>',
            className: "!btn btn-sm btn-ghost !overflow-visible",
            titleAttr: "Export to Excel",
            filename: function () {
                return `export_${dayjs().format("YYYYMMDD_HHmmss")}`;
            },
            exportOptions: {
                columns: ":visible:not(.noExport)",
            },
            // Override button to export via API endpoint
            action: async function (e, dt, node, config) {
                unity.showDialogLoading("⏳ Generating Excel export...");

                try {
                    // Extract latest search/filter parameters
                    const params = dt.ajax.params() || {};
                    // Fetch all matching records without pagination limit (length: -1)
                    params.start = 0;
                    params.length = -1;
                    // Add query string parameter indicating export action
                    params.export = "excel";

                    const queryString = $.param(params);

                    // Properly append query parameters to URL
                    const separator = self.dataServer.indexOf("?") !== -1 ? "&" : "?";
                    const exportUrl = `${self.dataServer}${separator}${queryString}`;

                    // Fetch binary file response (Blob)
                    // const response = await fetch(exportUrl, { method: "GET" });
                    const response = await unity.fetchApi(exportUrl, "get", null, "blob", true, 30000);
                    if (!response.ok) throw new Error("Export failed");

                    const blob = await response.blob();

                    // Extract filename from Content-Disposition header or fallback to default
                    const disposition = response.headers.get("content-disposition");
                    let filename = `export_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;
                    if (disposition && disposition.indexOf("attachment") !== -1) {
                        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                        const matches = filenameRegex.exec(disposition);
                        if (matches != null && matches[1]) {
                            filename = matches[1].replace(/['"]/g, "");
                        }
                    }

                    // Trigger client-side file download
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = downloadUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(downloadUrl);

                    // Close loader and show success notification
                    unity.closeDialogLoading();
                    // unity.showDialogSuccess({
                    //     title: "Download Success",
                    //     msg: `Excel file exported successfully`,
                    // });
                } catch (error) {
                    console.error("Export error:", error);
                    unity.closeDialogLoading();
                    unity.showDialogError({
                        title: "Export Error",
                        msg: error.message || "Unable to export data",
                    });
                }
            },
        });

        this.table.button().add(null, {
            extend: "csvHtml5",
            title: "export_csv",
            text: '<div class="tooltip tooltip-top" data-tip="Export CSV"><i class="fa-solid fa-file-csv fa-2x text-error"></i></div>',
            className: "!btn btn-sm btn-ghost !overflow-visible",
            filename: function () {
                return `export_${dayjs().format("YYYYMMDD_HHmmss")}`;
            },
            exportOptions: {
                columns: ":visible:not(.noExport)",
            },
            // Override button to export CSV via API endpoint
            action: async function (e, dt, node, config) {
                unity.showDialogLoading("⏳ Generating CSV export...");

                try {
                    // Extract latest search/filter parameters
                    const params = dt.ajax.params() || {};
                    // Fetch all matching records without pagination limit (length: -1)
                    params.start = 0;
                    params.length = -1;
                    // Add query string parameter indicating export action
                    params.export = "csv";

                    const queryString = $.param(params);

                    // Properly append query parameters to URL
                    const separator = self.dataServer.indexOf("?") !== -1 ? "&" : "?";
                    const exportUrl = `${self.dataServer}${separator}${queryString}`;

                    // Fetch binary file response (Blob)
                    const response = await unity.fetchApi(exportUrl, "get", null, "blob", true, 30000);
                    if (!response.ok) throw new Error("Export failed");

                    const blob = await response.blob();

                    // Extract filename from Content-Disposition header or fallback to default
                    const disposition = response.headers.get("content-disposition");
                    let filename = `export_${dayjs().format("YYYYMMDD_HHmmss")}.csv`;
                    if (disposition && disposition.indexOf("attachment") !== -1) {
                        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                        const matches = filenameRegex.exec(disposition);
                        if (matches != null && matches[1]) {
                            filename = matches[1].replace(/['"]/g, "");
                        }
                    }

                    // Trigger client-side file download
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = downloadUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(downloadUrl);

                    // Close loader and show success notification
                    unity.closeDialogLoading();
                    // unity.showDialogSuccess({
                    //     title: "Download Success",
                    //     msg: `CSV file exported successfully`,
                    // });
                } catch (error) {
                    console.error("Export error:", error);
                    unity.closeDialogLoading();
                    unity.showDialogError({
                        title: "Export Error",
                        msg: error.message || "Unable to export data",
                    });
                }
            },
        });

        // this.table.button().add(null, {
        //     extend: "print",
        //     text: '<div class="tooltip tooltip-top" data-tip="Print Table Report"><i class="fa-solid fa-print fa-2x text-info"></i></div>',
        //     className: "!btn btn-sm btn-ghost !overflow-visible",
        //     title: "",
        //     messageTop: unity.exportLayout.htmlHeader,
        //     exportOptions: {
        //         columns: ":visible:not(.noExport)",
        //     },
        // });

        // Add Report Summary button
        if (this.model_options.add_btn_report_summary) {
            const add_btn_report_summary = this.model_options.add_btn_report_summary;
            console.log("add_btn_report_summary", add_btn_report_summary);
            this.table.button().add(null, {
                name: "report_summary_btn",
                text: '<div class="tooltip tooltip-top" data-tip="Summary Report"><i class="fa-solid fa-file-lines fa-2x text-info"></i></div>',
                className: "!btn btn-sm btn-ghost !overflow-visible",
                action: async function (e, dt, node, config) {
                    unity.showDialogLoading("⏳ Generating report...");

                    try {
                        const params = dt.ajax.params() || {};
                        params.start = 0;
                        params.length = -1;
                        const queryString = $.param(params);
                        const separator = self.dataServer.indexOf("?") !== -1 ? "&" : "?";
                        const exportUrl = `${self.dataServer}${separator}${queryString}`;
                        const response = await unity.fetchApi(exportUrl, "get", null, "json", true, 30000);
                        console.log(response);
                        unity.closeDialogLoading();
                        if (!response.data) throw new Error("Report failed");
                        const allData = response.data;
                        if (add_btn_report_summary.fn) add_btn_report_summary.fn(allData);
                    } catch (error) {
                        console.error("Export error:", error);
                        unity.closeDialogLoading();
                        unity.showDialogError({
                            title: "Report Error",
                            msg: error.message || "Unable to generate report",
                        });
                    }
                },
            });
        }

        this.table.button().add(null, {
            extend: "colvis",
            text: '<div class="tooltip tooltip-top" data-tip="Show/Hide Columns"><i class="fa-solid fa-list-check fa-2x text-warning"></i></div>',
            className: "!btn btn-sm btn-ghost !overflow-visible",
            columns: ":gt(0)",
        });
        this.table.button().add(null, {
            text: '<div class="tooltip tooltip-top" data-tip="Table Settings"><i class="fa-solid fa-table fa-2x text-secondary "></i></div>',
            className: "!btn btn-sm btn-ghost !overflow-visible",
            action: (e, dt, node, config) => {
                const table_page_mode = localStorage.getItem("table_page_mode");
                if (table_page_mode === "true") {
                    localStorage.setItem("table_page_mode", "false");
                } else {
                    localStorage.setItem("table_page_mode", "true");
                }
                location.reload();
            },
        });
    }

    /* ----------------------------------------------------
     * INIT TABLE
     * -------------------------------------------------- */
    init() {
        if (!this.selector) {
            console.error("❌ selector not provided");
            return;
        }

        const selector = $(this.selector);
        const tag = selector.prop("tagName")?.toLowerCase();
        // ---------------------------------------
        // If selector is a DIV container, automatically build TABLE element
        // ---------------------------------------
        if (tag === "div") {
            const table_id = `${selector.attr("id")}_model`;

            // ---------------------------------------
            // Automatically build THEAD and TFOOT
            // ---------------------------------------
            let thead = "";
            let tfoot = "";

            if (Array.isArray(this.options.columns)) {
                thead = "<thead><tr>";
                tfoot = "<tfoot><tr>";

                this.options.columns.forEach((col) => {
                    const title = col.title || "";
                    thead += `<th>${title}</th>`;
                    tfoot += `<th></th>`; // Empty column placeholder for footerCallback
                });

                thead += "</tr></thead>";
                tfoot += "</tr></tfoot>";
            }

            // ---------------------------------------
            // If no footerCallback, omit tfoot element
            // ---------------------------------------
            const needFooter = typeof this.options.footerCallback === "function";
            const html = `
                <table id="${table_id}" class="table table-zebra w-full">
                    ${thead}
                    ${needFooter ? tfoot : ""}
                </table>
            `;

            selector.html(html);
            this.selector = `#${table_id}`;
        }

        const table_name = this.options.table || null;

        // ---------------------------------------
        // INIT DATATABLE
        // ---------------------------------------
        this.table = $(this.selector).DataTable({
            buttons: [],
            ajax: {
                headers: HEADERS,
                type: "GET",
                url: this.dataServer,
                data: (d) => {
                    d.table = table_name;
                    d.filter = this._filter || "";
                    if (this.data_filter) d.data_filter = this.data_filter;
                    if (this.date_range) d.date_range = this.date_range;
                    if (this.data_type) d.data_type = this.data_type;
                    if (this.data_status) d.data_status = this.data_status;
                    if (this.data_custom_filter) {
                        for (const [key, value] of Object.entries(this.data_custom_filter)) {
                            d[key] = value;
                        }
                    }
                    // console.log(d);
                },
                error: function (xhr, textStatus, errorThrown) {
                    console.error("❌ Ajax error:", table_name, textStatus);
                },
            },
            // columns: this.options.columns,
            ...this.options,
        });
        try {
            this.table.settings()[0]._cols = this.options.columns;
        } catch (error) {
            console.error("❌ Table not initialized ID:", this.selector);
            return;
        }

        // ---------------------------------------
        // EVENTS
        // ---------------------------------------
        console.log("✅ Table initialized:", this.options.table, this.selector);
        this.addDefaultButtons();

        if (this._callback) {
            ["select", "deselect"].forEach((eventType) => {
                this.table.on(eventType, (e, dt, type, indexes) => {
                    const row = dt.row(indexes[0]).data();
                    this._callback(eventType, row);
                });
            });

            this.table.on("xhr.dt", (e, settings, json, xhr) => {
                this._callback("reload", "");
            });
        }

        // handle edit button
        $(this.selector).on("click", ".control-edit-btn", (e) => {
            const id = e.currentTarget.dataset.id;
            this.model_control?.manager(id);
        });

        // handle delete button
        $(this.selector).on("click", ".control-remove-btn", (e) => {
            const id = e.currentTarget.dataset.id;
            this.model_control?.remove(id);
        });

        if (this._on_loaded && typeof this._on_loaded === "function") {
            this._on_loaded();
        }
        // console.log("init options:", this.table);
        // console.log("state():", this.table.state());
        // this.table.on("stateSaveParams.dt", (e, s, data) => console.log("SAVE:", data));

        return this;
    }

    /* ----------------------------------------------------
     * UTILS
     * -------------------------------------------------- */
    reload() {
        this.table?.ajax?.reload(null, false);
    }

    clear() {
        this.table?.clear().draw();
    }

    getSelected() {
        if (!this.table) return null;
        const rows = this.table.rows({ selected: true }).data();
        return rows.length ? rows[0] : null;
    }

    /* ----------------------------------------------------
     * DESTROY
     * -------------------------------------------------- */
    destroy() {
        if (this.table) {
            this.table.destroy(true);
            this.table = null;
        }
    }

    // Create model item Control

    /**
     * Generates model_control for modal CRUD management (create/update)
     *
     * @param {Object} control_data - Configuration data for controls
     * @param {HTMLDialogElement} control_data.modal_from - Target modal dialog
     */
    create_item_control(control_data = {}) {
        // console.log("create_item_control", data);

        const api_enpoint = control_data.api_endpoint;
        console.log("api_enpoint", api_enpoint);
        if (!api_enpoint) {
            console.error("❌ api_endpoint not provided");
            return;
        }
        const model_control = {};
        const modal = control_data.modal_from;

        model_control.add = async (option = {}) => {
            console.log("🆕 model_control add new record");
            const btn_submit = modal.querySelector('[data-field="btn_submit"]');
            btn_submit.onclick = async function () {
                model_control.update(0);
            };
            unity.clear_fields(modal);
            if (control_data.add_callback) {
                await control_data.add_callback(modal);
            }
            if (option.init_data) {
                console.log("init_data", option.init_data);
                unity.data2fields(option.init_data, modal);
            }
            modal.showModal();
        };
        model_control.update = async (id) => {
            if (id == 0) {
                console.log("🆕 model_control submit new record");
            }
            const formData = unity.fields2formData(modal);
            if (formData) {
                formData.append("id", id);
                if (control_data.update_callback) {
                    await control_data.update_callback(formData, modal);
                }
                try {
                    unity.showDialogLoading("⏳ Updating record...");
                    unity.debugForm(formData);
                    const response = await unity.fetchApi(api_enpoint, "post", formData, "json");
                    if (response.success) {
                        await unity.delay(500);
                        unity.closeDialogLoading();
                        unity.showDialogSuccess({
                            msg: `✅ Record updated successfully<br>${response.msg}`,
                        });
                        await unity.delay(500);
                        modal.close();
                        this.reload();
                        if (control_data.success_callback) {
                            control_data.success_callback(id);
                        }
                    } else {
                        unity.showDialogError({ msg: response.msg || "❌ Failed to update record" });
                    }
                } catch (err) {
                    console.error("❌ record error:", err);
                    unity.showDialogError({ msg: err.message || "Failed to update record" });
                } finally {
                    unity.closeDialogLoading();
                }
            }
        };
        model_control.manager = async (id) => {
            const btn_submit = modal.querySelector('[data-field="btn_submit"]');
            btn_submit.onclick = async function () {
                model_control.update(id);
            };
            let data = null;
            if (id == 0) {
                unity.clear_fields(modal);
            } else {
                try {
                    unity.showDialogLoading("⏳ Loading data...");
                    const _reply = await unity.fetchApi(`${api_enpoint}?id=${id}`, "get", null, "json");
                    if (_reply.success) {
                        data = _reply.data;
                        // console.log(_reply.data);
                        unity.data2fields(data, modal);
                        if (control_data.manager_callback) {
                            await control_data.manager_callback(data, modal);
                        }
                        await unity.delay(500);
                    } else {
                        console.error("❌ success false :", _reply.msg || "Format error / Unable to load data");
                        unity.showDialogError({ msg: _reply.msg || JSON.stringify(_reply) });
                        return;
                    }
                } catch (error) {
                    console.error("❌ record error:", error);
                    unity.showDialogError({
                        title: "Error-TableModal(CODE-001)",
                        msg: error.message || "Unable to load data",
                    });
                    return;
                } finally {
                    unity.closeDialogLoading();
                }
            }
            modal.showModal();
        };

        model_control.remove = async (id) => {
            // Confirm before deleting record
            const result = await unity.dialogConfirm({ content: "Are you sure you want to delete this data?" });
            if (!result) return;

            try {
                unity.showDialogLoading("⏳ Waiting...");
                // Dispatch DELETE request to API
                const response = await unity.fetchApi(`${api_enpoint}?id=${id}`, "delete", null, "json");
                if (response.success) {
                    unity.showDialogSuccess({ msg: response.msg || "✅ Delete successfully!" });
                    await unity.delay(500);
                    unity.closeDialogLoading();

                    // Close modal dialog if open
                    if (modal?.open) modal.close();

                    this.reload();
                } else {
                    unity.showDialogWarning({ msg: response.msg || "⚠️ Delete failed!" });
                }
            } catch (error) {
                console.error("❌ record error:", error);
                unity.showDialogError({ msg: error.message || "Delete failed!" });
            } finally {
                unity.closeDialogLoading();
            }
        };
        this.model_control = model_control;
    }
}

// class itemView

export class ItemModel {
    constructor(container_id, item_template_id, itemModal, dataServer, options = {}) {
        this.container_id = container_id;
        this.container = document.getElementById(container_id);
        this.itemTempplate = document.getElementById(item_template_id);
        this.itemModal = itemModal;
        this.dataServer = dataServer;
        this.options = options;
    }
    async manager_item(id) {
        const modal = this.itemModal;
        const btn_submit = modal.querySelector('[data-field="btn_submit"]');
        const btn_remove = modal.querySelector('[data-field="btn_remove"]');
        btn_submit.onclick = (e) => {
            this.update_item(id);
        };
        if (id) {
            console.log("📝 edit item id:", id);

            const respond = await unity.fetchApi(`${this.dataServer}?id=${id}`, "get", null, "json");
            if (respond.success) {
                const data = respond.data;
                // console.log(data);
                unity.data2fields(data, modal);
                btn_remove.onclick = (e) => {
                    this.remove_item(id);
                };

                btn_remove.classList.remove("hidden");
            }
        } else {
            console.log("🆕 create new item");
            unity.clear_fields(modal);
            btn_remove.classList.add("hidden");
        }

        modal.showModal();
    }

    async update_item(id) {
        const modal = this.itemModal;
        const formData = unity.fields2formData(modal);
        if (!formData) return;
        formData.append("id", id);
        unity.debugForm(formData);

        let respond = await unity.fetchApi(this.dataServer, "post", formData, "json");
        if (respond.success == true) {
            unity.showDialogSuccess({ title: "Successful", msg: respond.msg });
            if (id == 0) {
                console.log("✅ Add item", respond.data);
                window.location.reload();
            } else {
                console.log("✅ Updated item id:", id, respond.data);
                const targetId = `${this.container_id}_${id}`;
                // Find element matching data-item-id
                const element = document.querySelector(`[data-item-id="${targetId}"]`);

                if (element) {
                    // console.log("Found it!", element);
                    console.log("🆔 element_id.dataset.itemId", element.dataset.itemId);
                    // Update data attributes on target element
                    unity.update_data2fields(respond.data, element);
                } else {
                    console.log("Not found.");
                }
            }
            // this.init();
            modal.close();
        } else {
            unity.logger.debug(respond);
            unity.showDialogError({ msg: JSON.stringify(respond) });
        }
    }

    async remove_item(id) {
        const modal = this.itemModal;
        const is_confirm = await unity.showDialogConfirm({
            title: "Confirm Action",
            content: "Are you sure you want to delete this record?",
        });
        if (!is_confirm.confirm) return;
        const _reply = await unity.fetchApi(`${this.dataServer}?id=${id}`, "delete", null, "json");
        unity.logger.debug(_reply);
        if (_reply.success) {
            unity.showDialogSuccess({ title: "Successful", msg: _reply.msg });
            this.init();
            modal.close();
        } else {
            unity.logger.debug(_reply);
            unity.showDialogError({ msg: JSON.stringify(_reply) });
        }
    }
    async init() {
        let data_count = 0;
        const response = await unity.fetchApi(this.dataServer, "get", null, "json");
        if (!this.container) {
            unity.showDialogError({ title: "Error@ItemModel.init()", msg: "container not found" });
            return;
        }
        this.container.innerHTML = "";
        // console.log(response);
        if (response.success) {
            const template = this.itemTempplate;
            const items = response.data;
            const action_buttons = [];
            action_buttons.push({
                field: "btn_manager",
                icon: "fas fa-gear text-white fa-2x",
                tooltip: "Edit",
                class: "btn btn-primary btn-square",
                click: (item) => this.manager_item(item.id),
            });

            if (this.options.action_buttons) {
                this.options.action_buttons.forEach((action_button) => {
                    action_buttons.push(action_button);
                });
            }

            for (const item of items) {
                const fragment = template.content.cloneNode(true);
                unity.data2fields(item, fragment);
                const action_container = fragment.querySelector('[data-field="action_container"]');
                if (action_container) {
                    action_container.innerHTML = "";
                    for (const btn of action_buttons) {
                        const el = document.createElement("button");
                        el.setAttribute("data-auto-button", "1");
                        el.className = btn.class || "btn btn-sm btn-primary";
                        if (btn.icon && btn.text) {
                            el.innerHTML = `<i class="${btn.icon}"></i> ${btn.text}`;
                        } else if (btn.icon) {
                            el.innerHTML = `<i class="${btn.icon}"></i>`;
                        } else {
                            el.innerText = btn.text ?? "";
                        }
                        if (btn.tooltip) {
                            el.setAttribute("data-tip", btn.tooltip);
                            el.classList.add("tooltip", "tooltip-top");
                        }
                        el.addEventListener("click", () => btn.click(item));
                        action_container.appendChild(el);
                    }
                }

                // Supports async/await execution
                if (this.options.on_item_init) {
                    await this.options.on_item_init(item, fragment);
                }
                // ? Add data-item-id for each clone
                if (item.id) {
                    const element_id = fragment.firstElementChild;
                    element_id.dataset.itemId = `${this.container_id}_${item.id}`;
                    // console.log("🆔 element_id.dataset.itemId", element_id.dataset.itemId);
                }
                this.container.appendChild(fragment);
            }
            data_count = items.length;
        } else {
            console.log(response.msg);
            // unity.showDialogError({ msg: response.msg });
        }
        if (this.options.add_new_button) {
            this.options.add_new_button.onclick = () => {
                this.manager_item(0);
            };
        }
        if (this.options.add_new_item_template) {
            const tpl = this.options.add_new_item_template;
            const node = tpl.content.cloneNode(true);
            node.querySelector('[data-field="btn_add_item"]').onclick = () => {
                this.manager_item(0);
            };
            this.container.appendChild(node);
        }
        return data_count;
    }
}

export function init_table_model_with_datatime_picker(table_model, date_time_picker_id, daterangepicker_config) {
    daterangepicker_config = daterangepicker_config || unity.getFlatpickrConfigWithEmbeddedRanges();

    const inputEl = document.querySelector(date_time_picker_id);
    if (!inputEl) {
        console.error("❌ date_time_picker_id not found:", date_time_picker_id);
        return null;
    }

    // Debounce rapid reload events
    let reloadTimer = null;
    const scheduleReload = () => {
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
            table_model.reload();
        }, 200);
    };

    const fp = flatpickr(inputEl, {
        ...daterangepicker_config,

        onClose: (selectedDates, dateStr, instance) => {
            console.log("onValuflatpickreUpdate", dateStr);
            table_model.date_range = dateStr;
            scheduleReload();
        },

        // onReady: (selectedDates, dateStr, instance) => {
        //     console.log("onReady", dateStr);
        // },
    });

    // Default initial state
    table_model.date_range = inputEl.value || "";

    // init datatable
    table_model.init();

    // inputEl.autocomplete = "off";
    // inputEl.autocorrect = "off";
    // inputEl.autocapitalize = "none";
    // inputEl.spellcheck = "false";
    // inputEl.inputmode = "none";
    return fp;
}

export function actionButtonsTemplate(id, opts = {}) {
    const editIcon = opts.editIcon ?? `fas fa-pen text-primary`;
    const removeIcon = opts.removeIcon ?? `far fa-trash-alt text-error`;
    const sizeClass = opts.size ?? "btn-sm";

    if (id) {
        return `
        <div class="inline-flex border border-primary bg-base-300 rounded-box shadow-sm" role="group">
            <button class="btn btn-ghost ${sizeClass} control-edit-btn tooltip tooltip-right" data-tip="Edit" data-id="${id}">
                <i class="${editIcon}"></i>
            </button>
            <button class="btn btn-ghost ${sizeClass} control-remove-btn tooltip tooltip-right" data-tip="Delete" data-id="${id}">
                <i class="${removeIcon}"></i>
            </button>
        </div>
    `;
    } else {
        return "error not id";
    }
}

if (typeof window !== "undefined") {
    window.TableModel = TableModel;
    window.ItemModel = ItemModel;
    window.actionButtonsTemplate = actionButtonsTemplate;
    window.init_table_model_with_datatime_picker = init_table_model_with_datatime_picker;
}

