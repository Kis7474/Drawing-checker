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
const MAX_ZOOM = 5;
const DRAG_THRESHOLD_PX = 5;
const CLOSEUP_FILL_RATIO = 0.6; // part region fills this fraction of viewport
const ZOOM_STEP_FACTOR = 1.35; // multiplier per zoom-button press
const ANIM_DURATION_MS = 500; // navigation animation duration (ms)

const CATEGORY_CONFIG: Record<
  PartCategory,
  { label: string; dot: string; border: string; bg: string }
> = {
  "printing-unit": {
    label: "인쇄 유닛",
    dot: "#3b82f6",
    border: "rgba(59,130,246,0.85)",
    bg: "rgba(59,130,246,0.12)",
  },
  "folding-unit": {
    label: "접지 유닛",
    dot: "#22c55e",
    border: "rgba(34,197,94,0.85)",
    bg: "rgba(34,197,94,0.12)",
  },
  "roller-web": {
    label: "웹 롤러",
    dot: "#f97316",
    border: "rgba(249,115,22,0.85)",
    bg: "rgba(249,115,22,0.12)",
  },
  "guide-roller-pk": {
    label: "PK 가이드 롤러",
    dot: "#a855f7",
    border: "rgba(168,85,247,0.85)",
    bg: "rgba(168,85,247,0.12)",
  },
  "fd-fr-component": {
    label: "FD/FR 부품",
    dot: "#ef4444",
    border: "rgba(239,68,68,0.85)",
    bg: "rgba(239,68,68,0.12)",
  },
  "web-edge-guide": {
    label: "웹 엣지 가이드",
    dot: "#eab308",
    border: "rgba(234,179,8,0.85)",
    bg: "rgba(234,179,8,0.12)",
  },
  "rs-component": {
    label: "RS 부품",
    dot: "#14b8a6",
    border: "rgba(20,184,166,0.85)",
    bg: "rgba(20,184,166,0.12)",
  },
  other: {
    label: "기타",
    dot: "#64748b",
    border: "rgba(100,116,139,0.85)",
    bg: "rgba(100,116,139,0.12)",
  },
};

const SELECTED_BORDER = "rgba(251,191,36,1)";
const SELECTED_BG = "rgba(251,191,36,0.2)";

const normalize = (value: string) => value.trim().toLowerCase();

// ── Inline style helpers ───────────────────────────────────────────────────
const overlayPanelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  borderRadius: 12,
  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
  border: "1px solid rgba(255,255,255,0.6)",
};

const zoomBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.3)",
  background: "rgba(30,41,59,0.75)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  color: "#f1f5f9",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
  transition: "background 0.15s",
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
};

const zoomTextBtnStyle: React.CSSProperties = {
  ...zoomBtnStyle,
  fontSize: 11,
  fontWeight: 700,
  width: "auto",
  padding: "0 10px",
};

const clearBtnStyle: React.CSSProperties = {
  ...zoomTextBtnStyle,
  marginTop: 4,
  background: "rgba(251,191,36,0.2)",
  border: "1px solid rgba(251,191,36,0.5)",
  color: "#fbbf24",
};

export default function DrawingViewer({ imageSrc, parts }: DrawingViewerProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasInitialFitRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keep refs in sync with state
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panXRef.current = panX; }, [panX]);
  useEffect(() => { panYRef.current = panY; }, [panY]);

  // ── Initial fit-to-view ──────────────────────────────────────────────────
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const doFit = () => {
      if (hasInitialFitRef.current) return;
      const { clientWidth, clientHeight } = viewport;
      if (!clientWidth || !clientHeight) return;

      const fitZoom = Math.min(clientWidth / STAGE_WIDTH, clientHeight / STAGE_HEIGHT) * 0.97;
      setPanX((clientWidth - STAGE_WIDTH * fitZoom) / 2);
      setPanY((clientHeight - STAGE_HEIGHT * fitZoom) / 2);
      setZoom(fitZoom);
      hasInitialFitRef.current = true;
    };

    const observer = new ResizeObserver(doFit);
    observer.observe(viewport);
    doFit();
    return () => observer.disconnect();
  }, []);

  // ── Mouse-wheel zoom (non-passive) ───────────────────────────────────────
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const prevZoom = zoomRef.current;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * factor));
      const ratio = newZoom / prevZoom;

      // Zoom toward cursor: keep the image-point under cursor stationary
      setZoom(newZoom);
      setPanX(cursorX - (cursorX - panXRef.current) * ratio);
      setPanY(cursorY - (cursorY - panYRef.current) * ratio);
      // No transition on wheel zoom for responsiveness
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, []);

  // ── Fit to view ──────────────────────────────────────────────────────────
  const handleFitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { clientWidth, clientHeight } = viewport;
    const fitZoom = Math.min(clientWidth / STAGE_WIDTH, clientHeight / STAGE_HEIGHT) * 0.97;
    setIsAnimating(true);
    setZoom(fitZoom);
    setPanX((clientWidth - STAGE_WIDTH * fitZoom) / 2);
    setPanY((clientHeight - STAGE_HEIGHT * fitZoom) / 2);
    setTimeout(() => setIsAnimating(false), ANIM_DURATION_MS + 50);
  }, []);

  // ── Zoom buttons ─────────────────────────────────────────────────────────
  const handleZoomButton = useCallback((direction: 1 | -1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const prevZoom = zoomRef.current;
    const newZoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, prevZoom * (direction > 0 ? ZOOM_STEP_FACTOR : 1 / ZOOM_STEP_FACTOR)),
    );
    const centerX = viewport.clientWidth / 2;
    const centerY = viewport.clientHeight / 2;
    const ratio = newZoom / prevZoom;
    setIsAnimating(true);
    setZoom(newZoom);
    setPanX(centerX - (centerX - panXRef.current) * ratio);
    setPanY(centerY - (centerY - panYRef.current) * ratio);
    setTimeout(() => setIsAnimating(false), ANIM_DURATION_MS + 50);
  }, []);

  // ── Close-up navigation ──────────────────────────────────────────────────
  const navigateToPart = useCallback(
    (partId: string) => {
      setSelectedPartId(partId);
      setQuery("");
      setIsDropdownOpen(false);

      const part = parts.find((p) => p.id === partId);
      const viewport = viewportRef.current;
      if (!part || !viewport) return;

      const viewW = viewport.clientWidth;
      const viewH = viewport.clientHeight;
      const partCX = part.region.x + part.region.width / 2;
      const partCY = part.region.y + part.region.height / 2;

      // Calculate zoom so the part fills CLOSEUP_FILL_RATIO of the smaller viewport dimension
      const targetZoom = Math.min(
        (viewW * CLOSEUP_FILL_RATIO) / part.region.width,
        (viewH * CLOSEUP_FILL_RATIO) / part.region.height,
        MAX_ZOOM,
      );

      setIsAnimating(true);
      setZoom(targetZoom);
      setPanX(viewW / 2 - partCX * targetZoom);
      setPanY(viewH / 2 - partCY * targetZoom);
      setTimeout(() => setIsAnimating(false), ANIM_DURATION_MS + 50);
    },
    [parts],
  );

  // ── Hotspot click (checks drag flag) ─────────────────────────────────────
  const handlePartClick = useCallback(
    (partId: string) => {
      if (hasDraggedRef.current) return;
      navigateToPart(partId);
    },
    [navigateToPart],
  );

  // ── Drag / pan handlers ───────────────────────────────────────────────────
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
    if (viewportRef.current) viewportRef.current.style.cursor = "grabbing";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
      hasDraggedRef.current = true;
    }
    setPanX(dragStartRef.current.panX + dx);
    setPanY(dragStartRef.current.panY + dy);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    if (viewportRef.current) viewportRef.current.style.cursor = "grab";
  }, []);

  // ── Search / autocomplete ─────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return parts
      .filter(
        (p) =>
          normalize(p.id).includes(q) ||
          normalize(p.name).includes(q) ||
          normalize(p.nameEn).includes(q) ||
          p.keywords.some((k) => normalize(k).includes(q)),
      )
      .slice(0, 10);
  }, [parts, query]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsDropdownOpen(true);
    setHighlightedIndex(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || searchResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = searchResults[highlightedIndex];
      if (target) navigateToPart(target.id);
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedPart = useMemo(
    () => parts.find((p) => p.id === selectedPartId) ?? null,
    [parts, selectedPartId],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={viewportRef}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        cursor: "grab",
        background: "#1e293b",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ── Transformed canvas (moves & scales with zoom/pan) ─────────── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transformOrigin: "0 0",
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transition: isAnimating ? `transform ${ANIM_DURATION_MS}ms ease-out` : "none",
        }}
      >
        {/* Drawing image */}
        <Image
          src={imageSrc}
          alt="Machine layout drawing"
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          priority
          draggable={false}
          style={{
            display: "block",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />

        {/* Part highlight hotspots */}
        {parts.map((part) => {
          const isSelected = selectedPartId === part.id;
          const cfg = CATEGORY_CONFIG[part.category];
          return (
            <button
              key={part.id}
              type="button"
              onClick={() => handlePartClick(part.id)}
              aria-label={`${part.name} 선택`}
              className={isSelected ? "part-selected-pulse" : ""}
              style={{
                position: "absolute",
                left: part.region.x,
                top: part.region.y,
                width: part.region.width,
                height: part.region.height,
                borderWidth: isSelected ? 3 : 2,
                borderStyle: "solid",
                borderColor: isSelected ? SELECTED_BORDER : cfg.border,
                backgroundColor: isSelected ? SELECTED_BG : cfg.bg,
                borderRadius: 4,
                cursor: "pointer",
                padding: 0,
              }}
            />
          );
        })}

        {/* Selected part label (tooltip above region) */}
        {selectedPart && (
          <div
            style={{
              position: "absolute",
              left: selectedPart.region.x,
              top: Math.max(0, selectedPart.region.y - 34),
              background: "rgba(251,191,36,0.95)",
              color: "#1e293b",
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
              zIndex: 10,
            }}
          >
            {selectedPart.id} · {selectedPart.name}
          </div>
        )}
      </div>

      {/* ── Search overlay (top-left, fixed) ──────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 200,
          width: 320,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search panel */}
        <div style={{ ...overlayPanelStyle, padding: "12px 14px" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: 8,
              letterSpacing: "-0.01em",
            }}
          >
            ✦ Drawing Checker
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={handleSearchChange}
            onFocus={() => query && setIsDropdownOpen(true)}
            onKeyDown={handleSearchKeyDown}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 150)}
            placeholder="부품 검색… (예: DE01, roller, 인쇄)"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1.5px solid rgba(100,116,139,0.25)",
              fontSize: 13,
              outline: "none",
              background: "rgba(255,255,255,0.85)",
              color: "#1e293b",
            }}
          />
        </div>

        {/* Autocomplete dropdown */}
        {isDropdownOpen && searchResults.length > 0 && (
          <div
            style={{
              ...overlayPanelStyle,
              marginTop: 4,
              overflow: "hidden",
              maxHeight: 320,
              overflowY: "auto",
            }}
          >
            {searchResults.map((part, i) => {
              const cfg = CATEGORY_CONFIG[part.category];
              const isHighlighted = i === highlightedIndex;
              return (
                <button
                  key={part.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigateToPart(part.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "9px 14px",
                    background: isHighlighted
                      ? "rgba(59,130,246,0.1)"
                      : "transparent",
                    border: "none",
                    borderBottom:
                      i < searchResults.length - 1
                        ? "1px solid rgba(0,0,0,0.06)"
                        : "none",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      backgroundColor: cfg.dot,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flexGrow: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#1e293b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {part.name}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "#64748b",
                      }}
                    >
                      {part.nameEn} · {part.id}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Zoom controls (bottom-right, fixed) ───────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => handleZoomButton(1)}
          style={zoomBtnStyle}
          title="Zoom in"
        >
          +
        </button>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#f1f5f9",
            textAlign: "center",
            minWidth: 42,
            padding: "4px 6px",
            background: "rgba(30,41,59,0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            borderRadius: 7,
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
        <button
          type="button"
          onClick={() => handleZoomButton(-1)}
          style={zoomBtnStyle}
          title="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleFitToView}
          style={zoomTextBtnStyle}
          title="Fit to view"
        >
          Fit
        </button>
        {selectedPartId && (
          <button
            type="button"
            onClick={() => setSelectedPartId(null)}
            style={clearBtnStyle}
            title="Clear selection"
          >
            ✕ Clear
          </button>
        )}
      </div>
    </div>
  );
}
