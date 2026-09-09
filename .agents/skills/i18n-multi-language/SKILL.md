---
name: i18n-multi-language
description: >-
  Use this skill when developing or maintaining internationalization (i18n), multi-language support (TH, EN, ZH, JP, LO, MY),
  translation dictionaries in locales_*.js / i18n_key.txt, Jinja2 template translations (data-i18n, data-i18n-placeholder,
  data-i18n-tooltip, data-name-th/data-name-en), or dynamic language switching via unity.js.
---

# Multi-Language & Internationalization (i18n) Guidelines (PKS V5)

This skill outlines the architectural standards, patterns, and workflows for internationalization (i18n) and multi-language support across the **PK Management LPR Auto (V5)** platform.

---

## 🌐 Supported Languages & Architecture

The system supports 6 core languages managed via `i18next` and loaded through [`static/js/unity.js`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/static/js/unity.js):

| Code | Language | Dictionary File |
| :--- | :--- | :--- |
| `th` | Thai (ไทย) *(Default)* | [`static/js/locales_th.js`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/static/js/locales_th.js) |
| `en` | English | Base Keys / Default |
| `zh` | Chinese (中文) | [`static/js/locales_zh.js`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/static/js/locales_zh.js) |
| `jp` | Japanese (日本語) | [`static/js/locales_jp.js`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/static/js/locales_jp.js) |
| `lo` | Lao (ພາສາລາວ) | [`static/js/locales_lo.js`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/static/js/locales_lo.js) |
| `my` | Myanmar / Burmese (မြန်မာဘာသာ) | [`static/js/locales_my.js`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/static/js/locales_my.js) |

Key registry is tracked in [`i18n_key.txt`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/i18n_key.txt).

---

## 🏷️ HTML & Jinja2 Template Integration

Always tag UI elements with the appropriate `data-i18n*` attributes:

### 1. Text Content (`data-i18n`)
```html
<span data-i18n="Payment Types">ประเภทการชำระเงิน</span>
<button class="btn btn-primary" data-i18n="Save Changes">บันทึกการแก้ไข</button>
```

### 2. Input Placeholders (`data-i18n-placeholder`)
```html
<input type="text" 
       placeholder="ค้นหารหัส หรือชื่อช่องทาง..." 
       data-i18n-placeholder="Search code, payment name..." />
```

### 3. Tooltips & Titles (`data-i18n-tooltip` / `data-i18n-title`)
```html
<div class="tooltip" data-tip="Refresh Data" data-i18n-tooltip="Refresh Data">
    <button title="Delete Record" data-i18n-title="Delete Record">...</button>
</div>
```

### 4. Bilingual Dropdown Options (`data-name-th` / `data-name-en`)
For dynamic server-rendered `<select>` elements (e.g. Payment Types, Vehicle Types, Fuel Types):
```html
<select data-field="pay_type" class="select select-bordered">
    {% for pt in payment_types %}
        <option value="{{ pt.code }}" 
                data-name-th="{{ pt.name_th or pt.name_en }}" 
                data-name-en="{{ pt.name_en or pt.name_th }}">
            {{ pt.name_th or pt.name_en }}
        </option>
    {% endfor %}
</select>
```

---

## ⚙️ JavaScript Translation Engine (`unity.js`)

### 1. Dynamic Translation Helper
```javascript
import * as unity from "./unity.js";

// Translate key in JavaScript
const label = unity.t("Payment Successful!");
```

### 2. Triggering Translation Update
When rendering dynamic DOM or modals, trigger `unity.updateContent()`:
```javascript
// Updates all [data-i18n], [data-i18n-placeholder], and option[data-name-th]
unity.updateContent(modalElement || document.body);
```

### 3. Language Change Event Listener
Listen to language change events when custom redraws are needed:
```javascript
window.addEventListener("languageChanged", (e) => {
    console.log("Active language switched to:", e.detail.lang);
    // Reload datatables or update custom canvases if required
});
```

---

## 🗄️ Database Multi-Language Conventions

1. **System Identifiers (Codes):** Always use uppercase ASCII codes for DB storage, logic checks, and API filters (e.g., `CASH`, `TRANSFER`, `VISA`, `PROMPTPAY`). **Never** use localized text as DB keys.
2. **Column Naming:**
   - `name_th`: Thai title (e.g., `เงินสด`, `โอนเงินผ่านธนาคาร`)
   - `name_en`: English title (e.g., `Cash`, `Bank Transfer`)
3. **Fallback Order:** `pt.name_th or pt.name_en` for Thai locale; `pt.name_en or pt.name_th` for other locales.

---

## 🚀 Workflow: Adding New Translatable Text

1. **Tag UI element** in `.html` template with `data-i18n="English Key"`.
2. **Add English Key** to [`i18n_key.txt`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_LPR_AUTO_V5/i18n_key.txt).
3. **Add translations** to dictionary files:
   - `static/js/locales_th.js`
   - `static/js/locales_zh.js`
   - `static/js/locales_jp.js`
   - `static/js/locales_lo.js`
   - `static/js/locales_my.js`
4. **Test in Browser** by calling `changeLang('th')`, `changeLang('en')`, etc., in console or using the UI navbar language switcher.
