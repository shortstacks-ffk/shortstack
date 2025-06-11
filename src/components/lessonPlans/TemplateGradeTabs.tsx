import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { GradeLevel } from "@/src/app/actions/lessonPlansActions";

interface TemplateGradeTabsProps {
  activeGrade: GradeLevel;
  onChange: (grade: GradeLevel) => void;
}

export default function TemplateGradeTabs({ activeGrade, onChange }: TemplateGradeTabsProps) {
  return (
    <Tabs value={activeGrade} onValueChange={(value) => onChange(value as GradeLevel)}>
      <TabsList className="mb-4 bg-orange-100">
        <TabsTrigger 
          value="all" 
          className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
        >
          All Grades
        </TabsTrigger>
        <TabsTrigger 
          value="5-6" 
          className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
        >
          Grades 5-6
        </TabsTrigger>
        <TabsTrigger 
          value="7-8" 
          className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
        >
          Grades 7-8
        </TabsTrigger>
        <TabsTrigger 
          value="9-10" 
          className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
        >
          Grades 9-10
        </TabsTrigger>
        <TabsTrigger 
          value="11-12" 
          className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
        >
          Grades 11-12
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}