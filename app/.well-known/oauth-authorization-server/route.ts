import { NextRequest, NextResponse } from "next/server";
import { getPublicOrigin } from "mcp-handler";
import { SCOPE, cors } from "@/lib/quotes/oauth";

// RFC 8414 metadata: where Claude signs Erez in for the quote connector.
export function GET(req: NextRequest) {
  const o = getPublicOrigin(req);
  return NextResponse.json(
    {
      issuer: o,
      authorization_endpoint: `${o}/oauth/authorize`,
      token_endpoint: `${o}/api/oauth/token`,
      registration_endpoint: `${o}/api/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
      scopes_supported: [SCOPE],
      client_id_metadata_document_supported: true,
    },
    { headers: cors }
  );
}

export const OPTIONS = () => new NextResponse(null, { status: 204, headers: cors });
