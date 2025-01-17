"use client";

import { useState, useRef } from "react";
import { ClassController } from '@/controllers/class-controller';
import { Class } from '@/models/class-model';
import { ClassGrid } from '@/components/ui/class-grid';
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";



export default function Page() {
  const controllerRef = useRef<ClassController>(new ClassController());
  const [classes, setClasses] = useState<Class[]>([]);


  const handleAddClass = () => {
    const controller = controllerRef.current;
    const newClass = controller.createClass();
    setClasses(prevClasses => [...prevClasses, newClass]);
  };

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <ClassGrid classes={classes} onAddClass={handleAddClass} />
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
