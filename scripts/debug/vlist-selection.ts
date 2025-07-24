// scripts/debug/vlist-selection.ts

import puppeteer from "puppeteer";

async function testVListSelection() {
  console.log("🎯 Testing VList Selection Feature");

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Listen to console logs
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[Selection]") || text.includes("selection")) {
      console.log(`💬 [${msg.type().toUpperCase()}] ${text}`);
    }
  });

  await page.goto("http://localhost:4000/examples/vlist-addons");

  // Wait for list to load
  await page.waitForSelector(".mtrl-viewport-item", { timeout: 5000 });

  console.log("📋 Page loaded, looking for list items...");

  // Get info about items
  const itemInfo = await page.evaluate(() => {
    const items = document.querySelectorAll(".mtrl-viewport-item");
    const firstItem = items[0];
    const listItem = firstItem?.querySelector(".list-item, .user-item");

    return {
      viewportItemCount: items.length,
      firstViewportItemClasses: firstItem?.className,
      firstViewportItemDataIndex: firstItem?.getAttribute("data-index"),
      firstListItemClasses: listItem?.className,
      firstListItemDataId: listItem?.getAttribute("data-id"),
      hasClickHandler: !!(window as any).listExample?.userList,
    };
  });

  console.log("📊 Item info:", itemInfo);

  // Click on the first item
  console.log("🖱️ Clicking on first item...");
  await page.click(".mtrl-viewport-item:first-child");

  // Wait a bit for selection to process
  await page.waitForTimeout(500);

  // Check if selection class was applied
  const selectionInfo = await page.evaluate(() => {
    const firstItem = document.querySelector(".mtrl-viewport-item:first-child");
    const listItem = firstItem?.querySelector(".list-item, .user-item");
    const selectedItems = document.querySelectorAll(
      ".mtrl-list-item--selected"
    );

    return {
      hasSelectionClass: listItem?.classList.contains(
        "mtrl-list-item--selected"
      ),
      listItemClasses: listItem?.className,
      selectedCount: selectedItems.length,
      userListExists: !!(window as any).listExample?.userList,
      hasSelectItems:
        typeof (window as any).listExample?.userList?.selectItems ===
        "function",
      hasGetSelectedItems:
        typeof (window as any).listExample?.userList?.getSelectedItems ===
        "function",
    };
  });

  console.log("✅ Selection info after click:", selectionInfo);

  // Try programmatic selection
  console.log("🔧 Testing programmatic selection...");
  const programmaticResult = await page.evaluate(() => {
    const userList = (window as any).listExample?.userList;
    if (userList && userList.selectItems) {
      userList.selectItems([0, 1, 2]);
      const selected = userList.getSelectedItems
        ? userList.getSelectedItems()
        : [];
      return {
        success: true,
        selectedCount: selected.length,
        selectedIds: selected.map((item: any) => item.id),
      };
    }
    return { success: false, reason: "No selectItems method" };
  });

  console.log("📊 Programmatic selection result:", programmaticResult);

  // Final check
  await page.waitForTimeout(500);
  const finalState = await page.evaluate(() => {
    const selectedElements = document.querySelectorAll(
      ".mtrl-list-item--selected"
    );
    return {
      selectedElementCount: selectedElements.length,
      selectedClasses: Array.from(selectedElements).map((el) => el.className),
    };
  });

  console.log("🎯 Final selection state:", finalState);

  // Keep browser open for inspection
  console.log("✨ Test complete. Browser will stay open for inspection.");
  console.log("Press Ctrl+C to exit.");
}

testVListSelection().catch(console.error);
