import axios from 'axios';
import { ElMessage } from 'element-plus';
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { API_URL } from '~/config/AppConfig';
import { useAppStateStore } from '~/stores/AppState';
import { useConnectStateStore } from '~/stores/ConnectState';

//can, anyCan, notCan
const routes: Array<RouteRecordRaw> = [
	{
		path: '',
		name: 'home',
		meta: {
			title: 'Home',
		},
		component: () => import('~/views/MainPage.vue'),
	},
	{
		path: '/user/login',
		name: 'login',
		meta: {
			title: 'Log In',
		},
		component: () => import('~/views/user/Login.vue'),
	},
	{
		path: '/user/profile',
		name: 'profile',
		meta: {
			title: 'Profile',
		},
		component: () => import('~/views/user/Profile.vue'),
	},
	{
		path: '/user/register',
		name: 'register',
		meta: {
			title: 'Register',
		},
		component: () => import('~/views/user/Register.vue'),
	},
	{
		path: '/user/confirm',
		name: 'confirm',
		meta: {
			title: 'Confirm Email',
		},
		component: () => import('~/views/user/ConfirmEmail.vue'),
	},
	{
		path: '/user/forgot-password',
		name: 'forgot-password',
		meta: {
			title: 'Forgot Password',
		},
		component: () => import('~/views/user/ForgotPassword.vue'),
	},
	{
		path: '/user/change-password',
		name: 'change-password',
		meta: {
			title: 'Change Password',
		},
		component: () => import('~/views/user/ChangePassword.vue'),
	},
	{
		path: '/user/user-manage',
		name: 'user-manage',
		meta: {
			title: 'User Manage',
			anyCan: ['super', 'admin', 'manager'],
		},
		component: () => import('~/views/user/UserManage.vue'),
	},
	{
		path: '/admin/files-manager',
		name: 'files-manager',
		meta: {
			title: 'Files Manager',
			anyCan: ['super', 'admin'],
		},
		component: () => import('~/views/core/FilesManager.vue'),
	},
	{
		path: '/admin/setting-manager',
		name: 'setting-manager',
		meta: {
			title: 'Setting Manager',
			anyCan: ['super', 'admin'],
		},
		component: () => import('~/views/core/SettingManager.vue'),
	},
	{
		path: '/unauthorized',
		name: 'unauthorized',
		meta: {
			title: 'Unauthorized',
		},
		component: () => import('~/components/layouts/Unauthorized.vue'),
	},
	{
		path: '/admin/roles-manager',
		name: 'roles-manager',
		meta: {
			title: 'Roles Manager',
			anyCan: ['super', 'admin'],
		},
		component: () => import('~/views/core/RolesManager.vue'),
	},
	{
		path: '/module',
		name: 'app-list',
		meta: {
			title: 'App List',
		},
		component: () => import('~/views/modules/AppList.vue'),
	},
	{
		path: '/module/app-viewer',
		name: 'app-viewer',
		meta: {
			title: 'App Viewer',
		},
		component: () => import('~/views/modules/AppViewer.vue'),
	},
	{
		path: '/sdform/public-app',
		name: 'public-app',
		meta: {
			title: 'Public App',
		},
		component: () => import('~/views/modules/PublicApp.vue'),
	},
	{
		path: '/user/enable-2fa',
		name: 'enable-2fa',
		meta: {
			title: '2FA Enable',
		},
		component: () => import('~/views/user/TwoFactorEnable.vue'),
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

export default router;

router.beforeEach(async (to, from) => {
	//before load page
	// redirect to login page if not logged in and trying to access a restricted page
	const publicPages = ['/user/login', '/user/register', '/user/forgot-password', '/user/confirm', '/sdform/public-app'];
	const authRequired = !publicPages.includes(to.path);
	const userState = useConnectStateStore();
	const appState = useAppStateStore();
	appState.loading = true;

	const { getRoles } = await import('~/config/StartApp');
	await getRoles();

	if (!!to.query.auth && to.query.auth !== '') {
		// const api = axios.create({
		// 	withCredentials: true,
		// });

		await axios
			.post(
				API_URL + '/user/me',
				{},
				{
					headers: {
						Authorization: `Bearer ${to.query.auth}`,
					},
				}
			)
			.then((response) => {
				if (!!response.data) {
					localStorage.setItem('user', JSON.stringify(response.data));
					userState.user = response.data;

					if (!!userState.user && !!userState.user.two_factor_enabled) {
						userState.require2FA = true;
					}

					if (!!userState.user && !!userState.user.connectInfo) {
						userState.connectInfo = userState.user.connectInfo;
					} else {
						userState.connectInfo = { license_token: '', register_id: '' };
					}
					// คง public_key จาก .env เสมอ — ใช้ decode form_model
					// userState.connectInfo.public_key = import.meta.env.VITE_PUBLIC_KEY;

					userState.startRefreshTokenTimer();
					if (!!userState.returnUrl) {
						router.push(userState.returnUrl);
					} else {
						router.push('/');
					}
				} else {
					ElMessage.warning('Login failed.');
					router.push('/user/login');
				}
			})
			.catch((error) => {
				if (!!error.response && !!error.response.data && !!error.response.data.message) {
					ElMessage.warning(error.response.data.message);
				} else {
					ElMessage.warning(error.message);
				}
				router.push('/user/login');
			});
	}

	if (!authRequired && !!userState.user) {
		return '/';
	}

	if (authRequired && !userState.user) {
		userState.returnUrl = to.fullPath;
		return '/user/login';
	}
});

router.afterEach((to, from) => {
	//after load page
	const appState = useAppStateStore();
	appState.loading = false;
});
