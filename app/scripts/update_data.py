import os
import requests
import pandas as pd
from datetime import datetime

# 가이드 §10. 자동화 및 API 키 운영 기반 스크립트
# MOGEF API 및 공공데이터포털 연동을 위한 스켈레톤

MOGEF_API_KEY = os.getenv("MOGEF_API_KEY", "")
CSV_OUTPUT = "bench/clean_facility.csv"

def fetch_mogef_facilities():
    print(f"[{datetime.now()}] MOGEF API 데이터 수집 시작...")
    
    # 1. 실제 API 호출 예시 (수련시설)
    # url = "http://apis.data.go.kr/1382000/servMogg/getYouthFacilitList"
    # params = {"serviceKey": MOGEF_API_KEY, "type": "json", "numOfRows": 100}
    
    # 2. 전처리 및 정규화 (가이드 §4.3)
    # mock data generation for demonstration of the pipeline
    mock_data = [
        ["서울청소년센터", "서울특별시", "중구", "서울 중구 을지로 11", 37.566, 126.982, "수련시설"],
        ["경기청소년쉼터", "경기도", "수원시", "경기 수원시 팔달구", 37.263, 127.028, "쉼터"]
    ]
    df = pd.DataFrame(mock_data, columns=["시설명", "시도명", "시군구명", "소재지도로명주소", "위도", "경도", "주요시설"])
    
    # 정규화: '성평등가족부' -> '여성가족부' 등 명칭 통일 로직 가능
    
    # 3. 파일 저장
    df.to_csv(CSV_OUTPUT, index=False, encoding='utf-8-sig')
    print(f"[{datetime.now()}] 데이터 갱신 완료: {CSV_OUTPUT}")

if __name__ == "__main__":
    if not MOGEF_API_KEY:
        print("MOGEF_API_KEY가 설정되지 않았습니다.")
    else:
        fetch_mogef_facilities()
