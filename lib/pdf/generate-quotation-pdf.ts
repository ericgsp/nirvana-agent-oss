import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Mirrors the watermark and footer markup that the web `@media print` stylesheet
// injects around #quote-section (see app/agent/AgentClient.tsx). html2canvas only
// rasterizes what's actually on screen, so this builds an off-screen clone with
// those normally-hidden pieces made visible instead of relying on print CSS.
export async function generateQuotationPdf(): Promise<Blob> {
  const source = document.getElementById("quote-section");
  if (!source) throw new Error("Quotation not found on page");

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = `${source.scrollWidth}px`;
  container.style.background = "#fff";

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.margin = "0";
  clone.style.borderRadius = "0";
  clone.style.boxShadow = "none";
  clone.style.position = "relative";

  const watermark = document.createElement("div");
  watermark.style.cssText =
    "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
  watermark.innerHTML =
    '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);' +
    "font-size:52px;font-weight:900;letter-spacing:4px;white-space:nowrap;" +
    'color:rgba(26,58,107,0.07);text-transform:uppercase;user-select:none;">NIRVANA AGENT</div>';
  clone.appendChild(watermark);

  const footer = document.createElement("div");
  footer.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;margin-top:6px;" +
    "padding:4px 14px 10px;border-top:1px solid #cbd5e1;font-size:9px;color:#64748b;" +
    "width:100%;box-sizing:border-box;";
  const stamp = new Date().toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" });
  footer.innerHTML = `<span>${stamp}</span>`;
  clone.appendChild(footer);

  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");

    // Same "pick whichever orientation fits with the least shrinking" logic
    // used for window.print() (see the beforeprint handler in AgentClient.tsx).
    const PAGE_W = 210, PAGE_H = 297; // A4, mm
    const MARGIN = 12;
    const usableP = { w: PAGE_W - MARGIN * 2, h: PAGE_H - MARGIN * 2 };
    const usableL = { w: PAGE_H - MARGIN * 2, h: PAGE_W - MARGIN * 2 };

    const scaleP = Math.min(usableP.w / canvas.width, usableP.h / canvas.height);
    const scaleL = Math.min(usableL.w / canvas.width, usableL.h / canvas.height);
    const orientation: "p" | "l" = scaleP >= scaleL ? "p" : "l";
    const usable = orientation === "p" ? usableP : usableL;
    const scale = Math.min(usable.w / canvas.width, usable.h / canvas.height);

    const imgW = canvas.width * scale;
    const imgH = canvas.height * scale;
    const pageW = orientation === "p" ? PAGE_W : PAGE_H;

    const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
    const x = (pageW - imgW) / 2;
    pdf.addImage(imgData, "PNG", x, MARGIN, imgW, imgH);

    return pdf.output("blob");
  } finally {
    container.remove();
  }
}
