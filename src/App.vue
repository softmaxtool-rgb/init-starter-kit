<template>
	<el-config-provider>
		<LoadingContent v-if="appState.loading" />
		<template v-else>
			<SideMenu
				v-if="!!appState.params['sidebar_enable'] && !!appState.params['sidebar_menu'] && !!userState.user && !publicPages.includes(route_name) && route_name != 'public-app'"
				:menu-data="appState.params['sidebar_menu']"
				expand-default="collapse"
				:class-interaction="`main-content`"
				:border-color="!!appState.params['sidebar_border_color'] ? appState.params['sidebar_border_color'] : undefined"
				:text-color="!!appState.params['sidebar_text_color'] ? appState.params['sidebar_text_color'] : undefined"
				:bg-color="!!appState.params['sidebar_bg_color'] ? appState.params['sidebar_bg_color'] : undefined" />
			<div class="main-content">
				<el-header class="p-0" v-if="!publicPages.includes(route_name) && route_name != 'public-app'">
					<NavHeader />
				</el-header>
				<el-scrollbar :height="`${options.scrollerHeight}px`" v-if="!publicPages.includes(route_name) && route_name != 'public-app'">
					<el-row class="m-5 mb-2">
						<el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
							<router-view />
							<FooterContent />
						</el-col>
					</el-row>
				</el-scrollbar>
				<router-view v-else />
			</div>
		</template>
	</el-config-provider>
</template>

<script lang="ts" setup>
// import MainPage from './views/MainPage.vue';
import NavHeader from './components/layouts/NavHeader.vue';
import { useRoute } from 'vue-router';
import { computed, nextTick, onMounted, onUnmounted, reactive, watch } from 'vue';
import LoadingContent from './components/layouts/LoadingContent.vue';
import { useAppStateStore } from './stores/AppState';
import { storeToRefs } from 'pinia';
import { onWindowResizeHandler } from './utils/Util';
import { useConnectStateStore } from './stores/ConnectState';

const publicPages = ['login'];
const route = useRoute();
const route_name: any = computed(() => route.name || 'sdform');

const appState = useAppStateStore();
const userState = useConnectStateStore();
const options = reactive({
	scrollerHeight: 0,
});
const { params } = storeToRefs(appState);
const el = document.documentElement;

watch(
	() => appState.params.menu_hover_bg_color,
	(newColor) => {
		if (!!newColor) {
			el.style.setProperty('--el-menu-hover-bg-color', newColor);
		} else {
			el.style.removeProperty('--el-menu-hover-bg-color');
		}
	},
	{ deep: true }
);

watch(
	() => appState.params.menu_hover_text_color,
	(newColor) => {
		if (!!newColor) {
			el.style.setProperty('--el-menu-hover-text-color', newColor);
		} else {
			el.style.removeProperty('--el-menu-hover-text-color');
		}
	},
	{ deep: true }
);

watch(
	() => appState.params.menu_hover_text_color,
	(newColor) => {
		if (!!newColor) {
			el.style.setProperty('--el-menu-hover-text-color', newColor);
			el.style.setProperty('--el-menu-active-color', newColor);
		} else {
			el.style.removeProperty('--el-menu-hover-text-color');
			el.style.removeProperty('--el-menu-active-color');
		}
	},
	{ deep: true }
);

watch(
	() => appState.params.menu_bg_color,
	(newColor) => {
		if (!!newColor) {
			el.style.setProperty('--el-menu-bg-color', newColor);
		} else {
			el.style.removeProperty('--el-menu-bg-color');
		}
	},
	{ deep: true }
);

let resizeCleanup: (() => void) | undefined;
onUnmounted(() => resizeCleanup?.());

onMounted(() => {
	options.scrollerHeight = window.innerHeight - 60;
	resizeCleanup = onWindowResizeHandler(async () => {
		await nextTick(() => {
			options.scrollerHeight = window.innerHeight - 60;
		});
	});

	if (!!params.value.menu_hover_bg_color) {
		el.style.setProperty('--el-menu-hover-bg-color', params.value.menu_hover_bg_color);
	} else {
		el.style.removeProperty('--el-menu-hover-bg-color');
	}

	if (!!params.value.menu_hover_text_color) {
		el.style.setProperty('--el-menu-hover-text-color', params.value.menu_hover_text_color);
		el.style.setProperty('--el-menu-active-color', params.value.menu_hover_text_color);
	} else {
		el.style.removeProperty('--el-menu-hover-text-color');
		el.style.removeProperty('--el-menu-active-color');
	}

	if (!!params.value.menu_bg_color) {
		el.style.setProperty('--el-menu-bg-color', params.value.menu_bg_color);
	} else {
		el.style.removeProperty('--el-menu-bg-color');
	}
});
</script>

<style lang="scss">
#app {
	color: var(--el-text-color-primary);
	height: 100%;
}

.upload-file-view {
	.el-upload--text {
		display: none;
	}
	.el-upload-list {
		margin: 0xp;
	}
}

.logo-container {
	display: flex;
	align-items: center;
	height: var(--el-header-height);
	margin-left: 5px;
	margin-right: 5px;
	// color: var(--el-color-success);

	.icon-logo {
		font-size: 32px !important;
	}
}

.content-box {
	display: flex;
	align-items: center;
}

.nav-item {
	display: flex;
	align-items: center;
	height: var(--el-header-height);
}

.float-left {
	float: left;
}

.float-right {
	float: right;
}

.el-menu--horizontal > .el-sub-menu .el-sub-menu__title .el-button span {
	border-bottom: 2px solid transparent;
	color: var(--el-menu-text-color);
	height: 100%;
}

.el-menu--horizontal > .el-sub-menu .el-sub-menu__title .el-divider--vertical {
	border-left: 1px var(--el-menu-text-color) var(--el-border-style);
}

.card-container.el-card.light.success {
	:deep(.el-card__body) {
		:deep(.el-form-item) {
			:deep(.el-form-item__label) {
				color: var(--el-color-success);
			}
			:deep(.el-form-item__content) {
				border-color: var(--el-color-success-light-8);

				:deep(.el-input) {
					--el-input-text-color: var(--el-color-success);
					--el-input-border-color: var(--el-color-success-light-5);
					--el-input-bg-color: var(--el-color-success-light-9);
					--el-input-icon-color: var(--el-color-success);

					--el-input-placeholder-color: var(--el-color-success-light-7);
					--el-input-hover-border-color: var(--el-color-success-light-7);
					--el-input-clear-hover-color: var(--el-color-success-light-8);
				}
			}
		}
	}
}
</style>
