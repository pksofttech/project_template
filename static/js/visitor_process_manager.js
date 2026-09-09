import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

console.log("🚀 HotelMemberType_ID", HotelMemberType_ID);
console.log("🚀 HotelMemberType_Name", HotelMemberType_Name);
const hotel_guests_table = new table_class.TableModel(
    "#hotel_guests_member_table",
    "/api/member/datatable",
    {
        table: "Member",
        // select: true,
        columns: [
            // {
            //     data: "Member.id",
            //     title: `<h3>Management</h3>`,
            //     className: "noExport",
            //     orderable: false,
            //     render: function (data, type, row) {
            //         return `<div class="inline-flex border border-blue-600 rounded-box shadow-sm" role="group">
            //                             <a class="btn btn-ghost btn-sm tooltip tooltip-right" data-tip="Ping" onclick="ping_access_device(${data})"> <i class="fas fa-share-nodes"></i></a>
            //                             <a class="btn btn-ghost btn-sm tooltip tooltip-right" data-tip="Open Door" onclick="open_access_device(${data})"> <i class="fas fa-door-open"></i></a>
            //                             <button class="btn btn-ghost btn-sm control-edit-btn" title="Edit" data-id="${row.id}">
            //                                 <i class="fas fa-pen text-primary"></i>
            //                             </button>
            //                         </div>`;
            //     },
            // },
            {
                data: "Member.card_id",
                title: "License Plate",
                render: function (data, type, row) {
                    data = row.card_id;
                    //return String(data).padStart(6, "0");
                    return String(data);
                },
            },
            {
                data: "Member_User.name",
                title: "Room No.",
                render: function (data, type, row) {
                    data = row.name;
                    if (data) {
                        return data;
                    }
                    return `<span class="badge badge-warning badge-sm">No Cardholder Name</span>`;
                },
            },
            {
                data: "Member.create_date_time",
                title: "Check In",
                render: function (data, type, row) {
                    data = row.create_date_time;
                    const _d = unity.dateTimeToStr(data);
                    const datetime = _d.split(" ");
                    const warp_datatime = `<div class="flex flex-col gap-1">
                                <div class="badge-date">${datetime[0]}</div>
                                <div class="badge-time">${datetime[1]}</div>
                                </div>`;
                    return warp_datatime;
                },
            },
            {
                data: "Member.expire_date_time",
                title: "Check Out",
                render: function (data, type, row) {
                    data = row.expire_date_time;
                    const _d = unity.dateTimeToStr(data);
                    const datetime = _d.split(" ");
                    const warp_datatime = `<div class="flex flex-col gap-1">
                                <div class="badge-date">${datetime[0]}</div>
                                <div class="badge-time">${datetime[1]}</div>
                                </div>`;
                    return warp_datatime;
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
                                _expire_date_time = _mins > 0 ? `${_mins} mins` : `< 1 mins`;
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
    },
);

const transaction_parked_table = new table_class.TableModel(
    "#transaction_parked_table",
    "/api/transaction_record/datatable",
    {
        table: "Transaction_Record",
        dom: '<"top"if>rt<"bottom"lp><"clear">',
        destroy: true,
        autoWidth: true,
        lengthMenu: [25, 50, 75, 100],
        scrollY: "50vh",
        scrollCollapse: true,
        sScrollX: "100%",
        //paging: false,
        order: [[5, "desc"]],
        processing: true,
        serverSide: true,
        search: {
            return: true,
        },
        //searching: false,
        select: false,
        columns: [
            {
                data: "Transaction_Record.id",
                title: "Select Action",
                orderable: false,
                render: function (data, type, row) {
                    // console.log(_gate_mode);
                    data = row.id;
                    let in_images_path = "/static/images/no_image.png";
                    const images_path = row.images_path;
                    if (images_path) {
                        const in_images_paths = images_path.split(",");
                        in_images_path = in_images_paths[0];
                    }
                    return `<div class="text-center"><a class="text-primary" onclick="selectVisitorTransaction({license:'${row.license}',id:'${row.id}',in_images_path:'${in_images_path}'});"> <i class="fa-solid fa-circle-check fa-2x"></i></a></div>`;
                },
            },
            {
                data: "in_log.images_path",
                title: "Photo",
                orderable: false,
                render: function (data, type, row) {
                    data = row.images_path;
                    if (data) {
                        const in_images_paths = data.split(",");
                        return `<a href="${in_images_paths[0]}" target = "_blank" ><img loading="lazy" class="duration-500 ease-in rounded-box max-h-10 hover:scale-150" src="${in_images_paths[0]}"> </a>`;
                    } else {
                        return "";
                    }
                },
            },
            {
                data: "Transaction_Record.type",
                title: "Type",
                orderable: false,
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
                    return `<div class="text-nowrap">${data}</div>`;
                },
            },
            {
                data: "in_log.license",
                title: "License Plate",
                render: function (data, type, row) {
                    data = row.license;
                    return data;
                },
            },
            {
                data: "in_log.date_time",
                title: "Entry DateTime",
                render: function (data, type, row) {
                    // console.log(data);
                    data = row.date_time;
                    const _d = unity.dateTimeToStr(data, "YYYY/MM/DD@HH:mm:ss");
                    if (_d == "") {
                        return "";
                    }
                    const datetime = _d.split("@");
                    const warp_datatime = `<div class="flex flex-col gap-1">
                    <div class="bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-box dark:bg-gray-700 dark:text-green-400 border border-green-400">${datetime[0]}</div>
                                        <div class="bg-yellow-100 text-yellow-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-box dark:bg-gray-700 dark:text-yellow-300 border border-yellow-300">${datetime[1]}</div>
                    </div>`;
                    return warp_datatime;
                },
            },
            {
                data: "in_gate.name",
                title: "Entry Gate",
                render: function (data, type, row) {
                    data = row.name;
                    return data;
                },
            },
            {
                data: "Transaction_Record.parked",
                title: "Stay Duration",
                render: function (data, type, row) {
                    data = row.parked;
                    if (data) {
                        const duration = unity.secondsToDuration(data);
                        return `<i class="nav-icon fa fa-clock text-info"></i> <span class="badge-success">${duration}</span>`;
                    } else {
                        if (row.status == "CHECK_IN") {
                            return `<i class="nav-icon fa fa-clock text-info"></i> <span class="badge-warning">${unity.timeRef(row.date_time, row.date_time_1)}</span>`;
                        } else {
                            return "-";
                        }
                    }
                },
            },
            {
                data: "Transaction_Record.status",
                title: "Status",
                render: function (data, type, row) {
                    data = row.status;
                    if (data == "SUCCESS") {
                        return `<i class="text-green-500 nav-icon fa fa-circle-check"></i> <span class="badge-success">${data}</span>`;
                    } else if (data == "CLOSE") {
                        return `<i class="text-orange-500 nav-icon fa fa-circle-xmark"></i> <span class="badge-warning">${data}</span>`;
                    } else if (data == "CHECK_IN") {
                        return `<i class="text-blue-500 nav-icon fa fa-square-parking"></i> <span class="badge-info">PARKED</span>`;
                    } else {
                        return data;
                    }
                },
            },

            {
                data: "Service_Fees.name",
                title: "Tariff Profile",
                name: "service_fees",
                render: function (data, type, row) {
                    return row.service_fees || "No Tariff Configured";
                },
            },
        ],
    },
);
transaction_parked_table.data_filter = "parked_visitor";

// ? Bisiness Logic
window.submitCheckIn = submitCheckIn;
async function submitCheckIn() {
    const tab_content_check_in = document.getElementById("tab_content_check_in");
    if (!tab_content_check_in) return;

    // Read input values using data-field selectors
    const guestNameEl = tab_content_check_in.querySelector('[data-field="check_in_guest_name"]');
    const roomIdEl = tab_content_check_in.querySelector('[data-field="member_user_id"]');
    const checkInTimeEl = tab_content_check_in.querySelector('[data-field="check_in_time"]');
    const checkOutTimeEl = tab_content_check_in.querySelector('[data-field="check_out_time"]');
    const car_cards_container = tab_content_check_in.querySelector('[data-field="car_cards_container"]');

    const guestName = guestNameEl ? guestNameEl.value.trim() : "";
    const roomId = roomIdEl ? roomIdEl.value : "";
    const checkInTime = checkInTimeEl ? checkInTimeEl.value.trim() : "";
    const checkOutTime = checkOutTimeEl ? checkOutTimeEl.value.trim() : "";

    // 1. Validation - Guest Name
    if (!guestName) {
        unity.showDialogWarning({ title: "Visitor Name Required", msg: "Please enter visitor/guest name" });
        return;
    }

    // 2. Validation - Room Select (member_user_id)
    if (!roomId) {
        unity.showDialogWarning({ msg: "Please select room / unit number" });
        return;
    }

    // 3. Validation - Check-in / Check-out Times
    if (!checkInTime) {
        unity.showDialogError({ msg: "Please select check-in date & time" });
        return;
    }
    if (!checkOutTime) {
        unity.showDialogError({ msg: "Please select check-out date & time" });
        return;
    }

    // Check-out date must be after Check-in date
    const checkInDate = new Date(checkInTime.replace(" ", "T"));
    const checkOutDate = new Date(checkOutTime.replace(" ", "T"));
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        unity.showDialogError({ msg: "Invalid date/time format" });
        return;
    }
    if (checkOutDate <= checkInDate) {
        unity.showDialogError({ msg: "Check-out time must be after check-in time" });
        return;
    }

    // 4. Validation - At least one vehicle card must be present
    const carCards = car_cards_container.querySelectorAll(".group");
    if (carCards.length === 0) {
        unity.showDialogError({ msg: "Please register at least 1 license plate" });
        return;
    }

    const platesHtml = Array.from(carCards)
        .map((card) => {
            const plateNo =
                card.querySelector('[name="plate_number"]')?.textContent ||
                card.querySelector("span")?.textContent ||
                "";
            const imgSrc = card.querySelector('[name="car_image"]')?.src || "/static/image/no_image.png";
            return `
            <div class="flex items-center gap-3 p-2 bg-base-200/50 border border-base-200 rounded-box">
                <img class="w-14 h-10 object-cover rounded-box shadow-sm bg-base-300" src="${imgSrc}">
                <div class="inline-flex flex-col items-start border border-base-content/10 bg-base-100 px-2 py-0.5 rounded-box shadow-sm min-w-22.5 text-center">
                    <span class="font-black text-xs text-base-content leading-tight tracking-wide">${plateNo}</span>
                </div>
            </div>
        `;
        })
        .join("");

    const content_confirm_html = `
        <div class="flex flex-col gap-4 text-left my-2 text-sm text-base-content">
            <!-- Guest Details -->
            <div class="flex flex-col gap-1.5 pb-3 border-b border-base-200">
                <div class="flex justify-between">
                    <span class="opacity-70">Guest / Visitor:</span>
                    <span class="font-bold text-base-content">${guestName}</span>
                </div>
                <div class="flex justify-between">
                    <span class="opacity-70">Room / Unit:</span>
                    <span class="font-bold text-primary">${roomIdEl.options[roomIdEl.selectedIndex] ? roomIdEl.options[roomIdEl.selectedIndex].text : roomId}</span>
                </div>
                <div class="flex justify-between">
                    <span class="opacity-70">Remarks:</span>
                    <span class="font-semibold text-base-content/80">${tab_content_check_in.querySelector('[data-field="remark"]')?.value.trim() || "-"}</span>
                </div>
            </div>

            <!-- Times range -->
            <div class="flex flex-col gap-1.5 pb-3 border-b border-base-200">
                <div class="flex justify-between items-center">
                    <span class="opacity-70 flex items-center gap-1.5"><i class="fa-solid fa-right-to-bracket text-success text-xs"></i> Check-In Time:</span>
                    <span class="font-semibold">${checkInTime}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="opacity-70 flex items-center gap-1.5"><i class="fa-solid fa-right-from-bracket text-error text-xs"></i> Check-Out Time:</span>
                    <span class="font-semibold">${checkOutTime}</span>
                </div>
            </div>

            <!-- Vehicles list -->
            <div class="flex flex-col gap-2">
                <span class="font-bold text-xs opacity-75">Registered Vehicles for Room (${carCards.length} vehicles):</span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${platesHtml}
                </div>
            </div>
        </div>
    `;

    const result = await unity.showDialogConfirm({
        title: "Confirm Check-In Registration?",
        content: content_confirm_html,
        cancelBtn: true,
    });

    if (!result.confirm) {
        return;
    }

    // If validation passes, simulate loading and success
    unity.showDialogLoading("Saving registration and configuring LPR gate access...");
    try {
        const vehicles = [];
        carCards.forEach((card) => {
            const plateNo = card.querySelector('[name="plate_number"]')?.textContent;
            const item_type = card.querySelector('[name="item_type"]')?.textContent || "";
            vehicles.push({
                plate: plateNo.trim(),
                item_type: item_type.trim(),
            });
        });

        const payload = {
            guest_name: guestName,
            member_user_id: roomId,
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
            remark: tab_content_check_in.querySelector('[data-field="remark"]')?.value.trim() || "",
            vehicles: vehicles,
        };

        const respond = await unity.fetchApi(
            "/api/function/checkin_member_guest",
            "post",
            JSON.stringify(payload),
            "json",
        );
        unity.closeDialogLoading();
        if (respond.success) {
            unity.showDialogSuccess({
                title: "Check-In Completed",
                msg: respond.msg,
            });

            unity.clear_fields(tab_content_check_in);

            // Clear vehicle cards
            const container = document.getElementById("check_in_car_cards_container");
            if (container) {
                container.innerHTML = "";
            }

            // Reset check-in to current time and check-out to tomorrow at 12:00
            const pad = (n) => String(n).padStart(2, "0");
            const now = new Date();
            const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
            if (checkInTimeEl && checkInTimeEl._flatpickr) {
                checkInTimeEl._flatpickr.setDate(nowStr);
            } else if (checkInTimeEl) {
                checkInTimeEl.value = nowStr;
            }

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowNoonStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())} 12:00`;
            if (checkOutTimeEl && checkOutTimeEl._flatpickr) {
                checkOutTimeEl._flatpickr.setDate(tomorrowNoonStr);
            } else if (checkOutTimeEl) {
                checkOutTimeEl.value = tomorrowNoonStr;
            }
        } else {
            unity.showDialogError({
                title: "Check-In Registration Error",
                msg: respond.msg || "An error occurred during check-in registration",
            });
        }
    } catch (err) {
        unity.closeDialogLoading();
        console.error("Error executing submitCheckIn:", err);
        unity.showDialogError({ msg: "An error occurred during check-in registration" });
    }
}

// ? --------------------------------------------------
window.event_tab_active = event_tab_active;
function event_tab_active(el) {
    const tab_id = el.id;
    localStorage.setItem("VISITOR_LOBBY_CHECK_TAB_ACTIVE", tab_id);
    const v = localStorage.getItem("VISITOR_LOBBY_CHECK_TAB_ACTIVE");
    console.log("🚀 Event_tab_active", v);
    if (tab_id === "VISITOR_LOBBY_CHECK_TAB03") {
        if (hotel_guests_table) {
            hotel_guests_table.reload();
        }
    }
}

async function init_select_option() {
    const tab_content_check_in = document.getElementById("tab_content_check_in");
    unity.init_selects_option(
        [tab_content_check_in.querySelector('[data-field="member_user_id"]')],
        "/api/member/user",
    );
}

async function Init() {
    // Check which tab is active and set it
    const default_tab = "VISITOR_LOBBY_CHECK_TAB01";
    if (localStorage.getItem("VISITOR_LOBBY_CHECK_TAB_ACTIVE")) {
        const v = localStorage.getItem("VISITOR_LOBBY_CHECK_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    } else {
        document.getElementById(default_tab).checked = true;
    }
    await init_select_option();
    const tab_content_check_in = document.getElementById("tab_content_check_in");

    // Set check-in default to now
    const checkInEl = tab_content_check_in.querySelector('[data-field="check_in_time"]');
    if (checkInEl) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        if (checkInEl._flatpickr) {
            checkInEl._flatpickr.setDate(nowStr);
        } else {
            checkInEl.value = nowStr;
        }
    }

    // Set check-out default to tomorrow at 12:00 PM
    const checkOutEl = tab_content_check_in.querySelector('[data-field="check_out_time"]');
    if (checkOutEl) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const pad = (n) => String(n).padStart(2, "0");
        const tomorrowNoonStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())} 12:00`;
        if (checkOutEl._flatpickr) {
            checkOutEl._flatpickr.setDate(tomorrowNoonStr);
        } else {
            checkOutEl.value = tomorrowNoonStr;
        }
    }

    if (document.getElementById("transaction_parked_table")) {
        transaction_parked_table.init();
    }
    hotel_guests_table.data_type = HotelMemberType_ID;
    hotel_guests_table.init();
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});

function add_item_to_car_card(data, tab_content = "tab_content_check_in") {
    const template = document.getElementById("check_in_car_card_template");
    const container = document.getElementById(tab_content).querySelector('[data-field="car_cards_container"]');

    if (!template || !container) {
        console.error("LPR Car Card Template or Container not found!");
        return;
    }
    if (!data.license) {
        unity.showDialogWarning({ msg: "License plate not found" });
        return;
    }

    // Clone template content
    const clone = template.content.cloneNode(true);

    // Populate data
    clone.querySelector('[name="plate_number"]').textContent = data.license;
    clone.querySelector('[name="car_image"]').src = data.in_images_path;
    clone.querySelector('[name="item_type"]').textContent = data.item_type || "visitor transaction";

    // Append to container
    container.appendChild(clone);
}

// ! Check-in Bisiness Logic
window.selectVisitorTransaction = selectVisitorTransaction;
async function selectVisitorTransaction(data) {
    modal_search_transaction_in.close();
    console.log(data);
    add_item_to_car_card(data, "tab_content_check_in");
}

window.addWithVisitorCheckIn = addWithVisitorCheckIn;
async function addWithVisitorCheckIn() {
    transaction_parked_table.reload();
    modal_search_transaction_in.showModal();
}

window.addWithNewCar = addWithNewCar;
async function addWithNewCar() {
    const content_html = `<fieldset class="fieldset w-full max-w-sm mx-auto p-0 my-2">
                            <label class="label pb-1.5">
                                <span class="label-text font-bold text-sm text-base-content/85 flex items-center gap-1.5">
                                    <i class="fa-solid fa-car-side text-primary"></i> License Plate
                                </span>
                            </label>
                            <input type="text" class="input input-bordered text-center text-2xl font-black uppercase tracking-widest text-primary h-14 bg-base-200/30 focus:bg-base-100 transition-all duration-200" placeholder="e.g. 1AB1234" data-field="returnValue" autofocus autocomplete="off" />
                            <label class="label pt-1.5">
                                <span class="label-text-alt text-base-content/60 font-semibold flex items-start gap-1">
                                    <i class="fa-solid fa-circle-info text-info mt-0.5"></i>
                                    <span>Enter license plate without spaces. Example: <br><b class="text-base-content font-bold">1AB1234</b> or <b class="text-base-content font-bold">AB1234</b></span>
                                </span>
                            </label>
                        </fieldset>`;
    const result = await unity.showDialogConfirm({ title: "Add Vehicle", content: content_html, cancelBtn: true });
    console.log(result);

    if (result.confirm) {
        const data = { license: result.value, item_type: "add new car" };
        add_item_to_car_card(data, "tab_content_check_in");
    }
}

window.setCurrentCheckInTime = setCurrentCheckInTime;
function setCurrentCheckInTime(btn) {
    const input = btn.closest(".join").querySelector(".datetimepicker");
    if (input && input._flatpickr) {
        input._flatpickr.setDate(new Date());
    } else if (input) {
        const now = dayjs().format("YYYY-MM-DD HH:mm");
        input.value = now;
    }
}

window.fillTestData = fillTestData;
function fillTestData() {
    const tab_content_check_in = document.getElementById("tab_content_check_in");
    if (!tab_content_check_in) return;

    // 1. Fill Guest Name
    const guestNameEl = tab_content_check_in.querySelector('[data-field="check_in_guest_name"]');
    if (guestNameEl) {
        guestNameEl.value = "John Doe (LPR Test)";
    }

    // 2. Select first available Room
    const roomIdEl = tab_content_check_in.querySelector('[data-field="member_user_id"]');
    if (roomIdEl && roomIdEl.options.length > 1) {
        for (let i = 0; i < roomIdEl.options.length; i++) {
            if (roomIdEl.options[i].value) {
                roomIdEl.selectedIndex = i;
                $(roomIdEl).trigger("change"); // Trigger Select2 change event if applicable
                break;
            }
        }
    }

    // 3. Fill Remark
    const remarkEl = tab_content_check_in.querySelector('[data-field="remark"]');
    if (remarkEl) {
        remarkEl.value = "Test Group (Auto-Filled Test Data)";
    }

    // 4. Fill Check-in and Check-out Times
    const checkInTimeEl = tab_content_check_in.querySelector('[data-field="check_in_time"]');
    const checkOutTimeEl = tab_content_check_in.querySelector('[data-field="check_out_time"]');

    const pad = (n) => String(n).padStart(2, "0");
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (checkInTimeEl && checkInTimeEl._flatpickr) {
        checkInTimeEl._flatpickr.setDate(nowStr);
    } else if (checkInTimeEl) {
        checkInTimeEl.value = nowStr;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowNoonStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())} 12:00`;
    if (checkOutTimeEl && checkOutTimeEl._flatpickr) {
        checkOutTimeEl._flatpickr.setDate(tomorrowNoonStr);
    } else if (checkOutTimeEl) {
        checkOutTimeEl.value = tomorrowNoonStr;
    }

    // 5. Add 2 test vehicles if container is empty
    const container = tab_content_check_in.querySelector('[data-field="car_cards_container"]');
    if (container && container.querySelectorAll(".group").length === 0) {
        const car1 = { license: "3กข 1234", in_images_path: "/static/image/no_image.png", item_type: "Test Car 1" };
        selectVisitorTransaction(car1);

        const car2 = { license: "กข 5555", in_images_path: "/static/image/no_image.png", item_type: "Test Car 2" };
        selectVisitorTransaction(car2);
    }

    toastr.info("Test data populated successfully!");
}
