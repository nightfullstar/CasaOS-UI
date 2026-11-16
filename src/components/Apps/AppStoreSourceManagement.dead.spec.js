// @vitest-environment happy-dom
import Buefy from 'buefy'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppStoreSourceManagement from './AppStoreSourceManagement.vue'
import AppPanel from './AppPanel.vue'
import en from '@/assets/lang/en_US.json'
import fr from '@/assets/lang/fr_FR.json'

vi.mock('lottie-web-vue', () => ({ default: { name: 'lottie-animation', template: '<div/>' } }))

const DEAD = 'https://github.com/bigbeartechworld/big-bear-casaos/archive/refs/heads/master.zip'
const ORG = 'https://recasaos.org/store/recasaos.zip'
const LIVE = 'https://example.com/custom-store.zip'
const SWITCH = 'Switch to the ReCasaOS catalogue'

function api(list) {
	return {
		appStoreList: vi.fn(() => Promise.resolve({ status: 200, data: { data: list } })),
		registerAppStore: vi.fn(() => Promise.resolve({ status: 200 })),
		registerAppStoreSync: vi.fn(() => Promise.resolve({ status: 200 })),
		unregisterAppStore: vi.fn(() => Promise.resolve({ status: 200 })),
	}
}

async function open(list) {
	const appStore = api(list)
	const confirm = vi.fn()
	const $socket = { $subscribe: vi.fn(), $unsubscribe: vi.fn() }
	const $buefy = { dialog: { confirm }, toast: { open: vi.fn() } }
	const $openAPI = { appManagement: { appStore } }
	const wrapper = mount(AppStoreSourceManagement, {
		props: { totalApps: 12 },
		attachTo: document.body,
		global: {
			plugins: [Buefy, {
				install(app) {
					app.config.globalProperties.$t = key => key
					app.config.globalProperties.$socket = $socket
					app.config.globalProperties.$buefy = $buefy
					app.config.globalProperties.$openAPI = $openAPI
				},
			}],
		},
	})
	await flushPromises()
	return { wrapper, appStore, confirm }
}

function switchButton(wrapper) {
	return wrapper.findAll('button').find(el => el.text().includes(SWITCH))
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('a dead app-store source', () => {
	it('renders the switch on the dead URL row, and not on a live one', async () => {
		const { wrapper } = await open([
			{ id: 7, url: DEAD },
			{ id: 8, url: LIVE },
		])

		expect(wrapper.text()).toContain(SWITCH)
		expect(wrapper.text()).toContain('bigbeartechworld')
		wrapper.unmount()

		const live = await open([{ id: 8, url: LIVE }])
		expect(live.wrapper.text()).not.toContain(SWITCH)
		live.wrapper.unmount()
	})

	it('registers the successor first, then unregisters the dead id', async () => {
		const { wrapper, appStore, confirm } = await open([{ id: 7, url: DEAD }])
		await switchButton(wrapper).trigger('click')

		expect(confirm).toHaveBeenCalled()
		expect(appStore.unregisterAppStore).not.toHaveBeenCalled()
		expect(appStore.registerAppStoreSync).not.toHaveBeenCalled()

		await confirm.mock.calls[0][0].onConfirm()
		await flushPromises()

		expect(appStore.registerAppStoreSync).toHaveBeenCalledWith(ORG)
		expect(appStore.unregisterAppStore).toHaveBeenCalledWith(7)
		expect(appStore.registerAppStoreSync.mock.invocationCallOrder[0])
			.toBeLessThan(appStore.unregisterAppStore.mock.invocationCallOrder[0])
		wrapper.unmount()
	})

	it('treats 409 Conflict as the successor already present, then unregisters', async () => {
		const { wrapper, appStore, confirm } = await open([{ id: 7, url: DEAD }])
		appStore.registerAppStoreSync.mockRejectedValueOnce({ response: { status: 409 } })
		await switchButton(wrapper).trigger('click')
		await confirm.mock.calls[0][0].onConfirm()
		await flushPromises()

		expect(appStore.registerAppStoreSync).toHaveBeenCalledWith(ORG)
		expect(appStore.unregisterAppStore).toHaveBeenCalledWith(7)
		wrapper.unmount()
	})

	it('writes nothing when the switch is cancelled', async () => {
		const { wrapper, appStore, confirm } = await open([{ id: 7, url: DEAD }])
		await switchButton(wrapper).trigger('click')
		confirm.mock.calls[0][0].onCancel?.()
		await flushPromises()

		expect(appStore.unregisterAppStore).not.toHaveBeenCalled()
		expect(appStore.registerAppStore).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it('offers the successor the list already named, when the API later includes one', async () => {
		const { wrapper, appStore, confirm } = await open([
			{ id: 9, url: 'https://old.example/store.zip', successor: ORG, status: 'moved' },
		])
		expect(wrapper.text()).toContain(SWITCH)
		await switchButton(wrapper).trigger('click')
		await confirm.mock.calls[0][0].onConfirm()
		await flushPromises()

		expect(appStore.registerAppStoreSync).toHaveBeenCalledWith(ORG)
		expect(appStore.unregisterAppStore).toHaveBeenCalledWith(9)
		expect(appStore.registerAppStoreSync.mock.invocationCallOrder[0])
			.toBeLessThan(appStore.unregisterAppStore.mock.invocationCallOrder[0])
		wrapper.unmount()
	})
})

describe('store app icons', () => {
	it('uses a gateway path from the API as-is, not as a page-relative icon.png', async () => {
		const icon = '/v2/app_management/appstore/0/apps/immich/icon'
		const vm = {
			isLoading: false,
			currentCate: { name: 'All' },
			currentAuthor: { name: 'All' },
			pageList: [],
			installedList: [],
			$openAPI: {
				appManagement: {
					appStore: {
						composeAppStoreInfoList: vi.fn(() => Promise.resolve({
							data: {
								data: {
									list: {
										immich: {
											icon,
											category: 'Media',
											title: { en_us: 'Immich' },
											tagline: { en_us: 'photos' },
											architectures: [],
										},
									},
									installed: [],
								},
							},
						})),
					},
				},
			},
		}

		await AppPanel.methods.getStoreList.call(vm)

		expect(vm.pageList[0].icon).toBe(icon)
		expect(vm.pageList[0].icon.startsWith('/v2/')).toBe(true)
		expect(vm.pageList[0].icon).not.toMatch(/icon\.png$/)
	})
})

describe('the switch copy', () => {
	it('is the English key in en_US and French in fr_FR', () => {
		expect(en[SWITCH]).toBe(SWITCH)
		expect(fr[SWITCH]).toBeTruthy()
		expect(fr[SWITCH]).not.toBe(SWITCH)
	})
})
