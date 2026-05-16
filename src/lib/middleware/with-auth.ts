import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "./authenticate";
import { authorizeRequest } from "./authorize";
import { errorResponse } from "@/lib/api-error";
import type { TokenPayload, UserRole } from "@/types";

type AuthenticatedHandler = (
  req: NextRequest,
  context: { user: TokenPayload; params?: Record<string, string> },
) => Promise<NextResponse>;

export function withAuth(
  handler: AuthenticatedHandler,
  options?: { roles?: readonly UserRole[] },
) {
  return async (req: NextRequest, routeContext?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await authenticateRequest();
      if (options?.roles) {
        authorizeRequest(user, options.roles);
      }

      const params = routeContext?.params ? await routeContext.params : undefined;
      return await handler(req, { user, params });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
