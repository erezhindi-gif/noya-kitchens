import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const category = formData.get("category") as string;
    const files = formData.getAll("files") as File[];

    if (!category || files.length === 0) {
      return NextResponse.json({ error: "Missing category or files" }, { status: 400 });
    }

    const uploadedAssets = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const asset = await client.assets.upload("image", buffer, {
        filename: file.name,
        contentType: file.type,
      });
      uploadedAssets.push({ _type: "image", asset: { _type: "reference", _ref: asset._id } });
    }

    // Find existing project doc
    const existing = await client.fetch(
      `*[_type == "project" && category == $category][0]`,
      { category }
    );

    if (existing) {
      await client
        .patch(existing._id)
        .setIfMissing({ images: [] })
        .append("images", uploadedAssets)
        .commit();
    } else {
      await client.create({
        _type: "project",
        category,
        title: category,
        images: uploadedAssets,
      });
    }

    return NextResponse.json({ success: true, count: uploadedAssets.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
