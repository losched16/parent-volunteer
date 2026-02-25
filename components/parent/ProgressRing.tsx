// components/parent/ProgressRing.tsx
"use client";

interface ProgressRingProps {
  percentage: number;
  hours: number;
  required: number;
  size?: number;
}

export default function ProgressRing({ percentage, hours, required, size = 200 }: ProgressRingProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  const center = size / 2;

  const getColor = () => {
    if (percentage >= 100) return "#22c55e";
    if (percentage >= 75) return "#86BD40";
    if (percentage >= 50) return "#eab308";
    return "#f97316";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="progress-ring-animate transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color: getColor() }}>
          {percentage}%
        </span>
        <span className="text-sm text-gray-500 font-medium mt-1">
          {hours} / {required} hrs
        </span>
        {percentage >= 100 && (
          <span className="text-xs text-green-600 font-semibold mt-1">
            ✓ Complete!
          </span>
        )}
      </div>
    </div>
  );
}
