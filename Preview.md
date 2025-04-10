📡 server.js
이 서버는 Express.js와 SQLite3를 기반으로 작동하며, 사용자 인증(JWT), 주제 저장, GPT와의 채팅 기능을 제공합니다.

📁 주요 기능
✅ 사용자 회원가입 및 로그인 (JWT 발급)

✅ 주제(topic) 저장/조회/수정/삭제

✅ OpenAI GPT와 주제 기반 대화

✅ SQLite3로 데이터 관리

✅ CORS 및 Body Parser 설정

✅ 인증된 사용자만 특정 기능 접근 가능

🔧 설치 및 실행 방법
bash
코드 복사
npm install
node server.js
.env 파일에 다음 정보가 필요합니다:

ini
코드 복사
PORT=3000
SECRET_KEY=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
🧠 사용 기술
Express.js – 서버 프레임워크

SQLite3 – 로컬 데이터베이스

JWT (jsonwebtoken) – 인증 및 토큰 관리

Bcrypt – 비밀번호 해싱

Axios – OpenAI API 통신

dotenv – 환경 변수 관리

📂 API 구조
🔐 인증 관련
회원가입
bash
코드 복사
POST /users
Body:

json
코드 복사
{ "email": "test@example.com", "password": "123456" }
로그인
bash
코드 복사
POST /login
Response:

json
코드 복사
{ "message": "로그인 성공", "token": "JWT_TOKEN" }
📌 주제 관리
JWT 토큰 필요 (Authorization: Bearer <TOKEN>)

주제 저장
bash
코드 복사
POST /topic
json
코드 복사
{ "topic": "대화 주제" }
주제 전체 조회 (모든 사용자 가능)
bash
코드 복사
GET /topics
주제 단일 조회
bash
코드 복사
GET /topic/:id
주제 수정 (작성자 본인만 가능)
bash
코드 복사
PUT /topic/:id
json
코드 복사
{ "topic": "수정된 주제" }
주제 삭제
bash
코드 복사
DELETE /topic/:id
💬 GPT와의 대화
JWT 토큰 필요 (Authorization: Bearer <TOKEN>)

bash
코드 복사
POST /chat/:id
json
코드 복사
{ "message": "사용자 입력" }
대화는 해당 토픽과 사용자 ID 기준으로 저장됨

시스템 메시지를 포함하여 GPT가 주제에 맞게 응답하도록 설정됨

🛠 데이터베이스 테이블 구조 (예상)
sql
코드 복사
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT
);

CREATE TABLE topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  topic TEXT
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER,
  user_id INTEGER,
  role TEXT,
  content TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
🧪 테스트 예시
회원가입 → 로그인 → JWT 획득

토픽 저장 → /chat/:id로 GPT 대화

대화 내용은 messages 테이블에 저장됨

