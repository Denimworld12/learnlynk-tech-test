// LearnLynk Tech Test - Task 3: Edge Function create-task

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Load secrets
const SUPABASE_URL = Deno.env.get("PRIVATE_URL")!;
const SERVICE_ROLE = Deno.env.get("SERVICE_ROLE")!;

// Create Supabase admin client (full access)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

type CreateTaskPayload = {
  application_id: string;
  task_type: "call" | "email" | "review";
  due_at: string;
};

const VALID_TYPES = ["call", "email", "review"];

serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Partial<CreateTaskPayload>;
    const { application_id, task_type, due_at } = body;

    // Validation
    if (!application_id) {
      return jsonError("application_id is required", 400);
    }

    if (!task_type || !VALID_TYPES.includes(task_type)) {
      return jsonError("task_type must be one of: call, email, review", 400);
    }

    if (!due_at) {
      return jsonError("due_at is required", 400);
    }

    const dueDate = new Date(due_at);
    if (isNaN(dueDate.getTime())) {
      return jsonError("invalid due_at timestamp", 400);
    }

    if (dueDate <= new Date()) {
      return jsonError("due_at must be in the future", 400);
    }

    // Insert into tasks
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        application_id,
        type: task_type,
        due_at: dueDate.toISOString(),
        tenant_id: crypto.randomUUID(), // placeholder for demo
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return jsonError(error.message, 500);
    }

    return new Response(
      JSON.stringify({
        success: true,
        task_id: data.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Internal error:", err);
    return jsonError("Internal server error", 500);
  }
});

// Helper for error responses
function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
