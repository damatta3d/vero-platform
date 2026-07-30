export const veroDesignSystemCss = `
:root,
[data-theme="modern"] {
  color-scheme: light;
  --vds-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --vds-font-display: var(--vds-font-sans);
  --vds-bg: #f4f7fb;
  --vds-surface: #ffffff;
  --vds-surface-subtle: #f8fafc;
  --vds-surface-strong: #e9eef6;
  --vds-text: #162033;
  --vds-text-muted: #657188;
  --vds-border: #dce3ed;
  --vds-primary: #2f7d5a;
  --vds-primary-hover: #256749;
  --vds-primary-contrast: #ffffff;
  --vds-positive: #238451;
  --vds-negative: #d14343;
  --vds-warning: #b97712;
  --vds-info: #2f6fda;
  --vds-focus: #5c8ff1;
  --vds-shadow: 0 12px 34px rgb(32 53 80 / 10%);
  --vds-shadow-soft: 0 5px 18px rgb(32 53 80 / 7%);
  --vds-radius-sm: 9px;
  --vds-radius-md: 15px;
  --vds-radius-lg: 21px;
  --vds-space-1: 4px;
  --vds-space-2: 8px;
  --vds-space-3: 12px;
  --vds-space-4: 16px;
  --vds-space-5: 22px;
  --vds-space-6: 30px;
  --vds-transition: 180ms ease;
}

[data-theme="clean"] {
  color-scheme: light;
  --vds-bg: #fbfcfd;
  --vds-surface: #ffffff;
  --vds-surface-subtle: #f7f8fa;
  --vds-surface-strong: #eef1f4;
  --vds-text: #1d232d;
  --vds-text-muted: #6c7480;
  --vds-border: #e3e6ea;
  --vds-primary: #276749;
  --vds-primary-hover: #20573d;
  --vds-shadow: 0 1px 2px rgb(20 30 45 / 5%);
  --vds-shadow-soft: none;
  --vds-radius-sm: 7px;
  --vds-radius-md: 11px;
  --vds-radius-lg: 15px;
}

[data-theme="future"] {
  color-scheme: dark;
  --vds-bg: #07111f;
  --vds-surface: rgb(15 29 48 / 88%);
  --vds-surface-subtle: rgb(20 39 64 / 72%);
  --vds-surface-strong: #1a3150;
  --vds-text: #edf6ff;
  --vds-text-muted: #9eb2c9;
  --vds-border: rgb(125 169 216 / 24%);
  --vds-primary: #5be0a4;
  --vds-primary-hover: #75eab6;
  --vds-primary-contrast: #052116;
  --vds-positive: #5be0a4;
  --vds-negative: #ff747b;
  --vds-warning: #ffc461;
  --vds-info: #66b5ff;
  --vds-focus: #70c4ff;
  --vds-shadow: 0 22px 60px rgb(0 0 0 / 34%);
  --vds-shadow-soft: 0 10px 28px rgb(0 0 0 / 22%);
  --vds-radius-sm: 11px;
  --vds-radius-md: 17px;
  --vds-radius-lg: 24px;
}

[data-theme="brand"] {
  color-scheme: light;
  --vds-bg: #f4efe6;
  --vds-surface: #fffdf9;
  --vds-surface-subtle: #faf5ec;
  --vds-surface-strong: #eadfce;
  --vds-text: #2a231d;
  --vds-text-muted: #786b5e;
  --vds-border: #dfd2c1;
  --vds-primary: #a4382d;
  --vds-primary-hover: #882d25;
  --vds-primary-contrast: #ffffff;
  --vds-positive: #37664d;
  --vds-negative: #a4382d;
  --vds-warning: #c88d3f;
  --vds-info: #436f9b;
  --vds-focus: #b77c32;
  --vds-shadow: 0 12px 34px rgb(85 69 45 / 12%);
  --vds-shadow-soft: 0 5px 22px rgb(85 69 45 / 8%);
  --vds-font-display: Georgia, "Times New Roman", serif;
}

* { box-sizing: border-box; }
html { background: var(--vds-bg); }
body {
  margin: 0;
  background: var(--vds-bg);
  color: var(--vds-text);
  font-family: var(--vds-font-sans);
  transition: background var(--vds-transition), color var(--vds-transition);
}
button, input, select, textarea { font: inherit; }
button, a, input, select, textarea { outline: none; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--vds-focus) 35%, transparent);
}
.vds-card {
  background: var(--vds-surface);
  border: 1px solid var(--vds-border);
  border-radius: var(--vds-radius-md);
  box-shadow: var(--vds-shadow-soft);
}
.vds-button {
  min-height: 43px;
  border: 0;
  border-radius: var(--vds-radius-sm);
  background: var(--vds-primary);
  color: var(--vds-primary-contrast);
  padding: 10px 16px;
  font-weight: 750;
  cursor: pointer;
  transition: background var(--vds-transition), transform var(--vds-transition);
}
.vds-button:hover { background: var(--vds-primary-hover); }
.vds-button:active { transform: translateY(1px); }
.vds-field {
  min-height: 43px;
  border: 1px solid var(--vds-border);
  border-radius: var(--vds-radius-sm);
  background: var(--vds-surface);
  color: var(--vds-text);
  padding: 9px 11px;
}
.vds-muted { color: var(--vds-text-muted); }
.vds-positive { color: var(--vds-positive); }
.vds-negative { color: var(--vds-negative); }
.vds-warning { color: var(--vds-warning); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
}
`;
