// Client-side utility functions for bills
export function getBillStatus(bill: any, studentBills?: any[]): string {
  // Check if bill is manually cancelled first
  if (bill.status === "CANCELLED") {
    return "CANCELLED";
  }

  const now = new Date();
  const dueDate = new Date(bill.dueDate);
  const isOverdue = now > dueDate;
  
  // If no student bills provided, use the ones from the bill object
  const bills = studentBills || bill.studentBills || bill.students || [];
  const totalStudents = bills.length;
  
  if (totalStudents === 0) {
    return isOverdue ? "LATE" : "ACTIVE";
  }
  
  const paidCount = bills.filter((sb: any) => sb.isPaid).length;
  const partiallyPaidCount = bills.filter((sb: any) => !sb.isPaid && (sb.paidAmount || 0) > 0).length;
  
  if (paidCount === totalStudents) {
    return "PAID";
  } else if (paidCount > 0 || partiallyPaidCount > 0) {
    return isOverdue ? "LATE" : "PARTIAL";
  } else {
    if (isOverdue) {
      return "LATE";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const billDueDate = new Date(dueDate);
      billDueDate.setHours(0, 0, 0, 0);
      
      return billDueDate.getTime() === today.getTime() ? "DUE" : "ACTIVE";
    }
  }
}

// Helper functions that are already in billActions but needed for client-side too
export function getStatusColor(status: string): string {
  switch (status) {
    case "PAID": return "green";
    case "PARTIAL": return "yellow";
    case "LATE": return "red";
    case "DUE": return "orange";
    case "ACTIVE": return "blue";
    case "CANCELLED": return "gray";
    default: return "blue";
  }
}

// Helper function to get user-friendly frequency text
export function getFrequencyDisplayText(frequency: string): string {
  switch (frequency) {
    case "WEEKLY": return "Every week";
    case "BIWEEKLY": return "Every 2 weeks";
    case "MONTHLY": return "Monthly";
    case "QUARTERLY": return "Every 3 months";
    case "YEARLY": return "Annually";
    default: return "";
  }
}

// Enhanced helper function for better recurring date generation
export function generateRecurringDates(bill: any, maxOccurrences: number = 12): Date[] {
  const dates: Date[] = [];
  const startDate = new Date(bill.dueDate);
  
  // Always include the initial date
  dates.push(new Date(startDate));
  
  // If not recurring, return just the start date
  if (bill.frequency === "ONCE") {
    return dates;
  }
  
  // Generate future occurrences
  for (let i = 1; i <= maxOccurrences; i++) {
    const nextDate = new Date(startDate);
    
    switch (bill.frequency) {
      case "WEEKLY":
        nextDate.setDate(nextDate.getDate() + (7 * i));
        break;
        
      case "BIWEEKLY":
        nextDate.setDate(nextDate.getDate() + (14 * i));
        break;
        
      case "MONTHLY":
        nextDate.setMonth(nextDate.getMonth() + i);
        // Handle month-end edge cases
        const originalDay = startDate.getDate();
        const lastDayOfMonth = new Date(
          nextDate.getFullYear(), 
          nextDate.getMonth() + 1, 
          0
        ).getDate();
        
        if (originalDay > lastDayOfMonth) {
          nextDate.setDate(lastDayOfMonth);
        } else {
          nextDate.setDate(originalDay);
        }
        break;
        
      case "QUARTERLY":
        nextDate.setMonth(nextDate.getMonth() + (3 * i));
        // Handle month edge cases
        const origDay = startDate.getDate();
        const lastDay = new Date(
          nextDate.getFullYear(), 
          nextDate.getMonth() + 1, 
          0
        ).getDate();
        
        if (origDay > lastDay) {
          nextDate.setDate(lastDay);
        } else {
          nextDate.setDate(origDay);
        }
        break;
        
      case "YEARLY":
        nextDate.setFullYear(nextDate.getFullYear() + i);
        // Handle leap year edge case for Feb 29
        if (startDate.getMonth() === 1 && startDate.getDate() === 29) {
          const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
          if (!isLeapYear(nextDate.getFullYear())) {
            nextDate.setDate(28);
          }
        }
        break;
    }
    
    dates.push(new Date(nextDate));
  }
  
  return dates;
}