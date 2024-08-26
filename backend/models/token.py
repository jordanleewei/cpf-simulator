from pydantic import BaseModel

# Define the Token response model
class Token(BaseModel):
    access_token: str
    refresh_token: str  # Include the refresh token in the response
    token_type: str
    uuid: str  # Add this if you're including uuid in the response
    email: str  # Add this if you're including email in the response
    name: str  # Add this if you're including name in the response
    access_rights: str  # Add this to include access_rights in the response
