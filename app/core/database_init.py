"""Database Initialization and Default Data Seeding."""

from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import get_password_hash
from app.core.database import async_engine
from app.core.models import (
    Access_Card,
    Access_Device,
    Access_Door,
    Access_Door_Policy,
    Access_Group,
    Access_Log,
    Access_Member,
    Access_Security_Policy,
    Access_Verification_Session,
    Access_Zone,
    App_Configurations,
    Member_Face_Credential,
    Member_Fingerprint,
    Member_Mobile_Credential,
    Member_Pin_Credential,
    Sample_Item,
    System_User_Type,
    System_Users,
)
from app.core.sqlite_migrator import sqlite_auto_migrate_async
from app.stdio import print_debug, print_error, print_success, time_now


async def database_init_default():
    """Initialize database tables, run schema migrations, and seed default records."""
    print_debug("🛠️ Starting Database Initialization...")

    # 1. Create tables if they do not exist
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

        # 2. Run SQLite auto migration for each model table
        for table in SQLModel.metadata.tables.values():
            await sqlite_auto_migrate_async(conn, table)

    # 3. Seed Default Configurations & Admin User
    async with AsyncSession(async_engine) as session:
        try:
            # Seed Default Configurations
            default_configs = [
                ("app_title", "PKS Access Control Management", "System display title"),
                ("app_description", "Access Control, Gate Automation, and RFID Management System", "System description"),
                ("theme", "light", "Default UI theme"),
                ("records_per_page", "10", "Default DataTables row count"),
            ]

            for key, val, desc in default_configs:
                stmt = select(App_Configurations).where(App_Configurations.key == key)
                existing = (await session.exec(stmt)).first()
                if not existing:
                    session.add(App_Configurations(key=key, value=val, description=desc))

            # Seed Default User Types if empty
            user_type_stmt = select(System_User_Type)
            existing_types = (await session.exec(user_type_stmt)).all()
            if not existing_types:
                default_types = [
                    (
                        "ROOT",
                        "สิทธิสูงสุดของระบบ (เข้าถึงทุกโมดูลทุกส่วน)",
                        "system_config,management_system_user,station_config",
                    ),
                    (
                        "ADMIN",
                        "ผู้ดูแลระบบทั่วไป จัดการการตั้งค่าและผู้ใช้",
                        "system_config,management_system_user,station_config",
                    ),
                    ("ACCOUNT", "ฝ่ายบัญชี การเงิน การออกบิล/ชำระเงิน", ""),
                    ("OPERATOR", "เจ้าหน้าที่ปฏิบัติการ", ""),
                    ("DEVICES", "ผู้ดูแลอุปกรณ์ LPR, Gateway, Hardware", ""),
                    ("VIEWER", "บัญชีสำหรับดูข้อมูลอย่างเดียว (Read-Only)", ""),
                ]
                for type_name, desc, perms in default_types:
                    session.add(
                        System_User_Type(
                            user_type=type_name,
                            permission_allowed=perms,
                            description=desc,
                            menu_config="[]",
                            system_config="[]",
                            home_item_config="[]",
                        )
                    )
                await session.flush()
                print_success("✔ Seeded default system_user_types (ROOT, ADMIN, ...)")

            root_type = (await session.exec(select(System_User_Type).where(System_User_Type.user_type == "ROOT"))).first()
            root_id = root_type.id if root_type else 1

            # Fetch all user types
            all_types = (await session.exec(select(System_User_Type))).all()
            type_map = {t.user_type: t for t in all_types}

            # Seed Default User Accounts for every User Type (password 12341234)
            default_accounts = [
                ("system", "System Administrator", "ROOT", "สิทธิสูงสุดของระบบ (เข้าถึงทุกโมดูล)"),
                ("admin", "Administrator", "ADMIN", "ผู้ดูแลระบบทั่วไป จัดการการตั้งค่าและผู้ใช้"),
                ("account", "Accounting Staff", "ACCOUNT", "ฝ่ายบัญชี การเงิน การออกบิล/ชำระเงิน"),
                ("operator", "Operations Officer", "OPERATOR", "เจ้าหน้าที่ปฏิบัติการ"),
                ("devices", "Device Specialist", "DEVICES", "ผู้ดูแลอุปกรณ์ LPR, Gateway, Hardware"),
                ("viewer", "General Viewer", "VIEWER", "บัญชีสำหรับดูข้อมูลอย่างเดียว (Read-Only)"),
            ]

            seeded_type_ids = set()
            for u_name, display_name, target_type, desc in default_accounts:
                target_type_obj = type_map.get(target_type)
                target_type_id = target_type_obj.id if target_type_obj else root_id
                seeded_type_ids.add(target_type_id)

                user_stmt = select(System_Users).where(System_Users.username == u_name)
                existing_user = (await session.exec(user_stmt)).first()
                if not existing_user:
                    new_user = System_Users(
                        username=u_name,
                        password=get_password_hash("12341234"),
                        name=display_name,
                        createDate=time_now(),
                        create_by="system",
                        status="ENABLE",
                        pictureUrl="",
                        remark=desc,
                        system_user_type_id=target_type_id,
                    )
                    session.add(new_user)
                    print_success(f"👤 Seeded default account: {u_name} ({target_type}) / 12341234")
                else:
                    changed = False
                    if not getattr(existing_user, "system_user_type_id", None):
                        existing_user.system_user_type_id = target_type_id
                        changed = True
                    if not getattr(existing_user, "createDate", None):
                        existing_user.createDate = time_now()
                        changed = True
                    if changed:
                        session.add(existing_user)

            # Ensure any custom User Types dynamically have at least one account
            for t in all_types:
                if t.id not in seeded_type_ids:
                    u_exists = (await session.exec(select(System_Users).where(System_Users.system_user_type_id == t.id))).first()
                    if not u_exists:
                        u_name = f"user_{t.user_type.lower()}"
                        new_user = System_Users(
                            username=u_name,
                            password=get_password_hash("12341234"),
                            name=f"{t.user_type.title()} User",
                            createDate=time_now(),
                            create_by="system",
                            status="ENABLE",
                            pictureUrl="",
                            remark=t.description or f"Default account for {t.user_type}",
                            system_user_type_id=t.id,
                        )
                        session.add(new_user)
                        print_success(f"👤 Seeded default account for {t.user_type}: {u_name} / 12341234")

            # Seed Sample Items if empty
            sample_stmt = select(Sample_Item)
            sample_exists = (await session.exec(sample_stmt)).first()
            if not sample_exists:
                samples = [
                    Sample_Item(
                        code="ITM-001",
                        name="Dell XPS 15 Laptop",
                        category="Computers",
                        price=54900.0,
                        quantity=12,
                        status="active",
                        description="High performance developer laptop",
                    ),
                    Sample_Item(
                        code="ITM-002",
                        name="Logitech MX Master 3S",
                        category="Accessories",
                        price=3590.0,
                        quantity=45,
                        status="active",
                        description="Ergonomic wireless mouse",
                    ),
                    Sample_Item(
                        code="ITM-003",
                        name="Keychron Q1 Pro Mechanical Keyboard",
                        category="Accessories",
                        price=6990.0,
                        quantity=20,
                        status="active",
                        description="Wireless custom mechanical keyboard",
                    ),
                    Sample_Item(
                        code="ITM-004",
                        name="Dell UltraSharp 27 4K Monitor",
                        category="Displays",
                        price=21500.0,
                        quantity=8,
                        status="active",
                        description="Color accurate 4K IPS display",
                    ),
                    Sample_Item(
                        code="ITM-005",
                        name="CalDigit TS4 Thunderbolt Dock",
                        category="Accessories",
                        price=14900.0,
                        quantity=15,
                        status="active",
                        description="18-port Thunderbolt 4 dock station",
                    ),
                ]
                session.add_all(samples)
                print_success(f"📦 Seeded {len(samples)} sample items for DataTables preview")

            # 4. Seed Access Zones
            zone_stmt = select(Access_Zone)
            existing_zones = (await session.exec(zone_stmt)).all()
            if not existing_zones:
                default_zones = [
                    Access_Zone(
                        code="ZONE-OUTSIDE",
                        name="Outside Perimeter (ภายนอกโครงการ)",
                        zone_type="OUTSIDE",
                        max_occupancy=0,
                        antipassback_enabled=False,
                        description="Public outdoor area, perimeter, and street gates",
                    ),
                    Access_Zone(
                        code="ZONE-LOBBY",
                        name="Ground Floor Lobby (โถงต้อนรับ ชั้น 1)",
                        zone_type="INTERNAL",
                        max_occupancy=200,
                        antipassback_enabled=True,
                        antipassback_timeout_min=30,
                        description="Main entrance reception and turnstile hall",
                    ),
                    Access_Zone(
                        code="ZONE-OFFICE",
                        name="Office Workspace (สำนักงาน ชั้น 2)",
                        zone_type="INTERNAL",
                        max_occupancy=80,
                        antipassback_enabled=True,
                        antipassback_timeout_min=30,
                        description="General office desks, meeting rooms, and pantry",
                    ),
                    Access_Zone(
                        code="ZONE-SERVER",
                        name="Data Center Server Room (ห้องดาต้าเซ็นเตอร์)",
                        zone_type="HIGH_SECURITY",
                        max_occupancy=5,
                        antipassback_enabled=True,
                        antipassback_timeout_min=60,
                        description="Critical server infrastructure and network racks",
                    ),
                    Access_Zone(
                        code="ZONE-MUSTER",
                        name="Emergency Muster Point A (จุดรวมพลฉุกเฉิน ลาน A)",
                        zone_type="MUSTER_POINT",
                        max_occupancy=0,
                        antipassback_enabled=False,
                        description="Safe assembly area for evacuation and roll call",
                    ),
                ]
                session.add_all(default_zones)
                await session.flush()
                print_success(f"📍 Seeded {len(default_zones)} default access zones")

            # Fetch zone map for doors and members
            all_zones = (await session.exec(select(Access_Zone))).all()
            zone_map = {z.code: z.id for z in all_zones}
            outside_zone_id = zone_map.get("ZONE-OUTSIDE")
            lobby_zone_id = zone_map.get("ZONE-LOBBY")
            office_zone_id = zone_map.get("ZONE-OFFICE")
            server_zone_id = zone_map.get("ZONE-SERVER")

            # 5. Seed Access Doors & Gates
            door_stmt = select(Access_Door)
            existing_doors = (await session.exec(door_stmt)).all()
            if not existing_doors:
                default_doors = [
                    Access_Door(
                        code="DOOR-01",
                        name="Main Entrance Turnstile 1",
                        zone="Building A (Lobby)",
                        from_zone_id=outside_zone_id,
                        to_zone_id=lobby_zone_id,
                        door_type="TURNSTILE",
                        ip_address="192.168.1.101",
                        controller_type="REST_WEBHOOK",
                        direction="IN",
                        relay_time_sec=5,
                        status="ONLINE",
                        description="Lobby pedestrian entrance turnstile",
                    ),
                    Access_Door(
                        code="DOOR-02",
                        name="Main Entrance Turnstile 2",
                        zone="Building A (Lobby)",
                        from_zone_id=lobby_zone_id,
                        to_zone_id=outside_zone_id,
                        door_type="TURNSTILE",
                        ip_address="192.168.1.102",
                        controller_type="REST_WEBHOOK",
                        direction="OUT",
                        relay_time_sec=5,
                        status="ONLINE",
                        description="Lobby pedestrian exit turnstile",
                    ),
                    Access_Door(
                        code="GATE-01",
                        name="North Barrier Gate Entry",
                        zone="North Gate Parking",
                        from_zone_id=outside_zone_id,
                        to_zone_id=lobby_zone_id,
                        door_type="BARRIER_GATE",
                        ip_address="192.168.1.110",
                        controller_type="REST_WEBHOOK",
                        direction="IN",
                        relay_time_sec=8,
                        status="ONLINE",
                        description="Automatic vehicle barrier gate entry",
                    ),
                    Access_Door(
                        code="GATE-02",
                        name="North Barrier Gate Exit",
                        zone="North Gate Parking",
                        from_zone_id=lobby_zone_id,
                        to_zone_id=outside_zone_id,
                        door_type="BARRIER_GATE",
                        ip_address="192.168.1.111",
                        controller_type="REST_WEBHOOK",
                        direction="OUT",
                        relay_time_sec=8,
                        status="ONLINE",
                        description="Automatic vehicle barrier gate exit",
                    ),
                    Access_Door(
                        code="DOOR-03",
                        name="Data Center Server Room",
                        zone="Floor 2 (IT Wing)",
                        from_zone_id=office_zone_id,
                        to_zone_id=server_zone_id,
                        door_type="DOOR",
                        ip_address="192.168.1.120",
                        controller_type="REST_WEBHOOK",
                        direction="BOTH",
                        relay_time_sec=3,
                        status="ONLINE",
                        description="High security server room electromagnetic lock",
                    ),
                ]
                session.add_all(default_doors)
                await session.flush()
                print_success(f"🚪 Seeded {len(default_doors)} default access doors and gates")
            else:
                # Update existing doors with zone references if missing
                for d in existing_doors:
                    if not d.to_zone_id:
                        if d.code in ("DOOR-01", "GATE-01"):
                            d.from_zone_id = outside_zone_id
                            d.to_zone_id = lobby_zone_id
                        elif d.code in ("DOOR-02", "GATE-02"):
                            d.from_zone_id = lobby_zone_id
                            d.to_zone_id = outside_zone_id
                        elif d.code == "DOOR-03":
                            d.from_zone_id = office_zone_id
                            d.to_zone_id = server_zone_id
                        session.add(d)
                await session.flush()

            # 5.1 Seed Security Policies & Devices
            policy_stmt = select(Access_Security_Policy)
            existing_policies = (await session.exec(policy_stmt)).all()
            if not existing_policies:
                default_policies = [
                    Access_Security_Policy(
                        code="POL_NORMAL",
                        name="Standard Single Credential (Any)",
                        verification_mode="ANY_SINGLE",
                        factor_1="CARD",
                        factor_2="NONE",
                        inter_factor_timeout_sec=0,
                        allow_duress_pin=True,
                        description="Access granted via any single valid credential (Card, Face, Mobile, or PIN)",
                    ),
                    Access_Security_Policy(
                        code="POL_STRICT_2FA",
                        name="Card + PIN Strict 2FA",
                        verification_mode="CARD_AND_PIN",
                        factor_1="CARD",
                        factor_2="PIN",
                        inter_factor_timeout_sec=15,
                        allow_duress_pin=True,
                        description="Mandatory 2-Factor Authentication: Swipe card followed by keypad PIN within 15s",
                    ),
                    Access_Security_Policy(
                        code="POL_FACE_2FA",
                        name="Face Recognition + Card Confirmation",
                        verification_mode="FACE_AND_CARD",
                        factor_1="FACE",
                        factor_2="CARD",
                        inter_factor_timeout_sec=15,
                        allow_duress_pin=False,
                        description="Biometric face identification confirmed with physical badge swipe",
                    ),
                ]
                session.add_all(default_policies)
                await session.flush()
                print_success(f"🛡️ Seeded {len(default_policies)} access security policies")

            # Seed Access Devices if empty
            all_doors = (await session.exec(select(Access_Door))).all()
            door_code_map = {d.code: d.id for d in all_doors}

            device_stmt = select(Access_Device)
            existing_devices = (await session.exec(device_stmt)).all()
            if not existing_devices and door_code_map:
                default_devices = []
                # DOOR-01 Devices (Turnstile 1: RFID Reader In + Face AI Terminal In)
                if "DOOR-01" in door_code_map:
                    default_devices.extend([
                        Access_Device(
                            code="DEV-LOBBY-RDR-01",
                            name="Turnstile 1 RFID Reader",
                            door_id=door_code_map["DOOR-01"],
                            device_category="READER",
                            direction="IN",
                            supported_factors='["CARD"]',
                            brand="ZKTeco",
                            model_name="KR602M",
                            status="ONLINE",
                            description="Inbound contactless smartcard reader",
                        ),
                        Access_Device(
                            code="DEV-LOBBY-FACE-01",
                            name="Turnstile 1 Face Recognition Kiosk",
                            door_id=door_code_map["DOOR-01"],
                            device_category="TERMINAL",
                            direction="IN",
                            supported_factors='["FACE", "CARD"]',
                            ip_address="192.168.1.201",
                            brand="Hikvision",
                            model_name="DS-K1T671",
                            status="ONLINE",
                            description="AI Camera kiosk with ArcFace biometric recognition",
                        ),
                    ])

                # DOOR-02 Devices (Turnstile 2: RFID Reader Out)
                if "DOOR-02" in door_code_map:
                    default_devices.append(
                        Access_Device(
                            code="DEV-LOBBY-RDR-02",
                            name="Turnstile 2 RFID Reader",
                            door_id=door_code_map["DOOR-02"],
                            device_category="READER",
                            direction="OUT",
                            supported_factors='["CARD"]',
                            brand="ZKTeco",
                            model_name="KR602M",
                            status="ONLINE",
                            description="Outbound contactless smartcard reader",
                        )
                    )

                # GATE-01 Devices (Barrier Gate Entry: UHF Reader + QR Scanner)
                if "GATE-01" in door_code_map:
                    default_devices.extend([
                        Access_Device(
                            code="DEV-GATE-UHF-01",
                            name="North Gate UHF Long-Range Reader",
                            door_id=door_code_map["GATE-01"],
                            device_category="READER",
                            direction="IN",
                            supported_factors='["CARD"]',
                            brand="Hopeland",
                            model_name="CL7206C",
                            status="ONLINE",
                            description="Vehicle windshield long-range RFID tag scanner (5-8m)",
                        ),
                        Access_Device(
                            code="DEV-GATE-QR-01",
                            name="North Gate Visitor QR Scanner",
                            door_id=door_code_map["GATE-01"],
                            device_category="READER",
                            direction="IN",
                            supported_factors='["CARD"]',
                            brand="Newland",
                            model_name="FM430",
                            status="ONLINE",
                            description="Barcode/QR Scanner for visitor pass and dynamic OTP",
                        ),
                    ])

                # GATE-02 Devices (Barrier Gate Exit: UHF Reader)
                if "GATE-02" in door_code_map:
                    default_devices.append(
                        Access_Device(
                            code="DEV-GATE-UHF-02",
                            name="North Gate UHF Exit Reader",
                            door_id=door_code_map["GATE-02"],
                            device_category="READER",
                            direction="OUT",
                            supported_factors='["CARD"]',
                            brand="Hopeland",
                            model_name="CL7206C",
                            status="ONLINE",
                            description="Vehicle exit long-range tag reader",
                        )
                    )

                # DOOR-03 Devices (Server Room: Multi-Modal Card + Keypad Combo)
                if "DOOR-03" in door_code_map:
                    default_devices.append(
                        Access_Device(
                            code="DEV-SERVER-COMBO-01",
                            name="Server Room Smartcard + Keypad Terminal",
                            door_id=door_code_map["DOOR-03"],
                            device_category="TERMINAL",
                            direction="BOTH",
                            supported_factors='["CARD", "PIN"]',
                            ip_address="192.168.1.210",
                            brand="PKS-Hardware",
                            model_name="ESP32-PoE-SecureReader",
                            status="ONLINE",
                            description="High-security terminal supporting 2FA Card + PIN entry",
                        )
                    )

                if default_devices:
                    session.add_all(default_devices)
                    await session.flush()
                    print_success(f"📟 Seeded {len(default_devices)} default access devices (readers & terminals)")

            # Seed Door Policies
            door_policy_stmt = select(Access_Door_Policy)
            existing_door_policies = (await session.exec(door_policy_stmt)).all()
            if not existing_door_policies and door_code_map:
                all_policies = (await session.exec(select(Access_Security_Policy))).all()
                policy_code_map = {p.code: p.id for p in all_policies}

                default_door_policies = []
                normal_pol_id = policy_code_map.get("POL_NORMAL")
                strict_pol_id = policy_code_map.get("POL_STRICT_2FA")

                if normal_pol_id:
                    for d_code in ("DOOR-01", "DOOR-02", "GATE-01", "GATE-02"):
                        if d_code in door_code_map:
                            default_door_policies.append(
                                Access_Door_Policy(
                                    door_id=door_code_map[d_code],
                                    policy_id=normal_pol_id,
                                    time_start="00:00",
                                    time_end="23:59",
                                    allowed_days="MON,TUE,WED,THU,FRI,SAT,SUN",
                                    priority=1,
                                    status="active",
                                )
                            )

                if strict_pol_id and "DOOR-03" in door_code_map:
                    # Server room defaults to 2FA Card+PIN!
                    default_door_policies.append(
                        Access_Door_Policy(
                            door_id=door_code_map["DOOR-03"],
                            policy_id=strict_pol_id,
                            time_start="00:00",
                            time_end="23:59",
                            allowed_days="MON,TUE,WED,THU,FRI,SAT,SUN",
                            priority=1,
                            status="active",
                        )
                    )

                if default_door_policies:
                    session.add_all(default_door_policies)
                    await session.flush()
                    print_success(f"📋 Seeded {len(default_door_policies)} door security policy mappings")

            # 6. Seed Access Permission Groups
            group_stmt = select(Access_Group)
            existing_groups = (await session.exec(group_stmt)).all()
            if not existing_groups:
                default_groups = [
                    Access_Group(
                        code="GRP-ALL",
                        name="All Access 24/7",
                        time_start="00:00",
                        time_end="23:59",
                        allowed_days="MON,TUE,WED,THU,FRI,SAT,SUN",
                        doors_allowed="*",
                        status="active",
                        description="Full 24/7 access to all doors and barrier gates",
                    ),
                    Access_Group(
                        code="GRP-STAFF",
                        name="Office Staff (Business Hours)",
                        time_start="06:00",
                        time_end="20:00",
                        allowed_days="MON,TUE,WED,THU,FRI",
                        doors_allowed="[1, 2, 3, 4]",
                        status="active",
                        description="Access to lobby turnstiles and parking on weekdays",
                    ),
                    Access_Group(
                        code="GRP-IT",
                        name="IT Infrastructure Team",
                        time_start="00:00",
                        time_end="23:59",
                        allowed_days="MON,TUE,WED,THU,FRI,SAT,SUN",
                        doors_allowed="[1, 2, 3, 4, 5]",
                        status="active",
                        description="Full access to office, parking, and server room",
                    ),
                ]
                session.add_all(default_groups)
                await session.flush()
                print_success(f"🛡️ Seeded {len(default_groups)} default access groups")

            # Fetch created group IDs for member linking
            all_groups = (await session.exec(select(Access_Group))).all()
            grp_map = {g.code: g.id for g in all_groups}
            it_grp_id = grp_map.get("GRP-IT")
            staff_grp_id = grp_map.get("GRP-STAFF")
            all_grp_id = grp_map.get("GRP-ALL")

            # 6. Seed Access Members (Cardholders)
            member_stmt = select(Access_Member)
            existing_members = (await session.exec(member_stmt)).all()
            if not existing_members:
                default_members = [
                    Access_Member(
                        member_code="MEM-001",
                        first_name="สมชาย",
                        last_name="ใจดี (Somchai Jaidee)",
                        department="Information Technology",
                        phone="081-234-5678",
                        email="somchai.j@example.com",
                        access_group_id=it_grp_id,
                        current_zone_id=office_zone_id,
                        is_inside=True,
                        last_direction="IN",
                        status="active",
                    ),
                    Access_Member(
                        member_code="MEM-002",
                        first_name="สมศรี",
                        last_name="รักชาติ (Somsri Rakchart)",
                        department="Human Resources",
                        phone="082-345-6789",
                        email="somsri.r@example.com",
                        access_group_id=staff_grp_id,
                        current_zone_id=lobby_zone_id,
                        is_inside=True,
                        last_direction="IN",
                        status="active",
                    ),
                    Access_Member(
                        member_code="MEM-003",
                        first_name="อนันต์",
                        last_name="สุขใจ (Anan Sukjai)",
                        department="Security Operations",
                        phone="083-456-7890",
                        email="anan.s@example.com",
                        access_group_id=all_grp_id,
                        current_zone_id=lobby_zone_id,
                        is_inside=True,
                        last_direction="IN",
                        status="active",
                    ),
                    Access_Member(
                        member_code="MEM-004",
                        first_name="John",
                        last_name="Doe (Contractor)",
                        department="External Vendor",
                        phone="089-999-8888",
                        email="john.vendor@example.com",
                        access_group_id=staff_grp_id,
                        current_zone_id=outside_zone_id,
                        is_inside=False,
                        last_direction="OUT",
                        status="inactive",
                    ),
                ]
                session.add_all(default_members)
                await session.flush()
                print_success(f"👥 Seeded {len(default_members)} access members")
            else:
                for m in existing_members:
                    if not m.current_zone_id:
                        if m.member_code == "MEM-001":
                            m.current_zone_id = office_zone_id
                            m.is_inside = True
                            m.last_direction = "IN"
                        elif m.member_code in ("MEM-002", "MEM-003"):
                            m.current_zone_id = lobby_zone_id
                            m.is_inside = True
                            m.last_direction = "IN"
                        else:
                            m.current_zone_id = outside_zone_id
                            m.is_inside = False
                            m.last_direction = "OUT"
                        session.add(m)
                await session.flush()

            # Fetch members for card linking & face enrollment
            all_members = (await session.exec(select(Access_Member))).all()
            
            # Initialize Mockup Face Embeddings & Photos for Members if not present
            from app.module.face_service import face_service
            sample_photos = {
                "MEM-001": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
                "MEM-002": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
                "MEM-003": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80",
                "MEM-004": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
            }
            for m in all_members:
                if not m.picture_url and m.member_code in sample_photos:
                    m.picture_url = sample_photos[m.member_code]
                    session.add(m)
                if not m.face_embedding:
                    m.face_embedding = face_service.enroll_mock_embedding(m.member_code)
                    m.face_registered_at = time_now()
                    m.face_tag = "Mockup-ArcFace-512"
                    session.add(m)
            await session.flush()

            # Synchronize In-Memory Vector Cache
            face_service.sync_cache(all_members)
            mem_map = {m.member_code: m.id for m in all_members}

            # 7. Seed Access Cards
            card_stmt = select(Access_Card)
            existing_cards = (await session.exec(card_stmt)).all()
            if not existing_cards:
                default_cards = [
                    Access_Card(
                        card_number="1001234567",
                        card_type="RFID_125K",
                        member_id=mem_map.get("MEM-001"),
                        status="active",
                        remark="Primary badge for Somchai",
                    ),
                    Access_Card(
                        card_number="1001234568",
                        card_type="RFID_125K",
                        member_id=mem_map.get("MEM-002"),
                        status="active",
                        remark="Primary badge for Somsri",
                    ),
                    Access_Card(
                        card_number="1001234569",
                        card_type="MIFARE",
                        member_id=mem_map.get("MEM-003"),
                        status="active",
                        remark="Master security badge for Anan",
                    ),
                    Access_Card(
                        card_number="9990001111",
                        card_type="RFID_125K",
                        member_id=mem_map.get("MEM-004"),
                        status="blocked",
                        remark="Temporarily blocked contractor card",
                    ),
                ]
                session.add_all(default_cards)
                await session.flush()
                print_success(f"💳 Seeded {len(default_cards)} access cards")

            # 7.1 Seed Mobile Credentials (BLE / NFC)
            mobile_stmt = select(Member_Mobile_Credential)
            existing_mobiles = (await session.exec(mobile_stmt)).all()
            if not existing_mobiles and mem_map.get("MEM-001"):
                default_mobiles = [
                    Member_Mobile_Credential(
                        member_id=mem_map.get("MEM-001"),
                        virtual_card_number="V-CARD-001",
                        device_uuid="uuid-apple-ble-somchai-001",
                        comm_tech="BLE",
                        os_platform="iOS",
                        device_model="iPhone 15 Pro",
                        app_version="5.1.0",
                        status="active",
                        last_sync_time=time_now(),
                    ),
                    Member_Mobile_Credential(
                        member_id=mem_map.get("MEM-002"),
                        virtual_card_number="V-CARD-002",
                        device_uuid="uuid-samsung-nfc-somsri-002",
                        comm_tech="NFC",
                        os_platform="Android",
                        device_model="Samsung Galaxy S24",
                        app_version="5.1.0",
                        status="active",
                        last_sync_time=time_now(),
                    ),
                ]
                session.add_all(default_mobiles)
                await session.flush()
                print_success(f"📱 Seeded {len(default_mobiles)} mobile credentials (BLE/NFC)")

            # 7.2 Seed Fingerprint Biometrics
            fp_stmt = select(Member_Fingerprint)
            existing_fps = (await session.exec(fp_stmt)).all()
            if not existing_fps and mem_map.get("MEM-001"):
                default_fps = [
                    Member_Fingerprint(
                        member_id=mem_map.get("MEM-001"),
                        finger_index=2,
                        finger_name="Right Index",
                        template_data="RklOR0VSUFJJTlRfSVNPXzE5Nzk0XzJfVEVNUExBVEVfU09NQ0hBSV8wMDE=",
                        algorithm_version="ISO_19794_2",
                        quality_score=94,
                        status="active",
                    ),
                    Member_Fingerprint(
                        member_id=mem_map.get("MEM-003"),
                        finger_index=1,
                        finger_name="Right Thumb",
                        template_data="RklOR0VSUFJJTlRfSVNPXzE5Nzk0XzJfVEVNUExBVEVfQU5BTl8wMDM=",
                        algorithm_version="ISO_19794_2",
                        quality_score=88,
                        status="active",
                    ),
                ]
                session.add_all(default_fps)
                await session.flush()
                print_success(f"👆 Seeded {len(default_fps)} fingerprint biometric templates")

            # 7.3 Seed Face Credentials
            face_cred_stmt = select(Member_Face_Credential)
            existing_face_creds = (await session.exec(face_cred_stmt)).all()
            if not existing_face_creds:
                default_face_creds = []
                for m in all_members:
                    if m.face_embedding:
                        default_face_creds.append(
                            Member_Face_Credential(
                                member_id=m.id,
                                embedding_vector=m.face_embedding,
                                model_name="InsightFace-buffalo_s",
                                pose_angle="FRONT",
                                photo_url=m.picture_url,
                                liveness_score=0.98,
                                status="active" if m.status == "active" else "disabled",
                            )
                        )
                if default_face_creds:
                    session.add_all(default_face_creds)
                    await session.flush()
                    print_success(f"👤 Seeded {len(default_face_creds)} face credentials")

            # 7.4 Seed PIN Credentials (Salted Hashes)
            pin_stmt = select(Member_Pin_Credential)
            existing_pins = (await session.exec(pin_stmt)).all()
            if not existing_pins and mem_map.get("MEM-001"):
                default_pins = [
                    Member_Pin_Credential(
                        member_id=mem_map.get("MEM-001"),
                        pin_hash=get_password_hash("1234"),
                        pin_type="STANDARD",
                        status="active",
                    ),
                    Member_Pin_Credential(
                        member_id=mem_map.get("MEM-003"),
                        pin_hash=get_password_hash("8888"),
                        pin_type="STANDARD",
                        status="active",
                    ),
                    Member_Pin_Credential(
                        member_id=mem_map.get("MEM-003"),
                        pin_hash=get_password_hash("9999"),
                        pin_type="DURESS",
                        status="active",
                    ),
                ]
                session.add_all(default_pins)
                await session.flush()
                print_success(f"🔢 Seeded {len(default_pins)} PIN credentials (Salted Hashes)")

            # 8. Seed Initial Access Logs for immediate Dashboard/Live view
            log_stmt = select(Access_Log)
            existing_logs = (await session.exec(log_stmt)).first()
            if not existing_logs:
                default_logs = [
                    Access_Log(
                        event_time=time_now(),
                        card_number="1001234567",
                        member_id=mem_map.get("MEM-001"),
                        member_name="สมชาย ใจดี (Somchai Jaidee)",
                        department="Information Technology",
                        door_id=1,
                        door_name="Main Entrance Turnstile 1",
                        direction="IN",
                        result="GRANTED",
                        reason="Access Granted (GRP-IT)",
                        event_type="CARD_SWIPE",
                        credential_type="RFID",
                        credential_identifier="1001234567",
                    ),
                    Access_Log(
                        event_time=time_now(),
                        card_number="1001234568",
                        member_id=mem_map.get("MEM-002"),
                        member_name="สมศรี รักชาติ (Somsri Rakchart)",
                        department="Human Resources",
                        door_id=3,
                        door_name="North Barrier Gate Entry",
                        direction="IN",
                        result="GRANTED",
                        reason="Access Granted (GRP-STAFF)",
                        event_type="CARD_SWIPE",
                        credential_type="RFID",
                        credential_identifier="1001234568",
                    ),
                    Access_Log(
                        event_time=time_now(),
                        card_number="9990001111",
                        member_id=mem_map.get("MEM-004"),
                        member_name="John Doe (Contractor)",
                        department="External Vendor",
                        door_id=1,
                        door_name="Main Entrance Turnstile 1",
                        direction="IN",
                        result="DENIED",
                        reason="Card is Blocked or Member Inactive",
                        event_type="CARD_SWIPE",
                        credential_type="RFID",
                        credential_identifier="9990001111",
                    ),
                    Access_Log(
                        event_time=time_now(),
                        card_number="UNKNOWN_9988",
                        member_name="Unknown Cardholder",
                        door_id=5,
                        door_name="Data Center Server Room",
                        direction="BOTH",
                        result="DENIED",
                        reason="Unregistered Card Number",
                        event_type="CARD_SWIPE",
                        credential_type="RFID",
                        credential_identifier="UNKNOWN_9988",
                    ),
                    Access_Log(
                        event_time=time_now(),
                        card_number="V-CARD-001",
                        member_id=mem_map.get("MEM-001"),
                        member_name="สมชาย ใจดี (Somchai Jaidee)",
                        department="Information Technology",
                        door_id=1,
                        door_name="Main Entrance Turnstile 1",
                        direction="IN",
                        result="GRANTED",
                        reason="Mobile BLE Verified (iPhone 15 Pro)",
                        event_type="MOBILE_TAP",
                        credential_type="MOBILE_BLE",
                        credential_identifier="uuid-apple-ble-somchai-001",
                    ),
                    Access_Log(
                        event_time=time_now(),
                        card_number="FP:MEM-001",
                        member_id=mem_map.get("MEM-001"),
                        member_name="สมชาย ใจดี (Somchai Jaidee)",
                        department="Information Technology",
                        door_id=5,
                        door_name="Data Center Server Room",
                        direction="IN",
                        result="GRANTED",
                        reason="Fingerprint Verified (Right Index, Score 94)",
                        event_type="FINGERPRINT_SCAN",
                        credential_type="FINGERPRINT",
                        credential_identifier="Right Index",
                    ),
                    Access_Log(
                        event_time=time_now(),
                        card_number="PIN:MEM-003",
                        member_id=mem_map.get("MEM-003"),
                        member_name="อนันต์ สุขใจ (Anan Sukjai)",
                        department="Security Operations",
                        door_id=5,
                        door_name="Data Center Server Room",
                        direction="IN",
                        result="GRANTED",
                        reason="PIN Code Authenticated",
                        event_type="PIN_ENTRY",
                        credential_type="PIN",
                        credential_identifier="STANDARD_PIN",
                    ),
                ]
                session.add_all(default_logs)
                await session.flush()
                print_success(f"📋 Seeded {len(default_logs)} sample access event logs")

            # 9. Seed Sample Face Recognition Audit Logs if none exist
            face_log_stmt = select(Access_Log).where(Access_Log.event_type == "FACE_RECOGNITION")
            existing_face_log = (await session.exec(face_log_stmt)).first()
            if not existing_face_log:
                sample_face_logs = [
                    Access_Log(
                        event_time=time_now(),
                        card_number="FACE:MEM-001",
                        member_id=mem_map.get("MEM-001"),
                        member_name="สมชาย ใจดี (Somchai Jaidee)",
                        department="Information Technology",
                        door_id=1,
                        door_name="Main Entrance Turnstile 1",
                        direction="IN",
                        result="GRANTED",
                        reason="Face Verified (ArcFace 512)",
                        event_type="FACE_RECOGNITION",
                        credential_type="FACE",
                        credential_identifier="FACE:MEM-001",
                        confidence_score=0.974,
                        snapshot_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80",
                    ),
                    Access_Log(
                        event_time=time_now(),
                        card_number="FACE:MEM-002",
                        member_id=mem_map.get("MEM-002"),
                        member_name="สมศรี รักชาติ (Somsri Rakchart)",
                        department="Human Resources",
                        door_id=2,
                        door_name="Main Entrance Turnstile 2",
                        direction="IN",
                        result="GRANTED",
                        reason="Face Verified (ArcFace 512)",
                        event_type="FACE_RECOGNITION",
                        credential_type="FACE",
                        credential_identifier="FACE:MEM-002",
                        confidence_score=0.958,
                        snapshot_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80",
                    ),
                    Access_Log(
                        event_time=time_now(),
                        card_number="FACE:MEM-003",
                        member_id=mem_map.get("MEM-003"),
                        member_name="อนันต์ สุขใจ (Anan Sukjai)",
                        department="Security Operations",
                        door_id=5,
                        door_name="Data Center Server Room",
                        direction="IN",
                        result="GRANTED",
                        reason="Face Verified (ArcFace 512)",
                        event_type="FACE_RECOGNITION",
                        credential_type="FACE",
                        credential_identifier="FACE:MEM-003",
                        confidence_score=0.985,
                        snapshot_url="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=300&auto=format&fit=crop&q=80",
                    ),
                    Access_Log(
                        event_time=time_now(),
                        card_number="FACE:MEM-004",
                        member_id=mem_map.get("MEM-004"),
                        member_name="John Doe (Contractor)",
                        department="External Vendor",
                        door_id=1,
                        door_name="Main Entrance Turnstile 1",
                        direction="IN",
                        result="DENIED",
                        reason="Cardholder account is INACTIVE",
                        event_type="FACE_RECOGNITION",
                        credential_type="FACE",
                        credential_identifier="FACE:MEM-004",
                        confidence_score=0.942,
                        snapshot_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
                    ),
                    Access_Log(
                        event_time=time_now(),
                        card_number="FACE:UNKNOWN",
                        member_name="Unknown Stranger",
                        door_id=1,
                        door_name="Main Entrance Turnstile 1",
                        direction="IN",
                        result="DENIED",
                        reason="Face Unregistered / Low Confidence (18.5%)",
                        event_type="FACE_RECOGNITION",
                        credential_type="FACE",
                        credential_identifier="FACE:UNKNOWN",
                        confidence_score=0.185,
                        snapshot_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80",
                    ),
                ]
                session.add_all(sample_face_logs)
                await session.flush()
                print_success(f"📷 Seeded {len(sample_face_logs)} sample face recognition audit logs")

            await session.commit()
            print_success("✅ Database initialization and seeding completed successfully.")
        except Exception as err:  # noqa: BLE001
            await session.rollback()
            print_error(f"❌ Database initialization error: {err}")
