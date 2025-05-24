import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/src/components/ui/dropdown-menu";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";

interface StudentUserDropdownProps {
  studentImage: string | null | undefined;
  studentInitials: string;
  studentName: string;
  studentEmail: string;
  onLogout: () => void;
}

export default function StudentUserDropdown({ 
  studentImage, 
  studentInitials, 
  studentName, 
  studentEmail,
  onLogout 
}: StudentUserDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={studentImage || ""} />
            <AvatarFallback className="bg-green-100 text-green-800">
              {studentInitials}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm hidden sm:inline text-gray-800">{studentName}</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mt-2 p-1" align="end">
        <div className="px-3 py-2 text-sm">
          <p className="font-medium">Signed in as</p>
          <p className="text-gray-500 truncate">{studentEmail}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/student/dashboard/account" className="flex items-center gap-2 cursor-pointer w-full">
            <User className="h-4 w-4" />
            <span>My Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/student/dashboard/account/settings" className="flex items-center gap-2 cursor-pointer w-full">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
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