'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { StudentJoinClass } from './StudentJoinClass';

export function StudentJoinClassDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">Join a Class</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Class</DialogTitle>
        </DialogHeader>
        <StudentJoinClass />
      </DialogContent>
    </Dialog>
  );
}