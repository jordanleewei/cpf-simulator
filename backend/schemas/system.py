from pydantic import BaseModel

class SystemBase(BaseModel):
    name: str
    url: str

class SystemCreate(SystemBase):
    pass

class SystemUpdate(SystemBase):
    pass

class System(SystemBase):
    id: int

