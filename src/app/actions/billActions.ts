"use server";

import { db } from "@/src/lib/db";
import { getAuthSession } from "@/src/lib/auth";
import { revalidatePath } from "next/cache";
import { BillFrequency, BillStatus } from "@prisma/client";

// Define types
interface CreateBillData {
  title: string;
  emoji?: string;
  amount: number;
  dueDate: Date;
  description?: string;
  frequency: BillFrequency;
}

interface BillResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// Add these interfaces near the top with other interfaces
interface ExcludeStudentsFromBillParams {
  billId: string;
  studentIds: string[];
}

interface IncludeStudentsInBillParams {
  billId: string;
  studentIds: string[];
}

// Make sure this interface is defined
interface RemoveBillFromClassesParams {
  billId: string;
  classIds: string[];
}

// Enhanced function to convert bill frequency to calendar recurring pattern
function getBillRecurringPattern(bill: any) {
  const startDate = new Date(bill.dueDate);
  const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  switch (bill.frequency) {
    case "WEEKLY":
      return {
        isRecurring: true,
        recurringDays: [dayOfWeek],
        recurrenceType: "WEEKLY",
        recurrenceInterval: 1,
        monthlyDate: null,
        yearlyMonth: null,
        yearlyDate: null
      };
    
    case "BIWEEKLY":
      return {
        isRecurring: true,
        recurringDays: [dayOfWeek],
        recurrenceType: "WEEKLY", 
        recurrenceInterval: 2,
        monthlyDate: null,
        yearlyMonth: null,
        yearlyDate: null
      };
    
    case "MONTHLY":
      return {
        isRecurring: true,
        recurringDays: [],
        recurrenceType: "MONTHLY",
        recurrenceInterval: 1,
        monthlyDate: startDate.getDate(),
        yearlyMonth: null,
        yearlyDate: null
      };
    
    case "QUARTERLY":
      return {
        isRecurring: true,
        recurringDays: [],
        recurrenceType: "MONTHLY",
        recurrenceInterval: 3,
        monthlyDate: startDate.getDate(),
        yearlyMonth: null,
        yearlyDate: null
      };
    
    case "YEARLY":
      return {
        isRecurring: true,
        recurringDays: [],
        recurrenceType: "YEARLY",
        recurrenceInterval: 1,
        monthlyDate: null,
        yearlyMonth: startDate.getMonth(),
        yearlyDate: startDate.getDate()
      };
    
    default: // "ONCE"
      return {
        isRecurring: false,
        recurringDays: [],
        recurrenceType: "NONE",
        recurrenceInterval: 0,
        monthlyDate: null,
        yearlyMonth: null,
        yearlyDate: null
      };
  }
}

// Enhanced function to generate bill metadata for calendar
function generateBillCalendarMetadata(bill: any, student?: any) {
  const recurringPattern = getBillRecurringPattern(bill);
  
  return {
    type: "bill",
    billId: bill.id,
    billTitle: bill.title,
    billAmount: bill.amount,
    billEmoji: bill.emoji,
    billFrequency: bill.frequency,
    billStatus: bill.status,
    studentId: student?.id || null,
    dueDate: bill.dueDate.toISOString(),
    ...recurringPattern,
    displayInfo: {
      showAmount: true,
      showStatus: true,
      showFrequency: bill.frequency !== "ONCE",
      statusColor: getStatusColor(bill.status),
      frequencyText: getFrequencyDisplayText(bill.frequency)
    }
  };
}

// Helper functions
function getStatusColor(status: string): string {
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

function getFrequencyDisplayText(frequency: string): string {
  switch (frequency) {
    case "WEEKLY": return "Every week";
    case "BIWEEKLY": return "Every 2 weeks";
    case "MONTHLY": return "Monthly";
    case "QUARTERLY": return "Every 3 months";
    case "YEARLY": return "Annually";
    default: return "";
  }
}

// Improved calendar events creation function
async function createBillCalendarEvents(bill: any, students: any[]) {
  try {
    const recurringPattern = getBillRecurringPattern(bill);
    const baseMetadata = generateBillCalendarMetadata(bill);
    
    // Create bill due date at 12:00 PM (noon) for better visibility in day/week views
    const billDueDate = new Date(bill.dueDate);
    billDueDate.setHours(12, 0, 0, 0); // Set to 12:00 PM
    
    // End date at 12:59 PM (59 minutes duration for visibility)
    const billEndDate = new Date(billDueDate);
    billEndDate.setMinutes(59);
    
    // Create main calendar event for teacher
    const mainEvent = await db.calendarEvent.create({
      data: {
        title: `💰 ${bill.title}`,
        description: generateBillDescription(bill),
        startDate: billDueDate,
        endDate: billEndDate,
        variant: "destructive",
        isRecurring: recurringPattern.isRecurring,
        recurringDays: recurringPattern.recurringDays,
        recurrenceType: recurringPattern.recurrenceType,
        recurrenceInterval: recurringPattern.recurrenceInterval,
        monthlyDate: recurringPattern.monthlyDate,
        yearlyMonth: recurringPattern.yearlyMonth,
        yearlyDate: recurringPattern.yearlyDate,
        createdById: bill.creatorId,
        billId: bill.id,
        metadata: {
          ...baseMetadata,
          isMainEvent: true,
          createdFor: "teacher",
          isDueAtNoon: true // Flag for special handling
        }
      }
    });

    // Create calendar events for each student
    for (const student of students) {
      const studentMetadata = generateBillCalendarMetadata(bill, student);
      
      await db.calendarEvent.create({
        data: {
          title: `💰 ${bill.title}`,
          description: generateBillDescription(bill, true),
          startDate: billDueDate,
          endDate: billEndDate,
          variant: "destructive",
          isRecurring: recurringPattern.isRecurring,
          recurringDays: recurringPattern.recurringDays,
          recurrenceType: recurringPattern.recurrenceType,
          recurrenceInterval: recurringPattern.recurrenceInterval,
          monthlyDate: recurringPattern.monthlyDate,
          yearlyMonth: recurringPattern.yearlyMonth,
          yearlyDate: recurringPattern.yearlyDate,
          createdById: bill.creatorId,
          billId: bill.id,
          studentId: student.id,
          parentEventId: mainEvent.id,
          metadata: {
            ...studentMetadata,
            isMainEvent: false,
            createdFor: "student",
            isDueAtNoon: true // Flag for special handling
          }
        }
      });
    }

    return mainEvent;
  } catch (error) {
    console.error("Error creating bill calendar events:", error);
    return null;
  }
}

// Helper function to generate consistent bill descriptions
function generateBillDescription(bill: any, isForStudent: boolean = false): string {
  let description = `Amount: $${bill.amount.toFixed(2)}`;
  
  if (bill.frequency !== "ONCE") {
    description += `\nFrequency: ${getFrequencyDisplayText(bill.frequency)}`;
  }
  
  if (bill.description) {
    description += `\n\n${bill.description}`;
  }
  
  if (isForStudent) {
    description += `\n\nDue Date: ${new Date(bill.dueDate).toLocaleDateString()}`;
  }
  
  return description;
}

// Enhanced function to update bill calendar events when bill is modified
async function updateBillCalendarEvents(billId: string, updatedBill: any) {
  try {
    // Delete existing calendar events for this bill
    await db.calendarEvent.deleteMany({
      where: { billId }
    });

    // Get students associated with this bill
    const studentBills = await db.studentBill.findMany({
      where: { billId },
      include: { student: true }
    });

    const students = studentBills.map(sb => sb.student);

    // Recreate calendar events with updated information
    await createBillCalendarEvents(updatedBill, students);
    
    return true;
  } catch (error) {
    console.error("Error updating bill calendar events:", error);
    return false;
  }
}

// Enhanced createBill function with better calendar integration
export async function createBill(formData: FormData): Promise<BillResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    const data: CreateBillData = {
      title: formData.get("title") as string,
      emoji: (formData.get("emoji") as string) ?? "💰",
      amount: parseFloat(formData.get("amount") as string),
      dueDate: new Date(formData.get("dueDate") as string),
      description: formData.get("description") as string,
      frequency: formData.get("frequency") as BillFrequency,
    };

    const classIds = formData.getAll("classIds") as string[];

    // Validate required fields
    if (!data.title || !data.amount || !data.dueDate || !data.frequency) {
      return { success: false, error: "Missing required fields" };
    }

    // Create bill data object
    const billData: any = {
      ...data,
      creatorId: session.user.id,
    };

    // Handle class connections
    if (classIds.length > 0) {
      const classes = await db.class.findMany({
        where: {
          id: { in: classIds },
          userId: session.user.id
        }
      });

      if (classes.length !== classIds.length) {
        return { success: false, error: "One or more selected classes are invalid" };
      }
      
      billData.class = {
        connect: classIds.map(id => ({ id }))
      };
    }

    // Create the bill
    const newBill = await db.bill.create({
      data: billData,
      include: {
        class: true
      }
    });

    // Create StudentBill records and calendar events
    if (classIds.length > 0) {
      const students = await db.student.findMany({
        where: {
          classId: { in: classIds.map(id => {
            const classObj = newBill.class.find(c => c.id === id);
            return classObj?.code;
          }).filter(Boolean) as string[] }
        }
      });

      if (students.length > 0) {
        await db.studentBill.createMany({
          data: students.map(student => ({
            billId: newBill.id,
            studentId: student.id,
            amount: newBill.amount,
            paidAmount: 0,
            isPaid: false,
            dueDate: newBill.dueDate
          }))
        });
        
        // Create enhanced calendar events
        await createBillCalendarEvents(newBill, students);
      }
    } else {
      // Create calendar event for teacher only
      await createBillCalendarEvents(newBill, []);
    }

    revalidatePath("/teacher/dashboard/bills");
    return { success: true, data: newBill };
  } catch (error) {
    console.error("Create bill error:", error);
    return { success: false, error: "Failed to create bill" };
  }
}

// Get Bills - filter by user's classes or created by user
export async function getBills(filters?: {
  classId?: string;
  includeUnassigned?: boolean; // Add option to include bills not assigned to any class
}): Promise<BillResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Different logic based on user role
    if (session.user.role === "TEACHER") {
      // Get all classes owned by this teacher
      const userClasses = await db.class.findMany({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      const userClassIds = userClasses.map(c => c.id);
      
      // Create the where condition based on class IDs
      let whereCondition: any = {};
      
      if (filters?.classId) {
        // Filter bills for a specific class
        whereCondition = {
          AND: [
            { creatorId: session.user.id }, // Always filter by creator
            {
              class: {
                some: {
                  id: filters.classId
                }
              }
            }
          ]
        };
      } else {
        // Always include bills created by this user regardless of class assignment
        whereCondition = {
          creatorId: session.user.id
        };
        
        // If not including unassigned bills, add class filter
        if (!filters?.includeUnassigned) {
          whereCondition.class = {
            some: {
              id: {
                in: userClassIds
              }
            }
          };
        }
      }

      const bills = await db.bill.findMany({
        where: whereCondition,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              emoji: true,
              code: true,
            }
          },
          studentBills: {
            include: {
              student: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return { success: true, data: bills };
    } 
    else if (session.user.role === "STUDENT") {
      // Students should only see bills for classes they're enrolled in
      const student = await db.student.findUnique({
        where: { userId: session.user.id }
      });
      
      if (!student) {
        return { success: false, error: "Student profile not found" };
      }
      
      // Get enrolled class IDs
      const enrollments = await db.enrollment.findMany({
        where: {
          studentId: student.id,
          enrolled: true
        },
        select: { classId: true }
      });
      
      const enrolledClassIds = enrollments.map(e => e.classId);
      
      // Filter bills
      let whereClause: any = {};
      
      if (filters?.classId) {
        // Verify student is enrolled in this specific class
        if (!enrolledClassIds.includes(filters.classId)) {
          return { success: false, error: "Not enrolled in this class" };
        }
        
        whereClause = {
          classes: {
            some: { id: filters.classId }
          }
        };
      } else {
        whereClause = {
          classes: {
            some: {
              id: { in: enrolledClassIds }
            }
          }
        };
      }
      
      const bills = await db.bill.findMany({
        where: whereClause,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              emoji: true,
              code: true,
            },
          },
          studentBills: {
            where: { studentId: student.id },
            include: { student: true }
          }
        },
        orderBy: { dueDate: "asc" },
      });
      
      return { success: true, data: bills };
    }
    
    return { success: false, error: "Unknown user role" };
  } catch (error) {
    console.error("Error fetching bills:", error);
    return { success: false, error: "Failed to fetch bill details" };
  }
}

// Get a single Bill
export async function getBill(billId: string): Promise<BillResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.user.role === "TEACHER") {
      // Fetch bill either created by this user OR assigned to their classes
      const bill = await db.bill.findFirst({
        where: {
          id: billId,
          OR: [
            { creatorId: session.user.id }, // Created by this user
            {
              class: {
                some: {
                  userId: session.user.id // Or in one of their classes
                }
              }
            }
          ]
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              emoji: true,
              code: true,
            },
          },
          studentBills: {
            include: {
              student: {
                include: {
                  class: {
                    select: {
                      id: true,
                      name: true,
                      emoji: true,
                    }
                  }
                }
              }
            }
          }
        },
      });

      if (!bill) {
        return { success: false, error: "Bill not found or you don't have permission to view it" };
      }
      
      // Transform the bill with students property for easier access in UI
      const transformedBill = {
        ...bill,
        students: bill.studentBills.map(sb => ({
          studentId: sb.studentId,
          billId: sb.billId,
          isPaid: sb.isPaid,
          paidAt: sb.paidAt,
          student: sb.student
        }))
      };

      return { success: true, data: transformedBill };
    } 
    else if (session.user.role === "STUDENT") {
      // Handle student role access
      // ... existing student code ...
    }
    
    return { success: false, error: "Unknown user role" };
  } catch (error) {
    console.error("Error fetching bill:", error);
    return { success: false, error: "Failed to fetch bill details" };
  }
}

// Enhanced updateBill function with calendar synchronization
export async function updateBill(billId: string, data: Partial<CreateBillData> & { status?: BillStatus }): Promise<BillResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify ownership
    const billExists = await db.bill.findFirst({
      where: {
        id: billId,
        OR: [
          { creatorId: session.user.id },
          {
            class: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      }
    });

    if (!billExists) {
      return { success: false, error: "Bill not found or doesn't belong to you" };
    }

    const updateData: any = {
      title: data.title,
      amount: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      description: data.description,
      frequency: data.frequency,
      status: data.status
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update the bill
    const updatedBill = await db.bill.update({
      where: { id: billId },
      data: updateData,
      include: {
        class: true,
        studentBills: {
          include: { student: true }
        }
      }
    });

    // Update calendar events if bill details changed
    const hasCalendarImpactingChanges = 
      data.title || data.amount || data.dueDate || data.frequency || data.description;
    
    if (hasCalendarImpactingChanges) {
      await updateBillCalendarEvents(billId, updatedBill);
    }

    revalidatePath('/teacher/dashboard/bills');
    return { success: true, data: updatedBill };
  } catch (error: any) {
    console.error("Update bill error:", error?.message || "Unknown error");
    return { success: false, error: "Failed to update bill" };
  }
}

// Copy bill to additional classes
interface CopyBillToClassParams {
  billId: string;
  targetClassIds: string[];
}

export async function copyBillToClasses({
  billId,
  targetClassIds
}: CopyBillToClassParams): Promise<BillResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Verify the bill exists and belongs to this user
    const originalBill = await db.bill.findFirst({
      where: {
        id: billId,
        OR: [
          { creatorId: session.user.id }, // Bill creator
          {
            class: {
              some: {
                userId: session.user.id // Assigned to one of their classes
              }
            }
          }
        ]
      },
      include: {
        class: true
      }
    });

    if (!originalBill) {
      return { success: false, error: "Bill not found or doesn't belong to you" };
    }

    // 2. Verify all target classes belong to this user
    const targetClasses = await db.class.findMany({
      where: {
        id: { in: targetClassIds },
        userId: session.user.id
      }
    });

    if (targetClasses.length !== targetClassIds.length) {
      return { success: false, error: "One or more target classes are invalid" };
    }

    // 3. Check which classes the bill is already assigned to
    const existingClassIds = originalBill.class.map(cls => cls.id);
    
    // Filter out classes that already have this bill
    const newClassIds = targetClassIds.filter(id => !existingClassIds.includes(id));
    
    if (newClassIds.length === 0) {
      return { success: false, error: "Bill is already assigned to all selected classes" };
    }

    // 4. Update the bill to add the new class connections
    const updatedBill = await db.bill.update({
      where: { id: billId },
      data: {
        class: {
          connect: newClassIds.map(id => ({ id }))
        }
      },
      include: {
        class: true
      }
    });

    // 5. Get all students from the new classes
    const students = await db.student.findMany({
      where: {
        classId: { in: newClassIds }
      }
    });

    // 6. Create StudentBill records for each student in the new classes
    if (students.length > 0) {
      // First check which students already have this bill assigned
      const existingStudentBills = await db.studentBill.findMany({
        where: { billId }
      });
      
      const existingStudentIds = existingStudentBills.map(sb => sb.studentId);
      
      // Only create records for students who don't already have this bill
      const newStudentBills = students
        .filter(student => !existingStudentIds.includes(student.id))
        .map(student => ({
          billId,
          studentId: student.id,
          amount: originalBill.amount, // Set the full bill amount
          paidAmount: 0, // Initialize with zero paid
          isPaid: false,
          dueDate: originalBill.dueDate // Copy the due date from the bill
        }));
        
      if (newStudentBills.length > 0) {
        await db.studentBill.createMany({
          data: newStudentBills
        });
      }
    }

    revalidatePath("/teacher/dashboard/bills");
    revalidatePath("/teacher/dashboard/classes");
    
    return { 
      success: true, 
      data: updatedBill,
      message: `Bill successfully assigned to ${newClassIds.length} additional class(es)` 
    };
  } catch (error) {
    console.error("Error copying bill to classes:", error);
    return { success: false, error: "Failed to assign bill to additional classes" };
  }
}

// Remove bill from specific classes (or all)
export async function removeBillFromClasses({
  billId,
  classIds
}: RemoveBillFromClassesParams): Promise<BillResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify the bill belongs to this user
    const bill = await db.bill.findFirst({
      where: {
        id: billId,
        creatorId: session.user.id // Only creator can remove the bill from classes
      },
      include: {
        class: true
      }
    });

    if (!bill) {
      return { success: false, error: "Bill not found or you don't have permission to remove it" };
    }

    // If empty classIds array, disconnect from all classes
    if (classIds.length === 0) {
      // Get all classes currently associated with this bill
      const currentClassIds = bill.class.map(c => ({ id: c.id }));
      
      // Update the bill to disconnect from all classes
      await db.bill.update({
        where: { id: billId },
        data: {
          class: {
            disconnect: currentClassIds
          }
        }
      });
      
      // Delete StudentBill records for all classes since no longer assigned
      await db.studentBill.deleteMany({
        where: { billId }
      });
      
      // Delete calendar events for this bill (except the main one for the teacher)
      await db.calendarEvent.deleteMany({
        where: {
          billId,
          studentId: { not: null } // Keep the teacher's main event
        }
      });
      
      revalidatePath("/teacher/dashboard/bills");
      revalidatePath("/teacher/dashboard/classes");
      
      return { 
        success: true, 
        message: "Bill unassigned from all classes but still available in your account" 
      };
    } else {
      // Remove bill from specific classes
      
      // Verify all classIds are valid
      const validClassIds = bill.class
        .filter(c => classIds.includes(c.id))
        .map(c => ({ id: c.id }));
      
      if (validClassIds.length !== classIds.length) {
        return { success: false, error: "One or more classes are not assigned this bill" };
      }
      
      // Update bill to disconnect from specified classes
      await db.bill.update({
        where: { id: billId },
        data: {
          class: {
            disconnect: validClassIds
          }
        }
      });
      
      // Remove student bills for the students in these classes
      // First get students from the specified classes
      const studentsInClasses = await db.student.findMany({
        where: {
          classId: { in: classIds }
        },
        select: { id: true }
      });
      
      const studentIds = studentsInClasses.map(s => s.id);
      
      // Then delete StudentBill records for these students
      if (studentIds.length > 0) {
        await db.studentBill.deleteMany({
          where: {
            billId,
            studentId: { in: studentIds }
          }
        });
        
        // Also delete calendar events for these students
        await db.calendarEvent.deleteMany({
          where: {
            billId,
            studentId: { in: studentIds }
          }
        });
      }
      
      revalidatePath("/teacher/dashboard/bills");
      revalidatePath("/teacher/dashboard/classes");
      
      return { 
        success: true, 
        message: `Bill unassigned from ${validClassIds.length} class(es)` 
      };
    }
  } catch (error) {
    console.error("Error removing bill from classes:", error);
    return { success: false, error: "Failed to unassign bill from classes" };
  }
}

// Delete Bill (only creator can fully delete)
export async function deleteBill(id: string): Promise<BillResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify the bill was created by this user
    const bill = await db.bill.findFirst({
      where: {
        id: id,
        creatorId: session.user.id
      }
    });

    if (!bill) {
      return { success: false, error: "Bill not found or you don't have permission to delete it" };
    }

    // Delete associated calendar events first
    await db.calendarEvent.deleteMany({
      where: { billId: id }
    });

    // Then delete the bill
    await db.bill.delete({
      where: { id },
    });

    revalidatePath("/teacher/dashboard/bills");
    return { success: true };
  } catch (error) {
    console.error("Error deleting bill:", error);
    return { success: false, error: "Failed to delete bill" };
  }
}

// Update Payment Status (Teacher only)
export async function updatePaymentStatus(
  billId: string,
  studentId: string,
  isPaid: boolean
): Promise<BillResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify the bill belongs to this user and the student is in one of their classes
    const billAndStudent = await db.bill.findFirst({
      where: {
        id: billId,
        class: {
          some: {
            userId: session.user.id,
            students: {
              some: {
                id: studentId
              }
            }
          }
        }
      }
    });

    if (!billAndStudent) {
      return { success: false, error: "Bill or student not found, or doesn't belong to your classes" };
    }

    const updatedStudentBill = await db.studentBill.update({
      where: {
        billId_studentId: {
          billId,
          studentId,
        },
      },
      data: {
        isPaid,
        paidAt: isPaid ? new Date() : null,
      },
    });

    revalidatePath("/teacher/dashboard/bills");
    return { success: true, data: updatedStudentBill };
  } catch (error) {
    console.error("Error updating payment status:", error);
    return { success: false, error: "Failed to update payment status" };
  }
}

// Enhanced function to update bill statuses based on current date and payments
export async function updateBillStatuses(): Promise<BillResponse> {
  try {
    const now = new Date();
    
    // Get all bills that might need status updates
    const bills = await db.bill.findMany({
      where: {
        status: {
          not: "CANCELLED" // Don't update cancelled bills
        }
      },
      include: {
        studentBills: true
      }
    });
    
    for (const bill of bills) {
      let newStatus: BillStatus = bill.status as BillStatus;
      
      // Get all student bills for this bill
      const studentBills = bill.studentBills;
      const totalStudents = studentBills.length;
      
      if (totalStudents === 0) {
        // No students assigned - bill is just ACTIVE
        newStatus = "ACTIVE";
      } else {
        // Calculate payment statistics
        const paidCount = studentBills.filter(sb => sb.isPaid).length;
        const partiallyPaidCount = studentBills.filter(sb => !sb.isPaid && sb.paidAmount > 0).length;
        
        // Check if due date has passed
        const dueDate = new Date(bill.dueDate);
        const isOverdue = now > dueDate;
        
        // Determine status based on payments and due date
        if (paidCount === totalStudents) {
          newStatus = "PAID";
        } else if (paidCount > 0 || partiallyPaidCount > 0) {
          // Some payments received
          if (isOverdue) {
            newStatus = "LATE"; // Partial payment but overdue
          } else {
            newStatus = "PARTIAL"; // Partial payment, not overdue yet
          }
        } else {
          // No payments received
          if (isOverdue) {
            newStatus = "LATE";
          } else {
            // Check if due today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const billDueDate = new Date(dueDate);
            billDueDate.setHours(0, 0, 0, 0);
            
            if (billDueDate.getTime() === today.getTime()) {
              newStatus = "DUE";
            } else {
              newStatus = "ACTIVE";
            }
          }
        }
      }
      
      // Update bill status if it has changed
      if (bill.status !== newStatus) {
        await db.bill.update({
          where: { id: bill.id },
          data: { status: newStatus }
        });
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error updating bill statuses:", error);
    return { success: false, error: "Failed to update bill statuses" };
  }
}

// Exclude students from a bill
export async function excludeStudentsFromBill({
  billId,
  studentIds
}: ExcludeStudentsFromBillParams): Promise<BillResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify the bill belongs to this user
    const bill = await db.bill.findFirst({
      where: {
        id: billId,
        OR: [
          { creatorId: session.user.id },
          {
            class: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      }
    });

    if (!bill) {
      return { success: false, error: "Bill not found or doesn't belong to you" };
    }

    // Check if any students have already paid - they can't be excluded
    const paidStudentBills = await db.studentBill.findMany({
      where: {
        billId,
        studentId: { in: studentIds },
        isPaid: true
      }
    });

    if (paidStudentBills.length > 0) {
      return { 
        success: false, 
        error: "Cannot exclude students who have already paid this bill" 
      };
    }

    // Delete StudentBill records
    await db.studentBill.deleteMany({
      where: {
        billId,
        studentId: { in: studentIds }
      }
    });

    // Delete calendar events for these students
    await db.calendarEvent.deleteMany({
      where: {
        billId,
        studentId: { in: studentIds }
      }
    });

    // Add students to excluded list
    await db.bill.update({
      where: { id: billId },
      data: {
        excludedStudents: {
          connect: studentIds.map(id => ({ id }))
        }
      }
    });

    revalidatePath("/teacher/dashboard/bills");
    return { 
      success: true, 
      message: `Successfully excluded ${studentIds.length} student(s) from the bill` 
    };
  } catch (error) {
    console.error("Error excluding students from bill:", error);
    return { success: false, error: "Failed to exclude students from bill" };
  }
}

// Include students back in a bill (reverse exclusion)
export async function includeStudentsInBill({
  billId,
  studentIds
}: IncludeStudentsInBillParams): Promise<BillResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify the bill belongs to this user
    const bill = await db.bill.findFirst({
      where: {
        id: billId,
        OR: [
          { creatorId: session.user.id },
          {
            class: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      },
      include: {
        class: true
      }
    });

    if (!bill) {
      return { success: false, error: "Bill not found or doesn't belong to you" };
    }

    // Get students that should be included
    const students = await db.student.findMany({
      where: {
        id: { in: studentIds }
      }
    });

    if (students.length === 0) {
      return { success: false, error: "No valid students found" };
    }

    // Remove from excluded list
    await db.bill.update({
      where: { id: billId },
      data: {
        excludedStudents: {
          disconnect: studentIds.map(id => ({ id }))
        }
      }
    });

    // Create StudentBill records
    await db.studentBill.createMany({
      data: students.map(student => ({
        billId: bill.id,
        studentId: student.id,
        amount: bill.amount,
        paidAmount: 0,
        isPaid: false,
        dueDate: bill.dueDate
      })),
      skipDuplicates: true
    });

    // Create calendar events for these students
    await createBillCalendarEvents(bill, students);

    revalidatePath("/teacher/dashboard/bills");
    return { 
      success: true, 
      message: `Successfully included ${students.length} student(s) in the bill` 
    };
  } catch (error) {
    console.error("Error including students in bill:", error);
    return { success: false, error: "Failed to include students in bill" };
  }
}

// Make getBillStatus a non-server function (remove "use server" for this function)
export async function getBillStatusAsync(bill: any, studentBills?: any[]): Promise<string> {
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

// Add this after the deleteBill function
export async function cancelBill(billId: string, reason?: string): Promise<BillResponse> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return { success: false, error: "Unauthorized" };
    }

    // Verify the bill belongs to this user
    const bill = await db.bill.findFirst({
      where: {
        id: billId,
        creatorId: session.user.id
      }
    });

    if (!bill) {
      return { success: false, error: "Bill not found or you don't have permission to cancel it" };
    }

    if (bill.status === "CANCELLED") {
      return { success: false, error: "Bill is already cancelled" };
    }

    // Prepare the cancellation description
    let updatedDescription = bill.description || "";
    if (reason) {
      const cancellationNote = `\n\n--- CANCELLED ---\nReason: ${reason}\nCancelled on: ${new Date().toLocaleDateString()}`;
      updatedDescription += cancellationNote;
    }

    // Update bill status to cancelled
    const updatedBill = await db.bill.update({
      where: { id: billId },
      data: { 
        status: "CANCELLED",
        description: updatedDescription
      }
    });

    // Update calendar events to show as cancelled
    await db.calendarEvent.updateMany({
      where: { billId },
      data: {
        title: `🚫 ${bill.title} (CANCELLED)`,
        variant: "secondary",
        description: `CANCELLED BILL\n${reason ? `Reason: ${reason}\n` : ''}Original Amount: $${bill.amount.toFixed(2)}`
      }
    });

    revalidatePath("/teacher/dashboard/bills");
    return { success: true, data: updatedBill };
  } catch (error) {
    console.error("Error cancelling bill:", error);
    return { success: false, error: "Failed to cancel bill" };
  }
}