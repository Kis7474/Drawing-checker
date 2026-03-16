"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MachinePart, PartCategory } from "@/types/part";

type DrawingViewerProps = {
  imageSrc: string;
  parts: MachinePart[];
};

const STAGE_WIDTH = 4781;
const STAGE_HEIGHT = 2436;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

// Category display config: label + border color + bg color (inline styles for Tailwind purge safety)
const CATEGORY_CONFIG: Record<
  PartCategory,
  { label: string; dot: string; border: string; bg: string }
> = {
  "printing-unit": {
    label: "인쇄 유닛",
    dot: "#3b82f6",
    border: "rgba(59,130,246,0.75)",
    bg: "rgba(59,130,246,0.08)",
  },
  "folding-unit": {
    label: "접지 유닛",
    dot: "#22c55e",
    border: "rgba(34,197,94,0.75)",
    bg: "rgba(34,197,94,0.08)",
  },
  "roller-web": {
    label: "웹 롤러",
    dot: "#f97316",
    border: "rgba(249,115,22,0.75)",
    bg: "rgba(249,115,22,0.08)",
  },
  "guide-roller-pk": {
    label: "PK 가이드 롤러",
    dot: "#a855f7",
    border: "rgba(168,85,247,0.75)",
    bg: "rgba(168,85,247,0.08)",
  },
  "fd-fr-component": {
    label: "FD/FR 부품",
    dot: "#ef4444",
    border: "rgba(239,68,68,0.75)",
    bg: "rgba(239,68,68,0.08)",
  },
  "web-edge-guide": {
    label: "웹 엣지 가이드",
    dot: "#eab308",
    border: "rgba(234,179,8,0.75)",
    bg: "rgba(234,179,8,0.08)",
  },
  "rs-component": {
    label: "RS 부품",
    dot: "#14b8a6",
    border: "rgba(20,184,166,0.75)",
    bg: "rgba(20,184,166,0.08)",
  },
  other: {
    label: "기타",
    dot: "#64748b",
    border: "rgba(100,116,139,0.75)",
    bg: "rgba(100,116,139,0.08)",
  },
};

const SELECTED_BORDER = "rgba(251,191,36,0.9)";
const SELECTED_BG = "rgba(251,191,36,0.18)";

const normalize = (value: string) => value.trim().toLowerCase();

export default function DrawingViewer({ imageSrc, parts }: DrawingViewerProps) {
  const [query, setQuery] = useState("");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs for non-render-triggering values
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasInitialFitRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panXRef.current = panX; }, [panX]);
  useEffect(() => { panYRef.current = panY; }, [panY]);

  // ── Initial fit-to-view via ResizeObserver ────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const doFit = () => {
      if (hasInitialFitRef.current) return;
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;

      const fitZoom = Math.min(clientWidth / STAGE_WIDTH, clientHeight / STAGE_HEIGHT) * 0.95;
      setPanX((clientWidth - STAGE_WIDTH * fitZoom) / 2);
      setPanY((clientHeight - STAGE_HEIGHT * fitZoom) / 2);
      setZoom(fitZoom);
      hasInitialFitRef.current = true;
    };

    const observer = new ResizeObserver(doFit);
    observer.observe(container);
    doFit();
    return () => observer.disconnect();
  }, []);

  // ── Mouse-wheel zoom (non-passive, must use addEventListener) ─────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const prevZoom = zoomRef.current;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * factor));
      const ratio = newZoom / prevZoom;

      const newPanX = cursorX - (cursorX - panXRef.current) * ratio;
      const newPanY = cursorY - (cursorY - panYRef.current) * ratio;

      setZoom(newZoom);
      setPanX(newPanX);
      setPanY(newPanY);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // ── Fit to view ───────────────────────────────────────────────────────
  const handleFitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { clientWidth, clientHeight } = container;
    const fitZoom = Math.min(clientWidth / STAGE_WIDTH, clientHeight / STAGE_HEIGHT) * 0.95;
    setIsAnimating(true);
    setZoom(fitZoom);
    setPanX((clientWidth - STAGE_WIDTH * fitZoom) / 2);
    setPanY((clientHeight - STAGE_HEIGHT * fitZoom) / 2);
    setTimeout(() => setIsAnimating(false), 350);
  }, []);

  // ── Zoom buttons ──────────────────────────────────────────────────────
  const handleZoomButton = useCallback((direction: 1 | -1) => {
    const container = containerRef.current;
    if (!container) return;
    const prevZoom = zoomRef.current;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom + direction * 0.2));
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const ratio = newZoom / prevZoom;
    setIsAnimating(true);
    setZoom(newZoom);
    setPanX(centerX - (centerX - panXRef.current) * ratio);
    setPanY(centerY - (centerY - panYRef.current) * ratio);
    setTimeout(() => setIsAnimating(false), 200);
  }, []);

  // ── Part selection with smooth pan ───────────────────────────────────
  const handleSelectPart = useCallback(
    (partId: string) => {
      if (hasDraggedRef.current) return;
      setSelectedPartId(partId);

      const part = parts.find((p) => p.id === partId);
      const container = containerRef.current;
      if (!part || !container) return;

      const prevZoom = zoomRef.current;
      const targetZoom = Math.max(prevZoom, 0.8);
      const partCX = part.region.x + part.region.width / 2;
      const partCY = part.region.y + part.region.height / 2;

      setIsAnimating(true);
      setZoom(targetZoom);
      setPanX(container.clientWidth / 2 - partCX * targetZoom);
      setPanY(container.clientHeight / 2 - partCY * targetZoom);
      setTimeout(() => setIsAnimating(false), 350);
    },
    [parts],
  );

  // ── Drag pan handlers ─────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panXRef.current,
      panY: panYRef.current,
    };
    if (containerRef.current) containerRef.current.style.cursor = "grabbing";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDraggedRef.current = true;
    setPanX(dragStartRef.current.panX + dx);
    setPanY(dragStartRef.current.panY + dy);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    if (containerRef.current) containerRef.current.style.cursor = "grab";
  }, []);

  const handleResetView = () => {
    setQuery("");
    setSelectedPartId(null);
    handleFitToView();
  };

  // ── Search filtering ──────────────────────────────────────────────────
  const filteredParts = useMemo(() => {
    const q = normalize(query);
    if (!q) return parts;
    return parts.filter(
      (p) =>
        normalize(p.name).includes(q) ||
        normalize(p.nameEn).includes(q) ||
        p.keywords.some((k) => normalize(k).includes(q)),
    );
  }, [parts, query]);

  const selectedPart = useMemo(
    () => parts.find((p) => p.id === selectedPartId) ?? null,
    [parts, selectedPartId],
  );

  return (
    <div className="grid h-full grid-cols-[300px_minmax(0,1fr)_300px] gap-4">
      {/* ── Left: Search & Part List ─────────────────────────────────── */}
      <aside className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight text-slate-800">
          Drawing Checker
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Bahnführungselemente Übersicht Korea 1
        </p>

        <label htmlFor="part-search" className="mt-4 text-sm font-medium text-slate-700">
          부품 검색
        </label>
        <input
          id="part-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: DE01, PK24, 인쇄유닛, roller…"
          className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            결과 {filteredParts.length} / {parts.length}
          </span>
          <button
            type="button"
            onClick={handleResetView}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            전체 보기
          </button>
        </div>

        <ul className="mt-2 flex-1 space-y-1 overflow-y-auto pr-1">
          {filteredParts.map((part) => {
            const cfg = CATEGORY_CONFIG[part.category];
            const isSelected = selectedPartId === part.id;
            return (
              <li key={part.id}>
                <button
                  type="button"
                  onClick={() => handleSelectPart(part.id)}
                  className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-amber-400 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cfg.dot }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{part.name}</span>
                    <span className="block truncate text-xs text-slate-500">{part.id}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {filteredParts.length === 0 && (
            <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-400">
              검색 결과 없음
            </li>
          )}
        </ul>

        {/* Category legend */}
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="mb-1.5 text-xs font-semibold text-slate-500">카테고리 범례</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {(Object.entries(CATEGORY_CONFIG) as [PartCategory, (typeof CATEGORY_CONFIG)[PartCategory]][]).map(
              ([, cfg]) => (
                <div key={cfg.label} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cfg.dot }}
                  />
                  <span className="truncate text-xs text-slate-600">{cfg.label}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </aside>

      {/* ── Middle: Drawing Canvas ────────────────────────────────────── */}
      <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header with zoom controls */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2">
          <span className="text-xs font-medium text-slate-600">
            Drawing Canvas (4781 × 2436)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleFitToView}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              title="Fit to view"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => handleZoomButton(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-100"
              title="Zoom out"
            >
              −
            </button>
            <span className="w-12 text-center text-xs font-mono text-slate-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoomButton(1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-100"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>

        {/* Pan / Zoom container */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden"
          style={{ cursor: "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
        {/* The canvas that transforms – outer wrapper handles pan/zoom */}
          <div
            className="absolute top-0 left-0"
            style={{
              width: STAGE_WIDTH,
              height: STAGE_HEIGHT,
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: "0 0",
              transition: isAnimating ? "transform 320ms ease-out" : "none",
            }}
          >
            {/* Inner container: position:relative required by Next.js Image fill */}
            <div className="relative h-full w-full rounded-lg border border-slate-200 bg-slate-100">
            <Image
              src={imageSrc}
              alt="Machine layout drawing"
              fill
              sizes={`${STAGE_WIDTH}px`}
              priority
              className="rounded-lg object-contain"
              draggable={false}
            />

            {/* Part highlight overlays */}
            {parts.map((part) => {
              const isSelected = selectedPartId === part.id;
              const cfg = CATEGORY_CONFIG[part.category];
              return (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => handleSelectPart(part.id)}
                  className="absolute rounded transition-colors"
                  style={{
                    left: part.region.x,
                    top: part.region.y,
                    width: part.region.width,
                    height: part.region.height,
                    borderWidth: 2,
                    borderStyle: "solid",
                    borderColor: isSelected ? SELECTED_BORDER : cfg.border,
                    backgroundColor: isSelected ? SELECTED_BG : cfg.bg,
                    boxShadow: isSelected
                      ? "0 0 0 3px rgba(251,191,36,0.3)"
                      : undefined,
                  }}
                  aria-label={`${part.name} 선택`}
                />
              );
            })}

            {/* Selected part label */}
            {selectedPart && (
              <div
                className="pointer-events-none absolute rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white shadow"
                style={{
                  left: selectedPart.region.x,
                  top: Math.max(0, selectedPart.region.y - 26),
                  whiteSpace: "nowrap",
                }}
              >
                {selectedPart.id}
              </div>
            )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Right: Part Detail ────────────────────────────────────────── */}
      <aside className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">부품 상세 정보</h2>

        {!selectedPart && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-400">
            도면 위 부품 영역 또는 왼쪽 목록을 클릭하세요.
          </div>
        )}

        {selectedPart && (
          <dl className="mt-4 space-y-3 overflow-y-auto text-sm">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                ID
              </dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-slate-800">
                {selectedPart.id}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                이름 (한국어)
              </dt>
              <dd className="mt-0.5 text-slate-800">{selectedPart.name}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Name (English)
              </dt>
              <dd className="mt-0.5 text-slate-800">{selectedPart.nameEn}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                카테고리
              </dt>
              <dd className="mt-1 flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: CATEGORY_CONFIG[selectedPart.category].dot,
                  }}
                />
                <span className="text-slate-700">
                  {CATEGORY_CONFIG[selectedPart.category].label}
                </span>
              </dd>
            </div>
            {selectedPart.partNo && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Part No.
                </dt>
                <dd className="mt-0.5 font-mono text-slate-700">{selectedPart.partNo}</dd>
              </div>
            )}
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                설명
              </dt>
              <dd className="mt-0.5 leading-relaxed text-slate-700">{selectedPart.description}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                좌표 (px)
              </dt>
              <dd className="mt-0.5 font-mono text-xs text-slate-500">
                x:{selectedPart.region.x} y:{selectedPart.region.y} w:
                {selectedPart.region.width} h:{selectedPart.region.height}
              </dd>
            </div>
          </dl>
        )}
      </aside>
    </div>
  );
}
