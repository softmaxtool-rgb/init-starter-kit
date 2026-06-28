<template>
	<el-scrollbar class="menu-wrapper" :height="`${scrollerHeight}px`" :style="`position: fixed; top: 0px; left: 0px;`">
		<el-menu
			class="side-menu"
			:style="`width: ${!!fixedEnable ? `${menuWidthOnexpand}px` : ''}; 
			min-height: ${!!fixedEnable ? `${scrollerHeight}px` : ''}; 
			${!!borderDisable ? `border: inherit;` : ''}
			${!!bgColor ? `background-color: ${bgColor};` : ''} ${!!borderColor ? `border-color: ${borderColor};` : ''}`"
			:collapse="isCollapse"
			:collapse-transition="false"
			:unique-opened="uniqueOpened"
			:router="false"
			:default-active="defaultActive || route.fullPath"
			:text-color="textColor || undefined"
			:menu-trigger="trigger">
			<div v-if="!!expandEnable">
				<el-menu-item class="menu-expand" :style="`height: ${expandHeight}px;`" index="xexpandx" @click="expandClick">
					<svg-icon icon-name="el-expand" v-if="isCollapse" />
					<svg-icon icon-name="el-fold" v-else />
				</el-menu-item>
				<el-divider direction="horizontal" style="margin: 0px" :style="`${!!borderColor ? `border-color: ${borderColor};` : ''}`" />
			</div>

			<template v-for="(item, index) in menuData" :key="item._id">
				<el-sub-menu
					v-if="!!subMenuField && !!item[subMenuField]"
					:index="!!pathField && !!item[pathField] ? item[pathField] : index"
					v-can.any="!!roleField && !!item[roleField] ? item[roleField] : ['user']"
					@click="!!pathField && !!item[pathField] ? handleClick(item, index) : undefined">
					<template #title>
						<svg-icon class="menu-icon" v-if="!!iconField" :icon-name="item[iconField]" />
						<span class="menu-label" v-if="!!labelField">{{ item[labelField] }}</span>
					</template>
					<template v-for="(subItem, subIndex) in item[subMenuField]" :key="subItem._id">
						<el-menu-item
							class="sub-menu-item"
							:index="!!pathField && !!subMenuPrefix && !!subItem[`${subMenuPrefix}${pathField}`] ? subItem[`${subMenuPrefix}${pathField}`] : index"
							v-can.any="!!roleField && !!subMenuPrefix && !!subItem[`${subMenuPrefix}${roleField}`] ? subItem[`${subMenuPrefix}${roleField}`] : ['user']"
							@click="!!pathField && !!subMenuPrefix && !!subItem[`${subMenuPrefix}${pathField}`] ? handleClick(subItem, subIndex, true) : undefined">
							<svg-icon class="menu-icon" v-if="!!iconField && !!subMenuPrefix" :icon-name="subItem[`${subMenuPrefix}${iconField}`]" />
							<span class="menu-label" v-if="!!labelField && !!subMenuPrefix">{{ subItem[`${subMenuPrefix}${labelField}`] }}</span>
						</el-menu-item>
					</template>
				</el-sub-menu>
				<el-menu-item
					v-else
					class="menu-item"
					:index="!!pathField && !!item[pathField] ? item[pathField] : index"
					v-can.any="!!roleField && !!item[roleField] ? item[roleField] : ['user']"
					@click="!!pathField && !!item[pathField] ? handleClick(item, index) : undefined">
					<svg-icon class="menu-icon" v-if="!!iconField" :icon-name="item[iconField]" />
					<span class="menu-label" v-if="!!labelField">{{ item[labelField] }}</span>
				</el-menu-item>
			</template>
		</el-menu>
	</el-scrollbar>
</template>

<script lang="ts">
import type { MenuItemRegistered } from 'element-plus';
import { defineComponent, type PropType } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { onWindowResizeHandler } from '~/utils/Util';

export default defineComponent({
	name: 'SideMenu',
	components: {},
	props: {
		menuData: {
			type: Array as PropType<any>,
		},
		uniqueOpened: {
			type: Boolean,
			default: false,
		},
		expandEnable: {
			type: Boolean,
			default: true,
		},
		fixedEnable: {
			type: Boolean,
			default: true,
		},
		expandDefault: {
			type: String as PropType<'expand' | 'collapse'>,
			default: 'expand',
		},
		trigger: {
			type: String as PropType<'click' | 'hover'>,
			default: 'click',
		},
		textColor: {
			type: String,
			default: '',
		},
		bgColor: {
			type: String,
			default: '',
		},
		borderColor: {
			type: String,
			default: '',
		},
		defaultActive: {
			type: String,
			default: '',
		},
		menuWidth: {
			type: Number,
			default: 250,
		},
		expandHeight: {
			type: Number,
			default: 59,
		},
		marginTop: {
			type: Number,
			default: 0,
		},
		borderDisable: {
			type: Boolean,
			default: false,
		},
		classInteraction: {
			type: String,
			default: '',
		},
		subMenuPrefix: {
			type: String,
			default: '',
		},
	},
	data() {
		return {
			scrollerHeight: 0,
			resizeCleanup: undefined as (() => void) | undefined,
			router: useRouter(),
			route: useRoute(),
			isCollapse: this.expandDefault === 'collapse' ? true : false,
			menuWidthOnexpand: !!!this.isCollapse ? this.menuWidth : 64,
			subMenuField: 'subMenu',
			roleField: 'role',
			pathField: 'path',
			iconField: 'icon',
			labelField: 'label',
		};
	},
	computed: {},
	created() {
		if (!!this.expandEnable) {
			let expandBackup = window.localStorage.getItem('SideMenu_System');
			if (!!expandBackup) {
				this.isCollapse = expandBackup == 'true' ? true : false;
			} else {
				window.localStorage.setItem('SideMenu_System', String(this.isCollapse));
			}

			if (!!!this.isCollapse) {
				this.menuWidthOnexpand = this.menuWidth;
			} else {
				this.menuWidthOnexpand = 64;
			}
		}
	},
	mounted() {
		this.scrollerHeight = window.innerHeight - this.marginTop;
		this.resizeCleanup = onWindowResizeHandler(() => {
			this.$nextTick(() => {
				this.scrollerHeight = window.innerHeight - this.marginTop;
			});
		});

		if (!!this.classInteraction) {
			const interaction = this.$el.parentNode.querySelector(`.${this.classInteraction}`);
			if (!!interaction) {
				interaction.style.marginLeft = `${this.menuWidthOnexpand}px`;
			}
		}
	},
	beforeUnmount() {
		if (!!this.classInteraction) {
			const interaction = this.$el.parentNode.querySelector(`.${this.classInteraction}`);
			if (!!interaction) {
				interaction.style.marginLeft = `0px`;
			}
		}
	},
	unmounted() {
		this.resizeCleanup?.();
	},
	setup(props, ctx) {},
	methods: {
		handleClick(row: any, index: number, subMenu: boolean = false) {
			if (!!subMenu) {
				if (!!this.pathField && !!this.subMenuPrefix && !!row[`${this.subMenuPrefix}${this.pathField}`]) {
					this.router.push(row[`${this.subMenuPrefix}${this.pathField}`]);
				}
			} else {
				if (!!this.pathField && !!row[this.pathField]) {
					this.router.push(row[this.pathField]);
				}
			}
		},
		expandClick(item: MenuItemRegistered) {
			if (this.isCollapse) {
				this.isCollapse = false;
			} else {
				this.isCollapse = true;
			}

			if (!!!this.isCollapse) {
				this.menuWidthOnexpand = this.menuWidth;
			} else {
				this.menuWidthOnexpand = 64;
			}

			if (!!this.classInteraction) {
				const interaction = this.$el.parentNode.querySelector(`.${this.classInteraction}`);
				if (!!interaction) {
					interaction.style.marginLeft = `${this.menuWidthOnexpand}px`;
				}
			}

			window.localStorage.setItem('SideMenu_System', String(this.isCollapse));
		},
	},
});
</script>
<style lang="scss" scoped></style>
