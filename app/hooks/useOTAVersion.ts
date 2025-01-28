import { useEffect, useState } from 'react'
import codePush from 'react-native-code-push'
import DeviceInfo from 'react-native-device-info'

async function getOTAVersion() {
    try {
        const update = await codePush.getUpdateMetadata()

        return update ? update.label : null
    } catch (error) {
        return null
    }
}

export function useOTAVersion() {
    const [appVersion, setAppVersion] = useState(DeviceInfo.getVersion())

    useEffect(() => {
        getOTAVersion().then((OTAVersion) => {
            if (OTAVersion) {
                setAppVersion(`${appVersion}/${OTAVersion}`)
            }
        })
    }, [])

    return { appVersion }
}
