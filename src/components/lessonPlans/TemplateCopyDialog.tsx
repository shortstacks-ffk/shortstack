'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface TemplateCopyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  actionType: 'edit' | 'delete' | 'visibility';
  itemType?: 'file' | 'assignment';
  itemName?: string;
  isLoading?: boolean;
}

export function TemplateCopyDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  actionType,
  itemType,
  itemName,
  isLoading = false
}: TemplateCopyDialogProps) {
  const getActionText = () => {
    switch (actionType) {
      case 'edit':
        return `edit ${itemType ? `this ${itemType}` : 'this template'}`;
      case 'delete':
        return `delete ${itemType ? `the ${itemType} "${itemName}"` : 'this item'}`;
      case 'visibility':
        return `manage visibility settings for ${itemType ? `this ${itemType}` : 'this content'}`;
      default:
        return 'perform this action';
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Create Your Copy</AlertDialogTitle>
          <AlertDialogDescription>
            To {getActionText()}, we'll need to create a copy of this template in your lesson plans.
            Would you like to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Copy...
              </>
            ) : (
              'Create Copy'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}