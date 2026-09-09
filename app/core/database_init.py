"""Database Initialization and Default Data Seeding."""

from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import get_password_hash
from app.core.database import async_engine
from app.core.models import App_Configurations, Sample_Item, System_User_Type, System_Users
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
                ("app_title", "PKS Project Template", "System display title"),
                ("app_description", "Modern FastAPI + DaisyUI Starter Template", "System description"),
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

            await session.commit()
            print_success("✅ Database initialization and seeding completed successfully.")
        except Exception as err:  # noqa: BLE001
            await session.rollback()
            print_error(f"❌ Database initialization error: {err}")
