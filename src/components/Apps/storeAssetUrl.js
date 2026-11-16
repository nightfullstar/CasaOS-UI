const STORE_ASSET_PREFIX = '/v2/app_management/appstore/'

// Browser <img> cannot send Authorization. Store icon and screenshot paths
// take the JWT as ?token=, matching WallpaperModal and logs streamUrl.
export function storeAssetUrl(url, token) {
	if (typeof url !== 'string' || !url.startsWith(STORE_ASSET_PREFIX))
		return url
	const accessToken = token ?? (typeof localStorage === 'undefined' ? '' : localStorage.getItem('access_token'))
	if (!accessToken)
		return url
	const sep = url.includes('?') ? '&' : '?'
	return `${url}${sep}token=${encodeURIComponent(accessToken)}`
}
