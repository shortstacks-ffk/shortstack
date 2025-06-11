import { Badge } from "@/src/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip";
import { ShieldCheck } from "lucide-react";

export default function SuperUserBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            Admin
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>You have administrator privileges</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}