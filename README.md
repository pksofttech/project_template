# 🛡️ PKS Access Control Management System

ระบบบริหารจัดการการเข้า-ออก (Access Control Management), ไม้กั้นรถยนต์ (Barrier Gates), ประตูคีย์การ์ด (Doors & Turnstiles), บัตร RFID, สมาชิก/ผู้ถือบัตร (Cardholders) และประวัติบันทึกการเข้า-ออก (Audit Logs) ระดับ Production มาตรฐาน PKS V5

พัฒนาด้วย **Python 3.12+**, **FastAPI**, **SQLModel (Async SQLite)**, **Tailwind CSS v4** และ **DaisyUI v5**

---

## 🌟 จุดเด่นและฟังก์ชันหลักของระบบ (Core Features)

1. **ระบบตรวจสอบและอนุมัติการเข้า-ออกอัตโนมัติ (Automated Access Verification & Webhook API)**:
   - รองรับ Webhook API `POST /api/access/event/swipe` สำหรับเชื่อมต่อเครื่องอ่านบัตร RFID / คอนโทรลเลอร์ภายนอก
   - ตรวจสอบความถูกต้องของบัตร, สถานะการใช้งาน, วันหมดอายุ, สิทธิ์เข้าถึงประตู และช่วงเวลาที่อนุญาต (Timezone Schedule)
   - ปลดล็อกประตูอัตโนมัติ (Relay Pulse) เมื่อได้รับสิทธิ์ (GRANTED) และบันทึกลงฐานข้อมูล
2. **หน้าจอมอนิเตอร์สดแบบเรียลไทม์ (Live Monitor Room with Real-time SSE)**:
   - แสดงผลสดทันทีเมื่อมีการทาบบัตรผ่าน **Server-Sent Events (`/sse`)** โดยไม่ต้องรีเฟรชหน้าจอ
   - Spotlight Card ขนาดใหญ่แสดงรูปถ่าย, ชื่อผู้ถือบัตร, แผนก, ประตู, ทิศทาง (เข้า/ออก) พร้อมแถบสีสถานะ (เขียว=ผ่าน / แดง=ปฏิเสธ)
   - มีปุ่มสั่งเปิดประตูหรือยกไม้กั้นระยะไกล (Remote Door Unlock)
   - มีคอนโซลจำลองการทาบบัตร (Simulator) สำหรับทดสอบระบบได้ทันที
3. **จัดการข้อมูลบัตร, สมาชิก, ประตู และกลุ่มสิทธิ์ครบวงจร (Full CRUD Management)**:
   - **Doors & Gates (`/doors`)**: กำหนดจุดควบคุม, ประเภทประตู/ไม้กั้น, IP Controller, เวลา Relay (วินาที)
   - **Cardholders (`/members`)**: จัดการข้อมูลบุคคล, พนักงาน, ผู้มาติดต่อ, สังกัดแผนก, และกำหนดกลุ่มสิทธิ์
   - **Access Cards (`/cards`)**: จัดการเลขบัตร RFID (125KHz, Mifare, UHF), บัตรสูญหาย, บล็อกบัตร
   - **Access Groups (`/access_groups`)**: กำหนดช่วงเวลา (Time Window), วันในสัปดาห์ (Mon-Sun), และประตูที่อนุญาต
4. **บันทึกประวัติการเข้า-ออก (Access Event Logs & Analytics)**:
   - หน้าจอประวัติการเข้า-ออก (`/access_logs`) พร้อม DataTables Server-Side ค้นหาได้ทุกคอลัมน์
   - ส่งออกข้อมูลเป็น Excel (.xlsx) และ CSV พร้อมรองรับภาษาไทย
   - แดชบอร์ดสรุปสถิติ (`/dashboard`) พร้อมกราฟสถิติการเข้า-ออกตลอด 24 ชั่วโมง
5. **Async SQLite Engine + Safe Auto-Migration**:
   - ปรับแต่ง SQLite PRAGMAs ระดับโปรดักชัน (`WAL mode`, `busy_timeout=30s`, `synchronous=NORMAL`, 20MB cache)
   - มีระบบ **`sqlite_auto_migrate_async`** ปรับแก้โครงสร้างตารางอัตโนมัติ
   - ระบบสำรองฐานข้อมูลออนไลน์แบบไม่ล็อกตาราง (SQLite Hot Backup Service)

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

## 🗺️ แผนการพัฒนาต่อยอด (Future Roadmap)

ดูรายการฟังก์ชันและระบบที่รอการพัฒนาเพิ่มเติมได้ที่เอกสาร:  
👉 **[`TODO_IMPROVEMENTS.md`](TODO_IMPROVEMENTS.md)** (ครอบคลุม Security Policy 2FA UI, Visitor Management VMS, Time & Attendance HR, Hardware Adapters Hikvision/ZKTeco และอื่นๆ)

---

## 📜 ลิขสิทธิ์ (License)
© 2026 PKS Softtech. All rights reserved.
