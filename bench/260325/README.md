# 🌩️ Streamlit Cloud 배포용 폴더 (`streamlit_cloud_deploy`)

이 폴더는 **AI 날씨 예측 대시보드**를 [Streamlit Community Cloud](https://share.streamlit.io/)에 즉시 배포하기 위해 준비된 패키지입니다.

## 📌 특징

- **모델 파일 업로드 불필요**: `.pkl`, `.pt` 파일 없이 동작합니다. 앱이 시작될 때 합성 데이터로 Linear Regression과 LSTM 모델을 자동 학습합니다 (`@st.cache_resource`로 캐싱되어 최초 1회만 실행).
- **외부 API 키 불필요**: 로그인이나 API 키가 필요 없는 완전 무료 공공 데이터인 **Open-Meteo Archive API**만을 사용합니다.
- **크로스 플랫폼 호환**: macOS, Windows, Linux(Streamlit Cloud) 모두에서 폰트 문제 없이 동작합니다.

## 🚀 배포 방법 (3단계)

1. **GitHub에 업로드**:
   현재 폴더 안에 있는 `streamlit_app.py`와 `requirements.txt` 파일을 본인의 GitHub Repository에 업로드(Push)합니다.
2. **Streamlit Cloud 연동**:
   [Streamlit Cloud](https://share.streamlit.io/) 웹사이트에 로그인한 후, `[New app]` 버튼을 클릭합니다.
3. **설정 및 배포**:
   - **Repository**: 업로드한 GitHub 레포지토리 선택
   - **Branch**: `main` (또는 해당하는 브랜치)
   - **Main file path**: `streamlit_app.py`
   - `[Deploy]` 버튼을 누르면 서버가 알아서 `requirements.txt`의 라이브러리를 설치하고 앱을 띄워줍니다.

> **Note**: 최초 배포 시 PyTorch(CPU) 설치로 인해 약 3-5분이 소요될 수 있습니다.
