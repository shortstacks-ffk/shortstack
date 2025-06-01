import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";

// Update the POST function to include Account creation
export async function POST(req: Request) {
  try {
    const { email, password, name, firstName, lastName } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and associated records in one transaction
    const result = await db.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          name: name || `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
          firstName: firstName || name?.split(' ')[0] || '',
          lastName: lastName || name?.split(' ').slice(1).join(' ') || '',
          password: hashedPassword,
          role: "TEACHER",
        },
      });

      // Create TeacherProfile
      await tx.teacherProfile.create({
        data: {
          userId: user.id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        },
      });
      
      // Create a credentials Account entry for this user
      await tx.account.create({
        data: {
          userId: user.id,
          type: "credentials",
          provider: "credentials",
          providerAccountId: user.id, // Using the user ID as provider account ID
        }
      });

      return user;
    });

    return NextResponse.json({
      message: "Account created successfully",
      userId: result.id
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error creating user" },
      { status: 500 }
    );
  }
}