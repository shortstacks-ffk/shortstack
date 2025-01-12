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

export default function Page() {
  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <div className="flex flex-col min-h-screen px-20 p-4 bg-gray-50">
          {/* Header section with buttons */}
          <div className="flex justify-between items-center max-w-4xl mx-auto w-full mb-8 mt-[15%]">
            <h1 className="text-4xl font-bold ">Classes</h1>
            <div className="flex gap-4 ">
              <Button className="bg-[#6F7C8E] text-white w-32 h-10 rounded-[15px] hover:bg-[#5C6A7B]">
                Add Class
              </Button>
              <Button className="bg-[#6F7C8E] text-white w-32 h-10 rounded-[15px] hover:bg-[#5C6A7B]">
                Edit Class
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="max-w-4xl mx-auto w-full grid grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Card 1</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Content for card 1</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Card 2</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Content for card 2</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Card 3</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Content for card 3</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Card 4</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Content for card 4</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Card 5</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Content for card 5</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Card 6</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Content for card 6</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  );
}
