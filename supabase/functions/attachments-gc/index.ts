import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (
    req.headers.get("authorization") !== `Bearer ${Deno.env.get("GC_SECRET")}`
  )
    return new Response("forbidden", { status: 403 });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("storage_gc_queue")
    .select("path")
    .limit(500);
  if (!data?.length) return new Response("ok");
  const paths = data.map((r) => r.path);
  const { error } = await admin.storage.from("attachments").remove(paths);
  if (error) return new Response(error.message, { status: 500 });
  await admin.from("storage_gc_queue").delete().in("path", paths);
  return new Response("ok");
});
