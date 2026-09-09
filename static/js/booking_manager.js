import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

// Booking Member Table
const booking_member_model_table = new table_class.TableModel(
    "#booking_member_table",
    "/api/member/booking/datatable",
    {
        table: "Booking_Member",
        // select: true,
        columns: [
            {
                data: "Booking_Member.id",
                title: "Actions",
                orderable: false,
                render: function (data, type, row) {
                    return table_class.actionButtonsTemplate(data);
                },
            },
            {
                data: "Booking_Member.card_id",
                title: "Card ID / Plate",
                render: function (data, type) {
                    return String(data);
                },
            },
            {
                data: "Booking_Member.status",
                title: "Status",
                render: function (data, type) {
                    switch (data) {
                        case "REGISTER":
                            return `<span class="badge badge-info badge-lg">${data}</span>`;
                        case "CHECK_IN":
                            return `<span class="badge badge-warning badge-lg">${data}</span>`;
                        case "CHECK_OUT":
                            return `<span class="badge badge-primary badge-lg">${data}</span>`;
                        case "SUCCESS":
                            return `<span class="badge badge-success badge-lg">${data}</span>`;

                        default:
                            return `<span class="badge badge-secondary badge-lg">${data}</span>`;
                            break;
                    }
                },
            },
            {
                data: "Booking_Member.booking_type",
                title: "Booking Type",
                render: function (data, type) {
                    switch (data) {
                        case "ONE-TIME-BOOKING":
                            return `<span class="badge badge-info ">${data}</span>`;
                        case "ALL-TIME-BOOKING":
                            return `<span class="badge badge-primary ">${data}</span>`;
                        default:
                            return `<span class="badge badge-secondary ">${data}</span>`;
                            break;
                    }
                },
            },
            {
                data: "Member_User",
                title: "Member Privilege",
                render: function (data, type) {
                    if (data) {
                        return data.name;
                    }
                    return `<span class="badge badge-soft badge-warning">Unassigned</span>`;
                },
            },
            {
                data: {},
                title: "Operator",
                orderable: false,
                render: function (data, type) {
                    switch (data.Booking_Member.booking_create_type) {
                        case "SYSTEM-USER":
                            return `<span class="badge badge-primary ">⚠️ ${data.System_Users.name}</span>`;
                            break;
                        default:
                            return `<span class="badge badge-warning "><i class="fa-regular fa-circle-user"></i>${data.Booking_Member.booking_create_type}</span>`;
                            break;
                    }
                },
            },
            {
                data: "Booking_Member.create_date_time",
                title: "Issue Date",
                render: function (data, type) {
                    const _d = unity.dateTimeToStr(data);
                    return _d;
                },
            },
            {
                data: "Booking_Member.start_date_time",
                title: "📅 Start Date",
                render: function (data, type) {
                    const _d = unity.dateTimeToStr(data);
                    return _d;
                },
            },
            {
                data: "Booking_Member.expire_date_time",
                title: "📅 Expiration Date",
                render: function (data, type) {
                    const _d = unity.dateTimeToStr(data);
                    return _d;
                },
            },
            {
                data: {},
                title: "Remaining Time",
                orderable: false,
                render: function (data, type) {
                    if (!data?.Booking_Member?.expire_date_time) {
                        return `<span class="badge badge-info badge-soft">Unlimited</span>`;
                    }
                    const _now = dayjs();
                    const _d_start = dayjs(data.Booking_Member.start_date_time);
                    const _d_end = dayjs(data.Booking_Member.expire_date_time);

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
            // {
            //     data: "Booking_Member.contact",
            //     title: "Contact",
            // },
            // {
            //     data: "Booking_Member.objective",
            //     title: "Purpose",
            // },
            {
                data: "Booking_Member.remark",
                title: "Remarks",
            },
        ],
    },
    {
        addbtn: true,
    },
);
booking_member_model_table.create_item_control({
    modal_from: Modal_Booking_Member,
    api_endpoint: "/api/member/booking",
});
// ! ------------------------------------------------------

async function init_select_option() {
    unity.init_select_option(Modal_Booking_Member, "/api/service_fees", "service_fees_id");

    unity.init_selects_option(
        [Modal_Booking_Member.querySelector('[data-field="member_user_id"]')],
        "/api/member/user",
    );
    unity.init_selects_option([Modal_Booking_Member.querySelector('[data-field="objective_id"]')], "/api/objective");
    unity.init_select_option(Modal_Booking_Member, "/api/vehicle_type", "vehicle_type_id");
    unity.init_select_option(Modal_Booking_Member, "/api/fuel_type", "fuel_type_id");
}

async function Init() {
    await init_select_option();
    const default_tab = "BOOKING_MANAGER_TAB01";

    booking_member_model_table.init();

    if (localStorage.getItem("BOOKING_MANAGER_TAB_ACTIVE")) {
        const v = localStorage.getItem("BOOKING_MANAGER_TAB_ACTIVE");
        unity.logger.info("localStorage", v);
        if (v) {
            if (document.getElementById(v)) {
                document.getElementById(v).checked = true;
            }
        }
    } else {
        console.log("default", default_tab);
        document.getElementById(default_tab).checked = true;
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
