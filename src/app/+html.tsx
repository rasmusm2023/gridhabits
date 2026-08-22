import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Web-only root HTML for static rendering / PWA install.
 * Runs in Node during export — no browser APIs here.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#0d1117" />
        <meta name="color-scheme" content="dark" />
        <meta name="description" content="Track habits on a GitHub-style grid." />

        {/* iOS home-screen / standalone PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GridHabits" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/icon-192.png" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveReset }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveReset = `
html, body, #root {
  height: 100%;
  background-color: #0d1117;
}
body {
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}
`;
