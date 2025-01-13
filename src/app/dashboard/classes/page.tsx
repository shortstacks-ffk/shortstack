"use client";
import { useState } from "react";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import { Plus } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const CardGrid = () => {
  const [cards, setCards] = useState<string[]>([]); // Initialize state to store cards

  const handleAddCard = () => {
    setCards((prevCards) => [...prevCards, `Class ${prevCards.length + 1}`]);
  };

  return (
    <div className="flex flex-col min-h-screen px-20 p-4 bg-gray-50">
      {/* Header section with buttons */}
      <div className="flex justify-between items-center max-w-4xl mx-auto w-full mb-8 mt-[15%]">
        <h1 className="text-4xl font-bold ">Classes</h1>
        <div className="flex gap-4 ">
          <Button
            onClick={handleAddCard}
            className="bg-[#6F7C8E] text-white w-32 h-10 rounded-[15px] hover:bg-[#5C6A7B]"
          >
            Add Class
          </Button>
          <Button className="bg-[#6F7C8E] text-white w-32 h-10 rounded-[15px] hover:bg-[#5C6A7B]">
            Edit Class
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto w-full">
        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.length === 0 ? (
            <div className="flex justify-center items-center h-[60vh] text-center text-black-500 max-w-screen-xl whitespace-nowrap ml-46">
              Please add a class
            </div>
          ) : (
            cards.map((card, index) => (
              <Card className="h-40" key={index}>
                <CardHeader>
                  <CardTitle>{card}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Content for {card}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <CardGrid />
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
