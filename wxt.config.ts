import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Tabbit 标签兔',
    short_name: 'Tabbit',
    description: '一只会感知标签页状态、在网页上散步的小兔子。',
    minimum_chrome_version: '114',
    permissions: ['storage', 'alarms', 'sidePanel'],
    action: { default_title: '打开 Tabbit' },
    side_panel: { default_path: 'sidepanel.html' },
    options_page: 'options.html'
  }
});
