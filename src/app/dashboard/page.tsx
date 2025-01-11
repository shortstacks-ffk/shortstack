import { SidebarLeft } from "@/components/sidebar-left"
import { SidebarRight } from "@/components/sidebar-right"
import { Plus } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

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
  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
          <div className="flex flex-1 items-center gap-2 px-3">
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    Teacher's Dashboard
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-semibold">Most Recent</h1>
        <Card className="w-[350px] h-24 rounded-xl bg-muted/50 flex justify-center items-center">
          <CardContent>
            <div className="flex flex-col items-center space-y-1.5">

                <Plus />
                
              
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mx-auto h-[100vh] w-full max-w-3xl rounded-xl bg-muted/50"></div>
    </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
  )
}
