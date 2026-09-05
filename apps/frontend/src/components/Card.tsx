import type { ReactNode } from "react";

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {title && <h2 className="mb-3 text-base font-semibold text-gray-900">{title}</h2>}
      {children}
    </div>
  );
}
