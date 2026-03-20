# Author: Victor.I
import os

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("REOS_DATABASE_URL", "sqlite:///./reos.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_sqlite_compat_schema() -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "users" not in inspector.get_table_names():
            return
        existing_columns = {column["name"] for column in inspector.get_columns("users")}
        compatibility_columns = [
            ("email", "ALTER TABLE users ADD COLUMN email VARCHAR(255)"),
            ("provider", "ALTER TABLE users ADD COLUMN provider VARCHAR(64) NOT NULL DEFAULT 'local'"),
            ("organization_name", "ALTER TABLE users ADD COLUMN organization_name VARCHAR(255)"),
            ("tenant_id", "ALTER TABLE users ADD COLUMN tenant_id VARCHAR(128)"),
            ("display_name", "ALTER TABLE users ADD COLUMN display_name VARCHAR(255)"),
        ]
        for column_name, statement in compatibility_columns:
            if column_name not in existing_columns:
                connection.exec_driver_sql(statement)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
