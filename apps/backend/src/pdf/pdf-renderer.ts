import puppeteer from "puppeteer";

// Generic HTML -> PDF, one job. Template selection and data-filling live in
// the module that owns that content (complaint.service.ts), not here.
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
