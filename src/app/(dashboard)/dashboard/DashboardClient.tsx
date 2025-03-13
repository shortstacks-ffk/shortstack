"use client"
import SearchBar from "@/src/components/search-bar"
import Notification from "@/src/components/notification"
import DashboardAddClassCard from "@/src/components/class/dashboard-add-class-card"
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { ClassCard } from "@/src/components/class/ClassCard"

interface DashboardClientProps {
  classes: Array<{
    id: string
    name: string
    code: string
    emoji: string
    colorClass: string
    cadence?: string
    day?: string
    time?: string
    grade?: string
    backgroundColor: string
    numberOfStudents?: number
  }>
}

const DashboardClient = ({ classes }: DashboardClientProps) => {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 bg-background">
        <div className="flex flex-1 items-center gap-2 px-3 rounded-half mx-auto bg-muted/50 pt-8 pl-8">
          <SearchBar />
          <Notification />
          <SignedOut>
            <SignInButton />
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </header>
      <main className="flex flex-col p-4">
        <h1 className="text-2xl font-semibold my-4 py-4">Most Recent</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {classes.map((cls) => (
            <ClassCard
            key={cls.id}
            id={cls.id}
            emoji={cls.emoji}
            name={cls.name}
            code={cls.code}
            backgroundColor={cls.backgroundColor}
            cadence={cls.cadence}
            day={cls.day}
            time={cls.time}
            grade={cls.grade}
            numberOfStudents={cls.numberOfStudents}
          />
          ))}
          {classes.length < 3 && <DashboardAddClassCard />}
        </div>
        <h1 className="text-2xl font-semibold py-4">Performance</h1>
        <div className="flex gap-4">
          <div className="h-[60vh] w-[60vw] rounded-xl bg-muted/50"></div>
        </div>
      </main>
    </>
  )
}

export default DashboardClient