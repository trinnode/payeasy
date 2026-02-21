import { NextResponse } from "next/server";
import { Keypair } from "stellar-sdk";
import { generateChallenge } from "@/lib/auth/stellar-auth";

/**
 * POST /api/auth/login
 *
 * Accepts `{ publicKey }` and returns a challenge the client must sign to
 * prove ownership of the corresponding private key.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { publicKey } = body;

        if (!publicKey || typeof publicKey !== "string") {
            return NextResponse.json(
                { 
                    success: false, 
                    error: { 
                        code: "MISSING_FIELD",
                        message: "publicKey is required",
                        field: "publicKey"
                    } 
                },
                { status: 400 }
            );
        }

        // Validate that the public key is well-formed
        try {
            Keypair.fromPublicKey(publicKey);
        } catch {
            return NextResponse.json(
                { 
                    success: false, 
                    error: { 
                        code: "INVALID_PUBLIC_KEY",
                        message: "Invalid Stellar public key",
                        field: "publicKey"
                    } 
                },
                { status: 400 }
            );
        }

        const challenge = generateChallenge();

        return NextResponse.json({
            success: true,
            data: challenge,
        });
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
