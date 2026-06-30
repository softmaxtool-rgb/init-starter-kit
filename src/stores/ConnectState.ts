import { type SdUserLogin } from './../types/User';
import { defineStore } from 'pinia';
import axios from 'axios';
import { API_URL, REFRESH_TOKEN } from '~/config/AppConfig';
import { ElMessage } from 'element-plus';
import { type ConnectProject } from '~/types/Connect';
import { type SdProvider } from '~/types/SdGridType';
import { type SdNotify, type wsDataReceive, type wsDataSend } from '~/types/Notify';
import { useRouter } from 'vue-router';
import { deepClone } from '~/utils/Util';

export type ConnectStateStore = ReturnType<typeof useConnectStateStore>;

export type ConnectWs = {
	socket: WebSocket;
	wsTimeout: any;
	wsDisconnect: Function;
	wsSend: (data: wsDataSend) => void;
};

axios.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.response && error.response.status === 401) {
			const userState = useConnectStateStore();

			userState.require2FA = false;
			userState.user = null;

			if (!!userState.wsConn) {
				userState.wsConn?.wsDisconnect();
			}

			localStorage.removeItem('connect');

			userState.stopRefreshTokenTimer();

			window.location.href = '/user/login';

			ElMessage.error('Session expired. Please login again.');
		}
		return Promise.reject(error);
	}
);

export const useConnectStateStore = defineStore('connectState', {
	state: () => ({
		user: (localStorage.getItem('connect') ? JSON.parse(localStorage.getItem('connect') || '{}') : null) as SdUserLogin | null,
		returnUrl: null as any,
		require2FA: false,
		user2Fa: '',
		refreshTokenTimeout: null as any,
		host: API_URL, //API_URL
		router: useRouter(),
		systemRoles: ['super', 'admin', 'manager', 'auth', 'user'],
		// public_key มาจาก .env (VITE_PUBLIC_KEY) — decode form_model ใช้ key นี้ (decode path 1)
		connectInfo: { license_token: '', register_id: '', public_key: import.meta.env.VITE_PUBLIC_KEY } as ConnectProject,
		formStore: {} as any,
		versionStore: {} as any,
		appParams: {} as any,
		wsConn: undefined as ConnectWs | undefined,
		// notify socket = session-level (เปิดครั้งเดียวจาก ensureNotifySocket) — bridge event ไป UI ผ่าน seq+last
		notifySeq: 0, // bump ทุกครั้งที่มี notify ใหม่ผ่าน filter → ให้ NavHeader watch
		notifyLast: null as SdNotify | null, // payload ล่าสุดที่ผ่าน filter แล้ว
	}),

	actions: {
		connectWebSocket(channel: string, clientId: string, widgetId: string, onMessage: (data: wsDataReceive) => void, onError?: (event: Event) => void): ConnectWs {
			const apiUrl = !!this.host ? this.host : API_URL;
			const hostArr = apiUrl.split('//');
			let protocol = 'ws';
			let domain = !!hostArr[1] ? hostArr[1] : hostArr[0];

			if (!!hostArr[0] && hostArr[0].includes('https')) {
				protocol = 'wss';
			}
			let wsTimeout: any = null;
			let pingInterval: any = null;
			let connStatus: boolean = false; // เคยต่อสำเร็จอย่างน้อย 1 ครั้ง → อนุญาตให้ reconnect
			let manualClose: boolean = false; // caller สั่งปิดเอง → ห้าม reconnect
			let socket!: WebSocket; // mutable: reconnect จะแทนที่ตัวนี้ใน closure เดิม (handle ที่ caller ถือไม่เปลี่ยน)
			const wsUrl = `${protocol}://${domain}/v1/ws/${channel}?client=${clientId}&widget=${widgetId}&token=${this.user?.token}`;

			// สร้าง socket + ผูก handler หนึ่งตัว — เรียกซ้ำได้ตอน reconnect โดยไม่สร้าง connection ลอยที่ไม่มีใครถือ handle
			const setupSocket = () => {
				socket = new WebSocket(wsUrl);

				socket.onmessage = (event) => {
					if (!!onMessage) {
						onMessage(JSON.parse(event.data));
					}
				};

				socket.onopen = (event) => {
					connStatus = true;
					console.log(`(channel:${channel}) ` + 'onSockerOpen...');

					pingInterval = setInterval(() => {
						if (socket.readyState === WebSocket.OPEN) {
							socket.send(JSON.stringify({ type: 'ping' }));
						}
					}, 45000);
				};

				socket.onerror = (event) => {
					if (!!onError) {
						onError(event);
					}
					console.log(`(channel:${channel}) ` + 'onSockerError', event);
				};

				socket.onclose = (event) => {
					console.log(`(channel:${channel}) ` + 'onSockerClose...');

					if (pingInterval) clearInterval(pingInterval);
					if (!!wsTimeout) clearTimeout(wsTimeout);

					// reconnect เฉพาะตอนที่เคยต่อติดแล้วหลุดเอง และ caller ยังไม่ได้สั่งปิด
					if (connStatus && !manualClose) {
						wsTimeout = setTimeout(() => {
							console.log(`(channel:${channel}) ` + 'Attempting to reconnect...');
							setupSocket(); // แทนที่ socket เดิมใน closure — ไม่สร้าง handle ลอย
						}, 5000);
					}
				};
			};

			setupSocket();

			const wsDisconnect = () => {
				manualClose = true;
				if (!!wsTimeout) clearTimeout(wsTimeout);
				if (pingInterval) clearInterval(pingInterval);
				// ปิดได้แม้ socket ยัง CONNECTING (กัน reconnect ค้างตอน unmount เร็ว)
				if (!!socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
					socket.close();
				}
			};

			const wsSend = (data: wsDataSend) => {
				if (!!socket && socket.readyState === WebSocket.OPEN) {
					data.from = this.user?.username;
					socket.send(JSON.stringify(data));
				} else {
					ElMessage.warning('Not connected to the WebSocket.');
				}
			};

			return {
				wsTimeout: wsTimeout,
				get socket() {
					return socket; // getter → คืน socket ตัวปัจจุบันเสมอแม้หลัง reconnect
				},
				wsDisconnect: wsDisconnect,
				wsSend: wsSend,
			};
		},
		// เปิด notify socket แบบ idempotent — เปิดครั้งเดียวต่อ session
		// เรียกได้จากทั้ง login(), login2fa() และ NavHeader onMounted (เคส refresh page ที่ user มาจาก localStorage)
		ensureNotifySocket() {
			if (!this.user || !!this.wsConn) return; // ยังไม่ login หรือเปิดอยู่แล้ว → ไม่ต้องทำซ้ำ

			this.wsConn = this.connectWebSocket('notify', 'broadcast', '', (payload) => {
				if (payload.from != 'server' && payload.method == 'insert') {
					const rowData: SdNotify = deepClone(payload.data);
					let notifyStatus = false;

					if (rowData.mode == 'broadcast') {
						notifyStatus = true;
					} else if (rowData.mode == 'target' && !!rowData.target) {
						if (!!this.user && !!this.user.username && rowData.target.includes(this.user.username)) {
							notifyStatus = true;
						}
					} else if (rowData.mode == 'site' && !!rowData.site) {
						if (!!this.user && !!this.user.site && !!this.user.site.code && rowData.site.includes(this.user.site.code)) {
							notifyStatus = true;
						}
					} else if (rowData.mode == 'unit' && !!rowData.unit) {
						if (!!this.user && !!this.user.unit && !!this.user.unit.code && rowData.unit.includes(this.user.unit.code)) {
							notifyStatus = true;
						}
					}

					// ผ่าน filter → ส่งต่อให้ UI (NavHeader watch notifySeq) จัดการ notification/count เอง
					if (notifyStatus) {
						this.notifyLast = rowData;
						this.notifySeq++;
					}
				}
			});
		},
		getAvatar() {
			if (!!this.user && !!this.user.avatar && this.user.avatar[0]) {
				// const avatar: any = this.user.avatar[0];
				// console.log(window.APP_CONFIG.ASSETS_URL + '/users/' + avatar.response.fileName);
				// if (!!avatar.response) {
				// 	return window.APP_CONFIG.ASSETS_URL + '/users/' + avatar.response.fileName;
				// }
				if (!!this.user && !!this.user.avatar && this.user.avatar[0]) {
					const avatar: any = this.user.avatar[0];
					if (!!avatar.url) {
						return avatar.url;
					}
				}
			}

			return window.APP_CONFIG.ASSETS_URL + '/image/nouser.jpeg';
			// if (!!this.user && !!this.user.avatar && this.user.avatar[0] && !!this.host) {
			// 	const hostSplit = this.host.split('/');
			// 	let hostPath = '';
			// 	if (hostSplit.length > 0) {
			// 		hostPath = hostSplit[hostSplit.length - 1] || '';
			// 	}

			// 	const avatar: any = this.user.avatar[0];
			// 	if (!!avatar.response) {
			// 		return this.host.replace(hostPath, '') + 'assets/users/' + avatar.response.fileName;
			// 	}
			// }
			// return `${ASSETS_URL}/image/nouser.jpeg`;
		},
		async login(data: any) {
			if (!!data.remember) {
				localStorage.setItem('user-remember', data.username);
			} else {
				localStorage.removeItem('user-remember');
			}
			data.conn = false;
			await axios
				.post(`${this.host}/user/login`, data)
				.then((response) => {
					if (!!response.data && !!response.data.user_id) {
						if (!!response.data.two_factor_enabled) {
							this.require2FA = true;
							this.user2Fa = response.data.username || response.data.user_id;
						} else {
							localStorage.setItem('connect', JSON.stringify(response.data));
							this.user = response.data;
							if (!!this.user && !!this.user.connectInfo) {
								this.connectInfo = this.user.connectInfo;
							} else {
								this.connectInfo = { license_token: '', register_id: '' };
							}
							// คง public_key จาก .env เสมอ (user.connectInfo จาก backend ไม่มี key นี้) — ใช้ decode form_model
							// this.connectInfo.public_key = import.meta.env.VITE_PUBLIC_KEY;

							this.startRefreshTokenTimer();
							this.ensureNotifySocket(); // เปิด notify socket ครั้งเดียวหลัง login สำเร็จ
							if (!!this.returnUrl) {
								this.router.push(this.returnUrl);
							} else {
								this.router.push('/');
							}
						}
					} else {
						ElMessage.warning('User data not found.');
					}
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
		},
		async login2fa(data: any) {
			await axios
				.post(`${API_URL}/user/login2fa`, data)
				.then((response) => {
					// If the login is successful, save the user data and token

					if (!!response.data && !!response.data.user_id) {
						localStorage.setItem('connect', JSON.stringify(response.data));
						this.user = response.data;
						if (!!this.user && !!this.user.connectInfo) {
							this.connectInfo = this.user.connectInfo;
						} else {
							this.connectInfo = { license_token: '', register_id: '' };
						}
						// คง public_key จาก .env เสมอ — ใช้ decode form_model
						// this.connectInfo.public_key = import.meta.env.VITE_PUBLIC_KEY;

						this.startRefreshTokenTimer();
						this.ensureNotifySocket(); // เปิด notify socket ครั้งเดียวหลัง login2fa สำเร็จ
						if (!!this.returnUrl) {
							this.router.push(this.returnUrl);
						} else {
							this.router.push('/');
						}
					} else {
						ElMessage.warning('User data not found.');
					}
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
		},
		logout() {
			axios
				.post(`${API_URL}/user/logout`, this.user, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {})
				.catch((error) => {
					// If the login fails, display an error message
					// console.log(error);
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
				});
			this.require2FA = false;
			this.user = null;
			localStorage.removeItem('connect');

			if (!!this.wsConn) {
				this.wsConn?.wsDisconnect();
				this.wsConn = undefined; // ล้าง handle เพื่อให้ ensureNotifySocket เปิดใหม่ได้ตอน login รอบหน้า
			}

			this.stopRefreshTokenTimer();
			this.router.push('/user/login');
		},
		async refreshToken() {
			if (!!this.user && !!this.user.token) {
				await axios
					.post(
						`${this.host}/user/refresh-token`,
						{},
						{
							headers: {
								Authorization: `Bearer ${this.user?.token}`,
							},
						}
					)
					.then((response) => {
						// If the login is successful, save the user data and token
						if (!!response.data && !!response.data.token && this.user != null) {
							this.user.token = response.data.token;
							this.user.roles = response.data.roles;
							localStorage.setItem('connect', JSON.stringify(this.user));
							this.startRefreshTokenTimer();
						}
					})
					.catch((error) => {
						// If the login fails, display an error message
						// console.log(error);
						this.logout();
						if (!!error.response && !!error.response.data && !!error.response.data.message) {
							ElMessage.warning(error.response.data.message);
						} else {
							ElMessage.warning(error.message);
						}
					});
			}
		},
		async updateRoles(roles: string[], callbackSuccess?: Function, callbackError?: Function) {
			if (!!this.user && this.user.token) {
				await axios
					.put(`${this.host}/user/update-roles`, roles, {
						headers: {
							Authorization: `Bearer ${this.user?.token}`,
						},
					})
					.then((response) => {
						if (!!response.data && !!response.data.message) {
							ElMessage.success(response.data.message);
							if (!!callbackSuccess) {
								callbackSuccess(response.data);
							}
						} else {
							ElMessage.success('Update successful');
						}
					})
					.catch((error) => {
						if (!!callbackError) {
							callbackError();
						}
						if (!!error.response && !!error.response.data && !!error.response.data.message) {
							ElMessage.warning(error.response.data.message);
						} else {
							ElMessage.warning(error.message);
						}
					});
			}
		},
		startRefreshTokenTimer() {
			let timeout = REFRESH_TOKEN;

			if (!this.user || !this.user.token) return;

			const jwtBase64 = this.user.token.split('.')[1];
			if (!!jwtBase64) {
				const payload = JSON.parse(atob(jwtBase64));

				const expires = new Date(payload.exp * 1000);
				timeout = expires.getTime() - Date.now() - 60 * 1000;
			}

			this.refreshTokenTimeout = setTimeout(this.refreshToken, timeout);
		},
		stopRefreshTokenTimer() {
			clearTimeout(this.refreshTokenTimeout);
		},
		async register(data: any) {
			await axios
				.post(`${this.host}/user/register`, data)
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						ElMessage.success(response.data.message);
					} else {
						ElMessage.success('Register successful');
					}
					this.router.push('/user/login');
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
				});
		},
		async create(data: any, callback: Function | null = null) {
			await axios
				.post(`${this.host}/user/create`, data, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!callback) {
						callback(data);
					}
					if (!!response.data && !!response.data.message) {
						ElMessage.success(response.data.message);
					} else {
						ElMessage.success('Created successful');
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
				});
		},
		async update(data: any, userUpdate: boolean, callback: Function | null = null) {
			// data.updated_at = dayjs().format('YYYY-MM-DD HH:mm:ss')
			// data.updated_by = { id: this.user?.user_id, name: `${this.user?.fname} ${this.user?.lname} (${this.user?.email})` }

			await axios
				.put(`${this.host}/user/update-profile`, data, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (userUpdate) {
						let myroles: string[] = !!this.user && !!this.user.roles ? deepClone(this.user.roles) : [];
						response.data.roles = myroles;
						this.user = response.data;
						localStorage.setItem('connect', JSON.stringify(this.user));
					}

					if (!!callback) {
						callback(data);
					}

					if (!!response.data && !!response.data.message) {
						ElMessage.success(response.data.message);
					} else {
						ElMessage.success('Update successful');
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
				});
		},
		async delete(data: any) {
			await axios
				.delete(`${this.host}/user/delete`, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
					data: { username: data.username, avatar: data.profile.avatar },
				})
				.then((response) => {
					this.logout();

					if (!!response.data && !!response.data.message) {
						ElMessage.success(response.data.message);
					} else {
						ElMessage.success('Delete successful');
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
				});
		},
		async changePassword(data: any) {
			await axios
				.put(`${this.host}/user/change-password`, data, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					// If the login is successful, save the user data and token
					if (!!response && !!response.data && !!response.data.message) {
						ElMessage.success(response.data.message);
					} else {
						ElMessage.success('You have changed your password.');
					}

					this.router.push('/user/profile');
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
		},
		async deleteAvatar(avatar: any) {
			if (!!avatar) {
				for (const key in avatar) {
					if (Object.prototype.hasOwnProperty.call(avatar, key)) {
						const element = avatar[key];
						if (!!element.response && !!element.response.fileId) {
							axios
								.delete(`${this.host}/v1/files/remove-one`, {
									headers: {
										Authorization: `Bearer ${this.user?.token}`,
									},
									data: {
										fileName: element.response.fileName,
										fileGroup: element.response.fileGroup,
										fileId: element.response.fileId,
									},
								})
								.then((response) => {
									if (!!response && !!response.data && !!response.data.message) {
										ElMessage.success(response.data.message);
									} else {
										ElMessage.success('Delete avatar completed.');
									}
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
						}
					}
				}
			}
		},
		async updateSetting(data: any, callbackSuccess?: Function, callbackError?: Function) {
			if (!!this.user && this.user.token) {
				await axios
					.put(
						`${this.host}/core/setting/set-params`,
						{ dataid: data._id || undefined, data: data },
						{
							headers: {
								Authorization: `Bearer ${this.user?.token}`,
							},
						}
					)
					.then((response) => {
						if (!!response.data && !!response.data.message) {
							if (!!callbackSuccess) {
								callbackSuccess(response.data);
							}
						} else {
							if (!!callbackError) {
								callbackError();
							}
						}
					})
					.catch((error) => {
						if (!!callbackError) {
							callbackError();
						}
						if (!!error.response && !!error.response.data && !!error.response.data.message) {
							ElMessage.warning(error.response.data.message);
						} else {
							ElMessage.warning(error.message);
						}
					});
			}
		},
		// CRUD
		async crudCreate(params: { data: any; sdProvider: SdProvider }, callback?: Function, errorCallback?: Function) {
			await axios
				.post(`${this.host}/widget/crud/insert-data`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Cannot Insert data');
						if (!!errorCallback) {
							errorCallback();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!errorCallback) {
						errorCallback();
					}
				});
		},
		async crudUpdate(params: { id: any; data: any; sdProvider: SdProvider; upsert?: boolean }, callback?: Function, errorCallback?: Function) {
			if (!!params.data.dataid) {
				delete params.data.dataid;
			}

			if (!!!params.upsert) {
				params.upsert = false;
			}

			await axios
				.put(`${this.host}/widget/crud/update-data`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Cannot Update data');
						if (!!errorCallback) {
							errorCallback();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!errorCallback) {
						errorCallback();
					}
				});
		},
		async crudDelete(params: { id: any; sdProvider: SdProvider }, callback?: Function, errorCallback?: Function) {
			await axios
				.delete(`${this.host}/widget/crud/delete-data`, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
					data: params,
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Cannot Delete data');
						if (!!errorCallback) {
							errorCallback();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!errorCallback) {
						errorCallback();
					}
				});
		},

		async crudGetAll(params: { sdProvider: SdProvider; totalEnable: boolean }, callback?: Function, callbackError?: Function) {
			await axios
				.post(`${this.host}/widget/crud/getdata-all`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Data not found');
						if (!!callbackError) {
							callbackError(response);
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!callbackError) {
						callbackError(error.response);
					}
				});
		},
		async crudGetOne(params: { sdProvider: SdProvider }, callback?: Function, callbackError?: Function) {
			await axios
				.post(`${this.host}/widget/crud/getdata-one`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);

						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Data not found');
						if (!!callbackError) {
							callbackError(response);
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!callbackError) {
						callbackError(error.response);
					}
				});
		},
		async crudCheckUnique(params: { dataId: string; fieldName: string; fieldValue: any; sdProvider: SdProvider }, callbackRule: Function, fieldLabel?: string) {
			const label = !!fieldLabel ? fieldLabel : params.fieldName;
			await axios
				.post(`${this.host}/widget/crud/check-unique`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data) {
						if (response.data.notExists) {
							callbackRule();
						} else {
							callbackRule(new Error(`[${label}] Unique value already exists`));
						}
					} else {
						callbackRule(new Error(`[${label}] Unique value already exists`));
					}
				})
				.catch((error) => {
					callbackRule(new Error(`You not permission`));
				});
		},
		async exportData(params: { sdProvider: SdProvider; fileName: string; dynamicName: string }, callback?: Function, callbackError?: Function) {
			await axios
				.post(`${this.host}/widget/export/export-data`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Data not found');
						if (!!callbackError) {
							callbackError();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!callbackError) {
						callbackError();
					}
				});
		},

		async schemaRename(params: { rename: any; form_table: string }, callback?: Function, callbackError?: Function) {
			await axios
				.put(`${this.host}/build/sdform/schema-rename`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Cannot update schema');
						if (!!callbackError) {
							callbackError();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!callbackError) {
						callbackError();
					}
				});
		},
		async schemaArrayRename(params: { rename: any; form_table: string }, callback?: Function, callbackError?: Function) {
			await axios
				.put(`${this.host}/build/sdform/schema-rename-array`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Cannot update schema array');
						if (!!callbackError) {
							callbackError();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!callbackError) {
						callbackError();
					}
				});
		},

		async schemaCreateIndex(params: { form_id: string; indexField: string; indexType: any; form_table: string; form_index: any }, callback?: Function) {
			await axios
				.post(`${this.host}/build/sdform/schema-create-index`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Cannot update schema');
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
				});
		},

		async schemaDropIndex(params: { indexField: string; form_id: string; form_table: string; form_index: any }, callback?: Function) {
			await axios
				.post(`${this.host}/build/sdform/schema-drop-index`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Cannot update schema');
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
				});
		},

		async schemaEventUpdate(params: { addEvent: any; delEvent: any }, callback?: Function, callbackError?: Function) {
			await axios
				.post(`${this.host}/build/sdform/update-event`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Cannot update evnet');
						if (!!callbackError) {
							callbackError();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!callbackError) {
						callbackError();
					}
				});
		},

		async runProcess(processId: string, params: any, callback?: Function, callbackError?: Function) {
			await axios
				.post(
					`${this.host}/v1/process/${processId}`,
					{ params: params },
					{
						headers: {
							Authorization: `Bearer ${this.user?.token}`,
						},
					}
				)
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Data not found');
						if (!!callbackError) {
							callbackError();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!callbackError) {
						callbackError();
					}
				});
		},

		async apiPut(path: string, params: any, callback?: Function, callbackError?: Function) {
			await axios
				.put(`${this.host}${path}`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Data not found');
						if (!!callbackError) {
							callbackError();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!callbackError) {
						callbackError();
					}
				});
		},

		async apiPost(path: string, params: any, callback?: Function, callbackError?: Function) {
			await axios
				.post(`${this.host}${path}`, params, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Data not found');
						if (!!callbackError) {
							callbackError();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!callbackError) {
						callbackError();
					}
				});
		},

		async apiGet(path: string, params: any, callback?: Function, callbackError?: Function) {
			await axios
				.get(`${this.host}${path}`, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
					data: params,
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Data not found');
						if (!!callbackError) {
							callbackError();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!callbackError) {
						callbackError();
					}
				});
		},

		async apiDelete(path: string, params: any, callback?: Function, callbackError?: Function) {
			await axios
				.delete(`${this.host}${path}`, {
					headers: {
						Authorization: `Bearer ${this.user?.token}`,
					},
					data: params,
				})
				.then((response) => {
					if (!!response.data && !!response.data.message) {
						// ElMessage.success(response.data.message);
						if (!!callback) {
							callback(response.data);
						}
					} else {
						ElMessage.warning('Data not found');
						if (!!callbackError) {
							callbackError();
						}
					}
				})
				.catch((error) => {
					if (!!error.response && !!error.response.data && !!error.response.data.message) {
						ElMessage.warning(error.response.data.message);
					} else {
						ElMessage.warning(error.message);
					}
					if (!!callbackError) {
						callbackError();
					}
				});
		},
	},
});
