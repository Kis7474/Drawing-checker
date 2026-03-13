"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MachinePart } from "@/types/part";

type DrawingViewerProps = {
  imageSrc: string;
  parts: MachinePart[];
};

const STAGE_WIDTH = 1800;
const STAGE_HEIGHT = 1400;

const normalize = (value: string) => value.trim().toLowerCase();

export default function DrawingViewer({ imageSrc, parts }: DrawingViewerProps) {
  const [query, setQuery] = useState("");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredParts = useMemo(() => {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return parts;
    }

    return parts.filter((part) => {
      const nameMatches = normalize(part.name).includes(normalizedQuery);
      const keywordMatches = part.keywords.some((keyword) =>
        normalize(keyword).includes(normalizedQuery),
      );

      return nameMatches || keywordMatches;
    });
  }, [parts, query]);

  const selectedPart = useMemo(
    () => parts.find((part) => part.id === selectedPartId) ?? null,
    [parts, selectedPartId],
  );

  useEffect(() => {
    if (!selectedPart || !scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const targetLeft = selectedPart.region.x + selectedPart.region.width / 2 - container.clientWidth / 2;
    const targetTop = selectedPart.region.y + selectedPart.region.height / 2 - container.clientHeight / 2;

    container.scrollTo({
      left: Math.max(0, targetLeft),
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }, [selectedPart]);

  const handleSelectPart = (partId: string) => {
    setSelectedPartId(partId);
  };

  const handleResetView = () => {
    setQuery("");
    setSelectedPartId(null);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="grid h-full grid-cols-[320px_minmax(0,1fr)_360px] gap-4">
      <aside className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-800">Machine Drawing Viewer</h1>
        <p className="mt-1 text-sm text-slate-500">부품명 또는 키워드로 빠르게 위치를 찾으세요.</p>

        <label htmlFor="part-search" className="mt-5 text-sm font-medium text-slate-700">
          부품 검색
        </label>
        <input
          id="part-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="예: motor, 샤프트, bearing"
          className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
        <p className="mt-2 text-xs text-slate-500">검색어는 한글/영문 모두 지원되며 대소문자를 구분하지 않습니다.</p>

        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">검색 결과 ({filteredParts.length})</h2>
          <button
            type="button"
            onClick={handleResetView}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            전체 보기
          </button>
        </div>

        <ul className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {filteredParts.map((part) => {
            const isSelected = selectedPartId === part.id;

            return (
              <li key={part.id}>
                <button
                  type="button"
                  onClick={() => handleSelectPart(part.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold">{part.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{part.id}</p>
                </button>
              </li>
            );
          })}

          {filteredParts.length === 0 && (
            <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              검색 결과가 없습니다. 다른 키워드를 입력해 보세요.
            </li>
          )}
        </ul>
      </aside>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
          Drawing Canvas (1800 × 1400)
        </div>
        <div ref={scrollContainerRef} className="h-[calc(100%-49px)] overflow-auto p-4">
          <div className="relative rounded-lg border border-slate-200 bg-slate-100" style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
            <Image
              src={imageSrc}
              alt="Machine layout drawing"
              fill
              sizes="1800px"
              priority
              className="rounded-lg object-cover"
            />

            {parts.map((part) => {
              const isSelected = selectedPartId === part.id;

              return (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => handleSelectPart(part.id)}
                  className={`absolute rounded-md border-2 transition ${
                    isSelected
                      ? "border-amber-400 bg-amber-300/20 shadow-[0_0_0_4px_rgba(251,191,36,0.25)]"
                      : "border-cyan-500/70 bg-cyan-400/10 hover:border-cyan-500 hover:bg-cyan-300/20"
                  }`}
                  style={{
                    left: part.region.x,
                    top: part.region.y,
                    width: part.region.width,
                    height: part.region.height,
                  }}
                  aria-label={`${part.name} 영역 선택`}
                />
              );
            })}

            {selectedPart && (
              <div
                className="absolute -translate-y-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow"
                style={{ left: selectedPart.region.x, top: selectedPart.region.y - 24 }}
              >
                {selectedPart.name}
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">부품 상세 정보</h2>

        {!selectedPart && (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            왼쪽 검색 결과 또는 도면의 하이라이트 영역을 클릭하면 상세 정보가 표시됩니다.
          </div>
        )}

        {selectedPart && (
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Part Name</dt>
              <dd className="mt-1 text-base font-semibold text-slate-900">{selectedPart.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Part ID</dt>
              <dd className="mt-1 text-slate-800">{selectedPart.id}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Part Number</dt>
              <dd className="mt-1 text-slate-800">{selectedPart.partNo ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</dt>
              <dd className="mt-1 leading-relaxed text-slate-700">{selectedPart.description}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Maintenance Note</dt>
              <dd className="mt-1 leading-relaxed text-slate-700">{selectedPart.maintenance ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Region Coordinates</dt>
              <dd className="mt-1 font-mono text-xs text-slate-700">
                x: {selectedPart.region.x}, y: {selectedPart.region.y}, w: {selectedPart.region.width}, h: {selectedPart.region.height}
              </dd>
            </div>
          </dl>
        )}
      </aside>
    </div>
  );
}
