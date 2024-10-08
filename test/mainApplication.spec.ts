import { test, expect } from "@playwright/test";
import { TestHelper } from "./TestHelpers/TestHelper";

const helper = new TestHelper();

test.describe("Electron Menu Tests", () => {
    test.beforeAll(async () => {
        await helper.launch();
    });

    test.afterAll(async () => {
        await helper.shutdown();
    });

    test('App should launch successfully', async () => {
        const windowCount = await helper.electronApp.windows().length;
        expect(windowCount).toBeGreaterThan(0);
    
        const title = await helper.window.title();
        expect(title).not.toBeNull();
        expect(title).toContain('INTO-CPS App');
    
    }); 

    test('App should have only a "File" menu with a "Quit" option', async () => {
        const menuItems = await helper.getMenuItems();
        
        expect(menuItems.length).toBeGreaterThan(0);

        expect(menuItems.length).toBe(1);
        expect(menuItems[0].label).toBe("File");

        const submenuItems = menuItems[0].submenu;
        expect(submenuItems.length).toBe(1);
        expect(submenuItems[0]).toBe("Quit");
    });
});
