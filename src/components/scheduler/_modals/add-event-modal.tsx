
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import { useModal } from "@/src/providers/scheduler/modal-context";
import SelectDate from "@/src/components/scheduler/_components/add-event-components/select-date";
import { SubmitHandler, useForm, UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EventFormData, Event } from "@/src/types/scheduler/index";
import { useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { v4 as uuidv4 } from "uuid";

// Define the event form schema
const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  variant: z.enum(["default", "primary", "success", "warning", "danger"]),
});


export default function AddEventModal({
  CustomAddEventModal,
}: {
  CustomAddEventModal?: React.FC<{ register: any; errors: any }>;
}) {
  const { setClose, data } = useModal();
  const { handlers } = useScheduler();

  // Convert to typed data
  const typedData = data as { default?: Event };
  const isEditing = !!typedData?.default?.id;
  
  // Set default color based on existing event or primary
  const defaultVariant = typedData?.default?.variant || "primary";
  const [selectedVariant, setSelectedVariant] = useState(defaultVariant);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(new Date().getTime() + 60 * 60 * 1000), // Default 1 hour
      variant: "primary",
    },
  });

  // Load data when editing an existing event
  useEffect(() => {
    if (typedData?.default) {
      const eventData = typedData.default;
      
      // Convert dates properly
      const startDate = eventData.startDate instanceof Date 
        ? eventData.startDate 
        : new Date(eventData.startDate);
        
      const endDate = eventData.endDate instanceof Date 
        ? eventData.endDate 
        : new Date(eventData.endDate);
      
      // Reset form with existing data
     reset({
      title: eventData.title || "",
      description: eventData.description || "",
      startDate,
      endDate,
      // Ensure variant is one of the allowed values
      variant: (eventData.variant as "primary" | "success" | "warning" | "danger" | "default") || "primary",
    });
      
      setSelectedVariant(eventData.variant || "primary");
    }
  }, [typedData, reset]);

  const onSubmit: SubmitHandler<EventFormData> = (formData) => {
    // Preserve existing metadata if editing
    const metadata = typedData?.default?.metadata || {};
    
    const eventData: Event = {
      id: typedData?.default?.id || uuidv4(),
      title: formData.title,
      description: formData.description || "",
      startDate: formData.startDate,
      endDate: formData.endDate,
      variant: formData.variant,
      isRecurring: typedData?.default?.isRecurring || false,
      recurringDays: typedData?.default?.recurringDays || [],
      metadata
    };

    if (isEditing) {
      handlers.handleUpdateEvent(eventData, eventData.id);
    } else {
      handlers.handleAddEvent(eventData);
    }

    setClose(); // Close the modal after submission
  };
  
  // Color options for events
  const colorOptions = [
    { value: "primary", label: "Blue", bgClass: "bg-blue-500" },
    { value: "success", label: "Green", bgClass: "bg-green-500" },
    { value: "warning", label: "Yellow", bgClass: "bg-yellow-500" },
    { value: "danger", label: "Red", bgClass: "bg-red-500" },
    { value: "default", label: "Gray", bgClass: "bg-gray-500" },
  ];

  return (
    <div className="space-y-4 p-4">
      {CustomAddEventModal ? (
        <CustomAddEventModal register={register} errors={errors} />
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Event Title"
              {...register("title")}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Event Description"
              {...register("description")}
              className="min-h-[80px]"
            />
          </div>

          <SelectDate
            data={{ 
              startDate: typedData?.default?.startDate ?? new Date(), 
              endDate: typedData?.default?.endDate ?? new Date(new Date().getTime() + 60 * 60 * 1000) 
            }}
            setValue={setValue as UseFormSetValue<EventFormData>}
          />

          <div className="space-y-2">
            <Label>Event Color</Label>
            <div className="flex space-x-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-8 h-8 rounded-full ${option.bgClass} flex items-center justify-center
                    ${selectedVariant === option.value ? 'ring-2 ring-offset-2' : ''}`}
                  onClick={() => {
                    setSelectedVariant(option.value as any);
                    setValue("variant", option.value as any);
                  }}
                  aria-label={option.label}
                />
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            className="w-full"
          >
            {isEditing ? "Update Event" : "Create Event"}
          </Button>
        </>
      )}
    </div>
  );
}