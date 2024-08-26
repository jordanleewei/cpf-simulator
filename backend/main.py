import logging
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Request, Form, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session, joinedload
from models.user import UserModel
from models.attempt import AttemptModel
from models.scheme import SchemeModel
from models.question import QuestionModel
from models.association_tables import user_scheme_association
from session import create_session, engine, open_session
from schemas.attempt import AttemptBase
from schemas.user import UserBase, UserInput, UserResponseSchema
from schemas.scheme import SchemeBase, SchemeInput
from schemas.question import QuestionBase
from schemas.table import TableBase
from config import Base, config
from sqlalchemy import func, distinct
from fastapi.middleware.cors import CORSMiddleware
from ML.openAI import process_response, openAI_response
import shutil
import uuid
import os
from dotenv import load_dotenv
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import boto3
import pandas as pd
from io import StringIO
from models.token import Token  # Import the Token model
from fastapi.responses import JSONResponse

# Import OAuth2PasswordBearer
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

origins = ["https://admin.ccutrainingsimulator.com", "https://csa.ccutrainingsimulator.com", "http://localhost:3001", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization"],
)

# # Middleware to log requests
# @app.middleware("http")
# async def log_requests(request: Request, call_next):
#     logger.info(f"Request from {request.client.host}:{request.client.port}")
#     logger.info(f"Request origin: {request.headers.get('origin')}")
#     logger.info(f"Request method: {request.method} {request.url}")
#     logger.info(f"Request headers: {request.headers}")

#     if request.method in ["POST", "PUT"]:
#         body = await request.body()
#         logger.info(f"Request body: {body.decode('utf-8')}")

#     response = await call_next(request)

#     logger.info(f"Response status: {response.status_code}")
#     logger.info(f"Response headers: {response.headers}")

#     return response

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
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Database initialization
Base.metadata.create_all(bind=engine)

# JWT token creation
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
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
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.uuid}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "uuid": user.uuid,
        "email": user.email,
        "name": user.name,
        "access_rights": user.access_rights  # Include access_rights directly in the response
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
        ideal_system_name = row['System (for internal reference to check against columns H, J, L and N)']
        ideal_system_urls = [
            (row['System 1'], row['System 1 URL']),
            (row['System 2'], row['System 2 URL']),
            (row['System 3'], row['System 3 URL']),
            (row['System 4'], row['System 4 URL'])
        ]
        
        # Concatenate all system names and URLs
        combined_system_names = ", ".join([name for name, _ in ideal_system_urls if pd.notna(name)])
        combined_system_urls = ", ".join([url for _, url in ideal_system_urls if pd.notna(url)])

        # Check if the scheme exists, if not create it using the add_new_scheme function
        scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme_name).first()
        if not scheme:
            scheme_name, file_url = scheme_name, ''  # You might need to provide a valid file_url here
            await add_new_scheme(scheme_name=scheme_name, file_url=file_url, db=db, current_user=current_user)
            scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme_name).first()

        # Check if the question already exists to avoid duplicates
        existing_question = db.query(QuestionModel).filter(QuestionModel.title == title, QuestionModel.scheme_name == scheme_name).first()
        if existing_question:
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
        "access_rights": db_user.access_rights
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
    if current_user.access_rights.lower() != "admin":
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
        access_rights=user.access_rights
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

@app.delete('/scheme/{scheme_name}', status_code=status.HTTP_200_OK)
async def delete_scheme(
    scheme_name: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_scheme = db.query(SchemeModel).filter(SchemeModel.scheme_name == scheme_name).first()
    if not db_scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    
    db.query(AttemptModel).filter(AttemptModel.question_id.in_(
        db.query(QuestionModel.question_id).filter(QuestionModel.scheme_name == scheme_name)
    )).delete(synchronize_session=False)
    
    db.delete(db_scheme)
    db.commit()

    return JSONResponse(content={"message": f"Scheme '{scheme_name}' deleted successfully along with related questions, attempts, and stored files."}, status_code=201)

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

@app.get("/attempt/user/{user_id}", status_code=status.HTTP_201_CREATED)
async def get_user_attempts(
    user_id: str, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    db_attempts = db.query(AttemptModel).filter(AttemptModel.user_id == user_id).order_by(AttemptModel.date.asc()).all()
    attempts_list = []
    if not db_attempts:
        raise HTTPException(status_code=404, detail="Attempts not found")

    for db_attempt in db_attempts:
        db_question = db.query(QuestionModel).filter(QuestionModel.question_id == db_attempt.question_id).first()
        question_title = db_question.to_dict()['title']
        scheme_name = db_question.to_dict()['scheme_name']
        question_details = db_question.to_dict()['question_details']
        attempt_dict = db_attempt.to_dict()
        attempt_dict.update({'question_title': question_title, 'scheme_name': scheme_name, 'question_details': question_details})
        attempts_list.append(attempt_dict)

    return attempts_list

import logging

@app.post("/attempt", status_code=status.HTTP_201_CREATED)
async def create_attempt(
    schema: AttemptBase, 
    db: Session = Depends(create_session), 
    current_user: UserModel = Depends(get_current_user)
):
    logging.info("Starting create_attempt function")
    
    try:
        inputs = dict(schema)
        db_question = db.query(QuestionModel).filter(QuestionModel.question_id == inputs['question_id']).first()
        
        if not db_question: 
            logging.error("Question not found")
            raise HTTPException(status_code=404, detail="Question does not exist")
        
        question = db_question.question_details
        ideal = db_question.ideal
        ideal_system_name = db_question.ideal_system_name
        ideal_system_url = db_question.ideal_system_url
        
        logging.info("Question details retrieved successfully")
        
        response = openAI_response(
            question=question, 
            response=inputs['answer'],
            ideal=ideal,
            ideal_system_name=ideal_system_name,
            ideal_system_url=ideal_system_url,
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
        return db_attempt.attempt_id
    
    except Exception as e:
        logging.error(f"Failed to create attempt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create attempt: {str(e)}")

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
