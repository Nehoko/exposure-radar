import { Head } from "fresh/runtime";
import PortfolioApp from "../islands/PortfolioApp.tsx";
import { define } from "../utils.ts";

export default define.page(function Home() {
  return (
    <>
      <Head>
        <title>Exposure Radar</title>
      </Head>

      <PortfolioApp />
    </>
  );
});
