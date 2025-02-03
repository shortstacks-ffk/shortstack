"use client";

import { useState, useRef } from "react";
import { ClassController } from "@/src/controllers/class-controller";
import { Class } from "@/src/models/class-model";
import { ClassFormModal } from "@/src/components/class-form-modal";
import { ClassGrid } from "@/src/components/class-grid";

import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar";

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
