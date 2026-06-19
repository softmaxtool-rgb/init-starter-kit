import dayjs from 'dayjs';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/th';

// buddhistEra → token ปี พ.ศ. (BB = 2 หลัก, BBBB = เต็ม) · localizedFormat → token L/LL/LT ฯลฯ
// locale th: register ไว้เรียกผ่าน .locale('th') เฉพาะจุด — ไม่ตั้งเป็น default ทั้งแอป
// เพราะที่อื่น (เช่น grid) ใช้ format ตัวเลขล้วน ไม่อยากให้เดือน/วันกลายเป็นไทยโดยไม่ตั้งใจ
dayjs.extend(buddhistEra);
dayjs.extend(localizedFormat);

const dayjsPlugin = {
	install(Vue: any) {
		Vue.dayjs = dayjs;

		// VueJS 3

		if (Vue.config && Vue.config.globalProperties) {
			Vue.config.globalProperties.$dayjs = dayjs;
		}

		if (Vue.provide && typeof Vue.provide === 'function') {
			Vue.provide('dayjs', dayjs);
		}

		Vue.use(dayjs);
	},
};

export default dayjsPlugin;
