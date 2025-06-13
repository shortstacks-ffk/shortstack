import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth/config";
import { db } from "@/src/lib/db";
import { Prisma } from "@prisma/client";

// GET: Fetch teacher profile
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, check if the user exists
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // For SUPER users, we might not have a teacher profile, so let's handle differently
    if (session.user.role === "SUPER") {
      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: "SUPER",
        isSuperUser: true,
        firstName: user.name?.split(" ")[0] || "Admin",
        lastName: user.name?.split(" ").slice(1).join(" ") || "User",
        profileImage: user.image,
      });
    }

    // For TEACHER users, check if the teacher profile exists
    const teacher = await db.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      console.log(`Teacher profile not found for user ID: ${session.user.id}, creating one`);
      
      // Create a basic teacher profile
      try {
        // Extract first and last name from the user's name
        const nameParts = user.name?.split(" ") || [];
        const firstName = nameParts[0] || user.email?.split('@')[0] || "Teacher";
        const lastName = nameParts.slice(1).join(" ") || "";
        
        // Create a new teacher profile
        const newTeacher = await db.teacher.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            bio: "",
            institution: "",
          }
        });
        
        // Return the newly created profile
        return NextResponse.json({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          teacherId: newTeacher.id,
          firstName: newTeacher.firstName,
          lastName: newTeacher.lastName,
          bio: newTeacher.bio,
          institution: newTeacher.institution,
          profileImage: newTeacher.profileImage || user.image,
        });
        
      } catch (createError) {
        console.error("Error creating teacher profile:", createError);
        return NextResponse.json({ error: "Failed to create teacher profile" }, { status: 500 });
      }
    }

    // Return the combined profile data
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      teacherId: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      bio: teacher.bio || "",
      institution: teacher.institution || "",
      profileImage: teacher.profileImage || user.image,
    });
  } catch (error) {
    console.error("Error fetching teacher profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Update teacher profile
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || (session.user.role !== "TEACHER" && session.user.role !== "SUPER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const data = await req.json();
    
    // For SUPER users, we only update the User model
    if (session.user.role === "SUPER") {
      const userData = {
        name: `${data.firstName} ${data.lastName}`.trim(),
        ...(data.profileImage ? { image: data.profileImage } : {})
      };
      
      const updatedUser = await db.user.update({
        where: { id: session.user.id },
        data: userData,
      });
      
      return NextResponse.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          image: updatedUser.image,
          role: "SUPER",
          isSuperUser: true,
          firstName: data.firstName,
          lastName: data.lastName,
          profileImage: data.profileImage || updatedUser.image,
        }
      });
    }
    
    // For TEACHER users, proceed with existing logic
    // Find the teacher ID if not in session
    let teacherId = session.user.teacherId;
    
    if (!teacherId) {
      const teacher = await db.teacher.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      if (!teacher) {
        return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      }
      
      teacherId = teacher.id;
    }
    
    // Update user and teacher profile in a transaction
    const updatedUser = await db.$transaction(async (tx) => {
      // Define user data with proper typing
      const userData: Prisma.UserUpdateInput = {
        name: `${data.firstName} ${data.lastName}`.trim(),
      };
      
      // Only update image if profileImage is provided
      if (data.profileImage) {
        userData.image = data.profileImage;
      }
      
      // Update the user
      const updateUser = await tx.user.update({
        where: { id: session.user.id },
        data: userData,
      });
      
      // Define teacher data with proper typing
      const teacherData: Prisma.TeacherUpdateInput = {
        firstName: data.firstName,
        lastName: data.lastName,
        bio: data.bio || '',
        institution: data.institution || '',
      };
      
      // Only update profileImage if it's provided
      if (data.profileImage) {
        teacherData.profileImage = data.profileImage;
      }
      
      // Update the teacher profile
      const updateTeacher = await tx.teacher.update({
        where: { id: teacherId },
        data: teacherData,
      });
      
      return {
        ...updateUser,
        teacher: updateTeacher,
      };
    });
    
    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
        teacherId: updatedUser.teacher.id,
        firstName: updatedUser.teacher.firstName,
        lastName: updatedUser.teacher.lastName,
        bio: updatedUser.teacher.bio,
        institution: updatedUser.teacher.institution,
        profileImage: updatedUser.teacher.profileImage,
      }
    });
  } catch (error) {
    console.error("Error updating teacher profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Delete teacher account
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the user (cascade will delete teacher profile)
    await db.user.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json({
      message: "Account deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting teacher account:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}