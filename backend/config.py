import os
from pydantic import BaseModel
from pydantic_settings import (BaseSettings, SettingsConfigDict)
from sqlalchemy.ext.declarative import declarative_base



class DatabaseConfig(BaseModel):
    """Backend database configuration parameters.

    Attributes:
        dsn:
            DSN for target database.
    """


    # dsn: str = "mysql+pymysql://root:test1234!@localhost:3306/testing"
    # dsn: str = "mysql+pymysql://myuser:mypassword@localhost:3306/testing"
    dsn: str = os.getenv("MYAPI_DATABASE__DSN")



class Config(BaseSettings):
    database: DatabaseConfig = DatabaseConfig()
    token_key: str = ""
    upload_path: str = "scheme_imgs"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="MYAPI_",
        env_nested_delimiter="__",
        case_sensitive=False,
        extra="ignore"  # This will ignore any extra fields not defined in the model
    )



config = Config()
Base = declarative_base()