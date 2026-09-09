"""Database Initialization and Default Data Seeding."""

from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import get_password_hash
from app.core.database import async_engine
from app.core.models import App_Configurations, Sample_Item, System_Users
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

            # Seed Default User Accounts (system / ssystem with password 12341234)
            default_accounts = [
                ("system", "System Administrator", "system@example.com"),
                ("ssystem", "System Administrator", "ssystem@example.com"),
            ]
            for u_name, display_name, email in default_accounts:
                user_stmt = select(System_Users).where(System_Users.username == u_name)
                existing_user = (await session.exec(user_stmt)).first()
                if not existing_user:
                    new_user = System_Users(
                        username=u_name,
                        password=get_password_hash("12341234"),
                        name=display_name,
                        email=email,
                        role="admin",
                        is_active=True,
                        created_at=time_now(),
                        updated_at=time_now(),
                    )
                    session.add(new_user)
                    print_success(f"👤 Seeded default account: {u_name} / 12341234")

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
