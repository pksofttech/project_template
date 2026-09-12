# 📋 PKS Access Control Management — รายการระบบที่ต้องปรับปรุงเพิ่มเติม (Improvement Roadmap & Backlog)

เอกสารนี้รวบรวมแผนงาน ระบบ และฟังก์ชันที่ต้องพัฒนาต่อยอดจากระบบหลัก เพื่อยกระดับความสามารถสู่ระดับ **Enterprise PACS (Physical Access Control System)**

---

## 🏁 สรุปสถานะระบบปัจจุบัน (Current Progress)

| สถานะ | ระบบ / ส่วนงาน | รายละเอียด |
| :--- | :--- | :--- |
| ✅ **เสร็จสมบูรณ์** | **Core Access Control Engine** | จัดการจุดควบคุม (Doors/Gates), สมาชิก (Members), บัตร RFID, กลุ่มสิทธิ์ (Access Groups), แดชบอร์ดสถิติ และประวัติบันทึกการเข้า-ออก (Access Logs) |
| ✅ **เสร็จสมบูรณ์** | **Advanced Access & Biometrics** | Multi-Factor Authentication (2FA Engine), Anti-Passback (APB), โซนและความจุพื้นที่ (Zone Presence & Occupancy Limits), สแกนใบหน้า (Face Recognition), Mobile Credentials (BLE/NFC) และ Keypad PINs |
| ✅ **เสร็จสมบูรณ์** | **Hardware Ingest & Devices Architecture** | แยกโครงสร้าง `Access_Device` (อุปกรณ์อ่าน/คอนโทรลเลอร์) และ `Access_Door` (จุดผ่าน/ไม้กั้น), ตารางจัดการฮาร์ดแวร์ (`devices_manager.html`), Heartbeat Ping, Remote Relay Pulse |
| ✅ **เสร็จสมบูรณ์** | **Phase 1: Life Safety Emergency Protocols** | ระบบอพยพหนีไฟ (Fire Alarm Evacuation - ปลดล็อกทุกประตู), ระบบล็อกดาวน์สกัดกั้นภัยคุกคาม (Global Facility Lockdown), ป้ายแจ้งเตือน Real-time SSE และนาฬิกาจับเวลาเหตุการณ์ฉุกเฉินทุกหน้า |
| ✅ **เสร็จสมบูรณ์** | **Phase 2: Multi-Channel Alert & Notification Hub** | สัญญาณเตือนภัยตัวประกันเงียบ (Silent Duress PIN), แจ้งเตือนเหตุฉุกเฉินและบุกรุกผ่าน LINE (Notify & Messaging API), Telegram Bot API, Generic Webhook (SIEM/Discord/Slack), หน้า UI จัดการ Token และปุ่มทดสอบส่งข้อความ (`system_config.html`) |

---

## 📌 แผนการพัฒนาระบบเพิ่มเติม (Pending Tasks & Backlog)

### 🥇 ลำดับที่ 1: Security Policy & 2FA Door Configuration UI
* **ความสำคัญ**: 🔴 สูง (High Priority)
* **ความซับซ้อน**: 🟨 ปานกลาง (2-3 วัน)
* **สถานะปัจจุบัน**: โครงสร้างตาราง (`Access_Security_Policy`, `Access_Door_Policy`, `Access_Verification_Session`) และ Logic การยืนยันตัวตน 2FA ใน `api_access_event.py` มีอยู่แล้วในระบบ Backend
* **สิ่งที่ต้องพัฒนาเพิ่ม**:
  1. สร้างหน้า UI หรือแท็บตั้งค่าใน [`access_groups.html`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_ACCESS/templates/access_groups.html) หรือ [`doors_manager.html`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_ACCESS/templates/devices_manager.html) เพื่อผูกนโยบายความปลอดภัยเข้ากับประตู
  2. ฟอร์มเลือกรูปแบบการยืนยันตัวตน:
     - `CARD_AND_PIN` (ทาบบัตร + กดรหัส)
     - `CARD_AND_FINGERPRINT` (ทาบบัตร + สแกนลายนิ้วมือ)
     - `CARD_AND_FACE` (ทาบบัตร + สแกนใบหน้า)
     - `ANY_SINGLE` (ใช้อย่างใดอย่างหนึ่ง)
  3. การกำหนดเงื่อนไขตามช่วงเวลา (Schedule Window) เช่น บังคับใช้ 2FA เฉพาะเวลานอกทำการ (18:00 - 08:00 น. และวันหยุดสุดสัปดาห์)
  4. ตั้งค่า Inter-Factor Timeout (เวลานับถอยหลังในการป้อนปัจจัยที่ 2 เช่น 15 วินาที)

---

### 🥈 ลำดับที่ 2: Visitor Management System (VMS + Dynamic QR Pass)
* **ความสำคัญ**: 🟡 ปานกลาง (Medium Priority)
* **ความซับซ้อน**: 🟨 ปานกลาง (3-4 วัน)
* **เป้าหมาย**: บริหารจัดการผู้มาติดต่อ (Guests, Contractors, Delivery) แบบไร้สัมผัสและปลอดภัย
* **ฟังก์ชันที่ต้องพัฒนา**:
  1. **Pre-Registration Web Portal**: ผู้มาติดต่อหรือเจ้าหน้าที่ผู้ต้อนรับ (Host) กรอกข้อมูลล่วงหน้า (ชื่อ, ทะเบียนรถ, วัตถุประสงค์, ภาพถ่ายบัตรประชาชน)
  2. **Dynamic QR Code e-Pass**: ออก QR Code แบบมีอายุจำกัด (Time-Bound & One-Time Pass) ส่งเข้า SMS / LINE / Email ของผู้มาติดต่อ เพื่อใช้สแกนผ่านไม้กั้นหรือ Speed Gate
  3. **Host Notification & Approval**: แจ้งเตือนผู้รับการมาติดต่อผ่าน LINE ทันทีเมื่อแขกมาถึงและสแกนเข้าอาคาร
  4. **Automated Checkout & Overstay Alarm**: ตรวจจับและแจ้งเตือน รปภ. หากผู้มาติดต่ออยู่ในอาคารเกินเวลาที่ได้รับอนุญาต

---

### 🥉 ลำดับที่ 3: Time & Attendance Engine (การคำนวณเวลาทำงานและกะ HR)
* **ความสำคัญ**: 🟡 ปานกลาง (Business Value สูงสำหรับ HR)
* **ความซับซ้อน**: 🟧 ปานกลาง-สูง (4-5 วัน)
* **เป้าหมาย**: ต่อยอดจากข้อมูลการทาบบัตรเข้า-ออก (`Access_Log`) สู่ระบบประมวลผลเวลาทำงาน
* **ฟังก์ชันที่ต้องพัฒนา**:
  1. **Work Shift Management**: สร้างระบบกำหนดกะการทำงาน (กะเช้า, กะดึก, กะยืดหยุ่น Flexible Hours, กะข้ามคืน)
  2. **Attendance Calculation Worker**: ประมวลผลเวลาทาบบัตรแรกของวัน (First In) และทาบบัตรสุดท้าย (Last Out) เพื่อคำนวณ:
     - เวลามาสาย (Late Arrival Minutes)
     - เวลากลับก่อน (Early Departure Minutes)
     - การขาดงาน / ลืมทาบบัตร (Absent / Missing Swipes)
     - ชั่วโมงล่วงเวลา (Overtime - OT)
  3. **HR Export & Payroll Integration**: ส่งออกรายงานสรุปเวลาทำงานรายบุคคล/รายแผนกเป็น Excel (.xlsx) และ Text File ตามฟอร์แมตโปรแกรมเงินเดือนชั้นนำ (เช่น Bplus, TigerSoft, PayDay)

---

### 🎖️ ลำดับที่ 4: Hardware Ingest Adapters & Controller Protocols
* **ความสำคัญ**: 🟡 ปานกลาง (Hardware Compatibility)
* **ความซับซ้อน**: 🟨 ปานกลาง (3 วัน)
* **เป้าหมาย**: รองรับการเชื่อมต่อกับอุปกรณ์แบรนด์ชั้นนำในตลาดได้โดยตรงโดยไม่ต้องแปลงข้อมูล
* **โปรโตคอลและอะแดปเตอร์ที่ต้องพัฒนา**:
  1. **Hikvision ISAPI / Face Terminal Listener**: อะแดปเตอร์รับ HTTP Notification Event และส่งรูปถ่ายหน้าคนจากกล้องตรวจจับใบหน้า Hikvision MinMoe เข้าสู่ PACS อัตโนมัติ
  2. **ZKTeco Push SDK / ADMS Receiver**: จำลอง ADMS Push Server รับข้อมูลจากเครื่องสแกนนิ้วมือและหน้าจอ ZKTeco
  3. **ESP32 Wiegand-to-MQTT Gateway**: รองรับบอร์ดไมโครคอนโทรลเลอร์ ESP32 ที่แปลงสัญญาณ Wiegand 26/34 จากหัวอ่าน RFID ทั่วไป ส่งข้อมูลผ่าน MQTT Broker
  4. **Bi-directional Device Sync Engine**: ซิงค์รายชื่อพนักงาน บัตร RFID และ Face Embedding ลงหน่วยความจำของเครื่องอ่าน เพื่อให้เครื่องเปิดประตูได้แม้อยู่ในโหมด Offline (Local Decision)

---

### 🛡️ ลำดับที่ 5: Anti-Passback "Forgive" Tool & Soft APB Policy
* **ความสำคัญ**: 🟢 เสริมประสิทธิภาพ (Quality of Life)
* **ความซับซ้อน**: 🟩 ต่ำ-ปานกลาง (1 วัน)
* **ฟังก์ชันที่ต้องพัฒนา**:
  1. **Soft Anti-Passback Mode**: ตัวเลือกสลับระหว่าง Hard APB (ปฏิเสธและไม่เปิดประตู) กับ Soft APB (ยอมให้เข้าเพื่อความคล่องตัว แต่บันทึก Flag เป็น Violation และส่งสัญญาณแจ้งเตือนไปยังห้องควบคุม)
  2. **Operator Forgive Console**: ปุ่มสั่งปลดสถานะติด APB ในหน้า [`zone_presence.html`](file:///home/pksofttech/MEGAsync/PKS_Python/PKS_MANAGMENT_ACCESS/templates/zone_presence.html) สำหรับเจ้าหน้าที่รักษาความปลอดภัย เพื่อเคลียร์สถานะของบุคคลที่ติด APB จากการเดินตามกัน (Tailgating)
  3. **Global Zone Reset**: สั่งรีเซ็ตสถานะทุกคนให้ออกนอกพื้นที่เมื่อสิ้นสุดวันหรือหลังการซ้อมดับเพลิง

---

### 🗄️ ลำดับที่ 6: Automated Database Archiving & Log Partitioning
* **ความสำคัญ**: 🟢 เสริมความเสถียรระยะยาว (Long-Term Maintenance)
* **ความซับซ้อน**: 🟩 ต่ำ-ปานกลาง (1-2 วัน)
* **เป้าหมาย**: ป้องกันไม่ให้ตาราง `Access_Log` ใน SQLite บวมเกินไปเมื่อใช้งานต่อเนื่องหลายปี
* **ฟังก์ชันที่ต้องพัฒนา**:
  1. **Log Archiving Routine**: สคริปต์ Background Worker หรือ Cron สำหรับย้ายประวัติที่เก่ากว่า 90 หรือ 180 วัน ไปยังฐานข้อมูลประวัติแยกรายปี (`access_archive_2026.db`)
  2. **Archive Log Viewer**: หน้าสำหรับค้นหาและเรียกดูประวัติเก่าจากไฟล์ Archive โดยไม่กระทบความเร็วของระบบ Transaction หลัก
  3. **Automated VACUUM & Integrity Check Schedule**: รันคำสั่งบำรุงรักษาพื้นที่ดิสก์และตรวจสอบความสมบูรณ์ของไฟล์ SQLite ตามรอบเวลาอัตโนมัติ

---

### 👤 ลำดับที่ 7: System Operator Audit Trail Viewer
* **ความสำคัญ**: 🟢 ตรวจสอบความโปร่งใส (Compliance & Audit)
* **ความซับซ้อน**: 🟩 ต่ำ (1 วัน)
* **เป้าหมาย**: บันทึกและแสดงผลประวัติการกระทำของผู้ดูแลระบบทั้งหมด
* **ฟังก์ชันที่ต้องพัฒนา**:
  1. ตารางบันทึก `System_Audit_Log` (ผู้ใช้งาน, วันเวลา, การกระทำ เช่น สร้างบัตร, แก้ไขสิทธิ์, ปลดล็อกฉุกเฉิน, เปลี่ยนรหัสผ่าน, เปลี่ยนการตั้งค่า)
  2. หน้าจอ UI สำหรับค้นหาและตรวจสอบประวัติการแก้ไขระบบ (Who, What, When, Old Value vs New Value)

---

## 🛠️ รายการไฟล์ที่เกี่ยวข้องเมื่อเริ่มพัฒนาระบบข้างต้น

```text
app/
├── core/
│   ├── models.py                # เพิ่ม Model สำหรับ Visitor, Shifts, Audit Trail
│   └── menu_registry.py         # ลงทะเบียนเมนูหน้าใหม่ในแถบข้าง
├── routes/
│   ├── api_access_policy.py     # Router สำหรับ Security Policy UI
│   ├── api_visitor.py           # Router สำหรับ VMS & QR Pass
│   ├── api_attendance.py        # Router สำหรับคำนวณเวลางาน & HR Export
│   └── api_device_adapter.py    # Receiver สำหรับ Hikvision / ZKTeco / MQTT
templates/
├── access_policies.html         # หน้า UI จัดการนโยบาย 2FA ตามช่วงเวลา
├── visitors_manager.html        # หน้า UI จัดการผู้มาติดต่อและออกบัตร QR Pass
└── attendance_manager.html      # หน้า UI ตรวจสอบเวลาทำงานและส่งออกเงินเดือน
static/js/
├── access_policies.js
├── visitors_manager.js
└── attendance_manager.js
```

---
*บันทึกเมื่อ: 2026-09-12*  
*โปรเจกต์: PKS Access Control Management (PACS) V5*
