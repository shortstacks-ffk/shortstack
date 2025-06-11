"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";

interface AddAnythingProps<T> {
  title: string;
  FormComponent: React.ComponentType<any>; 
  onItemAdded?: (newItem: T | null) => void;
  formProps?: Record<string, any>;
}

// Use a generic type parameter T for the item being added
function AddAnything<T>({ 
  title, 
  FormComponent, 
  onItemAdded,
  formProps = {}
}: AddAnythingProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  
  // Track whether form is currently being submitted
  const isSubmittingRef = useRef(false);

  // We use this effect to properly manage component mounting/unmounting
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      // Only start the unmount timer if we're not submitting
      if (!isSubmittingRef.current) {
        const timer = setTimeout(() => setShouldRender(false), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };
  
  const handleClose = () => {
    handleOpenChange(false);
  };
  
  const handleSuccess = (newItem?: T | null) => {
    // Mark that we're submitting to prevent the form from showing during transition
    isSubmittingRef.current = true;
    
    // Close the dialog immediately without animation
    setIsOpen(false);
    setShouldRender(false);
    
    // Call the parent's refresh function if provided
    if (onItemAdded) {
      onItemAdded(newItem || null);
    }
    
    // Reset the submitting state after a delay
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 500);
  };

  return (
    <>
      <Card
        className="border-4 border-solid border-gray-400 w-[250px] h-[250px] rounded-xl bg-muted/80 flex flex-col justify-center items-center cursor-pointer hover:bg-muted/70 transition-colors duration-200"
        onClick={() => handleOpenChange(true)}
      >
        <CardContent className="flex flex-col items-center justify-center w-full h-full pt-10">
          <div className="rounded-full bg-primary/35 p-2 text-primary/40 w-[80px] h-[80px] mx-2 my-2 hover:bg-primary/50 transition-colors duration-300">
            <Plus className="mx-2 my-2 w-12 h-12 object-center" />
          </div>
        </CardContent>
        <CardContent>
          <div className="items-center justify-center w-full h-full w-[130px] h-[20px] rounded-xl bg-primary/10 text-primary/60 px-7">
            {title}
          </div>
        </CardContent>
      </Card>

      <Dialog 
        open={isOpen} 
        onOpenChange={(open) => {
          // Only allow changing if we're not submitting
          if (!isSubmittingRef.current || open) {
            handleOpenChange(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          
          {shouldRender && (
            <FormComponent
              isOpen={isOpen}
              onClose={handleClose}
              onSuccess={handleSuccess}
              onClassJoined={onItemAdded}
              {...formProps}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddAnything;
