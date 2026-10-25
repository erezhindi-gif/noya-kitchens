import { NextRequest } from "next/server";
import { getPublicOrigin, metadataCorsOptionsRequestHandler, protectedResourceHandler } from "mcp-handler";

// RFC 9728: the quote connector (/api/mcp) is protected by this site's own sign-in.
export function GET(req: NextRequest) {
  const o = getPublicOrigin(req);
  return protectedResourceHandler({ authServerUrls: [o], resourceUrl: `${o}/api/mcp` })(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
