# 🚀 PKS Modern FastAPI & DaisyUI Project Template (Starter Kit)

เทมเพลตตั้งต้นสำหรับพัฒนาเว็บแอปพลิเคชัน, ระบบบริหารจัดการ (Management System), ระบบควบคุมฮาร์ดแวร์/IoT และ REST API ระดับ Production มาตรฐาน PKS V5 

พัฒนาด้วย **Python 3.12+**, **FastAPI**, **SQLModel (Async SQLite)**, **Tailwind CSS v4** และ **DaisyUI v5**

---

## 🌟 จุดเด่นของ Template (Core Features)

1. **Production-Ready Logging & Timezone Standard (`app/stdio.py`)**:
   - บันทึกเวลาแบบ **Timezone-Aware GMT+7 (`Asia/Bangkok`)** ผ่านฟังก์ชัน `time_now()` และ `parse_datetime_bkk()`
   - จัดเก็บข้อมูลเวลาใน SQLite ด้วยฟอร์แมตมาตรฐาน ISO 8601 ผ่าน `ISODateTime` TypeDecorator
   - ระบบ Console Log สวยงามมีสีสัน พร้อมบันทึกไฟล์หมุนเวียนอัตโนมัติ `logs/app.log` (10MB x 5 backups)
2. **Async SQLite Engine + Safe Auto-Migration**:
   - ปรับแต่ง SQLite PRAGMAs ระดับโปรดักชัน (`WAL mode`, `busy_timeout=30s`, `synchronous=NORMAL`, 20MB cache)
   - มีระบบ **`sqlite_auto_migrate_async`** ปรับแก้โครงสร้างตารางและคอลัมน์อัตโนมัติเมื่อแก้ไข `models.py` โดยไม่ต้องพึ่ง Alembic
   - ระบบสำรองฐานข้อมูลออนไลน์แบบไม่ล็อกตาราง (SQLite Hot Backup Service)
3. **DataTables Server-Side Engine & Streaming Excel Export**:
   - รองรับการแบ่งหน้า (Pagination), ค้นหาหลายคอลัมน์ (Multi-column Search) และเรียงลำดับ (Sorting) ผ่าน Server-side ใน [`app/core/utility.py`](app/core/utility.py)
   - ส่งออกข้อมูลเป็น Excel (.xlsx) และ CSV พร้อม UTF-8 BOM สำหรับภาษาไทยได้ทันที
4. **Modern UI/UX with DaisyUI v5 & Tailwind CSS v4**:
   - หน้าจอ Responsive พร้อมใช้งาน: Login, Dashboard สถิติ, CRUD Manager, System Settings
   - คอมโพเนนต์มาตรฐาน **`<!-- Premium Header Card -->`** ปรับแต่งได้ตามหน้าจอ
5. **Real-time Server-Sent Events (SSE)**:
   - รองรับการ Broadcast ข้อความหรือแจ้งเตือนแบบเรียลไทม์ผ่าน `/sse`
6. **Authentication & Security**:
   - เข้ารหัสรหัสผ่านด้วย **Argon2 / Passlib**
   - ยืนยันตัวตนด้วย **JWT Bearer Token** และ HTTP-only Cookie

---

## 📁 โครงสร้างโปรเจกต์ (Directory Structure)

```text
PROJECT_NAME/
├── .agents/                    # AI Agent Skills (fastapi, sqlmodel, daisyui, i18n)
├── app/
│   ├── core/
│   │   ├── auth.py             # ระบบ JWT, Argon2 Password Hash, Role Permission
│   │   ├── backup_service.py   # SQLite Online Hot Backup & Auto-restore
│   │   ├── database.py         # Async SQLite Engine, WAL PRAGMA, Session Factory
│   │   ├── database_init.py    # Auto-seed admin user, default configs, sample data
│   │   ├── dependencies.py     # FastAPI Dependencies (AsyncDbDep, JWTDep, SystemUserDep)
│   │   ├── models.py           # Data Models (ISODateTime, App_Configurations, Sample_Item)
│   │   ├── sqlite_migrator.py  # Zero-config SQLite Schema Auto-Migrator
│   │   └── utility.py          # DataTables parser, Excel streaming, SSE broadcast
│   ├── module/                 # โฟลเดอร์สำหรับ Business Logic ประจำโปรเจกต์
│   ├── routes/
│   │   ├── api_health.py       # Health Check & Uptime Monitoring API
│   │   ├── api_upload.py       # Generic Image & File Upload API
│   │   ├── api_sample.py       # Boilerplate DataTables & CRUD API
│   │   ├── api_system_config.py# System Configurations API
│   │   ├── api_system_user.py  # User Profile & Login API
│   │   └── views.py            # Jinja2 Frontend View Routers
│   ├── config_app.py           # App Configuration & .env loader
│   ├── stdio.py                # Logging & GMT+7 Timezone Helpers
│   └── main.py                 # FastAPI Application Entrypoint & Lifespan
├── database/                   # ที่เก็บไฟล์ database.db (สร้างอัตโนมัติ)
├── logs/                       # ที่เก็บไฟล์ app.log (สร้างอัตโนมัติ)
├── static/                     # CSS, JS, Fonts, Plugins (DataTables, FontAwesome, Flatpickr)
├── templates/                  # Jinja2 HTML Templates & Partials
├── tests/                      # Automated Integration & Unit Tests
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── ruff.toml
├── run_tests.py                # คำสั่งรัน Automated Test Suite แบบเร็ว
└── start_server.py             # สคริปต์รันเซิร์ฟเวอร์ CLI (--dev, --prod, --port)
```

---

## 🛠️ ขั้นตอนการนำ Template ไปสร้างโปรเจกต์ใหม่ (How to Use)

### 1. คัดลอก Template ไปยังโฟลเดอร์งานใหม่
```bash
# คัดลอกทั้งโฟลเดอร์ไปยังชื่อโปรเจกต์ใหม่ที่คุณต้องการ
cp -r project_template /path/to/my_new_project
cd /path/to/my_new_project
```

### 2. ติดตั้งสภาพแวดล้อม (Setup Virtual Environment)
```bash
python3 -m venv venv
source venv/bin/activate    # Linux / macOS
# หรือ venv\Scripts\activate # สำหรับ Windows

pip install -r requirements.txt
```

### 3. ปรับแต่งค่าของระบบ (Configuration)
- เปิดไฟล์ `app/config_app.py` แล้วเปลี่ยนชื่อ `APP_NAME` และ `APP_TITLE`
- ตรวจสอบความปลอดภัย: เปลี่ยน `JWT_SECRET_KEY` สำหรับใช้งานจริงบน Production

### 4. สตาร์ทเซิร์ฟเวอร์ (Run Server)
```bash
# รันในโหมด Development (มี Auto-reload เมื่อแก้ไฟล์)
python3 start_server.py --dev

# หรือรันในโหมด Production
python3 start_server.py --port 8000 --workers 1
```

- **URL เข้าใช้งาน**: `http://localhost:8000`
- **Interactive API Documentation (Swagger)**: `http://localhost:8000/docs`
- **บัญชีเข้าสู่ระบบเริ่มต้น (Default User Accounts)**:
  - รหัสผ่านเริ่มต้นสำหรับทุกบัญชี: `12341234`
  - `system` : สิทธิ์ **ROOT** (สิทธิสูงสุด เข้าถึงได้ทุกส่วน)
  - `admin` : สิทธิ์ **ADMIN** (ผู้ดูแลระบบทั่วไป)
  - `account` : สิทธิ์ **ACCOUNT** (ฝ่ายบัญชี / การเงิน)
  - `operator` : สิทธิ์ **OPERATOR** (เจ้าหน้าที่ปฏิบัติการ)
  - `devices` : สิทธิ์ **DEVICES** (ผู้ดูแลอุปกรณ์และฮาร์ดแวร์)
  - `viewer` : สิทธิ์ **VIEWER** (ดูข้อมูลอย่างเดียว Read-Only)

---

## 💡 แนวทางการต่อยอดสร้างระบบใหม่ (Development Guide)

### 1. การเพิ่ม Data Model ใหม่
เปิด [`app/core/models.py`](app/core/models.py) แล้วประกาศคลาสที่สืบทอดจาก `SQLModel`:
```python
from datetime import datetime
from sqlmodel import Field, SQLModel
from app.stdio import time_now
from app.core.models import ISODateTime

class Product(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    sku: str = Field(unique=True, index=True)
    title: str = Field(index=True)
    price: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=time_now, sa_type=ISODateTime)
```
*ระบบจะสร้างตาราง `product` ลง SQLite และสร้าง Index ให้อัตโนมัติเมื่อรัน `start_server.py`*

### 2. การสร้าง API Router ใหม่
ศึกษาตัวอย่างสมบูรณ์ได้จาก [`app/routes/api_sample.py`](app/routes/api_sample.py):
- ใช้ `AsyncDbDep` สำหรับ Database Session
- ใช้ `get_datatable_select()` สำหรับการรองรับ DataTables ค้นหา/แบ่งหน้าอัตโนมัติ
- นำ router ไป include ใน [`app/main.py`](app/main.py)

### 3. การสร้างหน้า UI ใหม่
ศึกษาตัวอย่างจาก [`templates/sample_manager.html`](templates/sample_manager.html):
- ใช้ชิ้นส่วน `{% include '_header_card.html' %}` เป็นส่วนหัว
- ใช้ DataTables ดึงข้อมูลจาก API Endpoint ฝั่ง Backend
- เพิ่มเมนูไปยัง Sidebar ใน [`templates/_side_menu_bar.html`](templates/_side_menu_bar.html)

---

## 📜 ลิขสิทธิ์ (License)
© 2026 PKS Softtech. All rights reserved.
