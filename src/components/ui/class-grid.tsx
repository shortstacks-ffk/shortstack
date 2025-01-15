"use client";

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Class } from "@/models/class-model"

interface ClassGridProps {
    classes: Class[];
    onAddClass: () => void;
}

export function ClassGrid({ classes, onAddClass }: ClassGridProps) {
    return (
      <div className="flex flex-col min-h-screen px-20 p-4 bg-gray-50">
        <div className="flex justify-between items-center max-w-4xl mx-auto w-full mb-8 mt-[15%]">
          <h1 className="text-4xl font-bold">Classes</h1>
          <div className="flex gap-4">
            <Button
              onClick={onAddClass}
              className="bg-[#6F7C8E] text-white w-32 h-10 rounded-[15px] hover:bg-[#5C6A7B]"
            >
              Add Class
            </Button>
            <Button 
              className="bg-[#6F7C8E] text-white w-32 h-10 rounded-[15px] hover:bg-[#5C6A7B]"
            >
              Edit Class
            </Button>
          </div>
        </div>
  
        <div className="max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.length === 0 ? (
              <div className="flex justify-center items-center h-[60vh] text-center text-black-500 max-w-screen-xl whitespace-nowrap ml-46">
                Please add a class
              </div>
            ) : (
              classes.map((classItem) => (
                <Card className="h-40" key={classItem.id}>
                  <CardHeader>
                    <CardTitle>{classItem.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{classItem.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }
