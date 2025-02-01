"use client"
import SearchBar from "@/src/components/search-bar"
import Notification from "@/src/components/notification"
import DashboardAddClassCard from "@/src/components/dashboard-add-class-card"
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { checkUser } from "@/src/lib/checkUser";


const DashboardHome = () => {
  return ( <>
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

      <div className="flex flex-col">
          <h1 className="text-2xl font-semibold my-4">Most Recent</h1>
          <DashboardAddClassCard />
        </div>
        <div className="flex flex-col">
        <h1 className="text-2xl font-semibold py-4">Performance</h1>
        <div className="h-[60vh] w-[60vw] rounded-xl bg-muted/50">
        </div>
        </div>
      </main>
  
  </> );
}
 
export default DashboardHome;

