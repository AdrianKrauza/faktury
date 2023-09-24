import { NextResponse } from "next/server";
import { JSDOM } from "jsdom";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  //   const url = "2650454143.html";

  // Fetch the content
  const response = await fetch(`https://h3.owocni.pl/faktury/${url}`);
  if (!response.ok) {
    throw new Error("Failed to fetch data.");
  }

  const html = await response.text();
  const dom = new JSDOM(html);
  const window = dom.window;
  const document = dom.window.document;
  // Remove unwanted elements
  document.querySelectorAll("img").forEach((e) => e.remove());

  document.querySelectorAll("#page-container > div").forEach((e) => {
    const boxes = [...e.children[0].children];

    // Sort based on the bottom property of elements
    boxes.sort((a, b) => {
      const bottomA = parseFloat(window.getComputedStyle(a).bottom);
      const bottomB = parseFloat(window.getComputedStyle(b).bottom);
      return bottomB - bottomA;
    });

    const parent = e.children[0];
    boxes.forEach((box) => parent.removeChild(box));
    boxes.forEach((box) => parent.appendChild(box));
  });
  document.querySelectorAll("img,style,script").forEach((e) => e.remove());
  return new NextResponse(document.documentElement.outerHTML, {
    status: 410,
    headers: { "content-type": "text/html" },
  });
}
