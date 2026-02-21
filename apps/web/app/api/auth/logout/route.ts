import { NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 *
 * Clears the auth-token cookie to log the user out.
 */
export async function POST() {
    try {
        const response = NextResponse.json({
            success: true,
            data: { message: "Logged out successfully" },
        });

        // Clear the auth cookie
        response.cookies.set("auth-token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 0, // Immediately expire
        });

        return response;
    } catch {
        return NextResponse.json(
            { 
                success: false, 
                error: { 
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Internal server error" 
                } 
            },
            { status: 500 }
        );
    }
}
