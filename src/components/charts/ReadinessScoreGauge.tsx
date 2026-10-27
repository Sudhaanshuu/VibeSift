import React from 'react';

interface ReadinessScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export const ReadinessScoreGauge: React.FC<ReadinessScoreGaugeProps> = ({
  score,
  size = 140,
  strokeWidth = 10,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  let strokeColor = '#22C55E'; // Emerald
  let gradeText = 'Ready to Launch';
  let gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

  if (safeScore < 60) {
    strokeColor = '#EF4444'; // Red
    gradeText = 'Launch Blocked';
    gradeColor = 'text-red-700 bg-red-50 border-red-200';
  } else if (safeScore < 80) {
    strokeColor = '#F59E0B'; // Amber
    gradeText = 'Review Needed';
    gradeColor = 'text-amber-800 bg-amber-50 border-amber-200';
  }

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          aria-label={`Launch readiness score: ${safeScore} out of 100`}
          role="img"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated score circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold font-mono text-brand-text leading-none">
            {safeScore}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">out of 100</span>
        </div>
      </div>

      <div className={`mt-3 px-2.5 py-1 rounded-md border text-xs font-bold font-mono ${gradeColor}`}>
        {gradeText}
      </div>
    </div>
  );
};
