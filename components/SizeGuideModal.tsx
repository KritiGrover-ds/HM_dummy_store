"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Department, SavedSizes } from "@/types/store";

interface Row {
  size: string;
  india: string;
  intl: string;
  chest: [number, number];
  waist: [number, number];
  hip: [number, number];
}

const LADIES: Row[] = [
  { size: "XS", india: "6", intl: "EU 34 · UK 6", chest: [78, 82], waist: [62, 66], hip: [86, 90] },
  { size: "S", india: "8", intl: "EU 36 · UK 8", chest: [83, 87], waist: [67, 71], hip: [91, 95] },
  { size: "M", india: "10", intl: "EU 38 · UK 10", chest: [88, 94], waist: [72, 78], hip: [96, 102] },
  { size: "L", india: "12", intl: "EU 40 · UK 12", chest: [95, 101], waist: [79, 85], hip: [103, 109] },
  { size: "XL", india: "14", intl: "EU 42 · UK 14", chest: [102, 110], waist: [86, 94], hip: [110, 118] },
];
const MEN: Row[] = [
  { size: "XS", india: "36", intl: "EU 42", chest: [82, 87], waist: [70, 75], hip: [86, 91] },
  { size: "S", india: "38", intl: "EU 44–46", chest: [88, 95], waist: [76, 83], hip: [92, 99] },
  { size: "M", india: "40", intl: "EU 48–50", chest: [96, 103], waist: [84, 91], hip: [100, 107] },
  { size: "L", india: "42", intl: "EU 52–54", chest: [104, 111], waist: [92, 99], hip: [108, 115] },
  { size: "XL", india: "44", intl: "EU 56–58", chest: [112, 119], waist: [100, 107], hip: [116, 123] },
];
const WAIST: Row[] = [
  { size: "28", india: "28", intl: "W28 · EU 36", chest: [0, 0], waist: [70, 73], hip: [90, 93] },
  { size: "30", india: "30", intl: "W30 · EU 38", chest: [0, 0], waist: [74, 78], hip: [94, 97] },
  { size: "32", india: "32", intl: "W32 · EU 40", chest: [0, 0], waist: [79, 83], hip: [98, 101] },
  { size: "34", india: "34", intl: "W34 · EU 42", chest: [0, 0], waist: [84, 88], hip: [102, 106] },
];
const KIDS: Row[] = [
  { size: "2-4Y", india: "2-4 yrs", intl: "92–104 cm height", chest: [52, 55], waist: [50, 52], hip: [55, 58] },
  { size: "4-6Y", india: "4-6 yrs", intl: "104–116 cm height", chest: [55, 59], waist: [52, 54], hip: [58, 62] },
  { size: "6-8Y", india: "6-8 yrs", intl: "116–128 cm height", chest: [59, 64], waist: [54, 57], hip: [62, 67] },
  { size: "8-10Y", india: "8-10 yrs", intl: "128–140 cm height", chest: [64, 69], waist: [57, 60], hip: [67, 72] },
  { size: "10-12Y", india: "10-12 yrs", intl: "140–152 cm height", chest: [69, 75], waist: [60, 63], hip: [72, 78] },
  { size: "12-14Y", india: "12-14 yrs", intl: "152–164 cm height", chest: [75, 81], waist: [63, 67], hip: [78, 84] },
];
const BABY: Row[] = [
  { size: "0-3M", india: "0-3 months", intl: "56–62 cm height", chest: [40, 42], waist: [40, 42], hip: [40, 42] },
  { size: "3-6M", india: "3-6 months", intl: "62–68 cm height", chest: [42, 44], waist: [42, 44], hip: [42, 44] },
  { size: "6-9M", india: "6-9 months", intl: "68–74 cm height", chest: [44, 46], waist: [44, 46], hip: [44, 46] },
  { size: "9-12M", india: "9-12 months", intl: "74–80 cm height", chest: [46, 48], waist: [45, 47], hip: [46, 48] },
];

function chartFor(department: Department, sizes: string[]): { rows: Row[]; title: string } {
  if (sizes.includes("28")) return { rows: WAIST, title: "Jeans & trousers (waist)" };
  if (department === "baby") return { rows: BABY, title: "Baby" };
  if (department === "kids") return { rows: KIDS, title: "Kids" };
  if (department === "men") return { rows: MEN, title: "Men" };
  return { rows: LADIES, title: department === "sport" ? "Sport (unisex fit)" : "Ladies" };
}

const toIn = (cm: number) => (cm / 2.54).toFixed(1);

export default function SizeGuideModal({
  open,
  onClose,
  department,
  sizes,
  savedSizes,
  onPickSize,
}: {
  open: boolean;
  onClose: () => void;
  department: Department;
  sizes: string[];
  savedSizes?: SavedSizes | null;
  onPickSize?: (size: string) => void;
}) {
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const { rows, title } = chartFor(department, sizes);
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");

  useEffect(() => {
    if (!open) return;
    setChest(savedSizes?.chestCm ? String(savedSizes.chestCm) : "");
    setWaist(savedSizes?.waistCm ? String(savedSizes.waistCm) : "");
    setHip(savedSizes?.hipCm ? String(savedSizes.hipCm) : "");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, savedSizes, onClose]);

  const recommendation = useMemo(() => {
    const c = Number(chest), w = Number(waist), h = Number(hip);
    if (!c && !w && !h) {
      // fall back to saved letter/waist size
      const saved = sizes.includes("28") ? savedSizes?.bottom : savedSizes?.top;
      return saved && sizes.includes(saved) ? { size: saved, reason: "Based on your saved profile size" } : null;
    }
    let best: Row | null = null;
    let bestScore = Infinity;
    for (const r of rows) {
      let score = 0;
      const dist = (v: number, [lo, hi]: [number, number]) => (!v || (!lo && !hi) ? 0 : v < lo ? lo - v : v > hi ? v - hi : 0);
      score += dist(c, r.chest) * 1.2 + dist(w, r.waist) + dist(h, r.hip);
      if (score < bestScore) {
        bestScore = score;
        best = r;
      }
    }
    if (!best) return null;
    return { size: best.size, reason: bestScore === 0 ? "Your measurements fit this size perfectly" : "Closest match to your measurements" };
  }, [chest, waist, hip, rows, sizes, savedSizes]);

  if (!open) return null;
  const fmt = ([lo, hi]: [number, number]) => (!lo && !hi ? "—" : unit === "cm" ? `${lo}–${hi}` : `${toIn(lo)}–${toIn(hi)}`);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-6" role="dialog" aria-modal="true" aria-label="Size guide" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Size guide · {title}</h2>
          <button onClick={onClose} aria-label="Close size guide"><X size={22} /></button>
        </div>
        <p className="mt-1 text-xs text-neutral-600">Indian and international size conversion. Body measurements, not garment measurements.</p>

        <div className="mt-4 inline-flex border border-neutral-300 text-xs">
          {(["cm", "in"] as const).map((u) => (
            <button key={u} onClick={() => setUnit(u)} className={`px-3 py-1.5 ${unit === u ? "bg-black text-white" : ""}`}>{u === "cm" ? "Centimetres" : "Inches"}</button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-black text-xs uppercase tracking-wide">
              <tr>
                <th className="py-2 pr-3">H&amp;M</th>
                <th className="py-2 pr-3">India</th>
                <th className="py-2 pr-3">International</th>
                <th className="py-2 pr-3">Chest</th>
                <th className="py-2 pr-3">Waist</th>
                <th className="py-2">Hip</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.size} className={`border-b border-neutral-200 ${recommendation?.size === r.size ? "bg-[#fff1f1] font-semibold" : ""}`}>
                  <td className="py-2 pr-3">{r.size}</td>
                  <td className="py-2 pr-3">{r.india}</td>
                  <td className="py-2 pr-3">{r.intl}</td>
                  <td className="py-2 pr-3">{fmt(r.chest)}</td>
                  <td className="py-2 pr-3">{fmt(r.waist)}</td>
                  <td className="py-2">{fmt(r.hip)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-[#faf9f8] p-4">
          <p className="text-sm font-semibold">Find my size</p>
          <p className="text-xs text-neutral-600">{savedSizes?.chestCm ? "Pre-filled from your H&M Member profile (cm)." : "Enter your measurements in cm. Save them in your profile for next time."}</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              ["Chest", chest, setChest],
              ["Waist", waist, setWaist],
              ["Hip", hip, setHip],
            ].map(([label, val, set]) => (
              <label key={label as string} className="text-xs">
                {label as string} (cm)
                <input
                  inputMode="numeric"
                  value={val as string}
                  onChange={(e) => (set as (v: string) => void)(e.target.value.replace(/[^\d.]/g, ""))}
                  className="mt-1 w-full border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>
          {recommendation && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-200 pt-3">
              <p className="text-sm">
                We recommend <span className="font-semibold">size {recommendation.size}</span>
                <span className="block text-xs text-neutral-600">{recommendation.reason}</span>
              </p>
              {onPickSize && sizes.includes(recommendation.size) && (
                <button onClick={() => { onPickSize(recommendation.size); onClose(); }} className="bg-black px-4 py-2 text-xs font-semibold uppercase text-white">
                  Select {recommendation.size}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
