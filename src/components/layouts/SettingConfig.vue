<template>
	<el-drawer v-model="value" title="System Config" append-to-body destroy-on-close direction="rtl" size="450">
		<template #header="{ close, titleId, titleClass }">
			<span :id="titleId" :class="titleClass"><SvgIcon icon-name="el-set-up" /> System Config</span>
		</template>
		<el-scrollbar class="setting-scrollbar" :style="{ height: options.scrollerHeight }">
			<div class="search-setting">
				<el-input v-model="options.searchSetting" placeholder="Search setting name..." suffix-icon="Search" @change="querySearch"> </el-input>
			</div>

			<template v-for="item of options.settingList" :key="item._id">
				<el-divider v-if="!!item.opts_divider" class="custom-divider" style="margin-bottom: 10px">{{ item.opts_divider }}</el-divider>
				<div class="block-item">
					<span class="block-title">
						{{ item.opts_label }} <el-tooltip v-if="!!item.opts_hint" :content="item.opts_hint"> <SvgIcon icon-name="el-info-filled" /> </el-tooltip>
					</span>
					<span class="block-input">
						<SdDynamicInput
							v-if="!['json-editor', 'html-editor', 'html-mini-editor', 'textarea-editor', 'multiselect-editor', 'js-editor', 'css-editor'].includes(item.opts_type.value)"
							:readonly="false"
							size="small"
							v-model="item.opts_value"
							:data-list="item.opts_datalist"
							:input-options="item.opts_options"
							:input-type="!!item.opts_type.value ? item.opts_type.value : ''"
							@change="editSettingChange(item)"
							:user-state="userState" />

						<el-button v-else size="small" :type="!!item.opts_value ? 'primary' : 'info'" plain icon="Edit" @click.prevent="editSettingOpen(item)"> Edit</el-button>
					</span>
				</div>
			</template>
		</el-scrollbar>
		<el-dialog
			title="System Config"
			v-model="options.showDetail"
			:width="options.popupWidth"
			:show-close="true"
			class="dialog-grid dialog-form"
			append-to-body
			:close-on-click-modal="true"
			:close-on-press-escape="true"
			:destroy-on-close="true">
			<SdDynamicInput
				v-if="!!options.settingSelect._id"
				:readonly="false"
				size="small"
				v-model="options.settingSelect.opts_value"
				:data-list="options.settingSelect.opts_datalist"
				:input-options="options.settingSelect.opts_options"
				:input-type="!!options.settingSelect.opts_type.value ? options.settingSelect.opts_type.value : ''"
				:user-state="userState" />

			<template #footer>
				<div class="dialog-footer">
					<el-button type="primary" @click="editSettingChange(options.settingSelect)">Save</el-button>
					<el-button @click="editSettingClose">Close</el-button>
				</div>
			</template>
		</el-dialog>
	</el-drawer>
</template>
<script lang="ts" setup>
import Fuse from 'fuse.js';
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useAppStateStore } from '~/stores/AppState';
import { deepClone, onWindowResizeHandler, responsivePopup } from '~/utils/Util';
import { SdDynamicInput } from 'sd-render';
import { type OptionsSetting } from '~/types/Setting';
import { useConnectStateStore } from '~/stores/ConnectState';

const appState = useAppStateStore();
const userState = useConnectStateStore();

interface RestaurantItem {
	value: string;
	label: string;
}

const props = defineProps<{
	modelValue: any;
}>();

const emit = defineEmits(['update:modelValue', 'change']);

const value = computed({
	get() {
		return props.modelValue;
	},
	set(newValue) {
		emit('update:modelValue', newValue);
	},
});

const options = reactive({
	scrollerHeight: 0,
	settingShow: false,
	settingList: [] as Array<any>,
	settingSelect: {} as any,
	showDetail: false,
	popupWidth: '50%',
	drawerEnable: false,
	searchSetting: '',
});

// const comType = computed(() => {
// 	return !!props.uploadType ? props.uploadType : 'editor';
// });
const editSettingChange = (settingData: OptionsSetting) => {
	options.showDetail = false;
	userState.updateSetting(settingData, (response: any) => {
		appState.setParam(settingData.opts_code, settingData.opts_value);

		const index = appState.settingData.findIndex((item) => item['_id'] === settingData._id);
		if (index != -1) {
			appState.settingData[index] = deepClone(settingData);
		}
	});
};

const editSettingOpen = (settingData: OptionsSetting) => {
	options.settingSelect = settingData;
	options.showDetail = true;
};

const editSettingClose = () => {
	options.settingSelect = {};
	options.showDetail = false;
};

let resizeCleanup: (() => void) | undefined;
onUnmounted(() => resizeCleanup?.());

onMounted(() => {
	options.scrollerHeight = window.innerHeight - 60;
	resizeCleanup = onWindowResizeHandler(async () => {
		await nextTick(() => {
			options.scrollerHeight = window.innerHeight - 60;

			options.popupWidth = responsivePopup('50%');
		});
	});

	options.settingList = deepClone(appState.settingData);

	const itemsLoadAll = new Promise((resolve, reject) => {
		let settingInput: Array<any> = deepClone(appState.settingData);
		resolve(settingInput);
	});

	itemsLoadAll
		.then((data: any) => {
			restaurants.value = data;
		})
		.catch((error) => {
			restaurants.value = [];
		});
});

const restaurants: any = ref<RestaurantItem[]>([]);
function querySearch(queryString: string) {
	const findOptions = {
		// isCaseSensitive: false,
		// includeScore: false,
		// shouldSort: true,
		// includeMatches: true,
		// findAllMatches: true,
		// minMatchCharLength: 1,
		// location: 0,
		// threshold: 0.6,
		// distance: 100,
		// useExtendedSearch: false,
		// ignoreLocation: false,
		// ignoreFieldNorm: false,
		// fieldNormWeight: 1,
		keys: [
			{
				name: 'opts_group',
				weight: 0.1,
			},
			{
				name: 'opts_label',
				weight: 0.5,
			},
			{
				name: 'opts_code',
				weight: 0.7,
			},
		],
		includeScore: true,
		useExtendedSearch: true,
	};

	const fuseSearch = new Promise(function (resolve, reject) {
		const fuse = new Fuse(restaurants.value, findOptions);
		const results = queryString ? fuse.search("'" + queryString).map((val) => val.item) : restaurants.value;

		if (!!results) {
			resolve(results);
		} else {
			reject([]);
		}
	});

	// call callback function to return suggestions
	fuseSearch
		.then((data: any) => {
			options.settingList = data;
		})
		.catch((error) => {
			console.log('error', error);
		});
}
</script>

<style lang="scss">
.block-item {
	padding: 7px 10px;
	border-bottom: 1px dashed var(--el-border-color);
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.block-item:last-child {
	border-bottom: 0px;
}

.block-item .block-title {
	min-width: 150px;
}

.block-item .block-input {
	flex-grow: 1;
	text-align: right;

	:deep(.el-select-dropdown) {
		text-align: left;
	}
}
</style>
