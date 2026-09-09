import * as unity from "./unity.js";
// unity.showToastNotification({ icon: "success", msg: "home" });

const maturity = document.querySelector("[data-field='maturity']");
// const days_left = document.querySelector("[data-field='days_left']");
const time_of_left = document.querySelector("[data-field='time_of_left']");

if (maturity) {
    // days_left.innerHTML = "2 Year";
    const endDate = new Date(maturity.textContent);
    maturity.innerHTML = endDate.toLocaleDateString();

    function updateCountdown() {
        const now = new Date();
        const diffMs = endDate - now;

        if (diffMs <= 0) {
            // Expired
            // days_left_end.innerHTML = "Expired";
            time_of_left.innerHTML = "Expired";
            return;
        }

        // Compute remaining time
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        // time_of_left.innerHTML = `${diffDays}d ${diffHours}h ${diffMinutes}m ${diffSeconds}s`;
        time_of_left.innerHTML = `${diffDays}`;
    }

    // Initial update
    updateCountdown();

    // Update every 1 minute
    setInterval(updateCountdown, 60 * 1000 * 60);
}

document.addEventListener("DOMContentLoaded", function () {
    unity.initI18n();
    // unity.showDialogInfo({
    //     title: "Hello",
    // System test notification
    // });

    // ? For Start Tour
    if (document.getElementById("btn_start_tour")) {
        document.getElementById("btn_start_tour").classList.remove("hidden");
        const driverObj = window.driver({
            animate: true,
            showProgress: true,
            showButtons: ["next", "previous", "close"],
            steps: [
                {
                    element: "#btn_start_tour",
                    popover: {
                        title: "System User Guide",
                        description: "Click here anytime to start the interactive walkthrough tour",
                        side: "bottom",
                        align: "start",
                    },
                },
                {
                    element: "[data-tour='home_item']",
                    popover: {
                        title: "Main System Modules",
                        description: "Access various parking management features from this navigation grid",
                        side: "top",
                        align: "center",
                    },
                },
                {
                    element: "#side-drawer + .drawer-content .navbar",
                    popover: {
                        title: "Navigation Header",
                        description: "Use header controls for quick search, notifications, and theme settings",
                        side: "bottom",
                        align: "center",
                    },
                },
                {
                    element: "#current_lang",
                    popover: {
                        title: "Language Switcher",
                        description: "Change active interface language here",
                        side: "left",
                        align: "center",
                    },
                },
            ],
        });
        document.getElementById("btn_start_tour").addEventListener("click", () => {
            driverObj.drive();
        });
    }
});
