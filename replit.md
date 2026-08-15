# BUTLER AI

한국어로 대화하며 일정, 생활 기록, 목표, 기억을 함께 관리하는 AI 집사 생활관리 앱입니다.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/butler-app/src/App.tsx` — 한국어 MVP 화면과 로컬 저장 기반 앱 상태
- `artifacts/butler-app/src/index.css` — BUTLER 색상, 반응형 레이아웃, 화면 테마
- `attached_assets/Pasted--MVP-Replit-AI--1786779453201_1786779453202.txt` — 제품 요구사항 원문

## Architecture decisions

- 첫 MVP는 외부 API 없이도 핵심 흐름을 확인할 수 있도록 브라우저 `localStorage`를 데모 저장소로 사용합니다.
- 집사 대화는 현재 로컬 준비 응답으로 동작하며, 실제 AI 호출은 별도 응답 함수 경계에 연결할 수 있게 남겨 둡니다.
- 집사 초상은 이미지 생성 기능 없이 연결 지점만 제공하고, 이미지·음성은 후속 기능으로 미룹니다.

## Product

- 로그인/가입 데모 세션
- 네 가지 집사 선택
- 홈 대시보드와 오늘의 일정
- 일정 추가, 완료, 삭제
- 식사, 수면, 컨디션 기록
- 목표 진행도, 기억 관리, 친밀도 화면
- 한국어 로컬 데모 대화

## User preferences

- 모든 사용자 인터페이스와 화면 텍스트는 한국어로 유지합니다.
- API 키가 없어도 UI와 비AI 핵심 기능이 정상적으로 작동해야 합니다.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
