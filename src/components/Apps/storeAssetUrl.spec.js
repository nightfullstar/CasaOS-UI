// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { storeAssetUrl } from './storeAssetUrl'

afterEach(() => {
	localStorage.clear()
})

describe('storeAssetUrl', () => {
	it('appends encodeURIComponent token to a store icon path', () => {
		localStorage.setItem('access_token', 't/k')
		expect(storeAssetUrl('/v2/app_management/appstore/0/apps/immich/icon'))
			.toBe('/v2/app_management/appstore/0/apps/immich/icon?token=t%2Fk')
	})

	it('appends token to a store screenshot path', () => {
		expect(storeAssetUrl('/v2/app_management/appstore/0/apps/immich/screenshot/screenshot-1.png', 'abc'))
			.toBe('/v2/app_management/appstore/0/apps/immich/screenshot/screenshot-1.png?token=abc')
	})

	it('leaves https icons, empty strings, and other paths alone', () => {
		localStorage.setItem('access_token', 't')
		expect(storeAssetUrl('https://cdn.example/icon.png')).toBe('https://cdn.example/icon.png')
		expect(storeAssetUrl('')).toBe('')
		expect(storeAssetUrl('/v2/app_management/web/appgrid')).toBe('/v2/app_management/web/appgrid')
	})
})
