<template>
	<el-scrollbar class="mt-1" :height="`${options.scrollerHeight}px`">
		<el-row class="mt-5 mb-5 p-5">
			<el-col :xs="0" :sm="5" :md="7" :lg="8" :xl="9"></el-col>
			<el-col :xs="24" :sm="14" :md="10" :lg="8" :xl="6">
				<el-card shadow="never" class="box-card" header="Two-Factor Setup">
					<el-button v-if="!userState.require2FA" type="primary" plain @click="setup2FA">
						<el-icon><Iphone /></el-icon> <span>Enable 2FA</span>
					</el-button>

					<el-alert v-if="!!userState.require2FA" title="2FA Enabled" type="success" :closable="false" />
				</el-card>

				<p></p>

				<el-card v-if="!!userState.require2FA" shadow="never" class="box-card" header="Two-Factor Disable">
					<el-form ref="disable2faFormRef" :model="disable2FA" label-position="top" size="large" :label-width="'140px'" @keyup.enter.prevent="disable2faForm(disable2faFormRef)">
						<el-form-item label="Token" prop="token2fa" :rules="otpRules" class="otp-form-item">
							<el-input-otp v-model="disable2FA.token2fa" :length="6" @finish="disable2faForm(disable2faFormRef)" />
						</el-form-item>

						<el-form-item>
							<el-button type="primary" @click.prevent="disable2faForm(disable2faFormRef)">Disable</el-button>
						</el-form-item>
					</el-form>
				</el-card>

				<el-card v-if="!!options.qr && userState.require2FA === false" shadow="never" class="box-card" header="2FA Verify">
					<div style="text-align: center">
						<img :src="options.qr" />
					</div>

					<el-form ref="twoFactorFormRef" :model="verify2FA" label-position="top" size="large" :label-width="'140px'" @keyup.enter.prevent="submitForm(twoFactorFormRef)">
						<el-form-item label="Token" prop="token2fa" :rules="otpRules" class="otp-form-item">
							<el-input-otp v-model="verify2FA.token2fa" :length="6" @finish="submitForm(twoFactorFormRef)" />
						</el-form-item>

						<el-form-item>
							<el-button type="primary" @click.prevent="submitForm(twoFactorFormRef)">Verify</el-button>
						</el-form-item>
					</el-form>
				</el-card>
			</el-col>
		</el-row>
	</el-scrollbar>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, reactive, ref, nextTick } from 'vue';
import { onWindowResizeHandler } from '~/utils/Util';
import { useRoute } from 'vue-router';
import { ElMessage, type FormInstance } from 'element-plus';
import axios from 'axios';
import { useConnectStateStore } from '~/stores/ConnectState';

const userState = useConnectStateStore();
const options = reactive({
	scrollerHeight: 0,
	qr: '',
});

const twoFactorFormRef = ref<FormInstance>();
const disable2faFormRef = ref<FormInstance>();
const route = useRoute();
const verify2FA = reactive({
	token2fa: '',
});
const disable2FA = reactive({
	token2fa: '',
});

// OTP 6-digit validation — required + ครบ 6 หลัก (เป็นตัวเลข)
const otpRules = [
	{ required: true, message: 'Please enter the 6-digit code', trigger: 'change' },
	{ pattern: /^\d{6}$/, message: 'Code must be 6 digits', trigger: 'change' },
];

let resizeCleanup: (() => void) | undefined;
onUnmounted(() => resizeCleanup?.());

onMounted(() => {
	options.scrollerHeight = window.innerHeight - 60;
	resizeCleanup = onWindowResizeHandler(async () => {
		await nextTick(() => {
			options.scrollerHeight = window.innerHeight - 60;
		});
	});
});

const setup2FA = async () => {
	await axios
		.post(
			`${userState.host}/user/2fa-setup`,
			{},
			{
				headers: {
					Authorization: `Bearer ${userState.user?.token}`,
				},
			}
		)
		.then((response) => {
			const data: {
				qrcode: string;
				secret: string;
			} = response.data;

			if (!!data.qrcode) {
				options.qr = data.qrcode;
			}
		})
		.catch((error) => {
			// If the login fails, display an error message
			if (!!error.response && !!error.response.data && !!error.response.data.message) {
				ElMessage.warning(error.response.data.message);
			} else {
				ElMessage.warning(error.message);
			}
		});
};

const submitForm = (formEl: FormInstance | undefined) => {
	if (!formEl) return;
	formEl.validate(async (valid: any): Promise<void> => {
		if (valid) {
			await axios
				.post(`${userState.host}/user/2fa-verify`, verify2FA, {
					headers: {
						Authorization: `Bearer ${userState.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && response.data.message) {
						ElMessage.success(response.data.message);
					} else {
						ElMessage.success('2FA Enable success.');
					}
					if (!!userState.user) {
						userState.user.two_factor_enabled = true;
						localStorage.setItem('user', JSON.stringify(userState.user));
					}
					userState.require2FA = true;
				})
				.catch((error) => {
					// If the login fails, display an error message
					// console.log(error);
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
				});
		} else {
			// ElMessage.warning('validate error');
			// return false;
		}
	});
};

const disable2faForm = (formEl: FormInstance | undefined) => {
	if (!formEl) return;
	formEl.validate(async (valid: any): Promise<void> => {
		if (valid) {
			await axios
				.post(`${userState.host}/user/2fa-disable`, disable2FA, {
					headers: {
						Authorization: `Bearer ${userState.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && response.data.message) {
						ElMessage.success(response.data.message);
					} else {
						ElMessage.success('2FA Disabled.');
					}
					if (!!userState.user) {
						userState.user.two_factor_enabled = false;
						localStorage.setItem('user', JSON.stringify(userState.user));
					}
					userState.require2FA = false;
					options.qr = '';
				})
				.catch((error) => {
					// If the login fails, display an error message
					// console.log(error);
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
				});
		} else {
			// ElMessage.warning('validate error');
			// return false;
		}
	});
};
</script>

<style lang="scss" scoped>
// จัด OTP input ให้อยู่กลาง form-item
.otp-form-item :deep(.el-form-item__content) {
	justify-content: center;
}
</style>
