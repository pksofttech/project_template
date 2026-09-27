# PKS Access Control Management System

ระบบบริหารการเข้าออก (Physical Access Control System: PACS) สำหรับจัดการสมาชิก บัตรและข้อมูลยืนยันตัวตน ประตู/ไม้กั้น อุปกรณ์อ่านบัตร กลุ่มสิทธิ์ โซน และประวัติการเข้าออก พร้อมหน้าจอมอนิเตอร์สดและ API สำหรับรับ event จากอุปกรณ์ภายนอก

พัฒนาด้วย Python 3.12+, FastAPI, SQLModel/SQLAlchemy แบบ async, SQLite, Jinja2, Tailwind CSS 4 และ daisyUI 5

## ความสามารถหลัก

- ตรวจสอบสิทธิ์จากบัตร RFID, mobile credential (BLE/NFC), PIN, fingerprint และใบหน้า
- กำหนดสิทธิ์ตามกลุ่ม ประตู วัน เวลา วันหมดอายุ และสถานะ credential
- รองรับ 2FA challenge เช่น Card + PIN, Card + Fingerprint และ Card + Face
- ป้องกัน Anti-Passback พร้อมติดตามตำแหน่งและจำนวนคนในแต่ละโซน
- รับ card swipe และ biometric event ผ่าน REST API พร้อมบันทึกผล `GRANTED`/`DENIED`
- Live Monitor ผ่าน Server-Sent Events (SSE), recent-event ticker และ remote unlock trigger
- โหมดฉุกเฉิน Fire Alarm, Global Lockdown, reset สถานะ และ Muster Roll Call
- จัดการสมาชิก บัตร ประตู อุปกรณ์ กลุ่มสิทธิ์ โซน ผู้ใช้ระบบ และ role จากหน้าเว็บ
- Dashboard สรุป KPI และกราฟการเข้าออก 24 ชั่วโมง
- Access Logs แบบ DataTables server side พร้อมค้นหา กรอง เรียงลำดับ และ export Excel/CSV
- แจ้งเตือน LINE, Telegram และ generic webhook สำหรับเหตุฉุกเฉิน duress PIN และการปฏิเสธซ้ำ
- SQLite แบบ WAL, schema auto migration, online hot backup และเก็บวันเวลาแบบ Asia/Bangkok

> Remote unlock ในระบบปัจจุบันสร้าง log และกระจาย event ผ่าน SSE ส่วนการสั่ง relay ที่อุปกรณ์จริงต้องเชื่อม hardware adapter/controller เพิ่มเติม

### Face recognition

ค่าเริ่มต้นใช้ mock engine ที่สร้าง ArcFace-compatible embedding ขนาด 512 มิติ จึงทดลอง flow การลงทะเบียน การระบุตัวบุคคล และหน้า review ได้โดยไม่ต้องติดตั้งโมเดลเพิ่ม หากติดตั้ง `insightface`, `onnxruntime` และ OpenCV ไว้ใน environment ระบบจะพยายามใช้ InsightFace (`buffalo_s`) และ fallback กลับ mock engine เมื่อเริ่มใช้งานไม่ได้

## โครงสร้างโปรเจกต์

```text
.
├── app/
│   ├── core/
│   │   ├── auth.py              # JWT, cookie/Bearer auth และ password hashing
│   │   ├── backup_service.py    # SQLite online backup/restore service
│   │   ├── database.py          # Async engine, sessions, PRAGMA และ config cache
│   │   ├── database_init.py     # สร้างตาราง, migrate และ seed ข้อมูลเริ่มต้น
│   │   ├── dependencies.py      # FastAPI dependencies
│   │   ├── menu_registry.py     # เมนูและ home widget registry
│   │   ├── models.py            # SQLModel models ของระบบ
│   │   ├── sqlite_migrator.py   # SQLite schema auto migration
│   │   └── utility.py           # DataTables, export และ SSE helpers
│   ├── module/
│   │   ├── face_service.py      # InsightFace/mock face engine
│   │   └── notification_service.py
│   ├── routes/                  # REST APIs และ Jinja2 view routes
│   ├── config_app.py            # ค่า config จาก environment
│   ├── main.py                  # FastAPI app, middleware, SSE และ router registration
│   └── stdio.py                 # logging และ Asia/Bangkok datetime helpers
├── database/                    # SQLite database, backup และ migration backup
├── static/                      # CSS, JavaScript, fonts, plugins และ uploads
├── templates/                   # Jinja2 pages และ partials
├── tests/                       # pytest integration tests
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── run_tests.py                 # smoke/integration test runner แบบย่อ
└── start_server.py              # CLI สำหรับเตรียม DB และรัน Uvicorn
```

## เริ่มใช้งานแบบ Local

### 1. สร้าง virtual environment และติดตั้ง dependency

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Windows PowerShell:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. ตั้งค่า environment

```bash
cp .env.example .env
```

ค่าหลักที่ปรับได้:

| ตัวแปร | ค่าเริ่มต้น | รายละเอียด |
| --- | --- | --- |
| `APP_NAME` | `PKS-ACCESS-CONTROL` | ชื่อภายในของแอป |
| `APP_TITLE` | `PKS Access Control Management` | ชื่อที่แสดงและชื่อ OpenAPI |
| `VERSION` | `1.0.0` | เวอร์ชันแอป |
| `DEBUG` | `True` | ใช้กำหนดสถานะ debug/production ใน config |
| `HOST` | `0.0.0.0` | host จาก application config |
| `PORT` | `8000` | port จาก application config |
| `JWT_SECRET_KEY` | development key | secret สำหรับลงนาม JWT ต้องเปลี่ยนก่อนใช้งานจริง |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES` | `10080` | อายุ token เป็นนาที (7 วัน) |
| `DATABASE_URL` | `sqlite+aiosqlite:///./database/database.db` | SQLAlchemy async database URL |
| `DB_DIR` | `./database` | ตำแหน่งฐานข้อมูลเมื่อไม่ได้กำหนด `DATABASE_URL` |

`start_server.py` รับ `--host` และ `--port` จาก command line โดยตรง ค่าใน `.env` เหมาะกับ code ที่อ่าน `AppConfig` หรือการรันผ่านตัวจัดการ process อื่น

### 3. รันเซิร์ฟเวอร์

โหมดพัฒนา พร้อม auto reload:

```bash
python3 start_server.py --dev
```

โหมด production:

```bash
python3 start_server.py --host 0.0.0.0 --port 8000 --workers 1
```

เมื่อเริ่มระบบครั้งแรก แอปจะสร้าง `database/database.db`, สร้าง/ปรับ schema และ seed ข้อมูลตัวอย่างให้อัตโนมัติ

- หน้าเว็บ: <http://localhost:8000>
- Swagger UI: <http://localhost:8000/docs>
- OpenAPI schema: <http://localhost:8000/openapi.json>
- Health check: <http://localhost:8000/api/health>

## บัญชีเริ่มต้น

| Username | Role |
| --- | --- |
| `system` | ROOT |
| `admin` | ADMIN |
| `account` | ACCOUNT |
| `operator` | OPERATOR |
| `devices` | DEVICES |
| `viewer` | VIEWER |

รหัสผ่านเริ่มต้นทุกบัญชีคือ `12341234` ควรเปลี่ยนรหัสผ่านและ `JWT_SECRET_KEY` ทันทีเมื่อใช้กับข้อมูลจริง

## หน้าเว็บหลัก

| Path | หน้าที่ |
| --- | --- |
| `/dashboard` | สถิติและภาพรวมระบบ |
| `/live_monitor` | ติดตาม access event แบบสดและจำลองการทาบบัตร |
| `/access_logs` | ค้นหา กรอง และ export ประวัติ |
| `/members`, `/cards` | จัดการสมาชิกและบัตร |
| `/devices`, `/doors` | จัดการ reader/controller และจุดผ่าน |
| `/access_groups` | จัดการกลุ่มสิทธิ์และตารางเวลา |
| `/zones`, `/zone_presence` | จัดการโซน occupancy และ anti passback |
| `/face_review` | ตรวจสอบ face recognition event และข้อมูลลงทะเบียน |
| `/system_config` | ผู้ใช้ role config backup และ notification |

ทุกหน้าจัดการจะ redirect ไป `/login` หากไม่มี JWT ใน cookie ที่ถูกต้อง

## API ที่ใช้เชื่อมต่อระบบภายนอก

| Method และ path | การใช้งาน |
| --- | --- |
| `POST /api/access/authorizations/card` | ตรวจสอบและอนุมัติการเข้าออกด้วยบัตร |
| `POST /api/access/authorizations/challenge/verify` | ยืนยันปัจจัยที่สองของการอนุมัติสิทธิ์ |
| `POST /api/access/event/mobile-credential` | รับ BLE/NFC credential |
| `POST /api/access/event/fingerprint` | รับ fingerprint event |
| `POST /api/access/event/pin-code` | รับ PIN/keypad event |
| `POST /api/access/event/camera-face` | รับภาพหรือ simulated face event |
| `POST /api/access/event/remote_unlock` | บันทึกและ broadcast คำสั่งเปิดประตู |
| `GET /sse` | subscribe event stream |
| `GET /api/health` | ตรวจสุขภาพแอป ฐานข้อมูล และ resource usage |
| `GET /api/access/log/datatable` | อ่าน/กรอง/export access logs |
| `GET/POST /api/access/emergency/*` | อ่านและควบคุม emergency mode |

รายละเอียด request/response ล่าสุดดูได้จาก Swagger UI ที่ `/docs`

## Docker Compose

```bash
docker compose up --build -d
docker compose logs -f app
```

Compose เปิด port `8000` และ mount `database/`, `logs/` และ `static/uploads/` ออกจาก container เพื่อเก็บข้อมูลข้ามการ restart ตรวจสถานะได้ด้วย:

```bash
curl http://localhost:8000/api/health
```

## ทดสอบและตรวจคุณภาพโค้ด

รัน test suite ทั้งหมด:

```bash
pytest -q
```

รัน smoke/integration checks แบบย่อ:

```bash
python3 run_tests.py
```

ตรวจ lint ตามค่าใน `ruff.toml`:

```bash
ruff check .
```

การทดสอบมีการเขียนข้อมูลลง SQLite ที่ตั้งค่าไว้ ควรใช้ `DATABASE_URL` ที่ชี้ไปยังฐานข้อมูลสำหรับทดสอบเมื่อไม่ต้องการแก้ข้อมูล development

## พัฒนา frontend

ไฟล์ CSS หลักถูก build ไว้ที่ `static/style.css` หากแก้ `main.css` ให้เปิด Tailwind watch mode ในอีก terminal:

```bash
npx @tailwindcss/cli -i ./main.css -o ./static/style.css --watch
```

JavaScript หลักของแต่ละหน้าอยู่ใน `static/js/` และข้อความหลายภาษาอยู่ใน `static/js/locales_*.js`

## ฐานข้อมูลและข้อมูลเริ่มต้น

- ใช้ SQLite async ผ่าน `sqlite+aiosqlite`
- เปิด `WAL`, `foreign_keys`, `busy_timeout=30s`, memory temp store และ cache 20 MB
- `database_init_default()` สร้างตาราง ทำ additive schema migration และ seed ผู้ใช้ role config รวมถึงข้อมูล access control สำหรับทดลอง
- วันเวลาบันทึกเป็น ISO 8601 พร้อม timezone Asia/Bangkok ผ่าน `ISODateTime`
- สร้าง hot backup แบบ gzip ได้จากหน้า System Config หรือ `POST /api/system_config/backup/create`; เก็บไว้ใน `database/backups/`

ก่อนเปลี่ยน model ใน production ควรสำรองฐานข้อมูลก่อน แม้ระบบจะมี schema auto migration เพราะ migrator เหมาะกับการเพิ่มหรือปรับโครงสร้างพื้นฐาน และไม่ได้แทน data migration ที่ซับซ้อน

## แนวทางเพิ่มโมดูล

1. เพิ่ม SQLModel ใน `app/core/models.py`
2. เพิ่ม Pydantic request schema และ router ใน `app/routes/`
3. register router ใน `app/main.py`
4. เพิ่ม Jinja2 template ใน `templates/` และ JavaScript ใน `static/js/`
5. เพิ่มเมนูและสิทธิ์ใน `app/core/menu_registry.py`
6. เพิ่มข้อความแปลใน locale files และ `i18n_key.txt`
7. เพิ่ม integration test ใน `tests/`

ดูงานที่วางแผนไว้ต่อได้ใน [TODO_IMPROVEMENTS.md](TODO_IMPROVEMENTS.md)

## License

© 2026 PKS Softtech. All rights reserved.
