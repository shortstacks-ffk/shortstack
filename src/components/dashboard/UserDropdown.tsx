import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/src/components/ui/dropdown-menu";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";

interface UserDropdownProps {
  teacherImage: string;
  teacherInitial: string;
  teacherName: string;
  onLogout: () => void;
}

export default function UserDropdown({ 
  teacherImage, 
  teacherInitial, 
  teacherName, 
  onLogout 
}: UserDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={teacherImage || ""} />
            <AvatarFallback className="bg-blue-100 text-blue-800">
              {teacherInitial}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm hidden sm:inline text-gray-800">{teacherName}</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mt-2 p-1" align="end">
        <div className="px-3 py-2 text-sm">
          <p className="font-medium">Signed in as</p>
          <p className="text-gray-500 truncate">{teacherName}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/teacher/dashboard/settings/account" className="flex items-center gap-2 cursor-pointer w-full">
            <User className="h-4 w-4" />
            <span>My Account</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/teacher/dashboard/settings/account?tab=security" className="flex items-center gap-2 cursor-pointer w-full">
            <Settings className="h-4 w-4" />
            <span>Security</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600 cursor-pointer" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
