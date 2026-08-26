import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Understand your real exposure across stocks, ETFs, and crypto."
        />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
