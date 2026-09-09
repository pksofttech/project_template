import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

const swiper = new Swiper(".mySwiper", {
    speed: 500,
    spaceBetween: 200,
    noSwipingSelector: ".no-swipe",
    // loop: true,
    effect: "coverflow",
    // allowTouchMove: false, // 🔒 disables touch/swipe
    on: {
        slideChange: function () {
            // unity.logger.debug("Slide changed to:", this.activeIndex);
            set_active_dock(this.activeIndex);
        },
    },
});

window.check_member_info = check_member_info;
async function check_member_info() {
    const license_plate = document.getElementById("license_plate_input").value;
    if (license_plate == "") {
        unity.showToastNotification({ icon: "error", msg: "Please enter license plate" });
        return;
    }
    const _reply = await unity.fetchApi(
        `/api/member/tools_permission_check?card_id=${license_plate}`,
        "get",
        null,
        "json",
    );
    // unity.logger.debug(_reply);
    if (_reply.success) {
        const card_data = _reply.data.card_data;
        const card_msg = _reply.data.msg;
        unity.logger.debug(card_data);
        const Member = card_data.Member;
        const Member_Type = card_data.Member_Type;
        const Member_User = card_data.Member_User;
        const Member_User_Permission = card_data.Member_User_Permission;
        const Service_Fees = card_data.Service_Fees;

        Dialog_Member_Info.querySelector('[data-field="name"]').textContent = Member.card_id;
        Dialog_Member_Info.querySelector('[data-field="create_date_time"]').textContent = unity.dateTimeToStr(
            Member.create_date_time,
        );
        Dialog_Member_Info.querySelector('[data-field="start_date_time"]').textContent = unity.dateTimeToStr(
            Member.start_date_time,
        );
        Dialog_Member_Info.querySelector('[data-field="expire_date_time"]').textContent = unity.dateTimeToStr(
            Member.expire_date_time,
        );
        Dialog_Member_Info.querySelector('[data-field="status"]').textContent = Member.status;

        const time_to_use = unity.secondsToDuration(_reply.info.time_to_use > 0 ? _reply.info.time_to_use : 0);
        // Dialog_Member_Info.querySelector('[data-field="day_for_use"]').textContent = time_to_use;
        Dialog_Member_Info.querySelector('[data-field="member_type_name"]').textContent = Member_Type.name;

        Dialog_Member_Info.querySelector('[data-field="remark"]').textContent = card_msg;

        Dialog_Member_Info.querySelector('[data-field="member_name"]').textContent = Member_User.name;
        Dialog_Member_Info.querySelector('[data-field="member_status"]').textContent = Member_User.status;

        Dialog_Member_Info.showModal();
    } else {
        unity.showToastNotification({ icon: "error", msg: _reply.msg });
    }
    document.getElementById("license_plate_input").value = "";
}

const transaction_model_table = new table_class.TableModel("#transaction_table", "/api/transaction_record/datatable", {
    table: "Transaction_Record",
    dom: '<"top"i>rt<"bottom"pl><"clear">',
    columns: [
        {
            data: "in_log.images_path",
            title: `<h3>Image Record</h3>`,
            orderable: false,
            searchable: false,
            render: function (data, type, row) {
                // unity.logger.debug(row);
                data = row.images_path;
                if (data) {
                    const in_images_paths = data.split(",");
                    return `<img loading="lazy" class="duration-500 ease-in rounded-box max-h-10 hover:scale-150" src="${in_images_paths[0]}" onclick="showPreviewImageView('${in_images_paths[0]}');">`;
                } else {
                    return "";
                }
            },
        },
        {
            data: "Transaction_Record.status",
            title: `<h3>Status</h3>`,
            render: function (data, type, row) {
                data = row.status;
                if (data == "SUCCESS") {
                    return `<i class="text-green-500 nav-icon fa fa-circle-check"></i> <span class="badge-success">${data}</span>`;
                } else if (data == "CLOSE") {
                    return `<i class="text-orange-500 nav-icon fa fa-circle-xmark"></i> <span class="badge-warning">${data}</span>`;
                } else if (data == "CHECK_IN") {
                    return `<i class="text-primary nav-icon fa fa-square-parking"></i> <span class="badge-info">PARKED</span>`;
                } else {
                    return data;
                }
            },
        },
        {
            data: "Transaction_Record.type",
            title: `<h3>Type</h3>`,

            render: function (data, type, row) {
                data = row.type;
                if (data == "VISITOR") {
                    return `<i class="text-orange-500 nav-icon fa fa-user-tie"></i> <span class="badge-warning">${data}</span>`;
                }
                return data;
            },
        },
        {
            data: "Transaction_Record.card_id",
            title: "Card ID",
            render: function (data, type, row) {
                data = row.card_id;
                return data;
            },
        },
        {
            data: "in_log.license",
            title: `<h3>License</h3>`,
            filter: { type: "text" },
            render: function (data, type, row) {
                data = row.license;
                return data ? data : "";
            },
        },
        {
            data: "in_log.date_time",
            title: `<h3>Entry Time</h3>`,
            render: function (data, type, row) {
                data = row.date_time;
                const _d = unity.dateTimeToStr(data);
                if (_d == "") {
                    return "";
                }
                const datetime = _d.split(" ");
                const warp_datatime = `<div class="flex flex-col gap-1">
                        <div class="badge-date">${datetime[0]}</div>
                        <div class="badge-time">${datetime[1]}</div>
                        </div>`;
                return warp_datatime;
            },
        },
        {
            data: "in_gate.name",
            title: `<h3>Entry Gate</h3>`,
            render: function (data, type, row) {
                data = row.name;
                return data;
            },
        },
        {
            data: "out_log.date_time",
            title: `<h3>Exit Time</h3>`,
            render: function (data, type, row) {
                data = row.date_time_1;
                const _d = unity.dateTimeToStr(data);
                if (_d == "") {
                    if (row.status == "CHECK_IN") {
                        return `<span class="bg-red-100 text-red-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-box dark:bg-red-900 dark:text-red-300">Still Parked</span>`;
                    } else {
                        return `<span class="badge-warning">Closed by System</span>`;
                    }
                }
                const datetime = _d.split(" ");
                const warp_datatime = `<div class="flex flex-col gap-1">
                        <div class="badge-date">${datetime[0]}</div>
                        <div class="badge-time">${datetime[1]}</div>
                        </div>`;
                return warp_datatime;
            },
        },
        {
            data: "out_gate.name",
            title: `<h3>Exit Gate</h3>`,
            name: "gate_out_name",
            render: function (data, type, row) {
                return row.gate_out_name;
            },
        },
    ],
});
transaction_model_table.data_filter = "in_time";
transaction_model_table.data_custom_filter = { data_member_user_id: MEMBER_USER_ID };

function set_active_dock(v) {
    const activeIndex = parseInt(v, 10);
    const dockButtons = document.querySelectorAll('[data-field^="dock_page_"]');
    dockButtons.forEach((btn, index) => {
        const icon = btn.querySelector("i");
        const dot = btn.querySelector(".dock-dot");

        if (index === activeIndex) {
            btn.classList.add("bg-primary", "text-primary-content", "shadow-md", "shadow-primary/30", "scale-105", "font-bold");
            btn.classList.remove("text-base-content/70", "hover:bg-base-200/50");
            if (icon) icon.classList.add("-translate-y-0.5", "scale-110");
            if (dot) dot.classList.remove("hidden");
        } else {
            btn.classList.remove("bg-primary", "text-primary-content", "shadow-md", "shadow-primary/30", "scale-105", "font-bold");
            btn.classList.add("text-base-content/70", "hover:bg-base-200/50");
            if (icon) icon.classList.remove("-translate-y-0.5", "scale-110");
            if (dot) dot.classList.add("hidden");
        }
    });
    localStorage.setItem("MEMBER_INFO_DOCK_ACTIVE", activeIndex);
}

window.dock_onclick = dock_onclick;
async function dock_onclick(v) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(12); } catch (_) {}
    }
    if (typeof swiper !== "undefined" && swiper) {
        swiper.slideTo(v, 400);
    }
    set_active_dock(v);
}

window.renew_count_change = renew_count_change;
function renew_count_change() {
    const modal = Dialog_Renew;
    const expire_date_time = modal.querySelector('[data-field="expire_date_time"]');
    const renewal_type = modal.querySelector('[data-field="renewal_type"]');
    const renew_count = modal.querySelector('[data-field="renew_count"]');
    const renew_amount = modal.querySelector('[data-field="renew_amount"]');
    const renew_total_amount = modal.querySelector('[data-field="renew_total_amount"]');
    const renew_expire_after = modal.querySelector('[data-field="renew_expire_after"]');

    if (renew_amount.value == 0 || renew_amount.value == null || renew_amount.value == undefined) {
        return;
    }

    renew_total_amount.value = "";

    let count = parseInt(renew_count.value, 10);
    if (isNaN(count) || count < 1) {
        count = 1;
        renew_count.value = 1;
    }

    if (count > 12) {
        unity.showToastNotification({ icon: "warning", msg: "Renewal count cannot exceed 12 months/periods" });
        count = 12;
        renew_count.value = 12;
    }

    const rawAmountStr = String(renew_amount.value || "0").replace(/[^0-9.]/g, "");
    const amount = parseFloat(rawAmountStr) || 0;
    renew_total_amount.value = unity.toCurrency ? unity.toCurrency(amount * count) : (amount * count).toLocaleString();

    // Parse existing date from textContent
    const dateStr = expire_date_time ? expire_date_time.textContent.trim() : "";
    let renew_expire_after_obj = null;

    if (dateStr && dateStr !== "-") {
        const parts = dateStr.split(" ");
        const dateParts = parts[0].split("/");
        if (dateParts.length === 3) {
            const day = dateParts[0].padStart(2, "0");
            const month = dateParts[1].padStart(2, "0");
            const year = dateParts[2];
            const time = parts[1] || "00:00";
            renew_expire_after_obj = dayjs(`${year}-${month}-${day}T${time}`);
        } else {
            renew_expire_after_obj = dayjs(dateStr);
        }
    }

    if (!renew_expire_after_obj || !renew_expire_after_obj.isValid()) {
        renew_expire_after_obj = dayjs();
    }

    if (count > 0) {
        const typeStr = renewal_type ? renewal_type.textContent.trim() : "";

        switch (typeStr) {
            case "DAY":
                renew_expire_after_obj = renew_expire_after_obj.add(count, "day");
                break;
            case "1_MONTH":
            case "GENERAL":
                renew_expire_after_obj = renew_expire_after_obj.add(count, "month");
                break;
            case "3_MONTH":
            case "USER_3_MONTH":
                renew_expire_after_obj = renew_expire_after_obj.add(count * 3, "month");
                break;
            case "6_MONTH":
            case "USER_6_MONTH":
                renew_expire_after_obj = renew_expire_after_obj.add(count * 6, "month");
                break;
            case "1_YEAR":
            case "USER_1_YEAR":
                renew_expire_after_obj = renew_expire_after_obj.add(count, "year");
                break;
            default:
                renew_expire_after_obj = renew_expire_after_obj.add(count, "month");
                break;
        }

        renew_expire_after.value = unity.dateTimeToStr
            ? unity.dateTimeToStr(renew_expire_after_obj, "DD/MM/YYYY HH:mm")
            : renew_expire_after_obj.format("DD/MM/YYYY HH:mm");
    } else {
        renew_expire_after.value = "-";
    }
}

window.submit_renew = submit_renew;
async function submit_renew() {
    const modal = Dialog_Renew;
    const d_renew_of = modal.querySelector('[data-field="renew_of"]').textContent.trim();
    const id = modal.querySelector('[data-field="id"]').textContent.trim();
    const d_name = modal.querySelector('[data-field="name"]').textContent.trim();
    const d_expire_date_time = modal.querySelector('[data-field="expire_date_time"]').textContent.trim();
    const d_renewal_type = modal.querySelector('[data-field="renewal_type"]').textContent.trim();
    const d_renew_count = modal.querySelector('[data-field="renew_count"]').value;
    const d_renew_amount = modal.querySelector('[data-field="renew_amount"]').value;
    const d_renew_total_amount = modal.querySelector('[data-field="renew_total_amount"]').value;
    const d_renew_expire_after = modal.querySelector('[data-field="renew_expire_after"]').value;
    const d_description_info = modal.querySelector('[data-field="description"]').textContent.trim();

    if (d_renew_amount == 0 || d_renew_amount == null || d_renew_amount == undefined) {
        return;
    }

    const confirmContent = `
        <div class="text-left space-y-3 py-1">
            <div class="bg-base-200/60 p-3.5 rounded-box border border-base-200 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs text-base-content/60 font-medium">Item</span>
                    <span class="font-bold text-sm text-base-content">${d_description_info || "Member Renewal"}</span>
                </div>
                <div class="flex items-center justify-between pt-1.5 border-t border-base-200/80">
                    <span class="text-xs text-base-content/60 font-medium">Billing Cycles</span>
                    <span class="badge badge-primary badge-lg font-semibold badge-soft">${d_renew_count} cycles</span>
                </div>
            </div>

            <div class="bg-primary/5 border border-primary/20 p-3.5 rounded-box flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-box bg-primary/10 text-primary flex items-center justify-center">
                        <i class="fa-solid fa-wallet text-sm"></i>
                    </div>
                    <span class="text-xs font-bold text-primary">Total Paid</span>
                </div>
                <div class="text-right">
                    <span class="text-xl font-extrabold text-primary">${d_renew_total_amount}</span>
                    <span class="text-xs font-semibold text-primary/70 ml-0.5">THB</span>
                </div>
            </div>

            <div class="bg-success/10 border border-success/30 p-4 rounded-box flex items-center justify-between shadow-sm">
                <span class="text-success font-bold text-sm sm:text-base flex items-center gap-2">
                    <i class="fa-solid fa-calendar-check text-base sm:text-lg"></i> New Expiry Date
                </span>
                <span class="font-extrabold text-success text-base sm:text-xl tracking-wide">${d_renew_expire_after}</span>
            </div>
        </div>
    `;

    if (
        (
            await unity.showDialogConfirm({
                title: "Confirm Renewal Payment",
                content: confirmContent,
            })
        ).confirm
    ) {
        modal.close();
        let url = "/info";
        let params = {
            amount: parseInt(d_renew_total_amount.replaceAll(",", ""), 10),
            renew_count: d_renew_count,
            expire_date_time: d_renew_expire_after,
        };
        switch (d_renew_of) {
            case "member_user":
                url = "/member_user_service_payment_call";
                params["member_user_id"] = id;
                break;
            case "member":
                url = "/member_service_payment_call";
                params["card_id"] = d_name;
                params["member_id"] = id;
                break;
            case _:
                unity.showToastNotification({ icon: "error", msg: "Record not found" });
                return;
        }

        const query_string = new URLSearchParams(params).toString();
        openPayment_Window(url, `?${query_string}`);
    }
}

async function process_renew(data = {}) {
    const modal = Dialog_Renew;
    const title = modal.querySelector('[data-field="title"]');
    const id = modal.querySelector('[data-field="id"]');
    const name = modal.querySelector('[data-field="name"]');
    const status = modal.querySelector('[data-field="status"]');
    const expire_date_time = modal.querySelector('[data-field="expire_date_time"]');
    const description_info = modal.querySelector('[data-field="description"]');
    const type = modal.querySelector('[data-field="type"]');
    const renewal_type = modal.querySelector('[data-field="renewal_type"]');
    const renew_count = modal.querySelector('[data-field="renew_count"]');
    const renew_amount = modal.querySelector('[data-field="renew_amount"]');
    const renew_total_amount = modal.querySelector('[data-field="renew_total_amount"]');
    const renew_expire_after = modal.querySelector('[data-field="renew_expire_after"]');
    const btn_submit_renew = modal.querySelector('[data-field="btn_submit_renew"]');

    const renew_of = modal.querySelector('[data-field="renew_of"]');
    renew_of.textContent = data.renew_of;
    //  *** init info

    const data_map = {};

    console.log(data);

    switch (data.renew_of) {
        case "member_user":
            data_map["title"] = "Member User Renewal";
            data_map["id"] = data["user_id"];
            data_map["name"] = "Renewal Transaction";
            data_map["type"] = "Member User";
            break;
        case "member":
            data_map["title"] = "Renew Card / License Plate";
            data_map["id"] = data["id"];
            data_map["name"] = data["card_id"];
            data_map["type"] = data["member_type"];
            break;
        case _:
            unity.showToastNotification({ icon: "error", msg: "Record not found" });
            return;
    }

    const expire_date_time_obj = dayjs(data.expire);

    switch (data.renewal_type) {
        case "DAY":
            data_map["description"] = "Renew by Number of Days";
            break;
        case "1_MONTH":
        case "GENERAL":
            data_map["description"] = "Monthly Renewal";
            break;
        case "3_MONTH":
        case "USER_3_MONTH":
            data_map["description"] = "Quarterly Renewal (3 Months)";
            break;
        case "6_MONTH":
        case "USER_6_MONTH":
            data_map["description"] = "Semi-Annual Renewal (6 Months)";
            break;
        case "1_YEAR":
        case "USER_1_YEAR":
            data_map["description"] = "Annual Renewal (1 Year)";
            break;
        default:
            data_map["description"] = "Monthly Renewal";
            break;
    }

    if (title) title.textContent = data_map["title"];
    if (id) id.textContent = data_map["id"] || "";
    if (name) name.textContent = data_map["name"] || "";
    if (status) status.textContent = "Inactive";
    if (expire_date_time) expire_date_time.textContent = unity.dateTimeToStr(expire_date_time_obj, "DD/MM/YYYY HH:mm");
    if (description_info) description_info.textContent = data_map["description"] || "";
    if (type) type.textContent = data_map["type"] || "";
    if (renewal_type) renewal_type.textContent = data.renewal_type || "";
    if (renew_count) renew_count.value = 1;
    if (renew_amount) renew_amount.value = data.amount || 0;
    if (renew_total_amount) renew_total_amount.value = data.amount || 0;
    if (renew_expire_after) renew_expire_after.value = unity.dateTimeToStr(expire_date_time_obj, "DD/MM/YYYY HH:mm");

    await unity.delay(150);
    renew_count_change();
    modal.showModal();
    modal.focus();
}

async function call_member_user_renew_history(user_id) {
    console.log("call_member_user_renew_history", user_id);
    const model = Dialog_Member_User_Service_Card_Renew_History;
    const renew_history_list = model.querySelector('[data-field="renew_history_list"]');

    if (renew_history_list) {
        renew_history_list.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8 text-base-content/60">
                    <span class="loading loading-spinner loading-md text-primary"></span>
                    <div class="mt-2 text-xs">Loading renewal history...</div>
                </td>
            </tr>
        `;
    }

    model.showModal();

    try {
        const respond = await unity.fetchApi(
            "/api/account_record/member_user_service_card_renew_history?user_id=" + user_id,
            "get",
            null,
            "json",
        );
        console.log(respond);
        if (respond && respond.success && respond.data && respond.data.length > 0) {
            let html = "";
            respond.data.forEach((item) => {
                const date_str = item.date_time ? unity.dateTimeToStr(item.date_time, "DD/MM/YYYY HH:mm") : "-";
                const amount =
                    item.amount !== undefined && item.amount !== null
                        ? `${Number(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} THB`
                        : "0.00 THB";
                const ref_no = item.no || item.ref01 || `RN-${item.id}`;
                const remark = item.remark || "Member Renewal";
                const payment_type = item.type || "CASH";
                const cashier = item.cashier ? ` (${item.cashier})` : "";
                const status = item.status || "NORMAL";

                html += `
                    <tr class="hover">
                        <td class="py-2.5 px-3">
                            <div class="font-medium text-base-content text-xs sm:text-sm whitespace-nowrap">${date_str}</div>
                            <div class="text-[10px] sm:text-xs text-base-content/60 font-mono">Ref: ${ref_no}</div>
                        </td>
                        <td class="py-2.5 px-3">
                            <div class="font-bold text-primary text-xs sm:text-sm break-words max-w-50">${remark}</div>
                        </td>

                        <td class="py-2.5 px-3 text-right font-bold text-success text-xs sm:text-sm font-mono whitespace-nowrap">
                            ${amount}
                        </td>
                        <td class="py-2.5 px-3 text-center">
                            <span class="badge badge-success badge-soft badge-xs sm:badge-sm font-semibold">${status === "NORMAL" ? "SUCCESS" : status}</span>
                            <div class="text-[10px] sm:text-[11px] text-base-content/60 mt-0.5 whitespace-nowrap">${payment_type}${cashier}</div>
                        </td>
                    </tr>
                `;
            });
            if (renew_history_list) renew_history_list.innerHTML = html;
        } else {
            if (renew_history_list) {
                renew_history_list.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center py-8 text-base-content/50">
                            <i class="fa-solid fa-receipt fa-2xl mb-2 block text-base-content/30"></i>
                            No member renewal history found
                        </td>
                    </tr>
                `;
            }
        }
    } catch (err) {
        console.error("Error call_member_user_renew_history:", err);
        if (renew_history_list) {
            renew_history_list.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-8 text-error">
                        <i class="fa-solid fa-triangle-exclamation fa-2xl mb-2 block"></i>
                        Error loading renewal history
                    </td>
                </tr>
            `;
        }
    }
}

async function call_member_renew_history(card_id) {
    console.log("call_member_renew_history", card_id);
    const model = Dialog_Member_Service_Card_Renew_History;
    const renew_history_list = model.querySelector('[data-field="renew_history_list"]');

    if (renew_history_list) {
        renew_history_list.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-8 text-base-content/60">
                    <span class="loading loading-spinner loading-md text-primary"></span>
                    <div class="mt-2 text-xs">Loading renewal history...</div>
                </td>
            </tr>
        `;
    }

    model.showModal();

    try {
        const respond = await unity.fetchApi(
            "/api/account_record/member_service_card_renew_history?card_id=" + card_id,
            "get",
            null,
            "json",
        );

        if (respond && respond.success && respond.data && respond.data.length > 0) {
            let html = "";
            respond.data.forEach((item) => {
                const date_str = item.date_time ? unity.dateTimeToStr(item.date_time, "DD/MM/YYYY HH:mm") : "-";
                const amount =
                    item.amount !== undefined && item.amount !== null
                        ? `${Number(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} THB`
                        : "0.00 THB";
                const ref_no = item.no || item.ref01 || `RN-${item.id}`;
                const remark = item.remark || "Member Card Renewal";
                const payment_type = item.type || "CASH";
                const cashier = item.cashier ? ` (${item.cashier})` : "";
                const status = item.status || "NORMAL";

                html += `
                    <tr class="hover">
                        <td class="py-2.5 px-3">
                            <div class="font-medium text-base-content text-xs sm:text-sm whitespace-nowrap">${date_str}</div>
                            <div class="text-[10px] sm:text-xs text-base-content/60 font-mono">Ref: ${ref_no}</div>
                        </td>
                        <td class="py-2.5 px-3">
                            <div class="font-bold text-primary text-xs sm:text-sm break-words max-w-50">${remark}</div>
                        </td>
                        <td class="py-2.5 px-3 text-right font-bold text-success text-xs sm:text-sm font-mono whitespace-nowrap">
                            ${amount}
                        </td>
                        <td class="py-2.5 px-3 text-center">
                            <span class="badge badge-success badge-soft badge-xs sm:badge-sm font-semibold">${status === "NORMAL" ? "SUCCESS" : status}</span>
                            <div class="text-[10px] sm:text-[11px] text-base-content/60 mt-0.5 whitespace-nowrap">${payment_type}${cashier}</div>
                        </td>
                    </tr>
                `;
            });
            if (renew_history_list) renew_history_list.innerHTML = html;
        } else {
            if (renew_history_list) {
                renew_history_list.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center py-8 text-base-content/50">
                            <i class="fa-solid fa-receipt fa-2xl mb-2 block text-base-content/30"></i>
                            No card renewal history found
                        </td>
                    </tr>
                `;
            }
        }
    } catch (err) {
        console.error("Error call_member_renew_history:", err);
        if (renew_history_list) {
            renew_history_list.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8 text-error">
                        <i class="fa-solid fa-triangle-exclamation fa-2xl mb-2 block"></i>
                        Error loading renewal history
                    </td>
                </tr>
            `;
        }
    }
}
window.confirm_change_pin = confirm_change_pin;
async function confirm_change_pin() {
    const pin = Dialog_Member_Service_Change_PIN.querySelector('[data-field="member_user_pin"]').value;
    const confirm_pin = Dialog_Member_Service_Change_PIN.querySelector('[data-field="member_user_pin_confirm"]').value;
    if (pin.length == 6 && confirm_pin.length == 6) {
        if (pin !== confirm_pin) {
            const formData = new FormData();
            formData.append("pin", pin);
            formData.append("confirm_pin", confirm_pin);
            const _reply = await unity.fetchApi("/api/member/member_service/user_change_pin", "post", formData, "json");
            if (_reply.success) {
                unity.showToastNotification({ icon: "success", msg: _reply.msg });
                Dialog_Member_Service_Change_PIN.close();
                unity.delay(1000);
                logout_member();
            } else {
                unity.showToastNotification({ icon: "error", msg: _reply.msg });
            }
        }
    }
}

window.confirm_change_member_user_info = confirm_change_member_user_info;
async function confirm_change_member_user_info() {
    const member_user_info = Dialog_Member_Service_Change_Info.querySelector('[data-field="member_user_info"]').value;
    const member_user_email = Dialog_Member_Service_Change_Info.querySelector('[data-field="member_user_email"]').value;
    const member_user_enable_notification = Dialog_Member_Service_Change_Info.querySelector(
        '[data-field="member_user_enable_notification"]',
    ).checked;

    const formData = new FormData();
    formData.append("member_user_info", member_user_info);
    formData.append("member_user_email", member_user_email);
    formData.append("member_user_enable_notification", member_user_enable_notification);
    const _reply = await unity.fetchApi("/api/member/member_service/user_change_info", "post", formData, "json");
    if (_reply.success) {
        unity.showToastNotification({ icon: "success", msg: _reply.msg });
        Dialog_Member_Service_Change_Info.close();
        unity.delay(1000);
        getContentMemberUser();
    } else {
        unity.showToastNotification({ icon: "error", msg: _reply.msg });
    }
}

window.upload_image_member = upload_image_member;
async function upload_image_member(event) {
    const confirm = await unity.showDialogConfirm({ title: "Confirm Photo Upload" });
    showPreview(event, "member_user_image_preview");
    await unity.delay(1000);
    if (confirm.confirm) {
        const formData = new FormData();
        formData.append(
            "image_upload",
            await unity.dataURLtoFile(document.getElementById("member_user_image_preview").src, "image_upload"),
        );
        const _reply = await unity.fetchApi("/api/member/member_service/user_change_image", "post", formData, "json");
        unity.logger.debug(_reply);

        if (_reply.success) {
            unity.showToastNotification({ icon: "success", msg: _reply.msg });
            // unity.delay(1000);
            // getContentMemberUser()
        } else {
            unity.showToastNotification({ icon: "error", msg: _reply.msg });
        }
    } else {
        event.target.value = "";
    }
}

let booking_member_id = 0;

window.booking_manager_member = booking_manager_member;
async function booking_manager_member(id, mode) {
    booking_member_id = id;
    unity.logger.debug(`📝 ${id} : ${mode}`);
    let _reply;
    switch (mode) {
        case "ADD":
            Dialog_Member_Service_Booking_Manager.querySelector('[data-field="card_id"]').value = "";
            Dialog_Member_Service_Booking_Manager.querySelector('[data-field="status"]').innerHTML =
                `<div class="badge badge-soft badge-primary badge-lg">REGISTER</div>`;
            Dialog_Member_Service_Booking_Manager.showModal();
            break;
        case "EDIT":
            _reply = await unity.fetchApi(`/api/member/booking?id=${id}`, "get", null, "json");
            if (_reply.success) {
                const data = _reply.data;
                const Booking_Member = data;

                unity.logger.debug(data);
                Dialog_Member_Service_Booking_Manager.querySelector('[data-field="card_id"]').value =
                    Booking_Member.card_id;

                Dialog_Member_Service_Booking_Manager.querySelector('[data-field="start_date_time"]').value =
                    Booking_Member.start_date_time;

                Dialog_Member_Service_Booking_Manager.querySelector('[data-field="booking_member_type"]').value =
                    Booking_Member.booking_type;

                Dialog_Member_Service_Booking_Manager.querySelector('[data-field="objective_id"]').value =
                    Booking_Member.objective_id;
                Dialog_Member_Service_Booking_Manager.querySelector('[data-field="remark"]').value =
                    Booking_Member.remark;

                Dialog_Member_Service_Booking_Manager.showModal();
            } else {
                unity.showDialogError({ msg: _reply.msg });
            }

            break;
        case "REMOVE":
            if (!(await unity.dialogConfirm())) return;
            _reply = await unity.fetchApi(`/api/member/booking_me?id=${booking_member_id}`, "delete", null, "json");
            if (_reply.success) {
                unity.delay(250);
                getContentMemberUser();
            } else {
                unity.showDialogError({ msg: _reply.msg });
            }
            break;

        default:
            break;
    }
}

window.submit_manage_booking = submit_manage_booking;
async function submit_manage_booking() {
    const card_id = Dialog_Member_Service_Booking_Manager.querySelector('[data-field="card_id"]').value;
    const start_date_time = Dialog_Member_Service_Booking_Manager.querySelector('[data-field="start_date_time"]').value;

    const booking_member_type = Dialog_Member_Service_Booking_Manager.querySelector(
        '[data-field="booking_member_type"]',
    ).value;
    const objective_select = Dialog_Member_Service_Booking_Manager.querySelector('[data-field="objective_id"]');
    const objective_name = objective_select.options[objective_select.selectedIndex].text;

    const remark = Dialog_Member_Service_Booking_Manager.querySelector('[data-field="remark"]').value || "-";

    if (card_id == "" || start_date_time == "" || booking_member_type == "") {
        unity.showDialogWarning({ msg: "Please fill in all required fields" });
        return;
    }
    const start_date_time_str = unity.dateTimeToStr(start_date_time, "YYYY-MM-DDTHH:mm");
    const expire_date_time_str = unity.dateTimeToStr(start_date_time, "YYYY-MM-DDTHH:mm", 1);

    let content_html = `<div class="card bg-base-100 shadow-sm">
                            <div class="card-body">
                                <div class="flex justify-between">
                                <h2 class="text-3xl font-bold">${card_id}</h2>
                                <span class="badge badge-primary badge-sm badge-soft">Booking</span>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <div>
                                        Start Time <i class="fa-regular fa-clock"></i>
                                        <span>${start_date_time_str}</span>
                                    </div>
                                    <div>
                                        End Time <i class="fa-regular fa-clock"></i>
                                        <span>${expire_date_time_str}</span>
                                    </div>
                                    <div>
                                        <i class="fa-solid fa-car"></i>
                                        <span>${booking_member_type}</span>
                                    </div>
                                    <div>
                                        Purpose <i class="fa-regular fa-circle-question"></i>
                                    </div>
                                    <p>${objective_name}</p>
                                    <div>
                                        Remarks <i class="fa-regular fa-circle-question"></i>
                                    </div>
                                    <p>${remark}</p>
                                </div>
                            </div>
                            </div>`;
    const confirm = await unity.showDialogConfirm({ content: content_html });
    if (confirm.confirm) {
        const formData = new FormData();
        formData.append("id", booking_member_id);
        formData.append("card_id", card_id);
        formData.append("start_date_time", start_date_time);
        formData.append("expire_date_time", expire_date_time_str);
        formData.append("booking_type", booking_member_type);
        formData.append("status", "REGISTER");
        formData.append("objective_id", objective_select.value);
        formData.append("remark", remark);
        unity.debugForm(formData);
        const _reply = await unity.fetchApi("/api/member/booking_me", "post", formData, "json");
        if (_reply.success) {
            // unity.showDialogSuccess({ msg: _reply.msg });
            unity.showToastNotification({ icon: "success", msg: _reply.msg });
            Dialog_Member_Service_Booking_Manager.close();
            unity.delay(250);
            getContentMemberUser();
        } else {
            unity.showDialogWarning({ msg: _reply.msg });
        }
    }
}
// ? ************************************ Display Services Payment ************************************
let extent_payment_dsp = null;

function openPayment_Window(url, query_data) {
    const fullUrl = url + query_data;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;

    if (isMobile) {
        // On Mobile/iPhone: Redirect directly to avoid iOS Safari popup blocker
        window.location.href = fullUrl;
        return;
    }

    try {
        const params = `scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no,width=800,height=750`;
        extent_payment_dsp = window.open(fullUrl, "sub", params);

        // Fallback if popup is blocked by browser settings or async context
        if (!extent_payment_dsp || extent_payment_dsp.closed || typeof extent_payment_dsp.closed === "undefined") {
            window.location.href = fullUrl;
        } else {
            extent_payment_dsp.focus();
        }
    } catch (e) {
        console.error("Popup window open failed:", e);
        window.location.href = fullUrl;
    }
}

window.confirm_pay_member_renew = confirm_pay_member_renew;
async function confirm_pay_member_renew() {
    const member_id = Dialog_Member_Service_Card_Renew.querySelector('[data-field="member_renew_id"]').textContent;
    const card_id = Dialog_Member_Service_Card_Renew.querySelector('[data-field="member_renew_id_card"]').textContent;
    const amount = Dialog_Member_Service_Card_Renew.querySelector('[data-field="member_renew_total_amount"]').value;
    const renew_count = Dialog_Member_Service_Card_Renew.querySelector('[data-field="member_renew_count"]').value;
    const expire_date_time = Dialog_Member_Service_Card_Renew.querySelector(
        '[data-field="member_renew_expire_after"]',
    ).value;
    if (
        (
            await unity.showDialogConfirm({
                title: "Confirm Card Renewal Payment",
                content: `Member ID ${member_id}<br>
                Plate/Card ID: ${card_id}<br>
                Amount: ${Dialog_Member_Service_Card_Renew.querySelector('[data-field="member_renew_total_amount"]').value} THB<br>
                Billing Cycles: ${Dialog_Member_Service_Card_Renew.querySelector('[data-field="member_renew_count"]').value} cycles<br>
                New Expiry Date ${unity.dateTimeToStr(expire_date_time, "DD/MM/YYYY")}`,
            })
        ).confirm
    ) {
        const params = {
            card_id,
            member_id,
            amount,
            renew_count,
            expire_date_time,
        };
        const query_string = new URLSearchParams(params).toString();
        openPayment_Window("/member_service_payment_call", `?${query_string}`);
        Dialog_Member_Service_Card_Renew.close();
    }
}

// Process Member Renewal
async function confirm_pay_member_user_renew(member_user_id, member_renew_price, next_expire_date_time) {
    console.log(member_user_id, member_renew_price, next_expire_date_time);
    const params = {
        member_user_id,
        member_renew_price,
        next_expire_date_time,
        // next_expire_date_time: next_expire_date_time_obj.format("YYYY-MM-DD"),
    };
    const query_string = new URLSearchParams(params).toString();
    console.log(query_string);
    openPayment_Window("/member_user_service_payment_call", `?${query_string}`);
    Dialog_Member_User_Service_Card_Renew.close();
}

window.logout_member = logout_member;
async function logout_member() {
    if ((await unity.showDialogConfirm({ title: "Confirm Sign Out" })).confirm) {
        document.cookie = "Authorization_Member_User=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.reload();
    }
}

async function stamp_transaction(transcation_id, stamp_data) {
    unity.showDialogLoading();
    const formData = new FormData();
    formData.append("transcation_id", transcation_id);
    formData.append("stamp_data", stamp_data);
    const _reply = await unity.fetchApi("/api/member/member_service/transaction_stamp", "post", formData, "json");
    if (_reply.success) {
        unity.showToastNotification({ icon: "success", msg: _reply.msg });
        unity.delay(1000);
        getContentMemberUser();
    } else {
        unity.showToastNotification({ icon: "error", msg: _reply.msg });
    }
    unity.closeDialogLoading();
}
async function dialog_transaction_stamp(card_id, transaction_id) {
    Dialog_Member_Service_Transaction_Stamp.querySelector('[data-field="transition_id"]').textContent =
        `ID:${transaction_id}`;

    Dialog_Member_Service_Transaction_Stamp.querySelector('[data-field="card_id"]').textContent = card_id;

    Dialog_Member_Service_Transaction_Stamp.querySelector('[data-field="btn_allow"]').onclick = () => {
        stamp_transaction(transaction_id, "Allow");
    };
    Dialog_Member_Service_Transaction_Stamp.querySelector('[data-field="btn_not_allow"]').onclick = () => {
        stamp_transaction(transaction_id, "! Not Allow");
    };

    Dialog_Member_Service_Transaction_Stamp.showModal();
}

window.refresh_member_info = refresh_member_info;
async function refresh_member_info() {
    getContentMemberUser();
}
async function getContentMemberUser() {
    let member_user_id = null;
    const response = await unity.fetchApi(`/api/member/member_service/user_data_info`, "post", null, "json");
    if (response.success) {
        // console.log(response);

        const parked = response.datas.parked;
        if (parked) {
            const box_of_member_user_parked = document.getElementById("box_of_member_user_parked");
            box_of_member_user_parked.innerHTML = "";
            const temp = document.getElementById("template_content_parking_info");
            for (const p of parked) {
                const _c = temp.content.cloneNode(true);
                _c.querySelector('[name="card_id"]').textContent = p.card_id;
                _c.querySelector('[name="date_time"]').textContent = p.date_time;
                _c.querySelector('[name="member_type"]').textContent = p.member_type;

                box_of_member_user_parked.appendChild(_c);
            }
        }
        const box_of_member_user_cards = document.getElementById("box_of_member_user_cards");
        box_of_member_user_cards.innerHTML = "";

        const member_user = response.datas.member_user;
        //***  member user info
        if (member_user) {
            console.log(member_user);
            member_user_id = member_user.id;
            const temp = document.getElementById("template_content_member_user_info");
            const _c = temp.content.cloneNode(true);
            _c.querySelector('[name="status"]').textContent = member_user.status;
            _c.querySelector('[name="user_type"]').textContent = member_user.user_type;
            _c.querySelector('[name="expire_date_time"]').textContent = member_user.expire_date_time
                ? member_user.expire_date_time.split("T")[0]
                : "";
            _c.querySelector('[name="member_user_permission"]').textContent = member_user.member_user_permission;
            const member_renew_price = member_user.member_renew_price;
            _c.querySelector('[name="member_renew_price"]').textContent = member_renew_price;
            const btn_renew = _c.querySelector('[name="btn_renew"]');
            const btn_renew_history = _c.querySelector('[name="btn_renew_history"]');
            if (member_renew_price > 0 && member_user.expire_date_time) {
                btn_renew.classList.remove("hidden");
                btn_renew_history.classList.remove("hidden");
                btn_renew.onclick = () => {
                    const data = {
                        renew_of: "member_user",
                        user_id: member_user.id,
                        amount: member_renew_price,
                        expire: member_user.expire_date_time,
                        renewal_type: member_user.user_type,
                    };
                    process_renew(data);
                };
                btn_renew_history.onclick = () => {
                    call_member_user_renew_history(member_user.id);
                };
            } else {
                btn_renew.classList.add("hidden");
                btn_renew_history.classList.add("hidden");
            }
            box_of_member_user_cards.appendChild(_c);
        }

        const members = response.datas.members;
        // *** member info
        if (members) {
            const newParagraph = document.createElement("p");
            newParagraph.classList.add("text-center", "font-bold");
            newParagraph.textContent = "Registered License Plates";
            box_of_member_user_cards.appendChild(newParagraph);
            const temp = document.getElementById("template_content_member_info");
            for (const m of members) {
                console.log(m);
                const renewal_type = m.renewal_type;
                const _c = temp.content.cloneNode(true);
                _c.querySelector('[name="status"]').textContent = m.status;
                _c.querySelector('[name="card_id"]').textContent = m.card_id;
                _c.querySelector('[name="create_date_time"]').textContent = m.create_date_time;
                _c.querySelector('[name="start_date_time"]').textContent = m.start_date_time;
                _c.querySelector('[name="expire_date_time"]').textContent = m.expire_date_time;
                _c.querySelector('[name="member_type"]').textContent = m.member_type;
                _c.querySelector('[name="expire_day"]').textContent = m.expire_day;
                if (m.expire_day == 0) {
                    _c.querySelector('[name="expire_day"]').innerHTML = `<div class="badge badge-error">Expired</div>`;
                }
                const expire_day = parseInt(m.expire_day) ? parseInt(m.expire_day) != NaN : -1;
                const btn_renew = _c.querySelector('[name="btn_renew"]');
                const btn_renew_history = _c.querySelector('[name="btn_renew_history"]');

                let is_renewal = true;
                if (renewal_type == "NOT Renewal") {
                    is_renewal = false;
                }
                // if (expire_day == -1) {
                //     is_renewal = false;
                // }

                switch (m.status) {
                    case "NORMAL":
                        if (expire_day != 0) {
                            _c.querySelector('[name="box"]').classList.add("border-success");
                            _c.querySelector('[name="status_icon"]').innerHTML =
                                `<i class="fa-solid fa-circle-check text-success fa-2x"></i><div class="badge badge-outline badge-success">NORMAL</div> `;
                        } else {
                            _c.querySelector('[name="box"]').classList.add("border-warning");
                            _c.querySelector('[name="status_icon"]').innerHTML =
                                `<i class="fa-solid fa-circle-exclamation text-warning fa-2x"></i><div class="badge badge-outline badge-error">Expired</div> `;
                        }

                        break;
                    case "DISABLE":
                        _c.querySelector('[name="box"]').classList.add("border-error");
                        _c.querySelector('[name="status_icon"]').innerHTML =
                            `<i class="fa-solid fa-circle-xmark text-error fa-2x"></i><div class="badge badge-outline badge-error">Suspended</div> `;

                        break;

                    default:
                        break;
                }
                if (is_renewal) {
                    btn_renew.classList.remove("hidden");
                    btn_renew_history.classList.remove("hidden");
                    btn_renew.onclick = () => {
                        const data = {
                            renew_of: "member",
                            card_id: m.card_id,
                            id: m.id,
                            amount: m.renew_amount,
                            expire: m.expire_date_time,
                            renewal_type: renewal_type,
                            member_type: m.member_type,
                        };
                        process_renew(data);
                    };
                    btn_renew_history.onclick = () => {
                        call_member_renew_history(m.card_id);
                    };
                } else {
                    btn_renew.classList.add("hidden");
                    btn_renew_history.classList.add("hidden");
                }

                box_of_member_user_cards.appendChild(_c);
            }
        }

        const bookings = response.datas.bookings;
        if (bookings) {
            const box_of_member_user_bookings = document.getElementById("box_of_member_user_bookings");
            box_of_member_user_bookings.innerHTML = "";
            const temp = document.getElementById("template_content_booking_info");
            let is_edit = true;
            for (const booking of bookings) {
                is_edit = true;
                const b = booking.Booking_Member;
                const _c = temp.content.cloneNode(true);

                _c.querySelector('[name="create_date_time"]').textContent = unity.dateTimeToStr(b.create_date_time);
                _c.querySelector('[name="booking_type"]').textContent = b.booking_type;
                _c.querySelector('[name="card_id"]').textContent = b.card_id;
                _c.querySelector('[name="start_date_time"]').textContent = unity.dateTimeToStr(b.start_date_time);
                _c.querySelector('[name="expire_date_time"]').textContent = unity.dateTimeToStr(b.expire_date_time);

                switch (b.status) {
                    case "REGISTER":
                        _c.querySelector('[name="status_icon"]').innerHTML =
                            `<i class="fa-solid fa-registered text-info fa-2x"></i>Registered`;
                        break;
                    case "READY":
                        _c.querySelector('[name="status_icon"]').innerHTML =
                            `<i class="fa-solid fa-circle-check text-success fa-2x"></i>Active`;
                        break;
                    case "CHECK_IN":
                        _c.querySelector('[name="status_icon"]').innerHTML =
                            `<i class="fa-solid fa-building-circle-check text-warning fa-2x"></i>Checked In`;
                        is_edit = false;
                        break;
                    case "EXPIRED":
                        _c.querySelector('[name="status_icon"]').innerHTML =
                            `<i class="fa-solid fa-square-minus text-error fa-2x"></i>Expired`;
                        break;
                    default:
                        _c.querySelector('[name="status_icon"]').innerHTML = b.status;
                        break;
                }
                const btn_edit = _c.querySelector('[name="btn_edit"]');
                const btn_remove = _c.querySelector('[name="btn_remove"]');

                if (is_edit) {
                    btn_edit.onclick = () => {
                        booking_manager_member(b.id, "EDIT");
                    };
                    btn_remove.onclick = () => {
                        booking_manager_member(b.id, "REMOVE");
                    };
                } else {
                    btn_edit.disabled = true;
                    btn_remove.disabled = true;
                }

                box_of_member_user_bookings.appendChild(_c);
            }
        }

        const transactions_contact = response.datas.transactions_contact;
        if (transactions_contact) {
            const box_of_member_user_transactions_contact = document.getElementById(
                "box_of_member_user_transactions_contact",
            );
            box_of_member_user_transactions_contact.innerHTML = "";
            const temp = document.getElementById("template_content_transaction_contact_info");
            for (const transactions of transactions_contact) {
                const t = transactions.Transaction_Record;
                console.log(transactions);
                const _c = temp.content.cloneNode(true);
                _c.querySelector('[name="card_id"]').textContent = t.card_id;
                _c.querySelector('[name="transition_type"]').textContent = t.type;
                _c.querySelector('[name="license"]').textContent = transactions.license;

                _c.querySelector('[name="date_time"]').textContent = transactions.date_time;
                _c.querySelector('[name="visitor_name"]').innerHTML = transactions.visitor_name || "Unassigned";
                _c.querySelector('[name="objective"]').innerHTML = transactions.objective_name || "Unassigned";

                if (transactions.images_path) {
                    const images_paths = transactions.images_path.split(",");
                    _c.querySelector('[name="image"]').src = images_paths[0];
                }

                // let stamp_data = `<div class="badge badge-error badge-soft mx-auto badge-lg" data-i18n="not_allow"></div>`;
                let stamp_data = t.allow_data;
                // console.log(stamp_data);
                if (stamp_data) {
                    if (t.allow_data.includes("Allow")) {
                        stamp_data = `<div class="badge badge-info badge-soft mx-auto badge-lg" data-i18n="allow"></div>`;
                    }
                    if (t.allow_data.includes("! Not Allow")) {
                        stamp_data = `<div class="badge badge-error badge-soft mx-auto badge-lg" data-i18n="not_allow"></div>`;
                    }
                    _c.querySelector('[name="allow_data"]').innerHTML = stamp_data;
                } else {
                    _c.querySelector('[name="allow_data"]').textContent = "No Approval Data";
                }

                _c.querySelector('[name="btn_stamp"]').onclick = () => {
                    dialog_transaction_stamp(t.card_id, t.id);
                };

                box_of_member_user_transactions_contact.appendChild(_c);
            }
        }

        unity.updateContent();
    }
    return member_user_id;
}

// 🌟 [UI Helper] Copy to Clipboard
window.copyText = function (text, label = "Text") {
    if (!text || text === "-" || text.trim() === "") return;
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
    navigator.clipboard.writeText(text.trim()).then(() => {
        unity.showToastNotification({ msg: `Copied ${label}: ${text.trim()}` });
    }).catch(() => {
        unity.showToastNotification({ msg: `Copied: ${text.trim()}` });
    });
};

// 🌟 [UI Helper] Toggle PIN input visibility
window.togglePinVisibility = function (inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn.querySelector("i");
    if (input.type === "password") {
        input.type = "text";
        if (icon) {
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");
        }
    } else {
        input.type = "password";
        if (icon) {
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }
    }
};

let fp_history_picker = null;

// 🌟 [UI Helper] Quick Date Filter Chips
window.onQuickDateFilterClick = function (rangeType, btn) {
    if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) {}
    const chips = document.querySelectorAll("#quick_date_filter_chips .btn");
    chips.forEach(c => {
        c.classList.remove("btn-primary", "text-primary-content");
        c.classList.add("btn-ghost", "bg-base-200/60", "text-base-content/80");
    });
    if (btn) {
        btn.classList.remove("btn-ghost", "bg-base-200/60", "text-base-content/80");
        btn.classList.add("btn-primary", "text-primary-content");
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formatDt = (d, h, m, s) => `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(h)}:${pad(m)}:${pad(s)}`;

    let dateStr = "";
    if (rangeType === "today") {
        const start = formatDt(now, 0, 0, 0);
        const end = formatDt(now, 23, 59, 59);
        dateStr = `${start} to ${end}`;
    } else if (rangeType === "yesterday") {
        const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const start = formatDt(yest, 0, 0, 0);
        const end = formatDt(yest, 23, 59, 59);
        dateStr = `${start} to ${end}`;
    } else if (rangeType === "7days") {
        const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const start = formatDt(past, 0, 0, 0);
        const end = formatDt(now, 23, 59, 59);
        dateStr = `${start} to ${end}`;
    } else if (rangeType === "30days") {
        const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const start = formatDt(past, 0, 0, 0);
        const end = formatDt(now, 23, 59, 59);
        dateStr = `${start} to ${end}`;
    } else if (rangeType === "all") {
        dateStr = "";
    }

    const inputEl = document.querySelector("#select_range_of_datetime");
    if (inputEl) {
        inputEl.value = dateStr;
        if (fp_history_picker) {
            fp_history_picker.setDate(dateStr ? dateStr.split(" to ") : [], false);
        }
    }
    transaction_model_table.date_range = dateStr;
    transaction_model_table.reload();
};

async function Init() {
    // unity.regisServiceWorker();
    const member_user_id = await getContentMemberUser();
    await unity.init_select_option(Dialog_Member_Service_Booking_Manager, "/api/objective", "objective_id");
    const MEMBER_INFO_DOCK_ACTIVE = localStorage.getItem("MEMBER_INFO_DOCK_ACTIVE");

    if (MEMBER_INFO_DOCK_ACTIVE) {
        dock_onclick(parseInt(MEMBER_INFO_DOCK_ACTIVE));
    }

    fp_history_picker = table_class.init_table_model_with_datatime_picker(transaction_model_table, "#select_range_of_datetime");
    //?  SSE Event Subscribe
    const subscribe_option = {
        member_user_id: member_user_id,
    };

    const subscribe_option_query = new URLSearchParams(subscribe_option).toString();
    unity.initSse(async (e) => {
        const func = e.func;
        const params = e.params;
        if (func == "transaction_event") {
            unity.logger.debug(params);
        }
    }, "/sse?" + subscribe_option_query);
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
