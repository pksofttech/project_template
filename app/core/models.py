"""Application Database Models and Schema Definitions."""

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import String, TypeDecorator
from sqlmodel import Field, SQLModel, and_

from app.stdio import time_now


class ISODateTime(TypeDecorator):
    """
    Custom TypeDecorator ensuring all datetime values are stored in SQLite
    as ISO 8601 strings in GMT+7 (Asia/Bangkok), e.g. '2026-09-09T11:40:00+07:00'.
    """

    impl = String
    cache_ok = True

    def process_bind_param(self, value: datetime | str | None, dialect) -> str | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            if value.tzinfo is None:
                value = value.replace(tzinfo=ZoneInfo("Asia/Bangkok"))
            return value.isoformat()
        if isinstance(value, str):
            return value
        return str(value)

    def process_result_value(self, value: datetime | str | None, dialect) -> datetime | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value)
            except ValueError:
                return value
        return value


class App_Configurations(SQLModel, table=True):
    """Key-value system configurations table."""

    id: int | None = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True, nullable=False)
    value: str = Field(default="")
    description: str | None = Field(default=None)
    updated_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)


class System_User_Type(SQLModel, table=True):
    """System_User_Type"""

    id: int | None = Field(default=None, primary_key=True)
    user_type: str = Field(nullable=False, unique=True)
    permission_allowed: str = Field(default="")
    menu_config: str = Field(default="")
    system_config: str = Field(default="")
    home_item_config: str = Field(default="")
    description: str = Field(default="", max_length=128)


class System_Users(SQLModel, table=True):
    """System_Users table"""

    id: int | None = Field(default=None, primary_key=True)

    username: str = Field(unique=True, index=True)
    name: str = Field(unique=True, index=True)

    password: str  # เก็บ password hash นะ ไม่ใช่ plaintext

    createDate: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    create_by: str = Field(default="system")

    status: str = Field(default="ENABLE", index=True)  # ENABLE / DISABLE
    pictureUrl: str = Field(default="")
    remark: str = Field(default="")

    system_user_type_id: int = Field(foreign_key="system_user_type.id", nullable=False, index=True)

    @property
    def is_active(self) -> bool:
        return (self.status or "").upper() == "ENABLE"

    @is_active.setter
    def is_active(self, value: bool):
        self.status = "ENABLE" if value else "DISABLE"

    @property
    def created_at(self) -> datetime:
        return self.createDate

    @created_at.setter
    def created_at(self, value: datetime):
        self.createDate = value

    @property
    def updated_at(self) -> datetime:
        return self.createDate

    @updated_at.setter
    def updated_at(self, value: datetime):
        self.createDate = value

    @property
    def email(self) -> str:
        return ""

    @email.setter
    def email(self, value: str):
        pass

    @property
    def role(self) -> str:
        return "admin"


class Sample_Item(SQLModel, table=True):
    """
    Sample entity model demonstrating standard CRUD, DataTables server-side
    pagination, and Excel export.
    """

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True, nullable=False)
    name: str = Field(index=True, nullable=False)
    category: str = Field(default="General", index=True)
    price: float = Field(default=0.0)
    quantity: int = Field(default=0)
    status: str = Field(default="active", index=True)  # active, inactive, pending
    description: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    updated_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)


# Dynamic model mapping for generic DataTables queries
MODEL_MAP = {
    "App_Configurations": App_Configurations,
    "System_User_Type": System_User_Type,
    "system_user_type": System_User_Type,
    "System_Users": System_Users,
    "system_users": System_Users,
    "Sample_Item": Sample_Item,
    "sample_item": Sample_Item,
}


def build_select_expr(specs: list[dict]):
    """Build dynamic column selections for DataTables."""
    selects = []
    for s in specs:
        table = (s.get("table") or "").strip()
        col = (s.get("col") or "").strip()
        model = MODEL_MAP.get(table)
        if not model or not hasattr(model, col):
            continue
        column = getattr(model, col)
        if s.get("name"):
            column = column.label(s["name"])
        selects.append(column)
    return selects


def build_where_expr(specs: list[dict], filter_dict: dict | None = None):
    """Build dynamic WHERE clauses for DataTables column filters."""
    wheres = []
    for s in specs:
        table = (s.get("table") or "").strip()
        col = (s.get("col") or "").strip()
        search = (s.get("search") or "").strip()
        model = MODEL_MAP.get(table)
        if not model or not hasattr(model, col) or not search:
            continue
        column = getattr(model, col)
        wheres.append(column.ilike(f"%{search}%"))

    if filter_dict:
        for k, v in filter_dict.items():
            if "." not in k or v is None or v == "":
                continue
            t, c = k.split(".", 1)
            model = MODEL_MAP.get(t)
            if not model or not hasattr(model, c):
                continue
            column = getattr(model, c)
            wheres.append(column == v)

    wheres = [c for c in wheres if c is not None]
    return and_(*wheres) if wheres else None


def build_order_by_expr(order_by: dict):
    """Build dynamic ORDER BY expression for DataTables."""
    if not order_by:
        return None
    table = (order_by.get("table") or "").strip()
    col = (order_by.get("col") or "").strip()
    direction = (order_by.get("dir") or "asc").strip().lower()
    model = MODEL_MAP.get(table)
    if not model or not hasattr(model, col):
        return None
    order_col = getattr(model, col)
    return order_col.asc() if direction == "asc" else order_col.desc()
