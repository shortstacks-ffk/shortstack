"use client"

// Generate mock data for classes
const generateClassScoreData = (color: string) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Different patterns for different classes (following the screenshot)
  let baseScores;
  switch(color) {
    case "primary": // blue line
      baseScores = [15, 32, 50, 45, 47, 50, 62, 63, 68, 65, 45, 90];
      break;
    case "secondary": // purple/pink line
      baseScores = [18, 34, 51, 50, 52, 53, 60, 62, 69, 65, 47, 92];
      break;
    case "destructive": // red/orange line
      baseScores = [6, 24, 42, 41, 43, 40, 46, 52, 53, 56, 38, 80];
      break;
    case "success": // green line
      baseScores = [20, 33, 29, 32, 46, 36, 65, 58, 61, 53, 41, 81];
      break;
    case "warning": // yellow line
      baseScores = [12, 30, 45, 37, 43, 43, 50, 51, 57, 50, 40, 78];
      break;
    default:
      baseScores = [15, 30, 48, 43, 45, 48, 60, 60, 65, 63, 40, 85];
  }
  
  return months.map((month, i) => ({
    month,
    score: baseScores[i]
  }));
};

// Get color for class
const getColorForClass = (color: string) => {
  switch(color) {
    case "primary": return "#3b82f6"; // blue
    case "secondary": return "#ec4899"; // pink (magenta)
    case "destructive": return "#f97316"; // orange
    case "success": return "#22c55e"; // green
    case "warning": return "#eab308"; // yellow
    default: return "#3b82f6"; // default blue
  }
};

interface ClassData {
  id: string;
  name: string;
  emoji: string;
  color?: string;
}

interface PerformanceChartProps {
  recentClasses: ClassData[];
}

export function PerformanceChart({ recentClasses }: PerformanceChartProps) {
  // Generate data for each class
  const classesWithData = recentClasses.map(cls => ({
    ...cls,
    data: generateClassScoreData(cls.color || "primary"),
    color: getColorForClass(cls.color || "primary")
  }));
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Create array with intervals of 10 for Y-axis
  const yAxisValues = Array.from({ length: 11 }, (_, i) => 100 - i * 10);
  
  return (
    <div className="w-full h-full py-2">
      {/* Chart container with padding and height constraints - increased height */}
      <div className="bg-white rounded-lg w-full h-[40vh] p-4">
        <div className="relative w-full h-full">
          {/* Y-axis labels with intervals of 10 */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
            {yAxisValues.map(val => (
              <div key={val} className="relative" style={{ height: '0', transform: 'translateY(-50%)' }}>
                {val}
              </div>
            ))}
          </div>
          
          {/* Chart area */}
          <div className="absolute left-8 top-0 right-4 bottom-8 overflow-hidden">
            {/* Grid lines - increased to 11 lines for intervals of 10 */}
            <div className="absolute inset-0">
              {yAxisValues.map((val, i) => (
                <div 
                  key={`grid-${i}`}
                  className="absolute border-t border-gray-100 w-full"
                  style={{ top: `${i * 10}%`, left: 0 }}
                />
              ))}
            </div>
            
            {/* SVG chart with fixed viewBox */}
            <svg 
              className="absolute inset-0 w-full h-full" 
              viewBox="0 0 1100 500"
              preserveAspectRatio="none"
            >
              {classesWithData.map(cls => (
                <g key={cls.id}>
                  {/* Connected line */}
                  <path 
                    d={cls.data.map((point, i) => {
                      const x = (i * 100) + 10;
                      // Invert Y coordinate (SVG 0 is at top)
                      const y = 500 - ((point.score / 100) * 500);
                      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke={cls.color}
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  
                  {/* Data points */}
                  {cls.data.map((point, i) => (
                    <circle 
                      key={`point-${i}`}
                      cx={(i * 100) + 10}
                      cy={500 - ((point.score / 100) * 500)}
                      r="5"
                      fill="white"
                      stroke={cls.color}
                      strokeWidth="3"
                    />
                  ))}
                </g>
              ))}
            </svg>
          </div>
          
          {/* X-axis labels */}
          <div className="absolute left-8 right-4 bottom-0 flex justify-between text-xs text-gray-500">
            {months.map(month => (
              <div key={month}>{month}</div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="absolute left-8 right-0 -bottom-6 flex justify-center gap-6">
            {classesWithData.map(cls => (
              <div key={cls.id} className="flex items-center">
                <span 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: cls.color }}
                />
                <span className="text-xs flex items-center">
                  {cls.emoji} {cls.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}