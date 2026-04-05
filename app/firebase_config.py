import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

load_dotenv()

# Firebase 설정
# 실제 서비스에서는 환경 변수나 보안 폴더에 저장된 JSON 키 파일을 사용합니다.
CERT_PATH = os.path.join(os.path.dirname(__file__), "firebase_key.json")

db = None

def init_firebase():
    global db
    if not os.path.exists(CERT_PATH):
        print(f"[Firebase] Warning: {CERT_PATH} not found. Using Mock DB mode.")
        return None
    
    try:
        cred = credentials.Certificate(CERT_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("[Firebase] Initialized successfully.")
        return db
    except Exception as e:
        print(f"[Firebase] Error initializing: {e}")
        return None

# 초기화 실행
db = init_firebase()

def get_db():
    return db
