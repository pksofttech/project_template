import * as unity from "./unity.js";
// import * as datatable from "./datatable.js";
let member_liff = null;
const input_login_pin = document.getElementById("input_login_pin");
const input_member_username = document.getElementById("input_member_username");
function updatePinDots() {
    const val = input_login_pin ? input_login_pin.value : "";
    const slots = document.querySelectorAll(".pin-slot");
    slots.forEach((slot, index) => {
        if (index < val.length) {
            slot.innerHTML = `<span class="w-3.5 h-3.5 rounded-full bg-primary shadow-xs transition-transform duration-200 scale-100"></span>`;
            slot.classList.add("border-primary", "bg-primary/10", "shadow-xs");
            slot.classList.remove("border-base-content/15", "bg-base-200/40");
        } else if (index === val.length) {
            slot.innerHTML = `<span class="w-2 h-2 rounded-full bg-primary/40 animate-pulse"></span>`;
            slot.classList.add("border-primary/50", "bg-base-200/60");
            slot.classList.remove("border-primary", "bg-primary/10", "border-base-content/15", "bg-base-200/40", "shadow-xs");
        } else {
            slot.innerHTML = "";
            slot.classList.add("border-base-content/15", "bg-base-200/40");
            slot.classList.remove("border-primary", "border-primary/50", "bg-primary/10", "bg-base-200/60", "shadow-xs");
        }
    });
}

window.on_screen_pin_event_input = on_screen_pin_event_input;
async function on_screen_pin_event_input(key) {
    if (navigator.vibrate) {
        try { navigator.vibrate(12); } catch (e) {}
    }
    if (input_member_username.value == "") {
        unity.showToastNotification({ msg: "Please enter member name" });
        return;
    }
    if (input_login_pin.value.length >= 6 && key !== "BS" && key !== "CLEAR") {
        return;
    }
    switch (key) {
        case "BS":
            input_login_pin.value = input_login_pin.value.slice(0, -1);
            break;
        case "CLEAR":
            input_login_pin.value = "";
            break;
        case "ENTER":
            Dialog_Onscreen_Keyboard.close();
            const input_box = input_login_pin.value;
            input_login_pin.value = "";
            submit_input_licence(input_box);
            break;
        default:
            input_login_pin.value += key;
            break;
    }
    updatePinDots();

    if (input_login_pin.value.length == 6) {
        await submit_input_pin(input_login_pin.value);
        input_login_pin.value = "";
        updatePinDots();
    }
}

async function submit_input_pin(pin) {
    // Processing notification
    unity.showDialogLoading();
    const formData = new FormData();
    formData.append("member_username", input_member_username.value);
    formData.append("pin", pin);
    if (member_liff) {
        formData.append("userId", member_liff.userId);
    }
    const _reply = await unity.fetchApi("/api/member/member_service/login", "post", formData, "json");
    unity.logger.debug(_reply);
    unity.closeDialogLoading();

    if (_reply.success) {
        unity.showToastNotification({ msg: _reply.msg });
        // unity.redirect(_reply.url);
        const access_token = _reply.access_token;
        unity.setCookie("Authorization_Member_User", `bearer ${access_token}`, 60 * 60 * 24);
        const rememberCheck = document.getElementById("remember_check_box");
        if (!rememberCheck || rememberCheck.checked) {
            localStorage.setItem("MEMBER_USER_NAME", input_member_username.value);
        } else {
            localStorage.removeItem("MEMBER_USER_NAME");
        }
        await unity.delay(250);
        window.location.reload();
    } else {
        unity.showToastNotification({ icon: "error", msg: _reply.msg });
    }
    await unity.delay(1000);
}

async function line_liff(liffId) {
    if (liffId) {
        console.log("line_liff:start", liffId);
        unity.showDialogLoading();
        try {
            // 1) init
            await liff.init({ liffId });

            // 2) Proceed when initialized
            await liff.ready;

            // 4) Redirect to login if unauthenticated
            if (liff.isLoggedIn()) {
                member_liff = await liff.getProfile();
            }
        } catch (err) {
            console.error("line_liff:error", err);
        }

        unity.closeDialogLoading();
        return member_liff;
    }
}

async function login_member() {
    const member_liff = await line_liff(LINE_LIFF_ID);
    if (member_liff) {
        // unity.showToastNotification({ title: "Line Login", msg: `userId: ${member_liff.userId}` });
        const member_profile = JSON.stringify(member_liff);
        const result = await unity.fetchApi(`/api/line/line_llif`, "post", member_profile, "json");
        if (result.success) {
            const access_token = result.access_token;
            unity.setCookie("Authorization_Member_User", `bearer ${access_token}`, 60 * 60 * 24);
            window.location.reload();
        } else {
            const html_info = `<div class="stat">
                                    <div class="stat-figure text-secondary">
                                        <i class="fa-brands fa-line fa-2x text-success"></i>
                                    </div>
                                    <p>${result.msg}</p>
                                    <p>Please register on initial setup by entering username and PIN</p>
                                </div>`;
            unity.showDialogInfo({ title: "Line Login", msg: html_info });
        }
    } else {
        const MEMBER_USER_NAME = localStorage.getItem("MEMBER_USER_NAME");
        if (MEMBER_USER_NAME) {
            input_member_username.value = MEMBER_USER_NAME;
        }
    }
}

// 1. Google OAuth credential callback handler
function handleCredentialResponse(response) {
    console.log("Google Sign-In successful. Token:", response.credential);
    document.getElementById("google_login_btn").disabled = false;

    // Forward token to backend API for verification
    // Verify session against backend auth endpoint
    /*
    fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
    })
    .then(res => res.json())
    .then(data => { window.location.href = '/dashboard'; });
    */
}

// 2. Initialize Google Sign-In on page load
window.onload = function () {
    if (typeof google !== "undefined") {
        console.log("Initializing Google Sign-In client...", google_client_id);
        google.accounts.id.initialize({
            client_id: google_client_id,
            callback: handleCredentialResponse, // Success callback
            use_fedcm: true,
        });

        // document.getElementById("google_login_btn").disabled = false;
    }
};
window.on_google_login_click = on_google_login_click;
function on_google_login_click() {
    console.log("Opening Google Sign-In prompt...");
    if (typeof google !== "undefined") {
        // Open Google account chooser popup
        google.accounts.id.prompt();
    } else {
        console.error("Unable to initialize Google Sign-In at this time");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    login_member();
    unity.initI18n();
    updatePinDots();

    const btnClearUser = document.getElementById("btn_clear_username");
    if (input_member_username && btnClearUser) {
        const toggleClearBtn = () => {
            if (input_member_username.value.trim() !== "") {
                btnClearUser.classList.remove("hidden");
            } else {
                btnClearUser.classList.add("hidden");
            }
        };
        input_member_username.addEventListener("input", toggleClearBtn);
        input_member_username.addEventListener("change", toggleClearBtn);
        toggleClearBtn();
    }
});
