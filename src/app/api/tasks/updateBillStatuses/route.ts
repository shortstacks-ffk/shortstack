import { NextResponse } from "next/server";
import { updateBillStatuses } from "@/src/app/actions/billActions";

// This route would be called by a scheduler
export async function POST(request: Request) {
  try {
    // Verify request is authenticated (add your own authentication)
    const authHeader = request.headers.get("authorization");
    const taskSecret = process.env.TASK_SECRET;
    
    if (!taskSecret || authHeader !== `Bearer ${taskSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const result = await updateBillStatuses();
    
    if (result.success) {
      return NextResponse.json({ success: true, message: "Bill statuses updated successfully" });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in bill status update task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}