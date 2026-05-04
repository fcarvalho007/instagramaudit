import { useEffect, useRef, useState } from "react";
import { getScoreFamily, SCORE_COLORS } from "./score-utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  label: string;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const STROKE_WIDTH = 5.5;

export function ScoreRing({ score, size = 88, label }: ScoreRingProps) {
  const family = getScoreFamily(score);
  const colors = SCORE_COLORS[family];
  const [mounted, setMounted] = useState(false);
  const ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const offset = CIRCUMFERENCE * (1 - score / 100);
  const viewBox = `0 0 ${RADIUS * 2 + STROKE_WIDTH} ${RADIUS * 2 + STROKE_WIDTH}`;
  const center = RADIUS + STROKE_WIDTH / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      role="img"
      aria-label={`${label}: ${score} de 100`}
      className="block"
    >
      <title>{`${label}: ${score} de 100`}</title>
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={RADIUS}
        fill="none"
        stroke={colors.bg}
        strokeWidth={STROKE_WIDTH}
      />
      {/* Progress circle */}
      <circle
        ref={ref}
        cx={center}
        cy={center}
        r={RADIUS}
        fill="none"
        stroke={colors.stroke}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={mounted ? offset : CIRCUMFERENCE}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 800ms ease-out" }}
      />
      {/* Score text */}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill={colors.text}
        fontSize={size >= 90 ? "30" : size >= 80 ? "28" : "22"}
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        {score}
      </text>
    </svg>
  );
}
