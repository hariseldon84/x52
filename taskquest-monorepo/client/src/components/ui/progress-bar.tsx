import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  color?: "blue" | "orange" | "green" | "red";
}

export default function ProgressBar({ 
  value, 
  max = 100, 
  className = "", 
  showPercentage = false,
  color = "blue"
}: ProgressBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  const colorClasses = {
    blue: "text-blue-400",
    orange: "text-orange-400", 
    green: "text-green-400",
    red: "text-red-400"
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {showPercentage && (
        <div className="flex justify-between text-sm">
          <span className="text-secondary">{value} / {max}</span>
          <span className={colorClasses[color]}>{Math.round(percentage)}%</span>
        </div>
      )}
      <Progress value={percentage} className="h-2" />
    </div>
  );
}