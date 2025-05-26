'use client'
import React from "react";
import { Card } from "@/src/components/ui/card";
import { Users, Calendar, GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
   
interface StudentClassCardProps {
  id: string;
  emoji: string;
  name: string;
  code: string;
  color?: string;
  grade?: string;
  numberOfStudents?: number;
  schedule?: string | null;
  overview?: string;
}

export const StudentClassCard = ({ 
  id, 
  emoji, 
  name, 
  code, 
  color = "primary", 
  grade,
  numberOfStudents,
  schedule,
}: StudentClassCardProps) => {
  const router = useRouter();
  
  // Color mapping function - same as teacher's card
  const getBackgroundColor = () => {
    switch(color) {
      case "primary": return "bg-blue-500";
      case "secondary": return "bg-purple-500";
      case "destructive": return "bg-red-500";
      case "success": return "bg-green-500";
      case "warning": return "bg-yellow-500";
      case "default": return "bg-gray-400";
      default: return "bg-blue-500"; // Default to blue if color doesn't match
    }
  };

  // Text color function - same as teacher's card
  const getTextColor = () => {
    return color === "warning" || color === "default" ? "text-gray-900" : "text-white";
  };

  const bgClass = getBackgroundColor();
  const textClass = getTextColor();
  
  const handleCardClick = () => {
    router.push(`/student/dashboard/classes/${code}`);
  };
  
  return (
    <Card className="bg-transparent h-[250px] w-[250px] rounded-xl relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Use an inner container that has the dynamic background */}
      <div
        onClick={handleCardClick} 
        className={`${bgClass} w-full h-full rounded-xl flex flex-col p-4 cursor-pointer`}
      >
        {/* Header section */}
        <div className="flex flex-col items-center mb-2">
          <div className="text-4xl mb-2">{emoji}</div>
          <h3 className={`text-xl font-semibold ${textClass} text-center`}>{name}</h3>
          <p className={`text-sm ${textClass} opacity-90 text-center`}>Code: {code}</p>
        </div>
        
        {/* Add a flex-grow spacer to push content to bottom */}
        <div className="flex-grow"></div>
        
        {/* Info section at bottom */}
        <div className="flex flex-col space-y-1.5">
          {grade && (
            <div className={`flex items-center gap-2 ${textClass} opacity-80`}>
              <GraduationCap className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">Grade: {grade}</p>
            </div>
          )}
          
          {schedule && (
            <div className={`flex items-center gap-2 ${textClass} opacity-80`}>
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <p className="text-xs line-clamp-2">{schedule}</p>
            </div>
          )}
          
          {numberOfStudents !== undefined && (
            <div className={`flex items-center gap-2 ${textClass} opacity-80`}>
              <Users className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{numberOfStudents} students</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};