import { serve } from "inngest/next";
import { inngest } from "@/server/jobs/client";
import { functions } from "@/server/jobs/functions";

export const dynamic = "force-dynamic";

// Create an API that serves zero-dependency routing to Inngest
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: functions,
});
