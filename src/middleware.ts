import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on all paths except static assets and the lesson/quiz/doubt APIs
    // (those guard themselves and may stream).
    "/((?!_next/static|_next/image|favicon.ico|api/lesson|api/quiz|api/doubt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
