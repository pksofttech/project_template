import * as unity from "./unity.js";
import * as table_class from "./_table_class.js";

import "/static/common/video-stream.js";

(() => {
    console.log("🟢🟢🟢");

    const ks = Object.keys(localStorage);

    let m = 0;
    for (const k of ks) {
        if (k.length > m) {
            m = k.length;
        }
    }
    m += 4; // Offset 4

    for (const k of ks) {
        if (k.startsWith("DataTables_")) {
            continue;
        }
        const value = localStorage.getItem(k) || "null";
        unity.logger.info(k.padEnd(m, " "), "|", value);
    }

    unity.logger.info("GATE_MODE\t\t\t", GATE_MODE);
    console.log("🟢🟢🟢");
})();
class DeviceAppService {
    isConnect = false;
    // host = "http://192.168.1.219:8080";
    host = "http://localhost:8080";

    async init() {
        console.log(`🚀 DeviceAppService constructor host:${this.host}`);
    }
    async getStatus() {
        const result = await unity.fetchApi(this.host + "/api/getstatus", "get", null, "json");
        if (!!result) {
            // debug(result);
            return result;
        }
        return null;
    }
    async printImage(element) {
        unity.showDialogInfo({
            title: "Processing...",
            msg: `<div class=text-center><div class="loading loading-spinner text-info loading-lg text-center"></div></div>`,
        });
        const formData = new FormData();
        formData.append("cmd", "PRINT_IMAGE");
        const canvas = document.getElementById("canvas_for_temp");
        const ratio = element.width / element.height;
        canvas.width = 380;
        canvas.height = canvas.width / ratio;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
        formData.append("image", await unity.dataURLtoFile(base64Image, "image"));
        // unity.showDialogInfo({ msg: formData });
        unity.debugForm(formData);
        const _reply = await unity.fetchApi(this.host + "/api/printImage", "post", formData, "json", false, 15000);
        // unity.showDialogSuccess({ msg: _reply.msg });
        Dialog_Info.close();
        if (!!_reply) {
            // debug(result);
            return _reply;
        }
        return null;
    }
}

export const deviceAppService = GATE_MODE == "HANDHELD" ? new DeviceAppService() : null;
if (deviceAppService) {
    deviceAppService.init();
    console.log(" 🚀 deviceAppService init");
}
// CONST VARIABLES
let SERVICES_FEES_LIST = null;
let SERVICES_FEES_DEFAULT = null;
let CONTACT_LIST = [];
let OBJECTIVE_LIST = [];
let VEHICLE_TYPE_LIST = [];
let FUEL_TYPE_LIST = [];
let VISITOR_LIST = [];

let isNativeApp = false;
let is_processing_gate_in = false;

// ? transactions_gate_out
let transactions_gate_out = {};

/**
 * Searches a list of objects for a specific value and returns its corresponding ID.
 * * @param {any} value - The value to search for (e.g., a string or number).
 * @param {Array<Object>} list - Array of objects, each expected to have 'value' and 'id' properties.
 * @returns {any|null} - Returns the 'id' if found, otherwise returns null.
 */
function getValueInList(value, list) {
    // Check for null/undefined specifically so 0 or false can still be searched
    if (value === null || value === undefined || !list) return null;

    const match = list.find((item) => item.value == value);

    if (match) return match.id;

    console.warn("getValueInList not found", value, list);
    return null;
}

let _temp = document.getElementById("gate_in_page");
const GATE_IN = _temp
    ? {
          id: 0,
          name: "",
          cameras: [],
          date_time: _temp.querySelector('[data-field="date_time"]'),
          title: _temp.querySelector('[data-field="title"]'),
          hearbeat_lpr: _temp.querySelector('[data-field="hearbeat_lpr"]'),

          transaction_type: "VISITOR",
          id_card_input: _temp.querySelector('[data-field="id_card"]'),
          license_id_input: _temp.querySelector('[data-field="license_id"]'),
          vehicle_type: _temp.querySelector('[data-field="vehicle_type"]'),
          fuel_type: _temp.querySelector('[data-field="fuel_type"]'),

          visitor_name: _temp.querySelector('[data-field="visitor_name"]'),
          contact_name: _temp.querySelector('[data-field="contact_name"]'),
          objective: _temp.querySelector('[data-field="objective"]'),
          remark: _temp.querySelector('[data-field="remark"]'),

          input_license_id_required: _temp.querySelector('[data-field="input_license_id_required"]'),
          profile: _temp.querySelector('[data-field="input_gate_in_profile"]'),

          gate_in_image_01: _temp.querySelector('[data-field="gate_in_image_01"]'),
          gate_in_image_02: _temp.querySelector('[data-field="gate_in_image_02"]'),
          gate_in_image_03: _temp.querySelector('[data-field="gate_in_image_03"]'),

          tran_date_time: _temp.querySelector('[data-field="tran_date_time"]'),
          tran_card_id: _temp.querySelector('[data-field="tran_card_id"]'),
          tran_license_id: _temp.querySelector('[data-field="tran_license_id"]'),
          tran_profile: _temp.querySelector('[data-field="tran_profile"]'),
          swtich_printer_slip: _temp.querySelector('[data-field="swtich_printer_slip"]'),
          slip_in_image: _temp.querySelector('[data-field="slip_in_image"]'),
          panel_view: _temp.querySelector('[data-field="panel_view"]'),
          is_lpr_image: false,
          url_image: "",
          control_open_url: "",
      }
    : { id: 0 };

_temp = document.getElementById("gate_out_page");

const GATE_OUT = _temp
    ? {
          id: 0,
          transaction_id: 0,
          acc: null,
          name: "",
          url_image: "",
          cameras: [],
          cashier_pos_id: _temp.querySelector('[data-field="cashier_pos_id"]'),
          date_time: _temp.querySelector('[data-field="date_time"]'),
          title: _temp.querySelector('[data-field="title"]'),
          hearbeat_lpr: _temp.querySelector('[data-field="hearbeat_lpr"]'),
          id_card_input: _temp.querySelector('[data-field="id_card"]'),
          license_id_input: _temp.querySelector('[data-field="license_id"]'),

          in_datetime: _temp.querySelector('[data-field="in_datetime"]'),
          in_gate: _temp.querySelector('[data-field="in_gate"]'),
          in_type: _temp.querySelector('[data-field="in_type"]'),
          remark: _temp.querySelector('[data-field="remark"]'),

          profile: _temp.querySelector('[data-field="profile"]'),
          //   profile_format: _temp.querySelector('[data-field="profile_format"]'),
          parked_time: _temp.querySelector('[data-field="parked_time"]'),
          service_fees_info: _temp.querySelector('[data-field="service_fees_info"]'),
          amount: _temp.querySelector('[data-field="amount"]'),
          fine: _temp.querySelector('[data-field="fine"]'),
          parked_fine: _temp.querySelector('[data-field="parked_fine"]'),
          net_total_amount: _temp.querySelector('[data-field="net_total_amount"]'),

          contact: _temp.querySelector('[data-field="contact"]'),
          objective: _temp.querySelector('[data-field="objective"]'),
          stamp_data: _temp.querySelector('[data-field="stamp_data"]'),
          stamp_data_status: _temp.querySelector('[data-field="stamp_data_status"]'),

          member_type: _temp.querySelector('[data-field="member_type"]'),

          gate_in_name: _temp.querySelector('[data-field="gate_in_name"]'),
          gate_in_image_01: _temp.querySelector('[data-field="gate_in_image_01"]'),
          gate_in_image_02: _temp.querySelector('[data-field="gate_in_image_02"]'),
          gate_out_image_01: _temp.querySelector('[data-field="gate_out_image_01"]'),
          gate_out_image_02: _temp.querySelector('[data-field="gate_out_image_02"]'),
          gate_out_image_time_stamp: 0,

          // control_box_submit_gate_out For fine
          control_box_submit_gate_out: _temp.querySelector('[data-field="control_box_submit_gate_out"]'),
          btn_confirm_gate_out_data: _temp.querySelector('[data-field="btn_confirm_gate_out_data"]'),
          swtich_printer_slip: _temp.querySelector('[data-field="swtich_printer_slip"]'),
          switch_auto_extender: _temp.querySelector('[data-field="switch_auto_extender"]'),

          slip_pay_image: _temp.querySelector('[data-field="slip_pay_image"]'),

          tran_date_time: _temp.querySelector('[data-field="tran_date_time"]'),
          tran_card_id: _temp.querySelector('[data-field="tran_card_id"]'),
          tran_license_id: _temp.querySelector('[data-field="tran_license_id"]'),
          tran_profile: _temp.querySelector('[data-field="tran_profile"]'),
          tran_amount: _temp.querySelector('[data-field="tran_amount"]'),
          tran_parked: _temp.querySelector('[data-field="tran_parked"]'),
          code_stamp: [],
          //   Acc Record
          acc_no: _temp.querySelector('[data-field="acc_no"]'),
          acc_date_time: _temp.querySelector('[data-field="acc_date_time"]'),
          acc_pay: _temp.querySelector('[data-field="acc_pay"]'),
          acc_fine: _temp.querySelector('[data-field="acc_fine"]'),
          acc_change: _temp.querySelector('[data-field="acc_change"]'),
          acc_type: _temp.querySelector('[data-field="acc_type"]'),
          control_open_url: "",
      }
    : { id: 0 };

const CASHIER_POS = _temp
    ? {
          // ? Member Card Renew
          member_card_renew: _temp.querySelector('[data-field="member_card_renew"]'),
          member_renew_id_card: _temp.querySelector('[data-field="member_renew_id_card"]'),
          member_renew_status: _temp.querySelector('[data-field="member_renew_status"]'),
          member_renew_create_date: _temp.querySelector('[data-field="member_renew_create_date"]'),
          member_renew_start_date: _temp.querySelector('[data-field="member_renew_start_date"]'),
          member_renew_expire_date: _temp.querySelector('[data-field="member_renew_expire_date"]'),
          member_type_renewal_type: _temp.querySelector('[data-field="member_type_renewal_type"]'),
          member_renew_day_for_use: _temp.querySelector('[data-field="member_renew_day_for_use"]'),
          member_renew_expire_day: _temp.querySelector('[data-field="member_renew_expire_day"]'),
          member_renew_type: _temp.querySelector('[data-field="member_renew_type"]'),
          member_renew_service: _temp.querySelector('[data-field="member_renew_service"]'),
          member_renew_user_image: _temp.querySelector('[data-field="member_renew_user_image"]'),

          member_renew_count: _temp.querySelector('[data-field="member_renew_count"]'),
          member_renew_amount: _temp.querySelector('[data-field="member_renew_amount"]'),
          member_renew_custom_expire: _temp.querySelector('[data-field="member_renew_custom_expire"]'),
          member_renew_custom_amount: _temp.querySelector('[data-field="member_renew_custom_amount"]'),
          member_registration_fee: _temp.querySelector('[data-field="member_registration_fee"]'),
          member_register_user_search: _temp.querySelector('[data-field="member_register_user_search"]'),
          member_register_user_id: _temp.querySelector('[data-field="member_register_user_id"]'),
          member_register_type_select: _temp.querySelector('[data-field="member_register_type_select"]'),
          member_register_start_date: _temp.querySelector('[data-field="member_register_start_date"]'),
          member_renew_total_amount: _temp.querySelector('[data-field="member_renew_total_amount"]'),
          member_renew_expire_after: _temp.querySelector('[data-field="member_renew_expire_after"]'),
          btn_submit_member_renew: _temp.querySelector('[data-field="btn_submit_member_renew"]'),

          member_renew_user_name: _temp.querySelector('[data-field="member_renew_user_name"]'),
          member_renew_user_status: _temp.querySelector('[data-field="member_renew_user_status"]'),
          member_renew_user_address: _temp.querySelector('[data-field="member_renew_user_address"]'),
          member_renew_user_remark: _temp.querySelector('[data-field="member_renew_user_remark"]'),
          member_renew_user_permission: _temp.querySelector('[data-field="member_renew_user_permission"]'),

          //   ? Member User Renew
          member_user_renew_input: _temp.querySelector('[data-field="member_user_renew_input"]'),
          member_user_renew_id: _temp.querySelector('[data-field="member_user_renew_id"]'),
          member_user_renew: _temp.querySelector('[data-field="member_user_renew"]'),
          member_user_renew_status: _temp.querySelector('[data-field="member_user_renew_status"]'),
          member_user_renew_expire_date: _temp.querySelector('[data-field="member_user_renew_expire_date"]'),
          member_user_renew_type: _temp.querySelector('[data-field="member_user_renew_type"]'),

          cashier_pay_mode: _temp.querySelector('[data-field="cashier_pay_mode"]'),
          cashier_member_renew_mode: _temp.querySelector('[data-field="cashier_member_renew_mode"]'),
          cashier_member_user_renew_mode: _temp.querySelector('[data-field="cashier_member_user_renew_mode"]'),
          cashier_active_tab_mode: _temp.querySelector('[data-field="cashier_active_tab_mode"]'),
          member_user_renew_image: _temp.querySelector('[data-field="member_user_renew_image"]'),
          member_user_renew_card_list: _temp.querySelector('[data-field="member_user_renew_card_list"]'),
          member_user_renew_amount: _temp.querySelector('[data-field="member_user_renew_amount"]'),
          member_user_renew_expire_after: _temp.querySelector('[data-field="member_user_renew_expire_after"]'),
          btn_submit_member_user_renew: _temp.querySelector('[data-field="btn_submit_member_user_renew"]'),
      }
    : { id: 0 };

_temp = document.getElementById("gate_info");
const GATE_INFO = _temp
    ? {
          gate_image: _temp.querySelector('[data-field="gate_image"]'),
          parking_lots: _temp.querySelector('[data-field="parking_lots"]'),
          lots: {},
          service_fee_selector_transaction: _temp.querySelector('[data-field="service_fee_selector_transaction"]'),
      }
    : null;
const PAYMENT_SERVICE = {
    qr_code: new QRCode(Dialog_QR_Payment_Wait_Success.querySelector(['[data-field="qr_code"]']), {
        text: "https://home.pksofttech.org",
        width: 128,
        height: 128,
        colorDark: "#0c056d",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
    }),
    qr_code_box: Dialog_QR_Payment_Wait_Success.querySelector(['[data-field="qr_code_box"]']),
    payment_on_terminal: false,
    qr_payment_ref: null,
};

function printSlip(src) {
    unity.showToastNotification({ msg: "Printing receipt..." });
    printJS({
        printable: src,
        type: "image",
        imageStyle: "width:100%; object-fit:contain; display:block; margin:0 auto;",
    });
}

// ! *********************************************** */  GATE SETTING  ********************************************************

window.select_tab_mode = select_tab_mode;
function select_tab_mode(tab_mode) {
    localStorage.setItem("TAB_MODE", tab_mode);
    console.log("🗂️ tab_mode", tab_mode);
    if (CASHIER_POS.cashier_active_tab_mode) {
        const modeMap = {
            CASHIER_PAY_POS: '<i class="fa-solid fa-cash-register mr-2 text-xl"></i> Cashier Terminal (Payment)',
            CASHIER_MEMBER_RENEW_POS:
                '<i class="fa-regular fa-address-card mr-2 text-xl"></i> Renewal Member (Member Card Renewal)',
            CASHIER_MEMBER_USER_RENEW_POS:
                '<i class="fa-regular fa-circle-user mr-2 text-xl"></i> Renewal Member User (Member User Renewal)',
        };
        CASHIER_POS.cashier_active_tab_mode.innerHTML = modeMap[tab_mode] || tab_mode;
    }
}

async function init_select_option() {
    VEHICLE_TYPE_LIST = await unity.init_datalist("list_vehicle_type", "/api/vehicle_type");
    FUEL_TYPE_LIST = await unity.init_datalist("list_fuel_type", "/api/fuel_type");
    VISITOR_LIST = await unity.init_datalist("list_visitor_name", "/api/visitor");
    CONTACT_LIST = await unity.init_datalist("list_contact_name", "/api/member/user");
    OBJECTIVE_LIST = await unity.init_datalist("list_objective", "/api/objective");
    load_member_type_options();
}

window.select_gate_in_handheld = select_gate_in_handheld;
function select_gate_in_handheld() {
    Dialog_Gate_In_Select.showModal();
}
window.select_gate_out_handheld = select_gate_out_handheld;
function select_gate_out_handheld() {
    Dialog_Gate_Out_Select.showModal();
}

window.reload_gate_control = reload_gate_control;
function reload_gate_control(gate_type) {
    const url = new URL(window.location.href);
    if (gate_type == "GATE_IN") {
        const gate_id = Dialog_Gate_In_Select.querySelector('[data-field="id"]').value;
        if (gate_id > 0) {
            url.searchParams.set("gate_in_id", gate_id);
            window.location.href = url.toString();
        }
        Dialog_Gate_In_Select.close();
    } else if (gate_type == "GATE_OUT") {
        const gate_id = Dialog_Gate_Out_Select.querySelector('[data-field="id"]').value;
        if (gate_id > 0) {
            url.searchParams.set("gate_out_id", gate_id);
            window.location.href = url.toString();
        }
        Dialog_Gate_Out_Select.close();
    }
}
async function Init() {
    console.log("Init");
    let respond = null;
    const params = new URLSearchParams(window.location.search);
    console.log(params);

    // ? ***************** CONFIG GATE-IN  ****************************
    if (["GATE_IN", "COMPACT", "HANDHELD"].includes(GATE_MODE)) {
        console.log("SET GATE_IN MODE");
        if (GATE_IN.license_id_input) {
            GATE_IN.license_id_input.readOnly = true;
            GATE_IN.license_id_input.tabIndex = -1;
        }
        if (GATE_IN.id_card_input) {
            GATE_IN.id_card_input.focus();
        }
        let gate_in_id = localStorage.getItem("GATE_IN_ID");
        if (params.get("gate_in_id") != null) {
            gate_in_id = params.get("gate_in_id");
            Dialog_Gate_In_Select.querySelector('[data-field="id"]').value = gate_in_id;
        }
        respond = await unity.fetchApi("/api/gateway?id=" + gate_in_id, "get", null, "json");
        if (respond.success) {
            const gateway_in = respond.data;
            GATE_IN.parking_name = gateway_in.parking_name;
            GATE_IN.name = gateway_in.name;
            GATE_IN.id = gateway_in.id;
            GATE_IN.url_image = gateway_in.images_path;
            GATE_IN.control_open_url = gateway_in.control_open_url;

            GATE_IN.cameras = String(gateway_in.ip_cameras)
                .split("\n")
                .map((x) => x.trim());

            let gate_mode_status = gateway_in.status;
            let gate_mode_status_bg = "info";
            switch (gateway_in.status.toUpperCase()) {
                case "DISABLE":
                    gate_mode_status = "AUTO DISABLE";
                    gate_mode_status_bg = "accent";
                    break;
                case "ENABLE":
                    gate_mode_status = "AUTO ENABLE(ANti Pass Back:ON)";
                    gate_mode_status_bg = "success";
                    break;
                case "ENABLE-OFF-PASS-BACK":
                    gate_mode_status = "AUTO ENABLE(ANti Pass Back:OFF)";
                    gate_mode_status_bg = "error";
                    break;
            }
            GATE_IN.title.innerHTML =
                gateway_in.name +
                `<br><div class="gap-2 badge badge-xs badge-soft badge-${gate_mode_status_bg}">
                    <i class="fa-solid fa-square-parking"></i>
                    ${gate_mode_status}
                  </div>`;
        } else {
            await unity.dialogConfirm({
                title: "Invalid GATE_IN_ID",
                content: "Please check GATE_IN / GATE_OUT lane configuration<br>or contact system administrator",
            });
            location.href = "/page?page=station_config";
            return;
        }

        GATE_IN.swtich_printer_slip.checked = localStorage.getItem("PRINT_SLIP_IN_REQUIRED") == "true" ? true : false;

        console.log("⚙️ init_last_data GATE_IN  " + GATE_IN.id);
        respond = await unity.fetchApi(`/lpr/log?gateway_id=${GATE_IN.id}&limit=1`, "get", null, "json");

        if (respond.success) {
            if (respond.data.length > 0) {
                if (!respond.data[0].Member) {
                    const Lpr_Log = respond.data[0].Lpr_Log;
                    console.log("🚀 Latest Lpr_Log GATE-IN", Lpr_Log);
                    if (GATE_IN.date_time) {
                        GATE_IN.date_time.innerHTML = Lpr_Log.date_time;
                    }
                    const images_paths = Lpr_Log.images_path.split(",");
                    GATE_IN.gate_in_image_01.src = images_paths[0];
                    GATE_IN.gate_in_image_02.src = images_paths[1];
                }
            }
        }

        console.log("CONFIG GATE-IN :", GATE_IN);
    }
    // ? ***************** CONFIG GATE-OUT  ****************************
    if (["CASHIER", "GATE_OUT", "COMPACT", "HANDHELD"].includes(GATE_MODE)) {
        console.log("🚀 SET GATE_OUT MODE : ", GATE_MODE);
        GATE_OUT.id_card_input.focus();
        let gate_out_id = localStorage.getItem("GATE_OUT_ID");
        // ? Over Write GATE_OUT_ID for fix gate out
        if (params.get("gate_out_id") != null) {
            gate_out_id = params.get("gate_out_id"); // (gate_in_id = params.get("gate_in_id "); )
            console.log("🚀 Over Write GATE_OUT_ID : ", gate_out_id);
            Dialog_Gate_Out_Select.querySelector('[data-field="id"]').value = gate_out_id;
        }
        respond = await unity.fetchApi("/api/gateway?id=" + gate_out_id, "get", null, "json");
        if (respond.success) {
            const gateway_out = respond.data;
            GATE_OUT.parking_name = gateway_out.parking_name;
            GATE_OUT.id = gateway_out.id;
            GATE_OUT.name = gateway_out.name;
            GATE_OUT.url_image = gateway_out.images_path;
            GATE_OUT.control_open_url = gateway_out.control_open_url;
            GATE_OUT.cameras = String(gateway_out?.ip_cameras || "")
                .split("\n")
                .map((x) => x.trim())
                .filter((x) => x !== "");

            let gate_mode_status = gateway_out.status;
            let gate_mode_status_bg = "info";
            switch (gateway_out.status.toUpperCase()) {
                case "DISABLE":
                    gate_mode_status = "AUTO DISABLE";
                    gate_mode_status_bg = "accent";
                    break;
                case "ENABLE":
                    gate_mode_status = "AUTO ENABLE(ANti Pass Back:ON)";
                    gate_mode_status_bg = "success";
                    break;
                case "ENABLE-OFF-PASS-BACK":
                    gate_mode_status = "AUTO ENABLE(ANti Pass Back:OFF)";
                    gate_mode_status_bg = "error";
                    break;
            }
            if (GATE_OUT.title) {
                GATE_OUT.title.innerHTML =
                    gateway_out.name +
                    `<br><div class="gap-2 badge badge-xs badge-soft badge-${gate_mode_status_bg}">
                    <i class="fa-solid fa-square-parking"></i>
                    ${gate_mode_status}
                  </div>`;
            }

            // document.getElementById("input_config_gateway_out_image").src = _gateway_out.images_path;
        } else {
            unity.showDialogError({ title: "Invalid GATE_OUT_ID", msg: respond.msg });
            location.href = "/page?page=station_config";
            return;
        }
        GATE_OUT.swtich_printer_slip.checked = localStorage.getItem("PRINT_SLIP_OUT_REQUIRED") == "true" ? true : false;
        const isAutoExtender = localStorage.getItem("AUTO_EXTENDER_REQUIRED") === "true";
        if (GATE_OUT.switch_auto_extender) {
            GATE_OUT.switch_auto_extender.checked = isAutoExtender;
        }

        console.log("⚙️ init_last_data GATE_OUT  " + GATE_OUT.id);
        respond = await unity.fetchApi(`/lpr/log?gateway_id=${GATE_OUT.id}&limit=1`, "get", null, "json");

        if (respond.success) {
            if (respond.data.length > 0) {
                if (!respond.data[0].Member) {
                    const Lpr_Log = respond.data[0].Lpr_Log;
                    console.log("🚀 Latest Lpr_Log GATE-OUT", Lpr_Log);
                    // GATE_OUT.id_card_input.value = Lpr_Log.plate_num;
                    // GATE_OUT.id_card_input.value = "1234";
                    // GATE_OUT.license_id_input.value = Lpr_Log.plate_num;
                    const images_paths = Lpr_Log.images_path.split(",");
                    if (GATE_MODE != "CASHIER") {
                        GATE_OUT.gate_out_image_01.src = images_paths[0];
                        GATE_OUT.gate_out_image_02.src = images_paths[1];
                    }
                }
            }
        }

        const query_string = unity.jsonToQuery({
            draw: 1,
            columns: [
                {
                    data: "Service_Fees_Code.id",
                    name: "",
                    searchable: true,
                    orderable: false,
                    search: { value: "", regex: false },
                },
                {
                    data: "Service_Fees_Code.status",
                    name: "",
                    searchable: true,
                    orderable: true,
                    search: { value: "", regex: false },
                },
                {
                    data: "Service_Fees_Code.name",
                    name: "",
                    searchable: true,
                    orderable: true,
                    search: { value: "", regex: false },
                },
                {
                    data: "Customer.customer_name",
                    name: "",
                    searchable: true,
                    orderable: true,
                    search: { value: "", regex: false },
                },
                {
                    data: "Service_Fees.name",
                    name: "service_fees_name",
                    searchable: true,
                    orderable: true,
                    search: { value: "", regex: false },
                },
                {
                    data: "Service_Fees.id",
                    name: "service_fees_id",
                    searchable: true,
                    orderable: true,
                    search: { value: "", regex: false },
                },
                {
                    data: "Service_Fees_Code.tag",
                    name: "",
                    searchable: true,
                    orderable: true,
                    search: { value: "", regex: false },
                },
                {
                    data: "Service_Fees_Code.remark",
                    name: "",
                    searchable: true,
                    orderable: true,
                    search: { value: "", regex: false },
                },
            ],
            order: [{ column: 0, dir: "asc", name: "" }],
            start: 0,
            length: 10,
            search: { value: "", regex: false },
            table: "Service_Fees_Code",
            filter: "",
            data_filter: "",
            date_range: "",
            data_type: "",
            data_status: "",
        });

        respond = await unity.fetchApi("/api/service_fees/code/datatable?" + query_string, "get", null, "json");
        if (!!respond) {
            const data = respond.data;
            GATE_OUT.code_stamp = data;
        }
        console.log("GATE-code_stamp", GATE_OUT.code_stamp);
        console.log("CONFIG GATE-OUT :", GATE_OUT);
    }

    // ? ***************** CONFIG GATE-PAYMENT  ****************************
    respond = await unity.fetchApi("/api/payment_gateway?payment=config", "get", null, "json");
    console.log("CONFIG GATE-PAYMENT ", respond);
    if (respond.success) {
        const data = respond.data;
        PAYMENT_SERVICE.payment_on_terminal = data.payment_on_terminal ? data.payment_on_terminal : false;

        if (!PAYMENT_SERVICE.payment_on_terminal) {
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="pay_type_qr_code"]')?.classList.add("hidden");
        }
    }

    // ? ***************** CONFIG SERVICES_FEES_USER-IN :SERVICES_FEES_USER-OUT ****************************
    const SERVICES_FEES_USER_IN = ["GENERAL", "IN", "IN-OUT", "ESTAMP-ALLOWED", "CUSTOM-MODE", "DYNAMIC-MODE"];
    const SERVICES_FEES_USER_OUT = ["GENERAL", "OUT", "IN-OUT"];
    respond = await unity.fetchApi("/api/service_fees", "get", null, "json");
    if (respond.success) {
        SERVICES_FEES_LIST = respond.data;
        console.log("SERVICES_FEES_LIST", SERVICES_FEES_LIST);
        let services_fees_list_option = "";
        const _services_fees_list_option_id = localStorage.getItem("GATE_IN_SERVICES_FEE")
            ? parseInt(localStorage.getItem("GATE_IN_SERVICES_FEE"))
            : 0;

        const temp = document.getElementById("template_Service_data");

        const dialog_content = document.getElementById("Dialog_Gate_Out_Select_Profile")
            ? document.getElementById("Dialog_Gate_Out_Select_Profile").querySelector('[data-field="content"]')
            : null;
        if (dialog_content) {
            await SERVICES_FEES_LIST.forEach((service_fees, index, array) => {
                if (SERVICES_FEES_USER_OUT.includes(service_fees.type)) {
                    const _c = temp.content.cloneNode(true);
                    _c.querySelector('[name="title"]').innerHTML = service_fees.type;
                    _c.querySelector('[name="name"]').innerHTML = service_fees.name;
                    _c.querySelector('[name="remark"]').innerHTML = service_fees.remark;
                    _c.querySelectorAll('[name="service_fee_btn_chang"]')[0].setAttribute(
                        "onclick",
                        `chang_profile_gate_out_btn_submit(${service_fees.id},"${service_fees.name}")`,
                    );
                    dialog_content.appendChild(_c);
                }
                if (SERVICES_FEES_USER_IN.includes(service_fees.type)) {
                    const _t_op = `<option value=${service_fees.id}>${service_fees.name}</option>`;
                    services_fees_list_option += _t_op;
                    if (service_fees.id == _services_fees_list_option_id) {
                        SERVICES_FEES_DEFAULT = service_fees;
                    }
                }
            });
        }

        // console.log("SERVICES_FEES_DEFAULT", SERVICES_FEES_DEFAULT);
        if (GATE_IN.id > 0) {
            GATE_IN.profile.innerHTML = services_fees_list_option;
            GATE_IN.profile.value = 1;
            // console.log(Dialog_Gate_In_Proseecss);
            if (document.getElementById("Dialog_Gate_In_Proseecss")) {
                Dialog_Gate_In_Proseecss.querySelector('[data-field="profile"]').innerHTML = services_fees_list_option;
            }
        }
    } else {
        unity.showDialogError({ title: "Invalid Service_Fees", msg: _result.msg });
        location.href = "/page?page=station_config";
        return;
    }

    // ? ***************** CONFIG GATE_INFO ****************************
    if (GATE_INFO) {
        if (GATE_INFO.gate_image) {
            GATE_INFO.gate_image.src = GATE_IN.id > 0 ? GATE_IN.url_image : GATE_OUT.url_image;
        }

        if (GATE_INFO.parking_lots) {
            const temp = document.getElementById("template_Parking_Lot_data");
            if (temp) {
                respond = await unity.fetchApi(`/api/function/parking_lot_list`, "get", null, "json");
                console.log(respond);
                if (respond && respond.success) {
                    GATE_INFO.parking_lots.innerHTML = "";
                    const PARKINGS = respond.data;
                    PARKINGS.forEach((value) => {
                        const p = value.Parking_Lot;
                        const _c = temp.content.cloneNode(true);
                        const lot = {
                            parking_name: _c.querySelector('[name="parking_name"]'),
                            parking_capacity: _c.querySelector('[name="parking_capacity"]'),
                            parking_available: _c.querySelector('[name="parking_available"]'),
                            parking_value: _c.querySelector('[name="parking_value"]'),
                        };
                        if (lot.parking_name) lot.parking_name.textContent = p.name;
                        if (lot.parking_capacity) lot.parking_capacity.textContent = p.limit;
                        if (lot.parking_available) lot.parking_available.textContent = p.limit - p.value;
                        if (lot.parking_value) lot.parking_value.textContent = p.value;
                        GATE_INFO.parking_lots.appendChild(_c);
                        GATE_INFO.lots[p.id] = lot;
                    });
                    console.log(GATE_INFO.lots);
                }
            }
        }

        if (GATE_INFO.service_fee_selector_transaction) {
            GATE_INFO.service_fee_selector_transaction.innerHTML = "";
            const temp = document.getElementById("template_service_fee_selector_transaction_button");
            if (temp && Array.isArray(SERVICES_FEES_LIST)) {
                for (const service_fee of SERVICES_FEES_LIST) {
                    if (SERVICES_FEES_USER_IN.includes(service_fee.type)) {
                        const _c = temp.content.cloneNode(true);
                        const btn = _c.querySelector('[name="service_fee_button"]');
                        if (btn) {
                            btn.textContent = service_fee.name;
                            btn.onclick = () => {
                                submit_gate_in_data(service_fee.id);
                            };
                            GATE_INFO.service_fee_selector_transaction.appendChild(_c);
                        }
                    }
                }
            }
        }
    }

    // ? ***************** CONFIG last_record-gate  ****************************

    respond = await unity.fetchApi(
        `/api/transaction_record/last_record?gate_in_id=${GATE_IN.id}&gate_out_id=${GATE_OUT.id}`,
        "get",
        null,
        "json",
    );
    if (respond.success) {
        const d = respond.data;
        console.log("📢 last_record", d);
        const transaction_in = d.transaction_in;
        const transaction_out = d.transaction_out;
        if (transaction_in && ["GATE_IN", "COMPACT", "HANDHELD"].includes(GATE_MODE)) {
            console.log("transaction_in", transaction_in);
            const In_Log = transaction_in.in_log;
            const Service_Fees = transaction_in.Service_Fees;
            const Transaction_Record = transaction_in.Transaction_Record;
            if (GATE_IN.tran_card_id) {
                GATE_IN.tran_date_time.innerHTML = unity.dateTimeToStr(In_Log.date_time);
                GATE_IN.tran_card_id.innerHTML = In_Log.card_id;
                GATE_IN.tran_license_id.innerHTML = In_Log.license;
                GATE_IN.tran_profile.innerHTML = Service_Fees ? Service_Fees.name : "";
            }

            GATE_IN.slip_in_image.src = `/api/function/slip_in?transaction_id=${Transaction_Record.id}`;
        }
        if (transaction_out && ["GATE_OUT", "COMPACT", "HANDHELD"].includes(GATE_MODE)) {
            console.log("transaction_out ", GATE_MODE, transaction_out);
            const In_Log = transaction_out.in_log;
            const Service_Fees = transaction_out.Service_Fees;
            const Transaction_Record = transaction_out.Transaction_Record;
            const Account_Record = transaction_out.Account_Record;

            if (GATE_OUT.tran_card_id) {
                GATE_OUT.tran_card_id.innerHTML = In_Log.card_id;
                GATE_OUT.tran_license_id.innerHTML = In_Log.license;
                GATE_OUT.tran_profile.innerHTML = Service_Fees.name;
                GATE_OUT.tran_amount.innerHTML = Account_Record.amount;
            }

            if (GATE_MODE == "COMPACT") {
                GATE_OUT.tran_date_time.innerHTML = unity.dateTimeToStr(In_Log.date_time);
                GATE_OUT.tran_parked.innerHTML = unity.secondsToDuration(Transaction_Record.parked);
                GATE_OUT.slip_pay_image.src = `/api/function/slip_pay?acc_id=${Account_Record.id}`;
            }
            if (GATE_MODE == "GATE_OUT") {
                GATE_OUT.tran_date_time.innerHTML = unity.dateTimeToStr(In_Log.date_time);
                GATE_OUT.tran_parked.innerHTML = unity.secondsToDuration(Transaction_Record.parked);
                GATE_OUT.slip_pay_image.src = `/api/function/slip_pay?acc_id=${Account_Record.id}`;
            }
            if (GATE_MODE == "HANDHELD") {
                // GATE_OUT.tran_date_time.innerHTML = unity.dateTimeToStr(In_Log.date_time);
                // GATE_OUT.tran_parked.innerHTML = unity.secondsToDuration(Transaction_Record.parked);
                GATE_OUT.slip_pay_image.src = `/api/function/slip_pay?acc_id=${Account_Record.id}`;
            }
        }
    } else {
        unity.showToastNotification({ msg: respond.msg });
    }

    if (GATE_MODE == "CASHIER") {
        if (localStorage.getItem("LAST_SLIP_PAY_ACC")) {
            GATE_OUT.slip_pay_image.src = localStorage.getItem("LAST_SLIP_PAY_ACC");
        } else {
            GATE_OUT.slip_pay_image.src = `/api/function/slip_pay_acc?acc_id=demo`;
        }
        // GATE_OUT.slip_pay_image.src = `/api/function/slip_pay_acc?acc_id=demo`;

        const tab_mode = localStorage.getItem("TAB_MODE") || "CASHIER_PAY_POS";
        switch (tab_mode) {
            case "CASHIER_PAY_POS":
                CASHIER_POS.cashier_pay_mode.checked = true;
                break;
            case "CASHIER_MEMBER_RENEW_POS":
                CASHIER_POS.cashier_member_renew_mode.checked = true;
                break;
            case "CASHIER_MEMBER_USER_RENEW_POS":
                CASHIER_POS.cashier_member_user_renew_mode.checked = true;
                break;
            default:
                break;
        }
        select_tab_mode(tab_mode);
    }
    console.log("*******  END CONFIG ********");

    await init_select_option();
}

// ! *********************************************** */  GATE IN  ********************************************************

window.input_id_card_onkeypress = input_id_card_onkeypress;
async function input_id_card_onkeypress(e) {
    if (e.key === "Enter" || e.keyCode === 13) {
        if (is_processing_gate_in) {
            console.warn("⚠️ [Gate-In Locked] Entry transaction is already in progress...");
            return;
        }

        const cardVal = GATE_IN.id_card_input ? GATE_IN.id_card_input.value.trim() : "";
        const licVal = GATE_IN.license_id_input ? GATE_IN.license_id_input.value.trim() : "";

        if (cardVal) {
            GATE_IN.id_card_input.value = unity.validateTransactionString(cardVal);

            // 🚗 Auto-detect & Record: หากช่อง Card ID มีข้อมูลที่เป็นรูปแบบทะเบียน หรือช่องทะเบียนยังว่างอยู่
            // ให้บันทึก/คัดลอกค่าทะเบียนลงช่อง License Plate อัตโนมัติ เพื่อจัดเก็บลงระบบและพิมพ์ลงบนสลิป
            if (!licVal || licVal === "") {
                if (unity.isThaiLicensePlate(cardVal) || !unity.isCardIdPattern(cardVal)) {
                    if (GATE_IN.license_id_input) {
                        GATE_IN.license_id_input.value = cardVal;
                    }
                }
            }
        } else if (licVal) {
            // 📸 2.1 LPR Fallback: หากกล้อง LPR อ่านทะเบียนได้สำเร็จ และช่อง Card ID ยังว่างอยู่ เมื่อกด Enter
            // ให้นำเลขทะเบียนเป็นการ์ดไอดีส่งเข้าระบบโดยอัตโนมัติ
            GATE_IN.id_card_input.value = licVal;
        }
        submit_gate_in_data();
    }
}

window.snap_gate_in_cameras = snap_gate_in_cameras;
function snap_gate_in_cameras() {
    console.log("📸 snap_gate_in_cameras");
    console.log(GATE_IN.cameras);
    if (!GATE_IN.cameras) {
        unity.showToastNotification({ msg: "GATE_IN Camera not configured" });
        return;
    }
    const ts = Date.now();
    let camera = "";
    if (GATE_IN.cameras.length >= 1) {
        camera = GATE_IN.cameras[0];
        if (camera) {
            unity.snapIpCameraToImageElement(
                camera,
                Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_01"]'),
            );
            unity.showToastNotification({ msg: "📸  Capturing snapshot 01..." });
        }
    }
    if (GATE_IN.cameras.length >= 2) {
        camera = GATE_IN.cameras[1];
        if (camera) {
            unity.snapIpCameraToImageElement(
                camera,
                Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_02"]'),
            );
            unity.showToastNotification({ msg: "📸  Capturing snapshot 02..." });
        }
    }
}

let edit_transaction_id = 0;
window.editTransaction = editTransaction;
async function editTransaction(id) {
    console.log("editTransaction id:", id);
    edit_transaction_id = id;
}

window.update_gate_in_service_fee_profile = update_gate_in_service_fee_profile;
function update_gate_in_service_fee_profile() {
    for (let i = 0; i < SERVICES_FEES_LIST.length; i++) {
        if (SERVICES_FEES_LIST[i].id == Dialog_Gate_In_Proseecss.querySelector('[data-field="profile"]').value) {
            Dialog_Gate_In_Proseecss.querySelector('[data-field="entrance_fee"]').textContent =
                SERVICES_FEES_LIST[i].entrance_fee;
            if (SERVICES_FEES_LIST[i].entrance_fee > 0) {
                Dialog_Gate_In_Proseecss.querySelector('[data-field="pay_box"]').classList.remove("hidden");
                Dialog_Gate_In_Proseecss.querySelector('[data-field="pay"]').focus();
            } else {
                Dialog_Gate_In_Proseecss.querySelector('[data-field="pay_box"]').classList.add("hidden");
            }
            console.log("🆎 update_gate_in_service_fee_profile entrance_fee", SERVICES_FEES_LIST[i].entrance_fee);
            break;
        }
    }
}

window.filter_service_fee_buttons = filter_service_fee_buttons;
function filter_service_fee_buttons(query) {
    const container =
        GATE_INFO?.service_fee_selector_transaction ||
        document.querySelector('[data-field="service_fee_selector_transaction"]');
    if (!container) return;
    const term = (query || "").trim().toLowerCase();
    const buttons = container.querySelectorAll('[name="service_fee_button"]');
    buttons.forEach((btn) => {
        const text = (btn.textContent || "").toLowerCase();
        if (!term || text.includes(term)) {
            btn.classList.remove("hidden");
        } else {
            btn.classList.add("hidden");
        }
    });
}

window.submit_member_fast_gate_in = submit_member_fast_gate_in;
async function submit_member_fast_gate_in({ card_id, license_id, service_fees_id, member_user, remark }) {
    if (is_processing_gate_in) {
        console.warn("⚠️ [Gate-In Locked] Fast gate-in already processing.");
        return;
    }
    is_processing_gate_in = true;

    try {
        unity.showDialogInfo({
            title: unity.i18next_translate("Processing"),
            msg: `<span class="loading loading-spinner text-info loading-lg"></span>`,
        });

        const formData = new FormData();
        formData.append("gateway_id", GATE_IN.id);
        formData.append("card_id", card_id);
        formData.append("license", license_id && license_id !== "-" ? license_id : "");
        formData.append("time", Date.now());
        formData.append("transaction_type", "MEMBER");
        if (service_fees_id) formData.append("service_fees_id", service_fees_id);
        if (member_user) formData.append("visitor_name", member_user);
        if (remark) formData.append("remark", remark);

        // Capture camera snapshots
        if (GATE_IN.cameras && GATE_IN.cameras.length >= 1) {
            try {
                const camera01 = GATE_IN.cameras[0];
                if (camera01) {
                    const img1 = await unity.dataURLtoFile(
                        `/proxy?url=${encodeURI(camera01)}&t=${Date.now()}`,
                        "image_upload_01.jpg",
                    );
                    if (img1) formData.append("image_upload_01", img1);
                }
            } catch (e) {
                console.error("Camera 1 snap error:", e);
            }
            try {
                if (GATE_IN.cameras.length >= 2 && GATE_IN.cameras[1]) {
                    const img2 = await unity.dataURLtoFile(
                        `/proxy?url=${encodeURI(GATE_IN.cameras[1])}&t=${Date.now()}`,
                        "image_upload_02.jpg",
                    );
                    if (img2) formData.append("image_upload_02", img2);
                }
            } catch (e) {
                console.error("Camera 2 snap error:", e);
            }
        } else if (
            GATE_IN.gate_in_image_01 &&
            GATE_IN.gate_in_image_01.src &&
            !GATE_IN.gate_in_image_01.src.includes("license_plate.jpg")
        ) {
            const img1 = await unity.dataURLtoFile(GATE_IN.gate_in_image_01.src, "image_upload_01.jpg");
            if (img1) formData.append("image_upload_01", img1);
            if (
                GATE_IN.gate_in_image_02 &&
                GATE_IN.gate_in_image_02.src &&
                !GATE_IN.gate_in_image_02.src.includes("car.png")
            ) {
                const img2 = await unity.dataURLtoFile(GATE_IN.gate_in_image_02.src, "image_upload_02.jpg");
                if (img2) formData.append("image_upload_02", img2);
            }
        }

        unity.debugForm(formData);
        const _api_path = "/api/function/check_in";
        const respond = await unity.fetchApi(_api_path, "post", formData, "json");
        Dialog_Info.close();

        if (respond && respond.success == true) {
            const transaction = respond.data;
            const In_Log = respond.Log_Transaction;

            if (GATE_IN.tran_date_time) {
                GATE_IN.tran_date_time.innerHTML = unity.dateTimeToStr(In_Log.date_time);
                GATE_IN.tran_card_id.innerHTML = In_Log.card_id;
                GATE_IN.tran_license_id.innerHTML = In_Log.license;
                if (GATE_IN.tran_profile && GATE_IN.profile && GATE_IN.profile.options && GATE_IN.profile.selectedIndex >= 0) {
                    GATE_IN.tran_profile.innerHTML = GATE_IN.profile.options[GATE_IN.profile.selectedIndex].text;
                }
            }

            if (GATE_IN.swtich_printer_slip && GATE_IN.swtich_printer_slip.checked) {
                await loadSlipInImage(transaction, "slip_in");
                await print_slip_in();
            }

            unity.showToastNotification({
                icon: "success",
                title: unity.i18next_translate("Transaction completed successfully"),
                msg: `Member: ${card_id} checked in.`,
            });

            process_gate_in_open();
            clear_gate_in_filed();
            if (GATE_IN.id_card_input) GATE_IN.id_card_input.focus();
        } else {
            const _err = `${JSON.stringify(respond)}<br>${respond ? respond.msg || respond.statusText : "Check-in failed"}`;
            unity.showDialogError({ msg: _err });
        }
    } catch (error) {
        console.error("❌ submit_member_fast_gate_in error:", error);
        Dialog_Info.close();
        unity.showDialogError({ msg: `Check-in exception: ${error?.message || error}` });
    } finally {
        is_processing_gate_in = false;
    }
}

window.submit_gate_in_data = submit_gate_in_data;

async function submit_gate_in_data(service_fee_id = null) {
    if (is_processing_gate_in) {
        console.warn("⚠️ [Gate-In Locked] submit_gate_in_data ignored because transaction is already processing.");
        return;
    }
    is_processing_gate_in = true;

    try {
        const license_id_input = GATE_IN.license_id_input;
        const card_id_input = GATE_IN.id_card_input;

        if (card_id_input && card_id_input.value) {
            card_id_input.value = unity.validateTransactionString(card_id_input.value);
        }

        let card_id = card_id_input ? card_id_input.value.trim() : "";
        let license_id = license_id_input ? license_id_input.value.trim() : "";

        // 📸 2.1 LPR Fallback: หากกล้อง LPR อ่านทะเบียนได้สำเร็จ และช่อง Card ID ยังว่างอยู่
        // ให้นำเลขทะเบียนเป็นการ์ดไอดีส่งเข้าระบบโดยอัตโนมัติ
        if (!card_id && license_id) {
            card_id = license_id;
            if (card_id_input) {
                card_id_input.value = license_id;
            }
        }

        // 🚗 Auto-detect License Plate from Card ID input if License Plate field is empty
        if (card_id && (!license_id || license_id === "")) {
            if (unity.isThaiLicensePlate(card_id) || !unity.isCardIdPattern(card_id)) {
                license_id = card_id;
                if (license_id_input) {
                    license_id_input.value = card_id;
                }
            }
        }

        console.log("license_id_input", license_id);
        console.log("card_id_input", card_id);

        if (!card_id) {
            unity.showToastNotification({
                icon: "warning",
                msg: "Please enter card ID or license plate before proceeding",
            });
            if (GATE_IN.id_card_input) {
                GATE_IN.id_card_input.focus();
            }
            return;
        }
        if (card_id.length > 16) {
            unity.showToastNotification({ icon: "warning", msg: "Card ID exceeds maximum allowable length" });
            return;
        }
        const _api_path = `/api/function/check_in?card_id=${encodeURIComponent(card_id)}&gateway_id=${GATE_IN.id}`;
        const respond = await unity.fetchApi(_api_path, "get", null, "json");
        console.log("check_in", respond);
        let CARD_MEMBER = null;
        let transaction = null;
        if (respond.success == true) {
            edit_transaction_id = 0;
            if (respond.transaction) {
                transaction = respond.transaction;
                const Transaction_Record = transaction.Transaction_Record;
                await infoTransactionShow(Transaction_Record.id, "Active transaction already exists for this plate", true);
                console.log("Transaction details modal opened");
                while (Dialog_Info_transaction.getAttribute("open") !== null) {
                    console.log("Awaiting transaction details modal close");
                    await unity.delay(1000);
                }
                if (edit_transaction_id > 0) {
                    console.log("Closed transaction details modal, editing transaction ID:", edit_transaction_id);
                } else {
                    return;
                }
            } else {
                CARD_MEMBER = respond.card_data;
                if (CARD_MEMBER) {
                    console.log(CARD_MEMBER);
                    const Booking_Member = CARD_MEMBER.Booking_Member;
                    const Member_Type = CARD_MEMBER.Member_Type;
                    const card_type = Booking_Member ? Booking_Member.booking_type : Member_Type?.name || "-";
                    const member_user = CARD_MEMBER.Member_User?.name || "-";
                    const member_expire_date_time = CARD_MEMBER.Member?.expire_date_time
                        ? unity.dateTimeToStr(CARD_MEMBER.Member.expire_date_time)
                        : "-";
                    const card_id = CARD_MEMBER.Member?.card_id || GATE_IN.id_card_input.value || "-";

                    const member_service_fee = CARD_MEMBER.Service_Fees
                        ? CARD_MEMBER.Service_Fees.id
                        : CARD_MEMBER.Member_Type?.service_fees_id || null;

                    let service_fees_name = CARD_MEMBER.Service_Fees?.name || "-";
                    if (service_fees_name === "-" && member_service_fee && SERVICES_FEES_LIST) {
                        const found_sf = SERVICES_FEES_LIST.find((s) => s.id == member_service_fee);
                        if (found_sf) {
                            service_fees_name = found_sf.name;
                        }
                    }

                    let contentHtml = "";
                    const template = document.getElementById("template_member_card_confirm");
                    if (template) {
                        const clone = template.content.cloneNode(true);
                        const cardIdEl = clone.querySelector("[data-field='card_id']");
                        if (cardIdEl) cardIdEl.textContent = card_id;
                        const cardTypeEl = clone.querySelector("[data-field='card_type']");
                        if (cardTypeEl) cardTypeEl.textContent = card_type;
                        const memberUserEl = clone.querySelector("[data-field='member_user']");
                        if (memberUserEl) memberUserEl.textContent = member_user;
                        const sfNameEl = clone.querySelector("[data-field='service_fees_name']");
                        if (sfNameEl) sfNameEl.textContent = service_fees_name;
                        const expireDateEl = clone.querySelector("[data-field='member_expire_date_time']");
                        if (expireDateEl) expireDateEl.textContent = member_expire_date_time;

                        const tempWrapper = document.createElement("div");
                        tempWrapper.appendChild(clone);
                        unity.updateContent(tempWrapper);
                        contentHtml = tempWrapper.innerHTML;
                    }

                    const result = await unity.showDialogConfirm({
                        title: unity.i18next_translate("Member Card Detected"),
                        content: contentHtml,
                    });

                    if (!result.confirm) {
                        clear_gate_in_filed();
                        return;
                    }

                    // Check entrance fee for member tariff
                    let entrance_fee = 0;
                    if (member_service_fee && SERVICES_FEES_LIST) {
                        const sf = SERVICES_FEES_LIST.find((s) => s.id == member_service_fee);
                        if (sf && sf.entrance_fee > 0) {
                            entrance_fee = sf.entrance_fee;
                        }
                    }

                    // ⚡ Fast Check-in สำหรับสมาชิก (High Traffic Optimization: 1-Click Entry)
                    if (entrance_fee === 0) {
                        let member_remark = `Member: ${Member_Type?.name || "MEMBER"}`;
                        if (Booking_Member && Booking_Member.booking_type) {
                            member_remark = Booking_Member.booking_type;
                        }

                        is_processing_gate_in = false;
                        await submit_member_fast_gate_in({
                            card_id: card_id,
                            license_id: GATE_IN.license_id_input?.value || (CARD_MEMBER.Member?.license || ""),
                            service_fees_id: member_service_fee || GATE_IN.profile?.value,
                            member_user: member_user !== "-" ? member_user : "",
                            remark: member_remark,
                        });
                        return;
                    }

                    GATE_IN.transaction_type = "MEMBER";
                    if (member_service_fee) {
                        service_fee_id = member_service_fee;
                    }
                    if (CARD_MEMBER.Member_User?.name) {
                        // GATE_IN.visitor_name.value = CARD_MEMBER.Member_User.name;
                        // GATE_IN.contact_name.value = CARD_MEMBER.Member_User.name;
                    }
                    if (CARD_MEMBER.Member_Type?.name) {
                        GATE_IN.remark.value = `Member: ${CARD_MEMBER.Member_Type.name}`;
                    }
                    if (Booking_Member) {
                        if (Booking_Member.contact) GATE_IN.contact_name.value = Booking_Member.contact;
                        if (Booking_Member.objective) GATE_IN.objective.value = Booking_Member.objective;
                        if (Booking_Member.booking_type) GATE_IN.remark.value = Booking_Member.booking_type;
                    }
                } else {
                    if (!respond.allow_not_register_member) {
                        unity.showDialogWarning({ msg: "Unregistered card cannot be used in system" });
                        return;
                    }
                }
            }
        } else {
            if (!respond.allow) {
                if (respond.msg.includes("Access Restriction") || respond.msg.includes("Restricted")) {
                    const allow_transaction = await unity.showDialogConfirm({
                        title: "Member Card Notice",
                        content: `⛔ Member Card Access Restriction: Entry Denied ⛔
                            <p>${respond.msg}</p>
                            <p>To proceed as a VISITOR transaction, click Confirm</p>
                            `,
                    });
                    if (allow_transaction.confirm) {
                        // GATE_IN.id_card_input.value += "-VISITOR";
                        GATE_IN.remark.value = "Member Access Restriction Override";
                        GATE_IN.transaction_type = "M-VISITOR";
                        unity.showToastNotification({
                            title: "Member Transaction (Access Restricted)",
                            msg: `Process as VISITOR transaction <br>${GATE_IN.id_card_input.value}`,
                        });
                    } else {
                        return;
                    }
                } else {
                    unity.showDialogWarning({ msg: respond.msg });
                    return;
                }
            }
        }
        if (Dialog_Gate_In_Proseecss.getAttribute("open") === null) {
            const Booking_Member = CARD_MEMBER ? CARD_MEMBER.Booking_Member : null;
            const Booking_Visitor = respond.booking_visitor_data;
            if (GATE_MODE == "HANDHELD") {
                GATE_IN.is_lpr_image = true;
            }
            if (Booking_Visitor) {
                const booking_visitor_data = Booking_Visitor;
                console.log(booking_visitor_data);
                GATE_IN.visitor_name.value = booking_visitor_data.visitor_name;
                GATE_IN.objective.value = booking_visitor_data.objective;
                GATE_IN.remark.value = booking_visitor_data.booking_type;
                GATE_IN.contact_name.value = booking_visitor_data.member_name || "";
                GATE_IN.vehicle_type.value = booking_visitor_data.vehicle_type || "";
                GATE_IN.fuel_type.value = booking_visitor_data.fuel_type || "";
                GATE_IN.profile.value = booking_visitor_data.service_fees_id;
            }
            Dialog_Gate_In_Proseecss.querySelector('[data-field="user_name"]').textContent = SYSTEM_USER;

            Dialog_Gate_In_Proseecss.querySelector('[data-field="vehicle_type"]').value = GATE_IN.vehicle_type
                ? GATE_IN.vehicle_type.value
                : "";

            Dialog_Gate_In_Proseecss.querySelector('[data-field="fuel_type"]').value = GATE_IN.fuel_type
                ? GATE_IN.fuel_type.value
                : "";

            Dialog_Gate_In_Proseecss.querySelector('[data-field="visitor_name"]').value = GATE_IN.visitor_name
                ? GATE_IN.visitor_name.value
                : "";

            Dialog_Gate_In_Proseecss.querySelector('[data-field="contact"]').value = GATE_IN.contact_name
                ? GATE_IN.contact_name.value
                : "";

            Dialog_Gate_In_Proseecss.querySelector('[data-field="remark"]').value = GATE_IN.remark
                ? GATE_IN.remark.value
                : "";

            if (Dialog_Gate_In_Proseecss.querySelector('[data-field="objective"]')) {
                Dialog_Gate_In_Proseecss.querySelector('[data-field="objective"]').value = GATE_IN.objective
                    ? GATE_IN.objective.value
                    : "";
            }

            Dialog_Gate_In_Proseecss.querySelector('[data-field="title"]').textContent =
                `Entry Transaction: ${unity.dateTimeToStr(new Date(), "DD/MM/YYYY HH:mm:ss")}`;

            Dialog_Gate_In_Proseecss.querySelector('[data-field="license_id"]').textContent =
                GATE_IN.license_id_input?.value || "";

            Dialog_Gate_In_Proseecss.querySelector('[data-field="id_card"]').textContent = GATE_IN.id_card_input.value || "";

            // Select tariff profile matching service_fee_id, fallback to GATE_IN default profile
            Dialog_Gate_In_Proseecss.querySelector('[data-field="profile"]').value = service_fee_id
                ? service_fee_id
                : GATE_IN.profile.value;

            if (GATE_IN.is_lpr_image) {
                Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_01"]').src =
                    GATE_IN.gate_in_image_01.src;
                Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_02"]').src =
                    GATE_IN.gate_in_image_02.src;
            } else {
                Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_01"]').src =
                    "/static/image/no_image.png";
                Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_02"]').src =
                    "/static/image/no_image.png";
                if (GATE_IN.cameras) {
                    snap_gate_in_cameras();
                }
            }

            if (Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_03"]')) {
                Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_03"]').src =
                    GATE_IN.gate_in_image_03.src;
            }

            Dialog_Gate_In_Proseecss.querySelector('[data-field="pay_box"]').classList.add("hidden");
            Dialog_Gate_In_Proseecss.querySelector('[data-field="entrance_fee"]').textContent = "0";
            Dialog_Gate_In_Proseecss.querySelector('[data-field="pay"]').value = 0;

            // ! Over load transaction for edit
            if (edit_transaction_id > 0 && transaction) {
                console.log("⚠️ Edit Transaction Mode", transaction);
                const trans_record = transaction.Transaction_Record;
                const Service_Fees = transaction.Service_Fees;
                const Member_User = transaction.Member_User;
                const Vehicle_Type = transaction.Vehicle_Type;
                const Visitor = transaction.Visitor;
                const Objective = transaction.Objective;
                const Fuel_Type = transaction.Fuel_Type;

                Dialog_Gate_In_Proseecss.querySelector('[data-field="profile"]').value = Service_Fees
                    ? Service_Fees.id
                    : "";

                if (Vehicle_Type) {
                    Dialog_Gate_In_Proseecss.querySelector('[data-field="vehicle_type"]').value = Vehicle_Type.name;
                }

                if (Fuel_Type) {
                    Dialog_Gate_In_Proseecss.querySelector('[data-field="fuel_type"]').value = Fuel_Type.name;
                }

                if (Visitor) {
                    Dialog_Gate_In_Proseecss.querySelector('[data-field="visitor_name"]').value = Visitor.name;
                }

                if (Objective) {
                    Dialog_Gate_In_Proseecss.querySelector('[data-field="objective"]').value = Objective.name;
                }

                if (Member_User) {
                    Dialog_Gate_In_Proseecss.querySelector('[data-field="contact"]').value = Member_User.name;
                }

                if (trans_record.remark) {
                    Dialog_Gate_In_Proseecss.querySelector('[data-field="remark"]').value = trans_record.remark;
                }
            }
            update_gate_in_service_fee_profile();

            Dialog_Gate_In_Proseecss.showModal();
            await unity.delay(1000);
            Dialog_Gate_In_Proseecss.querySelector('[data-field="btn_submit"]').focus();
        }
    } catch (err) {
        console.error("❌ submit_gate_in_data error:", err);
    } finally {
        is_processing_gate_in = false;
    }
}

async function process_transaction_gate_in(amount, pay, turn_amount, pay_type = "CASH(GATE-IN)") {
    if (is_processing_gate_in) {
        console.warn("⚠️ [Gate-In Locked] process_transaction_gate_in already in progress.");
        return;
    }
    is_processing_gate_in = true;
    const btnSubmit = Dialog_Gate_In_Proseecss?.querySelector('[data-field="btn_submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.classList.add("pointer-events-none", "opacity-60");
    }

    try {
        const entrance_fee = parseInt(Dialog_Gate_In_Proseecss.querySelector('[data-field="entrance_fee"]').textContent);
        unity.showDialogInfo({
            title: unity.i18next_translate("Processing"),
            msg: `<span class="loading loading-spinner text-info loading-lg"></span>`,
        });
        const card_id = Dialog_Gate_In_Proseecss.querySelector('[data-field="id_card"]').textContent;
        const license_id = Dialog_Gate_In_Proseecss.querySelector('[data-field="license_id"]').textContent;
        const service_fees_id = Dialog_Gate_In_Proseecss.querySelector('[data-field="profile"]').value;
        const vehicle_type = Dialog_Gate_In_Proseecss.querySelector('[data-field="vehicle_type"]').value;
        const fuel_type = Dialog_Gate_In_Proseecss.querySelector('[data-field="fuel_type"]').value;
        const visitor_name = Dialog_Gate_In_Proseecss.querySelector('[data-field="visitor_name"]').value;
        const member_user = Dialog_Gate_In_Proseecss.querySelector('[data-field="contact"]').value;
        const objective = Dialog_Gate_In_Proseecss.querySelector('[data-field="objective"]').value;
        const remark = Dialog_Gate_In_Proseecss.querySelector('[data-field="remark"]')
            ? Dialog_Gate_In_Proseecss.querySelector('[data-field="remark"]').value
            : "";

        const image_upload_01 = await unity.dataURLtoFile(
            Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_01"]').src,
            "image_upload_01",
        );
        const image_upload_02 = await unity.dataURLtoFile(
            Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_02"]').src,
            "image_upload_02",
        );

        const formData = new FormData();
        if (edit_transaction_id > 0) {
            formData.append("edit_transaction_id", edit_transaction_id);
        } else {
            formData.append("image_upload_01", image_upload_01);
            formData.append("image_upload_02", image_upload_02);
        }

        const imgElement03 = Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_03"]');
        if (imgElement03 && imgElement03.src) {
            const srcData = imgElement03.src;
            if (unity.isBase64Image(srcData)) {
                try {
                    const imageFile = await unity.dataURLtoFile(srcData, "image_upload_03.jpg");
                    formData.append("image_upload_03", imageFile);
                } catch (error) {
                    console.error("❌ Failed to process snapshot 3:", error);
                }
            }
        }

        formData.append("gateway_id", GATE_IN.id);
        formData.append("card_id", card_id);
        formData.append("license", license_id && license_id !== "-" ? license_id : "");
        formData.append("time", Date.now());
        formData.append("visitor_name", visitor_name);
        formData.append("remark", remark);
        formData.append("transaction_type", GATE_IN.transaction_type || "VISITOR");

        if (service_fees_id) {
            formData.append("service_fees_id", service_fees_id);
        }

        const objective_id = getValueInList(objective, OBJECTIVE_LIST);
        if (objective_id) {
            formData.append("objective_id", objective_id);
        }
        const vehicle_type_id = getValueInList(vehicle_type, VEHICLE_TYPE_LIST);
        if (vehicle_type_id) {
            formData.append("vehicle_type_id", vehicle_type_id);
        }
        const fuel_type_id = getValueInList(fuel_type, FUEL_TYPE_LIST);
        if (fuel_type_id) {
            formData.append("fuel_type_id", fuel_type_id);
        }

        // Member_user_id for visitor destination contact
        const member_user_id = getValueInList(member_user, CONTACT_LIST);
        if (member_user_id) {
            formData.append("member_user_id", member_user_id);
        }

        // Visitor_id for visitor name
        const visitor_id = getValueInList(visitor_name, VISITOR_LIST);
        if (visitor_id) {
            formData.append("visitor_id", visitor_id);
        }

        if (amount > 0) {
            formData.append("amount", amount);
            formData.append("pay", pay);
            formData.append("pay_type", pay_type);
            formData.append("turn_amount", turn_amount);
            formData.append("cashier", `GATE-ID.${GATE_IN.id}`);
        }

        unity.debugForm(formData);
        const _api_path = "/api/function/check_in";
        const respond = await unity.fetchApi(_api_path, "post", formData, "json");
        console.log(respond);
        Dialog_Info.close();
        if (respond.success == true) {
            Dialog_Gate_In_Proseecss.close();
            if (!GATE_IN.is_lpr_image) {
                GATE_IN.gate_in_image_01.src = "/static/image/no_image.png";
                GATE_IN.gate_in_image_02.src = "/static/image/no_image.png";
            }
            GATE_IN.is_lpr_image = false;
            const transaction = respond.data;
            const In_Log = respond.Log_Transaction;
            const last_transaction_in_id = transaction.id;

            if (GATE_IN.tran_date_time) {
                GATE_IN.tran_date_time.innerHTML = unity.dateTimeToStr(In_Log.date_time);
                GATE_IN.tran_card_id.innerHTML = In_Log.card_id;
                GATE_IN.tran_license_id.innerHTML = In_Log.license;
                GATE_IN.tran_profile.innerHTML = GATE_IN.profile.options[GATE_IN.profile.selectedIndex].text;
            }
            await loadSlipInImage(transaction, amount > 0 ? "slip_in_pay" : "slip_in");
            // GATE_IN.slip_in_image.src = `/api/function/slip_in?transaction_id=${transaction.id}`;
            // "/api/function/slip_in?transaction_id=demo&slip_type=acc&t={{now}}"
            if (GATE_IN.swtich_printer_slip.checked) {
                await print_slip_in();
            }
            unity.showToastNotification({ icon: "success", title: unity.i18next_translate("Transaction completed successfully") });
            await unity.delay(1000);
            if (edit_transaction_id == 0) {
                process_gate_in_open();
            }
            clear_gate_in_filed();
            GATE_IN.id_card_input.focus();
        } else {
            const _err = `${JSON.stringify(respond)}<br>${respond.statusText || respond.msg || "Error"}`;
            unity.showDialogError({ msg: _err });
        }
    } catch (err) {
        console.error("❌ process_transaction_gate_in error:", err);
        Dialog_Info.close();
        unity.showDialogError({ msg: `Transaction processing failed: ${err?.message || err}` });
    } finally {
        is_processing_gate_in = false;
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove("pointer-events-none", "opacity-60");
        }
    }
}

function clear_gate_in_filed() {
    if (GATE_IN.date_time) {
        GATE_IN.date_time.innerHTML = "";
    }
    GATE_IN.transaction_type = "VISITOR";
    if (GATE_IN.id_card_input) GATE_IN.id_card_input.value = "";
    if (GATE_IN.license_id_input) GATE_IN.license_id_input.value = "";
    GATE_IN.vehicle_type.value = "";
    GATE_IN.visitor_name.value = "";
    GATE_IN.contact_name.value = "";
    GATE_IN.objective.value = "";
    GATE_IN.remark.value = "";

    unity.safeSetImageSrc(GATE_IN.gate_in_image_01, "/static/image/license_plate.jpg");
    unity.safeSetImageSrc(GATE_IN.gate_in_image_02, "/static/image/car.png");
    if (GATE_IN.gate_in_image_03) unity.safeSetImageSrc(GATE_IN.gate_in_image_03, "/static/image/card.jpg");

    if (typeof Dialog_Gate_In_Proseecss !== "undefined" && Dialog_Gate_In_Proseecss) {
        const dImg1 = Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_01"]');
        const dImg2 = Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_02"]');
        const dImg3 = Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_03"]');
        if (dImg1) unity.safeSetImageSrc(dImg1, "/static/image/no_image.png");
        if (dImg2) unity.safeSetImageSrc(dImg2, "/static/image/no_image.png");
        if (dImg3) unity.safeSetImageSrc(dImg3, "/static/image/no_image.png");
    }

    if (GATE_IN.id_card_input) GATE_IN.id_card_input.focus();
}

window.clear_gate_in = clear_gate_in;
async function clear_gate_in(field = null) {
    if (field) {
        switch (field) {
            case "id_card":
                GATE_IN.id_card_input.value = "";
                GATE_IN.id_card_input.focus();
                break;

            default:
                break;
        }
        return;
    }
    const result = await unity.showDialogConfirm({ title: "Confirm Action", content: "Reset transaction data?" });
    if (result.confirm) {
        clear_gate_in_filed();
    }
}

window.reprint_last_slip_in = reprint_last_slip_in;
async function reprint_last_slip_in() {
    let slipSrc = GATE_IN.slip_in_image ? GATE_IN.slip_in_image.src : "";
    const isInvalidSrc =
        !slipSrc ||
        slipSrc.includes("Image_not_available.png") ||
        slipSrc.includes("no_image.png") ||
        slipSrc.endsWith("/static/image/card.jpg") ||
        slipSrc.endsWith("/static/image/car.png");

    if (isInvalidSrc) {
        const cachedSlip = localStorage.getItem("LAST_SLIP_IN_PAY");
        if (cachedSlip) {
            slipSrc = cachedSlip;
            if (GATE_IN.slip_in_image) {
                GATE_IN.slip_in_image.src = cachedSlip;
            }
        }
    }

    if (!slipSrc || slipSrc.includes("Image_not_available.png") || slipSrc.includes("no_image.png")) {
        unity.showToastNotification({
            icon: "warning",
            msg: unity.i18next_translate("No recent entry slip available to reprint") || "No recent entry slip available to reprint",
        });
        return;
    }

    unity.showToastNotification({
        icon: "info",
        msg: unity.i18next_translate("Reprinting entry slip...") || "Reprinting entry slip...",
    });

    if (deviceAppService) {
        if (await deviceAppService.getStatus()) {
            const _reply = await deviceAppService.printImage(GATE_IN.slip_in_image || slipSrc);
            if (_reply) {
                unity.showToastNotification({ icon: "success", msg: "Reprint successful" });
            } else {
                unity.showToastNotification({ icon: "error", msg: "printSlip Error" });
            }
        } else {
            printSlip(slipSrc);
        }
    } else if (isNativeApp) {
        printImagePosControl(GATE_IN.slip_in_image || slipSrc);
    } else {
        printSlip(slipSrc);
    }
}

window.print_slip_in = print_slip_in;
async function print_slip_in() {
    return reprint_last_slip_in();
}

window.input_pay_in_onkeypress = input_pay_in_onkeypress;
async function input_pay_in_onkeypress(e) {
    if (e) {
        const key = e.key;
        if (!/[0-9]/.test(key) && key !== "Enter" && key !== "Backspace") {
            e.preventDefault();
        }
        // Handle Enter key to trigger submit or custom action
        if (!(key === "Enter")) {
            return;
        }

        Dialog_Gate_In_Proseecss.querySelector('[data-field="btn_submit"]').focus();
    }
}

window.snap_image_card_gate_in = snap_image_card_gate_in;
async function snap_image_card_gate_in() {
    let targetElement = GATE_IN.gate_in_image_03;
    if (
        typeof Dialog_Gate_In_Proseecss !== "undefined" &&
        Dialog_Gate_In_Proseecss &&
        Dialog_Gate_In_Proseecss.getAttribute("open") !== null
    ) {
        const modalImg = Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_03"]');
        if (modalImg) targetElement = modalImg;
    }
    unity.startWebCam(false, targetElement);
}

window.snap_image_card = snap_image_card;
async function snap_image_card() {
    const image_upload_03 =
        Dialog_Gate_In_Proseecss && Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_03"]')
            ? Dialog_Gate_In_Proseecss.querySelector('[data-field="gate_in_image_03"]')
            : GATE_IN.gate_in_image_03;
    unity.startWebCam(false, image_upload_03);
}

window.process_gate_in_open = process_gate_in_open;
async function process_gate_in_open(confirm = false) {
    unity.openGateForce(GATE_IN.id, confirm, GATE_IN.control_open_url, GATE_IN.name);
}

// ! *********************************************** */  GATE OUT  ********************************************************

window.gate_out_input_id_card_onkeypress = gate_out_input_id_card_onkeypress;
async function gate_out_input_id_card_onkeypress(e) {
    // console.log(e);
    if (e.key === "Enter" || e.keyCode === 13) {
        // e.preventDefault(); // Prevent the default action (optional)
        if (GATE_OUT.id_card_input && GATE_OUT.id_card_input.value) {
            GATE_OUT.id_card_input.value = unity.validateTransactionString(GATE_OUT.id_card_input.value);
        }
        submit_gate_out_data();
    }
}

let search_transaction_in_for_gate_in = false;
window.search_transaction_in = search_transaction_in;
async function search_transaction_in(gate_type = "GATE_OUT") {
    console.log("search_transaction_in for GATE_IN/GATE_OUT/CASHIER");
    if (gate_type == "GATE_IN") {
        search_transaction_in_for_gate_in = true;
    } else {
        search_transaction_in_for_gate_in = false;
    }
    transaction_parked_table.reload();
    modal_search_transaction_in.showModal();
}

window.select_transaction_data = select_transaction_data;
function select_transaction_data(data) {
    if (search_transaction_in_for_gate_in) {
        GATE_IN.id_card_input.value = data;
        modal_search_transaction_in.close();
        submit_gate_in_data();
    } else {
        GATE_OUT.id_card_input.value = data;
        modal_search_transaction_in.close();
        submit_gate_out_data();
    }
}

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
                data: "Transaction_Record.card_id",
                title: "Actions",
                orderable: false,
                render: function (data, type, row) {
                    const _gate_mode = GATE_MODE;
                    // console.log(_gate_mode);
                    data = row.card_id;
                    switch (_gate_mode) {
                        case "COMPACT":
                            return `<div class="text-center"><a class="text-primary" onclick="select_transaction_data('${data}');"> <i class="fa-solid fa-circle-check fa-2x"></i></a></div>`;
                        case "GATE_IN":
                            return `<div class="text-center"><a class="text-primary" onclick="select_transaction_data('${data}');"> <i class="fa-solid fa-edit fa-2x"></i></a></div>`;
                        case "GATE_OUT":
                            return `<div class="text-center"><a class="text-primary" onclick="select_transaction_data('${data}');"> <i class="fa-solid fa-circle-check fa-2x"></i></a></div>`;
                        default:
                            return `<div class="text-center"><a class="text-primary" onclick="select_transaction_data('${data}');"> <i class="fa-solid fa-circle-check fa-2x"></i></a></div>`;
                    }
                },
            },
            {
                data: "in_log.images_path",
                title: "Snapshot",
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

window.dialog_gate_out_search_onchange = dialog_gate_out_search_onchange;
async function dialog_gate_out_search_onchange(e) {
    if (e.value != "") {
        const divElement = Dialog_Gate_Out_Select_Profile.querySelector('[data-field="content"]');
        for (let i = 0; i < divElement.children.length; i++) {
            const childElement = divElement.children[i];
            const name = childElement.querySelector('[name="name"]').textContent;
            if (name.includes(e.value)) {
                // childElement.focus();
                // console.log(e.value);
                childElement.scrollIntoView({ behavior: "smooth", block: "start" });
                break;
            }
        }
    }
}

window.chang_profile_gate_out_btn_submit = chang_profile_gate_out_btn_submit;
async function chang_profile_gate_out_btn_submit(id, name) {
    // console.log(id, name);
    // console.log(GATE_OUT.profile.textContent);
    if (name == GATE_OUT.profile.textContent) {
        unity.showToastNotification({ icon: "warning", msg: `Current tariff is ${GATE_OUT.profile.textContent}` });
        return;
    }
    const result = await unity.showDialogConfirm({
        title: "Confirm Action?",
        content: "Change Tariff Profile: " + name,
    });
    if (result.confirm) {
        Dialog_Gate_Out_Select_Profile.close();
        if (!GATE_OUT.transaction_id) {
            unity.showDialogError({ title: `Unable to Process`, msg: "No active vehicle transaction found" });
            return;
        }
        const estamp_device_name = GATE_OUT.name;
        const formData = new FormData();
        formData.append("transaction_record", GATE_OUT.transaction_id);
        formData.append("transaction_record_id", GATE_OUT.transaction_id);
        formData.append("service_fees_id", id);
        formData.append("estamp_device_name", estamp_device_name);
        const _reply = await unity.fetchApi("/api/estamp_device/stamp_transaction", "post", formData, "json");
        console.log(_reply);
        if (_reply.success == true) {
            submit_gate_out_data();
        } else {
            unity.showDialogError({ title: `Unable to Process`, msg: _reply.msg });
        }
    }
}

window.code_stamp_gate_out = code_stamp_gate_out;
function code_stamp_gate_out() {
    if (GATE_OUT.transaction_id) {
        Dialog_Gate_Out_Select_Code.querySelector('[data-field="input_code"]').value = "";
        const code_name = Dialog_Gate_Out_Select_Code.querySelector('[data-field="name"]');
        const service_fees_name = Dialog_Gate_Out_Select_Code.querySelector('[data-field="service_fees_name"]');
        const tag = Dialog_Gate_Out_Select_Code.querySelector('[data-field="tag"]');
        const customer_name = Dialog_Gate_Out_Select_Code.querySelector('[data-field="customer_name"]');
        const remark = Dialog_Gate_Out_Select_Code.querySelector('[data-field="remark"]');
        code_name.textContent = "";
        if (customer_name) customer_name.textContent = "";
        tag.textContent = "";
        service_fees_name.textContent = "";
        remark.textContent = "";

        Dialog_Gate_Out_Select_Code.querySelector('[data-field="btn_code_select"]').disabled = true;

        Dialog_Gate_Out_Select_Code.showModal();
    }
}

window.dialog_gate_out_code_onkeyup = dialog_gate_out_code_onkeyup;
function dialog_gate_out_code_onkeyup(v) {
    if (v) {
        const code_name = Dialog_Gate_Out_Select_Code.querySelector('[data-field="name"]');
        const service_fees_name = Dialog_Gate_Out_Select_Code.querySelector('[data-field="service_fees_name"]');
        const tag = Dialog_Gate_Out_Select_Code.querySelector('[data-field="tag"]');
        const customer_name = Dialog_Gate_Out_Select_Code.querySelector('[data-field="customer_name"]');
        const remark = Dialog_Gate_Out_Select_Code.querySelector('[data-field="remark"]');
        code_name.textContent = "";
        customer_name.textContent = "";
        tag.textContent = "";
        service_fees_name.textContent = "";
        remark.textContent = "";
        Dialog_Gate_Out_Select_Code.querySelector('[data-field="btn_code_select"]').disabled = true;
        for (let index = 0; index < GATE_OUT.code_stamp.length; index++) {
            const code = GATE_OUT.code_stamp[index];
            if ((code.name == v) & (code.status.toUpperCase() == "ENABLE")) {
                console.log(code);
                code_name.textContent = code.name;
                service_fees_name.textContent = code.service_fees_name;
                tag.textContent = code.tag;
                customer_name.textContent = code.customer_name;
                remark.textContent = code.remark;
                Dialog_Gate_Out_Select_Code.querySelector('[data-field="btn_code_select"]').disabled = false;
                break;
            }
        }
    }
}

window.code_stamp_submit = code_stamp_submit;
async function code_stamp_submit() {
    Dialog_Gate_Out_Select_Code.close();

    if (GATE_OUT.transaction_id) {
        const code_name = Dialog_Gate_Out_Select_Code.querySelector('[data-field="name"]').textContent;
        let select_code = null;
        for (let index = 0; index < GATE_OUT.code_stamp.length; index++) {
            const code = GATE_OUT.code_stamp[index];
            if (code.name == code_name) {
                if (code.status.toUpperCase() == "ENABLE") {
                    select_code = code;
                } else {
                    unity.showToastNotification({
                        type: "warning",
                        msg: "Unable to change tariff profile: CODE is disabled",
                    });
                }
                break;
            }
        }
        if (select_code) {
            console.log(select_code);
            if (!GATE_OUT.transaction_id) {
                unity.showDialogError({ title: `Unable to Process`, msg: "No active vehicle transaction found" });
                return;
            }
            unity.showToastNotification({ icon: "success", msg: "Tariff Profile updated: " + select_code.name });
            const estamp_device_name = GATE_OUT.name;
            const formData = new FormData();
            formData.append("transaction_record", GATE_OUT.transaction_id);
            formData.append("transaction_record_id", GATE_OUT.transaction_id);
            formData.append("service_fees_id", select_code.service_fees_id);
            formData.append("estamp_device_name", estamp_device_name);
            formData.append("code_stamp_name", select_code.name);

            unity.debugForm(formData);

            const _reply = await unity.fetchApi("/api/estamp_device/stamp_transaction", "post", formData, "json");
            console.log(_reply);
            if (_reply.success == true) {
                await submit_gate_out_data();
            } else {
                unity.showDialogError({ title: `Unable to Process`, msg: _reply.msg });
            }
        } else {
            unity.showDialogError({ title: `Unable to Process`, msg: "Tariff profile not found" });
        }
    }
}

window.submit_gate_out_action = submit_gate_out_action;

function submit_gate_out_action() {
    if (!GATE_OUT.control_box_submit_gate_out.classList.contains("hidden")) {
        confirm_gate_out_data();
        return;
    }
    submit_gate_out_data();
}

window.submit_gate_out_data = submit_gate_out_data;
async function submit_gate_out_data(card_id = null) {
    if (GATE_OUT.id_card_input.value == "" && !card_id) {
        unity.showToastNotification({ icon: "warning", msg: "Please enter license plate before proceeding" });
        GATE_OUT.id_card_input.focus();
        return;
    }

    GATE_OUT.id_card_input.value = GATE_OUT.id_card_input.value.trim();
    const input_data = card_id ? `${card_id}` : unity.validateTransactionString(GATE_OUT.id_card_input.value);
    GATE_OUT.id_card_input.value = input_data;
    console.log("✅ submit_gate_out_data : ", input_data);

    const _api_path = `/api/function/check_out?card_id=${input_data}`;
    const respond = await unity.fetchApi(_api_path, "get", null, "json");
    console.log(respond);
    const data = respond.data;
    if (respond.success == true && data) {
        const card_data = respond.card_data;
        if (card_data) {
            unity.showToastNotification({
                title: `Member Card Profile`,
                msg: `${card_data.Member_Type.name} <br> ${card_data.Member_User ? card_data.Member_User.name : "No Cardholder Name"}`,
            });
        }

        if (respond.notifications) {
            unity.showDialogWarning({ title: "notifications", msg: respond.notifications });
        }

        GATE_OUT.acc = data.acc;
        const acc = GATE_OUT.acc;
        const transactions = data.transactions;
        transactions_gate_out = transactions;
        const Transaction_Record = transactions.Transaction_Record;
        const Service_Fees = transactions.Service_Fees;
        const GateWay = transactions.GateWay;
        const Log_Transaction = transactions.Log_Transaction;

        const Account_Records = data.Account_Records;
        const acc_fine = acc.fine || 0;
        let paid = 0;
        let paid_content = `<div class="stats stats-vertical shadow w-full">
                                <div class="stat">
                                    <div class="stat-title">Parking Fee</div>
                                    <div class="stat-value">${acc.amount}</div>
                                    <div class="stat-title">Fine</div>
                                    <div class="stat-value">${acc_fine}</div>
                                </div>
                                <div class="py-2 text-xl text-success text-center">PAID</div>`;
        console.log(data);
        if (Account_Records) {
            Account_Records.forEach((a) => {
                const Account_Record = a.Account_Record;
                // console.log(Account_Record);
                paid += Account_Record.amount;
                paid_content += `  <div class="stat">
                                    <div class="stat-figure text-secondary">
                                    <div class="avatar online">
                                        <div class="w-16 rounded-full">
                                        <img src="/static/image/logo.jpg" />
                                        </div>
                                    </div>
                                    </div>
                                    <div class="stat-value">${Account_Record.amount}</div>
                                    <div class="stat-title">${Account_Record.no}</div>
                                    <div class="stat-title text-secondary">${Account_Record.cashier}</div>
                                    <div class="stat-title text-secondary">${unity.dateTimeToStr(Account_Record.date_time)}</div>
                                </div>
                                <p class="mx-4">${acc.msg}</p>`;
            });
        }
        if (Account_Records.length > 0) {
            const last_acc = Account_Records[Account_Records.length - 1];
            GATE_OUT.slip_pay_image.src = `/api/function/slip_pay_acc?acc_id=${last_acc.Account_Record.id}`;
        }
        if (paid > 0) {
            paid_content += "</div>";
            unity.showDialogInfo({ title: "Payment Already Processed", msg: paid_content });
        }
        // console.log(transactions);
        const in_date_time = unity.dateTimeToStr(Log_Transaction.date_time);
        // console.log(in_date_time);
        GATE_OUT.license_id_input.textContent = Log_Transaction.license;
        GATE_OUT.in_datetime.textContent = in_date_time;
        // GATE_OUT.in_gate.textContent = GateWay.name;
        GATE_OUT.in_type.textContent = Transaction_Record.type;
        GATE_OUT.remark.innerHTML = Transaction_Record.remark
            ? Transaction_Record.remark.replace(/\n/g, "<br>")
            : `<div class="badge badge-soft badge-info">No Remarks</div>`;

        let profile = Service_Fees ? Service_Fees.name : "No Tariff Configured";

        if (Transaction_Record.code) {
            profile += ` : ${Transaction_Record.code}`;
        }

        GATE_OUT.profile.textContent = profile;
        // GATE_OUT.profile_format.innerHTML = acc.service_fees_format;

        GATE_OUT.parked_time.textContent = acc.parked;
        const sum_amount = acc.sum_amount + acc_fine;
        const amount = (acc.amount > paid ? acc.amount - paid : 0) + acc_fine;
        const customer = acc.customer;
        const customer_amount = acc.customer_amount ? acc.customer_amount : 0;
        if (customer_amount > 0) {
            const msg_html = `<div>
            Total Parking Fee: ${sum_amount} THB<br>
            E-Stamp Discount: ${customer_amount} THB<br>
            ${customer.customer_name}<br>
            <hr>
            Net Payment Due: ${amount} THB
            </div>`;
            unity.showToastNotification({ msg: msg_html });
            if (GATE_OUT.service_fees_info) GATE_OUT.service_fees_info.innerHTML = msg_html;
        } else {
            if (GATE_OUT.service_fees_info) GATE_OUT.service_fees_info.innerHTML = acc.service_fees_format;
        }
        GATE_OUT.amount.textContent = amount;
        GATE_OUT.fine.textContent = Service_Fees ? Service_Fees.fine : "0.00 THB";
        GATE_OUT.parked_fine.textContent = 0;
        update_gate_out_net_total();

        GATE_OUT.transaction_id = Transaction_Record.id;
        GATE_OUT.gate_in_name.textContent = GateWay.name;
        const gate_in_images = Log_Transaction.images_path.split(",");
        GATE_OUT.gate_in_image_01.src = gate_in_images[0];
        GATE_OUT.gate_in_image_02.src = gate_in_images[1];

        const stamp_data = Transaction_Record.allow_data;
        // GATE_OUT.stamp_data.textContent = stamp_data;
        let check_out_allowed = true;
        let estamp_allowed = false;
        let not_allowed_msg = "DENIED";
        if (stamp_data) {
            if (stamp_data.includes("! Not Allow")) {
                GATE_OUT.stamp_data_status.innerHTML = `<div class="badge badge-error gap-2">X DENIED</div>`;
            } else {
                if (stamp_data.startsWith("stamp by")) {
                    // ? For stamp data
                    GATE_OUT.stamp_data_status.innerHTML = `<div class="badge badge-info badge-soft gap-2">🕹️ ${stamp_data}</div>`;
                } else {
                    estamp_allowed = true;
                    GATE_OUT.stamp_data_status.innerHTML = `<div class="badge badge-success gap-2">✅ ALLOWED</div>`;
                }
            }
        } else {
            GATE_OUT.stamp_data_status.innerHTML = `<div class="badge gap-2">⚠️ NO RECORD</div>`;
        }

        if (GATE_OUT.member_type) {
            GATE_OUT.member_type.textContent = card_data ? card_data.Member_Type.name : "VISITOR";
        }

        if (Service_Fees) {
            if (Service_Fees.type == "ESTAMP-ALLOWED" && !estamp_allowed) {
                check_out_allowed = false;
                not_allowed_msg = `⛔ NO ESTAMP-ALLOWED RECORD ⛔<br>Exit not permitted`;
            }
        }

        console.log("🆔 GATE_MODE :", GATE_MODE);
        if (GATE_MODE == "GATE_OUT" || GATE_MODE == "COMPACT" || GATE_MODE == "HANDHELD" || GATE_MODE == "CASHIER") {
            if (check_out_allowed) {
                GATE_OUT.control_box_submit_gate_out.classList.remove("hidden");
            } else {
                unity.showDialogWarning({ msg: not_allowed_msg });
            }
        }
        try {
            const data = {
                cmd: "info",
                license_info: GATE_OUT.license_id_input.value,
                date_in: GATE_OUT.in_datetime.textContent.split(" ")[0],
                time_in: GATE_OUT.in_datetime.textContent.split(" ")[1],
                parked_time: GATE_OUT.parked_time.textContent,
                amount_info: GATE_OUT.amount.textContent,
                parked_fine: GATE_OUT.parked_fine.textContent,
                image_info_01: GATE_OUT.gate_in_image_01.src,
                image_info_02: GATE_OUT.gate_in_image_02.src,
            };
            sendMessage_display_info(data);
        } catch (e) {
            unity.logger.error(e);
        }
        if (GATE_MODE == "GATE_OUT" || GATE_MODE == "COMPACT" || GATE_MODE == "HANDHELD") {
            if (GATE_OUT.cameras && GATE_OUT.cameras.length >= 1) {
                console.log("📸 Gate Out Camera", GATE_OUT.cameras);
                const ts = Date.now();
                if (GATE_OUT.cameras.length >= 1) {
                    const camera = GATE_OUT.cameras[0];
                    if (camera) {
                        // console.log(camera);
                        const snap_out_image_uri = await unity.dataURLtoFile(
                            `/proxy?url=${encodeURI(camera)}&t=${ts}`,
                            "image_upload_01.png",
                        );
                        if (snap_out_image_uri) {
                            unity.safeSetImageSrc(GATE_OUT.gate_out_image_01, URL.createObjectURL(snap_out_image_uri));
                        }
                    }
                }
                if (GATE_OUT.cameras.length >= 2) {
                    const camera = GATE_OUT.cameras[1];
                    if (camera) {
                        // console.log(camera);
                        const snap_out_image_uri = await unity.dataURLtoFile(
                            `/proxy?url=${encodeURI(camera)}&t=${ts}`,
                            "image_upload_02.png",
                        );
                        if (snap_out_image_uri) {
                            unity.safeSetImageSrc(GATE_OUT.gate_out_image_02, URL.createObjectURL(snap_out_image_uri));
                        }
                    }
                }
                if (GATE_OUT.cameras.length >= 3) {
                    const camera = GATE_OUT.cameras[2];
                    if (camera) {
                        console.log(camera);
                    }
                }
            }
            // const ts = Math.floor(Date.now() / 1000);
            // if (ts - GATE_OUT.gate_out_image_time_stamp > 10) {
            //     GATE_OUT.gate_out_image_02.src = "";
            // }
        }

        // ⚡ Fast Member Exit (1-Step ขาออกสมาชิก 0 บาท High Traffic Optimization)
        const is_member_exit = card_data || (Transaction_Record && Transaction_Record.type === "MEMBER");
        if (is_member_exit && amount === 0 && check_out_allowed && GATE_MODE != "CASHIER") {
            await process_member_fast_gate_out();
            return;
        }
    } else {
        // ? ไม่มีรายการทางเข้า
        const card_data = respond.card_data;
        if (card_data) {
            // ? มีข้อมูลบัตรสมาชิก ต้องการทำรายการขาออกสมาชิกโดยไม่มีรายการขาเข้า
            console.log("⚠️ Member Card Data (No In-Record)", card_data);
            const Member = card_data.Member;
            const Member_Type = card_data.Member_Type;
            const Member_User = card_data.Member_User;
            const Booking_Member = card_data.Booking_Member;
            const card_type = Booking_Member ? Booking_Member.booking_type : Member_Type?.name || "-";
            const member_user = Member_User?.name || "-";
            const member_expire_date_time = Member?.expire_date_time
                ? unity.dateTimeToStr(Member.expire_date_time)
                : "-";
            const card_id = Member?.card_id || GATE_OUT.id_card_input.value || "-";
            let service_fees_name = card_data.Service_Fees?.name || "No Tariff Configured";

            // 1. ตรวจสอบสถานะบัตรหมดอายุ
            const is_expired = Member?.expire_date_time && new Date(Member.expire_date_time) < new Date();
            if (is_expired) {
                unity.showDialogWarning({
                    title: unity.i18next_translate("Member Card Expired"),
                    msg: `บัตรสมาชิก <b>${card_id}</b> หมดอายุแล้ว (${member_expire_date_time})<br>กรุณาติดต่อเจ้าหน้าที่เพื่อต่ออายุบัตร`,
                });
                cancel_submit_gate_out();
                return;
            }

            // 2. แสดง Dialog ยืนยันการปล่อยสมาชิกออก
            let contentHtml = "";
            const template = document.getElementById("template_member_card_confirm");
            if (template) {
                const clone = template.content.cloneNode(true);
                const bannerTitle = clone.querySelector(".alert div div.font-bold");
                if (bannerTitle) {
                    bannerTitle.setAttribute("data-i18n", "Member Exit - No Entry Record");
                    bannerTitle.textContent = "Member Exit - No Entry Record";
                }
                const bannerDesc = clone.querySelector(".alert div div.text-xs");
                if (bannerDesc) {
                    bannerDesc.setAttribute(
                        "data-i18n",
                        "No entry transaction found. Confirm member exit and open gate?",
                    );
                    bannerDesc.textContent = "No entry transaction found. Confirm member exit and open gate?";
                }

                const cardIdEl = clone.querySelector("[data-field='card_id']");
                if (cardIdEl) cardIdEl.textContent = card_id;
                const cardTypeEl = clone.querySelector("[data-field='card_type']");
                if (cardTypeEl) cardTypeEl.textContent = card_type;
                const memberUserEl = clone.querySelector("[data-field='member_user']");
                if (memberUserEl) memberUserEl.textContent = member_user;
                const sfNameEl = clone.querySelector("[data-field='service_fees_name']");
                if (sfNameEl) sfNameEl.textContent = service_fees_name;
                const expireDateEl = clone.querySelector("[data-field='member_expire_date_time']");
                if (expireDateEl) expireDateEl.textContent = member_expire_date_time;

                const tempWrapper = document.createElement("div");
                tempWrapper.appendChild(clone);
                unity.updateContent(tempWrapper);
                contentHtml = tempWrapper.innerHTML;
            }

            const result = await unity.showDialogConfirm({
                title: unity.i18next_translate("Confirm Member Exit"),
                content: contentHtml,
            });

            if (!result.confirm) {
                cancel_submit_gate_out();
                return;
            }

            // 3. ทำรายการบันทึกขาออกสมาชิก
            await submit_member_exit_no_in(card_id, card_type, card_data);
        } else {
            if (respond.allow == false) {
                unity.showDialogWarning({ msg: respond.msg });
            }
            unity.showToastNotification({ title: `Verify Record: ${GATE_OUT.id_card_input.value}`, msg: respond.msg });
            cancel_submit_gate_out();
        }
    }
}

window.submit_member_exit_no_in = submit_member_exit_no_in;
async function submit_member_exit_no_in(card_id, card_type, card_data) {
    try {
        const formData = new FormData();
        const input_card_id = card_id || GATE_OUT.id_card_input.value;
        formData.append("gateway_id", GATE_OUT.id || 1);
        formData.append("card_id", input_card_id);
        formData.append("license", input_card_id);
        formData.append("transaction_type", "MEMBER");
        formData.append(
            "remark",
            `สมาชิกทำรายการออกโดยไม่มีรายการเข้า (Manual Member Exit) - ${card_type || "MEMBER"}`,
        );

        if (
            (!GATE_OUT.gate_out_image_01?.src ||
                GATE_OUT.gate_out_image_01.src.includes("no_image") ||
                GATE_OUT.gate_out_image_01.src.includes("car.png")) &&
            GATE_OUT.cameras &&
            GATE_OUT.cameras.length >= 1
        ) {
            try {
                if (GATE_OUT.cameras[0]) {
                    const img1 = await unity.dataURLtoFile(
                        `/proxy?url=${encodeURI(GATE_OUT.cameras[0])}&t=${Date.now()}`,
                        "image_upload_01.jpg",
                    );
                    if (img1) formData.append("image_upload_01", img1);
                }
                if (GATE_OUT.cameras.length >= 2 && GATE_OUT.cameras[1]) {
                    const img2 = await unity.dataURLtoFile(
                        `/proxy?url=${encodeURI(GATE_OUT.cameras[1])}&t=${Date.now()}`,
                        "image_upload_02.jpg",
                    );
                    if (img2) formData.append("image_upload_02", img2);
                }
            } catch (e) {
                console.error("Camera snap error:", e);
            }
        } else {
            if (
                GATE_OUT.gate_out_image_01 &&
                GATE_OUT.gate_out_image_01.src &&
                !GATE_OUT.gate_out_image_01.src.startsWith("http") &&
                !GATE_OUT.gate_out_image_01.src.includes("no_image")
            ) {
                const img1 = await unity.dataURLtoFile(GATE_OUT.gate_out_image_01.src, "image_upload_01");
                if (img1) formData.append("image_upload_01", img1);
            }
            if (
                GATE_OUT.gate_out_image_02 &&
                GATE_OUT.gate_out_image_02.src &&
                !GATE_OUT.gate_out_image_02.src.startsWith("http") &&
                !GATE_OUT.gate_out_image_02.src.includes("no_image")
            ) {
                const img2 = await unity.dataURLtoFile(GATE_OUT.gate_out_image_02.src, "image_upload_02");
                if (img2) formData.append("image_upload_02", img2);
            }
        }

        const respond = await unity.fetchApi("/api/function/check_out_not_transaction", "post", formData, "json");
        if (respond && respond.success) {
            unity.showToastNotification({
                icon: "success",
                title: unity.i18next_translate("Member Exit Success"),
                msg: `Member: ${input_card_id} recorded successfully.`,
            });
            if (GATE_MODE == "GATE_OUT" || GATE_MODE == "COMPACT" || GATE_MODE == "HANDHELD") {
                process_gate_out_open();
                if (GATE_OUT.gate_out_image_01) GATE_OUT.gate_out_image_01.src = "";
                if (GATE_OUT.gate_out_image_02) GATE_OUT.gate_out_image_02.src = "";
            }
        } else {
            unity.showDialogWarning({ msg: respond?.msg || "Failed to process member exit transaction" });
        }
    } catch (err) {
        console.error("submit_member_exit_no_in error:", err);
        unity.showToastNotification({ icon: "error", msg: "Error processing member exit" });
    } finally {
        cancel_submit_gate_out();
    }
}

window.clear_gate_out = clear_gate_out;
async function clear_gate_out(field = null) {
    if (field) {
        switch (field) {
            case "id_card":
                GATE_OUT.id_card_input.value = "";
                GATE_OUT.id_card_input.focus();
                break;

            default:
                break;
        }
        return;
    }
    const result = await unity.showDialogConfirm({ title: "Confirm Action", content: "Reset transaction data?" });
    if (result.confirm) {
        cancel_submit_gate_out();
    }
}

window.update_gate_out_net_total = update_gate_out_net_total;
function update_gate_out_net_total() {
    if (!GATE_OUT.net_total_amount) return;
    const fee = parseFloat(GATE_OUT.amount ? (GATE_OUT.amount.textContent || GATE_OUT.amount.value || 0) : 0) || 0;
    const fine = parseFloat(GATE_OUT.parked_fine ? (GATE_OUT.parked_fine.textContent || GATE_OUT.parked_fine.value || 0) : 0) || 0;
    const total = fee + fine;
    GATE_OUT.net_total_amount.textContent = total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

window.cancel_submit_gate_out = cancel_submit_gate_out;
function cancel_submit_gate_out() {
    console.log("cancel_submit_gate_out");
    GATE_OUT.transaction_id = 0;
    GATE_OUT.id_card_input.value = "";
    GATE_OUT.license_id_input.textContent = "";
    GATE_OUT.in_datetime.textContent = "";
    GATE_OUT.profile.textContent = "";
    GATE_OUT.in_type.textContent = "";
    // GATE_OUT.profile_format.textContent = "";

    GATE_OUT.stamp_data_status.textContent = "";
    // GATE_OUT.stamp_data.textContent = "";
    // GATE_OUT.contact.textContent = "";
    // GATE_OUT.objective.textContent = "";

    GATE_OUT.parked_time.textContent = "";
    GATE_OUT.amount.textContent = 0;
    GATE_OUT.parked_fine.textContent = 0;
    update_gate_out_net_total();

    if (GATE_OUT.service_fees_info) GATE_OUT.service_fees_info.setAttribute("data-tip", "Parking Fee");

    GATE_OUT.control_box_submit_gate_out.classList.add("hidden");
    GATE_OUT.transaction_id = 0;

    GATE_OUT.gate_in_name.textContent = "Entry Snapshot";
    unity.safeSetImageSrc(GATE_OUT.gate_in_image_01, "/static/image/license_plate.jpg");
    unity.safeSetImageSrc(GATE_OUT.gate_in_image_02, "/static/image/car.png");
    if (GATE_MODE == "GATE_OUT" || GATE_MODE == "COMPACT" || GATE_MODE == "HANDHELD") {
        unity.safeSetImageSrc(GATE_OUT.gate_out_image_01, "/static/image/license_plate.jpg");
        unity.safeSetImageSrc(GATE_OUT.gate_out_image_02, "/static/image/car.png");
    }

    if (typeof Dialog_Gate_Out_Proseecss !== "undefined" && Dialog_Gate_Out_Proseecss) {
        const dImg1 = Dialog_Gate_Out_Proseecss.querySelector('[data-field="gate_out_image_01"]');
        const dImg2 = Dialog_Gate_Out_Proseecss.querySelector('[data-field="gate_out_image_02"]');
        if (dImg1) unity.safeSetImageSrc(dImg1, "/static/image/no_image.png");
        if (dImg2) unity.safeSetImageSrc(dImg2, "/static/image/no_image.png");
    }

    PAYMENT_SERVICE.qr_payment_ref = null;
    if (GATE_OUT.member_type) {
        GATE_OUT.member_type.textContent = "";
    }
    try {
        const data = {
            cmd: "info",
            license_info: GATE_OUT.license_id_input.value,
            date_in: GATE_OUT.in_datetime.textContent.split(" ")[0],
            time_in: GATE_OUT.in_datetime.textContent.split(" ")[1],
            parked_time: GATE_OUT.parked_time.value,
            amount_info: GATE_OUT.amount.value,
            parked_fine: GATE_OUT.parked_fine.value,
            image_info_01: GATE_OUT.gate_in_image_01.src,
            image_info_02: GATE_OUT.gate_in_image_02.src,
        };
        sendMessage_display_info(data);
    } catch (e) {
        unity.logger.error(e);
    }
    GATE_OUT.id_card_input.focus();
}

window.add_fine = add_fine;
async function add_fine() {
    const parked_fine = parseInt(GATE_OUT.parked_fine.textContent, 10);
    if (parked_fine === 0) {
        const result = await unity.showDialogConfirm({
            title: "Confirm Lost Card Fine",
            content: `Confirm lost card fine: ${GATE_OUT.fine.innerHTML} THB`,
        });
        if (result.confirm) {
            const amount = parseInt(GATE_OUT.amount.value, 10);
            const fine = parseInt(GATE_OUT.fine.textContent, 10);
            // console.log(amount, fine);
            GATE_OUT.parked_fine.textContent = fine;
            update_gate_out_net_total();
            unity.showToastNotification({ icon: "success", title: "Lost card fine applied successfully" });
        }
    } else {
        const result = await unity.showDialogConfirm({
            title: "Confirm Cancel Lost Card Fine",
        });
        if (result.confirm) {
            GATE_OUT.parked_fine.textContent = 0;
            update_gate_out_net_total();
            unity.showToastNotification({ icon: "success", title: "Lost card fine cancelled" });
        }
    }

    try {
        const data = {
            cmd: "info",
            license_info: GATE_OUT.license_id_input.textContent,
            date_in: GATE_OUT.in_datetime.textContent.split(" ")[0],
            time_in: GATE_OUT.in_datetime.textContent.split(" ")[1],
            parked_time: GATE_OUT.parked_time.textContent,
            amount_info: GATE_OUT.amount.textContent,
            parked_fine: GATE_OUT.parked_fine.textContent,
            image_info_01: GATE_OUT.gate_in_image_01.src,
            image_info_02: GATE_OUT.gate_in_image_02.src,
        };
        sendMessage_display_info(data);
    } catch (e) {
        unity.logger.error(e);
    }
}

window.chang_profile_gate_out = chang_profile_gate_out;
function chang_profile_gate_out() {
    if (GATE_OUT.transaction_id) {
        Dialog_Gate_Out_Select_Profile.showModal();
    }
}

window.process_member_fast_gate_out = process_member_fast_gate_out;
async function process_member_fast_gate_out() {
    unity.showDialogInfo({
        title: unity.i18next_translate("Processing"),
        msg: `<span class="loading loading-spinner text-info loading-lg"></span>`,
    });

    const formData = new FormData();
    let plate = GATE_OUT.license_id_input
        ? (GATE_OUT.license_id_input.value || GATE_OUT.license_id_input.textContent || "").trim()
        : "";
    if (!plate || plate === "No record" || plate === "-") {
        plate = GATE_OUT.id_card_input ? GATE_OUT.id_card_input.value.trim() : "";
    }

    formData.append("transaction_records_id", GATE_OUT.transaction_id);
    formData.append("amount", 0);
    formData.append("pay", 0);
    formData.append("fine", 0);
    formData.append("turn_amount", 0);
    formData.append("pay_type", "MEMBER_FREE");
    formData.append("gateway_id", GATE_OUT.id);
    formData.append("card_id", GATE_OUT.id_card_input.value);
    formData.append("license", plate || GATE_OUT.id_card_input.value || "");
    if (GATE_OUT.acc && GATE_OUT.acc.customer) {
        formData.append("customer_id", GATE_OUT.acc.customer.id);
    }
    formData.append("remark", "สมาชิกขาออกอัตโนมัติ (Fast Member Exit)");
    formData.append("cashier", `${GATE_OUT.name || "POS"}`);

    if (
        GATE_OUT.gate_out_image_01 &&
        GATE_OUT.gate_out_image_01.src &&
        !GATE_OUT.gate_out_image_01.src.startsWith("http") &&
        !GATE_OUT.gate_out_image_01.src.includes("no_image")
    ) {
        const img1 = await unity.dataURLtoFile(GATE_OUT.gate_out_image_01.src, "image_upload_01");
        if (img1) formData.append("image_upload_01", img1);
    }
    if (
        GATE_OUT.gate_out_image_02 &&
        GATE_OUT.gate_out_image_02.src &&
        !GATE_OUT.gate_out_image_02.src.startsWith("http") &&
        !GATE_OUT.gate_out_image_02.src.includes("no_image")
    ) {
        const img2 = await unity.dataURLtoFile(GATE_OUT.gate_out_image_02.src, "image_upload_02");
        if (img2) formData.append("image_upload_02", img2);
    }

    const respond = await unity.fetchApi("/api/function/check_out", "post", formData, "json");
    Dialog_Info.close();

    if (respond && respond.success) {
        unity.showToastNotification({
            icon: "success",
            title: unity.i18next_translate("Member Exit Success"),
            msg: `Member: ${plate} - Gate Opened.`,
        });

        if (GATE_MODE == "GATE_OUT" || GATE_MODE == "COMPACT" || GATE_MODE == "HANDHELD") {
            process_gate_out_open();
            if (GATE_OUT.gate_out_image_01) GATE_OUT.gate_out_image_01.src = "";
            if (GATE_OUT.gate_out_image_02) GATE_OUT.gate_out_image_02.src = "";
        }
        cancel_submit_gate_out();
        if (GATE_OUT.id_card_input) GATE_OUT.id_card_input.focus();
    } else {
        unity.showDialogError({
            title: "Exit Check Failed",
            msg: respond?.msg || "Failed to process member exit",
        });
        cancel_submit_gate_out();
    }
}

window.confirm_gate_out_data = confirm_gate_out_data;
async function confirm_gate_out_data() {
    if (GATE_OUT.transaction_id) {
        const transactions = transactions_gate_out;
        console.log("Confirming exit transaction payload", transactions);
        const Transaction_Record = transactions.Transaction_Record;
        const Service_Fees = transactions.Service_Fees;
        const GateWay = transactions.GateWay;
        const Log_Transaction = transactions.Log_Transaction;
        const Vehicle_Type = transactions.Vehicle_Type;
        const Member_User = transactions.Member_User;
        const Objective = transactions.Objective;
        const Visitor = transactions.Visitor;

        if (Dialog_Gate_Out_Proseecss.querySelector('[data-field="license_id"]'))
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="license_id"]').textContent = Log_Transaction.license;

        if (Dialog_Gate_Out_Proseecss.querySelector('[data-field="id_card"]'))
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="id_card"]').textContent = Log_Transaction.card_id;

        if (Dialog_Gate_Out_Proseecss.querySelector('[data-field="visitor_name"]'))
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="visitor_name"]').textContent = Visitor
                ? Visitor.name
                : "";
        if (Dialog_Gate_Out_Proseecss.querySelector('[data-field="contact"]'))
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="contact"]').textContent = Member_User
                ? Member_User.name
                : "";

        if (Dialog_Gate_Out_Proseecss.querySelector('[data-field="objective"]'))
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="objective"]').textContent = Objective
                ? Objective.name
                : "";

        if (Dialog_Gate_Out_Proseecss.querySelector('[data-field="e_stamp"]'))
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="e_stamp"]').textContent =
                Transaction_Record.allow_data || "";

        if (Dialog_Gate_Out_Proseecss.querySelector('[data-field="remark"]'))
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="remark"]').value = Transaction_Record.remark;

        // Exit snapshot rendering

        if (GATE_OUT.gate_out_image_01) {
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="gate_out_image_01"]').src =
                GATE_OUT.gate_out_image_01.src;
        }
        if (GATE_OUT.gate_out_image_02) {
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="gate_out_image_02"]').src =
                GATE_OUT.gate_out_image_02.src;
        }
        // Exit snapshot rendering

        Dialog_Gate_Out_Proseecss.querySelector('[data-field="profile"]').textContent = GATE_OUT.profile.textContent;
        Dialog_Gate_Out_Proseecss.querySelector('[data-field="parked_time"]').textContent =
            GATE_OUT.parked_time.textContent;
        Dialog_Gate_Out_Proseecss.querySelector('[data-field="parked_fine"]').textContent =
            GATE_OUT.parked_fine.textContent;
        Dialog_Gate_Out_Proseecss.querySelector('[data-field="pay"]').value = "";

        const amount = parseInt(GATE_OUT.amount.textContent, 10);
        const fine = parseInt(GATE_OUT.parked_fine.textContent, 10);
        const total = amount + fine;
        Dialog_Gate_Out_Proseecss.querySelector('[data-field="amount"]').textContent = amount;
        Dialog_Gate_Out_Proseecss.querySelector('[data-field="sum_amount"]').textContent = total;

        Dialog_Gate_Out_Proseecss.showModal();
        await unity.delay(200);
        if (total > 0) {
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="pay_box"]').classList.remove("hidden");
            // Dialog_Gate_Out_Proseecss.querySelector('[data-field="no_pay_box"]').classList.add("hidden");
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="pay"]').focus();
        } else {
            console.log("Zero fee transaction");
            Dialog_Gate_Out_Proseecss.querySelector('[data-field="pay_box"]').classList.add("hidden");
            // Dialog_Gate_Out_Proseecss.querySelector('[data-field="no_pay_box"]').classList.remove("hidden");
        }
    }
}

window.process_gate_out_open = process_gate_out_open;
async function process_gate_out_open(confirm = false) {
    unity.openGateForce(GATE_OUT.id, confirm, GATE_OUT.control_open_url, GATE_OUT.name);
}

window.input_pay_out_onkeypress = input_pay_out_onkeypress;
async function input_pay_out_onkeypress(e) {
    if (e) {
        const key = e.key;
        if (!/[0-9]/.test(key) && key !== "Enter" && key !== "Backspace") {
            e.preventDefault();
        }
        // Handle Enter key to trigger submit or custom action
        if (!(key === "Enter")) {
            return;
        }

        Dialog_Gate_Out_Proseecss.querySelector('[data-field="btn_submit"]').focus();
    }
}

// ! ************************************ Payment Services ************************************

window.onchange_pay_type = onchange_pay_type;
async function onchange_pay_type(pay_type, gate_type) {
    console.log("Change payment method", pay_type, gate_type);

    const dialogMap = {
        "GATE-OUT": typeof Dialog_Gate_Out_Proseecss !== "undefined" ? Dialog_Gate_Out_Proseecss : null,
        "GATE-IN": typeof Dialog_Gate_In_Proseecss !== "undefined" ? Dialog_Gate_In_Proseecss : null,
        "CASHIER_POS": typeof Dialog_Pay_Proseecss !== "undefined" ? Dialog_Pay_Proseecss : null,
    };
    const dialog = dialogMap[gate_type];
    if (!dialog) {
        unity.showDialogSuccess({ title: "Payment Mode Updated (No Mode)" });
        return;
    }

    if (pay_type === "QR-CODE") {
        dialog.querySelector('[data-field="pay_cash"]')?.classList.add("hidden");
        dialog.querySelector('[data-field="pay_action"]')?.classList.remove("hidden");
    } else {
        dialog.querySelector('[data-field="pay_cash"]')?.classList.remove("hidden");
        dialog.querySelector('[data-field="pay_action"]')?.classList.add("hidden");
        await unity.delay(100);
        dialog.querySelector('[data-field="pay"]')?.focus();
    }
}

window.cancel_qr_pay = cancel_qr_pay;
function cancel_qr_pay() {
    PAYMENT_SERVICE.qr_payment_ref = null;
    const data = {
        cmd: "cmd_qr_pay_close",
        qr_data: "",
    };
    sendMessage_display_info(data);
    Dialog_QR_Payment_Wait_Success.close();
}

async function wait_success_pay(ref = "") {
    const formData = new FormData();
    formData.append("qr_ref", ref);
    await unity.delay(500);
    while (Dialog_QR_Payment_Wait_Success.getAttribute("open") !== null) {
        await unity.delay(1000);
        const _reply = await unity.fetchApi("/api/payment_qr_code_status", "post", formData, "json");
        if (_reply.success) {
            console.log(_reply);
            // success_pay(_reply);
            return true;
            break;
        } else {
            // unity.showDialogError({ msg: _reply.error });
            console.log(_reply.msg);
        }
    }

    Dialog_QR_Payment_Wait_Success.close();
}
async function pay_action(pay, amount, fine, pay_type, pay_of_mode, reg_fee = 0) {
    const sun_amount = amount + fine + reg_fee;
    console.log(
        `💵 pay_action : ${pay_of_mode} pay:${pay} amount:${amount} fine:${fine} reg_fee:${reg_fee} pay_type:${pay_type}`,
    );
    if (sun_amount == 0) {
        return true;
    }
    const is_fine =
        fine > 0
            ? `<tr>
                <th>Lost Card Fine</th>
                <td>${fine}</td>
            </tr>`
            : "";
    const is_reg_fee =
        reg_fee > 0
            ? `<tr>
                <th>Registration Fee</th>
                <td>${reg_fee}</td>
            </tr>`
            : "";

    switch (pay_type) {
        case "CASH":
            if (pay >= sun_amount) {
                const turn_amount = pay - sun_amount;
                const content_html = `
                    <table class="table text-2xl  md:text-3xl">
                        <tbody>
                        <tr class="bg-base-200 text-primary">
                            <th>Cash Payment 💵</th>
                        </tr>
                        <tr>
                            <th>Parking Fee</th>
                            <td>${amount}</td>
                        </tr>
                        ${is_reg_fee}
                        ${is_fine}
                        <tr>
                            <th>Total Due</th>
                            <td>${sun_amount}</td>
                        </tr>
                        <tr>
                            <th>Amount Received</th>
                            <td>${pay}</td>
                        </tr>
                        <tr class="bg-base-200 text-primary">
                            <th>Change</th>
                            <td>${turn_amount}</td>
                        </tr>
                        </tbody>
                    </table>`;
                const result = await unity.showDialogConfirm({
                    title: "Confirm Transaction",
                    content: content_html,
                });
                return result.confirm;
            } else {
                unity.showDialogWarning({
                    title: "Amount Received Less Than Total Due",
                    msg: "Total Fee: " + sun_amount,
                });
            }
            break;
        case "QR-CODE":
            if (!PAYMENT_SERVICE.payment_on_terminal) {
                showDialogWarning({
                    msg: "Payment method not supported",
                });
                return;
            }
            PAYMENT_SERVICE.qr_code_box.classList.add("hidden");
            Dialog_QR_Payment_Wait_Success.showModal();
            let qr_code_data = null;
            if (PAYMENT_SERVICE.qr_payment_ref) {
                console.log("user last QR :" + PAYMENT_SERVICE.qr_payment_ref);
                PAYMENT_SERVICE.qr_code_box.classList.remove("hidden");
            } else {
                PAYMENT_SERVICE.qr_code.clear();
                const formData = new FormData();
                formData.append("payment_type", "QR-CODE");
                formData.append("amount", sun_amount);
                const _reply = await unity.fetchApi("/api/payment_qr_code", "post", formData, "json");
                console.log(_reply);
                if (_reply.success) {
                    PAYMENT_SERVICE.qr_code_box.classList.remove("hidden");
                    qr_code_data = _reply.data;
                    PAYMENT_SERVICE.qr_payment_ref = _reply.qr_payment_ref;
                    PAYMENT_SERVICE.qr_code.makeCode(qr_code_data);
                } else {
                    Dialog_QR_Payment_Wait_Success.close();
                    unity.showDialogError({
                        title: "Payment System Error",
                        msg: `${_reply.error.message ? _reply.error.message : _reply.error}`,
                    });
                    return;
                }
            }
            const data = {
                cmd: "cmd_qr_pay_show",
                qr_data: qr_code_data,
                amount_info: sun_amount,
            };
            sendMessage_display_info(data);
            if (await wait_success_pay(PAYMENT_SERVICE.qr_payment_ref)) {
                Dialog_QR_Payment_Wait_Success.close();
                return true;
            } else {
                console.log("cancel QR-CODE PAY");
                Dialog_QR_Payment_Wait_Success.close();
            }
            break;

        default:
            if (pay >= sun_amount) {
                const content_html = `
                    <table class="table text-2xl  md:text-3xl">
                        <tbody>
                        <tr class="bg-base-200 text-primary">
                            <th>${pay_type} Payment 💸</th>
                        </tr>
                        <tr>
                            <th>Parking Fee</th>
                            <td>${amount}</td>
                        </tr>
                        ${is_reg_fee}
                        ${is_fine}
                        <tr>
                            <th>Total Due</th>
                            <td>${sun_amount}</td>
                        </tr>
                        <tr>
                            <th>Amount Received</th>
                            <td>${pay}</td>
                        </tr>
                        </tbody>
                    </table>
                    <div class="stat border-error border-2 text-error mt-2">
                        <div class="stat-figure text-secondary">
                        <div class="avatar online">
                            <i class="fa-solid fa-triangle-exclamation text-error fa-3x"></i>
                        </div>
                        </div>
                        <div class="stat-value text-warning">⚠️ Please Verify</div>
                        <div class="text-error">Verify ${pay_type} payment amount<br>before confirming transaction!</div>
                    </div>`;
                const result = await unity.showDialogConfirm({
                    title: "Confirm Transaction",
                    content: content_html,
                });
                return result.confirm;
            } else {
                unity.showDialogWarning({
                    title: "Amount Received Less Than Total Due",
                    msg: "Total Fee: " + sun_amount,
                });
            }
            break;
    }
    return;
}

window.submit_pay = submit_pay;
async function submit_pay(pay_of_mode) {
    console.log(`💵 submit_pay of : ${pay_of_mode}`);
    let pay_type = "";
    let amount = 0;
    let pay = 0;
    let fine = 0;
    switch (pay_of_mode) {
        case "GATE-IN":
            if (is_processing_gate_in) {
                console.warn("⚠️ [Gate-In Locked] Submit/Payment already in progress.");
                return;
            }
            pay_type = Dialog_Gate_In_Proseecss.querySelector('[data-field="pay_type"]').value;
            amount = parseInt(Dialog_Gate_In_Proseecss.querySelector('[data-field="entrance_fee"]').textContent, 10);
            pay = parseInt(Dialog_Gate_In_Proseecss.querySelector('[data-field="pay"]').value, 10);
            fine = 0;
            if (isNaN(pay)) {
                pay = 0;
            }
            if (pay_type == "QR-CODE") {
                pay = amount;
            }
            if (await pay_action(pay, amount, fine, pay_type, pay_of_mode)) {
                await process_transaction_gate_in(amount, pay, pay - (amount + fine), `${pay_type}(GATE-IN)`);
            }
            break;
        case "GATE-OUT":
            pay_type = Dialog_Gate_Out_Proseecss.querySelector('[data-field="pay_type"]').value;
            amount = parseInt(Dialog_Gate_Out_Proseecss.querySelector('[data-field="amount"]').textContent, 10);
            pay = parseInt(Dialog_Gate_Out_Proseecss.querySelector('[data-field="pay"]').value, 10);
            fine = parseInt(Dialog_Gate_Out_Proseecss.querySelector('[data-field="parked_fine"]').textContent, 10);
            if (isNaN(pay)) {
                pay = 0;
            }
            if (isNaN(fine)) {
                fine = 0;
            }
            if (pay_type == "QR-CODE") {
                pay = amount;
            }
            if (await pay_action(pay, amount, fine, pay_type, pay_of_mode)) {
                await process_transaction_gate_out(amount, pay, pay - (amount + fine), pay_type, fine);
                unity.showToastNotification({ icon: "success", title: "Exit transaction completed successfully" });
            }
            break;
        case "CASHIER_POS-RENEW":
            pay_type = Dialog_Pay_Proseecss.querySelector('[data-field="pay_type"]').value;
            const actionType = document.querySelector('input[name="member_action_type"]:checked')?.value || "RENEW";
            const isRegister = actionType === "REGISTER";
            const isCustom = actionType === "CUSTOM";
            const regFee = isRegister ? Number(CASHIER_POS.member_registration_fee?.value) || 0 : 0;
            const renewAmount = isCustom
                ? parseInt(CASHIER_POS.member_renew_custom_amount?.value, 10) || 0
                : parseInt(CASHIER_POS.member_renew_amount.value, 10) || 0;
            const count = isCustom ? 1 : parseInt(CASHIER_POS.member_renew_count.value, 10) || 1;
            amount = isCustom ? renewAmount : renewAmount * count;
            pay = parseInt(Dialog_Pay_Proseecss.querySelector('[data-field="pay"]').value, 10);

            if (isNaN(pay)) {
                pay = 0;
            }
            if (isNaN(fine)) {
                fine = 0;
            }
            const totalAmount = amount + regFee;
            if (totalAmount <= 0) {
                return unity.showToastNotification({
                    icon: "warning",
                    type: "warning",
                    msg: "⚠️ No renewal fee configured for member, unable to process",
                });
            }
            if (pay_type == "QR-CODE") {
                pay = totalAmount;
            }
            if (await pay_action(pay, amount, fine, pay_type, pay_of_mode, regFee)) {
                await process_transaction_member_renew(totalAmount, pay, pay - totalAmount, pay_type);
                unity.showToastNotification({
                    icon: "success",
                    title: isRegister
                        ? "New member registered successfully"
                        : isCustom
                          ? "Member renewed (Custom) successfully"
                          : "Member renewed successfully",
                });
            }
            break;
        case "CASHIER_POS-MEMBER-USER-RENEW":
            pay_type = Dialog_Pay_Member_User_Proseecss.querySelector('[data-field="pay_type"]').value;
            amount = parseInt(Dialog_Pay_Member_User_Proseecss.querySelector('[data-field="amount"]').textContent, 10);
            pay = parseInt(Dialog_Pay_Member_User_Proseecss.querySelector('[data-field="pay"]').value, 10);

            if (isNaN(pay)) {
                pay = 0;
            }
            if (isNaN(fine)) {
                fine = 0;
            }
            if (pay_type == "QR-CODE") {
                pay = amount;
            }
            if (await pay_action(pay, amount, fine, pay_type, pay_of_mode)) {
                await process_transaction_member_user_renew(amount, pay, pay - amount, pay_type);
                unity.showToastNotification({ icon: "success", title: "Member user renewed successfully" });
            }
            break;
        default:
            unity.showDialogWarning({ title: "Invalid Payment Mode" });
            break;
    }
    return;
}

async function process_transaction_gate_out(amount, pay, turn_amount, pay_type = "cash", fine = 0) {
    //setTimeout(() => { Swal.close() }, 1000);
    unity.showDialogInfo({
        title: "Processing",
        msg: `<span class="loading loading-spinner text-info loading-lg"></span>`,
    });

    const formData = new FormData();
    formData.append("transaction_records_id", GATE_OUT.transaction_id);
    formData.append("amount", amount);
    formData.append("pay", pay);
    formData.append("fine", fine);
    formData.append("turn_amount", turn_amount);
    formData.append("pay_type", pay_type);
    formData.append("gateway_id", GATE_OUT.id);
    formData.append("card_id", GATE_OUT.id_card_input.value);
    formData.append("license", GATE_OUT.license_id_input.value || "");
    if (GATE_OUT.acc.customer) formData.append("customer_id", GATE_OUT.acc.customer ? GATE_OUT.acc.customer.id : null);
    if (GATE_OUT.acc.customer_amount)
        formData.append("customer_amount", GATE_OUT.acc.customer_amount ? GATE_OUT.acc.customer_amount : 0);
    formData.append(
        "remark",
        Dialog_Gate_Out_Proseecss.querySelector('[data-field="remark"]')
            ? Dialog_Gate_Out_Proseecss.querySelector('[data-field="remark"]').value
            : "",
    );
    formData.append("cashier", `${GATE_OUT.name}`);
    if (GATE_MODE == "CASHIER") {
        if (amount + fine == 0) {
            unity.showToastNotification({ icon: "info", msg: "No payment amount due" });
            Dialog_Info.close();
            Dialog_Gate_Out_Proseecss.close();
            cancel_submit_gate_out();
            return;
        }
        formData.append("cashier", `CASHIER-${SYSTEM_USER}`);
        formData.append("check_out_transaction", false);
    }

    const image_upload_01 = await unity.dataURLtoFile(
        Dialog_Gate_Out_Proseecss.querySelector('[data-field="gate_out_image_01"]').src,
        "image_upload_01",
    );
    const image_upload_02 = await unity.dataURLtoFile(
        Dialog_Gate_Out_Proseecss.querySelector('[data-field="gate_out_image_02"]').src,
        "image_upload_02",
    );
    if (image_upload_01) formData.append("image_upload_01", image_upload_01);
    if (image_upload_02) formData.append("image_upload_02", image_upload_02);

    unity.debugForm(formData);

    let totalSize = 0;
    // Iterate through all files in formData
    for (let pair of formData.entries()) {
        if (pair[1] instanceof File) {
            totalSize += pair[1].size; // Size in Bytes
        }
    }

    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`📦 FormData Size: ${sizeInMB} MB`);

    const respond = await unity.fetchApi("/api/function/check_out", "post", formData, "json");

    if (respond.success) {
        Dialog_Gate_Out_Proseecss.close();
        const Transaction_Record = respond.data;
        const In_Log = respond.Log_Transaction;
        console.log(respond);
        if (pay + fine > 0) {
            let service_fees_name = "N/A";
            try {
                await SERVICES_FEES_LIST.forEach((service_fee) => {
                    if (service_fee.id == Transaction_Record.service_fees_id) {
                        service_fees_name = service_fee.name;
                    }
                });
            } catch (error) {
                console.log(error);
            }

            const Account_Record = respond.Account_Record;
            if (GATE_OUT.tran_card_id) {
                GATE_OUT.tran_card_id.textContent = In_Log.card_id;
                GATE_OUT.tran_license_id.textContent = In_Log.license || "No Plate";
                GATE_OUT.tran_profile.textContent = service_fees_name;
                GATE_OUT.tran_amount.textContent = amount;
            }

            if (GATE_MODE == "GATE_OUT" || GATE_MODE == "COMPACT") {
                GATE_OUT.tran_date_time.textContent = unity.dateTimeToStr(In_Log.date_time);
                GATE_OUT.tran_parked.textContent = unity.secondsToDuration(Transaction_Record.parked);
            }
            if (GATE_MODE == "CASHIER") {
                GATE_OUT.acc_no.textContent = Account_Record.no;
                GATE_OUT.acc_date_time.textContent = unity.dateTimeToStr(Account_Record.date_time);
                GATE_OUT.acc_pay.textContent = Account_Record.pay;
                GATE_OUT.acc_fine.textContent = Account_Record.fine;
                GATE_OUT.acc_change.textContent = Account_Record.pay - Account_Record.amount;
                GATE_OUT.acc_type.textContent = Account_Record.type;
            }
            await loadSlipPayImage(Account_Record.id);
            // GATE_OUT.slip_pay_image.src = `/api/function/slip_pay?acc_id=${Account_Record.id}`;
            if (GATE_OUT.swtich_printer_slip.checked) {
                print_slip_pay();
            } else {
                unity.showToastNotification({ icon: "info", msg: "Processed without printing receipt" });
            }
        }
        Dialog_Info.close();
        if (GATE_MODE == "GATE_OUT" || GATE_MODE == "COMPACT" || GATE_MODE == "HANDHELD") {
            process_gate_out_open();
            GATE_OUT.gate_out_image_01.src = "";
            GATE_OUT.gate_out_image_02.src = "";
        }
        cancel_submit_gate_out();
        GATE_OUT.id_card_input.focus();
    } else {
        unity.showDialogError({ msg: respond.msg });
    }
}

async function process_transaction_member_renew(total_amount, pay, turn_amount, pay_type = "cash") {
    //setTimeout(() => { Swal.close() }, 1000);
    unity.showDialogInfo({
        title: "Processing",
        msg: `<span class="loading loading-spinner text-info loading-lg"></span>`,
    });

    const actionType = document.querySelector('input[name="member_action_type"]:checked')?.value || "RENEW";
    const isRegister = actionType === "REGISTER";
    const isCustom = actionType === "CUSTOM";
    const regFee = isRegister ? Number(CASHIER_POS.member_registration_fee?.value) || 0 : 0;

    const formData = new FormData();
    const cardIdToSubmit = CASHIER_POS.member_renew_id_card.textContent || CASHIER_POS.member_card_renew?.value;
    formData.append("card_id", cardIdToSubmit);
    formData.append("total_amount", total_amount);
    formData.append("pay", pay);
    formData.append("turn_amount", turn_amount);
    formData.append("pay_type", pay_type);
    formData.append("cashier", `CASHIER-${SYSTEM_USER}`);
    formData.append("renew_count", isCustom ? 1 : CASHIER_POS.member_renew_count.value);
    formData.append("member_renew_expire_after", CASHIER_POS.member_renew_expire_after.value);
    formData.append("action_type", isRegister ? "REGISTER" : isCustom ? "CUSTOM" : "RENEW");
    formData.append("registration_fee", regFee);
    if (isRegister) {
        if (CASHIER_POS.member_register_user_id?.value) {
            formData.append("member_user_id", CASHIER_POS.member_register_user_id.value);
        }
        if (CASHIER_POS.member_register_user_search?.value) {
            formData.append("member_user_name", CASHIER_POS.member_register_user_search.value);
        }
        if (CASHIER_POS.member_register_type_select?.value) {
            formData.append("member_type_id", CASHIER_POS.member_register_type_select.value);
        }
        if (CASHIER_POS.member_register_start_date?.value) {
            formData.append("start_date_time", CASHIER_POS.member_register_start_date.value);
        }
    }

    unity.debugForm(formData);

    const _reply = await unity.fetchApi("/api/function/member_renew", "post", formData, "json");

    cancel_submit_gate_out();
    if (_reply.success) {
        Dialog_Pay_Proseecss.close();
        console.log(_reply);
        const Account_Member_Record = _reply.Account_Member_Record;
        await loadSlipPayRenewImage(Account_Member_Record.id);
        // GATE_OUT.slip_pay_image.src = `/api/function/slip_pay?acc_id=${Account_Record.id}`;
        if (GATE_OUT.swtich_printer_slip.checked) {
            print_slip_pay();
        } else {
            unity.showToastNotification({ icon: "info", msg: "Processed without printing receipt" });
        }
        clear_member_renew_filed();
    } else {
        unity.showDialogError({ msg: _reply.msg });
    }
    Dialog_Info.close();
}

window.reprint_last_slip_pay = reprint_last_slip_pay;
async function reprint_last_slip_pay() {
    let slipSrc = GATE_OUT.slip_pay_image ? GATE_OUT.slip_pay_image.src : "";
    const isInvalidSrc =
        !slipSrc ||
        slipSrc.includes("Image_not_available.png") ||
        slipSrc.includes("no_image.png");

    if (isInvalidSrc) {
        const cachedSlip = localStorage.getItem("LAST_SLIP_PAY_ACC") || localStorage.getItem("LAST_SLIP_PAY");
        if (cachedSlip) {
            slipSrc = cachedSlip;
            if (GATE_OUT.slip_pay_image) {
                GATE_OUT.slip_pay_image.src = cachedSlip;
            }
        }
    }

    if (!slipSrc || slipSrc.includes("Image_not_available.png") || slipSrc.includes("no_image.png")) {
        unity.showToastNotification({
            icon: "warning",
            msg: unity.i18next_translate("No recent receipt available to reprint") || "No recent receipt available to reprint",
        });
        return;
    }

    unity.showToastNotification({
        icon: "info",
        msg: unity.i18next_translate("Reprinting receipt...") || "Reprinting receipt...",
    });

    if (deviceAppService) {
        if (await deviceAppService.getStatus()) {
            const _reply = await deviceAppService.printImage(GATE_OUT.slip_pay_image || slipSrc);
            if (_reply) {
                unity.showToastNotification({ icon: "success", msg: "Reprint successful" });
            } else {
                unity.showToastNotification({ icon: "error", msg: "printSlip Error" });
            }
        } else {
            printSlip(slipSrc);
        }
    } else if (isNativeApp) {
        printImagePosControl(GATE_OUT.slip_pay_image?.src || slipSrc);
    } else {
        printSlip(slipSrc);
    }
}

window.print_slip_pay = print_slip_pay;
async function print_slip_pay() {
    return reprint_last_slip_pay();
}

// ? ************************************ Capture Services ************************************

async function loadSlipInImage(transaction, slip_type = "slip_in") {
    try {
        const slipInUrl = `/api/function/${slip_type}?transaction_id=${transaction.id}&acc_id=0`;
        // Create a Promise to handle the image loading
        await new Promise((resolve, reject) => {
            GATE_IN.slip_in_image.src = slipInUrl;
            GATE_IN.slip_in_image.onload = resolve; // Image loaded successfully
            GATE_IN.slip_in_image.onerror = () => reject(`Failed to load image for transaction ID: ${transaction.id}`);
        });

        console.log("Image loaded successfully");
        localStorage.setItem("LAST_SLIP_IN_PAY", slipInUrl);
    } catch (error) {
        unity.logger.error(error); // Log the error if image fails to load
    }
}

async function loadSlipPayRenewImage(member_renew_acc_id) {
    try {
        // slip_pay_member_renew_acc
        const slipPayUrl = `/api/function/slip_pay_member_renew_acc?acc_id=${member_renew_acc_id}`;
        // Create a Promise to handle the image loading
        await new Promise((resolve, reject) => {
            GATE_OUT.slip_pay_image.src = slipPayUrl;
            GATE_OUT.slip_pay_image.onload = resolve; // Image loaded successfully
            GATE_OUT.slip_pay_image.onerror = () => reject(`Failed to load image for ${slipPayUrl}`);
        });
        console.log("Image loaded successfully");
        localStorage.setItem("LAST_SLIP_PAY_ACC", slipPayUrl);
    } catch (error) {
        unity.logger.error(error); // Log the error if image fails to load
    }
}

async function loadSlipPayRenewMemberUserImage(member_user_renew_acc_id) {
    try {
        // slip_pay_member_user_renew_acc
        const slipPayUrl = `/api/function/slip_pay_member_user_renew_acc?acc_id=${member_user_renew_acc_id}`;
        // Create a Promise to handle the image loading
        await new Promise((resolve, reject) => {
            GATE_OUT.slip_pay_image.src = slipPayUrl;
            GATE_OUT.slip_pay_image.onload = resolve; // Image loaded successfully
            GATE_OUT.slip_pay_image.onerror = () => reject(`Failed to load image for ${slipPayUrl}`);
        });
        console.log("Image loaded successfully");
        localStorage.setItem("LAST_SLIP_PAY_ACC", slipPayUrl);
    } catch (error) {
        unity.logger.error(error); // Log the error if image fails to load
    }
}

async function loadSlipPayImage(acc_id) {
    try {
        // slip_pay_member_renew_acc
        const slipPayUrl =
            GATE_MODE == "CASHIER"
                ? `/api/function/slip_pay_acc?acc_id=${acc_id}`
                : `/api/function/slip_pay?acc_id=${acc_id}`;
        // Create a Promise to handle the image loading
        await new Promise((resolve, reject) => {
            GATE_OUT.slip_pay_image.src = slipPayUrl;
            GATE_OUT.slip_pay_image.onload = resolve; // Image loaded successfully
            GATE_OUT.slip_pay_image.onerror = () => reject(`Failed to load image for ${slipPayUrl}`);
        });

        console.log("Image loaded successfully");

        if (GATE_MODE == "CASHIER") {
            localStorage.setItem("LAST_SLIP_PAY_ACC", slipPayUrl);
        } else {
            localStorage.setItem("LAST_SLIP_PAY", slipPayUrl);
        }
    } catch (error) {
        unity.logger.error(error); // Log the error if image fails to load
    }
}

window.capture_gate_in_01 = capture_gate_in_01;
async function capture_gate_in_01() {
    unity.startWebCam(false, GATE_IN.gate_in_image_01);
}

window.capture_gate_in_02 = capture_gate_in_02;
async function capture_gate_in_02() {
    unity.startWebCam(false, GATE_IN.gate_in_image_02);
}

// scan_qr_code has been moved to service_helper.js for shared reuse

// ? ************************************ Display Services (BroadcastChannel & Multi-Screen) ************************************
let extent_monitor_dsp = null;
const customerDisplayChannel = new BroadcastChannel("pks_customer_display_channel");
let lastDisplayData = null;
console.log("📡 [Main POS] BroadcastChannel initialized: 'pks_customer_display_channel'");

// Send periodic heartbeat to secondary window (keep-alive)
setInterval(() => {
    customerDisplayChannel.postMessage({ cmd: "MAIN_HEARTBEAT", timestamp: Date.now() });
}, 2000);

// Auto-close secondary window when main POS window is closed
window.addEventListener("beforeunload", () => {
    console.log("🚪 [Main POS] Window 'beforeunload' triggered -> Sending CLOSE_SECONDARY signal");
    customerDisplayChannel.postMessage({ cmd: "CLOSE_SECONDARY", timestamp: Date.now() });
});
window.addEventListener("pagehide", () => {
    console.log("🚪 [Main POS] Window 'pagehide' triggered -> Sending CLOSE_SECONDARY signal");
    customerDisplayChannel.postMessage({ cmd: "CLOSE_SECONDARY", timestamp: Date.now() });
});

// Respond to secondary window when it connects/reloads
customerDisplayChannel.onmessage = (event) => {
    if (event.data && event.data.cmd === "SECONDARY_READY") {
        console.log("🖥️ [Main POS] 📥 Received 'SECONDARY_READY' from Customer Display! Synchronizing state...");
        if (lastDisplayData) {
            console.log("📤 [Main POS] Resending last transaction state to Customer Display:", lastDisplayData);
            customerDisplayChannel.postMessage(lastDisplayData);
        } else {
            console.log("ℹ️ [Main POS] No previous transaction state to sync.");
        }
    }
};

window.setAutoExtenderRequired = setAutoExtenderRequired;
function setAutoExtenderRequired(checked) {
    localStorage.setItem("AUTO_EXTENDER_REQUIRED", checked ? "true" : "false");
    console.log("⚙️ [Main POS] AUTO_EXTENDER_REQUIRED toggled to:", checked);
    if (checked) {
        openDashboard_transaction_info();
    }
}

window.openDashboard_transaction_info = openDashboard_transaction_info;
async function openDashboard_transaction_info() {
    console.log("🖥️ [Main POS] [Step 1/3] openDashboard_transaction_info() triggered...");

    // Default fallback: placed on the right side of the primary monitor
    let left = window.screen.width;
    let top = 0;
    let width = window.screen.availWidth || window.screen.width;
    let height = window.screen.availHeight || window.screen.height;

    // 1. Window Management API (Chrome 100+ / Modern Chromium)
    if ("getScreenDetails" in window) {
        try {
            console.log("🔍 [Main POS] Querying window.getScreenDetails()...");
            const screenDetails = await window.getScreenDetails();
            console.log(`🖥️ [Main POS] Detected ${screenDetails.screens.length} total screen(s):`, screenDetails.screens);

            if (screenDetails.screens.length > 1) {
                const currentScreen = screenDetails.currentScreen;
                console.log(`🖥️ [Main POS] Current Active Screen (where POS is): "${currentScreen?.label || 'Screen'}" (Left: ${currentScreen?.availLeft ?? 0}, Top: ${currentScreen?.availTop ?? 0})`);

                // Priority 1: Pick the OTHER screen (different from where POS/mouse currently is) to prevent overlap
                // Priority 2: Pick the non-primary screen
                const secondaryScreen =
                    screenDetails.screens.find((s) => s !== currentScreen) ||
                    screenDetails.screens.find((s) => !s.isPrimary) ||
                    screenDetails.screens[1];

                if (secondaryScreen) {
                    left = secondaryScreen.availLeft !== undefined ? secondaryScreen.availLeft : secondaryScreen.left;
                    top = secondaryScreen.availTop !== undefined ? secondaryScreen.availTop : secondaryScreen.top;
                    width = secondaryScreen.availWidth !== undefined ? secondaryScreen.availWidth : secondaryScreen.width;
                    height = secondaryScreen.availHeight !== undefined ? secondaryScreen.availHeight : secondaryScreen.height;
                    console.log(
                        `🎯 [Main POS] [Step 2/3] Secondary Screen Selected -> Left: ${left}, Top: ${top}, Width: ${width}, Height: ${height}, Label: "${secondaryScreen.label || 'Secondary'}"`,
                    );
                }
            } else {
                console.warn(
                    "⚠️ [Main POS] Only 1 monitor detected by OS/Browser. Please ensure Windows/Linux display is set to 'Join/Extend' mode.",
                );
            }
        } catch (err) {
            console.warn("⚠️ [Main POS] Screen Details permission denied or error, using fallback positioning:", err);
        }
    } else {
        console.warn("⚠️ [Main POS] 'getScreenDetails' not supported or not running in Secure Context (HTTPS or localhost).");
    }

    const params = `popup=yes,scrollbars=no,resizable=yes,status=no,location=no,toolbar=no,menubar=no,width=${width},height=${height},left=${left},top=${top},screenX=${left},screenY=${top}`;
    console.log(`🪟 [Main POS] [Step 3/3] Opening window with features: "${params}"`);

    const applyPlacement = (targetWin) => {
        if (!targetWin || targetWin.closed) return;
        try {
            targetWin.moveTo(left, top);
            targetWin.resizeTo(width, height);
            console.log(`📐 [Main POS] Applied window placement -> moveTo(${left}, ${top}), resizeTo(${width}, ${height})`);
        } catch (e) {}
    };

    if (extent_monitor_dsp && !extent_monitor_dsp.closed) {
        try {
            console.log("🔄 [Main POS] Existing customer display window found. Repositioning & focusing...");
            extent_monitor_dsp.focus();
            applyPlacement(extent_monitor_dsp);
        } catch (e) {
            console.warn("⚠️ [Main POS] Could not reposition existing window, reopening:", e);
            extent_monitor_dsp.close();
            extent_monitor_dsp = window.open("/panel_display_info", "pks_panel_display", params);
        }
    } else {
        console.log("✨ [Main POS] Launching new customer display window '/panel_display_info'...");
        extent_monitor_dsp = window.open("/panel_display_info", "pks_panel_display", params);
    }

    if (extent_monitor_dsp) {
        applyPlacement(extent_monitor_dsp);
        setTimeout(() => applyPlacement(extent_monitor_dsp), 150);
        setTimeout(() => applyPlacement(extent_monitor_dsp), 400);
    }

    // Keep focus on the main window (POS Cashier)
    window.focus();
    console.log("✅ [Main POS] openDashboard_transaction_info() completed. Focus returned to Cashier POS.");
}

function stringToHex(utf8String) {
    // Use TextEncoder to encode the string into a Uint8Array of UTF-8 bytes
    let encoder = new TextEncoder();
    let utf8Bytes = encoder.encode(utf8String);

    // Convert each byte to a hexadecimal string and concatenate
    let hexString = "";
    utf8Bytes.forEach((byte) => {
        hexString += byte.toString(16).padStart(2, "0");
    });

    return hexString;
}

const sendMessage_display_info = async (data) => {
    if (GATE_MODE == "CASHIER") {
        return;
    }
    console.log("🖥️ sendMessage_display_info", data);
    lastDisplayData = data;
    try {
        // 1. BroadcastChannel (Persistent across page reloads)
        customerDisplayChannel.postMessage(data);

        // 2. Direct postMessage fallback
        if (extent_monitor_dsp && !extent_monitor_dsp.closed) {
            extent_monitor_dsp.postMessage(data, "*");
        }
        const DSP_P10 = localStorage.getItem("P3000_LED_IP_GATE_OUT");
        if (DSP_P10) {
            let perfix_space = "****";
            // console.log(data.amount_info);
            const amount = parseInt(data.amount_info, 10) + parseInt(data.parked_fine, 10);
            if (amount) {
                if (amount > 1000) {
                    console.log(amount, "1000");
                    perfix_space = "";
                } else if (amount >= 100) {
                    console.log(amount, "100");
                    perfix_space = " ";
                } else if (amount >= 10) {
                    console.log(amount, "10");
                    perfix_space = "  ";
                } else {
                    console.log(amount, "1");
                    perfix_space = "   ";
                }
                // "00FF3C0039393900FF"
                const hexString = "00FF3C00" + stringToHex(`${perfix_space}${amount}THB `) + "00FF";
                const url_DSP = `http://${DSP_P10}/set_output_hex_string?data=${hexString}`;
                console.log(hexString);
                console.log(url_DSP);
                const _reply = await unity.fetchApi(url_DSP, "post", null, "json");
                console.log(_reply);
            } else {
                const hexString = "00FF3C00" + stringToHex("") + "00FF";
                const url_DSP = `http://${DSP_P10}/set_output_hex_string?data=${hexString}`;
                console.log(hexString);
                console.log(url_DSP);
                const _reply = await unity.fetchApi(url_DSP, "post", null, "json");
            }
        }
    } catch (e) {
        unity.showToastNotification({ icon: "warning", msg: "LED display dispatch error: " + String(e) });
    }
};

// ? Member Renew Service **************************************************
const Member_Renew_Item = {};

function clear_member_renew_filed() {
    CASHIER_POS.member_renew_id_card.textContent = "";
    CASHIER_POS.member_renew_status.textContent = "";
    CASHIER_POS.member_renew_create_date.textContent = "";
    CASHIER_POS.member_renew_start_date.textContent = "";
    CASHIER_POS.member_renew_expire_date.textContent = "";
    CASHIER_POS.member_renew_day_for_use.textContent = "";
    CASHIER_POS.member_renew_type.textContent = "";
    CASHIER_POS.member_renew_expire_day.textContent = "";
    CASHIER_POS.member_type_renewal_type.textContent = "";
    CASHIER_POS.member_renew_service.textContent = "";
    CASHIER_POS.member_renew_user_image.src = "/static/image/Image_not_available.png";
    CASHIER_POS.member_renew_user_name.textContent = "";

    CASHIER_POS.member_renew_user_remark.textContent = "";
    CASHIER_POS.member_renew_user_status.textContent = "";

    CASHIER_POS.member_renew_amount.value = "";
    if (CASHIER_POS.member_renew_custom_amount) CASHIER_POS.member_renew_custom_amount.value = 0;
    if (CASHIER_POS.member_renew_custom_expire) CASHIER_POS.member_renew_custom_expire.value = "";
    CASHIER_POS.member_renew_count.value = 1;
    CASHIER_POS.member_renew_total_amount.value = "";
    CASHIER_POS.member_renew_expire_after.value = "";

    CASHIER_POS.member_renew_amount.focus();
    CASHIER_POS.member_renew_count.disabled = true;
    CASHIER_POS.btn_submit_member_renew.disabled = true;
}

window.clear_member_renew = clear_member_renew;
async function clear_member_renew() {
    const result = await unity.showDialogConfirm({ title: "Confirm Action", content: "Reset transaction data?" });
    if (result.confirm) {
        clear_member_renew_filed();
    }
}

let MEMBER_TYPE_LIST = [];
async function load_member_type_options() {
    const res = await unity.fetchApi("/api/member/type", "get", null, "json");
    if (res.success && Array.isArray(res.data)) {
        MEMBER_TYPE_LIST = res.data;
        const typeSelect = CASHIER_POS.member_register_type_select;
        if (typeSelect) {
            typeSelect.innerHTML =
                '<option value="">-- Select Member Type --</option>' +
                res.data
                    .map(
                        (t) =>
                            `<option value="${t.id}">${t.name} (Renew ${t.amount} THB, Reg Fee ${t.registration_fee || 0} THB)</option>`,
                    )
                    .join("");
        }
    }
}

window.on_member_register_type_change = on_member_register_type_change;
function on_member_register_type_change(type_id) {
    if (!type_id) return;
    const selectedType = MEMBER_TYPE_LIST.find((t) => t.id == type_id);
    if (selectedType) {
        CASHIER_POS.member_renew_amount.value = selectedType.amount;
        if (CASHIER_POS.member_registration_fee) {
            CASHIER_POS.member_registration_fee.value = selectedType.registration_fee || 0;
        }
        CASHIER_POS.member_renew_type.textContent = selectedType.name;
        CASHIER_POS.member_renew_expire_day.textContent = selectedType.expire_day;
        CASHIER_POS.member_type_renewal_type.textContent = selectedType.renewal_type || "DAY";
        member_renew_count_change();
    }
}

window.on_member_register_user_select = on_member_register_user_select;
async function on_member_register_user_select(user_name) {
    if (!user_name) return;
    const found = (CONTACT_LIST || []).find((c) => c.name === user_name || c.id == user_name);
    if (found) {
        CASHIER_POS.member_register_user_id.value = found.id;
        CASHIER_POS.member_renew_user_name.textContent = found.name;
        if (found.pictureUrl)
            CASHIER_POS.member_renew_user_image.src = found.pictureUrl || "/static/image/no_image.png";
    } else {
        const res = await unity.fetchApi(
            `/api/member/user?filter_name=${encodeURIComponent(user_name)}`,
            "get",
            null,
            "json",
        );
        if (res.success && res.data && res.data.length > 0) {
            const u = res.data[0];
            CASHIER_POS.member_register_user_id.value = u.id;
            CASHIER_POS.member_renew_user_name.textContent = u.name;
            if (u.pictureUrl) CASHIER_POS.member_renew_user_image.src = u.pictureUrl;
        }
    }
}

window.switch_member_action_mode = switch_member_action_mode;
function switch_member_action_mode(action_type) {
    const regContainer = document.getElementById("registration_fee_container");
    const bindingContainer = document.getElementById("member_register_binding_container");
    const countContainer = document.getElementById("member_renew_count_container");
    const cycleContainer = document.getElementById("member_cycle_inputs_container");
    const customContainer = document.getElementById("member_custom_inputs_container");

    if (action_type === "REGISTER") {
        if (regContainer) regContainer.classList.remove("hidden");
        if (bindingContainer) bindingContainer.classList.remove("hidden");
        if (countContainer) countContainer.classList.add("hidden");
        if (cycleContainer) cycleContainer.classList.remove("hidden");
        if (customContainer) customContainer.classList.add("hidden");

        // Enforce single cycle for new registrations
        CASHIER_POS.member_renew_count.value = 1;
        CASHIER_POS.member_renew_count.disabled = true;
        CASHIER_POS.btn_submit_member_renew.disabled = false;

        if (CASHIER_POS.member_register_start_date && !CASHIER_POS.member_register_start_date.value) {
            const now = new Date();
            const nowIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            CASHIER_POS.member_register_start_date.value = nowIso;
        }
        if (MEMBER_TYPE_LIST.length === 0) load_member_type_options();
    } else if (action_type === "CUSTOM") {
        if (regContainer) regContainer.classList.add("hidden");
        if (bindingContainer) bindingContainer.classList.add("hidden");
        if (cycleContainer) cycleContainer.classList.add("hidden");
        if (customContainer) customContainer.classList.remove("hidden");

        // Default custom expiration and tariff
        if (
            CASHIER_POS.member_renew_custom_amount &&
            (!CASHIER_POS.member_renew_custom_amount.value || CASHIER_POS.member_renew_custom_amount.value == "0")
        ) {
            CASHIER_POS.member_renew_custom_amount.value = CASHIER_POS.member_renew_amount.value || 0;
        }
        if (CASHIER_POS.member_renew_custom_expire) {
            const baseDate = dayjs().add(1, "hour");
            const nowIso = new Date(baseDate.valueOf() - new Date().getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            CASHIER_POS.member_renew_custom_expire.value = nowIso;
        }
        if (CASHIER_POS.member_renew_id_card.textContent) {
            CASHIER_POS.btn_submit_member_renew.disabled = false;
        }
    } else {
        // RENEW mode
        if (regContainer) regContainer.classList.add("hidden");
        if (bindingContainer) bindingContainer.classList.add("hidden");
        if (cycleContainer) cycleContainer.classList.remove("hidden");
        if (countContainer) countContainer.classList.remove("hidden");
        if (customContainer) customContainer.classList.add("hidden");
        if (CASHIER_POS.member_renew_id_card.textContent) {
            CASHIER_POS.member_renew_count.disabled = false;
            CASHIER_POS.btn_submit_member_renew.disabled = false;
        }
    }
    member_renew_count_change();
}

window.member_renew_count_change = member_renew_count_change;
function member_renew_count_change() {
    function addSafeMonths(date, months) {
        const d = date.getDate();
        const newDate = new Date(date); // Clone date instance
        newDate.setMonth(newDate.getMonth() + months);

        // Handle month-end rollover
        if (newDate.getDate() < d) newDate.setDate(0);

        return newDate;
    }

    const pos = CASHIER_POS;
    const actionType = document.querySelector('input[name="member_action_type"]:checked')?.value || "RENEW";

    if (actionType === "CUSTOM") {
        const customAmount = Number(pos.member_renew_custom_amount?.value) || 0;
        pos.member_renew_total_amount.value = customAmount;
        if (pos.member_renew_custom_expire?.value) {
            pos.member_renew_expire_after.value = pos.member_renew_custom_expire.value;
        } else {
            pos.member_renew_expire_after.value = "";
        }
        return;
    }

    const count = Number(pos.member_renew_count.value);
    const amount = Number(pos.member_renew_amount.value);
    pos.member_renew_total_amount.value = "";
    pos.member_renew_expire_after.value = "";

    if (!Number.isInteger(count) || count <= 0) {
        return unity.showDialogWarning({ msg: "Please enter a valid cycle count" });
    }

    // Calculate total including registration fee in REGISTER mode
    const isRegister = actionType === "REGISTER";
    const regFee = isRegister ? Number(pos.member_registration_fee?.value) || 0 : 0;
    pos.member_renew_total_amount.value = amount * count + regFee;

    // Format start date
    let baseDate;
    if (isRegister && pos.member_register_start_date?.value) {
        baseDate = dayjs(pos.member_register_start_date.value);
        pos.member_renew_start_date.textContent = unity.dateTimeToStr(baseDate);
    } else {
        const expireText = pos.member_renew_expire_date.textContent;
        if (expireText && expireText.includes("/")) {
            const [day, month, yearTime] = expireText.split("/");
            const [year, time] = yearTime.split(" ");
            baseDate = dayjs(`${year}-${month}-${day}T${time}`);
        } else {
            baseDate = dayjs();
        }
    }

    // Compute new expiry date
    const type = pos.member_type_renewal_type.textContent;
    const dayValue = Number(pos.member_renew_expire_day.textContent) || 0;

    switch (type) {
        case "DAY":
            // baseDate = addDays(baseDate, count * dayValue);
            baseDate = baseDate.add(count * dayValue, "day");
            break;

        case "1_MONTH":
            // baseDate = addSafeMonths(baseDate, count);
            baseDate = baseDate.add(count, "month");
            break;

        case "3_MONTH":
            // baseDate = addSafeMonths(baseDate, count * 3);
            baseDate = baseDate.add(count * 3, "month");

            break;

        case "6_MONTH":
            // baseDate = addSafeMonths(baseDate, count * 6);
            baseDate = baseDate.add(count * 6, "month");

            break;

        case "1_YEAR":
            // baseDate = addSafeMonths(baseDate, count * 12);
            baseDate = baseDate.add(count * 12, "month");
            break;
    }

    pos.member_renew_expire_after.value = baseDate.format("YYYY-MM-DDTHH:mm");
}

async function submit_member_renew(card_id) {
    const actionType = document.querySelector('input[name="member_action_type"]:checked')?.value || "RENEW";
    const isRegister = actionType === "REGISTER";
    const isCustom = actionType === "CUSTOM";
    const respond = await unity.fetchApi("/api/member/tools_permission_check?card_id=" + card_id, "get", null, "json");

    if (respond.success) {
        // console.log(_reply);
        const info = respond.info;
        const card_data = respond.data.card_data;
        console.log(card_data);
        const Member = card_data.Member;
        const Member_Type = card_data.Member_Type;
        const Member_User = card_data.Member_User;
        const Member_User_Permission = card_data.Member_User_Permission;
        const Service_Fees = card_data.Service_Fees;

        if (isRegister) {
            unity.showToastNotification({
                icon: "warning",
                type: "warning",
                msg: `⚠️ Card ID [ ${card_id} ] is already registered (User: ${Member_User?.name || "-"})`,
            });
        } else {
            unity.showToastNotification({ icon: "success", msg: respond.msg });
        }

        Member_Renew_Item.Member = Member;
        console.log(Member_Type);
        CASHIER_POS.member_renew_id_card.textContent = Member.card_id;
        CASHIER_POS.member_renew_status.textContent = Member.status;
        CASHIER_POS.member_renew_create_date.textContent = unity.dateTimeToStr(Member.create_date_time);
        CASHIER_POS.member_renew_start_date.textContent = unity.dateTimeToStr(Member.start_date_time);
        CASHIER_POS.member_renew_expire_date.textContent = unity.dateTimeToStr(Member.expire_date_time);
        let time_to_use = unity.secondsToDuration(info.time_to_use > 0 ? info.time_to_use : 0);
        if (time_to_use == "00:00") {
            time_to_use = "Expired";
        }
        CASHIER_POS.member_renew_day_for_use.textContent = time_to_use;
        CASHIER_POS.member_renew_type.textContent = Member_Type.name;
        CASHIER_POS.member_renew_expire_day.textContent = Member_Type.expire_day;

        CASHIER_POS.member_type_renewal_type.textContent = Member_Type.renewal_type ? Member_Type.renewal_type : "DAY";
        CASHIER_POS.member_renew_service.textContent = Service_Fees ? Service_Fees.name : "No Tariff Configured";

        CASHIER_POS.member_renew_user_image.src = Member_User.pictureUrl;
        CASHIER_POS.member_renew_user_name.textContent = Member_User.name;
        CASHIER_POS.member_renew_user_status.textContent = Member_User.status;
        CASHIER_POS.member_renew_user_address.textContent = Member_User.address;
        CASHIER_POS.member_renew_user_remark.textContent = Member_User.remark;
        CASHIER_POS.member_renew_user_permission.textContent = Member_User_Permission
            ? Member_User_Permission.name
            : "-";

        CASHIER_POS.member_renew_amount.value = Member_Type.amount;
        if (CASHIER_POS.member_renew_custom_amount) {
            CASHIER_POS.member_renew_custom_amount.value = Member_Type.amount;
        }
        if (CASHIER_POS.member_renew_custom_expire) {
            const baseExpire = dayjs().add(1, "hour");
            const nowIso = new Date(baseExpire.valueOf() - new Date().getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            CASHIER_POS.member_renew_custom_expire.value = nowIso;
        }
        if (CASHIER_POS.member_registration_fee) {
            CASHIER_POS.member_registration_fee.value = Member_Type.registration_fee || 0;
        }
        member_renew_count_change();
        CASHIER_POS.member_renew_count.disabled = isRegister || isCustom;
        CASHIER_POS.btn_submit_member_renew.disabled = false;
    } else {
        if (isRegister) {
            CASHIER_POS.member_renew_id_card.textContent = card_id;
            CASHIER_POS.member_renew_status.textContent = "NEW_CARD";
            CASHIER_POS.btn_submit_member_renew.disabled = false;
            unity.showToastNotification({
                icon: "info",
                type: "info",
                msg: `ℹ️ Card ID [ ${card_id} ] is a new unregistered card, ready for registration`,
            });
        } else {
            unity.showToastNotification({ icon: "error", msg: respond.msg });
        }
    }
}

window.member_input_id_card_onkeypress = member_input_id_card_onkeypress;
async function member_input_id_card_onkeypress(e) {
    if (e.key === "Enter" || e.keyCode === 13) {
        // e.preventDefault(); // Prevent the default action (optional)
        const member_input_id_card = unity.validateTransactionString(CASHIER_POS.member_card_renew.value);
        // unity.showToastNotification({ msg: member_input_id_card });
        submit_member_renew(member_input_id_card);
        CASHIER_POS.member_card_renew.value = "";
    }
}

window.submit_pay_member_renew = submit_pay_member_renew;
async function submit_pay_member_renew() {
    const actionType = document.querySelector('input[name="member_action_type"]:checked')?.value || "RENEW";
    const isRegister = actionType === "REGISTER";
    const isCustom = actionType === "CUSTOM";

    // 1. ตรวจสอบหมายเลขบัตร / ทะเบียนรถ (Card ID / License Plate)
    const cardId = (CASHIER_POS.member_renew_id_card?.textContent || CASHIER_POS.member_card_renew?.value || "").trim();
    if (!cardId || cardId === "-") {
        CASHIER_POS.member_card_renew?.focus();
        return unity.showDialogWarning({
            title: "Incomplete Information",
            msg: "⚠️ กรุณาระบุหมายเลขบัตรหรือทะเบียนรถสมาชิกก่อนทำรายการ",
        });
    }

    // 2. ตรวจสอบข้อมูลเฉพาะโหมดสมัครสมาชิกใหม่ (REGISTER Mode)
    if (isRegister) {
        const memberTypeId = CASHIER_POS.member_register_type_select?.value;
        if (!memberTypeId) {
            CASHIER_POS.member_register_type_select?.focus();
            return unity.showDialogWarning({
                title: "Incomplete Information",
                msg: "⚠️ กรุณาเลือกประเภทสมาชิก (Member Type) สำหรับการลงทะเบียนใหม่",
            });
        }
        const userName = (CASHIER_POS.member_register_user_search?.value || "").trim();
        if (!userName) {
            CASHIER_POS.member_register_user_search?.focus();
            return unity.showDialogWarning({
                title: "Incomplete Information",
                msg: "⚠️ กรุณาระบุชื่อผู้ใช้งานสมาชิก (Member User) สำหรับการลงทะเบียนใหม่",
            });
        }
        const startDate = CASHIER_POS.member_register_start_date?.value;
        if (!startDate) {
            CASHIER_POS.member_register_start_date?.focus();
            return unity.showDialogWarning({
                title: "Incomplete Information",
                msg: "⚠️ กรุณาระบุวันเริ่มต้นใช้งานสมาชิก (Start Date)",
            });
        }
    }

    // 3. ตรวจสอบวันหมดอายุหลังต่ออายุ (Expiry Date After Renewal)
    const rawExpire = (CASHIER_POS.member_renew_expire_after?.value || "").trim();
    if (!rawExpire || rawExpire === "-" || (typeof dayjs !== "undefined" && !dayjs(rawExpire).isValid())) {
        CASHIER_POS.member_renew_expire_after?.focus();
        return unity.showDialogWarning({
            title: "Incomplete Information",
            msg: "⚠️ กรุณาระบุวันหมดอายุหลังต่ออายุ (Expiry Date After Renewal) ให้ถูกต้อง",
        });
    }

    // 4. ตรวจสอบจำนวนรอบ (Billing Cycle) ในโหมด RENEW
    const count = Number(CASHIER_POS.member_renew_count?.value) || 1;
    if (!isCustom && (!Number.isInteger(count) || count <= 0)) {
        CASHIER_POS.member_renew_count?.focus();
        return unity.showDialogWarning({
            title: "Invalid Billing Cycle",
            msg: "⚠️ กรุณาระบุจำนวนรอบการต่ออายุที่ถูกต้อง (ขั้นต่ำ 1 รอบ)",
        });
    }

    // 5. ตรวจสอบยอดเงินรวม (Total Amount)
    const amount = CASHIER_POS.member_renew_amount?.value || 0;
    const total_amount = parseInt(CASHIER_POS.member_renew_total_amount?.value, 10);
    if (isNaN(total_amount) || total_amount < 0) {
        return unity.showDialogWarning({
            title: "Unable to Process Transaction",
            msg: "⚠️ ยอดเงินรวมไม่ถูกต้อง กรุณาตรวจสอบอัตราค่าบริการก่อนทำรายการ",
        });
    }

    const member_renew_type = CASHIER_POS.member_renew_type?.textContent || (isRegister ? "New Registration" : "-");
    const member_renew_expire_after = dayjs(rawExpire).isValid()
        ? dayjs(rawExpire).format("DD/MM/YYYY HH:mm:ss")
        : rawExpire;
    const regFee = isRegister ? Number(CASHIER_POS.member_registration_fee?.value) || 0 : 0;

    Dialog_Pay_Proseecss.querySelector('[data-field="title"]').textContent = isRegister
        ? "Member Payment (Registration & Renewal)"
        : isCustom
          ? "Member Payment (Custom Duration & Tariff)"
          : "Member Payment (Card Renewal)";
    Dialog_Pay_Proseecss.querySelector('[data-field="id_card"]').textContent = cardId;
    Dialog_Pay_Proseecss.querySelector('[data-field="amount"]').textContent = isCustom
        ? `${total_amount} THB (Custom)`
        : `${amount} THB/cycle`;
    Dialog_Pay_Proseecss.querySelector('[data-field="sum_amount"]').textContent = total_amount;

    const actionText = isRegister
        ? "New Registration & Card Renewal"
        : isCustom
          ? "Card Renewal (Custom Duration & Tariff)"
          : "Card Renewal";
    const regFeeText = isRegister ? `<br>💳Reg Fee: ${regFee} THB` : "";
    const cycleInfo = isCustom ? "" : ` Count: ${count} cycles`;
    const pay_detail_content = `${actionText} ${member_renew_type}${cycleInfo}${regFeeText}<br>📑Total Amount: ${total_amount} THB <br>📅Valid Until: ${member_renew_expire_after}`;
    Dialog_Pay_Proseecss.querySelector('[data-field="pay_detail"]').innerHTML = pay_detail_content;
    Dialog_Pay_Proseecss.showModal();
}

// ? Member User Renew Service **********************************************
function clear_member_user_renew_filed() {
    CASHIER_POS.member_user_renew_id.textContent = "";
    CASHIER_POS.member_user_renew.textContent = "";
    CASHIER_POS.member_user_renew_status.textContent = "";
    CASHIER_POS.member_user_renew_expire_date.textContent = "";
    CASHIER_POS.member_user_renew_type.textContent = "";
    CASHIER_POS.member_user_renew_amount.value = 0;

    CASHIER_POS.member_user_renew_image.src = "/static/image/no_image.png";
    CASHIER_POS.member_user_renew_card_list.innerHTML = "";
    CASHIER_POS.btn_submit_member_user_renew.disabled = true;
}

window.member_user_input_onkeypress = member_user_input_onkeypress;
async function member_user_input_onkeypress(e) {
    if (e.key === "Enter" || e.keyCode === 13) {
        const member_user_input = CASHIER_POS.member_user_renew_input.value;
        if (member_user_input.length < 3) {
            unity.showToastNotification({ type: "warning", msg: "Please enter member name (at least 3 characters)" });
            return;
        }
        await submit_member_user_renew(member_user_input);
        CASHIER_POS.member_user_renew_input.value = "";
    }
}

async function submit_member_user_renew(user_name) {
    console.log(user_name);
    clear_member_user_renew_filed();
    const respond = await unity.fetchApi(
        `/api/member/user?include_card=true&filter_name=${encodeURIComponent(user_name)}`,
        "get",
        null,
        "json",
    );
    // console.log(respond);
    if (respond.success) {
        const member_user = respond.data[0];
        const card_data = respond.card_data;
        console.log(member_user);
        // console.log(card_data);
        const json_data = JSON.parse(member_user.json_data);
        console.log(json_data);

        CASHIER_POS.member_user_renew_amount.value = json_data.member_user_fee ? json_data.member_user_fee : 0;
        CASHIER_POS.member_user_renew_id.textContent = member_user.id;
        CASHIER_POS.member_user_renew.textContent = member_user.name;
        CASHIER_POS.member_user_renew_status.textContent = member_user.status;
        CASHIER_POS.member_user_renew_expire_date.textContent = member_user.expire_date_time
            ? unity.dateTimeToStr(member_user.expire_date_time, "DD/MM/YYYY")
            : "Unassigned";
        CASHIER_POS.member_user_renew_type.textContent = member_user.user_type;
        CASHIER_POS.member_user_renew_image.src = member_user.pictureUrl || "/static/image/no_image.png";

        if (member_user.expire_date_time) {
            const user_type = member_user.user_type;
            let member_user_renew_expire_after = dayjs(member_user.expire_date_time);
            const renewConfig = {
                USER_3_MONTH: { value: 3, unit: "month" },
                USER_6_MONTH: { value: 6, unit: "month" },
                USER_1_YEAR: { value: 1, unit: "year" },
            };

            const { value, unit } = renewConfig[user_type] || { value: 1, unit: "month" };

            member_user_renew_expire_after = member_user_renew_expire_after.add(value, unit);

            CASHIER_POS.member_user_renew_expire_after.value = unity.dateTimeToStr(
                member_user_renew_expire_after,
                "DD/MM/YYYY",
            );
            CASHIER_POS.btn_submit_member_user_renew.disabled = false;
            // btn_submit_member_user_renew.onclick = () => {

            // }
        }

        if (card_data) {
            const _temp = document.getElementById("template_Card_data");
            for (let index = 0; index < card_data.length; index++) {
                const card = card_data[index];
                // console.log(card);
                const clone = _temp.content.cloneNode(true);
                clone.querySelector('[name="card_id"]').textContent = card.card_id;
                clone.querySelector('[name="status"]').textContent = card.status;
                clone.querySelector('[name="expire_date_time"]').textContent = card.expire_date_time
                    ? unity.dateTimeToStr(card.expire_date_time)
                    : "Unassigned";

                CASHIER_POS.member_user_renew_card_list.appendChild(clone);
            }
        }
    } else {
        unity.showToastNotification({ icon: "error", msg: respond.msg });
    }
}

window.submit_pay_member_user_renew = submit_pay_member_user_renew;
async function submit_pay_member_user_renew() {
    const amount = CASHIER_POS.member_user_renew_amount.value;
    const total_amount = parseInt(CASHIER_POS.member_user_renew_amount.value, 10);
    const renew_type = CASHIER_POS.member_user_renew_type.textContent;
    const renew_expire_after = CASHIER_POS.member_user_renew_expire_after.value;
    if (isNaN(total_amount) || total_amount <= 0) {
        return unity.showDialogWarning({
            title: "Unable to Process Transaction",
            msg: "⚠️ No renewal fee configured or invalid amount. Please specify tariff before proceeding.",
        });
    }
    Dialog_Pay_Member_User_Proseecss.querySelector('[data-field="title"]').textContent = "Member User Renewal Payment";
    Dialog_Pay_Member_User_Proseecss.querySelector('[data-field="member_user_name"]').textContent =
        CASHIER_POS.member_user_renew.textContent;
    Dialog_Pay_Member_User_Proseecss.querySelector('[data-field="amount"]').textContent = `${amount} THB/cycle`;
    Dialog_Pay_Member_User_Proseecss.querySelector('[data-field="sum_amount"]').textContent = total_amount;
    const pay_detail_content = `Member User Renewal: ${renew_type}<br>📑Amount: ${total_amount} THB <br>📅Valid Until: ${renew_expire_after}`;
    Dialog_Pay_Member_User_Proseecss.querySelector('[data-field="pay_detail"]').innerHTML = pay_detail_content;
    Dialog_Pay_Member_User_Proseecss.showModal();
}

async function process_transaction_member_user_renew(amount, pay, turn_amount, pay_type = "cash") {
    //setTimeout(() => { Swal.close() }, 1000);
    unity.showDialogInfo({
        title: "Processing",
        msg: `<span class="loading loading-spinner text-info loading-lg"></span>`,
    });

    const formData = new FormData();
    formData.append("member_user_id", CASHIER_POS.member_user_renew_id.textContent);
    formData.append("amount", amount);
    formData.append("pay", pay);
    formData.append("turn_amount", turn_amount);
    formData.append("pay_type", pay_type);
    formData.append("cashier", `CASHIER-${SYSTEM_USER}`);
    formData.append("member_user_renew_expire_after", CASHIER_POS.member_user_renew_expire_after.value + " 00:00:00");

    unity.debugForm(formData);

    const respond = await unity.fetchApi("/api/function/member_user_renew", "post", formData, "json");

    // cancel_submit_gate_out();
    if (respond.success) {
        Dialog_Pay_Member_User_Proseecss.close();
        console.log(respond);
        const Account_Member_User_Record = respond.Account_Member_User_Record;
        await loadSlipPayRenewMemberUserImage(Account_Member_User_Record.id);
        // GATE_OUT.slip_pay_image.src = `/api/function/slip_pay?acc_id=${Account_Record.id}`;
        if (GATE_OUT.swtich_printer_slip.checked) {
            print_slip_pay();
        } else {
            unity.showToastNotification({ icon: "info", msg: "Processed without printing receipt" });
        }
        clear_member_user_renew_filed();
    } else {
        unity.showDialogError({ msg: respond.msg });
    }
    Dialog_Info.close();
}

// ? SSE Event Handder *************************************************************
if (GATE_MODE != "CASHIER") {
    const all_event = true;
    const time_out_duplicate = 5000;
    let plate_num_in = "";
    let plate_num_out = "";
    let last_time_in = null;
    let last_time_out = null;
    unity.initSse(async (e) => {
        const func = e.func;
        const params = e.params;
        const currentTime = new Date().getTime();
        if (GATE_INFO) {
            if (func == "parking_lot_info") {
                const lots = params;
                console.log(lots);
                lots.forEach((lot) => {
                    const d = GATE_INFO.lots[lot.id];
                    if (d) {
                        const v = parseInt(lot.value);
                        const c = parseInt(d.parking_capacity.textContent);
                        d.parking_available.textContent = c - v;
                        d.parking_value.textContent = v;
                    }
                });
            }
        }

        if (func == "lpr_event") {
            let is_submit = false;
            console.log(params);
            if (GATE_IN.id > 0) {
                //? Gate In is Active
                if (GATE_IN.name == params.gate_name) {
                    const lastTime = last_time_in || 0;
                    if (params.plate_num == plate_num_in && lastTime + time_out_duplicate > currentTime) {
                        const remainingTime = Math.ceil((lastTime + time_out_duplicate - currentTime) / 1000);
                        console.warn(`🟡 [Duplicate Blocked] Plate: ${params.plate_num}`);
                        console.log(`⏳ Cooldown active: Please wait ${remainingTime} more seconds.`);
                        return;
                    }
                    last_time_in = currentTime;
                    plate_num_in = params.plate_num;
                    // Entry transaction notification
                    if (params.card_type.toUpperCase() == "VISITOR") {
                        GATE_IN.gate_in_image_01.src = params.images_path_01;
                        GATE_IN.gate_in_image_02.src = params.images_path_02;
                        if (GATE_IN.date_time) {
                            GATE_IN.date_time.innerHTML = params.date_time;
                        }

                        if (GATE_IN.license_id_input) {
                            GATE_IN.license_id_input.value = params.plate_num;
                        }
                        if (GATE_IN.id_card_input) {
                            GATE_IN.id_card_input.focus();
                            // GATE_IN.id_card_input.value = params.plate_num;
                        }
                        GATE_IN.is_lpr_image = true;
                        is_submit = true;
                    } else {
                        if (params.status.includes("Restriction") || params.status.includes("Restricted")) {
                            const result = await unity.showDialogConfirm({
                                title: "Access Restricted Card Notice",
                                content: params.status,
                            });
                            if (result.confirm) {
                                GATE_IN.date_time.innerHTML = params.date_time;
                                if (GATE_IN.license_id_input) GATE_IN.license_id_input.value = params.plate_num;
                                if (GATE_IN.id_card_input) GATE_IN.id_card_input.value = params.plate_num;
                                GATE_IN.gate_in_image_01.src = params.images_path_01;
                                GATE_IN.gate_in_image_02.src = params.images_path_02;
                                is_submit = true;
                            }
                        }
                        if (all_event) {
                            unity.showToastNotification({
                                msg: `Processing entry transaction<br>${params.info}`,
                                position: "top-left",
                            });
                        }
                    }
                    if (localStorage.getItem("SELECT_GATE_IN_ENABLE") != "false" && is_submit) {
                        if (!unity.isScreenReady() || is_processing_gate_in) {
                            console.log("🟡 Screen busy or Gate-In is processing, skipping auto submit");
                            return;
                        }
                        if (!params.transaction_result) submit_gate_in_data();
                    }
                    const lpr_heartbeat = String(new Date()).split("GMT")[0];
                    if (GATE_IN.hearbeat_lpr) GATE_IN.hearbeat_lpr.textContent = lpr_heartbeat;
                }
            }
            if (GATE_OUT.id > 0) {
                if (GATE_OUT.name == params.gate_name) {
                    console.log(last_time_out);
                    const lastTime = last_time_out || 0;
                    if (params.plate_num === plate_num_out && lastTime + time_out_duplicate > currentTime) {
                        const remainingTime = Math.ceil((lastTime + time_out_duplicate - currentTime) / 1000);
                        console.warn(`🟡 [Duplicate Blocked] Plate: ${params.plate_num}`);
                        console.log(`⏳ Cooldown active: Please wait ${remainingTime} more seconds.`);
                        return;
                    }
                    last_time_out = currentTime;
                    plate_num_out = params.plate_num;
                    // Exit transaction notification
                    if (["VISITOR", "M-VISITOR"].includes(params.card_type.toUpperCase())) {
                        //switch_mode_gate_way("OUT");
                        GATE_OUT.id_card_input.textContent = params.plate_num;
                        GATE_OUT.gate_out_image_01.src = params.images_path_01;
                        GATE_OUT.gate_out_image_02.src = params.images_path_02;
                        GATE_OUT.gate_out_image_time_stamp = Math.floor(Date.now() / 1000);
                        if (Dialog_Gate_Out_Proseecss.getAttribute("open") === null) {
                            console.log(params.code);
                            switch (params.code) {
                                case -1:
                                    is_submit = true;
                                    break;

                                default:
                                    is_submit = true;
                                    break;
                            }
                        } else {
                            unity.showToastNotification({ icon: "warning", msg: `Dialog_Gate_Out_Proseecss In Open` });
                        }
                    } else if (params.card_type == "Anti Passback") {
                        unity.showToastNotification({ msg: `${params.card_type}` });
                    } else {
                        if (all_event) {
                            unity.showToastNotification({
                                msg: `Processing exit transaction<br>${params.info}`,
                                position: "top-right",
                            });
                        }
                    }
                    console.log(is_submit, localStorage.getItem("SELECT_GATE_OUT_ENABLE"));
                    if (localStorage.getItem("SELECT_GATE_OUT_ENABLE") != "false" && is_submit) {
                        if (!unity.isScreenReady()) {
                            console.log("🟡 Dialog is open, processing transaction");
                            return;
                        }
                        GATE_OUT.id_card_input.value = params.plate_num;
                        submit_gate_out_data(params.plate_num);
                    }
                    const lpr_heartbeat = String(new Date()).split("GMT")[0];
                    GATE_OUT.hearbeat_lpr.textContent = lpr_heartbeat;
                }
            }
        }

        if (func == "lpr_heartbeat") {
            if (GATE_IN.name == params.gate_name) {
                if (GATE_IN.hearbeat_lpr) {
                    const lpr_heartbeat = String(new Date()).split("GMT")[0];
                    GATE_IN.hearbeat_lpr.textContent = lpr_heartbeat;
                }
            }
            if (GATE_OUT.name == params.gate_name) {
                if (GATE_OUT.hearbeat_lpr) {
                    const lpr_heartbeat = String(new Date()).split("GMT")[0];
                    GATE_OUT.hearbeat_lpr.textContent = lpr_heartbeat;
                }
            }
        }
    });
}
window.ToggleInfoGate = ToggleInfoGate;
function ToggleInfoGate() {
    const gateInfoEl = document.getElementById("gate_info");
    if (!gateInfoEl) return;

    const isVisible = window.getComputedStyle(gateInfoEl).display !== "none";
    if (isVisible) {
        gateInfoEl.style.display = "none";
        localStorage.setItem("GATE_INFO_VISIBLE", "false");
    } else {
        gateInfoEl.classList.remove("hidden");
        gateInfoEl.style.display = "";
        localStorage.setItem("GATE_INFO_VISIBLE", "true");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await Init();

    const savedGateInfoVisible = localStorage.getItem("GATE_INFO_VISIBLE");
    const gateInfoEl = document.getElementById("gate_info");
    if (gateInfoEl && savedGateInfoVisible !== null) {
        if (savedGateInfoVisible === "false") {
            gateInfoEl.style.display = "none";
        } else if (savedGateInfoVisible === "true") {
            gateInfoEl.classList.remove("hidden");
            gateInfoEl.style.display = "";
        }
    }

    if (typeof Dialog_Gate_In_Select !== "undefined" && Dialog_Gate_In_Select) {
        unity.init_select_option(Dialog_Gate_In_Select, "/api/gateway?gateway_type=IN", "id");
    }
    if (typeof Dialog_Gate_Out_Select !== "undefined" && Dialog_Gate_Out_Select) {
        unity.init_select_option(Dialog_Gate_Out_Select, "/api/gateway?gateway_type=OUT", "id");
    }

    if (GATE_MODE == "GATE_IN" || GATE_MODE == "COMPACT") clear_gate_in_filed();

    if (document.getElementById("transaction_parked_table")) {
        transaction_parked_table.init();
    }
    await unity.initI18n();

    if (GATE_MODE == "GATE_IN" || GATE_MODE == "GATE_OUT") {
        const camera_live = document.getElementById("camera_live");
        if (camera_live) {
            const camera_live_config = localStorage.getItem("CAMERA_LIVE_GATE_IN");
            const cameras = camera_live_config.split(",");
            const camera_lives = [];
            for (let i = 0; i < cameras.length; i++) {
                const c = cameras[i];
                if (c) {
                    camera_lives.push({ name: `${c}`, container: camera_live });
                }
            }
            if (camera_lives.length > 0) unity.initMultiCameraStream(camera_lives, `${location.hostname}:1984`);
        }
    }

    if (CASHIER_POS.member_renew_expire_after) {
        CASHIER_POS.member_renew_expire_after.addEventListener("change", () => {
            if (CASHIER_POS.member_renew_id_card && CASHIER_POS.member_renew_id_card.textContent) {
                CASHIER_POS.btn_submit_member_renew.disabled = false;
            }
        });
    }

    // 🖥️ Auto-launch Customer Display on startup when all initializations are complete
    const isAutoExtender = localStorage.getItem("AUTO_EXTENDER_REQUIRED") === "true";
    if (isAutoExtender) {
        console.log("🚀 [Main POS] All POS modules & tables fully loaded. Auto-launching Customer Display on secondary monitor...");
        setTimeout(() => {
            openDashboard_transaction_info();
        }, 300);
    }
});

// Helper function to check status at any time
function checkIsNativeApp() {
    return isNativeApp || (typeof window.pywebview !== "undefined" && typeof window.pywebview.api !== "undefined");
}

async function printImagePosControl(imgInput, maxWidth = 576) {
    try {
        let imgElement;

        // If string URL provided, create new HTMLImageElement
        if (typeof imgInput === "string") {
            imgElement = new Image();
            // Handle cross-origin image requests
            imgElement.crossOrigin = "Anonymous";
            imgElement.src = imgInput;
        } else {
            imgElement = imgInput;
        }

        // Await image load completion
        if (!imgElement.complete || imgElement.naturalWidth === 0) {
            await new Promise((resolve, reject) => {
                imgElement.onload = resolve;
                imgElement.onerror = () => reject(new Error("Failed to load image from URL: " + imgElement.src));
            });
        }

        // Compute dimensions
        let width = imgElement.naturalWidth;
        let height = imgElement.naturalHeight;

        if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
        }

        // Create Canvas element
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(imgElement, 0, 0, width, height);

        const base64Data = canvas.toDataURL("image/png");
        canvas.width = 0;
        canvas.height = 0;

        // Send to PyWebView API
        if (window.pywebview && window.pywebview.api) {
            const res = await window.pywebview.api.print_image(base64Data);
            if (res.success) {
                console.log("Image receipt printed successfully!");
            } else {
                console.error("Printer error:", res.message);
            }
        } else {
            console.error("pywebview.api not found");
        }
    } catch (error) {
        console.error("Image preparation error:", error.message);
    }
}

// 3. Native desktop app ready
function onNativeAppReady() {
    unity.showToastNotification({ msg: "Connected to PKSoft POS Desktop Application successfully!" });
}
// *** For Native App pywebviewready
window.addEventListener("pywebviewready", function () {
    isNativeApp = true;
    console.log("✅ Connected to PKSoft POS Desktop Application successfully!");

    // Update USB printer status on UI
    onNativeAppReady();
});

// ⌨️ High-Speed POS Global Keyboard Hotkeys
document.addEventListener("keydown", function (e) {
    if (e.key === "F2") {
        e.preventDefault();
        if (typeof snap_image_card_gate_in === "function") {
            snap_image_card_gate_in();
        }
    } else if (e.key === "F3" || (e.shiftKey && (e.key === "F3" || e.code === "KeyF3")) || e.key === "F8") {
        e.preventDefault();

        // 🌟 Hybrid Logic:
        // 1. Shift + F3 or F8 -> Explicitly Reprint Exit Payment Receipt (Gate-Out)
        if (e.shiftKey || e.key === "F8") {
            if (typeof reprint_last_slip_pay === "function") reprint_last_slip_pay();
            else if (typeof print_slip_pay === "function") print_slip_pay();
            return;
        }

        // 2. Single F3:
        // - In pure GATE_OUT or CASHIER mode -> Always Reprint Exit Receipt
        // - In pure GATE_IN mode -> Always Reprint Entry Slip
        // - In COMPACT / Dual Gate mode -> Context-Aware based on active focus
        if (GATE_MODE === "GATE_OUT" || GATE_MODE === "CASHIER") {
            if (typeof reprint_last_slip_pay === "function") reprint_last_slip_pay();
            else if (typeof print_slip_pay === "function") print_slip_pay();
        } else if (GATE_MODE === "GATE_IN") {
            if (typeof reprint_last_slip_in === "function") reprint_last_slip_in();
            else if (typeof print_slip_in === "function") print_slip_in();
        } else {
            // COMPACT Mode (Dual Gate):
            if (document.activeElement && document.activeElement.closest("#gate_out_page")) {
                if (typeof reprint_last_slip_pay === "function") reprint_last_slip_pay();
                else if (typeof print_slip_pay === "function") print_slip_pay();
            } else {
                if (typeof reprint_last_slip_in === "function") reprint_last_slip_in();
                else if (typeof print_slip_in === "function") print_slip_in();
            }
        }
    } else if (e.key === "F4") {
        e.preventDefault();
        if (typeof search_transaction_in === "function") {
            search_transaction_in("GATE_IN");
        }
    } else if (e.key === "F9" || (e.shiftKey && (e.key === "F9" || e.code === "KeyF9")) || e.key === "F10") {
        e.preventDefault();

        // 🌟 Hybrid Logic for Emergency Barrier Open:
        // 1. Shift + F9 or F10 -> Explicitly Open Exit Barrier Gate (Gate-Out)
        if (e.shiftKey || e.key === "F10") {
            if (typeof process_gate_out_open === "function") process_gate_out_open(true);
            return;
        }

        // 2. Single F9:
        // - In pure GATE_OUT or CASHIER mode -> Always Open Exit Gate
        // - In pure GATE_IN mode -> Always Open Entry Gate
        // - In COMPACT / Dual Gate mode -> Context-Aware based on active focus
        if (GATE_MODE === "GATE_OUT" || GATE_MODE === "CASHIER") {
            if (typeof process_gate_out_open === "function") process_gate_out_open(true);
        } else if (GATE_MODE === "GATE_IN") {
            if (typeof process_gate_in_open === "function") process_gate_in_open(true);
        } else {
            // COMPACT Mode (Dual Gate):
            if (document.activeElement && document.activeElement.closest("#gate_out_page")) {
                if (typeof process_gate_out_open === "function") process_gate_out_open(true);
            } else {
                if (typeof process_gate_in_open === "function") process_gate_in_open(true);
            }
        }
    } else if (e.key === "Escape") {
        const openDialog = document.querySelector("dialog[open]");
        if (openDialog) {
            openDialog.close();
            return;
        }

        // 1. If Exit Transaction Submit box is active, cancel it immediately
        if (GATE_OUT && GATE_OUT.control_box_submit_gate_out && !GATE_OUT.control_box_submit_gate_out.classList.contains("hidden")) {
            cancel_submit_gate_out();
            return;
        }

        // 2. If activeElement is an input/textarea with content, clear its text
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
            if (active.value && active.value.trim() !== "") {
                active.value = "";
                return;
            }
        }

        // 3. Clear the active terminal according to focus/context
        if (active && active.closest("#gate_out_page")) {
            cancel_submit_gate_out();
        } else if (active && active.closest("#gate_in_page")) {
            if (typeof clear_gate_in_filed === "function") {
                clear_gate_in_filed();
            }
        } else {
            // Default: clear both to ready state
            if (typeof clear_gate_in_filed === "function") clear_gate_in_filed();
            if (typeof cancel_submit_gate_out === "function") cancel_submit_gate_out();
        }
    }
});



// ---------------------------------------------------------
// Load dynamic payment types from API
// ---------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("/api/v1/payment-types/active");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.data) {
            const currentLang = localStorage.getItem("lang") || "th";
            const optionsHtml = data.data
                .map((p) => {
                    const label = currentLang === "th" ? (p.name_th || p.name_en) : (p.name_en || p.name_th);
                    const cleanCode = p.code.toLowerCase().replace(/[^a-z0-9]/g, "_");
                    return `<option value="${p.code}" data-name-th="${p.name_th || p.name_en}" data-name-en="${p.name_en || p.name_th}" data-field="pay_type_${cleanCode}">${label}</option>`;
                })
                .join("");

            // Update all payment type selects
            const selects = document.querySelectorAll('select[data-field="pay_type"]');
            selects.forEach((select) => {
                const originalValue = select.value;
                select.innerHTML = optionsHtml;
                // restore value if it still exists
                if (data.data.find((p) => p.code === originalValue)) {
                    select.value = originalValue;
                }
            });

            if (window.unity && typeof window.unity.updateContent === "function") {
                window.unity.updateContent();
            }
        }
    } catch (err) {
        console.error("Error loading dynamic payment types:", err);
    }
});
