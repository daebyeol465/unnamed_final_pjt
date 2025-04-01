// 필요한 모듈 불러오기
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

// JSON 요청 본문 파싱을 위한 미들웨어
app.use(express.json());

// 환경 변수에서 OpenAI API 키 가져오기
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 플레이어 상태 초기화
let playerData = {
    name: '모험가',
    health: 100,
    level: 1,
    experience: 0,
    items: ['기본 검'],
    choices: [],
    diary: []
};

// GPT에게 나레이션 요청
async function getNarration() {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4',
                messages: [
                    {
                        role: "system",
                        content: "당신은 로그라이크 TRPG 게임의 내레이터입니다. 게임의 시작을 알리는 나레이션을 작성해주세요. 플레이어는 던전 탐험가이며, 처음 던전 입구에 도달한 상태입니다."
                    },
                    {
                        role: "user",
                        content: "게임 시작을 알리는 나레이션을 작성해주세요."
                    }
                ],
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('GPT 나레이션 요청 오류:', error);
        throw new Error('나레이션을 가져오는 중 오류가 발생했습니다.');
    }
}

// 상태창 마크다운 생성
function getStatusMarkdown() {
    return `
### 플레이어 상태

- **이름**: ${playerData.name}
- **체력**: ${playerData.health}/100
- **레벨**: ${playerData.level}
- **경험치**: ${playerData.experience}/100
- **아이템**: ${playerData.items.join(', ')}

### 일기장 

${playerData.diary.length > 0 ? playerData.diary.join('\n\n') : '아직 기록된 사건이 없습니다.'}
    `;
}

// 플레이어 선택 처리 엔드포인트
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: '메시지 내용이 필요합니다.' });
    }

    try {
        // GPT에게 대화 내용에 따른 스토리 진행 요청
        const narration = await getNarration();

        // 플레이어 선택 저장 및 일기장 업데이트
        playerData.choices.push(message);
        playerData.diary.push(`- ${message}`);

        // 상태 업데이트 (예: 경험치 증가, 레벨업 처리 등)
        playerData.experience += 10;
        if (playerData.experience >= 100) {
            playerData.level++;
            playerData.experience = 0;
        }

        // 상태 마크다운 생성
        const statusMarkdown = getStatusMarkdown();

        // 클라이언트에 응답
        res.json({
            narration: narration,
            status: statusMarkdown
        });
    } catch (error) {
        console.error('플레이어 선택 처리 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 ${PORT} 포트에서 실행 중입니다.`);
});


