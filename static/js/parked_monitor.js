import * as unity from "./unity.js";
// import * as datatable from "./datatable.js";
// localStorage.clear();
let SUB_TYPE = [];
let _temp = document.getElementById("content_parked_info");
const PARKED_INFO = {
    count_of_member: _temp.querySelector('[data-field="count_of_member"]'),
    count_of_visitor: _temp.querySelector('[data-field="count_of_visitor"]'),
    member_list_sub_checked: document.getElementById("member_list_sub_checked"),
    limit_data: _temp.querySelector('[data-field="limit_data"]'),
    order_data: _temp.querySelector('[data-field="order_data"]'),
    date_time_data: _temp.querySelector('[data-field="date_time_data"]'),
};

function timeDifference(startTime, endTime) {
    // Parse the times (assuming they are in H:M:S format)
    const start = startTime;
    const end = endTime;

    // unity.logger.debug(startTime);
    // unity.logger.debug(endTime);

    // Calculate the difference in milliseconds
    let diff = start - end; // difference in milliseconds

    // Convert back to hours, minutes, and seconds
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    // const hours = Math.floor(diff / (1000 * 60 * 60));
    // const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    // const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    // Format hours, minutes, seconds to two digits
    const formattedHours = hours < 10 ? "0" + hours : hours;
    const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    // const formattedSeconds = seconds < 10 ? "0" + seconds : seconds;

    // Return the formatted time difference
    if (days > 0) {
        return `${days} Day ${formattedHours}:${formattedMinutes}`;
    }
    return `${formattedHours}:${formattedMinutes}`;
}

async function Init() {
    unity.logger.debug("set_config start");
    const respond = await unity.fetchApi(`/api/member/type`, "get", null, "json");
    const data = respond.data;
    const stored_localStorageTransaction_Sub = localStorage.getItem("localStorageTransaction_Sub");
    const localStorageTransaction_Sub = stored_localStorageTransaction_Sub
        ? JSON.parse(stored_localStorageTransaction_Sub)
        : [];
    unity.logger.info("localStorageTransaction_Sub", localStorageTransaction_Sub);

    const temp = document.getElementById("template_content_transaction_type");
    for (let index = 0; index < data.length; index++) {
        const d = data[index];
        const Member_Type = d;
        unity.logger.info(Member_Type.name);
        const _c = temp.content.cloneNode(true);
        _c.querySelector('[data-field="name"]').innerHTML = Member_Type.name;
        if (localStorageTransaction_Sub.includes(Member_Type.name)) {
            _c.querySelector('[data-field="checked"]').checked = true;
        }
        PARKED_INFO.member_list_sub_checked.appendChild(_c);
    }
    const _c = temp.content.cloneNode(true);
    _c.querySelector('[data-field="name"]').innerHTML = "VISITOR";
    if (localStorageTransaction_Sub.includes("VISITOR")) {
        _c.querySelector('[data-field="checked"]').checked = true;
    }
    PARKED_INFO.member_list_sub_checked.appendChild(_c);
    member_list_sub_on_change();

    const ORDER_DATA = localStorage.getItem("localStorageORDER_DATA");
    const LIMIT_DATA = localStorage.getItem("localStorageLimitData");
    const DATE_TIME_DATA = localStorage.getItem("localStorageDATE_TIME_DATA");

    PARKED_INFO.order_data.value = ORDER_DATA ? ORDER_DATA : "asc";
    PARKED_INFO.limit_data.value = LIMIT_DATA ? LIMIT_DATA : "1000";
    PARKED_INFO.date_time_data.value = DATE_TIME_DATA ? DATE_TIME_DATA : "to_day";
    unity.logger.info(PARKED_INFO.order_data.value, PARKED_INFO.limit_data.value, PARKED_INFO.date_time_data.value);
    init_data();
    unity.logger.info("set_config end");
}

const PARKED_LISTS = document.getElementById("content_parked_list");

function toQueryString(obj, prefix) {
    let str = [];
    for (let p in obj) {
        if (obj.hasOwnProperty(p)) {
            let k = prefix ? `${prefix}[${p}]` : p;
            let v = obj[p];
            if (v !== null && typeof v === "object" && !Array.isArray(v)) {
                str.push(toQueryString(v, k));
            } else if (Array.isArray(v)) {
                v.forEach((item, i) => {
                    str.push(toQueryString(item, `${k}[${i}]`));
                });
            } else {
                str.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
            }
        }
    }
    return str.join("&");
}

async function init_data() {
    unity.logger.info("INIT DATA INFO");
    // const limit = 10;
    const parked_by_data_filter = {};
    parked_by_data_filter.card_type = SUB_TYPE;
    parked_by_data_filter.date_time = PARKED_INFO.date_time_data.value;
    const ORDER_DATA = PARKED_INFO.order_data.value;
    const LIMIT_DATA = PARKED_INFO.limit_data.value;
    console.log(ORDER_DATA, LIMIT_DATA, parked_by_data_filter);
    const request = {
        draw: 0,
        columns: [
            {
                data: "Transaction_Record.id",
                name: "",
                searchable: true,
                orderable: false,
                search: { value: "", regex: false },
            },
            {
                data: "in_log.images_path",
                name: "",
                searchable: false,
                orderable: false,
                search: { value: "", regex: false },
            },
            {
                data: "Transaction_Record.type",
                name: "transaction_type",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },
            {
                data: "Transaction_Record.card_id",
                name: "",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },
            {
                data: "in_log.license",
                name: "",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },
            {
                data: "Member_User.name",
                name: "",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },
            {
                data: "Parking_Lot.name",
                name: "",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },
            {
                data: "in_log.date_time",
                name: "",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },
            { data: "in_gate.name", name: "", searchable: true, orderable: true, search: { value: "", regex: false } },
            {
                data: "in_log_system_user.name",
                name: "",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },
            {
                data: "Transaction_Record.parked",
                name: "",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },
            {
                data: "Transaction_Record.contact",
                name: "",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },
            {
                data: "Transaction_Record.objective",
                name: "",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },
            {
                data: "Member_User.name",
                name: "",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },

            {
                data: "Member_User.address",
                name: "",
                searchable: true,
                orderable: true,
                search: { value: "", regex: false },
            },
        ],
        order: [{ column: 0, dir: ORDER_DATA, name: "" }],
        start: 0,
        length: LIMIT_DATA,
        search: { value: "", regex: false },
        table: "transaction_table",
        data_filter: "parked_by_data_filter",
        parked_by_data_filter: JSON.stringify(parked_by_data_filter),
    };
    const query = toQueryString(request);
    const _result = await unity.fetchApi(
        // `/api/transaction_record/datatable?data_filter=parked_by_data_filter&order[0][column]=0&order[0][dir]=${ORDER_DATA}&start=0&length=${LIMIT_DATA}&draw=0&parked_by_data_filter=${JSON.stringify(parked_by_data_filter)}`,
        `/api/transaction_record/datatable?${query}`,
        "get",
        null,
        "json",
    );
    // unity.logger.debug(_result);
    if (_result.data) {
        PARKED_LISTS.innerHTML = "";
        const temp = document.getElementById("template_content_parked");
        const datas = _result.data;
        let count_m = 0;
        let count_v = 0;
        const current_time = new Date();
        for (let index = 0; index < datas.length; index++) {
            const data = datas[index];
            // console.log(data);
            if (data.transaction_type == "VISITOR") {
                count_v++;
            } else {
                count_m++;
            }
            const _c = temp.content.cloneNode(true);
            // try {

            if (data.transaction_type == "VISITOR") {
                _c.querySelector('[data-field="transaction_box"]').classList.add("border-primary");
            } else {
                _c.querySelector('[data-field="transaction_box"]').classList.add("border-warning");
            }
            // const image_member = _c.querySelector('[data-field="member_image"]');
            // image_member.src = Member_User ? Member_User.pictureUrl : "/static/image/Image_not_available.png";
            // image_member.onclick = function () {
            //     show_preview_image(image_member.src);
            // };
            _c.querySelector('[data-field="member_name"]').innerHTML = data.name;
            let address = data.address || "";
            address = address.replaceAll(",", "<br>");
            _c.querySelector('[data-field="member_address"]').innerHTML = address;
            _c.querySelector('[data-field="transaction_type"]').innerHTML = data.transaction_type;
            _c.querySelector('[data-field="in_log_license"]').innerHTML = data.license;
            _c.querySelector('[data-field="transaction_id"]').innerHTML = data.id;

            const in_images_paths = data.images_path.split(",");
            const _c_image_01 = _c.querySelector('[data-field="in_image_01"]');
            const _c_image_02 = _c.querySelector('[data-field="in_image_02"]');
            _c_image_01.src = in_images_paths[0];
            _c_image_02.src = in_images_paths[1];

            _c_image_01.onclick = function () {
                show_preview_image(_c_image_01.src);
            };
            _c_image_02.onclick = function () {
                show_preview_image(_c_image_02.src);
            };

            _c.querySelector('[data-field="btn_view_info"]').onclick = function () {
                infoTransactionShow(Transaction_Record.id);
            };

            _c.querySelector('[data-field="in_date_time"]').innerText = data.date_time;
            const time_from_local = timeDifference(current_time, new Date(data.date_time));
            const in_date_times = data.date_time.split("T");
            _c.querySelector('[data-field="in_date_time"]').innerHTML = `
            <div class="text-xl text-primary">${in_date_times[0]}</div>
            <div class="text-xl text-primary">${in_date_times[1].split(".")[0]}</div>`;
            _c.querySelector('[data-field="parked"]').innerHTML = time_from_local;
            // } catch (error) {
            //     unity.logger.error(error);
            // }

            // await unity.delay(500);
            // PARKED_LISTS.insertBefore(_c, PARKED_LISTS.firstChild);
            PARKED_LISTS.appendChild(_c);
        }
        PARKED_INFO.count_of_member.innerText = count_m;
        PARKED_INFO.count_of_visitor.innerText = count_v;
        // datas.forEach(async (data) => {

        // });
        // unity.logger.info(lpr_list);
    } else {
        unity.showToastNotification({ msg: "Not Data transaction_record parked" });
    }
}

window.show_view_transaction = show_view_transaction;
async function show_view_transaction(el) {
    // unity.logger.info(el);
    const _c = el.parentElement.parentElement.parentElement;

    const d = _c.querySelector('[data-field="in_log_license"]').innerText;
    unity.logger.info(d);
    // const elementHTMLString = pel.outerHTML;

    // unity.showDialogInfo({ msg: elementHTMLString });
}

unity.initSse(async (e) => {
    const func = e.func;
    const params = e.params;
    if ((func == "lpr_event") | (func == "reader_event")) {
        unity.logger.info(params);
    }
    if (func == "transaction_event") {
        init_data();
    }
});

setInterval(() => {
    console.log("setInterval update parked");
    const trans = PARKED_LISTS.children;
    const current_time = new Date();
    for (const tran of trans) {
        const time_from_local = timeDifference(
            current_time,
            new Date(tran.querySelector('[data-field="in_date_time_raw"]').innerText),
        );
        const tran_parked = tran.querySelector('[data-field="parked"]');
        tran_parked.innerHTML = time_from_local;
    }
}, 30000);

window.member_list_sub_on_change = member_list_sub_on_change;
async function member_list_sub_on_change() {
    console.log("member_list_sub_on_change");
    const children = PARKED_INFO.member_list_sub_checked.children;
    SUB_TYPE = [];
    for (let i = 0; i < children.length; i++) {
        const c = children[i].querySelector('[data-field="name"]').innerText;
        const c_s = children[i].querySelector('[data-field="checked"]').checked;
        if (c_s) {
            SUB_TYPE.push(c);
        }
    }
    // unity.logger.debug(SUB_TYPE);

    // unity.logger.info(sub_type);
    // init_data();
    const json_sub_type = JSON.stringify(SUB_TYPE);
    // unity.logger.debug(json_sub_type);
    localStorage.setItem("localStorageTransaction_Sub", json_sub_type);
    if (SUB_TYPE.includes("VISITOR")) {
        document.getElementById("visitor_info").classList.remove("hidden");
    } else {
        document.getElementById("visitor_info").classList.add("hidden");
    }
}

window.chang_select_data = chang_select_data;
function chang_select_data() {
    const ORDER_DATA = PARKED_INFO.order_data.value;
    const LIMIT_DATA = PARKED_INFO.limit_data.value;
    const DATE_TIME_DATA = PARKED_INFO.date_time_data.value;
    localStorage.setItem("localStorageORDER_DATA", ORDER_DATA);
    localStorage.setItem("localStorageLimitData", LIMIT_DATA);
    localStorage.setItem("localStorageDATE_TIME_DATA", DATE_TIME_DATA);
    init_data();
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();
    unity.initI18n();
});
