import * as unity from "./unity.js";

function show_dialog_protected() {
    unity.showDialogError({ msg: "Default system profile cannot be modified" });
}

// window.init_info_dashboard_payment_gateway = init_info_dashboard_payment_gateway;
async function init_info_dashboard_payment_gateway() {
    let respond = await unity.fetchApi("/api/payment_gateway?payment=stripe", "get", null, "json");
    if (respond.success) {
        const key_data = respond.data;
        // unity.logger.debug(key_data);
        const stripe_payment_config = document.getElementById("stripe_payment_config");
        if (stripe_payment_config) {
            stripe_payment_config.querySelector('[data-field="stripe_api_key"]').value = key_data.stripe_api_key
                ? key_data.stripe_api_key
                : "";
            stripe_payment_config.querySelector('[data-field="stripe_publishable_key"]').value =
                key_data.stripe_publishable_key ? key_data.stripe_publishable_key : "";
            stripe_payment_config.querySelector('[data-field="stripe_email_billing"]').value =
                key_data.stripe_email_billing ? key_data.stripe_email_billing : "";
            stripe_payment_config.querySelector('[data-field="stripe_payment_type"]').value =
                key_data.stripe_payment_type ? key_data.stripe_payment_type : "";
            if (stripe_payment_config.querySelector('[data-field="stripe_webhook_secret"]')) {
                stripe_payment_config.querySelector('[data-field="stripe_webhook_secret"]').value =
                    key_data.stripe_webhook_secret ? key_data.stripe_webhook_secret : "";
            }

            stripe_payment_config.querySelector('[data-field="enable_payment"]').checked = key_data.enable_payment
                ? key_data.enable_payment
                : false;
            stripe_payment_config.querySelector('[data-field="stripe_payment_fee"]').value = key_data.stripe_payment_fee
                ? key_data.stripe_payment_fee
                : "0";
        }
    } else {
        unity.logger.debug(respond);
    }

    respond = await unity.fetchApi("/api/payment_gateway?payment=beam", "get", null, "json");
    if (respond.success) {
        const key_data = respond.data;
        // unity.logger.debug(key_data);
        const beam_payment_config = document.getElementById("beam_payment_config");
        if (beam_payment_config) {
            beam_payment_config.querySelector('[data-field="url_beam_server_api"]').value = key_data.url_beam_server_api
                ? key_data.url_beam_server_api
                : "";

            beam_payment_config.querySelector('[data-field="beam_user"]').value = key_data.beam_user
                ? key_data.beam_user
                : "";
            beam_payment_config.querySelector('[data-field="beam_api_key"]').value = key_data.beam_api_key
                ? key_data.beam_api_key
                : "";
            beam_payment_config.querySelector('[data-field="beam_email_billing"]').value = key_data.beam_email_billing
                ? key_data.beam_email_billing
                : "";
            beam_payment_config.querySelector('[data-field="beam_payment_type"]').value = key_data.beam_payment_type
                ? key_data.beam_payment_type
                : "";

            beam_payment_config.querySelector('[data-field="enable_payment"]').checked = key_data.enable_payment
                ? key_data.enable_payment
                : false;
            beam_payment_config.querySelector('[data-field="beam_payment_fee"]').value = key_data.beam_payment_fee
                ? key_data.beam_payment_fee
                : "0";
        }
    } else {
        unity.logger.debug(respond);
    }

    respond = await unity.fetchApi("/api/payment_gateway?payment=jt_proxy", "get", null, "json");
    if (respond.success) {
        const key_data = respond.data;
        unity.logger.debug(key_data);
        const jt_proxy_payment_config = document.getElementById("jt_proxy_payment_config");
        if (jt_proxy_payment_config) {
            jt_proxy_payment_config.querySelector('[data-field="url_server_api"]').value = key_data.url_server_api
                ? key_data.url_server_api
                : "";
            jt_proxy_payment_config.querySelector('[data-field="enable_payment"]').checked = key_data.enable_payment
                ? key_data.enable_payment
                : false;
            jt_proxy_payment_config.querySelector('[data-field="jt_proxy_payment_fee"]').value =
                key_data.jt_proxy_payment_fee ? key_data.jt_proxy_payment_fee : "0";
        }
    } else {
        unity.logger.debug(respond);
    }

    respond = await unity.fetchApi("/api/payment_gateway?payment=kbank", "get", null, "json");
    if (respond.success) {
        const key_data = respond.data;
        // unity.logger.debug(key_data);
        const kbank_payment_config = document.getElementById("kbank_payment_config");
        if (kbank_payment_config) {
            kbank_payment_config.querySelector('[data-field="enable_payment"]').checked = key_data.enable_payment
                ? key_data.enable_payment
                : false;

            kbank_payment_config.querySelector('[data-field="Consumer_ID"]').value = key_data.Consumer_ID
                ? key_data.Consumer_ID
                : "";
            kbank_payment_config.querySelector('[data-field="Consumer_Secret"]').value = key_data.Consumer_Secret
                ? key_data.Consumer_Secret
                : "";
            kbank_payment_config.querySelector('[data-field="partnerId"]').value = key_data.partnerId
                ? key_data.partnerId
                : "";
            kbank_payment_config.querySelector('[data-field="merchantId"]').value = key_data.merchantId
                ? key_data.merchantId
                : "";
            kbank_payment_config.querySelector('[data-field="partnerSecret"]').value = key_data.partnerSecret
                ? key_data.partnerSecret
                : "";
        }
    } else {
        unity.logger.debug(respond);
    }

    respond = await unity.fetchApi("/api/payment_gateway?payment=config", "get", null, "json");
    if (respond.success) {
        const key_data = respond.data;
        unity.logger.debug(key_data);
        const payment_config = document.getElementById("payment_config");
        if (payment_config) {
            payment_config.querySelector('[data-field="server_url"]').value = key_data.server_url
                ? key_data.server_url
                : "";
            payment_config.querySelector('[data-field="payment_on_terminal"]').checked = key_data.payment_on_terminal
                ? key_data.payment_on_terminal
                : false;
        }
    } else {
        unity.logger.debug(respond);
    }
}

init_info_dashboard_payment_gateway();

window.update_payment_config = update_payment_config;
async function update_payment_config() {
    const payment_config = document.getElementById("payment_config");
    if (payment_config) {
        const payment_on_terminal = payment_config.querySelector('[data-field="payment_on_terminal"]').checked;
        const server_url = payment_config.querySelector('[data-field="server_url"]').value;

        const formData = new FormData();
        formData.append("server_url", server_url);
        formData.append("payment_on_terminal", payment_on_terminal);
        const respond = await unity.fetchApi("/api/payment_gateway_config", "post", formData, "json");

        if (respond.success) {
            unity.logger.debug(respond);
            unity.showDialogSuccess({ msg: JSON.stringify(respond.msg) });
        } else {
            unity.logger.debug(respond);
            unity.showDialogError({ msg: JSON.stringify(respond.msg) });
        }
    } else {
        unity.showDialogError({ msg: "stripe_payment_config Error" });
    }
}

window.update_stripe_api_key = update_stripe_api_key;
async function update_stripe_api_key() {
    const stripe_payment_config = document.getElementById("stripe_payment_config");
    if (stripe_payment_config) {
        unity.logger.debug(stripe_payment_config);

        const api_key = stripe_payment_config.querySelector('[data-field="stripe_api_key"]').value;
        const stripe_publishable_key = stripe_payment_config.querySelector(
            '[data-field="stripe_publishable_key"]',
        ).value;
        const stripe_email_billing = stripe_payment_config.querySelector('[data-field="stripe_email_billing"]').value;
        const stripe_payment_type = stripe_payment_config.querySelector('[data-field="stripe_payment_type"]').value;
        const stripe_webhook_secret =
            stripe_payment_config.querySelector('[data-field="stripe_webhook_secret"]')?.value || "";
        const enable_payment = stripe_payment_config.querySelector('[data-field="enable_payment"]').checked;
        const stripe_payment_fee =
            stripe_payment_config.querySelector('[data-field="stripe_payment_fee"]')?.value || "0";

        const formData = new FormData();
        formData.append("stripe_api_key", api_key);
        formData.append("stripe_publishable_key", stripe_publishable_key);
        formData.append("stripe_email_billing", stripe_email_billing);
        formData.append("stripe_payment_type", stripe_payment_type);
        formData.append("stripe_webhook_secret", stripe_webhook_secret);
        formData.append("enable_payment", enable_payment);
        formData.append("stripe_payment_fee", stripe_payment_fee);
        const respond = await unity.fetchApi("/api/stripe_payment_gateway", "post", formData, "json");

        if (respond.success) {
            unity.logger.debug(respond);
            unity.showDialogSuccess({ msg: JSON.stringify(respond.msg) });
        } else {
            unity.logger.debug(respond);
            unity.showDialogError({ msg: JSON.stringify(respond.msg) });
        }
    } else {
        unity.showDialogError({ msg: "stripe_payment_config Error" });
    }
}

window.update_beam_api_config = update_beam_api_config;
async function update_beam_api_config() {
    const beam_payment_config = document.getElementById("beam_payment_config");
    if (beam_payment_config) {
        unity.logger.debug(beam_payment_config);
        const enable_payment = beam_payment_config.querySelector('[data-field="enable_payment"]').checked;
        const url_beam_server_api = beam_payment_config.querySelector('[data-field="url_beam_server_api"]').value;
        const beam_user = beam_payment_config.querySelector('[data-field="beam_user"]').value;
        const beam_api_key = beam_payment_config.querySelector('[data-field="beam_api_key"]').value;
        const beam_email_billing = beam_payment_config.querySelector('[data-field="beam_email_billing"]').value;
        const beam_payment_type = beam_payment_config.querySelector('[data-field="beam_payment_type"]').value;
        const beam_payment_fee = beam_payment_config.querySelector('[data-field="beam_payment_fee"]').value;

        const formData = new FormData();
        formData.append("url_beam_server_api", url_beam_server_api);
        formData.append("beam_user", beam_user);
        formData.append("beam_api_key", beam_api_key);
        formData.append("beam_email_billing", beam_email_billing);
        formData.append("beam_payment_type", beam_payment_type);
        formData.append("enable_payment", enable_payment);
        formData.append("beam_payment_fee", beam_payment_fee);
        const respond = await unity.fetchApi("/api/beam_payment_gateway", "post", formData, "json");
        if (respond.success) {
            unity.logger.debug(respond);
            unity.showDialogSuccess({ msg: JSON.stringify(respond.msg) });
        } else {
            unity.logger.debug(respond);
            unity.showDialogError({ msg: JSON.stringify(respond.msg) });
        }
    } else {
        unity.showDialogError({ msg: "beam_payment_config Error" });
    }
}

window.update_jt_proxy_config = update_jt_proxy_config;
async function update_jt_proxy_config() {
    const jt_proxy_payment_config = document.getElementById("jt_proxy_payment_config");
    if (jt_proxy_payment_config) {
        unity.logger.debug(jt_proxy_payment_config);
        const enable_payment = jt_proxy_payment_config.querySelector('[data-field="enable_payment"]').checked;
        const url_server_api = jt_proxy_payment_config.querySelector('[data-field="url_server_api"]').value;
        const jt_proxy_payment_fee =
            jt_proxy_payment_config.querySelector('[data-field="jt_proxy_payment_fee"]')?.value || "0";

        const formData = new FormData();
        formData.append("enable_payment", enable_payment);
        formData.append("url_server_api", url_server_api);
        formData.append("jt_proxy_payment_fee", jt_proxy_payment_fee);

        const respond = await unity.fetchApi("/api/jt_proxy_payment_gateway", "post", formData, "json");
        if (respond.success) {
            unity.logger.debug(respond);
            unity.showDialogSuccess({ msg: JSON.stringify(respond.msg) });
        } else {
            unity.logger.debug(respond);
            unity.showDialogError({ msg: JSON.stringify(respond.msg) });
        }
    } else {
        unity.showDialogError({ msg: "jt_proxy_payment_config Error" });
    }
}

window.update_kbank_api_config = update_kbank_api_config;
async function update_kbank_api_config() {
    const kbank_payment_config = document.getElementById("kbank_payment_config");
    if (kbank_payment_config) {
        unity.logger.debug(kbank_payment_config);
        const enable_payment = kbank_payment_config.querySelector('[data-field="enable_payment"]').checked;
        const Consumer_ID = kbank_payment_config.querySelector('[data-field="Consumer_ID"]').value;
        const Consumer_Secret = kbank_payment_config.querySelector('[data-field="Consumer_Secret"]').value;
        const partnerId = kbank_payment_config.querySelector('[data-field="partnerId"]').value;
        const merchantId = kbank_payment_config.querySelector('[data-field="merchantId"]').value;
        const partnerSecret = kbank_payment_config.querySelector('[data-field="partnerSecret"]').value;

        const formData = new FormData();
        formData.append("enable_payment", enable_payment);
        formData.append("Consumer_ID", Consumer_ID);
        formData.append("Consumer_Secret", Consumer_Secret);
        formData.append("partnerId", partnerId);
        formData.append("merchantId", merchantId);
        formData.append("partnerSecret", partnerSecret);
        const respond = await unity.fetchApi("/api/kbank_payment_gateway", "post", formData, "json");
        if (respond.success) {
            unity.logger.debug(respond);
            unity.showDialogSuccess({ msg: JSON.stringify(respond.msg) });
        } else {
            unity.logger.debug(respond);
            unity.showDialogError({ msg: JSON.stringify(respond.msg) });
        }
    } else {
        unity.showDialogError({ msg: "kbank_payment_config Error" });
    }
}

window.test_calculate_gross_up_fee = test_calculate_gross_up_fee;
let currentGrossUpProvider = "beam";

async function test_calculate_gross_up_fee(provider = "beam") {
    currentGrossUpProvider = provider;
    const modal = document.getElementById("Dialog_Test_Calculate_Gross_Up_Fee");
    if (!modal) return;

    const providerBadge = modal.querySelector('[data-field="calc_modal_provider_badge"]');
    if (providerBadge) {
        providerBadge.textContent = String(provider).toUpperCase();
    }

    // Load current configured fee from the provider form if available
    let initialRate = "0.00642";
    if (provider === "beam") {
        const beamInput = document.querySelector('#beam_payment_config [data-field="beam_payment_fee"]');
        if (beamInput && beamInput.value.trim() !== "") {
            initialRate = beamInput.value.trim();
        }
    } else if (provider === "jt_proxy") {
        const jtInput = document.querySelector('#jt_proxy_payment_config [data-field="jt_proxy_payment_fee"]');
        if (jtInput && jtInput.value.trim() !== "") {
            initialRate = jtInput.value.trim();
        } else {
            initialRate = "0.015";
        }
    } else if (provider === "stripe") {
        const stripeInput = document.querySelector('#stripe_payment_config [data-field="stripe_payment_fee"]');
        if (stripeInput && stripeInput.value.trim() !== "") {
            initialRate = stripeInput.value.trim();
        } else {
            initialRate = "0.0365";
        }
    }

    const rateInput = modal.querySelector('[data-field="gross_up_test_fee_rate"]');
    if (rateInput) {
        rateInput.value = initialRate;
    }

    await recalculateGrossUpTest();

    if (typeof modal.showModal === "function") {
        modal.showModal();
    }
}

window.setGrossUpTestAmount = async function (amount) {
    const modal = document.getElementById("Dialog_Test_Calculate_Gross_Up_Fee");
    const amountInput = modal ? modal.querySelector('[data-field="gross_up_test_net_amount"]') : null;
    if (amountInput) {
        amountInput.value = amount;
        await recalculateGrossUpTest();
    }
};

window.setGrossUpTestRate = async function (rate) {
    const modal = document.getElementById("Dialog_Test_Calculate_Gross_Up_Fee");
    const rateInput = modal ? modal.querySelector('[data-field="gross_up_test_fee_rate"]') : null;
    if (rateInput) {
        rateInput.value = rate;
        await recalculateGrossUpTest();
    }
};

window.applyGrossUpFeeRate = function () {
    const modal = document.getElementById("Dialog_Test_Calculate_Gross_Up_Fee");
    const rateInput = modal ? modal.querySelector('[data-field="gross_up_test_fee_rate"]') : null;
    if (!rateInput) return;
    const selectedRate = rateInput.value.trim();

    if (currentGrossUpProvider === "beam") {
        const beamInput = document.querySelector('#beam_payment_config [data-field="beam_payment_fee"]');
        if (beamInput) {
            beamInput.value = selectedRate;
        }
    } else if (currentGrossUpProvider === "jt_proxy") {
        const jtInput = document.querySelector('#jt_proxy_payment_config [data-field="jt_proxy_payment_fee"]');
        if (jtInput) {
            jtInput.value = selectedRate;
        }
    } else if (currentGrossUpProvider === "stripe") {
        const stripeInput = document.querySelector('#stripe_payment_config [data-field="stripe_payment_fee"]');
        if (stripeInput) {
            stripeInput.value = selectedRate;
        }
    }

    if (modal && typeof modal.close === "function") {
        modal.close();
    }

    unity.showDialogSuccess({ msg: `Fee profile "${selectedRate}" applied to configuration` });
};

window.recalculateGrossUpTest = recalculateGrossUpTest;
async function recalculateGrossUpTest() {
    const modal = document.getElementById("Dialog_Test_Calculate_Gross_Up_Fee");
    if (!modal) return;

    const netInput = modal.querySelector('[data-field="gross_up_test_net_amount"]');
    const rateInput = modal.querySelector('[data-field="gross_up_test_fee_rate"]');
    if (!netInput || !rateInput) return;

    const netAmount = parseFloat(netInput.value) || 0;
    const rateStr = rateInput.value.trim();

    let grossAmount = netAmount;
    let feeAmount = 0;

    // Call API @router_api.get("/calculate_gross_up_fee")
    try {
        const apiUrl = `/api/calculate_gross_up_fee?amount=${encodeURIComponent(netAmount)}&payment_fee=${encodeURIComponent(rateStr || "0")}`;
        const respond = await unity.fetchApi(apiUrl, "get", null, "json");
        if (respond && respond.success) {
            grossAmount = Number(respond.gross_amount) || 0;
            feeAmount = Number(respond.payment_fee) || 0;
        } else {
            // Local fallback calculation if API response is unavailable
            const parsedRate = parseRateValue(rateStr);
            const denom = 1 - parsedRate;
            if (netAmount > 0 && denom > 0) {
                grossAmount = Math.round((netAmount / denom) * 100) / 100;
                feeAmount = Math.round((grossAmount - netAmount) * 100) / 100;
            }
        }
    } catch (err) {
        unity.logger.error("calculate_gross_up_fee error:", err);
        const parsedRate = parseRateValue(rateStr);
        const denom = 1 - parsedRate;
        if (netAmount > 0 && denom > 0) {
            grossAmount = Math.round((netAmount / denom) * 100) / 100;
            feeAmount = Math.round((grossAmount - netAmount) * 100) / 100;
        }
    }

    // Helper rate calculation for preview badges & denominator details
    const feeRate = parseRateValue(rateStr);
    const denominator = 1 - feeRate;

    const ratePercentPreview = modal.querySelector('[data-field="gross_up_rate_percent_preview"]');
    if (ratePercentPreview) {
        ratePercentPreview.textContent = `${(feeRate * 100).toFixed(3)}%`;
    }

    // Update Result Highlights
    const elGross = modal.querySelector('[data-field="gross_up_res_gross_amount"]');
    const elFee = modal.querySelector('[data-field="gross_up_res_fee_amount"]');
    const elNet = modal.querySelector('[data-field="gross_up_res_net_amount"]');

    if (elGross)
        elGross.textContent = grossAmount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    if (elFee)
        elFee.textContent = `+${feeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`;
    if (elNet)
        elNet.textContent = `${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`;

    // Update Breakdown Detail Rows
    const dtNet = modal.querySelector('[data-field="gross_up_detail_net"]');
    const dtRate = modal.querySelector('[data-field="gross_up_detail_rate"]');
    const dtDenom = modal.querySelector('[data-field="gross_up_detail_denominator"]');
    const dtGross = modal.querySelector('[data-field="gross_up_detail_gross"]');
    const dtGrossCalc = modal.querySelector('[data-field="gross_up_detail_gross_calc"]');
    const dtRateText = modal.querySelector('[data-field="gross_up_detail_rate_text"]');
    const dtActualFee = modal.querySelector('[data-field="gross_up_detail_actual_fee"]');
    const dtTargetNet = modal.querySelector('[data-field="gross_up_detail_target_net"]');

    if (dtNet)
        dtNet.textContent = `${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`;
    if (dtRate) dtRate.textContent = `${(feeRate * 100).toFixed(3)}% (${feeRate.toFixed(5)})`;
    if (dtDenom) dtDenom.textContent = denominator.toFixed(5);
    if (dtGross)
        dtGross.textContent = `${grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`;
    if (dtGrossCalc) dtGrossCalc.textContent = grossAmount.toFixed(2);
    if (dtRateText) dtRateText.textContent = `${(feeRate * 100).toFixed(3)}%`;
    if (dtActualFee) dtActualFee.textContent = `-${feeAmount.toFixed(2)} THB`;
    if (dtTargetNet) dtTargetNet.textContent = `${netAmount.toFixed(2)} THB (100%)`;
}

function parseRateValue(rateStr) {
    if (!rateStr) return 0;
    let isPercent = false;
    let feeRate = 0;
    if (rateStr.endsWith("%")) {
        isPercent = true;
        feeRate = (parseFloat(rateStr.replace("%", "")) || 0) / 100;
    } else {
        feeRate = parseFloat(rateStr) || 0;
    }
    if (!isPercent && feeRate >= 1 && feeRate < 100) {
        feeRate = feeRate / 100;
    }
    return feeRate;
}

window.test_payment = test_payment;
let currentTestPaymentProvider = "beam";
let testPaymentTimer = null;
let testPaymentPollInterval = null;
const TOTAL_TEST_PAYMENT_TIMEOUT = 300; // 5 minutes countdown (300s)
let testPaymentSecondsLeft = TOTAL_TEST_PAYMENT_TIMEOUT;

window.clearTestPaymentTimers = clearTestPaymentTimers;
function clearTestPaymentTimers() {
    if (testPaymentTimer) {
        clearInterval(testPaymentTimer);
        testPaymentTimer = null;
    }
    if (testPaymentPollInterval) {
        clearInterval(testPaymentPollInterval);
        testPaymentPollInterval = null;
    }
    const modal = document.getElementById("Dialog_Test_Payment_Service");
    if (modal) {
        const spinner = modal.querySelector('[data-field="qr_polling_spinner"]');
        if (spinner) spinner.classList.add("hidden");
    }
}

async function test_payment(provider = "beam") {
    currentTestPaymentProvider = provider;
    clearTestPaymentTimers();

    const modal = document.getElementById("Dialog_Test_Payment_Service");
    if (!modal) return;

    const badge = modal.querySelector('[data-field="test_pay_provider_badge"]');
    if (badge) {
        badge.textContent = String(provider).toUpperCase();
    }

    const amountInput = modal.querySelector('[data-field="test_payment_amount"]');
    if (amountInput) {
        amountInput.value = provider === "stripe" ? "10" : "1";
    }

    const ref1Input = modal.querySelector('[data-field="test_payment_ref1"]');
    if (ref1Input) {
        ref1Input.value = "";
    }

    const ref2Input = modal.querySelector('[data-field="test_payment_ref2"]');
    if (ref2Input) {
        ref2Input.value = "";
    }

    // Hide previous QR card on fresh open
    const qrDisplay = modal.querySelector('[data-field="qr_display_card"]');
    if (qrDisplay) {
        qrDisplay.classList.add("hidden");
    }

    const successBox = modal.querySelector('[data-field="qr_success_action_box"]');
    if (successBox) {
        successBox.classList.add("hidden");
    }

    modal.showModal();
}

window.setTestPaymentAmount = function (amount) {
    const modal = document.getElementById("Dialog_Test_Payment_Service");
    const amountInput = modal ? modal.querySelector('[data-field="test_payment_amount"]') : null;
    if (amountInput) {
        amountInput.value = amount;
    }
};

window.callTestPaymentService = async function () {
    const modal = document.getElementById("Dialog_Test_Payment_Service");
    if (!modal) return;

    clearTestPaymentTimers();

    const amountInput = modal.querySelector('[data-field="test_payment_amount"]');
    const amount = parseFloat(amountInput?.value) || 1;

    const ref1Input = modal.querySelector('[data-field="test_payment_ref1"]');
    const ref1 = ref1Input?.value?.trim() || "";

    const ref2Input = modal.querySelector('[data-field="test_payment_ref2"]');
    const ref2 = ref2Input?.value?.trim() || "";

    const btnCall = modal.querySelector('[data-field="btn_call_qr"]');
    if (btnCall) {
        btnCall.classList.add("loading", "btn-disabled");
    }

    try {
        const formData = new FormData();
        formData.append("amount", amount);
        formData.append("provider", currentTestPaymentProvider);
        if (ref1) formData.append("ref1", ref1);
        if (ref2) formData.append("ref2", ref2);

        const respond = await unity.fetchApi("/payment_test", "post", formData, "json");
        console.log("payment_test response:", respond);
        if (respond && respond.success && respond.data) {
            const qrDisplay = modal.querySelector('[data-field="qr_display_card"]');
            if (qrDisplay) {
                qrDisplay.classList.remove("hidden");
            }

            const qrContainer = modal.querySelector('[data-field="qr_code_box"]');
            if (qrContainer) {
                qrContainer.innerHTML = "";
                const rawQr = respond.data;
                new QRCode(qrContainer, {
                    text: String(rawQr),
                    width: 170,
                    height: 170,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M,
                });
            }

            const netAmount = parseFloat(respond.amount) || amount;
            const feeAmount = parseFloat(respond.payment_fee) || 0;
            const grossAmount = parseFloat(respond.gross_amount) || (netAmount + feeAmount);
            const qrRef = respond.qr_payment_ref || respond.ref01 || respond.ref || "";
            const qrRef1 = respond.ref01 || respond.ref1 || qrRef || "-";
            const qrRef2 = respond.ref02 || respond.ref2 || "-";

            const refDisplay = modal.querySelector('[data-field="qr_display_ref"]');
            if (refDisplay) {
                refDisplay.textContent = qrRef1;
            }
            const ref2Display = modal.querySelector('[data-field="qr_display_ref2"]');
            if (ref2Display) {
                ref2Display.textContent = qrRef2;
            }

            const amountDisplay = modal.querySelector('[data-field="qr_display_amount"]');
            if (amountDisplay) {
                amountDisplay.textContent = `${grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`;
            }

            const netDisplay = modal.querySelector('[data-field="qr_display_net_amount"]');
            if (netDisplay) {
                netDisplay.textContent = `${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`;
            }

            const feeDisplay = modal.querySelector('[data-field="qr_display_fee_amount"]');
            if (feeDisplay) {
                feeDisplay.textContent = `+${feeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`;
            }

            const grossDisplay = modal.querySelector('[data-field="qr_display_gross_amount"]');
            if (grossDisplay) {
                grossDisplay.textContent = `${grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB`;
            }

            // Elements for Countdown & Progress Bar
            const progressBar = modal.querySelector('[data-field="qr_countdown_progress"]');
            const countdownEl = modal.querySelector('[data-field="qr_countdown_time"]');
            const statusBadge = modal.querySelector('[data-field="qr_display_status"]');
            const statusHint = modal.querySelector('[data-field="qr_polling_status_hint"]');
            const spinner = modal.querySelector('[data-field="qr_polling_spinner"]');
            const successActionBox = modal.querySelector('[data-field="qr_success_action_box"]');
            const eslipBtn = modal.querySelector('[data-field="qr_eslip_btn"]');

            // Reset UI states
            if (successActionBox) successActionBox.classList.add("hidden");
            if (spinner) spinner.classList.remove("hidden");
            if (progressBar) {
                progressBar.className = "progress progress-warning w-full h-2.5 rounded-full transition-all duration-300";
                progressBar.value = 100;
                progressBar.max = 100;
            }
            if (countdownEl) {
                countdownEl.className = "text-warning transition-colors duration-200";
                countdownEl.textContent = "05:00";
            }
            if (statusBadge) {
                statusBadge.className = "badge badge-xs badge-info font-mono";
                statusBadge.textContent = "Awaiting Payment";
            }
            if (statusHint) {
                statusHint.textContent = "Waiting for payment verification...";
            }

            // Start countdown timer (1 second interval)
            testPaymentSecondsLeft = TOTAL_TEST_PAYMENT_TIMEOUT;
            testPaymentTimer = setInterval(() => {
                testPaymentSecondsLeft--;

                if (testPaymentSecondsLeft > 0) {
                    const m = String(Math.floor(testPaymentSecondsLeft / 60)).padStart(2, "0");
                    const s = String(testPaymentSecondsLeft % 60).padStart(2, "0");
                    if (countdownEl) countdownEl.textContent = `${m}:${s}`;

                    const pct = Math.max(0, (testPaymentSecondsLeft / TOTAL_TEST_PAYMENT_TIMEOUT) * 100);
                    if (progressBar) progressBar.value = pct;

                    // Warning color under 30 seconds
                    if (testPaymentSecondsLeft <= 30) {
                        if (progressBar && !progressBar.classList.contains("progress-error")) {
                            progressBar.classList.remove("progress-warning");
                            progressBar.classList.add("progress-error");
                        }
                        if (countdownEl) {
                            countdownEl.classList.remove("text-warning");
                            countdownEl.classList.add("text-error");
                        }
                    }
                } else {
                    // Expired
                    clearTestPaymentTimers();
                    if (progressBar) {
                        progressBar.value = 0;
                        progressBar.className = "progress progress-error w-full h-2.5 rounded-full";
                    }
                    if (countdownEl) {
                        countdownEl.className = "text-error font-bold";
                        countdownEl.textContent = "00:00 (Expired)";
                    }
                    if (statusBadge) {
                        statusBadge.className = "badge badge-xs badge-error font-mono font-bold";
                        statusBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation mr-1"></i> Expired';
                    }
                    if (statusHint) {
                        statusHint.textContent = "QR Code has expired. Please generate a new one.";
                    }
                    if (spinner) spinner.classList.add("hidden");
                }
            }, 1000);

            // Polling function for @router_api.post("/payment_qr_code_status")
            const pollPaymentStatus = async () => {
                if (!modal.open || !qrRef) {
                    clearTestPaymentTimers();
                    return;
                }

                try {
                    const pollForm = new FormData();
                    pollForm.append("qr_ref", qrRef);

                    const pollRes = await unity.fetchApi("/api/payment_qr_code_status", "post", pollForm, "json");
                    console.log("payment_qr_code_status polling:", pollRes);

                    if (pollRes && pollRes.success) {
                        // Payment Successful!
                        clearTestPaymentTimers();

                        if (progressBar) {
                            progressBar.value = 100;
                            progressBar.className = "progress progress-success w-full h-2.5 rounded-full";
                        }
                        if (countdownEl) {
                            countdownEl.className = "text-success font-bold";
                            countdownEl.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Payment Successful';
                        }
                        if (statusBadge) {
                            statusBadge.className = "badge badge-xs badge-success font-mono font-bold";
                            statusBadge.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i> PAID';
                        }
                        if (statusHint) {
                            statusHint.textContent = "Payment received and verified successfully!";
                        }
                        if (spinner) spinner.classList.add("hidden");

                        if (pollRes.pay_success_url && eslipBtn && successActionBox) {
                            eslipBtn.href = pollRes.pay_success_url;
                            successActionBox.classList.remove("hidden");
                        }

                        unity.showToastNotification({ type: "success", msg: "Test payment verified successfully!" });
                    }
                } catch (pollErr) {
                    console.warn("Poll payment status error:", pollErr);
                }
            };

            // Start polling every 2.5 seconds
            setTimeout(pollPaymentStatus, 1500);
            testPaymentPollInterval = setInterval(pollPaymentStatus, 2500);

            unity.showToastNotification({ type: "success", msg: "Test QR Code generated. Awaiting payment..." });
        } else {
            unity.showDialogError({ msg: respond?.msg || respond?.error || "Failed to generate test QR code" });
        }
    } catch (err) {
        unity.logger.error("test_payment error:", err);
        unity.showDialogError({ msg: `Error occurred: ${err}` });
    } finally {
        if (btnCall) {
            btnCall.classList.remove("loading", "btn-disabled");
        }
    }
};

// Clean up timers if modal is closed via ESC or backdrop
document.addEventListener("DOMContentLoaded", () => {
    const testModal = document.getElementById("Dialog_Test_Payment_Service");
    if (testModal) {
        testModal.addEventListener("close", clearTestPaymentTimers);
    }
});
