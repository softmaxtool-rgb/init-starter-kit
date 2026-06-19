const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const SERVER_HOST = isLocal ? 'http://localhost:3005' : 'https://apihis.softmax-one.com';
const API_PATH = '/api';
const ASSETS_PATH = '/assets';
const API_URL = SERVER_HOST + API_PATH;
const ASSETS_URL = SERVER_HOST + ASSETS_PATH;
const REFRESH_TOKEN = 1000 * 60 * 60 * 1;

const APP_IMG_LOGO = '/favicon/favicon-32x32.png';
const APP_SVG_LOGO = 'logo';
const APP_LOGO_TYPE = 'svg';
const APP_NAME = 'My StarterKit';
const APP_SLOGAN = 'Powered by initCraft ©2025';
const APP_VERSION = 'v1.5.0';

window.APP_CONFIG = {
	SERVER_HOST: SERVER_HOST,
	API_PATH: API_PATH,
	ASSETS_PATH: ASSETS_PATH,
	API_URL: API_URL,
	ASSETS_URL: ASSETS_URL,
	REFRESH_TOKEN: REFRESH_TOKEN,
	APP_IMG_LOGO: APP_IMG_LOGO,
	APP_SVG_LOGO: APP_SVG_LOGO,
	APP_LOGO_TYPE: APP_LOGO_TYPE,
	APP_NAME: APP_NAME,
	APP_SLOGAN: APP_SLOGAN,
	APP_VERSION: APP_VERSION,
};
