"""Sample Entity API: Full CRUD & DataTables Server-Side Pagination with Excel Export."""

from pydantic import BaseModel
from sqlmodel import func, literal, or_, select

from fastapi import APIRouter, HTTPException, Query, Request, status
from app.core.dependencies import AsyncDbDep, JWTDep
from app.core.models import (
    Sample_Item,
    build_order_by_expr,
    build_select_expr,
    build_where_expr,
)
from app.core.utility import export_excel_response, get_datatable_select
from app.stdio import print_error, print_success, time_now

router = APIRouter(
    prefix="/api/sample",
    tags=["Sample Items"],
)


class SampleItemCreate(BaseModel):
    code: str
    name: str
    category: str = "General"
    price: float = 0.0
    quantity: int = 0
    status: str = "active"
    description: str | None = None


class SampleItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    price: float | None = None
    quantity: int | None = None
    status: str | None = None
    description: str | None = None


@router.get("/datatable", summary="DataTables Server-side Endpoint with Export")
async def get_datatable(req_para: Request, db: AsyncDbDep):
    """
    DataTables Server-side Endpoint:
    Handles dynamic column select, global search, column filtering, ordering, pagination,
    and automatic Excel/CSV export when ?export=excel or ?export=csv is passed.
    """
    params = dict(req_para.query_params)
    datatable_select = get_datatable_select(params)

    limit = datatable_select["limit"]
    skip = datatable_select["skip"]
    search = datatable_select["search"]

    # 1. Global Search Condition across code, name, category
    search_cond = literal(True)
    if search:
        search_cond = or_(
            Sample_Item.code.ilike(f"%{search}%"),
            Sample_Item.name.ilike(f"%{search}%"),
            Sample_Item.category.ilike(f"%{search}%"),
        )

    # 2. Dynamic Column Select & Where Expressions
    select_stmt = build_select_expr(datatable_select["list_datas"])
    if not select_stmt:
        select_stmt = [
            Sample_Item.id.label("id"),
            Sample_Item.code.label("code"),
            Sample_Item.name.label("name"),
            Sample_Item.category.label("category"),
            Sample_Item.price.label("price"),
            Sample_Item.quantity.label("quantity"),
            Sample_Item.status.label("status"),
            Sample_Item.created_at.label("created_at"),
            Sample_Item.updated_at.label("updated_at"),
        ]

    base_stmt = select(*select_stmt).where(search_cond)

    where_stmt = build_where_expr(datatable_select["list_datas"], datatable_select["filter"])
    if where_stmt is not None:
        base_stmt = base_stmt.where(where_stmt)

    order_expr = build_order_by_expr(datatable_select["order_by"])
    if order_expr is None:
        order_expr = Sample_Item.id.desc()

    # 3. Total & Filtered Record Counts
    total_records = (await db.exec(select(func.count(Sample_Item.id)))).one()
    filtered_subq = base_stmt.subquery()
    filtered_records = (await db.exec(select(func.count()).select_from(filtered_subq))).one()

    # 4. Handle Excel/CSV Export
    if params.get("export"):
        export_query = base_stmt.order_by(order_expr)
        rows = (await db.exec(export_query)).mappings().all()
        return await export_excel_response(
            rows,
            filename_prefix="sample_items",
            sheet_title="Sample Items",
            export_type=params.get("export", "excel"),
        )

    # 5. Standard JSON Paginated Response
    paginated_query = base_stmt.order_by(order_expr).offset(skip).limit(limit)
    rows = (await db.exec(paginated_query)).mappings().all()

    formatted_data = []
    for r in rows:
        item = dict(r)
        # 1. Flat keys (e.g. 'code')
        # 2. Dotted keys (e.g. 'Sample_Item.code')
        for k, v in list(item.items()):
            item[f"Sample_Item.{k}"] = v
        # 3. Nested object (e.g. item['Sample_Item']['code']) for DataTables dot-notation traversal
        item["Sample_Item"] = dict(r)
        formatted_data.append(item)

    return {
        "draw": int(params.get("draw", 1)),
        "recordsTotal": total_records,
        "recordsFiltered": filtered_records,
        "data": formatted_data,
    }


@router.get("/{item_id}", summary="Get Sample Item by ID")
async def get_item_by_id(item_id: int, db: AsyncDbDep):
    """Retrieve single item details."""
    item = await db.get(Sample_Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.post("", summary="Create New Sample Item", status_code=status.HTTP_201_CREATED)
async def create_item(payload: SampleItemCreate, db: AsyncDbDep):
    """Create a new item."""
    # Check duplicate code
    existing = (await db.exec(select(Sample_Item).where(Sample_Item.code == payload.code))).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Code '{payload.code}' already exists")

    new_item = Sample_Item(
        code=payload.code,
        name=payload.name,
        category=payload.category,
        price=payload.price,
        quantity=payload.quantity,
        status=payload.status,
        description=payload.description,
        created_at=time_now(),
        updated_at=time_now(),
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    print_success(f"Created item #{new_item.id}: {new_item.name}")
    return {"message": "Item created successfully", "data": new_item}


@router.put("/{item_id}", summary="Update Sample Item")
async def update_item(item_id: int, payload: SampleItemUpdate, db: AsyncDbDep):
    """Update existing item."""
    item = await db.get(Sample_Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    item.updated_at = time_now()
    db.add(item)
    await db.commit()
    await db.refresh(item)
    print_success(f"Updated item #{item.id}: {item.name}")
    return {"message": "Item updated successfully", "data": item}


@router.delete("/{item_id}", summary="Delete Sample Item")
async def delete_item(item_id: int, db: AsyncDbDep):
    """Delete item by ID."""
    item = await db.get(Sample_Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    await db.delete(item)
    await db.commit()
    print_success(f"Deleted item #{item_id}")
    return {"message": "Item deleted successfully"}
