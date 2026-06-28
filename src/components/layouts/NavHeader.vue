<template>
	<el-menu
		class="el-menu-demo pl-2 pr-2"
		mode="horizontal"
		:ellipsis="options.isEllipsis"
		menu-trigger="hover"
		:router="false"
		:default-active="route.fullPath"
		:text-color="appState.params['navbar_text_color'] || undefined"
		:style="{ backgroundColor: appState.params['navbar_bg_color'] || undefined, borderBottomColor: appState.params['navbar_border_color'] || undefined }">
		<el-sub-menu index="0" class="menu-custom" @click="router.push('/')" popper-class="menu-custom-poper">
			<template #title>
				<span class="logo-container" style="display: flex; align-items: center; gap: 10px; cursor: pointer; min-width: max-content">
					<div style="flex-shrink: 0; display: flex; align-items: center">
						<el-avatar v-if="options.logoType === 'img'" shape="square" :size="42" :src="APP_IMG_LOGO" />
						<SvgIcon v-else :icon-name="!!appState.params.app_svg_logo ? appState.params.app_svg_logo : APP_SVG_LOGO" class="mr-1 text-22 icon-logo" />
					</div>

					<div style="display: flex; flex-direction: column; line-height: 1.2; flex-shrink: 0">
						<div style="display: flex; align-items: baseline; gap: 5px">
							<span class="text-6" style="white-space: nowrap">
								{{ !!appState.params.app_name ? appState.params.app_name : APP_NAME }}
							</span>
							<span class="text-4" style="white-space: nowrap">
								{{ !!appState.params.app_version ? appState.params.app_version : APP_VERSION }}
							</span>
						</div>
						<span class="text-3" style="white-space: nowrap; margin-top: -2px">
							{{ !!appState.params.app_slogan ? appState.params.app_slogan : APP_SLOGAN }}
						</span>
					</div>
				</span>
			</template>
			<template #default></template>
		</el-sub-menu>
		<el-menu-item v-if="!!userState.user" index="/module" @click="router.push('/module')">
			<svg-icon icon-name="addon-boxes" />
			<span> Apps </span>
		</el-menu-item>
		<el-sub-menu index="1" v-if="!!appState.params['site_shotcut_enable'] && !!appState.params['site_shotcut_menu'] && !!userState.user">
			<template #title><svg-icon icon-name="addon-widget" /> <span> Shotcut Menu </span></template>
			<el-menu-item
				v-for="(item, index) of appState.params['site_shotcut_menu']"
				:index="!!item.path ? item.path : `app-${index}`"
				@click="router.push(!!item.path ? item.path : '/')">
				<svg-icon v-if="!!item.icon" :icon-name="item.icon" />
				<span> {{ item.label }} </span>
			</el-menu-item>
		</el-sub-menu>

		<div class="flex-grow" />
		<el-sub-menu index="2" v-if="!!userState.user">
			<template #title>
				<el-avatar :src="userState.getAvatar()" :size="24" class="mr-1" />
				{{ !!userState.user ? 'Hi' : '' }} {{ userState.user?.fname }}
			</template>
			<el-menu-item index="/user/profile" @click="router.push('/user/profile')">
				<el-icon><User /></el-icon> Profile
			</el-menu-item>
			<el-menu-item index="/user/change-password" @click="router.push('/user/change-password')">
				<el-icon><Key /></el-icon> Change Password
			</el-menu-item>
			<el-menu-item index="enable-2fa" @click="router.push('/user/enable-2fa')">
				<el-icon><Iphone /></el-icon> Two-Factor Setup
			</el-menu-item>

			<el-divider style="margin: 5px 0" v-can.any="['super', 'admin', 'manager']" />

			<el-menu-item v-can.any="['super', 'admin', 'manager']" index="/user/user-manage" @click="router.push('/user/user-manage')">
				<SvgIcon icon-name="addon-users"></SvgIcon> Manage Users
			</el-menu-item>
			<el-menu-item v-can.any="['super', 'admin', 'manager']" index="/admin/roles-manager" @click="router.push('/admin/roles-manager')">
				<SvgIcon icon-name="el-circle-check"></SvgIcon> Manage Roles
			</el-menu-item>

			<el-menu-item v-can.any="['super', 'admin']" index="/admin/files-manager" @click="router.push('/admin/files-manager')">
				<el-icon><Files /></el-icon> Manage Files
			</el-menu-item>

			<el-menu-item v-can.any="['super', 'admin']" index="/admin/setting-manager" @click="router.push('/admin/setting-manager')">
				<el-icon><SetUp /></el-icon> Manage Setting
			</el-menu-item>

			<el-divider style="margin: 5px 0" />
			<el-menu-item index="logout" @click="userState.logout()">
				<el-icon><Lock /></el-icon> Logout
			</el-menu-item>
		</el-sub-menu>

		<el-sub-menu index="10" class="menu-custom" popper-class="menu-custom-poper">
			<template #title>
				<el-badge v-if="!!userState.user" :hidden="!!!options.notifyCount" :value="options.notifyCount" :max="99" class="item" style="right: 6px; display: flex">
					<el-button link @click.prevent="notifyShow">
						<el-icon style="margin-right: -5px"><BellFilled /></el-icon>
					</el-button>
				</el-badge>
				<el-button v-if="!userState.user" link @click.prevent="router.push('/user/login')">
					<el-icon class="text-5 mr-1"><Unlock /></el-icon> Login
				</el-button>
				<el-divider direction="vertical" />

				<el-switch class="ml-2" v-model="appState.isDark" inline-prompt :tabindex="-1" active-icon="Sunny" inactive-icon="Moon" style="width: 40px" />

				<el-button v-if="!!userState.user" v-can.any="['super', 'admin']" link @click.prevent="configShow">
					<el-icon style="margin-right: -5px"><Setting /></el-icon>
				</el-button>
			</template>
		</el-sub-menu>
	</el-menu>

	<el-drawer v-model="options.notifyShow" title="Notifications" append-to-body destroy-on-close direction="rtl" size="380" @closed="notifyClose">
		<template #header="{ close, titleId, titleClass }">
			<span :id="titleId" :class="titleClass"><SvgIcon icon-name="el-bell" /> Notifications</span>
		</template>
		<div class="infinite-list-wrapper" style="overflow: auto" :style="{ height: `${options.scrollerHeight}px` }">
			<el-scrollbar class="list" @end-reached="notifyLoad">
				<li v-for="item in options.notifyList" :key="item._id" class="list-item">
					<el-alert :title="String(item.title)" :type="item.type" :description="item.message" show-icon :closable="false">
						<el-tag :type="item.type == 'error' ? 'danger' : item.type" effect="plain" size="small" style="position: absolute; top: 5px; right: 5px">
							{{ dayjs(item.created_at).fromNow(true) }}
						</el-tag>
						{{ item.message }}

						<p style="margin-bottom: 5px" v-if="!!item.detail">
							<el-button size="small" :type="item.type" round icon="View" @click.prevent="viewDetail(item)">View</el-button>
						</p>
					</el-alert>
				</li>
				<p v-if="options.loading">Loading...</p>
				<p v-if="options.noMore">No more</p>
			</el-scrollbar>
			<!-- <ul v-infinite-scroll="notifyLoad" class="list" :infinite-scroll-disabled="options.disabled" :infinite-scroll-distance="100"></ul> -->
		</div>
	</el-drawer>

	<el-dialog
		title="Notify Detail"
		v-model="options.showDetail"
		:width="options.popupWidth"
		:show-close="true"
		class="dialog-grid dialog-form"
		append-to-body
		:close-on-click-modal="true"
		:close-on-press-escape="true"
		:destroy-on-close="true">
		<el-descriptions :border="true" style="margin-bottom: 10px">
			<el-descriptions-item label="Send By">{{ options.notifySelect.created_by.name }}</el-descriptions-item>
			<el-descriptions-item label="Date">{{ dayjs(options.notifySelect.created_at).format('DD/MM/YYYY HH:mm') }}</el-descriptions-item>
		</el-descriptions>
		<sd-html-editor v-if="!!options.notifySelect.detail" v-model="options.notifySelect.detail" :mode="'mini'" :readonly="true" :user-state="userState"></sd-html-editor>
		<template #footer>
			<div class="dialog-footer">
				<el-button @click="options.showDetail = false">Close</el-button>
			</div>
		</template>
	</el-dialog>

	<div v-if="options.configShow">
		<KeepAlive>
			<SettingConfigAsync ref="refSetting" v-model="options.configShow" />
		</KeepAlive>
	</div>
</template>

<script lang="ts" setup>
import { useDark } from '@vueuse/core';
import { onMounted, onUnmounted, computed, reactive, nextTick, ref, watch, defineAsyncComponent } from 'vue';
import { APP_VERSION, APP_NAME, APP_SVG_LOGO, APP_IMG_LOGO, APP_LOGO_TYPE, ASSETS_URL, API_URL, APP_SLOGAN } from '~/config/AppConfig';
import { useAppStateStore } from '~/stores/AppState';
import { useRoute } from 'vue-router';
import router from '~/routers';
import axios from 'axios';
import { deepClone, onWindowResizeHandler, responsivePopup } from '~/utils/Util';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ElNotification, type ScrollbarDirection } from 'element-plus';
import { useConnectStateStore } from '~/stores/ConnectState';
import LoadingContent from './LoadingContent.vue';
import EmptyContent from './EmptyContent.vue';
// import SettingConfig from './SettingConfig.vue';

dayjs.extend(relativeTime);

const SettingConfigAsync = defineAsyncComponent({
	loader: () => import('./SettingConfig.vue'),
	loadingComponent: LoadingContent,
	delay: 100,
	errorComponent: EmptyContent,
	timeout: 10000,
});

// const SettingConfigAsync = defineAsyncComponent(() => import('./SettingConfig.vue'));

const appState = useAppStateStore();
const userState: any = useConnectStateStore();
const route = useRoute();
const route_name: any = computed(() => route.name || 'sdform');
// const route_title = computed(() => route.meta.title || 'SdForm');
const refSetting = ref();

const options = reactive({
	scrollerHeight: 0,
	logoType: APP_LOGO_TYPE,
	notifyShow: false,
	notifyCount: 0,
	page: 1,
	notifyList: [] as Array<any>,
	noMore: false,
	loading: false,
	disabled: computed(() => options.loading || options.noMore),
	notifySelect: {} as any,
	showDetail: false,
	popupWidth: '50%',
	drawerEnable: false,
	isEllipsis: false,
	configShow: false as boolean,
});

let resizeCleanup: (() => void) | undefined;
onUnmounted(() => resizeCleanup?.());

onMounted(() => {
	options.scrollerHeight = window.innerHeight - 60;
	resizeCleanup = onWindowResizeHandler(async () => {
		await nextTick(() => {
			options.scrollerHeight = window.innerHeight - 60;
			options.isEllipsis = window.innerWidth < 1024;
			options.popupWidth = responsivePopup('50%');
		});
	});

	appState.isDark = useDark();

	if (!!userState.user) {
		getCountNotify();
		// idempotent — เปิด notify socket เฉพาะตอนยังไม่มี (ครอบเคส refresh page ที่ login() ไม่ถูกเรียก)
		userState.ensureNotifySocket();
	}
});

// notify ใหม่จาก store (ผ่าน filter แล้ว) → จัดการ UI: เด้ง notification + นับ + เติม drawer
watch(
	() => userState.notifySeq,
	() => {
		const rowData = userState.notifyLast;
		if (!rowData) return;

		options.notifyCount++;
		if (options.drawerEnable) {
			options.notifyList.unshift(rowData);
		}

		ElNotification({
			title: rowData.title,
			message: rowData.message,
			type: rowData.type,
			duration: 7000,
		});
	}
);

const configShow = () => {
	options.configShow = true;
};

const viewDetail = (notify: any) => {
	options.notifySelect = notify;
	options.showDetail = true;
};

const notifyClose = () => {
	options.notifyCount = 0;
	updateViewNotify();
};

const notifyShow = async () => {
	if (!options.noMore) {
		await getViewNotify(!!options.notifyCount);
	}

	options.notifyShow = true;
	options.drawerEnable = true;
};

const notifyLoad = (direction: ScrollbarDirection) => {
	if (direction === 'bottom' && !options.noMore) {
		getViewNotify(!!options.notifyCount);
	}
};

const getCountNotify = async () => {
	await axios
		.post(
			`${API_URL}/v1/notify/count`,
			{},
			{
				headers: {
					Authorization: `Bearer ${userState.user?.token}`,
				},
			}
		)
		.then((response) => {
			if (!!response.data && !!response.data.count) {
				options.notifyCount = response.data.count;
			} else {
				options.notifyCount = 0;
			}
		})
		.catch((error) => {
			options.notifyCount = 0;
		});
};

const getViewNotify = async (open: boolean) => {
	options.loading = true;
	await axios
		.post(
			`${API_URL}/v1/notify/view`,
			{ page: options.page, open: open },
			{
				headers: {
					Authorization: `Bearer ${userState.user?.token}`,
				},
			}
		)
		.then((response) => {
			if (!!response.data && !!response.data.message) {
				const notifyData: Array<any> = deepClone(response.data.data);
				options.notifyList.push(...notifyData);

				if (notifyData.length > 0) {
					if (notifyData.length == 20) {
						options.page++;
					} else {
						options.noMore = true;
					}
				} else {
					options.noMore = true;
				}
			}
			options.loading = false;
		})
		.catch((error) => {
			options.loading = false;
		});
};

const updateViewNotify = async () => {
	await axios
		.post(
			`${API_URL}/v1/notify/last-update`,
			{},
			{
				headers: {
					Authorization: `Bearer ${userState.user?.token}`,
				},
			}
		)
		.then((response) => {
			if (!!response.data && !!response.data.message) {
				//
			}
		})
		.catch((error) => {
			//
		});
};
</script>

<style lang="scss">
.menu-custom {
	.el-sub-menu__title {
		padding-left: 10px !important;
		padding-right: 10px !important;
		cursor: inherit;
	}
	.el-sub-menu__icon-arrow {
		display: none;
	}
}
.el-sub-menu.menu-custom .el-icon {
	margin-right: 0px;
}

.el-sub-menu .el-icon {
	margin-right: 0px;
}
.el-sub-menu.menu-custom .el-icon.icon-logo {
	width: 35px;
	height: 35px;
}

.menu-custom-poper {
	display: none;
}

.el-drawer .el-drawer__header {
	margin-bottom: 0px;
}

.el-drawer .el-drawer__body {
	overflow: hidden;
	padding: 10px;
}

.infinite-list-wrapper {
	min-height: 100px;
	text-align: center;
}
.infinite-list-wrapper .list {
	padding: 0;
	margin: 0;
	list-style: none;
}

.infinite-list-wrapper .list-item {
	// display: flex;
	align-items: center;
	text-align: left;
	margin-bottom: 7px;
}
</style>
