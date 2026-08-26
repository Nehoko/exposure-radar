import { useState } from "preact/hooks";

interface GeneratedSecretProps {
  token: string;
  onSaved: () => void;
}

export default function GeneratedSecret(
  { token, onSaved }: GeneratedSecretProps,
) {
  const [copied, setCopied] = useState(false);

  async function copyToken() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
  }

  return (
    <section class="secret-banner" aria-labelledby="secret-title">
      <div>
        <p class="eyebrow">Save this now</p>
        <h2 id="secret-title">Your portfolio secret</h2>
        <p>
          This is the only time the app will show it. You need it to open this
          portfolio on another browser or device.
        </p>
      </div>
      <code>{token}</code>
      <div class="secret-actions">
        <button class="secondary-button" type="button" onClick={copyToken}>
          {copied ? "Copied" : "Copy secret"}
        </button>
        <button class="submit-button" type="button" onClick={onSaved}>
          I saved it
        </button>
      </div>
    </section>
  );
}
