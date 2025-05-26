import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover"
import { Bell } from 'lucide-react'

export function Notification() {
  return ( 
    <Popover>
      <PopoverTrigger asChild>
        <div className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer">
          <Bell className="w-5 h-5 text-gray-600" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <h3 className="font-medium text-sm mb-2">Notifications</h3>
        <hr className="my-2" />
        <ul className="space-y-3">
          <li className="text-sm py-1 border-b border-gray-100 pb-2">
            <p className="font-medium">Jane Doe just finished assignment 1</p>
            <p className="text-xs text-gray-500 mt-1">Today, 2:34 PM</p>
          </li>
          <li className="text-sm py-1">
            <p className="font-medium">Do not forget to grade student assignment</p>
            <p className="text-xs text-gray-500 mt-1">Yesterday, 4:15 PM</p>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export default Notification;

