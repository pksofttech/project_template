/**
 * login.js - Authentication & Secure Console Sign-In Controller
 */

// Check stored username for "Remember Me"
        document.addEventListener("DOMContentLoaded", () => {
            const savedUser = localStorage.getItem("PKS_REMEMBER_USER");
            const rememberCheckbox = document.getElementById("rememberMe");
            const usernameInput = document.getElementById("username");

            if (savedUser) {
                usernameInput.value = savedUser;
                if (rememberCheckbox) rememberCheckbox.checked = true;
            }
        });

        // Toggle password visibility
        function togglePassword() {
            const passInput = document.getElementById("password");
            const eyeIcon = document.getElementById("eyeIcon");
            if (passInput.type === "password") {
                passInput.type = "text";
                eyeIcon.className = "fa-solid fa-eye text-sm text-cyan-400";
            } else {
                passInput.type = "password";
                eyeIcon.className = "fa-solid fa-eye-slash text-sm text-slate-500";
            }
        }

        // Quick auto-fill default credentials
        function autoFillDefault() {
            document.getElementById("username").value = "system";
            document.getElementById("password").value = "12341234";
            if (typeof toastr !== "undefined") {
                toastr.info("Auto-filled default credentials");
            }
        }

        // Forgot password notice
        function handleForgotPassword() {
            if (typeof toastr !== "undefined") {
                toastr.info("กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน (Default: system / 12341234)");
            } else {
                alert("กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน (Default: system / 12341234)");
            }
        }

        // Handle form submission
        async function handleLogin(e) {
            e.preventDefault();
            const btn = document.getElementById("submitBtn");
            const btnText = document.getElementById("btnText");
            const btnIcon = document.getElementById("btnIcon");
            const errAlert = document.getElementById("errorAlert");
            const errMsg = document.getElementById("errorMsg");
            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value;
            const rememberMe = document.getElementById("rememberMe")?.checked;

            // Manage remember-me storage
            if (rememberMe) {
                localStorage.setItem("PKS_REMEMBER_USER", username);
            } else {
                localStorage.removeItem("PKS_REMEMBER_USER");
            }

            // Button loading state
            btn.disabled = true;
            btn.classList.add("opacity-75", "cursor-not-allowed");
            btnText.innerHTML = '<span class="loading loading-spinner loading-xs mr-2"></span> Signing in...';
            btnIcon.classList.add("hidden");
            errAlert.classList.add("hidden");

            try {
                const res = await fetch("/api/system_user/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (res.ok) {
                    if (data && data.access_token) {
                        localStorage.setItem("token", data.access_token);
                    }
                    if (typeof toastr !== "undefined") {
                        toastr.success("Login successful! Redirecting...");
                    }
                    setTimeout(() => {
                        window.location.href = "/page?page=home";
                    }, 400);
                } else {
                    errMsg.innerText = data.detail || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
                    errAlert.classList.remove("hidden");
                    resetBtn();
                }
            } catch (err) {
                errMsg.innerText = "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง";
                errAlert.classList.remove("hidden");
                resetBtn();
            }

            function resetBtn() {
                btn.disabled = false;
                btn.classList.remove("opacity-75", "cursor-not-allowed");
                btnText.innerText = "Sign In";
                btnIcon.classList.remove("hidden");
            }
        }

// Global Window Event Handlers
window.togglePassword = togglePassword;
window.autoFillDefault = autoFillDefault;
window.handleForgotPassword = handleForgotPassword;
window.handleLogin = handleLogin;

