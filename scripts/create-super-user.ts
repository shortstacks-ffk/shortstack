import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createSuperUser() {
  try {
    // Get admin information
    const email = await new Promise<string>(resolve => {
      rl.question("Enter super user email: ", resolve);
    });
    
    const name = await new Promise<string>(resolve => {
      rl.question("Enter super user name: ", resolve);
    });
    
    const password = await new Promise<string>(resolve => {
      rl.question("Enter super user password: ", resolve);
    });

    // Hash the password
    const hashedPassword = await hash(password, 12);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log("User already exists. Updating role to SUPER...");
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: "SUPER" }
      });
      console.log(`User ${email} updated to SUPER role successfully!`);
    } else {
      // Create new super user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: "SUPER",
        }
      });
      
      console.log(`Super user ${email} created successfully with ID: ${user.id}`);
    }
    
  } catch (error) {
    console.error("Error creating super user:", error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createSuperUser();