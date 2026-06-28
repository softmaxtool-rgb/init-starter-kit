<template>
	<el-scrollbar class="login-page" :height="`${options.scrollerHeight}px`">
		<el-row class="mt-20 mb-20 p-5">
			<el-col :xs="0" :sm="5" :md="7" :lg="8" :xl="9"></el-col>
			<el-col :xs="24" :sm="14" :md="10" :lg="8" :xl="6">
				<el-card shadow="never" class="box-card">
					<el-row class="mb-3">
						<el-col :span="24" class="text-8" style="text-align: center; font-weight: 400; margin: 10px 0px">
							<span style="position: relative">
								<el-avatar v-if="options.logoType === 'img'" shape="square" :size="58" :src="APP_IMG_LOGO" style="margin-right: 130px" />
								<SvgIcon v-else :icon-name="!!appState.params.app_svg_logo ? appState.params.app_svg_logo : APP_SVG_LOGO" class="mr-1 text-28" />
								<div class="ml-1" style="">
									{{ !!appState.params.app_name ? appState.params.app_name : APP_NAME }}
								</div>
							</span>
						</el-col>
						<el-col :span="24" class="text-5" style="text-align: center; margin: 10px 0px; color: #626aef"> Welcome Back </el-col>
						<el-col :span="24" class="text-3.3" style="text-align: center; margin: 10px 0px">
							<el-icon><Unlock /></el-icon> Sign in to continue to {{ !!appState.params.app_name ? appState.params.app_name : APP_NAME }}
						</el-col>
					</el-row>

					<el-form ref="loginFormRef" :model="loginModel" :label-position="'left'" :size="'large'" @keyup.enter.prevent="submitForm(loginFormRef)">
						<el-form-item prop="username" required>
							<el-input v-model="loginModel.username" placeholder="Username" type="text" :clearable="true" prefix-icon="User" />
						</el-form-item>
						<el-form-item prop="password" required>
							<el-input v-model="loginModel.password" placeholder="Password" type="password" :clearable="true" autocomplete="off" prefix-icon="Key" show-password />
						</el-form-item>
						<el-checkbox v-model="loginModel.remember" label="Remember me" />
						<el-row class="mb-3">
							<el-button type="primary" round plain @click.prevent="submitForm(loginFormRef)" icon="Unlock" style="width: 100%"> Login </el-button>
						</el-row>
						<el-row class="mb-3">
							<el-button type="info" icon="Key" round plain style="width: 100%" @click="router.push('/user/forgot-password')"> Forgot your password? </el-button>
						</el-row>
						<el-row class="mb-3">
							<el-button type="success" icon="User" round plain style="width: 100%" @click="router.push('/user/register')"> Sign Up </el-button>
						</el-row>
						<el-row class="mb-3" v-if="!!appState.params.google_oauth2">
							<el-button round plain style="width: 100%" @click="redirectToGoogleOauth2"><svg-icon icon-name="icon-google" /> <span>Google Login</span> </el-button>
						</el-row>
					</el-form>

					<el-form
						v-if="!!userState.require2FA"
						ref="login2faFormRef"
						:model="verify2FA"
						label-position="top"
						size="large"
						:label-width="'140px'"
						@keyup.enter.prevent="login2FAForm(login2faFormRef)">
						<el-form-item label="Two-Factor Authentication" prop="token" :rules="otpRules" class="otp-form-item">
							<el-input-otp v-model="verify2FA.token" :length="6" @finish="login2FAForm(login2faFormRef)" />
						</el-form-item>

						<el-row class="mb-3">
							<el-button type="primary" icon="Ticket" round plain style="width: 100%" @click.prevent="login2FAForm(login2faFormRef)">Verify</el-button>
						</el-row>
						<el-row class="mb-3">
							<el-button type="info" icon="ArrowLeftBold" round plain style="width: 100%" @click="black2Login"> Go back </el-button>
						</el-row>
					</el-form>
				</el-card>
			</el-col>
		</el-row>
	</el-scrollbar>
</template>

<script lang="ts" setup>
import { useDark } from '@vueuse/core';
import { computed, onMounted, onUnmounted, ref, reactive, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { type FormInstance } from 'element-plus';
import { APP_IMG_LOGO, APP_LOGO_TYPE, APP_NAME, APP_SVG_LOGO, API_URL } from '~/config/AppConfig';
import { onWindowResizeHandler } from '~/utils/Util';
import router from '~/routers';
import { useAppStateStore } from '~/stores/AppState';
import { useConnectStateStore } from '~/stores/ConnectState';

const appState = useAppStateStore();
const userState = useConnectStateStore();
const options = reactive<any>({
	scrollerHeight: 0,
	logoType: APP_LOGO_TYPE,
});

let resizeCleanup: (() => void) | undefined;
onUnmounted(() => resizeCleanup?.());

onMounted(() => {
	appState.isDark = useDark();

	options.scrollerHeight = window.innerHeight;
	resizeCleanup = onWindowResizeHandler(async () => {
		await nextTick(() => {
			options.scrollerHeight = window.innerHeight;
		});
	});
});

const route = useRoute();
const route_title = computed(() => route.meta.title || 'SdForm');

let username = localStorage.getItem('user-remember');

const loginFormRef = ref<FormInstance>();
const loginModel = reactive<any>({
	username: username,
	password: null,
	remember: !!username ? true : false,
});

const login2faFormRef = ref<FormInstance>();
const verify2FA = reactive({
	token: '',
});

// OTP 6-digit validation — required + ครบ 6 หลัก (เป็นตัวเลข)
const otpRules = [
	{ required: true, message: 'Please enter the 6-digit code', trigger: 'change' },
	{ pattern: /^\d{6}$/, message: 'Code must be 6 digits', trigger: 'change' },
];

const submitForm = (formEl: FormInstance | undefined) => {
	if (!formEl) return;
	formEl.validate(async (valid: any): Promise<void> => {
		if (valid) {
			userState.login(loginModel);
		} else {
			// return false;
		}
	});
};

const redirectToGoogleOauth2 = () => {
	window.location.href = API_URL + '/user/login/google';
};

const black2Login = () => {
	userState.require2FA = false;
};

const login2FAForm = (formEl: FormInstance | undefined) => {
	if (!formEl) return;
	formEl.validate(async (valid: any): Promise<void> => {
		if (valid) {
			userState.login2fa({
				token: verify2FA.token,
				username: userState.user2Fa,
			});
		}
	});
};
</script>

<style lang="scss" scoped>
.login-page {
	background-color: #8ec5fc;
	background-image: linear-gradient(62deg, #8ec5fc 0%, #e0c3fc 100%);
}

// จัด OTP input ให้อยู่กลาง form-item
.otp-form-item :deep(.el-form-item__content) {
	justify-content: center;
}

.dark .login-page {
	// background-image: linear-gradient(to right, #ffecd2 0%, #fcb69f 100%);
	background:
		linear-gradient(to bottom, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.15) 100%),
		radial-gradient(at top center, rgba(255, 255, 255, 0.4) 0%, rgba(0, 0, 0, 0.4) 120%) #989898;
	background-blend-mode: multiply, multiply;
}
</style>
