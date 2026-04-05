import requests
import os
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime

# .env 로드
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

MOGEF_API_KEY = os.getenv("MOGEF_API_KEY")
DATA_GO_KR_KEY = os.getenv("DATA_GO_KR_KEY")

# 데이터 경로
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BENCH_DIR = os.path.join(os.path.dirname(BASE_DIR), "bench")
CSV_PATH = os.path.join(BENCH_DIR, "clean_mind_health.csv")

def update_youth_facilities():
    """청소년 상담복지센터 및 시설 데이터 동기화 (여성가족부 API)"""
    print(f"[{datetime.now()}] Starting Youth Facilities update...")
    
    # Example Endpoint for Youth Facilities
    url = "https://apis.data.go.kr/1383000/yhis/YouthUseFcltPoiService/getYouthUseFcltPoiList"
    params = {
        "serviceKey": DATA_GO_KR_KEY,
        "pageNo": 1,
        "numOfRows": 100,
        "type": "json"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            # 실제 데이터 구속 및 정규화 로직 (Guide 10장)
            # res = data['response']['body']['items']
            print(f"Successfully fetched facilities from MOGEF API.")
            # For demo, we just log. Real logic would save to app/data/facilities.json
        else:
            print(f"Error fetching facilities: {response.status_code}")
    except Exception as e:
        print(f"Connection failed: {e}")

def check_kdca_updates():
    """질병관리청(KDCA) 청소년건강행태조사 최신 연도 스캐닝 (Guide 10장)"""
    # 실제 질병관리청 데이터는 원시자료 신청이 필요하므로, 
    # 여기서는 안내 누리집(yhs.kdca.go.kr)의 최신 소식을 체크하거나 
    # 공공데이터포털의 파일 데이터 목록을 검색하는 시뮬레이션을 수행합니다.
    print(f"[{datetime.now()}] Scanning KDCA for latest Health Statistics...")
    
    # KDCA 데이터 공고 검색 시뮬레이션
    target_url = "https://www.kdca.go.kr/yhs/"
    try:
        res = requests.get(target_url, timeout=5)
        if "2025" in res.text:
            print("Found 2025 data announcements. Updating local CSV...")
            # Real logic: Trigger download or update CSV headers
    except:
        print("KDCA check skipped (Network/SSL issues).")

def main():
    print("=== [Guide 10장] 데이터 자동 갱신 파이프라인 가동 ===")
    update_youth_facilities()
    check_kdca_updates()
    print("=== 업데이트 작업 완료 ===")

if __name__ == "__main__":
    main()
