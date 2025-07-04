'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { CheckCircle } from "lucide-react";

interface TemplateCopySuccessDialogProps {
  isOpen: boolean;
  onContinue: () => void;
  actionType: 'edit' | 'delete' | 'visibility';
}

export function TemplateCopySuccessDialog({
  isOpen,
  onContinue,
  actionType
}: TemplateCopySuccessDialogProps) {
  const getActionText = () => {
    switch (actionType) {
      case 'edit':
        return 'edit';
      case 'delete':
        return 'delete';
      case 'visibility':
        return 'manage visibility settings for';
      default:
        return 'modify';
    }
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-green-600">
            <CheckCircle className="mr-2 h-5 w-5" />
            Copy Created Successfully
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your copy has been created. Click continue to {getActionText()} your copy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onContinue}
            className="bg-orange-500 hover:bg-orange-600"
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}