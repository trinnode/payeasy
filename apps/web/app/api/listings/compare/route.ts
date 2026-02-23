import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ListingImage {
  url: string;
  sort_order: number;
}

interface ListingUser {
  username: string | null;
  avatar_url: string | null;
}

interface ListingWithRelations {
  id: string;
  landlord_id: string;
  title: string;
  description: string;
  address: string;
  rent_xlm: number;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean | null;
  pet_friendly: boolean | null;
  latitude: number | null;
  longitude: number | null;
  contract_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  listing_images: ListingImage[] | null;
  users: ListingUser | null;
}

/**
 * GET /api/listings/compare
 *
 * Fetches multiple listings by their IDs for comparison.
 * Accepts: ?ids=uuid1&ids=uuid2&ids=uuid3&ids=uuid4 (max 4)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll("ids");

    // Validate input
    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: "No listing IDs provided" } },
        { status: 400 }
      );
    }

    if (ids.length > 4) {
      return NextResponse.json(
        { success: false, error: { message: "Maximum 4 listings can be compared" } },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = ids.filter((id: string) => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { success: false, error: { message: `Invalid listing IDs: ${invalidIds.join(", ")}` } },
        { status: 400 }
      );
    }

    // Fetch listings with images and landlord info
    const { data: listings, error } = await supabase
      .from("listings")
      .select(`
        *,
        listing_images(url, sort_order),
        users(username, avatar_url)
      `)
      .in("id", ids)
      .eq("status", "active");

    if (error) {
      console.error("Database error fetching compare listings:", error);
      return NextResponse.json(
        { success: false, error: { message: "Failed to fetch listings" } },
        { status: 500 }
      );
    }

    // Transform listings to include images array and landlord
    const transformedListings = ((listings ?? []) as ListingWithRelations[]).map((listing) => {
      const images = (listing.listing_images ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((img) => img.url);

      return {
        ...listing,
        images,
        landlord: listing.users ?? null,
        // Remove nested objects to keep response clean
        listing_images: undefined,
        users: undefined,
      };
    });

    // Maintain order of requested IDs
    const orderedListings = ids
      .map((id: string) => transformedListings.find((l) => l.id === id))
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: orderedListings,
    });
  } catch (error) {
    console.error("Error in /api/listings/compare:", error);
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
