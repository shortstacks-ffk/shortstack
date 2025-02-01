"use client";

import { useState, useRef } from "react";
import { ClassController } from "@/controllers/class-controller";
import { Class } from "@/models/class-model";
import { ClassFormModal } from "@/components/class-form-modal";
import { ClassGrid } from "@/components/class-grid";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Page() {
  const controllerRef = useRef<ClassController>(new ClassController());
  const [classes, setClasses] = useState<Class[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddClass = (formData: Omit<Class, "id">) => {
    const controller = controllerRef.current;
    const newClass = controller.createClass(formData);
    setClasses((prevClasses) => [...prevClasses, newClass]);
  };

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
      <ClassGrid 
          classes={classes} 
          onAddClass={() => setIsModalOpen(true)} 
        />
        <ClassFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddClass}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
