import * as unity from "./unity.js";

window.show_dialog = show_dialog;
function show_dialog(d) {
    const html_msg = `<div class="flex flex-col gap-4 w-full">
                    <div class="skeleton h-32 w-full"></div>
                    <div class="skeleton h-4 w-28"></div>
                    <div class="skeleton h-4 w-full"></div>
                    <div class="skeleton h-4 w-full"></div>
                    <div class="skeleton h-32 w-full"></div>
                    </div>`;
    switch (d) {
        case "info":
            unity.showDialogInfo({ title: "Dialog-info", msg: html_msg });
            break;
        case "success":
            unity.showDialogSuccess({ title: "Dialog-success", msg: html_msg });
            break;
        case "warning":
            unity.showDialogWarning({ title: "Dialog-warning", msg: html_msg });
            break;
        case "error":
            unity.showDialogError({ title: "Dialog-error", msg: html_msg });
            break;
        case "confirm":
            unity.showDialogConfirm({ title: "Dialog-confirm", msg: html_msg });
            break;
        case "loading":
            unity.showDialogLoading("...Test UI Loading Message...");
            setTimeout(() => {
                unity.closeDialogLoading();
            }, 3000);
            break;
        default:
            break;
    }
}

window.show_toast = show_toast;
function show_toast(type) {
    if (type === "center-top") {
        unity.showToastNotification({
            type: "info",
            title: "Center Top",
            msg: "This toast is at the center top",
            position: "top-center",
        });
    } else if (type === "center-bottom") {
        unity.showToastNotification({
            type: "success",
            title: "Center Bottom",
            msg: "This toast is at the center bottom",
            position: "bottom-center",
        });
    } else {
        const positions = {
            info: "top-right",
            success: "top-left",
            warning: "bottom-right",
            error: "bottom-left",
        };
        unity.showToastNotification({
            type: type,
            title: type.toUpperCase(),
            msg: `This is a ${type} notification showing at ${positions[type]}`,
            position: positions[type],
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    setInterval(() => {
        console.log("isScreenReady", unity.isScreenReady());
    }, 1000);
});
