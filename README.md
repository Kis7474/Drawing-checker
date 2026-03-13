# Drawing Checker MVP

단일 기계 도면에서 부품 위치를 검색하고 하이라이트하여 상세 정보를 확인하는 **데스크톱 우선 MVP 웹 앱**입니다.

## 목적
- DWG 원본을 직접 렌더링하지 않고, 변환된 도면 이미지(현재 PNG)를 기반으로 부품 위치 탐색
- 부품 검색(이름/키워드) → 도면 포커싱/하이라이트 → 상세 정보 확인 흐름 제공
- 이후 PostgreSQL/관리자 페이지 확장을 고려한 타입 중심 구조 유지

## 스택
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- ESLint

## 파일 구조

```text
app/
  globals.css
  layout.tsx
  page.tsx
components/
  DrawingViewer.tsx
data/
  parts.ts
types/
  part.ts
public/
  drawings/
    machine-layout.png
```

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 도면 이미지 교체 방법
1. 파일 경로 유지: `public/drawings/machine-layout.png`
2. 동일 파일명으로 교체하거나, 다른 파일명을 쓰려면 `app/page.tsx`의 `imageSrc`를 변경
3. 이미지 비율/크기가 크게 바뀌면 `components/DrawingViewer.tsx`의 고정 스테이지 크기와 좌표를 함께 조정

## 부품 추가 방법
1. `types/part.ts`의 `MachinePart` 타입을 기준으로 `data/parts.ts`에 항목 추가
2. 각 부품에 `keywords`, `description`, `region(x,y,width,height)` 지정
3. 좌표는 현재 1800x1400 가상 캔버스 픽셀 기준

## 다음 단계 권장
- Zoom / Pan 인터랙션 추가
- 관리자용 좌표 에디터(핫스팟 생성/수정)
- 정적 데이터 → PostgreSQL 마이그레이션
- 다중 도면(설비별 도면 선택) 지원
