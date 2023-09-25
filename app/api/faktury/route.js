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
    const parent2 = document.querySelector("#pf1");
    boxes.forEach((box) => parent.removeChild(box));
    boxes.forEach((box) => parent2.appendChild(box));
  });
  let canRemove = true;

  document.querySelectorAll("#pf1 > div").forEach((e, i) => {
    if (e.textContent.includes("Telefon nr:")) {
      canRemove = false;
    }
    if (e.textContent.includes("Aktualny rejestr Podmiotów świadc")) {
      canRemove = true;
    }

    if (canRemove || window.getComputedStyle(e).fontSize === "") {
      e.remove();
      return;
    }

    [...e?.children].forEach((e) => {
      if (e.nodeName.toLowerCase() === "span") {
        const width = +window.getComputedStyle(e).width.replace("px", "");
        if (width > 10) {
          e.outerHTML = "|";
        }
      }
    });
    const fontSize = +window.getComputedStyle(e).fontSize.replace("px", "");

    const arr = e.innerHTML?.split("|");
    e.innerHTML = `{"${fontSize}|${arr[0]}":${JSON.stringify(arr)}}`;
  });
  const elements = document.querySelectorAll("#pf1 > div");
  let json = [];
  let currentIndex = -1;

  elements.forEach((element) => {
    const content = JSON.parse(element.textContent);

    if (element.textContent.includes("Telefon nr:")) {
      currentIndex++;
      json.push([content]);
    } else if (currentIndex !== -1) {
      json[currentIndex].push(content);
    }
  });
  document.querySelectorAll("script,style").forEach((e) => e.remove());

  json = json.map((entry) => {
    let result = {};
    let currentKey = null;

    entry.forEach((item) => {
      const [key, value] = Object.entries(item)[0];

      if (key.includes("32")) {
        currentKey = key.replace(/\d\d\|/, "");
        if (!result[currentKey]) {
          result[currentKey] = {};
        }
      }
      if (currentKey) {
        result[currentKey][key.replace(/\d\d\|/, "")] = value;
      }
    });

    return result;
  });

  return NextResponse.json({ phones: json, content: document.body.outerHTML });
}
