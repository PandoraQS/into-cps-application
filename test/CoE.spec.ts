import { test, expect } from "@playwright/test";
import { TestHelper } from "./TestHelpers/TestHelper";

const helper = new TestHelper();

test.describe("COE Button Tests", async () => {
    test.beforeAll(async () => {
        await helper.launch();
    });

    test.afterAll(async () => {
        await helper.shutdown();
    });

    test('Initial state: Button should show "Start COE" with red circle', async () => {
        if (!helper.window) {
            throw new Error("Window is not initialized");
        }

        const button = helper.window.locator('#coe-btn-launch-bottom');
        await button.waitFor({ state: 'visible' });

        const buttonText = await button.innerText();
        expect(buttonText).toContain('Start COE');

        const icon = helper.window.locator('#coeIconColor');
        await icon.waitFor({ state: 'visible' });

        const iconColor = await icon.evaluate((iconElement) => iconElement.style.color);
        expect(iconColor).toBe('red');
    });

    test('Clicking button: Should change to "Stop COE" with green circle', async () => {
        if (!helper.window) {
            throw new Error("Window is not initialized");
        }

        await helper.window.locator('#coe-btn-launch-bottom').click();

        const buttonText = await helper.window.locator('#coe-btn-launch-bottom').innerText();
        expect(buttonText).toContain('Stop COE');

        const iconColor = await helper.window.locator('#coeIconColor').evaluate((icon) => icon.style.color);
        expect(iconColor).toBe('green');
    });

    test('Clicking "Stop COE" again: Should change back to "Start COE" with red circle', async () => {
        if (!helper.window) {
            throw new Error("Window is not initialized");
        }

        await helper.window.locator('#coe-btn-launch-bottom').click(); 
        let buttonText = await helper.window.locator('#coe-btn-launch-bottom').innerText();
        let iconColor = await helper.window.locator('#coeIconColor').evaluate((icon) => icon.style.color);

        await helper.window.locator('#coe-btn-launch-bottom').click();
        buttonText = await helper.window.locator('#coe-btn-launch-bottom').innerText();
        iconColor = await helper.window.locator('#coeIconColor').evaluate((icon) => icon.style.color);
        expect(buttonText).toContain('Stop COE');
        expect(iconColor).toBe('green');

        await helper.window.locator('#coe-btn-launch-bottom').click();
        buttonText = await helper.window.locator('#coe-btn-launch-bottom').innerText();
        iconColor = await helper.window.locator('#coeIconColor').evaluate((icon) => icon.style.color);
        expect(buttonText).toContain('Start COE');
        expect(iconColor).toBe('red');
    });
});