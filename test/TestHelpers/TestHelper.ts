import { _electron as electron, ElectronApplication, Page } from "playwright";
import * as Path from 'path';
import * as fs from "fs";
export class TestHelper {
    public electronApp: ElectronApplication;
    public window: Page;
    public testDataPath: string = __dirname + "/../TestData/";

    /*
    *   Start function to use the testing framework Playwright
    */

    public async launch(): Promise<void> {
        const distPath = Path.resolve(__dirname, '../../dist');

        this.electronApp = await electron.launch({
            args: [Path.join(distPath, 'main.js')],
            cwd: distPath
        });

        this.window = await this.electronApp.firstWindow();
        const title = await this.window.title();
    }

    public async shutdown(): Promise<void> {
        if (this.electronApp) {
            await this.electronApp.close().then(() => {
                if (this.testDataPath) {
                    fs.rmdirSync(this.testDataPath, { recursive: true });
                }
            });        }
    }

    public async getMenuItems(): Promise<any> {
        return await this.electronApp.evaluate(async ({ Menu }) => {
            const menu = Menu.getApplicationMenu();
            
            if (!menu) {
                return [];
            }
    
            return menu.items.map(item => ({
                label: item.label,
                submenu: item.submenu ? item.submenu.items.map(subItem => subItem.label) : []
            }));
        });
    }
    
}