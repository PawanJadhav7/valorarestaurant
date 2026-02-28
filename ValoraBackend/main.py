from fastapi import FastAPI, Depends, HTTPException, status, Response, Cookie, Body
from sqlalchemy import text
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import hashlib
from fastapi.middleware.cors import CORSMiddleware
from ai_routes import router as ai_router

from database import Base, engine, SessionLocal
import models
from Test import GetResult

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ValoraBackend")


origins = [
    "http://localhost:3000",  # React / other frontend dev server
    "http://127.0.0.1:3000",
    # add your friend's real domain when deployed
    "https://valorarestaurant.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(ai_router)

SESSION_COOKIE_NAME = "vulnapp_session"

class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class PostCreate(BaseModel):
    title: str
    content: str


class PostOut(BaseModel):
    id: int
    title: str
    content: str
    author_email: EmailStr

    class Config:
        from_attributes = True

MAX_PASSWORD_LEN = 72

def _truncate(p: str) -> str:
    return p[:MAX_PASSWORD_LEN]

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def storedata():
    pass


def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(db: Session = Depends(get_db), session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME)):
    # Very naive session: we just store user_id directly in cookie as string.
    # (Intentionally weak – good for later security discussion.)
    if not session_id:
        return None
    user = db.get(models.User, int(session_id))
    return user

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-check")
def db_check(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1;"))
    value = result.scalar_one()
    return {"db": "ok", "value": value}

@app.post("/signup")
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter_by(email=payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = models.User(
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email}

@app.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    # Naive session: set user_id directly as cookie value
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=str(user.id),
        httponly=False,  # deliberately weak for later XSS discussion
        samesite="Lax",
    )
    return {"message": "logged in", "user_id": user.id}

@app.post("AIprompt")
def AIprompt(response:Response):

    storedata()
    pass

@app.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"message": "logged out"}

@app.post("/posts", response_model=PostOut)
def create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(get_current_user),
):
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    post = models.Post(
        title=payload.title,
        content=payload.content,
        user_id=current_user.id,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return PostOut(
        id=post.id,
        title=post.title,
        content=post.content,
        author_email=current_user.email,
    )

@app.get("/posts", response_model=List[PostOut])
def list_posts(db: Session = Depends(get_db)):
    posts = db.query(models.Post).join(models.User).all()
    out: List[PostOut] = []
    for post in posts:
        out.append(
            PostOut(
                id=post.id,
                title=post.title,
                content=post.content,
                author_email=post.author.email,
            )
        )
    return out

@app.post("/getvalue")
def get_value(payload: int = Body(...), db: Session = Depends(get_db)):
    return GetResult(payload).fetchresult()
