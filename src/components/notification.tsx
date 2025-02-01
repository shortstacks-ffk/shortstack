import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"
  import { Bell } from 'lucide-react'

const Notification = () => {
    return ( 
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
     );
}
 
export default Notification;

