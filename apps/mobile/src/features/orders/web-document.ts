export function captureWebDocumentQr(elementId: string): Promise<string> {
  const svg = document.getElementById(elementId)?.querySelector("svg");
  if (!svg) return Promise.reject(new Error("The document QR is still loading. Please try again."));
  const source = new XMLSerializer().serializeToString(svg);
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => reject(new Error("Could not render the document QR.")), 5000);
    image.onerror = () => { clearTimeout(timeout); reject(new Error("Could not render the document QR.")); };
    image.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 600;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("QR export is unavailable in this browser.");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, 600, 600);
        context.drawImage(image, 0, 0, 600, 600);
        resolve(canvas.toDataURL("image/png").split(",")[1]!);
      } catch (error) { reject(error); }
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  });
}

export function printWebDocument(html: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.title = title;
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("sandbox", "allow-same-origin allow-modals");
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:1100px;border:0";
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (error?: unknown) => { clearTimeout(timeout); frame.remove(); error ? reject(error) : resolve(); };
    timeout = setTimeout(() => finish(new Error("Print document did not load. Please retry.")), 15000);
    frame.onload = async () => {
      try {
        const target = frame.contentWindow;
        const page = frame.contentDocument;
        if (!target || !page) throw new Error("Print preview is unavailable.");
        page.title = title;
        await Promise.all(Array.from(page.images).map((image) => image.decode()));
        if (!frame.isConnected) return;
        clearTimeout(timeout);
        target.addEventListener("afterprint", () => finish(), { once: true });
        timeout = setTimeout(() => finish(), 120000);
        target.print();
      } catch (error) { finish(error); }
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
