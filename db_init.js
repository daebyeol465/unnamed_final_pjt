const sqlite3 = require('sqlite3').verbose();

// 데이터베이스 연결
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) console.error('데이터베이스 연결 실패:', err.message);
    else console.log('SQLite3 데이터베이스 연결 성공');
});

// users 테이블 생성
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

db.run(createUsersTable, (err) => {
    if (err) console.error('users 테이블 생성 실패:', err.message);
    else console.log('users 테이블 생성 성공');
});

// topics 테이블 생성
const createTopicsTable = `
CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    topic TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

db.run(createTopicsTable, (err) => {
    if (err) console.error('topics 테이블 생성 실패:', err.message);
    else console.log('topics 테이블 생성 성공');
    db.close();
});