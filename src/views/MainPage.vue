<template>
	<sd-crud-form
		v-if="!!appState.params['site_index_formid']"
		:form-id="appState.params['site_index_formid']"
		:show-title="false"
		:next-insert="true"
		:user-state="userState"></sd-crud-form>
	<template v-else>
		<sd-html-editor
			v-if="!!appState.params['site_index_content']"
			v-model="appState.params['site_index_content']"
			:mode="'mini'"
			:readonly="true"
			:user-state="userState"></sd-html-editor>
	</template>
</template>

<script lang="ts" setup>
import { useAppStateStore } from '~/stores/AppState';
import { useConnectStateStore } from '~/stores/ConnectState';
import { SdCrudForm } from 'sd-render';

const appState = useAppStateStore();
const userState: any = useConnectStateStore();
</script>
