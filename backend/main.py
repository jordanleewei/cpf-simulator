import warnings
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")
warnings.filterwarnings("ignore", category=FutureWarning, message=".*`clean_up_tokenization_spaces`.*")
import logging
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Request, Form, Response, APIRouter
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session, joinedload
from models.user import UserModel
from models.attempt import AttemptModel
from models.scheme import SchemeModel
from models.question import QuestionModel
from models.ai_improvements import AIImprovementsModel
from models.manual_feedback import ManualFeedbackModel
from models.association_tables import user_scheme_association
from models.prompt import PromptModel
from models.system import SystemModel
from schemas.prompt import PromptBase
from session import create_session, engine, open_session
from schemas.attempt import AttemptCreate, AttemptResponse, AttemptBase
from schemas.user import UserBase, UserInput, UserResponseSchema
from schemas.scheme import SchemeBase, SchemeInput
from schemas.question import QuestionBase
from schemas.manual_feedback import ManualFeedbackBase
from schemas.ai_improvements import AIImprovementsBase
from schemas.table import TableBase
from schemas.system import SystemCreate, SystemUpdate, System
from schemas.compare_prompt import ComparePromptRequest
from config import Base, config
from sqlalchemy import func, distinct
from fastapi.middleware.cors import CORSMiddleware
from ML.openAI import process_response, openAI_response, get_default_prompt, update_vectorstore, DYNAMIC_CSV_PATH
from ML.ai_analysis import analyse_improvements
import uuid
import os
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import boto3
import pandas as pd
from io import StringIO
from models.token import Token  # Import the Token model
from fastapi.responses import JSONResponse
from typing import List

# Import OAuth2PasswordBearer
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

origins = ["https://admin.ccutrainingsimulator.com", "https://csa.ccutrainingsimulator.com", "https://trainer.ccutrainingsimulator.com", "http://localhost:3001", "http://localhost:3000", "http://localhost:3003"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization"],
)

# AWS S3 configuration
BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION_NAME = os.getenv("AWS_REGION_NAME")

s3_client = boto3.client('s3')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 90

# OAuth2 configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Database initialization
Base.metadata.create_all(bind=engine)

# JWT token creation with fixed expiration
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Verify password
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Get current user
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(create_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(UserModel).filter(UserModel.uuid == user_id).first()
    if user is None:
        raise credentials_exception
    return user

# Login route to get JWT token
@app.post("/token", response_model=Token)
async def login_for_access_token(db: Session = Depends(create_session), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Issue access token
    access_token = create_access_token(
        data={"sub": user.uuid}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "uuid": user.uuid,
        "email": user.email,
        "name": user.name,
        "access_rights": user.access_rights,  # Include access_rights directly in the response
        "dept": user.dept
    }


# Upload questions CSV route (protected by JWT)
@app.post("/upload-questions-csv", status_code=201)
async def upload_questions_csv(
    file: UploadFile = File(...),
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")

    # Read the CSV file
    contents = await file.read()
    csv_data = pd.read_csv(StringIO(contents.decode("utf-8")))

    # Iterate over CSV rows and insert into the database
    for index, row in csv_data.iterrows():
        # Extract data from CSV columns
        scheme_name = row['Scheme']
        title = row['Question']
        question_difficulty = row['Complexity']
        question_details = row['Enquiry']
        ideal = row['Reply in system']
        ideal_system_urls = [
            (row['System 1'], row['System 1 URL']),
            (row['System 2'], row['System 2 URL']),
            (row['System 3'], row['System 3 URL']),
            (row['System 4'], row['System 4 URL'])
        ]
        
        # Concatenate all system names and URLs
        combined_system_names = ", ".join([name for name, _ in ideal_system_urls if pd.notna(name)])
        combined_system_urls = ", ".join([url for _, url in ideal_system_urls if pd.notna(url)])

        # Check if the scheme exists, if not create it
        scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme_name).first()
        if not scheme:
            scheme_name, file_url = scheme_name, ''  # You might need to provide a valid file_url here
            add_new_scheme_sync(scheme_name=scheme_name, file_url=file_url, db=db, current_user=current_user)
            scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme_name).first()
            if not scheme:
                logger.error(f"Failed to create scheme '{scheme_name}'. Skipping this question.")
                continue

        # Check if the question already exists to avoid duplicates
        existing_question = db.query(QuestionModel).filter(
            QuestionModel.scheme_name == scheme_name,
            QuestionModel.title == title,
            QuestionModel.question_details == question_details
        ).first()

        if existing_question:
            logger.info(f"Question {title} with details {question_details} already exists. Skipping.")
            continue  # Skip this row if question already exists

        # Create a new QuestionModel instance
        new_question = QuestionModel(
            title=title,
            question_difficulty=question_difficulty,
            question_details=question_details,
            ideal=ideal,
            scheme_name=scheme_name,
            ideal_system_name=combined_system_names,
            ideal_system_url=combined_system_urls,
        )
        db.add(new_question)

    db.commit()

    return {"message": "CSV data has been successfully uploaded and processed."}

@app.get("/", include_in_schema=False)  # Exclude this endpoint from the automatic docs
async def redirect_to_docs():
    return RedirectResponse(url="/docs")

# Updated /default-systems endpoint
@app.get("/default-systems", status_code=200)
async def get_default_systems(current_user: UserModel = Depends(get_current_user)):
    return JSONResponse({
        "SYSTEM_1_NAME": os.getenv("SYSTEM_1_NAME"),
        "SYSTEM_1_URL": os.getenv("SYSTEM_1_URL"),
        "SYSTEM_2_NAME": os.getenv("SYSTEM_2_NAME"),
        "SYSTEM_2_URL": os.getenv("SYSTEM_2_URL"),
        "SYSTEM_3_NAME": os.getenv("SYSTEM_3_NAME"),
        "SYSTEM_3_URL": os.getenv("SYSTEM_3_URL"),
    })

# Add the default user
def add_default_user(db: Session = Depends(create_session)):
    default_email = os.getenv("DEFAULT_ADMIN_EMAIL")
    default_password = os.getenv("DEFAULT_ADMIN_PASSWORD") 
    default_name = os.getenv("DEFAULT_ADMIN_NAME") 
    default_access_rights = os.getenv("DEFAULT_ADMIN_ACCESS_RIGHTS") 
    
    with open_session() as db:
        db_user = db.query(UserModel).filter(UserModel.email == default_email).first()
        if not db_user:
            hashed_password = pwd_context.hash(default_password)
            default_user = UserModel(
                email=default_email,
                hashed_password=hashed_password,
                name=default_name,
                access_rights=default_access_rights
            )
            db.add(default_user)
            db.commit()
            print("Default user added.")
        else:
            print("Default user already exists.")

add_default_user()

### USER ROUTES ###

@app.get("/user/me", response_model=UserResponseSchema, status_code=status.HTTP_200_OK)
async def get_current_user_details(
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(create_session)
):
    """
    Fetch the current authenticated user's details.
    """
    # Get the current user's details (already fetched through get_current_user)
    user = db.query(UserModel).filter(UserModel.uuid == current_user.uuid).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Prepare response
    user_response = UserResponseSchema(
        uuid=user.uuid,
        email=user.email,
        name=user.name,
        access_rights=user.access_rights,
        dept=user.dept,
        schemes=[scheme.scheme_name for scheme in user.scheme]  # Assuming a user has related schemes
    )

    return user_response

@app.get("/user", status_code=status.HTTP_201_CREATED)
async def get_all_users(
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    users = db.query(UserModel).options(joinedload(UserModel.scheme)).all()

    # If no users are found, raise an HTTPException with status code 404
    if not users:
        raise HTTPException(status_code=404, detail="No users found")
    
    user_responses = []
    for user in users:
        schemes = [scheme.scheme_name for scheme in user.scheme]
        user_response = UserResponseSchema(
            uuid=user.uuid,
            email=user.email,
            name=user.name,
            access_rights=user.access_rights,
            dept = user.dept,
            schemes=schemes
        )
        user_responses.append(user_response)
    
    return user_responses

@app.get("/user/{user_id}", status_code=status.HTTP_201_CREATED)
async def read_user(
    user_id:str,
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    db_user = db.query(UserModel).filter(UserModel.uuid == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = {
        "uuid": db_user.uuid,
        "email": db_user.email,
        "name": db_user.name,
        "access_rights": db_user.access_rights,
        "dept": db_user.dept
    }
    return user_data

@app.put("/user/{user_id}", status_code=status.HTTP_200_OK)
async def update_user(
    user_id: str, 
    user: UserBase, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_user = db.query(UserModel).filter(UserModel.uuid == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.email = user.email
    db_user.name = user.name
    db_user.access_rights = user.access_rights
    db_user.dept=user.dept
    
    if user.password:  
        db_user.hashed_password = pwd_context.hash(user.password)

    db.commit()
    db.refresh(db_user)

    return user

@app.delete("/user/{user_id}", status_code=status.HTTP_201_CREATED)
async def delete_user(
    user_id: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_user = db.query(UserModel).filter(UserModel.uuid == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    else:
        try:
            db_user_attempts= db.query(AttemptModel).filter(AttemptModel.user_id == user_id).all()
            if db_user_attempts: 
                for user_attempt in db_user_attempts:
                    db.delete(user_attempt)
                    
            db.delete(db_user)
            db.commit()
            return JSONResponse(content = {'message' : 'User deleted'}, status_code=201)
        
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Unable to delete user. {e}")

@app.post("/user", status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserBase, 
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)  # Ensure the current user is authenticated
):
    # Check if the current user is an admin
    if current_user.access_rights.lower() != "admin" and current_user.access_rights.lower() != "trainer":
        print(current_user.access_rights)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    # Check if the new user is also going to be an admin
    if user.access_rights.lower() == "admin" and current_user.access_rights.lower()  != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create other admins")

    hashed_password = pwd_context.hash(user.password)
    db_user = UserModel(
        email=user.email,
        hashed_password=hashed_password,
        name=user.name,
        access_rights=user.access_rights,
        dept=user.dept
    )
    db.add(db_user)
    db.commit()
    return db_user.uuid


@app.get("/user/{user_id}/schemes", status_code=status.HTTP_201_CREATED)
async def get_all_scheme_no_by_user_id(
    user_id:str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_user = db.query(UserModel).filter(UserModel.uuid == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    schemes = db.query(SchemeModel)\
        .join(user_scheme_association, SchemeModel.scheme_name == user_scheme_association.c.scheme_table_name)\
        .filter(user_scheme_association.c.user_table_id == user_id).all()
    
    if not schemes:
        raise HTTPException(status_code=404, detail="No scheme names found")
    
    results = []
    
    for scheme in schemes:
        num_attempted_questions = db.query(func.count(func.distinct(AttemptModel.question_id))) \
            .filter(AttemptModel.user_id == user_id) \
            .filter(AttemptModel.question_id.in_([question.question_id for question in scheme.questions])) \
            .scalar()
        
        num_questions = db.query(func.count(QuestionModel.question_id)).filter(QuestionModel.scheme_name == scheme.scheme_name).scalar()
        scheme_attempt_info = {
            "scheme_name": scheme.scheme_name,
            "num_attempted_questions": num_attempted_questions,
            "num_questions": num_questions
        }
        results.append(scheme_attempt_info)
    return results

@app.get("/user/{user_id}/{scheme_name}", status_code=status.HTTP_201_CREATED)
async def get_scheme_no_by_user_id(
    user_id:str, 
    scheme_name:str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_user = db.query(UserModel).filter(UserModel.uuid == user_id).first()
    
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_questions = db.query(QuestionModel).filter(QuestionModel.scheme_name == scheme_name).all()
    if db_questions is None:
        raise HTTPException(status_code=404, detail="No questions found for the scheme")

    num_attempted_questions = db.query(func.count(func.distinct(AttemptModel.question_id))) \
        .filter(AttemptModel.user_id == user_id) \
        .filter(AttemptModel.question_id.in_([question.question_id for question in db_questions])) \
        .scalar()
    num_questions = db.query(func.count(QuestionModel.question_id)).filter(QuestionModel.scheme_name == scheme_name).scalar()
    
    scheme_attempt_info = {
        "scheme_name": scheme_name,
        "num_attempted_questions": num_attempted_questions,
        "num_questions": num_questions
    }
    return scheme_attempt_info

### SCHEME ROUTES ###
@app.get("/scheme/{user_id}", status_code=status.HTTP_201_CREATED)
async def get_scheme_by_user_id(
    user_id: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_user = db.query(UserModel).filter(UserModel.uuid == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    scheme_list = []
    for scheme in db_user.scheme:
        scheme_dict = scheme.to_dict()
        num_questions = db.query(func.count(QuestionModel.question_id)).filter(QuestionModel.scheme_name == scheme.scheme_name).scalar()
        scheme_dict.update({"num_questions": num_questions})
        scheme_list.append(scheme_dict)

    return scheme_list

@app.post("/scheme/{user_id}", status_code=status.HTTP_201_CREATED)
async def add_user_to_scheme(
    scheme: SchemeBase, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    user = db.query(UserModel).filter(UserModel.uuid == scheme.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme.scheme_name).first()
    if db_scheme:
        if user in db_scheme.users:
            raise HTTPException(status_code=404, detail="User is already associated with the scheme")
        
        db_scheme.users.append(user)
        db.commit()
        return JSONResponse(content={"message": "Scheme has been updated successfully"}, status_code=201)


    raise HTTPException(status_code=404, detail="This is not an existing scheme")

@app.post('/scheme', status_code=status.HTTP_201_CREATED)
async def add_new_scheme(
    scheme_name: str, 
    file_url: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    if "/" in scheme_name:
        scheme_name = scheme_name.replace("/", r" or ")

    scheme_name = scheme_name[0].upper() + scheme_name[1:].lower()
    scheme_name = scheme_name.strip()

    db_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme_name).first()
    if db_scheme:
        return {"message": "This is an existing scheme"}

    try:
        new_scheme = SchemeModel(
            scheme_name=scheme_name,
            scheme_csa_img_path=file_url,
            scheme_admin_img_path=file_url  
        )
        db.add(new_scheme)
        db.commit()

        return {
            "message": "Scheme added successfully",
            "filename": file_url.split('/')[-1],
            "s3_url": file_url
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
def add_new_scheme_sync(scheme_name: str, file_url: str, db: Session, current_user: UserModel):
    if "/" in scheme_name:
        scheme_name = scheme_name.replace("/", r" or ")

    scheme_name = scheme_name[0].upper() + scheme_name[1:].lower()
    scheme_name = scheme_name.strip()

    db_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme_name).first()
    if db_scheme:
        return {"message": "This is an existing scheme"}

    try:
        new_scheme = SchemeModel(
            scheme_name=scheme_name,
            scheme_csa_img_path=file_url,
            scheme_admin_img_path=file_url  
        )
        db.add(new_scheme)
        db.commit()
        return {
            "message": "Scheme added successfully",
            "filename": file_url.split('/')[-1],
            "s3_url": file_url
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.put("/scheme/{user_id}", status_code=status.HTTP_201_CREATED)
async def update_scheme_of_user(
    scheme_input: SchemeInput, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    user = db.query(UserModel).filter(UserModel.uuid == scheme_input.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing_schemes = [scheme.scheme_name for scheme in user.scheme]
    schemes_to_add = set(scheme_input.schemesList) - set(existing_schemes)
    schemes_to_delete = set(existing_schemes) - set(scheme_input.schemesList)

    try:
        for scheme_name in schemes_to_add:
            db_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme_name).first()
            if db_scheme:
                db_scheme.users.append(user)
            else:
                raise HTTPException(status_code=404, detail="Scheme not found")

        for scheme_name in schemes_to_delete:
            db_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme_name).first()
            if db_scheme and user in db_scheme.users:
                                db_scheme.users.remove(user)

        db.commit()
        return {"message": "Schemes updated successfully"}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/distinct/scheme", status_code=status.HTTP_201_CREATED)
async def get_distinct_scheme_names(
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    schemes = db.query(distinct(SchemeModel.scheme_name)).all()
    if not schemes:
        raise HTTPException(status_code=404, detail="No scheme names found")
    scheme_name_list = [scheme_name[0] for scheme_name in schemes]
    return scheme_name_list

@app.get("/scheme", status_code=status.HTTP_201_CREATED)
async def get_all_schemes(
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_schemes = db.query(distinct(SchemeModel.scheme_name)).all()
    if not db_schemes:
        return []
    scheme_list = []
    for scheme in db_schemes:
        scheme_name = scheme[0]
        db_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme_name).first()
        scheme_dict = db_scheme.to_dict()
        question_number = len(scheme_dict['questions'])
        scheme_dict.update({'number_of_questions': question_number})
        scheme_list.append(scheme_dict)
    return scheme_list

# Define the APIRouter
public_router = APIRouter(
    prefix="/public",
    tags=["Public Routes"]
)

# Public scheme route
@public_router.get("/scheme", status_code=status.HTTP_200_OK)
async def get_public_schemes(
    db: Session = Depends(create_session)
):
    db_schemes = db.query(SchemeModel).all()  # Fetch all schemes
    if not db_schemes:
        return []
    
    scheme_list = []
    for scheme in db_schemes:
        # Fetch the number of questions for the current scheme
        question_count = db.query(func.count(QuestionModel.question_id)).filter(QuestionModel.scheme_name == scheme.scheme_name).scalar()

        # Add scheme and number of questions to the response
        scheme_dict = {
            'scheme_name': scheme.scheme_name,
            'scheme_csa_img_path': scheme.scheme_csa_img_path,
            'scheme_admin_img_path': scheme.scheme_admin_img_path,
            'number_of_questions': question_count  # Include the number of questions
        }
        scheme_list.append(scheme_dict)
    
    return scheme_list

# Include the public_router
app.include_router(public_router)

@app.delete('/scheme/{scheme_name}', status_code=status.HTTP_200_OK)
async def delete_scheme(
    scheme_name: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme_name).first()
    if not db_scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    # Delete related attempts and questions
    db.query(AttemptModel).filter(AttemptModel.question_id.in_(
        db.query(QuestionModel.question_id).filter(QuestionModel.scheme_name == scheme_name)
    )).delete(synchronize_session=False)

    db.query(QuestionModel).filter(QuestionModel.scheme_name == scheme_name).delete(synchronize_session=False)
    
    # Delete scheme itself
    db.delete(db_scheme)
    db.commit()

    return JSONResponse(content={"message": f"Scheme '{scheme_name}' deleted successfully along with related questions and attempts."}, status_code=200)

@app.put("/scheme/update-name/{old_scheme_name}", status_code=status.HTTP_200_OK)
async def update_scheme_name(
    old_scheme_name: str,
    request: Request,
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    try:
        data = await request.json()
        new_scheme_name = data.get('new_scheme_name')

        if not new_scheme_name:
            raise HTTPException(status_code=422, detail="New scheme name is required")

        # Check if the new scheme name already exists
        existing_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == new_scheme_name).first()
        if existing_scheme:
            raise HTTPException(status_code=400, detail="The new scheme name already exists.")

        # Fetch the old scheme
        db_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == old_scheme_name).first()
        if not db_scheme:
            raise HTTPException(status_code=404, detail="Scheme not found.")

        # Insert the new scheme with the same image paths
        new_scheme = SchemeModel(
            scheme_name=new_scheme_name,
            scheme_csa_img_path=db_scheme.scheme_csa_img_path,
            scheme_admin_img_path=db_scheme.scheme_admin_img_path,
            user_id=db_scheme.user_id
        )
        db.add(new_scheme)
        db.commit()

        # Update associations
        db.query(user_scheme_association).filter(user_scheme_association.c.scheme_table_name == old_scheme_name).update(
            {"scheme_table_name": new_scheme_name}
        )
        db.commit()

        # Update the `question` table to reference the new scheme
        db.query(QuestionModel).filter(QuestionModel.scheme_name == old_scheme_name).update(
            {"scheme_name": new_scheme_name}
        )
        db.commit()

        # Delete the old scheme
        db.query(SchemeModel).filter(SchemeModel.scheme_name == old_scheme_name).delete()
        db.commit()

        return {"message": f"Scheme name updated successfully from '{old_scheme_name}' to '{new_scheme_name}'."}
    
    except Exception as e:
        db.rollback()
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating scheme name: {str(e)}")
    
@app.put("/scheme/revert-name/{current_scheme_name}", status_code=status.HTTP_200_OK)
async def revert_scheme_name(
    current_scheme_name: str,
    request: Request,
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    try:
        data = await request.json()
        original_scheme_name = data.get('original_scheme_name')

        if not original_scheme_name:
            raise HTTPException(status_code=422, detail="Original scheme name is required")

        # Check if the original scheme name already exists
        existing_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == original_scheme_name).first()
        if existing_scheme:
            raise HTTPException(status_code=400, detail="The original scheme name already exists.")

        # Fetch the current scheme
        db_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == current_scheme_name).first()
        if not db_scheme:
            raise HTTPException(status_code=404, detail="Scheme not found.")

        # Insert the original scheme with the same image paths
        reverted_scheme = SchemeModel(
            scheme_name=original_scheme_name,
            scheme_csa_img_path=db_scheme.scheme_csa_img_path,
            scheme_admin_img_path=db_scheme.scheme_admin_img_path,
            user_id=db_scheme.user_id
        )
        db.add(reverted_scheme)
        db.commit()

        # Update the `question` table to reference the reverted scheme name
        db.query(QuestionModel).filter(QuestionModel.scheme_name == current_scheme_name).update(
            {"scheme_name": original_scheme_name}
        )

        # Commit the changes to the `question` table
        db.commit()

        # Finally, delete the current scheme
        db.query(SchemeModel).filter(SchemeModel.scheme_name == current_scheme_name).delete()
        db.commit()

        return {"message": f"Scheme name reverted successfully from '{current_scheme_name}' to '{original_scheme_name}'."}
    
    except Exception as e:
        db.rollback()
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error reverting scheme name: {str(e)}")

## QUESTION ROUTES ##
@app.get("/questions/scheme/{scheme_name}", status_code=status.HTTP_201_CREATED)
async def get_questions_by_scheme_name(
    scheme_name: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_question = db.query(QuestionModel).filter(QuestionModel.scheme_name == scheme_name)\
                .order_by(QuestionModel.created.asc()).all()
                
    if not db_question:
        raise HTTPException(status_code=404, detail="No questions found for the given scheme")
    return db_question

@app.get("/question/{question_id}", status_code=status.HTTP_201_CREATED)
async def get_questions_by_question_id(
    question_id: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_question = db.query(QuestionModel).filter(QuestionModel.question_id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="No questions found for the given question ID")
    return db_question

@app.delete("/question/{question_id}", status_code=status.HTTP_201_CREATED)
async def delete_question(
    question_id: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_question = db.query(QuestionModel).filter(QuestionModel.question_id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")

    db_attempts = db.query(AttemptModel).filter(AttemptModel.question_id == question_id)
    try:
        if db_attempts:
            for attempt in db_attempts:
                db.delete(attempt)
        db.delete(db_question)
        db.commit()
        return JSONResponse(content={"message": "Question deleted successfully along with related attempts."}, status_code=201)
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unable to delete question. {e}")

@app.get("/questions/all", status_code=status.HTTP_201_CREATED)
async def get_all_questions(
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_questions = db.query(QuestionModel).order_by(QuestionModel.created.asc()).all()
    return [question.to_dict() for question in db_questions]

@app.post("/question", status_code=status.HTTP_201_CREATED)
async def add_question_to_scheme(
    question: QuestionBase, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == question.scheme_name).first()
    if db_scheme:
        exists = db.query(QuestionModel).filter(QuestionModel.question_details == question.question_details).first()
        if exists:
            raise HTTPException(status_code=404, detail="Question is already in the database")
        db_question = QuestionModel(**question.dict())
        db.add(db_question)
        db.commit()    
        return db_question.question_id
    else:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
@app.put("/question/{question_id}", status_code=status.HTTP_200_OK)
async def update_question(
    question_id: str, 
    question: QuestionBase, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    # Check if the question exists
    db_question = db.query(QuestionModel).filter(QuestionModel.question_id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Update the question fields
    db_question.title = question.title
    db_question.question_difficulty = question.question_difficulty
    db_question.question_details = question.question_details
    db_question.ideal = question.ideal
    db_question.ideal_system_name = question.ideal_system_name
    db_question.ideal_system_url = question.ideal_system_url

    # Commit the changes to the database
    db.commit()
    db.refresh(db_question)

    return {"message": "Question updated successfully", "question_id": question_id, "updated_question": db_question}
    
## TABLE ROUTE ##
@app.get("/table/{user_id}/{scheme_name}", status_code=status.HTTP_201_CREATED)
async def get_table_details_of_user_for_scheme(
    scheme_name: str, 
    user_id: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    question_list = []
    db_questions = db.query(QuestionModel).filter(QuestionModel.scheme_name == scheme_name).order_by(QuestionModel.created.asc()).all()
    
    if not db_questions:
        raise HTTPException(status_code=404, detail="No questions found for the given scheme")

    for db_question in db_questions:
        question_dict = db_question.to_dict()
        db_attempt = db.query(AttemptModel).filter(AttemptModel.user_id == user_id).filter(AttemptModel.question_id == db_question.question_id).order_by(AttemptModel.date.desc()).first()
  
        if db_attempt is None:
            db_attempt = ""
            status = 'uncompleted'
        else:
            db_attempt = db_attempt.to_dict()['attempt_id']
            status = 'completed'
            
        question_dict.update({"status": status, "attempt": db_attempt})
        question_list.append(question_dict)
        
    return question_list

## ATTEMPT ROUTES ##
@app.get("/attempt/{attempt_id}", status_code=status.HTTP_201_CREATED)
async def read_attempt(
    attempt_id: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_attempt = db.query(AttemptModel).filter(AttemptModel.attempt_id == attempt_id).first()
    if not db_attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    attempt_dict = db_attempt.to_dict()
    question_details = db.query(QuestionModel.question_details).filter(QuestionModel.question_id == attempt_dict['question_id']).first()
    if question_details:
        attempt_dict['question_details'] = str(question_details[0])
    question_title = db.query(QuestionModel.title).filter(QuestionModel.question_id == attempt_dict['question_id']).first()
    if question_title:
        attempt_dict['title'] = str(question_title[0])
    scheme_name = db.query(QuestionModel.scheme_name).filter(QuestionModel.question_id == attempt_dict['question_id']).first()
    if scheme_name:
        attempt_dict['scheme_name'] = str(scheme_name[0])
    return attempt_dict

@app.get("/attempt/user/{user_id}", status_code=status.HTTP_200_OK)
async def get_user_attempts(
    user_id: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_attempts = db.query(AttemptModel).filter(AttemptModel.user_id == user_id).order_by(AttemptModel.date.asc()).all()
    
    if not db_attempts:
        raise HTTPException(status_code=404, detail="Attempts not found")

    # Dictionary to group attempts by question_id
    attempts_by_question = {}

    # Group attempts by question_id
    for db_attempt in db_attempts:
        question_id = db_attempt.question_id
        if question_id not in attempts_by_question:
            attempts_by_question[question_id] = []
        attempts_by_question[question_id].append(db_attempt)

    attempts_list = []

    # Assign attempt count based on the order of date for each question
    for question_id, attempt_list in attempts_by_question.items():
        # Sort by date for each question
        sorted_attempts = sorted(attempt_list, key=lambda x: x.date)

        # Iterate through sorted attempts and assign an attempt count
        for idx, db_attempt in enumerate(sorted_attempts):
            db_question = db.query(QuestionModel).filter(QuestionModel.question_id == db_attempt.question_id).first()
            question_title = db_question.title
            scheme_name = db_question.scheme_name
            question_details = db_question.question_details

            # Convert attempt to dictionary and update it with additional fields
            attempt_dict = db_attempt.to_dict()
            attempt_dict.update({
                'question_title': question_title,
                'scheme_name': scheme_name,
                'question_details': question_details,
                'attemptCount': idx + 1  # Assign attempt count based on position
            })
            attempts_list.append(attempt_dict)

    return attempts_list

import logging

@app.post("/attempt", status_code=status.HTTP_201_CREATED)
async def create_attempt(
    schema: AttemptCreate, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    logging.info("Starting create_attempt function")
    
    inputs = schema.dict()
    db_question = db.query(QuestionModel).filter(QuestionModel.question_id == inputs['question_id']).first()
    
    if not db_question: 
        logging.error("Question not found")
        raise HTTPException(status_code=404, detail="Question does not exist")
    
    logging.info("Question details retrieved successfully")
    
    response = openAI_response(
        question=db_question.question_details, 
        response=inputs['answer'],
        ideal=db_question.ideal,
        ideal_system_name=db_question.ideal_system_name,
        ideal_system_url=db_question.ideal_system_url,
        system_name=inputs['system_name'],
        system_url=inputs['system_url']
    )
    
    logging.info("Response from openAI_response obtained")
    
    response_data = process_response(response)
    inputs.update(response_data)
    
    db_attempt = AttemptModel(**inputs)
    db.add(db_attempt)
    db.commit()
    logging.info("Attempt created successfully")

    await create_manual_feedback( 
        user_id=current_user.uuid, 
        question_id=inputs['question_id'], 
        attempt_id=db_attempt.attempt_id,
        db=db
    )

    # Fetch all previous attempts related to the question, excluding the current one
    previous_attempts = db.query(AttemptModel).filter(
        AttemptModel.question_id == inputs['question_id'],
        AttemptModel.attempt_id != db_attempt.attempt_id
    ).order_by(AttemptModel.date.desc()).all()

    if len(previous_attempts) == 0:
        logging.info(f"First attempt for question ID {inputs['question_id']}. No AI improvement will be created or updated.")
        return {"attempt_id": db_attempt.attempt_id, "ai_improvement_id": None}

    elif len(previous_attempts) == 1:
        logging.info(f"Triggering AI improvement creation for question ID {inputs['question_id']}")
        ai_improvement = await create_ai_improvement(
            question_id=inputs['question_id'], 
            last_attempt=db_attempt, 
            db=db,
            current_user=current_user
        )
        if ai_improvement is None:
            logging.warning("Skipping AI improvement creation due to not enough attempts.")
            return {"attempt_id": db_attempt.attempt_id, "ai_improvement_id": None}
        return {"attempt_id": db_attempt.attempt_id, "ai_improvement_id": ai_improvement.ai_improvements_id}

    else:
        logging.info(f"Triggering AI improvement update for question ID {inputs['question_id']}")
        ai_improvement = await update_ai_improvement(
            question_id=inputs['question_id'], 
            last_attempt=db_attempt, 
            db=db,
            current_user=current_user
        )
        if ai_improvement is None:
            logging.warning("Skipping AI improvement update due to not enough attempts.")
            return {"attempt_id": db_attempt.attempt_id, "ai_improvement_id": None}
        return {"attempt_id": db_attempt.attempt_id, "ai_improvement_id": ai_improvement.ai_improvements_id}
    
@app.put("/attempt/update_all", status_code=status.HTTP_200_OK)
async def update_all_attempts(
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    logging.info("Starting update_all_attempts function")

    # Fetch all attempts
    db_attempts = db.query(AttemptModel).all()
    if not db_attempts:
        raise HTTPException(status_code=404, detail="No attempts found")

    # Iterate over each attempt and update with new AI response
    for db_attempt in db_attempts:
        try:
            # Fetch the corresponding question details
            db_question = db.query(QuestionModel).filter(QuestionModel.question_id == db_attempt.question_id).first()
            if not db_question:
                logging.warning(f"Question with ID {db_attempt.question_id} not found. Skipping attempt ID {db_attempt.attempt_id}.")
                continue

            # Get the new AI response
            response = openAI_response(
                question=db_question.question_details, 
                response=db_attempt.answer,  # using the existing answer in the attempt
                ideal=db_question.ideal,
                ideal_system_name=db_question.ideal_system_name,
                ideal_system_url=db_question.ideal_system_url,
                system_name=db_attempt.system_name,
                system_url=db_attempt.system_url
            )

            # Process the response and update the attempt
            response_data = process_response(response)
            for key, value in response_data.items():
                setattr(db_attempt, key, value)

            db.commit()
            logging.info(f"Successfully updated attempt ID {db_attempt.attempt_id}")

        except Exception as e:
            logging.error(f"Error updating attempt ID {db_attempt.attempt_id}: {str(e)}")
            db.rollback()  # Rollback the session if any exception occurs

    return {"message": "All attempts have been updated with the new AI response"}

@app.get("/attempt/average_scores/user/{user_id}", status_code=200)
async def get_user_average_scores(
    user_id: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    # Subquery to find the attempts with the maximum sum of scores for each question
    attempts_with_max_sum_scores_subquery = (
        db.query(
            QuestionModel.scheme_name,
            AttemptModel.question_id,
            func.max(AttemptModel.precision_score + AttemptModel.accuracy_score + AttemptModel.tone_score).label("max_sum_scores")
        )
        .join(AttemptModel, AttemptModel.question_id == QuestionModel.question_id)
        .filter(AttemptModel.user_id == user_id)  # Filter attempts by user_id
        .group_by(QuestionModel.scheme_name, AttemptModel.question_id)
        .subquery()
    )

    # Query to get the average scores based on the attempts with the maximum sum of scores for each question and scheme
    avg_scores_query = (
        db.query(
            QuestionModel.scheme_name,
            func.avg(AttemptModel.precision_score).label("precision_score_avg"),
            func.avg(AttemptModel.accuracy_score).label("accuracy_score_avg"),
            func.avg(AttemptModel.tone_score).label("tone_score_avg")
        )
        .join(AttemptModel, AttemptModel.question_id == QuestionModel.question_id)
        .filter(
            QuestionModel.scheme_name == attempts_with_max_sum_scores_subquery.c.scheme_name,
            AttemptModel.question_id == attempts_with_max_sum_scores_subquery.c.question_id,
            AttemptModel.precision_score + AttemptModel.accuracy_score + AttemptModel.tone_score == attempts_with_max_sum_scores_subquery.c.max_sum_scores,
            AttemptModel.user_id == user_id  # Filter attempts by user_id
        )
        .group_by(QuestionModel.scheme_name)
        .all()
    )

    scheme_average_scores = []
    total_precision_score_avg = 0
    total_accuracy_score_avg = 0
    total_tone_score_avg = 0

    for scheme_name, precision_score_avg, accuracy_score_avg, tone_score_avg in avg_scores_query:
        scheme_average_scores.append({
            "scheme_name": scheme_name,
            "precision_score_avg": precision_score_avg,
            "accuracy_score_avg": accuracy_score_avg,
            "tone_score_avg": tone_score_avg
        })

        total_precision_score_avg += precision_score_avg
        total_accuracy_score_avg += accuracy_score_avg
        total_tone_score_avg += tone_score_avg

    # Calculate total average scores across all schemes
    total_scheme_count = len(avg_scores_query)
    if total_scheme_count > 0:
        total_precision_score_avg /= total_scheme_count
        total_accuracy_score_avg /= total_scheme_count
        total_tone_score_avg /= total_scheme_count

    # Add total average scores across all schemes to the list
    scheme_average_scores.append({
        "scheme_name": "All",
        "precision_score_avg": total_precision_score_avg,
        "accuracy_score_avg": total_accuracy_score_avg,
        "tone_score_avg": total_tone_score_avg
    })
    
    # Add schemes with no attempts
    distinct_schemes = (
        db.query(SchemeModel.scheme_name)
        .join(user_scheme_association, user_scheme_association.c.scheme_table_name == SchemeModel.scheme_name)
        .filter(user_scheme_association.c.user_table_id == user_id)
        .distinct()
        .all()
    )
    for scheme in distinct_schemes:
        scheme_name = scheme[0]
        if scheme_name not in [s["scheme_name"] for s in scheme_average_scores]:
            scheme_average_scores.append({
                "scheme_name": scheme_name,
                "precision_score_avg": 0,
                "accuracy_score_avg": 0,
                "tone_score_avg": 0
            })

    return scheme_average_scores

# Fetch the latest attempt and compare old feedback with new feedback after processing the new prompt
@app.post("/attempt/compare-latest-feedback", status_code=status.HTTP_200_OK)
async def compare_latest_feedback(
    request: ComparePromptRequest,  # Use the Pydantic model to parse the request body
    db: Session = Depends(create_session)
):
    logging.info("Fetching the latest attempt from the database")

    # Step 1: Fetch the latest attempt across the entire database
    latest_attempt = db.query(AttemptModel).order_by(AttemptModel.date.desc()).first()

    if not latest_attempt:
        raise HTTPException(status_code=404, detail="No attempts found")

    logging.info(f"Found latest attempt: {latest_attempt.attempt_id}")

    # Step 2: Fetch the corresponding question for context
    question = db.query(QuestionModel).filter(
        QuestionModel.question_id == latest_attempt.question_id
    ).first()

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    logging.info(f"Found question: {question.title}")

    # Step 3: Use the same answer and re-run it with the new prompt to get new feedback
    new_response = openAI_response(
        question=question.question_details,
        response=latest_attempt.answer,  # The same answer from the latest attempt
        ideal=question.ideal,
        ideal_system_name=question.ideal_system_name,
        ideal_system_url=question.ideal_system_url,
        system_name=latest_attempt.system_name,
        system_url=latest_attempt.system_url,
        prompt_text=request.prompt_text  # The new prompt provided for comparison
    )

    # Step 4: Process the new response (to extract scores and feedback)
    new_feedback = process_response(new_response)

    logging.info("New feedback generated using the new prompt")

    # Step 5: Prepare the old feedback stored in the database
    old_feedback = {
        "question": question,
        "answer": latest_attempt.answer,
        "system_name": latest_attempt.system_name,
        "system_url": latest_attempt.system_url,
        "precision_score": latest_attempt.precision_score,
        "accuracy_score": latest_attempt.accuracy_score,
        "tone_score": latest_attempt.tone_score,
        "accuracy_feedback": latest_attempt.accuracy_feedback,
        "precision_feedback": latest_attempt.precision_feedback,
        "tone_feedback": latest_attempt.tone_feedback,
        "general_feedback": latest_attempt.feedback
    }

    logging.info("Old feedback prepared from the database")

    # Step 6: Return both old and new feedback for comparison
    return {
        "old_feedback": old_feedback,
        "new_feedback": new_feedback
    }

## MANUAL FEEDBACK ROUTES
@app.post("/manual-feedback", status_code=status.HTTP_201_CREATED)
async def create_manual_feedback(
    user_id: str, 
    question_id: str, 
    attempt_id: str,
    db: Session = Depends(create_session)
):
    # Ensure the related user, question, and attempt exist
    db_user = db.query(UserModel).filter(UserModel.uuid == user_id).first()
    db_question = db.query(QuestionModel).filter(QuestionModel.question_id == question_id).first()
    db_attempt = db.query(AttemptModel).filter(AttemptModel.attempt_id == attempt_id).first()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    if not db_attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # Create the manual feedback record
    manual_feedback = ManualFeedbackModel(
        user_id=user_id,
        question_id=question_id,
        attempt_id=attempt_id,
        feedback="Insert feedback"
    )
    db.add(manual_feedback)
    db.commit()
    db.refresh(manual_feedback)

    return manual_feedback

@app.post("/manual-feedback/scan-create", status_code=status.HTTP_201_CREATED)
async def scan_and_create_feedback(
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    # Fetch all attempts
    db_attempts = db.query(AttemptModel).all()

    created_feedback = []
    for db_attempt in db_attempts:
        # Check if a manual feedback record already exists for this attempt
        existing_feedback = db.query(ManualFeedbackModel).filter(
            ManualFeedbackModel.attempt_id == db_attempt.attempt_id
        ).first()

        if not existing_feedback:
            # If no feedback exists, create one
            manual_feedback = ManualFeedbackModel(
                user_id=db_attempt.user_id,
                question_id=db_attempt.question_id,
                attempt_id=db_attempt.attempt_id,
                feedback="Insert feedback"  # You can generate or insert actual feedback here
            )
            db.add(manual_feedback)
            created_feedback.append(manual_feedback)

    # Commit all the new feedbacks to the database in one go
    if created_feedback:
        db.commit()

    return {
        "message": f"{len(created_feedback)} feedback records created.",
        "created_feedback": created_feedback
    }

@app.put("/manual-feedback/{manual_feedback_id}", status_code=status.HTTP_200_OK)
async def update_manual_feedback(
    manual_feedback_id: str,
    feedback: ManualFeedbackBase,
    db: Session = Depends(create_session)
):
    # Fetch the existing manual feedback record
    manual_feedback = db.query(ManualFeedbackModel).filter(
        ManualFeedbackModel.manual_feedback_id == manual_feedback_id
    ).first()

    if not manual_feedback:
        raise HTTPException(status_code=404, detail="Manual feedback not found")

    # Update the feedback attribute
    manual_feedback.feedback = feedback.feedback

    # Commit the changes to the database
    db.commit()
    db.refresh(manual_feedback)

    return {"message": "Feedback updated successfully", "manual_feedback": manual_feedback.to_dict()}

@app.get("/manual-feedback/attempt/{attempt_id}", status_code=status.HTTP_200_OK)
async def get_feedback(
    attempt_id: str,
    db: Session = Depends(create_session)
):
    # Fetch the manual feedback record using the attempt_id
    manual_feedback = db.query(ManualFeedbackModel).filter(
        ManualFeedbackModel.attempt_id == attempt_id
    ).first()

    if not manual_feedback:
        raise HTTPException(status_code=404, detail="Feedback not found for the given attempt ID")

    return {
        "manual_feedback_id": manual_feedback.manual_feedback_id,
        "feedback": manual_feedback.feedback
    }

## AI IMPROVEMENT ROUTES ##
@app.post("/ai-improvement/create/{question_id}", status_code=status.HTTP_201_CREATED)
async def create_ai_improvement(
    question_id: str,
    last_attempt: AttemptResponse, 
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    logging.info(f"Starting create_ai_improvement function for question_id: {question_id}")
    
    try:
        db_question = db.query(QuestionModel).filter(QuestionModel.question_id == question_id).first()

        if not db_question:
            raise HTTPException(status_code=404, detail="Question does not exist")
        
        # Filter attempts by the same user and question
        previous_attempts = db.query(AttemptModel).filter(
            AttemptModel.question_id == question_id,
            AttemptModel.user_id == current_user.uuid,  # Filter by current user
            AttemptModel.attempt_id != last_attempt.attempt_id
        ).order_by(AttemptModel.date.desc()).all()

        # Skip AI improvement creation if there are not enough previous attempts
        if len(previous_attempts) < 1:
            logging.info(f"Not enough attempts to generate improvements for question_id: {question_id} and user_id: {current_user.uuid}. Skipping AI improvement creation.")
            return None  # Skip the AI improvement creation

        second_last_attempt = previous_attempts[0]

        accuracy_improvement = last_attempt.accuracy_score - second_last_attempt.accuracy_score
        precision_improvement = last_attempt.precision_score - second_last_attempt.precision_score
        tone_improvement = last_attempt.tone_score - second_last_attempt.tone_score

        improvement_data = {
            "question": db_question.question_details,
            "ideal": db_question.ideal,
            "ideal_system_name": db_question.ideal_system_name,
            "ideal_system_url": db_question.ideal_system_url,
            "last_attempt": last_attempt.to_dict(),
            "previous_attempt": second_last_attempt.to_dict()
        }

        improvement_feedback = analyse_improvements(improvement_data)

        new_ai_improvement = AIImprovementsModel(
            question_id=question_id,
            user_id=current_user.uuid, 
            accuracy_improvement=accuracy_improvement,
            precision_improvement=precision_improvement,
            tone_improvement=tone_improvement,
            improvement_feedback=improvement_feedback,
            last_attempt_id=last_attempt.attempt_id,
            previous_attempt_id=second_last_attempt.attempt_id,
            updated=datetime.now()
        )

        db.add(new_ai_improvement)
        db.commit()
        db.refresh(new_ai_improvement)
        
        logging.info(f"AI improvement created for question_id: {question_id} and user_id: {current_user.uuid}")

        return new_ai_improvement

    except Exception as e:
        logging.error(f"Failed to create AI improvement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create AI improvement: {str(e)}")
    
@app.put("/ai-improvement/update/{question_id}", status_code=status.HTTP_200_OK)
async def update_ai_improvement(
    question_id: str,
    last_attempt: AttemptResponse, 
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    logging.info(f"Starting update_ai_improvement function for question_id: {question_id}")
    
    try:
        # Fetch the question associated with the question_id
        db_question = db.query(QuestionModel).filter(QuestionModel.question_id == question_id).first()

        if not db_question:
            raise HTTPException(status_code=404, detail="Question does not exist")
        
        # Filter attempts by the same user and question
        attempts = db.query(AttemptModel).filter(
            AttemptModel.question_id == question_id,
            AttemptModel.user_id == current_user.uuid,  # Filter by current user
            AttemptModel.attempt_id != last_attempt.attempt_id  # Exclude the current attempt
        ).order_by(AttemptModel.date.desc()).all()

        if len(attempts) < 1:
            logging.info(f"Not enough attempts to generate improvements for question_id: {question_id} and user_id: {current_user.uuid}. Skipping AI improvement creation.")
            return None  # Skip the AI improvement creation

        second_last_attempt = attempts[0]

        accuracy_improvement = last_attempt.accuracy_score - second_last_attempt.accuracy_score
        precision_improvement = last_attempt.precision_score - second_last_attempt.precision_score
        tone_improvement = last_attempt.tone_score - second_last_attempt.tone_score

        improvement_data = {
            "question": db_question.question_details,
            "ideal": db_question.ideal,
            "ideal_system_name": db_question.ideal_system_name,
            "ideal_system_url": db_question.ideal_system_url,
            "last_attempt": last_attempt.to_dict(),
            "previous_attempt": second_last_attempt.to_dict()
        }

        improvement_feedback = analyse_improvements(improvement_data)

        # Check if an AI improvement record already exists for the user and question
        ai_improvement_record = db.query(AIImprovementsModel).filter(
            AIImprovementsModel.question_id == question_id,
            AIImprovementsModel.user_id == current_user.uuid  # Filter by current user
        ).first()

        if not ai_improvement_record:
            logging.warning(f"AI improvement record not found for question_id: {question_id} and user_id: {current_user.uuid}. Redirecting to creation.")
            # If no record is found, redirect to creation
            ai_improvement_record = await create_ai_improvement(
                question_id=question_id,
                last_attempt=last_attempt,
                db=db,
                current_user=current_user
            )
            return ai_improvement_record

        # Update the existing AI improvement record
        ai_improvement_record.accuracy_improvement = accuracy_improvement
        ai_improvement_record.precision_improvement = precision_improvement
        ai_improvement_record.tone_improvement = tone_improvement
        ai_improvement_record.improvement_feedback = improvement_feedback
        ai_improvement_record.updated = datetime.now()

        db.commit()
        db.refresh(ai_improvement_record)
        logging.info(f"AI improvement updated for question_id: {question_id} and user_id: {current_user.uuid}")

        return ai_improvement_record

    except Exception as e:
        logging.error(f"Failed to update AI improvement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update AI improvement: {str(e)}")

# Route to get AI improvement for a question
@app.get("/ai-improvement/{question_id}/{user_id}", status_code=status.HTTP_200_OK)
async def get_ai_improvement(
    question_id: str,
    user_id: str,
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)  # Get the current user
):
    logging.info(f"Fetching AI improvement for question_id: {question_id} and user_id: {user_id}")
    
    # Filter the AI improvement record by question_id and user_id
    logging.info(f"Querying AI improvement with question_id: {question_id} and user_id: {user_id}")
    ai_improvement_record = db.query(AIImprovementsModel).filter(
        AIImprovementsModel.question_id == question_id,
        AIImprovementsModel.user_id == user_id
    ).first()
    
    if not ai_improvement_record:
        logging.warning(f"No record found for question_id: {question_id} and user_id: {user_id}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"message": "First attempt made. Improvement feedback will be available after subsequent attempts."}
        )

    # Retrieve related attempt data
    last_attempt = db.query(AttemptModel).filter(AttemptModel.attempt_id == ai_improvement_record.last_attempt_id).first()
    previous_attempt = db.query(AttemptModel).filter(AttemptModel.attempt_id == ai_improvement_record.previous_attempt_id).first()

    if not last_attempt or not previous_attempt:
        raise HTTPException(status_code=404, detail="Attempt data not found.")

    # Generate a single feedback string
    feedback = (
        f"Your last attempt had an accuracy score of {last_attempt.accuracy_score}, "
        f"precision score of {last_attempt.precision_score}, "
        f"and tone score of {last_attempt.tone_score}. "
        f"The attempt before that had an accuracy score of {previous_attempt.accuracy_score}, "
        f"precision score of {previous_attempt.precision_score}, "
        f"and tone score of {previous_attempt.tone_score}. "
        f"Your accuracy improved by {ai_improvement_record.accuracy_improvement}, "
        f"precision improved by {ai_improvement_record.precision_improvement}, "
        f"and tone improved by {ai_improvement_record.tone_improvement}."
    )

    # Prepare the response
    response = {
        "feedback": feedback,
        "last_updated": ai_improvement_record.updated,
        "improvement_feedback": ai_improvement_record.improvement_feedback  
    }

    return response

## For testing purposes ##
@app.post("/ai-improvement/retroactive/{question_id}")
async def retroactively_create_ai_improvements(
    question_id: str,
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    logging.info(f"Retroactively creating AI improvements for question_id: {question_id}")
    
    # Fetch the question
    question = db.query(QuestionModel).filter(QuestionModel.question_id == question_id).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question does not exist")

    # Fetch all attempts for the question
    attempts = db.query(AttemptModel).filter(AttemptModel.question_id == question_id).order_by(AttemptModel.date.desc()).all()

    if len(attempts) >= 2:
        last_attempt = attempts[0]
        second_last_attempt = attempts[1]

        # Calculate improvements based on accuracy, precision, and tone
        accuracy_improvement = last_attempt.accuracy_score - second_last_attempt.accuracy_score
        precision_improvement = last_attempt.precision_score - second_last_attempt.precision_score
        tone_improvement = last_attempt.tone_score - second_last_attempt.tone_score

        improvement_data = {
            "question": question.question_details,
            "ideal": question.ideal,
            "ideal_system_name": question.ideal_system_name,
            "ideal_system_url": question.ideal_system_url,
            "last_attempt": last_attempt.to_dict(),
            "previous_attempt": second_last_attempt.to_dict()
        }

        # Call the external AI analysis function to generate feedback
        improvement_feedback = analyse_improvements(improvement_data)

        # Create AI improvement record
        ai_improvement = AIImprovementsModel(
            question_id=question_id,
            user_id=last_attempt.user_id,
            last_attempt_id=last_attempt.attempt_id,
            previous_attempt_id=second_last_attempt.attempt_id,
            accuracy_improvement=accuracy_improvement,
            precision_improvement=precision_improvement,
            tone_improvement=tone_improvement,
            updated=datetime.now(),
            improvement_feedback=improvement_feedback
        )

        db.add(ai_improvement)
        db.commit()

        logging.info(f"AI Improvement created for question_id: {question_id}")
        return ai_improvement

    else:
        raise HTTPException(status_code=400, detail="Not enough attempts to generate improvements.")
    
@app.put("/ai-improvement/retroactive/{question_id}")
async def retroactively_update_ai_improvements(
    question_id: str,
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    logging.info(f"Retroactively updating AI improvements for question_id: {question_id}")
    
    # Fetch the question
    question = db.query(QuestionModel).filter(QuestionModel.question_id == question_id).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question does not exist")

    # Fetch all attempts for the question
    attempts = db.query(AttemptModel).filter(AttemptModel.question_id == question_id).order_by(AttemptModel.date.desc()).all()

    if len(attempts) >= 2:
        last_attempt = attempts[0]
        second_last_attempt = attempts[1]

        # Calculate improvements based on accuracy, precision, and tone
        accuracy_improvement = last_attempt.accuracy_score - second_last_attempt.accuracy_score
        precision_improvement = last_attempt.precision_score - second_last_attempt.precision_score
        tone_improvement = last_attempt.tone_score - second_last_attempt.tone_score

        improvement_data = {
            "question": question.question_details,
            "ideal": question.ideal,
            "ideal_system_name": question.ideal_system_name,
            "ideal_system_url": question.ideal_system_url,
            "last_attempt": last_attempt.to_dict(),
            "previous_attempt": second_last_attempt.to_dict()
        }

        # Call the external AI analysis function to generate feedback
        improvement_feedback = analyse_improvements(improvement_data)

        # Check if an AI improvement record already exists
        ai_improvement = db.query(AIImprovementsModel).filter(AIImprovementsModel.question_id == question_id).first()

        if ai_improvement:
            # Update the existing AI improvement record
            ai_improvement.last_attempt_id = last_attempt.attempt_id
            ai_improvement.previous_attempt_id = second_last_attempt.attempt_id
            ai_improvement.accuracy_improvement = accuracy_improvement
            ai_improvement.precision_improvement = precision_improvement
            ai_improvement.tone_improvement = tone_improvement
            ai_improvement.updated = datetime.now()
            ai_improvement.improvement_feedback = improvement_feedback

            db.commit()

            logging.info(f"AI Improvement updated for question_id: {question_id}")
            return ai_improvement

        else:
            raise HTTPException(status_code=404, detail="AI improvement record does not exist for this question.")

    else:
        raise HTTPException(status_code=400, detail="Not enough attempts to generate improvements.")
    
@app.post("/ai-improvement/scan-create")
async def scan_create_ai_improvements(
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    logging.info("Starting scan to retroactively create AI improvements")

    # Fetch all questions and users
    all_users = db.query(UserModel).all()
    all_questions = db.query(QuestionModel).all()

    improvements_created = 0

    for user in all_users:
        for question in all_questions:
            # Fetch all attempts by the user for the current question
            attempts = db.query(AttemptModel).filter(
                AttemptModel.user_id == user.uuid,
                AttemptModel.question_id == question.question_id
            ).order_by(AttemptModel.date.desc()).all()

            # Only proceed if there are at least two attempts
            if len(attempts) < 2:
                logging.info(f"Skipping question {question.question_id} for user {user.uuid}, not enough attempts.")
                continue

            last_attempt = attempts[0]
            second_last_attempt = attempts[1]

            # Check if an AI improvement already exists
            existing_improvement = db.query(AIImprovementsModel).filter(
                AIImprovementsModel.question_id == question.question_id,
                AIImprovementsModel.user_id == user.uuid
            ).first()

            if existing_improvement:
                logging.info(f"Skipping question {question.question_id} for user {user.uuid}, improvement already exists.")
                continue

            # Calculate improvements based on accuracy, precision, and tone
            accuracy_improvement = last_attempt.accuracy_score - second_last_attempt.accuracy_score
            precision_improvement = last_attempt.precision_score - second_last_attempt.precision_score
            tone_improvement = last_attempt.tone_score - second_last_attempt.tone_score

            improvement_data = {
                "question": question.question_details,
                "ideal": question.ideal,
                "ideal_system_name": question.ideal_system_name,
                "ideal_system_url": question.ideal_system_url,
                "last_attempt": last_attempt.to_dict(),
                "previous_attempt": second_last_attempt.to_dict()
            }

            # Call the external AI analysis function to generate feedback
            improvement_feedback = analyse_improvements(improvement_data)

            # Create AI improvement record
            ai_improvement = AIImprovementsModel(
                question_id=question.question_id,
                user_id=user.uuid,
                last_attempt_id=last_attempt.attempt_id,
                previous_attempt_id=second_last_attempt.attempt_id,
                accuracy_improvement=accuracy_improvement,
                precision_improvement=precision_improvement,
                tone_improvement=tone_improvement,
                updated=datetime.now(),
                improvement_feedback=improvement_feedback
            )

            db.add(ai_improvement)
            db.commit()
            improvements_created += 1
            logging.info(f"AI Improvement created for question_id: {question.question_id}, user_id: {user.uuid}")

    return {"message": f"{improvements_created} AI improvements created."}

## DYNAMIC PROMPT ROUTES ##
@app.put("/prompt", status_code=status.HTTP_200_OK)
async def create_or_update_prompt(
    prompt: PromptBase,
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    # Fetch the existing prompt
    existing_prompt = db.query(PromptModel).first()
    if existing_prompt:
        # Update the prompt text
        existing_prompt.prompt_text = prompt.prompt_text
        existing_prompt.updated_by = current_user.name
        db.commit()
        db.refresh(existing_prompt)
        message = "Prompt updated successfully"
        prompt_data = existing_prompt.to_dict()
    else:
        # Create a new prompt record
        new_prompt = PromptModel(prompt_text=prompt.prompt_text, updated_by=current_user.name)
        db.add(new_prompt)
        db.commit()
        db.refresh(new_prompt)
        message = "Prompt updated successfully"
        prompt_data = new_prompt.to_dict()

    return {"message": message, "prompt": prompt_data}

@app.delete("/prompt", status_code=status.HTTP_200_OK)
async def delete_prompt(
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    # Fetch the existing prompt
    existing_prompt = db.query(PromptModel).first()
    if existing_prompt:
        # Delete the prompt
        db.delete(existing_prompt)
        db.commit()
        return {"message": "Reverted to default prompt."}
    else:
        return {"message": "Already using default prompt."}

@app.get("/prompt/current", status_code=status.HTTP_200_OK)
async def get_current_prompt(
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    # Ensure the user is authenticated
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Fetch the current prompt
    existing_prompt = db.query(PromptModel).first()
    if existing_prompt and existing_prompt.prompt_text.strip():
        prompt_text = existing_prompt.prompt_text
        prompt_type = "dynamic"
        updated_by = existing_prompt.updated_by
        updated_at = existing_prompt.updated_at
    else:
        # Use the default prompt
        prompt_text = get_default_prompt()
        prompt_type = "default"
        updated_by = None
        updated_at = None

    return {
        "prompt_text": prompt_text,
        "prompt_type": prompt_type,
        "updated_by": updated_by,
        "updated_at": updated_at
    }

## DYNAMIC VECTORSTORE ROUTES ##
@app.post("/upload-faq-csv", status_code=201)
async def upload_faq_csv(
    file: UploadFile = File(...), 
    current_user: UserModel = Depends(get_current_user)
):
    # Ensure the uploaded file is a CSV
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")

    # Save the uploaded file to DYNAMIC_CSV_PATH
    contents = await file.read()
    with open(DYNAMIC_CSV_PATH, 'wb') as f:
        f.write(contents)

    # Call the function in openAI.py to update the vectorstore
    update_vectorstore()

    return {"message": "FAQ CSV uploaded and vectorstore updated successfully."}

@app.delete("/revert-faq-csv", status_code=200)
async def revert_faq_csv(
    current_user: UserModel = Depends(get_current_user)
):
    # Delete the dynamic CSV file
    if os.path.exists(DYNAMIC_CSV_PATH):
        os.remove(DYNAMIC_CSV_PATH)
        # Re-initialize the vectorstore to use the default CSV
        update_vectorstore()
        return {"message": "Reverted to default FAQ CSV and vectorstore updated."}
    else:
        return {"message": "Already using default."}

## SYSTEM NAMES AND URL ROUTES ##
@app.get("/systems", response_model=List[System], status_code=status.HTTP_200_OK)
async def get_systems(
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    systems = db.query(SystemModel).all()
    return systems

@app.post("/systems", response_model=System, status_code=status.HTTP_201_CREATED)
async def add_system(
    system: SystemCreate, 
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    new_system = SystemModel(name=system.name, url=system.url)
    db.add(new_system)
    db.commit()
    db.refresh(new_system)
    return new_system

@app.put("/systems/{system_id}", response_model=System, status_code=status.HTTP_200_OK)
async def update_system(
    system_id: int, 
    system: SystemUpdate, 
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    db_system = db.query(SystemModel).filter(SystemModel.id == system_id).first()
    if not db_system:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="System not found")
    db_system.name = system.name
    db_system.url = system.url
    db.commit()
    db.refresh(db_system)
    return db_system

@app.delete("/systems/{system_id}", status_code=status.HTTP_200_OK)
async def delete_system(
    system_id: int, 
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    db_system = db.query(SystemModel).filter(SystemModel.id == system_id).first()
    if not db_system:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="System not found")
    db.delete(db_system)
    db.commit()
    return {"message": "System deleted successfully"}

## S3 BUCKET ROUTES ##
def get_s3_image_urls(bucket_name, prefix):
    try:
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix
        )

        if 'Contents' not in response:
            return []

        image_urls = []
        for content in response['Contents']:
            image_urls.append(f"https://{bucket_name}.s3.amazonaws.com/{content['Key']}")

        # Exclude the first image URL
        if image_urls:
            image_urls = image_urls[1:]

        return image_urls
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/s3-images")
async def list_s3_images(
    current_user: UserModel = Depends(get_current_user)
):
    bucket_name = BUCKET_NAME 
    prefix = "images/"  
    try:
        image_urls = get_s3_image_urls(bucket_name, prefix)
        return {"image_urls": image_urls}
    except HTTPException as e:
        return {"error": e.detail}

@app.post("/upload-image", status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    # Check if the file is an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    try:
        # Generate a unique filename
        filename = f"{uuid.uuid4()}.{file.filename.split('.')[-1]}"
        s3_key = f"images/{filename}"

        # Upload the file to S3
        s3_client.upload_fileobj(
            file.file,
            BUCKET_NAME,
            s3_key,
            ExtraArgs={"ACL": "public-read", "ContentType": file.content_type}
        )

        # Construct the S3 URL
        s3_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}"

        return {"message": "Image uploaded successfully", "s3_url": s3_url}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
    
@app.delete("/delete-image", status_code=200)
async def delete_image(
    image_url: str,
    db: Session = Depends(create_session),
    current_user: UserModel = Depends(get_current_user)
):
    try:
        # Extract the S3 key from the image URL
        bucket_name = BUCKET_NAME
        if image_url.startswith(f"https://{bucket_name}.s3.amazonaws.com/"):
            s3_key = image_url.replace(f"https://{bucket_name}.s3.amazonaws.com/", "")
        else:
            raise HTTPException(status_code=400, detail="Invalid S3 URL provided.")

        # Delete the image from the S3 bucket
        s3_client.delete_object(Bucket=bucket_name, Key=s3_key)

        return {"message": "Image deleted successfully", "s3_key": s3_key}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")
