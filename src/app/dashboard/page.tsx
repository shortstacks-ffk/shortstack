"use client"
import { SidebarLeft } from "@/components/sidebar-left"
import { SidebarRight } from "@/components/sidebar-right"
import { Plus } from "lucide-react"

import SearchBar from "@/components/search-bar"

// notification UI in dashboard
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Bell } from 'lucide-react';

import { useRouter } from "next/navigation"

import '../../../public/styles/icons.css'

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Page() {
  
  const router = useRouter();

  const handleClick = () => {
    router.push('/dashboard/classes');
  };

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
          <div className="flex flex-1 items-center gap-2 px-3 rounded-half mx-auto bg-muted/50 pt-8 pl-8">
            <SearchBar />
            <Popover>
              <PopoverTrigger><Bell /></PopoverTrigger>
              <PopoverContent>
              <h1>Event Notifications here </h1>
              <hr />
              <ul>
                <ol>Jane Doe just finished assignment 1</ol>
                <ol>Do not forget to grade student assignment</ol>
              </ul>
              </PopoverContent>
            </Popover>
          </div>
        </header>
    <div className="flex flex-1 flex-col gap-10 p-4">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold my-4">Most Recent</h1>
        <Card className="border-4 border-solid border-gray-400 w-[250px] h-[250px] rounded-xl bg-muted/80 flex flex-col justify-center border-r-1 items-center">
          <CardContent className="flex flex-col items-center justify-center w-full h-full pt-10">
          
          
              <div className="rounded-full bg-primary/35 p-2 text-primary/40 p-2 w-[80px] h-[80px] mx-2 my-2 cursor-pointer hover:bg-primary/50 transition-colors duration-300" 
              onClick={(handleClick)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleClick()}
              > <Plus className="mx-2 my-2 w-12 h-12 object-center"/> </div>
              </CardContent>
                <CardContent className="relative flex flex-col items-center">
              <div className="w-[130px] h-[20px] rounded-xl bg-primary/10 text-primary/60 px-7"> Add Class</div>
              
            
          </CardContent>
        </Card>
      </div>
      <h1 className="text-2xl font-semibold">Performance</h1>
      <div className="mx-auto h-[100vh] w-full max-w-3xl rounded-xl bg-muted/50">
      
      </div>
    </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  )
}
