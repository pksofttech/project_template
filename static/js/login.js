import * as unity from "./unity.js";
// import * as datatable from "./datatable.js";

// For Login Page

unity.clearAllCookies();

const input_username_box = document.getElementById("input_username_box");
const input_password_box = document.getElementById("input_password_box");
const input_app_mode = document.getElementById("input_app_mode");
input_username_box.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        input_password_box.focus();
    }
});

input_password_box.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        submit_login();
    }
});

window.submit_login = submit_login;
async function submit_login() {
    const _user_name = input_username_box.value.trim();
    const _password = input_password_box.value.trim();
    const _app_mode = input_app_mode.value;

    if (_user_name == "") {
        unity.showDialogWarning({ msg: "Please fill in all required fields" });
        return;
    }
    if (_password == "") {
        unity.showDialogWarning({ msg: "Please fill in all required fields" });
        return;
    }
    const remember_check = document.getElementById("remember_check_box").checked;
    unity.login(_user_name, _password, remember_check, _app_mode);
}

window.eye_password = eye_password;
async function eye_password(t, id) {
    const _e = document.getElementById(id);
    if (_e) {
        if (_e.getAttribute("type") == "password") {
            _e.setAttribute("type", "text");
            t.innerHTML = `<i class="fa-regular fa-eye"></i>`;
        } else {
            _e.setAttribute("type", "password");
            t.innerHTML = `<i class="fa-regular fa-eye-slash"></i>`;
        }
    }
}

window.input_app_mode_chang = input_app_mode_chang;
function input_app_mode_chang(mode) {
    unity.logger.debug("input_app_mode_chang :" + mode);
    switch (mode) {
        case "ESTAMP_RPI":
            document.getElementById("input_password_box").focus();
            break;

        default:
            break;
    }
}

function login_session_url() {
    // Check Login param

    const currentUrl = window.location;
    // unity.logger.debug(currentUrl);
    const URL_params = new URLSearchParams(new URL(currentUrl).search);
    const login_name = URL_params.get("login_name");
    const pass = URL_params.get("pass");
    const app_mode = URL_params.get("app_mode");
    unity.logger.debug(app_mode);
    if (app_mode) {
        input_app_mode.value = app_mode.toUpperCase();
    }
    if (login_name) {
        document.getElementById("input_username_box").value = login_name;
        document.getElementById("input_password_box").value = pass;
    }
}
setTimeout(() => {
    login_session_url();
}, 500);
