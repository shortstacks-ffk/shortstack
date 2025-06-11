import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";

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

    // Create user and teacher profile in one transaction
    const result = await db.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || `${firstName || ''} ${lastName || ''}`.trim(),
          role: "TEACHER",
        },
      });

      // Create teacher profile
      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          firstName: firstName || name?.split(' ')[0] || email.split('@')[0],
          lastName: lastName || name?.split(' ').slice(1).join(' ') || 'Teacher',
          bio: "",
          institution: "",
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        teacherId: teacher.id
      };
    });

    return NextResponse.json({
      message: "Account created successfully",
      userId: result.id,
      teacherId: result.teacherId
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}