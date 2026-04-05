"""
세션 5-8: [프로젝트] AI 예측 대시보드 (5주차 확장) - 위키피디아 버전
실행: streamlit run streamlit_app.py

Streamlit Cloud 배포용 — 모델 파일(.pkl, .pt) 없이 앱 내에서 직접 학습합니다.
필요 패키지: requirements.txt 참고
"""
import streamlit as st
import pandas as pd
import numpy as np
import requests
import matplotlib.pyplot as plt
import datetime
import torch
import torch.nn as nn
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from statsmodels.tsa.seasonal import seasonal_decompose

# ══════════════════════════════════════════════════════════════
#  한글 폰트 설정 (크로스 플랫폼 호환)
# ══════════════════════════════════════════════════════════════
import platform

if platform.system() == "Darwin":
    plt.rcParams["font.family"] = "AppleGothic"
elif platform.system() == "Windows":
    plt.rcParams["font.family"] = "Malgun Gothic"
else:
    # Linux (Streamlit Cloud 등) — 기본 sans-serif 폰트 사용
    plt.rcParams["font.family"] = "DejaVu Sans"

plt.rcParams["axes.unicode_minus"] = False

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
#  페이지 설정
# ══════════════════════════════════════════════════════════════
st.set_page_config(page_title="🤖 AI Wikipedia Pageviews Dashboard", layout="wide")
st.title("🤖 AI Wikipedia Pageviews Dashboard")
st.caption("위키피디아 페이지 조회수 트렌드 분석 및 AI 예측 (Streamlit Cloud 배포 버전)")

# ══════════════════════════════════════════════════════════════
#  합성 데이터 기반 모델 학습 (캐싱 — 앱 재시작 전까지 1회만 실행)
# ══════════════════════════════════════════════════════════════
@st.cache_resource
def train_models():
    """
    합성 페이지뷰 데이터를 생성하고 Linear Regression / LSTM 모델을 학습합니다.
    모델 파일 없이도 앱이 동작하도록 인라인 학습합니다.
    """
    # ─── 합성 데이터 생성 (트렌드 + 주간 주기성 + 노이즈) ───
    np.random.seed(42)
    n_days = 500
    base_views = 5000
    trend = np.linspace(0, 2000, n_days)
    # 주간 주기 (일주일 중 특정 요일에 조회수 상승/하락 가정)
    seasonality = 1000 * np.sin(np.arange(n_days) * 2 * np.pi / 7)
    noise = np.random.normal(0, 300, n_days)
    views = base_views + trend + seasonality + noise

    trained = {}

    # ─── 1) Linear Regression ───
    day_nums = np.arange(n_days).reshape(-1, 1)
    lr_model = LinearRegression()
    lr_model.fit(day_nums, views)
    trained["Linear Regression"] = lr_model

    # ─── 2) LSTM ───
    scaler = MinMaxScaler(feature_range=(0, 1))
    views_scaled = scaler.fit_transform(views.reshape(-1, 1)).flatten()

    window = 14 # 2주
    X_seq, y_seq = [], []
    for i in range(len(views_scaled) - window):
        X_seq.append(views_scaled[i : i + window])
        y_seq.append(views_scaled[i + window])
    X_seq = np.array(X_seq)
    y_seq = np.array(y_seq)

    X_tensor = torch.FloatTensor(X_seq).unsqueeze(-1)
    y_tensor = torch.FloatTensor(y_seq).unsqueeze(-1)

    lstm_model = LSTMPredictor()
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(lstm_model.parameters(), lr=0.005)

    lstm_model.train()
    for epoch in range(100):
        optimizer.zero_grad()
        output = lstm_model(X_tensor)
        loss = criterion(output, y_tensor)
        loss.backward()
        optimizer.step()

    lstm_model.eval()
    trained["LSTM"] = (lstm_model, scaler)

    return trained

# 학습 실행 (캐싱됨)
with st.spinner("AI 모델 초깃값 학습 중... (최초 1회만 실행됩니다)"):
    models = train_models()

# ══════════════════════════════════════════════════════════════
#  위키피디아 페이지뷰 데이터 로드 (Wikimedia REST API)
# ══════════════════════════════════════════════════════════════
@st.cache_data
def load_pageview_data(article, start_date, end_date):
    """
    Wikimedia REST API를 호출하여 특정 문서의 일별 페이지뷰 데이터를 가져옵니다.
    """
    # YYYYMMDD 포맷으로 변환
    start_str = start_date.strftime("%Y%m%d")
    end_str = end_date.strftime("%Y%m%d")
    
    url = f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{article}/daily/{start_str}/{end_str}"
    
    headers = {"User-Agent": "AI_Dashboard_Project/1.0 (Contact: user@example.com)"}
    res = requests.get(url, headers=headers)
    
    if res.status_code != 200: 
        return pd.DataFrame()
        
    data = res.json()
    if "items" not in data: 
        return pd.DataFrame()

    records = []
    for item in data["items"]:
        # timestamp 형식 '2024010100' 형태
        date_obj = datetime.datetime.strptime(item["timestamp"][:8], "%Y%m%d")
        records.append({"date": date_obj, "views": item["views"]})
        
    df = pd.DataFrame(records).set_index("date")
    return df

# ─── 사이드바 ───
st.sidebar.header("⚙️ Prediction Settings")
article = st.sidebar.selectbox("Wikipedia Article", ["Python_(programming_language)", "Artificial_intelligence", "ChatGPT", "Machine_learning"])
start_date = st.sidebar.date_input("Start Date", pd.Timestamp.today() - pd.Timedelta(days=180))
end_date = st.sidebar.date_input("End Date", pd.Timestamp.today() - pd.Timedelta(days=5))

forecast_days = st.sidebar.slider("Forecast Horizon (days)", 1, 30, 7)
show_confidence = st.sidebar.checkbox("Show Confidence Interval", value=True)

available_models = list(models.keys())
model_type = st.sidebar.radio("Model", available_models)

df = load_pageview_data(article, start_date, end_date)
if df.empty:
    st.error("데이터 로드 실패 — Wikimedia API 응답 오류 (날짜가 범위를 벗어났거나 문서명이 잘못되었습니다.)")
    st.stop()

# ══════════════════════════════════════════════════════════════
#  예측 로직 (Test Split 시뮬레이션 및 미래 예측)
# ══════════════════════════════════════════════════════════════
split_idx = int(len(df) * 0.8)
if split_idx == 0:
    st.error("데이터가 너무 적어 예측할 수 없습니다. 조회 기간을 늘려주세요.")
    st.stop()

train_data = df.iloc[:split_idx]
test_data = df.iloc[split_idx:]
test_dates = test_data.index
actual_test = test_data["views"].values

future_dates = pd.date_range(df.index[-1] + pd.Timedelta(days=1), periods=forecast_days, freq="D")

if model_type == "Linear Regression":
    model = models["Linear Regression"]
    X_test = np.arange(split_idx, len(df)).reshape(-1, 1)
    pred_test = model.predict(X_test)

    X_future = np.arange(len(df), len(df) + forecast_days).reshape(-1, 1)
    pred_future = model.predict(X_future)

elif model_type == "LSTM":
    model, scaler = models["LSTM"]
    window = 14 # 2주

    # Test 기간 예측 (슬라이딩 윈도우)
    views_scaled = scaler.transform(df["views"].values.reshape(-1, 1)).flatten()
    pred_test_scaled = []

    with torch.no_grad():
        for i in range(split_idx, len(df)):
            x_seq = views_scaled[max(0, i - window) : i]
            if len(x_seq) < window:
                # 부족한 부분은 첫 예측값 등으로 대체 (간단한 패딩)
                pad_width = window - len(x_seq)
                x_seq = np.pad(x_seq, (pad_width, 0), mode='edge')
                
            x_tensor = torch.FloatTensor(x_seq).unsqueeze(0).unsqueeze(-1)
            pred = model(x_tensor).item()
            pred_test_scaled.append(pred)

    pred_test = scaler.inverse_transform(np.array(pred_test_scaled).reshape(-1, 1)).flatten()

    # 미래 예측 (Auto-regressive)
    current_seq = views_scaled[-window:].tolist()
    pred_future_scaled = []

    with torch.no_grad():
        for _ in range(forecast_days):
            if len(current_seq) < window:
                pad_width = window - len(current_seq)
                curr_padded = np.pad(current_seq, (pad_width, 0), mode='edge').tolist()
            else:
                curr_padded = current_seq[-window:]
                
            x_tensor = torch.FloatTensor(curr_padded).unsqueeze(0).unsqueeze(-1)
            pred = model(x_tensor).item()
            pred_future_scaled.append(pred)
            current_seq.append(pred)
            
    pred_future = scaler.inverse_transform(np.array(pred_future_scaled).reshape(-1, 1)).flatten()

# 예측값이 음수가 나오지 않도록 0으로 하한 설정
pred_test = np.maximum(pred_test, 0)
pred_future = np.maximum(pred_future, 0)

# 성능 지표
rmse = np.sqrt(mean_squared_error(actual_test, pred_test))
r2 = r2_score(actual_test, pred_test)
mae = mean_absolute_error(actual_test, pred_test)

# ══════════════════════════════════════════════════════════════
#  KPI & Tabs 렌더링
# ══════════════════════════════════════════════════════════════
c1, c2, c3 = st.columns(3)
c1.metric("Latest Daily Views", f"{int(df['views'].iloc[-1]):,}")
diff = df['views'].iloc[-1] - df['views'].iloc[-2]
c2.metric("Change (1 Day)", f"{'+' if diff > 0 else ''}{int(diff):,}")
c3.metric(f"AI ({model_type}) Forecast", f"{int(pred_future[-1]):,}")

st.divider()

tab1, tab2, tab3, tab4 = st.tabs(["Pageviews Trend", "AI Prediction", "Decomposition", "Raw Data"])

with tab1:
    human_readable_title = article.replace('_', ' ')
    st.subheader(f"{human_readable_title} — Historical Pageviews")
    fig, ax = plt.subplots(figsize=(14, 5))
    ax.plot(df.index, df["views"], label="Views", color="#3366cc")
    ax.set_ylabel("Daily Views")
    ax.grid(alpha=0.3)
    ax.legend()
    st.pyplot(fig)

with tab2:
    st.subheader(f"AI Model Prediction: {model_type}")

    m1, m2, m3 = st.columns(3)
    m1.metric("RMSE", f"{rmse:,.0f}")
    m2.metric("R²", f"{r2:.4f}")
    m3.metric("MAE", f"{mae:,.0f}")

    fig, ax = plt.subplots(figsize=(14, 6))
    ax.plot(train_data.index, train_data["views"], label="Train", alpha=0.3, color="blue")
    ax.plot(test_dates, actual_test, label="Actual (Test)", color="green", linewidth=2)
    ax.plot(test_dates, pred_test, label=f"Predicted ({model_type})", color="red", linestyle="--")

    ax.plot(future_dates, pred_future, label=f"Forecast ({forecast_days}d)", color="purple", marker="o")

    if show_confidence:
        std = np.std(actual_test - pred_test)
        # 뷰가 0 이하로 내려가지 않도록
        lower_bound = np.maximum(pred_future - 1.96*std, 0)
        upper_bound = pred_future + 1.96*std
        ax.fill_between(future_dates, lower_bound, upper_bound, alpha=0.15, color="purple", label="95% CI")

    ax.legend(fontsize=10)
    ax.set_title(f"{human_readable_title} Pageviews Forecast ({model_type})")
    ax.set_ylabel("Daily Views")
    
    # y축 라벨을 정수로 표시
    ax.get_yaxis().set_major_formatter(plt.FuncFormatter(lambda x, p: format(int(x), ',')))
    
    ax.grid(alpha=0.3)
    st.pyplot(fig)

    with st.expander("Prediction Comparison Table"):
        comp = pd.DataFrame({
            "Date": test_dates, "Actual": actual_test, "Predicted": pred_test,
            "Error": actual_test - pred_test,
            "Error %": ((actual_test - pred_test) / actual_test * 100)
        })
        st.dataframe(comp.style.format({
            "Actual": "{:,.0f}", "Predicted": "{:,.0f}", "Error": "{:,.0f}", "Error %": "{:.2f}%"
        }))

with tab3:
    st.subheader("Time Series Decomposition (Weekly Pattern)")
    # 보통 페이지별 트래픽은 주간 패턴(7일)이 강함
    try:
        res = seasonal_decompose(df["views"], period=7, extrapolate_trend='freq')
        fig = res.plot()
        fig.set_size_inches(14, 8)
        st.pyplot(fig)
    except Exception as e:
        st.error(f"데이터 형식이 분해를 수행하기에 올바르지 않거나 너무 적습니다. Error: {e}")

with tab4:
    st.subheader("Raw Data")
    st.dataframe(df)

