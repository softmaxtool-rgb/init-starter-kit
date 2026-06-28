<template>
	<div style="display: flex; justify-content: center">
		<el-row class="m-5" :style="`width: ${options.popupWidth};`">
			<el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24" v-if="!!options.showHeader && !!options.showApp">
				<h1 id="page-header" tabindex="-1" style="margin-top: 0px; margin-bottom: 10px; border-bottom: 1px solid var(--el-border-color)">
					<svg-data v-if="options.iconForm != ''" :svg-data="options.iconForm"></svg-data><svg-icon v-else icon-name="icon-sdform" /> {{ options.popupName }}
					<el-tag type="success" v-if="!!options.versionForm">{{ options.versionForm }}</el-tag>
					<el-switch v-model="appState.isDark" inline-prompt active-icon="Sunny" inactive-icon="Moon" style="float: right" />
				</h1>
			</el-col>
			<el-col :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
				<el-alert :show-icon="true" title="Token not found." v-if="!!!options.token" :closable="false" type="warning" />

				<div v-if="options.activeForm && !!options.showApp && !!!options.commit">
					<SdCrudFormAsync
						v-if="!!options.formId"
						ref="formRef"
						:form-id="options.formId"
						:data-id="options.dataId"
						:parent-id="options.parentId"
						:user-state="(connectState as any)"
						:show-footer="options.showFooter"
						:after-save="afterSaveCallback">
					</SdCrudFormAsync>
				</div>
				<div v-else-if="!!options.commit && !!options.showApp">
					<sd-html-editor v-if="!!options.showCommit" v-model="options.commitContent" :mode="'mini'" :readonly="true" :user-state="connectState"></sd-html-editor>

					<div v-if="!!options.editEnable" style="text-align: center; margin-top: 15px; margin-bottom: 15px">
						<el-button type="primary" plain icon="Edit" @click.stop="editCallback">Edit Data</el-button>
					</div>
				</div>
				<EmptyContent v-else />
			</el-col>
		</el-row>
	</div>
</template>

<script lang="ts" setup>
import { reactive, onMounted, ref, defineAsyncComponent } from 'vue';
import { useAppStateStore } from '~/stores/AppState';
import { deepClone } from '~/utils/Util';
import { useConnectStateStore } from '~/stores/ConnectState';
import axios from 'axios';
import { useDark } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { API_URL } from '~/config/AppConfig';
import { type SdFormType } from '~/types/SdForm';
import EmptyContent from '~/components/layouts/EmptyContent.vue';
import LoadingContent from '~/components/layouts/LoadingContent.vue';

const SdCrudFormAsync = defineAsyncComponent({
	loader: () => import('sd-render').then((m) => m.SdCrudForm),
	loadingComponent: LoadingContent,
	delay: 100,
	errorComponent: EmptyContent,
	timeout: 10000,
});

const appState = useAppStateStore();
const connectState = useConnectStateStore();
const route = useRoute();
const router = useRouter();

const formRef = ref(null);

const options = reactive({
	scrollerHeight: 0,
	activeForm: false,
	sdformModel: {} as SdFormType,
	showApp: false,
	formId: '',
	parentId: !!route.query.parentid ? route.query.parentid.toString() : '',
	dataId: !!route.query.dataid ? route.query.dataid.toString() : '',
	token: !!route.query.token ? route.query.token.toString() : '',
	commit: !!route.query.commit ? route.query.commit.toString() : '',
	iconForm: '',
	popupName: '',
	titleNameForm: '',
	popupWidth: '70px',
	versionForm: 'v1',
	showHeader: true,
	showFooter: true,
	showCommit: true,
	commitContent: '',
	showResult: true,
	editEnable: false,
	uuid: '',
});

const editCallback = async () => {
	//commit page
	const dataid = localStorage.getItem(`token_${options.uuid}`);

	await router.push('/sdform/public-app?token=' + options.token + `&parentid=${options.parentId}&dataid=${dataid}`);
};

const afterSaveCallback = async (data: any, autoSave: boolean) => {
	//commit page
	localStorage.setItem(`token_${options.uuid}`, data._id);

	await router.push('/sdform/public-app?token=' + options.token + `&parentid=${options.parentId}&dataid=${data._id}&commit=1`);
};

function initForm(sdform: SdFormType) {
	options.sdformModel = sdform;
	connectState.formStore[options.formId] = options.sdformModel;

	options.titleNameForm = !!options.sdformModel.form_name ? options.sdformModel.form_name : '';

	options.popupName = `${options.titleNameForm}`;

	if (!!options.sdformModel.form_options && !!options.sdformModel.form_options.popup_size) {
		options.popupWidth = `${options.sdformModel.form_options.popup_size}%`;
	}

	if (!!options.sdformModel.form_icon) {
		options.iconForm = options.sdformModel.form_icon;
	} else {
		options.iconForm = '';
	}

	options.versionForm = options.sdformModel.form_version || 'v1';
	if (!!options.sdformModel.form_share.form_token) {
		options.showHeader = options.sdformModel.form_share.form_token?.token_header;
		options.showFooter = options.sdformModel.form_share.form_token?.token_footer;
		options.showCommit = options.sdformModel.form_share.form_token?.token_commit;
		options.commitContent = options.sdformModel.form_share.form_token?.token_commit_content;
		options.editEnable = options.sdformModel.form_share.form_token?.token_edit;
		options.showResult = options.sdformModel.form_share.form_token?.token_result;
		options.uuid = options.sdformModel.form_share.form_token?.token_uid;
	}

	options.dataId = localStorage.getItem(`token_${options.uuid}`) || '';

	options.activeForm = true;
}

onMounted(async () => {
	appState.isDark = useDark();
	options.showApp = false;
	options.activeForm = false;
	if (!!options.token) {
		axios
			.post(`${connectState.host}/widget/sdform/token-verify`, { token: options.token })
			.then((response) => {
				if (!!response.data) {
					connectState.user = deepClone(response.data.user);
					connectState.host = API_URL;
					const formData = deepClone(response.data.data);
					formData.dataid = formData._id;
					options.formId = formData._id;
					options.showApp = true;
					initForm(formData);
				}
			})
			.catch((error) => {
				if (!!error.response.data && !!error.response.data.message) {
					ElMessage.warning(error.response.data.message);
				} else {
					ElMessage.warning(error.message);
				}
			});
	}

});
</script>
