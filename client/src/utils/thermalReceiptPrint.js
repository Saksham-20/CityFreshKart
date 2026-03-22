/**
 * Thermal receipt: one hidden iframe, one HTML document, one print() call.
 * Popup/blob tabs were removed — they could fire load + readyState paths and duplicate jobs on some drivers.
 */

const THERMAL_RECEIPT_PRINT_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    width: 100%;
    min-height: 0 !important;
    overflow: hidden;
    box-sizing: border-box;
    -webkit-print-color-adjust: economy;
    print-color-adjust: economy;
  }

  @page { margin: 0; }

  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
  }

  .thermal-receipt-root {
    box-sizing: border-box;
    width: 384px;
    max-width: 100%;
    margin: 0 auto;
    padding: 5px 5px 0;
    font-family: ui-monospace, 'Cascadia Code', 'Consolas', 'Liberation Mono', monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    background: #fff;
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-after: avoid;
  }

  .thermal-header { text-align: center; margin: 0 0 6px; }
  .thermal-shop-name {
    font-size: 13px;
    font-weight: 700;
    margin: 0 0 4px;
    letter-spacing: -0.02em;
    color: #000;
  }
  .thermal-meta { margin: 0; font-size: 10px; color: #000; }
  .thermal-meta--small { font-size: 9px; margin-top: 2px; }

  .thermal-sep {
    border: none;
    border-top: 1px dashed #000;
    margin: 6px 0;
    height: 0;
    padding: 0;
    background: transparent;
  }

  .thermal-item { margin: 6px 0; }
  .thermal-item-name { font-weight: 700; text-align: left; color: #000; }

  .thermal-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin: 2px 0;
  }
  .thermal-row-left { text-align: left; flex: 1; min-width: 0; }
  .thermal-row-right {
    text-align: right;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
  .thermal-row--total { font-weight: 700; font-size: 12px; margin-top: 4px; }

  .thermal-block { font-size: 10px; color: #000; margin: 4px 0; }
  .thermal-block--left { text-align: left; white-space: pre-wrap; word-break: break-word; }
  .thermal-block--compact { margin-top: 2px; }
  .thermal-label { font-weight: 700; }
  .thermal-address { margin-top: 2px; }

  .thermal-thanks {
    text-align: center;
    margin: 8px 0 0;
    padding-bottom: 0;
    font-size: 9px;
    color: #000;
  }
`;

let printJobActive = false;

function pinDocumentHeightToContent(doc, rootEl) {
  const root = doc.documentElement;
  const body = doc.body;
  const rectH = rootEl.getBoundingClientRect().height;
  const total = Math.ceil(
    Math.max(
      body.scrollHeight,
      body.offsetHeight,
      root.scrollHeight,
      rootEl.scrollHeight,
      rootEl.offsetHeight,
      rectH,
    ),
  );
  const px = `${Math.max(total + 2, 1)}px`;
  root.style.height = px;
  root.style.minHeight = px;
  root.style.maxHeight = px;
  root.style.overflow = 'hidden';
  body.style.height = px;
  body.style.minHeight = px;
  body.style.maxHeight = px;
  body.style.overflow = 'hidden';
}

function buildReceiptHtml(clone) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt</title><style>${THERMAL_RECEIPT_PRINT_CSS}</style></head><body>${clone.outerHTML}</body></html>`;
}

/** Exactly one print() per job — must be module-level if iframe onload retries */
let printInvocationId = 0;

function invokePrint(win, doc, rootEl, jobId) {
  if (jobId !== printInvocationId) return;
  try {
    pinDocumentHeightToContent(doc, rootEl);
    win.print();
  } catch (_) {
    /* ignore */
  }
}

function printViaIframeSrcdoc(html, onReleaseLock) {
  const jobId = ++printInvocationId;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Thermal receipt');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;visibility:hidden';
  iframe.srcdoc = html;

  let started = false;

  const runPrint = () => {
    if (started) return;
    started = true;

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      onReleaseLock();
      return;
    }
    const rootEl = doc.querySelector('.thermal-receipt-root');
    if (!rootEl) {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      onReleaseLock();
      return;
    }

    let cleaned = false;
    function finish() {
      if (cleaned) return;
      cleaned = true;
      try {
        win.removeEventListener('afterprint', onAfterPrint);
      } catch (_) { /* ignore */ }
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      onReleaseLock();
    }
    function onAfterPrint() {
      finish();
    }
    win.addEventListener('afterprint', onAfterPrint);
    setTimeout(finish, 12000);

    let printFired = false;
    queueMicrotask(() => {
      if (printFired) return;
      printFired = true;
      invokePrint(win, doc, rootEl, jobId);
    });
  };

  // Listener must be attached before appendChild so load cannot fire before we handle it
  iframe.addEventListener('load', runPrint, { once: true });
  document.body.appendChild(iframe);

  queueMicrotask(() => {
    if (started) return;
    try {
      const d = iframe.contentDocument;
      if (
        d &&
        d.readyState === 'complete' &&
        d.querySelector('.thermal-receipt-root')
      ) {
        runPrint();
      }
    } catch (_) {
      /* cross-origin or not ready */
    }
  });
}

/**
 * @param {HTMLElement} sourceEl — element with .thermal-receipt-root
 */
export function printThermalReceiptElement(sourceEl) {
  if (!sourceEl || typeof document === 'undefined') return;
  if (printJobActive) return;

  const clone = sourceEl.cloneNode(true);
  clone.classList.remove('thermal-receipt-screen-hidden');
  clone.removeAttribute('aria-hidden');

  const html = buildReceiptHtml(clone);

  const releaseLock = () => {
    printJobActive = false;
  };

  printJobActive = true;
  printViaIframeSrcdoc(html, releaseLock);
}
