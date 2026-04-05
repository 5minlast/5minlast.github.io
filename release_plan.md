# GitHub Release Plan - Last 5min Project

이 문서는 `last_5min` 프로젝트를 GitHub Organization으로 배포하고 지속적으로 관리하기 위한 계획서입니다.

## 1. 역할 분담 (Who Does What?)

### 🧑‍💻 사용자 (You)
- **GitHub Organization 생성**: 웹 브라우저에서 직접 조직(Organization)을 만듭니다.
- **Repository 생성**: 조직 내에 프로젝트를 담을 새로운 저장소를 만듭니다.
- **인증 및 권한**: GitHub CLI(`gh`) 로그인 또는 원격 저장소 URL 연결 시 필요한 토큰/비밀번호 입력.

### 🤖 Antigravity (Me)
- **Git 초기화 및 최적화**: `.gitignore` 설정 및 불필요한 파일 제외.
- **코드 정리**: 커밋 메시지 작성 및 브랜치(`main`) 설정.
- **Push 자동화**: 터미널 명령어를 통해 원격 저장소로 코드 전송.
- **문서화**: 배포 과정을 기록하고 향후 수정을 위한 워크플로우 제안.

---

## 2. 배포 단계별 안내 (Step-by-Step)

### 단계 1: GitHub Organization & Repository 생성 (웹 브라우저)
1. [GitHub](https://github.com/) 로그인 후 우측 상단 `+` 버튼 -> **New organization** 클릭.
2. 무료 플랜을 선택하고 조직 이름을 설정합니다 (예: `Last-5Min-Dev`).
3. 조직이 생성되면 해당 조직 페이지에서 **New repository**를 클릭합니다.
4. **주의:** 브라우저에서 저장소를 만들 때 `README`, `.gitignore`, `License`는 **체크하지 마세요** (비어있는 상태여야 푸시가 쉽습니다).
5. 생성 후 나타나는 **HTTPS 주소**를 저에게 알려주세요 (예: `https://github.com/org-name/repo-name.git`).

### 단계 2: 로컬 코드 준비 (Antigravity 실행 예정)
- 제가 이미 `.gitignore`를 생성하여 `.env`나 가상환경 폴더(`.venv`)가 올라가지 않도록 설정했습니다.
- 로컬 Git 저장소를 최신 상태로 커밋하겠습니다.

### 단계 3: 원격 저장소 연결 및 푸시 (터미널)
- 사용자가 준 URL을 등록하고 코드를 푸시합니다.

---

## 3. 지속적인 수정 및 업데이트 워크플로우

앞으로 코드를 수정할 때마다 **자동화 스크립트(`push_log.py`)**를 사용해 간편하게 업데이트할 수 있습니다:

1. **자동화 도구 실행 (PowerShell/Terminal)**:
   ```powershell
   python push_log.py "수정 내용 설명"
   ```
2. **스크립트 동작**:
   - `release_plan.md`의 히스토리 로그에 자동으로 현재 날짜, 시간, 내용을 추가합니다.
   - 변경 사항을 `git add .` 및 `git commit -m "내용"` 처리합니다.
   - GitHub(`main` 브랜치)로 바로 `git push`를 실행합니다.

이 방식을 사용하면 배포와 기록을 동시에 관리할 수 있습니다.

---

## 4. 실시간 대화 기록 (History Log)

| 날짜 및 시간 | 주체 | 내용 요약 |
| :--- | :--- | :--- |
| 2026-04-05 16:27 | **사용자** | GitHub Organization 배포 요청 및 계획 수립 요청 |
| 2026-04-05 16:28 | **Antigravity** | `.gitignore` 생성 및 `release_plan.md` 초안 작성. 배포 가이드 제공. |
| 2026-04-05 16:57 | **사용자** | GitHub URL(`https://5minlast.github.io/`) 제공 및 자동화 스크립트 요청 |
| 2026-04-05 16:58 | **Antigravity** | 원격 저장소(`origin`) 연결 및 자동화 스크립트(`push_log.py`) 완성 |
| 2026-04-05 17:08 | **사용자** | 민감 정보(Secret) 제거 작업 요청 |
| 2026-04-05 17:09 | **Antigravity** | 코드 내 하드코딩된 API 키/토큰 제거 및 `.env` 기반으로 수정 완료 |

---

### [!] 다음 동작을 위해 필요한 정보
저장소를 만드셨다면 **URL(HTTPS)**을 채팅창에 입력해 주세요. 바로 다음 단계를 진행하겠습니다.
