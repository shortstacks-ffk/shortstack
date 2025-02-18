import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/src/lib/db";

export const checkUser = async () => {
    try {
        const user = await currentUser();
        
        if (!user) {
            console.log("No user found");
            return null;
        }

        // Find existing user
        const existingUser = await db.user.findUnique({
            where: {
                clerkUserId: user.id,
            }
        });

        if (existingUser) {
            // Update user info if needed
            return await db.user.update({
                where: {
                    clerkUserId: user.id,
                },
                data: {
                    name: `${user.firstName} ${user.lastName}`,
                    imageURL: user.imageUrl,
                    email: user.emailAddresses[0].emailAddress,
                }
            });
        }

        // Create new user if doesn't exist
        return await db.user.create({
            data: {
                clerkUserId: user.id,
                name: `${user.firstName} ${user.lastName}`,
                imageURL: user.imageUrl,
                email: user.emailAddresses[0].emailAddress,
            }
        });
    } catch (error) {
        console.error("Error in checkUser:", error);
        return null;
    }
}