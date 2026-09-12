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


# ---------------------------------------------------------------------------
# 🚪 ACCESS CONTROL MANAGEMENT MODELS
# ---------------------------------------------------------------------------


class Access_Zone(SQLModel, table=True):
    """Access Zone / Area Entity for presence and occupancy tracking."""

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True, nullable=False)
    name: str = Field(index=True, nullable=False)
    zone_type: str = Field(default="INTERNAL", index=True)  # OUTSIDE, INTERNAL, HIGH_SECURITY, MUSTER_POINT
    parent_zone_id: int | None = Field(default=None, foreign_key="access_zone.id", index=True)
    max_occupancy: int = Field(default=0)  # 0 = unlimited, >0 = maximum personnel capacity
    antipassback_enabled: bool = Field(default=False)
    antipassback_timeout_min: int = Field(default=30)
    status: str = Field(default="active", index=True)  # active, inactive
    description: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    updated_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)


class Access_Door(SQLModel, table=True):
    """Access point, door, turnstile, or barrier gate entity."""

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True, nullable=False)
    name: str = Field(index=True, nullable=False)
    zone: str = Field(default="Main Building", index=True)
    from_zone_id: int | None = Field(default=None, foreign_key="access_zone.id", index=True)
    to_zone_id: int | None = Field(default=None, foreign_key="access_zone.id", index=True)
    door_type: str = Field(default="DOOR", index=True)  # DOOR, BARRIER_GATE, TURNSTILE, SLIDING_DOOR
    ip_address: str = Field(default="127.0.0.1")
    controller_type: str = Field(default="REST_WEBHOOK", index=True)  # REST_WEBHOOK, TCP_IP, WIEGAND, SIMULATOR
    direction: str = Field(default="IN", index=True)  # IN, OUT, BOTH
    relay_time_sec: int = Field(default=5)
    status: str = Field(default="ONLINE", index=True)  # ONLINE, OFFLINE, DISABLED
    description: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    updated_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)


class Access_Group(SQLModel, table=True):
    """Access permission group with timezone schedules and allowed doors."""

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True, nullable=False)
    name: str = Field(index=True, nullable=False)
    time_start: str = Field(default="00:00")  # HH:MM format
    time_end: str = Field(default="23:59")    # HH:MM format
    allowed_days: str = Field(default="MON,TUE,WED,THU,FRI,SAT,SUN")
    doors_allowed: str = Field(default="[]")  # JSON string of door ids, e.g. "[1, 2, 3]" or "*"
    status: str = Field(default="active", index=True)
    description: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    updated_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)


class Access_Member(SQLModel, table=True):
    """Cardholder / Member profile entity."""

    id: int | None = Field(default=None, primary_key=True)
    member_code: str = Field(unique=True, index=True, nullable=False)
    first_name: str = Field(index=True, nullable=False)
    last_name: str = Field(default="", index=True)
    department: str = Field(default="General", index=True)
    phone: str = Field(default="")
    email: str = Field(default="")
    picture_url: str = Field(default="")
    access_group_id: int | None = Field(default=None, foreign_key="access_group.id", index=True)
    current_zone_id: int | None = Field(default=None, foreign_key="access_zone.id", index=True)
    is_inside: bool = Field(default=False, index=True)
    last_access_door_id: int | None = Field(default=None, index=True)
    last_access_time: datetime | None = Field(default=None, sa_type=ISODateTime)
    last_direction: str | None = Field(default=None)
    status: str = Field(default="active", index=True)  # active, inactive, expired, suspended
    expire_date: datetime | None = Field(default=None, sa_type=ISODateTime)
    face_embedding: str | None = Field(default=None)  # JSON-encoded 512-dim normalized vector
    face_registered_at: datetime | None = Field(default=None, sa_type=ISODateTime)
    face_tag: str | None = Field(default=None)  # e.g., Mockup-ArcFace-512, InsightFace-buffalo_s
    created_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    updated_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)


class Access_Card(SQLModel, table=True):
    """RFID Card, Keycard, or Credential token entity."""

    id: int | None = Field(default=None, primary_key=True)
    card_number: str = Field(unique=True, index=True, nullable=False)
    facility_code: str | None = Field(default=None, index=True)
    card_type: str = Field(default="RFID_125K", index=True)  # RFID_125K, MIFARE, UHF, QR_CODE, PIN
    member_id: int | None = Field(default=None, foreign_key="access_member.id", index=True)
    pin_code: str | None = Field(default=None)
    status: str = Field(default="active", index=True)  # active, blocked, lost, expired
    issue_date: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    expire_date: datetime | None = Field(default=None, sa_type=ISODateTime)
    remark: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    updated_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)


Member_RFID_Card = Access_Card


class Member_Mobile_Credential(SQLModel, table=True):
    """Smart Phone Virtual Credential (BLE / NFC / HCE / Dynamic QR)."""

    __tablename__ = "member_mobile_credential"

    id: int | None = Field(default=None, primary_key=True)
    member_id: int = Field(foreign_key="access_member.id", index=True, nullable=False)
    virtual_card_number: str = Field(unique=True, index=True, nullable=False)
    device_uuid: str = Field(unique=True, index=True, nullable=False)
    comm_tech: str = Field(default="BLE", index=True)  # BLE, NFC, DYNAMIC_QR
    os_platform: str = Field(default="Android", index=True)  # iOS, Android
    device_model: str | None = Field(default=None)
    app_version: str | None = Field(default=None)
    public_key: str | None = Field(default=None)
    status: str = Field(default="active", index=True)  # active, suspended, unlinked
    last_sync_time: datetime | None = Field(default=None, sa_type=ISODateTime)
    created_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    updated_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)


class Member_Fingerprint(SQLModel, table=True):
    """Biometric Fingerprint Minutiae Template (ISO/IEC 19794-2 Base64)."""

    __tablename__ = "member_fingerprint"

    id: int | None = Field(default=None, primary_key=True)
    member_id: int = Field(foreign_key="access_member.id", index=True, nullable=False)
    finger_index: int = Field(default=1, index=True)  # 1=R.Thumb, 2=R.Index... 10=L.Little
    finger_name: str = Field(default="Right Index", index=True)
    template_data: str = Field(nullable=False)  # Base64 ISO/ANSI template
    algorithm_version: str = Field(default="ISO_19794_2", index=True)
    quality_score: int = Field(default=80)
    status: str = Field(default="active", index=True)  # active, disabled
    created_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    updated_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)


class Member_Face_Credential(SQLModel, table=True):
    """Biometric Facial Embedding Feature Vectors (ArcFace / InsightFace 512-dim)."""

    __tablename__ = "member_face_credential"

    id: int | None = Field(default=None, primary_key=True)
    member_id: int = Field(foreign_key="access_member.id", index=True, nullable=False)
    embedding_vector: str = Field(nullable=False)  # JSON string of 512-dim normalized floats
    model_name: str = Field(default="InsightFace-buffalo_s", index=True)
    pose_angle: str = Field(default="FRONT", index=True)  # FRONT, LEFT, RIGHT, GLASSES
    photo_url: str | None = Field(default=None)
    liveness_score: float | None = Field(default=1.0)
    status: str = Field(default="active", index=True)  # active, disabled
    created_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    updated_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)


class Member_Pin_Credential(SQLModel, table=True):
    """Salted hashed PIN for keypad entry or 2-Factor Authentication."""

    __tablename__ = "member_pin_credential"

    id: int | None = Field(default=None, primary_key=True)
    member_id: int = Field(foreign_key="access_member.id", index=True, nullable=False)
    pin_hash: str = Field(nullable=False)  # Hashed PIN (never plaintext)
    pin_type: str = Field(default="STANDARD", index=True)  # STANDARD, DURESS
    failed_attempts: int = Field(default=0)
    locked_until: datetime | None = Field(default=None, sa_type=ISODateTime)
    status: str = Field(default="active", index=True)  # active, locked, disabled
    created_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
    updated_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)


class Access_Log(SQLModel, table=True):
    """Access event logs (Card swipe, gate opening, permission audit)."""

    id: int | None = Field(default=None, primary_key=True)
    event_time: datetime = Field(default_factory=time_now, sa_type=ISODateTime, index=True)
    card_number: str = Field(default="", index=True)
    member_id: int | None = Field(default=None, index=True)
    member_name: str = Field(default="Unknown", index=True)
    department: str = Field(default="", index=True)
    door_id: int | None = Field(default=None, index=True)
    door_name: str = Field(default="Unknown Door", index=True)
    from_zone_id: int | None = Field(default=None, index=True)
    from_zone_name: str = Field(default="", index=True)
    to_zone_id: int | None = Field(default=None, index=True)
    to_zone_name: str = Field(default="", index=True)
    direction: str = Field(default="IN", index=True)  # IN, OUT
    result: str = Field(default="GRANTED", index=True)  # GRANTED, DENIED, EXPIRED, UNREGISTERED, OUT_OF_SCHEDULE
    reason: str = Field(default="Access Granted")
    event_type: str = Field(default="CARD_SWIPE", index=True)  # CARD_SWIPE, REMOTE_OPEN, MANUAL_BUTTON, ALARM, FACE_RECOGNITION
    snapshot_url: str = Field(default="")
    confidence_score: float | None = Field(default=None)  # Face similarity score (0.00 - 1.00)
    reader_id: str = Field(default="")
    credential_type: str = Field(default="RFID", index=True)  # RFID, MOBILE_BLE, MOBILE_NFC, FINGERPRINT, FACE, PIN, REMOTE, MANUAL
    credential_identifier: str = Field(default="", index=True)


class _DynamicModelMap(dict):
    """
    Dynamic dictionary that automatically discovers any SQLModel table class
    by ClassName, lowercase, and table_name on demand.
    """

    def _discover(self, key: str):
        if not key or not isinstance(key, str):
            return None
        k_lower = key.lower()
        for cls in SQLModel.__subclasses__():
            t_name = getattr(cls, "__tablename__", None)
            if t_name and (
                key == cls.__name__
                or k_lower == cls.__name__.lower()
                or key == t_name
                or k_lower == t_name.lower()
            ):
                self[cls.__name__] = cls
                self[cls.__name__.lower()] = cls
                self[t_name] = cls
                self[t_name.lower()] = cls
                return cls
        return None

    def get(self, key, default=None):
        if super().__contains__(key):
            return super().get(key)
        discovered = self._discover(key)
        return discovered if discovered is not None else default

    def __getitem__(self, key):
        val = self.get(key)
        if val is None:
            raise KeyError(key)
        return val

    def __contains__(self, key):
        return super().__contains__(key) or (self._discover(key) is not None)


MODEL_MAP = _DynamicModelMap(
    {
        "App_Configurations": App_Configurations,
        "System_User_Type": System_User_Type,
        "system_user_type": System_User_Type,
        "System_Users": System_Users,
        "system_users": System_Users,
        "Sample_Item": Sample_Item,
        "sample_item": Sample_Item,
        "Access_Door": Access_Door,
        "access_door": Access_Door,
        "Access_Group": Access_Group,
        "access_group": Access_Group,
        "Access_Member": Access_Member,
        "access_member": Access_Member,
        "Access_Card": Access_Card,
        "access_card": Access_Card,
        "Member_RFID_Card": Access_Card,
        "member_rfid_card": Access_Card,
        "Member_Mobile_Credential": Member_Mobile_Credential,
        "member_mobile_credential": Member_Mobile_Credential,
        "Member_Fingerprint": Member_Fingerprint,
        "member_fingerprint": Member_Fingerprint,
        "Member_Face_Credential": Member_Face_Credential,
        "member_face_credential": Member_Face_Credential,
        "Member_Pin_Credential": Member_Pin_Credential,
        "member_pin_credential": Member_Pin_Credential,
        "Access_Log": Access_Log,
        "access_log": Access_Log,
    }
)


def build_select_expr(specs: list[dict], fallback_model: type[SQLModel] | None = None):
    """Build dynamic column selections for DataTables."""
    selects = []
    for s in specs:
        table = (s.get("table") or "").strip()
        col = (s.get("col") or "").strip()
        model = MODEL_MAP.get(table) or fallback_model
        if not model or not hasattr(model, col):
            continue
        column = getattr(model, col)
        if s.get("name"):
            column = column.label(s["name"])
        selects.append(column)
    if not selects and fallback_model is not None:
        selects = [c.label(c.name) for c in fallback_model.__table__.c]
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


def build_order_by_expr(order_by: dict, fallback_model: type[SQLModel] | None = None):
    """Build dynamic ORDER BY expression for DataTables."""
    if not order_by:
        return None
    table = (order_by.get("table") or "").strip()
    col = (order_by.get("col") or "").strip()
    direction = (order_by.get("dir") or "asc").strip().lower()
    model = MODEL_MAP.get(table) or fallback_model
    if not model or not hasattr(model, col):
        return None
    order_col = getattr(model, col)
    return order_col.asc() if direction == "asc" else order_col.desc()
