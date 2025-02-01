"use client";

import * as React from "react";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Class } from "@/models/class-model";
import { FaClock, FaCalendarAlt } from "react-icons/fa";
import { Plus } from "lucide-react";

interface ClassGridProps {
  classes: Class[];
  onAddClass: () => void;
}


export function ClassGrid({ classes, onAddClass }: ClassGridProps) {
  const getColumnIndex = (index, totalItems) => {
    const row = Math.floor(index / 3);
    return index - (row * 3);
  };
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
          <Button className="bg-[#6F7C8E] text-white w-32 h-10 rounded-[15px] hover:bg-[#5C6A7B]">
            Edit Class
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full">
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem, index) => (
            <Card
              key={classItem.id}
              className={`grid-column w-[250px] h-[250px] rounded-xl  flex flex-col ${
                getColumnIndex(index, classes.length) === 0
                  ? "bg-[#009245]"
                  : getColumnIndex(index, classes.length) === 1
                  ? "bg-[#F57600]"
                  : "bg-[#E63A93]"
              }`}
            >
              <CardHeader>
                <CardTitle className="text-white">{classItem.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mt-12">
                  <div className="flex items-center space-x-2">
                    <FaClock className="text-xl text-white" />
                    <p className="text-sm text-white">{classItem.time}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FaCalendarAlt className="text-xl text-white" />
                    <p className="text-sm text-white">{classItem.day}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {/* Add Class Card */}
          <Card className="border-4 border-solid border-gray-400 w-[250px] h-[250px] rounded-xl bg-muted/80 flex flex-col justify-center items-center">
            <CardContent className="flex flex-col items-center justify-center w-full h-full pt-10">
              <div
                className="rounded-full bg-primary/35 p-2 text-primary/40 w-[80px] h-[80px] mx-2 my-2 cursor-pointer hover:bg-primary/50 transition-colors duration-300"
                onClick={onAddClass}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onAddClass()}
              >
                <Plus className="mx-2 my-2 w-12 h-12 object-center" />
              </div>
            </CardContent>
            <CardContent className="relative flex flex-col items-center">
              <div className="w-[130px] h-[20px] rounded-xl bg-primary/10 text-primary/60 px-7">
                Add Class
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
