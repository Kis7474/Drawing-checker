import type { MachinePart } from "@/types/part";

export const machineParts: MachinePart[] = [
  {
    id: "PART-001",
    name: "메인 모터",
    keywords: ["모터", "main motor", "drive motor", "주동력"],
    description:
      "장비 전체 구동을 담당하는 핵심 전동기입니다. 시동 시 초기 토크를 제공하고 정상 운전 중 회전 속도를 유지합니다.",
    partNo: "MM-4500-A",
    maintenance: "월 1회 냉각팬 오염 상태 점검 및 진동 수치(기준 4.5mm/s 이하) 확인.",
    region: {
      x: 420,
      y: 360,
      width: 240,
      height: 180,
    },
  },
  {
    id: "PART-002",
    name: "구동 샤프트",
    keywords: ["샤프트", "shaft", "drive shaft", "동력 전달"],
    description:
      "메인 모터의 회전력을 기어 어셈블리로 전달하는 축입니다. 정렬 오차가 누적되면 소음과 마모가 증가할 수 있습니다.",
    partNo: "DS-2218-B",
    maintenance: "주 1회 커플링 체결 토크와 윤활 상태 확인. 축 흔들림 발생 시 즉시 정렬 교정.",
    region: {
      x: 810,
      y: 540,
      width: 370,
      height: 95,
    },
  },
  {
    id: "PART-003",
    name: "베어링 하우징",
    keywords: ["베어링", "bearing housing", "housing", "지지부"],
    description:
      "구동 샤프트 양단 베어링을 고정하고 외부 하중을 분산하는 하우징입니다. 온도 상승은 윤활 불량의 초기 신호일 수 있습니다.",
    partNo: "BH-3090-C",
    maintenance: "운전 중 표면 온도 75°C 초과 시 즉시 점검. 분기별 씰 상태 및 그리스 충전량 확인.",
    region: {
      x: 1320,
      y: 470,
      width: 210,
      height: 170,
    },
  },
];
