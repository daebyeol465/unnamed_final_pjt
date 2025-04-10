require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(cors());
app.use(bodyParser.json());

// SQLite3 데이터베이스 연결
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) console.error('데이터베이스 연결 실패:', err.message);
    else console.log('데이터베이스 연결 성공');
});

// 회원가입
app.post('/users', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 입력하세요.' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err) => {
        if (err) {
            return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
        }
        res.status(201).json({ message: '회원가입 성공' });
    });
});

// 로그인
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 입력하세요.' });
    }
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 잘못되었습니다.' });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 잘못되었습니다.' });
        }
        
        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ message: '로그인 성공', token });
    });
});

// 인증 미들웨어
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log('🔥 요청 Authorization 헤더:', authHeader);

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
        console.log(' 없음 또는 형식 오류');
        return res.status(403).json({ message: '토큰이 필요합니다.' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.log('토큰 검증 실패:', err.message);
            return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
        }
        req.user = decoded;
        console.log('인증된 사용자:', decoded);
        next();
    });
};

// 주제 저장 (로그인된 사용자만 가능)
app.post('/topic', authenticate, (req, res) => {
    const { topic } = req.body;
    if (!topic || topic.length > 200) {
        return res.status(400).json({ message: '주제는 1~200자 이내여야 합니다.' });
    }
    
    db.run('INSERT INTO topics (user_id, topic) VALUES (?, ?)', [req.user.id, topic], function(err) {
        if (err) return res.status(500).json({ message: '주제 저장 실패' });
        res.status(201).json({ message: '주제 저장 성공', topicId: this.lastID });
    });
});

// 주제 조회 (모든 사용자 가능)
app.get('/topics', (req, res) => {
    db.all('SELECT topics.id, topics.topic, users.email AS author FROM topics JOIN users ON topics.user_id = users.id', [], (err, rows) => {
        if (err) return res.status(500).json({ message: '주제 조회 실패' });
        res.json(rows);
    });
});

// 주제 수정 (작성자 본인만 가능)
app.put('/topic/:id', authenticate, (req, res) => {
    const { topic } = req.body;
    const topicId = req.params.id;
    
    db.get('SELECT * FROM topics WHERE id = ? AND user_id = ?', [topicId, req.user.id], (err, row) => {
        if (err || !row) return res.status(403).json({ message: '수정 권한이 없습니다.' });
        
        db.run('UPDATE topics SET topic = ? WHERE id = ?', [topic, topicId], (err) => {
            if (err) return res.status(500).json({ message: '주제 수정 실패' });
            res.json({ message: '주제 수정 성공' });
        });
    });
});

// 주제 삭제 (작성자 본인만 가능)
app.delete('/topic/:id', authenticate, (req, res) => {
    const topicId = req.params.id;
    const userId = req.user.id; // 현재 로그인한 사용자 ID

    // 주제가 현재 로그인한 사용자의 것인지 확인
    db.get('SELECT * FROM topics WHERE id = ? AND user_id = ?', [topicId, userId], (err, row) => {
        if (err) return res.status(500).json({ message: '주제 확인 실패' });
        if (!row) return res.status(403).json({ message: '삭제 권한이 없습니다.' });

        // 🚀 해당 주제에 연결된 메시지도 삭제
        db.run('DELETE FROM messages WHERE topic_id = ?', [topicId], (err) => {
            if (err) return res.status(500).json({ message: '대화 삭제 실패' });

            // 🚀 주제 삭제
            db.run('DELETE FROM topics WHERE id = ?', [topicId], (err) => {
                if (err) return res.status(500).json({ message: '주제 삭제 실패' });
                res.json({ message: '주제 삭제 성공' });
            });
        });
    });
});

// 특정 주제 하나 조회
app.get('/topic/:id', (req, res) => {
    const topicId = req.params.id;
    
    db.get('SELECT topics.id, topics.topic, users.email AS author FROM topics JOIN users ON topics.user_id = users.id WHERE topics.id = ?', [topicId], (err, row) => {
        if (err) return res.status(500).json({ message: '주제 조회 실패' });
        if (!row) return res.status(404).json({ message: '주제를 찾을 수 없습니다.' });
        res.json({ topic: row });
    });
});

// GPT와 대화하는 API
app.post('/chat/:id', authenticate, (req, res) => {
    const topicId = req.params.id;
    const userId = req.user.id; // 로그인한 유저 ID
    const userMessage = req.body.message;

    db.get('SELECT topic FROM topics WHERE id = ?', [topicId], (err, row) => {
        if (err || !row) return res.status(400).json({ message: '해당 ID의 주제를 찾을 수 없습니다.' });

        const topic = row.topic;

        //현재 로그인한 유저의 대화만 불러오기
        db.all('SELECT role, content FROM messages WHERE topic_id = ? AND user_id = ? ORDER BY timestamp ASC',
            [topicId, userId], (err, messages) => {
            
            if (err) return res.status(500).json({ message: '이전 대화 불러오기 실패' });

            const conversation = messages.map(msg => ({ role: msg.role, content: msg.content }));
            conversation.unshift({ role: 'system', content: `이제부터 너는 '${topic}'라는 주제에 맞춰 대화를 이어가야 해.` });
            conversation.push({ role: 'user', content: userMessage });

            // OpenAI API 요청
            axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4',
                messages: conversation
            }, {
                headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' }
            }).then(response => {
                const botResponse = response.data.choices[0].message.content;

                console.log('GPT 응답:', botResponse);

                //사용자와 GPT의 대화를 저장 (유저별로 구분)
                db.run('INSERT INTO messages (topic_id, user_id, role, content) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
                    [topicId, userId, 'user', userMessage, topicId, userId, 'assistant', botResponse], 
                    (err) => {
                        if (err) return res.status(500).json({ message: '대화 저장 실패' });
                        res.json({ response: botResponse });
                    }
                );
            }).catch(error => {
                console.error('OpenAI API Error:', error.response ? error.response.data : error.message);
                res.status(500).json({ message: 'GPT 응답 실패', error: error.response ? error.response.data : error.message });
            });
        });
    });
});

// 서버 실행
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});