import { _electron as electron, ElectronApplication, Page } from "playwright";
import * as Path from 'path';

export class TestHelper {
    public electronApp: ElectronApplication | null = null;
    public window: Page | null = null;

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
            await this.electronApp.close();
        }
    }

    public async getMenuItems(): Promise<any> {
        if (this.electronApp) {
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
        return [];
    }
}