import { test, expect } from "@playwright/test";
import { TestHelper } from "./TestHelpers/Testhelper";

const helper = new TestHelper();

test.describe("COE Button Tests", async () => {
    test.beforeAll(async () => {
        await helper.launch();
    });

    test.afterAll(async () => {
        await helper.shutdown();
    });

    test('Initial state: Button should show "Start COE" with red circle', async () => {
        const buttonText = await helper.window.innerText('#coe-btn-launch-bottom');
        expect(buttonText).toContain('Start COE');

        const circleColor = await helper.window.locator('#coeIconColor').evaluate((span) => span.style.color);
        expect(circleColor).toBe('red');
    });

    test('Clicking button: Should change to "Stop COE" with green circle', async () => {
        await helper.window.locator('#coe-btn-launch-bottom').click();

        const buttonText = await helper.window.innerText('#coe-btn-launch-bottom');
        expect(buttonText).toContain('Stop COE');

        const circleColor = await helper.window.locator('#coeIconColor').evaluate((span) => span.style.color);
        expect(circleColor).toBe('green');
    });

    test('Clicking "Stop COE": Should change back to "Start COE" with red circle', async () => {
        // First click to start COE
        await helper.window.locator('#coe-btn-launch-bottom').click(); 
        expect(await helper.window.locator('#coe-btn-launch-bottom')
        .innerText()
        ).toMatch('Stop COE');

        expect (await helper.window.locator('#coeIconColor')
        .evaluate((span) => span.style.color)
        ).toBe('green');
        
        // Second click to stop COE
        await helper.window.locator('#coe-btn-launch-bottom').click();
        await helper.window.waitForTimeout(2000);

        expect(await helper.window.locator('#coe-btn-launch-bottom')
        .innerText()
        ).toMatch('Start COE');

        expect (await helper.window.locator('#coeIconColor')
        .evaluate((span) => span.style.color)
        ).toBe('red');

    });
});
