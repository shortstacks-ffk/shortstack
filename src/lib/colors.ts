export interface ColorOption {
  value: string;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
}

// Define the color options with exact Tailwind class names
export const colorOptions: ColorOption[] = [
  { 
    value: "primary", 
    label: "Blue", 
    color: "#3b82f6", 
    bgClass: "bg-blue-500", 
    textClass: "text-white"
  },
  { 
    value: "secondary", 
    label: "Purple", 
    color: "#a855f7", 
    bgClass: "bg-purple-500", 
    textClass: "text-white"
  },
  { 
    value: "destructive", 
    label: "Red", 
    color: "#ef4444", 
    bgClass: "bg-red-500", 
    textClass: "text-white"
  },
  { 
    value: "success", 
    label: "Green", 
    color: "#22c55e", 
    bgClass: "bg-green-500", 
    textClass: "text-white"
  },
  { 
    value: "warning", 
    label: "Yellow", 
    color: "#eab308", 
    bgClass: "bg-yellow-500", 
    textClass: "text-gray-900"
  },
  { 
    value: "default", 
    label: "Gray", 
    color: "#9ca3af", 
    bgClass: "bg-gray-400", 
    textClass: "text-gray-900"
  },
];

// Direct mapping of color values to background classes for fast lookup
const colorMap: Record<string, {bgClass: string, textClass: string}> = {
  "primary": { bgClass: "bg-blue-500", textClass: "text-white" },
  "secondary": { bgClass: "bg-purple-500", textClass: "text-white" },
  "destructive": { bgClass: "bg-red-500", textClass: "text-white" },
  "success": { bgClass: "bg-green-500", textClass: "text-white" },
  "warning": { bgClass: "bg-yellow-500", textClass: "text-gray-900" },
  "default": { bgClass: "bg-gray-400", textClass: "text-gray-900" },
}

export const getColorClasses = (colorValue: string = "primary"): { bgClass: string, textClass: string } => {
  // Force a simple string for lookup
  const safeColorValue = String(colorValue || "primary").trim();
  
  // Use direct mapping for better performance and reliability
  return colorMap[safeColorValue] || { bgClass: "bg-blue-500", textClass: "text-white" };
};