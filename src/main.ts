import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import router from './routers';

import ElementPlus from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
// import all element css, uncommented next line
import 'element-plus/dist/index.css';
import 'virtual:svg-icons-register';

import './styles/index.scss';
import 'uno.css';
import SdForm, { SdHtmlEditor, SvgIcon, SvgData } from 'sd-render';
import draggable from 'vuedraggable';
import 'sd-render/style.css';

// side-effect: dayjs.extend(buddhistEra/localizedFormat) + register locale th — จำเป็นสำหรับ date BE (SdDatePickerBE / date-input)
import './core/dayjs-plugin';

import acl from './config/Acl';

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(ElementPlus);
app.use(router);

const { initApp } = await import('./config/StartApp');
await initApp();

app.use(acl);

app.component('draggable', draggable);

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
	app.component(key, component);
}

app.use(SdForm);

app.component('SvgIcon', SvgIcon);
app.component('SvgData', SvgData);
app.component('SdHtmlEditor', SdHtmlEditor);

app.mount('#app');
