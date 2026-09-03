import { Head } from "fresh/runtime";
import PortfolioApp from "../islands/PortfolioApp.tsx";
import { define } from "../utils.ts";

export default define.page(function Home() {
  const debug = Deno.env.get("EXPOSURE_RADAR_DEBUG") === "true";
  const spacetimeDbHost = Deno.env.get("SPACETIMEDB_BROWSER_URL") ??
    Deno.env.get("VITE_SPACETIMEDB_HOST") ?? "auto";
  const spacetimeDbPort = Deno.env.get("SPACETIMEDB_BROWSER_PORT") ?? "3000";
  const spacetimeDbName = Deno.env.get("SPACETIMEDB_DATABASE") ??
    Deno.env.get("VITE_SPACETIMEDB_DB_NAME") ?? "exposure-radar";

  return (
    <>
      <Head>
        <title>Exposure Radar</title>
      </Head>

      <PortfolioApp
        debug={debug}
        spacetimeDbHost={spacetimeDbHost}
        spacetimeDbPort={spacetimeDbPort}
        spacetimeDbName={spacetimeDbName}
      />
    </>
  );
});
