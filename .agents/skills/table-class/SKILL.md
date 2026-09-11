---
name: table-class
description: >-
  Master guide and implementation standard for static/js/_table_class.js in PKS V5.
  Covers TableModel for server-side DataTables, create_item_control for automated modal CRUD,
  ItemModel for card grid views, Flatpickr date integration, and FastAPI backend contracts.
metadata:
  version: 5.0.0
  framework: DataTables.net, jQuery, DaisyUI v5, FastAPI, SQLModel
---

# PKS V5 Table & Item Management Skill (`_table_class.js`)

`static/js/_table_class.js` is the core client-side data management engine for PKS V5. It encapsulates **jQuery DataTables**, **server-side pagination**, **Excel/CSV streaming export**, **DaisyUI modal CRUD automation (`create_item_control`)**, and **card/template rendering (`ItemModel`)**.

---

## 🏛️ Architecture & Core Components

```text
_table_class.js
├── TableModel                                # Wraps DataTables.net for tabular views
│   ├── Auto-generates <table> from <div>    # If selector is a <div>, builds table/thead/tfoot
│   ├── Built-in Toolbar Buttons             # Add, Reload, Export Excel, Export CSV, ColVis
│   ├── Automated Modal CRUD Control         # create_item_control()
│   └── Event Delegation                     # .control-edit-btn, .control-remove-btn
│
├── ItemModel                                 # Wraps HTML <template> for card/grid views
│   ├── Clones template & binds fields       # unity.data2fields
│   ├── Dynamic Action Buttons               # Edit, Delete, Custom buttons
│   └── Modal CRUD Integration               # manager_item, update_item, remove_item
│
├── actionButtonsTemplate(id, opts)           # Helper rendering edit/delete button group
└── init_table_model_with_datatime_picker()   # Flatpickr date range integration with debounce
```

---

## 1. 📋 `TableModel` Usage & Initialization

### A. HTML Setup (Can be a `<div>` or a `<table>`)
If using a `<div>`, `TableModel` automatically constructs the `<table id="my_table_model">` with `<thead>` and `<tfoot>`:

```html
<!-- Option 1: Container DIV (Auto-generates table) -->
<div id="table_member_container" class="w-full overflow-x-auto"></div>

<!-- Option 2: Pre-defined <table> -->
<div class="overflow-x-auto">
    <table id="table_member" class="table table-sm table-zebra w-full"></table>
</div>

<!-- Modal Dialog for CRUD -->
<dialog id="modal_member" class="modal">
    <div class="modal-box max-w-lg">
        <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
        <h3 class="font-bold text-lg mb-4 text-primary" data-field="modal_title">Member Details</h3>
        <form id="memberForm" class="space-y-3">
            <div class="form-control">
                <label class="label py-1"><span class="label-text text-xs font-semibold">Member Code</span></label>
                <input type="text" name="member_code" data-field="member_code" class="input input-bordered input-sm" required />
            </div>
            <div class="form-control">
                <label class="label py-1"><span class="label-text text-xs font-semibold">Full Name</span></label>
                <input type="text" name="first_name" data-field="first_name" class="input input-bordered input-sm" required />
            </div>
            <div class="modal-action">
                <button type="button" class="btn btn-ghost btn-sm" onclick="modal_member.close()">Cancel</button>
                <button type="button" data-field="btn_submit" class="btn btn-primary btn-sm px-6">Save</button>
            </div>
        </form>
    </div>
</dialog>
```

### B. JavaScript Controller (`static/js/my_page.js`)

```javascript
import { TableModel, actionButtonsTemplate } from "./_table_class.js";

let memberTable = null;

export function initMemberTable() {
    // 1. Instantiate TableModel
    memberTable = new TableModel(
        "#table_member_container",         // Selector (DIV or TABLE)
        "/api/access/member/datatable",    // DataTables Server-Side Endpoint
        {
            table: "Access_Member",        // SQLModel model name for backend parser
            order: [[0, "desc"]],          // Default order (actions at col 0)
            columns: [
                {
                    data: "id",
                    title: "Actions",
                    className: "text-center noExport w-24",
                    orderable: false,
                    searchable: false,
                    render: (data, type, row) => actionButtonsTemplate(row.id)
                },
                {
                    data: "id",
                    title: "ID",
                    className: "font-mono text-xs",
                    render: (data) => `#${data}`
                },
                {
                    data: "member_code",
                    title: "Code",
                    render: (data) => `<span class="badge badge-neutral font-mono font-bold">${data}</span>`
                },
                {
                    data: "first_name",
                    title: "Full Name",
                    render: (data, type, row) => `<b>${data} ${row.last_name || ''}</b>`
                },
                {
                    data: "status",
                    title: "Status",
                    render: (data) => {
                        const isOk = data === "active";
                        return `<span class="badge badge-xs ${isOk ? 'badge-success' : 'badge-error'} font-bold">${data}</span>`;
                    }
                }
            ]
        },
        {
            addbtn: true,                  // Show "Add New" in table toolbar
            addbtn_extra_id: "btnAddNew",  // Optional external button ID that also triggers Add
            on_loaded: () => console.log("Table fully loaded"),
            callback: (eventType, row) => {
                // eventType: 'select', 'deselect', 'reload'
            }
        }
    );

    // 2. Attach Modal CRUD Controller
    const modalEl = document.getElementById("modal_member");
    if (modalEl) {
        memberTable.create_item_control({
            modal_from: modalEl,
            api_endpoint: "/api/access/member",
            add_callback: (modal) => {
                modal.querySelector('[data-field="modal_title"]').textContent = "Add New Cardholder";
            },
            manager_callback: (data, modal) => {
                modal.querySelector('[data-field="modal_title"]').textContent = `Edit Cardholder #${data.id}`;
            },
            update_callback: (formData, modal) => {
                // Optional hook to manipulate FormData before POST
            },
            success_callback: (id) => {
                console.log("Record saved successfully:", id);
            }
        });
    }

    // 3. Initialize DataTable DOM and Events
    memberTable.init();
}
```

---

## 2. ⚡ Automated Modal CRUD (`create_item_control`)

When `table.create_item_control(config)` is called, it binds the modal form and handles all CRUD lifecycles without manual `fetch` code:

| Method in `model_control` | Trigger | What It Does |
| :--- | :--- | :--- |
| `model_control.add()` | Click Add Button | Clears modal fields (`unity.clear_fields`), runs `add_callback`, binds `[data-field="btn_submit"]` to save with `id=0`, opens modal. |
| `model_control.manager(id)` | Click `.control-edit-btn` | Shows loading dialog, calls `GET {api_endpoint}?id={id}`, populates fields (`unity.data2fields`), runs `manager_callback`, binds submit to update `id`, opens modal. |
| `model_control.update(id)` | Click Submit Button | Serializes form inputs (`unity.fields2formData`), appends `id`, runs `update_callback`, sends `POST {api_endpoint}`, shows success/error dialogs, closes modal, reloads table (`table.reload()`). |
| `model_control.remove(id)` | Click `.control-remove-btn` | Asks confirmation dialog (`unity.dialogConfirm`), sends `DELETE {api_endpoint}?id={id}`, shows feedback, reloads table. |

### Field Mapping Convention:
In the modal HTML, use standard names matching your SQLModel fields:
- `<input name="first_name" data-field="first_name" />`
- `<select name="status" data-field="status">`
- Checkboxes automatically convert to boolean (`checked`).

---

## 3. 🐍 FastAPI Backend Contract (The 4 Required Endpoints)

To be 100% compatible with `_table_class.js`, your FastAPI router must implement these 4 endpoints:

```python
from fastapi import APIRouter, Request, HTTPException
from sqlmodel import select
from app.core.dependencies import AsyncDbDep, SystemUserDep
from app.core.models import Access_Member
from app.core.utility import get_datatable_select, export_excel_response, export_csv_response

router = APIRouter(prefix="/api/access/member", tags=["Access Members"])

# 1. DataTables Server-Side Endpoint (With Excel & CSV Export)
@router.get("/datatable", summary="DataTables Endpoint")
async def get_members_datatable(req_para: Request, db: AsyncDbDep):
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    # Check for streaming export requests
    export_type = params.get("export")
    if export_type == "excel":
        return await export_excel_response(datatable_select, db, filename="members")
    if export_type == "csv":
        return await export_csv_response(datatable_select, db, filename="members")

    # Regular paginated JSON
    results = await db.execute(datatable_select.select_query)
    rows = results.mappings().all()

    total_records = await db.scalar(datatable_select.count_total_query) or 0
    filtered_records = await db.scalar(datatable_select.count_filtered_query) or 0

    return {
        "draw": int(params.get("draw", 1)),
        "recordsTotal": total_records,
        "recordsFiltered": filtered_records,
        "data": [dict(r) for r in rows],
    }

# 2. Query by ID (Used by model_control.manager(id))
@router.get("", summary="Get single record by query ID")
async def get_member_by_query_id(id: int, db: AsyncDbDep):
    member = await db.get(Access_Member, id)
    if not member:
        return {"success": False, "msg": "Member not found"}
    return {"success": True, "data": member.model_dump()}

# 3. Create or Update (Used by model_control.update(id))
@router.post("", summary="Create or Update Record")
async def save_member(request: Request, db: AsyncDbDep, current_user: SystemUserDep):
    # Handles both FormData (from unity.fields2formData) and JSON
    if "application/json" in request.headers.get("content-type", ""):
        data = await request.json()
    else:
        data = dict(await request.form())

    rec_id = int(data.get("id", 0))

    if rec_id == 0:
        # CREATE NEW
        new_rec = Access_Member(**{k: v for k, v in data.items() if k != "id"})
        db.add(new_rec)
        await db.commit()
        await db.refresh(new_rec)
        return {"success": True, "msg": "Created successfully", "data": new_rec.model_dump()}
    else:
        # UPDATE EXISTING
        rec = await db.get(Access_Member, rec_id)
        if not rec:
            return {"success": False, "msg": "Record not found"}
        for k, v in data.items():
            if k != "id" and hasattr(rec, k):
                setattr(rec, k, v)
        db.add(rec)
        await db.commit()
        return {"success": True, "msg": "Updated successfully"}

# 4. Delete Record (Used by model_control.remove(id))
@router.delete("", summary="Delete record by query ID")
async def delete_member_by_query_id(id: int, db: AsyncDbDep, current_user: SystemUserDep):
    rec = await db.get(Access_Member, id)
    if not rec:
        return {"success": False, "msg": "Record not found"}
    await db.delete(rec)
    await db.commit()
    return {"success": True, "msg": "Deleted successfully"}
```

---

## 4. 📅 Flatpickr Date Filtering

To bind a date range picker that auto-reloads the DataTable with debounce:

```javascript
import { TableModel, init_table_model_with_datatime_picker } from "./_table_class.js";

const table = new TableModel("#table_logs", "/api/access/log/datatable", { ... });

// Flatpickr will automatically update table.date_range and trigger table.reload()
const fp = init_table_model_with_datatime_picker(table, "#filterDateRange");
```

Backend receives: `params["date_range"]` (e.g. `"2026-09-01 to 2026-09-11"`).

---

## 5. 🎴 `ItemModel` for Card & Template Grid Views

When UI requires visual cards instead of a DataTable:

```html
<!-- Target container -->
<div id="card_container" class="grid grid-cols-1 md:grid-cols-3 gap-4"></div>

<!-- Card Template -->
<template id="card_tpl">
    <div class="card bg-base-100 shadow border border-base-content/10 p-4">
        <h4 class="font-bold" data-field="title"></h4>
        <p class="text-xs text-base-content/70" data-field="description"></p>
        <div class="mt-4 flex justify-end gap-2" data-field="action_container"></div>
    </div>
</template>
```

```javascript
import { ItemModel } from "./_table_class.js";

const itemModel = new ItemModel(
    "card_container",
    "card_tpl",
    document.getElementById("modal_item"),
    "/api/items"
);

// Loads data, renders clones, attaches edit/delete actions
await itemModel.init();
```

---

## 💡 Best Practices & Rules

1. **Action Column Positioning:** Always place the `actionButtonsTemplate(row.id)` column at **index 0** (`orderable: false, searchable: false`) with `order: [[1, 'desc']]` or `[[1, 'asc']]`.
2. **DaisyUI Styling:** `actionButtonsTemplate` outputs `.control-edit-btn` and `.control-remove-btn`. Do not remove these classes; `TableModel` depends on them for event delegation.
3. **Always use `table.reload()`:** Avoid `table.table.ajax.reload()`. `TableModel.reload()` calls `this.table?.ajax?.reload(null, false)` which preserves the user's current pagination page.
4. **Dynamic Filters:** Use `table.filter = JSON.stringify({ "table.status": "active" })` and call `table.reload()` to apply live filtering.
