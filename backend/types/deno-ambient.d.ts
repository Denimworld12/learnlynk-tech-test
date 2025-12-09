// Ambient declarations to help TS language server recognize Deno globals
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// No need to re-declare crypto; it's a built-in global in Deno/browsers

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(url: string, key: string): any;
}
