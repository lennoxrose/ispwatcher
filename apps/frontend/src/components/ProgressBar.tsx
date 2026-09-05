export function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
    </div>
  );
}
