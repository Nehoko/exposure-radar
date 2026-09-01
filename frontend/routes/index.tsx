import { Head } from "fresh/runtime";
import PortfolioApp from "../islands/PortfolioApp.tsx";
import { define } from "../utils.ts";

export default define.page(function Home() {
  const debug = Deno.env.get("EXPOSURE_RADAR_DEBUG") === "true";

  return (
    <>
      <Head>
        <title>Exposure Radar</title>
      </Head>

      <PortfolioApp debug={debug} />
    </>
  );
});
