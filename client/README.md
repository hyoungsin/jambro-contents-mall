# Jambro Contents Mall - Client

React + Vite 기반 프론트엔드입니다.

## 요구사항

- Node.js 18+

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 빌드
npm run build

# 빌드 결과물 미리보기
npm run preview
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (HMR) |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과물 로컬 서버 |
| `npm run lint` | ESLint 실행 |

## 서버(API) 연동

- 개발 시 `vite.config.js`에 프록시가 설정되어 있어, 클라이언트에서 `/api`로 요청하면 `http://localhost:5000`(Express 서버)로 전달됩니다.
- 백엔드 서버(`server`)를 먼저 실행한 뒤 `npm run dev`로 클라이언트를 띄우면 됩니다.

## 디렉터리 구조

```
client/
├── public/
├── src/
│   ├── assets/
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```
