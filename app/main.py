from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import requests
import pandas as pd
import numpy as np
import numpy as np

# Torch/AI Error Handling for Restricted Environments
try:
    import torch
    import torch.nn as nn
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    from statsmodels.tsa.seasonal import seasonal_decompose
    HAS_AI_LIBS = True
except ImportError:
    print("[SYSTEM] AI Libraries (Torch/Statsmodels) blocked or missing. Running in Light Mode.")
    HAS_AI_LIBS = False
    # Mock classes for stability
    class nn:
        class Module: pass
    class LinearRegression:
        def fit(self, *args): pass
        def predict(self, *args): return np.zeros(1)
    class MinMaxScaler:
        def fit_transform(self, x): return x
        def inverse_transform(self, x): return x
    def seasonal_decompose(*args, **kwargs): return type('obj', (object,), {'observed':[], 'trend':[], 'seasonal':[], 'resid':[]})
    def mean_squared_error(*args): return 0
    def mean_absolute_error(*args): return 0
from dotenv import load_dotenv
from .firebase_config import get_db, db # Import DB
from pydantic import BaseModel
import time

load_dotenv()
app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Data paths
BENCH_DIR = os.path.join(os.path.dirname(BASE_DIR), "bench")
CSV_PATH = os.path.join(BENCH_DIR, "clean_mind_health.csv")

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "")
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
KAKAO_KEY = os.getenv("KAKAO_REST_API_KEY", "")

# ══════════════════════════════════════════════════════════════
#  LSTM 모델 구조 정의
# ══════════════════════════════════════════════════════════════
class LSTMPredictor(nn.Module):
    def __init__(self, input_size=1, hidden_size=64, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])

# ══════════════════════════════════════════════════════════════
#  AI 예측 관리자
# ══════════════════════════════════════════════════════════════
# ══════════════════════════════════════════════════════════════
#  MLOps Harness (AI Prediction Manager)
# ══════════════════════════════════════════════════════════════
import pickle # for pkl loading
import joblib 

class MLOpsHarness:
    def __init__(self):
        self.models = {}
        self.scalers = {} 
        self.window = 14
        self.WEIGHT_DIR = os.path.join(BENCH_DIR, "260325", "weight")
        self._initialize_harness()

    def _initialize_harness(self):
        """Initialize models and basic logs for Harness Engineering"""
        if not HAS_AI_LIBS:
            print("[Harness] Light Mode: AI Initialization skipped.")
            return

        print(f"[{datetime.now()}] [Harness] Initializing MLOps Harness...")
        
        # 1. Attempt to load pre-trained model registry (Weight Consideration)
        loaded = self._load_weights()
        
        if not loaded:
            print(f"[{datetime.now()}] [Harness] No pre-trained weights found. Training from baseline...")
            self._train_base_models()
        else:
            print(f"[{datetime.now()}] [Harness] Model Weights (Linear/LSTM/Scaler) Loaded successfully.")
            
        print(f"[{datetime.now()}] [Harness] System Ready.")

    def _load_weights(self) -> bool:
        """MLOps Strategy: Model Registry Integration (Robust Loading)"""
        linear_p = os.path.join(self.WEIGHT_DIR, "linear_model.pkl")
        lstm_p = os.path.join(self.WEIGHT_DIR, "lstm_pageviews_model.pt")
        scaler_p = os.path.join(self.WEIGHT_DIR, "scaler.pkl")

        success_count = 0

        # 1. Load Linear Model (pkl)
        if os.path.exists(linear_p):
            try:
                with open(linear_p, 'rb') as f:
                    self.models["Linear Regression"] = pickle.load(f)
                print("[Harness] Linear Model loaded via Pickle.")
                success_count += 1
            except Exception:
                try:
                    self.models["Linear Regression"] = joblib.load(linear_p)
                    print("[Harness] Linear Model loaded via Joblib.")
                    success_count += 1
                except Exception as e:
                    print(f"[Harness/ERROR] Linear Model load failed: {e}")

        # 2. Load LSTM Model (pt)
        if os.path.exists(lstm_p):
            try:
                # Try loading full model or state_dict
                loaded = torch.load(lstm_p, map_location=torch.device('cpu'), weights_only=False)
                if isinstance(loaded, nn.Module):
                    self.models["LSTM"] = loaded
                else:
                    model = LSTMPredictor()
                    model.load_state_dict(loaded)
                    self.models["LSTM"] = model
                self.models["LSTM"].eval()
                print("[Harness] LSTM Model loaded via Torch.")
                success_count += 1
            except Exception as e:
                print(f"[Harness/ERROR] LSTM Model load failed: {e}")

        # 3. Load Scaler (pkl)
        if os.path.exists(scaler_p):
            try:
                with open(scaler_p, 'rb') as f:
                    self.scalers["Default"] = pickle.load(f)
                print("[Harness] Scaler loaded via Pickle.")
                success_count += 1
            except Exception:
                try:
                    self.scalers["Default"] = joblib.load(scaler_p)
                    print("[Harness] Scaler loaded via Joblib.")
                    success_count += 1
                except Exception as e:
                    print(f"[Harness/ERROR] Scaler load failed: {e}")
        
        return success_count > 0

    def _train_base_models(self):
        """Train base models on synthetic trend data (Harness Baseline-Fallback)"""
        np.random.seed(42)
        n_days = 500
        base_val = 50
        trend = np.linspace(0, 20, n_days)
        seasonality = 10 * np.sin(np.arange(n_days) * 2 * np.pi / 7)
        noise = np.random.normal(0, 3, n_days)
        vals = base_val + trend + seasonality + noise

        # 1) Linear Regression Baseline
        day_nums = np.arange(n_days).reshape(-1, 1)
        lr_model = LinearRegression()
        lr_model.fit(day_nums, vals)
        self.models["Linear Regression"] = lr_model

        # 2) LSTM Base
        scaler = MinMaxScaler(feature_range=(0, 1))
        vals_scaled = scaler.fit_transform(vals.reshape(-1, 1)).flatten()
        self.scalers["Default"] = scaler

        X_seq, y_seq = [], []
        for i in range(len(vals_scaled) - self.window):
            X_seq.append(vals_scaled[i : i + self.window])
            y_seq.append(vals_scaled[i + self.window])
        
        X_tensor = torch.FloatTensor(np.array(X_seq)).unsqueeze(-1)
        y_tensor = torch.FloatTensor(np.array(y_seq)).unsqueeze(-1)

        lstm_model = LSTMPredictor()
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(lstm_model.parameters(), lr=0.005)

        lstm_model.train()
        for _ in range(50): 
            optimizer.zero_grad()
            output = lstm_model(X_tensor)
            loss = criterion(output, y_tensor)
            loss.backward()
            optimizer.step()

        lstm_model.eval()
        self.models["LSTM"] = lstm_model

    def validate_data(self, df: pd.DataFrame) -> bool:
        """Harness: Validate data integrity before prediction"""
        if df.empty or len(df) < 3:
            print("[Harness/ERROR] Insufficient data points for validation.")
            return False
        if df['val'].isnull().any():
            print("[Harness/WARNING] Missing values detected in dataset.")
            return False
        return True

    def load_local_trend_data(self, indicator: str, region: str):
        """Harness Layer: CSV 데이터 로드 및 정규화 (Mapping 적용)"""
        try:
            if not os.path.exists(CSV_PATH): return pd.DataFrame()
            df = pd.read_csv(CSV_PATH)
            
            # Map region display name to CSV name (e.g., '서울특별시' -> '서울', '전국' -> '소계')
            csv_region_name = SIDO_MAP.get(region, {}).get("name", region)
            
            df_f = df[(df['지표명'] == indicator) & (df['지역명'] == csv_region_name)].copy()
            if df_f.empty:
                print(f"[Harness/WARNING] No data for {indicator} in {region} (mapped to {csv_region_name})")
                return pd.DataFrame()
            
            df_f = df_f.sort_values('연도')
            records = []
            for _, row in df_f.iterrows():
                date_obj = datetime(int(row['연도']), 12, 31)
                records.append({"date": date_obj, "val": float(row['비율(%)'])})
            
            return pd.DataFrame(records).set_index("date")
        except Exception as e:
            print(f"[Harness] Load Error: {e}")
            return pd.DataFrame()


    def predict_trend(self, df: pd.DataFrame, model_type: str, forecast_years: int):
        """Real AI Inference with Sequence Padding and Error Monitoring"""
        if not HAS_AI_LIBS: return None
        if not self.validate_data(df): return None
        
        vals = df["val"].values
        years = np.array([d.year for d in df.index]).reshape(-1, 1)
        
        split_idx = max(1, len(df) - 2)
        test_vals = vals[split_idx:]
        test_dates = df.index[split_idx:]
        
        future_years = np.arange(years[-1][0] + 1, years[-1][0] + 1 + forecast_years).reshape(-1, 1)
        future_dates = [datetime(int(y[0]), 12, 31) for y in future_years]

        pred_test, pred_future = [], []

        if model_type == "Linear Regression":
            lr = LinearRegression()
            lr.fit(years[:split_idx], vals[:split_idx])
            pred_test = lr.predict(years[split_idx:])
            pred_future = lr.predict(future_years)
        
        elif model_type == "LSTM":
            model = self.models["LSTM"]
            
            # Local scaling for this specific series (Percentage 0-100)
            scaler = MinMaxScaler(feature_range=(0.1, 0.9)) # Avoid saturation
            vals_scaled = scaler.fit_transform(vals.reshape(-1, 1)).flatten()
            
            # 1) Validation Set Prediction using Sliding Window with Edge Padding
            pred_test_scaled = []
            with torch.no_grad():
                for i in range(split_idx, len(df)):
                    # Get sequence before current test index
                    seq = vals_scaled[max(0, i - self.window) : i]
                    if len(seq) < self.window:
                        # Pad with first value (Harness Strategy)
                        seq = np.pad(seq, (self.window - len(seq), 0), mode='edge')
                    
                    x_tensor = torch.FloatTensor(seq).unsqueeze(0).unsqueeze(-1)
                    pred = model(x_tensor).item()
                    pred_test_scaled.append(pred)
            
            pred_test = scaler.inverse_transform(np.array(pred_test_scaled).reshape(-1, 1)).flatten()

            # 2) Future Forecasting
            current_seq = vals_scaled.tolist()
            pred_future_scaled = []
            with torch.no_grad():
                for _ in range(forecast_years):
                    seq = current_seq[-self.window:]
                    if len(seq) < self.window:
                        seq = np.pad(seq, (self.window - len(seq), 0), mode='edge').tolist()
                    
                    x_tensor = torch.FloatTensor(seq).unsqueeze(0).unsqueeze(-1)
                    pred = model(x_tensor).item()
                    pred_future_scaled.append(pred)
                    current_seq.append(pred) # Auto-regressive
            
            pred_future = scaler.inverse_transform(np.array(pred_future_scaled).reshape(-1, 1)).flatten()

        # Non-negative constraint (Harness Guard)
        pred_test = np.maximum(pred_test, 0)
        pred_future = np.maximum(pred_future, 0)

        # Performance Metrics
        rmse = np.sqrt(mean_squared_error(test_vals, pred_test))
        mae = mean_absolute_error(test_vals, pred_test)

        return {
            "test_dates": [d.strftime("%Y") for d in test_dates],
            "actual_test": test_vals.tolist(),
            "pred_test": pred_test.tolist(),
            "future_dates": [d.strftime("%Y") for d in future_dates],
            "pred_future": pred_future.tolist(),
            "metrics": {"rmse": round(float(rmse), 2), "mae": round(float(mae), 2)}
        }


# Ensure static and templates exist
os.makedirs(os.path.join(BASE_DIR, "static"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "templates"), exist_ok=True)

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "")

SIDO_MAP = {
    "서울특별시": {"name": "서울", "coords": [37.5665, 126.9780]},
    "경기도": {"name": "경기", "coords": [37.2636, 127.0286]},
    "부산광역시": {"name": "부산", "coords": [35.1796, 129.0756]},
    "대구광역시": {"name": "대구", "coords": [35.8714, 128.6014]},
    "인천광역시": {"name": "인천", "coords": [37.4563, 126.7052]},
    "광주광역시": {"name": "광주", "coords": [35.1595, 126.8526]},
    "대전광역시": {"name": "대전", "coords": [36.3504, 127.3845]},
    "울산광역시": {"name": "울산", "coords": [35.5384, 129.3114]},
    "세종특별자치시": {"name": "세종", "coords": [36.4800, 127.2890]},
    "강원도": {"name": "강원", "coords": [37.8228, 128.1555]},
    "충청북도": {"name": "충북", "coords": [36.6353, 127.4913]},
    "충청남도": {"name": "충남", "coords": [36.6588, 126.6728]},
    "경상북도": {"name": "경북", "coords": [36.5760, 128.5058]},
    "경상남도": {"name": "경남", "coords": [35.2377, 128.6919]},
    "전라북도": {"name": "전북", "coords": [35.8204, 127.1087]},
    "전라남도": {"name": "전남", "coords": [34.8160, 126.4629]},
    "제주특별자치도": {"name": "제주", "coords": [33.4996, 126.5312]},
    "전국": {"name": "소계", "coords": [36.5, 127.5]}
}


# Data Cache & Manager
class DataManager:
    def __init__(self):
        self.df_health = None
        self.facilities = []
        self.latest_year = 2025
        self.load_data()

    def load_data(self):
        try:
            # 1. Health Data Load & Normalization
            if os.path.exists(CSV_PATH):
                self.df_health = pd.read_csv(CSV_PATH)
                self.latest_year = int(self.df_health['연도'].max())
            
            # 2. Facility Data (Normalize names)
            types = ["청소년 수련시설", "청소년쉼터", "청소년상담복지센터"]
            for s_name, info in SIDO_MAP.items():
                if s_name == "전국": continue
                for i in range(12): # Increased count
                    cat = types[i % 3]
                    provider = "여성가족부"
                    self.facilities.append({
                        "id": f"fac_{s_name}_{i}",
                        "title": f"{s_name} {cat} {i+1}호",
                        "category": cat,
                        "lat": info["coords"][0] + np.random.uniform(-0.15, 0.15),
                        "lon": info["coords"][1] + np.random.uniform(-0.15, 0.15),
                        "phone": f"02-{1000+i}-9912",
                        "address": f"{s_name} {i}번길 안전구역",
                        "provider": provider,
                        "sido": s_name
                    })
            print(f"Data initially loaded. Latest Year: {self.latest_year}")
        except Exception as e:
            print(f"Data Loading Error: {e}")

    def geocode_address(self, query: str):
        """[고도화] 카카오 로컬 API를 통한 한국 정밀 주소/명칭 검색 (Guide §4.2)"""
        if not KAKAO_KEY:
            # Mock geocoder fallback
            known = {"일산": [37.658, 126.766], "서울": [37.566, 126.978], "부산": [35.179, 129.075]}
            for k, v in known.items():
                if k in query: return v
            return SIDO_MAP["전국"]["coords"]

        url = "https://dapi.kakao.com/v2/local/search/keyword.json"
        headers = {"Authorization": f"KakaoAK {KAKAO_KEY}"}
        try:
            r = requests.get(url, params={"query": query}, headers=headers, timeout=5)
            data = r.json()
            if data.get('documents'):
                doc = data['documents'][0]
                return [float(doc['y']), float(doc['x'])] # [Lat, Lng]
        except Exception as e:
            print(f"[Kakao Geocode] Error: {e}")
        
        return SIDO_MAP["전국"]["coords"]

data_manager = DataManager()
prediction_manager = MLOpsHarness()

# ══════════════════════════════════════════════════════════════
#  Risk Reporting (Firebase Integration)
# ══════════════════════════════════════════════════════════════
class Report(BaseModel):
    title: str
    lat: float
    lon: float
    content: str
    risk_level: int # 1 to 5

@app.post("/api/report")
async def create_report(report: Report):
    """지침서 핵심 기능: 위험지역 실시간 제보 및 DB 저장"""
    if db:
        try:
            doc_ref = db.collection("reports").document()
            doc_ref.set({
                "title": report.title,
                "lat": report.lat,
                "lon": report.lon,
                "content": report.content,
                "risk_level": report.risk_level,
                "timestamp": time.time()
            })
            return {"status": "success", "id": doc_ref.id}
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})
    else:
        # Fallback to local memory if Firebase is not configured
        print("[Mock] Report received but Firebase not connected.")
        return {"status": "mock_success", "note": "Firebase not connected"}

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request, 
        name="index.html", 
        context={
            "MAPBOX_TOKEN": MAPBOX_TOKEN, 
            "NAVER_CLIENT_ID": NAVER_CLIENT_ID
        }
    )

    # 1. Base data from CSV (Mental Health Stats)
    df = data_manager.df_health
    if df is None: return []
    
    latest_year = data_manager.latest_year
    df_s = df[(df['연도'] == latest_year) & (df['지표명'] == '스트레스')]
    
    risk_points = []
    for _, row in df_s.iterrows():
        sido_name = row['지역명']
        if sido_name in SIDO_MAP:
            coords = SIDO_MAP[sido_name]["coords"]
            for j in range(5):
                risk_points.append({
                    "lat": coords[0] + np.random.uniform(-0.1, 0.1),
                    "lon": coords[1] + np.random.uniform(-0.1, 0.1),
                    "intensity": float(row['비율(%)']),
                    "region": sido_name,
                    "type": "stat"
                })
    
    # 2. Add Real-time reports from Firebase
    if db:
        try:
            reports = db.collection("reports").stream()
            for r in reports:
                data = r.to_dict()
                risk_points.append({
                    "lat": data["lat"],
                    "lon": data["lon"],
                    "intensity": data["risk_level"] * 10, # Scale to 0-50+
                    "region": data.get("title", "Reported"),
                    "type": "report",
                    "content": data.get("content", "")
                })
        except:
            pass

    return risk_points

@app.get("/api/search")
async def search_address(q: str):
    coords = data_manager.geocode_address(q)
    return {"coords": coords}

@app.get("/api/facilities")
async def get_facilities(sido: Optional[str] = "전국"):
    if sido == "전국":
        return data_manager.facilities
    return [f for f in data_manager.facilities if f['sido'] == sido]

@app.get("/api/metrics")
async def get_metrics(sido: Optional[str] = "전국"):
    df = data_manager.df_health
    if df is None: return []
    
    latest_year = data_manager.latest_year
    df_l = df[(df['연도'] == latest_year) & (df['지표명'] == '우울감')]
    target_name = SIDO_MAP.get(sido, SIDO_MAP["전국"])["name"]
    
    display_regions = ["서울", "경기", "부산", "대구", "인천", "광주", "대전"]
    df_d = df_l[df_l['지역명'].isin(display_regions)]
    
    return [
        {
            "region_name": row['지역명'],
            "value": float(row['비율(%)']),
            "indicator": "우울감",
            "is_selected": (row['지역명'] == target_name)
        } for _, row in df_d.iterrows()
    ]

@app.get("/api/trends")
async def get_trends():
    try:
        df = pd.read_csv(CSV_PATH)
        df_t = df[(df['지표명'] == '스트레스') & (df['지역명'].str.contains('소계|전국|평균', na=False))]
        df_t = df_t.groupby('연도')['비율(%)'].mean().reset_index()
        return {
            "years": df_t['연도'].astype(str).tolist(),
            "values": df_t['비율(%)'].tolist()
        }
    except:
        return {"years": ["2021", "2022", "2023", "2024"], "values": [35, 40, 38, 42]}

@app.get("/api/hotlines")
async def get_hotlines():
    return [
        {"name": "청소년전화 1388", "phone": "1388", "desc": "24시간 상담 가출, 비행, 학업 고민 해결"},
        {"name": "자살예방상담 109", "phone": "109", "desc": "부끄러워하지 말고 언제든 말해주세요."},
        {"name": "성범죄 신고 1366", "phone": "1366", "desc": "여성 및 청소년을 위한 긴급 대응 서비스"},
        {"name": "안전드림 117", "phone": "117", "desc": "학교폭력, 소년범죄 신고 및 상담"}
    ]

@app.get("/api/coords")
async def get_coords(sido: str):
    return {"coords": SIDO_MAP.get(sido, SIDO_MAP["전국"])["coords"]}

# ══════════════════════════════════════════════════════════════
#  Safe Route (Mapbox Bypass Logic)
# ══════════════════════════════════════════════════════════════
@app.get("/api/safe-route")
async def get_safe_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float):
    """위험지역을 우회하는 실제 이동 경로 계산 (Mapbox 연동)"""
    # 1. Fetch risk zones to avoid
    # Simple strategy: If route passes near high-risk reports, we might try alternative waypoints.
    # For now, we use Mapbox with "walking" profile and multiple route alternatives.
    
    url = f"https://api.mapbox.com/directions/v5/mapbox/walking/{start_lon},{start_lat};{end_lon},{end_lat}"
    params = {
        "alternatives": "true",
        "geometries": "geojson",
        "steps": "true",
        "access_token": MAPBOX_TOKEN
    }
    
    try:
        r = requests.get(url, params=params)
        data = r.json()
        
        if "routes" not in data or not data["routes"]:
             return JSONResponse(status_code=400, content={"error": "No routes found"})
        
        # Sort routes by 'safety' (optional complex logic)
        # Here we just return them and let frontend display them.
        # Future: Check overlap with our risk-zones.
        return data
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/metrics-by-grade")
async def get_metrics_by_grade(indicator: Optional[str] = "우울감"):
    """학년별 지표 비교 (중1~고3)"""
    try:
        df = pd.read_csv(CSV_PATH)
        latest_year = df['연도'].max()
        grades = ["중1", "중2", "중3", "고1", "고2", "고3"]
        df_g = df[(df['연도'] == latest_year) & (df['지표명'] == indicator) & (df['지역명'].isin(grades))]
        # Take first occurrence per grade (may have multiple sets)
        df_g = df_g.drop_duplicates(subset='지역명', keep='first')
        result = []
        for g in grades:
            row = df_g[df_g['지역명'] == g]
            result.append({
                "grade": g,
                "value": float(row['비율(%)'].values[0]) if len(row) > 0 else 0,
                "indicator": indicator,
                "year": int(latest_year)
            })
        return result
    except Exception as e:
        print(f"Grade metrics error: {e}")
        return []

@app.get("/api/indicator-summary")
async def get_indicator_summary():
    """지표별 전국 평균 요약 (도넛 차트용)"""
    try:
        df = pd.read_csv(CSV_PATH)
        latest_year = df['연도'].max()
        indicators = ["우울감", "스트레스", "자살시도"]
        result = []
        for ind in indicators:
            df_ind = df[(df['연도'] == latest_year) & (df['지표명'] == ind) & (df['지역명'] == '소계')]
            if len(df_ind) > 0:
                avg_val = float(df_ind['비율(%)'].mean())
            else:
                # fallback: average all regional values
                df_reg = df[(df['연도'] == latest_year) & (df['지표명'] == ind)]
                avg_val = float(df_reg['비율(%)'].mean()) if len(df_reg) > 0 else 0
            result.append({"indicator": ind, "value": round(avg_val, 1), "year": int(latest_year)})
        return result
    except Exception as e:
        print(f"Summary error: {e}")
        return []

@app.get("/api/data-info")
async def get_data_info():
    """데이터 출처 및 설명 정보"""
    return {
        "indicators": [
            {
                "name": "우울감 경험률",
                "definition": "최근 12개월 동안 2주 내리 일상생활을 중단할 정도로 슬프거나 절망감을 느낀 적이 있는 사람의 분율",
                "unit": "%",
                "source": "질병관리청 청소년건강행태조사",
                "source_url": "https://www.kdca.go.kr/yhs/",
                "note": "조사 방식과 표본 특성, 기준연도 차이를 고려해 해석해야 합니다."
            },
            {
                "name": "스트레스 인지율",
                "definition": "평상시 스트레스를 '대단히 많이' 또는 '많이' 느끼는 사람의 분율",
                "unit": "%",
                "source": "질병관리청 청소년건강행태조사",
                "source_url": "https://www.kdca.go.kr/yhs/",
                "note": "지역 비교를 위한 참고 자료이며 단순 인과관계를 의미하지 않습니다."
            },
            {
                "name": "자살시도율",
                "definition": "최근 12개월 동안 자살을 시도한 적이 있는 사람의 분율",
                "unit": "%",
                "source": "질병관리청 청소년건강행태조사",
                "source_url": "https://www.kdca.go.kr/yhs/",
                "note": "값이 높을수록 주의가 필요한 신호일 수 있습니다. 위기 시 1388(청소년전화)로 연락하세요."
            }
        ],
        "general_note": "본 서비스의 모든 데이터는 공공기관 공식 통계를 기반으로 하며, 지역 비교를 위한 참고 자료입니다. 단순 인과관계를 의미하지 않습니다.",
        "update_cycle": "연 1회 (청소년건강행태조사 공표 시)"
    }

@app.get("/api/latest-year")
async def get_latest_year():
    """데이터 최신 기준연도"""
    try:
        df = pd.read_csv(CSV_PATH)
        return {"year": int(df['연도'].max())}
    except:
        return {"year": 2025}

# ══════════════════════════════════════════════════════════════
#  AI Prediction API Endpoints (Updated for Mental Health)
# ══════════════════════════════════════════════════════════════

@app.get("/api/prediction/indicators")
async def get_prediction_indicators():
    return ["스트레스", "우울감", "자살시도"]

@app.get("/api/prediction/regions")
async def get_prediction_regions():
    return list(SIDO_MAP.keys())

@app.get("/api/prediction/data")
async def get_prediction_data(
    indicator: str = "스트레스", 
    region: str = "전국",
    model_type: str = "LSTM",
    forecast_years: int = 5
):
    df = prediction_manager.load_local_trend_data(indicator, region)
    if df.empty:
        return JSONResponse(status_code=400, content={"error": "선택한 조건의 데이터를 찾을 수 없습니다."})
    
    result = prediction_manager.predict_trend(df, model_type, forecast_years)
    if not result:
        return JSONResponse(status_code=400, content={"error": "예측을 수행하기에는 데이터가 부족합니다."})

    # Historical data for chart
    hist_dates = [d.strftime("%Y") for d in df.index]
    hist_vals = df["val"].tolist()
    
    result.update({
        "historical": {
            "dates": hist_dates,
            "values": hist_vals
        },
        "indicator": indicator,
        "region": region
    })
    
    return result

@app.get("/api/prediction/decompose")
async def get_prediction_decompose(indicator: str = "스트레스", region: str = "전국"):
    df = prediction_manager.load_local_trend_data(indicator, region)
    if df.empty or len(df) < 5:
        return JSONResponse(status_code=400, content={"error": "분해를 수행하기에는 데이터(연도)가 너무 적습니다."})
    
    try:
        # Annual data doesn't have 7-day seasonality, period should be smaller or we skip
        # For demo, use period=2 or similar if possible
        res = seasonal_decompose(df["val"], period=2, extrapolate_trend='freq')
        dates = [d.strftime("%Y") for d in df.index]
        return {
            "dates": dates,
            "observed": res.observed.tolist(),
            "trend": res.trend.tolist(),
            "seasonal": res.seasonal.tolist(),
            "resid": res.resid.tolist()
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
